"""
Prepara pistas.js con tus últimos likes de SoundCloud para el prototipo.

Los enlaces de streaming de SoundCloud vencen en unas horas: si el prototipo
deja de sonar, corre esto de nuevo:  python actualizar_pistas.py
Usa la cuenta y el código de Music Downloader (D:/Proyectos/music-downloader).
"""
import json
import os
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, "D:/Proyectos/music-downloader")
from gui.ui_controller import UIController  # noqa: E402
from webview_app.api import WebViewAPI  # noqa: E402

CANTIDAD = 10
PUNTOS_ONDA = 240


def onda(cli, track_id) -> list:
    """Forma de onda real de SoundCloud, reducida a PUNTOS_ONDA valores entre 0 y 1."""
    import requests
    try:
        url = cli.get_tracks_by_ids([track_id])[0]["waveform_url"].replace(".png", ".json")
        j = requests.get(url, timeout=15).json()
    except Exception:
        return []
    m, alto = j["samples"], j.get("height") or max(j["samples"]) or 1
    paso = len(m) / PUNTOS_ONDA
    return [round(max(m[int(i * paso):int((i + 1) * paso)] or [0]) / alto, 3) for i in range(PUNTOS_ONDA)]


api = object.__new__(WebViewAPI)
api.controller = UIController()
api._sync_manager, api._sc_client_cache = None, None   # sin abrir la ventana de la app
cli = api._sc_client()
db = sqlite3.connect(Path.home() / ".music_downloader" / "history.db")
pistas = []
for track_id, url, titulo, artista, caratula in db.execute(
        "SELECT id, url, title, artist, artwork_url FROM soundcloud_likes ORDER BY liked_at DESC LIMIT 40"):
    r = api.get_preview_url(url)
    if r.get("ok"):
        pistas.append({"titulo": titulo, "artista": artista, "url": r["url"], "hls": r["hls"],
                       "duracion": r.get("duracion") or 0, "onda": onda(cli, track_id) if cli else [],
                       "caratula": (caratula or "").replace("-large.", "-t500x500.")})
    if len(pistas) == CANTIDAD:
        break

# Un .js (y no .json) para que funcione también abriendo el HTML con doble clic.
destino = Path(__file__).with_name("pistas.js")
destino.write_text("window.PISTAS = " + json.dumps(pistas, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
print(f"{len(pistas)} pistas guardadas en {destino}")
