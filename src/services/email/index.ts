import { createEmailServiceFromEnv } from './emailService';

let emailServiceInstance: ReturnType<typeof createEmailServiceFromEnv> | null = null;

export function getEmailService() {
  if (!emailServiceInstance) {
    emailServiceInstance = createEmailServiceFromEnv();
  }
  return emailServiceInstance;
}

export const emailService = getEmailService();

export type { EmailOptions, EmailResult } from './types';
export { EmailService, createEmailService, createEmailServiceFromEnv } from './emailService';
