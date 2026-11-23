// Plantillas propias: se guardan como DATOS (nunca código) en localStorage ("plantillas-propias") y las dibuja
// libre.html. Las usan el editor, libre.html y la Biblioteca. Lo que una plantilla puede contener está en esquema.js.
//   { id, nombre, base, fondo:{tipo,…}, estilo:{…}, piezas:[{n,tipo,x,y,w,h,…opciones}] }
// Las medidas son % de la pantalla; el orden de `piezas` es el orden de capas (la última va encima).
"use strict";
const Propias = (() => {
  const E = ESQUEMA, CLAVE = "plantillas-propias";
  const nuevoId = () => "p" + Date.now().toString(36) + Math.floor(Math.random() * 36 ** 2).toString(36);
  const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || "[]"); } catch (e) { return []; } };
  const escribir = (l) => { try { localStorage.setItem(CLAVE, JSON.stringify(l)); } catch (e) {} };

  // ---- Piezas y reglas de convivencia ----
  const nombreLibre = (tipo, usados) => { let n = 1; while ((usados || []).includes(`${tipo}${n}`)) n++; return `${tipo}${n}`; };
  function pieza(tipo, usados, rect, opciones) {
    const [x, y, w, h] = rect || E.tipos[tipo].rect;
    return { n: nombreLibre(tipo, usados), tipo, x, y, w, h, ...(tipo === "imagen" ? { imagen: "" } : {}), ...(opciones || {}) };
  }
  // Cada pieza "cumple una función" en el reproductor (sus ids); dos piezas no pueden cumplir la misma
  const ids = (spec) => new Set(spec.piezas.flatMap(p => E.tipos[p.tipo].ids));
  const choca = (spec, tipo) => E.tipos[tipo].ids.some(i => ids(spec).has(i));
  const puedeAgregar = (spec, tipo) => (E.tipos[tipo].repetible || !spec.piezas.some(p => p.tipo === tipo)) && !choca(spec, tipo);
  const motivoNo = (spec, tipo) => {
    if (!E.tipos[tipo].repetible && spec.piezas.some(p => p.tipo === tipo)) return "ya está en la plantilla";
    const c = spec.piezas.find(p => E.tipos[p.tipo].ids.some(i => E.tipos[tipo].ids.includes(i)));
    return c ? `ya lo hace «${E.tipos[c.tipo].etiqueta}»` : "";
  };

  // ---- Bases para empezar (libres) ----
  const BASES = {
    blanco: { nombre: "En blanco", piezas: ["visual", "titulo", "artista", "botones"] },
    central: { nombre: "Reproductor central", piezas: ["visual", "caratula", "titulo", "artista", "botones", "barra", "tiempo", "volumen"] },
    completo: { nombre: "Con lista", piezas: ["visual", "caratula", "titulo", "artista", "botones", "barra", "tiempo", "volumen", "lista"] },
  };
  const fondoBase = { tipo: "haz", color: "#0b0708", brillo: 100 }, estiloBase = { panel: "vidrio", acento: "#ff2d3d", fuente: "Geist" };
  function nueva(base = "central") {
    const piezas = []; (BASES[base] || BASES.central).piezas.forEach(t => piezas.push(pieza(t, piezas.map(x => x.n))));
    const spec = { id: nuevoId(), nombre: "Mi plantilla", base: "", fondo: { ...fondoBase }, estilo: { ...estiloBase }, piezas };
    guardar(spec); return spec;
  }

  // ---- Las 5 plantillas incluidas como versiones editables (con sus reglas) ----
  const armar = (lista) => { const piezas = []; lista.forEach(([t, r, o]) => piezas.push(pieza(t, piezas.map(x => x.n), r, o))); return piezas; };
  const COMUN = "Pide título, botones y barra de avance. El resto se puede mover, cambiar o quitar.";
  const INCLUIDAS = {
    liquido: { nombre: "Líquido", reglas: { requeridas: ["titulo", "botones", "barra"], nota: COMUN },
      fondo: { tipo: "haz", color: "#070405", brillo: 100 }, estilo: { panel: "vidrio", acento: "#ff2d3d", fuente: "Geist", deformacion: 70 },
      piezas: () => armar([["panel", [2, 58, 33, 27]], ["panel", [1.5, 87.5, 97, 10.5]], ["caratula", [4, 4, 29, 51], { forma: "redondeada", inclinacion: -3 }],
        ["titulo", [4, 62, 29, 9], { tam: 115 }], ["artista", [4, 73, 29, 5]], ["lista", [37, 4, 60, 80]], ["botones", [28, 88.5, 22, 8.5]], ["barra", [53, 91.6, 26, 2.4]],
        ["tiempo", [80, 89.5, 8, 6]], ["volumen", [89, 90, 8, 5]]]) },
    headspace: { nombre: "Headspace", reglas: { requeridas: ["cabeza"], nota: "La cabeza es el reproductor: se puede mover, agrandar y cambiar de cuerpo y color. Trae título, carátula, botones y barra adentro, así que no se agregan sueltos." },
      fondo: { tipo: "burbujas", color: "#123a00", brillo: 100 }, estilo: { panel: "gel", acento: "#9be22a", fuente: "Fredoka" },
      piezas: () => armar([["cabeza", [24, 2, 42, 95]], ["lista", [70, 5, 27, 82]], ["volumen", [34, 95, 24, 3.5]]]) },
    dosmil: { nombre: "2000s", reglas: { requeridas: ["equipo"], nota: "El equipo de metal es el reproductor: se puede mover, agrandar y cambiar de skin. Trae pantalla LCD, botones, perilla y barra, así que no se agregan sueltos." },
      fondo: { tipo: "agujero", color: "#000000", tinte: "#4aa8ff", brillo: 90 }, estilo: { panel: "metal", acento: "#3fa9ff", fuente: "Michroma" },
      piezas: () => armar([["lista", [72, 3, 26, 58]], ["equipo", [5, 66, 67, 31]]]) },
    ambiente: { nombre: "Ambiente", reglas: { requeridas: ["titulo", "botones", "barra"], nota: COMUN },
      fondo: { tipo: "caratula", color: "#08080a", desenfoque: 70, brillo: 100 }, estilo: { panel: "liso", acento: "#9aa4b8", acentoAuto: true, fuente: "Geist" },
      piezas: () => armar([["panel", [0, 88, 100, 12]], ["caratula", [3, 7, 33, 58], { forma: "cuadrada", efecto: "duotono" }], ["barra", [3, 68, 33, 8], { modo: "onda" }],
        ["titulo", [40, 6, 57, 17], { tam: 165, fuente: "Instrument Serif" }], ["artista", [40, 24, 57, 5], { tam: 130, fuente: "Instrument Serif" }], ["lista", [40, 32, 57, 53]],
        ["botones", [30, 89, 20, 9]], ["tiempo", [60, 91, 8, 5]], ["volumen", [80, 91, 16, 5]]]) },
    pixel: { nombre: "Pixel", reglas: { requeridas: ["titulo", "botones", "barra"], nota: COMUN },
      fondo: { tipo: "estrellas", color: "#060507", brillo: 100 }, estilo: { panel: "pixel", acento: "#e8452c", fuente: "Silkscreen" },
      piezas: () => armar([["visual", [0, 56, 70, 33], { visual: "pixel" }], ["panel", [0, 90, 100, 10]], ["caratula", [3, 4, 24, 43], { forma: "cuadrada", efecto: "pixelada", borde: true }],
        ["titulo", [3, 49, 40, 5], { tam: 90 }], ["artista", [3, 54, 40, 3]], ["lista", [72, 4, 26, 82]], ["botones", [3, 91, 20, 8]], ["barra", [26, 94.2, 46, 2.4]],
        ["tiempo", [75, 91.5, 10, 6]], ["volumen", [86, 92, 11, 5]]]) },
  };
  // Anime PS2: cada variante es otro personaje con su propio color de acento
  const ANIME = { Cian: ["cian", "#19c8ff", "Audífonos"], Rosa: ["rosa", "#ff7ac8", "Androide"], Gotica: ["gotica", "#e0233c", "Gótica"], Violeta: ["violeta", "#9b6bff", "Colegiala"] };
  const animeActual = () => { let v = ""; try { v = localStorage.getItem("variante-anime") || ""; } catch (e) {} return ANIME[v] || ANIME.Cian; };
  INCLUIDAS.anime = { nombre: "Anime PS2", reglas: { requeridas: ["titulo", "botones", "barra"], nota: COMUN }, VARIANTES: ANIME,
      fondo: { tipo: "columnas", color: "#02071c", color2: "#0b2f7a", brillo: 100 },
      get estilo() { return { panel: "ps2", acento: animeActual()[1], fuente: "Michroma" }; },
      piezas: () => armar([["efecto", [22, 0, 56, 92], { efecto: "lineas" }], ["imagen", [27, 3, 46, 96], { imagen: `img/anime/${animeActual()[0]}.webp`, reaccion: "golpe", aura: true, aberracion: true }],
        ["efecto", [0, 0, 100, 100], { efecto: "destellos", sensibilidad: 80 }], ["panel", [2.5, 60, 27, 26]], ["titulo", [4, 63, 24, 7], { tam: 90, mayusculas: true }], ["artista", [4, 72, 24, 4], { tam: 80 }],
        ["caratula", [4, 5, 21, 30], { forma: "cuadrada", borde: true }], ["lista", [72, 5, 26, 78]], ["panel", [0, 88, 100, 12]], ["botones", [30, 89.5, 22, 9]], ["barra", [54, 93, 28, 2.4]], ["tiempo", [84, 91, 12, 5]]]) };
  function desdeBase(id) {
    const b = INCLUIDAS[id]; if (!b) return null;
    const spec = { id: nuevoId(), nombre: `${b.nombre} (mi versión)`, base: id, fondo: JSON.parse(JSON.stringify(b.fondo)), estilo: JSON.parse(JSON.stringify(b.estilo)), piezas: b.piezas() };
    guardar(spec); return spec;
  }
  const reglas = (spec) => (spec && spec.base && INCLUIDAS[spec.base]) ? INCLUIDAS[spec.base].reglas : null;
  const esRequerida = (spec, i) => { const r = reglas(spec); return !!r && r.requeridas.includes(spec.piezas[i].tipo); };

  // ---- Almacén ----
  function guardar(spec) { const l = leer(), i = l.findIndex(x => x.id === spec.id); if (i < 0) l.push(spec); else l[i] = spec; escribir(l); }
  // "anime" (id de la plantilla incluida) se arma sola: la Biblioteca la abre en libre.html sin copiarla a localStorage
  const obtener = (id) => leer().find(x => x.id === id) || (id === "anime" ? { id, nombre: INCLUIDAS.anime.nombre, base: "anime", fondo: INCLUIDAS.anime.fondo, estilo: INCLUIDAS.anime.estilo, piezas: INCLUIDAS.anime.piezas() } : null);
  const borrar = (id) => escribir(leer().filter(x => x.id !== id));
  function duplicar(id) {
    const o = obtener(id); if (!o) return null;
    const c = JSON.parse(JSON.stringify(o)); c.id = nuevoId(); c.nombre = o.nombre + " (copia)";
    c.fondo.imagen = ""; c.piezas.forEach(p => { if (p.tipo === "imagen" && !E.imagenesIncluidas.includes(p.imagen)) p.imagen = ""; });   // las imágenes propias no se copian: cada plantilla guarda las suyas
    guardar(c); return c;
  }
  const mapa = (k) => Object.fromEntries(Object.entries(E.tipos).map(([t, d]) => [t, d[k]]));
  return { FONDOS: E.fondos, PANELES: E.estilo.panel.v, VISUALES: E.tipos.visual.opciones.visual.v, FUENTES: E.estilo.fuente.v, ETIQUETAS: mapa("etiqueta"),
    BASES, INCLUIDAS, leer, obtener, guardar, borrar, nueva, desdeBase, duplicar, pieza, puedeAgregar, motivoNo, reglas, esRequerida };
})();
