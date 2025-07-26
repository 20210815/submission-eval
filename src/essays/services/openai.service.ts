import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { CacheService } from '../../cache/cache.service';

export interface AIEvaluationResult {
  score: number;
  feedback: string;
  highlights: string[];
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

@Injectable()
export class OpenAIService {
  private static readonly DEFAULT_TIMEOUT_MS = 60000;

  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly deploymentName: string;
  private readonly apiVersion: string;

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {
    this.apiKey = this.configService.get<string>('AZURE_ENDPOINT_KEY') || '';
    this.endpoint = this.configService.get<string>('AZURE_ENDPOINT_URL') || '';
    this.deploymentName =
      this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT_NAME') || '';
    this.apiVersion =
      this.configService.get<string>('OPENAPI_API_VERSION') || '';

    if (!this.apiKey || !this.endpoint) {
      throw new Error('Azure OpenAI configuration is missing');
    }
  }

  async evaluateSubmission(
    title: string,
    submitText: string,
    componentType: string,
  ): Promise<AIEvaluationResult> {
    // 캐시 키 생성
    const cacheKey = this.cacheService.getAIEvaluationKey(
      submitText,
      componentType,
    );

    // 캐시에서 조회
    const cachedResult =
      await this.cacheService.get<AIEvaluationResult>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const prompt = this.buildEvaluationPrompt(title, submitText, componentType);

    try {
      const response = await this.callOpenAI(prompt);
      const result = this.parseAIResponse(response);

      // 성공한 결과를 캐시에 저장 (24시간)
      await this.cacheService.set(cacheKey, result, 24 * 60 * 60);

      return result;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error(
            'AI 평가 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
          );
        }
        if (error.message.includes('Network Error')) {
          throw new Error('네트워크 연결 오류로 AI 평가에 실패했습니다.');
        }
        if (error.message.includes('401') || error.message.includes('403')) {
          throw new Error(
            'AI 서비스 인증에 실패했습니다. 관리자에게 문의하세요.',
          );
        }
      }
      throw new Error(
        `AI 평가 중 오류가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private buildEvaluationPrompt(
    title: string,
    submitText: string,
    componentType: string,
  ): string {
    return `
    You are an expert English language evaluator. Please evaluate the following ${componentType} essay and provide feedback.

    Title: ${title}
    Essay Content: ${submitText}

    Please provide your evaluation in the following JSON format:
    {
      "score": <number between 0-10>,
      "feedback": "<detailed feedback in Korean>",
      "highlights": ["<important phrase 1>", "<important phrase 2>", ...]
    }

    Evaluation Criteria:
    - Grammar and sentence structure
    - Vocabulary usage and variety
    - Content organization and coherence
    - Relevance to the topic
    - Overall communication effectiveness

    The highlights should contain key phrases or sentences that demonstrate good language use or areas that need improvement.
    Provide feedback in Korean language.
    `;
  }

  private async callOpenAI(prompt: string): Promise<string> {
    // 환경 변수 가져오기
    if (
      !this.apiKey ||
      !this.endpoint ||
      !this.deploymentName ||
      !this.apiVersion
    ) {
      throw new Error('Azure OpenAI configuration is incomplete');
    }
    const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;

    const headers = {
      'Content-Type': 'application/json',
      'api-key': this.apiKey,
    };

    const data = {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful English language evaluation assistant.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    };

    const response: AxiosResponse<OpenAIResponse> = await axios.post(
      url,
      data,
      {
        headers,
        timeout: OpenAIService.DEFAULT_TIMEOUT_MS,
      },
    );

    if (!response.data.choices || response.data.choices.length === 0) {
      throw new Error('No response from OpenAI API');
    }

    return response.data.choices[0].message.content;
  }

  private parseAIResponse(responseContent: string): AIEvaluationResult {
    try {
      // JSON 블록에서 실제 JSON 추출
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonContent = jsonMatch[0];
      const parsed = JSON.parse(jsonContent) as {
        score?: unknown;
        feedback?: unknown;
        highlights?: unknown;
      };

      // 응답 구조 검증
      if (
        typeof parsed.score !== 'number' ||
        typeof parsed.feedback !== 'string' ||
        !Array.isArray(parsed.highlights)
      ) {
        throw new Error('Invalid response structure from AI');
      }

      // 점수 범위 검증
      if (parsed.score < 0 || parsed.score > 10) {
        throw new Error('Score must be between 0 and 10');
      }

      const validatedScore = parsed.score;
      return {
        score: Math.min(10, Math.max(0, Math.round(validatedScore))),
        feedback: String(parsed.feedback).trim(),
        highlights: (parsed.highlights as unknown[])
          .filter(
            (item): item is string =>
              typeof item === 'string' && String(item).trim().length > 0,
          )
          .map((item) => String(item).trim()),
      };
    } catch (error) {
      // 파싱 실패 시 예외 던지기
      console.error(
        'AI response parsing failed:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new Error('AI 평가 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }
}
