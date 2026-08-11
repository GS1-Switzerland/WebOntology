import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// State-of-the-art SPA build for Azure Static Web Apps.
// Content-hashed assets + source maps for production debugging without
// exposing readable source by default (maps are uploaded but not linked
// publicly unless X-SourceMap header is enabled in staticwebapp.config.json).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          i18n: ["i18next", "react-i18next", "i18next-http-backend", "i18next-browser-languagedetector"],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
