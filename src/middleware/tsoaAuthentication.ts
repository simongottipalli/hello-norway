import { Request } from "express";

/**
 * tsoa authentication handler
 * This is called by tsoa when a route has @Security decorator
 *
 * Will be fully implemented in Phase 5
 */
export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[]
): Promise<any> {
  // Placeholder - will be implemented in Phase 5
  throw new Error("Authentication not yet implemented");
}
