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
      fondo: { tipo: "visu2000", color: "#000000", brillo: 80, velocidad: 70 }, estilo: { panel: "gel", acento: "#9be22a", fuente: "Fredoka" },
      piezas: () => armar([["cabeza", [24, 2, 42, 95]], ["lista", [70, 5, 27, 82]], ["volumen", [34, 95, 24, 3.5]]]) },
    dosmil: { nombre: "2000s", reglas: { requeridas: ["equipo"], nota: "El equipo de metal es el reproductor: se puede mover, agrandar y cambiar de skin. Trae pantalla LCD, botones, perilla y barra, así que no se agregan sueltos." },
      fondo: { tipo: "visu2000", color: "#000000", brillo: 100 }, estilo: { panel: "metal", acento: "#3fa9ff", fuente: "Michroma" },
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
  // Winamp: un reproductor de Winamp con los skins que importa la persona (quedan solo en su equipo)
  INCLUIDAS.anime = { nombre: "Winamp", reglas: { requeridas: ["winamp"], nota: "El reproductor de Winamp lo es todo: trae pantalla, botones, barra, ecualizador y lista. Los skins se importan en la Biblioteca (link de skins.webamp.org o archivo .wsz)." },
      fondo: { tipo: "milkdrop", color: "#000000", brillo: 65, cambio: 40, velocidad: 55 }, estilo: { panel: "liso", acento: "#5ef0ff", fuente: "Geist" },
      piezas: () => armar([["winamp", [3, 13, 94, 72], { ambiente: true }]]) };
  // Psicodélico: el ojo pixel art sobre el caleidoscopio y la espiral, y el fractal (fondo "nuevos" de visu2000.js)
  INCLUIDAS.psicodelico = { nombre: "Psicodélico", reglas: { requeridas: ["titulo", "botones", "barra"], nota: COMUN },
      fondo: { tipo: "nuevos", color: "#000000", brillo: 90, velocidad: 80 }, estilo: { panel: "psico", acento: "#b04bff", fuente: "Geist" },
      colores: [["Rojo", "#ff2a2a"], ["Naranja", "#ff8a1f"], ["Lima", "#9be22a"], ["Verde", "#1fe07a"], ["Cian", "#1fd5ff"], ["Azul", "#2f5bff"], ["Violeta", "#b04bff"], ["Rosa", "#ff3fa8"]],
      piezas: () => armar([["lista", [74, 6, 24, 78]], ["panel", [0, 88, 100, 12]], ["titulo", [3, 89.5, 30, 5]], ["artista", [3, 94.5, 30, 3.5]], ["botones", [36, 89, 18, 9]],
        ["barra", [57, 92.2, 24, 2.4]], ["tiempo", [82, 90, 7, 6]], ["volumen", [90, 91, 8, 5]]]) };
  // Frutiger Aero: el fondo Colinas (elegido por el usuario; Agua y Orbes quedan como escenas) y toda la interfaz en burbujas de vidrio:
  // la carátula en una burbuja que flota, el reproductor (título, botones, tiempo, barras) en otra y la lista en otra
  INCLUIDAS.aero = { nombre: "Frutiger Aero", reglas: { requeridas: ["titulo", "botones", "barra"], nota: COMUN },
      fondo: { tipo: "imagen", color: "#0a4a86", brillo: 96, imagen: "img/aero/colinas.webp", deriva: true, capa2: "burbujas", mezcla2: "screen", opacidad2: 40, golpe: "destello" },
      estilo: { panel: "vidrio", acento: "#36c8ff", fuente: "Geist" },
      escenas: [["Colinas", "img/aero/colinas.webp", "#36c8ff"], ["Agua", "img/aero/agua.webp", "#2fb6ff"], ["Orbes", "img/aero/orbes.webp", "#4a8dff"]],
      piezas: () => armar([["caratula", [6, 10, 21, 37], { forma: "burbuja" }],
        ["panel", [4, 50, 50, 46], { piel: "burbuja" }],
        ["titulo", [13, 59, 32, 6], { efecto: "sombra", alineacion: "centro" }], ["artista", [13, 65.5, 32, 4], { efecto: "sombra", alineacion: "centro" }],
        ["botones", [19, 71, 20, 9], { piel: "burbuja", redondos: true }], ["tiempo", [19, 80.5, 20, 4.5], { efecto: "sombra" }],
        ["barra", [12, 86.5, 34, 2.4], { piel: "burbuja" }], ["volumen", [21, 90.5, 16, 3], { piel: "burbuja" }],
        ["lista", [64, 4, 33, 92], { piel: "burbuja" }]]) };
  // Cromo líquido: metal derretido que se sacude con el bombo; todo en cromo y letras metálicas
  INCLUIDAS.cromo = { nombre: "Cromo líquido", reglas: { requeridas: ["titulo", "botones", "barra"], nota: COMUN },
      fondo: { tipo: "cromo", color: "#05060a", brillo: 72, golpe: "zoom", acabado: "cine" }, estilo: { panel: "liso", acento: "#ff3fd8", fuente: "Orbitron" },
      colores: [["Rosa", "#ff3fd8"], ["Plata", "#9fb6e0"], ["Ácido", "#b6ff3c"], ["Hielo", "#5fd8ff"], ["Fuego", "#ff6a2b"]],
      piezas: () => armar([["panel", [3, 10, 69, 50], { piel: "neon" }], ["caratula", [5, 14, 24, 42], { forma: "circulo", borde: true }],
        ["titulo", [32, 24, 40, 9], { efecto: "cromo", mayusculas: true }], ["artista", [32, 34, 40, 5], { efecto: "sombra" }],
        ["botones", [32, 42, 20, 10], { piel: "cromo", redondos: true }], ["tiempo", [54, 44, 14, 5], { efecto: "cromo" }],
        ["volumen", [5, 62, 24, 4], { piel: "cromo" }], ["lista", [75, 8, 22, 72], { piel: "cromo" }],
        ["barra", [5, 89, 90, 2.8], { piel: "cromo" }]]) };
  const SOLAS = ["anime", "psicodelico", "aero", "cromo"];
  // el color que se eligió en la Biblioteca (solo Psicodélico tiene colores)
  const colorElegido = (id) => { try { return localStorage.getItem(`color-${id}`) || INCLUIDAS[id].estilo.acento; } catch (e) { return INCLUIDAS[id].estilo.acento; } };
  function desdeBase(id) {
    const b = INCLUIDAS[id]; if (!b) return null;
    const spec = { id: nuevoId(), nombre: `${b.nombre} (mi versión)`, base: id, fondo: JSON.parse(JSON.stringify(b.fondo)), estilo: JSON.parse(JSON.stringify(b.estilo)), piezas: b.piezas() };
    guardar(spec); return spec;
  }
  const reglas = (spec) => (spec && spec.base && INCLUIDAS[spec.base]) ? INCLUIDAS[spec.base].reglas : null;
  const esRequerida = (spec, i) => { const r = reglas(spec); return !!r && r.requeridas.includes(spec.piezas[i].tipo); };

  // ---- Almacén ----
  function guardar(spec) { const l = leer(), i = l.findIndex(x => x.id === spec.id); if (i < 0) l.push(spec); else l[i] = spec; escribir(l); }
  // "anime" y "psicodelico" (ids de plantillas incluidas) se arman solas: la Biblioteca la abre en libre.html sin copiarla a localStorage
  // la escena elegida en la Biblioteca (las incluidas que traen escenas: Frutiger Aero) pone su fondo y su color
  const escenaElegida = (id) => { const e = INCLUIDAS[id].escenas; if (!e) return null; let n = ""; try { n = localStorage.getItem(`escena-${id}`) || ""; } catch (x) {} return e.find(x => x[0] === n) || e[0]; };
  const obtener = (id) => leer().find(x => x.id === id) || (SOLAS.includes(id) ? (() => { const es = escenaElegida(id);
    return { id, nombre: INCLUIDAS[id].nombre, base: id, fondo: es ? { ...INCLUIDAS[id].fondo, imagen: es[1] } : INCLUIDAS[id].fondo,
      estilo: { ...INCLUIDAS[id].estilo, acento: es ? es[2] : colorElegido(id) }, piezas: INCLUIDAS[id].piezas() }; })() : null);
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
