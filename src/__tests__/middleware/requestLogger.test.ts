import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requestLogger } from '../../middleware/requestLogger';

describe('requestLogger middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/test',
      query: {},
      headers: {},
    };

    mockRes = {
      json: vi.fn().mockReturnThis(),
      on: vi.fn(),
      headersSent: false,
      getHeader: vi.fn(),
      statusCode: 200,
    };

    mockNext = vi.fn();
  });

  it('should generate requestId if not provided', () => {
    requestLogger(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.requestId).toBeDefined();
    expect(typeof mockReq.requestId).toBe('string');
    expect(mockReq.requestId?.length).toBeGreaterThan(0);
  });

  it('should use existing X-Request-ID header', () => {
    const existingId = 'test-request-id-123';
    mockReq.headers = { 'x-request-id': existingId };

    requestLogger(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.requestId).toBe(existingId);
  });

  it('should attach logger to request', () => {
    requestLogger(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.logger).toBeDefined();
    expect(typeof mockReq.logger?.info).toBe('function');
    expect(typeof mockReq.logger?.error).toBe('function');
  });

  it('should call next middleware', () => {
    requestLogger(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should attach finish event listener', () => {
    requestLogger(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });
});
