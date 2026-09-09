import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // اختبارات التكامل تلمس قاعدة البيانات، فتُشغَّل بالتسلسل
    fileParallelism: false,
    setupFiles: ["tests/setup.ts"],
  },
});
