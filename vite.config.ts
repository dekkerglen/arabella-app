import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";

// Every file in client/src/pages is its own entry; the server renders one by name.
const pagesDir = path.resolve(import.meta.dirname, "client/src/pages");
const input = Object.fromEntries(
  fs.readdirSync(pagesDir).map((file) => [path.parse(file).name, path.join(pagesDir, file)]),
);

export default defineConfig({
  root: "client",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // Pages are served by the Express server, so asset URLs must point back here.
    origin: "http://localhost:5173",
  },
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
    manifest: true,
    rolldownOptions: { input },
  },
});
