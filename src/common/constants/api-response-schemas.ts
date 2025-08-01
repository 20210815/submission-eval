export const API_RESPONSE_SCHEMAS = {
  // 201 Created responses
  SIGNUP_SUCCESS: {
    status: 201,
    description: '학생 가입 성공',
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
    description: '로그인 성공, Authorization 헤더에 JWT 토큰 반환',
    headers: {
      Authorization: {
        description: 'JWT Bearer 토큰',
        schema: {
          type: 'string',
          example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
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

  // Submission API responses
  SUBMISSION_SUBMIT_SUCCESS: {
    status: 200,
    description: '에세이 제출 성공',
    schema: {
      example: {
        result: 'ok',
        message: '에세이가 성공적으로 제출되었습니다.',
        data: {
          submissionId: 1,
          studentId: 123,
          studentName: '홍길동',
          status: 'COMPLETED',
          message: null,
          score: 8,
          feedback: 'Great organization, minor grammar issues.',
          highlights: ['I like school.', 'pizza'],
          submitText: 'Hello my name is ...',
          highlightSubmitText:
            'Hello my name is ... <b>I like school.</b> I love <b>pizza</b>.',
          videoUrl: 'https://...sas.mp4',
          audioUrl: 'https://...sas.mp3',
          apiLatency: 1432,
        },
      },
    },
  },

  SUBMISSION_GET_SUCCESS: {
    status: 200,
    description: '제출물 조회 성공',
    schema: {
      example: {
        result: 'ok',
        message: '제출물 조회에 성공했습니다.',
        data: {
          id: 1,
          title: 'My English Submission',
          submitText:
            'This is my submission about English language learning...',
          componentType: 'WRITING',
          status: 'COMPLETED',
          score: 85,
          feedback:
            '문법과 어휘 사용이 우수합니다. 다만 문장 구조를 더 다양하게 사용하면 좋겠습니다.',
          highlights: ['excellent vocabulary', 'good grammar'],
          highlightSubmitText:
            'This is my submission with <b>excellent vocabulary</b>...',
          videoUrl: 'https://storage.example.com/videos/submission1_video.mp4',
          audioUrl: 'https://storage.example.com/audios/submission1_audio.mp3',
          createdAt: '2023-12-01T10:00:00Z',
          updatedAt: '2023-12-01T10:30:00Z',
        },
      },
    },
  },

  SUBMISSION_LIST_SUCCESS: {
    status: 200,
    description: '제출물 목록 조회 성공',
    schema: {
      example: {
        result: 'ok',
        message: '제출물 목록 조회에 성공했습니다.',
        data: [
          {
            result: 'ok',
            message: '제출물 목록 조회에 성공했습니다.',
            data: [
              {
                id: 1,
                title: 'My English Submission',
                submitText:
                  'This is my submission about English language learning and its importance in modern society... dasfasdfasdfasdddddddddd',
                componentType: 'writing',
                status: 'completed',
                score: 2,
                feedback:
                  "이 제출물은 영어 학습의 중요성을 다루고자 했으나, 본문이 불완전하게 작성되어 있습니다. 문법과 문장 구조가 제대로 갖춰지지 않았으며, 'dasfasdfasdfasdddddddddd'와 같은 무의미한 문자열이 포함되어 있어 내용의 일관성과 관련성을 해칩니다. 어휘 사용의 다양성도 부족하여 주제를 효과적으로 전달하지 못하고 있습니다. 전반적으로 명확한 의사소통이 이루어지지 않아 제출물의 품질이 낮습니다.",
                highlights: [
                  'This is my submission about English language learning and its importance in modern society',
                ],
                highlightSubmitText:
                  '<b>This is my submission about English language learning and its importance in modern society</b>... dasfasdfasdfasdddddddddd',
                createdAt: '2025-07-26T14:10:26.827Z',
                updatedAt: '2025-07-26T14:10:29.983Z',
              },
            ],
          },
        ],
      },
    },
  },

  // 전체 제출물 목록 조회 성공
  ALL_SUBMISSIONS_SUCCESS: {
    status: 200,
    description: '전체 제출물 목록 조회 성공',
    schema: {
      example: {
        result: 'ok',
        message: '전체 제출물 목록 조회에 성공했습니다.',
        data: {
          data: [
            {
              id: 1,
              title: 'English Essay',
              submitText: 'This is my submission about...',
              componentType: 'writing',
              status: 'completed',
              score: 85,
              feedback: '문법과 구조가 우수합니다.',
              highlights: ['excellent vocabulary', 'good grammar'],
              highlightSubmitText:
                'This is my submission with <b>excellent vocabulary</b>...',
              videoUrl: 'https://storage.example.com/videos/submission1.mp4',
              audioUrl: 'https://storage.example.com/audios/submission1.mp3',
              createdAt: '2025-07-26T14:10:26.827Z',
              updatedAt: '2025-07-26T14:10:29.983Z',
              student: {
                id: 123,
                name: '홍길동',
              },
            },
          ],
          total: 150,
          totalPages: 8,
          currentPage: 1,
          pageSize: 20,
          hasNext: true,
          hasPrevious: false,
        },
      },
    },
  },

  // 400 Bad Request - 잘못된 페이지 파라미터
  INVALID_PAGE_PARAMETER: {
    status: 400,
    description: '잘못된 페이지 파라미터',
    schema: {
      example: {
        result: 'failed',
        message: '페이지 번호는 1 이상이어야 합니다.',
      },
    },
  },

  // 400 Bad Request - 잘못된 정렬 파라미터
  INVALID_SORT_PARAMETER: {
    status: 400,
    description: '잘못된 정렬 파라미터',
    schema: {
      example: {
        result: 'failed',
        message: '유효하지 않은 정렬 기준입니다.',
      },
    },
  },

  // 400 Bad Request - 잘못된 상태 필터
  INVALID_STATUS_FILTER: {
    status: 400,
    description: '잘못된 평가 상태 필터',
    schema: {
      example: {
        result: 'failed',
        message: '유효한 평가 상태를 선택해주세요.',
      },
    },
  },

  // 400 Bad Request - 잘못된 학생 ID 형식
  INVALID_STUDENT_ID_FORMAT: {
    status: 400,
    description: '잘못된 학생 ID 형식',
    schema: {
      example: {
        result: 'failed',
        message: '학생 ID는 숫자여야 합니다.',
      },
    },
  },

  // 400 Bad Request - 단일 validation 에러
  EMAIL_FORMAT_ERROR: {
    status: 400,
    description: '이메일 형식 오류',
    schema: {
      example: {
        result: 'failed',
        message: '이메일 형식이 올바르지 않습니다',
      },
    },
  },

  // 400 Bad Request - 여러 validation 에러
  MULTIPLE_VALIDATION_ERRORS: {
    status: 400,
    description: '유효성 검사 오류',
    schema: {
      example: {
        result: 'failed',
        message: [
          '이메일 형식이 올바르지 않습니다',
          '비밀번호는 최소 8글자 이상이어야 합니다.',
        ],
      },
    },
  },

  // 필수 필드 입력 누락
  REQUIRED_FIELD_MISSING: {
    status: 400,
    description: '필수 필드 누락',
    schema: {
      example: {
        result: 'failed',
        message: [
          '이름은 필수입니다.',
          '이메일은 필수입니다.',
          '비밀번호는 필수입니다.',
        ],
      },
    },
  },

  // 비밀번호 형식이 올바르지 않은 경우
  PASSWORD_FORMAT_ERROR: {
    status: 400,
    description: '비밀번호 형식 오류',
    schema: {
      example: {
        result: 'failed',
        message: '비밀번호는 최소 8자 이상이어야 합니다.',
      },
    },
  },

  // 이름 길이 제한 오류
  NAME_LENGTH_ERROR: {
    status: 400,
    description: '이름 길이 제한 오류',
    schema: {
      example: {
        result: 'failed',
        message: '이름은 100글자를 초과할 수 없습니다.',
      },
    },
  },

  // 이메일 길이 제한 오류
  EMAIL_LENGTH_ERROR: {
    status: 400,
    description: '이메일 길이 제한 오류',
    schema: {
      example: {
        result: 'failed',
        message: '이메일은 255글자를 초과할 수 없습니다.',
      },
    },
  },

  INVALID_ID_FORMAT: {
    status: 400,
    description: '잘못된 ID 형식',
    schema: {
      example: {
        result: 'failed',
        message: '숫자 형태의 ID가 필요합니다.',
      },
    },
  },

  // 401 Unauthorized

  UNAUTHORIZED: {
    status: 401,
    description: '가입하지 않은 사용자',
    schema: {
      example: {
        result: 'failed',
        message: '사용자를 찾을 수 없습니다',
      },
    },
  },

  REVISION_SUBMISSION_ID_REQUIRED: {
    status: 400,
    description: '필수 필드 누락',
    schema: {
      example: {
        result: 'failed',
        message: 'Submission ID는 필수 입력 항목입니다.',
      },
    },
  },

  REVISION_INVALID_SUBMISSION_ID: {
    status: 400,
    description: '유효하지 않은 submission ID 형식',
    schema: {
      example: {
        result: 'failed',
        message: 'Submission ID는 문자열이어야 합니다.',
      },
    },
  },

  // 오늘보다 미래 날짜의 통계 수집 시도
  FUTURE_DATE_STATS_COLLECTION: {
    status: 400,
    description: '미래 날짜의 통계 수집 시도',
    schema: {
      example: {
        result: 'failed',
        message: '미래 날짜의 통계는 수집할 수 없습니다.',
      },
    },
  },

  // 미래 시작 날짜의 주간 통계 수집 시도
  FUTURE_WEEK_START_STATS_COLLECTION: {
    status: 400,
    description: '미래 시작 날짜의 주간 통계 수집 시도',
    schema: {
      example: {
        result: 'failed',
        message: '미래 시작 날짜의 통계는 수집할 수 없습니다.',
      },
    },
  },

  // 미래 종료 날짜의 주간 통계 수집 시도
  FUTURE_WEEK_END_STATS_COLLECTION: {
    status: 400,
    description: '미래 종료 날짜의 주간 통계 수집 시도',
    schema: {
      example: {
        result: 'failed',
        message: '미래 기간의 통계는 수집할 수 없습니다.',
      },
    },
  },

  // 시작 날짜가 종료 날짜보다 늦은 경우
  INVALID_WEEK_DATE_ORDER: {
    status: 400,
    description: '시작 날짜가 종료 날짜보다 늦음',
    schema: {
      example: {
        result: 'failed',
        message: '시작 날짜가 종료 날짜보다 늦을 수 없습니다.',
      },
    },
  },

  // 미래 월의 통계 수집 시도
  FUTURE_MONTH_STATS_COLLECTION: {
    status: 400,
    description: '미래 월의 통계 수집 시도',
    schema: {
      example: {
        result: 'failed',
        message: '미래 월의 통계는 수집할 수 없습니다.',
      },
    },
  },

  AUTHENTICATION_REQUIRED: {
    status: 401,
    description: '인증 실패',
    schema: {
      example: {
        result: 'failed',
        message: '로그인이 필요합니다.',
      },
    },
  },

  // 비밀번호 오류
  INCORRECT_PASSWORD: {
    status: 401,
    description: '비밀번호가 일치하지 않음',
    schema: {
      example: {
        result: 'failed',
        message: '비밀번호가 일치하지 않습니다',
      },
    },
  },

  // 404 Not Found
  SUBMISSION_NOT_FOUND: {
    status: 404,
    description: '제출물을 찾을 수 없음',
    schema: {
      example: {
        result: 'failed',
        message: '해당 제출물을 찾을 수 없습니다.',
      },
    },
  },

  // Revision API responses
  REVISION_SUBMISSION_NOT_FOUND: {
    status: 404,
    description: '존재하지 않는 제출물',
    schema: {
      example: {
        result: 'failed',
        message: '존재하지 않는 제출물입니다.',
      },
    },
  },

  REVISION_NOT_FOUND: {
    status: 404,
    description: '존재하지 않는 재평가 ID',
    schema: {
      example: {
        result: 'failed',
        message: '존재하지 않는 재평가 ID입니다.',
      },
    },
  },

  // 409 Conflict
  REVISION_ALREADY_IN_PROGRESS: {
    status: 409,
    description: '이미 진행 중인 재평가가 있음',
    schema: {
      example: {
        result: 'failed',
        message: '이미 진행 중인 재평가가 있습니다.',
      },
    },
  },

  CONFLICT: {
    status: 409,
    description: '이미 가입된 이메일',
    schema: {
      example: {
        result: 'failed',
        message: '이미 존재하는 이메일입니다.',
      },
    },
  },

  SUBMISSION_ALREADY_SUBMITTED: {
    status: 409,
    description: '이미 해당 유형의 에세이를 제출함',
    schema: {
      example: {
        result: 'failed',
        message: '이미 writing 유형의 에세이를 제출했습니다.',
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
};

// All submissions query validation error examples
export const ALL_SUBMISSIONS_VALIDATION_ERROR_EXAMPLES = {
  status: 400,
  description: '전체 제출물 조회 유효성 검사 오류 응답',
  content: {
    'application/json': {
      examples: {
        invalidPageParameter: {
          summary: API_RESPONSE_SCHEMAS.INVALID_PAGE_PARAMETER.description,
          value: API_RESPONSE_SCHEMAS.INVALID_PAGE_PARAMETER.schema.example,
        },
        invalidSortParameter: {
          summary: API_RESPONSE_SCHEMAS.INVALID_SORT_PARAMETER.description,
          value: API_RESPONSE_SCHEMAS.INVALID_SORT_PARAMETER.schema.example,
        },
        invalidStatusFilter: {
          summary: API_RESPONSE_SCHEMAS.INVALID_STATUS_FILTER.description,
          value: API_RESPONSE_SCHEMAS.INVALID_STATUS_FILTER.schema.example,
        },
        invalidStudentIdFormat: {
          summary: API_RESPONSE_SCHEMAS.INVALID_STUDENT_ID_FORMAT.description,
          value: API_RESPONSE_SCHEMAS.INVALID_STUDENT_ID_FORMAT.schema.example,
        },
      },
    },
  },
};

// Submission validation error examples
export const SUBMISSION_VALIDATION_ERROR_EXAMPLES = {
  status: 400,
  description: '유효성 검사 오류 응답',
  content: {
    'application/json': {
      examples: {
        singleValidationError: {
          summary: '단일 필드 에러',
          value: {
            result: 'failed',
            message: '제목은 필수입니다.',
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

// 통계 수집 관련 에러 예시들
export const STATS_VALIDATION_ERROR_EXAMPLES = {
  status: 400,
  description: '통계 수집 검증 오류',
  content: {
    'application/json': {
      examples: {
        futureWeekStartStats: {
          summary:
            API_RESPONSE_SCHEMAS.FUTURE_WEEK_START_STATS_COLLECTION.description,
          value:
            API_RESPONSE_SCHEMAS.FUTURE_WEEK_START_STATS_COLLECTION.schema
              .example,
        },
        futureWeekEndStats: {
          summary:
            API_RESPONSE_SCHEMAS.FUTURE_WEEK_END_STATS_COLLECTION.description,
          value:
            API_RESPONSE_SCHEMAS.FUTURE_WEEK_END_STATS_COLLECTION.schema
              .example,
        },
        invalidWeekDateOrder: {
          summary: API_RESPONSE_SCHEMAS.INVALID_WEEK_DATE_ORDER.description,
          value: API_RESPONSE_SCHEMAS.INVALID_WEEK_DATE_ORDER.schema.example,
        },
      },
    },
  },
};

export const VALIDATION_ERROR_EXAMPLES = {
  status: 400,
  description: '유효성 검사 오류 응답',
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
        // 필수 입력 누락
        requiredFieldMissing: {
          summary: API_RESPONSE_SCHEMAS.REQUIRED_FIELD_MISSING.description,
          value: API_RESPONSE_SCHEMAS.REQUIRED_FIELD_MISSING.schema.example,
        },
        // 이름 길이 제한 오류
        nameLengthError: {
          summary: API_RESPONSE_SCHEMAS.NAME_LENGTH_ERROR.description,
          value: API_RESPONSE_SCHEMAS.NAME_LENGTH_ERROR.schema.example,
        },
        // 이메일 길이 제한 오류
        emailLengthError: {
          summary: API_RESPONSE_SCHEMAS.EMAIL_LENGTH_ERROR.description,
          value: API_RESPONSE_SCHEMAS.EMAIL_LENGTH_ERROR.schema.example,
        },
      },
    },
  },
};

// All submissions error schemas export
export const ALL_SUBMISSIONS_ERROR_EXAMPLES = {
  status: 400,
  description: '유효성 검사 오류 응답',
  content: {
    'application/json': {
      examples: {
        invalidPageParameter: {
          summary: API_RESPONSE_SCHEMAS.INVALID_PAGE_PARAMETER.description,
          value: API_RESPONSE_SCHEMAS.INVALID_PAGE_PARAMETER.schema.example,
        },
        invalidSortParameter: {
          summary: API_RESPONSE_SCHEMAS.INVALID_SORT_PARAMETER.description,
          value: API_RESPONSE_SCHEMAS.INVALID_SORT_PARAMETER.schema.example,
        },
        invalidStatusFilter: {
          summary: API_RESPONSE_SCHEMAS.INVALID_STATUS_FILTER.description,
          value: API_RESPONSE_SCHEMAS.INVALID_STATUS_FILTER.schema.example,
        },
        invalidStudentIdFormat: {
          summary: API_RESPONSE_SCHEMAS.INVALID_STUDENT_ID_FORMAT.description,
          value: API_RESPONSE_SCHEMAS.INVALID_STUDENT_ID_FORMAT.schema.example,
        },
      },
    },
  },
};
