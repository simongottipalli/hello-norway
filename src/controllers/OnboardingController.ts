import { Body, Post, Route, Response, SuccessResponse, Request } from "tsoa";
import { OnboardingProfileDto } from "../dto/OnboardingDto";
import * as onboardingService from "../services/onboardingService";
import { parseDateOnly } from "../lib/dateUtils";
import { EMPLOYMENT_STATUS_VALUES, EmploymentStatus } from "../types/enums";
import type { Request as ExpressRequest } from "express";

const EMPLOYMENT_STATUSES = new Set<string>(EMPLOYMENT_STATUS_VALUES);

@Route("onboarding")
export class OnboardingController {
  /**
   * Get a preview of tasks based on user profile.
   * Public endpoint used during onboarding before account creation.
   */
  @Post("tasks")
  @SuccessResponse("200", "Task preview generated")
  @Response<{ error: string }>("400", "Validation error")
  @Response<{ message: string; details: Record<string, unknown> }>("422", "DTO validation failed")
  @Response<{ error: string }>("500", "Server error")
  public async getTaskPreview(
    @Body() body: OnboardingProfileDto,
    @Request() req: ExpressRequest
  ): Promise<unknown> {
    if (
      body.employmentStatus !== undefined &&
      body.employmentStatus !== null &&
      !EMPLOYMENT_STATUSES.has(body.employmentStatus)
    ) {
      throw {
        status: 400,
        message: "Invalid employmentStatus.",
      };
    }

    const arrivalDate = parseDateOnly(body.arrivalDate);
    if (
      body.arrivalDate !== undefined &&
      body.arrivalDate !== null &&
      arrivalDate === undefined
    ) {
      throw {
        status: 400,
        message: "Invalid arrivalDate. Must be YYYY-MM-DD or null.",
      };
    }

    const plannedArrivalDate = parseDateOnly(body.plannedArrivalDate);
    if (
      body.plannedArrivalDate !== undefined &&
      body.plannedArrivalDate !== null &&
      plannedArrivalDate === undefined
    ) {
      throw {
        status: 400,
        message: "Invalid plannedArrivalDate. Must be YYYY-MM-DD or null.",
      };
    }

    try {
      const tasks = await onboardingService.getTaskPreview({
        isEU: body.isEU ?? null,
        hasChildren: body.hasChildren ?? null,
        employmentStatus: (body.employmentStatus ?? null) as EmploymentStatus | null,
        arrivalDate: arrivalDate ?? null,
        plannedArrivalDate: plannedArrivalDate ?? null,
      });

      return tasks;
    } catch (error: unknown) {
      req.logger.error({ err: error, msg: "Failed to fetch onboarding task preview" });
      throw {
        status: 500,
        message: "Failed to fetch onboarding tasks",
      };
    }
  }
}
