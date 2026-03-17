import { Request, Response } from "express";
import { otpService } from "../services/otpService";
import { EMAIL_REGEX } from "../lib/utils";

/**
 * Maximum email length according to RFC 5321
 */
const MAX_EMAIL_LENGTH = 320;

/**
 * Generic response message to prevent email enumeration
 * Used only when an email send attempt is made (success or service-level failure)
 */
const GENERIC_MESSAGE = "If this email is valid, an OTP has been sent.";

/**
 * Request OTP Controller
 * Validates email and delegates to OTP service
 *
 * @param req - Express request with email in body
 * @param res - Express response
 */
export const requestOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Validation errors: These occur before any email send attempt,
    // so we return just the error without the generic message

    // Validate email presence
    if (!email || typeof email !== "string") {
      return res.status(400).json({
        error: "Email is required"
      });
    }

    // Enforce max length
    if (email.length > MAX_EMAIL_LENGTH) {
      return res.status(400).json({
        error: "Email exceeds maximum length"
      });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.trim().toLowerCase();

    // Validate email format using RFC 5321 regex
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        error: "Invalid email format"
      });
    }

    // From this point forward, we attempt to send the email
    // All responses include the generic message to prevent email enumeration

    // Delegate to OTP service
    const result = await otpService.requestOtp(normalizedEmail, req.logger);

    // Handle service errors with appropriate status codes
    if (!result.success) {
      const statusCode = result.statusCode || 500;

      // Add Retry-After header for rate limit errors
      if (statusCode === 429 && result.retryAfter !== undefined) {
        res.set('Retry-After', result.retryAfter.toString());
      }

      // Return generic message to prevent enumeration (email send was attempted)
      return res.status(statusCode).json({
        error: result.error || "An error occurred",
        message: GENERIC_MESSAGE
      });
    }

    // Always return generic success message
    req.logger.info({ msg: 'OTP request processed', email: normalizedEmail });
    res.status(200).json({ message: GENERIC_MESSAGE });
  } catch (error: unknown) {
    // Handle unexpected errors
    req.logger.error({ msg: 'Error in requestOtp', error });
    res.status(500).json({
      error: "Internal server error",
      message: GENERIC_MESSAGE
    });
  }
};

/**
 * Verify OTP Controller
 * Validates OTP code and email
 *
 * @param req - Express request with email and code in body
 * @param res - Express response
 */
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    // Validate email presence
    if (!email || typeof email !== "string") {
      return res.status(400).json({
        error: "Email is required"
      });
    }

    // Validate code presence
    if (code === undefined || code === null) {
      return res.status(400).json({
        error: "OTP code is required"
      });
    }

    // Validate code is a number
    if (typeof code !== "number") {
      return res.status(400).json({
        error: "OTP code must be a number"
      });
    }

    // Validate code is an integer
    if (!Number.isInteger(code)) {
      return res.status(400).json({
        error: "OTP code must be an integer"
      });
    }

    // Validate code is within 6-digit range (100000-999999)
    if (code < 100000 || code > 999999) {
      return res.status(400).json({
        error: "OTP code must be a 6-digit number"
      });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.trim().toLowerCase();

    // Validate email format using RFC 5321 regex
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        error: "Invalid email format"
      });
    }

    // Delegate to OTP service
    const result = await otpService.verifyOtp(normalizedEmail, code, req.logger);

    if (!result.success) {
      const statusCode = result.statusCode || 500;
      return res.status(statusCode).json({
        error: result.error || "Verification failed"
      });
    }

    // Return success response
    req.logger.info({ msg: 'OTP verified successfully', email: normalizedEmail });
    res.status(200).json({
      message: "OTP verified successfully",
      success: true,
      sessionToken: result.sessionToken,
      user: result.user,
    });
  } catch (error: unknown) {
    // Handle unexpected errors
    req.logger.error({ msg: 'Error in verifyOtp', error });
    res.status(500).json({
      error: "Internal server error"
    });
  }
};
