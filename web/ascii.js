// Fondo ASCII: una cuadrícula de caracteres que reacciona a la música. Seis escenas que se turnan con fundido (lluvia, dona 3D que gira, ondas con
// el espectro, fuego, túnel y tu carátula hecha de caracteres) y "cosas que pasan en el tiempo": una secuencia de arranque que se tipea y, cada 10-20 s, un
// evento (glitch, alerta, barrido de escaneo o inversión). Todo con código propio; se dibuja a ~30 cuadros para pesar poco.
//   Ascii.montar(contenedor, { color: () => [r, g, b], cambio: segundos entre escenas, eventos: true|false })
"use strict";
const Ascii = (() => {
  const RAMPA = " .:-=+*#%@", CABEZA = "01ABCDEFXYZ#@$%&*+<>/\\|", TAU = Math.PI * 2;
  const ESCENAS = ["LLUVIA", "DONA", "ONDAS", "FUEGO", "TUNEL", "CARATULA"];
  const ALERTAS = ["SENAL FUERTE DETECTADA", "BAJO >> MAXIMO", "SINCRONIZANDO RITMO...", "NUCLEO ESTABLE", "ANOMALIA EN EL ESPECTRO"];
  const ARRANQUE = ["> boot reproductor.sys", "> cargando visuales ........ OK", "> senal de audio ........... OK", "> modo ascii activado"];
  const hash = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  function montar(cont, op = {}) {
    const lienzo = document.createElement("canvas"); lienzo.style.pointerEvents = "none"; cont.appendChild(lienzo);
    const g = lienzo.getContext("2d");
    const cambio = Math.max(8, Math.min(120, +op.cambio || 26)), conEventos = op.eventos !== false;
    let calor = null, giroA = 0, giroB = 0, cols = 0, filas = 0, cw = 8, ch = 14, tam = 16, I = null, J = null, lluvia = null, ultimo = 0, esc = 0, sig = -1, tFundido = 0, tCambio = 1e9, t0 = null;
    let imgOk = false, mini = null, caratula = new Image(), prox = 9 + Math.random() * 8, ev = null, suaveB = 0, suaveM = 0, suaveA = 0;
    const fuente = () => `${tam}px "VT323", "Cascadia Mono", Consolas, monospace`;

    function medir() {
      tam = Math.max(14, Math.round(innerHeight / 46)); g.font = fuente(); cw = Math.max(5, g.measureText("M").width); ch = tam * .92;
      cols = Math.max(20, Math.floor(innerWidth / cw)); filas = Math.max(10, Math.floor(innerHeight / ch));
      lienzo.width = innerWidth; lienzo.height = innerHeight; I = new Float32Array(cols * filas); J = new Float32Array(cols * filas);
      calor = new Float32Array(cols * (filas + 2));
      lluvia = { y: Float32Array.from({ length: cols }, () => Math.random() * filas), v: Float32Array.from({ length: cols }, () => 6 + Math.random() * 14), l: Float32Array.from({ length: cols }, () => 6 + Math.random() * 16) };
      mini = document.createElement("canvas"); mini.width = cols; mini.height = filas;
    }
    if (document.fonts && document.fonts.load) document.fonts.load('20px "VT323"').then(medir).catch(() => {});
    medir();

    R.alCambiar((p) => {   // la carátula del tema que suena, para la escena CARATULA (si el origen no deja leerla, esa escena se salta)
      imgOk = false; if (!p.caratula) return;
      const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => { caratula = im; imgOk = true; }; im.onerror = () => { imgOk = false; }; im.src = p.caratula;
    });

    // ---- escenas: cada una llena el arreglo de intensidades (0..1, y más de 1 = punta brillante) ----
    const escena = {
      LLUVIA(A, t, dt, d, b) {
        A.fill(0); const vel = 1 + b * 2.4;
        for (let c = 0; c < cols; c++) {
          lluvia.y[c] += lluvia.v[c] * dt * vel; if (lluvia.y[c] - lluvia.l[c] > filas) { lluvia.y[c] = -Math.random() * 12; lluvia.v[c] = 6 + Math.random() * 14; lluvia.l[c] = 6 + Math.random() * 16; }
          for (let r = 0; r < filas; r++) { const dist = lluvia.y[c] - r; if (dist >= 0 && dist < lluvia.l[c]) A[r * cols + c] = dist < 1 ? 1.35 : (1 - dist / lluvia.l[c]) * (.55 + .45 * (d[(c * 3) % 200] / 255)); }
        }
      },
      ONDAS(A, t, dt, d, b) {
        A.fill(0);
        for (let k = 0; k < 3; k++) {
          const amp = filas * (.1 + k * .03 + (k === 0 ? b : k === 1 ? suaveM : suaveA) * .22);
          for (let c = 0; c < cols; c++) {
            const y = filas * .45 + Math.sin(c * .05 * (k + 1) + t * (1.1 + k * .45) + k * 2) * amp + Math.sin(c * .017 + t * .4) * filas * .1;
            for (let r = Math.max(0, Math.floor(y) - 3); r < Math.min(filas, Math.floor(y) + 4); r++) A[r * cols + c] = Math.max(A[r * cols + c], Math.exp(-((r - y) ** 2) / 1.1) * (1 - k * .22));
          }
        }
        for (let c = 0; c < cols; c++) {   // espectro: barras de caracteres desde abajo
          const alto = d[2 + Math.floor(c / cols * 110)] / 255 * filas * .42;
          for (let r = filas - 1; r > filas - 1 - alto; r--) A[r * cols + c] = Math.max(A[r * cols + c], .3 + .55 * ((filas - r) / Math.max(1, alto)) * .6);
        }
      },
      DONA(A, t, dt, d, b) {   // un toro 3D que gira (el clásico donut ASCII); el bajo acelera el giro y lo agranda
        A.fill(0); giroA += dt * (.9 + b * 2.6); giroB += dt * (.5 + b * 1.4);
        const cA = Math.cos(giroA), sA = Math.sin(giroA), cB = Math.cos(giroB), sB = Math.sin(giroB), z = new Float32Array(cols * filas), esc = Math.min(filas * .5, cols * .3 / 1.9) * .7 * (1 + b * .12);
        for (let th = 0; th < TAU; th += .06) {
          const cT = Math.cos(th), sT = Math.sin(th);
          for (let ph = 0; ph < TAU; ph += .018) {
            const cP = Math.cos(ph), sP = Math.sin(ph), h = cT + 2, D = 1 / (sP * h * sA + sT * cA + 5), tt = sP * h * cA - sT * sA;
            const x = Math.floor(cols / 2 + esc * 1.9 * D * 5 / 2 * (cP * h * cB - tt * sB) * .36), y = Math.floor(filas * .72 + esc * D * 5 / 2 * (cP * h * sB + tt * cB) * .36);   // abajo, en el espacio libre
            const L = cP * cT * sB - cA * cT * sP - sA * sT + cB * (cA * sT - cT * sA * sP);
            if (x >= 0 && x < cols && y >= 0 && y < filas && D > z[y * cols + x]) { z[y * cols + x] = D; A[y * cols + x] = Math.max(.12, Math.min(1.2, L * .62 + .35)); }
          }
        }
      },
      FUEGO(A, t, dt, d, b) {   // autómata de calor: abajo se enciende con el bajo y sube enfriándose
        const W = cols, H = filas;
        for (let c = 0; c < W; c++) { calor[(H) * W + c] = Math.random() < .55 + b * .4 ? .7 + Math.random() * .6 + d[2 + (c % 90)] / 255 * .5 : 0; calor[(H + 1) * W + c] = calor[H * W + c]; }
        for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
          const a1 = calor[(r + 1) * W + ((c - 1 + W) % W)], a2 = calor[(r + 1) * W + c], a3 = calor[(r + 1) * W + ((c + 1) % W)], a4 = calor[(r + 2) * W + c];
          calor[r * W + c] = Math.max(0, (a1 + a2 + a3 + a4) / 4 - (.032 + (1 - b) * .012));
        }
        for (let i = 0; i < W * H; i++) A[i] = Math.min(1.1, calor[i] * 1.15);
      },
      TUNEL(A, t, dt, d, b) {
        const cx = cols / 2, cy = filas / 2, anillo = (1 - GOLP()) * cols * .5;
        for (let r = 0; r < filas; r++) for (let c = 0; c < cols; c++) {
          const dx = c - cx, dy = (r - cy) * 1.9, rad = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
          let v = .5 + .5 * Math.sin(rad * .22 - t * (2.2 + b * 4) + Math.sin(ang * 4 + t) * 1.2); v = v * v * Math.max(0, 1 - rad / (cols * .62));
          if (GOLP() > .05) v += Math.exp(-((rad - anillo) ** 2) / 14) * GOLP() * .9; A[r * cols + c] = v;
        }
      },
      CARATULA(A, t, dt, d, b) {
        A.fill(0); if (!imgOk) return escena.TUNEL(A, t, dt, d, b);
        try {
          const m = mini.getContext("2d", { willReadFrequently: true }), anchoC = Math.min(cols, filas * ch / cw);
          m.clearRect(0, 0, cols, filas); m.drawImage(caratula, (cols - anchoC) / 2, 0, anchoC, filas);
          const px = m.getImageData(0, 0, cols, filas).data, gan = .62 + b * .7;
          for (let i = 0; i < cols * filas; i++) { const k = i * 4; if (px[k + 3] < 40) continue; A[i] = Math.pow((px[k] * .3 + px[k + 1] * .59 + px[k + 2] * .11) / 255, 1.15) * gan; }
        } catch (e) { imgOk = false; }   // imagen de otro origen: no se puede leer
      },
    };
    const GOLP = () => (typeof GOLPE !== "undefined" ? GOLPE : 0);

    function lanzar(t) {   // un evento nuevo con el tiempo
      const tipos = ["glitch", "alerta", "scan", "invertir"], tipo = tipos[Math.floor(Math.random() * tipos.length)];
      ev = { tipo, t0: t, dur: { glitch: .55, alerta: 2.6, scan: 1.2, invertir: .22 }[tipo], msg: ALERTAS[Math.floor(Math.random() * ALERTAS.length)], filas: Array.from({ length: filas }, () => (Math.random() < .3 ? Math.round((Math.random() - .5) * 26) : 0)) };
    }

    function dibujar(t, dt, d) {
      const col = op.color(), [r, gc, bl] = col, cadena = (a) => `rgba(${r},${gc},${bl},${a})`;
      const b = suaveB;
      // mezcla de escenas con fundido
      if (t0 === null) t0 = t;
      if (sig < 0 && t - tCambio > cambio) { sig = (esc + 1) % ESCENAS.length; if (ESCENAS[sig] === "CARATULA" && !imgOk) sig = (sig + 1) % ESCENAS.length; tFundido = t; }
      if (tCambio === 1e9) tCambio = t;
      escena[ESCENAS[esc]](I, t, dt, d, b);
      let k = 0;
      if (sig >= 0) { k = Math.min(1, (t - tFundido) / 1.6); escena[ESCENAS[sig]](J, t, dt, d, b); if (k >= 1) { esc = sig; sig = -1; tCambio = t; I.set(J); k = 0; } }
      if (conEventos) {
        if (!ev && t - t0 > 5 && t > prox) { lanzar(t); prox = t + 10 + Math.random() * 10; }
        if (ev && t - ev.t0 > ev.dur) ev = null;
      }
      const invertido = ev && ev.tipo === "invertir";
      g.clearRect(0, 0, lienzo.width, lienzo.height);
      if (invertido) { g.fillStyle = cadena(.9); g.fillRect(0, 0, lienzo.width, lienzo.height); }
      g.font = fuente(); g.textBaseline = "top";
      const cubos = [[], [], [], [], [], [], []], u = ev && ev.tipo === "scan" ? (t - ev.t0) / ev.dur * (filas + 6) - 3 : -99;
      for (let rr = 0; rr < filas; rr++) {
        const desp = ev && ev.tipo === "glitch" ? ev.filas[rr] : 0;
        for (let c = 0; c < cols; c++) {
          const i = rr * cols + c; let v = k > 0 ? I[i] * (1 - k) + J[i] * k : I[i];
          if (Math.abs(rr - u) < 1.6) v += .9 * (1 - Math.abs(rr - u) / 1.6);
          if (v < .07) continue;
          const chr = v >= 1 ? CABEZA[Math.floor(hash(c, rr, Math.floor(t * 9)) * CABEZA.length)] : RAMPA[Math.min(RAMPA.length - 1, Math.floor(v * (RAMPA.length - 1) + .4))];
          if (chr === " ") continue;
          cubos[Math.min(6, Math.floor(v * 5))].push((c + desp) * cw, rr * ch, chr);
        }
      }
      for (let l = 0; l < 7; l++) {
        const q = cubos[l]; if (!q.length) continue;
        g.fillStyle = invertido ? "#000" : l === 6 ? "#e8fff0" : cadena(.18 + l * .14);
        for (let n = 0; n < q.length; n += 3) g.fillText(q[n + 2], q[n], q[n + 1]);
      }
      if (ev && ev.tipo === "glitch") {   // fantasma de color desplazado
        g.globalCompositeOperation = "screen"; g.fillStyle = "rgba(255,40,90,.35)"; for (let n = 0; n < cubos[4].length; n += 3) if (hash(n, 3, 1) < .25) g.fillText(cubos[4][n + 2], cubos[4][n] + cw * 2, cubos[4][n + 1]);
        g.globalCompositeOperation = "source-over";
      }
      // línea de estado arriba y arranque que se tipea
      g.fillStyle = cadena(.85);
      const barra = "|".repeat(Math.round(b * 12)).padEnd(12, ".");
      g.fillText(`[ ASCII ]  ESCENA: ${ESCENAS[sig >= 0 && k > .5 ? sig : esc]}${ev ? "  EVENTO: " + ev.tipo.toUpperCase() : ""}  BAJO [${barra}]  T+${String(Math.floor(t - t0)).padStart(4, "0")}s`, cw, ch * .3);
      const ta = t - t0;
      if (ta < 7) { g.globalAlpha = ta > 5.5 ? Math.max(0, (7 - ta) / 1.5) : 1; let n = Math.floor(ta * 34);
        ARRANQUE.forEach((linea, i) => { const mostrar = linea.slice(0, Math.max(0, n)); n -= linea.length + 6; g.fillStyle = "#e8fff0"; g.fillText(mostrar + (mostrar.length < linea.length && mostrar.length ? "█" : ""), cw, ch * (2 + i)); }); g.globalAlpha = 1; }
      if (ev && ev.tipo === "alerta") {
        const prog = Math.min(1, (t - ev.t0) / .5), txt = ev.msg.split("").map((x, i) => (i < prog * ev.msg.length ? x : CABEZA[Math.floor(Math.random() * CABEZA.length)])).join("");
        const ancho = txt.length + 6, x0 = Math.floor((cols - ancho) / 2) * cw, y0 = Math.floor(filas * .68) * ch, parpadeo = Math.floor((t - ev.t0) * 6) % 2 === 0;
        g.fillStyle = "rgba(0,0,0,.88)"; g.fillRect(x0 - cw, y0 - ch * .2, (ancho + 2) * cw, ch * 4.2);
        g.fillStyle = parpadeo ? "#e8fff0" : cadena(1); g.fillText("+" + "-".repeat(ancho - 2) + "+", x0, y0); g.fillText("|  " + txt + "  |", x0, y0 + ch); g.fillText("|" + " ".repeat(ancho - 2) + "|", x0, y0 + ch * 2); g.fillText("+" + "-".repeat(ancho - 2) + "+", x0, y0 + ch * 3);
      }
    }

    cont.__lanzar = (tipo) => { lanzar(performance.now() / 1000); if (tipo) ev.tipo = tipo, ev.dur = { glitch: .55, alerta: 2.6, scan: 1.2, invertir: .22 }[tipo]; };   // para pruebas
    cont.__ascii = () => ({ t0, esc, sig, tCambio, cambio, ev: ev && ev.tipo, prox, cols, filas, ultimo });   // para pruebas
    R.cadaCuadro(() => {   // el tiempo de la app avanza por cuadro (más lento si el equipo va a menos de 60); aquí se usa el reloj real para que escenas y eventos duren lo que dicen
      const t = performance.now() / 1000;
      if (lienzo.width !== innerWidth || lienzo.height !== innerHeight) medir();
      if (t - ultimo < 1 / 30) return; const dt = Math.min(.1, t - ultimo || 1 / 30); ultimo = t;
      const d = R.espectro(); suaveB += (Math.min(1, R.energia(d, 1, 8) * 1.2) - suaveB) * .25; suaveM += (R.energia(d, 10, 60) - suaveM) * .2; suaveA += (R.energia(d, 60, 200) - suaveA) * .2;
      dibujar(t, dt, d);
    });
  }
  return { montar };
})();
