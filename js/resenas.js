/* =========================================================
   Té Quiero Pastelería - Carrusel de reseñas
   - Lee las reseñas aprobadas desde data/resenas.json
   - Carrusel automático con flechas y puntos
   - Se pausa con el mouse, el foco o el dedo, y no se mueve si el usuario
     pidió reducir el movimiento
   Todo el contenido se inserta con textContent (sin innerHTML).
   ========================================================= */

(function () {
  "use strict";

  var pista = document.getElementById("resenasGrid");
  var estado = document.getElementById("resenasEstado");
  var btnPrev = document.getElementById("carruselPrev");
  var btnNext = document.getElementById("carruselNext");
  var puntos = document.getElementById("carruselPuntos");
  var carrusel = document.getElementById("carrusel");

  if (!pista || !estado) return;

  var TIEMPO_AUTO = 5000;
  var reduceMovimiento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pausa = { hover: false, foco: false, toque: false };
  var toqueTimer = null;

  /* ---------- Helpers ---------- */

  function iniciales(nombre) {
    return String(nombre)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (parte) { return parte.charAt(0); })
      .join("")
      .toUpperCase();
  }

  function crearEtiqueta(tag, clase, texto) {
    var el = document.createElement(tag);
    if (clase) el.className = clase;
    el.textContent = texto;
    return el;
  }

  /* ---------- Tarjetas ---------- */

  function crearTarjeta(r) {
    // Fondo degradado con colores de Google; el panel blanco translúcido deja leer el texto
    var card = document.createElement("article");
    card.className = "resena";

    var panel = document.createElement("div");
    panel.className = "resena__panel";

    var head = document.createElement("div");
    head.className = "resena__head";

    var avatar = crearEtiqueta("div", "resena__avatar", iniciales(r.nombre));
    avatar.setAttribute("aria-hidden", "true");

    var datos = document.createElement("div");
    datos.className = "resena__datos";
    datos.appendChild(crearEtiqueta("p", "resena__nombre", r.nombre));

    var meta = document.createElement("div");
    meta.className = "resena__meta";
    if (r.guia_local) {
      meta.appendChild(crearEtiqueta("span", "resena__badge", "Local Guide"));
    }
    var conteos = [];
    if (r.opiniones != null) conteos.push(r.opiniones + (r.opiniones === 1 ? " opinión" : " opiniones"));
    if (r.fotos != null) conteos.push(r.fotos + (r.fotos === 1 ? " foto" : " fotos"));
    if (conteos.length) {
      meta.appendChild(crearEtiqueta("span", "resena__conteo", conteos.join(" · ")));
    }
    if (meta.childNodes.length) datos.appendChild(meta);

    head.appendChild(avatar);
    head.appendChild(datos);

    panel.appendChild(head);
    panel.appendChild(crearEtiqueta("p", "resena__texto", r.texto));
    if (r.fecha_texto) panel.appendChild(crearEtiqueta("p", "resena__fecha", r.fecha_texto));

    card.appendChild(panel);
    return card;
  }

  /* ---------- Movimiento del carrusel ---------- */

  function paso() {
    var hijos = pista.children;
    if (hijos.length < 2) return pista.clientWidth;
    return hijos[1].offsetLeft - hijos[0].offsetLeft;
  }

  function indiceActual() {
    var n = pista.children.length;
    var i = Math.round(pista.scrollLeft / paso());
    return Math.max(0, Math.min(i, n - 1));
  }

  function irA(i) {
    var n = pista.children.length;
    if (!n) return;
    if (i < 0) i = n - 1;
    if (i >= n) i = 0;
    pista.scrollTo({ left: i * paso(), behavior: reduceMovimiento ? "auto" : "smooth" });
  }

  function alFinal() {
    return pista.scrollLeft >= pista.scrollWidth - pista.clientWidth - 4;
  }

  function avanzar() {
    if (alFinal()) irA(0);
    else irA(indiceActual() + 1);
  }

  function retroceder() {
    if (pista.scrollLeft <= 4) irA(pista.children.length - 1);
    else irA(indiceActual() - 1);
  }

  function puedeMoverse() {
    return !reduceMovimiento && !document.hidden &&
      !pausa.hover && !pausa.foco && !pausa.toque;
  }

  /* ---------- Puntos de navegación ---------- */

  function crearPuntos(n) {
    if (!puntos) return;
    puntos.innerHTML = "";
    for (var k = 0; k < n; k++) {
      var punto = document.createElement("button");
      punto.type = "button";
      punto.className = "carrusel__punto";
      punto.setAttribute("aria-label", "Ir a la reseña " + (k + 1));
      punto.dataset.indice = String(k);
      punto.addEventListener("click", function (e) {
        irA(Number(e.currentTarget.dataset.indice));
      });
      puntos.appendChild(punto);
    }
  }

  function actualizarPuntos() {
    if (!puntos) return;
    var activo = indiceActual();
    Array.prototype.forEach.call(puntos.children, function (punto, k) {
      punto.setAttribute("aria-current", k === activo ? "true" : "false");
    });
  }

  /* ---------- Render ---------- */

  function render(lista) {
    pista.innerHTML = "";

    if (!lista.length) {
      estado.textContent = "Todavía no hay reseñas publicadas.";
      estado.hidden = false;
      if (carrusel) carrusel.hidden = true;
      return;
    }

    lista.forEach(function (r) {
      pista.appendChild(crearTarjeta(r));
    });

    estado.hidden = true;
    if (carrusel) carrusel.hidden = false;

    var varias = lista.length > 1;
    if (btnPrev) btnPrev.hidden = !varias;
    if (btnNext) btnNext.hidden = !varias;
    if (puntos) puntos.hidden = !varias;

    crearPuntos(lista.length);
    actualizarPuntos();
  }

  function cargarResenas() {
    fetch("data/resenas.json", { cache: "no-cache" })
      .then(function (respuesta) {
        if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);
        return respuesta.json();
      })
      .then(function (lista) {
        render(lista.filter(function (r) { return r.aprobada === true; }));
      })
      .catch(function () {
        estado.textContent = "No pudimos cargar las reseñas en este momento. Podés leerlas en Google Maps.";
        estado.hidden = false;
      });
  }

  /* ---------- Eventos ---------- */

  if (btnPrev) btnPrev.addEventListener("click", retroceder);
  if (btnNext) btnNext.addEventListener("click", avanzar);

  pista.addEventListener("scroll", function () {
    window.requestAnimationFrame(actualizarPuntos);
  }, { passive: true });

  if (carrusel) {
    carrusel.addEventListener("mouseenter", function () { pausa.hover = true; });
    carrusel.addEventListener("mouseleave", function () { pausa.hover = false; });
    carrusel.addEventListener("focusin", function () { pausa.foco = true; });
    carrusel.addEventListener("focusout", function () { pausa.foco = false; });
  }

  // En celular: pausar mientras el dedo toca y reanudar un rato después
  pista.addEventListener("touchstart", function () {
    pausa.toque = true;
    clearTimeout(toqueTimer);
  }, { passive: true });
  pista.addEventListener("touchend", function () {
    clearTimeout(toqueTimer);
    toqueTimer = setTimeout(function () { pausa.toque = false; }, 2500);
  }, { passive: true });

  // Avance automático
  setInterval(function () {
    if (puedeMoverse() && pista.children.length > 1) avanzar();
  }, TIEMPO_AUTO);

  cargarResenas();
})();
