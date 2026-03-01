import { BrevoClient } from '@getbrevo/brevo';
import type { EmailOptions, EmailResult, EmailProvider } from '../types';
import type { Logger } from '../../lib/logger';

export class BrevoProvider implements EmailProvider {
  private client: BrevoClient;
  private defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string) {
    if (!apiKey) {
      throw new Error('Brevo API key is required');
    }
    if (!defaultFrom) {
      throw new Error('Default from email address is required');
    }

    this.defaultFrom = defaultFrom;
    this.client = new BrevoClient({ apiKey });
  }

  async sendEmail(options: EmailOptions, logger?: Logger): Promise<EmailResult> {
    try {
      logger?.info({ msg: 'Attempting to send email via Brevo', to: options.to });

      const response = await this.client.transactionalEmails.sendTransacEmail({
        sender: this.parseSender(options.from || this.defaultFrom),
        to: this.parseRecipients(options.to),
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text,
        replyTo: options.replyTo ? this.parseSender(options.replyTo) : undefined,
        cc: options.cc && options.cc.length > 0 ? this.parseRecipients(options.cc) : undefined,
        bcc: options.bcc && options.bcc.length > 0 ? this.parseRecipients(options.bcc) : undefined,
      });

      logger?.info({ msg: 'Email sent successfully via Brevo', messageId: response.messageId });

      return {
        success: true,
        messageId: response.messageId,
      };
    } catch (error) {
      logger?.error({ msg: 'Brevo email sending failed', error });

      let errorMessage = 'Failed to send email';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.client.account.getAccount();
      return true;
    } catch (error) {
      console.error('Brevo configuration validation failed:', error);
      return false;
    }
  }

  private parseSender(email: string): { email: string; name?: string } {
    const match = email.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      return {
        name: match[1].trim(),
        email: match[2].trim(),
      };
    }
    return { email: email.trim() };
  }

  private parseRecipients(
    recipients: string | string[]
  ): Array<{ email: string; name?: string }> {
    const recipientArray = Array.isArray(recipients) ? recipients : [recipients];
    return recipientArray.map((recipient) => this.parseSender(recipient));
  }
}
