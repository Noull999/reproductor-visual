// Plantillas propias: se guardan como DATOS (nunca código) en localStorage ("plantillas-propias") y las
// dibuja libre.html. Las usan el editor, libre.html y la Biblioteca. Una plantilla es:
//   { id, nombre, fondo:{tipo,color,imagen,ranura,brillo}, estilo:{panel,acento,fuente}, piezas:[{n,tipo,x,y,w,h,...}] }
// Todas las medidas son % de la pantalla; el orden de `piezas` es el orden de capas (la última va encima).
"use strict";
const Propias = (() => {
  const CLAVE = "plantillas-propias";
  const FONDOS = { haz: "Haz de luz", tunel: "Túnel psicodélico", burbujas: "Burbujas", luces: "Luces suaves", estrellas: "Estrellas de píxel", color: "Color liso", imagen: "Imagen propia" };
  const VISUALES = { barras: "Barras suaves", pixel: "Bloques de píxel", lcd: "Segmentos LCD", onda: "Onda", circulo: "Círculo" };
  const PANELES = { vidrio: "Vidrio", metal: "Metal", gel: "Gel", pixel: "Píxel", liso: "Liso oscuro" };
  const FUENTES = { "Geist": "Geist (moderna)", "Fredoka": "Fredoka (redondeada)", "Instrument Serif": "Instrument Serif (serif)", "Silkscreen": "Silkscreen (píxel)", "VT323": "VT323 (pantalla LCD)", "Michroma": "Michroma (ancha)" };
  const ETIQUETAS = { visual: "Visual", caratula: "Carátula", titulo: "Título", artista: "Artista", botones: "Botones", barra: "Barra de avance", tiempo: "Tiempo", volumen: "Volumen", lista: "Lista de temas", panel: "Panel", imagen: "Imagen" };
  // Se pueden repetir; el resto es una sola vez (cada una usa un elemento que el reproductor conecta por su id)
  const REPETIBLES = ["panel", "imagen", "visual"];
  const RECT = { visual: [30, 16, 40, 40], caratula: [6, 16, 20, 36], titulo: [30, 62, 40, 6], artista: [30, 69, 40, 4], botones: [34, 78, 32, 9], barra: [10, 92, 80, 2.4],
    tiempo: [84, 86, 12, 4], volumen: [76, 78, 20, 6], lista: [72, 8, 24, 62], panel: [8, 8, 26, 40], imagen: [36, 8, 28, 50] };
  const BASES = {
    blanco: { nombre: "En blanco", piezas: ["visual", "titulo", "artista", "botones"] },
    central: { nombre: "Reproductor central", piezas: ["visual", "caratula", "titulo", "artista", "botones", "barra", "tiempo", "volumen"] },
    completo: { nombre: "Con lista", piezas: ["visual", "caratula", "titulo", "artista", "botones", "barra", "tiempo", "volumen", "lista"] },
  };
  const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || "[]"); } catch (e) { return []; } };
  const escribir = (l) => { try { localStorage.setItem(CLAVE, JSON.stringify(l)); } catch (e) {} };
  const nuevoId = () => "p" + Date.now().toString(36) + Math.floor(Math.random() * 36 ** 2).toString(36);

  function pieza(tipo, tipos) {
    let n = 1; while ((tipos || []).includes(`${tipo}${n}`)) n++;
    const p = { n: `${tipo}${n}`, tipo, ...Object.fromEntries(["x", "y", "w", "h"].map((k, i) => [k, RECT[tipo][i]])) };
    if (tipo === "visual") { p.visual = "barras"; p.color = ""; }
    if (tipo === "imagen") p.imagen = "";
    return p;
  }
  function nueva(base = "central") {
    const piezas = []; (BASES[base] || BASES.central).piezas.forEach(t => piezas.push(pieza(t, piezas.map(x => x.n))));
    const spec = { id: nuevoId(), nombre: "Mi plantilla", fondo: { tipo: "haz", color: "#0b0708", imagen: "", brillo: 100 }, estilo: { panel: "vidrio", acento: "#ff2d3d", fuente: "Geist" }, piezas };
    guardar(spec); return spec;
  }
  function guardar(spec) { const l = leer(), i = l.findIndex(x => x.id === spec.id); if (i < 0) l.push(spec); else l[i] = spec; escribir(l); }
  const obtener = (id) => leer().find(x => x.id === id) || null;
  const borrar = (id) => escribir(leer().filter(x => x.id !== id));
  function duplicar(id) {
    const o = obtener(id); if (!o) return null;
    const c = JSON.parse(JSON.stringify(o)); c.id = nuevoId(); c.nombre = o.nombre + " (copia)";
    c.fondo.imagen = ""; c.piezas.forEach(p => { if (p.tipo === "imagen") p.imagen = ""; });   // las imágenes propias no se copian: cada plantilla guarda las suyas
    guardar(c); return c;
  }
  return { FONDOS, VISUALES, PANELES, FUENTES, ETIQUETAS, REPETIBLES, BASES, RECT, leer, obtener, guardar, borrar, nueva, duplicar, pieza };
})();
