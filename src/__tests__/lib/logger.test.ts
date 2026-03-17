import { describe, it, expect } from 'vitest';
import { createChildLogger } from '../../lib/logger';

describe('Logger', () => {
  describe('createChildLogger', () => {
    it('should sanitize email in bindings — masking local part', () => {
      const childLogger = createChildLogger({
        email: 'test@example.com',
        requestId: 'test-123',
      });
      const bindings = childLogger.bindings();
      expect(bindings.email).toBe('t***@example.com');
    });

    it('should redact OTP in bindings', () => {
      const childLogger = createChildLogger({
        otp: '123456',
        requestId: 'test-123',
      });
      const bindings = childLogger.bindings();
      expect(bindings.otp).toBe('[REDACTED]');
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
  });
});
