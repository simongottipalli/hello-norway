import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      exclude: [
        "**/__tests__/**",
        "**/node_modules/**",
        "**/e2e/**",
        "**/*.config.*",
        "**/dist/**",
        "**/.next/**",
        // Frontend-only code: Next.js pages, layouts, and React components
        "src/app/**",
        "src/components/**",
        // Database seed and migration scripts
        "prisma/**",
        // Test-only email provider
        "src/services/email/providers/testProvider.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
