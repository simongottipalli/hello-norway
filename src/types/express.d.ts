import type { Logger } from '../lib/logger';

declare global {
  namespace Express {
    interface Request {
      logger: Logger;
      requestId?: string;
      user?: {
        id: string;
        email: string;
        name: string;
      };
      session?: {
        id: string;
        token: string;
        expiresAt: Date;
      };
    }
  }
}
