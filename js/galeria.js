/* =========================================================
   Té Quiero Pastelería - Galería de fotos y videos
   Lee los elementos desde data/galeria.json.
   - Si un elemento tiene "src", se muestra y se puede abrir en grande.
   - Si "src" está vacío, muestra un espacio para cargarlo más adelante.
   Todo el contenido se inserta con textContent o con propiedades (sin innerHTML con datos).
   ========================================================= */

(function () {
  "use strict";

  var grid = document.getElementById("galeriaGrid");
  var estado = document.getElementById("galeriaEstado");

  if (!grid || !estado) return;

  var lightbox = null;

  /* ---------- Vista ampliada ---------- */

  function crearLightbox() {
    var fondo = document.createElement("div");
    fondo.className = "lightbox";
    fondo.setAttribute("role", "dialog");
    fondo.setAttribute("aria-modal", "true");
    fondo.setAttribute("aria-label", "Vista ampliada");

    var contenido = document.createElement("div");
    contenido.className = "lightbox__contenido";

    var boton = document.createElement("button");
    boton.type = "button";
    boton.className = "lightbox__cerrar";
    boton.setAttribute("aria-label", "Cerrar");
    boton.textContent = "×";

    var medio = document.createElement("div");
    medio.className = "lightbox__medio";

    var titulo = document.createElement("p");
    titulo.className = "lightbox__titulo";

    contenido.appendChild(boton);
    contenido.appendChild(medio);
    contenido.appendChild(titulo);
    fondo.appendChild(contenido);
    document.body.appendChild(fondo);

    var api = { fondo: fondo, medio: medio, titulo: titulo, boton: boton };

    boton.addEventListener("click", cerrar);
    fondo.addEventListener("click", function (e) {
      if (e.target === fondo) cerrar();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && fondo.classList.contains("is-open")) cerrar();
    });

    return api;
  }

  function abrir(item) {
    if (!lightbox) lightbox = crearLightbox();

    lightbox.medio.innerHTML = "";

    var elemento;
    if (item.tipo === "video") {
      elemento = document.createElement("video");
      elemento.src = item.src;
      elemento.controls = true;
      elemento.playsInline = true;
      elemento.autoplay = true;
    } else {
      elemento = document.createElement("img");
      elemento.src = item.src;
      elemento.alt = item.titulo || "";
    }

    lightbox.medio.appendChild(elemento);
    lightbox.titulo.textContent = item.titulo || "";
    lightbox.fondo.classList.add("is-open");
    document.body.style.overflow = "hidden";
    lightbox.boton.focus();
  }

  function cerrar() {
    if (!lightbox) return;
    var video = lightbox.medio.querySelector("video");
    if (video) video.pause();
    lightbox.medio.innerHTML = "";
    lightbox.titulo.textContent = "";
    lightbox.fondo.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  /* ---------- Tarjetas ---------- */

  function crearEspacioVacio(item) {
    var vacio = document.createElement("div");
    vacio.className = "galeria__vacio";

    var tipo = document.createElement("span");
    tipo.className = "galeria__vacio-tipo";
    tipo.textContent = item.tipo === "video" ? "Video" : "Foto";

    var titulo = document.createElement("p");
    titulo.className = "galeria__vacio-titulo";
    titulo.textContent = item.titulo || "Espacio para subir";

    var ayuda = document.createElement("p");
    ayuda.className = "galeria__vacio-ayuda";
    ayuda.textContent = "Próximamente";

    vacio.appendChild(tipo);
    vacio.appendChild(titulo);
    vacio.appendChild(ayuda);
    return vacio;
  }

  function crearItem(item) {
    var figura = document.createElement("figure");
    figura.className = "galeria__item";

    if (!item.src) {
      figura.appendChild(crearEspacioVacio(item));
      return figura;
    }

    if (item.tipo === "video") {
      var video = document.createElement("video");
      video.src = item.src;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      if (item.poster) video.poster = item.poster;
      figura.appendChild(video);
    } else {
      var img = document.createElement("img");
      img.src = item.src;
      img.alt = item.titulo || "";
      img.loading = "lazy";
      figura.appendChild(img);
    }

    if (item.titulo) {
      var pie = document.createElement("figcaption");
      pie.className = "galeria__caption";
      pie.textContent = item.titulo;
      figura.appendChild(pie);
    }

    // Se puede abrir en grande
    figura.classList.add("is-abrible");
    figura.setAttribute("tabindex", "0");
    figura.setAttribute("role", "button");
    figura.setAttribute("aria-label", "Ver " + (item.titulo || "en grande"));
    figura.addEventListener("click", function () { abrir(item); });
    figura.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        abrir(item);
      }
    });

    return figura;
  }

  /* ---------- Carga ---------- */

  // Misma cuenta y tag que usa subir.html (ver js/subir.js)
  var CLOUDINARY = { cloudName: "gb6kfzeo", tag: "tequiero" };

  // Trae fotos y videos subidos desde subir.html. Si no hay nada o no
  // está configurado, devuelve [] y se usa data/galeria.json.
  function cargarDeCloudinary() {
    if (CLOUDINARY.cloudName.indexOf("TU_") === 0) return Promise.resolve([]);

    var base = "https://res.cloudinary.com/" + CLOUDINARY.cloudName;

    function pedir(tipo) {
      return fetch(base + "/" + tipo + "/list/" + CLOUDINARY.tag + ".json", { cache: "no-cache" })
        .then(function (r) { return r.ok ? r.json() : { resources: [] }; })
        .then(function (data) {
          return (data.resources || []).map(function (r) {
            return { tipo: tipo === "video" ? "video" : "imagen", recurso: r };
          });
        });
    }

    return Promise.all([pedir("image"), pedir("video")])
      .then(function (listas) {
        var todos = listas[0].concat(listas[1]);
        todos.sort(function (a, b) {
          return new Date(b.recurso.created_at) - new Date(a.recurso.created_at);
        });
        return todos.map(function (x) {
          var r = x.recurso;
          if (x.tipo === "video") {
            return {
              tipo: "video",
              src: base + "/video/upload/q_auto/" + r.public_id + "." + r.format,
              poster: base + "/video/upload/so_0,w_800,c_limit,f_jpg/" + r.public_id + ".jpg",
              titulo: ""
            };
          }
          return {
            tipo: "imagen",
            src: base + "/image/upload/f_auto,q_auto,c_limit,w_1200/" + r.public_id + "." + r.format,
            titulo: ""
          };
        });
      })
      .catch(function () { return []; });
  }

  function cargarDeArchivo() {
    return fetch("data/galeria.json", { cache: "no-cache" })
      .then(function (respuesta) {
        if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);
        return respuesta.json();
      });
  }

  cargarDeCloudinary()
    .then(function (lista) {
      return lista.length ? lista : cargarDeArchivo();
    })
    .then(function (lista) {
      grid.innerHTML = "";
      lista.forEach(function (item) {
        grid.appendChild(crearItem(item));
      });
      estado.hidden = true;
    })
    .catch(function () {
      estado.textContent = "No pudimos cargar la galería en este momento.";
      estado.hidden = false;
    });
})();
