import { defineConfig } from "astro/config";
import base from "./tools/integracion-base.mjs";

// Por defecto: dominio propio del cliente, en la raíz.
// Demo en subcarpeta: SITE_URL=https://demos.emp2web.com SITE_BASE=/p1000 npm run build
// (lo hace el workflow de GitHub Pages; ver .github/workflows/deploy.yml).
const carpeta = process.env.SITE_BASE ?? "";

export default defineConfig({
  site: process.env.SITE_URL ?? "https://p1000.example.com",
  base: carpeta || "/",
  integrations: [base(carpeta)],
});
