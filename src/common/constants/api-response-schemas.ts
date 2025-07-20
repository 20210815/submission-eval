export const API_RESPONSE_SCHEMAS = {
  // 201 Created responses
  SIGNUP_SUCCESS: {
    status: 201,
    description: 'Student successfully created',
    schema: {
      example: {
        result: 'ok',
        message: '회원가입에 성공했습니다',
        studentId: 123,
      },
    },
  },

  // 200 OK responses

  LOGIN_SUCCESS: {
    status: 200,
    description: 'Login successful, JWT token set in cookie',
    headers: {
      'Set-Cookie': {
        description: 'JWT token set as httpOnly cookie',
        schema: {
          type: 'string',
          example:
            'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Max-Age=86400',
        },
      },
    },
    schema: {
      example: {
        result: 'ok',
        message: '로그인에 성공했습니다',
        studentId: 123,
      },
    },
  },

  // Essay API responses
  ESSAY_SUBMIT_SUCCESS: {
    status: 200,
    description: '에세이 제출 성공',
    schema: {
      example: {
        result: 'ok',
        message: '에세이가 성공적으로 제출되었습니다.',
        data: {
          essayId: 1,
          status: 'PENDING',
          message: '에세이가 성공적으로 제출되었습니다. 평가가 진행 중입니다.',
        },
      },
    },
  },

  ESSAY_GET_SUCCESS: {
    status: 200,
    description: '에세이 조회 성공',
    schema: {
      example: {
        result: 'ok',
        message: '에세이 조회에 성공했습니다.',
        data: {
          id: 1,
          title: 'My English Essay',
          submitText: 'This is my essay about English language learning...',
          componentType: 'WRITING',
          status: 'COMPLETED',
          score: 85,
          feedback:
            '문법과 어휘 사용이 우수합니다. 다만 문장 구조를 더 다양하게 사용하면 좋겠습니다.',
          highlights: ['excellent vocabulary', 'good grammar'],
          highlightSubmitText:
            'This is my essay with <b>excellent vocabulary</b>...',
          videoUrl: 'https://storage.example.com/videos/essay1_video.mp4',
          audioUrl: 'https://storage.example.com/audios/essay1_audio.mp3',
          createdAt: '2023-12-01T10:00:00Z',
          updatedAt: '2023-12-01T10:30:00Z',
        },
      },
    },
  },

  ESSAY_LIST_SUCCESS: {
    status: 200,
    description: '에세이 목록 조회 성공',
    schema: {
      example: {
        result: 'ok',
        message: '에세이 목록 조회에 성공했습니다.',
        data: [
          {
            id: 1,
            title: 'My English Essay',
            submitText: 'This is my essay about English language learning...',
            componentType: 'WRITING',
            status: 'COMPLETED',
            score: 85,
            createdAt: '2023-12-01T10:00:00Z',
            updatedAt: '2023-12-01T10:30:00Z',
          },
        ],
      },
    },
  },

  // 400 Bad Request - 단일 validation 에러
  EMAIL_FORMAT_ERROR: {
    status: 400,
    description: 'Single validation error',
    schema: {
      example: {
        result: 'error',
        message: ['이메일 형식이 올바르지 않습니다'],
      },
    },
  },

  // 400 Bad Request - 여러 validation 에러
  MULTIPLE_VALIDATION_ERRORS: {
    status: 400,
    description: 'Multiple validation errors',
    schema: {
      example: {
        result: 'error',
        message: [
          '이메일 형식이 올바르지 않습니다',
          '비밀번호는 최소 4글자 이상이어야 합니다',
        ],
      },
    },
  },

  // 비밀번호 형식이 올바르지 않은 경우
  PASSWORD_FORMAT_ERROR: {
    status: 400,
    description: 'Password format is invalid',
    schema: {
      example: {
        result: 'error',
        message: ['비밀번호는 최소 4자 이상이어야 합니다'],
      },
    },
  },

  INVALID_ID_FORMAT: {
    status: 400,
    description: '잘못된 ID 형식',
    schema: {
      example: {
        result: 'failed',
        message: ['숫자 형태의 ID가 필요합니다.'],
      },
    },
  },

  // 동시 제출 에러
  CONCURRENT_SUBMISSION: {
    status: 409,
    description: '동시 에세이 제출 시도',
    schema: {
      example: {
        result: 'failed',
        message: '이미 에세이 제출이 진행 중입니다. 잠시 후 다시 시도해주세요.',
      },
    },
  },

  // 비디오 처리 에러들
  VIDEO_PROCESSING_TIMEOUT: {
    status: 500,
    description: '비디오 처리 타임아웃',
    schema: {
      example: {
        result: 'failed',
        message: '비디오 크롭 처리 시간이 초과되었습니다. (5분 제한)',
      },
    },
  },

  DISK_SPACE_ERROR: {
    status: 500,
    description: '디스크 공간 부족',
    schema: {
      example: {
        result: 'failed',
        message: '디스크 공간이 부족합니다. 잠시 후 다시 시도해주세요.',
      },
    },
  },

  // AI 서비스 에러들
  AI_TIMEOUT_ERROR: {
    status: 500,
    description: 'AI 평가 타임아웃',
    schema: {
      example: {
        result: 'failed',
        message:
          'AI 평가 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
      },
    },
  },

  AI_NETWORK_ERROR: {
    status: 500,
    description: 'AI 서비스 네트워크 오류',
    schema: {
      example: {
        result: 'failed',
        message: '네트워크 연결 오류로 AI 평가에 실패했습니다.',
      },
    },
  },

  AI_AUTH_ERROR: {
    status: 500,
    description: 'AI 서비스 인증 실패',
    schema: {
      example: {
        result: 'failed',
        message: 'AI 서비스 인증에 실패했습니다. 관리자에게 문의하세요.',
      },
    },
  },

  // 401 Unauthorized

  UNAUTHORIZED: {
    status: 401,
    description: 'Invalid credentials',
    schema: {
      example: {
        result: 'error',
        message: '사용자를 찾을 수 없습니다',
      },
    },
  },

  AUTHENTICATION_REQUIRED: {
    status: 401,
    description: '인증 실패',
    schema: {
      example: {
        result: 'failed',
        message: ['로그인이 필요합니다.'],
      },
    },
  },

  // 404 Not Found
  ESSAY_NOT_FOUND: {
    status: 404,
    description: '에세이를 찾을 수 없음',
    schema: {
      example: {
        result: 'failed',
        message: '해당 에세이를 찾을 수 없습니다.',
      },
    },
  },

  // 409 Conflict

  CONFLICT: {
    status: 409,
    description: 'Conflict - Student already exists',
    schema: {
      example: {
        result: 'error',
        message: '이미 존재하는 이메일입니다',
      },
    },
  },

  ESSAY_ALREADY_SUBMITTED: {
    status: 409,
    description: '이미 해당 유형의 에세이를 제출함',
    schema: {
      example: {
        result: 'failed',
        message: '이미 writing 유형의 에세이를 제출했습니다.',
      },
    },
  },
};

// Essay validation error examples
export const ESSAY_VALIDATION_ERROR_EXAMPLES = {
  status: 400,
  description: 'Validation error responses',
  content: {
    'application/json': {
      examples: {
        singleValidationError: {
          summary: '단일 필드 에러',
          value: {
            result: 'failed',
            message: ['제목은 필수입니다.'],
          },
        },
        multipleValidationErrors: {
          summary: '여러 필드 에러',
          value: {
            result: 'failed',
            message: ['제목은 필수입니다.', '에세이 내용은 필수입니다.'],
          },
        },
      },
    },
  },
};

// 서버 에러 예시 (500번대)
export const SERVER_ERROR_EXAMPLES = {
  status: 500,
  description: '서버 처리 오류',
  content: {
    'application/json': {
      examples: {
        videoProcessingTimeout: {
          summary: API_RESPONSE_SCHEMAS.VIDEO_PROCESSING_TIMEOUT.description,
          value: API_RESPONSE_SCHEMAS.VIDEO_PROCESSING_TIMEOUT.schema.example,
        },
        diskSpaceError: {
          summary: API_RESPONSE_SCHEMAS.DISK_SPACE_ERROR.description,
          value: API_RESPONSE_SCHEMAS.DISK_SPACE_ERROR.schema.example,
        },
        aiTimeoutError: {
          summary: API_RESPONSE_SCHEMAS.AI_TIMEOUT_ERROR.description,
          value: API_RESPONSE_SCHEMAS.AI_TIMEOUT_ERROR.schema.example,
        },
        aiNetworkError: {
          summary: API_RESPONSE_SCHEMAS.AI_NETWORK_ERROR.description,
          value: API_RESPONSE_SCHEMAS.AI_NETWORK_ERROR.schema.example,
        },
        aiAuthError: {
          summary: API_RESPONSE_SCHEMAS.AI_AUTH_ERROR.description,
          value: API_RESPONSE_SCHEMAS.AI_AUTH_ERROR.schema.example,
        },
      },
    },
  },
};

export const VALIDATION_ERROR_EXAMPLES = {
  status: 400,
  description: 'Validation error responses',
  content: {
    'application/json': {
      examples: {
        emailFormatError: {
          summary: API_RESPONSE_SCHEMAS.EMAIL_FORMAT_ERROR.description,
          value: API_RESPONSE_SCHEMAS.EMAIL_FORMAT_ERROR.schema.example,
        },
        passwordFormatError: {
          summary: API_RESPONSE_SCHEMAS.PASSWORD_FORMAT_ERROR.description,
          value: API_RESPONSE_SCHEMAS.PASSWORD_FORMAT_ERROR.schema.example,
        },
        multipleValidationErrors: {
          summary: API_RESPONSE_SCHEMAS.MULTIPLE_VALIDATION_ERRORS.description,
          value: API_RESPONSE_SCHEMAS.MULTIPLE_VALIDATION_ERRORS.schema.example,
        },
      },
    },
  },
};
