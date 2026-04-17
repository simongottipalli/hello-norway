import { Body, Post, Route, Response, SuccessResponse, Request } from "tsoa";
import { RequestOtpDto, VerifyOtpDto, OtpResponseDto, VerifyOtpSuccessDto } from "../dto/OtpDto";
import { otpService } from "../services/otpService";
import { EMAIL_REGEX } from "../lib/utils";
import type { Request as ExpressRequest } from "express";

const GENERIC_MESSAGE = "If this email is valid, an OTP has been sent.";

@Route("otp")
export class OtpController {
  /**
   * Request an OTP code to be sent to the provided email
   */
  @Post("generate")
  @SuccessResponse("200", "OTP sent")
  @Response<{ error: string }>("400", "Validation error")
  @Response<{ message: string; details: Record<string, unknown> }>("422", "DTO validation failed")
  @Response<{ error: string; message: string }>("429", "Rate limit exceeded")
  @Response<{ error: string; message: string }>("500", "Server error")
  public async requestOtp(
    @Body() body: RequestOtpDto,
    @Request() req: ExpressRequest
  ): Promise<OtpResponseDto> {
    try {
      const { email } = body;

      const normalizedEmail = email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        throw {
          status: 400,
          message: "Invalid email format",
        };
      }

      const result = await otpService.requestOtp(normalizedEmail, req.logger);

      if (!result.success) {
        const statusCode = result.statusCode || 500;
        throw {
          status: statusCode,
          message: result.error || "An error occurred",
          retryAfter: result.retryAfter,
          genericMessage: GENERIC_MESSAGE,
        };
      }

      req.logger.info({ msg: "OTP request processed", email: normalizedEmail });
      return { message: GENERIC_MESSAGE };
    } catch (error: unknown) {
      if (isControllerError(error)) {
        throw error;
      }
      req.logger.error({ err: error, msg: "Unexpected error while processing OTP request" });
      throw {
        status: 500,
        message: "Internal server error",
        genericMessage: GENERIC_MESSAGE,
      };
    }
  }

  /**
   * Verify an OTP code and create a session
   */
  @Post("verify")
  @SuccessResponse("200", "OTP verified")
  @Response<{ error: string }>("400", "Validation error")
  @Response<{ error: string }>("401", "Invalid OTP")
  @Response<{ message: string; details: Record<string, unknown> }>("422", "DTO validation failed")
  @Response<{ error: string }>("500", "Server error")
  public async verifyOtp(
    @Body() body: VerifyOtpDto,
    @Request() req: ExpressRequest
  ): Promise<VerifyOtpSuccessDto> {
    const { email, code } = body;

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      throw {
        status: 400,
        message: "Invalid email format",
      };
    }

    const result = await otpService.verifyOtp(normalizedEmail, code, req.logger);

    if (!result.success) {
      throw {
        status: result.statusCode || 500,
        message: result.error || "Verification failed",
      };
    }

    req.logger.info({ msg: "OTP verified successfully", email: normalizedEmail });
    return {
      message: "OTP verified successfully",
      success: true,
      sessionToken: result.sessionToken!,
      user: result.user!,
    };
  }
}

function isControllerError(
  err: unknown
): err is { status: number; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as Record<string, unknown>).status === "number" &&
    "message" in err &&
    typeof (err as Record<string, unknown>).message === "string"
  );
}
