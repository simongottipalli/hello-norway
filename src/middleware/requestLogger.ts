import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { createChildLogger } from '../lib/logger';

/**
 * Request Logger Middleware
 * 
 * Extracts or generates X-Request-ID and attaches a request-scoped logger to req.logger
 * Logs incoming requests and outgoing responses with timing information
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Extract or generate request ID
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.requestId = requestId;

  // Create child logger with requestId context
  req.logger = createChildLogger({ requestId });

  // Capture start time for duration calculation
  const startTime = Date.now();

  // Log incoming request
  req.logger.info({
    msg: 'Incoming request',
    method: req.method,
    path: req.path,
    query: req.query,
  });

  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    const duration = Date.now() - startTime;
    
    req.logger.info({
      msg: 'Outgoing response',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
    
    return originalJson(body);
  };

  // Handle response end for non-JSON responses
  res.on('finish', () => {
    // Only log if json() wasn't called (check if headers NOT sent or content-type does NOT include json)
    if (res.headersSent && !res.getHeader('content-type')?.toString().includes('json')) {
      const duration = Date.now() - startTime;
      req.logger.info({
        msg: 'Outgoing response',
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      });
    }
  });

  next();
};
