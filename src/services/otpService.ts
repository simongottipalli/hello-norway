import { randomBytes, randomInt } from 'crypto';
import { prisma } from '../lib/prisma';
import type { EmailService } from './email/emailService';
import type { Logger } from '../lib/logger';
import { syncUserTaskAssignments } from './taskAssignmentService';
import * as otpRepo from '../repo/otpRepo';
import * as userRepo from '../repo/userRepo';
import * as sessionRepo from '../repo/sessionRepo';

/**
 * OTP Service
 * Handles OTP generation, storage, rate limiting, and email delivery
 */

// OTP Configuration Constants
const OTP_EXPIRATION_MINUTES = 10;
const OTP_RATE_LIMIT_MAX_ATTEMPTS = 3;
const OTP_MIN_VALUE = 100000; // 6-digit OTP minimum
const OTP_MAX_VALUE = 999999; // 6-digit OTP maximum
const SESSION_EXPIRATION_DAYS = 7;
const SESSION_TOKEN_BYTES = 64;

export interface OtpServiceResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  retryAfter?: number;
  sessionToken?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export class OtpService {
  private emailService: EmailService;

  constructor(emailService: EmailService) {
    this.emailService = emailService;
  }

  /**
   * Request an OTP for the given email
   * @param email - Normalized email address
   * @param logger - Logger instance for request tracing
   * @returns Result indicating success or failure with status code
   */
  async requestOtp(email: string, logger?: Logger): Promise<OtpServiceResult> {
    try {
      // Check rate limiting - count OTPs created in last window
      const rateLimitWindowMs = OTP_EXPIRATION_MINUTES * 60 * 1000;
      const windowStartTime = new Date(Date.now() - rateLimitWindowMs);
      const recentOtpCount = await otpRepo.countRecentOtps(email, windowStartTime);

      if (recentOtpCount >= OTP_RATE_LIMIT_MAX_ATTEMPTS) {
        // Calculate retry after in seconds (time until oldest OTP expires)
        const oldestOtp = await otpRepo.findOldestRecentOtp(email, windowStartTime);

        const retryAfter = oldestOtp
          ? Math.ceil((oldestOtp.createdAt.getTime() + rateLimitWindowMs - Date.now()) / 1000)
          : OTP_EXPIRATION_MINUTES * 60; // Default to full window if not found

        logger?.warn({ msg: 'Rate limit exceeded', email, retryAfter });

        return {
          success: false,
          error: 'Rate limit exceeded',
          statusCode: 429,
          retryAfter: Math.max(retryAfter, 0),
        };
      }

      // Delete expired OTP records for this email
      await otpRepo.deleteExpiredOtps(email);

      // Generate cryptographically secure 6-digit OTP
      const code = randomInt(OTP_MIN_VALUE, OTP_MAX_VALUE);

      // Store OTP with configured expiration
      const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);
      await otpRepo.createOtp(email, code, expiresAt);

      logger?.info({
        msg: 'OTP generated',
        email,
        expiresIn: `${OTP_EXPIRATION_MINUTES}m`,
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
      }, logger);

      if (!emailResult.success) {
        logger?.error({ msg: 'Failed to send OTP email', email, error: emailResult.error });
        return {
          success: false,
          error: 'Failed to send email',
          statusCode: 500,
        };
      }

      logger?.info({ msg: 'OTP email sent successfully', email });

      return {
        success: true,
      };
    } catch (error) {
      logger?.error({ msg: 'Error in requestOtp', email, error });
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
   * @param logger - Logger instance for request tracing
   * @returns Result indicating success or failure
   */
  async verifyOtp(email: string, code: number, logger?: Logger): Promise<OtpServiceResult> {
    try {
      // Find valid OTP for this email
      const otpRecord = await otpRepo.findValidOtp(email, code);

      if (!otpRecord) {
        logger?.warn({ msg: 'Invalid or expired OTP', email });
        return {
          success: false,
          error: 'Invalid or expired OTP',
          statusCode: 401,
        };
      }

      // Wrap all operations in a transaction to ensure atomicity
      // If any step fails, the OTP is not consumed and the user can retry
      const result = await prisma.$transaction(async (tx) => {
        // Delete all OTP records for this email after successful verification
        await otpRepo.deleteAllOtpsByEmail(email, tx);

        const user = await userRepo.upsertUserByEmail(email, tx);

        // Sync task assignments within the transaction
        await syncUserTaskAssignments(user, { db: tx });

        // Clean up old sessions for this user
        await sessionRepo.deleteUserSessions(user.id, tx);

        // Create new session
        const sessionToken = randomBytes(SESSION_TOKEN_BYTES).toString('hex');
        await sessionRepo.createSession(
          sessionToken,
          user.id,
          new Date(Date.now() + SESSION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000),
          tx,
        );

        return {
          sessionToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        };
      });

      logger?.info({ msg: 'OTP verified successfully', email });

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      logger?.error({ msg: 'Error in verifyOtp', email, error });
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

export const otpService = {
  requestOtp: (email: string, logger?: Logger) => getOtpServiceInstance().requestOtp(email, logger),
  verifyOtp: (email: string, code: number, logger?: Logger) => getOtpServiceInstance().verifyOtp(email, code, logger),
};
