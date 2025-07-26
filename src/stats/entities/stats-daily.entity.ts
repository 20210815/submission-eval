import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('stats_daily')
@Index(['date'], { unique: true })
export class StatsDaily extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', comment: '집계 날짜' })
  date: string;

  @Column({ type: 'int', default: 0, comment: '총 제출물 수' })
  totalCount: number;

  @Column({ type: 'int', default: 0, comment: '성공 제출물 수' })
  successCount: number;

  @Column({ type: 'int', default: 0, comment: '실패 제출물 수' })
  failCount: number;
}
