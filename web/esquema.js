// ÚNICA fuente de verdad de lo que una plantilla propia puede contener. La leen: el motor (libre.html), el editor
// (editor.html, que arma sus controles desde aquí) y el validador de Python (plantillas.py, que la lee como JSON).
// Debe seguir siendo JSON válido después de "const ESQUEMA = " (comillas dobles, sin comentarios dentro).
// Cada opción: { "t": "enum"|"num"|"bool"|"color"|"imagen", "n": etiqueta, "v": {valor: etiqueta}, "min", "max", "def", "u": unidad, "vacio": true }
const ESQUEMA = {
  "fondos": { "haz": "Haz de luz", "tunel": "Túnel psicodélico", "burbujas": "Burbujas", "luces": "Luces suaves", "estrellas": "Estrellas de píxel", "caratula": "Carátula desenfocada", "degradado": "Degradado", "color": "Color liso", "imagen": "Imagen propia", "columnas": "Columnas de luz (PS2)", "agujero": "Agujero negro (retro)", "visu2000": "Visualización 2000 (WMP)", "nuevos": "Psicodélico (ojo, espiral, fractal)", "milkdrop": "MilkDrop (visuales de Winamp)", "aero": "Aero (cielo, aurora y burbujas)", "cromo": "Cromo líquido", "liquida": "Tu imagen, líquida", "pompas": "Pompas de jabón (se revientan al tocarlas)", "ascii": "ASCII (caracteres que reaccionan y cambian con el tiempo)" },
  "fondo": {
    "color": { "t": "color", "n": "Color de base", "def": "#08080a" },
    "color2": { "t": "color", "n": "Segundo color (degradado)", "def": "#2a1030" },
    "angulo": { "t": "num", "n": "Ángulo del degradado", "min": 0, "max": 360, "def": 160, "u": "°" },
    "desenfoque": { "t": "num", "n": "Desenfoque (carátula)", "min": 10, "max": 140, "def": 70, "u": " px" },
    "brillo": { "t": "num", "n": "Brillo", "min": 20, "max": 130, "def": 100, "u": " %" },
    "tinte": { "t": "color", "n": "Tinte del agujero negro", "def": "", "vacio": true },
    "velocidad": { "t": "num", "n": "Velocidad (visualización 2000 y MilkDrop)", "min": 20, "max": 150, "def": 100, "u": " %" },
    "tema": { "t": "enum", "n": "Tema (ASCII)", "v": { "terminal": "Terminal", "psicodelico": "Psicodélico", "juegos": "Juegos (arcade)" }, "def": "terminal" },
    "imagenModo": { "t": "enum", "n": "Tu imagen en ASCII: cómo se convierte", "v": { "fondo": "Quitar el color de fondo (el más común)", "brillo": "Por brillo" }, "def": "fondo" },
    "imagenAjuste": { "t": "enum", "n": "Tu imagen en ASCII: cómo ocupa la pantalla", "v": { "estirar": "Estirar a todo el ancho", "cubrir": "Llenar recortando", "contener": "Entera, con sus proporciones", "ampliado": "Entera y los costados con lo mismo ampliado (ideal para videos)" }, "def": "estirar" },
    "imagenRecIzq": { "t": "num", "n": "Tu imagen o video: recortar por la izquierda", "min": 0, "max": 90, "def": 0, "u": " %" },
    "imagenRecArr": { "t": "num", "n": "Tu imagen o video: recortar por arriba", "min": 0, "max": 90, "def": 0, "u": " %" },
    "imagenRecDer": { "t": "num", "n": "Tu imagen o video: recortar por la derecha", "min": 0, "max": 90, "def": 0, "u": " %" },
    "imagenRecAba": { "t": "num", "n": "Tu imagen o video: recortar por abajo", "min": 0, "max": 90, "def": 0, "u": " %" },
    "imagenContraste": { "t": "num", "n": "Tu imagen en ASCII: contraste", "min": 50, "max": 250, "def": 140, "u": " %" },
    "imagenColor": { "t": "bool", "n": "Tu imagen en ASCII: usar los colores de la imagen", "def": false },
    "imagenSola": { "t": "bool", "n": "Tu imagen en ASCII: mostrar solo ella (sin las otras escenas)", "def": false },
    "cambio": { "t": "num", "n": "Cambio de visual (MilkDrop)", "min": 8, "max": 120, "def": 40, "u": " s" },
    "eventos": { "t": "bool", "n": "Eventos con el tiempo (ASCII: glitch, alertas, escaneo)", "def": true },
    "pompas": { "t": "num", "n": "Cantidad de pompas", "min": 6, "max": 40, "def": 20, "u": "" },
    "sonidoPompas": { "t": "bool", "n": "Sonido al reventar una pompa", "def": true },
    "deriva": { "t": "bool", "n": "La imagen se mueve lento (zoom y paneo)", "def": false },
    "golpe": { "t": "enum", "n": "Reacción al ritmo", "v": { "": "No", "destello": "Destello (bombo)", "zoom": "Zoom (bombo)", "ambos": "Destello y zoom", "sacudida": "Sacudida (bombo)", "cromatico": "Aberración de color (caja)", "todo": "Todo junto" }, "def": "" },
    "ritmo": { "t": "bool", "n": "Efectos al ritmo (ASCII: onda con el bombo, corte con la caja, chispas con los platillos, destello en la caída)", "def": true },
    "capa2": { "t": "enum", "n": "Segunda capa encima", "v": { "": "Ninguna", "burbujas": "Burbujas", "estrellas": "Estrellas de píxel", "luces": "Luces suaves", "haz": "Haz de luz", "tunel": "Túnel psicodélico", "columnas": "Columnas de luz", "agujero": "Agujero negro", "visu2000": "Visualización 2000", "nuevos": "Psicodélico", "milkdrop": "MilkDrop", "cromo": "Cromo líquido", "pompas": "Pompas de jabón (se revientan)", "ascii": "ASCII" }, "def": "" },
    "mezcla2": { "t": "enum", "n": "Cómo se mezcla la segunda capa", "v": { "normal": "Normal", "screen": "Aclarar (pantalla)", "overlay": "Superponer", "lighten": "Solo lo más claro", "multiply": "Oscurecer" }, "def": "screen" },
    "opacidad2": { "t": "num", "n": "Opacidad de la segunda capa", "min": 10, "max": 100, "def": 70, "u": " %" },
    "acabado": { "t": "enum", "n": "Acabado del fondo", "v": { "": "Ninguno", "cine": "Cine (grano y viñeta)", "sueno": "Sueño (suave y saturado)", "vhs": "VHS (líneas)", "vivo": "Vivo (más contraste y color)" }, "def": "" },
    "imagen": { "t": "imagen" }
  },
  "estilo": {
    "panel": { "t": "enum", "n": "Paneles y botones", "v": { "vidrio": "Vidrio", "metal": "Metal", "gel": "Gel", "pixel": "Píxel", "liso": "Liso oscuro", "ps2": "Consola (PS2)", "psico": "Psicodélico", "terminal": "Terminal (ASCII)" }, "def": "vidrio" },
    "acento": { "t": "color", "n": "Color de acento", "def": "#ff2d3d" },
    "acentoAuto": { "t": "bool", "n": "Acento tomado de la carátula", "def": false },
    "fuente": { "t": "enum", "n": "Letra", "v": { "Geist": "Geist (moderna)", "Fredoka": "Fredoka (redondeada)", "Instrument Serif": "Instrument Serif (serif)", "Silkscreen": "Silkscreen (píxel)", "VT323": "VT323 (pantalla LCD)", "Michroma": "Michroma (ancha)", "Orbitron": "Orbitron (futurista)", "Audiowide": "Audiowide", "Zen Dots": "Zen Dots (redonda Y2K)", "Syncopate": "Syncopate", "Quantico": "Quantico", "Bebas Neue": "Bebas Neue (alta)", "Baloo 2": "Baloo 2 (inflada)" }, "def": "Geist" },
    "deformacion": { "t": "num", "n": "Deformar lo que hay tras el vidrio", "min": 0, "max": 140, "def": 0, "u": "" }
  },
  "tipos": {
    "visual": { "etiqueta": "Visual", "rect": [30, 16, 40, 40], "ids": [], "repetible": true, "opciones": {
      "visual": { "t": "enum", "n": "Tipo", "v": { "barras": "Barras suaves", "pixel": "Bloques de píxel", "lcd": "Segmentos LCD", "onda": "Onda", "circulo": "Círculo" }, "def": "barras" },
      "color": { "t": "color", "n": "Color", "def": "", "vacio": true },
      "intensidad": { "t": "num", "n": "Intensidad", "min": 20, "max": 200, "def": 100, "u": " %" },
      "espejo": { "t": "bool", "n": "Reflejar hacia arriba", "def": false } } },
    "caratula": { "etiqueta": "Carátula", "rect": [6, 16, 20, 36], "ids": ["caratula"], "opciones": {
      "forma": { "t": "enum", "n": "Forma", "v": { "cuadrada": "Cuadrada", "redondeada": "Redondeada", "circulo": "Círculo", "vinilo": "Vinilo (gira)", "burbuja": "Burbuja de vidrio (flota)" }, "def": "redondeada" },
      "efecto": { "t": "enum", "n": "Efecto", "v": { "normal": "Normal", "duotono": "Duotono", "pixelada": "Pixelada", "bn": "Blanco y negro", "ascii": "ASCII (hecha de caracteres)" }, "def": "normal" },
      "inclinacion": { "t": "num", "n": "Inclinación", "min": -20, "max": 20, "def": 0, "u": "°" },
      "borde": { "t": "bool", "n": "Borde del color de acento", "def": false } } },
    "titulo": { "etiqueta": "Título", "rect": [30, 62, 40, 6], "ids": ["titulo"], "opciones": {
      "tam": { "t": "num", "n": "Tamaño", "min": 40, "max": 220, "def": 100, "u": " %" },
      "alineacion": { "t": "enum", "n": "Alineación", "v": { "izquierda": "Izquierda", "centro": "Centro", "derecha": "Derecha" }, "def": "izquierda" },
      "mayusculas": { "t": "bool", "n": "Todo en mayúsculas", "def": false },
      "fuente": { "t": "enum", "n": "Letra propia", "v": { "": "La de la plantilla", "Geist": "Geist", "Fredoka": "Fredoka", "Instrument Serif": "Instrument Serif", "Silkscreen": "Silkscreen", "VT323": "VT323", "Michroma": "Michroma", "Orbitron": "Orbitron", "Audiowide": "Audiowide", "Zen Dots": "Zen Dots", "Syncopate": "Syncopate", "Quantico": "Quantico", "Bebas Neue": "Bebas Neue", "Baloo 2": "Baloo 2" }, "def": "" },
      "color": { "t": "color", "n": "Color", "def": "", "vacio": true },
      "efecto": { "t": "enum", "n": "Efecto del texto", "v": { "ninguno": "Ninguno", "sombra": "Sombra", "brillo": "Brillo", "contorno": "Contorno", "neon": "Neón", "cromo": "Cromo", "burbuja": "Burbuja (gel brillante)" }, "def": "ninguno" },
      "marquesina": { "t": "bool", "n": "Si no cabe, que se desplace", "def": true } } },
    "artista": { "etiqueta": "Artista", "rect": [30, 69, 40, 4], "ids": ["artista"], "opciones": {
      "tam": { "t": "num", "n": "Tamaño", "min": 40, "max": 220, "def": 100, "u": " %" },
      "alineacion": { "t": "enum", "n": "Alineación", "v": { "izquierda": "Izquierda", "centro": "Centro", "derecha": "Derecha" }, "def": "izquierda" },
      "mayusculas": { "t": "bool", "n": "Todo en mayúsculas", "def": false },
      "fuente": { "t": "enum", "n": "Letra propia", "v": { "": "La de la plantilla", "Geist": "Geist", "Fredoka": "Fredoka", "Instrument Serif": "Instrument Serif", "Silkscreen": "Silkscreen", "VT323": "VT323", "Michroma": "Michroma", "Orbitron": "Orbitron", "Audiowide": "Audiowide", "Zen Dots": "Zen Dots", "Syncopate": "Syncopate", "Quantico": "Quantico", "Bebas Neue": "Bebas Neue", "Baloo 2": "Baloo 2" }, "def": "" },
      "color": { "t": "color", "n": "Color", "def": "", "vacio": true },
      "efecto": { "t": "enum", "n": "Efecto del texto", "v": { "ninguno": "Ninguno", "sombra": "Sombra", "brillo": "Brillo", "contorno": "Contorno", "neon": "Neón", "cromo": "Cromo", "burbuja": "Burbuja (gel brillante)" }, "def": "ninguno" } } },
    "botones": { "etiqueta": "Botones", "rect": [34, 78, 32, 9], "ids": ["bAnt", "bPlay", "bSig"], "opciones": {
      "tam": { "t": "num", "n": "Tamaño", "min": 50, "max": 160, "def": 100, "u": " %" },
      "separacion": { "t": "num", "n": "Separación", "min": 0, "max": 30, "def": 6, "u": "" },
      "redondos": { "t": "bool", "n": "Botones redondos", "def": false },
      "acento": { "t": "color", "n": "Color propio de los botones", "def": "", "vacio": true },
      "piel": { "t": "enum", "n": "Piel de los controles", "v": { "": "La del estilo general", "gel": "Gel Y2K", "aero": "Aero (vidrio celeste)", "cromo": "Cromo", "neon": "Neón", "win98": "Windows 98", "xp": "Windows XP", "vidrio": "Vidrio", "arcilla": "Arcilla (inflada)", "relieve": "Relieve suave", "pixel": "Píxel", "burbuja": "Burbuja de vidrio" }, "def": "" } } },
    "barra": { "etiqueta": "Barra de avance", "rect": [10, 92, 80, 2.4], "ids": ["barra"], "opciones": {
      "modo": { "t": "enum", "n": "Tipo", "v": { "linea": "Línea", "onda": "Onda real del tema", "segmentos": "Segmentos", "ascii": "ASCII  [####>-----]" }, "def": "linea" },
      "grosor": { "t": "num", "n": "Grosor", "min": 3, "max": 30, "def": 12, "u": " px" },
      "acento": { "t": "color", "n": "Color propio de la barra", "def": "", "vacio": true },
      "piel": { "t": "enum", "n": "Piel de los controles", "v": { "": "La del estilo general", "gel": "Gel Y2K", "aero": "Aero (vidrio celeste)", "cromo": "Cromo", "neon": "Neón", "win98": "Windows 98", "xp": "Windows XP", "vidrio": "Vidrio", "arcilla": "Arcilla (inflada)", "relieve": "Relieve suave", "pixel": "Píxel", "burbuja": "Burbuja de vidrio" }, "def": "" } } },
    "tiempo": { "etiqueta": "Tiempo", "rect": [84, 86, 12, 4], "ids": ["tiempo"], "opciones": {
      "tam": { "t": "num", "n": "Tamaño", "min": 40, "max": 220, "def": 100, "u": " %" },
      "color": { "t": "color", "n": "Color", "def": "", "vacio": true },
      "efecto": { "t": "enum", "n": "Efecto del texto", "v": { "ninguno": "Ninguno", "sombra": "Sombra", "brillo": "Brillo", "contorno": "Contorno", "neon": "Neón", "cromo": "Cromo", "burbuja": "Burbuja (gel brillante)" }, "def": "ninguno" } } },
    "volumen": { "etiqueta": "Volumen", "rect": [76, 78, 20, 6], "ids": ["volumen", "iconoVol"], "opciones": {
      "acento": { "t": "color", "n": "Color propio del volumen", "def": "", "vacio": true },
      "piel": { "t": "enum", "n": "Piel de los controles", "v": { "": "La del estilo general", "gel": "Gel Y2K", "aero": "Aero (vidrio celeste)", "cromo": "Cromo", "neon": "Neón", "win98": "Windows 98", "xp": "Windows XP", "vidrio": "Vidrio", "arcilla": "Arcilla (inflada)", "relieve": "Relieve suave", "pixel": "Píxel", "burbuja": "Burbuja de vidrio" }, "def": "" } } },
    "lista": { "etiqueta": "Lista de temas", "rect": [72, 8, 24, 62], "ids": ["lista"], "opciones": {
      "miniaturas": { "t": "bool", "n": "Mostrar carátulas", "def": true },
      "numeros": { "t": "bool", "n": "Mostrar números", "def": true },
      "tam": { "t": "num", "n": "Tamaño del texto", "min": 70, "max": 150, "def": 100, "u": " %" },
      "acento": { "t": "color", "n": "Color propio de la lista (tema que suena)", "def": "", "vacio": true },
      "piel": { "t": "enum", "n": "Piel de los controles", "v": { "": "La del estilo general", "gel": "Gel Y2K", "aero": "Aero (vidrio celeste)", "cromo": "Cromo", "neon": "Neón", "win98": "Windows 98", "xp": "Windows XP", "vidrio": "Vidrio", "arcilla": "Arcilla (inflada)", "relieve": "Relieve suave", "pixel": "Píxel", "burbuja": "Burbuja de vidrio" }, "def": "" } } },
    "panel": { "etiqueta": "Panel", "rect": [8, 8, 26, 40], "ids": [], "repetible": true, "opciones": {
      "borde": { "t": "bool", "n": "Con borde", "def": true },
      "color": { "t": "color", "n": "Color propio", "def": "", "vacio": true },
      "piel": { "t": "enum", "n": "Piel de los controles", "v": { "": "La del estilo general", "gel": "Gel Y2K", "aero": "Aero (vidrio celeste)", "cromo": "Cromo", "neon": "Neón", "win98": "Windows 98", "xp": "Windows XP", "vidrio": "Vidrio", "arcilla": "Arcilla (inflada)", "relieve": "Relieve suave", "pixel": "Píxel", "burbuja": "Burbuja de vidrio" }, "def": "" } } },
    "imagen": { "etiqueta": "Imagen", "rect": [36, 8, 28, 50], "ids": [], "repetible": true, "opciones": {
      "ajuste": { "t": "enum", "n": "Ajuste", "v": { "contener": "Contener", "cubrir": "Cubrir" }, "def": "contener" },
      "reaccion": { "t": "enum", "n": "Reacciona a la música", "v": { "ninguna": "No", "pulso": "Pulso", "golpe": "Golpe (con sacudida)", "flotar": "Flota" }, "def": "ninguna" },
      "fuerza": { "t": "num", "n": "Fuerza de la reacción", "min": 20, "max": 200, "def": 100, "u": " %" },
      "aura": { "t": "bool", "n": "Aura de color", "def": false },
      "aberracion": { "t": "bool", "n": "Desfase de color en los golpes", "def": false },
      "imagen": { "t": "imagen" } } },
    "carcasa": { "etiqueta": "Carcasa (un aparato como reproductor)", "rect": [18, 4, 64, 92], "ids": [], "opciones": {
      "ajuste": { "t": "enum", "n": "Ajuste", "v": { "contener": "Contener", "cubrir": "Cubrir" }, "def": "contener" },
      "reaccion": { "t": "enum", "n": "Reacciona a la música", "v": { "ninguna": "No", "pulso": "Pulso", "golpe": "Golpe (con sacudida)", "flotar": "Flota" }, "def": "pulso" },
      "fuerza": { "t": "num", "n": "Fuerza de la reacción", "min": 20, "max": 200, "def": 50, "u": " %" },
      "aura": { "t": "bool", "n": "Aura de color", "def": false },
      "aberracion": { "t": "bool", "n": "Desfase de color en los golpes", "def": false },
      "sombra": { "t": "bool", "n": "Sombra debajo", "def": true },
      "imagen": { "t": "imagen" } } },
    "adorno": { "etiqueta": "Adorno (tribal, destello, marco…)", "rect": [40, 10, 20, 30], "ids": [], "repetible": true, "opciones": {
      "forma": { "t": "enum", "n": "Forma", "v": { "estrella": "Estrella de púas", "destello": "Destello", "alas": "Alas tribales", "tribal": "Llama tribal", "anillo": "Anillo de púas", "marco": "Marco con esquinas", "barras": "Código de barras", "cristal": "Cristal" }, "def": "estrella" },
      "acabado": { "t": "enum", "n": "Acabado", "v": { "cromo": "Cromo", "neon": "Neón", "plano": "Color plano", "vidrio": "Vidrio" }, "def": "cromo" },
      "color": { "t": "color", "n": "Color", "def": "", "vacio": true },
      "puntas": { "t": "num", "n": "Puntas", "min": 3, "max": 24, "def": 8, "u": "" },
      "giro": { "t": "num", "n": "Giro", "min": 0, "max": 360, "def": 0, "u": "°" },
      "reflejar": { "t": "bool", "n": "Reflejar (espejo)", "def": false },
      "reaccion": { "t": "enum", "n": "Reacciona a la música", "v": { "ninguna": "No", "pulso": "Pulso", "girar": "Gira", "brillo": "Brilla con el bajo" }, "def": "pulso" } } },
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
  "bases": ["liquido", "headspace", "dosmil", "ambiente", "pixel", "anime", "psicodelico", "aero", "cromo", "ascii"],
  "imagenesIncluidas": ["img/aero/agua.webp", "img/aero/colinas.webp"],
  "maxPiezas": 30
};
