import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

const MAX_NAME_LENGTH = 100;

@Entity('students')
export class Student extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: MAX_NAME_LENGTH })
  name: string;
}
