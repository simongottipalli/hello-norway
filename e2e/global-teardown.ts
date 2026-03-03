import path from "path";
import { execSync } from "child_process";
import { TEST_USER_EMAIL } from "./global-setup";

export default async function globalTeardown() {
  // Run Prisma operations in a tsx subprocess (see global-setup.ts).
  const helperScript = path.join(__dirname, "helpers", "db-teardown.ts");
  try {
    execSync(`npx tsx "${helperScript}" "${TEST_USER_EMAIL}"`, {
      encoding: "utf-8",
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`E2E global-teardown: db-teardown helper failed: ${msg}`);
  }
}
