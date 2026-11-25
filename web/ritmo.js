// Ritmo: detecta los golpes de la música por banda, sin librerías, a partir del espectro que ya calcula nucleo.js.
//   bombo (graves), caja (medios) y platillo (agudos): "flujo espectral" (cuánto SUBIÓ cada frecuencia desde el cuadro anterior)
//   contra un promedio que se adapta solo, así funciona igual con un tema suave que con uno fuerte.
//   caída ("drop"): los graves saltan muy por encima de lo que venían sonando, después de un rato más tranquilo.
//
//   const r = Ritmo.crear();  … cada cuadro:  const e = r(R.espectro(), segundos);
//   e.bombo / e.caja / e.platillo: 0..1 (llega a 1 en el golpe y se apaga solo) · e.golpes.bombo === true el cuadro del golpe · e.caida === true el cuadro del drop
"use strict";
const Ritmo = (() => {
  const BANDAS = { bombo: [1, 9, .15], caja: [18, 90, .14], platillo: [140, 380, .08] };   // [desde, hasta, segundos mínimos entre golpes]
  function crear() {
    let prev = null, bajoLargo = 0, bajoCorto = 0, ultCaida = -1e9;
    const est = {}; for (const k in BANDAS) est[k] = { prom: 0, ult: -1e9, env: 0 };
    return function (d, t) {
      const e = { golpes: {}, caida: false };
      if (!prev || prev.length !== d.length) prev = new Float32Array(d.length);
      for (const k in BANDAS) {
        const [a, z, gap] = BANDAS[k], s = est[k]; let f = 0;
        for (let i = a; i < z && i < d.length; i++) { const x = d[i] - prev[i]; if (x > 0) f += x; }
        f /= (z - a) * 255;
        if (f > s.prom * 1.9 + .01 && t - s.ult > gap) { s.ult = t; s.env = 1; e.golpes[k] = true; }
        s.prom += (f - s.prom) * .06; s.env *= .86; e[k] = s.env;
      }
      prev.set(d);
      let b = 0; for (let i = 1; i < 9 && i < d.length; i++) b += d[i]; b /= 8 * 255;
      bajoLargo += (b - bajoLargo) * .004; bajoCorto += (b - bajoCorto) * .2;   // ~8 s contra ~0,1 s
      if (bajoCorto > bajoLargo * 1.7 + .08 && bajoLargo > .04 && t - ultCaida > 15) { ultCaida = t; e.caida = true; }
      e.desdeCaida = t - ultCaida;
      return e;
    };
  }
  return { crear };
})();
