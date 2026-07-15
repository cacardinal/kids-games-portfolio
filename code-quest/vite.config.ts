/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5187, strictPort: true, host: true }, // binding per PLAN.md
  // Pre-bundle the lazy-loaded 3D stack so its first on-demand import doesn't
  // trigger a mid-session dev re-optimization (504 Outdated Optimize Dep).
  optimizeDeps: { include: ["three", "@react-three/fiber", "@react-three/drei"] },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
