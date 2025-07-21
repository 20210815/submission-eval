import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface NotificationData {
  type: string;
  essayId: number;
  studentId: number;
  errorMessage: string;
  traceId: string;
  timestamp: string;
  environment: string;
}

@Injectable()
export class NotificationService {
  constructor(private configService: ConfigService) {}

  async notifyEvaluationFailure(
    essayId: number,
    studentId: number,
    errorMessage: string,
    traceId?: string,
  ): Promise<void> {
    console.log('🔔 NotificationService.notifyEvaluationFailure called:', {
      essayId,
      studentId,
      errorMessage,
      traceId,
    });

    const notificationData: NotificationData = {
      type: 'ESSAY_EVALUATION_FAILED',
      essayId,
      studentId,
      errorMessage,
      traceId: traceId || 'unknown',
      timestamp: new Date().toISOString(),
      environment: this.configService.get('NODE_ENV', 'development'),
    };

    try {
      await this.sendSlackNotification(notificationData);
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  private async sendSlackNotification(data: NotificationData): Promise<void> {
    const slackWebhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');
    console.log(
      '🔗 Slack webhook URL:',
      slackWebhookUrl ? 'CONFIGURED' : 'NOT CONFIGURED',
    );

    if (!slackWebhookUrl) {
      console.warn('❌ Slack webhook URL not configured');
      return;
    }

    const message = {
      text: '🚨 에세이 평가 시스템 오류 발생',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 에세이 평가 실패 알림',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Essay ID:* ${data.essayId}`,
            },
            {
              type: 'mrkdwn',
              text: `*Student ID:* ${data.studentId}`,
            },
            {
              type: 'mrkdwn',
              text: `*Environment:* ${data.environment}`,
            },
            {
              type: 'mrkdwn',
              text: `*Time:* ${data.timestamp}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Error:* \`${data.errorMessage}\``,
          },
        },
        ...(data.traceId
          ? [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Trace ID:* ${data.traceId}`,
                },
              },
            ]
          : []),
      ],
    };

    try {
      console.log(
        '📤 Sending Slack notification...',
        JSON.stringify(message, null, 2),
      );
      const response = await axios.post(slackWebhookUrl, message, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log(
        '✅ Slack notification sent successfully. Response status:',
        response.status,
      );
    } catch (error) {
      console.error(
        '❌ Failed to send Slack notification:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}
