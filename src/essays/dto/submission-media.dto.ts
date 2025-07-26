import { ApiProperty } from '@nestjs/swagger';

export class SubmissionMediaResponseDto {
  @ApiProperty({
    description: '미디어 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '제출물 ID',
    example: 1,
  })
  submissionId: number;

  @ApiProperty({
    description: '변환된 비디오 URL',
    example: 'https://storage.example.com/videos/submission1_converted.mp4',
    required: false,
  })
  videoUrl?: string;

  @ApiProperty({
    description: '추출된 오디오 URL',
    example: 'https://storage.example.com/audios/submission1_audio.mp3',
    required: false,
  })
  audioUrl?: string;

  @ApiProperty({
    description: '원본 파일명',
    example: 'my_video.mp4',
    required: false,
  })
  originalFileName?: string;

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
