"""Skins clásicos de Winamp 2 (.wsz) que importa la persona: desde un link del museo (skins.webamp.org) o desde un
archivo. Quedan SOLO en este equipo (~/.visualizador/skins/<id>/): son arte de sus autores y no se reparten con la app.

Un .wsz es un zip con BMPs (las piezas de la ventana) y unos .txt (colores). Aquí solo se leen las piezas conocidas,
cada BMP se abre y se vuelve a guardar como PNG (así no pasa nada raro del archivo original) y los textos se reducen
a datos simples (colores y polígonos). Nada del zip se ejecuta ni se guarda tal cual.
"""
import hashlib
import io
import json
import re
import shutil
import urllib.request
import zipfile
from pathlib import Path
from urllib.parse import unquote

CARPETA = Path.home() / ".visualizador" / "skins"
MAX_ZIP = 8 * 1024 * 1024
MAX_PIEZA = 4 * 1024 * 1024
PIEZAS = {"main", "titlebar", "cbuttons", "numbers", "nums_ex", "text", "playpaus", "posbar", "volume", "balance",
          "monoster", "shufrep", "eqmain", "pledit", "gen"}   # gen: el marco de ventana genérica (donde Winamp mostraba MilkDrop)
URL_MUSEO = re.compile(r"^https://skins\.webamp\.org/skin/([0-9a-f]{32})/([^/?#]+?)(?:\.wsz)?/?$", re.I)
ID = re.compile(r"^[0-9a-f]{16}$")
HEX = re.compile(r"^#?([0-9a-f]{6})$", re.I)


class SkinInvalido(Exception):
    pass


def _colores_pledit(texto):
    """pledit.txt → {"Normal": "#rrggbb", …, "Font": "Arial"}; solo claves conocidas y colores válidos."""
    salida = {}
    for linea in texto.splitlines():
        if "=" not in linea:
            continue
        k, v = (x.strip().strip('"') for x in linea.split("=", 1))
        k = k.lower()
        if k in ("normal", "current", "normalbg", "selectedbg") and HEX.match(v):
            salida[k] = "#" + HEX.match(v).group(1).lower()
        elif k == "font" and re.fullmatch(r"[\w .\-]{1,40}", v):
            salida["font"] = v
    return salida


def _colores_vis(texto):
    """viscolor.txt → 24 colores [r, g, b] (los que falten quedan con los de Winamp)."""
    colores = []
    for linea in texto.splitlines():
        m = re.match(r"\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})", linea)
        if m:
            colores.append([min(255, int(x)) for x in m.groups()])
    return colores[:24]


def _region(texto):
    """region.txt (sección [Normal]) → lista de polígonos [[x, y], …] de la ventana principal."""
    m = re.search(r"\[normal\](.*?)(?:\n\s*\[|\Z)", texto, re.I | re.S)
    if not m:
        return []
    cuerpo = m.group(1)
    cuantos = re.search(r"numpoints\s*=\s*([\d ,]+)", cuerpo, re.I)
    puntos = re.search(r"pointlist\s*=\s*([\d ,\s]+)", cuerpo, re.I)
    if not cuantos or not puntos:
        return []
    n = [int(x) for x in re.findall(r"\d+", cuantos.group(1))]
    xy = [int(x) for x in re.findall(r"\d+", puntos.group(1))]
    polis, i = [], 0
    for k in n[:50]:
        p = [[min(275, xy[j]), min(116, xy[j + 1])] for j in range(i, i + 2 * k, 2) if j + 1 < len(xy)]
        i += 2 * k
        if len(p) >= 3:
            polis.append(p)
    return polis


def importar(datos: bytes, nombre: str) -> dict:
    """Valida el .wsz y guarda sus piezas como PNG en una carpeta propia. Devuelve los datos del skin."""
    from PIL import Image
    if len(datos) > MAX_ZIP:
        raise SkinInvalido("El skin es demasiado grande.")
    try:
        z = zipfile.ZipFile(io.BytesIO(datos))
    except zipfile.BadZipFile:
        raise SkinInvalido("No es un skin de Winamp (.wsz).")
    # nombre sin carpetas y en minúsculas: los skins vienen escritos de cualquier forma
    archivos = {}
    for i in z.infolist():
        base = i.filename.replace("\\", "/").split("/")[-1].lower()
        if not i.is_dir() and base:
            archivos.setdefault(base, i)
    if "main.bmp" not in archivos:
        raise SkinInvalido("Ese archivo no trae la ventana de Winamp (main.bmp). Solo sirven los skins clásicos .wsz.")
    sid = hashlib.sha1(datos).hexdigest()[:16]
    destino = CARPETA / sid
    temporal = CARPETA / (sid + ".tmp")
    shutil.rmtree(temporal, ignore_errors=True)
    temporal.mkdir(parents=True)
    try:
        piezas = []
        for pieza in PIEZAS:
            info = archivos.get(pieza + ".bmp")
            if not info:
                continue
            if info.file_size > MAX_PIEZA:
                raise SkinInvalido(f"La pieza {pieza} es demasiado grande.")
            img = Image.open(io.BytesIO(z.read(info)))
            if img.width > 1024 or img.height > 1024:
                raise SkinInvalido(f"La pieza {pieza} tiene un tamaño raro.")
            img.convert("RGB").save(temporal / f"{pieza}.png", "PNG")
            piezas.append(pieza)
        texto = lambda n: z.read(archivos[n])[:20000].decode("latin-1") if n in archivos and archivos[n].file_size < 200000 else ""
        meta = {"id": sid, "nombre": nombre[:60] or "Skin", "piezas": sorted(piezas),
                "pledit": _colores_pledit(texto("pledit.txt")), "vis": _colores_vis(texto("viscolor.txt")),
                "region": _region(texto("region.txt"))}
        (temporal / "skin.json").write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
        shutil.rmtree(destino, ignore_errors=True)
        temporal.rename(destino)
        return meta
    except SkinInvalido:
        raise
    except Exception as e:
        raise SkinInvalido(f"No se pudo leer el skin: {str(e)[:100]}")
    finally:
        shutil.rmtree(temporal, ignore_errors=True)


def desde_url(url: str) -> dict:
    """Importa desde un link del Winamp Skin Museum (https://skins.webamp.org/skin/<id>/<nombre>.wsz)."""
    m = URL_MUSEO.match((url or "").strip())
    if not m:
        raise SkinInvalido("Pega un link de skins.webamp.org/skin/…")
    pedido = urllib.request.Request(f"https://r2.webampskins.org/skins/{m.group(1).lower()}.wsz", headers={"User-Agent": "Reproductor"})
    with urllib.request.urlopen(pedido, timeout=30) as r:
        datos = r.read(MAX_ZIP + 1)
    nombre = re.sub(r"\s+", " ", unquote(m.group(2)).replace("_", " ")).strip()
    return importar(datos, nombre)


def listar() -> list:
    salida = []
    for f in sorted(CARPETA.glob("*/skin.json"), key=lambda p: p.stat().st_mtime):
        try:
            salida.append(json.loads(f.read_text(encoding="utf-8")))
        except (OSError, ValueError):
            pass
    return salida


def borrar(sid: str) -> None:
    if ID.match(sid or ""):
        shutil.rmtree(CARPETA / sid, ignore_errors=True)
