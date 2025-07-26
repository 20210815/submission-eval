import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('stats_monthly')
@Index(['month'], { unique: true })
export class StatsMonthly extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 7, comment: '월 (YYYY-MM)' })
  month: string;

  @Column({ type: 'int', default: 0, comment: '총 제출물 수' })
  totalCount: number;

  @Column({ type: 'int', default: 0, comment: '성공 제출물 수' })
  successCount: number;

  @Column({ type: 'int', default: 0, comment: '실패 제출물 수' })
  failCount: number;
}
