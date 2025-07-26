import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  Length,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ComponentType } from '../enums/component-type.enum';

export class SubmitSubmissionDto {
  @ApiProperty({
    description: '제출물 제목 (필수)',
    example: 'My English Submission',
    maxLength: 255,
    required: true,
  })
  @Transform(({ value }): string =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: '제목은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '제목은 필수입니다.' })
  @MaxLength(255, { message: '제목은 255자 이하여야 합니다.' })
  title: string;

  @ApiProperty({
    description: `
      제출물 본문 내용 - Enhanced validation (v1.1.0):
      - 최소 10자 이상 (새로 추가된 제한)
      - 최대 10,000자 이하
      - 자동 공백 제거 (trim)
      - 보안을 위한 입력 검증 강화
    `,
    example:
      'This is my submission about English language learning and its importance in modern society...',
    required: true,
    minLength: 10,
    maxLength: 10000,
  })
  @Transform(({ value }): string =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: '제출물 내용은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '제출물 내용은 필수입니다.' })
  @Length(10, 10000, {
    message: '제출물 내용은 10자 이상 10,000자 이하여야 합니다.',
  })
  submitText: string;

  @ApiProperty({
    description: '제출물 구성 요소 유형 (필수)',
    enum: ComponentType,
    example: ComponentType.WRITING,
    required: true,
    enumName: 'ComponentType',
  })
  @IsEnum(ComponentType, { message: '유효한 구성 요소 유형을 선택해주세요.' })
  componentType: ComponentType;

  @ApiProperty({
    description: `
      비디오 파일 - Enhanced validation (v1.1.0):
      - 선택사항 (speaking 유형에서 주로 사용)
      - 최대 100MB 크기 제한
      - 비디오 형식만 허용 (mimetype 검증)
      - BadRequestException으로 적절한 오류 응답
      - Azure Blob Storage에 자동 업로드
    `,
    type: 'string',
    format: 'binary',
    required: false,
  })
  @IsOptional()
  video?: any;
}
