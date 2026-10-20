# Pendientes

## Bloqueantes para publicar

- [x] Número de WhatsApp inicial: **313 476 9855** (`573134769855`).
- [x] Cliente confirmó que, por ahora, 313 476 9855 sigue siendo el número de entrega.
- [ ] Confirmar precio y regla de venta de cada referencia.
- [ ] Confirmar tallas y disponibilidad reales.
- [ ] Confirmar si alguna referencia tiene varios colores disponibles; hoy cada una tiene un solo color.
- [x] Derechos de uso de las fotos confirmados por el cliente.
- [ ] Dominio y hosting definitivos.
- [x] Demo publicada en https://demos.emp2web.com/p1000/ (GitHub Pages).

## Contenido

- [x] Descargar las tres carpetas de Drive: 308 fotos (Puma 106, BMW 86, Ferrari 116).
- [x] Agrupar en 11 referencias y elegir foto principal de cada una.
- [x] Armar galería de 4 fotos por referencia.
- [x] Aplicar manual de marca: logo, colores, tipografías y eslogan.
- [x] Crear una página de detalle por referencia con colores relacionados.
- [x] Carrito lateral con talla y color por par, y envío del pedido por WhatsApp.
- [x] Renombrar lociones a perfumería.
- [ ] Confirmar nombres oficiales de las 11 referencias.
- [ ] Completar descripción y stock de cada producto.
- [ ] Cargar fotos de perfumería, ropa infantil y juguetería.
- [ ] Activar los otros catálogos en `src/datos/categorias.json` (`"activo": true`) cuando existan sus productos y fotos. `activo` solo los muestra normales; no crea contenido.
- [x] El pedido ya ofrece coordinar por WhatsApp, envío a domicilio o recogida; las condiciones se acuerdan en la conversación.
- [x] Páginas legales creadas (`/privacidad` y `/tratamiento-de-datos`).
- [ ] Revisar los textos legales con un abogado antes de publicar en el dominio definitivo.

## Carrito y pedidos

- [x] En calzado, pedir la **talla** al agregar un par (obligatoria).
- [x] Si se piden varios pares, capturar **talla y color por cada par** en el carrito y en el mensaje de WhatsApp.
- [x] El color se elige de una lista, no se escribe a mano. Si una referencia tiene varios colores, se agregan a `colores` y aparecen en el select.
- [x] Elegir forma de entrega en el pedido: coordinar, domicilio o recogida.
- [ ] Confirmar precio, tallas y disponibilidad reales para que el pedido deje de decir "por confirmar".

## Ofertas, destacados y control

- [x] Descuento calculado desde `precio` y `precio_antes`, con badge, precio anterior y ahorro.
- [x] Sección de destacados en la portada y página `/ofertas`.
- [x] Promoción flash con vigencia, condiciones y carrusel.
- [x] Excel de control `Control-P1000.xlsx` y script `tools/control_catalogo.py`.
- [ ] Cargar precios y precios anteriores reales; sin ellos no hay descuentos ni promociones visibles.
- [ ] Marcar destacados reales y confirmar qué promociones existen.
- [ ] Definir con el cliente si la promoción flash aplica solo en la web o también en el local.

## Técnico (el cliente pidió dejarlo para después)

- [ ] Cambiar `site` en `astro.config.mjs` por el dominio real.
- [ ] Elegir hosting y crear el repositorio del sitio con su remoto.
- [ ] Escribir `AGENTS.md` y `TUTORIAL.md` del sitio antes de entregar.
