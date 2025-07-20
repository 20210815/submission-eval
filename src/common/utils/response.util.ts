import { HttpStatus } from '@nestjs/common';
import { 
  ApiErrorResponse, 
  ApiSuccessResponse, 
  StandardErrorResponse, 
  StandardSuccessResponse,
  FutureApiResponse
} from '../interfaces/api-response.interface';

export class ResponseUtil {
  static createErrorResponse(
    exceptionResponse: string | object,
  ): ApiErrorResponse {
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || '오류가 발생했습니다';

    return {
      result: 'failed',
      message: Array.isArray(message) ? message[0] : message,
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
        : (exceptionResponse as any).message || '오류가 발생했습니다';

    return {
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
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
    return {
      result,
      message,
      data,
    };
  }

  static createFutureApiErrorResponse(
    message: string | string[],
  ): FutureApiResponse<null> {
    return {
      result: 'failed',
      message,
      data: null,
    };
  }
}