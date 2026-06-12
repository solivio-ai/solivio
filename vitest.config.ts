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
      "modules/*/src/**/*.{test,spec}.{ts,tsx}",
      "packages/*/src/**/*.{test,spec}.{ts,tsx}",
      "sdk/src/**/*.{test,spec}.{ts,tsx}",
      "scripts/generate/__tests__/**/*.{test,spec}.{ts,mts}",
    ],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    restoreMocks: true,
  },
});
