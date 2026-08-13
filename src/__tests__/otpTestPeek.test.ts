import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import otpRoutes from '../routes/otpRoutes';
import * as otpRepo from '../repo/otpRepo';

vi.mock('../repo/otpRepo', () => ({
  findLatestValidOtp: vi.fn(),
}));

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(otpRoutes);
  return app;
};

describe('GET /otp/test-peek (test-only endpoint)', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  it('should return 400 when email query param is missing', async () => {
    const response = await request(app).get('/otp/test-peek');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'email query param required' });
  });

  it('should return 400 when email query param is empty', async () => {
    const response = await request(app).get('/otp/test-peek?email=');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'email query param required' });
  });

  it('should return 400 when email query param is whitespace only', async () => {
    const response = await request(app).get('/otp/test-peek?email=%20%20');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'email query param required' });
  });

  it('should return 404 when no valid OTP exists for the email', async () => {
    vi.mocked(otpRepo.findLatestValidOtp).mockResolvedValueOnce(null);

    const response = await request(app).get(
      '/otp/test-peek?email=user@example.com'
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'No valid OTP found' });
  });

  it('should return 200 with OTP code when a valid OTP exists', async () => {
    vi.mocked(otpRepo.findLatestValidOtp).mockResolvedValueOnce({
      id: 'otp-1',
      code: 123456,
      email: 'user@example.com',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    });

    const response = await request(app).get(
      '/otp/test-peek?email=user@example.com'
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ code: 123456 });
  });

  it('should normalize email to lowercase before querying', async () => {
    vi.mocked(otpRepo.findLatestValidOtp).mockResolvedValueOnce(null);

    await request(app).get('/otp/test-peek?email=User@EXAMPLE.COM');

    expect(otpRepo.findLatestValidOtp).toHaveBeenCalledWith('user@example.com', 'USER');
  });
});
