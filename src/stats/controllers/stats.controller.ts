import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { StatsService } from '../services/stats.service';
import {
  GetDailyStatsDto,
  GetWeeklyStatsDto,
  GetMonthlyStatsDto,
  DailyStatsResponseDto,
  WeeklyStatsResponseDto,
  MonthlyStatsResponseDto,
  ManualCollectDto,
  ManualCollectWeeklyDto,
  ManualCollectMonthlyDto,
} from '../dto/stats.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StatsDaily } from '../entities/stats-daily.entity';
import { StatsWeekly } from '../entities/stats-weekly.entity';
import { StatsMonthly } from '../entities/stats-monthly.entity';

@ApiTags('Statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/stats')
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    @InjectRepository(StatsDaily)
    private readonly statsDailyRepository: Repository<StatsDaily>,
    @InjectRepository(StatsWeekly)
    private readonly statsWeeklyRepository: Repository<StatsWeekly>,
    @InjectRepository(StatsMonthly)
    private readonly statsMonthlyRepository: Repository<StatsMonthly>,
  ) {}

  @Get('daily')
  @ApiOperation({
    summary: '일일 통계 조회',
    description: '지정된 기간의 일일 제출물 통계를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '일일 통계 조회 성공',
    type: [DailyStatsResponseDto],
  })
  async getDailyStats(
    @Query() query: GetDailyStatsDto,
  ): Promise<DailyStatsResponseDto[]> {
    const stats = await this.statsDailyRepository.find({
      where: {
        date: Between(query.startDate, query.endDate),
      },
      order: { date: 'ASC' },
    });

    return stats.map((stat) => ({
      date: stat.date,
      totalCount: stat.totalCount,
      successCount: stat.successCount,
      failCount: stat.failCount,
      successRate:
        stat.totalCount > 0
          ? Number(((stat.successCount / stat.totalCount) * 100).toFixed(1))
          : 0,
    }));
  }

  @Get('weekly')
  @ApiOperation({
    summary: '주간 통계 조회',
    description: '지정된 연도/월의 주간 제출물 통계를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '주간 통계 조회 성공',
    type: [WeeklyStatsResponseDto],
  })
  async getWeeklyStats(
    @Query() query: GetWeeklyStatsDto,
  ): Promise<WeeklyStatsResponseDto[]> {
    const whereCondition: Record<string, any> = {};

    if (query.year && query.month) {
      const startDate = `${query.year}-${query.month.padStart(2, '0')}-01`;
      const endDate = `${query.year}-${query.month.padStart(2, '0')}-31`;
      whereCondition.weekStart = Between(startDate, endDate);
    } else if (query.year) {
      const startDate = `${query.year}-01-01`;
      const endDate = `${query.year}-12-31`;
      whereCondition.weekStart = Between(startDate, endDate);
    }

    const stats = await this.statsWeeklyRepository.find({
      where: whereCondition,
      order: { weekStart: 'ASC' },
    });

    return stats.map((stat) => ({
      weekStart: stat.weekStart,
      weekEnd: stat.weekEnd,
      totalCount: stat.totalCount,
      successCount: stat.successCount,
      failCount: stat.failCount,
      successRate:
        stat.totalCount > 0
          ? Number(((stat.successCount / stat.totalCount) * 100).toFixed(1))
          : 0,
    }));
  }

  @Get('monthly')
  @ApiOperation({
    summary: '월간 통계 조회',
    description: '지정된 연도의 월간 제출물 통계를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '월간 통계 조회 성공',
    type: [MonthlyStatsResponseDto],
  })
  async getMonthlyStats(
    @Query() query: GetMonthlyStatsDto,
  ): Promise<MonthlyStatsResponseDto[]> {
    const whereCondition: Record<string, any> = {};

    if (query.year) {
      whereCondition.month = Between(`${query.year}-01`, `${query.year}-12`);
    }

    const stats = await this.statsMonthlyRepository.find({
      where: whereCondition,
      order: { month: 'ASC' },
    });

    return stats.map((stat) => ({
      month: stat.month,
      totalCount: stat.totalCount,
      successCount: stat.successCount,
      failCount: stat.failCount,
      successRate:
        stat.totalCount > 0
          ? Number(((stat.successCount / stat.totalCount) * 100).toFixed(1))
          : 0,
    }));
  }

  // 수동 통계 수집 API들 (관리자용)
  @Post('collect/daily')
  @ApiOperation({
    summary: '일일 통계 수동 수집',
    description: '특정 날짜의 통계를 수동으로 수집합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '일일 통계 수집 완료',
    type: DailyStatsResponseDto,
  })
  async manualCollectDaily(
    @Body() body: ManualCollectDto,
  ): Promise<DailyStatsResponseDto> {
    const stat = await this.statsService.manualCollectDailyStats(body.date);

    return {
      date: stat.date,
      totalCount: stat.totalCount,
      successCount: stat.successCount,
      failCount: stat.failCount,
      successRate:
        stat.totalCount > 0
          ? Number(((stat.successCount / stat.totalCount) * 100).toFixed(1))
          : 0,
    };
  }

  @Post('collect/weekly')
  @ApiOperation({
    summary: '주간 통계 수동 수집',
    description: '특정 주의 통계를 수동으로 수집합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '주간 통계 수집 완료',
    type: WeeklyStatsResponseDto,
  })
  async manualCollectWeekly(
    @Body() body: ManualCollectWeeklyDto,
  ): Promise<WeeklyStatsResponseDto> {
    const stat = await this.statsService.manualCollectWeeklyStats(
      body.weekStart,
      body.weekEnd,
    );

    return {
      weekStart: stat.weekStart,
      weekEnd: stat.weekEnd,
      totalCount: stat.totalCount,
      successCount: stat.successCount,
      failCount: stat.failCount,
      successRate:
        stat.totalCount > 0
          ? Number(((stat.successCount / stat.totalCount) * 100).toFixed(1))
          : 0,
    };
  }

  @Post('collect/monthly')
  @ApiOperation({
    summary: '월간 통계 수동 수집',
    description: '특정 월의 통계를 수동으로 수집합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '월간 통계 수집 완료',
    type: MonthlyStatsResponseDto,
  })
  async manualCollectMonthly(
    @Body() body: ManualCollectMonthlyDto,
  ): Promise<MonthlyStatsResponseDto> {
    const stat = await this.statsService.manualCollectMonthlyStats(body.month);

    return {
      month: stat.month,
      totalCount: stat.totalCount,
      successCount: stat.successCount,
      failCount: stat.failCount,
      successRate:
        stat.totalCount > 0
          ? Number(((stat.successCount / stat.totalCount) * 100).toFixed(1))
          : 0,
    };
  }
}
