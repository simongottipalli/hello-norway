import { randomInt } from 'crypto';
import { prisma } from '../lib/prisma';
import type { EmailService } from './email/emailService';

/**
 * OTP Service
 * Handles OTP generation, storage, rate limiting, and email delivery
 */

// OTP Configuration Constants
const OTP_EXPIRATION_MINUTES = 10;
const OTP_RATE_LIMIT_MAX_ATTEMPTS = 3;
const OTP_MIN_VALUE = 100000; // 6-digit OTP minimum
const OTP_MAX_VALUE = 999999; // 6-digit OTP maximum

export interface OtpServiceResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  retryAfter?: number;
}

export class OtpService {
  private emailService: EmailService;

  constructor(emailService: EmailService) {
    this.emailService = emailService;
  }

  /**
   * Request an OTP for the given email
   * @param email - Normalized email address
   * @returns Result indicating success or failure with status code
   */
  async requestOtp(email: string): Promise<OtpServiceResult> {
    try {
      // Check rate limiting - count OTPs created in last window
      const rateLimitWindowMs = OTP_EXPIRATION_MINUTES * 60 * 1000;
      const windowStartTime = new Date(Date.now() - rateLimitWindowMs);
      const recentOtpCount = await prisma.oTPCode.count({
        where: {
          email,
          createdAt: {
            gte: windowStartTime,
          },
        },
      });

      if (recentOtpCount >= OTP_RATE_LIMIT_MAX_ATTEMPTS) {
        // Calculate retry after in seconds (time until oldest OTP expires)
        const oldestOtp = await prisma.oTPCode.findFirst({
          where: {
            email,
            createdAt: {
              gte: windowStartTime,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

        const retryAfter = oldestOtp
          ? Math.ceil((oldestOtp.createdAt.getTime() + rateLimitWindowMs - Date.now()) / 1000)
          : OTP_EXPIRATION_MINUTES * 60; // Default to full window if not found

        return {
          success: false,
          error: 'Rate limit exceeded',
          statusCode: 429,
          retryAfter: Math.max(retryAfter, 0),
        };
      }

      // Delete expired OTP records for this email
      await prisma.oTPCode.deleteMany({
        where: {
          email,
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      // Generate cryptographically secure 6-digit OTP
      const code = randomInt(OTP_MIN_VALUE, OTP_MAX_VALUE);

      // Store OTP with configured expiration
      const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);
      await prisma.oTPCode.create({
        data: {
          email,
          code,
          expiresAt,
        },
      });

      // Send OTP via email
      const emailResult = await this.emailService.sendEmail({
        to: email,
        subject: 'Your Hello Norway Login Code',
        text: `Your login code is: ${code}\n\nThis code will expire in ${OTP_EXPIRATION_MINUTES} minutes.\n\nIf you didn't request this code, please ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your Hello Norway Login Code</h2>
            <p>Your login code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 8px; color: #333;">${code}</h1>
            <p>This code will expire in ${OTP_EXPIRATION_MINUTES} minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });

      if (!emailResult.success) {
        return {
          success: false,
          error: 'Failed to send email',
          statusCode: 500,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      // TODO: Replace console.error with structured logging service for production
      console.error('Error in requestOtp:', error);
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500,
      };
    }
  }

  /**
   * Verify an OTP code for the given email
   * @param email - Normalized email address
   * @param code - OTP code to verify
   * @returns Result indicating success or failure
   */
  async verifyOtp(email: string, code: number): Promise<OtpServiceResult> {
    try {
      // Find valid OTP for this email
      const otpRecord = await prisma.oTPCode.findFirst({
        where: {
          email,
          code,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!otpRecord) {
        return {
          success: false,
          error: 'Invalid or expired OTP',
          statusCode: 401,
        };
      }

      // Delete all OTP records for this email after successful verification
      await prisma.oTPCode.deleteMany({
        where: {
          email,
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      // TODO: Replace console.error with structured logging service for production
      console.error('Error in verifyOtp:', error);
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500,
      };
    }
  }
}

// Singleton instance management
let otpServiceInstance: OtpService | null = null;

/**
 * Initialize the OTP service with an email service
 * This should be called during application startup
 */
export function initializeOtpService(emailService: EmailService): void {
  otpServiceInstance = new OtpService(emailService);
}

/**
 * Get the initialized OTP service instance
 * Lazy-loads on first call in production if not explicitly initialized
 */
function getOtpServiceInstance(): OtpService {
  if (!otpServiceInstance) {
    // Lazy load email service for backward compatibility
    // In production, prefer calling initializeOtpService() during startup
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { emailService } = require('./email');
      otpServiceInstance = new OtpService(emailService);
    } catch {
      throw new Error(
        'OTP service not initialized. Call initializeOtpService() with an EmailService instance during application startup.'
      );
    }
  }
  return otpServiceInstance;
}

/**
 * Exported OTP service singleton
 * Provides lazy initialization for backward compatibility
 * For new code, prefer calling initializeOtpService() during startup
 */
export const otpService = {
  requestOtp: (email: string) => getOtpServiceInstance().requestOtp(email),
  verifyOtp: (email: string, code: number) => getOtpServiceInstance().verifyOtp(email, code),
};
