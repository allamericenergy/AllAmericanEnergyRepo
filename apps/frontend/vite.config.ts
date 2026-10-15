import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@intiligrid": path.resolve(__dirname, "src/vendor/IntiliGrid")
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
