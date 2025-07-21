import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Essay, EvaluationStatus } from './entities/essay.entity';
import {
  EvaluationLog,
  LogType,
  LogStatus,
} from './entities/evaluation-log.entity';
import { Student } from '../students/entities/student.entity';
import { SubmitEssayDto } from './dto/submit-essay.dto';
import {
  EssayResponseDto,
  SubmitEssayResponseDto,
} from './dto/essay-response.dto';
import { VideoProcessingService } from './services/video-processing.service';
import { AzureStorageService } from './services/azure-storage.service';
import { OpenAIService } from './services/openai.service';
import { TextHighlightingService } from './services/text-highlighting.service';
import { NotificationService } from './services/notification.service';

interface ProcessedVideo {
  videoPath: string;
  audioPath: string;
}

interface AIEvaluationResult {
  score: number;
  feedback: string;
  highlights: string[];
}

@Injectable()
export class EssaysService {
  private readonly processingStudents = new Set<number>();

  constructor(
    @InjectRepository(Essay)
    private readonly essayRepository: Repository<Essay>,
    @InjectRepository(EvaluationLog)
    private readonly evaluationLogRepository: Repository<EvaluationLog>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    private readonly videoProcessingService: VideoProcessingService,
    private readonly azureStorageService: AzureStorageService,
    private readonly openAIService: OpenAIService,
    private readonly textHighlightingService: TextHighlightingService,
    private readonly notificationService: NotificationService,
  ) {}

  async submitEssay(
    studentId: number,
    dto: SubmitEssayDto,
    videoFile?: Express.Multer.File,
  ): Promise<SubmitEssayResponseDto> {
    const startTime = Date.now();

    // 동시 제출 방지 체크
    if (this.processingStudents.has(studentId)) {
      throw new ConflictException(
        '이미 에세이 제출이 진행 중입니다. 잠시 후 다시 시도해주세요.',
      );
    }

    this.processingStudents.add(studentId);

    try {
      // componentType별 중복 제출 방지 체크
      const existingEssay = await this.essayRepository.findOne({
        where: {
          studentId,
          componentType: dto.componentType,
        },
      });

      if (existingEssay) {
        throw new ConflictException(
          `이미 ${dto.componentType} 유형의 에세이를 제출했습니다.`,
        );
      }

      // 새 에세이 생성
      const essay = this.essayRepository.create({
        title: dto.title,
        submitText: dto.submitText,
        componentType: dto.componentType,
        studentId,
        status: EvaluationStatus.PENDING,
      });

      const savedEssay = await this.essayRepository.save(essay);

      // 동기 평가 프로세스 실행 (await로 완료까지 기다림)
      await this.processEssayEvaluation(savedEssay.id, videoFile);

      // 평가 완료 후 결과 조회
      const evaluatedEssay = await this.essayRepository.findOne({
        where: { id: savedEssay.id },
      });

      if (!evaluatedEssay) {
        throw new Error('평가된 에세이를 찾을 수 없습니다.');
      }

      // 학생 정보 조회
      const student = await this.studentRepository.findOne({
        where: { id: studentId },
      });

      const apiLatency = Date.now() - startTime;

      return {
        essayId: evaluatedEssay.id,
        studentId: studentId,
        studentName: student?.name,
        status: evaluatedEssay.status,
        message:
          evaluatedEssay.status === EvaluationStatus.COMPLETED
            ? null
            : evaluatedEssay.errorMessage || '에세이 평가에 실패했습니다.',
        score: evaluatedEssay.score ?? undefined,
        feedback: evaluatedEssay.feedback ?? undefined,
        highlights: evaluatedEssay.highlights ?? undefined,
        submitText: evaluatedEssay.submitText,
        highlightSubmitText: evaluatedEssay.highlightSubmitText ?? undefined,
        videoUrl: evaluatedEssay.videoUrl ?? undefined,
        audioUrl: evaluatedEssay.audioUrl ?? undefined,
        apiLatency,
      };
    } finally {
      // 처리 완료 후 학생 ID 제거
      this.processingStudents.delete(studentId);
    }
  }

  async getEssay(
    essayId: number,
    studentId: number,
  ): Promise<EssayResponseDto> {
    const essay = await this.essayRepository.findOne({
      where: { id: essayId, studentId },
    });

    if (!essay) {
      throw new NotFoundException('에세이를 찾을 수 없습니다.');
    }

    return {
      id: essay.id,
      title: essay.title,
      submitText: essay.submitText,
      componentType: essay.componentType,
      status: essay.status,
      score: essay.score ?? undefined,
      feedback: essay.feedback ?? undefined,
      highlights: essay.highlights ?? undefined,
      highlightSubmitText: essay.highlightSubmitText ?? undefined,
      videoUrl: essay.videoUrl ?? undefined,
      audioUrl: essay.audioUrl ?? undefined,
      createdAt: essay.createdAt,
      updatedAt: essay.updatedAt,
    };
  }

  async getStudentEssays(studentId: number): Promise<EssayResponseDto[]> {
    const essays = await this.essayRepository.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
    });

    return essays.map((essay) => ({
      id: essay.id,
      title: essay.title,
      submitText: essay.submitText,
      componentType: essay.componentType,
      status: essay.status,
      score: essay.score ?? undefined,
      feedback: essay.feedback ?? undefined,
      highlights: essay.highlights ?? undefined,
      highlightSubmitText: essay.highlightSubmitText ?? undefined,
      videoUrl: essay.videoUrl ?? undefined,
      audioUrl: essay.audioUrl ?? undefined,
      createdAt: essay.createdAt,
      updatedAt: essay.updatedAt,
    }));
  }

  private async processEssayEvaluation(
    essayId: number,
    videoFile?: Express.Multer.File,
  ): Promise<void> {
    const traceId = `essay_${essayId}_${Date.now()}`;
    let processedVideo: ProcessedVideo | null = null;

    // 상태를 PROCESSING으로 변경
    await this.updateEssayStatus(essayId, EvaluationStatus.PROCESSING);

    try {
      const essay = await this.essayRepository.findOne({
        where: { id: essayId },
      });
      if (!essay) {
        throw new Error('Essay not found');
      }

      let videoUrl: string | null = null;
      let audioUrl: string | null = null;

      // 1. MP4 파일 처리 (영상/음성 분리)
      if (videoFile) {
        await this.logEvaluation(
          essayId,
          LogType.VIDEO_PROCESSING,
          LogStatus.STARTED,
          {
            traceId,
            requestData: {
              originalName: videoFile.originalname,
              size: videoFile.size,
            },
          },
        );

        const startTime = Date.now();
        try {
          processedVideo = (await this.videoProcessingService.processVideo(
            videoFile.buffer,
          )) as ProcessedVideo;

          await this.logEvaluation(
            essayId,
            LogType.VIDEO_PROCESSING,
            LogStatus.SUCCESS,
            {
              traceId,
              latency: Date.now() - startTime,
              responseData: {
                videoPath: processedVideo?.videoPath || '',
                audioPath: processedVideo?.audioPath || '',
              },
            },
          );
        } catch (error) {
          await this.logEvaluation(
            essayId,
            LogType.VIDEO_PROCESSING,
            LogStatus.FAILED,
            {
              traceId,
              latency: Date.now() - startTime,
              errorMessage:
                error instanceof Error ? error.message : 'Unknown error',
            },
          );
          throw error;
        }

        // 2. Azure Blob Storage 업로드
        await this.logEvaluation(
          essayId,
          LogType.AZURE_UPLOAD,
          LogStatus.STARTED,
          {
            traceId,
            requestData: {
              videoPath: processedVideo?.videoPath || '',
              audioPath: processedVideo?.audioPath || '',
            },
          },
        );

        const uploadStartTime = Date.now();
        try {
          const [uploadedVideo, uploadedAudio] = await Promise.all([
            this.azureStorageService.uploadVideo(
              processedVideo?.videoPath || '',
            ),
            this.azureStorageService.uploadAudio(
              processedVideo?.audioPath || '',
            ),
          ]);

          videoUrl = uploadedVideo.sasUrl;
          audioUrl = uploadedAudio.sasUrl;

          await this.logEvaluation(
            essayId,
            LogType.AZURE_UPLOAD,
            LogStatus.SUCCESS,
            {
              traceId,
              latency: Date.now() - uploadStartTime,
              responseData: { videoUrl, audioUrl },
            },
          );

          // 임시 파일 정리
          this.videoProcessingService.cleanupProcessedFiles(
            processedVideo?.videoPath || '',
            processedVideo?.audioPath || '',
          );
          processedVideo = null;
        } catch (error) {
          await this.logEvaluation(
            essayId,
            LogType.AZURE_UPLOAD,
            LogStatus.FAILED,
            {
              traceId,
              latency: Date.now() - uploadStartTime,
              errorMessage:
                error instanceof Error ? error.message : 'Unknown error',
            },
          );
          throw error;
        }
      }

      // 3. OpenAI API 호출
      await this.logEvaluation(
        essayId,
        LogType.AI_EVALUATION,
        LogStatus.STARTED,
        {
          traceId,
          requestData: {
            title: essay.title,
            componentType: essay.componentType,
          },
        },
      );

      const aiStartTime = Date.now();
      let aiResult: AIEvaluationResult;
      try {
        aiResult = await this.openAIService.evaluateEssay(
          essay.title,
          essay.submitText,
          essay.componentType,
        );

        await this.logEvaluation(
          essayId,
          LogType.AI_EVALUATION,
          LogStatus.SUCCESS,
          {
            traceId,
            latency: Date.now() - aiStartTime,
            responseData: aiResult,
          },
        );
      } catch (error) {
        await this.logEvaluation(
          essayId,
          LogType.AI_EVALUATION,
          LogStatus.FAILED,
          {
            traceId,
            latency: Date.now() - aiStartTime,
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
          },
        );
        throw error;
      }

      // 4. 텍스트 하이라이팅
      await this.logEvaluation(
        essayId,
        LogType.TEXT_HIGHLIGHTING,
        LogStatus.STARTED,
        {
          traceId,
          requestData: { highlights: aiResult?.highlights || [] },
        },
      );

      const highlightStartTime = Date.now();
      let highlightedText: string;
      try {
        highlightedText = this.textHighlightingService.highlightText(
          essay.submitText,
          aiResult?.highlights || [],
        );

        await this.logEvaluation(
          essayId,
          LogType.TEXT_HIGHLIGHTING,
          LogStatus.SUCCESS,
          {
            traceId,
            latency: Date.now() - highlightStartTime,
            responseData: { highlightedText },
          },
        );
      } catch (error) {
        await this.logEvaluation(
          essayId,
          LogType.TEXT_HIGHLIGHTING,
          LogStatus.FAILED,
          {
            traceId,
            latency: Date.now() - highlightStartTime,
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
          },
        );
        throw error;
      }

      // 5. 결과 저장
      await this.essayRepository.update(essayId, {
        status: EvaluationStatus.COMPLETED,
        score: aiResult?.score || 0,
        feedback: aiResult?.feedback || '',
        highlights: aiResult?.highlights || [],
        highlightSubmitText: highlightedText,
        videoUrl: videoUrl,
        audioUrl: audioUrl,
        errorMessage: null,
      });
    } catch (error) {
      await this.updateEssayStatus(
        essayId,
        EvaluationStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error',
      );

      // 임시 파일 정리
      if (processedVideo) {
        this.videoProcessingService.cleanupProcessedFiles(
          processedVideo?.videoPath || '',
          processedVideo?.audioPath || '',
        );
      }

      // 실패 알림 발송 (essay 변수를 다시 조회)
      const essayForNotification = await this.essayRepository.findOne({
        where: { id: essayId },
      });
      void this.notificationService.notifyEvaluationFailure(
        essayId,
        essayForNotification?.studentId || 0,
        error instanceof Error ? error.message : 'Unknown error',
        traceId,
      );

      throw error;
    }
  }

  private async updateEssayStatus(
    essayId: number,
    status: EvaluationStatus,
    errorMessage?: string,
  ): Promise<void> {
    const updateData: Partial<Essay> = { status };
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await this.essayRepository.update(essayId, updateData);
  }

  async logEvaluation(
    essayId: number,
    type: LogType,
    status: LogStatus,
    data: {
      requestUri?: string;
      latency?: number;
      requestData?: any;
      responseData?: any;
      errorMessage?: string;
      traceId?: string;
    },
  ): Promise<void> {
    const log = this.evaluationLogRepository.create({
      essayId,
      type,
      status,
      ...data,
    });

    await this.evaluationLogRepository.save(log);
  }
}
