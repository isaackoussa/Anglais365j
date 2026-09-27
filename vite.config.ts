import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" : l'app fonctionne depuis n'importe quel sous-dossier (GitHub Pages, Netlify…)
export default defineConfig({
  base: "./",
  plugins: [react()],
});
