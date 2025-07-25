import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Essay } from './essay.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { ComponentType } from '../enums/component-type.enum';

export enum RevisionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('revisions')
export class Revision extends BaseEntity {
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
    enumName: 'component_type_enum', // ← 이거 추가
    type: 'enum',
    enum: ComponentType,
    nullable: false,
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
}
