import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumberString,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EvaluationStatus } from '../entities/submission.entity';
import { SubmissionResponseDto } from './submission-response.dto';

export class SubmissionQueryDto {
  @ApiPropertyOptional({
    description: '페이지 번호 (기본값: 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: '페이지 번호는 1 이상이어야 합니다.' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: '페이지 크기 (기본값: 20, 최대: 100)',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: '페이지 크기는 1 이상이어야 합니다.' })
  size?: number = 20;

  @ApiPropertyOptional({
    description: '정렬 기준 (필드명,정렬방향)',
    example: 'createdAt,DESC',
    enum: [
      'createdAt,ASC',
      'createdAt,DESC',
      'updatedAt,ASC',
      'updatedAt,DESC',
      'score,ASC',
      'score,DESC',
      'title,ASC',
      'title,DESC',
    ],
  })
  @IsOptional()
  @IsString()
  sort?: string = 'createdAt,DESC';

  @ApiPropertyOptional({
    description: '평가 상태 필터',
    enum: EvaluationStatus,
    example: EvaluationStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(EvaluationStatus, { message: '유효한 평가 상태를 선택해주세요.' })
  status?: EvaluationStatus;

  @ApiPropertyOptional({
    description: '학생 ID로 필터링',
    example: 123,
  })
  @IsOptional()
  @IsNumberString({}, { message: '학생 ID는 숫자여야 합니다.' })
  studentId?: string;

  @ApiPropertyOptional({
    description: '학생 이름으로 검색 (부분 일치)',
    example: '홍길동',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  studentName?: string;

  @ApiPropertyOptional({
    description: '제출물 제목으로 검색 (부분 일치)',
    example: 'English Essay',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  title?: string;
}

export class SubmissionListResponseDto {
  @ApiPropertyOptional({
    description: '제출물 목록',
    type: 'array',
  })
  data: (SubmissionResponseDto & { student: { id: number; name: string } })[];

  @ApiPropertyOptional({
    description: '전체 항목 수',
    example: 150,
  })
  total: number;

  @ApiPropertyOptional({
    description: '전체 페이지 수',
    example: 8,
  })
  totalPages: number;

  @ApiPropertyOptional({
    description: '현재 페이지',
    example: 1,
  })
  currentPage: number;

  @ApiPropertyOptional({
    description: '페이지 크기',
    example: 20,
  })
  pageSize: number;

  @ApiPropertyOptional({
    description: '다음 페이지 존재 여부',
    example: true,
  })
  hasNext: boolean;

  @ApiPropertyOptional({
    description: '이전 페이지 존재 여부',
    example: false,
  })
  hasPrevious: boolean;
}
