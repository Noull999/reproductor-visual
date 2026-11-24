// ÚNICA fuente de verdad de lo que una plantilla propia puede contener. La leen: el motor (libre.html), el editor
// (editor.html, que arma sus controles desde aquí) y el validador de Python (plantillas.py, que la lee como JSON).
// Debe seguir siendo JSON válido después de "const ESQUEMA = " (comillas dobles, sin comentarios dentro).
// Cada opción: { "t": "enum"|"num"|"bool"|"color"|"imagen", "n": etiqueta, "v": {valor: etiqueta}, "min", "max", "def", "u": unidad, "vacio": true }
const ESQUEMA = {
  "fondos": { "haz": "Haz de luz", "tunel": "Túnel psicodélico", "burbujas": "Burbujas", "luces": "Luces suaves", "estrellas": "Estrellas de píxel", "caratula": "Carátula desenfocada", "degradado": "Degradado", "color": "Color liso", "imagen": "Imagen propia", "columnas": "Columnas de luz (PS2)", "agujero": "Agujero negro (retro)", "visu2000": "Visualización 2000 (WMP)", "nuevos": "Psicodélico (ojo, espiral, fractal)", "milkdrop": "MilkDrop (visuales de Winamp)" },
  "fondo": {
    "color": { "t": "color", "n": "Color de base", "def": "#08080a" },
    "color2": { "t": "color", "n": "Segundo color (degradado)", "def": "#2a1030" },
    "angulo": { "t": "num", "n": "Ángulo del degradado", "min": 0, "max": 360, "def": 160, "u": "°" },
    "desenfoque": { "t": "num", "n": "Desenfoque (carátula)", "min": 10, "max": 140, "def": 70, "u": " px" },
    "brillo": { "t": "num", "n": "Brillo", "min": 20, "max": 130, "def": 100, "u": " %" },
    "tinte": { "t": "color", "n": "Tinte del agujero negro", "def": "", "vacio": true },
    "velocidad": { "t": "num", "n": "Velocidad (visualización 2000 y MilkDrop)", "min": 20, "max": 150, "def": 100, "u": " %" },
    "cambio": { "t": "num", "n": "Cambio de visual (MilkDrop)", "min": 8, "max": 120, "def": 40, "u": " s" },
    "imagen": { "t": "imagen" }
  },
  "estilo": {
    "panel": { "t": "enum", "n": "Paneles y botones", "v": { "vidrio": "Vidrio", "metal": "Metal", "gel": "Gel", "pixel": "Píxel", "liso": "Liso oscuro", "ps2": "Consola (PS2)", "psico": "Psicodélico" }, "def": "vidrio" },
    "acento": { "t": "color", "n": "Color de acento", "def": "#ff2d3d" },
    "acentoAuto": { "t": "bool", "n": "Acento tomado de la carátula", "def": false },
    "fuente": { "t": "enum", "n": "Letra", "v": { "Geist": "Geist (moderna)", "Fredoka": "Fredoka (redondeada)", "Instrument Serif": "Instrument Serif (serif)", "Silkscreen": "Silkscreen (píxel)", "VT323": "VT323 (pantalla LCD)", "Michroma": "Michroma (ancha)" }, "def": "Geist" },
    "deformacion": { "t": "num", "n": "Deformar lo que hay tras el vidrio", "min": 0, "max": 140, "def": 0, "u": "" }
  },
  "tipos": {
    "visual": { "etiqueta": "Visual", "rect": [30, 16, 40, 40], "ids": [], "repetible": true, "opciones": {
      "visual": { "t": "enum", "n": "Tipo", "v": { "barras": "Barras suaves", "pixel": "Bloques de píxel", "lcd": "Segmentos LCD", "onda": "Onda", "circulo": "Círculo" }, "def": "barras" },
      "color": { "t": "color", "n": "Color", "def": "", "vacio": true },
      "intensidad": { "t": "num", "n": "Intensidad", "min": 20, "max": 200, "def": 100, "u": " %" },
      "espejo": { "t": "bool", "n": "Reflejar hacia arriba", "def": false } } },
    "caratula": { "etiqueta": "Carátula", "rect": [6, 16, 20, 36], "ids": ["caratula"], "opciones": {
      "forma": { "t": "enum", "n": "Forma", "v": { "cuadrada": "Cuadrada", "redondeada": "Redondeada", "circulo": "Círculo", "vinilo": "Vinilo (gira)" }, "def": "redondeada" },
      "efecto": { "t": "enum", "n": "Efecto", "v": { "normal": "Normal", "duotono": "Duotono", "pixelada": "Pixelada", "bn": "Blanco y negro" }, "def": "normal" },
      "inclinacion": { "t": "num", "n": "Inclinación", "min": -20, "max": 20, "def": 0, "u": "°" },
      "borde": { "t": "bool", "n": "Borde del color de acento", "def": false } } },
    "titulo": { "etiqueta": "Título", "rect": [30, 62, 40, 6], "ids": ["titulo"], "opciones": {
      "tam": { "t": "num", "n": "Tamaño", "min": 40, "max": 220, "def": 100, "u": " %" },
      "alineacion": { "t": "enum", "n": "Alineación", "v": { "izquierda": "Izquierda", "centro": "Centro", "derecha": "Derecha" }, "def": "izquierda" },
      "mayusculas": { "t": "bool", "n": "Todo en mayúsculas", "def": false },
      "fuente": { "t": "enum", "n": "Letra propia", "v": { "": "La de la plantilla", "Geist": "Geist", "Fredoka": "Fredoka", "Instrument Serif": "Instrument Serif", "Silkscreen": "Silkscreen", "VT323": "VT323", "Michroma": "Michroma" }, "def": "" },
      "color": { "t": "color", "n": "Color", "def": "", "vacio": true } } },
    "artista": { "etiqueta": "Artista", "rect": [30, 69, 40, 4], "ids": ["artista"], "opciones": {
      "tam": { "t": "num", "n": "Tamaño", "min": 40, "max": 220, "def": 100, "u": " %" },
      "alineacion": { "t": "enum", "n": "Alineación", "v": { "izquierda": "Izquierda", "centro": "Centro", "derecha": "Derecha" }, "def": "izquierda" },
      "mayusculas": { "t": "bool", "n": "Todo en mayúsculas", "def": false },
      "fuente": { "t": "enum", "n": "Letra propia", "v": { "": "La de la plantilla", "Geist": "Geist", "Fredoka": "Fredoka", "Instrument Serif": "Instrument Serif", "Silkscreen": "Silkscreen", "VT323": "VT323", "Michroma": "Michroma" }, "def": "" },
      "color": { "t": "color", "n": "Color", "def": "", "vacio": true } } },
    "botones": { "etiqueta": "Botones", "rect": [34, 78, 32, 9], "ids": ["bAnt", "bPlay", "bSig"], "opciones": {
      "tam": { "t": "num", "n": "Tamaño", "min": 50, "max": 160, "def": 100, "u": " %" },
      "separacion": { "t": "num", "n": "Separación", "min": 0, "max": 30, "def": 6, "u": "" },
      "redondos": { "t": "bool", "n": "Botones redondos", "def": false } } },
    "barra": { "etiqueta": "Barra de avance", "rect": [10, 92, 80, 2.4], "ids": ["barra"], "opciones": {
      "modo": { "t": "enum", "n": "Tipo", "v": { "linea": "Línea", "onda": "Onda real del tema", "segmentos": "Segmentos" }, "def": "linea" },
      "grosor": { "t": "num", "n": "Grosor", "min": 3, "max": 30, "def": 12, "u": " px" } } },
    "tiempo": { "etiqueta": "Tiempo", "rect": [84, 86, 12, 4], "ids": ["tiempo"], "opciones": {
      "tam": { "t": "num", "n": "Tamaño", "min": 40, "max": 220, "def": 100, "u": " %" },
      "color": { "t": "color", "n": "Color", "def": "", "vacio": true } } },
    "volumen": { "etiqueta": "Volumen", "rect": [76, 78, 20, 6], "ids": ["volumen", "iconoVol"], "opciones": {} },
    "lista": { "etiqueta": "Lista de temas", "rect": [72, 8, 24, 62], "ids": ["lista"], "opciones": {
      "miniaturas": { "t": "bool", "n": "Mostrar carátulas", "def": true },
      "numeros": { "t": "bool", "n": "Mostrar números", "def": true },
      "tam": { "t": "num", "n": "Tamaño del texto", "min": 70, "max": 150, "def": 100, "u": " %" } } },
    "panel": { "etiqueta": "Panel", "rect": [8, 8, 26, 40], "ids": [], "repetible": true, "opciones": {
      "borde": { "t": "bool", "n": "Con borde", "def": true },
      "color": { "t": "color", "n": "Color propio", "def": "", "vacio": true } } },
    "imagen": { "etiqueta": "Imagen", "rect": [36, 8, 28, 50], "ids": [], "repetible": true, "opciones": {
      "ajuste": { "t": "enum", "n": "Ajuste", "v": { "contener": "Contener", "cubrir": "Cubrir" }, "def": "contener" },
      "reaccion": { "t": "enum", "n": "Reacciona a la música", "v": { "ninguna": "No", "pulso": "Pulso", "golpe": "Golpe (con sacudida)", "flotar": "Flota" }, "def": "ninguna" },
      "fuerza": { "t": "num", "n": "Fuerza de la reacción", "min": 20, "max": 200, "def": 100, "u": " %" },
      "aura": { "t": "bool", "n": "Aura de color", "def": false },
      "aberracion": { "t": "bool", "n": "Desfase de color en los golpes", "def": false },
      "imagen": { "t": "imagen" } } },
    "efecto": { "etiqueta": "Efecto", "rect": [20, 5, 60, 80], "ids": [], "repetible": true, "opciones": {
      "efecto": { "t": "enum", "n": "Tipo", "v": { "lineas": "Líneas de velocidad", "anillos": "Anillos", "destellos": "Destellos" }, "def": "lineas" },
      "sensibilidad": { "t": "num", "n": "Sensibilidad", "min": 20, "max": 200, "def": 100, "u": " %" },
      "color": { "t": "color", "n": "Color", "def": "", "vacio": true } } },
    "winamp": { "etiqueta": "Reproductor Winamp (tus skins)", "rect": [3, 13, 94, 72], "ids": ["titulo", "artista", "bAnt", "bPlay", "bSig", "barra", "tiempo", "volumen", "lista"], "aspecto": 2.371, "opciones": {
      "ambiente": { "t": "bool", "n": "Fondo con el arte del skin", "def": true },
      "visualizacion": { "t": "bool", "n": "Ventana de visualización (MilkDrop dentro del reproductor)", "def": false } } },
    "cabeza": { "etiqueta": "Cabeza Y2K (con pantalla)", "rect": [28, 3, 44, 92], "ids": ["caratula", "titulo", "artista", "bAnt", "bPlay", "bSig", "barra", "tiempo"], "aspecto": 0.789, "opciones": {
      "cuerpo": { "t": "enum", "n": "Cuerpo", "v": { "Y2K": "Y2K translúcido", "Gel": "Gel brillante", "Propio": "El que subiste en Headspace" }, "def": "Y2K" },
      "color": { "t": "enum", "n": "Color", "v": { "Lima": "Lima", "Chicle": "Chicle", "Cielo": "Cielo", "Mandarina": "Mandarina", "Cromo": "Cromo" }, "def": "Lima" } } },
    "equipo": { "etiqueta": "Equipo de metal (con LCD)", "rect": [6, 66, 66, 31], "ids": ["caratula", "titulo", "artista", "bAnt", "bPlay", "bSig", "barra", "volumen"], "opciones": {
      "skin": { "t": "enum", "n": "Skin", "v": { "Plata": "Plata", "Grafito": "Grafito", "LCD verde": "LCD verde", "Azul": "Azul" }, "def": "Plata" } } }
  },
  "comunes": {
    "opacidad": { "t": "num", "n": "Opacidad", "min": 10, "max": 100, "def": 100, "u": " %" }
  },
  "bases": ["liquido", "headspace", "dosmil", "ambiente", "pixel", "anime", "psicodelico"],
  "imagenesIncluidas": [],
  "maxPiezas": 30
};
