import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ResponseUtil } from '../common/utils/response.util';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    // Handle multer file filter errors
    if (exception.message && exception.message.includes('비디오 파일만 업로드 가능합니다')) {
      const errorResponse = ResponseUtil.createFutureApiErrorResponse([exception.message]);
      return response.status(400).json(errorResponse);
    }

    // Handle HTTP exceptions
    if (!(exception instanceof HttpException)) {
      const errorResponse = ResponseUtil.createFutureApiErrorResponse(['서버 내부 오류가 발생했습니다']);
      return response.status(500).json(errorResponse);
    }

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[];

    // ValidationPipe의 BadRequestException 처리
    if (exception instanceof BadRequestException) {
      const responseObj = exceptionResponse as { message?: string | string[] };
      if (responseObj && Array.isArray(responseObj.message)) {
        // 항상 배열로 반환
        message = responseObj.message;
      } else if (responseObj && responseObj.message) {
        // 단일 메시지도 배열로 감싸기
        message = Array.isArray(responseObj.message)
          ? responseObj.message
          : [responseObj.message];
      } else {
        message = ['입력값이 올바르지 않습니다'];
      }
    } else if (typeof exceptionResponse === 'string') {
      message = [exceptionResponse];
    } else {
      const responseMessage = (
        exceptionResponse as { message?: string | string[] }
      ).message;
      if (Array.isArray(responseMessage)) {
        message = responseMessage;
      } else {
        message = [responseMessage || '오류가 발생했습니다'];
      }
    }

    const errorResponse = ResponseUtil.createFutureApiErrorResponse(message);

    response.status(status).json(errorResponse);
  }
}
