import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrevoProvider } from '../../../services/email/providers/brevoProvider';
import type { EmailOptions } from '../../../services/email/types';

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

describe('BrevoProvider', () => {
  let provider: BrevoProvider;
  const mockApiKey = 'test-api-key';
  const mockFrom = 'test@example.com';

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new BrevoProvider(mockApiKey, mockFrom);
  });

  describe('constructor', () => {
    it('should create provider with valid credentials', () => {
      expect(provider).toBeInstanceOf(BrevoProvider);
    });

    it('should throw error if API key is missing', () => {
      expect(() => new BrevoProvider('', mockFrom)).toThrow('Brevo API key is required');
    });

    it('should throw error if default from email is missing', () => {
      expect(() => new BrevoProvider(mockApiKey, '')).toThrow(
        'Default from email address is required'
      );
    });
  });

  describe('sendEmail', () => {
    let mockSendTransacEmail: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      const { BrevoClient } = await import('@getbrevo/brevo');
      const mockClient = new BrevoClient({ apiKey: mockApiKey });
      mockSendTransacEmail = (mockClient.transactionalEmails as { sendTransacEmail: ReturnType<typeof vi.fn> }).sendTransacEmail;
    });

    it('should send email successfully with minimal options', async () => {
      mockSendTransacEmail.mockResolvedValue({ messageId: 'test-message-id' });

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      };

      const result = await provider.sendEmail(options);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockSendTransacEmail).toHaveBeenCalledWith({
        sender: { email: mockFrom },
        to: [{ email: 'recipient@example.com' }],
        subject: 'Test Subject',
        htmlContent: '<p>Test HTML</p>',
        textContent: 'Test Text',
        replyTo: undefined,
        cc: undefined,
        bcc: undefined,
      });
    });

    it('should send email with custom from address', async () => {
      mockSendTransacEmail.mockResolvedValue({ messageId: 'test-message-id' });

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
        from: 'custom@example.com',
      };

      const result = await provider.sendEmail(options);

      expect(result.success).toBe(true);
      expect(mockSendTransacEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          sender: { email: 'custom@example.com' },
        })
      );
    });

    it('should send email with sender name', async () => {
      mockSendTransacEmail.mockResolvedValue({ messageId: 'test-message-id' });

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
        from: 'John Doe <john@example.com>',
      };

      const result = await provider.sendEmail(options);

      expect(result.success).toBe(true);
      expect(mockSendTransacEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          sender: { name: 'John Doe', email: 'john@example.com' },
        })
      );
    });

    it('should send email to multiple recipients', async () => {
      mockSendTransacEmail.mockResolvedValue({ messageId: 'test-message-id' });

      const options: EmailOptions = {
        to: ['recipient1@example.com', 'recipient2@example.com'],
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      };

      const result = await provider.sendEmail(options);

      expect(result.success).toBe(true);
      expect(mockSendTransacEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [{ email: 'recipient1@example.com' }, { email: 'recipient2@example.com' }],
        })
      );
    });

    it('should send email with CC recipients', async () => {
      mockSendTransacEmail.mockResolvedValue({ messageId: 'test-message-id' });

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
        cc: ['cc1@example.com', 'cc2@example.com'],
      };

      const result = await provider.sendEmail(options);

      expect(result.success).toBe(true);
      expect(mockSendTransacEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          cc: [{ email: 'cc1@example.com' }, { email: 'cc2@example.com' }],
        })
      );
    });

    it('should send email with BCC recipients', async () => {
      mockSendTransacEmail.mockResolvedValue({ messageId: 'test-message-id' });

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
        bcc: ['bcc1@example.com'],
      };

      const result = await provider.sendEmail(options);

      expect(result.success).toBe(true);
      expect(mockSendTransacEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          bcc: [{ email: 'bcc1@example.com' }],
        })
      );
    });

    it('should send email with reply-to address', async () => {
      mockSendTransacEmail.mockResolvedValue({ messageId: 'test-message-id' });

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
        replyTo: 'reply@example.com',
      };

      const result = await provider.sendEmail(options);

      expect(result.success).toBe(true);
      expect(mockSendTransacEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: { email: 'reply@example.com' },
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('API Error: Invalid recipient');
      mockSendTransacEmail.mockRejectedValue(apiError);

      const options: EmailOptions = {
        to: 'invalid@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      };

      const result = await provider.sendEmail(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error: Invalid recipient');
      expect(result.messageId).toBeUndefined();
    });

    it('should handle non-Error exceptions', async () => {
      mockSendTransacEmail.mockRejectedValue({ message: 'Custom error object' });

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      };

      const result = await provider.sendEmail(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Custom error object');
    });

    it('should not include empty CC array in request', async () => {
      mockSendTransacEmail.mockResolvedValue({ messageId: 'test-message-id' });

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
        cc: [],
      };

      const result = await provider.sendEmail(options);

      expect(result.success).toBe(true);
      expect(mockSendTransacEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          cc: undefined,
        })
      );
    });
  });

  describe('validateConfig', () => {
    let mockGetAccount: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      const { BrevoClient } = await import('@getbrevo/brevo');
      const mockClient = new BrevoClient({ apiKey: mockApiKey });
      mockGetAccount = (mockClient.account as { getAccount: ReturnType<typeof vi.fn> }).getAccount;
    });

    it('should return true when API key is valid', async () => {
      mockGetAccount.mockResolvedValue({ email: 'test@example.com' });

      const result = await provider.validateConfig();

      expect(result).toBe(true);
      expect(mockGetAccount).toHaveBeenCalled();
    });

    it('should return false when API key is invalid', async () => {
      mockGetAccount.mockRejectedValue(new Error('Unauthorized'));

      const result = await provider.validateConfig();

      expect(result).toBe(false);
    });

    it('should return false on network errors', async () => {
      mockGetAccount.mockRejectedValue(new Error('Network error'));

      const result = await provider.validateConfig();

      expect(result).toBe(false);
    });
  });

  describe('parseSender', () => {
    let mockSendTransacEmail: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      const { BrevoClient } = await import('@getbrevo/brevo');
      const mockClient = new BrevoClient({ apiKey: mockApiKey });
      mockSendTransacEmail = (mockClient.transactionalEmails as { sendTransacEmail: ReturnType<typeof vi.fn> }).sendTransacEmail;
    });

    it('should parse email with name correctly', async () => {
      mockSendTransacEmail.mockResolvedValue({ messageId: 'test-message-id' });

      const options: EmailOptions = {
        to: 'John Smith <john.smith@example.com>',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      };

      await provider.sendEmail(options);

      expect(mockSendTransacEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [{ name: 'John Smith', email: 'john.smith@example.com' }],
        })
      );
    });

    it('should parse plain email correctly', async () => {
      mockSendTransacEmail.mockResolvedValue({ messageId: 'test-message-id' });

      const options: EmailOptions = {
        to: 'plain@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      };

      await provider.sendEmail(options);

      expect(mockSendTransacEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [{ email: 'plain@example.com' }],
        })
      );
    });
  });
});
