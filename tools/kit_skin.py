"""
Kit para crear tu propio skin de Winamp: un skin en blanco con el diseño real de cada pieza (los tamaños y las zonas que lee
la plantilla Winamp), más una guía por pieza con cada zona marcada y nombrada. Todo es arte propio, sin nada de Winamp.

    python tools/kit_skin.py            # escribe la carpeta kit-skin/

Se pinta encima de las piezas con cualquier editor (BMP o PNG, sin comprimir con pérdida), se guardan en un .zip renombrado a
.wsz y se importa en la plantilla Winamp ("Importar archivo"). Las coordenadas son las de winamp.js (en píxeles).
"""
import io
import sys
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "kit-skin"

# pieza: (ancho, alto, color de fondo, {zona: (x, y, ancho, alto)})
PIEZAS = {
    "main": (275, 116, (43, 47, 69), {
        "barra de título (la cubre titlebar)": (0, 0, 275, 14), "pantalla": (9, 22, 256, 44), "tiempo": (48, 26, 51, 13), "analizador": (24, 43, 76, 16),
        "nombre del tema": (111, 27, 154, 6), "volumen": (107, 57, 68, 13), "balance": (177, 57, 38, 13), "avance": (16, 72, 248, 10),
        "botones": (16, 88, 114, 18), "eject": (136, 89, 22, 16), "shuffle": (164, 89, 47, 15), "repeat": (210, 89, 28, 15), "ecualizador / lista": (219, 58, 46, 12)}),
    "titlebar": (344, 87, (58, 66, 104), {"barra activa": (27, 0, 275, 14), "barra inactiva": (27, 15, 275, 14)}),
    "cbuttons": (136, 36, (58, 64, 96), {**{f"{n} (normal)": (x, 0, w, 18) for n, x, w in
                  [("anterior", 0, 23), ("play", 23, 23), ("pausa", 46, 23), ("stop", 69, 23), ("siguiente", 92, 22)]},
                  **{f"{n} (apretado)": (x, 18, w, 18) for n, x, w in [("anterior", 0, 23), ("play", 23, 23), ("pausa", 46, 23), ("stop", 69, 23), ("siguiente", 92, 22)]},
                  "eject (normal)": (114, 0, 22, 16), "eject (apretado)": (114, 16, 22, 16)}),
    "numbers": (99, 13, (0, 0, 0), {f"dígito {i}": (i * 9, 0, 9, 13) for i in range(10)}),
    "nums_ex": (108, 13, (0, 0, 0), {**{f"dígito {i}": (i * 9, 0, 9, 13) for i in range(10)}, "vacío": (90, 0, 9, 13), "signo menos": (99, 0, 9, 13)}),   # alternativa a numbers
    "text": (155, 18, (0, 0, 0), {"letras A-Z (31 por fila, 5×6 px)": (0, 0, 155, 6), "números y signos": (0, 6, 155, 6), "más signos": (0, 12, 155, 6)}),
    "playpaus": (42, 9, (30, 34, 52), {"play": (0, 0, 9, 9), "pausa": (9, 0, 9, 9), "stop": (18, 0, 9, 9)}),
    "posbar": (307, 10, (26, 29, 46), {"riel": (0, 0, 248, 10), "perilla": (248, 0, 29, 10), "perilla apretada": (278, 0, 29, 10)}),
    "volume": (68, 433, (26, 29, 46), {**{f"nivel {i}": (0, i * 15, 68, 13) for i in range(28)}, "perilla": (15, 422, 14, 11), "perilla apretada": (0, 422, 14, 11)}),
    "balance": (68, 433, (26, 29, 46), {**{f"nivel {i}": (9, i * 15, 38, 13) for i in range(28)}, "perilla": (15, 422, 14, 11), "perilla apretada": (0, 422, 14, 11)}),
    "monoster": (56, 24, (30, 34, 52), {"stereo": (0, 0, 29, 12), "mono": (29, 12, 27, 12)}),
    "shufrep": (92, 85, (58, 64, 96), {"repeat": (0, 0, 28, 15), "shuffle": (28, 0, 47, 15), "botón ecualizador": (0, 61, 23, 12), "botón lista": (23, 73, 23, 12)}),
    "eqmain": (275, 315, (38, 42, 62), {"ventana": (0, 0, 275, 116), "barra de título": (0, 134, 275, 14), "deslizadores (28 posiciones)": (13, 164, 210, 130), "perilla": (0, 164, 11, 11)}),
    "pledit": (280, 186, (38, 42, 62), {"barra superior": (0, 0, 25, 20), "relleno de la barra": (127, 0, 25, 20), "borde izquierdo": (0, 42, 12, 29), "borde derecho": (31, 42, 20, 29), "parte baja": (0, 72, 275, 38)}),
    "gen": (194, 109, (38, 42, 62), {"barra de título": (0, 0, 194, 20), "marco": (0, 20, 194, 89)}),
}
PLEDIT = '[Text]\nNormal=#7ee8fa\nCurrent=#ffffff\nNormalBG=#101424\nSelectedBG=#2c3a6e\nFont=Arial\n'
VISCOLOR = "\n".join(f"{r},{g},{b}" for r, g, b in [(0, 0, 0), (24, 33, 41), (239, 49, 16), (206, 41, 16), (214, 90, 0), (214, 102, 0), (214, 115, 0), (198, 123, 8), (222, 165, 24), (214, 181, 33),
                                                      (189, 222, 41), (148, 222, 33), (41, 206, 16), (50, 190, 16), (57, 181, 16), (49, 156, 8), (41, 148, 0), (24, 132, 8), (255, 255, 255),
                                                      (214, 214, 222), (181, 189, 189), (160, 170, 175), (148, 156, 165), (150, 150, 150)]) + "\n"
LEEME = """KIT PARA CREAR TU PROPIO SKIN (plantilla Winamp)
=================================================
1. Abre las piezas de la carpeta «piezas» en tu editor (Photoshop, GIMP, Krita, Paint.NET, Aseprite…).
   Cada una tiene el tamaño exacto que se necesita. NO cambies el tamaño del lienzo.
2. Mira «guias/guia-<pieza>.png»: muestra cada zona con su nombre (en grande, para leerla). Pinta tu arte dentro de esas zonas.
   Lo mínimo para empezar es «main» (la ventana): con ella sola ya funciona; lo que no pintes usa el dibujo de respaldo de la app.
3. Guarda cada pieza como BMP de 24 bits (o PNG) con el MISMO nombre (main.bmp, cbuttons.bmp…).
4. Mete todo en un .zip (los archivos sueltos, sin carpeta) y cámbiale la extensión a .wsz.
5. En la app: plantilla Winamp → Importar archivo → elige tu .wsz.
«skin-en-blanco.wsz» ya es un skin válido con todas las zonas marcadas: impórtalo para ver el diseño tal cual.
El arte que hagas es tuyo: puedes compartir tu skin en la comunidad si es 100 % original (no uses personajes ni marcas ajenas).
"""


def pieza(nombre, con_marcas=True, escala=1):
    w, h, fondo, zonas = PIEZAS[nombre]
    im = Image.new("RGB", (w, h), fondo)
    d = ImageDraw.Draw(im)
    if con_marcas:
        for i, (z, (x, y, zw, zh)) in enumerate(zonas.items()):
            d.rectangle([x, y, x + zw - 1, y + zh - 1], outline=(90 + (i * 47) % 160, 200 - (i * 31) % 120, 120 + (i * 61) % 130))
    return im


def guia(nombre):
    """La pieza ampliada con el nombre de cada zona. Las piezas muy altas (volume, balance) se muestran en tres columnas."""
    w, h, fondo, zonas = PIEZAS[nombre]
    k = 4 if w <= 140 and h <= 120 else 3 if w <= 310 and h <= 330 else 2
    base = pieza(nombre).resize((w * k, h * k), Image.NEAREST)
    lienzo = Image.new("RGB", (w * k + 300, max(h * k, 24 * (len(zonas) + 2))), (20, 20, 24))
    lienzo.paste(base, (0, 0))
    d = ImageDraw.Draw(lienzo)
    d.text((w * k + 10, 6), f"{nombre}.bmp  {w}x{h} px", fill=(255, 255, 255))
    for i, (z, (x, y, zw, zh)) in enumerate(list(zonas.items())[:40]):
        c = (90 + (i * 47) % 160, 200 - (i * 31) % 120, 120 + (i * 61) % 130)
        d.rectangle([x * k, y * k, (x + zw) * k - 1, (y + zh) * k - 1], outline=c)
        d.text((w * k + 10, 26 + i * 12), f"x{x} y{y} {zw}x{zh}  {z}", fill=c)
    return lienzo


def escribir(destino=SALIDA):
    destino = Path(destino)
    (destino / "piezas").mkdir(parents=True, exist_ok=True)
    (destino / "guias").mkdir(exist_ok=True)
    zip_bytes = io.BytesIO()
    with zipfile.ZipFile(zip_bytes, "w", zipfile.ZIP_DEFLATED) as z:
        for n in PIEZAS:
            b = io.BytesIO()
            pieza(n).save(b, "BMP")
            z.writestr(f"{n}.bmp", b.getvalue())
            (destino / "piezas" / f"{n}.bmp").write_bytes(b.getvalue())
            guia(n).save(destino / "guias" / f"guia-{n}.png")
        z.writestr("pledit.txt", PLEDIT)
        z.writestr("viscolor.txt", VISCOLOR)
    (destino / "skin-en-blanco.wsz").write_bytes(zip_bytes.getvalue())
    (destino / "piezas" / "pledit.txt").write_text(PLEDIT, encoding="utf-8")
    (destino / "piezas" / "viscolor.txt").write_text(VISCOLOR, encoding="utf-8")
    (destino / "LEEME.txt").write_text(LEEME, encoding="utf-8")
    return destino


if __name__ == "__main__":
    print("kit escrito en", escribir(sys.argv[1] if len(sys.argv) > 1 else SALIDA))
