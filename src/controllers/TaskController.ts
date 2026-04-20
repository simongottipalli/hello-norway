import { Body, Get, Patch, Post, Route, Response, Security, SuccessResponse, Request, Path } from "tsoa";
import { CreateTaskDto, UpdateTaskStatusDto } from "../dto/TaskDto";
import * as taskService from "../services/taskService";
import { handleDatabaseError } from "../repo/errors";
import { parseDateOnly } from "../lib/dateUtils";
import type { Request as ExpressRequest } from "express";

@Route("tasks")
export class TaskController {
  /**
   * Get all tasks personalized for the current user
   */
  @Get("personalized")
  @Security("cookie_auth")
  @SuccessResponse("200", "Tasks retrieved")
  @Response<{ error: string }>("401", "Unauthorized")
  @Response<{ error: string }>("500", "Server error")
  public async getUserTasks(@Request() req: ExpressRequest): Promise<unknown[]> {
    try {
      const tasks = await taskService.getUserTasks(req.user!.id);
      req.logger.info({ msg: 'Fetched user tasks', count: tasks.length, userId: req.user!.id });
      return tasks;
    } catch (error: unknown) {
      req.logger.error({ msg: 'Failed to fetch user tasks', error, userId: req.user?.id });
      throw { status: 500, message: "Failed to fetch user tasks" };
    }
  }

  /**
   * Get a single task by ID
   */
  @Get("{id}")
  @Security("cookie_auth")
  @SuccessResponse("200", "Task retrieved")
  @Response<{ error: string }>("401", "Unauthorized")
  @Response<{ error: string }>("404", "Task not found")
  public async getTaskById(
    @Path() id: string,
    @Request() req: ExpressRequest
  ): Promise<unknown> {
    let result;
    try {
      result = await taskService.getTaskById(id, req.user!.id);
    } catch (error: unknown) {
      const errorResponse = handleDatabaseError(error, req.logger);
      if (errorResponse) {
        throw { status: errorResponse.status, message: errorResponse.message };
      }
      req.logger.error({ msg: 'Failed to fetch task', error });
      throw { status: 500, message: "Failed to fetch task" };
    }

    if (!result.success) {
      req.logger.info({ msg: 'Task not found', taskId: id });
      throw { status: result.statusCode ?? 404, message: result.error };
    }

    req.logger.info({ msg: 'Fetched task by id', taskId: id });
    return result.data;
  }

  /**
   * Create a new task
   */
  @Post()
  @Security("cookie_auth")
  @SuccessResponse("201", "Task created")
  @Response<{ error: string }>("400", "Validation error")
  @Response<{ error: string }>("401", "Unauthorized")
  public async createTask(
    @Body() body: CreateTaskDto,
    @Request() req: ExpressRequest
  ): Promise<unknown> {
    // Cross-field validation not handled by tsoa DTO constraints
    if (
      body.minDaysFromArrival !== undefined && body.minDaysFromArrival !== null &&
      body.maxDaysFromArrival !== undefined && body.maxDaysFromArrival !== null &&
      body.maxDaysFromArrival < body.minDaysFromArrival
    ) {
      throw { status: 400, message: "maxDaysFromArrival must be greater than or equal to minDaysFromArrival" };
    }

    let result;
    try {
      result = await taskService.createTask(body, req.user!.id);
    } catch (error: unknown) {
      const errorResponse = handleDatabaseError(error, req.logger);
      if (errorResponse) {
        throw { status: errorResponse.status, message: errorResponse.message };
      }
      req.logger.error({ msg: 'Failed to create task', error });
      throw { status: 500, message: "Failed to create task" };
    }

    if (!result.success) {
      req.logger.error({ msg: 'Task creation failed', error: result.error });
      throw { status: result.statusCode ?? 500, message: result.error };
    }

    req.logger.info({ msg: 'Task created', taskId: result.data!.id, slug: body.slug });
    return result.data;
  }

  /**
   * Update task status and optional fields
   */
  @Patch("{id}/status")
  @Security("cookie_auth")
  @SuccessResponse("200", "Task status updated")
  @Response<{ error: string }>("400", "Validation error")
  @Response<{ error: string }>("401", "Unauthorized")
  @Response<{ error: string }>("404", "Task not found")
  public async updateTaskStatus(
    @Path() id: string,
    @Body() body: UpdateTaskStatusDto,
    @Request() req: ExpressRequest
  ): Promise<unknown> {
    // Parse due date before the service call so validation errors are not
    // swallowed by the catch block below
    let dueDate: Date | null | undefined;
    if (body.dueDate !== undefined) {
      const parsedDueDate = parseDateOnly(body.dueDate);
      if (body.dueDate !== null && parsedDueDate === undefined) {
        throw { status: 400, message: "Invalid dueDate. Must be a valid date string or null" };
      }
      dueDate = parsedDueDate;
    }

    let result;
    try {
      result = await taskService.updateTaskStatus(id, body.status, req.user!.id, {
        dueDate,
        personalNotes: body.personalNotes
      });
    } catch (error: unknown) {
      const errorResponse = handleDatabaseError(error, req.logger);
      if (errorResponse) {
        throw { status: errorResponse.status, message: errorResponse.message };
      }
      req.logger.error({ msg: 'Failed to update task status', error });
      throw { status: 500, message: "Failed to update task status" };
    }

    if (!result.success) {
      req.logger.info({ msg: 'Task status update failed', taskId: id, error: result.error });
      throw { status: result.statusCode ?? 500, message: result.error };
    }

    req.logger.info({ msg: 'User task status updated', taskId: id, userId: req.user!.id });
    return result.data;
  }
}
