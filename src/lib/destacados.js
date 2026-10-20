import { oferta } from "./formato.js";

function semilla(texto) {
  let valor = 0;
  for (let i = 0; i < texto.length; i++) {
    valor = (valor * 31 + texto.charCodeAt(i)) % 2147483647;
  }
  return valor;
}

/**
 * Ordena el escaparate: primero lo marcado como destacado, luego lo que
 * tiene mayor ahorro real y, al final, el resto en un orden estable.
 * Los agotados no se ofrecen en la portada.
 */
export function elegirDestacados(productos, cantidad, { excluir = new Set() } = {}) {
  const elegibles = productos.filter(
    (producto) => !excluir.has(producto.slug) && producto.stock !== false
  );

  const marcados = elegibles.filter((producto) => producto.destacado === true);
  const resto = elegibles.filter((producto) => producto.destacado !== true);

  const conAhorro = resto
    .filter((producto) => (oferta(producto).ahorro || 0) > 0)
    .sort((a, b) => oferta(b).ahorro - oferta(a).ahorro);

  const sinAhorro = resto
    .filter((producto) => (oferta(producto).ahorro || 0) === 0)
    .sort((a, b) => semilla(a.slug) - semilla(b.slug));

  const vistos = new Set();
  const salida = [];
  for (const producto of [...marcados, ...conAhorro, ...sinAhorro]) {
    if (salida.length >= cantidad) break;
    if (vistos.has(producto.slug)) continue;
    vistos.add(producto.slug);
    salida.push(producto);
  }
  return salida;
}
