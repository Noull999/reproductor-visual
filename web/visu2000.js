// Visualizaciones estilo reproductores de los 2000 (Windows Media Player, Winamp, Sonique): fondo de la plantilla 2000s
// y opción "Visualización 2000" de las plantillas propias. Se dibujan en vivo con la música a baja resolución y se estiran
// (se ven suaves y brillantes, como entonces). La "retroalimentación" (cada cuadro redibuja el anterior un poco más
// grande, girado y desvanecido) hace los túneles y las estelas. Entre un efecto y otro hay un fundido de 2 s.
// crearVisu2000(canvas) → { grupo([efectos]), intervalo(seg, 0 = solo al cambiar de canción), siguiente(),
//                           dibujar(t, espectro, onda, bajo, medio, agudo, tono) }
"use strict";
const VISU2000 = ["estrellas", "anillos", "barras", "bateria", "llamas", "remolino", "rayos", "onda", "agua", "caleido"];
function crearVisu2000(canvas) {
  const W = 480, H = 270, CX = W / 2, CY = H / 2, FUNDIDO = 2;
  const lienzo = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
  canvas.width = W; canvas.height = H;
  const o = canvas.getContext("2d"), trabajo = lienzo(), g = trabajo.getContext("2d"), copia = lienzo(), c2 = copia.getContext("2d"), viejo = lienzo();
  const negro = (ctx) => { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); };
  negro(g); negro(o);
  let pico = .3, lista = VISU2000.slice(), modo = 0, cada = 45, desde = 0, ahora = 0, cambio = -99, prom = 0, golpe = 0, giro = 0;
  let estrellas = [], anillos = [], gotas = [], ultimoAnillo = 0;
  const FW = 120, FH = 68, calor = new Float32Array(FW * (FH + 2)), fuego = document.createElement("canvas"); fuego.width = FW; fuego.height = FH;
  const fg = fuego.getContext("2d"), fimg = fg.createImageData(FW, FH);

  // redibuja el cuadro anterior transformado: zoom > 1 = túnel hacia afuera; filtro = humo o cambio de color
  function eco(zoom, rot, alfa, filtro) {
    c2.clearRect(0, 0, W, H); c2.drawImage(trabajo, 0, 0); negro(g);
    g.save(); g.filter = filtro || "none"; g.globalAlpha = alfa;
    g.translate(CX, CY); g.rotate(rot); g.scale(zoom, zoom); g.drawImage(copia, -CX, -CY);
    g.restore(); g.filter = "none"; g.globalAlpha = 1;
  }
  const col = (h, l, a) => `hsla(${h},100%,${l}%,${a})`;
  const banda = (d, i, n) => { const a = Math.floor(2 * Math.pow(90, i / n)), b = Math.max(a + 1, Math.floor(2 * Math.pow(90, (i + 1) / n))); let s = 0; for (let k = a; k < b; k++) s += d[k] || 0; return Math.min(1, s / (b - a) / 200); };
  const hsl = (h, s, l) => {   // de HSL a RGB (0-255) para pintar el fuego pixel a pixel
    h = ((h % 1) + 1) % 1; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const c = (t) => { t = ((t % 1) + 1) % 1; return 255 * (t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p); };
    return [c(h + 1 / 3), c(h), c(h - 1 / 3)];
  };
  const sumar = (f) => { g.globalCompositeOperation = "lighter"; f(); g.globalCompositeOperation = "source-over"; };

  const EFECTOS = {
    // Plata: estrellas warp, túnel de anillos, barras y ondas
    estrellas(t, x) {
      eco(1, 0, .72);
      if (!estrellas.length) estrellas = Array.from({ length: 260 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() }));
      sumar(() => {
        g.lineWidth = 1.2;
        for (const e of estrellas) {
          const z0 = e.z; e.z -= .006 + x.bajo * .03 + golpe * .02;
          if (e.z <= .02) { e.x = Math.random() * 2 - 1; e.y = Math.random() * 2 - 1; e.z = 1; continue; }
          const px = (z) => [CX + e.x / z * CX * .5, CY + e.y / z * CY * .5], [a, b] = px(z0), [c, d] = px(e.z);
          g.strokeStyle = col(x.tono + e.x * 30, 55 + (1 - e.z) * 20, .3 + (1 - e.z) * .6);
          g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke();
        }
      });
    },
    anillos(t, x) {
      eco(1.01, .01, .8);
      if (golpe > .95 || t - ultimoAnillo > .45) { anillos.push({ r: 3, lados: 6, rot: t }); ultimoAnillo = t; }
      sumar(() => {
        for (let i = anillos.length - 1; i >= 0; i--) {
          const a = anillos[i]; a.r *= 1.035 + x.bajo * .04; if (a.r > W) { anillos.splice(i, 1); continue; }
          g.strokeStyle = col(x.tono + a.r * .3, 50, Math.min(.7, a.r / 60)); g.lineWidth = 1 + a.r / 60; g.beginPath();
          for (let k = 0; k <= a.lados; k++) { const an = a.rot + k / a.lados * Math.PI * 2; g.lineTo(CX + Math.cos(an) * a.r, CY + Math.sin(an) * a.r * .8); }
          g.stroke();
        }
      });
    },
    barras(t, x) {
      eco(1, 0, .55);
      const n = 32, a = W / n, piso = H * .62;
      sumar(() => {
        for (let i = 0; i < n; i++) {
          const v = banda(x.d, i, n), alto = 4 + v * piso * .9;
          g.fillStyle = col(x.tono + i * 2, 45 + v * 15, .55); g.fillRect(i * a + 1, piso - alto, a - 2, alto);
          g.fillStyle = col(x.tono + i * 2, 40, .18); g.fillRect(i * a + 1, piso + 2, a - 2, alto * .45);   // reflejo
        }
        g.strokeStyle = col(x.tono + 40, 60, .6); g.lineWidth = 1.2; g.beginPath();
        for (let i = 0; i < x.onda.length; i += 6) { const px = i / x.onda.length * W, py = H * .25 + (x.onda[i] - 128) / 128 * H * .18; i ? g.lineTo(px, py) : g.moveTo(px, py); }
        g.stroke();
      });
    },
    // Grafito: batería, llamas, remolino de plasma
    bateria(t, x) {
      giro += .004 + x.bajo * .02;
      eco(1.035 + x.bajo * .05, .015 + x.bajo * .03, .945);
      sumar(() => {
        const N = 64;
        for (let i = 0; i < N; i++) {
          const v = banda(x.d, i % (N / 2), N / 2), a = i / N * Math.PI * 2 + giro, r0 = 6 + x.bajo * 10, r1 = r0 + 22 + v * 110;
          g.strokeStyle = col(x.tono + Math.sin(i * .35 + t) * 35, 40 + v * 12, .2 + v * .35); g.lineWidth = 1.5 + v * 3;
          g.beginPath(); g.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0); g.lineTo(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1); g.stroke();
        }
      });
      g.fillStyle = "#000"; g.beginPath(); g.arc(CX, CY, 5 + x.bajo * 8, 0, 7); g.fill();   // el "ojo" negro del túnel
    },
    llamas(t, x) {   // el fuego clásico de los 2000: calor que nace abajo y sube enfriándose
      for (let i = 0; i < FW; i++) calor[(FH + 1) * FW + i] = calor[FH * FW + i] = Math.random() < .42 + x.bajo * .25 ? 1.1 + x.bajo * .3 + golpe * .5 : 0;
      const enfr = .006 - x.bajo * .002;
      for (let y = 0; y < FH; y++) for (let i = 0; i < FW; i++) {
        const k = (y + 1) * FW, v = (calor[k + (i + FW - 1) % FW] + calor[k + i] + calor[k + (i + 1) % FW] + calor[k + FW + i]) / 4.02 - enfr - Math.random() * .011;   // enfriamiento irregular = lenguas de fuego
        calor[y * FW + i] = v > 0 ? v : 0;
      }
      const px = fimg.data;
      for (let y = 0; y < FH; y++) for (let i = 0; i < FW; i++) {
        const v = Math.min(1, calor[y * FW + i] * 1.25), j = (y * FW + i) * 4, h = (x.tono - 25 + v * 40) / 360;
        const [rr, gg, bb] = hsl(h, 1, Math.min(.6, v * .7)); px[j] = rr; px[j + 1] = gg; px[j + 2] = bb; px[j + 3] = 255;
      }
      fg.putImageData(fimg, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(fuego, 0, 0, W, H);
    },
    remolino(t, x) {
      eco(1.008, .03 + x.bajo * .03, .96, "blur(1px)");
      sumar(() => {
        for (let k = 0; k < 5; k++) {
          const a = t * (.6 + k * .15) + k * 1.26, r = 45 + x.medio * 110 + 25 * Math.sin(t + k), px = CX + Math.cos(a) * r, py = CY + Math.sin(a) * r * .6, s = 30 + x.bajo * 40;
          const m = g.createRadialGradient(px, py, 0, px, py, s); m.addColorStop(0, col(x.tono + k * 12 - 25, 50, .22)); m.addColorStop(1, col(x.tono, 30, 0));
          g.fillStyle = m; g.fillRect(px - s, py - s, s * 2, s * 2);
        }
      });
    },
    // LCD verde: rayos y onda
    rayos(t, x) {
      eco(1.012, .004, .9, "blur(1.4px)");
      sumar(() => {
        const r = 70 + x.bajo * 110, nube = g.createRadialGradient(CX, CY, 0, CX, CY, r);
        nube.addColorStop(0, col(x.tono, 62, .28 + x.bajo * .25)); nube.addColorStop(.4, col(x.tono, 48, .16)); nube.addColorStop(1, col(x.tono, 30, 0));
        g.fillStyle = nube; g.fillRect(0, 0, W, H);
        for (let k = 0; k < 6; k++) {   // humo que se arremolina alrededor del centro
          const a = t * .7 + k * 1.05, rr = 25 + 18 * Math.sin(t * 1.3 + k), px = CX + Math.cos(a) * rr, py = CY + Math.sin(a) * rr * .8, s = 18 + x.bajo * 30;
          const m = g.createRadialGradient(px, py, 0, px, py, s); m.addColorStop(0, col(x.tono + 15, 50, .08 + x.agudo * .1)); m.addColorStop(1, col(x.tono, 40, 0));
          g.fillStyle = m; g.fillRect(px - s, py - s, s * 2, s * 2);
        }
        g.strokeStyle = col(x.tono + 10, 64, .7); g.shadowColor = col(x.tono, 50, .9); g.shadowBlur = 6; g.lineWidth = 1.2;
        for (let k = 0, n = 1 + Math.round(golpe * 4 + x.agudo * 2); k < n; k++) {   // relámpagos del centro hacia afuera
          let a = Math.random() * Math.PI * 2, px = CX, py = CY; g.beginPath(); g.moveTo(px, py);
          for (let s = 0; s < 22; s++) { a += (Math.random() - .5) * .9; px += Math.cos(a) * 14; py += Math.sin(a) * 14; g.lineTo(px, py); }
          g.stroke();
        }
        g.shadowBlur = 0;
      });
    },
    onda(t, x) {
      eco(1.02 + x.bajo * .02, -.02, .95, "blur(.6px) hue-rotate(4deg)");
      sumar(() => {
        for (let rep = 0; rep < 2; rep++) {   // la onda real en cruz; la retroalimentación la vuelve remolino
          g.save(); g.translate(CX, CY); g.rotate(t * .5 + rep * Math.PI / 2);
          g.strokeStyle = col(x.tono + rep * 50, 55, .6); g.lineWidth = 1.6; g.beginPath();
          for (let i = 0; i < x.onda.length; i += 4) { const px = (i / x.onda.length - .5) * W * 1.1, py = (x.onda[i] - 128) / 128 * H * .4 * (1 + x.bajo); i ? g.lineTo(px, py) : g.moveTo(px, py); }
          g.stroke(); g.restore();
        }
      });
    },
    // Azul: ondas de agua y caleidoscopio
    agua(t, x) {
      eco(.998, 0, .9, "blur(1.2px)");
      if (golpe > .95 || Math.random() < .03 + x.medio * .1) gotas.push({ x: Math.random() * W, y: Math.random() * H, r: 1, f: .6 + x.bajo * .4 });
      sumar(() => {
        for (let i = gotas.length - 1; i >= 0; i--) {
          const a = gotas[i]; a.r += 1.4 + a.f; a.f *= .985; if (a.f < .05 || a.r > W * .6) { gotas.splice(i, 1); continue; }
          for (let k = 0; k < 2; k++) { g.strokeStyle = col(x.tono + k * 20, 55, a.f * .55 / (k + 1)); g.lineWidth = 1.5; g.beginPath(); g.ellipse(a.x, a.y, a.r * (1 - k * .25), a.r * .55 * (1 - k * .25), 0, 0, 7); g.stroke(); }
        }
      });
    },
    caleido(t, x) {
      eco(1.012, .012, .9, "hue-rotate(2deg)");
      const N = 8, R = W * .62;
      sumar(() => {
        g.lineWidth = 1.4;
        for (let k = 0; k < N; k++) for (const lado of [1, -1]) {   // un trozo de la onda repetido en espejo alrededor del centro
          g.save(); g.translate(CX, CY); g.rotate(k / N * Math.PI * 2 + t * .2); g.scale(1, lado);
          g.strokeStyle = col(x.tono + k * 6, 52, .45); g.beginPath();
          for (let i = 0; i < 64; i++) { const v = (x.onda[i * 8] - 128) / 128; i ? g.lineTo(i / 64 * R, 8 + v * R * .35 * (1 + x.bajo)) : g.moveTo(0, 8); }
          g.stroke(); g.restore();
        }
      });
    },
  };

  function cambiar() {
    const v = viejo.getContext("2d"); v.clearRect(0, 0, W, H); v.drawImage(canvas, 0, 0);   // el efecto anterior se funde
    negro(g); estrellas = []; anillos = []; gotas = []; calor.fill(0);
    modo = (modo + 1) % lista.length; desde = ahora; cambio = ahora;
  }
  return {
    grupo(l) { const nueva = (l || VISU2000).filter(e => EFECTOS[e]); if (nueva.join() !== lista.join()) { lista = nueva.length ? nueva : VISU2000.slice(); modo = -1; cambiar(); } },
    intervalo(s) { cada = s; },
    siguiente: cambiar,
    dibujar(t, d, onda, bajo, medio, agudo, tono) {
      // se adapta a la música: el bajo se mide contra su pico reciente (con bajo potente no queda todo al máximo)
      pico = Math.max(bajo, pico * .997, .15); bajo = Math.min(1, bajo / pico * .5);
      ahora = t; if (!desde) desde = t;
      prom = prom * .94 + bajo * .06; if (bajo > prom * 1.22 + .07) golpe = 1; golpe *= .86;
      if (cada > 0 && t - desde > cada) cambiar();
      EFECTOS[lista[modo]](t, { d, onda, bajo, medio, agudo, tono });
      const base = o.createRadialGradient(CX, CY, 0, CX, CY, W * .62);
      base.addColorStop(0, col(tono, 35, .1 + bajo * .08)); base.addColorStop(1, col(tono + 20, 22, .16 + bajo * .06));
      o.globalAlpha = 1; o.fillStyle = "#000"; o.fillRect(0, 0, W, H); o.fillStyle = base; o.fillRect(0, 0, W, H);
      o.globalCompositeOperation = "lighter"; o.drawImage(trabajo, 0, 0); o.globalCompositeOperation = "source-over";
      const f = 1 - (t - cambio) / FUNDIDO; if (f > 0 && f <= 1) { o.globalAlpha = f; o.drawImage(viejo, 0, 0); o.globalAlpha = 1; }
    },
  };
}
