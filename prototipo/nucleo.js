// Reproductor compartido por todas las plantillas: lista de temas, streaming,
// botones y análisis del audio. Cada plantilla solo pone su diseño y conecta
// los elementos que tenga (por id): bPlay, bSig, bAnt, bStop, barra, tiempo,
// volumen, titulo, artista, caratula, lista. Requiere hls.min.js y pistas.js.
"use strict";
const R = (() => {
  const $ = (id) => document.getElementById(id);
  const audio = document.createElement("audio");
  audio.crossOrigin = "anonymous";
  const pistas = window.PISTAS || [];
  let actual = 0, hls = null, ctx = null, analizador = null, frec = null, onda = null;
  const avisos = [];   // funciones que se llaman al cambiar de tema
  const fmt = (s) => isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";

  function poner(id, texto) { const e = $(id); if (e) e.textContent = texto; }
  function avisar(msg) { poner("artista", msg); }

  function mostrar(i) {
    const p = pistas[i];
    poner("titulo", p.titulo);
    poner("artista", p.artista);
    if ($("caratula")) $("caratula").src = p.caratula || "";
    document.querySelectorAll("#lista [data-i]").forEach(f => f.classList.toggle("sonando", +f.dataset.i === i));
    avisos.forEach(fn => fn(p, i));
  }

  function iniciarAudio() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const fuente = ctx.createMediaElementSource(audio);
    analizador = ctx.createAnalyser();
    analizador.fftSize = 1024;
    analizador.smoothingTimeConstant = 0.8;
    fuente.connect(analizador); analizador.connect(ctx.destination);
    frec = new Uint8Array(analizador.frequencyBinCount);
    onda = new Uint8Array(analizador.fftSize);
  }

  function cargar(i) {
    if (!pistas.length) return;
    iniciarAudio();
    if (ctx.state === "suspended") ctx.resume();
    actual = (i + pistas.length) % pistas.length;
    const p = pistas[actual];
    mostrar(actual);
    if (hls) { hls.destroy(); hls = null; }
    if (p.hls && !audio.canPlayType("application/vnd.apple.mpegurl") && window.Hls && Hls.isSupported()) {
      hls = new Hls(); hls.loadSource(p.url); hls.attachMedia(audio);
      hls.on(Hls.Events.ERROR, (_, e) => { if (e.fatal) avisar("El enlace venció: corre actualizar_pistas.py"); });
    } else {
      audio.src = p.url;
    }
    audio.play().catch(() => {});
  }

  function alternar() {
    if (!audio.getAttribute("src") && !hls) return cargar(actual);
    if (ctx && ctx.state === "suspended") ctx.resume();
    audio.paused ? audio.play() : audio.pause();
  }

  // Sin música (o en pausa): una animación suave, para que la plantilla no quede muerta.
  let t = 0;
  function espectro() {
    if (analizador && !audio.paused) { analizador.getByteFrequencyData(frec); return frec; }
    const d = new Uint8Array(512);
    for (let i = 0; i < 512; i++) d[i] = 40 + 30 * Math.sin(t * 2 + i * 0.05) * Math.exp(-i / 160);
    return d;
  }
  function ondaAudio() {
    if (analizador && !audio.paused) { analizador.getByteTimeDomainData(onda); return onda; }
    const d = new Uint8Array(1024);
    for (let i = 0; i < 1024; i++) d[i] = 128 + 20 * Math.sin(t * 3 + i * 0.03);
    return d;
  }
  const energia = (d, a, b) => { let s = 0; for (let i = a; i < b; i++) s += d[i]; return s / (b - a) / 255; };

  // ---- Conectar lo que la plantilla tenga ----
  function conectar() {
    const on = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); };
    on("bPlay", "click", alternar);
    on("bSig", "click", () => cargar(actual + 1));
    on("bAnt", "click", () => cargar(actual - 1));
    on("bStop", "click", () => { audio.pause(); audio.currentTime = 0; });
    on("volumen", "input", (e) => { audio.volume = e.target.value / 100; });
    on("barra", "input", (e) => { if (isFinite(audio.duration)) audio.currentTime = e.target.value / 1000 * audio.duration; });
    audio.volume = $("volumen") ? $("volumen").value / 100 : 0.8;
    audio.addEventListener("ended", () => cargar(actual + 1));
    audio.addEventListener("error", () => avisar("El enlace venció: corre actualizar_pistas.py"));
    const icono = () => { if ($("bPlay")) $("bPlay").textContent = audio.paused ? "▶" : "❚❚"; };
    audio.addEventListener("play", icono); audio.addEventListener("pause", icono);
    audio.addEventListener("timeupdate", () => {
      if ($("barra") && isFinite(audio.duration)) $("barra").value = Math.round(audio.currentTime / audio.duration * 1000);
      poner("tiempo", `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`);
    });

    const lista = $("lista");
    if (lista) pistas.forEach((p, i) => {
      const f = document.createElement("div");
      f.className = "fila"; f.dataset.i = i;
      f.innerHTML = `<img src="${p.caratula}" alt=""><span class="n">${String(i + 1).padStart(2, "0")}</span>` +
        `<span class="nombre"></span><span class="dur">${fmt(p.duracion)}</span>`;
      f.querySelector(".nombre").textContent = p.titulo;   // textContent: los títulos vienen de SoundCloud
      f.addEventListener("click", () => cargar(i));
      lista.appendChild(f);
    });

    if (pistas.length) mostrar(0); else avisar("Sin temas: corre actualizar_pistas.py");
  }

  // Un solo bucle de animación para toda la plantilla.
  const cuadros = [];
  function bucle() {
    t += 0.016;
    cuadros.forEach(fn => fn(t));
    requestAnimationFrame(bucle);
  }

  document.addEventListener("DOMContentLoaded", () => { conectar(); requestAnimationFrame(bucle); });

  return {
    audio, pistas, cargar, alternar, espectro, ondaAudio, energia, fmt,
    get actual() { return actual; },
    alCambiar: (fn) => avisos.push(fn),
    cadaCuadro: (fn) => cuadros.push(fn),
    progreso: () => isFinite(audio.duration) && audio.duration ? audio.currentTime / audio.duration : 0,
    saltarA: (fraccion) => { if (isFinite(audio.duration)) audio.currentTime = fraccion * audio.duration; },
  };
})();
