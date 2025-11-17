import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all /api requests to the backend API gateway (adjust port if needed)
      "/api": {
        target: "http://localhost:8081",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
