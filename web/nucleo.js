// Reproductor compartido por todas las plantillas. Toca la fuente elegida en el
// inicio (SoundCloud, Mi música o lo que suena en el PC) y conecta los elementos
// que la plantilla tenga (por id): bPlay, bSig, bAnt, bStop, barra, tiempo,
// volumen, titulo, artista, caratula, lista. Requiere hls.min.js.
"use strict";
const R = (() => {
  const $ = (id) => document.getElementById(id);
  const q = new URLSearchParams(location.search);
  const fuente = q.get("fuente") || sessionStorage.getItem("fuente") || "soundcloud";
  const carpeta = q.get("carpeta") || sessionStorage.getItem("carpeta") || "";
  sessionStorage.setItem("fuente", fuente);
  if (carpeta) sessionStorage.setItem("carpeta", carpeta);
  const api = () => window.pywebview.api;

  const audio = document.createElement("audio");
  audio.crossOrigin = "anonymous";
  const pistas = [];
  let actual = 0, hls = null, ctx = null, analizador = null, frec = null, onda = null, pedido = 0;
  let listaLista;   // se cumple cuando la lista de temas terminó de cargar
  const listo = new Promise(r => { listaLista = r; });
  const avisos = [];
  const fmt = (s) => isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";
  const poner = (id, texto) => { const e = $(id); if (e) e.textContent = texto; };
  const avisar = (msg) => poner("artista", msg);

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
    fuenteAudio.connect(analizador); analizador.connect(ctx.destination);
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
    iniciarAudio();
    if (ctx.state === "suspended") ctx.resume();
    actual = (i + pistas.length) % pistas.length;
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

  // ---- Lo que suena en el PC: no hay audio propio; Windows informa y se captura el sonido ----
  let pcEstado = { sonando: false, posicion: 0, duracion: 0 }, pcVisto = 0, pcEspectro = new Uint8Array(512);
  async function vigilarPc() {
    const e = await api().pc_estado();
    pcVisto = performance.now();
    if (!e.hay) { pcEstado = { sonando: false, posicion: 0, duracion: 0 }; poner("titulo", "Nada sonando"); avisar("Pon música en Spotify o en el navegador"); return; }
    const nuevo = !pistas[0] || pistas[0].titulo !== e.titulo || pistas[0].artista !== e.artista;
    pcEstado = e;
    pistas[0] = { titulo: e.titulo, artista: `${e.artista} · ${e.app}`, caratula: e.caratula, duracion: e.duracion };
    if (nuevo) mostrar(0);
    if ($("bPlay")) $("bPlay").textContent = e.sonando ? "❚❚" : "▶";
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
    if (fuente === "pc") return pcEspectro;
    if (analizador && !audio.paused) { analizador.getByteFrequencyData(frec); return frec; }
    const d = new Uint8Array(512);   // sin música: animación suave
    for (let i = 0; i < 512; i++) d[i] = 40 + 30 * Math.sin(t * 2 + i * 0.05) * Math.exp(-i / 160);
    return d;
  }
  function ondaAudio() {
    if (fuente !== "pc" && analizador && !audio.paused) { analizador.getByteTimeDomainData(onda); return onda; }
    const d = new Uint8Array(1024), e = fuente === "pc" ? energia(pcEspectro, 1, 40) : 0.15;
    for (let i = 0; i < 1024; i++) d[i] = 128 + (20 + e * 90) * Math.sin(t * 3 + i * 0.03) * Math.sin(i * 0.011 + t);
    return d;
  }
  const energia = (d, a, b) => { let s = 0; for (let i = a; i < b; i++) s += d[i]; return s / (b - a) / 255; };
  const progreso = () => {
    if (fuente === "pc") return pcEstado.duracion ? Math.min(1, pcPosicion() / pcEstado.duracion) : 0;
    return isFinite(audio.duration) && audio.duration ? audio.currentTime / audio.duration : 0;
  };
  const tiempoActual = () => fuente === "pc" ? pcPosicion() : audio.currentTime;

  function alternar() {
    if (fuente === "pc") { api().pc_control("alternar").then(vigilarPc); return; }
    if (!audio.getAttribute("src") && !hls) return cargar(actual);
    if (ctx && ctx.state === "suspended") ctx.resume();
    audio.paused ? audio.play() : audio.pause();
  }
  const siguiente = () => fuente === "pc" ? api().pc_control("siguiente").then(() => setTimeout(vigilarPc, 600)) : cargar(actual + 1);
  const anterior = () => fuente === "pc" ? api().pc_control("anterior").then(() => setTimeout(vigilarPc, 600)) : cargar(actual - 1);

  function dibujarLista() {
    const lista = $("lista");
    if (!lista) return;
    lista.innerHTML = "";
    pistas.forEach((p, i) => {
      const f = document.createElement("div");
      f.className = "fila"; f.dataset.i = i;
      const img = document.createElement("img"); img.src = p.caratula || ""; img.alt = "";
      img.onerror = () => { img.style.visibility = "hidden"; };
      const n = document.createElement("span"); n.className = "n"; n.textContent = String(i + 1).padStart(2, "0");
      const nombre = document.createElement("span"); nombre.className = "nombre"; nombre.textContent = p.titulo;
      const dur = document.createElement("span"); dur.className = "dur"; dur.textContent = fmt(p.duracion);
      f.append(img, n, nombre, dur);
      if (fuente !== "pc") f.addEventListener("click", () => cargar(i));
      lista.appendChild(f);
    });
  }

  async function arrancar() {
    const volver = document.createElement("a");
    volver.href = "index.html"; volver.textContent = "← Plantillas"; volver.title = "Cambiar de plantilla o de fuente";
    volver.style.cssText = "position:fixed;top:10px;right:12px;z-index:99;padding:6px 12px;border-radius:999px;font:12px system-ui;" +
      "color:#fff;text-decoration:none;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.18);opacity:.35;transition:opacity .2s";
    volver.onmouseenter = () => { volver.style.opacity = 1; };
    volver.onmouseleave = () => { volver.style.opacity = .35; };
    document.body.appendChild(volver);

    const on = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); };
    on("bPlay", "click", alternar);
    on("bSig", "click", siguiente);
    on("bAnt", "click", anterior);
    on("bStop", "click", () => { if (fuente === "pc") return; audio.pause(); audio.currentTime = 0; });
    on("volumen", "input", (e) => { audio.volume = e.target.value / 100; });
    on("barra", "input", (e) => { if (fuente !== "pc" && isFinite(audio.duration)) audio.currentTime = e.target.value / 1000 * audio.duration; });
    audio.volume = $("volumen") ? $("volumen").value / 100 : 0.8;
    audio.addEventListener("ended", () => cargar(actual + 1));
    const icono = () => { if ($("bPlay")) $("bPlay").textContent = audio.paused ? "▶" : "❚❚"; };
    audio.addEventListener("play", icono); audio.addEventListener("pause", icono);
    cadaCuadro(() => {
      const d = fuente === "pc" ? pcEstado.duracion : audio.duration;
      if ($("barra")) $("barra").value = Math.round(progreso() * 1000);
      poner("tiempo", `${fmt(tiempoActual())} / ${fmt(d)}`);
    });

    if (fuente === "pc") {
      if ($("volumen")) $("volumen").disabled = true;   // el volumen lo maneja Spotify / el navegador
      vigilarPc(); setInterval(vigilarPc, 1000); escucharPc();
      return;
    }
    avisar("Cargando tus temas…");
    const r = fuente === "musica" ? await api().musica_canciones(carpeta) : await api().soundcloud_likes();
    if (!r.ok) { poner("titulo", "No se pudo cargar"); avisar(r.error); listaLista(); return; }
    pistas.push(...r.pistas);
    listaLista();
    dibujarLista();
    if (pistas.length) mostrar(0); else { poner("titulo", "Lista vacía"); avisar(""); }
  }

  const cuadros = [];
  function cadaCuadro(fn) { cuadros.push(fn); }
  function bucle() { t += 0.016; cuadros.forEach(fn => fn(t)); requestAnimationFrame(bucle); }
  requestAnimationFrame(bucle);

  if (window.pywebview && window.pywebview.api) document.addEventListener("DOMContentLoaded", arrancar);
  else window.addEventListener("pywebviewready", arrancar);

  return {
    audio, pistas, fuente, cargar, alternar, espectro, ondaAudio, energia, fmt, progreso, tiempoActual,
    get actual() { return actual; },
    alCambiar: (fn) => avisos.push(fn),
    cadaCuadro,
    saltarA: (fraccion) => { if (fuente !== "pc" && isFinite(audio.duration)) audio.currentTime = fraccion * audio.duration; },
  };
})();
