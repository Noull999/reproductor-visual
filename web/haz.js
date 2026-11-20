// Fondo "haz de píxeles": una columna de luz roja con píxeles que caen.
// energia() devuelve 0..1 (bajo de la música); sin música, un pulso suave.
"use strict";
function iniciarHaz(canvas, energia) {
  const g = canvas.getContext("2d");
  const TAM = 4;                      // tamaño de cada píxel
  let gotas = [], t = 0;

  function ajustar() { canvas.width = innerWidth; canvas.height = innerHeight; }
  addEventListener("resize", ajustar); ajustar();

  function cuadro() {
    t += 0.016;
    const w = canvas.width, h = canvas.height;
    if (!w || !h) { requestAnimationFrame(cuadro); return; }
    const e = energia ? energia() : 0.25 + 0.15 * Math.sin(t * 1.3);
    const cx = w * 0.72, ancho = w * (0.05 + e * 0.07);

    g.fillStyle = "rgba(7, 4, 5, 0.32)";            // estela
    g.fillRect(0, 0, w, h);

    // La columna de luz
    const luz = g.createLinearGradient(cx - ancho, 0, cx + ancho, 0);
    luz.addColorStop(0, "rgba(255,45,61,0)");
    luz.addColorStop(0.5, `rgba(255,${190 + e * 60 | 0},${200 + e * 50 | 0},${0.25 + e * 0.55})`);
    luz.addColorStop(1, "rgba(255,45,61,0)");
    g.fillStyle = luz;
    g.fillRect(cx - ancho, 0, ancho * 2, h);

    // Píxeles que caen: más y más rápido con la energía
    const nuevos = 2 + e * 14;
    for (let i = 0; i < nuevos; i++) {
      const dx = (Math.random() - 0.5) * ancho * 3.2;
      gotas.push({ x: Math.round((cx + dx) / TAM) * TAM, y: -10, v: 2 + Math.random() * 6 + e * 8,
        l: 8 + Math.random() * 60, a: 0.3 + Math.random() * 0.7 });
    }
    gotas = gotas.filter(p => p.y < h + 80);
    for (const p of gotas) {
      p.y += p.v;
      const cerca = 1 - Math.min(1, Math.abs(p.x - cx) / (ancho * 1.6));
      g.fillStyle = `rgba(255, ${80 + cerca * 170 | 0}, ${90 + cerca * 160 | 0}, ${p.a * (0.35 + cerca * 0.65)})`;
      g.fillRect(p.x, p.y, TAM - 1, p.l);
    }

    // Piso de píxeles al fondo
    for (let i = 0; i < 40 + e * 120; i++) {
      const x = cx + (Math.random() - 0.5) * w * 0.7, y = h - Math.random() * h * 0.18;
      g.fillStyle = `rgba(255,45,61,${Math.random() * 0.35 * (0.4 + e)})`;
      g.fillRect(Math.round(x / TAM) * TAM, Math.round(y / TAM) * TAM, TAM - 1, TAM - 1);
    }
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
}
