/* =========================================================
   Té Quiero Pastelería - Panel para subir y borrar fotos/videos
   Storage: Cloudinary, tag "tequiero" (misma cuenta que usa galeria.js).

   - Subir: upload preset SIN firmar (no lleva secretos).
   - Listar: listas públicas por tag (habilitar "Resource list" en Cloudinary).
   - Borrar: firma con API Key + API Secret que se escriben en la página.
     No se guardan en el código.
   ========================================================= */

(function () {
  "use strict";

  // ---- CONFIG: completar con los datos de tu cuenta de Cloudinary ----------
  var CLOUD_NAME = "gb6kfzeo";            // Cloudinary > Settings > Account
  var UPLOAD_PRESET = "Tequiero.secret";  // Settings > Upload > Upload presets (unsigned)
  var TAG = "tequiero";                   // tag que se le pone a cada archivo

  var configurado = CLOUD_NAME.indexOf("TU_") !== 0 && UPLOAD_PRESET.indexOf("TU_") !== 0;
  var BASE = "https://res.cloudinary.com/" + CLOUD_NAME;

  var credenciales = { key: "", secret: "" };

  var dropzone = document.getElementById("dropzone");
  var fileInput = document.getElementById("file-input");
  var list = document.getElementById("upload-list");
  var existingWrap = document.getElementById("existing-photos");
  var galleryStatus = document.getElementById("gallery-status");
  var formCredenciales = document.getElementById("credenciales");
  var estadoCredenciales = document.getElementById("estado-credenciales");

  if (!configurado) document.getElementById("avisoConfig").hidden = false;

  /* ---------- Subida ---------- */

  ["dragenter", "dragover"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });
  dropzone.addEventListener("drop", function (e) {
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener("change", function () {
    if (fileInput.files.length) uploadFiles(fileInput.files);
    fileInput.value = "";
  });

  function uploadFiles(files) {
    if (!configurado) {
      alert("Falta configurar Cloudinary en js/subir.js.");
      return;
    }
    Array.prototype.forEach.call(files, uploadFile);
  }

  function uploadFile(file) {
    var esVideo = file.type.indexOf("video") === 0;
    var item = crearItem(URL.createObjectURL(file), esVideo ? "video" : "imagen");
    item.querySelector(".status").textContent = "Subiendo...";
    list.prepend(item);

    var formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("tags", TAG);

    // "auto" acepta fotos y videos
    fetch("https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/auto/upload", {
      method: "POST",
      body: formData
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.secure_url) throw new Error((data.error && data.error.message) || "Error al subir");
        item.classList.add("done");
        // Cloudinary tarda unos segundos en reflejarlo en la lista
        window.setTimeout(loadGallery, 4000);
      })
      .catch(function (err) {
        item.classList.add("error");
        var status = item.querySelector(".status");
        if (status) status.textContent = "Error: " + err.message;
        console.error(err);
      });
  }

  /* ---------- Tarjetas ---------- */

  // Una tarjeta. Si tiene publicId es de la lista (muestra borrar);
  // si no, es una subida en curso (muestra estado).
  function crearItem(src, tipo, publicId, resourceType) {
    var item = document.createElement("div");
    item.className = "upload-item" + (publicId ? " done" : "");

    var medio;
    if (tipo === "video") {
      medio = document.createElement("video");
      medio.src = src;
      medio.muted = true;
      medio.playsInline = true;
      medio.preload = "metadata";
    } else {
      medio = document.createElement("img");
      medio.src = src;
      medio.alt = "Archivo de Té Quiero";
      medio.loading = "lazy";
    }
    item.appendChild(medio);

    if (!publicId) {
      var status = document.createElement("div");
      status.className = "status";
      item.appendChild(status);
    } else {
      var borrar = document.createElement("button");
      borrar.type = "button";
      borrar.className = "delete-btn";
      borrar.setAttribute("aria-label", "Borrar archivo");
      borrar.title = "Borrar archivo";
      borrar.textContent = "✕";
      borrar.addEventListener("click", function () {
        deleteFile(publicId, resourceType, item);
      });
      item.appendChild(borrar);
    }

    return item;
  }

  /* ---------- Listado ---------- */

  function pedirLista(tipo) {
    return fetch(BASE + "/" + tipo + "/list/" + TAG + ".json", { cache: "no-cache" })
      .then(function (res) { return res.ok ? res.json() : { resources: [] }; })
      .then(function (data) {
        return (data.resources || []).map(function (r) {
          r.resource_type = tipo;
          return r;
        });
      });
  }

  function loadGallery() {
    if (!configurado) {
      galleryStatus.textContent = "Configurá Cloudinary para ver los archivos.";
      return;
    }
    Promise.all([pedirLista("image"), pedirLista("video")])
      .then(function (listas) {
        var todos = listas[0].concat(listas[1]);
        todos.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });

        existingWrap.innerHTML = "";
        if (!todos.length) {
          galleryStatus.textContent = "Todavía no hay archivos subidos.";
          return;
        }
        galleryStatus.textContent = todos.length + " archivo(s) subido(s):";

        todos.forEach(function (r) {
          // Fotos: la imagen misma. Videos: miniatura (primer fotograma en JPG)
          var src = r.resource_type === "video"
            ? BASE + "/video/upload/so_0,w_300,h_300,c_fill,f_jpg/" + r.public_id + ".jpg"
            : BASE + "/image/upload/f_auto,q_auto,c_fill,w_300,h_300/" + r.public_id + "." + r.format;
          existingWrap.appendChild(crearItem(src, "imagen", r.public_id, r.resource_type));
        });
      })
      .catch(function (err) {
        galleryStatus.textContent = "No se pudieron cargar los archivos. Revisá 'Resource list' en Cloudinary.";
        console.error(err);
      });
  }

  /* ---------- Borrado (firmado) ---------- */

  formCredenciales.addEventListener("submit", function (e) {
    e.preventDefault();
    credenciales.key = document.getElementById("api-key").value.trim();
    credenciales.secret = document.getElementById("api-secret").value.trim();
    document.getElementById("api-secret").value = "";
    estadoCredenciales.textContent = credenciales.key && credenciales.secret
      ? "Borrado activado para esta pestaña."
      : "Completá los dos campos.";
  });

  async function sha1Hex(texto) {
    var bytes = new TextEncoder().encode(texto);
    var hash = await crypto.subtle.digest("SHA-1", bytes);
    return Array.prototype.map.call(new Uint8Array(hash), function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
  }

  async function deleteFile(publicId, resourceType, item) {
    if (!credenciales.key || !credenciales.secret) {
      alert("Primero activá el borrado con la API Key y el API Secret.");
      return;
    }
    if (!confirm("¿Borrar este archivo? No se puede deshacer.")) return;

    item.style.opacity = "0.4";
    var timestamp = Math.floor(Date.now() / 1000);
    var firma = await sha1Hex("public_id=" + publicId + "&timestamp=" + timestamp + credenciales.secret);

    var formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("timestamp", timestamp);
    formData.append("api_key", credenciales.key);
    formData.append("signature", firma);

    try {
      var res = await fetch(
        "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/" + resourceType + "/destroy",
        { method: "POST", body: formData }
      );
      var data = await res.json();
      if (data.result === "ok") {
        item.remove();
      } else {
        item.style.opacity = "1";
        alert("No se pudo borrar: " + (data.result || (data.error && data.error.message) || "error"));
      }
    } catch (err) {
      item.style.opacity = "1";
      alert("Error de conexión al borrar.");
      console.error(err);
    }
  }

  loadGallery();
})();
