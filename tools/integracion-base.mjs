/**
 * Publicación en subcarpeta (demo en demos.emp2web.com/p1000).
 *
 * Los .astro y los JSON usan rutas absolutas ("/calzado", "/img/x.webp").
 * Con una carpeta base esas rutas se rompen. Esta integración, SOLO al
 * compilar y SOLO si base != "/", antepone la base en los atributos
 * href, src, srcset, action, content, poster y data-src del HTML generado.
 * Con el dominio propio del cliente (base "/") no hace nada.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function htmls(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? htmls(p) : p.endsWith(".html") ? [p] : [];
  });
}

export default function base(carpeta) {
  const prefijo = carpeta.replace(/\/$/, "");
  return {
    name: "p1000-base",
    hooks: {
      "astro:build:done": ({ dir }) => {
        if (!prefijo) return;
        const raiz = fileURLToPath(dir);
        const re = new RegExp(
          `(\\b(?:href|src|action|content|poster|data-src)=")\\/(?!\\/|${prefijo.slice(1)}\\/)`,
          "g"
        );
        for (const f of htmls(raiz)) {
          let t = fs.readFileSync(f, "utf8");
          t = t.replace(re, `$1${prefijo}/`);
          fs.writeFileSync(f, t);
        }
      },
    },
  };
}
