import pino from 'pino';

/**
 * Sanitize sensitive data in logs
 * - Email: Partially mask (show first char + domain)
 * - OTP: Completely redact
 */
const sanitize = (obj: Record<string, unknown>): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'email' && typeof value === 'string') {
      // Mask email: u***@example.com
      const [local, domain] = value.split('@');
      sanitized[key] = local ? `${local[0]}***@${domain || ''}` : value;
    } else if (key === 'otp' || key === 'code' || key === 'password') {
      // Completely redact sensitive fields
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitize(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Create Pino logger with environment-based configuration
 */
const createLogger = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

  const baseConfig: pino.LoggerOptions = {
    level: logLevel,
    // Sanitize sensitive fields in logs
    redact: {
      paths: ['email', 'otp', 'code', 'password', '*.email', '*.otp', '*.code', '*.password'],
      censor: (value: unknown, path: string[]) => {
        const key = path[path.length - 1];
        if (key === 'email' && typeof value === 'string') {
          const [local, domain] = value.split('@');
          return local ? `${local[0]}***@${domain || ''}` : value;
        }
        return '[REDACTED]';
      },
    },
    // Add timestamp
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  // Development: Pretty print for readability
  if (isDevelopment) {
    return pino({
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      },
    });
  }

  // Production: JSON logs for log aggregation tools
  return pino(baseConfig);
};

/**
 * Global logger instance
 */
export const logger = createLogger();

/**
 * Create a child logger with additional context
 * @param bindings - Context to attach to all logs from this logger
 */
export const createChildLogger = (bindings: Record<string, unknown>) => {
  return logger.child(sanitize(bindings));
};

/**
 * Logger type for TypeScript
 */
export type Logger = pino.Logger;
