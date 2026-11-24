// MilkDrop (los visuales de Winamp) con Butterchurn (MIT, Jordan Berg; ver vendor/LICENSE-butterchurn.txt).
// Se dibuja con WebGL2 y recibe la onda de nuestro propio analizador (R.ondaAudio), así que no toca el audio de la app.
// Las librerías (~2,7 MB) solo se cargan cuando una plantilla usa este fondo.
//   Milkdrop.soportado()                       ¿hay WebGL2?
//   Milkdrop.montar(lienzo, { cambio, velocidad, tam }) → Promise<{ siguiente }>
//     cambio: segundos entre un visual y otro · velocidad: 0.2-1.5 (1 = la del visual original) · tam: () => [ancho, alto] fijo (si no, la pantalla)
"use strict";
const Milkdrop = (() => {
  const soportado = () => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch (e) { return false; } };
  const cargar = (src) => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error("No se pudo cargar " + src)); document.head.appendChild(s); });
  let listas = null;
  // 395 visuales distintos: el paquete principal (100) y los extra (146 + 122 + 87, con algunos repetidos), todos MIT. Si un extra no carga, se sigue con los demás.
  const PAQUETES = [["butterchurn-presets", "butterchurnPresets"], ["butterchurn-presets-extra", "butterchurnPresetsExtra"], ["butterchurn-presets-extra2", "butterchurnPresetsExtra2"], ["butterchurn-presets-md1", "butterchurnPresetsMD1"]];
  const librerias = () => listas || (listas = Promise.all([cargar("vendor/butterchurn.min.js"), ...PAQUETES.map(([f]) => cargar(`vendor/${f}.min.js`).catch(() => null))]).then(() => {
    const b = window.butterchurn && (window.butterchurn.default || window.butterchurn), presets = {};
    for (const [, g] of PAQUETES) { const p = window[g] && (window[g].getPresets ? window[g] : window[g].default); if (p && p.getPresets) Object.assign(presets, p.getPresets()); }
    if (!b || !b.createVisualizer || !Object.keys(presets).length) throw new Error("MilkDrop no cargó bien.");
    return { b, presets };
  }));

  async function montar(lienzo, op = {}) {
    const { b, presets } = await librerias();
    const escala = 0.75, tam = op.tam || (() => [Math.max(320, Math.round(innerWidth * escala)), Math.max(180, Math.round(innerHeight * escala))]);   // al 75%: se ve igual y pesa mucho menos
    let [w, h] = tam(); lienzo.width = w; lienzo.height = h;
    const viz = b.createVisualizer(new (window.AudioContext || window.webkitAudioContext)(), lienzo, { width: w, height: h, pixelRatio: 1 });
    const nombres = Object.keys(presets).sort(() => Math.random() - .5);
    let i = -1;
    const siguiente = (mezcla = 5) => { i = (i + 1) % nombres.length; try { viz.loadPreset(presets[nombres[i]], mezcla); } catch (e) { /* un preset que no compila se salta */ if (nombres.length > 1) siguiente(0); } };
    siguiente(0);
    const cada = Math.max(8, Math.min(120, +op.cambio || 25));
    setInterval(() => { if (!document.hidden) siguiente(); }, cada * 1000);
    lienzo.style.cursor = "pointer"; lienzo.onclick = () => siguiente();   // cambia por tiempo o con un clic, como los demás fondos
    addEventListener("resize", () => { [w, h] = tam(); lienzo.width = w; lienzo.height = h; viz.setRendererSize(w, h); });
    let ultimo = 0; const vel = Math.min(1.5, Math.max(.2, +op.velocidad || 1));
    R.cadaCuadro((t) => {
      const dt = Math.min(.1, Math.max(1 / 240, t - ultimo || 1 / 60)) * vel; ultimo = t;   // velocidad < 1 = el visual se mueve más despacio
      const onda = R.ondaAudio();   // 1024 muestras (0-255, 128 = silencio), las que espera Butterchurn
      viz.render({ audioLevels: { timeByteArray: onda, timeByteArrayL: onda, timeByteArrayR: onda }, elapsedTime: dt });
    });
    return { siguiente };
  }
  return { soportado, montar };
})();
