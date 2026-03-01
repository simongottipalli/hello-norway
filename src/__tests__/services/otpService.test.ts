import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OtpService } from '../../services/otpService';
import { prisma } from '../../lib/prisma';
import type { EmailService } from '../../services/email/emailService';
import type { EmailResult } from '../../services/email/types';

// Mock prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    oTPCode: {
      count: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('OtpService', () => {
  let otpService: OtpService;
  let mockEmailService: EmailService;
  const testEmail = 'test@example.com';

  beforeEach(() => {
    // Create mock email service
    mockEmailService = {
      sendEmail: vi.fn(),
      validateConfig: vi.fn(),
    } as unknown as EmailService;
    
    otpService = new OtpService(mockEmailService);
    vi.clearAllMocks();
    // Set up time mocking
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('OTP Generation', () => {
    it('should generate a 6-digit OTP', async () => {
      // Setup mocks
      (prisma.oTPCode.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (prisma.oTPCode.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (prisma.oTPCode.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-id',
        email: testEmail,
        code: 123456,
        expiresAt: new Date(),
        createdAt: new Date(),
      });
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      } as EmailResult);

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(true);
      expect(prisma.oTPCode.create).toHaveBeenCalledWith({
        data: {
          email: testEmail,
          code: expect.any(Number),
          expiresAt: expect.any(Date),
        },
      });

      // Verify the OTP is a 6-digit number
      const createCall = (prisma.oTPCode.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const otpCode = createCall.data.code;
      expect(otpCode).toBeGreaterThanOrEqual(100000);
      expect(otpCode).toBeLessThan(1000000);
    });

    it('should set expiration to 10 minutes from now', async () => {
      const now = new Date('2024-01-01T12:00:00Z');
      const expectedExpiry = new Date('2024-01-01T12:10:00Z');

      (prisma.oTPCode.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (prisma.oTPCode.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (prisma.oTPCode.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-id',
        email: testEmail,
        code: 123456,
        expiresAt: expectedExpiry,
        createdAt: now,
      });
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      } as EmailResult);

      await otpService.requestOtp(testEmail);

      const createCall = (prisma.oTPCode.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt;
      expect(expiresAt.getTime()).toBe(expectedExpiry.getTime());
    });
  });

  describe('Rate Limiting', () => {
    it('should allow request when no recent OTPs exist', async () => {
      (prisma.oTPCode.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (prisma.oTPCode.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (prisma.oTPCode.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-id',
        email: testEmail,
        code: 123456,
        expiresAt: new Date(),
        createdAt: new Date(),
      });
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      } as EmailResult);

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(true);
    });

    it('should allow request when less than 3 recent OTPs exist', async () => {
      (prisma.oTPCode.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);
      (prisma.oTPCode.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (prisma.oTPCode.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-id',
        email: testEmail,
        code: 123456,
        expiresAt: new Date(),
        createdAt: new Date(),
      });
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      } as EmailResult);

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(true);
    });

    it('should reject request when 3 or more recent OTPs exist', async () => {
      const oldestOtpTime = new Date('2024-01-01T11:55:00Z');

      (prisma.oTPCode.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);
      (prisma.oTPCode.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'oldest-id',
        email: testEmail,
        code: 123456,
        expiresAt: new Date(),
        createdAt: oldestOtpTime,
      });

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(429);
      expect(result.error).toBe('Rate limit exceeded');
      expect(prisma.oTPCode.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should include Retry-After header with correct value on rate limit', async () => {
      const now = new Date('2024-01-01T12:00:00Z');
      const oldestOtpTime = new Date('2024-01-01T11:55:00Z'); // 5 minutes ago

      (prisma.oTPCode.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);
      (prisma.oTPCode.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'oldest-id',
        email: testEmail,
        code: 123456,
        expiresAt: new Date(),
        createdAt: oldestOtpTime,
      });

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(429);
      expect(result.retryAfter).toBeDefined();
      // Should retry after 5 minutes (time until oldest OTP expires from 10-minute window)
      expect(result.retryAfter).toBe(300); // 5 minutes = 300 seconds
    });

    it('should count OTPs from last 10 minutes only', async () => {
      const now = new Date('2024-01-01T12:00:00Z');
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

      (prisma.oTPCode.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);
      (prisma.oTPCode.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (prisma.oTPCode.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-id',
        email: testEmail,
        code: 123456,
        expiresAt: new Date(),
        createdAt: new Date(),
      });
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      } as EmailResult);

      await otpService.requestOtp(testEmail);

      expect(prisma.oTPCode.count).toHaveBeenCalledWith({
        where: {
          email: testEmail,
          createdAt: {
            gte: tenMinutesAgo,
          },
        },
      });
    });
  });

  describe('Expired OTP Cleanup', () => {
    it('should delete expired OTPs before creating new one', async () => {
      const now = new Date('2024-01-01T12:00:00Z');

      (prisma.oTPCode.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (prisma.oTPCode.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });
      (prisma.oTPCode.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-id',
        email: testEmail,
        code: 123456,
        expiresAt: new Date(),
        createdAt: new Date(),
      });
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      } as EmailResult);

      await otpService.requestOtp(testEmail);

      expect(prisma.oTPCode.deleteMany).toHaveBeenCalledWith({
        where: {
          email: testEmail,
          expiresAt: {
            lt: now,
          },
        },
      });
    });
  });

  describe('Email Sending', () => {
    it('should send OTP via email service', async () => {
      (prisma.oTPCode.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (prisma.oTPCode.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (prisma.oTPCode.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-id',
        email: testEmail,
        code: 123456,
        expiresAt: new Date(),
        createdAt: new Date(),
      });
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      } as EmailResult);

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
        to: testEmail,
        subject: 'Your Hello Norway Login Code',
        text: expect.stringContaining('login code'),
        html: expect.stringContaining('login code'),
      });
    });

    it('should include OTP code in email content', async () => {
      (prisma.oTPCode.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (prisma.oTPCode.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (prisma.oTPCode.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-id',
        email: testEmail,
        code: 123456,
        expiresAt: new Date(),
        createdAt: new Date(),
      });
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      } as EmailResult);

      await otpService.requestOtp(testEmail);

      const emailCall = (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      
      // Extract the OTP code from the created record
      const createCall = (prisma.oTPCode.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const otpCode = createCall.data.code;

      expect(emailCall.text).toContain(otpCode.toString());
      expect(emailCall.html).toContain(otpCode.toString());
    });

    it('should return error when email sending fails', async () => {
      (prisma.oTPCode.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (prisma.oTPCode.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (prisma.oTPCode.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-id',
        email: testEmail,
        code: 123456,
        expiresAt: new Date(),
        createdAt: new Date(),
      });
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'SMTP connection failed',
      } as EmailResult);

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Failed to send email');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (prisma.oTPCode.count as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Internal server error');
    });

    it('should handle OTP creation errors', async () => {
      (prisma.oTPCode.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (prisma.oTPCode.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (prisma.oTPCode.create as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Insert failed')
      );

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Internal server error');
    });

    it('should handle email service errors', async () => {
      (prisma.oTPCode.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (prisma.oTPCode.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (prisma.oTPCode.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-id',
        email: testEmail,
        code: 123456,
        expiresAt: new Date(),
        createdAt: new Date(),
      });
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Email service error')
      );

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Internal server error');
    });
  });
});
