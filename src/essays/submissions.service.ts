import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Submission, EvaluationStatus } from './entities/submission.entity';
import {
  EvaluationLog,
  LogType,
  LogStatus,
} from './entities/evaluation-log.entity';
import { Student } from '../students/entities/student.entity';
import { SubmitSubmissionDto } from './dto/submit-submission.dto';
import {
  SubmissionResponseDto,
  SubmitSubmissionResponseDto,
} from './dto/submission-response.dto';
import { VideoProcessingService } from './services/video-processing.service';
import { AzureStorageService } from './services/azure-storage.service';
import { OpenAIService } from './services/openai.service';
import { TextHighlightingService } from './services/text-highlighting.service';
import { NotificationService } from './services/notification.service';
import { CacheService } from '../cache/cache.service';
import { Revision, RevisionStatus } from './entities/revision.entity';

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
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);
  private readonly processingLocks = new Map<string, Promise<any>>();

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(EvaluationLog)
    private readonly evaluationLogRepository: Repository<EvaluationLog>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Revision)
    private readonly revisionRepository: Repository<Revision>,
    private readonly dataSource: DataSource,
    private readonly videoProcessingService: VideoProcessingService,
    private readonly azureStorageService: AzureStorageService,
    private readonly openAIService: OpenAIService,
    private readonly textHighlightingService: TextHighlightingService,
    private readonly notificationService: NotificationService,
    private readonly cacheService: CacheService,
  ) {}

  async submitSubmission(
    studentId: number,
    dto: SubmitSubmissionDto,
    videoFile?: Express.Multer.File,
  ): Promise<SubmitSubmissionResponseDto> {
    const startTime = Date.now();
    const processingKey = `${studentId}-${dto.componentType}`;

    // 동시 제출 방지 체크 (같은 componentType에 대해서만)
    if (this.processingLocks.has(processingKey)) {
      throw new ConflictException(
        `이미 ${dto.componentType} 유형의 에세이 제출이 진행 중입니다. 잠시 후 다시 시도해주세요.`,
      );
    }

    // 비동기 작업을 캡슐화하는 Promise 생성
    const processingPromise = (async () => {
      // 트랜잭션 내에서 제출물 생성 및 초기 처리
      const savedSubmission = await this.dataSource.transaction(
        async (manager) => {
          // componentType별 중복 제출 방지 체크
          const existingSubmission = await manager.findOne(Submission, {
            where: {
              studentId,
              componentType: dto.componentType,
            },
          });

          if (existingSubmission) {
            throw new ConflictException(
              `이미 ${dto.componentType} 유형의 에세이를 제출했습니다.`,
            );
          }

          // 새 제출물 생성
          const submission = manager.create(Submission, {
            title: dto.title,
            submitText: dto.submitText,
            componentType: dto.componentType,
            studentId,
            status: EvaluationStatus.PENDING,
          });

          return await manager.save(Submission, submission);
        },
      );

      try {
        // 동기 평가 프로세스 실행 (트랜잭션 외부에서 실행)
        await this.processSubmissionEvaluation(savedSubmission.id, videoFile);

        // 평가 완료 후 결과 조회
        const evaluatedSubmission = await this.submissionRepository.findOne({
          where: { id: savedSubmission.id },
        });

        if (!evaluatedSubmission) {
          throw new Error('평가된 제출물을 찾을 수 없습니다.');
        }

        // 학생 정보 조회 (캐시 적용)
        const student = await this.getStudentWithCache(studentId);

        const apiLatency = Date.now() - startTime;

        return {
          submissionId: evaluatedSubmission.id,
          studentId: studentId,
          studentName: student?.name,
          status: evaluatedSubmission.status,
          message:
            evaluatedSubmission.status === EvaluationStatus.COMPLETED
              ? null
              : evaluatedSubmission.errorMessage ||
                '제출물 평가에 실패했습니다.',
          score: evaluatedSubmission.score ?? undefined,
          feedback: evaluatedSubmission.feedback ?? undefined,
          highlights: evaluatedSubmission.highlights ?? undefined,
          submitText: evaluatedSubmission.submitText,
          highlightSubmitText:
            evaluatedSubmission.highlightSubmitText ?? undefined,
          videoUrl: evaluatedSubmission.videoUrl ?? undefined,
          audioUrl: evaluatedSubmission.audioUrl ?? undefined,
          apiLatency,
        };
      } finally {
        // 처리 완료 후 processing key 제거
        this.processingLocks.delete(processingKey);
      }
    })(); // Immediately invoke the async function

    this.processingLocks.set(processingKey, processingPromise);
    return processingPromise;
  }

  async getSubmission(
    submissionId: number,
    studentId: number,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.getSubmissionWithCache(
      submissionId,
      studentId,
    );

    if (!submission) {
      throw new NotFoundException('제출물을 찾을 수 없습니다.');
    }

    return {
      id: submission.id,
      title: submission.title,
      submitText: submission.submitText,
      componentType: submission.componentType,
      status: submission.status,
      score: submission.score ?? undefined,
      feedback: submission.feedback ?? undefined,
      highlights: submission.highlights ?? undefined,
      highlightSubmitText: submission.highlightSubmitText ?? undefined,
      videoUrl: submission.videoUrl ?? undefined,
      audioUrl: submission.audioUrl ?? undefined,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    };
  }

  async getStudentSubmissions(
    studentId: number,
  ): Promise<SubmissionResponseDto[]> {
    const cacheKey = this.cacheService.getStudentSubmissionsKey(studentId);

    // 캐시에서 조회
    const cachedSubmissions =
      await this.cacheService.get<SubmissionResponseDto[]>(cacheKey);

    if (cachedSubmissions) {
      return cachedSubmissions;
    }

    // DB에서 조회
    const submissions = await this.submissionRepository.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
    });

    const submissionDtos = submissions.map((submission) => ({
      id: submission.id,
      title: submission.title,
      submitText: submission.submitText,
      componentType: submission.componentType,
      status: submission.status,
      score: submission.score ?? undefined,
      feedback: submission.feedback ?? undefined,
      highlights: submission.highlights ?? undefined,
      highlightSubmitText: submission.highlightSubmitText ?? undefined,
      videoUrl: submission.videoUrl ?? undefined,
      audioUrl: submission.audioUrl ?? undefined,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    }));

    // 캐시에 저장 (10분)
    await this.cacheService.set(cacheKey, submissionDtos, 10 * 60);

    return submissionDtos;
  }

  private async processSubmissionEvaluation(
    submissionId: number,
    videoFile?: Express.Multer.File,
  ): Promise<void> {
    const traceId = `submission_${submissionId}_${Date.now()}`;
    let processedVideo: ProcessedVideo | null = null;

    // 상태를 PROCESSING으로 변경
    await this.updateSubmissionStatus(
      submissionId,
      EvaluationStatus.PROCESSING,
    );

    try {
      const submission = await this.submissionRepository.findOne({
        where: { id: submissionId },
      });
      if (!submission) {
        throw new Error('Submission not found');
      }

      let videoUrl: string | null = null;
      let audioUrl: string | null = null;

      // 1. MP4 파일 처리 (영상/음성 분리)
      if (videoFile) {
        await this.logEvaluation(
          submissionId,
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
            submissionId,
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
            submissionId,
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
          submissionId,
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
            submissionId,
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
            submissionId,
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
        submissionId,
        LogType.AI_EVALUATION,
        LogStatus.STARTED,
        {
          traceId,
          requestData: {
            title: submission.title,
            componentType: submission.componentType,
          },
        },
      );

      const aiStartTime = Date.now();
      let aiResult: AIEvaluationResult;
      try {
        aiResult = await this.openAIService.evaluateSubmission(
          submission.title,
          submission.submitText,
          submission.componentType,
        );

        await this.logEvaluation(
          submissionId,
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
          submissionId,
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
        submissionId,
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
          submission.submitText,
          aiResult?.highlights || [],
        );

        await this.logEvaluation(
          submissionId,
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
          submissionId,
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
      await this.submissionRepository.update(submissionId, {
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
      await this.updateSubmissionStatus(
        submissionId,
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

      // 실패 알림 발송 (submission 변수를 다시 조회)
      const submissionForNotification = await this.submissionRepository.findOne(
        {
          where: { id: submissionId },
        },
      );
      void this.notificationService.notifyEvaluationFailure(
        submissionId,
        submissionForNotification?.studentId || 0,
        error instanceof Error ? error.message : 'Unknown error',
        traceId,
      );

      // AI 평가 실패 시 자동으로 revision 생성
      if (submissionForNotification) {
        await this.createRevisionForFailedSubmission(
          submissionForNotification,
          error instanceof Error ? error.message : 'Unknown error',
        );
      }

      throw error;
    }
  }

  private async updateSubmissionStatus(
    submissionId: number,
    status: EvaluationStatus,
    errorMessage?: string,
  ): Promise<void> {
    const updateData: Partial<Submission> = { status };
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await this.submissionRepository.update(submissionId, updateData);

    // Cache invalidation
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });
    if (submission) {
      await this.invalidateSubmissionCache(submission.id, submission.studentId);
    }
  }

  private async createRevisionForFailedSubmission(
    submission: Submission,
    errorMessage: string,
  ): Promise<void> {
    try {
      const revision = this.revisionRepository.create({
        submissionId: submission.id,
        studentId: submission.studentId,
        componentType: submission.componentType,
        revisionReason: `AI 평가 실패로 인한 자동 재평가 요청: ${errorMessage}`,
        status: RevisionStatus.PENDING,
      });

      await this.revisionRepository.save(revision);

      this.logger.log(
        `Auto-created revision for failed submission evaluation. Submission ID: ${submission.id}, Revision ID: ${revision.id}`,
      );
    } catch (revisionError) {
      this.logger.error(
        `Failed to create revision for submission ${submission.id}: ${revisionError instanceof Error ? revisionError.message : 'Unknown error'}`,
      );
    }
  }

  async logEvaluation(
    submissionId: number,
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
    // 제출물이 존재하는지 확인 (테스트 환경에서 FK 제약조건 오류 방지)
    const submissionExists = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });

    if (!submissionExists) {
      this.logger.warn(
        `Cannot log evaluation for non-existent submission ID: ${submissionId}`,
      );
      return;
    }

    const log = this.evaluationLogRepository.create({
      submissionId,
      type,
      status,
      ...data,
    });

    await this.evaluationLogRepository.save(log);
  }

  /**
   * 캐시를 사용하여 학생 정보 조회
   */
  private async getStudentWithCache(
    studentId: number,
  ): Promise<Student | null> {
    const cacheKey = this.cacheService.getStudentKey(studentId);

    // 캐시에서 조회
    const student = await this.cacheService.get<Student>(cacheKey);

    if (!student) {
      // DB에서 조회
      const foundStudent = await this.studentRepository.findOne({
        where: { id: studentId },
      });

      if (foundStudent) {
        // 캐시에 저장 (1시간)
        await this.cacheService.set(cacheKey, foundStudent, 60 * 60);
        return foundStudent;
      }
      return null;
    }

    return student;
  }

  /**
   * 캐시를 사용하여 제출물 조회
   */
  private async getSubmissionWithCache(
    submissionId: number,
    studentId: number,
  ): Promise<Submission | null> {
    const cacheKey = this.cacheService.getSubmissionKey(submissionId);

    // 캐시에서 조회
    const cachedSubmission = await this.cacheService.get<Submission>(cacheKey);

    if (cachedSubmission && cachedSubmission.studentId === studentId) {
      return cachedSubmission;
    }

    // DB에서 조회
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId, studentId },
    });

    if (submission) {
      // 캐시에 저장 (30분)
      await this.cacheService.set(cacheKey, submission, 30 * 60);
    }

    return submission;
  }

  /**
   * 학생 제출물 목록 캐시 무효화
   */
  private async invalidateStudentSubmissionsCache(studentId: number) {
    const cacheKey = this.cacheService.getStudentSubmissionsKey(studentId);
    await this.cacheService.del(cacheKey);
  }

  /**
   * 제출물 관련 캐시 무효화
   */
  private async invalidateSubmissionCache(
    submissionId: number,
    studentId: number,
  ) {
    const submissionKey = this.cacheService.getSubmissionKey(submissionId);
    const studentSubmissionsKey =
      this.cacheService.getStudentSubmissionsKey(studentId);

    await Promise.all([
      this.cacheService.del(submissionKey),
      this.cacheService.del(studentSubmissionsKey),
    ]);
  }
}
