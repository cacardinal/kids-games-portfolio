/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 5185, strictPort: true, host: true }, // 5185 per PLAN.md — binding
  test: {
    environment: "node", // headless matter-js physics suites run in plain Node
    include: ["src/**/*.test.ts"],
  },
});
