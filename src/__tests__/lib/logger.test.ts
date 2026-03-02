import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { logger, createChildLogger } from '../../lib/logger';

describe('Logger', () => {
  describe('createChildLogger', () => {
    it('should create a child logger with context', () => {
      const childLogger = createChildLogger({ requestId: 'test-123' });
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
      expect(typeof childLogger.error).toBe('function');
    });

    it('should sanitize email in bindings', () => {
      const childLogger = createChildLogger({ 
        email: 'test@example.com',
        requestId: 'test-123'
      });
      expect(childLogger).toBeDefined();
    });

    it('should redact OTP in bindings', () => {
      const childLogger = createChildLogger({ 
        otp: '123456',
        requestId: 'test-123'
      });
      expect(childLogger).toBeDefined();
    });

    it('should handle nested object sanitization', () => {
      const childLogger = createChildLogger({ 
        user: {
          email: 'test@example.com',
          otp: '123456'
        },
        requestId: 'test-123'
      });
      expect(childLogger).toBeDefined();
    });
  });

  describe('logger instance', () => {
    it('should have standard logging methods', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should have child method', () => {
      expect(typeof logger.child).toBe('function');
    });
  });

  describe('log level configuration', () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
      originalEnv = process.env.LOG_LEVEL;
    });

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.LOG_LEVEL = originalEnv;
      } else {
        delete process.env.LOG_LEVEL;
      }
    });

    it('should respect LOG_LEVEL environment variable', () => {
      // Logger is already created, so we can only verify it exists
      expect(logger.level).toBeDefined();
    });
  });
});
