import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
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
} from '../dto/stats.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StatsDaily } from '../entities/stats-daily.entity';
import { StatsWeekly } from '../entities/stats-weekly.entity';
import { StatsMonthly } from '../entities/stats-monthly.entity';
import {
  API_RESPONSE_SCHEMAS,
  STATS_VALIDATION_ERROR_EXAMPLES,
} from '../../common/constants/api-response-schemas';

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
    description: '특정 날짜의 일일 제출물 통계를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '일일 통계 조회 성공',
    type: DailyStatsResponseDto,
  })
  @ApiResponse(API_RESPONSE_SCHEMAS.FUTURE_DATE_STATS_COLLECTION)
  async getDailyStats(
    @Query() query: GetDailyStatsDto,
  ): Promise<DailyStatsResponseDto> {
    try {
      const today = new Date().toISOString().split('T')[0];
      if (query.day > today) {
        throw new BadRequestException('미래 날짜의 통계는 조회할 수 없습니다.');
      }

      const stat = await this.statsDailyRepository.findOne({
        where: {
          date: query.day,
        },
      });

      if (!stat) {
        return {
          date: query.day,
          totalCount: 0,
          successCount: 0,
          failCount: 0,
          successRate: 0,
        };
      }

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
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('일일 통계 조회 중 오류가 발생했습니다.');
    }
  }

  @Get('weekly')
  @ApiOperation({
    summary: '주간 통계 조회',
    description: '지정된 주 시작일과 종료일의 주간 제출물 통계를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '주간 통계 조회 성공',
    type: [WeeklyStatsResponseDto],
  })
  @ApiResponse(STATS_VALIDATION_ERROR_EXAMPLES)
  async getWeeklyStats(
    @Query() query: GetWeeklyStatsDto,
  ): Promise<WeeklyStatsResponseDto[]> {
    try {
      const today = new Date().toISOString().split('T')[0];

      if (query.weekStart > today) {
        throw new BadRequestException(
          '미래 시작 날짜의 통계는 조회할 수 없습니다.',
        );
      }

      if (query.weekEnd > today) {
        throw new BadRequestException(
          '미래 종료 날짜의 통계는 조회할 수 없습니다.',
        );
      }

      if (query.weekStart > query.weekEnd) {
        throw new BadRequestException(
          '시작 날짜는 종료 날짜보다 이전이어야 합니다.',
        );
      }

      const whereCondition: Record<string, any> = {};
      whereCondition.weekStart = Between(query.weekStart, query.weekEnd);

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
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('주간 통계 조회 중 오류가 발생했습니다.');
    }
  }

  @Get('monthly')
  @ApiOperation({
    summary: '월간 통계 조회',
    description: '지정된 월의 월간 제출물 통계를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '월간 통계 조회 성공',
    type: MonthlyStatsResponseDto,
  })
  @ApiResponse(API_RESPONSE_SCHEMAS.FUTURE_MONTH_STATS_COLLECTION)
  async getMonthlyStats(
    @Query() query: GetMonthlyStatsDto,
  ): Promise<MonthlyStatsResponseDto> {
    try {
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;

      if (query.month > currentMonth) {
        throw new BadRequestException('미래 월의 통계는 조회할 수 없습니다.');
      }

      const stat = await this.statsMonthlyRepository.findOne({
        where: {
          month: query.month,
        },
      });

      if (!stat) {
        return {
          month: query.month,
          totalCount: 0,
          successCount: 0,
          failCount: 0,
          successRate: 0,
        };
      }

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
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('월간 통계 조회 중 오류가 발생했습니다.');
    }
  }
}
