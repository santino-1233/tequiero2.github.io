/* =========================================================
   Té Quiero Pastelería - Menú y galería destacados (portada)
   - Menú: lee el mismo Google Sheet que menu.html.
     Si la hoja tiene una columna "destacado" con SI, muestra esos platos.
     Si no, muestra los primeros 6 disponibles.
   - Galería: fotos y videos subidos a Cloudinary (tag "tequiero").
     Si no hay nada, la sección queda oculta.
   Todo se inserta con textContent (sin innerHTML con datos).
   ========================================================= */

(function () {
  "use strict";

  var URL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRsdP4L0QCKGekMlPLynqRv8RJr7KZJZVGf0cmyGDWhOwHmRPri2_yXcpigYOm3JRYvkpKlXPrBNm2e/pub?output=csv";
  var CLOUDINARY = { cloudName: "gb6kfzeo", tag: "tequiero" };
  var CANTIDAD_MENU = 6;
  var CANTIDAD_GALERIA = 6;

  /* ---------- Utilidades ---------- */

  // Parser de CSV que respeta campos entre comillas (igual que menu.js)
  function parsearCSV(texto) {
    var filas = [];
    var fila = [];
    var campo = "";
    var entreComillas = false;

    for (var i = 0; i < texto.length; i++) {
      var c = texto[i];
      var siguiente = texto[i + 1];

      if (entreComillas) {
        if (c === '"' && siguiente === '"') { campo += '"'; i++; }
        else if (c === '"') { entreComillas = false; }
        else { campo += c; }
      } else if (c === '"') {
        entreComillas = true;
      } else if (c === ",") {
        fila.push(campo);
        campo = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && siguiente === "\n") i++;
        fila.push(campo);
        filas.push(fila);
        fila = [];
        campo = "";
      } else {
        campo += c;
      }
    }
    if (campo !== "" || fila.length > 0) {
      fila.push(campo);
      filas.push(fila);
    }
    return filas;
  }

  function filasAObjetos(filas) {
    var encabezados = filas[0] || [];
    return filas.slice(1)
      .filter(function (f) {
        return f.some(function (celda) { return celda.trim() !== ""; });
      })
      .map(function (f) {
        var obj = {};
        encabezados.forEach(function (h, i) {
          obj[h.trim().toLowerCase()] = (f[i] || "").trim();
        });
        return obj;
      });
  }

  function formatearPrecio(valor) {
    var numero = Number(valor);
    if (Number.isNaN(numero)) return valor;
    return "$" + numero.toLocaleString("es-AR");
  }

  /* ---------- Menú destacado ---------- */

  function crearPlato(plato) {
    var tarjeta = document.createElement("article");
    tarjeta.className = "menu-destacado__item";

    var nombre = document.createElement("h3");
    nombre.className = "menu-destacado__nombre";
    nombre.textContent = plato.plato || "";
    tarjeta.appendChild(nombre);

    if (/sin\s*tacc/i.test(plato.plato || "")) {
      var sello = document.createElement("span");
      sello.className = "menu-destacado__sintacc";
      sello.textContent = "Sin TACC";
      tarjeta.appendChild(sello);
    }

    if (plato.descripcion) {
      var desc = document.createElement("p");
      desc.className = "menu-destacado__desc";
      desc.textContent = plato.descripcion;
      tarjeta.appendChild(desc);
    }

    var precio = document.createElement("p");
    precio.className = "menu-destacado__precio";
    precio.textContent = formatearPrecio(plato.precio || "");
    tarjeta.appendChild(precio);

    return tarjeta;
  }

  function elegirPlatos(platos) {
    var disponibles = platos.filter(function (p) {
      return (p.disponible || "").toUpperCase() !== "NO";
    });
    var marcados = disponibles.filter(function (p) {
      return (p.destacado || "").toUpperCase() === "SI";
    });
    var elegidos = marcados.length ? marcados : disponibles;
    return elegidos.slice(0, CANTIDAD_MENU);
  }

  function cargarMenuDestacado() {
    var grid = document.getElementById("menuDestacadoGrid");
    var estado = document.getElementById("menuDestacadoEstado");
    if (!grid || !estado) return;

    fetch(URL_CSV + "&t=" + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (texto) {
        var platos = filasAObjetos(parsearCSV(texto));
        var elegidos = elegirPlatos(platos);
        if (!elegidos.length) {
          estado.textContent = "El menú se está actualizando. Podés verlo completo abajo.";
          return;
        }
        grid.innerHTML = "";
        elegidos.forEach(function (plato) { grid.appendChild(crearPlato(plato)); });
        estado.hidden = true;
      })
      .catch(function (err) {
        console.error(err);
        estado.textContent = "No pudimos cargar el menú. Podés verlo completo abajo.";
      });
  }

  /* ---------- Galería destacada ---------- */

  function pedirLista(tipo) {
    var url = "https://res.cloudinary.com/" + CLOUDINARY.cloudName + "/" + tipo + "/list/" + CLOUDINARY.tag + ".json";
    return fetch(url, { cache: "no-cache" })
      .then(function (res) { return res.ok ? res.json() : { resources: [] }; })
      .then(function (data) {
        return (data.resources || []).map(function (r) {
          r.resource_type = tipo;
          return r;
        });
      })
      .catch(function () { return []; });
  }

  function crearMedia(recurso) {
    var base = "https://res.cloudinary.com/" + CLOUDINARY.cloudName;
    var figura = document.createElement("figure");
    figura.className = "galeria-destacada__item";

    if (recurso.resource_type === "video") {
      figura.classList.add("es-video");
      var img = document.createElement("img");
      img.src = base + "/video/upload/so_0,w_600,h_600,c_fill,f_jpg/" + recurso.public_id + ".jpg";
      img.alt = "Video de Té Quiero Pastelería";
      img.loading = "lazy";
      figura.appendChild(img);
    } else {
      var foto = document.createElement("img");
      foto.src = base + "/image/upload/f_auto,q_auto,c_fill,w_600,h_600/" + recurso.public_id + "." + recurso.format;
      foto.alt = "Foto de Té Quiero Pastelería";
      foto.loading = "lazy";
      figura.appendChild(foto);
    }
    return figura;
  }

  function cargarGaleriaDestacada() {
    var seccion = document.getElementById("galeria-destacada");
    var grid = document.getElementById("galeriaDestacadaGrid");
    if (!seccion || !grid) return;
    if (CLOUDINARY.cloudName.indexOf("TU_") === 0) return;

    Promise.all([pedirLista("image"), pedirLista("video")])
      .then(function (listas) {
        var todos = listas[0].concat(listas[1]);
        if (!todos.length) return;

        todos.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
        grid.innerHTML = "";
        todos.slice(0, CANTIDAD_GALERIA).forEach(function (r) {
          grid.appendChild(crearMedia(r));
        });
        seccion.hidden = false;
      });
  }

  cargarMenuDestacado();
  cargarGaleriaDestacada();
})();
