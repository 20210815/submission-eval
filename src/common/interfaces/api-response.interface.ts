export interface ApiResponse<T = any> {
  result: 'success' | 'failed';
  message: string;
  data?: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  result: 'failed';
  message: string;
  timestamp: string;
}

export interface ApiSuccessResponse<T = any> {
  result: 'success';
  message: string;
  data?: T;
  timestamp: string;
}

export interface StandardErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  timestamp: string;
}

export interface StandardSuccessResponse<T = any> {
  success: true;
  statusCode: number;
  message: string;
  data?: T;
  timestamp: string;
}

export interface FutureApiResponse<T = any> {
  result: 'ok' | 'error';
  message: string | string[] | null;
  studentId: number;
  score?: number;
  feedback?: string;
  highlights?: string[];
  submitText?: string;
  highlightSubmitText?: string;
  data?: T;
}
