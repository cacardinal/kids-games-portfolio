import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./", // relative asset paths — the build runs from any mount point
  // Pre-bundle the lazy 3D chunk's deps so dev never 504s on first board load.
  optimizeDeps: { include: ["three", "@react-three/fiber", "@react-three/drei"] },
  server: { port: 5186, strictPort: true, host: true }, // 5186 per PLAN.md — binding
});
