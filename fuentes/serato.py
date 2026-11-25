"""
Serato DJ (Lite o Pro): la última canción cargada en una bandeja.

Serato no le cuenta a Windows qué suena, pero en su registro (Música/_Serato_/Logs/*.log) deja una línea con la ruta del archivo cada
vez que se carga una canción en una bandeja ("The cache `D:/Musik/x.mp3` was requested"). De la última de esas líneas salen la ruta y,
con las etiquetas del archivo, título, artista y carátula. Es "la última canción cargada": no distingue qué bandeja está al aire.
Solo lee; nunca escribe nada en las carpetas de Serato.
"""
import base64
import logging
import re
import subprocess
import time
from pathlib import Path

logger = logging.getLogger(__name__)
_LINEA = re.compile(r"The cache `(.+?)` was requested")
_COLA = 600_000   # bytes del final del registro que se leen (el archivo puede pesar MB)
_MAX_CARATULA = 700_000
_cache = {"ruta": None, "datos": None, "desde": 0.0}
_corre = {"t": 0.0, "v": False}


def carpetas_logs() -> list[Path]:
    return [Path.home() / "Music" / "_Serato_" / "Logs"]


def corriendo() -> bool:
    """¿Está abierto Serato? (consulta la lista de procesos; se recuerda 4 s)"""
    if time.time() - _corre["t"] < 4:
        return _corre["v"]
    try:
        r = subprocess.run(["tasklist", "/FI", "IMAGENAME eq Serato*", "/NH"], capture_output=True, text=True, timeout=4, creationflags=0x08000000)
        _corre["v"] = "serato" in r.stdout.lower()
    except Exception:
        _corre["v"] = False
    _corre["t"] = time.time()
    return _corre["v"]


def ultima_ruta(carpetas: list[Path] | None = None) -> str | None:
    """La ruta de la última canción cargada, según el registro más reciente (o None)."""
    logs = [f for c in (carpetas if carpetas is not None else carpetas_logs()) if c.is_dir() for f in c.glob("*.log")]
    for f in sorted(logs, key=lambda x: x.stat().st_mtime, reverse=True)[:2]:   # si el más nuevo aún no tiene canciones, el anterior
        try:
            with open(f, "rb") as a:
                a.seek(0, 2)
                a.seek(max(0, a.tell() - _COLA))
                texto = a.read().decode("utf-8", "replace")
        except OSError:
            continue
        rutas = _LINEA.findall(texto)
        if rutas:
            return rutas[-1]
    return None


def _etiquetas(ruta: str) -> dict:
    """Título, artista, duración y carátula del archivo (mutagen). Si no se puede, el nombre del archivo."""
    p = Path(ruta)
    artista, titulo, dur, caratula = "", p.stem, 0.0, ""
    if " - " in p.stem:
        artista, titulo = (x.strip() for x in p.stem.split(" - ", 1))
    try:
        import mutagen
        f = mutagen.File(ruta)
        if f is not None:
            dur = float(getattr(f.info, "length", 0) or 0)
            e = mutagen.File(ruta, easy=True)
            if e is not None and e.tags:
                titulo = (e.tags.get("title") or [titulo])[0] or titulo
                artista = (e.tags.get("artist") or [artista])[0] or artista
            for k, v in (f.tags or {}).items():   # carátula incrustada (ID3 APIC)
                if str(k).startswith("APIC") and len(v.data) <= _MAX_CARATULA:
                    caratula = f"data:{v.mime or 'image/jpeg'};base64," + base64.b64encode(v.data).decode()
                    break
            if not caratula and hasattr(f, "pictures") and f.pictures and len(f.pictures[0].data) <= _MAX_CARATULA:   # FLAC
                caratula = f"data:{f.pictures[0].mime};base64," + base64.b64encode(f.pictures[0].data).decode()
    except Exception:
        logger.debug("Sin etiquetas legibles en %s", ruta, exc_info=True)
    return {"titulo": titulo, "artista": artista, "duracion": dur, "caratula": caratula}


def estado(carpetas: list[Path] | None = None) -> dict | None:
    """Lo mismo que pc.estado(), con la última canción cargada en Serato; None si no hay ninguna."""
    ruta = ultima_ruta(carpetas)
    if not ruta:
        return None
    if _cache["ruta"] != ruta:
        _cache.update(ruta=ruta, datos=_etiquetas(ruta), desde=time.time())
    d = _cache["datos"]
    pos = time.time() - _cache["desde"]   # desde que la app vio esta canción: aproximado
    return {"hay": True, "app": "Serato", "titulo": d["titulo"], "artista": d["artista"], "caratula": d["caratula"], "sonando": True,
            "posicion": min(pos, d["duracion"]) if d["duracion"] else 0, "duracion": d["duracion"]}
