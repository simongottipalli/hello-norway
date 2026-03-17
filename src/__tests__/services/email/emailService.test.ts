import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EmailService,
  createEmailService,
  createEmailServiceFromEnv,
} from '../../../services/email/emailService';
import type { EmailProvider, EmailOptions, EmailResult } from '../../../services/email/types';

describe('EmailService', () => {
  let mockProvider: EmailProvider;

  beforeEach(() => {
    mockProvider = {
      sendEmail: vi.fn(),
    };
  });

  describe('constructor', () => {
    it('should create service with provider', () => {
      const service = new EmailService(mockProvider);
      expect(service).toBeInstanceOf(EmailService);
    });
  });

  describe('sendEmail', () => {
    it('should delegate to provider', async () => {
      const service = new EmailService(mockProvider);
      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      };
      const expectedResult: EmailResult = {
        success: true,
        messageId: 'test-id',
      };

      (mockProvider.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue(expectedResult);

      const result = await service.sendEmail(options);

      expect(result).toEqual(expectedResult);
      expect(mockProvider.sendEmail).toHaveBeenCalledWith(options, undefined);
    });

    it('should handle provider errors', async () => {
      const service = new EmailService(mockProvider);
      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      };
      const expectedResult: EmailResult = {
        success: false,
        error: 'Failed to send',
      };

      (mockProvider.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue(expectedResult);

      const result = await service.sendEmail(options);

      expect(result).toEqual(expectedResult);
      expect(result.success).toBe(false);
    });
  });

});

describe('createEmailService', () => {
  it('should create service with Brevo provider', () => {
    const config = {
      provider: 'brevo' as const,
      from: 'test@example.com',
      brevo: {
        apiKey: 'test-api-key',
      },
    };

    const service = createEmailService(config);

    expect(service).toBeInstanceOf(EmailService);
  });

  it('should throw error if Brevo API key is missing', () => {
    const config = {
      provider: 'brevo' as const,
      from: 'test@example.com',
      brevo: {
        apiKey: '',
      },
    };

    expect(() => createEmailService(config)).toThrow(
      'Brevo API key is required when using Brevo provider'
    );
  });

  it('should throw error if Brevo config is missing', () => {
    const config = {
      provider: 'brevo' as const,
      from: 'test@example.com',
      brevo: undefined as unknown as { apiKey: string },
    };

    expect(() => createEmailService(config)).toThrow(
      'Brevo API key is required when using Brevo provider'
    );
  });

  it('should throw error for unsupported provider', () => {
    const config = {
      provider: 'unsupported' as 'brevo',
      from: 'test@example.com',
      brevo: { apiKey: 'test' },
    };

    expect(() => createEmailService(config)).toThrow('Unsupported email provider: unsupported');
  });
});

describe('createEmailServiceFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create service from environment variables', () => {
    process.env.EMAIL_PROVIDER = 'brevo';
    process.env.EMAIL_FROM = 'test@example.com';
    process.env.BREVO_API_KEY = 'test-api-key';

    const service = createEmailServiceFromEnv();

    expect(service).toBeInstanceOf(EmailService);
  });

  it('should throw error if EMAIL_PROVIDER is missing', () => {
    delete process.env.EMAIL_PROVIDER;
    process.env.EMAIL_FROM = 'test@example.com';
    process.env.BREVO_API_KEY = 'test-api-key';

    expect(() => createEmailServiceFromEnv()).toThrow(
      'EMAIL_PROVIDER environment variable is required'
    );
  });

  it('should throw error if EMAIL_FROM is missing', () => {
    process.env.EMAIL_PROVIDER = 'brevo';
    delete process.env.EMAIL_FROM;
    process.env.BREVO_API_KEY = 'test-api-key';

    expect(() => createEmailServiceFromEnv()).toThrow(
      'EMAIL_FROM environment variable is required'
    );
  });

  it('should throw error if BREVO_API_KEY is missing', () => {
    process.env.EMAIL_PROVIDER = 'brevo';
    process.env.EMAIL_FROM = 'test@example.com';
    delete process.env.BREVO_API_KEY;

    expect(() => createEmailServiceFromEnv()).toThrow(
      'BREVO_API_KEY environment variable is required when using Brevo provider'
    );
  });

  it('should throw error for unsupported provider in env', () => {
    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.EMAIL_FROM = 'test@example.com';
    process.env.BREVO_API_KEY = 'test-api-key';

    expect(() => createEmailServiceFromEnv()).toThrow(
      "Unsupported email provider: sendgrid. Only 'brevo' is currently supported."
    );
  });
});
