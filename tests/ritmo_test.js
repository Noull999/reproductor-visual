const fs = require("fs"); eval(fs.readFileSync(require("path").join(__dirname, "..", "web", "ritmo.js"), "utf8").replace('"use strict";', "") + ";globalThis.Ritmo=Ritmo;");
const assert = require("assert"), r = Ritmo.crear(), d = new Uint8Array(512); let bombos = 0, cajas = 0, caidas = 0;
for (let f = 0; f < 60 * 40; f++) {   // 40 s a 60 cuadros: 20 s suaves, luego un drop con bombo fuerte a 128 BPM y caja a contratiempo
  const t = f / 60, fase = (t * 128 / 60) % 1, fuerte = t > 20;
  for (let i = 0; i < 512; i++) d[i] = 20 + 10 * Math.random();
  for (let i = 1; i < 9; i++) d[i] = (fuerte ? 70 : 25) + (fase < .08 ? (fuerte ? 180 : 60) : 0);
  for (let i = 18; i < 90; i++) d[i] += Math.abs(fase - .5) < .04 ? 120 : 0;
  const e = r(d, t); if (e.golpes.bombo) bombos++; if (e.golpes.caja) cajas++; if (e.caida) caidas++;
}
console.log({ bombos, cajas, caidas });
assert(bombos > 60 && bombos < 95, "unos 85 bombos en 40 s a 128 BPM"); assert(cajas > 60 && cajas < 95); assert(caidas >= 1 && caidas <= 2, "una caída al entrar la parte fuerte");
// modo global: una página lee RT que se actualiza solo en cada cuadro de R
{
  const fns = []; let t = 0; globalThis.R = { cadaCuadro: (f) => fns.push(f), espectro: () => d };
  const RT = Ritmo.global(() => t); let cada4 = 0, cuadrosConBombo = 0;
  for (let f = 0; f < 60 * 20; f++) {
    t = f / 60; const fase = (t * 128 / 60) % 1;
    for (let i = 0; i < 512; i++) d[i] = 20; for (let i = 1; i < 9; i++) d[i] = 60 + (fase < .08 ? 180 : 0);
    fns.forEach(fn => fn(t)); if (RT.cada4) cada4++; if (RT.bombo > .5) cuadrosConBombo++;
  }
  console.log({ cuenta: RT.cuenta, cada4 });
  assert(RT.cuenta > 35 && RT.cuenta < 50, "unos 43 bombos en 20 s"); assert(cada4 >= 8 && cada4 <= 12, "un compás cada 4 bombos"); assert(cuadrosConBombo > 20, "el bombo sube y se apaga solo");
}
console.log("ritmo ok");
