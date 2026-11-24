// Adornos: formas decorativas hechas con código (nada de arte ajeno), en SVG de 100×100.
// Estrellas de púas, destellos, alas y llamas tribales (estilo cyber-sigilismo), anillos de púas, marcos con esquinas, códigos de barras y cristales.
//   Adornos.svg(forma, { puntas, acabado, color, id }) → texto SVG
"use strict";
const Adornos = (() => {
  const f = (n) => n.toFixed(2), P = (r, a) => [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  // estrella con lados curvos hacia adentro: puntas finas como de metal
  function estrella(n, rOut, rIn, curva) {
    let d = "";
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / n, b = a + Math.PI / n, [x, y] = P(rOut, a), [cx, cy] = P(rIn * curva, a + Math.PI / (2 * n)), [mx, my] = P(rIn, b);
      const [cx2, cy2] = P(rIn * curva, b + Math.PI / (2 * n)), [nx, ny] = P(rOut, a + 2 * Math.PI / n);
      d += (i ? "" : `M${f(x)} ${f(y)}`) + `Q${f(cx)} ${f(cy)} ${f(mx)} ${f(my)}Q${f(cx2)} ${f(cy2)} ${f(nx)} ${f(ny)}`;
    }
    return d + "Z";
  }
  // una púa curva (como garra) desde (x, y) hacia el ángulo a, de largo l y ancho w, doblada hacia un lado
  function pua(x, y, a, l, w, doblez) {
    const pt = (r, ang) => [x + r * Math.cos(ang), y + r * Math.sin(ang)], perp = a + Math.PI / 2;
    const [ax, ay] = [x + w * Math.cos(perp), y + w * Math.sin(perp)], [bx, by] = [x - w * Math.cos(perp), y - w * Math.sin(perp)];
    const [tx, ty] = pt(l, a + doblez), [c1x, c1y] = pt(l * .55, a - doblez * .3), [c2x, c2y] = pt(l * .5, a + doblez * .9);
    return `M${f(ax)} ${f(ay)}Q${f(c1x + w * .4 * Math.cos(perp))} ${f(c1y + w * .4 * Math.sin(perp))} ${f(tx)} ${f(ty)}Q${f(c2x)} ${f(c2y)} ${f(bx)} ${f(by)}Z`;
  }
  const FORMAS = {
    estrella: (o) => estrella(o.puntas, 48, 15, .95),
    destello: (o) => estrella(4, 49, 6, .6) + estrella(4, 30, 4, .6).replace("M", "M"),
    alas: (o) => {   // alas tribales: púas curvas a los dos lados, en espejo, y un núcleo
      let d = ""; const n = Math.max(3, Math.min(10, Math.round(o.puntas / 2)));
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), a = -1.15 + t * 1.6, l = 44 - Math.abs(t - .35) * 26, w = 4.2 - t * 1.6;
        d += pua(50, 52, Math.PI + a, l, w, -.45) + pua(50, 52, -a, l, w, .45);
      }
      return d + estrella(6, 11, 5, .9);
    },
    tribal: (o) => {   // llama tribal: púas que suben desde una base curva, cada una doblada
      let d = `M18 82Q50 98 82 82Q50 90 18 82Z`; const n = Math.max(3, Math.min(9, Math.round(o.puntas / 2)));
      for (let i = 0; i < n; i++) { const t = i / (n - 1), x = 22 + t * 56, l = 30 + Math.sin(t * Math.PI) * 42; d += pua(x, 84 - Math.sin(t * Math.PI) * 4, -Math.PI / 2 + (t - .5) * .7, l, 5 - Math.abs(t - .5) * 3, (t - .5) * .9 + .25); }
      return d;
    },
    anillo: (o) => {   // aro con púas hacia afuera (se rellena con evenodd: el centro queda hueco)
      let d = `M50 18A32 32 0 1 1 49.99 18ZM50 28A22 22 0 1 0 50.01 28Z`;
      for (let i = 0; i < o.puntas; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / o.puntas, [x, y] = P(31, a); d += pua(x, y, a, 18, 3.4, .35); }
      return d;
    },
    marco: () => {   // esquinas de marco con muescas, como las fichas de revista y los HUD
      const e = (x, y, sx, sy) => `M${x} ${y}h${22 * sx}v${3 * sy}h${-19 * sx}v${19 * sy}h${-3 * sx}ZM${x + 6 * sx} ${y + 6 * sy}h${6 * sx}v${2 * sy}h${-4 * sx}v${4 * sy}h${-2 * sx}Z`;
      return e(4, 4, 1, 1) + e(96, 4, -1, 1) + e(4, 96, 1, -1) + e(96, 96, -1, -1) + `M44 2h12v2.4H44ZM44 95.6h12V98H44ZM2 46h2.4v8H2ZM95.6 46H98v8h-2.4Z`;
    },
    barras: (o) => {   // código de barras (anchos fijos por semilla: siempre el mismo dibujo)
      let d = "", x = 6, s = 7 + o.puntas;
      while (x < 94) { s = (s * 9301 + 49297) % 233280; const w = 1 + (s % 4); if (x + w > 94) break; d += `M${x} 20h${w}v52h${-w}Z`; x += w + 1 + ((s >> 3) % 3); }
      return d + `M6 78h88v2H6ZM6 84h30v5H6ZM40 84h14v5H40ZM58 84h36v5H58Z`;
    },
    cristal: () => "M50 4L80 36L50 96L20 36ZM50 4L50 96M20 36H80M35 36L50 4L65 36L50 96Z",
  };
  function svg(forma, o = {}) {
    const op = { puntas: 8, acabado: "cromo", color: "#ff3fd8", id: "a" + Math.random().toString(36).slice(2, 8), ...o };
    const d = (FORMAS[forma] || FORMAS.estrella)(op), id = op.id, c = op.color;
    const defs = `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#cfd7e4"/>`
      + `<stop offset=".5" stop-color="#4a5468"/><stop offset=".56" stop-color="${c}"/><stop offset=".72" stop-color="#eef3ff"/><stop offset="1" stop-color="#8a95aa"/></linearGradient></defs>`;
    const estilo = {
      cromo: `fill="url(#${id}g)" stroke="#1b1f29" stroke-width=".6"`,
      neon: `fill="none" stroke="${c}" stroke-width="1.6" stroke-linejoin="round" style="filter:drop-shadow(0 0 2px ${c}) drop-shadow(0 0 6px ${c})"`,
      plano: `fill="${c}"`,
      vidrio: `fill="rgba(255,255,255,.22)" stroke="rgba(255,255,255,.85)" stroke-width=".7"`,
    }[op.acabado] || "";
    const lineas = forma === "cristal" ? `<path d="M50 4L50 96M20 36H80M35 36L50 4L65 36L50 96" fill="none" stroke="rgba(255,255,255,.7)" stroke-width=".6"/>` : "";
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${defs}<path d="${d}" fill-rule="evenodd" ${estilo}/>${lineas}</svg>`;
  }
  return { svg, FORMAS: Object.keys(FORMAS) };
})();
