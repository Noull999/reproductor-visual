// Reproductor compartido por todas las plantillas. Toca la fuente elegida en el
// inicio (Spotify, SoundCloud, Mi música o lo que suena en el PC) y conecta los
// elementos que la plantilla tenga (por id): bPlay, bSig, bAnt, bStop, barra, tiempo,
// volumen, iconoVol, titulo, artista, caratula, lista. Requiere hls.min.js.
"use strict";
const R = (() => {
  const $ = (id) => document.getElementById(id);
  const q = new URLSearchParams(location.search);
  const fuente = q.get("fuente") || sessionStorage.getItem("fuente") || "soundcloud";
  const carpeta = q.get("carpeta") || sessionStorage.getItem("carpeta") || "";   // en Spotify: la lista elegida
  sessionStorage.setItem("fuente", fuente);
  if (carpeta) sessionStorage.setItem("carpeta", carpeta);
  const api = () => window.pywebview.api;
  // "remoto": el audio no sale de esta página (lo toca Spotify o la app del PC) y los visuales usan la captura del PC
  const remoto = fuente === "pc" || fuente === "spotify";
  const spotify = fuente === "spotify";
  const mudoForzado = q.get("mudo") === "1";   // vista previa: los visuales siguen el audio pero no suena nada
  const listaSpotify = /^[A-Za-z0-9_-]+$/.test(carpeta) ? carpeta : "me-gusta";   // ids de Spotify; cualquier otra cosa (una ruta) = likes

  const audio = document.createElement("audio");
  audio.crossOrigin = "anonymous";
  const pistas = [];
  let volumenActual = 0.8, salida = null;
  let actual = 0, hls = null, ctx = null, analizador = null, frec = null, onda = null, pedido = 0;
  let listaLista;   // se cumple cuando la lista de temas terminó de cargar
  const listo = new Promise(r => { listaLista = r; });
  const avisos = [];
  const fmt = (s) => isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";
  const poner = (id, texto) => { const e = $(id); if (e) e.textContent = texto; };
  const avisar = (msg) => poner("artista", msg);
  const icono = (sonando) => { if ($("bPlay")) $("bPlay").textContent = sonando ? "❚❚" : "▶"; };

  function mostrar(i) {
    const p = pistas[i];
    if (!p) return;
    poner("titulo", p.titulo);
    poner("artista", p.artista);
    if ($("caratula")) $("caratula").src = p.caratula || "";
    document.querySelectorAll("#lista [data-i]").forEach(f => f.classList.toggle("sonando", +f.dataset.i === i));
    avisos.forEach(fn => fn(p, i));
  }

  function iniciarAudio() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const fuenteAudio = ctx.createMediaElementSource(audio);
    analizador = ctx.createAnalyser();
    analizador.fftSize = 1024;
    analizador.smoothingTimeConstant = 0.8;
    // El volumen va DESPUÉS del analizador: así los visuales siguen viendo la música completa aunque la silencies
    salida = ctx.createGain(); salida.gain.value = mudoForzado ? 0 : volumenActual;
    fuenteAudio.connect(analizador); analizador.connect(salida); salida.connect(ctx.destination);
    frec = new Uint8Array(analizador.frequencyBinCount);
    onda = new Uint8Array(analizador.fftSize);
  }

  function tocar(url, esHls) {
    if (hls) { hls.destroy(); hls = null; }
    if (esHls && !audio.canPlayType("application/vnd.apple.mpegurl") && window.Hls && Hls.isSupported()) {
      hls = new Hls(); hls.loadSource(url); hls.attachMedia(audio);
      hls.on(Hls.Events.ERROR, (_, e) => { if (e.fatal) avisar("No se pudo reproducir este tema"); });
    } else {
      audio.src = url;
    }
    audio.play().catch(() => {});
  }

  async function cargar(i) {
    if (fuente === "pc") return;
    await listo;   // un play antes de que cargue la lista no se pierde
    if (!pistas.length) return;
    actual = (i + pistas.length) % pistas.length;
    if (spotify) {
      mostrar(actual);
      ignorarHasta = performance.now() + 3000;   // que el sondeo no vuelva a mostrar el tema anterior mientras Spotify cambia
      const r = await api().spotify_tocar(listaSpotify, actual);
      if (!r.ok) { ignorarHasta = 0; avisar(r.error); }
      else { spUri = ""; pcEstado = { ...pcEstado, sonando: true, posicion: 0, duracion: pistas[actual].duracion }; pcVisto = performance.now(); icono(true); setTimeout(vigilarSpotify, 3200); }
      return;
    }
    iniciarAudio();
    if (ctx.state === "suspended") ctx.resume();
    const p = pistas[actual], este = ++pedido;
    mostrar(actual);
    if (fuente === "soundcloud") {
      if (p.onda_url && !p.onda) api().soundcloud_onda(p.onda_url).then(o => { p.onda = o; if (este === pedido) mostrar(actual); });
      avisar("Cargando…");
      // El enlace se pide ahora: SoundCloud anula los viejos. Si falla, un reintento.
      let r = await api().soundcloud_stream(p.url);
      if (!r.ok) r = await api().soundcloud_stream(p.url);
      if (este !== pedido) return;   // mientras tanto eligió otro tema
      if (!r.ok) { avisar(r.error || "SoundCloud no entregó este tema"); return; }
      poner("artista", p.artista);
      tocar(r.url, r.hls);
    } else {
      tocar(p.url, false);
    }
  }

  // ---- Fuentes "remotas": el estado llega de Windows (PC) o de la API de Spotify ----
  let pcEstado = { sonando: false, posicion: 0, duracion: 0 }, pcVisto = 0, pcEspectro = new Uint8Array(512), spUri = "";
  async function vigilarPc() {
    const e = await api().pc_estado();
    pcVisto = performance.now();
    if (!e.hay) { pcEstado = { sonando: false, posicion: 0, duracion: 0 }; poner("titulo", "Nada sonando"); avisar("Pon música en Spotify o en el navegador"); return; }
    const nuevo = !pistas[0] || pistas[0].titulo !== e.titulo || pistas[0].artista !== e.artista;
    pcEstado = e;
    pistas[0] = { titulo: e.titulo, artista: `${e.artista} · ${e.app}`, caratula: e.caratula, duracion: e.duracion };
    if (nuevo) mostrar(0);
    icono(e.sonando);
  }
  let volumenInicial = false;
  // El estado de Spotify sale de Windows (gratis): la API de Spotify tiene un límite de uso bajo y no se gasta en sondeos
  const norm = (t) => (t || "").toLowerCase().replace(/\s+/g, " ").trim();
  let ignorarHasta = 0;
  async function vigilarSpotify() {
    const e = await api().pc_estado();
    if (performance.now() < ignorarHasta) return;   // acaba de pedirse otro tema: Windows tarda un momento en enterarse
    pcVisto = performance.now();
    if (!e.hay || !/spotify/i.test(e.app || "")) { pcEstado = { sonando: false, posicion: 0, duracion: 0 }; icono(false); if (!pistas.length) avisar("Abre Spotify y pon música"); return; }
    pcEstado = e;
    const clave = e.titulo + "|" + e.artista;
    if (clave !== spUri) {
      spUri = clave;
      const primero = norm((e.artista || "").split(",")[0]);
      const i = pistas.findIndex(p => norm(p.titulo) === norm(e.titulo) && norm(p.artista).includes(primero));
      if (i >= 0) { actual = i; mostrar(i); }
      else {   // suena algo que no está en esta lista (por ejemplo una radio): se muestra igual
        poner("titulo", e.titulo); poner("artista", e.artista);
        if ($("caratula")) $("caratula").src = e.caratula || "";
        document.querySelectorAll("#lista [data-i]").forEach(f => f.classList.remove("sonando"));
        avisos.forEach(fn => fn({ titulo: e.titulo, artista: e.artista, caratula: e.caratula, duracion: e.duracion }, -1));
      }
    }
    icono(e.sonando);
  }
  async function escucharPc() {
    const r = await api().pc_espectro();
    pcEspectro = Uint8Array.from(r.espectro);
    setTimeout(escucharPc, 33);
  }
  const pcPosicion = () => pcEstado.posicion + (pcEstado.sonando ? (performance.now() - pcVisto) / 1000 : 0);

  // ---- Lo que las plantillas leen ----
  let t = 0;
  function espectro() {
    if (remoto) return pcEspectro;
    if (analizador && !audio.paused) { analizador.getByteFrequencyData(frec); return frec; }
    const d = new Uint8Array(512);   // sin música: animación suave
    for (let i = 0; i < 512; i++) d[i] = 40 + 30 * Math.sin(t * 2 + i * 0.05) * Math.exp(-i / 160);
    return d;
  }
  function ondaAudio() {
    if (!remoto && analizador && !audio.paused) { analizador.getByteTimeDomainData(onda); return onda; }
    const d = new Uint8Array(1024), e = remoto ? energia(pcEspectro, 1, 40) : 0.15;
    for (let i = 0; i < 1024; i++) d[i] = 128 + (20 + e * 90) * Math.sin(t * 3 + i * 0.03) * Math.sin(i * 0.011 + t);
    return d;
  }
  const energia = (d, a, b) => { let s = 0; for (let i = a; i < b; i++) s += d[i]; return s / (b - a) / 255; };
  const progreso = () => {
    if (remoto) return pcEstado.duracion ? Math.min(1, pcPosicion() / pcEstado.duracion) : 0;
    return isFinite(audio.duration) && audio.duration ? audio.currentTime / audio.duration : 0;
  };
  const tiempoActual = () => remoto ? pcPosicion() : audio.currentTime;

  function alternar() {
    if (fuente === "pc") { api().pc_control("alternar").then(vigilarPc); return; }
    if (spotify) {
      const sonaba = pcEstado.sonando;
      pcEstado = { ...pcEstado, posicion: pcPosicion(), sonando: !sonaba }; pcVisto = performance.now(); icono(!sonaba);   // respuesta inmediata
      api().pc_control("alternar").then(() => setTimeout(vigilarSpotify, 700));   // tecla multimedia: no gasta la cuota de Spotify
      return;
    }
    if (!audio.getAttribute("src") && !hls) return cargar(actual);
    if (ctx && ctx.state === "suspended") ctx.resume();
    audio.paused ? audio.play() : audio.pause();
  }
  const salto = (accion) => {
    if (fuente === "pc") return api().pc_control(accion).then(() => setTimeout(vigilarPc, 600));
    return api().pc_control(accion).then(() => setTimeout(vigilarSpotify, 900));   // spotify: también por teclas multimedia
  };
  const siguiente = () => remoto ? salto("siguiente") : cargar(actual + 1);
  const anterior = () => remoto ? salto("anterior") : cargar(actual - 1);
  const saltarA = (fraccion) => {
    if (spotify) { if (pcEstado.duracion) { pcEstado = { ...pcEstado, posicion: fraccion * pcEstado.duracion }; pcVisto = performance.now(); api().spotify_seek(fraccion * pcEstado.duracion); } }
    else if (!remoto && isFinite(audio.duration)) audio.currentTime = fraccion * audio.duration;
  };

  // ---- Volumen: barra, silencio con un clic en el ícono y % al moverla ----
  let volAntes = 0, esperaVol = 0;
  function aplicarVolumen(v) {
    volumenActual = v / 100;
    if (salida && !mudoForzado) salida.gain.value = volumenActual;
    if (spotify) { clearTimeout(esperaVol); esperaVol = setTimeout(() => api().spotify_volumen(v), 250); }
  }
  function silenciar() {
    const barra = $("volumen"); if (!barra || barra.disabled) return;
    if (+barra.value > 0) { volAntes = +barra.value; barra.value = 0; } else barra.value = volAntes || 60;
    barra.dispatchEvent(new Event("input"));
  }

  function dibujarLista() {
    const lista = $("lista");
    if (!lista) return;
    lista.innerHTML = "";
    pistas.forEach((p, i) => {
      const f = document.createElement("div");
      f.className = "fila"; f.dataset.i = i;
      const img = document.createElement("img"); img.src = p.caratula || ""; img.alt = ""; img.loading = "lazy";
      img.onerror = () => { img.style.visibility = "hidden"; };
      const n = document.createElement("span"); n.className = "n"; n.textContent = String(i + 1).padStart(2, "0");
      const nombre = document.createElement("span"); nombre.className = "nombre"; nombre.textContent = p.titulo;
      const dur = document.createElement("span"); dur.className = "dur"; dur.textContent = fmt(p.duracion);
      f.append(img, n, nombre, dur);
      if (fuente !== "pc") f.addEventListener("click", () => cargar(i));
      lista.appendChild(f);
    });
    // Al final de cada lista: aire y un desvanecido para que la última fila no quede cortada
    lista.style.paddingBottom = "16px";
    lista.style.maskImage = lista.style.webkitMaskImage = "linear-gradient(to bottom, #000 calc(100% - 28px), transparent)";
  }

  // "← Plantillas": contraste legible por defecto (:where no pesa: cada plantilla lo pisa con .volver)
  function botonVolver() {
    const estilo = document.createElement("style");
    estilo.textContent = `:where(a.volver){position:fixed;top:10px;right:12px;z-index:99;padding:7px 14px;border-radius:999px;
      font:12px system-ui;color:#fff;text-decoration:none;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.3);
      opacity:.7;transition:opacity .2s;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
      :where(a.volver):hover{opacity:1}
      /* Modo "solo visual": sin mover el mouse, lo marcado como .ocultable se desvanece */
      .ocultable{transition:opacity .6s}
      body.inactivo{cursor:none}
      body.inactivo .ocultable,body.inactivo a.volver{opacity:0 !important;pointer-events:none}`;
    document.head.appendChild(estilo);
    const volver = document.createElement("a");
    volver.className = "volver"; volver.href = "index.html"; volver.textContent = "← Plantillas"; volver.title = "Cambiar de plantilla o de fuente";
    document.body.appendChild(volver);
  }

  async function arrancar() {
    botonVolver();
    const on = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); };
    on("bPlay", "click", alternar);
    on("bSig", "click", siguiente);
    on("bAnt", "click", anterior);
    on("bStop", "click", () => { if (fuente === "pc") return; if (spotify) { if (pcEstado.sonando) alternar(); return; } audio.pause(); audio.currentTime = 0; });
    on("volumen", "input", (e) => { aplicarVolumen(+e.target.value); e.target.title = `Volumen ${e.target.value}%`; });
    on("iconoVol", "click", silenciar);
    if ($("iconoVol")) $("iconoVol").title = "Silenciar";
    // Spotify: se adelanta al soltar (no una orden por cada pixel que se arrastra)
    on("barra", spotify ? "change" : "input", (e) => { if (!remoto || spotify) saltarA(e.target.value / 1000); });
    volumenActual = $("volumen") ? $("volumen").value / 100 : 0.8;
    audio.addEventListener("ended", () => cargar(actual + 1));
    const alAudio = () => { if (!remoto) icono(!audio.paused); };
    audio.addEventListener("play", alAudio); audio.addEventListener("pause", alAudio);
    let arrastrando = false;
    on("barra", "pointerdown", () => { arrastrando = true; });
    addEventListener("pointerup", () => { arrastrando = false; });
    // Solo visual: 3 s sin mover el mouse mientras suena. La tecla H lo activa o desactiva.
    let ultimoMovimiento = performance.now(), soloVisual = !mudoForzado;   // en la vista previa la interfaz debe verse
    try { if (!mudoForzado) soloVisual = localStorage.getItem("solo-visual") !== "0"; } catch (e) {}
    const moverMouse = () => { ultimoMovimiento = performance.now(); document.body.classList.remove("inactivo"); };
    ["mousemove", "pointerdown", "wheel", "keydown"].forEach(ev => addEventListener(ev, moverMouse, { passive: true }));
    addEventListener("keydown", (e) => {
      if ((e.key === "h" || e.key === "H") && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        soloVisual = !soloVisual;
        try { localStorage.setItem("solo-visual", soloVisual ? "1" : "0"); } catch (err) {}
      }
    });
    cadaCuadro(() => {
      const sonando = remoto ? pcEstado.sonando : !audio.paused;
      document.body.classList.toggle("inactivo", soloVisual && sonando && performance.now() - ultimoMovimiento > 3000);
    });
    cadaCuadro(() => {
      const d = remoto ? pcEstado.duracion : audio.duration;
      if ($("barra") && !arrastrando) $("barra").value = Math.round(progreso() * 1000);
      poner("tiempo", `${fmt(tiempoActual())} / ${fmt(d)}`);
    });

    if (fuente === "pc") {
      if ($("volumen")) $("volumen").disabled = true;   // el volumen lo maneja la otra app
      vigilarPc(); setInterval(vigilarPc, 1000); escucharPc();
      return;
    }
    avisar("Cargando tus temas…");
    if (spotify) escucharPc();   // los visuales no esperan a la lista
    const r = fuente === "musica" ? await api().musica_canciones(carpeta)
      : spotify ? await api().spotify_canciones(listaSpotify) : await api().soundcloud_likes();
    if (!r.ok) { poner("titulo", "No se pudo cargar"); avisar(r.error); listaLista(); return; }
    pistas.push(...r.pistas);
    listaLista();
    dibujarLista();
    if (spotify) {
      avisar("Elige un tema de la lista");
      vigilarSpotify(); setInterval(vigilarSpotify, 1000);
    } else if (pistas.length) mostrar(0);
    else { poner("titulo", "Lista vacía"); avisar(""); }
  }

  const cuadros = [];
  function cadaCuadro(fn) { cuadros.push(fn); }
  function bucle() { t += 0.016; cuadros.forEach(fn => fn(t)); requestAnimationFrame(bucle); }
  requestAnimationFrame(bucle);

  if (window.pywebview && window.pywebview.api) document.addEventListener("DOMContentLoaded", arrancar);
  else window.addEventListener("pywebviewready", arrancar);

  return {
    audio, pistas, fuente, cargar, alternar, espectro, ondaAudio, energia, fmt, progreso, tiempoActual, saltarA,
    get actual() { return actual; },
    alCambiar: (fn) => avisos.push(fn),
    cadaCuadro,
  };
})();
