import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { Submission } from './entities/submission.entity';
import { EvaluationLog } from './entities/evaluation-log.entity';
import { Revision } from './entities/revision.entity';
import { Student } from '../students/entities/student.entity';
import { VideoProcessingService } from './services/video-processing.service';
import { AzureStorageService } from './services/azure-storage.service';
import { OpenAIService } from './services/openai.service';
import { TextHighlightingService } from './services/text-highlighting.service';
import { NotificationService } from './services/notification.service';
import { RevisionService } from './services/revision.service';
import { SubmissionMediaService } from './services/submission-media.service';
import { RevisionController } from './controllers/revision.controller';
import { CacheCustomModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, EvaluationLog, Revision, Student]),
    CacheCustomModule,
  ],
  controllers: [SubmissionsController, RevisionController],
  providers: [
    SubmissionsService,
    VideoProcessingService,
    AzureStorageService,
    OpenAIService,
    TextHighlightingService,
    NotificationService,
    RevisionService,
    SubmissionMediaService,
  ],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
