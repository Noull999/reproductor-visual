// Visualización estilo reproductores de los 2000 (Windows Media Player / Winamp): fondo de la plantilla 2000s y opción
// "Visualización 2000" de las plantillas propias. Todo se dibuja en vivo con la música a baja resolución y se estira
// (se ve suave y brillante, como entonces). La "retroalimentación" (cada cuadro redibuja el anterior un poco más grande,
// girado y desvanecido) es lo que hace los túneles y las estelas. Rota entre 3 modos: al cambiar de tema y cada 40 s.
// crearVisu2000(canvas) → { dibujar(t, espectro, onda, bajo, medio, agudo, tono), siguiente() }
"use strict";
function crearVisu2000(canvas) {
  const W = 480, H = 270, CX = W / 2, CY = H / 2;
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext("2d"), copia = document.createElement("canvas"); copia.width = W; copia.height = H;
  const c2 = copia.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  const MODOS = ["bateria", "rayos", "alquimia"];
  let modo = 0, desde = 0, prom = 0, golpe = 0, giro = 0;

  // redibuja el cuadro anterior transformado: zoom > 1 = túnel hacia afuera; filtro = humo / cambio de color
  function eco(zoom, rot, alfa, filtro) {
    c2.clearRect(0, 0, W, H); c2.drawImage(canvas, 0, 0);
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.save(); g.filter = filtro || "none"; g.globalAlpha = alfa;
    g.translate(CX, CY); g.rotate(rot); g.scale(zoom, zoom); g.drawImage(copia, -CX, -CY);
    g.restore(); g.filter = "none"; g.globalAlpha = 1;
  }
  const col = (h, l, a) => `hsla(${h},100%,${l}%,${a})`;
  const banda = (d, i, n) => { const a = Math.floor(2 * Math.pow(90, i / n)), b = Math.max(a + 1, Math.floor(2 * Math.pow(90, (i + 1) / n))); let s = 0; for (let k = a; k < b; k++) s += d[k] || 0; return Math.min(1, s / (b - a) / 200); };

  function bateria(t, d, bajo, tono) {
    giro += .004 + bajo * .02;
    eco(1.035 + bajo * .05, .015 + bajo * .03, .945);
    g.globalCompositeOperation = "lighter";
    const N = 64;
    for (let i = 0; i < N; i++) {
      const v = banda(d, i % (N / 2), N / 2), a = i / N * Math.PI * 2 + giro, r0 = 6 + bajo * 10, r1 = r0 + 22 + v * 110;
      g.strokeStyle = col(tono + Math.sin(i * .35 + t) * 35, 40 + v * 12, .2 + v * .35); g.lineWidth = 1.5 + v * 3;
      g.beginPath(); g.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0); g.lineTo(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1); g.stroke();
    }
    g.globalCompositeOperation = "source-over";
    g.fillStyle = "#000"; g.beginPath(); g.arc(CX, CY, 5 + bajo * 8, 0, 7); g.fill();   // el "ojo" negro del túnel
  }

  function rayos(t, d, bajo, agudo, tono) {
    eco(1.012, .004, .9, "blur(1.4px)");
    g.globalCompositeOperation = "lighter";
    const r = 40 + bajo * 70, nube = g.createRadialGradient(CX, CY, 0, CX, CY, r);
    nube.addColorStop(0, col(tono, 62, .28 + bajo * .25)); nube.addColorStop(.4, col(tono, 48, .16)); nube.addColorStop(1, col(tono, 30, 0));
    g.fillStyle = nube; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 6; k++) {   // humo: manchas que se arremolinan alrededor del centro
      const a = t * .7 + k * 1.05, rr = 25 + 18 * Math.sin(t * 1.3 + k), x = CX + Math.cos(a) * rr, y = CY + Math.sin(a) * rr * .8, s = 18 + bajo * 30;
      const m = g.createRadialGradient(x, y, 0, x, y, s); m.addColorStop(0, col(tono + 15, 50, .08 + agudo * .1)); m.addColorStop(1, col(tono, 40, 0));
      g.fillStyle = m; g.fillRect(x - s, y - s, s * 2, s * 2);
    }
    const n = 1 + Math.round(golpe * 4 + agudo * 2);
    g.strokeStyle = col(tono + 10, 64, .7); g.shadowColor = col(tono, 50, .9); g.shadowBlur = 6; g.lineWidth = 1.2;
    for (let k = 0; k < n; k++) {   // relámpagos: líneas quebradas del centro hacia afuera
      let a = Math.random() * Math.PI * 2, x = CX, y = CY; g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 14; s++) { a += (Math.random() - .5) * .9; x += Math.cos(a) * 14; y += Math.sin(a) * 14; g.lineTo(x, y); }
      g.stroke();
    }
    g.shadowBlur = 0; g.globalCompositeOperation = "source-over";
  }

  function alquimia(t, onda, bajo, tono) {
    eco(1.02 + bajo * .02, -.02, .95, "blur(.6px) hue-rotate(4deg)");
    g.globalCompositeOperation = "lighter";
    for (let rep = 0; rep < 2; rep++) {   // la onda real, dos veces en cruz, que la retroalimentación convierte en remolino
      g.save(); g.translate(CX, CY); g.rotate(t * .5 + rep * Math.PI / 2);
      g.strokeStyle = col(tono + rep * 50, 55, .6); g.lineWidth = 1.6; g.beginPath();
      for (let i = 0; i < onda.length; i += 4) { const x = (i / onda.length - .5) * W * .7, y = (onda[i] - 128) / 128 * H * .35 * (1 + bajo); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); g.restore();
    }
    g.globalCompositeOperation = "source-over";
  }

  return {
    siguiente() { modo = (modo + 1) % MODOS.length; desde = 0; },
    dibujar(t, d, onda, bajo, medio, agudo, tono) {
      prom = prom * .94 + bajo * .06; if (bajo > prom * 1.22 + .07) golpe = 1; golpe *= .86;
      if (!desde) desde = t; else if (t - desde > 40) { modo = (modo + 1) % MODOS.length; desde = t; }
      const m = MODOS[modo];
      if (m === "bateria") bateria(t, d, bajo, tono);
      else if (m === "rayos") rayos(t, d, bajo, agudo, tono);
      else alquimia(t, onda, bajo, tono);
    },
  };
}
