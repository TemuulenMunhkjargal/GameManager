import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/domain/**/*.ts", "src/infrastructure/db/repositories/table-repository.ts", "src/infrastructure/db/backup-service.ts", "src/lib/discord-webhook.ts"],
      thresholds: { statements: 45, branches: 30, functions: 50, lines: 45 },
    },
  },
});
