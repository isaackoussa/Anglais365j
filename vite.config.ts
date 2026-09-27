import netlify from "@netlify/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// base "./" : l'app fonctionne depuis n'importe quel sous-dossier (GitHub Pages, Netlify…)
// Le plugin Netlify émule les fonctions serveur et Netlify Blobs pendant « npm run dev ».
export default defineConfig(({ mode }) => {
  // Les variables du fichier .env (BREVO_API_KEY, MAIL_DRY_RUN…) sont transmises aux fonctions en local
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""), { ...process.env });
  return {
    base: "./",
    plugins: [react(), netlify()],
  };
});
