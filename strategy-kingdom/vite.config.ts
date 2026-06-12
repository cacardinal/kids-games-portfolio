import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 5186, strictPort: true, host: true }, // 5186 per PLAN.md — binding
});
