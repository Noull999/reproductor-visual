// Pompas de jabón de fondo: suben, ondulan, se aceleran con el bajo y se REVIENTAN al tocarlas (gotitas, anillo y un "pop" suave).
// Todo se dibuja en un lienzo con código propio; el pop se sintetiza (no hay audios). Al reventar una, otra nace abajo.
//   Burbujas.montar(contenedor, { cantidad, sonido })
"use strict";
const Burbujas = (() => {
  const TAU = Math.PI * 2;
  function montar(cont, op = {}) {
    const lienzo = document.createElement("canvas"); lienzo.style.pointerEvents = "none"; cont.appendChild(lienzo);
    const N = Math.max(4, Math.min(48, Math.round(+op.cantidad || 20)));
    const fondoL = document.getElementById("fondoL") || cont, hist = { b: [], pops: [] };
    let w = 0, h = 0, suave = 0, reventadas = 0, ctxAudio = null;
    const nueva = (abajo) => ({ x: Math.random(), y: abajo ? 1.08 + Math.random() * .25 : Math.random() * 1.1, r: (.016 + Math.pow(Math.random(), 2.3) * .075), v: .018 + Math.random() * .035,
      fase: Math.random() * 6.28, deriva: 8 + Math.random() * 26, giro: Math.random() * 6.28, onda: 1.2 + Math.random() * 1.2 });
    hist.b = Array.from({ length: N }, () => nueva(false));
    cont.__pompas = () => hist.b.map(b => { const t = performance.now() / 1000, [x, y, r] = pos(b, t); return { x: x / w * innerWidth, y: y / h * innerHeight, r }; });   // para pruebas

    function pop() {   // chasquido corto: una caída de tono más un soplo de ruido; volumen bajo
      if (op.sonido === false) return;
      try {
        ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)(); const t = ctxAudio.currentTime;
        const o = ctxAudio.createOscillator(), g = ctxAudio.createGain(); o.type = "sine"; o.frequency.setValueAtTime(700 + Math.random() * 700, t); o.frequency.exponentialRampToValueAtTime(140, t + .1);
        g.gain.setValueAtTime(.16, t); g.gain.exponentialRampToValueAtTime(.001, t + .11); o.connect(g).connect(ctxAudio.destination); o.start(t); o.stop(t + .12);
        const n = ctxAudio.createBuffer(1, 1200, ctxAudio.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
        const f = ctxAudio.createBufferSource(), gn = ctxAudio.createGain(); f.buffer = n; gn.gain.value = .12; f.connect(gn).connect(ctxAudio.destination); f.start(t);
      } catch (e) { /* sin audio: la burbuja revienta igual */ }
    }
    const pos = (b, t) => [b.x * w + Math.sin(t * .5 * b.onda + b.fase) * b.deriva, b.y * h, b.r * Math.min(w, h)];
    function bajo(e) {   // la pompa más chica bajo el puntero (las chicas quedan sobre las grandes)
      const x = e.clientX / innerWidth * w, y = e.clientY / innerHeight * h, t = performance.now() / 1000; let mejor = null;
      hist.b.forEach((b, i) => { const [bx, by, r] = pos(b, t); if (Math.hypot(x - bx, y - by) <= r * 1.02 && (!mejor || r < mejor.r)) mejor = { i, bx, by, r }; });
      return mejor;
    }
    const fuera = (e) => e.target.closest && e.target.closest(".pz, #variantes, button, a, input, select, dialog");
    document.addEventListener("pointerdown", (e) => {
      if (e.button > 0 || fuera(e)) return;
      const m = bajo(e); if (!m) return;
      const t = performance.now() / 1000;
      hist.pops.push({ x: m.bx, y: m.by, r: m.r, t0: t, gotas: Array.from({ length: 9 + Math.round(m.r / 9) }, () => ({ a: Math.random() * TAU, v: .6 + Math.random() * .9, s: .035 + Math.random() * .05 })) });
      hist.b[m.i] = nueva(true); reventadas++; cont.dataset.reventadas = reventadas; pop();
    });
    document.addEventListener("pointermove", (e) => { fondoL.style.cursor = !fuera(e) && bajo(e) ? "pointer" : ""; });

    function pompa(g, b, t) {
      const [x, y, r] = pos(b, t), k = Math.sin(t * 1.7 * b.onda + b.fase) * .035, rx = r * (1 + k), ry = r * (1 - k);
      g.save(); g.translate(x, y);
      let c = g.createRadialGradient(0, 0, 0, 0, 0, r); [[0, "rgba(255,255,255,0)"], [.55, "rgba(255,255,255,.02)"], [.78, "rgba(185,235,255,.11)"], [.93, "rgba(255,255,255,.24)"], [1, "rgba(255,255,255,.5)"]].forEach(([p, col]) => c.addColorStop(p, col));
      g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
      c = g.createRadialGradient(0, r * .3, 0, 0, r * .3, r * .95); c.addColorStop(.5, "rgba(40,150,230,0)"); c.addColorStop(1, "rgba(40,150,230,.2)");
      g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
      const film = g.createConicGradient(b.giro + t * .2, 0, 0);   // película arcoíris
      [[0, "#ff8ad4"], [.14, "#82e8ff"], [.3, "#96ffac"], [.45, "#fff282"], [.6, "#ff9884"], [.76, "#be8cff"], [.9, "#6ecaff"], [1, "#ff8ad4"]].forEach(([p, col]) => film.addColorStop(p, col));
      g.globalCompositeOperation = "screen"; g.strokeStyle = film;
      g.globalAlpha = .28; g.lineWidth = Math.max(2, r * .17); g.beginPath(); g.ellipse(0, 0, rx * .93, ry * .93, 0, 0, TAU); g.stroke();
      g.globalAlpha = .7; g.lineWidth = Math.max(1.2, r * .05); g.beginPath(); g.ellipse(0, 0, rx * .975, ry * .975, 0, 0, TAU); g.stroke();
      g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
      g.strokeStyle = "rgba(255,255,255,.88)"; g.lineWidth = Math.max(1.2, r * .045); g.lineCap = "round"; g.beginPath(); g.ellipse(0, 0, rx * .86, ry * .86, 0, 3.45, 4.55); g.stroke();   // reflejo de ventana
      g.save(); g.translate(-r * .4, -r * .46); g.rotate(-.6); c = g.createRadialGradient(0, 0, 0, 0, 0, r * .22); c.addColorStop(0, "rgba(255,255,255,.95)"); c.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = c; g.scale(1, .5); g.beginPath(); g.arc(0, 0, r * .22, 0, TAU); g.fill(); g.restore();
      g.fillStyle = "rgba(215,246,255,.5)"; g.beginPath(); g.ellipse(r * .42, r * .56, r * .12, r * .045, .7, 0, TAU); g.fill();
      g.restore();
    }
    function reventon(g, p, t) {
      const u = (t - p.t0) / .42; if (u >= 1) return false;
      g.save(); g.globalCompositeOperation = "screen";
      g.strokeStyle = `rgba(255,255,255,${(1 - u) * .8})`; g.lineWidth = Math.max(1.5, p.r * .05 * (1 - u)); g.beginPath(); g.arc(p.x, p.y, p.r * (1 + u * .45), 0, TAU); g.stroke();
      g.strokeStyle = `rgba(160,230,255,${(1 - u) * .5})`; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + u * .7), 0, TAU); g.stroke();
      for (const d of p.gotas) { const dist = p.r * (.85 + d.v * 1.5 * u), rr = Math.min(w, h) * d.s * (1 - u) * .5;
        const gx = p.x + Math.cos(d.a) * dist, gy = p.y + Math.sin(d.a) * dist + u * u * p.r * .8; g.fillStyle = `rgba(210,245,255,${(1 - u) * .9})`; g.beginPath(); g.arc(gx, gy, Math.max(.6, rr), 0, TAU); g.fill(); }
      g.restore(); return true;
    }
    R.cadaCuadro((t) => {
      if (lienzo.width !== innerWidth || lienzo.height !== innerHeight) { lienzo.width = w = innerWidth; lienzo.height = h = innerHeight; }
      suave += (Math.min(1, R.energia(R.espectro(), 1, 8) * 1.2) - suave) * .1;
      const g = lienzo.getContext("2d"); g.clearRect(0, 0, w, h);
      for (let i = 0; i < hist.b.length; i++) { const b = hist.b[i]; b.y -= b.v * (1 + suave * 3) / 60; if (b.y < -.14) hist.b[i] = nueva(true); }
      [...hist.b].sort((a, b) => b.r - a.r).forEach(b => pompa(g, b, t));   // las grandes atrás
      hist.pops = hist.pops.filter(p => reventon(g, p, t));
    });
  }
  return { montar };
})();
