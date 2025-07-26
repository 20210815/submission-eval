import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { StudentsService } from './students.service';
import { CacheCustomModule } from '../cache/cache.module';

@Module({
  imports: [TypeOrmModule.forFeature([Student]), CacheCustomModule],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
