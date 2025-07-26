import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Submission } from './submission.entity';
import { BaseEntity } from '../../common/entities/base.entity';

export enum LogType {
  VIDEO_PROCESSING = 'video_processing',
  AZURE_UPLOAD = 'azure_upload',
  AI_EVALUATION = 'ai_evaluation',
  TEXT_HIGHLIGHTING = 'text_highlighting',
}

export enum LogStatus {
  STARTED = 'started',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('evaluation_logs')
export class EvaluationLog extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: LogType,
    nullable: false,
  })
  type: LogType;

  @Column({
    type: 'enum',
    enum: LogStatus,
    nullable: false,
  })
  status: LogStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  requestUri: string;

  @Column({ type: 'int', nullable: true })
  latency: number;

  @Column({ type: 'json', nullable: true })
  requestData: any;

  @Column({ type: 'json', nullable: true })
  responseData: any;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  traceId: string;

  @ManyToOne(() => Submission, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submission_id' })
  submission: Submission;

  @Column({ name: 'submission_id' })
  submissionId: number;
}
