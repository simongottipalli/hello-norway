import { randomBytes, randomInt } from "crypto";
import { withTransaction } from "../repo/db";
import type { EmailService } from "./email/emailService";
import type { Logger } from "../lib/logger";
import * as otpRepo from "../repo/otpRepo";
import * as adminRepo from "../repo/adminRepo";

/**
 * OTP service for the admin portal.
 *
 * Re-uses the shared OTPCode table and rate-limiting logic, but:
 *   - generate: only sends an email when the address belongs to an AdminUser
 *     (non-admin emails receive the same generic response to avoid enumeration)
 *   - verify: creates an AdminSession instead of a regular Session
 */

const OTP_EXPIRATION_MINUTES = 10;
const OTP_RATE_LIMIT_MAX_ATTEMPTS = 3;
const OTP_MIN_VALUE = 100000;
const OTP_MAX_VALUE = 999999;
const SESSION_EXPIRATION_DAYS = 7;
const SESSION_TOKEN_BYTES = 64;

export interface AdminOtpServiceResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  retryAfter?: number;
  sessionToken?: string;
  adminUser?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export class AdminOtpService {
  private emailService: EmailService;

  constructor(emailService: EmailService) {
    this.emailService = emailService;
  }

  async requestOtp(email: string, logger?: Logger): Promise<AdminOtpServiceResult> {
    try {
      const rateLimitWindowMs = OTP_EXPIRATION_MINUTES * 60 * 1000;
      const windowStartTime = new Date(Date.now() - rateLimitWindowMs);
      const recentOtpCount = await otpRepo.countRecentOtps(email, windowStartTime);

      if (recentOtpCount >= OTP_RATE_LIMIT_MAX_ATTEMPTS) {
        const oldestOtp = await otpRepo.findOldestRecentOtp(email, windowStartTime);
        const retryAfter = oldestOtp
          ? Math.ceil((oldestOtp.createdAt.getTime() + rateLimitWindowMs - Date.now()) / 1000)
          : OTP_EXPIRATION_MINUTES * 60;

        logger?.warn({ msg: "Admin OTP rate limit exceeded", email, retryAfter });
        return {
          success: false,
          error: "Rate limit exceeded",
          statusCode: 429,
          retryAfter: Math.max(retryAfter, 0),
        };
      }

      await otpRepo.deleteExpiredOtps(email);

      // Only send OTP to known admin emails — unknown emails receive a generic
      // success response without an actual email being dispatched.
      const adminUser = await adminRepo.findAdminUserByEmail(email);
      if (!adminUser) {
        logger?.info({ msg: "Admin OTP requested for non-admin email (silently ignored)", email });
        return { success: true };
      }

      const code = randomInt(OTP_MIN_VALUE, OTP_MAX_VALUE);
      const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);
      await otpRepo.createOtp(email, code, expiresAt);

      logger?.info({ msg: "Admin OTP generated", email, expiresIn: `${OTP_EXPIRATION_MINUTES}m` });

      const emailResult = await this.emailService.sendEmail(
        {
          to: email,
          subject: "Your Hello Norway Admin Login Code",
          text: `Your admin login code is: ${code}\n\nThis code will expire in ${OTP_EXPIRATION_MINUTES} minutes.\n\nIf you didn't request this code, please ignore this email.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hello Norway Admin Login Code</h2>
              <p>Your admin login code is:</p>
              <h1 style="font-size: 32px; letter-spacing: 8px; color: #333;">${code}</h1>
              <p>This code will expire in ${OTP_EXPIRATION_MINUTES} minutes.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
            </div>
          `,
        },
        logger,
      );

      if (!emailResult.success) {
        logger?.error({ msg: "Failed to send admin OTP email", email, error: emailResult.error });
        return { success: false, error: "Failed to send email", statusCode: 500 };
      }

      logger?.info({ msg: "Admin OTP email sent successfully", email });
      return { success: true };
    } catch (error) {
      logger?.error({ msg: "Error in admin requestOtp", email, error });
      return { success: false, error: "Internal server error", statusCode: 500 };
    }
  }

  async verifyOtp(email: string, code: number, logger?: Logger): Promise<AdminOtpServiceResult> {
    try {
      const otpRecord = await otpRepo.findValidOtp(email, code);

      if (!otpRecord) {
        logger?.warn({ msg: "Invalid or expired admin OTP", email });
        return { success: false, error: "Invalid or expired OTP", statusCode: 401 };
      }

      const result = await withTransaction(async (tx) => {
        await otpRepo.deleteAllOtpsByEmail(email, tx);

        const adminUser = await adminRepo.findAdminUserByEmail(email);
        if (!adminUser) {
          throw { status: 401, message: "Unauthorized" };
        }

        await adminRepo.deleteAdminUserSessions(adminUser.id);

        const sessionToken = randomBytes(SESSION_TOKEN_BYTES).toString("hex");
        await adminRepo.createAdminSession(
          sessionToken,
          adminUser.id,
          new Date(Date.now() + SESSION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000),
        );

        return {
          sessionToken,
          adminUser: {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name,
          },
        };
      });

      logger?.info({ msg: "Admin OTP verified successfully", email });
      return { success: true, ...result };
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        (error as { status: number }).status === 401
      ) {
        return { success: false, error: "Unauthorized", statusCode: 401 };
      }
      logger?.error({ msg: "Error in admin verifyOtp", email, error });
      return { success: false, error: "Internal server error", statusCode: 500 };
    }
  }
}

let adminOtpServiceInstance: AdminOtpService | null = null;

function getAdminOtpServiceInstance(): AdminOtpService {
  if (!adminOtpServiceInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { emailService } = require("./email");
    adminOtpServiceInstance = new AdminOtpService(emailService);
  }
  return adminOtpServiceInstance;
}

export const adminOtpService = {
  requestOtp: (email: string, logger?: Logger) =>
    getAdminOtpServiceInstance().requestOtp(email, logger),
  verifyOtp: (email: string, code: number, logger?: Logger) =>
    getAdminOtpServiceInstance().verifyOtp(email, code, logger),
};
