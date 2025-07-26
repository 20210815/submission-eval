import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

export class GetDailyStatsDto {
  @ApiProperty({
    description: '시작 날짜 (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: '종료 날짜 (YYYY-MM-DD)',
    example: '2025-01-31',
  })
  @IsDateString()
  endDate: string;
}

export class GetWeeklyStatsDto {
  @ApiPropertyOptional({
    description: '연도',
    example: 2025,
  })
  @IsOptional()
  @IsString()
  year?: string;

  @ApiPropertyOptional({
    description: '월 (1-12)',
    example: 1,
  })
  @IsOptional()
  @IsString()
  month?: string;
}

export class GetMonthlyStatsDto {
  @ApiPropertyOptional({
    description: '연도',
    example: 2025,
  })
  @IsOptional()
  @IsString()
  year?: string;
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
  @ApiProperty({ description: '날짜', example: '2025-01-15' })
  date: string;
}

export class WeeklyStatsResponseDto extends StatsResponseDto {
  @ApiProperty({ description: '주 시작일', example: '2025-01-13' })
  weekStart: string;

  @ApiProperty({ description: '주 종료일', example: '2025-01-19' })
  weekEnd: string;
}

export class MonthlyStatsResponseDto extends StatsResponseDto {
  @ApiProperty({ description: '월 (YYYY-MM)', example: '2025-01' })
  month: string;
}

export class ManualCollectDto {
  @ApiProperty({
    description: '수집할 날짜 (YYYY-MM-DD)',
    example: '2025-01-15',
  })
  @IsDateString()
  date: string;
}

export class ManualCollectWeeklyDto {
  @ApiProperty({
    description: '주 시작일 (YYYY-MM-DD)',
    example: '2025-01-13',
  })
  @IsDateString()
  weekStart: string;

  @ApiProperty({
    description: '주 종료일 (YYYY-MM-DD)',
    example: '2025-01-19',
  })
  @IsDateString()
  weekEnd: string;
}

export class ManualCollectMonthlyDto {
  @ApiProperty({
    description: '월 (YYYY-MM)',
    example: '2025-01',
  })
  @Matches(/^\d{4}-\d{2}$/, { message: '월은 YYYY-MM 형식이어야 합니다.' })
  month: string;
}
