// Propiedades que se pueden cambiar en cada plantilla (las edita la Biblioteca y las aplica nucleo.js).
// Se guardan por plantilla en localStorage ("props-liquido", …): solo datos, nunca código.
"use strict";
const Props = (() => {
  const DEFECTO = { intensidad: 50, velocidad: 50, lista: true, soloVisual: true, fondo: "" };
  const clave = (id) => "props-" + id;
  return {
    DEFECTO,
    leer(id) {
      try { return { ...DEFECTO, ...JSON.parse(localStorage.getItem(clave(id)) || "{}") }; } catch (e) { return { ...DEFECTO }; }
    },
    guardar(id, props) { try { localStorage.setItem(clave(id), JSON.stringify(props)); } catch (e) {} },
    // 50 = tal cual está hoy; los extremos van de 0,3× a 1,7× (intensidad) y de 0,25× a 1,75× (velocidad)
    factorIntensidad: (v) => 0.3 + (v / 100) * 1.4,
    factorVelocidad: (v) => 0.25 + (v / 100) * 1.5,
    plantillaActual: () => (location.pathname.split("/").pop() || "").replace(".html", ""),
  };
})();
