import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Submission } from './submission.entity';

@Entity('submission_media')
export class SubmissionMedia extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'submission_id' })
  submissionId: number;

  @Column({ type: 'text', name: 'video_url', nullable: true })
  videoUrl: string | null;

  @Column({ type: 'text', name: 'audio_url', nullable: true })
  audioUrl: string | null;

  @Column({ type: 'text', name: 'original_file_name', nullable: true })
  originalFileName: string | null;

  @ManyToOne(() => Submission, (submission) => submission.media, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submission_id' })
  submission: Submission;
}
