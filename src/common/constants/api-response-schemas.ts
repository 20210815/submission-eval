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

  // 400 Bad Request
  BAD_REQUEST: {
    status: 400,
    description: 'Bad Request',
    schema: {
      example: {
        result: 'error',
        message: '이메일 형식이 올바르지 않습니다',
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
        message: '이미 존재하는 이름입니다',
      },
    },
  },
};
