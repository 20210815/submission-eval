import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { CacheCustomModule } from '../cache/cache.module';

@Module({
  imports: [TerminusModule, CacheCustomModule],
  controllers: [HealthController],
})
export class HealthModule {}
