import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { Submission } from '../essays/entities/submission.entity';
import { Revision } from '../essays/entities/revision.entity';
import { OpenAIService } from '../essays/services/openai.service';
import { TextHighlightingService } from '../essays/services/text-highlighting.service';
import { NotificationService } from '../essays/services/notification.service';
import { CacheCustomModule } from '../cache/cache.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Submission, Revision]),
    CacheCustomModule,
  ],
  providers: [
    SchedulerService,
    OpenAIService,
    TextHighlightingService,
    NotificationService,
  ],
  exports: [SchedulerService],
})
export class SchedulerModule {}
