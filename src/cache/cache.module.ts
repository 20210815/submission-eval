import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { CacheService } from './cache.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD'),
        ttl: 60 * 60, // 1시간 기본 TTL (초 단위)
        max: 100, // 최대 캐시 항목 수
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheModule, CacheService],
})
export class CacheCustomModule {}
