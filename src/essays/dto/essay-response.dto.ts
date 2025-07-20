import { ApiProperty } from '@nestjs/swagger';
import { ComponentType, EvaluationStatus } from '../entities/essay.entity';

export class EssayResponseDto {
  @ApiProperty({
    description: '에세이 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '에세이 제목',
    example: 'My English Essay',
  })
  title: string;

  @ApiProperty({
    description: '에세이 본문 내용',
    example: 'This is my essay about English language learning...',
  })
  submitText: string;

  @ApiProperty({
    description: '에세이 구성 요소 유형',
    enum: ComponentType,
    example: ComponentType.WRITING,
  })
  componentType: ComponentType;

  @ApiProperty({
    description: '평가 상태',
    enum: EvaluationStatus,
    example: EvaluationStatus.COMPLETED,
  })
  status: EvaluationStatus;

  @ApiProperty({
    description: '평가 점수 (0-100점, 평가 완료 시에만 제공)',
    example: 85,
    required: false,
    minimum: 0,
    maximum: 100,
  })
  score?: number;

  @ApiProperty({
    description: 'AI 피드백 (평가 완료 시에만 제공)',
    example:
      '문법과 어휘 사용이 우수합니다. 다만 문장 구조를 더 다양하게 사용하면 좋겠습니다.',
    required: false,
  })
  feedback?: string;

  @ApiProperty({
    description: '하이라이트된 중요 구문들 (평가 완료 시에만 제공)',
    example: ['excellent vocabulary', 'good grammar'],
    type: [String],
    required: false,
  })
  highlights?: string[];

  @ApiProperty({
    description: '하이라이트가 적용된 에세이 텍스트 (평가 완료 시에만 제공)',
    example: 'This is my essay with <b>excellent vocabulary</b>...',
    required: false,
  })
  highlightSubmitText?: string;

  @ApiProperty({
    description: '처리된 비디오 파일 URL (비디오 업로드 시에만 제공)',
    example: 'https://storage.example.com/videos/essay1_video.mp4',
    required: false,
  })
  videoUrl?: string;

  @ApiProperty({
    description: '추출된 오디오 파일 URL (비디오 업로드 시에만 제공)',
    example: 'https://storage.example.com/audios/essay1_audio.mp3',
    required: false,
  })
  audioUrl?: string;

  @ApiProperty({
    description: '생성 일시',
    example: '2023-12-01T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2023-12-01T10:30:00Z',
  })
  updatedAt: Date;
}

export class SubmitEssayResponseDto {
  @ApiProperty({
    description: '제출된 에세이 ID',
    example: 1,
  })
  essayId: number;

  @ApiProperty({
    description: '평가 상태',
    enum: EvaluationStatus,
    example: EvaluationStatus.PENDING,
    enumName: 'EvaluationStatus',
  })
  status: EvaluationStatus;

  @ApiProperty({
    description: '응답 메시지',
    example: '에세이가 성공적으로 제출되었습니다. 평가가 진행 중입니다.',
  })
  message: string;
}
