const formatoPesos = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function precioCOP(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  return formatoPesos.format(Number(valor) || 0).replace(/\s/g, " ");
}

export function precioTexto(producto) {
  return precioCOP(producto?.precio) ?? "Precio por confirmar";
}

export function numeroWhatsApp(numero) {
  const digitos = String(numero || "").replace(/\D/g, "");
  if (!digitos) return "";
  return digitos.startsWith("57") ? digitos : `57${digitos}`;
}

export function enlaceWhatsApp(numero, mensaje) {
  return `https://wa.me/${numeroWhatsApp(numero)}?text=${encodeURIComponent(mensaje)}`;
}

export function mensajeProducto(producto) {
  const color = producto.color ? `, color ${producto.color.toLowerCase()}` : "";
  return `Hola P1000, me interesa "${producto.titulo}"${color}. ¿Me confirmas precio, tallas y disponibilidad?`;
}
