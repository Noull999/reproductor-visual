// Módulos de libre.html: la cabeza de Headspace y el equipo de 2000s convertidos en piezas que se pueden mover,
// estirar y combinar. Cada uno conecta los mismos elementos que usa nucleo.js (por id) y se escala solo.
"use strict";
const Modulos = (() => {
  const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const luz = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Escala el módulo (de tamaño fijo) para que quepa centrado en el recuadro de la pieza
  function ajustar(caja, raiz) {
    const f = () => {
      const s = Math.min(caja.clientWidth / raiz.offsetWidth, caja.clientHeight / raiz.offsetHeight) || 0.01;
      raiz.style.transform = `translate(-50%, -50%) scale(${s})`;
    };
    new ResizeObserver(f).observe(caja); requestAnimationFrame(f);
  }
  function cargar(src, listo) {
    if (!src) return listo(null);
    const i = new Image(); i.crossOrigin = "anonymous";
    i.onload = () => listo(i); i.onerror = () => { if (i.crossOrigin) { const j = new Image(); j.onload = () => listo(j); j.onerror = () => listo(null); j.src = src; } else listo(null); }; i.src = src;
  }

  // ===== Cabeza (Headspace) =====
  const COLORES = {
    Lima: { filtro: "", led: "#8dff4a", gel: "#9be22a" }, Chicle: { filtro: "hue-rotate(235deg) saturate(1.1)", led: "#ff6ad5", gel: "#ff7ad9" },
    Cielo: { filtro: "hue-rotate(115deg)", led: "#5ad1ff", gel: "#6cc8ff" }, Mandarina: { filtro: "hue-rotate(-50deg) saturate(1.15)", led: "#ffb03a", gel: "#ff9a2a" },
    Cromo: { filtro: "saturate(0) brightness(1.1) contrast(1.05)", led: "#e8f0ff", gel: "#c9d3dc" },
  };
  const CUERPOS = { Y2K: "img/headspace/y2k.webp", Gel: "img/headspace/gel.webp" };
  const ubicar = (el, [x, y, w, h]) => Object.assign(el.style, { left: x + "%", top: y + "%", width: w + "%", height: h + "%" });

  function cabeza(op, caja) {
    const c = COLORES[op.color] || COLORES.Lima, propio = Props.leer("headspace").cuerpo;
    let imagen = CUERPOS[op.cuerpo] || CUERPOS.Y2K, zonas = Props.ZONAS_HEADSPACE, filtro = c.filtro;
    if (op.cuerpo === "Propio" && propio && propio.imagen) { imagen = propio.imagen; zonas = propio.zonas || zonas; filtro = ""; }
    const r = document.createElement("div"); r.className = "m-cab"; r.style.setProperty("--led", c.led); r.style.setProperty("--gel", c.gel);
    r.innerHTML = `<div class="cb" style="filter:${filtro} drop-shadow(0 18px 30px rgba(0,0,0,.6))"><img src="${imagen}" alt=""></div>
      <div class="zona m-pantalla"><canvas class="visor"></canvas><div class="cab"><img id="caratula" alt=""><div class="txt"><div id="titulo">—</div><div id="artista"></div></div></div><div id="tiempo">0:00 / 0:00</div></div>
      <div class="zona m-botones"><button id="bAnt" class="gel" title="Anterior">&#x23EE;&#xFE0E;</button><button id="bPlay" class="gel" title="Play / pausa">▶</button><button id="bSig" class="gel" title="Siguiente">&#x23ED;&#xFE0E;</button></div>
      <div class="zona m-barra"><input id="barra" type="range" min="0" max="1000" value="0" title="Avance"></div>
      <div class="zona boca">${'<i></i>'.repeat(12)}</div>`;
    ubicar(r.querySelector(".m-pantalla"), zonas.pantalla); ubicar(r.querySelector(".m-botones"), zonas.botones); ubicar(r.querySelector(".m-barra"), zonas.barra); ubicar(r.querySelector(".boca"), zonas.boca);
    r.querySelectorAll(".boca i").forEach((s, i) => { if (i > 8) s.className = "alto"; });
    const ojos = zonas.ojos.map(z => { const e = document.createElement("div"); e.className = "zona ojo"; ubicar(e, z); r.appendChild(e); return e; });
    const anillos = zonas.parlantes.map(z => { const e = document.createElement("div"); e.className = "zona anillo"; ubicar(e, z); r.appendChild(e); return e; });
    caja.appendChild(r); ajustar(caja, r);
    const car = r.querySelector("#caratula"); car.onerror = () => { car.style.visibility = "hidden"; }; car.onload = () => { car.style.visibility = "visible"; };
    const visor = r.querySelector(".visor"), vg = visor.getContext("2d"), picos = new Array(30).fill(0), seg = r.querySelectorAll(".boca i");
    const titulo = r.querySelector("#titulo");
    R.alCambiar(() => requestAnimationFrame(() => {   // el título solo se desplaza si no cabe
      const sobra = titulo.scrollWidth - titulo.parentElement.clientWidth;
      titulo.classList.remove("largo"); titulo.style.setProperty("--mov", "0px");
      if (sobra > 2) { titulo.style.setProperty("--mov", `-${sobra + 8}px`); void titulo.offsetWidth; titulo.classList.add("largo"); }
    }));
    R.cadaCuadro(() => {
      const d = R.espectro(), medio = R.energia(d, 8, 60), bajo = R.energia(d, 1, 8);
      const w = visor.clientWidth, h = visor.clientHeight;
      if (w && h) {
        if (visor.width !== w || visor.height !== h) { visor.width = w; visor.height = h; }
        vg.clearRect(0, 0, w, h);
        const n = picos.length, base = h * 0.93, alto = h * 0.42, ancho = w * 0.88 / n, SEG = 12;
        vg.shadowColor = c.led; vg.shadowBlur = 6;
        for (let i = 0; i < n; i++) {
          const i0 = Math.floor(2 * Math.pow(120, i / n)), i1 = Math.max(i0 + 1, Math.floor(2 * Math.pow(120, (i + 1) / n)));
          const v = Math.pow(R.energia(d, i0, i1), 1.6); picos[i] = Math.max(picos[i] - 0.01, v);
          const x = w * 0.06 + i * ancho, segs = Math.round(v * SEG);
          for (let s = 0; s < segs; s++) { vg.fillStyle = s >= SEG - 2 ? "#ffffff" : c.led; vg.fillRect(x, base - (s + 1) * alto / SEG, ancho * 0.7, alto / SEG - 2); }
          vg.fillStyle = "#fff"; vg.fillRect(x, base - picos[i] * alto - 3, ancho * 0.7, 2);
        }
        vg.shadowBlur = 0;
      }
      r.style.setProperty("--p", (R.progreso() * 100).toFixed(2) + "%");
      ojos.forEach(o => { o.style.opacity = (0.12 + medio * 1.3).toFixed(2); });
      anillos.forEach(a => { a.style.opacity = Math.min(1, bajo * 1.3).toFixed(2); a.style.transform = `scale(${(0.85 + bajo * 0.3).toFixed(3)})`; });
      const enc = Math.round(medio * 18); seg.forEach((s, i) => s.classList.toggle("on", i < enc));
    });
  }

  // ===== Equipo (2000s) =====
  const SKINS = {
    "Plata": { metal: "#c3c9d3", grabado: "#3b4250", lcd: "#06131f", tinta: "#7fdcff", acento: "#3fa9ff" },
    "Grafito": { metal: "#3b3e46", grabado: "#aeb2bb", lcd: "#140a00", tinta: "#ffb000", acento: "#ff6a00" },
    "LCD verde": { metal: "#b4bba6", grabado: "#3d4535", lcd: "#a3b585", tinta: "#16220e", acento: "#5bd13a" },
    "Azul": { metal: "#2b4fae", grabado: "#d2deff", lcd: "#000a18", tinta: "#e6f3ff", acento: "#00e5ff" },
  };
  function equipo(op, caja) {
    const sk = SKINS[op.skin] || SKINS.Plata, tintaClara = luz(rgb(sk.tinta)) > luz(rgb(sk.lcd));
    const r = document.createElement("div"); r.className = "m-eq";
    for (const k of ["metal", "grabado", "lcd", "tinta", "acento"]) r.style.setProperty("--" + k, sk[k]);
    r.style.setProperty("--brilloLcd", tintaClara ? "0 0 6px var(--tinta)" : "none");
    r.innerHTML = `<div class="tope grabado"><span class="marca">SONIDO · 2K</span></div>
      <div class="cuerpo-eq"><div id="lcd" class="lcd"><canvas id="caratula" width="128" height="128"></canvas>
        <div class="info"><div class="marquesina"></div><div class="fila-tiempo"><div class="reloj"><span class="fantasma">88:88</span><span class="tg">00:00</span></div>
          <div class="indicadores"><span class="iPlay">PLAY</span><span class="iPausa">PAUSA</span><span>${{ soundcloud: "SC", musica: "MP3", pc: "PC", spotify: "SP", demo: "DEMO" }[R.fuente] || ""}</span></div></div>
          <div id="artista"></div><div id="titulo" style="display:none"></div></div><canvas class="espectro" width="200" height="128"></canvas></div>
        <div class="controles"><div class="transporte"><button id="bStop" class="metal" title="Detener">■</button><button id="bAnt" class="metal" title="Anterior">&#x23EE;&#xFE0E;</button><button id="bPlay" class="metal" title="Play / pausa">▶</button><button id="bSig" class="metal" title="Siguiente">&#x23ED;&#xFE0E;</button></div>
          <div class="vol"><div class="perilla" role="slider" tabindex="0" aria-label="Volumen"></div><span class="grabado" id="iconoVol" title="Silenciar" style="cursor:pointer">VOLUMEN</span></div></div></div>
      <div class="riel"><input id="barra" type="range" min="0" max="1000" value="0" title="Avance"></div><input id="volumen" type="range" min="0" max="100" value="80">`;
    caja.appendChild(r); ajustar(caja, r);
    const car = r.querySelector("#caratula"), cg = car.getContext("2d"), chico = document.createElement("canvas"); chico.width = chico.height = 32;
    let imagen = null;
    function pintarCaratula() {   // carátula en trama de puntos con los colores del LCD
      const S = car.width, N = 32, celda = S / N; cg.fillStyle = sk.lcd; cg.fillRect(0, 0, S, S);
      if (!imagen) return;
      chico.getContext("2d").drawImage(imagen, 0, 0, N, N); cg.fillStyle = sk.tinta;
      try {
        const px = chico.getContext("2d").getImageData(0, 0, N, N).data; let mn = 1, mx = 0;
        for (let i = 0; i < px.length; i += 4) { const l = luz([px[i], px[i + 1], px[i + 2]]); mn = Math.min(mn, l); mx = Math.max(mx, l); }
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const i = (y * N + x) * 4; let l = (luz([px[i], px[i + 1], px[i + 2]]) - mn) / Math.max(0.05, mx - mn); if (!tintaClara) l = 1 - l;
          const rr = celda * 0.64 * Math.sqrt(l); if (rr > 0.35) { cg.beginPath(); cg.arc(x * celda + celda / 2, y * celda + celda / 2, rr, 0, 7); cg.fill(); }
        }
      } catch (e) { cg.globalAlpha = 0.9; cg.drawImage(imagen, 0, 0, S, S); cg.globalAlpha = 1; }
    }
    pintarCaratula();
    R.alCambiar((p) => cargar(p.caratula, (i) => { imagen = i; pintarCaratula(); }));
    // marquesina y reloj
    const titulo = r.querySelector("#titulo"), marq = r.querySelector(".marquesina"), ANCHO = 30; let textoMarq = "", paso = 0;
    setInterval(() => {
      const t = titulo.textContent.trim() || "SONIDO 2K"; if (t !== textoMarq) { textoMarq = t; paso = 0; }
      if (t.length <= ANCHO) { marq.textContent = t; return; }
      const s = t + "   ***   "; marq.textContent = (s + s).substr(paso++ % s.length, ANCHO);
    }, 230);
    // perilla de volumen: arrastrar, rueda o flechas
    const vol = r.querySelector("#volumen"), perilla = r.querySelector(".perilla");
    const giro = () => r.style.setProperty("--giro", (-135 + vol.value * 2.7) + "deg");
    const poner = (v) => { vol.value = Math.max(0, Math.min(100, Math.round(v))); vol.dispatchEvent(new Event("input")); };
    vol.addEventListener("input", giro); giro();
    perilla.addEventListener("pointerdown", (e) => { const y0 = e.clientY, v0 = +vol.value; perilla.setPointerCapture(e.pointerId); perilla.onpointermove = (ev) => poner(v0 + (y0 - ev.clientY) * 0.6); });
    perilla.addEventListener("pointerup", () => { perilla.onpointermove = null; });
    perilla.addEventListener("wheel", (e) => { e.preventDefault(); poner(+vol.value - Math.sign(e.deltaY) * 5); }, { passive: false });
    // espectro en segmentos
    const esp = r.querySelector(".espectro"), eg = esp.getContext("2d"), BARRAS = 20, SEG = 21, picos = new Array(BARRAS).fill(0);
    const dos = (s) => { s = isFinite(s) && s > 0 ? s : 0; return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`; };
    const tg = r.querySelector(".tg"), iPlay = r.querySelector(".iPlay"), iPausa = r.querySelector(".iPausa"), bPlay = r.querySelector("#bPlay");
    R.cadaCuadro(() => {
      const d = R.espectro(), sonando = bPlay.textContent === "❚❚";
      r.classList.toggle("sonando", sonando); iPlay.classList.toggle("on", sonando); iPausa.classList.toggle("on", !sonando);
      tg.textContent = dos(R.tiempoActual()); r.style.setProperty("--p", (R.progreso() * 100).toFixed(2) + "%");
      const w = esp.width, h = esp.height, ancho = w / BARRAS, alto = h / SEG; eg.clearRect(0, 0, w, h);
      for (let b = 0; b < BARRAS; b++) {
        const i0 = Math.floor(2 * Math.pow(140, b / BARRAS)), i1 = Math.max(i0 + 1, Math.floor(2 * Math.pow(140, (b + 1) / BARRAS)));
        const n = Math.round(Math.pow(R.energia(d, i0, i1), 1.8) * SEG); picos[b] = Math.max(n, picos[b] - 0.15);
        for (let s = 0; s < SEG; s++) { eg.globalAlpha = s < n ? 1 : (s === Math.ceil(picos[b]) ? 0.9 : 0.1); eg.fillStyle = sk.tinta; eg.fillRect(b * ancho + 1, h - (s + 1) * alto + 1, ancho - 2, alto - 2); }
      }
      eg.globalAlpha = 1;
    });
  }
  return { cabeza, equipo };
})();
