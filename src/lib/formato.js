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

/**
 * Descuento real: solo existe si hay precio y un precio anterior mayor.
 * Nunca se toma el porcentaje de los datos, para que no pueda quedar
 * descuadrado con los precios publicados.
 */
export function oferta(producto) {
  const precio = Number(producto?.precio);
  const antes = Number(producto?.precio_antes);
  if (!Number.isFinite(precio) || precio <= 0) return { descuento: null, ahorro: null };
  if (!Number.isFinite(antes) || antes <= precio) return { descuento: null, ahorro: null };
  return {
    descuento: Math.round(((antes - precio) / antes) * 100),
    ahorro: antes - precio,
  };
}

export function promoVigente(producto, ahora = Date.now()) {
  if (producto?.promo_flash !== true) return false;
  if (producto?.stock === false) return false;
  if (!producto?.precio) return false;
  const vence = producto?.promo_flash_vence;
  if (!vence) return true;
  const fecha = new Date(vence).getTime();
  return Number.isNaN(fecha) || fecha > ahora;
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
