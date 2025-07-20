import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ComponentType } from '../entities/essay.entity';

export class SubmitEssayDto {
  @ApiProperty({
    description: '에세이 제목 (필수)',
    example: 'My English Essay',
    maxLength: 255,
    required: true,
  })
  @IsString({ message: '제목은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '제목은 필수입니다.' })
  @MaxLength(255, { message: '제목은 255자 이하여야 합니다.' })
  title: string;

  @ApiProperty({
    description: '에세이 본문 내용 (필수)',
    example: 'This is my essay about English language learning...',
    required: true,
  })
  @IsString({ message: '에세이 내용은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '에세이 내용은 필수입니다.' })
  submitText: string;

  @ApiProperty({
    description: '에세이 구성 요소 유형 (필수)',
    enum: ComponentType,
    example: ComponentType.WRITING,
    required: true,
    enumName: 'ComponentType',
  })
  @IsEnum(ComponentType, { message: '유효한 구성 요소 유형을 선택해주세요.' })
  componentType: ComponentType;

  @ApiProperty({
    description: '비디오 파일 (선택사항, 최대 100MB)',
    type: 'string',
    format: 'binary',
    required: false,
  })
  video?: any;
}
