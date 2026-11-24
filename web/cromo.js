// Fondo "Cromo líquido": metal derretido que fluye (ruido deformado sobre sí mismo) y refleja un estudio de luz.
// El bajo lo deforma más y los medios marcan el relieve; el acento de la plantilla tiñe los reflejos. WebGL1, a media resolución.
//   Cromo.montar(lienzo, { tinte: () => [r, g, b] }) → true si pudo (si no, el fondo cae a un color liso)
"use strict";
const Cromo = (() => {
  const VERT = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }";
  const FRAG = `precision highp float;
uniform vec2 res; uniform float t, bajo, medio; uniform vec3 tinte;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return v; }
float campo(vec2 p){
  vec2 q = vec2(fbm(p + t * .05), fbm(p + vec2(5.2, 1.3) - t * .04));
  return fbm(p + (2.2 + bajo * 2.5) * q + vec2(t * .03, 0.));
}
void main(){
  vec2 p = (gl_FragCoord.xy - .5 * res) / res.y * 1.15;
  float e = .015, f = campo(p);
  vec2 g = vec2(campo(p + vec2(e, 0.)) - f, campo(p + vec2(0., e)) - f) / e;
  vec3 nr = normalize(vec3(-g * (.42 + medio * .6), 1.));
  vec3 r = reflect(vec3(0., 0., -1.), nr);
  float y = r.y * .5 + .5;
  vec3 env = mix(vec3(.03, .035, .05), vec3(.86, .9, .97), smoothstep(.3, .78, y));      // estudio: piso oscuro, cielo claro
  env += vec3(1.) * smoothstep(.06, 0., abs(r.y - .18)) * .45;                            // franja de luz del horizonte
  env += tinte * smoothstep(.4, 1., r.x) * .7 + tinte * .35 * smoothstep(.5, 1., -r.x);   // reflejos de color
  float brillo = pow(max(dot(r, normalize(vec3(.35, .65, 1.))), 0.), 48.);
  vec3 col = env * .88 + brillo * .9;
  gl_FragColor = vec4(col * (.92 + bajo * .12), 1.);
}`;

  function montar(lienzo, op) {
    const gl = lienzo.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) return false;
    const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const v = sh(gl.VERTEX_SHADER, VERT), f = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!v || !f) return false;
    const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const u = (k) => gl.getUniformLocation(pr, k), uRes = u("res"), uT = u("t"), uB = u("bajo"), uM = u("medio"), uTinte = u("tinte");
    let suaveB = 0, suaveM = 0;
    R.cadaCuadro((t) => {
      const w = Math.max(160, Math.round(innerWidth * .5)), h = Math.max(90, Math.round(innerHeight * .5));   // a media resolución: se ve igual de suave y pesa 4 veces menos
      if (lienzo.width !== w || lienzo.height !== h) { lienzo.width = w; lienzo.height = h; gl.viewport(0, 0, w, h); }
      const d = R.espectro(); suaveB += (Math.min(1, R.energia(d, 1, 8) * 1.2) - suaveB) * .12; suaveM += (R.energia(d, 10, 60) - suaveM) * .08;
      const [r, g, b] = op.tinte();
      gl.uniform2f(uRes, w, h); gl.uniform1f(uT, t); gl.uniform1f(uB, suaveB); gl.uniform1f(uM, suaveM); gl.uniform3f(uTinte, r / 255, g / 255, b / 255);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });
    return true;
  }
  return { montar };
})();
