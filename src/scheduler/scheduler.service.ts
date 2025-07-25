import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Essay, EvaluationStatus } from '../essays/entities/essay.entity';
import { Revision, RevisionStatus } from '../essays/entities/revision.entity';
import { OpenAIService } from '../essays/services/openai.service';
import { TextHighlightingService } from '../essays/services/text-highlighting.service';
import { NotificationService } from '../essays/services/notification.service';

export interface StatsData {
  id: number;
  period: 'daily' | 'weekly' | 'monthly';
  date: Date;
  totalSubmissions: number;
  successfulEvaluations: number;
  failedEvaluations: number;
  pendingEvaluations: number;
  averageScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Essay)
    private essayRepository: Repository<Essay>,
    @InjectRepository(Revision)
    private revisionRepository: Repository<Revision>,
    private openAIService: OpenAIService,
    private textHighlightingService: TextHighlightingService,
    private notificationService: NotificationService,
  ) {}

  /**
   * 자동 재시도 작업 - 매시간 실행
   * 실패한 에세이들을 1시간마다 재평가 시도
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoRetryFailedEssays(): Promise<void> {
    this.logger.log('Starting auto-retry job for failed essays');

    try {
      // 1시간 전보다 오래된 실패한 에세이들 조회
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const failedEssays = await this.essayRepository.find({
        where: {
          status: EvaluationStatus.FAILED,
          updatedAt: LessThan(oneHourAgo),
        },
        relations: ['student'],
        take: 10, // 한 번에 최대 10개만 처리
      });

      this.logger.log(`Found ${failedEssays.length} failed essays to retry`);

      for (const essay of failedEssays) {
        try {
          await this.retryEssayEvaluation(essay);
          this.logger.log(`Successfully retried essay ${essay.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to retry essay ${essay.id}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }

      this.logger.log('Auto-retry job completed');
    } catch (error) {
      this.logger.error('Auto-retry job failed:', error);
    }
  }

  /**
   * 일일 통계 집계 - 매일 자정 실행
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyStats(): Promise<void> {
    await this.generateStats('daily', 1);
  }

  /**
   * 주간 통계 집계 - 매주 월요일 자정 실행
   */
  @Cron(CronExpression.EVERY_WEEK)
  async generateWeeklyStats(): Promise<void> {
    await this.generateStats('weekly', 7);
  }

  /**
   * 월간 통계 집계 - 매월 1일 자정 실행
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async generateMonthlyStats(): Promise<void> {
    await this.generateStats('monthly', 30);
  }

  private async retryEssayEvaluation(essay: Essay): Promise<void> {
    const startTime = Date.now();
    const traceId = `retry-${essay.id}-${Date.now()}`;

    try {
      // 상태를 처리 중으로 변경
      await this.essayRepository.update(essay.id, {
        status: EvaluationStatus.PROCESSING,
      });

      // AI 평가 수행
      const aiResult = await this.openAIService.evaluateEssay(
        essay.title,
        essay.submitText,
        essay.componentType,
      );

      // 텍스트 하이라이팅
      const highlightSubmitText = this.textHighlightingService.highlightText(
        essay.submitText,
        aiResult.highlights,
      );

      // 에세이 업데이트
      await this.essayRepository.update(essay.id, {
        status: EvaluationStatus.COMPLETED,
        score: aiResult.score,
        feedback: aiResult.feedback,
        highlights: aiResult.highlights,
        highlightSubmitText,
        errorMessage: null,
      });

      // 성공한 재시도 로그를 위한 revision 생성
      const revision = this.revisionRepository.create({
        essayId: essay.id,
        studentId: essay.studentId,
        componentType: essay.componentType,
        revisionReason: 'Auto-retry for failed evaluation',
        status: RevisionStatus.COMPLETED,
        score: aiResult.score,
        feedback: aiResult.feedback,
        highlights: aiResult.highlights,
        highlightSubmitText,
        apiLatency: Date.now() - startTime,
        traceId,
      });

      await this.revisionRepository.save(revision);

      this.logger.log(
        `Auto-retry successful for essay ${essay.id} with score: ${aiResult.score}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const apiLatency = Date.now() - startTime;

      // 에세이 실패 상태 유지
      await this.essayRepository.update(essay.id, {
        status: EvaluationStatus.FAILED,
        errorMessage,
      });

      // 실패한 재시도 로그를 위한 revision 생성
      const revision = this.revisionRepository.create({
        essayId: essay.id,
        studentId: essay.studentId,
        componentType: essay.componentType,
        revisionReason: 'Auto-retry for failed evaluation',
        status: RevisionStatus.FAILED,
        errorMessage,
        apiLatency,
        traceId,
      });

      await this.revisionRepository.save(revision);

      // 실패 알림 발송
      await this.notificationService.notifyEvaluationFailure(
        essay.id,
        essay.studentId,
        errorMessage,
        traceId,
      );

      throw error;
    }
  }

  private async generateStats(
    period: 'daily' | 'weekly' | 'monthly',
    days: number,
  ): Promise<void> {
    this.logger.log(`Generating ${period} statistics`);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // 기간 내 통계 집계
      const [essays, totalCount] = await this.essayRepository.findAndCount({
        where: {
          createdAt: LessThan(endDate),
        },
      });

      const successfulCount = essays.filter(
        (essay) => essay.status === EvaluationStatus.COMPLETED,
      ).length;

      const failedCount = essays.filter(
        (essay) => essay.status === EvaluationStatus.FAILED,
      ).length;

      const pendingCount = essays.filter(
        (essay) =>
          essay.status === EvaluationStatus.PENDING ||
          essay.status === EvaluationStatus.PROCESSING,
      ).length;

      // 평균 점수 계산
      const completedEssays = essays.filter(
        (essay) =>
          essay.status === EvaluationStatus.COMPLETED && essay.score !== null,
      );

      const averageScore =
        completedEssays.length > 0
          ? completedEssays.reduce((sum, essay) => sum + essay.score!, 0) /
            completedEssays.length
          : null;

      // 통계 데이터 생성 (실제로는 DB에 저장해야 함)
      const statsData: Omit<StatsData, 'id' | 'createdAt' | 'updatedAt'> = {
        period,
        date: endDate,
        totalSubmissions: totalCount,
        successfulEvaluations: successfulCount,
        failedEvaluations: failedCount,
        pendingEvaluations: pendingCount,
        averageScore: averageScore ? Math.round(averageScore * 100) / 100 : null,
      };

      // 로그로 출력 (실제로는 DB에 저장)
      this.logger.log(`${period} stats generated:`, statsData);

      // TODO: 실제 구현에서는 stats 테이블에 저장
      // await this.statsRepository.save(statsData);
    } catch (error) {
      this.logger.error(`Failed to generate ${period} statistics:`, error);
    }
  }

  /**
   * 수동으로 통계를 생성하는 메서드 (테스트용)
   */
  async generateStatsManually(
    period: 'daily' | 'weekly' | 'monthly',
  ): Promise<void> {
    const daysMap = { daily: 1, weekly: 7, monthly: 30 };
    await this.generateStats(period, daysMap[period]);
  }
}