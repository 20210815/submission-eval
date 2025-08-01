import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const traceId = uuidv4();
    const startTime = Date.now();

    req.traceId = traceId;
    req.startTime = startTime;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(
        `[${traceId}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`,
      );
    });

    next();
  }
}
