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

  ESSAY_ALREADY_SUBMITTED: {
    status: 409,
    description: '이미 해당 유형의 에세이를 제출함',
    schema: {
      example: {
        result: 'error',
        message: '이미 해당 유형의 에세이를 제출하셨습니다.',
      },
    },
  },

  ESSAY_NOT_FOUND: {
    status: 404,
    description: '에세이를 찾을 수 없음',
    schema: {
      example: {
        result: 'error',
        message: '해당 에세이를 찾을 수 없습니다.',
      },
    },
  },

  AUTHENTICATION_REQUIRED: {
    status: 401,
    description: '인증 실패',
    schema: {
      example: {
        result: 'error',
        message: '인증이 필요합니다.',
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
