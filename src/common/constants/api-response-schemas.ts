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
