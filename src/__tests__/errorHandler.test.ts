import { describe, it, expect, vi } from 'vitest';
import { handleDatabaseError } from '../repo/errors';

describe('handleDatabaseError', () => {
  it('should return null for non-object errors', () => {
    expect(handleDatabaseError(null)).toBeNull();
    expect(handleDatabaseError(undefined)).toBeNull();
    expect(handleDatabaseError('string error')).toBeNull();
    expect(handleDatabaseError(42)).toBeNull();
  });

  it('should return null for objects without a code property', () => {
    expect(handleDatabaseError({ message: 'some error' })).toBeNull();
    expect(handleDatabaseError({})).toBeNull();
  });

  it('should return 400 for P2002 (unique constraint violation)', () => {
    const result = handleDatabaseError({ code: 'P2002' });
    expect(result).toEqual({ status: 400, message: 'Task with this slug already exists' });
  });

  it('should return 404 for P2025 (record not found)', () => {
    const result = handleDatabaseError({ code: 'P2025' });
    expect(result).toEqual({ status: 404, message: 'Task not found' });
  });

  it('should return 400 for P2003 (foreign key constraint violation)', () => {
    const result = handleDatabaseError({ code: 'P2003' });
    expect(result).toEqual({ status: 400, message: 'Cannot delete task with existing user tasks' });
  });

  it('should return null for unknown Prisma error codes', () => {
    expect(handleDatabaseError({ code: 'P9999' })).toBeNull();
    expect(handleDatabaseError({ code: 'UNKNOWN' })).toBeNull();
  });

  it('should call logger.error when a known error code is matched and logger is provided', () => {
    const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };

    handleDatabaseError({ code: 'P2002' }, mockLogger as never);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'Prisma error',
        code: 'P2002',
        status: 400,
      })
    );
  });

  it('should not call logger when error code is unknown (result is null)', () => {
    const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };

    handleDatabaseError({ code: 'P9999' }, mockLogger as never);

    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should not throw when logger is not provided', () => {
    expect(() => handleDatabaseError({ code: 'P2002' })).not.toThrow();
  });
});
