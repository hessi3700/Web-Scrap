import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// For GitHub Pages project site: https://<user>.github.io/Web-Scrap/
// For user site use base: "/"
const base = process.env.GITHUB_PAGES === "1" ? "/Web-Scrap/" : "/";

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
