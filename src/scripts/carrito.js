/**
 * Panel del pedido. La lógica vive en pedido.js; aquí solo está la interfaz.
 * El pedido se guarda en el navegador para no perderlo al cambiar de página.
 */
import {
  crearPedido,
  armarMensaje,
  enlaceWhatsApp,
} from "./pedido.js";

const CLAVE = "p1000-pedido";

const guardar = (lineas) => {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lineas));
  } catch {
    /* ventana privada: el pedido sigue vivo durante la visita */
  }
};

const recuperar = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) || "[]");
  } catch {
    return [];
  }
};

const escapar = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

export function montarCarrito() {
  const panel = document.getElementById("carrito");
  const cuerpo = document.getElementById("carritoCuerpo");
  if (!panel || !cuerpo) return;

  const base = (document.documentElement.dataset.base || "/").replace(/\/?$/, "/");
  const whatsapp = panel.dataset.whatsapp || "";
  const fondo = document.getElementById("carritoFondo");
  const globo = document.querySelector(".carrito-globo");

  const pedido = crearPedido({
    alCambiar: (p) => {
      guardar(p.exportar());
      pintarContadores(p);
      if (!panel.hidden) pintarPanel(p);
    },
  });

  function pintarContadores(p) {
    const unidades = p.unidades();
    if (globo) {
      globo.textContent = unidades;
      globo.hidden = unidades === 0;
    }
  }

  function leerFormulario() {
    const formulario = cuerpo.querySelector("#formPedido");
    if (!formulario) return {};
    return Object.fromEntries(new FormData(formulario));
  }

  function pintarPanel(p) {
    const lineas = p.lineas();
    const previos = leerFormulario();

    if (lineas.length === 0) {
      cuerpo.innerHTML = `
        <div class="carrito-vacio">
          <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
            <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6"/>
            <circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>
          </svg>
          <p>Tu pedido está vacío.</p>
          <a class="btn btn-azul" href="${base}calzado">Ver el catálogo</a>
        </div>`;
      return;
    }

    cuerpo.innerHTML = `
      <div class="carrito-lista">
        ${lineas
          .map(
            (linea) => `
          <article class="carrito-linea" data-slug="${linea.slug}">
            <img src="${base}${linea.imagen.replace(/^\/+/, "")}" alt="" width="64" height="64" loading="lazy">
            <div class="carrito-linea-datos">
              <a href="${base}calzado/${linea.slug}">${escapar(linea.titulo)}</a>
              ${linea.color ? `<span class="carrito-linea-color">${escapar(linea.color)}</span>` : ""}
              <span class="carrito-linea-unitario">Precio por confirmar</span>
            </div>
            <div class="carrito-cantidad">
              <button type="button" data-menos="${linea.slug}" aria-label="Quitar una unidad">−</button>
              <span aria-live="polite">${linea.cantidad}</span>
              <button type="button" data-mas="${linea.slug}" aria-label="Agregar una unidad">+</button>
            </div>
            <button type="button" class="carrito-quitar" data-quitar="${linea.slug}"
                    aria-label="Quitar ${escapar(linea.titulo)} del pedido">×</button>
          </article>`
          )
          .join("")}
      </div>

      <form class="carrito-datos" id="formPedido" novalidate>
        <h3>Datos de contacto</h3>
        <label>Nombre y apellido
          <input name="nombre" required autocomplete="name" placeholder="Ana Gómez" value="${escapar(previos.nombre || "")}">
        </label>
        <label>Teléfono / WhatsApp
          <input name="telefono" required inputmode="tel" autocomplete="tel" placeholder="300 123 4567" value="${escapar(previos.telefono || "")}">
        </label>
        <label>Ciudad
          <input name="ciudad" required autocomplete="address-level2" placeholder="Bogotá" value="${escapar(previos.ciudad || "")}">
        </label>
        <label>Dirección <span class="opcional">(opcional)</span>
          <input name="direccion" autocomplete="street-address" placeholder="Cra 10 #20-30" value="${escapar(previos.direccion || "")}">
        </label>
        <label>Nota <span class="opcional">(opcional)</span>
          <textarea name="nota" rows="2" placeholder="Talla 38, color negro, etc.">${escapar(previos.nota || "")}</textarea>
        </label>

        <div class="carrito-total">
          <div class="carrito-total-linea">
            <span>Referencias</span>
            <strong>${lineas.length} · ${p.unidades()} ${p.unidades() === 1 ? "unidad" : "unidades"}</strong>
          </div>
          <button type="submit" class="btn btn-turquesa carrito-enviar">
            Enviar pedido por WhatsApp
          </button>
          <p class="carrito-nota">
            Se abre WhatsApp con tu pedido escrito. P1000 confirma precio,
            tallas, disponibilidad y envío antes de cerrar la compra.
          </p>
        </div>
      </form>`;

    cuerpo.querySelector("#formPedido").addEventListener("submit", enviarPedido);
  }

  function enviarPedido(evento) {
    evento.preventDefault();
    const formulario = evento.target;
    const datos = Object.fromEntries(new FormData(formulario));

    const faltantes = ["nombre", "telefono", "ciudad"].filter(
      (campo) => !String(datos[campo] || "").trim()
    );
    if (faltantes.length > 0) {
      const campo = formulario.elements[faltantes[0]];
      campo.focus();
      campo.classList.add("campo-falta");
      avisar(
        "Falta " +
          { nombre: "tu nombre", telefono: "tu teléfono", ciudad: "la ciudad" }[faltantes[0]]
      );
      return;
    }

    const mensaje = armarMensaje(pedido, datos);
    window.open(enlaceWhatsApp(whatsapp, mensaje), "_blank", "noopener");
    avisar("Pedido enviado. Revisa WhatsApp.");
  }

  let ultimoFoco = null;

  const abrir = () => {
    ultimoFoco = document.activeElement;
    panel.hidden = false;
    fondo.hidden = false;
    requestAnimationFrame(() => panel.classList.add("abierto"));
    panel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    pintarPanel(pedido);
    panel.querySelector("#cerrarCarrito")?.focus();
  };

  const cerrar = () => {
    panel.classList.remove("abierto");
    panel.setAttribute("aria-hidden", "true");
    fondo.hidden = true;
    document.body.style.overflow = "";
    setTimeout(() => (panel.hidden = true), 280);
    ultimoFoco?.focus();
  };

  document.getElementById("abrirCarrito")?.addEventListener("click", abrir);
  document.getElementById("cerrarCarrito")?.addEventListener("click", cerrar);
  fondo?.addEventListener("click", cerrar);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) cerrar();
  });

  // Agregar desde tarjetas y ficha de producto.
  document.addEventListener("click", (evento) => {
    const agregar = evento.target.closest("[data-agregar]");
    if (agregar) {
      const cantidad = Number(agregar.dataset.cantidad || 1);
      pedido.agregar(
        {
          slug: agregar.dataset.agregar,
          titulo: agregar.dataset.titulo,
          color: agregar.dataset.color || "",
          imagen: agregar.dataset.imagen || "",
        },
        cantidad
      );
      avisar(`${agregar.dataset.titulo} agregado`);
      return;
    }

    const mas = evento.target.closest("[data-mas]");
    if (mas) {
      const linea = pedido.lineas().find((l) => l.slug === mas.dataset.mas);
      if (linea) pedido.cambiarCantidad(linea.slug, linea.cantidad + 1);
      return;
    }

    const menos = evento.target.closest("[data-menos]");
    if (menos) {
      const linea = pedido.lineas().find((l) => l.slug === menos.dataset.menos);
      if (linea) pedido.cambiarCantidad(linea.slug, linea.cantidad - 1);
      return;
    }

    const quitar = evento.target.closest("[data-quitar]");
    if (quitar) {
      pedido.quitar(quitar.dataset.quitar);
    }
  });

  // Selector de cantidad en la ficha del producto.
  document.addEventListener("click", (evento) => {
    const mas = evento.target.closest("[data-cantidad-mas]");
    const menos = evento.target.closest("[data-cantidad-menos]");
    if (!mas && !menos) return;

    const salida = document.getElementById("cantidadDetalle");
    const boton = document.getElementById("agregarDetalle");
    if (!salida || !boton) return;

    const actual = Math.max(1, Number(salida.textContent) || 1);
    const siguiente = mas ? actual + 1 : Math.max(1, actual - 1);
    salida.textContent = String(siguiente);
    boton.dataset.cantidad = String(siguiente);
  });

  let temporizador = null;
  function avisar(texto) {
    let aviso = document.getElementById("avisoPedido");
    if (!aviso) {
      aviso = document.createElement("div");
      aviso.id = "avisoPedido";
      aviso.className = "aviso-pedido";
      aviso.setAttribute("role", "status");
      document.body.appendChild(aviso);
    }
    aviso.textContent = texto;
    aviso.classList.add("visible");
    clearTimeout(temporizador);
    temporizador = setTimeout(() => aviso.classList.remove("visible"), 2600);
  }

  pedido.importar(recuperar());
  pintarContadores(pedido);
}
