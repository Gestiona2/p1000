/**
 * Panel del pedido. La lógica vive en pedido.js; aquí está la interfaz.
 *
 * Cada par se agrega con su talla y su color. Si se piden varios pares de la
 * misma referencia, se agregan uno por uno y el mensaje los enumera.
 */
import { crearPedido, armarMensaje, ENTREGAS } from "./pedido.js";
import { enlaceWhatsApp } from "../lib/formato.js";

const CLAVE = "p1000-pedido-v2";

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

  const modal = document.getElementById("parModal");
  const modalFondo = document.getElementById("parFondo");
  const formPar = document.getElementById("parForm");
  const tituloPar = document.getElementById("parTitulo");
  const refPar = document.getElementById("parRef");
  const tallaPar = document.getElementById("parTalla");
  const colorPar = document.getElementById("parColor");

  let productoModal = null;
  let focoModal = null;
  let overflowPrevio = "";

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
          <article class="carrito-linea" data-linea="${linea.slug}">
            <img src="${base}${linea.imagen.replace(/^\/+/, "")}" alt="" width="64" height="64" loading="lazy">
            <div class="carrito-linea-datos">
              <a href="${base}calzado/${linea.slug}">${escapar(linea.titulo)}</a>
              ${linea.colorReferencia ? `<span class="carrito-linea-color">${escapar(linea.colorReferencia)}</span>` : ""}
              <ul class="carrito-pares">
                ${linea.pares
                  .map(
                    (par, indice) => `
                  <li>
                    <span>
                      <b>Par ${indice + 1}</b>
                      · Talla ${escapar(par.talla || "por confirmar")}
                      · ${escapar(par.color || "color por confirmar")}
                    </span>
                    <button type="button" data-quitar-par="${linea.slug}" data-id="${par.id}"
                            aria-label="Quitar el par ${indice + 1} de ${escapar(linea.titulo)}">×</button>
                  </li>`
                  )
                  .join("")}
              </ul>
              <button type="button" class="carrito-otro-par" data-otro-par="${linea.slug}">
                + Agregar otro par
              </button>
              <span class="carrito-linea-unitario">Precio por confirmar</span>
            </div>
            <button type="button" class="carrito-quitar" data-quitar="${linea.slug}"
                    aria-label="Quitar toda la referencia ${escapar(linea.titulo)}">×</button>
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
        <label>¿Cómo quieres recibirlo?
          <select name="entrega">
            ${Object.entries(ENTREGAS)
              .map(
                ([valor, texto]) =>
                  `<option value="${valor}"${(previos.entrega || "coordinar") === valor ? " selected" : ""}>${texto}</option>`
              )
              .join("")}
          </select>
        </label>
        <label>Dirección <span class="opcional">(si es a domicilio)</span>
          <input name="direccion" autocomplete="street-address" placeholder="Cra 10 #20-30" value="${escapar(previos.direccion || "")}">
        </label>
        <label>Nota <span class="opcional">(opcional)</span>
          <textarea name="nota" rows="2" placeholder="Horario, referencia del lugar, etc.">${escapar(previos.nota || "")}</textarea>
        </label>

        <div class="carrito-total">
          <div class="carrito-total-linea">
            <span>Pedido</span>
            <strong>${lineas.length} ${lineas.length === 1 ? "referencia" : "referencias"} · ${p.unidades()} ${p.unidades() === 1 ? "par" : "pares"}</strong>
          </div>
          <button type="submit" class="btn btn-turquesa carrito-enviar">
            Enviar pedido por WhatsApp
          </button>
          <p class="carrito-nota">
            Se abre WhatsApp con tu pedido escrito. P1000 confirma precio,
            disponibilidad y entrega antes de cerrar la compra.
          </p>
        </div>
      </form>`;

    cuerpo.querySelector("#formPedido").addEventListener("submit", enviarPedido);
    cuerpo.querySelector("#formPedido").addEventListener("input", (evento) => {
      evento.target.classList.remove("campo-falta");
    });
  }

  function enviarPedido(evento) {
    evento.preventDefault();
    const formulario = evento.target;
    const datos = Object.fromEntries(new FormData(formulario));

    const pendientes = pedido.faltantes();
    if (pendientes.length > 0) {
      const falta = pendientes[0];
      avisar(
        `Falta ${falta.faltaTalla ? "la talla" : "el color"} del par ${falta.numero} de ${falta.titulo}. Quítalo y agrégalo de nuevo.`
      );
      return;
    }

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

  function opcionesColor(producto) {
    const lista = Array.isArray(producto?.colores)
      ? producto.colores
      : [producto?.color].filter(Boolean);
    return [...new Set(lista.filter(Boolean))];
  }

  function abrirModal(producto) {
    if (!modal || !modalFondo || !formPar) return;
    productoModal = producto;
    focoModal = document.activeElement;
    overflowPrevio = document.body.style.overflow;

    const colores = opcionesColor(producto);
    tituloPar.textContent = producto.titulo || "Agregar al pedido";
    refPar.textContent = colores.length > 1
      ? "Elige la talla y el color disponibles para este par."
      : "Elige la talla para este par.";
    tallaPar.value = "";
    colorPar.innerHTML = colores.length
      ? colores.map((color) => `<option value="${escapar(color)}">${escapar(color)}</option>`).join("")
      : '<option value="">Por confirmar</option>';
    colorPar.value = colores.includes(producto.color) ? producto.color : colores[0] || "";

    modalFondo.hidden = false;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => tallaPar.focus());
  }

  function cerrarModal() {
    if (!modal || !modalFondo) return;
    modal.hidden = true;
    modalFondo.hidden = true;
    productoModal = null;
    document.body.style.overflow = overflowPrevio;
    focoModal?.focus?.();
  }

  function agregarParDesdeModal(evento) {
    evento.preventDefault();
    if (!productoModal) return;

    const talla = tallaPar.value.trim();
    const color = colorPar.value.trim();
    if (!talla) {
      tallaPar.focus();
      tallaPar.classList.add("campo-falta");
      avisar("Escribe la talla de este par");
      return;
    }
    if (!color) {
      colorPar.focus();
      colorPar.classList.add("campo-falta");
      avisar("Elige el color de este par");
      return;
    }

    pedido.agregar(productoModal, { talla, color });
    avisar(`Par talla ${talla} agregado`);
    cerrarModal();
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
    if (e.key !== "Escape") return;
    if (modal && !modal.hidden) {
      cerrarModal();
      return;
    }
    if (!panel.hidden) cerrar();
  });

  // Modal para agregar un par desde la tarjeta o la ventana de promoción.
  modalFondo?.addEventListener("click", cerrarModal);
  document.getElementById("cerrarPar")?.addEventListener("click", cerrarModal);
  document.getElementById("cancelarPar")?.addEventListener("click", cerrarModal);
  formPar?.addEventListener("submit", agregarParDesdeModal);
  [tallaPar, colorPar].forEach((campo) => {
    campo?.addEventListener("input", () => campo.classList.remove("campo-falta"));
  });
  document.getElementById("formParDetalle")?.querySelectorAll("input, select").forEach((campo) => {
    campo.addEventListener("input", () => campo.classList.remove("campo-falta"));
    campo.addEventListener("change", () => campo.classList.remove("campo-falta"));
  });

  // Agregar desde tarjetas, ficha de producto y promoción.
  document.addEventListener("click", (evento) => {
    const agregar = evento.target.closest("[data-agregar]");
    if (agregar) {
      let colores = [];
      try {
        colores = JSON.parse(agregar.dataset.colores || "[]");
      } catch {
        colores = [];
      }
      const producto = {
        slug: agregar.dataset.agregar,
        titulo: agregar.dataset.titulo,
        color: agregar.dataset.color || "",
        colores: Array.isArray(colores) ? colores : [],
        imagen: agregar.dataset.imagen || "",
      };

      const idFormulario = agregar.dataset.formPar;
      if (idFormulario) {
        const formulario = document.getElementById(idFormulario);
        const talla = formulario?.querySelector("[name=talla]");
        const color = formulario?.querySelector("[name=color]");
        if (!formulario || !talla || !color) return;

        if (!talla.value.trim()) {
          talla.focus();
          talla.classList.add("campo-falta");
          avisar("Elige la talla de este par");
          return;
        }
        if (!color.value.trim()) {
          color.focus();
          color.classList.add("campo-falta");
          avisar("Elige el color de este par");
          return;
        }

        pedido.agregar(producto, { talla: talla.value, color: color.value });
        avisar(`Par talla ${talla.value.trim()} agregado`);
        talla.value = "";
        talla.focus();
        return;
      }

      abrirModal(producto);
      return;
    }

    const otro = evento.target.closest("[data-otro-par]");
    if (otro) {
      const linea = pedido.lineas().find((l) => l.slug === otro.dataset.otroPar);
      if (!linea) return;
      abrirModal({
        slug: linea.slug,
        titulo: linea.titulo,
        color: linea.colorReferencia,
        colores: linea.colores?.length ? linea.colores : [linea.colorReferencia].filter(Boolean),
        imagen: linea.imagen,
      });
      return;
    }

    const quitarPar = evento.target.closest("[data-quitar-par]");
    if (quitarPar) {
      pedido.quitarPar(quitarPar.dataset.quitarPar, quitarPar.dataset.id);
      return;
    }

    const quitar = evento.target.closest("[data-quitar]");
    if (quitar) {
      pedido.quitar(quitar.dataset.quitar);
    }
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
    temporizador = setTimeout(() => aviso.classList.remove("visible"), 3000);
  }

  pedido.importar(recuperar());
  pintarContadores(pedido);
}
