# P1000

Sitio de catálogo para la temporada navideña, con pedidos por WhatsApp.

**Demo:** https://demos.emp2web.com/p1000/

P1000 es el nombre de la tienda y su eslogan es **«Tu tienda, mil posibilidades»**.
La identidad sale del manual de marca y de los vectores del logo entregados por el
cliente (azul `#032F53`, turquesa `#01ADB1`, amarillo `#FBB73E`; Montserrat + Inter).

- `/` — portada con los cuatro catálogos
- `/calzado` — catálogo de calzado nacional (11 referencias)
- `/calzado/[slug]` — ficha de cada referencia, con galería y colores de la misma línea
- `/ofertas` — referencias con descuento vigente
- `/privacidad` y `/tratamiento-de-datos` — textos legales
- `/perfumeria` — perfumería árabe (próximamente)
- `/ropa-ninos` — ropa infantil (próximamente)
- `/jugueteria` — juguetería (próximamente)

Los productos sin precio definido muestran **«Precio por confirmar»**, nunca un valor
inventado.

## Pedido por WhatsApp

El carrito (panel lateral, contador en la cabecera) guarda el pedido en el navegador.
Cada par se agrega con **talla y color obligatorios**; si se piden varios pares de la
misma referencia, se agregan uno por uno y el mensaje los enumera. También se elige la
forma de entrega (coordinar, domicilio o recogida), con dirección y nota opcionales.

El pedido se envía al WhatsApp **313 476 9855**. No calcula totales porque los precios
aún no están definidos: P1000 confirma precio, tallas, disponibilidad y entrega en el
chat. La clave de almacenamiento es `p1000-pedido-v2`.

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

### Descuentos, destacados y promoción flash

- El descuento **no se escribe**: se calcula si `precio_antes > precio > 0`.
- `destacado: true` prioriza la referencia en la portada.
- `promo_flash: true` la muestra en la ventana de promoción, solo si tiene precio,
  stock y no está vencida (`promo_flash_vence`, ISO con `-05:00`).
- `promo_flash_donde` es el texto de condiciones que ve el cliente.

## Excel de control

`Control-P1000.xlsx` es la planilla para el dueño. Se genera desde el catálogo:

```bash
python3 tools/control_catalogo.py generar
python3 tools/control_catalogo.py revisar Control-P1000.xlsx
python3 tools/control_catalogo.py aplicar Control-P1000.xlsx
```

`revisar` no escribe nada: señala fila por fila qué está mal y cómo corregirlo.
`aplicar` solo escribe si no hay errores, actualiza `productos.json` y
`categorias.json`, y vuelve a generar la planilla. El descuento se recalcula siempre;
la columna de Excel es solo informativa. No se agregan ni borran filas desde Excel.

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

La demo se publica en GitHub Pages desde `.github/workflows/deploy.yml` con
`SITE_URL=https://demos.emp2web.com` y `SITE_BASE=/p1000`. El dominio y el hosting
definitivos siguen pendientes de decisión con el cliente.
