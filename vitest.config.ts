import { defineConfig } from "vitest/config";

export default defineConfig({
  ssr: {
    resolve: {
      conditions: ["react-server", "node", "import", "default"],
    },
  },
  test: {
    environment: "node",
    include: [
      "modules/*/src/**/*.{test,spec}.ts",
      "packages/*/src/**/*.{test,spec}.ts",
      "sdk/src/**/*.{test,spec}.ts",
    ],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    restoreMocks: true,
  },
});
