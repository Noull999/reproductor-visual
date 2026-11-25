"""
Convierte una imagen en un sprite ASCII para los eventos de la plantilla ASCII (web/criaturas/<nombre>.json).

    python tools/imagen_a_sprite.py imagen.png web/criaturas/oni.json --filas 64 \
        --limpiar "0,18,362,70;596,594,664,660" --ojos "0.375,0.525;0.63,0.525" --boca "0.5,0.81" --corte 0.81

- modo "tinta" (por defecto): líneas oscuras sobre fondo claro → las líneas se vuelven caracteres brillantes. modo "luz": claro sobre oscuro.
- --limpiar: rectángulos en píxeles (x0,y0,x1,y1; separados por ;) que se rellenan con el color de fondo (carteles, botones, marcas de agua).
- --ojos y --boca: posiciones en fracciones del ancho y el alto de la imagen. --corte: fracción de alto donde se articula la mandíbula.
- Lo de dentro de la silueta, aunque no tenga tinta, queda con una sombra tenue para que la criatura tenga cuerpo.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as nd

ASPECTO_CELDA = 2.1   # alto / ancho de una celda de carácter (la letra de terminal es más alta que ancha)
RAMPA = " .:-=+*#%@"


def convertir(ruta, filas=64, modo="tinta", limpiar="", ojos="", boca="0.5,0.8", corte=0.8, suelo=0.0, margen=6, grosor=3.2):
    im = Image.open(ruta).convert("RGB")
    W, H = im.size
    a = np.asarray(im).astype(float) / 255
    lum = a @ np.array([.299, .587, .114])
    fondo = float(np.median(lum[H // 3:2 * H // 3, :max(10, W // 30)])) if modo == "tinta" else float(np.median(lum[:max(10, H // 30), :]))
    for rect in [r for r in limpiar.split(";") if r.strip()]:
        x0, y0, x1, y1 = (int(float(v)) for v in rect.split(","))
        lum[max(0, y0):y1, max(0, x0):x1] = fondo
    lum[:margen, :] = lum[-margen:, :] = fondo; lum[:, :margen] = lum[:, -margen:] = fondo   # el marco de la captura
    tinta = np.clip((fondo - lum) / max(.05, fondo), 0, 1) if modo == "tinta" else np.clip((lum - fondo) / max(.05, 1 - fondo), 0, 1)
    tinta[tinta < .1] = 0   # marcas de agua y ruido muy tenues
    # lo sólido queda vacío y solo brilla su contorno (como un neón): se conserva la tinta a menos de `grosor` px del borde de la mancha
    borde_tinta = nd.distance_transform_edt(tinta > .5) <= grosor
    tinta = np.where(tinta > .5, np.where(borde_tinta, tinta, 0), tinta)
    # silueta: todo lo que no es fondo conectado con el borde
    fuera, _ = nd.label(tinta < .06)
    borde = set(np.unique(np.concatenate([fuera[0], fuera[-1], fuera[:, 0], fuera[:, -1]]))) - {0}
    dentro = ~np.isin(fuera, list(borde))
    dentro = nd.binary_closing(dentro, iterations=3)
    v = np.maximum(tinta, dentro * suelo)
    cols = int(round(filas * ASPECTO_CELDA * W / H))
    reducida = np.asarray(Image.fromarray((v * 255).astype(np.uint8)).resize((cols, filas), Image.BOX)).astype(float) / 255
    reducida = np.clip(reducida * 2.2, 0, 1) ** .85   # las líneas finas se promedian con el fondo: se refuerzan
    niveles = np.round(reducida * 9).astype(int)
    pos = lambda s: [[round(float(p.split(",")[0]) * cols, 1), round(float(p.split(",")[1]) * filas, 1)] for p in s.split(";") if p.strip()]
    return {"nombre": Path(ruta).stem, "cols": cols, "filas": filas, "v": ["".join(str(n) for n in fila) for fila in niveles],
            "ojos": pos(ojos), "boca": pos(boca)[0], "corte": round(float(corte) * filas, 1)}


def vista_previa(sprite, salida, px=11):
    try:
        f = ImageFont.truetype(r"C:\Windows\Fonts\consola.ttf", px)
    except OSError:
        f = ImageFont.load_default()
    cw = f.getlength("M"); ch = px * 1.0
    img = Image.new("RGB", (int(sprite["cols"] * cw) + 20, int(sprite["filas"] * ch) + 20), (2, 5, 3)); d = ImageDraw.Draw(img)
    for r, fila in enumerate(sprite["v"]):
        for c, n in enumerate(fila):
            if n != "0":
                k = int(n); d.text((10 + c * cw, 10 + r * ch), RAMPA[k], font=f, fill=(int(61 * (.3 + .07 * k)), int(255 * (.3 + .07 * k)), int(122 * (.3 + .07 * k))))
    for o in sprite["ojos"]:
        d.ellipse([10 + o[0] * cw - 5, 10 + o[1] * ch - 5, 10 + o[0] * cw + 5, 10 + o[1] * ch + 5], outline=(255, 60, 60))
    d.ellipse([10 + sprite["boca"][0] * cw - 6, 10 + sprite["boca"][1] * ch - 6, 10 + sprite["boca"][0] * cw + 6, 10 + sprite["boca"][1] * ch + 6], outline=(255, 220, 0))
    d.line([(10, 10 + sprite["corte"] * ch), (img.width - 10, 10 + sprite["corte"] * ch)], fill=(255, 220, 0))
    img.save(salida)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("imagen"); ap.add_argument("salida"); ap.add_argument("--filas", type=int, default=64); ap.add_argument("--modo", default="tinta", choices=["tinta", "luz"])
    ap.add_argument("--limpiar", default=""); ap.add_argument("--ojos", default=""); ap.add_argument("--boca", default="0.5,0.8"); ap.add_argument("--corte", default="0.8")
    ap.add_argument("--grosor", type=float, default=3.2, help="px de contorno que se conservan en las zonas negras sólidas"); ap.add_argument("--vista", default="", help="guarda una imagen de cómo queda (con ojos, boca y corte marcados)")
    a = ap.parse_args()
    s = convertir(a.imagen, a.filas, a.modo, a.limpiar, a.ojos, a.boca, a.corte, grosor=a.grosor)
    Path(a.salida).parent.mkdir(parents=True, exist_ok=True)
    Path(a.salida).write_text(json.dumps(s, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    if a.vista:
        vista_previa(s, a.vista)
    print(f"{a.salida}: {s['cols']}x{s['filas']} celdas, {Path(a.salida).stat().st_size // 1024} KB")
