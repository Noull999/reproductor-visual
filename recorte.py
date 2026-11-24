"""
Quitar el fondo de una imagen con IA, en este PC (nada se sube a internet). Usa rembg (MIT) con el modelo isnet-general-use.
Es opcional porque pesa: rembg y sus dependencias ~480 MB, y el modelo ~180 MB que se baja la primera vez a ~/.rembg.
    pip install -r requirements-recorte.txt
"""
import importlib.util
import io

MAX_LADO = 1600
_sesion = None


class RecorteNoDisponible(Exception):
    pass


def disponible() -> bool:
    return importlib.util.find_spec("rembg") is not None


def quitar_fondo(datos: bytes) -> bytes:
    """Imagen (bytes) → WebP con el fondo transparente y recortado a lo que quedó."""
    global _sesion
    if not disponible():
        raise RecorteNoDisponible("Para quitar fondos falta el complemento de recorte (unos 650 MB con su modelo). "
                                  "Se instala con: pip install -r requirements-recorte.txt")
    from PIL import Image
    from rembg import new_session, remove
    if _sesion is None:
        _sesion = new_session("isnet-general-use")
    im = Image.open(io.BytesIO(datos)).convert("RGBA")
    im.thumbnail((MAX_LADO, MAX_LADO))
    out = remove(im, session=_sesion, post_process_mask=True)
    caja = out.getbbox()
    if caja:
        out = out.crop(caja)
    b = io.BytesIO()
    out.save(b, "WEBP", quality=90)
    return b.getvalue()
