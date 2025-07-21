/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NotificationService', () => {
  let service: NotificationService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifyEvaluationFailure', () => {
    const essayId = 1;
    const studentId = 123;
    const errorMessage = 'AI 평가 중 오류가 발생했습니다';
    const traceId = 'test-trace-id';

    it('should send Slack notification successfully', async () => {
      const slackWebhookUrl = 'https://hooks.slack.com/test-webhook';
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SLACK_WEBHOOK_URL') return slackWebhookUrl;
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      });

      mockedAxios.post.mockResolvedValue({ status: 200 });

      const mockConsoleLog = jest.fn();
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(mockConsoleLog);

      await service.notifyEvaluationFailure(
        essayId,
        studentId,
        errorMessage,
        traceId,
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🔔 NotificationService.notifyEvaluationFailure called:',
        {
          essayId,
          studentId,
          errorMessage,
          traceId,
        },
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🔗 Slack webhook URL:',
        'CONFIGURED',
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        slackWebhookUrl,
        expect.objectContaining({
          text: '🚨 에세이 평가 시스템 오류 발생',
          blocks: expect.arrayContaining([
            expect.objectContaining({
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🚨 에세이 평가 실패 알림',
              },
            }),
            expect.objectContaining({
              type: 'section',
              fields: expect.arrayContaining([
                expect.objectContaining({
                  type: 'mrkdwn',
                  text: `*Essay ID:* ${essayId}`,
                }),
                expect.objectContaining({
                  type: 'mrkdwn',
                  text: `*Student ID:* ${studentId}`,
                }),
              ]),
            }),
            expect.objectContaining({
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Error:* \`${errorMessage}\``,
              },
            }),
            expect.objectContaining({
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Trace ID:* ${traceId}`,
              },
            }),
          ]),
        }),
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '✅ Slack notification sent successfully. Response status:',
        200,
      );

      consoleSpy.mockRestore();
    });

    it('should warn and return early when Slack webhook URL is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SLACK_WEBHOOK_URL') return undefined;
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      });

      const mockConsoleWarn = jest.fn();
      const mockConsoleLog = jest.fn();
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(mockConsoleWarn);
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(mockConsoleLog);

      await service.notifyEvaluationFailure(
        essayId,
        studentId,
        errorMessage,
        traceId,
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🔗 Slack webhook URL:',
        'NOT CONFIGURED',
      );

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '❌ Slack webhook URL not configured',
      );

      expect(mockedAxios.post).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should handle axios error gracefully', async () => {
      const slackWebhookUrl = 'https://hooks.slack.com/test-webhook';
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SLACK_WEBHOOK_URL') return slackWebhookUrl;
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      });

      const axiosError = new Error('Network error');
      mockedAxios.post.mockRejectedValue(axiosError);

      const mockConsoleError = jest.fn();
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(mockConsoleError);

      await expect(
        service.notifyEvaluationFailure(essayId, studentId, errorMessage),
      ).resolves.not.toThrow();

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to send Slack notification:',
        axiosError,
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle axios error with response data gracefully', async () => {
      const slackWebhookUrl = 'https://hooks.slack.com/test-webhook';
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SLACK_WEBHOOK_URL') return slackWebhookUrl;
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      });

      const axiosError = new Error('Request failed') as Error & {
        response?: { data: { error: string } };
      };
      axiosError.response = { data: { error: 'Invalid webhook' } };

      mockedAxios.post.mockRejectedValue(axiosError);

      const mockConsoleError = jest.fn();
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(mockConsoleError);

      await expect(
        service.notifyEvaluationFailure(essayId, studentId, errorMessage),
      ).resolves.not.toThrow();

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to send Slack notification:',
        axiosError,
      );

      consoleErrorSpy.mockRestore();
    });

    it('should use default trace ID when not provided', async () => {
      const slackWebhookUrl = 'https://hooks.slack.com/test-webhook';
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SLACK_WEBHOOK_URL') return slackWebhookUrl;
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      });

      mockedAxios.post.mockResolvedValue({ status: 200 });

      const mockConsoleLog = jest.fn();
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(mockConsoleLog);

      await service.notifyEvaluationFailure(essayId, studentId, errorMessage);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🔔 NotificationService.notifyEvaluationFailure called:',
        {
          essayId,
          studentId,
          errorMessage,
          traceId: undefined,
        },
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        slackWebhookUrl,
        expect.objectContaining({
          blocks: expect.not.arrayContaining([
            expect.objectContaining({
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: expect.stringContaining('*Trace ID:*'),
              },
            }),
          ]),
        }),
        expect.any(Object),
      );

      consoleSpy.mockRestore();
    });
  });
});
