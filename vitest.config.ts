import { defineConfig } from "vitest/config";

export default defineConfig({
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
      ],
    },
  },
});
