import { describe, it, expect } from 'vitest';
import { logger, createChildLogger } from '../../lib/logger';

describe('Logger', () => {
  describe('createChildLogger', () => {
    it('should create a child logger with context', () => {
      const childLogger = createChildLogger({ requestId: 'test-123' });
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
      expect(typeof childLogger.error).toBe('function');
    });

    it('should sanitize email in bindings — masking local part', () => {
      const childLogger = createChildLogger({
        email: 'test@example.com',
        requestId: 'test-123',
      });
      const bindings = childLogger.bindings();
      expect(bindings.email).toBe('t***@example.com');
      expect(bindings.email).not.toBe('test@example.com');
    });

    it('should redact OTP in bindings', () => {
      const childLogger = createChildLogger({
        otp: '123456',
        requestId: 'test-123',
      });
      const bindings = childLogger.bindings();
      expect(bindings.otp).toBe('[REDACTED]');
      expect(bindings.otp).not.toBe('123456');
    });

    it('should sanitize sensitive fields inside nested objects', () => {
      const childLogger = createChildLogger({
        user: {
          email: 'test@example.com',
          otp: '123456',
        },
        requestId: 'test-123',
      });
      const bindings = childLogger.bindings();
      const user = bindings.user as Record<string, unknown>;
      expect(user.email).toBe('t***@example.com');
      expect(user.otp).toBe('[REDACTED]');
    });

    it('should have child method', () => {
      expect(typeof logger.child).toBe('function');
    });
  });
});
