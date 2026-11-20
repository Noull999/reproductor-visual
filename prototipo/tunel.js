// Fondo psicodélico tipo "Alquimia" de Windows Media Player: rayos que salen
// del centro y el cuadro anterior que se repite agrandado y girado (efecto túnel).
// color(i, t) devuelve el tono (0..360) de cada rayo: así cada plantilla elige su paleta.
"use strict";
const PALETAS = {
  fuego: (i, t) => 8 + 40 * (0.5 + 0.5 * Math.sin(t * 0.4 + i * 0.35)),
  arcoiris: (i, t) => (t * 35 + i * 9) % 360,
  oceano: (i, t) => 185 + 60 * Math.sin(t * 0.3 + i * 0.25),
};

function dibujarTunel(canvas, d, bajo, agudo, t, color) {
  if (canvas.width !== innerWidth || canvas.height !== innerHeight) { canvas.width = innerWidth; canvas.height = innerHeight; }
  if (!canvas.width || !canvas.height) return;   // ventana aún sin tamaño: drawImage fallaría
  const g = canvas.getContext("2d"), w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2;
  g.save();
  g.globalAlpha = 0.82;
  g.translate(cx, cy); g.rotate(0.004 + bajo * 0.02); g.scale(1.025 + bajo * 0.04, 1.025 + bajo * 0.04);
  g.drawImage(canvas, -cx, -cy);
  g.restore();
  g.fillStyle = "rgba(0,0,0,0.16)"; g.fillRect(0, 0, w, h);

  g.save();
  g.globalCompositeOperation = "lighter";
  g.translate(cx, cy);
  const rayos = 48, r0 = Math.min(w, h) * 0.08;
  for (let i = 0; i < rayos; i++) {
    const v = d[Math.floor(i / rayos * 180) + 2] / 255;
    const ang = i / rayos * Math.PI * 2 + t * 0.3;
    const largo = r0 + v * Math.min(w, h) * 0.55;
    g.strokeStyle = `hsla(${color(i, t)}, 100%, ${38 + agudo * 25}%, ${0.06 + v * 0.3})`;
    g.lineWidth = 2 + v * 6;
    g.beginPath();
    g.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
    g.lineTo(Math.cos(ang) * largo, Math.sin(ang) * largo);
    g.stroke();
  }
  const brillo = g.createRadialGradient(0, 0, 0, 0, 0, r0 * (2 + bajo * 6));
  brillo.addColorStop(0, `hsla(${color(0, t)}, 100%, 65%, ${0.12 + bajo * 0.35})`);
  brillo.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = brillo; g.beginPath(); g.arc(0, 0, r0 * (2 + bajo * 6), 0, Math.PI * 2); g.fill();
  g.restore();
}
