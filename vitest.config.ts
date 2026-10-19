import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { include: ["lib/**/*.test.ts"], environment: "node" },
  // O tsconfig usa jsx "preserve" (é o Next quem transforma); nos testes, o esbuild.
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
