import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { Revision } from './revision.entity';
import { ComponentType } from '../enums/component-type.enum';

export enum EvaluationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('submissions')
export class Submission extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  submitText: string;

  @Column({
    type: 'enum',
    enum: ComponentType,
    nullable: false,
  })
  componentType: ComponentType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  videoUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  audioUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  originalVideoUrl: string | null;

  @Column({
    type: 'enum',
    enum: EvaluationStatus,
    default: EvaluationStatus.PENDING,
  })
  status: EvaluationStatus;

  @Column({ type: 'int', nullable: true })
  score: number | null;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  @Column({ type: 'json', nullable: true })
  highlights: string[] | null;

  @Column({ type: 'text', nullable: true })
  highlightSubmitText: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @ManyToOne(() => Student, { nullable: false })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: number;

  @OneToMany(() => Revision, (revision: Revision) => revision.submission)
  revisions: Revision[];
}
