// Agujero negro retro (fondo de la plantilla 2000s y opción "Agujero negro" de las plantillas propias).
// Es un CG pintado al estilo de los 2000 dibujado a baja resolución (se ve suave, como en una tele de tubo):
// gira lento, se acerca con el bajo, el borde del agujero destella con los golpes, y lleva líneas de escaneo.
// crearAgujero(canvas) → { tono(grados, brillo%), dibujar(t, bajo) }
"use strict";
function crearAgujero(canvas) {
  const W = 640, H = 360, CX = W * .49, CY = H * .5;
  canvas.width = W; canvas.height = H;
  const img = new Image(); img.src = "img/fondos/agujero.webp";
  const es = Array.from({ length: 70 }, () => [Math.random(), Math.random(), Math.random()]);
  // Líneas de escaneo y viñeta: se dibujan una vez y se pegan encima cada cuadro
  const crt = document.createElement("canvas"); crt.width = W; crt.height = H;
  const cg = crt.getContext("2d"); cg.fillStyle = "rgba(0,0,0,.32)"; for (let y = 0; y < H; y += 2) cg.fillRect(0, y, W, 1);
  const vin = cg.createRadialGradient(CX, CY, H * .35, CX, CY, W * .62); vin.addColorStop(0, "rgba(0,0,0,0)"); vin.addColorStop(1, "rgba(0,0,0,.7)");
  cg.fillStyle = vin; cg.fillRect(0, 0, W, H);
  let zoom = 1.15, prom = 0, golpe = 0;
  return {
    tono(grados, brillo = 100) { canvas.style.filter = `hue-rotate(${grados}deg) brightness(${brillo / 100})`; },
    dibujar(t, bajo) {
      if (!img.complete || !img.naturalWidth) return;
      prom = prom * .94 + bajo * .06; if (bajo > prom * 1.22 + .07) golpe = 1; golpe *= .86;
      const g = canvas.getContext("2d");
      zoom += ((1.16 + bajo * .1 + golpe * .04) - zoom) * .12;
      g.save(); g.translate(CX, CY); g.rotate(t * .012); g.scale(zoom, zoom); g.drawImage(img, -CX * 1.08, -CY * 1.08, W * 1.08, H * 1.08); g.restore();
      g.globalCompositeOperation = "lighter";
      const r = H * (.2 + bajo * .08), halo = g.createRadialGradient(CX, CY, r * .55, CX, CY, r * 1.6);
      halo.addColorStop(0, "rgba(0,0,0,0)"); halo.addColorStop(.35, `rgba(255,170,90,${.1 + bajo * .3 + golpe * .25})`); halo.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = halo; g.fillRect(0, 0, W, H);
      g.fillStyle = "#fff";
      es.forEach(e => { g.globalAlpha = (.3 + .7 * Math.abs(Math.sin(t * (1 + e[2] * 2) + e[0] * 40))) * (.4 + golpe * .6); g.fillRect(Math.round(e[0] * W), Math.round(e[1] * H), 1, 1); });
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      g.drawImage(crt, 0, 0);
    },
  };
}
