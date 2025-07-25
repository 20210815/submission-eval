import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { CacheService } from '../cache/cache.service';

@Controller('v1/health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private cacheService: CacheService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redisHealthIndicator(),
    ]);
  }

  @Get('redis')
  @HealthCheck()
  checkRedis() {
    return this.health.check([() => this.redisHealthIndicator()]);
  }

  private async redisHealthIndicator(): Promise<HealthIndicatorResult> {
    const result = await this.cacheService.healthCheck();

    if (result.status === 'healthy') {
      return {
        redis: {
          status: 'up',
        },
      };
    } else {
      return {
        redis: {
          status: 'down',
          message: result.message,
        },
      };
    }
  }
}
