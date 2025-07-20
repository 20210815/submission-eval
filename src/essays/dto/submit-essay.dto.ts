import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ComponentType } from '../entities/essay.entity';

export class SubmitEssayDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  submitText: string;

  @IsEnum(ComponentType)
  componentType: ComponentType;
}
