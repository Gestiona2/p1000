/**
 * El pedido: qué referencias lleva, cuántas unidades y cómo se convierte
 * en un mensaje de WhatsApp.
 *
 * No hay sumas ni precios: el catálogo todavía no tiene valores definidos.
 * El carrito sirve para armar la solicitud y que P1000 confirme precio,
 * tallas y envío por WhatsApp.
 */

export function crearPedido({ alCambiar = () => {} } = {}) {
  let lineas = [];

  const avisar = () => alCambiar(api);

  const api = {
    lineas: () => lineas.map((l) => ({ ...l })),

    unidades: () => lineas.reduce((suma, l) => suma + l.cantidad, 0),

    agregar(producto, cantidad = 1) {
      const existente = lineas.find((l) => l.slug === producto.slug);
      if (existente) {
        existente.cantidad += cantidad;
      } else {
        lineas.push({
          slug: producto.slug,
          titulo: producto.titulo,
          color: producto.color || "",
          imagen: producto.imagen || "",
          cantidad,
        });
      }
      avisar();
      return api;
    },

    cambiarCantidad(slug, cantidad) {
      const linea = lineas.find((l) => l.slug === slug);
      if (!linea) return api;
      if (cantidad <= 0) {
        lineas = lineas.filter((l) => l.slug !== slug);
      } else {
        linea.cantidad = cantidad;
      }
      avisar();
      return api;
    },

    quitar: (slug) => api.cambiarCantidad(slug, 0),

    vaciar() {
      lineas = [];
      avisar();
      return api;
    },

    exportar: () => lineas.map((l) => ({ ...l })),

    importar(guardadas) {
      if (Array.isArray(guardadas)) {
        lineas = guardadas.filter(
          (l) => l && l.slug && l.titulo && l.cantidad > 0
        );
        avisar();
      }
      return api;
    },
  };

  return api;
}

export function armarMensaje(pedido, datos) {
  const lineas = pedido.lineas();
  if (lineas.length === 0) throw new Error("El pedido está vacío");

  const partes = ["*Nuevo pedido — P1000*", ""];

  for (const linea of lineas) {
    const color = linea.color ? ` (${linea.color})` : "";
    partes.push(`• ${linea.titulo}${color}`);
    partes.push(`   x${linea.cantidad}`);
  }

  partes.push("");
  partes.push("*Datos de contacto*");
  partes.push(`Nombre: ${datos.nombre}`);
  partes.push(`Teléfono: ${datos.telefono}`);
  if (datos.ciudad) partes.push(`Ciudad: ${datos.ciudad}`);
  if (datos.direccion) partes.push(`Dirección: ${datos.direccion}`);
  if (datos.nota) partes.push(`Nota: ${datos.nota}`);
  partes.push("");
  partes.push("Quedo pendiente de precio, tallas y envío. ¡Gracias!");

  return partes.join("\n");
}

export function numeroWhatsApp(numero) {
  const digitos = String(numero || "").replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.startsWith("57")) return digitos;
  return `57${digitos}`;
}

export function enlaceWhatsApp(numero, mensaje) {
  return `https://wa.me/${numeroWhatsApp(numero)}?text=${encodeURIComponent(mensaje)}`;
}
