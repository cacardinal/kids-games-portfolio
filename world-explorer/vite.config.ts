/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// World Explorer — port 5184 is binding (PLAN.md table). strictPort makes a busy
// port fail loudly instead of silently hopping to another one.
export default defineConfig({
  // Relative base so the built app works from any subpath deploy.
  base: "./",
  plugins: [react()],
  server: { port: 5184, strictPort: true, host: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
