"""
Configuración en ~/.visualizador/config.json.

La primera vez, si existe Music Downloader en el equipo, importa de ahí la
cuenta de SoundCloud y las carpetas de música, para no pedir nada de nuevo.
"""
import json
from pathlib import Path

CARPETA = Path.home() / ".visualizador"
ARCHIVO = CARPETA / "config.json"
MUSIC_DOWNLOADER = Path.home() / ".music_downloader" / "config.json"


def _importar_de_music_downloader() -> dict:
    try:
        md = json.loads(MUSIC_DOWNLOADER.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    sc = md.get("soundcloud") or {}
    carpetas = md.get("library_folders") or ([md["dest_folder"]] if md.get("dest_folder") else [])
    return {"soundcloud": {"oauth_token": sc.get("oauth_token", ""), "client_id": sc.get("client_id", "")},
            "carpetas": carpetas}


def leer() -> dict:
    try:
        return json.loads(ARCHIVO.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        cfg = _importar_de_music_downloader()
        if cfg:
            guardar(cfg)
        return cfg


def guardar(cfg: dict) -> None:
    CARPETA.mkdir(parents=True, exist_ok=True)
    ARCHIVO.write_text(json.dumps(cfg, ensure_ascii=False, indent=1), encoding="utf-8")
