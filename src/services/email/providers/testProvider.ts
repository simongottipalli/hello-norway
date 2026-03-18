import type { EmailOptions, EmailProvider, EmailResult } from '../types';
import type { Logger } from '../../../lib/logger';

/**
 * No-op email provider for test environments.
 * Logs the email to the console instead of sending it so E2E tests
 * can run without real email credentials.
 */
export class TestProvider implements EmailProvider {
  async sendEmail(options: EmailOptions, logger?: Logger): Promise<EmailResult> {
    logger?.info({
      msg: '[TestProvider] Email suppressed in test mode',
      to: options.to,
      subject: options.subject,
    });
    return { success: true };
  }
}
