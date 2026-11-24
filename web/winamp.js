// Reproductor con skins clásicos de Winamp 2 (.wsz importados por la persona; quedan solo en su equipo).
// Dibuja, en un solo lienzo pixelado, las tres ventanas de Winamp: principal y ecualizador apilados, y la lista al lado,
// con las coordenadas originales de cada pieza del skin. Lo conecta al reproductor (R) y pone el color del skin
// como acento de la plantilla. Si no hay skins importados, dibuja uno clásico propio hecho con formas simples.
//   Winamp.montar(caja, { ambiente }) — la pieza "winamp" de las plantillas
"use strict";
const Winamp = (() => {
  const AN = 275, MAIN = 116, EQ = 116, PL = MAIN + EQ, ANCHO = AN * 2, ALTO = MAIN + EQ, S = 2;   // principal + ecualizador a la izquierda, lista a la derecha; S: el lienzo va al doble para que el texto se lea nítido
  const VIS_WINAMP = [[0,0,0],[24,33,41],[239,49,16],[206,41,16],[214,90,0],[214,102,0],[214,115,0],[198,123,8],[222,165,24],[214,181,33],[189,222,41],[148,222,33],[41,206,16],[50,190,16],[57,181,16],[49,156,8],[41,148,0],[24,132,8],[255,255,255],[214,214,222],[181,189,189],[160,170,175],[148,156,165],[150,150,150]];
  const FUENTE = { '"': [0, 26], "@": [0, 27], " ": [0, 30], "…": [1, 10], ".": [1, 11], ":": [1, 12], "(": [1, 13], ")": [1, 14], "-": [1, 15], "'": [1, 16], "!": [1, 17], "_": [1, 18], "+": [1, 19], "\\": [1, 20], "/": [1, 21], "[": [1, 22], "]": [1, 23], "^": [1, 24], "&": [1, 25], "%": [1, 26], ",": [1, 27], "=": [1, 28], "$": [1, 29], "#": [1, 30], "Å": [2, 0], "Ö": [2, 1], "Ä": [2, 2], "?": [2, 3], "*": [2, 4], "<": [1, 13], ">": [1, 14], "{": [1, 22], "}": [1, 23] };
  const letra = (c) => { const u = c.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); if (u >= "A" && u <= "Z") return [0, u.charCodeAt(0) - 65]; if (u >= "0" && u <= "9") return [1, +u]; return FUENTE[c] || FUENTE[u] || [0, 30]; };
  let skins = [], actual = null;
  const leerSkins = async () => { try { return window.pywebview && pywebview.api && pywebview.api.skins_listar ? await pywebview.api.skins_listar() : []; } catch (e) { return []; } };
  const guardada = () => { try { return localStorage.getItem("skin-winamp") || ""; } catch (e) { return ""; } };

  function montar(caja, op) {
    const AW = op.visualizacion ? AN * 3 : ANCHO;   // con la ventana de visualización hay una tercera columna a la derecha
    const raiz = document.createElement("div"); raiz.className = "m-winamp";
    raiz.style.cssText = `position:absolute;left:50%;top:50%;width:${AW}px;height:${ALTO}px;transform-origin:50% 50%`;
    const c = document.createElement("canvas"); c.width = AW * S; c.height = ALTO * S;
    c.style.cssText = `width:${AW}px;height:${ALTO}px;image-rendering:pixelated;display:block;cursor:default;filter:brightness(${op.brillo || 1}) drop-shadow(0 12px 30px rgba(0,0,0,.6))`;
    // piezas invisibles que el reproductor (nucleo.js) actualiza por id: de aquí se leen título y estado
    const oculto = document.createElement("div"); oculto.style.display = "none";
    oculto.innerHTML = '<button id="bPlay">▶</button><div id="titulo"></div><div id="artista"></div><input id="volumen" type="range" min="0" max="100" value="80">';
    raiz.append(c, oculto); caja.appendChild(raiz);
    if (op.visualizacion) {   // MilkDrop dentro de su propia ventana (el hueco negro que deja ventanaVisualizacion)
      const vl = document.createElement("canvas");
      vl.style.cssText = `position:absolute;left:${ANCHO + 6}px;top:18px;width:${AN - 12}px;height:${PL - 24}px`;
      raiz.append(vl);
      Milkdrop.montar(vl, { tam: () => [(AN - 12) * 2, (PL - 24) * 2], cambio: op.cambio, velocidad: op.velocidad }).catch(() => vl.remove());
    }
    const ajustar = () => { const s = Math.min(caja.clientWidth / AW, caja.clientHeight / ALTO) || .01; raiz.style.transform = `translate(-50%, -50%) scale(${s})`; };
    new ResizeObserver(ajustar).observe(caja); requestAnimationFrame(ajustar);
    const g = c.getContext("2d"); g.scale(S, S); g.imageSmoothingEnabled = false;
    const vol = oculto.querySelector("#volumen"), bPlay = oculto.querySelector("#bPlay"), tit = oculto.querySelector("#titulo"), art = oculto.querySelector("#artista");
    let hover = "", poco = null, colorAcento = "94,240,255", img = {}, vis = VIS_WINAMP, pl = {}, region = [], scroll = 0, apretado = "", arrastre = "", paso = 0, ultimoPaso = 0, picos = new Array(19).fill(0);

    async function usar(id) {
      if (!skins.length) skins = await leerSkins();
      actual = skins.find(s => s.id === id) || skins.find(s => s.id === guardada()) || skins[0] || null;
      img = {}; vis = VIS_WINAMP; pl = {}; region = []; poco = null;
      if (actual) {
        try { localStorage.setItem("skin-winamp", actual.id); } catch (e) {}
        actual.piezas.forEach(p => { const i = new Image(); i.src = `/skin?n=${actual.id}/${p}.png`; img[p] = i; });
        if (actual.vis && actual.vis.length >= 18) vis = actual.vis.concat(VIS_WINAMP.slice(actual.vis.length));
        pl = actual.pledit || {}; region = actual.region || [];
      }
      const hex = (pl.current || "#5ef0ff").slice(1), rgb = [0, 2, 4].map(k => parseInt(hex.slice(k, k + 2), 16)); colorAcento = rgb.join(",");
      if (typeof ponerAcento === "function") ponerAcento(rgb);   // el color del skin tiñe el fondo y lo demás de la plantilla
      if (op.ambiente && fondoAmb) fondoAmb.style.backgroundImage = actual ? `url(/skin?n=${actual.id}/main.png)` : "none";
      document.dispatchEvent(new CustomEvent("skin-winamp", { detail: actual }));
    }
    let fondoAmb = null;
    if (op.ambiente) {   // el arte del skin, gigante y desenfocado, detrás de todo
      fondoAmb = document.createElement("div");
      fondoAmb.style.cssText = "position:fixed;inset:-10%;z-index:0;background-size:cover;background-position:center;filter:blur(40px) saturate(1.3) brightness(.45);pointer-events:none";
      fondoAmb.style.mixBlendMode = "screen"; fondoAmb.style.opacity = ".55";
      (document.getElementById("fondoL") || document.body.firstChild).after(fondoAmb);
    }

    // ---- dibujo ----
    const listo = (p) => img[p] && img[p].complete && img[p].naturalWidth;
    const pieza = (p, sx, sy, w, h, x, y) => { if (listo(p)) g.drawImage(img[p], sx, sy, w, h, x, y, w, h); };
    const texto = (s, x, y, ancho) => { for (let i = 0; i * 5 < ancho && i < s.length; i++) { const [f, k] = letra(s[i]); pieza("text", k * 5, f * 6, 5, 6, x + i * 5, y); } };
    const caja3d = (x, y, w, h, f, luz, sombra) => { g.fillStyle = f; g.fillRect(x, y, w, h); g.fillStyle = luz; g.fillRect(x, y, w, 1); g.fillRect(x, y, 1, h); g.fillStyle = sombra; g.fillRect(x, y + h - 1, w, 1); g.fillRect(x + w - 1, y, 1, h); };
    const sonando = () => bPlay.textContent === "❚❚";
    const banda = (d, i, n) => { const a = Math.floor(2 * Math.pow(70, i / n)), b = Math.max(a + 1, Math.floor(2 * Math.pow(70, (i + 1) / n))); let s = 0; for (let k = a; k < b; k++) s += d[k] || 0; return Math.min(1, s / (b - a) / 210); };

    function ventanaPrincipal(t, d) {
      g.save();
      if (region.length) { g.beginPath(); region.forEach(p => { g.moveTo(p[0][0], p[0][1]); p.slice(1).forEach(q => g.lineTo(q[0], q[1])); g.closePath(); }); g.clip(); }
      if (listo("main")) g.drawImage(img.main, 0, 0, AN, MAIN, 0, 0, AN, MAIN);
      else { caja3d(0, 0, AN, MAIN, "#2b2f45", "#5a6080", "#10121c"); g.fillStyle = "#000"; g.fillRect(9, 22, 256, 44); }
      if (listo("titlebar")) pieza("titlebar", 27, 0, 275, 14, 0, 0);
      else { g.fillStyle = "#3a4268"; g.fillRect(0, 0, AN, 14); g.fillStyle = "#cfd6ff"; g.font = "bold 8px Arial"; g.fillText("REPRODUCTOR", 110, 10); }
      // tiempo con los números del skin
      const s = Math.floor(R.tiempoActual() || 0), dig = [Math.floor(s / 600) % 10, Math.floor(s / 60) % 10, Math.floor(s % 60 / 10), s % 10];
      const nums = listo("numbers") ? "numbers" : listo("nums_ex") ? "nums_ex" : "";
      [48, 60, 78, 90].forEach((x, i) => { if (nums) pieza(nums, dig[i] * 9, 0, 9, 13, x, 26); else { g.fillStyle = "#5ef0ff"; g.font = "bold 13px monospace"; g.fillText(dig[i], x, 38); } });
      pieza("playpaus", sonando() ? 0 : 9, 0, 9, 9, 26, 28);
      // marquesina con el nombre del tema (letras del skin)
      const tema = `${(R.actual ?? 0) + 1}. ${art.textContent ? art.textContent + " - " : ""}${tit.textContent || "Reproductor"}`.toUpperCase();
      if (t - ultimoPaso > .16) { ultimoPaso = t; paso++; }
      const largo = tema + "  ***  ", desde = tema.length > 31 ? paso % largo.length : 0;
      if (listo("text")) texto((largo + largo).substr(desde, 31), 111, 27, 154);
      else { g.fillStyle = "#5ef0ff"; g.font = "7px monospace"; g.fillText(tema.slice(0, 40), 111, 33); }
      if (listo("text")) { texto("128", 111, 43, 15); texto("44", 156, 43, 10); }
      pieza("monoster", 0, 0, 29, 12, 239, 41); pieza("monoster", 29, 12, 27, 12, 212, 41);
      // analizador con los colores del skin (viscolor.txt)
      for (let i = 0; i < 19; i++) {
        const v = Math.round(banda(d, i, 19) * 16); picos[i] = Math.max(v, picos[i] - .25);
        for (let y = 0; y < v; y++) { const fila = 15 - y; g.fillStyle = `rgb(${vis[2 + fila] || vis[2]})`; g.fillRect(24 + i * 4, 43 + fila, 3, 1); }
        if (picos[i] >= 1) { g.fillStyle = `rgb(${vis[23]})`; g.fillRect(24 + i * 4, 43 + 15 - Math.floor(picos[i]), 3, 1); }
      }
      // barras de volumen, balance y avance
      const v = +vol.value / 100, fv = Math.round(v * 27);
      pieza("volume", 0, fv * 15, 68, 13, 107, 57); pieza("volume", arrastre === "vol" ? 0 : 15, 422, 14, 11, 107 + Math.round(v * 51), 58);
      pieza("balance", 9, 0, 38, 13, 177, 57); pieza("balance", 15, 422, 14, 11, 189, 58);
      pieza("posbar", 0, 0, 248, 10, 16, 72);
      if (listo("posbar")) pieza("posbar", arrastre === "pos" ? 278 : 248, 0, 29, 10, 16 + Math.round(R.progreso() * 219), 72);
      else { g.fillStyle = "#1a1d2e"; g.fillRect(16, 74, 248, 6); g.fillStyle = "#5ef0ff"; g.fillRect(16, 74, 248 * R.progreso(), 6); }
      // botones (apretado = sprite de abajo)
      const B = [["ant", 0, 23, 16], ["play", 23, 23, 39], ["pausa", 46, 23, 62], ["stop", 69, 23, 85], ["sig", 92, 22, 108]];
      const ICONO = { ant: "⏮", play: "▶", pausa: "⏸", stop: "■", sig: "⏭" };
      B.forEach(([k, sx, w, x]) => {
        if (listo("cbuttons")) return pieza("cbuttons", sx, apretado === k ? 18 : 0, w, 18, x, 88);
        caja3d(x, 88, w, 18, apretado === k ? "#2a2f48" : "#3a4060", "#7a82a8", "#141624");
        g.fillStyle = "#cfd6ff"; g.font = "8px Arial"; g.textAlign = "center"; g.fillText(ICONO[k] + "︎", x + w / 2, 100); g.textAlign = "left";
      });
      pieza("cbuttons", 114, apretado === "eject" ? 16 : 0, 22, 16, 136, 89);
      pieza("shufrep", 28, (R.modo.aleatorio ? 30 : 0) + (apretado === "shuf" ? 15 : 0), 47, 15, 164, 89); pieza("shufrep", 0, (R.modo.repetir ? 30 : 0) + (apretado === "rep" ? 15 : 0), 28, 15, 210, 89);
      pieza("shufrep", 0, 61, 23, 12, 219, 58); pieza("shufrep", 23, 73, 23, 12, 242, 58);
      g.restore();
    }

    function ventanaEcualizador(d) {
      g.save(); g.translate(0, MAIN);
      if (listo("eqmain")) { g.drawImage(img.eqmain, 0, 0, AN, EQ, 0, 0, AN, EQ); pieza("eqmain", 0, 134, 275, 14, 0, 0); pieza("eqmain", 0, 294, 113, 19, 86, 17); }
      else { caja3d(0, 0, AN, EQ, "#262a3e", "#565c7c", "#0e1018"); g.fillStyle = "#3a4268"; g.fillRect(0, 0, AN, 14); }
      // los deslizadores bailan con la música (como un analizador)
      const xs = [21, ...Array.from({ length: 10 }, (_, i) => 78 + i * 18)];
      xs.forEach((x, i) => {
        const v = i ? banda(d, i - 1, 10) : .5, n = Math.max(0, Math.min(27, Math.round(v * 27)));
        if (listo("eqmain")) { pieza("eqmain", 13 + (n % 14) * 15, 164 + Math.floor(n / 14) * 65, 14, 63, x, 38); pieza("eqmain", 0, 164, 11, 11, x + 1, 38 + Math.round((1 - v) * 51)); }
        else { g.fillStyle = "#0c0e18"; g.fillRect(x + 5, 38, 4, 63); g.fillStyle = "#5ef0ff"; g.fillRect(x + 1, 38 + Math.round((1 - v) * 51), 11, 11); }
      });
      g.restore();
    }

    function ventanaLista() {
      g.save(); g.translate(AN, 0);
      const top = 20, abajo = PL - 38, ok = listo("pledit");
      g.fillStyle = pl.normalbg || "#000"; g.fillRect(12, top, AN - 32, abajo - top);
      if (ok) {
        pieza("pledit", 0, 0, 25, 20, 0, 0);
        for (let x = 25; x < 250; x += 25) pieza("pledit", 127, 0, 25, 20, x, 0);
        pieza("pledit", 26, 0, 100, 20, 87, 0); pieza("pledit", 153, 0, 25, 20, 250, 0);
        for (let y = top; y < abajo; y += 29) { pieza("pledit", 0, 42, 12, Math.min(29, abajo - y), 0, y); pieza("pledit", 31, 42, 20, Math.min(29, abajo - y), 255, y); }
        pieza("pledit", 0, 72, 125, 38, 0, abajo); pieza("pledit", 126, 72, 150, 38, 125, abajo);
      } else { caja3d(0, 0, AN, PL, "#262a3e", "#565c7c", "#0e1018"); g.fillStyle = pl.normalbg || "#000"; g.fillRect(12, top, AN - 32, abajo - top); }
      // temas con los colores del skin (pledit.txt)
      // la barra del tema actual solo si su texto se lee encima (algunos skins traen fondo y letra casi iguales)
      const luz = (h) => { const n = parseInt((h || "#000").slice(1), 16); return (.299 * (n >> 16) + .587 * (n >> 8 & 255) + .114 * (n & 255)) / 255; };
      const fondoLegible = Math.abs(luz(pl.selectedbg || "#0000c6") - luz(pl.current || "#ffffff")) > .3;
      const FILA = 13, cab = Math.floor((abajo - top) / FILA), act = R.actual ?? -1;
      if (act >= 0 && (act < scroll || act >= scroll + cab)) scroll = Math.max(0, act - 2);
      g.save(); g.beginPath(); g.rect(12, top, AN - 32, abajo - top); g.clip();
      g.font = `9px "${pl.font || "Arial"}", Arial, sans-serif`; g.textBaseline = "middle";
      for (let i = 0; i < cab && scroll + i < R.pistas.length; i++) {
        const k = scroll + i, p = R.pistas[k], y = top + i * FILA;
        if (k === act && fondoLegible) { g.fillStyle = pl.selectedbg || "#0000c6"; g.fillRect(12, y, AN - 32, FILA); }
        g.fillStyle = k === act ? (pl.current || "#fff") : (pl.normal || "#00ff00");
        const dur = R.fmt(p.duracion); g.textAlign = "right"; g.fillText(dur, AN - 24, y + FILA / 2 + .5);
        g.textAlign = "left"; let nombre = `${k + 1}. ${p.titulo}`; while (nombre.length > 4 && g.measureText(nombre).width > AN - 80) nombre = nombre.slice(0, -2);
        g.fillText(nombre, 15, y + FILA / 2 + .5);
      }
      g.restore(); g.restore();
    }

    // La ventana de visualización: marco con la barra de título del skin y un hueco negro; MilkDrop se pone encima (canvas aparte)
    function ventanaVisualizacion() {
      g.save(); g.translate(ANCHO, 0);
      caja3d(0, 0, AN, PL, pl.normalbg || "#262a3e", pl.normal || "#565c7c", pl.normal || "#0e1018");   // los colores de la lista del skin, para que el marco haga juego
      if (listo("titlebar")) pieza("titlebar", 27, 0, 275, 14, 0, 0); else { g.fillStyle = "#3a4268"; g.fillRect(0, 0, AN, 14); }
      g.fillStyle = "#000"; g.fillRect(5, 17, AN - 10, PL - 22);
      g.restore();
    }

    // ---- ayuda encima del skin: íconos donde el botón casi no se ve, y resalte + nombre al pasar el mouse ----
    const ZONAS = { shuf: [164, 89, 46, 15, "Aleatorio"], rep: [210, 89, 28, 15, "Repetir la lista"], eject: [136, 89, 22, 16, "Cambiar de skin"], ant: [16, 88, 23, 18, "Anterior"], play: [39, 88, 23, 18, "Play"], pausa: [62, 88, 23, 18, "Pausa"], stop: [85, 88, 23, 18, "Detener"], sig: [108, 88, 22, 18, "Siguiente"],
      pos: [16, 72, 248, 10, "Avance (arrastra para adelantar)"], vol: [107, 57, 68, 13, "Volumen"] };
    const ICONOS = { ant: "⏮", play: "▶", pausa: "⏸", stop: "■", sig: "⏭" };
    function medirContraste() {   // botón del skin vs. el dibujo que tiene detrás: si se parecen mucho, el botón no se entiende
      if (!listo("main")) return null;
      const m = document.createElement("canvas"); m.width = AN; m.height = MAIN; const mg = m.getContext("2d"); mg.drawImage(img.main, 0, 0);
      const b = listo("cbuttons") ? (() => { const k = document.createElement("canvas"); k.width = img.cbuttons.naturalWidth; k.height = img.cbuttons.naturalHeight; const kg = k.getContext("2d"); kg.drawImage(img.cbuttons, 0, 0); return kg; })() : null;
      const res = {};
      for (const [k, [x, y, w, h]] of Object.entries(ZONAS)) {
        if (!ICONOS[k]) continue;
        if (!b) { res[k] = false; continue; }   // sin botones propios se dibujan los clásicos, que sí se ven
        const sx = { ant: 0, play: 23, pausa: 46, stop: 69, sig: 92 }[k];
        try {
          const fondo = mg.getImageData(x, y, w, h).data, boton = b.getImageData(sx, 0, w, h).data; let dif = 0, lum = [];
          for (let i = 0; i < fondo.length; i += 4) { dif += Math.abs(fondo[i] - boton[i]) + Math.abs(fondo[i + 1] - boton[i + 1]) + Math.abs(fondo[i + 2] - boton[i + 2]); lum.push(boton[i] + boton[i + 1] + boton[i + 2]); }
          lum.sort((a, c) => a - c); const rango = (lum[Math.floor(lum.length * .95)] - lum[Math.floor(lum.length * .05)]) / 3;
          res[k] = dif / (fondo.length / 4) / 3 < 28 || rango < 45;   // casi igual al fondo, o un botón sin dibujo marcado
        } catch (e) { res[k] = false; }
      }
      return res;
    }
    function ayuda() {
      if (!poco && listo("main") && (!actual || !actual.piezas.includes("cbuttons") || listo("cbuttons"))) poco = medirContraste();
      g.save(); g.textAlign = "center"; g.textBaseline = "middle";
      for (const [k, [x, y, w, h]] of Object.entries(ZONAS)) {
        if (hover === k || arrastre === k) { g.fillStyle = `rgba(${colorAcento},.22)`; g.fillRect(x, y, w, h); g.strokeStyle = `rgba(${colorAcento},.95)`; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w - 1, h - 1); }
        if (poco && poco[k]) {
          g.font = "bold 10px Arial"; g.fillStyle = "rgba(0,0,0,.65)"; g.fillText(ICONOS[k] + "︎", x + w / 2 + .6, y + h / 2 + 1.1);
          g.fillStyle = hover === k ? `rgb(${colorAcento})` : "rgba(255,255,255,.92)"; g.fillText(ICONOS[k] + "︎", x + w / 2, y + h / 2 + .5);
        }
      }
      g.restore();
    }
    const zona = (x, y) => { if (x >= ANCHO) return ""; if (x >= AN) return y >= 20 && y < PL - 38 ? "lista" : ""; for (const [k, [zx, zy, w, h]] of Object.entries(ZONAS)) if (x >= zx && x < zx + w && y >= zy && y < zy + h) return k; return ""; };
    const NOMBRES = { lista: "Clic en un tema para reproducirlo · rueda para moverte" };

    R.cadaCuadro((t) => { const d = R.espectro(); g.clearRect(0, 0, AW, ALTO); ventanaPrincipal(t, d); ayuda(); ventanaEcualizador(d); ventanaLista(); if (op.visualizacion) ventanaVisualizacion(); });

    // ---- ratón: botones, barras y lista ----
    const punto = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * AW, (e.clientY - r.top) / r.height * ALTO]; };
    const boton = (x, y) => y >= 89 && y < 105 && x >= 136 && x < 238 ? (x < 158 ? "eject" : x >= 164 && x < 210 ? "shuf" : x >= 210 ? "rep" : "") : y >= 88 && y < 106 ? (x >= 16 && x < 39 ? "ant" : x < 62 ? "play" : x < 85 ? "pausa" : x < 108 ? "stop" : x < 130 ? "sig" : "") : "";
    const ponerVol = (x) => { vol.value = Math.round(Math.max(0, Math.min(1, (x - 114) / 54)) * 100); vol.dispatchEvent(new Event("input")); };
    c.addEventListener("pointerdown", (e) => {
      const [x, y] = punto(e); c.setPointerCapture(e.pointerId);
      if (x < AN && y < MAIN) {
        apretado = boton(x, y);
        if (y >= 72 && y < 82 && x >= 16 && x < 264) { arrastre = "pos"; R.saltarA(Math.max(0, Math.min(1, (x - 30) / 219))); }
        else if (y >= 57 && y < 70 && x >= 107 && x < 175) { arrastre = "vol"; ponerVol(x); }
      } else if (x >= AN + 12 && x < ANCHO - 20 && y >= 20 && y < PL - 38) {
        const k = scroll + Math.floor((y - 20) / 13); if (k < R.pistas.length) R.cargar(k);
      }
    });
    c.addEventListener("pointerleave", () => { hover = ""; c.style.cursor = "default"; });
    c.addEventListener("pointermove", (e) => {
      const [x, y] = punto(e), z = zona(x, y);
      if (z !== hover) { hover = z; c.title = (ZONAS[z] && ZONAS[z][4]) || NOMBRES[z] || ""; c.style.cursor = z ? "pointer" : "default"; }
      if (arrastre === "vol") ponerVol(x); else if (arrastre === "pos") R.saltarA(Math.max(0, Math.min(1, (x - 30) / 219)));
    });
    c.addEventListener("pointerup", (e) => {
      const [x, y] = punto(e), b = x < AN ? boton(x, y) : "";
      if (b && b === apretado) {
        const n = R.pistas.length;
        if (b === "shuf") R.modo.aleatorio = !R.modo.aleatorio;
        else if (b === "rep") R.modo.repetir = !R.modo.repetir;
        else if (b === "eject") { if (skins.length > 1) usar(skins[(skins.findIndex(s => actual && s.id === actual.id) + 1) % skins.length].id); }
        else if (b === "play") { if (!sonando()) R.alternar(); else R.saltarA(0); }
        else if (b === "pausa") R.alternar();
        else if (b === "stop") { if (sonando()) R.alternar(); R.saltarA(0); }
        else if (n) R.cargar((((R.actual ?? 0) + (b === "sig" ? 1 : -1)) % n + n) % n);
      }
      apretado = ""; arrastre = "";
    });
    c.addEventListener("wheel", (e) => { const [x] = punto(e); if (x > AN && x < ANCHO) { e.preventDefault(); scroll = Math.max(0, Math.min(Math.max(0, R.pistas.length - 12), scroll + Math.sign(e.deltaY) * 2)); } }, { passive: false });

    if (window.pywebview && pywebview.api) usar(""); else addEventListener("pywebviewready", () => usar(""));
    return { usar };
  }
  return { montar, lista: () => skins, leerSkins, actual: () => actual };
})();
