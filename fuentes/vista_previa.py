"""
Modo vista previa (solo para generar las imágenes de la Biblioteca): las carátulas salen
pixeladas, para que las capturas no lleven portadas ajenas. Se activa con la variable de
entorno VISUALIZADOR_VISTA_PREVIA=1 (ver tools/capturar_previas.py).
"""
import base64
import io
import os
from concurrent.futures import ThreadPoolExecutor

import requests

ACTIVO = os.environ.get("VISUALIZADOR_VISTA_PREVIA") == "1"
CELDAS, TAM, MAXIMO = 14, 300, 30   # 14×14 "píxeles" mostrados a 300 px; solo los primeros temas (lo que se ve)


def _pixelar(url: str) -> str:
    from PIL import Image
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        img = Image.open(io.BytesIO(r.content)).convert("RGB").resize((CELDAS, CELDAS), Image.BOX).resize((TAM, TAM), Image.NEAREST)
    except Exception:
        img = Image.new("RGB", (TAM, TAM), (40, 40, 48))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=85)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def preparar(pistas: list[dict]) -> list[dict]:
    """Los primeros temas con la carátula pixelada. No toca la lista original."""
    if not ACTIVO:
        return pistas
    corte = [dict(p) for p in pistas[:MAXIMO]]
    with ThreadPoolExecutor(8) as pool:
        for p, dato in zip(corte, pool.map(lambda p: _pixelar(p["caratula"]) if p.get("caratula") else "", corte)):
            p["caratula"] = dato
    return corte
