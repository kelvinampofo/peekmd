import { availableParallelism } from "node:os";

import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  test: {
    globals: true,
    maxWorkers: Math.min(6, availableParallelism()),
    restoreMocks: true,
    tags: [{ name: "integration", description: "interactions between components" }],
    projects: [
      {
        test: {
          name: "node",
          include: ["src/**/*.test.ts"],
          environment: "node",
          pool: "threads",
        },
      },
      {
        test: {
          name: "browser",
          include: ["src/**/*.test.tsx"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }, { browser: "webkit" }],
          },
        },
      },
    ],
  },
});
