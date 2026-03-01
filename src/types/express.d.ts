import type { Logger } from '../lib/logger';

declare global {
  namespace Express {
    interface Request {
      logger: Logger;
      requestId?: string;
    }
  }
}
