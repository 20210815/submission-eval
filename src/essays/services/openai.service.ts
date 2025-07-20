import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

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
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly deploymentName: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('AZURE_ENDPOINT_KEY') || '';
    this.endpoint = this.configService.get<string>('AZURE_ENDPOINT_URL') || '';
    this.deploymentName = this.configService.get<string>(
      'AZURE_OPENAI_DEPLOYMENT_NAME',
      'gpt-4',
    );

    if (!this.apiKey || !this.endpoint) {
      throw new Error('Azure OpenAI configuration is missing');
    }
  }

  async evaluateEssay(
    title: string,
    submitText: string,
    componentType: string,
  ): Promise<AIEvaluationResult> {
    const prompt = this.buildEvaluationPrompt(title, submitText, componentType);

    try {
      const response = await this.callOpenAI(prompt);
      return this.parseAIResponse(response);
    } catch (error) {
      throw new Error(
        `AI evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
  "score": <number between 0-100>,
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
    const apiVersion = this.configService.get<string>(
      'OPENAPI_API_VERSION',
      '2023-05-15',
    );
    const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${apiVersion}`;

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
      { headers },
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
      if (parsed.score < 0 || parsed.score > 100) {
        throw new Error('Score must be between 0 and 100');
      }

      return {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        score: Math.round(parsed.score as number),
        feedback: String(parsed.feedback).trim(),
        highlights: (parsed.highlights as unknown[]).filter(
          (item): item is string => typeof item === 'string',
        ),
      };
    } catch (error) {
      // 파싱 실패 시 기본값 반환
      console.error(
        'AI response parsing failed:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return {
        score: 0,
        feedback: 'AI 평가 중 오류가 발생했습니다. 다시 시도해주세요.',
        highlights: [],
      };
    }
  }
}
