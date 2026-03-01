import { Request, Response, NextFunction } from 'express';

/**
 * Error Logger Middleware
 * 
 * Global Express error handler that logs unhandled errors with full context
 * Should be registered after all routes
 */
export const errorLogger = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  // Use request logger if available, otherwise log will be missed
  const logger = req.logger;

  if (logger) {
    logger.error({
      msg: 'Unhandled error',
      error: {
        message: err.message,
        stack: err.stack,
        name: err.name,
      },
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
    });
  }

  // Send error response
  res.status(500).json({
    error: 'Internal server error',
  });
};
