import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const originalEnv = process.env;

vi.mock('@getbrevo/brevo', () => {
  const mockSendTransacEmail = vi.fn();
  const mockGetAccount = vi.fn();

  return {
    BrevoClient: vi.fn().mockImplementation(function () {
      return {
        transactionalEmails: {
          sendTransacEmail: mockSendTransacEmail,
        },
        account: {
          getAccount: mockGetAccount,
        },
      };
    }),
    __mockSendTransacEmail: mockSendTransacEmail,
    __mockGetAccount: mockGetAccount,
  };
});

describe('Email Service Integration', () => {
  let emailService: { sendEmail: (options: unknown) => Promise<unknown> };

  beforeAll(async () => {
    process.env.EMAIL_PROVIDER = 'brevo';
    process.env.EMAIL_FROM = 'test@example.com';
    process.env.BREVO_API_KEY = 'test-api-key';

    const emailModule = await import('../../../services/email');
    emailService = emailModule.emailService;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('emailService singleton', () => {
    it('should be able to send email', async () => {
      const { BrevoClient } = await import('@getbrevo/brevo');
      const mockClient = new BrevoClient({ apiKey: 'test' });
      const mockSendTransacEmail = (mockClient.transactionalEmails as { sendTransacEmail: ReturnType<typeof vi.fn> }).sendTransacEmail;

      mockSendTransacEmail.mockResolvedValue({ messageId: 'integration-test-id' });

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Integration Test',
        html: '<p>Integration Test Email</p>',
        text: 'Integration Test Email',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('integration-test-id');
    });

  });

  describe('Error handling scenarios', () => {
    it('should handle network errors gracefully', async () => {
      const { BrevoClient } = await import('@getbrevo/brevo');
      const mockClient = new BrevoClient({ apiKey: 'test' });
      const mockSendTransacEmail = (mockClient.transactionalEmails as { sendTransacEmail: ReturnType<typeof vi.fn> }).sendTransacEmail;

      mockSendTransacEmail.mockRejectedValue(new Error('Network timeout'));

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('should handle invalid email addresses', async () => {
      const { BrevoClient } = await import('@getbrevo/brevo');
      const mockClient = new BrevoClient({ apiKey: 'test' });
      const mockSendTransacEmail = (mockClient.transactionalEmails as { sendTransacEmail: ReturnType<typeof vi.fn> }).sendTransacEmail;

      mockSendTransacEmail.mockRejectedValue(new Error('Invalid email address'));

      const result = await emailService.sendEmail({
        to: 'invalid-email',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email address');
    });

    it('should handle API rate limiting', async () => {
      const { BrevoClient } = await import('@getbrevo/brevo');
      const mockClient = new BrevoClient({ apiKey: 'test' });
      const mockSendTransacEmail = (mockClient.transactionalEmails as { sendTransacEmail: ReturnType<typeof vi.fn> }).sendTransacEmail;

      mockSendTransacEmail.mockRejectedValue(new Error('Rate limit exceeded'));

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });
  });
});
