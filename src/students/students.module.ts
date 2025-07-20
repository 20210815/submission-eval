import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
// 학생 관련 모듈을 정의합니다.
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [TypeOrmModule.forFeature([Student])],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [TypeOrmModule], // 필요 시 다른 모듈에서도 사용 가능
})
export class StudentsModule {}
