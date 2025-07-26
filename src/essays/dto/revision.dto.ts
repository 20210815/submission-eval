import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComponentType } from '../enums/component-type.enum';
import { RevisionStatus } from '../entities/revision.entity';

export class CreateRevisionDto {
  @ApiProperty({
    description: 'Submission ID',
    example: '1',
  })
  @IsString({ message: 'Submission ID는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: 'Submission ID는 필수 입력 항목입니다.' })
  submissionId: string;
}

export class RevisionResponseDto {
  @ApiProperty({ description: '재평가 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '제출물 ID', example: 1 })
  submissionId: number;

  @ApiProperty({ description: '학생 ID', example: 123 })
  studentId: number;

  @ApiProperty({
    description: '구성 요소 타입',
    enum: ComponentType,
    example: ComponentType.WRITING,
  })
  componentType: ComponentType;

  @ApiPropertyOptional({
    description: '재평가 사유',
    example: '초기 평가에서 오류가 발생하여 재평가 요청',
  })
  revisionReason?: string;

  @ApiProperty({
    description: '재평가 상태',
    enum: RevisionStatus,
    example: RevisionStatus.COMPLETED,
  })
  status: RevisionStatus;

  @ApiPropertyOptional({ description: '점수 (0-10)', example: 8 })
  score?: number;

  @ApiPropertyOptional({
    description: '피드백',
    example: 'Great improvement in grammar and structure.',
  })
  feedback?: string;

  @ApiPropertyOptional({
    description: '강조 표시된 문구들',
    example: ['I like school.', 'pizza'],
  })
  highlights?: string[];

  @ApiPropertyOptional({
    description: '강조 표시가 적용된 텍스트',
    example: 'Hello my name is ... <b>I like school.</b> I love <b>pizza</b>.',
  })
  highlightSubmitText?: string;

  @ApiPropertyOptional({
    description: '오류 메시지 (실패 시)',
    example: 'AI 평가 중 네트워크 오류가 발생했습니다.',
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'API 응답 시간 (ms)',
    example: 1432,
  })
  apiLatency?: number;

  @ApiPropertyOptional({
    description: '추적 ID',
    example: 'trace-12345-67890',
  })
  traceId?: string;
}
