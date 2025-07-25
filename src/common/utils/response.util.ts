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
    const messageArray =
      typeof exceptionResponse === 'string'
        ? [exceptionResponse]
        : this.extractMessageAsArray(exceptionResponse);

    return {
      result: 'failed',
      message:
        messageArray.length > 1
          ? messageArray
          : messageArray[0] || '오류가 발생했습니다',
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
    const messageArray =
      typeof exceptionResponse === 'string'
        ? [exceptionResponse]
        : this.extractMessageAsArray(exceptionResponse);

    return {
      success: false,
      statusCode: status,
      message:
        messageArray.length > 1
          ? messageArray
          : messageArray[0] || '오류가 발생했습니다',
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
    const messageArray = Array.isArray(message) ? message.flat() : [message];
    return {
      result: 'failed',
      message: messageArray,
    };
  }

  private static extractMessageAsArray(exceptionResponse: object): string[] {
    if (exceptionResponse && typeof exceptionResponse === 'object') {
      if ('message' in exceptionResponse) {
        const msg = exceptionResponse.message;
        if (
          Array.isArray(msg) &&
          msg.every((item) => typeof item === 'string')
        ) {
          return msg;
        }
        if (typeof msg === 'string') {
          return [msg];
        }
      }
    }
    return ['오류가 발생했습니다'];
  }
}
