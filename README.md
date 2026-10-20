# P1000

Sitio de catálogo para la temporada navideña, con pedidos por WhatsApp.

**Demo:** https://demos.emp2web.com/p1000/

P1000 es el nombre de la tienda y su eslogan es **«Tu tienda, mil posibilidades»**.
La identidad sale del manual de marca y de los vectores del logo entregados por el
cliente (azul `#032F53`, turquesa `#01ADB1`, amarillo `#FBB73E`; Montserrat + Inter).

- `/` — portada con los cuatro catálogos
- `/calzado` — catálogo de calzado nacional (11 referencias)
- `/calzado/[slug]` — ficha de cada referencia, con galería y colores de la misma línea
- `/perfumeria` — perfumería árabe (próximamente)
- `/ropa-ninos` — ropa infantil (próximamente)
- `/jugueteria` — juguetería (próximamente)

Los productos sin precio definido muestran **«Precio por confirmar»**, nunca un valor
inventado.

## Pedido por WhatsApp

El carrito (panel lateral, contador en la cabecera) guarda las referencias en el
navegador y las envía al WhatsApp **313 476 9855** con nombre, teléfono, ciudad,
dirección y nota. No calcula totales porque los precios aún no están definidos: P1000
confirma precio, tallas, disponibilidad y envío en el chat.

Se puede cambiar el número en `src/datos/sitio.json` (`whatsapp`); el carrito lo toma
del atributo `data-whatsapp` del panel, en `src/layouts/Layout.astro`.

## Desarrollo

```bash
npm install
npm run dev       # vista previa en http://localhost:4321
npm run build     # compilado en dist/
```

## Dónde se cambia cada cosa

| Qué | Archivo |
|---|---|
| Logo, isotipo y favicon | `public/brand/` |
| Colores y tipografías | `src/styles/global.css` (bloque `:root`) |
| WhatsApp y datos del negocio | `src/datos/sitio.json` |
| Textos de la portada | `src/datos/inicio.json` |
| Nombres y rutas de los catálogos | `src/datos/categorias.json` |
| Productos, precios y galerías | `src/datos/productos.json` |

Cada producto acepta `precio: null` (muestra «Precio por confirmar»), `tallas: []`
(muestra «Por confirmar»), `marca`, `color` e `imagenes` (la primera es la principal).

## Fotos del calzado

Las 308 fotos originales de Drive están en `insumos/fotos/calzado/<marca>/` y no se
versionan. Las 11 referencias y sus galerías están documentadas en
`docs/referencias-calzado.md`.

Las imágenes publicadas se generan a cuadrado con fondo desenfocado para no recortar el
producto y quedan en `public/img/productos/`. Si se reemplaza una foto, hay que regenerar
su WebP con el mismo nombre.

## Cambiar el logo

Los archivos ya están en `public/brand/`. Para reemplazarlos, conservar los nombres
(`logo.svg`, `logo-blanco.svg`, `favicon.png`, `isotipo.svg`) o actualizar las
referencias en `src/layouts/Layout.astro`.

## Publicar

Falta decidir hosting con el cliente: Cloudflare Pages, Netlify o GitHub Pages. El build
corre en la nube; no hay que compilar a mano para publicar.
