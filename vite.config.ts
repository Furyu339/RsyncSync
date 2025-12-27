import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  root: "renderer",
  base: "./",
  build: {
    outDir: "../dist/renderer",
    emptyOutDir: true
  }
});
