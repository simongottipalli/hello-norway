import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const originalEnv = process.env;

vi.mock('@getbrevo/brevo', () => {
  const mockSendTransacEmail = vi.fn();
  const mockGetAccount = vi.fn();

  return {
    BrevoClient: vi.fn().mockImplementation(() => ({
      transactionalEmails: {
        sendTransacEmail: mockSendTransacEmail,
      },
      account: {
        getAccount: mockGetAccount,
      },
    })),
    __mockSendTransacEmail: mockSendTransacEmail,
    __mockGetAccount: mockGetAccount,
  };
});

describe('Email Service Integration', () => {
  let getEmailService: any;
  let emailService: any;

  beforeAll(async () => {
    process.env.EMAIL_PROVIDER = 'brevo';
    process.env.EMAIL_FROM = 'test@example.com';
    process.env.BREVO_API_KEY = 'test-api-key';

    const emailModule = await import('../../../services/email');
    getEmailService = emailModule.getEmailService;
    emailService = emailModule.emailService;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getEmailService', () => {
    it('should return singleton instance', () => {
      const service1 = getEmailService();
      const service2 = getEmailService();

      expect(service1).toBe(service2);
    });

    it('should return same instance as exported emailService', () => {
      const service = getEmailService();

      expect(service).toBe(emailService);
    });
  });

  describe('emailService singleton', () => {
    it('should be able to send email', async () => {
      const { BrevoClient } = await import('@getbrevo/brevo');
      const mockClient = new BrevoClient({ apiKey: 'test' });
      const mockSendTransacEmail = (mockClient.transactionalEmails as any).sendTransacEmail;

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

    it('should be able to validate config', async () => {
      const { BrevoClient } = await import('@getbrevo/brevo');
      const mockClient = new BrevoClient({ apiKey: 'test' });
      const mockGetAccount = (mockClient.account as any).getAccount;

      mockGetAccount.mockResolvedValue({ email: 'test@example.com' });

      const result = await emailService.validateConfig();

      expect(result).toBe(true);
    });
  });

  describe('Real-world usage scenarios', () => {
    it('should send OTP email', async () => {
      const { BrevoClient } = await import('@getbrevo/brevo');
      const mockClient = new BrevoClient({ apiKey: 'test' });
      const mockSendTransacEmail = (mockClient.transactionalEmails as any).sendTransacEmail;

      mockSendTransacEmail.mockResolvedValue({ messageId: 'otp-test-id' });

      const code = '123456';
      const email = 'user@example.com';

      const result = await emailService.sendEmail({
        to: email,
        subject: 'Your Hello Norway Login Code',
        html: `<h2>${code}</h2><p>Expires in 10 minutes</p>`,
        text: `Your code: ${code}\nExpires in 10 minutes`,
      });

      expect(result.success).toBe(true);
      expect(mockSendTransacEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [{ email }],
          subject: 'Your Hello Norway Login Code',
        })
      );
    });

    it('should send task reminder email', async () => {
      const { BrevoClient } = await import('@getbrevo/brevo');
      const mockClient = new BrevoClient({ apiKey: 'test' });
      const mockSendTransacEmail = (mockClient.transactionalEmails as any).sendTransacEmail;

      mockSendTransacEmail.mockResolvedValue({ messageId: 'reminder-test-id' });

      const taskTitle = 'Complete registration';
      const dueDate = '2026-03-01';
      const email = 'user@example.com';

      const result = await emailService.sendEmail({
        to: email,
        subject: `Reminder: ${taskTitle}`,
        html: `<p>Task due: ${dueDate}</p>`,
        text: `Task due: ${dueDate}`,
      });

      expect(result.success).toBe(true);
      expect(mockSendTransacEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [{ email }],
          subject: `Reminder: ${taskTitle}`,
        })
      );
    });

    it('should send welcome email with custom sender', async () => {
      const { BrevoClient } = await import('@getbrevo/brevo');
      const mockClient = new BrevoClient({ apiKey: 'test' });
      const mockSendTransacEmail = (mockClient.transactionalEmails as any).sendTransacEmail;

      mockSendTransacEmail.mockResolvedValue({ messageId: 'welcome-test-id' });

      const result = await emailService.sendEmail({
        to: 'newuser@example.com',
        subject: 'Welcome to Hello Norway',
        html: '<h1>Welcome!</h1><p>We are glad to have you.</p>',
        text: 'Welcome! We are glad to have you.',
        from: 'Hello Norway Team <hello@hellonorway.com>',
        replyTo: 'support@hellonorway.com',
      });

      expect(result.success).toBe(true);
      expect(mockSendTransacEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          sender: { name: 'Hello Norway Team', email: 'hello@hellonorway.com' },
          replyTo: { email: 'support@hellonorway.com' },
        })
      );
    });

    it('should handle bulk email sending', async () => {
      const { BrevoClient } = await import('@getbrevo/brevo');
      const mockClient = new BrevoClient({ apiKey: 'test' });
      const mockSendTransacEmail = (mockClient.transactionalEmails as any).sendTransacEmail;

      mockSendTransacEmail.mockClear();
      mockSendTransacEmail.mockResolvedValue({ messageId: 'bulk-test-id' });

      const recipients = [
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
      ];

      const results = await Promise.all(
        recipients.map((recipient) =>
          emailService.sendEmail({
            to: recipient,
            subject: 'Bulk Email',
            html: '<p>Bulk Email Content</p>',
            text: 'Bulk Email Content',
          })
        )
      );

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(mockSendTransacEmail).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error handling scenarios', () => {
    it('should handle network errors gracefully', async () => {
      const { BrevoClient } = await import('@getbrevo/brevo');
      const mockClient = new BrevoClient({ apiKey: 'test' });
      const mockSendTransacEmail = (mockClient.transactionalEmails as any).sendTransacEmail;

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
      const mockSendTransacEmail = (mockClient.transactionalEmails as any).sendTransacEmail;

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
      const mockSendTransacEmail = (mockClient.transactionalEmails as any).sendTransacEmail;

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
