import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * 캐시에서 값 조회
   */
  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  /**
   * 캐시에 값 저장
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  /**
   * 캐시에서 값 삭제
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  // TODO: 패턴 기반 키 삭제 기능 추후 구현 예정
  private delPattern(): void {
    this.logger.warn('아직 구현되지 않았습니다.');
  }

  /**
   * 텍스트를 해시하여 캐시 키 생성
   */
  generateHashKey(prefix: string, text: string): string {
    const hash = createHash('sha256')
      .update(text)
      .digest('hex')
      .substring(0, 16);
    return `${prefix}:${hash}`;
  }

  /**
   * AI 평가 결과 캐시 키 생성
   */
  getAIEvaluationKey(submitText: string, componentType: string): string {
    const combinedText = `${submitText}:${componentType}`;
    return this.generateHashKey('ai-eval', combinedText);
  }

  /**
   * 학생 정보 캐시 키 생성
   */
  getStudentKey(studentId: number): string {
    return `student:${studentId}`;
  }

  /**
   * 학생 에세이 목록 캐시 키 생성
   */
  getStudentEssaysKey(studentId: number): string {
    return `student-essays:${studentId}`;
  }

  /**
   * 에세이 상세 정보 캐시 키 생성
   */
  getEssayKey(essayId: number): string {
    return `essay:${essayId}`;
  }

  /**
   * 파일 URL 캐시 키 생성
   */
  getFileUrlKey(blobName: string): string {
    return `file-url:${blobName}`;
  }

  /**
   * Redis 연결 상태 확인
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    message?: string;
  }> {
    try {
      const testKey = 'health-check';
      const testValue = 'ok';

      await this.set(testKey, testValue, 10);
      const result = await this.get(testKey);

      if (result === testValue) {
        await this.del(testKey);
        return { status: 'healthy' };
      } else {
        return { status: 'unhealthy', message: 'Cache read/write test failed' };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
