// Fondo de las pantallas de la app (principal, Editor, Ajustes, Guía): la galaxia de agujero.js, desenfocada.
// En oscuro va apagada y en claro lavada (casi pastel). Se mece y respira sola: aquí no suena música.
// Usa el <canvas id="haz"> que ya trae cada página (fijo, detrás de todo).
"use strict";
function fondoApp() {
  const c = document.getElementById("haz"); if (!c) return;
  const a = crearAgujero(c);
  const aplicar = () => {
    c.style.filter = document.documentElement.dataset.tema === "claro"
      ? "blur(16px) saturate(1.25) brightness(1.3) opacity(.3)"
      : "blur(14px) brightness(.38) saturate(1.4)";
  };
  aplicar(); new MutationObserver(aplicar).observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
  let t = 0, ultimo = 0;
  const paso = (ms) => {
    requestAnimationFrame(paso);
    if (ms - ultimo < 33) return;   // ~30 cuadros por segundo bastan para algo tan lento y desenfocado
    ultimo = ms; t += .033; a.dibujar(t, .2 + .08 * Math.sin(t * .6));
  };
  requestAnimationFrame(paso);
}
