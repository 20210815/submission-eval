import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  Submission,
  EvaluationStatus,
} from '../essays/entities/submission.entity';
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
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(Revision)
    private revisionRepository: Repository<Revision>,
    private openAIService: OpenAIService,
    private textHighlightingService: TextHighlightingService,
    private notificationService: NotificationService,
  ) {}

  /**
   * 자동 재시도 작업 - 매시간 실행
   * 실패한 제출물들을 1시간마다 재평가 시도
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoRetryFailedSubmissions(): Promise<void> {
    this.logger.log('Starting auto-retry job for failed submissions');

    try {
      // 1시간 전보다 오래된 실패한 제출물들 조회
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const failedSubmissions = await this.submissionRepository.find({
        where: {
          status: EvaluationStatus.FAILED,
          updatedAt: LessThan(oneHourAgo),
        },
        relations: ['student'],
        take: 10, // 한 번에 최대 10개만 처리
      });

      this.logger.log(
        `Found ${failedSubmissions.length} failed submissions to retry`,
      );

      for (const submission of failedSubmissions) {
        try {
          await this.retrySubmissionEvaluation(submission);
          this.logger.log(`Successfully retried submission ${submission.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to retry submission ${submission.id}:`,
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

  private async retrySubmissionEvaluation(
    submission: Submission,
  ): Promise<void> {
    const startTime = Date.now();
    const traceId = `retry-${submission.id}-${Date.now()}`;

    try {
      // 상태를 처리 중으로 변경
      await this.submissionRepository.update(submission.id, {
        status: EvaluationStatus.PROCESSING,
      });

      // AI 평가 수행
      const aiResult = await this.openAIService.evaluateSubmission(
        submission.title,
        submission.submitText,
        submission.componentType,
      );

      // 텍스트 하이라이팅
      const highlightSubmitText = this.textHighlightingService.highlightText(
        submission.submitText,
        aiResult.highlights,
      );

      // 제출물 업데이트
      await this.submissionRepository.update(submission.id, {
        status: EvaluationStatus.COMPLETED,
        score: aiResult.score,
        feedback: aiResult.feedback,
        highlights: aiResult.highlights,
        highlightSubmitText,
        errorMessage: null,
      });

      // 성공한 재시도 로그를 위한 revision 생성
      const revision = this.revisionRepository.create({
        submissionId: submission.id,
        studentId: submission.studentId,
        componentType: submission.componentType,
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
        `Auto-retry successful for submission ${submission.id} with score: ${aiResult.score}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const apiLatency = Date.now() - startTime;

      // 제출물 실패 상태 유지
      await this.submissionRepository.update(submission.id, {
        status: EvaluationStatus.FAILED,
        errorMessage,
      });

      // 실패한 재시도 로그를 위한 revision 생성
      const revision = this.revisionRepository.create({
        submissionId: submission.id,
        studentId: submission.studentId,
        componentType: submission.componentType,
        revisionReason: 'Auto-retry for failed evaluation',
        status: RevisionStatus.FAILED,
        errorMessage,
        apiLatency,
        traceId,
      });

      await this.revisionRepository.save(revision);

      // 실패 알림 발송
      await this.notificationService.notifyEvaluationFailure(
        submission.id,
        submission.studentId,
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
      const [submissions, totalCount] =
        await this.submissionRepository.findAndCount({
          where: {
            createdAt: LessThan(endDate),
          },
        });

      const successfulCount = submissions.filter(
        (submission) => submission.status === EvaluationStatus.COMPLETED,
      ).length;

      const failedCount = submissions.filter(
        (submission) => submission.status === EvaluationStatus.FAILED,
      ).length;

      const pendingCount = submissions.filter(
        (submission) =>
          submission.status === EvaluationStatus.PENDING ||
          submission.status === EvaluationStatus.PROCESSING,
      ).length;

      // 평균 점수 계산
      const completedSubmissions = submissions.filter(
        (submission) =>
          submission.status === EvaluationStatus.COMPLETED &&
          submission.score !== null,
      );

      const averageScore =
        completedSubmissions.length > 0
          ? completedSubmissions.reduce(
              (sum, submission) => sum + submission.score!,
              0,
            ) / completedSubmissions.length
          : null;

      // 통계 데이터 생성 (실제로는 DB에 저장해야 함)
      const statsData: Omit<StatsData, 'id' | 'createdAt' | 'updatedAt'> = {
        period,
        date: endDate,
        totalSubmissions: totalCount,
        successfulEvaluations: successfulCount,
        failedEvaluations: failedCount,
        pendingEvaluations: pendingCount,
        averageScore: averageScore
          ? Math.round(averageScore * 100) / 100
          : null,
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
