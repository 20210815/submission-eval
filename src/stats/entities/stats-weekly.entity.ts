import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('stats_weekly')
@Index(['weekStart'], { unique: true })
export class StatsWeekly extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', comment: '주 시작일 (월요일)' })
  weekStart: string;

  @Column({ type: 'date', comment: '주 종료일 (일요일)' })
  weekEnd: string;

  @Column({ type: 'int', default: 0, comment: '총 제출물 수' })
  totalCount: number;

  @Column({ type: 'int', default: 0, comment: '성공 제출물 수' })
  successCount: number;

  @Column({ type: 'int', default: 0, comment: '실패 제출물 수' })
  failCount: number;
}
