/**
 * El pedido: referencias, pares con su talla y color, entrega y mensaje
 * de WhatsApp.
 *
 * Cada par es independiente: si alguien pide dos pares del mismo producto
 * con tallas distintas, quedan dos líneas de par dentro de la referencia.
 * No hay sumas ni precios: P1000 confirma valor y disponibilidad en el chat.
 */

export const ENTREGAS = {
  coordinar: "Coordinar por WhatsApp",
  domicilio: "Envío a domicilio",
  recoger: "Recoger / entrega personal",
};

const nuevoId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const limpiar = (texto) => String(texto || "").trim();

const copiarPar = (par) => ({
  id: par.id || nuevoId(),
  talla: limpiar(par.talla),
  color: limpiar(par.color),
});

const copiarLinea = (linea) => ({
  slug: linea.slug,
  titulo: linea.titulo,
  imagen: linea.imagen || "",
  colorReferencia: linea.colorReferencia || "",
  colores: Array.isArray(linea.colores) ? [...linea.colores] : [],
  pares: linea.pares.map(copiarPar),
});

export function crearPedido({ alCambiar = () => {} } = {}) {
  let lineas = [];

  const avisar = () => alCambiar(api);

  const api = {
    lineas: () => lineas.map(copiarLinea),

    unidades: () => lineas.reduce((suma, l) => suma + l.pares.length, 0),

    agregar(producto, par = {}) {
      const talla = limpiar(par.talla);
      const color = limpiar(par.color) || limpiar(producto.color);
      let linea = lineas.find((l) => l.slug === producto.slug);
      if (!linea) {
        linea = {
          slug: producto.slug,
          titulo: producto.titulo,
          imagen: producto.imagen || "",
          colorReferencia: producto.color || "",
          colores: Array.isArray(producto.colores) && producto.colores.length
            ? [...producto.colores]
            : [producto.color].filter(Boolean),
          pares: [],
        };
        lineas.push(linea);
      }
      linea.pares.push({
        id: nuevoId(),
        talla,
        color,
      });
      avisar();
      return api;
    },

    quitarPar(slug, id) {
      const linea = lineas.find((l) => l.slug === slug);
      if (!linea) return api;
      linea.pares = linea.pares.filter((par) => par.id !== id);
      if (linea.pares.length === 0) lineas = lineas.filter((l) => l.slug !== slug);
      avisar();
      return api;
    },

    quitar(slug) {
      lineas = lineas.filter((l) => l.slug !== slug);
      avisar();
      return api;
    },

    vaciar() {
      lineas = [];
      avisar();
      return api;
    },

    faltantes() {
      const pendientes = [];
      for (const linea of lineas) {
        linea.pares.forEach((par, indice) => {
          if (!par.talla || !par.color) {
            pendientes.push({
              slug: linea.slug,
              titulo: linea.titulo,
              numero: indice + 1,
              faltaTalla: !par.talla,
              faltaColor: !par.color,
            });
          }
        });
      }
      return pendientes;
    },

    exportar: () => lineas.map(copiarLinea),

    importar(guardadas) {
      if (!Array.isArray(guardadas)) return api;
      lineas = guardadas
        .filter((l) => l && l.slug && l.titulo)
        .map((l) => {
          const pares = Array.isArray(l.pares)
            ? l.pares.filter((par) => par && typeof par === "object").map(copiarPar)
            : [];
          const colorReferencia = l.colorReferencia || l.color || "";
          const colores = Array.isArray(l.colores) && l.colores.length
            ? [...l.colores]
            : [...new Set([colorReferencia, ...pares.map((par) => par.color)].filter(Boolean))];
          return pares.length
            ? {
                slug: l.slug,
                titulo: l.titulo,
                imagen: l.imagen || "",
                colorReferencia,
                colores,
                pares,
              }
            : null;
        })
        .filter(Boolean);
      avisar();
      return api;
    },
  };

  return api;
}

export function armarMensaje(pedido, datos) {
  const lineas = pedido.lineas();
  if (lineas.length === 0) throw new Error("El pedido está vacío");

  const pendientes = pedido.faltantes();
  if (pendientes.length > 0) {
    throw new Error(
      `Falta talla o color en ${pendientes[0].titulo}, par ${pendientes[0].numero}`
    );
  }

  const partes = ["*Nuevo pedido — P1000*", ""];

  for (const linea of lineas) {
    partes.push(`• ${linea.titulo}`);
    linea.pares.forEach((par, indice) => {
      partes.push(
        `   Par ${indice + 1}: talla ${par.talla} · color ${par.color}`
      );
    });
  }

  partes.push("");
  partes.push("*Datos de contacto*");
  partes.push(`Nombre: ${datos.nombre}`);
  partes.push(`Teléfono: ${datos.telefono}`);
  if (datos.ciudad) partes.push(`Ciudad: ${datos.ciudad}`);
  if (datos.entrega) {
    partes.push(`Entrega: ${ENTREGAS[datos.entrega] || datos.entrega}`);
  }
  if (datos.direccion) partes.push(`Dirección: ${datos.direccion}`);
  if (datos.nota) partes.push(`Nota: ${datos.nota}`);
  partes.push("");
  partes.push(
    "Quedo pendiente de precio, disponibilidad y coordinación de la entrega. ¡Gracias!"
  );

  return partes.join("\n");
}
