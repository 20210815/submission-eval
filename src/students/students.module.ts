import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
// 학생 관련 모듈을 정의합니다.
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { CacheCustomModule } from '../cache/cache.module';

@Module({
  imports: [TypeOrmModule.forFeature([Student]), CacheCustomModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
