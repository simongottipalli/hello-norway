import { Request, Response } from "express";
import { otpService } from "../services/otpService";

/**
 * RFC 5321 compliant email regex
 * Validates email format according to RFC 5321 specification
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Maximum email length according to RFC 5321
 */
const MAX_EMAIL_LENGTH = 320;

/**
 * Generic response message to prevent email enumeration
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

    // Validate email presence
    if (!email || typeof email !== "string") {
      return res.status(400).json({ 
        error: "Email is required",
        message: GENERIC_MESSAGE 
      });
    }

    // Enforce max length
    if (email.length > MAX_EMAIL_LENGTH) {
      return res.status(400).json({ 
        error: "Email exceeds maximum length",
        message: GENERIC_MESSAGE 
      });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.trim().toLowerCase();

    // Validate email format using RFC 5321 regex
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ 
        error: "Invalid email format",
        message: GENERIC_MESSAGE 
      });
    }

    // Delegate to OTP service
    const result = await otpService.requestOtp(normalizedEmail);

    // Handle service errors with appropriate status codes
    if (!result.success) {
      const statusCode = result.statusCode || 500;
      
      // Add Retry-After header for rate limit errors
      if (statusCode === 429 && result.retryAfter !== undefined) {
        res.set('Retry-After', result.retryAfter.toString());
      }
      
      // Return generic message even for errors to prevent enumeration
      return res.status(statusCode).json({ 
        error: result.error || "An error occurred",
        message: GENERIC_MESSAGE 
      });
    }

    // Always return generic success message
    res.status(200).json({ message: GENERIC_MESSAGE });
  } catch (error: unknown) {
    // Handle unexpected errors
    // TODO: Replace console.error with structured logging service for production
    console.error("Error in requestOtp:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: GENERIC_MESSAGE 
    });
  }
};
