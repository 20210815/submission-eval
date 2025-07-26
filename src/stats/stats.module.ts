import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsService } from './services/stats.service';
import { StatsController } from './controllers/stats.controller';
import { StatsDaily } from './entities/stats-daily.entity';
import { StatsWeekly } from './entities/stats-weekly.entity';
import { StatsMonthly } from './entities/stats-monthly.entity';
import { Submission } from '../essays/entities/submission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StatsDaily,
      StatsWeekly,
      StatsMonthly,
      Submission,
    ]),
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
