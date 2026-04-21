import { Request, Response, NextFunction } from "express";
import { ValidateError } from "tsoa";

/**
 * Error handler for tsoa validation errors and controller-thrown errors.
 * Must be registered after tsoa's RegisterRoutes and before the generic errorLogger.
 */
export const tsoaErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof ValidateError) {
    req.logger?.warn({ msg: "Validation error", fields: err.fields });
    res.status(422).json({
      message: "Validation Failed",
      details: err?.fields,
    });
    return;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    (err as { message?: string }).message === "Unauthorized"
  ) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (isControllerError(err)) {
    const { status, message, retryAfter, genericMessage } = err;

    if (status === 429 && retryAfter !== undefined) {
      res.set("Retry-After", retryAfter.toString());
    }

    const body: Record<string, unknown> = { error: message };
    if (genericMessage !== undefined) {
      body.message = genericMessage;
    }

    res.status(status).json(body);
    return;
  }

  next(err);
};

interface ControllerError {
  status: number;
  message: string;
  retryAfter?: number;
  genericMessage?: string;
}

function isControllerError(err: unknown): err is ControllerError {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as ControllerError).status === "number" &&
    "message" in err &&
    typeof (err as ControllerError).message === "string"
  );
}
