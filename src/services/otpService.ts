import { randomInt } from 'crypto';
import { prisma } from '../lib/prisma';
import type { EmailService } from './email/emailService';

/**
 * OTP Service
 * Handles OTP generation, storage, rate limiting, and email delivery
 */

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
      // Check rate limiting - count OTPs created in last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentOtpCount = await prisma.oTPCode.count({
        where: {
          email,
          createdAt: {
            gte: tenMinutesAgo,
          },
        },
      });

      if (recentOtpCount >= 3) {
        // Calculate retry after in seconds (time until oldest OTP expires)
        const oldestOtp = await prisma.oTPCode.findFirst({
          where: {
            email,
            createdAt: {
              gte: tenMinutesAgo,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

        const retryAfter = oldestOtp
          ? Math.ceil((oldestOtp.createdAt.getTime() + 10 * 60 * 1000 - Date.now()) / 1000)
          : 600; // Default to 10 minutes if not found

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
      const code = randomInt(100000, 999999);

      // Store OTP with 10-minute expiration
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
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
        text: `Your login code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your Hello Norway Login Code</h2>
            <p>Your login code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 8px; color: #333;">${code}</h1>
            <p>This code will expire in 10 minutes.</p>
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
      console.error('Error in requestOtp:', error);
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500,
      };
    }
  }
}

// Create and export singleton instance
// Will be initialized on first import in production
// Tests should mock this module
let otpServiceInstance: OtpService | null = null;

export function initializeOtpService(emailService: EmailService): void {
  otpServiceInstance = new OtpService(emailService);
}

function getOtpServiceInstance(): OtpService {
  if (!otpServiceInstance) {
    // Lazy load email service to avoid initialization issues during import
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { emailService } = require('./email');
      otpServiceInstance = new OtpService(emailService);
    } catch (error) {
      throw new Error('OTP service not initialized. Call initializeOtpService() first.');
    }
  }
  return otpServiceInstance;
}

export const otpService: OtpService = {
  requestOtp: (email: string) => getOtpServiceInstance().requestOtp(email),
};
