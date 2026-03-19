import type { EmailOptions, EmailProvider, EmailResult } from '../types';
import type { Logger } from '../../../lib/logger';

/**
 * No-op email provider for test environments.
 * Suppresses all outbound email. If a logger is provided, the suppressed
 * email details are logged at info level for debugging purposes.
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
