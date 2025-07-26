import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { StatsDaily } from '../entities/stats-daily.entity';
import { StatsWeekly } from '../entities/stats-weekly.entity';
import { StatsMonthly } from '../entities/stats-monthly.entity';
import {
  Submission,
  EvaluationStatus,
} from '../../essays/entities/submission.entity';

interface StatsQueryResult {
  total_count: string;
  success_count: string;
  fail_count: string;
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    @InjectRepository(StatsDaily)
    private readonly statsDailyRepository: Repository<StatsDaily>,
    @InjectRepository(StatsWeekly)
    private readonly statsWeeklyRepository: Repository<StatsWeekly>,
    @InjectRepository(StatsMonthly)
    private readonly statsMonthlyRepository: Repository<StatsMonthly>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
  ) {}

  // 매일 자정 1분에 실행 (전날 통계 집계)
  @Cron('1 0 * * *', { timeZone: 'Asia/Seoul' })
  async generateDailyStats(): Promise<void> {
    const yesterday = this.getYesterday();
    this.logger.log(`Daily stats collection started for ${yesterday}`);

    try {
      await this.collectDailyStats(yesterday);
      this.logger.log(`Daily stats collection completed for ${yesterday}`);
    } catch (error) {
      this.logger.error(
        `Daily stats collection failed for ${yesterday}:`,
        error,
      );
    }
  }

  // 매주 월요일 자정 5분에 실행 (전주 통계 집계)
  @Cron('5 0 * * MON', { timeZone: 'Asia/Seoul' })
  async generateWeeklyStats(): Promise<void> {
    const lastWeek = this.getLastWeekRange();
    this.logger.log(
      `Weekly stats collection started for ${lastWeek.start} ~ ${lastWeek.end}`,
    );

    try {
      await this.collectWeeklyStats(lastWeek.start, lastWeek.end);
      this.logger.log(
        `Weekly stats collection completed for ${lastWeek.start} ~ ${lastWeek.end}`,
      );
    } catch (error) {
      this.logger.error(
        `Weekly stats collection failed for ${lastWeek.start} ~ ${lastWeek.end}:`,
        error,
      );
    }
  }

  // 매월 1일 자정 10분에 실행 (전월 통계 집계)
  @Cron('10 0 1 * *', { timeZone: 'Asia/Seoul' })
  async generateMonthlyStats(): Promise<void> {
    const lastMonth = this.getLastMonth();
    this.logger.log(`Monthly stats collection started for ${lastMonth}`);

    try {
      await this.collectMonthlyStats(lastMonth);
      this.logger.log(`Monthly stats collection completed for ${lastMonth}`);
    } catch (error) {
      this.logger.error(
        `Monthly stats collection failed for ${lastMonth}:`,
        error,
      );
    }
  }

  async collectDailyStats(date: string): Promise<StatsDaily> {
    // 미래 날짜 검증
    const today = new Date().toISOString().split('T')[0];
    if (date > today) {
      throw new Error(`미래 날짜(${date})의 통계는 수집할 수 없습니다. 오늘 날짜: ${today}`);
    }

    // 이미 집계된 데이터가 있는지 확인
    const existing = await this.statsDailyRepository.findOne({
      where: { date },
    });

    if (existing) {
      this.logger.warn(`Daily stats for ${date} already exists, updating...`);
    }

    // 해당 날짜의 제출물 통계 집계
    const stats = (await this.submissionRepository
      .createQueryBuilder('submission')
      .select([
        'COUNT(*) as total_count',
        'COUNT(CASE WHEN submission.status = :completed THEN 1 END) as success_count',
        'COUNT(CASE WHEN submission.status = :failed THEN 1 END) as fail_count',
      ])
      .where('DATE(submission.createdAt) = :date', { date })
      .setParameter('completed', EvaluationStatus.COMPLETED)
      .setParameter('failed', EvaluationStatus.FAILED)
      .getRawOne()) as StatsQueryResult;

    const statsData = {
      date,
      totalCount: parseInt(stats.total_count, 10) || 0,
      successCount: parseInt(stats.success_count, 10) || 0,
      failCount: parseInt(stats.fail_count, 10) || 0,
    };

    if (existing) {
      await this.statsDailyRepository.update(existing.id, statsData);
      return { ...existing, ...statsData };
    } else {
      const newStats = this.statsDailyRepository.create(statsData);
      return await this.statsDailyRepository.save(newStats);
    }
  }

  async collectWeeklyStats(
    weekStart: string,
    weekEnd: string,
  ): Promise<StatsWeekly> {
    // 미래 날짜 검증
    const today = new Date().toISOString().split('T')[0];
    if (weekEnd > today) {
      throw new Error(`미래 기간(${weekStart} ~ ${weekEnd})의 통계는 수집할 수 없습니다. 오늘 날짜: ${today}`);
    }

    // 이미 집계된 데이터가 있는지 확인
    const existing = await this.statsWeeklyRepository.findOne({
      where: { weekStart },
    });

    if (existing) {
      this.logger.warn(
        `Weekly stats for ${weekStart} already exists, updating...`,
      );
    }

    // 해당 주의 제출물 통계 집계
    const stats = (await this.submissionRepository
      .createQueryBuilder('submission')
      .select([
        'COUNT(*) as total_count',
        'COUNT(CASE WHEN submission.status = :completed THEN 1 END) as success_count',
        'COUNT(CASE WHEN submission.status = :failed THEN 1 END) as fail_count',
      ])
      .where('DATE(submission.createdAt) >= :weekStart', { weekStart })
      .andWhere('DATE(submission.createdAt) <= :weekEnd', { weekEnd })
      .setParameter('completed', EvaluationStatus.COMPLETED)
      .setParameter('failed', EvaluationStatus.FAILED)
      .getRawOne()) as StatsQueryResult;

    const statsData = {
      weekStart,
      weekEnd,
      totalCount: parseInt(stats.total_count, 10) || 0,
      successCount: parseInt(stats.success_count, 10) || 0,
      failCount: parseInt(stats.fail_count, 10) || 0,
    };

    if (existing) {
      await this.statsWeeklyRepository.update(existing.id, statsData);
      return { ...existing, ...statsData };
    } else {
      const newStats = this.statsWeeklyRepository.create(statsData);
      return await this.statsWeeklyRepository.save(newStats);
    }
  }

  async collectMonthlyStats(month: string): Promise<StatsMonthly> {
    // 미래 월 검증
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
    if (month > currentMonth) {
      throw new Error(`미래 월(${month})의 통계는 수집할 수 없습니다. 현재 월: ${currentMonth}`);
    }

    // 이미 집계된 데이터가 있는지 확인
    const existing = await this.statsMonthlyRepository.findOne({
      where: { month },
    });

    if (existing) {
      this.logger.warn(
        `Monthly stats for ${month} already exists, updating...`,
      );
    }

    // 해당 월의 제출물 통계 집계
    const stats = (await this.submissionRepository
      .createQueryBuilder('submission')
      .select([
        'COUNT(*) as total_count',
        'COUNT(CASE WHEN submission.status = :completed THEN 1 END) as success_count',
        'COUNT(CASE WHEN submission.status = :failed THEN 1 END) as fail_count',
      ])
      .where('DATE_FORMAT(submission.createdAt, "%Y-%m") = :month', { month })
      .setParameter('completed', EvaluationStatus.COMPLETED)
      .setParameter('failed', EvaluationStatus.FAILED)
      .getRawOne()) as StatsQueryResult;

    const statsData = {
      month,
      totalCount: parseInt(stats.total_count, 10) || 0,
      successCount: parseInt(stats.success_count, 10) || 0,
      failCount: parseInt(stats.fail_count, 10) || 0,
    };

    if (existing) {
      await this.statsMonthlyRepository.update(existing.id, statsData);
      return { ...existing, ...statsData };
    } else {
      const newStats = this.statsMonthlyRepository.create(statsData);
      return await this.statsMonthlyRepository.save(newStats);
    }
  }

  // 유틸리티 메서드들
  private getYesterday(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  private getLastWeekRange(): { start: string; end: string } {
    const today = new Date();
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - today.getDay() - 6); // 지난주 월요일

    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6); // 지난주 일요일

    return {
      start: lastMonday.toISOString().split('T')[0],
      end: lastSunday.toISOString().split('T')[0],
    };
  }

  private getLastMonth(): string {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return lastMonth.toISOString().slice(0, 7); // YYYY-MM
  }

  // 수동 실행 메서드들 (테스트 및 재집계용)
  async manualCollectDailyStats(date: string): Promise<StatsDaily> {
    this.logger.log(`Manual daily stats collection for ${date}`);
    return await this.collectDailyStats(date);
  }

  async manualCollectWeeklyStats(
    weekStart: string,
    weekEnd: string,
  ): Promise<StatsWeekly> {
    this.logger.log(
      `Manual weekly stats collection for ${weekStart} ~ ${weekEnd}`,
    );
    return await this.collectWeeklyStats(weekStart, weekEnd);
  }

  async manualCollectMonthlyStats(month: string): Promise<StatsMonthly> {
    this.logger.log(`Manual monthly stats collection for ${month}`);
    return await this.collectMonthlyStats(month);
  }
}
