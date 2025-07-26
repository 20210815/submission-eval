import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, Matches } from 'class-validator';

export class GetDailyStatsDto {
  @ApiProperty({
    description: '조회할 날짜 (YYYY-MM-DD)',
    example: '2025-07-26',
  })
  @IsDateString()
  day: string;
}

export class GetWeeklyStatsDto {
  @ApiProperty({
    description: '주 시작일 (YYYY-MM-DD)',
    example: '2025-07-26',
  })
  @IsDateString()
  weekStart: string;

  @ApiProperty({
    description: '주 종료일 (YYYY-MM-DD)',
    example: '2025-07-31',
  })
  @IsDateString()
  weekEnd: string;
}

export class GetMonthlyStatsDto {
  @ApiProperty({
    description: '월 (YYYY-MM)',
    example: '2025-07',
  })
  @Matches(/^\d{4}-\d{2}$/, { message: '월은 YYYY-MM 형식이어야 합니다.' })
  month: string;
}

export class StatsResponseDto {
  @ApiProperty({ description: '총 제출물 수', example: 100 })
  totalCount: number;

  @ApiProperty({ description: '성공 제출물 수', example: 80 })
  successCount: number;

  @ApiProperty({ description: '실패 제출물 수', example: 20 })
  failCount: number;

  @ApiProperty({ description: '성공률 (%)', example: 80.0 })
  successRate: number;
}

export class DailyStatsResponseDto extends StatsResponseDto {
  @ApiProperty({ description: '날짜', example: '2025-07-26' })
  date: string;
}

export class WeeklyStatsResponseDto extends StatsResponseDto {
  @ApiProperty({ description: '주 시작일', example: '2025-07-26' })
  weekStart: string;

  @ApiProperty({ description: '주 종료일', example: '2025-08-01' })
  weekEnd: string;
}

export class MonthlyStatsResponseDto extends StatsResponseDto {
  @ApiProperty({ description: '월 (YYYY-MM)', example: '2025-07' })
  month: string;
}
