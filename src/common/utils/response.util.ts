import { HttpStatus } from '@nestjs/common';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
  StandardErrorResponse,
  StandardSuccessResponse,
  FutureApiResponse,
} from '../interfaces/api-response.interface';

export class ResponseUtil {
  static createErrorResponse(
    exceptionResponse: string | object,
  ): ApiErrorResponse {
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : this.extractMessage(exceptionResponse);

    return {
      result: 'failed',
      message: this.normalizeMessage(message),
      timestamp: new Date().toISOString(),
    };
  }

  static createSuccessResponse<T = any>(
    message: string,
    data?: T,
  ): ApiSuccessResponse<T> {
    return {
      result: 'success',
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static createStandardErrorResponse(
    exceptionResponse: string | object,
    status: number,
  ): StandardErrorResponse {
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : this.extractMessage(exceptionResponse);

    return {
      success: false,
      statusCode: status,
      message: this.normalizeMessage(message),
      timestamp: new Date().toISOString(),
    };
  }

  static createStandardSuccessResponse<T = any>(
    message: string,
    data?: T,
    statusCode: number = HttpStatus.OK,
  ): StandardSuccessResponse<T> {
    return {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static createFutureApiResponse<T = any>(
    message: string,
    data?: T,
    result: 'ok' | 'failed' = 'ok',
  ): FutureApiResponse<T> {
    const response: FutureApiResponse<T> = {
      result,
      message,
    };

    if (data !== null && data !== undefined) {
      (response as FutureApiResponse<T> & { data: T }).data = data;
    }

    return response;
  }

  static createFutureApiErrorResponse(
    message: string | string[],
  ): FutureApiResponse<null> {
    return {
      result: 'failed',
      message,
    };
  }

  private static extractMessage(exceptionResponse: object): string | string[] {
    if (exceptionResponse && typeof exceptionResponse === 'object') {
      if ('message' in exceptionResponse) {
        const msg = exceptionResponse.message;
        if (typeof msg === 'string' || Array.isArray(msg)) {
          return msg;
        }
      }
    }
    return '오류가 발생했습니다';
  }

  private static normalizeMessage(message: string | string[]): string {
    return Array.isArray(message)
      ? message[0] || '오류가 발생했습니다'
      : message;
  }
}
