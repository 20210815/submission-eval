import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EssaysController } from './essays.controller';
import { EssaysService } from './essays.service';
import { Essay } from './entities/essay.entity';
import { EvaluationLog } from './entities/evaluation-log.entity';
import { Revision } from './entities/revision.entity';
import { Student } from '../students/entities/student.entity';
import { VideoProcessingService } from './services/video-processing.service';
import { AzureStorageService } from './services/azure-storage.service';
import { OpenAIService } from './services/openai.service';
import { TextHighlightingService } from './services/text-highlighting.service';
import { NotificationService } from './services/notification.service';
import { RevisionService } from './services/revision.service';
import { RevisionController } from './controllers/revision.controller';
import { CacheCustomModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Essay, EvaluationLog, Revision, Student]),
    CacheCustomModule,
  ],
  controllers: [EssaysController, RevisionController],
  providers: [
    EssaysService,
    VideoProcessingService,
    AzureStorageService,
    OpenAIService,
    TextHighlightingService,
    NotificationService,
    RevisionService,
  ],
  exports: [EssaysService],
})
export class EssaysModule {}
