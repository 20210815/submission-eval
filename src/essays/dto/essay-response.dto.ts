import { ComponentType, EvaluationStatus } from '../entities/essay.entity';

export class EssayResponseDto {
  id: number;
  title: string;
  submitText: string;
  componentType: ComponentType;
  status: EvaluationStatus;
  score?: number;
  feedback?: string;
  highlights?: string[];
  highlightSubmitText?: string;
  videoUrl?: string;
  audioUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SubmitEssayResponseDto {
  essayId: number;
  status: EvaluationStatus;
  message: string;
}
