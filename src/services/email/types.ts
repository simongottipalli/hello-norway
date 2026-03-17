import type { Logger } from '../../lib/logger';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  sendEmail(options: EmailOptions, logger?: Logger): Promise<EmailResult>;
}

export interface EmailServiceConfig {
  provider: 'brevo';
  from: string;
  brevo: {
    apiKey: string;
  };
}
