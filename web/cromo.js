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
  const FRAG_IMG = `precision highp float;
uniform vec2 res, tam; uniform float t, bajo; uniform sampler2D img;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return v; }
void main(){
  float k = max(res.x / tam.x, res.y / tam.y); vec2 lado = tam * k;          // "cubrir": la imagen llena la pantalla
  vec2 uv = (gl_FragCoord.xy - (res - lado) * .5) / lado;
  vec2 p = uv * 2.6;
  vec2 q = vec2(fbm(p + t * .07), fbm(p + vec2(5.2, 1.3) - t * .06));
  vec2 d = (q - .5) * (.045 + bajo * .07);
  vec3 col = vec3(texture2D(img, uv + d * 1.18).r, texture2D(img, uv + d).g, texture2D(img, uv + d * .82).b);
  float brillo = pow(max(0., (q.x - q.y) * 1.8), 3.) * .35;                     // un reflejo metálico que corre por encima
  gl_FragColor = vec4(col + brillo, 1.);
}`;
  function programa(gl, frag) {
    const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const v = sh(gl.VERTEX_SHADER, VERT), f = sh(gl.FRAGMENT_SHADER, frag);
    if (!v || !f) return null;
    const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    return pr;
  }
  function imagen(lienzo, url) {
    const gl = lienzo.getContext("webgl", { antialias: false });
    const pr = gl && programa(gl, FRAG_IMG);
    if (!pr) return false;
    const u = (k) => gl.getUniformLocation(pr, k), uRes = u("res"), uTam = u("tam"), uT = u("t"), uB = u("bajo");
    const tex = gl.createTexture(), foto = new Image(); let lista = false, suave = 0;
    foto.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, foto);
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.MIRRORED_REPEAT === undefined ? gl.CLAMP_TO_EDGE : gl.CLAMP_TO_EDGE));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      lista = true;
    };
    foto.src = url;
    R.cadaCuadro((t) => {
      if (!lista) return;
      const w = Math.max(160, Math.round(innerWidth * .6)), h = Math.max(90, Math.round(innerHeight * .6));
      if (lienzo.width !== w || lienzo.height !== h) { lienzo.width = w; lienzo.height = h; gl.viewport(0, 0, w, h); }
      suave += (Math.min(1, R.energia(R.espectro(), 1, 8) * 1.2) - suave) * .12;
      gl.uniform2f(uRes, w, h); gl.uniform2f(uTam, foto.naturalWidth, foto.naturalHeight); gl.uniform1f(uT, t); gl.uniform1f(uB, suave);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });
    return true;
  }
  return { montar, imagen };
})();
