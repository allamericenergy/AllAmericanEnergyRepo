import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
     "@intiligrid": fileURLToPath(
        new URL("./src/vendor/IntiliGrid", import.meta.url)
      ),
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
