// Fondo ASCII: una cuadrícula de caracteres que reacciona a la música, con TRES TEMAS (cada uno con sus escenas, carteles y arranque):
//   terminal: lluvia, dona 3D, ondas, fuego, túnel y tu carátula en caracteres · psicodelico: caleidoscopio, espiral, plasma y un ojo (color por celda)
//   juegos: Pong, Snake, Space Invaders y Breakout jugando solos.  Las escenas se turnan con fundido y pasan "cosas con el tiempo": una secuencia de arranque que se tipea y, cada 10-20 s, un
// evento (glitch, alerta, barrido de escaneo o inversión) y, muy de vez en cuando, EL DEMONIO: aparece, se mueve, abre la boca y se come la pantalla (la interfaz también). Todo con código propio; se dibuja a ~30 cuadros para pesar poco.
//   Ascii.montar(contenedor, { color: () => [r, g, b], cambio: segundos entre escenas, eventos: true|false, tema: "terminal"|"psicodelico"|"juegos" }) → { tema(nombre) }
"use strict";
const Ascii = (() => {
  const RAMPA = " .:-=+*#%@", CABEZA = "01ABCDEFXYZ#@$%&*+<>/\\|", TAU = Math.PI * 2;
  const TEMAS = {
    terminal: { nombre: "ASCII", escenas: ["LLUVIA", "DONA", "ONDAS", "FUEGO", "TUNEL", "CARATULA"], demonio: true,
      alertas: ["SENAL FUERTE DETECTADA", "BAJO >> MAXIMO", "SINCRONIZANDO RITMO...", "NUCLEO ESTABLE", "ANOMALIA EN EL ESPECTRO"],
      arranque: ["> boot reproductor.sys", "> cargando visuales ........ OK", "> senal de audio ........... OK", "> modo ascii activado"] },
    psicodelico: { nombre: "PSICO", escenas: ["KALEIDO", "ESPIRAL", "INFINITO", "OJO"], multicolor: true,
      alertas: ["TODO ES UN ESPIRAL", "RESPIRA", "MIRA FIJO", "EL COLOR TIENE SONIDO", "NO PARPADEES"],
      arranque: ["> abriendo la percepcion ...", "> filtro de realidad ....... OFF", "> espiral .................. ON", "> mira fijo"] },
    juegos: { nombre: "ARCADE", escenas: ["PONG", "SNAKE", "INVADERS", "BREAKOUT"], glifos: true,
      alertas: ["INSERT COIN", "GAME OVER   CONTINUE? 9", "NUEVO RECORD!", "LEVEL UP", "PLAYER 2 ENTRA"],
      arranque: ["> insert coin ...", "> cargando cartucho ........ OK", "> player 1 listo", "> press start"] },
  };
  const tonoDe = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0; const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };
  const hash = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  function montar(cont, op = {}) {
    const lienzo = document.createElement("canvas"); lienzo.style.pointerEvents = "none"; cont.appendChild(lienzo);
    const g = lienzo.getContext("2d");
    const cambio = Math.max(8, Math.min(120, +op.cambio || 26)), conEventos = op.eventos !== false;
    let tema = TEMAS[op.tema] ? op.tema : "terminal", G = null, H = null, juego = {}, factorTam = 1, criatura = null, demonioAntes = -1e9, velo = null, info = null, calor = null, giroA = 0, giroB = 0, cols = 0, filas = 0, cw = 8, ch = 14, tam = 16, I = null, J = null, lluvia = null, ultimo = 0, esc = 0, sig = -1, tFundido = 0, tCambio = 1e9, t0 = null;
    let mia = null, miaImg = null, miaPal = [], K = null;   // la imagen propia (op.imagen) ya convertida
    let imgOk = false, mini = null, caratula = new Image(), prox = 9 + Math.random() * 8, ev = null, suaveB = 0, suaveM = 0, suaveA = 0;
    const T = () => TEMAS[tema];
    const fuente = () => `${tam}px "VT323", "Cascadia Mono", Consolas, monospace`;

    function medir() {
      tam = Math.max(10, Math.round(innerHeight / 46 * factorTam * (op.imagen ? .72 : T().glifos ? 1.7 : 1)));   // los juegos usan letras más grandes: se ven mejor las piezas
      g.font = fuente(); cw = Math.max(5, g.measureText("M").width); ch = tam * .92;
      cols = Math.max(20, Math.floor(innerWidth / cw)); filas = Math.max(10, Math.floor(innerHeight / ch));
      lienzo.width = innerWidth; lienzo.height = innerHeight; I = new Float32Array(cols * filas); J = new Float32Array(cols * filas);
      calor = new Float32Array(cols * (filas + 2)); G = new Uint16Array(cols * filas); H = new Float32Array(cols * filas); K = new Uint8Array(cols * filas); juego = {}; prepararMia();
      lluvia = { y: Float32Array.from({ length: cols }, () => Math.random() * filas), v: Float32Array.from({ length: cols }, () => 6 + Math.random() * 14), l: Float32Array.from({ length: cols }, () => 6 + Math.random() * 16) };
      mini = document.createElement("canvas"); mini.width = cols; mini.height = filas;
    }
    // la criatura del evento: un sprite hecho con tools/imagen_a_sprite.py (web/criaturas/*.json); si no está, se usa el demonio dibujado con código
    (window.__CRIATURA ? Promise.resolve(window.__CRIATURA) : fetch("criaturas/oni.json").then(r => (r.ok ? r.json() : null))).then(d => { if (d && Array.isArray(d.v) && d.v.length && d.boca && d.ojos) criatura = d; }).catch(() => {});
    if (document.fonts && document.fonts.load) document.fonts.load('20px "VT323"').then(medir).catch(() => {});
    medir();

    R.alCambiar((p) => {   // la carátula del tema que suena, para la escena CARATULA (si el origen no deja leerla, esa escena se salta)
      imgOk = false; if (!p.caratula) return;
      const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => { caratula = im; imgOk = true; }; im.onerror = () => { imgOk = false; }; im.src = p.caratula;
    });

    // ---- escenas: cada una llena el arreglo de intensidades (0..1, y más de 1 = punta brillante) ----
    // glifos propios (juegos): se escriben en G y la intensidad en A
    const pon = (A, c, r, chr, v) => { c = Math.round(c); r = Math.round(r); if (c >= 0 && c < cols && r >= 0 && r < filas) { A[r * cols + c] = v; G[r * cols + c] = chr.charCodeAt(0); } };
    const txt = (A, c, r, str, v) => { for (let k = 0; k < str.length; k++) if (str[k] !== " ") pon(A, c + k, r, str[k], v); };

    // ---- "Tu imagen": cualquier imagen que la persona elige se convierte en caracteres (en su PC, al cargarla). Pierde el fondo plano, late con el bajo y se
    // "rompe" en líneas con cada golpe. Con "colores de la imagen" cada letra lleva el color de su zona (paleta de 64) ----
    // ---- "Tu imagen" / "Tu video": se convierte en caracteres en este PC. Con "ampliado" lo que sobra a los lados se llena con la misma imagen (o el mismo video) ampliada y atenuada ----
    const PAL_TONO = Array.from({ length: 64 }, (_, k) => { const [r, g, b] = [k >> 4, (k >> 2) & 3, k & 3].map(x => (x + .5) / 4), m = Math.max(r, g, b); return `rgb(${r / m * 255 | 0},${g / m * 255 | 0},${b / m * 255 | 0})`; });
    const lienzoMia = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d", { willReadFrequently: true }); x.imageSmoothingQuality = "high"; return x; };
    // el recorte que eligió la persona (izquierda, arriba, derecha, abajo, en %): la parte de la imagen o del video que se usa
    const recorteMia = (iw, ih) => { const [l, t, r, b] = (op.imagenRec || [0, 0, 0, 0]).map(n => Math.max(0, Math.min(90, +n || 0))), sw = iw * (1 - (l + r) / 100), sh = ih * (1 - (t + b) / 100); return sw < iw * .08 || sh < ih * .08 ? { sx: 0, sy: 0, sw: iw, sh: ih } : { sx: iw * l / 100, sy: ih * t / 100, sw, sh }; };
    const cubrirMia = (x, src, R, wc, hc) => { const a = ch / cw, s = Math.max(wc / R.sw, hc / (R.sh / a)); x.drawImage(src, R.sx, R.sy, R.sw, R.sh, (wc - R.sw * s) / 2, (hc - R.sh / a * s) / 2, R.sw * s, R.sh / a * s); };   // llena el lienzo recortando lo que sobre
    function convertirPx(px, wc, hc) {
      const porBrillo = op.imagenModo === "brillo", v = new Float32Array(wc * hc), q = new Uint8Array(wc * hc), suma = Array.from({ length: 64 }, () => [0, 0, 0, 0]);
      for (let i = 0; i < wc * hc; i++) { const k = (px[i * 4] >> 6) * 16 + (px[i * 4 + 1] >> 6) * 4 + (px[i * 4 + 2] >> 6); q[i] = k; const s = suma[k]; s[0] += px[i * 4]; s[1] += px[i * 4 + 1]; s[2] += px[i * 4 + 2]; s[3]++; }
      const dom = suma.reduce((m, s, k) => (s[3] > suma[m][3] ? k : m), 0), [fr, fg, fb] = [0, 1, 2].map(o => suma[dom][o] / Math.max(1, suma[dom][3]));   // el fondo = el color más común de la imagen
      const lumC = new Float32Array(wc * hc), claro = (.299 * fr + .587 * fg + .114 * fb) / 255 > .5;   // fondo claro: la tinta oscura es la que se densifica
      for (let i = 0; i < wc * hc; i++) lumC[i] = (.299 * px[i * 4] + .587 * px[i * 4 + 1] + .114 * px[i * 4 + 2]) / 255;
      for (let r = 0; r < hc; r++) for (let c = 0; c < wc; c++) {
        const i = r * wc + c, o = i * 4, lum = lumC[i];
        if (px[o + 3] < 40) continue;
        if (porBrillo) { v[i] = Math.pow(lum, 1.2); continue; }
        const dist = Math.max(Math.abs(px[o] - fr), Math.abs(px[o + 1] - fg), Math.abs(px[o + 2] - fb)) / 255, mascara = Math.min(1, Math.max(0, (dist - .2) / .2));
        const gx = (lumC[r * wc + Math.min(wc - 1, c + 1)] - lumC[r * wc + Math.max(0, c - 1)]), gy = (lumC[Math.min(hc - 1, r + 1) * wc + c] - lumC[Math.max(0, r - 1) * wc + c]);
        const borde = Math.min(1, Math.max(0, Math.hypot(gx, gy) * 2.6 - .45) * 1.6), densidad = claro ? 1 - lum : lum;   // sombras con la luminosidad de la imagen + contornos marcados
        v[i] = Math.min(1, Math.max(mascara * (.1 + .32 * densidad), borde));   // relleno tenue y contornos brillantes: el sujeto se separa de las manchas
      }
      const kc = (op.imagenContraste || 140) / 100; if (kc !== 1) for (let i = 0; i < v.length; i++) v[i] = Math.min(1, Math.max(0, (v[i] - .45) * kc + .45));   // más contraste: desaparecen los grises medios
      return { v, q, suma };
    }
    function prepararMia() {
      if (miaImg instanceof HTMLVideoElement) return prepararVideo();
      if (!miaImg || !miaImg.naturalWidth || !cols) return;
      const asp = ch / cw, R = recorteMia(miaImg.naturalWidth, miaImg.naturalHeight), iw = R.sw, ih = R.sh;
      const ajuste = op.imagenAjuste || "estirar", alto = filas - 3;   // estirar: todo el ancho y el alto · cubrir: llena recortando · contener: entera · ampliado: entera y los costados con la misma imagen ampliada
      let wc = cols, hc = alto;
      if (ajuste === "contener" || ajuste === "ampliado") { wc = cols - 2; hc = Math.round(wc * ih / iw / asp); if (hc > alto) { hc = alto; wc = Math.round(hc * asp * iw / ih); } }
      wc = Math.max(8, wc); hc = Math.max(4, hc);
      const x = lienzoMia(wc, hc);
      if (ajuste === "cubrir") cubrirMia(x, miaImg, R, wc, hc); else x.drawImage(miaImg, R.sx, R.sy, R.sw, R.sh, 0, 0, wc, hc);
      let px; try { px = x.getImageData(0, 0, wc, hc).data; } catch (e) { mia = null; return; }
      const { v, q, suma } = convertirPx(px, wc, hc);
      let bg = null;
      if (ajuste === "ampliado") { const xb = lienzoMia(cols, filas); cubrirMia(xb, miaImg, R, cols, filas); const o = convertirPx(xb.getImageData(0, 0, cols, filas).data, cols, filas); bg = { v: o.v, q: o.q }; }
      miaPal = suma.map(([a, b_, c_, n]) => { if (!n) return "#fff"; let r_ = a / n, g_ = b_ / n, bb = c_ / n; const m = Math.max(r_, g_, bb, 1), f = Math.max(1, 150 / m); return `rgb(${Math.min(255, r_ * f) | 0},${Math.min(255, g_ * f) | 0},${Math.min(255, bb * f) | 0})`; });
      mia = { wc, hc, ox: (cols - wc) >> 1, oy: ((filas - hc) >> 1) + 1, v, q, bg };
    }
    // video: cada cuadro se achica a la cuadricula y se pasa a letras; el brillo se estira solo (percentiles suavizados) para que no parpadee
    let miaT = -1, hist = new Float32Array(48), lo = .1, hi = .85;
    function estirar(px, n, v, q) {
      hist.fill(0); for (let i = 0; i < n; i++) hist[Math.min(47, ((.299 * px[i * 4] + .587 * px[i * 4 + 1] + .114 * px[i * 4 + 2]) / 255 * 47.99) | 0)]++;
      const pc = (p) => { let a = 0; for (let k = 0; k < 48; k++) { a += hist[k]; if (a >= n * p) return k / 47.99; } return 1; };
      lo += (pc(.25) - lo) * .02; hi += (pc(.997) - hi) * .02;   // muy lentos: un sujeto grande no se come el contraste de ese cuadro
      const gam = 1.7 * (op.imagenContraste || 140) / 140;   // mas contraste = curva mas empinada (solo quedan los reflejos)
      for (let i = 0; i < n; i++) {
        const R_ = px[i * 4], G_ = px[i * 4 + 1], B_ = px[i * 4 + 2], l = (.299 * R_ + .587 * G_ + .114 * B_) / 255, a = Math.pow(Math.min(1, Math.max(0, (l - lo) / Math.max(.05, hi - lo))), gam);
        v[i] = a; const mx = Math.max(R_, G_, B_, 1); q[i] = Math.min(3, (R_ / mx * 4) | 0) * 16 + Math.min(3, (G_ / mx * 4) | 0) * 4 + Math.min(3, (B_ / mx * 4) | 0);
      }
    }
    function prepararVideo() {
      const vd = miaImg; if (!vd.videoWidth || !cols) return;
      const asp = ch / cw, R = recorteMia(vd.videoWidth, vd.videoHeight), iw = R.sw, ih = R.sh, alto = filas - 3, ajuste = op.imagenAjuste || "estirar";
      let wc = cols, hc = alto;
      if (ajuste === "contener" || ajuste === "ampliado") { wc = cols - 2; hc = Math.round(wc * ih / iw / asp); if (hc > alto) { hc = alto; wc = Math.round(hc * asp * iw / ih); } }
      wc = Math.max(8, wc); hc = Math.max(4, hc);
      mia = { wc, hc, R, ox: (cols - wc) >> 1, oy: ((filas - hc) >> 1) + 1, v: new Float32Array(wc * hc), q: new Uint8Array(wc * hc), x: lienzoMia(wc, hc),
        bg: ajuste === "ampliado" ? { v: new Float32Array(cols * filas), q: new Uint8Array(cols * filas), x: lienzoMia(cols, filas) } : null, cubrir: ajuste === "cubrir" };
      miaPal = PAL_TONO; miaT = -1;
    }
    function cuadroVideo(t) {
      const vd = miaImg; if (!mia || !mia.x || vd.readyState < 2 || t - miaT < .045) return; miaT = t;
      try {
        const R = mia.R; if (mia.cubrir) cubrirMia(mia.x, vd, R, mia.wc, mia.hc); else mia.x.drawImage(vd, R.sx, R.sy, R.sw, R.sh, 0, 0, mia.wc, mia.hc);
        estirar(mia.x.getImageData(0, 0, mia.wc, mia.hc).data, mia.wc * mia.hc, mia.v, mia.q);
        if (mia.bg) { cubrirMia(mia.bg.x, vd, R, cols, filas); estirar(mia.bg.x.getImageData(0, 0, cols, filas).data, cols * filas, mia.bg.v, mia.bg.q); }
      } catch (e) { mia = null; }
    }
    const escenasAct = () => (mia ? (op.imagenSola ? ["MIA"] : ["MIA", ...T().escenas]) : T().escenas);
    const escena = {
      MIA(A, t, dt, d, b) {   // tu imagen en caracteres
        A.fill(0); if (!mia) return;
        if (miaImg instanceof HTMLVideoElement) { cuadroVideo(t); if (!mia) return; }
        const gan = .82 + Math.min(.4, b * .5), color = !!op.imagenColor;
        if (mia.bg) for (let r = 0; r < filas; r++) for (let c = 0; c < cols; c++) {   // los costados: lo mismo, ampliado y atenuado
          if (r >= mia.oy && r < mia.oy + mia.hc && c >= mia.ox && c < mia.ox + mia.wc) continue;
          const i = r * cols + c, v = mia.bg.v[i] * .45; if (v < .05) continue; A[i] = v; if (color) K[i] = mia.bg.q[i] + 1;
        }
        for (let r = 0; r < mia.hc; r++) {
          const golpe = b > .45 && hash(r, Math.floor(t * 14), 5) < .1 ? Math.round((hash(r, Math.floor(t * 14), 6) - .5) * 6) : 0, y = mia.oy + r;
          if (y < 0 || y >= filas) continue;
          for (let c = 0; c < mia.wc; c++) {
            const i = r * mia.wc + c, v = mia.v[i]; if (v < .06) continue;
            const x = mia.ox + c + golpe; if (x < 0 || x >= cols) continue;
            A[y * cols + x] = Math.min(1.05, v * gan * 1.1); if (color) K[y * cols + x] = mia.q[i] + 1;
          }
        }
      },
      // ======== PSICODÉLICO: cada celda lleva su tono (H) ========
      KALEIDO(A, t, dt, d, b) {   // caleidoscopio de 8 espejos
        const cx = cols / 2, cy = filas / 2, asp = ch / cw, sector = TAU / 8;
        for (let r = 0; r < filas; r++) for (let c = 0; c < cols; c++) {
          const dx = c - cx, dy = (r - cy) * asp, rad = Math.hypot(dx, dy); let a = Math.atan2(dy, dx) % sector; if (a < 0) a += sector; if (a > sector / 2) a = sector - a;
          const x = rad * Math.cos(a), y = rad * Math.sin(a), i = r * cols + c, v = .5 + .5 * Math.sin(x * .12 + Math.sin(y * .14 + t * .7) * 2 + t * .9 + b * 3);
          A[i] = Math.pow(v, 1.8) * (.7 + b * .5); H[i] = (rad * .005 + t * .05 + a * .15) % 1;
        }
      },
      ESPIRAL(A, t, dt, d, b) {   // brazos de espiral hipnótica que giran más rápido con el bajo
        const cx = cols / 2, cy = filas / 2, asp = ch / cw;
        for (let r = 0; r < filas; r++) for (let c = 0; c < cols; c++) {
          const dx = c - cx, dy = (r - cy) * asp, rad = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), i = r * cols + c, v = .5 + .5 * Math.sin(ang * 3 + Math.log(rad + 1) * 7 - t * (2.4 + b * 3));
          A[i] = Math.min(1.1, Math.pow(v, 2) * Math.min(1, rad / 6) * Math.max(0, 1 - rad / (cols * .75)) * (.9 + b * .5) * 1.3); H[i] = (ang / TAU + t * .06 + rad * .004) % 1;
        }
      },
      INFINITO(A, t, dt, d, b) {   // un ojo dentro de otro, sin fin: el zoom cae hacia la pupila (efecto Droste); el bajo acelera la caída
        juego.zo = (juego.zo || 0) + dt * (.14 + b * .55); const f = juego.zo % 1, asp = ch / cw, S = cols * .4, RP = .24, s = Math.pow(RP, f);
        for (let r = 0; r < filas; r++) for (let c = 0; c < cols; c++) {
          let X = (c - cols / 2) / S * s, Y = (r - filas / 2) * asp / S * s, v = .5, tono = 0, hecho = false, nivel = 0;
          for (; nivel < 6 && !hecho; nivel++) {
            const rad = Math.hypot(X, Y), ang = Math.atan2(Y, X);
            if (rad < RP) { X /= RP; Y /= RP; continue; }   // dentro de la pupila va un ojo igual, más chico
            const ax = Math.abs(X), lid = ax < 1 ? .62 * Math.pow(1 - ax * ax, .8) : -1, dist = Math.abs(Y) - lid;
            if (lid >= 0 && dist < 0) {   // el ojo: párpado, esclerótica, iris con estrías y el borde de la pupila
              if (dist > -.07) v = 1;
              else if (Math.abs(rad - RP) < .035) v = 1;
              else if (Math.abs(rad - .5) < .04) v = .95;
              else if (rad < .5) v = .22 + .4 * (.5 + .5 * Math.sin(ang * 18 + nivel * 2));
              else v = .06;
            } else if (lid >= 0 && dist < .1 && dist > .05) v = .95;   // pliegue del párpado
            else if (lid >= 0 && dist < .4 && Math.sin(ang * 26) > .45) v = 1;   // pestañas
            else v = .1;
            tono = nivel * .16 + t * .04 + rad * .25 + f * .16; hecho = true;
          }
          const i = r * cols + c;
          if (!hecho) { v = .45; tono = t * .04 + nivel * .16; }
          A[i] = Math.min(1.1, v * (.85 + b * .35)); H[i] = tono % 1;
        }
      },
      OJO(A, t, dt, d, b) {   // un ojo que parpadea, mira de lado y dilata la pupila con el bajo; rayos alrededor
        A.fill(0); const cx = cols / 2, cy = filas * .5, asp = ch / cw, S = Math.min(cols * .2, filas * asp * .4), ciclo = t % 4.5, parp = ciclo > 4.2 ? Math.sin((ciclo - 4.2) / .3 * Math.PI) : 0, abierto = Math.max(.06, 1 - parp);
        const ix = Math.sin(t * .5) * .18, iy = Math.sin(t * .37) * .08;
        for (let r = 0; r < filas; r++) for (let c = 0; c < cols; c++) {
          const X = (c - cx) / S, Y = (r - cy) * asp / S, i = r * cols + c, ang = Math.atan2(Y, X), rad = Math.hypot(X, Y), lid = (1 - Math.min(1, X * X)) * .55 * abierto, dist = Math.abs(Y) - lid;
          H[i] = (ang / TAU + t * .07 + rad * .1) % 1;
          if (Math.abs(X) < 1 && Math.abs(dist) < .05) { A[i] = 1.05; continue; }
          if (Math.abs(X) < 1 && dist < 0) {
            const ox = X - ix, oy = Y - iy, ir = Math.hypot(ox, oy), pupila = .12 + b * .12;
            A[i] = ir < pupila ? 0 : ir < .34 ? (Math.abs(ir - .34) < .04 ? 1 : .25 + .5 * (.5 + .5 * Math.sin(Math.atan2(oy, ox) * 14 + t))) : .1; continue;
          }
          if (rad > 1.1 && Math.sin(ang * 22 + t * .6) > .82) A[i] = .08 + .35 * Math.max(0, 1 - (rad - 1.1) / 2);
        }
      },
      // ======== ARCADE: cuatro juegos que juegan solos; los caracteres propios van en G ========
      PONG(A, t, dt, d, b) {
        const X0 = Math.round(cols * .25), W = cols - X0 - 2, po = (a, c, r, k, v) => pon(a, c + X0, r, k, v), tx = (a, c, r, str, v) => txt(a, c + X0, r, str, v);   // el campo de juego queda a la derecha de la carátula
        A.fill(0);
        const nueva = () => ({ c: W, f: filas, bx: W / 2, by: filas / 2, vx: 34 * (Math.random() < .5 ? 1 : -1), vy: (8 + Math.random() * 8) * (Math.random() < .5 ? 1 : -1), y1: filas / 2, y2: filas / 2, e1: 0, e2: 0, s1: 0, s2: 0 });
        let P = juego.pong; if (!P || P.c !== W || P.f !== filas) P = juego.pong = nueva();
        const alto = Math.max(4, Math.round(filas * .2)), v = 1 + b * .9, sirve = () => { P.bx = W / 2; P.by = filas / 2; P.vx = 34 * (Math.random() < .5 ? 1 : -1); P.vy = (8 + Math.random() * 8) * (Math.random() < .5 ? 1 : -1); };
        P.bx += P.vx * dt * v; P.by += P.vy * dt * v;
        if (P.by < 2) { P.by = 2; P.vy = Math.abs(P.vy); } if (P.by > filas - 2) { P.by = filas - 2; P.vy = -Math.abs(P.vy); }
        const sigue = (y, objetivo) => y + Math.max(-24 * dt, Math.min(24 * dt, objetivo - y));
        P.y1 = sigue(P.y1, P.by + P.e1); P.y2 = sigue(P.y2, P.by + P.e2);
        if (P.bx < 4.5 && P.vx < 0 && Math.abs(P.by - P.y1) <= alto / 2 + 1) { P.vx = Math.min(70, Math.abs(P.vx) * 1.05); P.vy = Math.max(-22, Math.min(22, P.vy + (P.by - P.y1) * 1.6)); P.e2 = (Math.random() - .5) * alto * 1.9; }
        if (P.bx > W - 5.5 && P.vx > 0 && Math.abs(P.by - P.y2) <= alto / 2 + 1) { P.vx = -Math.min(70, Math.abs(P.vx) * 1.05); P.vy = Math.max(-22, Math.min(22, P.vy + (P.by - P.y2) * 1.6)); P.e1 = (Math.random() - .5) * alto * 1.9; }
        if (P.bx < 0) { P.s2 = (P.s2 + 1) % 100; sirve(); } if (P.bx > W) { P.s1 = (P.s1 + 1) % 100; sirve(); }
        for (let r = 2; r < filas - 1; r += 2) po(A, W >> 1, r, "|", .3);
        for (let k = -alto / 2; k <= alto / 2; k++) { po(A, 3, Math.round(P.y1 + k), "#", .95); po(A, W - 4, Math.round(P.y2 + k), "#", .95); }
        tx(A, (W >> 1) - 9, 3, String(P.s1).padStart(2, "0"), .8); tx(A, (W >> 1) + 7, 3, String(P.s2).padStart(2, "0"), .8);
        po(A, Math.round(P.bx), Math.round(P.by), "O", 1.25);
      },
      SNAKE(A, t, dt, d, b) {
        const X0 = Math.round(cols * .25), W = cols - X0 - 2, po = (a, c, r, k, v) => pon(a, c + X0, r, k, v), tx = (a, c, r, str, v) => txt(a, c + X0, r, str, v);   // el campo de juego queda a la derecha de la carátula
        A.fill(0);
        const dentro = (S, x, y) => S.cuerpo.some(q => q.x === x && q.y === y);
        const comida = (S) => { let x, y, n = 0; do { x = 3 + Math.floor(Math.random() * (W - 6)); y = 4 + Math.floor(Math.random() * (filas - 7)); } while (dentro(S, x, y) && ++n < 50); return { x, y }; };
        const nueva = () => { const x = W >> 1, y = filas >> 1, S = { c: W, f: filas, cuerpo: [{ x, y }, { x: x - 1, y }, { x: x - 2, y }], dir: [1, 0], acc: 0 }; S.comida = comida(S); return S; };
        let S = juego.snake; if (!S || S.c !== W || S.f !== filas) S = juego.snake = nueva();
        S.acc += dt * (16 + b * 22);
        while (S.acc >= 1) {
          S.acc -= 1; const h = S.cuerpo[0]; let mejor = null;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (dx === -S.dir[0] && dy === -S.dir[1]) continue; const nx = h.x + dx, ny = h.y + dy;
            if (nx < 2 || nx > W - 3 || ny < 3 || ny > filas - 3 || dentro(S, nx, ny)) continue;
            const sc = Math.abs(nx - S.comida.x) + Math.abs(ny - S.comida.y) * 2.1 + Math.random() * .5; if (!mejor || sc < mejor.sc) mejor = { dx, dy, sc };
          }
          if (!mejor || S.cuerpo.length > 80) { S = juego.snake = nueva(); break; }   // choca (o gana): empieza de nuevo
          S.dir = [mejor.dx, mejor.dy]; S.cuerpo.unshift({ x: h.x + mejor.dx, y: h.y + mejor.dy });
          if (S.cuerpo[0].x === S.comida.x && S.cuerpo[0].y === S.comida.y) S.comida = comida(S); else S.cuerpo.pop();
        }
        for (let c = 1; c < W - 1; c++) { po(A, c, 2, "-", .4); po(A, c, filas - 2, "-", .4); } for (let r = 2; r < filas - 1; r++) { po(A, 1, r, "|", .4); po(A, W - 2, r, "|", .4); }
        S.cuerpo.forEach((q, i) => po(A, q.x, q.y, i ? "o" : "@", i ? .35 + .5 * (1 - i / S.cuerpo.length) : .98));
        po(A, S.comida.x, S.comida.y, "*", 1.1); tx(A, 4, 1, "LARGO " + String(S.cuerpo.length).padStart(3, "0"), .7);
      },
      INVADERS(A, t, dt, d, b) {
        const X0 = Math.round(cols * .25), W = cols - X0 - 2, po = (a, c, r, k, v) => pon(a, c + X0, r, k, v), tx = (a, c, r, str, v) => txt(a, c + X0, r, str, v);   // el campo de juego queda a la derecha de la carátula
        A.fill(0);
        const SPR = [["{o}", "/ \\"], ["<O>", "/^\\"], ["(@)", "|||"], ["[#]", "/ \\"], ["\\_/", "-|-"]], FIL = 5;
        const nueva = () => { const n = Math.max(4, Math.min(11, Math.floor((W - 12) / 6))); return { c: W, f: filas, n, vivos: Array.from({ length: FIL }, () => Array(n).fill(true)), ox: 4, oy: 4, dir: 1, nave: W / 2, balas: [], expl: [], disp: 0, fin: 0 }; };
        let V = juego.inv; if (!V || V.c !== W || V.f !== filas) V = juego.inv = nueva();
        let vivos = 0; V.vivos.forEach(f => f.forEach(x => { if (x) vivos++; }));
        if (!vivos || V.oy + FIL * 3 > filas - 6) { V.fin += dt; if (V.fin > 1.2) { juego.inv = nueva(); return; } tx(A, (W >> 1) - 5, filas >> 1, vivos ? "GAME  OVER" : "LEVEL  UP!", 1.2); }
        else {
          const ancho = V.n * 6, vel = 5 + 18 * (1 - vivos / (FIL * V.n)) + b * 4; V.ox += V.dir * vel * dt;
          if (V.ox + ancho > W - 3 || V.ox < 3) { V.dir = -V.dir; V.ox = Math.max(3, Math.min(W - 3 - ancho, V.ox)); V.oy += 2; }
          let objetivo = null; V.vivos.forEach((f, i) => f.forEach((x, j) => { if (x) { const cx = V.ox + j * 6 + 1; if (objetivo === null || Math.abs(cx - V.nave) < Math.abs(objetivo - V.nave)) objetivo = cx; } }));
          V.nave += Math.max(-24 * dt, Math.min(24 * dt, objetivo - V.nave)); V.disp -= dt;
          if (Math.abs(objetivo - V.nave) < 1.5 && V.disp <= 0) { V.balas.push({ x: Math.round(V.nave), y: filas - 4 }); V.disp = .42 / (1 + b * 1.8); }
          V.balas.forEach(q => { q.y -= 40 * dt; V.vivos.forEach((f, i) => f.forEach((x, j) => { const ix = Math.round(V.ox + j * 6), iy = Math.round(V.oy + i * 3); if (x && !q.muerta && q.x >= ix && q.x <= ix + 2 && q.y >= iy && q.y <= iy + 1.5) { f[j] = false; q.muerta = true; V.expl.push({ x: ix + 1, y: iy, t: .25 }); } })); });
          V.balas = V.balas.filter(q => q.y > 0 && !q.muerta); V.expl.forEach(e => { e.t -= dt; }); V.expl = V.expl.filter(e => e.t > 0);
        }
        V.vivos.forEach((f, i) => f.forEach((x, j) => { if (!x) return; const ix = Math.round(V.ox + j * 6), iy = Math.round(V.oy + i * 3), s = SPR[i % 5], pata = Math.floor(t * 2) % 2 ? s[1] : s[1].replace(/./g, (m, k) => (k === 1 ? " " : m)); tx(A, ix, iy, s[0], .85); tx(A, ix, iy + 1, pata, .6); }));
        V.expl.forEach(e => tx(A, e.x - 1, e.y, "\\*/", 1.2)); V.balas.forEach(q => po(A, q.x, Math.round(q.y), "|", 1.2));
        tx(A, Math.round(V.nave) - 1, filas - 3, "/A\\", .98); for (let c = 2; c < W - 2; c++) po(A, c, filas - 2, "_", .35);
      },
      BREAKOUT(A, t, dt, d, b) {
        const X0 = Math.round(cols * .25), W = cols - X0 - 2, po = (a, c, r, k, v) => pon(a, c + X0, r, k, v), tx = (a, c, r, str, v) => txt(a, c + X0, r, str, v);   // el campo de juego queda a la derecha de la carátula
        A.fill(0);
        const nueva = () => { const bw = 5, n = Math.floor((W - 6) / bw); return { c: W, f: filas, bw, n, vivos: Array.from({ length: 6 }, () => Array(n).fill(true)), bx: W / 2, by: filas * .7, vx: 22, vy: -14, px: W / 2 }; };
        let K = juego.brk; if (!K || K.c !== W || K.f !== filas) K = juego.brk = nueva();
        const pw = Math.max(8, Math.round(W * .09)), v = 1 + b * .8, top = 3; K.bx += K.vx * dt * v; K.by += K.vy * dt * v;
        if (K.bx < 1) { K.bx = 1; K.vx = Math.abs(K.vx); } if (K.bx > W - 2) { K.bx = W - 2; K.vx = -Math.abs(K.vx); } if (K.by < 1) { K.by = 1; K.vy = Math.abs(K.vy); }
        K.px += Math.max(-38 * dt, Math.min(38 * dt, K.bx - K.px)); K.px = Math.max(pw / 2 + 1, Math.min(W - pw / 2 - 1, K.px));
        if (K.by >= filas - 4 && K.vy > 0 && Math.abs(K.bx - K.px) <= pw / 2 + 1) { K.vy = -Math.abs(K.vy); K.vx = Math.max(-34, Math.min(34, K.vx + (K.bx - K.px) * 1.8)); }
        if (K.by > filas) { K.bx = K.px; K.by = filas - 5; K.vy = -14; }
        const ci = Math.floor((K.bx - 3) / K.bw), ri = Math.floor(K.by - top);
        if (ri >= 0 && ri < 6 && ci >= 0 && ci < K.n && K.vivos[ri][ci]) { K.vivos[ri][ci] = false; K.vy = -K.vy; }
        if (K.vivos.every(f => f.every(x => !x))) { juego.brk = nueva(); return; }
        K.vivos.forEach((f, i) => f.forEach((x, j) => { if (x) tx(A, 3 + j * K.bw, top + i, "[==]", .95 - i * .1); }));
        for (let k = -pw / 2; k <= pw / 2; k++) po(A, Math.round(K.px + k), filas - 3, "=", .98); po(A, Math.round(K.bx), Math.round(K.by), "O", 1.25);
      },
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


    // ---- EL DEMONIO: un evento con guion que dura ~18 s. Cara dibujada con código (cuernos, ojos que brillan con el bajo, nariz, boca con dientes). ----
    //  0-2 aparece desde abajo · 2-9 se mueve · 9-12 abre la boca y tiembla · 12-14 se come la pantalla (con la interfaz) · 14-16 oscuridad · 16-18 la escupe
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
    function demonio(A, u, t, b) {
      A.fill(0);
      const asp = ch / cw, S = Math.min(cols * .2, filas * asp * .36), entra = ease(u / 2), abre = ease((u - 9) / 3), grow = ease((u - 12) / 2.2);
      const cx = cols / 2 + Math.sin(t * .9) * cols * .035 + (abre > .1 && u < 12 ? (Math.random() - .5) * .05 * abre * S : 0), cy = filas * .56 + (1 - entra) * filas * .6 + Math.sin(t * 1.7) * filas * .012;
      const pon = (X, Y, v) => { const c = Math.round(cx + X * S), r = Math.round(cy + Y * S / asp); if (c >= 0 && c < cols && r >= 0 && r < filas) A[r * cols + c] = Math.max(A[r * cols + c], v); };
      const curva = (p0, p1, p2, ancho, v) => { for (let k = 0; k <= 1; k += .01) { const m = 1 - k, x = m * m * p0[0] + 2 * m * k * p1[0] + k * k * p2[0], y = m * m * p0[1] + 2 * m * k * p1[1] + k * k * p2[1]; for (let w = -ancho; w <= ancho; w += .025) pon(x + w, y, v); } };
      for (const sg of [-1, 1]) {
        curva([sg * .55, -.8], [sg * 1.2, -1.3], [sg * .78, -2.1], .06, .95);              // cuernos
        curva([sg * .8, -.42], [sg * .5, -.55], [sg * .12, -.3], .025, .85);                // cejas
      }
      for (let r = 0; r < filas; r++) for (let c = 0; c < cols; c++) {   // cabeza: contorno y sombra suave
        const X = (c - cx) / S, Y = (r - cy) * asp / S, dd = Math.hypot(X, Y / 1.12);
        if (dd < 1.07) A[r * cols + c] = Math.abs(dd - 1) < .05 ? .95 : dd < 1 ? (((c + r * 2) % 5 === 0) ? .22 : .08) + .1 * Math.abs(X) * (Y > 0 ? 1 : .4) : 0;   // el sombreado es un rayado fino
      }
      for (const sg of [-1, 1]) {   // ojos: rendijas inclinadas que brillan con el bajo, pupila vertical
        const ex = sg * .42, ey = -.2, ang = -sg * .5, co = Math.cos(ang), si = Math.sin(ang);
        for (let r = 0; r < filas; r++) for (let c = 0; c < cols; c++) {
          const X = (c - cx) / S - ex, Y = (r - cy) * asp / S - ey, xr = X * co - Y * si, yr = X * si + Y * co, q = (xr / .36) ** 2 + (yr / .13) ** 2;
          if (q < 1) A[r * cols + c] = Math.abs(xr) < .022 ? 0 : 1.35; else if (q < 4.2) A[r * cols + c] = Math.max(A[r * cols + c], (.2 + b * .65) * (1 - (q - 1) / 3.2));
        }
        for (let k = 0; k < 3; k++) pon(sg * .09, .1 + k * .035, .85);   // nariz
      }
      const wM = .78 * (1 + grow * 5), hM = (.07 + abre * .6) * (1 + grow * 6), mY = .52, caida = abre * .12, c0 = Math.max(0, Math.floor(cx - wM * S)), c1 = Math.min(cols - 1, Math.ceil(cx + wM * S));
      for (let c = c0; c <= c1; c++) {   // boca: hueco, borde y dientes que cuelgan
        const X = (c - cx) / S, k = Math.sqrt(Math.max(0, 1 - (X / wM) ** 2)), top = mY - hM * k, bot = mY + hM * k + caida * k;
        const r0 = Math.max(0, Math.round(cy + top * S / asp)), r1 = Math.min(filas - 1, Math.round(cy + bot * S / asp));
        for (let r = r0; r <= r1; r++) A[r * cols + c] = 0;
        pon(X, top, .9); pon(X, bot, .9);
        if (hM > .03) { const tl = (.16 + abre * .12) * (1 - Math.abs(((X * 7) % 2 + 2) % 2 - 1)); for (let q = 0; q <= tl; q += .03) { pon(X, top + q, 1.15); pon(X, bot - q, 1.15); } }
      }
      return { mx: (cx) * cw, my: (cy + mY * S / asp) * ch, grow };
    }

    // el sprite (imagen convertida a caracteres): se balancea, los ojos brillan con el bajo, la mandíbula se parte en el "corte" y se separa al abrir la boca,
    // y al devorar se acerca a la cámara (zoom hacia la boca). Mismo guion que el demonio de código.
    function sprite(A, u, t, b) {
      A.fill(0); const D = criatura, asp = ch / cw, entra = ease(u / 2), abre = ease((u - 9) / 3), grow = ease((u - 12) / 2.2);
      const s0 = filas * .93 / D.filas, sx0 = s0 * asp / 2.1;   // celdas de pantalla por celda de sprite (alto y ancho; el sprite se generó con celdas 2,1 veces más altas que anchas)
      const cxS = cols / 2 + Math.sin(t * .9) * cols * .02 + (abre > .1 && u < 12 ? (Math.random() - .5) * .8 * abre : 0), cyS = filas * .5 + (1 - entra) * filas * .6 + Math.sin(t * 1.7) * filas * .01;
      const [bx, by] = D.boca, mxS = cxS + (bx - D.cols / 2) * sx0, myS = cyS + (by - D.filas / 2) * s0;   // la boca es el pivote del zoom
      const f = 1 + grow * 2.4, s = s0 * f, sx = sx0 * f, desp = abre * D.filas * .11, gan = .88 + b * .12;
      const muestra = (px, py) => { if (py >= D.corte) { if (py < D.corte + desp) return 0; py -= desp; } const ix = Math.floor(px), iy = Math.floor(py); return ix < 0 || iy < 0 || iy >= D.filas || ix >= D.cols ? 0 : D.v[iy].charCodeAt(ix) - 48; };
      for (let r = 0; r < filas; r++) for (let c = 0; c < cols; c++) {
        const px = bx + (c - mxS) / sx, py = by + (r - myS) / s; if (px < -1 || px > D.cols + 1 || py < -1 || py > D.filas + D.filas * .2) continue;
        const hw = Math.max(0, (1 / sx - 1) / 2), hh = Math.max(0, (1 / s - 1) / 2);   // al achicar se toma el máximo de varios puntos para no perder líneas finas; a tamaño normal, uno solo
        const m = hw || hh ? Math.max(muestra(px - hw, py - hh), muestra(px + hw, py - hh), muestra(px - hw, py + hh), muestra(px + hw, py + hh)) : muestra(px, py);
        if (m) A[r * cols + c] = Math.min(.98, Math.pow(m / 9, 1.25) * 1.18 * gan);   // se acentúan las líneas fuertes y se apagan los restos
      }
      for (const [ex, ey] of D.ojos) {   // ojos que brillan con el bajo
        const ox = mxS + (ex - bx) * sx, oy = myS + (ey - by) * s + (ey > D.corte ? desp * s : 0), rc = D.cols * .05 * sx, rr = rc * cw / ch;
        for (let r = Math.max(0, Math.floor(oy - rr)); r <= Math.min(filas - 1, Math.ceil(oy + rr)); r++) for (let c = Math.max(0, Math.floor(ox - rc)); c <= Math.min(cols - 1, Math.ceil(ox + rc)); c++) {
          const q = Math.hypot((c - ox) / rc, (r - oy) / rr); if (q < 1) A[r * cols + c] = Math.max(A[r * cols + c], q < .45 ? 1.35 : (.25 + b * .75) * (1 - q));
        }
      }
      return { mx: mxS * cw, my: (myS + ((D.corte + desp / 2) - by) * s) * ch, grow };
    }
    // lo que cubre la pantalla entera (por encima de la interfaz): el círculo negro que sale de la boca, caracteres aspirados y los ojos en la oscuridad
    function dibujarVelo(u, t, col) {
      if (!velo) { velo = document.createElement("canvas"); velo.style.cssText = "position:fixed;inset:0;z-index:80;pointer-events:none"; document.body.appendChild(velo); }
      const g2 = velo.getContext("2d"); if (velo.width !== innerWidth || velo.height !== innerHeight) { velo.width = innerWidth; velo.height = innerHeight; }
      g2.clearRect(0, 0, velo.width, velo.height);
      if (u < 11 || u > 18.6 || !info) return;
      const Rmax = Math.hypot(innerWidth, innerHeight) * 1.08, [r, gc, bl] = col, vivo = `rgba(${r},${gc},${bl},`;
      const R = u < 14.2 ? Rmax * Math.pow(ease((u - 12) / 2.2), 2) : u < 16.4 ? Rmax : Rmax * (1 - ease((u - 16.4) / 2));
      g2.font = fuente(); g2.textBaseline = "middle"; g2.textAlign = "center";
      if (u < 14.2) for (let i = 0; i < 70; i++) {   // caracteres aspirados hacia la boca
        const k = Math.max(0, Math.min(1, (u - 11.2) / 3 - hash(i, 3, 1) * .5)), a = hash(i, 1, 1) * TAU, dist = (1 - k * k) * Rmax * (.3 + .6 * hash(i, 2, 1));
        g2.fillStyle = vivo + (.3 + .6 * k) + ")"; g2.fillText(CABEZA[Math.floor(hash(i, 4, 1) * CABEZA.length)], info.mx + Math.cos(a + k * 2) * dist, info.my + Math.sin(a + k * 2) * dist * .8);
      }
      if (R > 2) {
        g2.fillStyle = "#000"; g2.beginPath(); g2.arc(info.mx, info.my, R, 0, TAU); g2.fill();
        g2.fillStyle = "#e8fff0"; const n = Math.min(260, Math.floor(R / 4) + 20);
        for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = R * (1 + (hash(i, 7, Math.floor(t * 10)) - .5) * .025); g2.fillText(CABEZA[Math.floor(hash(i, 9, Math.floor(t * 6)) * CABEZA.length)], info.mx + Math.cos(a) * rr, info.my + Math.sin(a) * rr); }
      }
      if (u > 14.2 && u < 16.6 && R > Rmax * .9) {   // oscuridad: solo se ven los ojos
        const al = Math.min(1, (u - 14.2) / .4) * Math.min(1, (16.6 - u) / .4); g2.fillStyle = vivo + al + ")"; g2.font = `${Math.round(innerHeight / 46 * 3)}px "VT323", monospace`;
        const ojo = Math.floor(t * 3) % 8 === 0 ? "-  -" : "(O)  (O)"; g2.fillText(ojo, innerWidth / 2, innerHeight * .46);
        const unidad = innerHeight / 46;
        if (u > 14.8) { g2.font = `${Math.round(innerHeight / 46 * 1.4)}px "VT323", monospace`; g2.fillStyle = `rgba(232,255,240,${al * .8})`; g2.fillText(u < 15.6 ? "*GULP*" : "...tenia hambre.", innerWidth / 2, innerHeight * .46 + unidad * 3.2); }
      }
    }

    function lanzar(t, forzado) {   // un evento nuevo con el tiempo
      const tipos = ["glitch", "alerta", "scan", "invertir"];
      let tipo = tipos[Math.floor(Math.random() * tipos.length)];
      if (forzado) tipo = forzado; else if (T().demonio && t - t0 > 30 && t - demonioAntes > 80 && Math.random() < .3) tipo = "demonio";   // muy de vez en cuando
      if (tipo === "demonio") demonioAntes = t;
      if (tipo === "demonio" && criatura) { factorTam = .7; medir(); }   // más celdas y más chicas: el sprite se aprecia con más detalle
      ev = { tipo, t0: t, dur: { glitch: .55, alerta: 2.6, scan: 1.2, invertir: .22, demonio: 18.6 }[tipo], criatura: tipo === "demonio" && !!criatura, msg: T().alertas[Math.floor(Math.random() * T().alertas.length)], filas: Array.from({ length: filas }, () => (Math.random() < .3 ? Math.round((Math.random() - .5) * 26) : 0)) };
    }

    function dibujar(t, dt, d) {
      const col = op.color(), [r, gc, bl] = col, cadena = (a) => `rgba(${r},${gc},${bl},${a})`;
      const b = suaveB;
      // mezcla de escenas con fundido
      if (t0 === null) t0 = t;
      const ESC = escenasAct(); if (esc >= ESC.length) esc = 0;
      G.fill(0); K.fill(0);
      if (sig < 0 && ESC.length > 1 && t - tCambio > cambio) { sig = (esc + 1) % ESC.length; if (ESC[sig] === "CARATULA" && !imgOk) sig = (sig + 1) % ESC.length; tFundido = t; }
      if (tCambio === 1e9) tCambio = t;
      if (miaImg instanceof HTMLVideoElement) { const vista = ESC[esc] === "MIA" || ESC[sig] === "MIA"; if (vista && miaImg.paused) miaImg.play().catch(() => {}); else if (!vista && !miaImg.paused) miaImg.pause(); }
      escena[ESC[esc]](I, t, dt, d, b);
      let k = 0;
      if (sig >= 0) { k = Math.min(1, (t - tFundido) / 1.6); escena[ESC[sig]](J, t, dt, d, b); if (k >= 1) { esc = sig; sig = -1; tCambio = t; I.set(J); k = 0; } }
      if (conEventos) {
        if (!ev && t - t0 > 5 && t > prox) { lanzar(t); prox = t + ev.dur + 10 + Math.random() * 10; }
        if (ev && t - ev.t0 > ev.dur) { if (ev.criatura) { factorTam = 1; medir(); } ev = null; }
      }
      if (ev && ev.tipo === "demonio") { info = (ev.criatura ? sprite : demonio)(I, t - ev.t0, t, b); k = 0; } else info = null;
      dibujarVelo(ev && ev.tipo === "demonio" ? t - ev.t0 : -1, t, col);
      document.body.classList.toggle("demonioActivo", !!(ev && ev.tipo === "demonio" && t - ev.t0 < 16.4));   // la interfaz se esconde para que se vea el demonio
      const invertido = ev && ev.tipo === "invertir";
      g.clearRect(0, 0, lienzo.width, lienzo.height);
      if (invertido) { g.fillStyle = cadena(.9); g.fillRect(0, 0, lienzo.width, lienzo.height); }
      g.font = fuente(); g.textBaseline = "top";
      const multi = !!T().multicolor, base = multi ? tonoDe(col) : 0, L0 = multi ? 84 : 7, cubos = Array.from({ length: L0 + 65 }, () => []), u = ev && ev.tipo === "scan" ? (t - ev.t0) / ev.dur * (filas + 6) - 3 : -99;
      for (let rr = 0; rr < filas; rr++) {
        const desp = ev && (ev.tipo === "glitch" || (ev.tipo === "demonio" && t - ev.t0 > 16.4 && t - ev.t0 < 17.6)) ? ev.filas[rr] : 0;
        for (let c = 0; c < cols; c++) {
          const i = rr * cols + c; let v = k > 0 ? I[i] * (1 - k) + J[i] * k : I[i];
          if (Math.abs(rr - u) < 1.6) v += .9 * (1 - Math.abs(rr - u) / 1.6);
          if (v < .07) continue;
          const chr = G[i] ? String.fromCharCode(G[i]) : v >= 1 ? CABEZA[Math.floor(hash(c, rr, Math.floor(t * 9)) * CABEZA.length)] : RAMPA[Math.min(RAMPA.length - 1, Math.floor(v * (RAMPA.length - 1) + .4))];
          if (chr === " ") continue;
          const nv = Math.min(6, Math.floor(v * 5));
          if (K[i]) { cubos[L0 + K[i]].push((c + desp) * cw, rr * ch, chr); continue; }
          cubos[multi ? nv * 12 + (Math.floor((((H[i] % 1) + 1) % 1) * 12) % 12) : nv].push((c + desp) * cw, rr * ch, chr);
        }
      }
      for (let l = 0; l < cubos.length; l++) {
        const q = cubos[l]; if (!q.length) continue;
        if (l > L0) g.fillStyle = invertido ? "#000" : miaPal[l - L0 - 1];
        else if (multi) { const nv = Math.floor(l / 12), hb = l % 12; g.fillStyle = invertido ? "#000" : `hsl(${(base + hb * 30) % 360},95%,${nv >= 6 ? 86 : 30 + nv * 9}%)`; }
        else g.fillStyle = invertido ? "#000" : l === 6 ? "#e8fff0" : cadena(.18 + l * .14);
        for (let n = 0; n < q.length; n += 3) g.fillText(q[n + 2], q[n], q[n + 1]);
      }
      if (ev && ev.tipo === "glitch") {   // fantasma de color desplazado
        g.globalCompositeOperation = "screen"; g.fillStyle = "rgba(255,40,90,.35)"; for (let n = 0; n < cubos[4].length; n += 3) if (hash(n, 3, 1) < .25) g.fillText(cubos[4][n + 2], cubos[4][n] + cw * 2, cubos[4][n + 1]);
        g.globalCompositeOperation = "source-over";
      }
      // línea de estado arriba y arranque que se tipea
      g.fillStyle = cadena(.85);
      const barra = "|".repeat(Math.round(b * 12)).padEnd(12, ".");
      g.fillText(`[ ${T().nombre} ]  ESCENA: ${ESC[sig >= 0 && k > .5 ? sig : esc]}${ev ? "  EVENTO: " + ev.tipo.toUpperCase() : ""}  BAJO [${barra}]  T+${String(Math.floor(t - t0)).padStart(4, "0")}s`, cw, ch * .3);
      const ta = t - t0;
      if (ta < 7) { g.globalAlpha = ta > 5.5 ? Math.max(0, (7 - ta) / 1.5) : 1; let n = Math.floor(ta * 34);
        T().arranque.forEach((linea, i) => { const mostrar = linea.slice(0, Math.max(0, n)); n -= linea.length + 6; g.fillStyle = "#e8fff0"; g.fillText(mostrar + (mostrar.length < linea.length && mostrar.length ? "█" : ""), cw, ch * (2 + i)); }); g.globalAlpha = 1; }
      if (ev && ev.tipo === "alerta") {
        const prog = Math.min(1, (t - ev.t0) / .5), txt = ev.msg.split("").map((x, i) => (i < prog * ev.msg.length ? x : CABEZA[Math.floor(Math.random() * CABEZA.length)])).join("");
        const ancho = txt.length + 6, x0 = Math.floor((cols - ancho) / 2) * cw, y0 = Math.floor(filas * .68) * ch, parpadeo = Math.floor((t - ev.t0) * 6) % 2 === 0;
        g.fillStyle = "rgba(0,0,0,.88)"; g.fillRect(x0 - cw, y0 - ch * .2, (ancho + 2) * cw, ch * 4.2);
        g.fillStyle = parpadeo ? "#e8fff0" : cadena(1); g.fillText("+" + "-".repeat(ancho - 2) + "+", x0, y0); g.fillText("|  " + txt + "  |", x0, y0 + ch); g.fillText("|" + " ".repeat(ancho - 2) + "|", x0, y0 + ch * 2); g.fillText("+" + "-".repeat(ancho - 2) + "+", x0, y0 + ch * 3);
      }
    }

    const setTema = (n) => { if (!TEMAS[n] || n === tema) return; tema = n; esc = 0; sig = -1; tCambio = 1e9; ev = null; t0 = null; juego = {}; factorTam = 1; medir(); };   // vuelve a empezar: arranque y primera escena del tema
    if (op.imagen) {
      if (/\.(mp4|webm)(&|$)/i.test(op.imagen)) {   // video propio: en bucle y sin sonido (suena la música)
        const vd = Object.assign(document.createElement("video"), { muted: true, loop: true, playsInline: true, preload: "auto" });
        vd.addEventListener("loadeddata", () => { miaImg = vd; prepararMia(); if (mia) { esc = 0; sig = -1; tCambio = 1e9; } });
        vd.src = op.imagen;
      } else { miaImg = new Image(); miaImg.onload = () => { prepararMia(); if (mia) { esc = 0; sig = -1; tCambio = 1e9; } }; miaImg.src = op.imagen; }
    }
    cont.__lanzar = (tipo) => lanzar(performance.now() / 1000, tipo);   // para pruebas   // para pruebas
    cont.__mia = () => miaImg;   // para pruebas
    cont.__escena = (n) => { esc = n % T().escenas.length; sig = -1; tCambio = 1e9; };   // para pruebas y vistas previas
    cont.__ascii = () => ({ t0, esc, sig, tCambio, cambio, ev: ev && ev.tipo, prox, cols, filas, ultimo });   // para pruebas
    R.cadaCuadro(() => {   // el tiempo de la app avanza por cuadro (más lento si el equipo va a menos de 60); aquí se usa el reloj real para que escenas y eventos duren lo que dicen
      const t = performance.now() / 1000;
      if (lienzo.width !== innerWidth || lienzo.height !== innerHeight) medir();
      if (t - ultimo < 1 / 30) return; const dt = Math.min(.1, t - ultimo || 1 / 30); ultimo = t;
      const d = R.espectro(); suaveB += (Math.min(1, R.energia(d, 1, 8) * 1.2) - suaveB) * .25; suaveM += (R.energia(d, 10, 60) - suaveM) * .2; suaveA += (R.energia(d, 60, 200) - suaveA) * .2;
      dibujar(t, dt, d);
    });
    return { tema: setTema };
  }
  return { montar };
})();
