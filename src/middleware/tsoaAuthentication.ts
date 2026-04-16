import { Request } from "express";

export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[]
): Promise<any> {
  // Placeholder - will be implemented in Phase 5
  throw new Error("Authentication not yet implemented");
}
