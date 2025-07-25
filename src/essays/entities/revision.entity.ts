import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Essay, ComponentType } from './essay.entity';

export enum RevisionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('revisions')
export class Revision {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'essay_id' })
  essayId: number;

  @ManyToOne(() => Essay, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'essay_id' })
  essay: Essay;

  @Column({ name: 'student_id' })
  studentId: number;

  @Column({
    name: 'component_type',
    type: 'enum',
    enum: ComponentType,
    enumName: 'component_type_enum',
  })
  componentType: ComponentType;

  @Column({ name: 'revision_reason', type: 'text', nullable: true })
  revisionReason: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: RevisionStatus,
    default: RevisionStatus.PENDING,
  })
  status: RevisionStatus;

  @Column({ name: 'score', type: 'int', nullable: true })
  score: number | null;

  @Column({ name: 'feedback', type: 'text', nullable: true })
  feedback: string | null;

  @Column({ name: 'highlights', type: 'jsonb', nullable: true })
  highlights: string[] | null;

  @Column({ name: 'highlight_submit_text', type: 'text', nullable: true })
  highlightSubmitText: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'api_latency', type: 'int', nullable: true })
  apiLatency: number | null;

  @Column({ name: 'trace_id', type: 'varchar', length: 255, nullable: true })
  traceId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
