"""Mi música: los archivos de tus carpetas, con título, artista y duración de sus tags."""
import os
from pathlib import Path
from urllib.parse import quote

from servidor import AUDIO


def listas(carpetas: list[str]) -> list[dict]:
    """Cada subcarpeta (de primer nivel) con canciones es una lista."""
    salida = []
    for raiz in carpetas:
        if not os.path.isdir(raiz):
            continue
        for d in sorted(Path(raiz).iterdir()):
            if d.is_dir() and not d.name.startswith("."):
                n = sum(1 for r, _, fs in os.walk(d) for f in fs if Path(f).suffix.lower() in AUDIO)
                if n:
                    salida.append({"nombre": d.name, "ruta": str(d), "canciones": n})
    return salida


def canciones(carpeta: str, maximo: int = 400) -> list[dict]:
    from mutagen import File
    salida = []
    for r, _, fs in os.walk(carpeta):
        for f in sorted(fs):
            p = Path(r) / f
            if p.suffix.lower() not in AUDIO or f.startswith("._"):
                continue
            titulo, artista, dur = p.stem, "", 0
            try:
                a = File(p, easy=True)
                if a is not None:
                    titulo = (a.get("title") or [p.stem])[0]
                    artista = (a.get("artist") or [""])[0]
                    dur = a.info.length if a.info else 0
            except Exception:
                pass
            ruta = quote(str(p))
            salida.append({"url": f"/musica?r={ruta}", "hls": False, "caratula": f"/caratula?r={ruta}",
                           "titulo": titulo, "artista": artista, "duracion": dur})
            if len(salida) >= maximo:
                return salida
    return salida
