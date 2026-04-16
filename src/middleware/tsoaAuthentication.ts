import { Request } from "express";

export async function expressAuthentication(
  _request: Request,
  _securityName: string,
  _scopes?: string[]
): Promise<unknown> {
  // Placeholder - will be implemented in Phase 5
  throw new Error("Authentication not yet implemented");
}
