import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  notifyEvaluationFailure(
    essayId: number,
    studentId: number,
    errorMessage: string,
    traceId?: string,
  ): void {
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
      // 여러 알림 채널로 전송
      this.sendSlackNotification(notificationData);
      this.sendEmailNotification(notificationData);
      this.logNotification(notificationData);
    } catch (error) {
      console.error('Failed to send failure notification:', error);
    }
  }

  private sendSlackNotification(data: NotificationData): void {
    const slackWebhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');

    if (!slackWebhookUrl) {
      console.warn('Slack webhook URL not configured');
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

    // 실제 환경에서는 axios를 사용하여 Slack API 호출
    console.log(
      'Slack notification (simulation):',
      JSON.stringify(message, null, 2),
    );
  }

  private sendEmailNotification(data: NotificationData): void {
    const adminEmails = (
      this.configService.get<string>('ADMIN_EMAILS', '') || ''
    )
      .split(',')
      .filter((email: string) => Boolean(email.trim()));

    if (adminEmails.length === 0) {
      console.warn('Admin emails not configured');
      return;
    }

    const emailContent = {
      to: adminEmails,
      subject: `[긴급] 에세이 평가 시스템 오류 - Essay ${data.essayId}`,
      html: `
        <h2>🚨 에세이 평가 시스템 오류 발생</h2>
        <table border="1" cellpadding="10" cellspacing="0">
          <tr><td><strong>Essay ID</strong></td><td>${data.essayId}</td></tr>
          <tr><td><strong>Student ID</strong></td><td>${data.studentId}</td></tr>
          <tr><td><strong>Environment</strong></td><td>${data.environment}</td></tr>
          <tr><td><strong>Time</strong></td><td>${data.timestamp}</td></tr>
          ${data.traceId ? `<tr><td><strong>Trace ID</strong></td><td>${data.traceId}</td></tr>` : ''}
          <tr><td><strong>Error Message</strong></td><td><pre>${data.errorMessage}</pre></td></tr>
        </table>
        <p>즉시 확인이 필요합니다.</p>
      `,
    };

    // 실제 환경에서는 이메일 서비스 사용 (예: SendGrid, AWS SES)
    console.log(
      'Email notification (simulation):',
      JSON.stringify(emailContent, null, 2),
    );
  }

  private logNotification(data: NotificationData): void {
    // 구조화된 로그로 기록 (ELK Stack, CloudWatch 등에서 모니터링 가능)
    console.error('ESSAY_EVALUATION_FAILURE', {
      essayId: data.essayId,
      studentId: data.studentId,
      errorMessage: data.errorMessage,
      traceId: data.traceId,
      timestamp: data.timestamp,
      environment: data.environment,
    });
  }

  notifyEvaluationSuccess(
    essayId: number,
    studentId: number,
    score: number,
  ): void {
    // 성공 알림은 선택적으로 구현 (예: 높은 점수일 때만)
    if (score >= 90) {
      console.log('High score achievement:', { essayId, studentId, score });
    }
  }
}
