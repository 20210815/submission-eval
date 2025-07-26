import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Revision, RevisionStatus } from '../entities/revision.entity';
import { Submission, EvaluationStatus } from '../entities/submission.entity';
import { CreateRevisionDto, RevisionResponseDto } from '../dto/revision.dto';
import {
  EvaluationLog,
  LogType,
  LogStatus,
} from '../entities/evaluation-log.entity';
import { OpenAIService } from './openai.service';
import { TextHighlightingService } from './text-highlighting.service';
import { NotificationService } from './notification.service';
import { CacheService } from '../../cache/cache.service';

@Injectable()
export class RevisionService {
  private readonly logger = new Logger(RevisionService.name);

  constructor(
    @InjectRepository(Revision)
    private revisionRepository: Repository<Revision>,
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(EvaluationLog)
    private evaluationLogRepository: Repository<EvaluationLog>,
    private openAIService: OpenAIService,
    private textHighlightingService: TextHighlightingService,
    private notificationService: NotificationService,
    private cacheService: CacheService,
  ) {}

  async createRevision(
    createRevisionDto: CreateRevisionDto,
  ): Promise<RevisionResponseDto> {
    const { submissionId } = createRevisionDto;

    // submissionId를 숫자로 변환 (기존 제출 ID와 매핑)
    const parsedSubmissionId = parseInt(submissionId, 10);
    if (isNaN(parsedSubmissionId)) {
      throw new BadRequestException({
        result: 'failed',
        message: 'Submission ID는 필수 입력 항목입니다.',
      });
    }

    // 제출물 존재 확인
    const submission = await this.submissionRepository.findOne({
      where: { id: parsedSubmissionId },
      relations: ['student'],
    });

    if (!submission) {
      throw new NotFoundException({
        result: 'failed',
        message: '존재하지 않는 제출물입니다.',
      });
    }

    // 이미 진행 중인 재평가가 있는지 확인
    const existingRevision = await this.revisionRepository.findOne({
      where: {
        submissionId: parsedSubmissionId,
        status: RevisionStatus.IN_PROGRESS,
      },
    });

    if (existingRevision) {
      throw new ConflictException({
        result: 'failed',
        message: '이미 진행 중인 재평가가 있습니다.',
      });
    }

    // 재평가 생성
    const revision = this.revisionRepository.create({
      submissionId: parsedSubmissionId,
      studentId: submission.studentId,
      componentType: submission.componentType,
      status: RevisionStatus.PENDING,
    });

    const savedRevision = await this.revisionRepository.save(revision);

    // 비동기로 재평가 시작
    this.processRevision(savedRevision.id).catch((error) => {
      this.logger.error(
        `Failed to process revision ${savedRevision.id}:`,
        error,
      );
    });

    return this.mapToResponseDto(savedRevision);
  }

  async getRevisions(
    page: number = 1,
    size: number = 20,
    sort: string = 'createdAt,DESC',
  ): Promise<{
    data: RevisionResponseDto[];
    total: number;
    totalPages: number;
  }> {
    const [sortField, sortOrder] = sort.split(',');
    const order = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [revisions, total] = await this.revisionRepository.findAndCount({
      relations: ['submission', 'submission.student'],
      order: { [sortField]: order },
      skip: (page - 1) * size,
      take: size,
    });

    const data = revisions.map((revision) => this.mapToResponseDto(revision));
    const totalPages = Math.ceil(total / size);

    return { data, total, totalPages };
  }

  async getRevisionById(id: number): Promise<RevisionResponseDto> {
    const revision = await this.revisionRepository.findOne({
      where: { id },
      relations: ['submission', 'submission.student'],
    });

    if (!revision) {
      throw new NotFoundException({
        result: 'failed',
        message: '존재하지 않는 재평가 ID입니다.',
      });
    }

    return this.mapToResponseDto(revision);
  }

  private async processRevision(revisionId: number): Promise<void> {
    const startTime = Date.now();
    let traceId: string | undefined;

    try {
      const revision = await this.revisionRepository.findOne({
        where: { id: revisionId },
        relations: ['submission'],
      });

      if (!revision || !revision.submission) {
        throw new Error('Revision or submission not found');
      }

      // 상태를 처리 중으로 변경
      await this.revisionRepository.update(revisionId, {
        status: RevisionStatus.IN_PROGRESS,
      });

      traceId = `revision-${revisionId}-${Date.now()}`;

      // AI 평가 시작 로그
      await this.logEvaluation(
        revision.submissionId,
        LogType.AI_EVALUATION,
        LogStatus.STARTED,
        {
          traceId,
          requestData: {
            revisionId,
            title: revision.submission.title,
            componentType: revision.componentType,
          },
        },
      );

      // AI 평가 수행
      const aiStartTime = Date.now();
      const aiResult = await this.openAIService.evaluateSubmission(
        revision.submission.title,
        revision.submission.submitText,
        revision.componentType,
      );

      // AI 평가 성공 로그
      await this.logEvaluation(
        revision.submissionId,
        LogType.AI_EVALUATION,
        LogStatus.SUCCESS,
        {
          traceId,
          latency: Date.now() - aiStartTime,
          responseData: aiResult,
        },
      );

      // 텍스트 하이라이팅 시작 로그
      await this.logEvaluation(
        revision.submissionId,
        LogType.TEXT_HIGHLIGHTING,
        LogStatus.STARTED,
        {
          traceId,
          requestData: {
            highlights: aiResult.highlights,
          },
        },
      );

      // 텍스트 하이라이팅
      const highlightStartTime = Date.now();
      const highlightSubmitText = this.textHighlightingService.highlightText(
        revision.submission.submitText,
        aiResult.highlights,
      );

      // 텍스트 하이라이팅 성공 로그
      await this.logEvaluation(
        revision.submissionId,
        LogType.TEXT_HIGHLIGHTING,
        LogStatus.SUCCESS,
        {
          traceId,
          latency: Date.now() - highlightStartTime,
          responseData: { highlightedText: highlightSubmitText },
        },
      );

      const apiLatency = Date.now() - startTime;

      // 재평가 결과 저장
      await this.revisionRepository.update(revisionId, {
        status: RevisionStatus.COMPLETED,
        score: aiResult.score,
        feedback: aiResult.feedback,
        highlights: aiResult.highlights,
        highlightSubmitText,
        apiLatency,
        traceId,
      });

      // 원본 에세이도 업데이트
      await this.submissionRepository.update(revision.submissionId, {
        status: EvaluationStatus.COMPLETED,
        score: aiResult.score,
        feedback: aiResult.feedback,
        highlights: aiResult.highlights,
        highlightSubmitText,
      });

      // 캐시 무효화
      await this.invalidateRelatedCaches(
        revision.submissionId,
        revision.studentId,
      );

      this.logger.log(
        `Revision ${revisionId} completed successfully with score: ${aiResult.score}`,
      );
    } catch (error) {
      const apiLatency = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // 실패 로그 기록
      const revision = await this.revisionRepository.findOne({
        where: { id: revisionId },
      });

      if (revision) {
        await this.logEvaluation(
          revision.submissionId,
          LogType.AI_EVALUATION,
          LogStatus.FAILED,
          {
            traceId,
            latency: apiLatency,
            errorMessage,
          },
        );
      }

      // 실패 상태로 업데이트
      await this.revisionRepository.update(revisionId, {
        status: RevisionStatus.FAILED,
        errorMessage,
        apiLatency,
        traceId,
      });

      this.logger.error(`Revision ${revisionId} failed:`, error);

      // 실패 알림 발송 (이미 조회한 revision 재사용)
      if (revision) {
        await this.notificationService.notifyEvaluationFailure(
          revision.submissionId,
          revision.studentId,
          errorMessage,
          traceId,
        );
      }
    }
  }

  private async invalidateRelatedCaches(
    submissionId: number,
    studentId: number,
  ): Promise<void> {
    const submissionKey = this.cacheService.getSubmissionKey(submissionId);
    const studentSubmissionsKey =
      this.cacheService.getStudentSubmissionsKey(studentId);

    await Promise.all([
      this.cacheService.del(submissionKey),
      this.cacheService.del(studentSubmissionsKey),
    ]);
  }

  private async logEvaluation(
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
    try {
      // 에세이가 존재하는지 확인
      const submissionExists = await this.submissionRepository.findOne({
        where: { id: submissionId },
      });

      if (!submissionExists) {
        this.logger.warn(
          `Cannot log evaluation for non-existent submission ID: ${submissionId}`,
        );
        return;
      }

      const log = new EvaluationLog();
      log.submissionId = submissionId;
      log.type = type;
      log.status = status;
      if (data.requestUri) {
        log.requestUri = data.requestUri;
      }

      if (data.latency !== undefined) {
        log.latency = data.latency;
      }

      if (data.requestData) {
        log.requestData = JSON.stringify(data.requestData);
      }

      if (data.responseData) {
        log.responseData = JSON.stringify(data.responseData);
      }

      if (data.errorMessage) {
        log.errorMessage = data.errorMessage;
      }

      if (data.traceId) {
        log.traceId = data.traceId;
      }

      await this.evaluationLogRepository.save(log);
    } catch (error) {
      this.logger.error(
        `Failed to log evaluation for submission ${submissionId}:`,
        error,
      );
    }
  }

  private mapToResponseDto(revision: Revision): RevisionResponseDto {
    return {
      id: revision.id,
      submissionId: revision.submissionId,
      studentId: revision.studentId,
      componentType: revision.componentType,
      revisionReason: revision.revisionReason ?? undefined,
      status: revision.status,
      score: revision.score ?? undefined,
      feedback: revision.feedback ?? undefined,
      highlights: revision.highlights ?? undefined,
      highlightSubmitText: revision.highlightSubmitText ?? undefined,
      errorMessage: revision.errorMessage ?? undefined,
      apiLatency: revision.apiLatency ?? undefined,
      traceId: revision.traceId ?? undefined,
    };
  }
}
