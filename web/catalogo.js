// Catálogo de plantillas incluidas: lo usa la Biblioteca (index.html), que también es el inicio de la app.
// Necesita propiedades.js (Props) cargado antes.
"use strict";
// Cada plantilla: su página, qué se guarda al elegir una variante (la propia plantilla lo lee al abrir) y sus vistas previas.
const v = (nombre, color, archivo, extra = {}) => ({ nombre, color, previa: `img/previas/${archivo}.webp`, ...extra });
const PLANTILLAS = [
  { id: "liquido", nombre: "Líquido", pagina: "liquido.html", predeterminada: "Rojo",
    desc: "Vidrio líquido sobre un haz de luz que late con el bajo. La carátula flota y el vidrio la deforma.",
    guardar: (x) => ({ "tema-liquido": x.nombre }),
    grupos: [{ titulo: "Color", items: [v("Rojo", "#ff2d3d", "liquido-rojo"), v("Hielo", "#3db8ff", "liquido-hielo"), v("Violeta", "#a855ff", "liquido-violeta"), v("Ácido", "#b6ff2d", "liquido-acido"), v("Oro", "#ffb02d", "liquido-oro")] }] },
  { id: "headspace", nombre: "Headspace", pagina: "headspace.html", predeterminada: "Y2K · Lima",
    desc: "Cabeza de plástico Y2K con el reproductor adentro, sobre visualizaciones líquidas de su color (lámpara de lava, agua, plasma) y una lista que sale del costado.",
    guardar: (x) => ({ "cuerpo-headspace": x.cuerpo, "color-headspace": x.color2 }),
    grupos: ["Y2K", "Gel"].map(c => ({ titulo: `Cuerpo ${c}`, items: [["Lima", "#9be22a"], ["Chicle", "#ff7ad9"], ["Cielo", "#6cc8ff"], ["Mandarina", "#ff9a2a"], ["Cromo", "#c9d3dc"]]
      .map(([n, col]) => v(`${c} · ${n}`, col, `headspace-${c.toLowerCase()}-${n.toLowerCase()}`, { cuerpo: c, color2: n })) })) },
  { id: "dosmil", nombre: "2000s", pagina: "dosmil.html", predeterminada: "Plata",
    desc: "Reproductor de metal con pantalla LCD, perilla de volumen y playlist, sobre visualizaciones de la época de Windows Media Player (túnel, rayos y onda) que se mueven con la música.",
    guardar: (x) => ({ "skin-2000s": x.nombre }),
    grupos: [{ titulo: "Skin", items: [v("Plata", "#c3c9d3", "dosmil-plata"), v("Grafito", "#4a4e58", "dosmil-grafito"), v("LCD verde", "#b4bba6", "dosmil-lcd-verde"), v("Azul", "#2b4fae", "dosmil-azul")] }] },
  { id: "ambiente", nombre: "Ambiente", pagina: "ambiente.html", predeterminada: "Carátula",
    desc: "La carátula manda: sus colores tiñen todo, en duotono y con su onda real.",
    guardar: (x) => ({ "tema-ambiente": x.nombre }),
    grupos: [{ titulo: "Colores", items: [v("Carátula", "#9aa4b8", "ambiente-caratula"), v("Noche", "#7896ff", "ambiente-noche"), v("Atardecer", "#ff8c5a", "ambiente-atardecer"), v("Bosque", "#8ce696", "ambiente-bosque"), v("Mono", "#ebebeb", "ambiente-mono")] }] },
  { id: "anime", nombre: "Anime PS2", pagina: "libre.html?plantilla=anime", predeterminada: "Winamp",
    desc: "Un Winamp de los 2000 con los skins que tú elijas (anime, juegos…): ventana, ecualizador que baila y lista, sobre visualizaciones de la época. Los skins se importan abajo y quedan solo en tu PC.",
    guardar: () => ({}),
    grupos: [{ titulo: "Skins", items: [v("Winamp", "#5ef0ff", "anime-winamp")] }] },
  { id: "pixel", nombre: "Pixel", pagina: "pixel.html", predeterminada: "Sangre",
    desc: "8 bits: espectro en bloques y carátula pixelada, con paletas de color a elegir.",
    guardar: (x) => ({ "paleta-pixel": x.nombre }),
    grupos: [{ titulo: "Paleta", items: [v("Sangre", "#e8452c", "pixel-sangre"), v("Game Boy", "#9bbc0f", "pixel-game-boy"), v("NES", "#e40058", "pixel-nes"), v("Vaporwave", "#ff71ce", "pixel-vaporwave"), v("Matrix", "#39ff6a", "pixel-matrix"), v("Hielo", "#8fe3ff", "pixel-hielo"), v("Ámbar", "#ffb000", "pixel-ambar")] }] },
];
// Headspace suma un grupo "Cuerpo propio" cuando la persona subió uno
const gruposDe = (p) => {
  if (p.id !== "headspace" || !Props.leer("headspace").cuerpo) return p.grupos;
  const colores = [["Lima", "#9be22a"], ["Chicle", "#ff7ad9"], ["Cielo", "#6cc8ff"], ["Mandarina", "#ff9a2a"], ["Cromo", "#c9d3dc"]];
  return [...p.grupos, { titulo: "Cuerpo propio", items: colores.map(([n, col]) => v(`Propio · ${n}`, col, `headspace-y2k-${n.toLowerCase()}`, { cuerpo: "Propio", color2: n })) }];
};
const todas = (p) => gruposDe(p).flatMap(g => g.items);
const guardado = (k, def) => { try { return localStorage.getItem(k) || def; } catch (e) { return def; } };
// Qué variante tiene cada plantilla ahora: la que dejaste la última vez, o la predeterminada
const elegida = {};
PLANTILLAS.forEach(p => { elegida[p.id] = todas(p).find(x => p.guardar(x) && Object.entries(p.guardar(x)).every(([k, val]) => guardado(k, "") === val)) || todas(p).find(x => x.nombre === p.predeterminada); });
