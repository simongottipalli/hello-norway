import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorLogger } from '../../middleware/errorLogger';

describe('errorLogger middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  const testError = new Error('Something went wrong');

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      path: '/api/tasks',
      query: {},
      body: { slug: 'test' },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  it('should return 500 with internal server error message', () => {
    errorLogger(
      testError,
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  it('should log the error when req.logger is attached', () => {
    const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
    (mockReq as Request).logger = mockLogger as unknown as Request['logger'];

    errorLogger(
      testError,
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'Unhandled error',
        error: expect.objectContaining({
          message: testError.message,
          name: testError.name,
        }),
        method: mockReq.method,
        path: mockReq.path,
      })
    );
  });

  it('should not throw when req.logger is not attached', () => {
    // req.logger is undefined (no logger attached)
    expect(() => {
      errorLogger(
        testError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
    }).not.toThrow();

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  it('should include error stack in the log when logger is present', () => {
    const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
    (mockReq as Request).logger = mockLogger as unknown as Request['logger'];

    errorLogger(
      testError,
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    const logCall = mockLogger.error.mock.calls[0][0];
    expect(logCall.error.stack).toBe(testError.stack);
  });
});
