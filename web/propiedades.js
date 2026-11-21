// Propiedades que se pueden cambiar en cada plantilla (las edita la Biblioteca y las aplican nucleo.js
// y cada plantilla). Se guardan por plantilla en localStorage ("props-liquido", …): solo datos, nunca código.
"use strict";
const Props = (() => {
  const DEFECTO = { intensidad: 50, velocidad: 50, lista: true, soloVisual: true, fondo: "", cuerpo: null, extra: {} };
  const clave = (id) => "props-" + id;
  // Dónde va cada pieza sobre el cuerpo de Headspace, en % de la imagen [x, y, ancho, alto]
  const ZONAS_HEADSPACE = {
    pantalla: [23.4, 23.4, 53.4, 38.6], botones: [33, 9.8, 34, 6.6], barra: [33, 64.6, 34, 4.2],
    ojos: [[24.5, 70.8, 15, 7.4], [61, 70.8, 15, 7.4]], boca: [43, 80.3, 14, 5],
    parlantes: [[5.3, 29.8, 11.4, 32.4], [83.3, 29.8, 11.4, 32.4]] };
  // Controles numéricos propios de cada plantilla
  const EXTRAS = {
    liquido: [{ id: "deformacion", nombre: "Fuerza de la deformación del vidrio", min: 0, max: 140, def: 70, unidad: "" }],
    headspace: [{ id: "burbujas", nombre: "Cantidad de burbujas", min: 0, max: 80, def: 34, unidad: "" }],
    dosmil: [{ id: "tunel", nombre: "Brillo del túnel de fondo", min: 20, max: 130, def: 80, unidad: " %" }],
    ambiente: [{ id: "desenfoque", nombre: "Desenfoque del fondo", min: 10, max: 140, def: 70, unidad: " px" }],
    pixel: [{ id: "pixel", nombre: "Tamaño de los píxeles", min: 3, max: 9, def: 5, unidad: " px" }],
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
    // Las plantillas propias comparten libre.html: cada una guarda sus propiedades con su id ("libre-p123")
    plantillaActual: () => {
      const n = (location.pathname.split("/").pop() || "").replace(".html", "");
      return n === "libre" ? "libre-" + new URLSearchParams(location.search).get("plantilla") : n;
    },
  };
  return api;
})();
