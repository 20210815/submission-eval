import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Revision, RevisionStatus } from '../entities/revision.entity';
import { Essay, EvaluationStatus } from '../entities/essay.entity';
import { CreateRevisionDto, RevisionResponseDto } from '../dto/revision.dto';
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
    @InjectRepository(Essay)
    private essayRepository: Repository<Essay>,
    private openAIService: OpenAIService,
    private textHighlightingService: TextHighlightingService,
    private notificationService: NotificationService,
    private cacheService: CacheService,
  ) {}

  async createRevision(
    createRevisionDto: CreateRevisionDto,
  ): Promise<RevisionResponseDto> {
    const { essayId, revisionReason } = createRevisionDto;

    // 에세이 존재 확인
    const essay = await this.essayRepository.findOne({
      where: { id: essayId },
      relations: ['student'],
    });

    if (!essay) {
      throw new NotFoundException('에세이를 찾을 수 없습니다.');
    }

    // 이미 진행 중인 재평가가 있는지 확인
    const existingRevision = await this.revisionRepository.findOne({
      where: {
        essayId,
        status: RevisionStatus.IN_PROGRESS,
      },
    });

    if (existingRevision) {
      throw new ConflictException('이미 진행 중인 재평가가 있습니다.');
    }

    // 재평가 생성
    const revision = this.revisionRepository.create({
      essayId,
      studentId: essay.studentId,
      componentType: essay.componentType,
      revisionReason,
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
      relations: ['essay', 'essay.student'],
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
      relations: ['essay', 'essay.student'],
    });

    if (!revision) {
      throw new NotFoundException('재평가를 찾을 수 없습니다.');
    }

    return this.mapToResponseDto(revision);
  }

  private async processRevision(revisionId: number): Promise<void> {
    const startTime = Date.now();
    let traceId: string | undefined;

    try {
      const revision = await this.revisionRepository.findOne({
        where: { id: revisionId },
        relations: ['essay'],
      });

      if (!revision || !revision.essay) {
        throw new Error('Revision or essay not found');
      }

      // 상태를 처리 중으로 변경
      await this.revisionRepository.update(revisionId, {
        status: RevisionStatus.IN_PROGRESS,
      });

      traceId = `revision-${revisionId}-${Date.now()}`;

      // AI 평가 수행
      const aiResult = await this.openAIService.evaluateEssay(
        revision.essay.title,
        revision.essay.submitText,
        revision.componentType,
      );

      // 텍스트 하이라이팅
      const highlightSubmitText = this.textHighlightingService.highlightText(
        revision.essay.submitText,
        aiResult.highlights,
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
      await this.essayRepository.update(revision.essayId, {
        status: EvaluationStatus.COMPLETED,
        score: aiResult.score,
        feedback: aiResult.feedback,
        highlights: aiResult.highlights,
        highlightSubmitText,
      });

      // 캐시 무효화
      await this.invalidateRelatedCaches(revision.essayId, revision.studentId);

      this.logger.log(
        `Revision ${revisionId} completed successfully with score: ${aiResult.score}`,
      );
    } catch (error) {
      const apiLatency = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // 실패 상태로 업데이트
      await this.revisionRepository.update(revisionId, {
        status: RevisionStatus.FAILED,
        errorMessage,
        apiLatency,
        traceId,
      });

      this.logger.error(`Revision ${revisionId} failed:`, error);

      // 실패 알림 발송
      const revision = await this.revisionRepository.findOne({
        where: { id: revisionId },
      });

      if (revision) {
        await this.notificationService.notifyEvaluationFailure(
          revision.essayId,
          revision.studentId,
          errorMessage,
          traceId,
        );
      }
    }
  }

  private async invalidateRelatedCaches(
    essayId: number,
    studentId: number,
  ): Promise<void> {
    const essayKey = this.cacheService.getEssayKey(essayId);
    const studentEssaysKey = this.cacheService.getStudentEssaysKey(studentId);

    await Promise.all([
      this.cacheService.del(essayKey),
      this.cacheService.del(studentEssaysKey),
    ]);
  }

  private mapToResponseDto(revision: Revision): RevisionResponseDto {
    return {
      id: revision.id,
      essayId: revision.essayId,
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
