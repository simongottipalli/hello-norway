import type { EmailOptions, EmailResult, EmailProvider, EmailServiceConfig } from './types';
import { BrevoProvider } from './providers/brevoProvider';
import { TestProvider } from './providers/testProvider';
import type { Logger } from '../../lib/logger';

export class EmailService {
  private provider: EmailProvider;

  constructor(provider: EmailProvider) {
    this.provider = provider;
  }

  async sendEmail(options: EmailOptions, logger?: Logger): Promise<EmailResult> {
    return this.provider.sendEmail(options, logger);
  }
}

export function createEmailService(config: EmailServiceConfig): EmailService {
  let provider: EmailProvider;

  switch (config.provider) {
    case 'brevo':
      if (!config.brevo?.apiKey) {
        throw new Error('Brevo API key is required when using Brevo provider');
      }
      provider = new BrevoProvider(config.brevo.apiKey, config.from);
      break;
    case 'test':
      provider = new TestProvider();
      break;
    default:
      throw new Error(`Unsupported email provider: ${config.provider}`);
  }

  return new EmailService(provider);
}

export function createEmailServiceFromEnv(): EmailService {
  const provider = process.env.EMAIL_PROVIDER;
  const from = process.env.EMAIL_FROM;
  const brevoApiKey = process.env.BREVO_API_KEY;

  // Allow test mode without real email credentials when EMAIL_PROVIDER is explicitly set to 'test'
  if (provider === 'test') {
    return createEmailService({ provider: 'test', from: from || 'noreply@example.com' });
  }

  if (!provider) {
    throw new Error('EMAIL_PROVIDER environment variable is required');
  }

  if (!from) {
    throw new Error('EMAIL_FROM environment variable is required');
  }

  if (provider !== 'brevo') {
    throw new Error(`Unsupported email provider: ${provider}. Only 'brevo' is currently supported.`);
  }

  if (!brevoApiKey) {
    throw new Error('BREVO_API_KEY environment variable is required when using Brevo provider');
  }

  const config: EmailServiceConfig = {
    provider: 'brevo',
    from,
    brevo: {
      apiKey: brevoApiKey,
    },
  };

  return createEmailService(config);
}
