/**
 * Importa las fotos de una carpeta al catálogo.
 *
 * Uso:
 *   node tools/importar-fotos.mjs calzado insumos/fotos/calzado
 *
 * Qué hace:
 *   1. Recorre la carpeta (y sus subcarpetas) buscando imágenes.
 *   2. Recorta al cuadrado, reduce a 1200 px y guarda WebP en public/img/productos/.
 *   3. Agrega o actualiza la entrada en src/datos/productos.json.
 *
 * No borra productos que ya existan. Si el slug ya está, solo cambia la foto.
 * El título sale del nombre del archivo; se puede corregir después en el JSON.
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [categoria, carpeta] = process.argv.slice(2);

if (!categoria || !carpeta) {
  console.error("Uso: node tools/importar-fotos.mjs <categoria> <carpeta-de-fotos>");
  process.exit(1);
}

if (!existsSync(carpeta)) {
  console.error(`No existe la carpeta: ${carpeta}`);
  process.exit(1);
}

const raiz = path.resolve(import.meta.dirname, "..");
const rutaProductos = path.join(raiz, "src/datos/productos.json");
const rutaSalida = path.join(raiz, "public/img/productos");
const extensiones = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

const productos = JSON.parse(await readFile(rutaProductos, "utf8"));

function limpiar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function tituloDesdeArchivo(archivo) {
  const base = path.basename(archivo, path.extname(archivo)).replace(/[-_]+/g, " ").trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

async function listarImagenes(dir) {
  const entradas = await readdir(dir, { withFileTypes: true, recursive: true });
  return entradas
    .filter((e) => e.isFile() && extensiones.has(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(e.parentPath ?? e.path, e.name));
}

const archivos = await listarImagenes(carpeta);
if (archivos.length === 0) {
  console.error(`No hay imágenes en ${carpeta}`);
  process.exit(1);
}

await mkdir(rutaSalida, { recursive: true });

let nuevas = 0;
let actualizadas = 0;

for (const archivo of archivos) {
  const slug = limpiar(path.relative(carpeta, archivo)) || limpiar(path.basename(archivo));
  const destino = path.join(rutaSalida, `${slug}.webp`);

  await sharp(archivo)
    .rotate()
    .resize(1200, 1200, { fit: "cover", position: "centre" })
    .webp({ quality: 82 })
    .toFile(destino);

  const rutaWeb = `/img/productos/${slug}.webp`;
  const existente = productos.find((p) => p.slug === slug);

  if (existente) {
    existente.imagenes = [rutaWeb, ...(existente.imagenes || []).filter((i) => i !== rutaWeb)];
    existente.origen = { ...(existente.origen || {}), imagen: "revisado" };
    actualizadas++;
  } else {
    productos.push({
      slug,
      titulo: tituloDesdeArchivo(archivo),
      precio: 1000,
      precio_antes: null,
      categoria,
      tallas: [],
      stock: true,
      destacado: false,
      imagenes: [rutaWeb],
      descripcion: "",
      origen: { titulo: "inferido", tallas: "pendiente", imagen: "revisado" },
    });
    nuevas++;
  }
}

await writeFile(rutaProductos, JSON.stringify(productos, null, 2) + "\n", "utf8");

console.log(`Fotos procesadas: ${archivos.length}`);
console.log(`Productos nuevos: ${nuevas}`);
console.log(`Productos actualizados: ${actualizadas}`);
console.log("Revisa títulos, tallas y precios en src/datos/productos.json");
