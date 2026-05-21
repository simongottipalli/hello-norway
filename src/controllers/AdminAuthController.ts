import { Get, Post, Route, Response, Security, SuccessResponse, Request } from "tsoa";
import { AdminSessionResponseDto } from "../dto/AdminOtpDto";
import * as adminRepo from "../repo/adminRepo";
import type { Request as ExpressRequest } from "express";

@Route("admin/auth")
export class AdminAuthController {
  /**
   * Get current admin session information
   */
  @Get("session")
  @Security("admin_cookie_auth")
  @SuccessResponse("200", "Session retrieved")
  @Response<{ error: string }>("401", "Unauthorized")
  public async getSession(@Request() req: ExpressRequest): Promise<AdminSessionResponseDto> {
    return {
      authenticated: true,
      adminUser: req.adminUser!,
      session: {
        expiresAt: req.adminSession!.expiresAt,
      },
    };
  }

  /**
   * Logout admin session
   */
  @Post("logout")
  @SuccessResponse("200", "Logged out")
  @Response<{ error: string }>("500", "Server error")
  public async logout(@Request() req: ExpressRequest): Promise<{ success: boolean }> {
    const sessionToken = req.cookies?.admin_session_token;

    try {
      if (sessionToken) {
        await adminRepo.deleteAdminSessionByToken(sessionToken);
      }
      return { success: true };
    } catch (error: unknown) {
      req.logger.error({ err: error, msg: "Failed to logout admin session" });
      throw { status: 500, message: "Failed to logout" };
    }
  }
}
