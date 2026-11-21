// Fondo "haz de píxeles": una columna de luz con píxeles que caen.
// energia() devuelve {bajo, medio, agudo} (0..1) o un solo número; sin ella, un pulso suave.
// color() devuelve [r, g, b] del tema; sin ella, el rojo del portfolio.
"use strict";
function iniciarHaz(canvas, energia, color) {
  const g = canvas.getContext("2d");
  const TAM = 4;                      // tamaño de cada píxel
  let gotas = [], ondas = [], t = 0, bajoS = 0, medioS = 0, promedio = 0.2, ultimoGolpe = 0;

  function ajustar() { canvas.width = innerWidth; canvas.height = innerHeight; }
  addEventListener("resize", ajustar); ajustar();

  function leer() {
    if (!energia) { const p = 0.25 + 0.15 * Math.sin(t * 1.3); return { bajo: p, medio: p * 0.6, agudo: p * 0.4 }; }
    const e = energia();
    return typeof e === "number" ? { bajo: e, medio: e * 0.7, agudo: e * 0.5 } : e;
  }

  function cuadro() {
    t += 0.016 * (typeof R !== "undefined" && R.velocidad ? R.velocidad : 1);
    const w = canvas.width, h = canvas.height;
    if (!w || !h) { requestAnimationFrame(cuadro); return; }
    const { bajo, medio, agudo } = leer();
    const [r, gg, b] = color ? color() : [255, 45, 61];
    const rgba = (a, mezcla = 0) => `rgba(${r + (255 - r) * mezcla | 0},${gg + (255 - gg) * mezcla | 0},${b + (255 - b) * mezcla | 0},${a})`;
    bajoS += (bajo - bajoS) * 0.25; medioS += (medio - medioS) * 0.15;

    // Golpe: el bajo sube bastante sobre su promedio reciente
    promedio += (bajo - promedio) * 0.02;
    if (bajo > promedio * 1.3 && bajo > 0.3 && t - ultimoGolpe > 0.22) { ultimoGolpe = t; ondas.push({ r: 0, a: 0.5 + bajo * 0.4 }); }

    // El haz se mece y cambia poco de ancho; lo que más cambia es su brillo
    const cx = w * 0.72 + Math.sin(t * 0.35) * w * 0.035 + Math.sin(t * 1.7) * w * 0.006 * medioS;
    const ancho = w * (0.055 + bajoS * 0.02);

    g.fillStyle = "rgba(7, 4, 5, 0.32)";            // estela
    g.fillRect(0, 0, w, h);

    const luz = g.createLinearGradient(cx - ancho, 0, cx + ancho, 0);
    luz.addColorStop(0, rgba(0));
    luz.addColorStop(0.5, rgba(0.18 + bajoS * 0.6, 0.55 + bajoS * 0.35));
    luz.addColorStop(1, rgba(0));
    g.fillStyle = luz;
    g.fillRect(cx - ancho, 0, ancho * 2, h);

    // Rayos finos a los lados: aparecen con los medios y titilan con los agudos
    for (let i = 0; i < 4; i++) {
      const lado = i % 2 ? 1 : -1, sep = ancho * (1.4 + i * 0.55 + Math.sin(t * (0.6 + i * 0.3)) * 0.25);
      const a = Math.max(0, medioS * 1.2 - i * 0.12) * (0.55 + 0.45 * Math.sin(t * 9 + i * 2) * agudo);
      if (a < 0.02) continue;
      g.fillStyle = rgba(a * 0.6, 0.4);
      g.fillRect(cx + lado * sep, 0, 2, h);
    }

    // Ondas del golpe: anillos que se abren desde el centro del haz
    ondas = ondas.filter(o => o.a > 0.02);
    for (const o of ondas) {
      o.r += w * 0.012; o.a *= 0.93;
      g.strokeStyle = rgba(o.a, 0.3); g.lineWidth = 3;
      g.beginPath(); g.ellipse(cx, h * 0.55, o.r, o.r * 0.35, 0, 0, Math.PI * 2); g.stroke();
    }

    // Píxeles que caen: más con los medios, más rápido con los agudos
    const nuevos = 2 + medio * 10 + (t - ultimoGolpe < 0.1 ? 18 : 0);
    for (let i = 0; i < nuevos; i++) {
      const dx = (Math.random() - 0.5) * ancho * 3.2;
      gotas.push({ x: Math.round((cx + dx) / TAM) * TAM, y: -10, v: 2 + Math.random() * 5 + agudo * 12,
        l: 8 + Math.random() * 60, a: 0.3 + Math.random() * 0.7 });
    }
    gotas = gotas.filter(p => p.y < h + 80);
    for (const p of gotas) {
      p.y += p.v;
      const cerca = 1 - Math.min(1, Math.abs(p.x - cx) / (ancho * 1.6));
      g.fillStyle = rgba(p.a * (0.35 + cerca * 0.65), cerca * 0.7);
      g.fillRect(p.x, p.y, TAM - 1, p.l);
    }

    // Piso de píxeles al fondo
    for (let i = 0; i < 40 + bajoS * 90; i++) {
      const x = cx + (Math.random() - 0.5) * w * 0.7, y = h - Math.random() * h * 0.18;
      g.fillStyle = rgba(Math.random() * 0.35 * (0.4 + bajoS));
      g.fillRect(Math.round(x / TAM) * TAM, Math.round(y / TAM) * TAM, TAM - 1, TAM - 1);
    }
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
}
