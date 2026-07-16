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
      include: [
        "src/domain/**/*.ts",
        "src/application/communications/{announcement-delivery-service,league-announcements}.ts",
        "src/application/events/event-archive.ts",
        "src/application/leagues/create-league.ts",
        "src/infrastructure/db/backup-service.ts",
        "src/infrastructure/db/repositories/{dashboard-queries,event-repository,game-system-queries,league-repository,table-repository}.ts",
        "src/lib/{api-client,desktop-request-security,discord-webhook,id}.ts",
        "electron/runtime.cjs",
      ],
      thresholds: { statements: 45, branches: 30, functions: 50, lines: 45 },
    },
  },
});
