import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      startTime?: number;
      user?: JwtPayload;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends JwtPayload {
      // Additional user properties can be added here if needed
    }
  }
}

export {};
