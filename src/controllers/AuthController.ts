import {
  Body,
  Delete,
  Get,
  Patch,
  Post,
  Route,
  Response,
  Security,
  SuccessResponse,
  Request,
} from "tsoa";
import { UpdateProfileDto, SessionResponseDto } from "../dto/AuthDto";
import * as authService from "../services/authService";
import { parseDateOnly } from "../lib/dateUtils";
import { EMPLOYMENT_STATUS_VALUES } from "../types/enums";
import type { Request as ExpressRequest } from "express";

const EMPLOYMENT_STATUSES = new Set<string>(EMPLOYMENT_STATUS_VALUES);

@Route("auth")
export class AuthController {
  /**
   * Get current session information
   */
  @Get("session")
  @Security("cookie_auth")
  @SuccessResponse("200", "Session retrieved")
  @Response<{ error: string }>("401", "Unauthorized")
  public async getSession(
    @Request() req: ExpressRequest
  ): Promise<SessionResponseDto> {
    return {
      authenticated: true,
      user: req.user!,
      session: {
        expiresAt: req.session!.expiresAt,
      },
    };
  }

  /**
   * Get user profile
   */
  @Get("profile")
  @Security("cookie_auth")
  @SuccessResponse("200", "Profile retrieved")
  @Response<{ error: string }>("401", "Unauthorized")
  @Response<{ error: string }>("404", "User not found")
  public async getProfile(@Request() req: ExpressRequest): Promise<{ user: unknown }> {
    const result = await authService.getProfile(req.user!.id);

    if (!result.success) {
      throw { status: result.statusCode ?? 404, message: result.error };
    }

    return { user: result.data };
  }

  /**
   * Update user profile
   */
  @Patch("profile")
  @Security("cookie_auth")
  @SuccessResponse("200", "Profile updated")
  @Response<{ error: string }>("400", "Validation error")
  @Response<{ error: string }>("401", "Unauthorized")
  public async updateProfile(
    @Body() body: UpdateProfileDto,
    @Request() req: ExpressRequest
  ): Promise<{ success: boolean; user: unknown }> {
    if (body.name !== undefined) {
      const trimmedName = body.name.trim();
      if (!trimmedName) {
        throw { status: 400, message: "Invalid name. Must not be empty." };
      }
      if (trimmedName.length > 255) {
        throw {
          status: 400,
          message: "Invalid name. Maximum length is 255 characters.",
        };
      }
    }

    if (body.employmentStatus !== undefined && body.employmentStatus !== null) {
      if (!EMPLOYMENT_STATUSES.has(body.employmentStatus)) {
        throw { status: 400, message: "Invalid employmentStatus." };
      }
    }

    let arrivalDate: Date | null | undefined;
    if (body.arrivalDate !== undefined) {
      const parsed = parseDateOnly(body.arrivalDate);
      if (body.arrivalDate !== null && parsed === undefined) {
        throw {
          status: 400,
          message: "Invalid arrivalDate. Must be YYYY-MM-DD or null.",
        };
      }
      arrivalDate = parsed;
    }

    let plannedArrivalDate: Date | null | undefined;
    if (body.plannedArrivalDate !== undefined) {
      const parsed = parseDateOnly(body.plannedArrivalDate);
      if (body.plannedArrivalDate !== null && parsed === undefined) {
        throw {
          status: 400,
          message: "Invalid plannedArrivalDate. Must be YYYY-MM-DD or null.",
        };
      }
      plannedArrivalDate = parsed;
    }

    try {
      const result = await authService.updateProfile(req.user!.id, {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.isEU !== undefined ? { isEU: body.isEU } : {}),
        ...(body.hasChildren !== undefined ? { hasChildren: body.hasChildren } : {}),
        ...(body.employmentStatus !== undefined
          ? { employmentStatus: body.employmentStatus }
          : {}),
        ...(arrivalDate !== undefined ? { arrivalDate } : {}),
        ...(plannedArrivalDate !== undefined ? { plannedArrivalDate } : {}),
      });

      return { success: true, user: result.data };
    } catch (error: unknown) {
      req.logger.error({
        err: error,
        userId: req.user!.id,
        msg: "Failed to update profile",
      });
      throw { status: 500, message: "Failed to update profile" };
    }
  }

  /**
   * Logout user session
   */
  @Post("logout")
  @SuccessResponse("200", "Logged out")
  @Response<{ error: string }>("500", "Server error")
  public async logout(
    @Request() req: ExpressRequest
  ): Promise<{ success: boolean }> {
    const sessionToken = req.cookies?.session_token;

    try {
      await authService.logout(sessionToken);
      return { success: true };
    } catch (error: unknown) {
      req.logger.error({
        err: error,
        sessionToken,
        msg: "Failed to logout user session",
      });
      throw { status: 500, message: "Failed to logout" };
    }
  }

  /**
   * Delete user account and all associated data
   */
  @Delete("profile")
  @Security("cookie_auth")
  @SuccessResponse("200", "Profile deleted")
  @Response<{ error: string }>("401", "Unauthorized")
  @Response<{ error: string }>("500", "Server error")
  public async deleteProfile(
    @Request() req: ExpressRequest
  ): Promise<{ success: boolean }> {
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    try {
      await authService.deleteProfile(userId);
      req.logger.info({
        userId,
        email: userEmail,
        msg: "User profile deleted successfully",
      });
      return { success: true };
    } catch (error: unknown) {
      req.logger.error({ err: error, userId, msg: "Failed to delete profile" });
      throw { status: 500, message: "Failed to delete profile" };
    }
  }
}
