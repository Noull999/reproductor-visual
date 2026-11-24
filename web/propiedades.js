// Propiedades que se pueden cambiar en cada plantilla (las edita la Biblioteca y las aplican nucleo.js
// y cada plantilla). Se guardan por plantilla en localStorage ("props-liquido", …): solo datos, nunca código.
"use strict";
const Props = (() => {
  const DEFECTO = { intensidad: 50, velocidad: 50, lista: true, soloVisual: true, fondo: "", cuerpo: null, colorLibre: "", extra: {} };
  const clave = (id) => "props-" + id;
  // Dónde va cada pieza sobre el cuerpo de Headspace, en % de la imagen [x, y, ancho, alto]
  const ZONAS_HEADSPACE = {
    pantalla: [23.4, 23.4, 53.4, 38.6], botones: [33, 9.8, 34, 6.6], barra: [33, 64.6, 34, 4.2],
    ojos: [[24.5, 70.8, 15, 7.4], [61, 70.8, 15, 7.4]], boca: [43, 80.3, 14, 5],
    parlantes: [[5.3, 29.8, 11.4, 32.4], [83.3, 29.8, 11.4, 32.4]] };
  // Controles numéricos propios de cada plantilla
  const EXTRAS = {
    liquido: [{ id: "deformacion", nombre: "Fuerza de la deformación del vidrio", min: 0, max: 140, def: 70, unidad: "" }],
    headspace: [{ id: "brillo", nombre: "Brillo del fondo", min: 20, max: 130, def: 80, unidad: " %" },
      { id: "cambio", nombre: "Cambiar de visualización", min: 0, max: 3, def: 1, etiquetas: ["cada 20 s", "cada 45 s", "cada 90 s", "solo al cambiar de canción"] },
      { id: "pantalla", nombre: "En la pantalla", min: 0, max: 1, def: 0, etiquetas: ["canción, tiempo y visual", "solo la canción y el tiempo"] }],
    dosmil: [{ id: "tunel", nombre: "Brillo de la visualización de fondo", min: 20, max: 130, def: 70, unidad: " %" },
      { id: "cambio", nombre: "Cambiar de visualización", min: 0, max: 3, def: 1, etiquetas: ["cada 20 s", "cada 45 s", "cada 90 s", "solo al cambiar de canción"] }],
    ambiente: [{ id: "desenfoque", nombre: "Desenfoque del fondo", min: 10, max: 140, def: 70, unidad: " px" }],
    dreamcore: [{ id: "vhs", nombre: "Efecto VHS (grano, colores corridos, saltos)", min: 0, max: 100, def: 35, unidad: " %" }],
    pixel: [{ id: "pixel", nombre: "Tamaño de los píxeles", min: 3, max: 9, def: 5, unidad: " px" }],
    anime: [{ id: "milkdrop", nombre: "Visuales MilkDrop", min: 0, max: 2, def: 1, etiquetas: ["apagados (visualización clásica)", "de fondo", "en una ventana del reproductor"] },
      { id: "cambio", nombre: "Cambiar de visual", min: 0, max: 3, def: 1, etiquetas: ["cada 20 s", "cada 40 s", "cada 90 s", "solo con un clic"] },
      { id: "ritmo", nombre: "Velocidad de los visuales", min: 20, max: 150, def: 55, unidad: " %" },
      { id: "brillo", nombre: "Brillo del reproductor (baja los blancos fuertes)", min: 50, max: 110, def: 90, unidad: " %" },
      { id: "botones", nombre: "Botones encima del skin", min: 0, max: 2, def: 2, etiquetas: ["nunca", "solo los que casi no se ven", "siempre (más visibles)"] }],
  };
  const api = {
    DEFECTO, ZONAS_HEADSPACE, EXTRAS,
    leer(id) {
      try { return { ...DEFECTO, ...JSON.parse(localStorage.getItem(clave(id)) || "{}") }; } catch (e) { return { ...DEFECTO }; }
    },
    guardar(id, props) { try { localStorage.setItem(clave(id), JSON.stringify(props)); } catch (e) {} },
    // Valor de un control extra: el guardado o el predeterminado de la plantilla
    extra(id, nombre) {
      const def = (EXTRAS[id] || []).find(x => x.id === nombre);
      const v = (api.leer(id).extra || {})[nombre];
      return v === undefined ? (def ? def.def : 0) : v;
    },
    // 50 = tal cual está hoy; los extremos van de 0,3× a 1,7× (intensidad) y de 0,25× a 1,75× (velocidad)
    factorIntensidad: (v) => 0.3 + (v / 100) * 1.4,
    factorVelocidad: (v) => 0.25 + (v / 100) * 1.5,
    // Las plantillas propias comparten libre.html: cada una guarda sus propiedades con su id ("libre-p123");
    // las incluidas que también viven en libre.html (Anime, Psicodélico) usan su id a secas, como las ve la Biblioteca
    plantillaActual: () => {
      const n = (location.pathname.split("/").pop() || "").replace(".html", ""), q = new URLSearchParams(location.search).get("plantilla");
      return n === "libre" ? (["anime", "psicodelico"].includes(q) ? q : "libre-" + q) : n;
    },
    // Aplica los ajustes de una plantilla incluida (de un archivo o de la comunidad): su variante, sus propiedades y la deja elegida en la Biblioteca
    aplicarAjustes(a) {
      try { Object.entries(a.variante).forEach(([k, val]) => localStorage.setItem(k, val)); localStorage.setItem("biblioteca-plantilla", a.plantilla); } catch (e) {}
      const q = a.props;
      api.guardar(a.plantilla, { ...DEFECTO, intensidad: q.intensidad, velocidad: q.velocidad, lista: q.lista, soloVisual: q.soloVisual, colorLibre: q.colorLibre, extra: q.extra, fondo: q.fondo || "", cuerpo: q.cuerpo || null });
    },
    // Color propio de la persona (un "#rrggbb") o null; con él cada plantilla arma su variante "Propio"
    colorLibre: (id) => { const c = api.leer(id).colorLibre; return /^#[0-9a-f]{6}$/i.test(c || "") ? c.toLowerCase() : null; },
    tonoDe: (hex) => {   // [tono 0-360, saturación 0-1, luz 0-1]
      const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
      if (!d) return [0, 0, l];
      const s = d / (1 - Math.abs(2 * l - 1)), h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return [(h * 60 + 360) % 360, s, l];
    },
    hslARgb: (h, s, l) => {
      h = ((h % 360) + 360) % 360; const a = s * Math.min(l, 1 - l), f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
      return [f(0), f(8), f(4)].map(v => Math.round(v * 255));
    },
    aHex: (rgb) => "#" + rgb.map(v => v.toString(16).padStart(2, "0")).join(""),
  };
  return api;
})();
