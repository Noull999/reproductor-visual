"""
Comunidad: lee el catálogo público de plantillas y baja las que la persona elige. Hay dos fuentes fijas: el repositorio
(github.com/Noull999/reproductor-comunidad) y la web de la comunidad (las que se envían directo y ya fueron aprobadas).
Solo habla con esas dos direcciones, por HTTPS y sin seguir redirecciones; el catálogo no trae rutas ni direcciones (las URL
se arman aquí a partir de un id validado) y lo que se baja pasa por los mismos revisores que "Importar plantilla…"
(plantillas.py y ajustes.py).
"""
import re

import requests

REPO = "Noull999/reproductor-comunidad"
BASE = f"https://raw.githubusercontent.com/{REPO}/main"
WEB = "https://reproductor-comunidad.vercel.app"
GUIA = f"https://github.com/{REPO}/blob/main/CONTRIBUIR.md"
ENVIAR = f"{WEB}/enviar.html"
FUENTES = ("repo", "web")
MAX_PREVIA = 600 * 1024
MAX_CATALOGO = 512 * 1024
MAX_PLANTILLA = 10 * 1024 * 1024
MAX_ENTRADAS = 500
TIEMPO = 15
_ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_BASE = re.compile(r"^[A-Za-z0-9]{0,24}$")
_FECHA = re.compile(r"^(\d{4}-\d{2}-\d{2})?$")
_LOGIN = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$")
ORIGENES = ("propio", "ia", "libre")
TIPOS = ("plantilla", "ajustes")


class ErrorComunidad(Exception):
    pass


def _pedir(url: str, maximo: int) -> bytes:
    """GET con tiempo límite y tope de tamaño: se corta apenas se pasa."""
    try:
        with requests.get(url, timeout=TIEMPO, stream=True, allow_redirects=False) as r:
            if r.status_code != 200:
                raise ErrorComunidad("La comunidad no respondió (¿sin conexión?).")
            datos = b""
            for bloque in r.iter_content(64 * 1024):
                datos += bloque
                if len(datos) > maximo:
                    raise ErrorComunidad("El archivo es demasiado grande.")
            return datos
    except requests.RequestException as e:
        raise ErrorComunidad("No se pudo conectar con la comunidad.") from e


def _texto(v, maximo):
    if not isinstance(v, str):
        return ""
    return "".join(c for c in v if c.isprintable())[:maximo].strip()


def limpiar_catalogo(crudo, fuente="repo") -> list:
    """Deja solo entradas bien formadas, con los campos y largos permitidos; lo raro se descarta."""
    if not isinstance(crudo, dict) or crudo.get("version") != 1 or not isinstance(crudo.get("plantillas"), list):
        raise ErrorComunidad("El catálogo de la comunidad no tiene el formato esperado.")
    salida, vistos = [], set()
    for e in crudo["plantillas"][:MAX_ENTRADAS]:
        if not isinstance(e, dict) or not isinstance(e.get("id"), str) or not _ID.match(e["id"]) or len(e["id"]) > 40 or e["id"] in vistos:
            continue
        nombre, autor = _texto(e.get("nombre"), 40), _texto(e.get("autor"), 30)
        tipo, base, fecha = e.get("tipo"), e.get("base", ""), e.get("fecha", "")
        if not nombre or not autor or tipo not in TIPOS or not isinstance(base, str) or not _BASE.match(base) or not isinstance(fecha, str) or not _FECHA.match(fecha):
            continue
        vistos.add(e["id"])
        gh = e.get("github")
        im = e.get("imagenes")
        im = {"origen": im["origen"], "detalle": _texto(im.get("detalle"), 120)} if isinstance(im, dict) and im.get("origen") in ORIGENES else None
        salida.append({"id": e["id"], "fuente": fuente, "previa": url_previa(e["id"], fuente), "nombre": nombre, "autor": autor, "descripcion": _texto(e.get("descripcion"), 200), "tipo": tipo, "base": base, "fecha": fecha,
                       "github": gh if isinstance(gh, str) and _LOGIN.match(gh) else "", "imagenes": im})
    return salida


def url_plantilla(id_: str, fuente: str) -> str:
    return f"{BASE}/plantillas/{id_}.plantilla" if fuente == "repo" else f"{WEB}/api/archivo?tipo=plantilla&id={id_}"


def url_previa(id_: str, fuente: str) -> str:
    return f"{BASE}/previas/{id_}.webp" if fuente == "repo" else f"{WEB}/api/archivo?tipo=previa&id={id_}"


def _leer(fuente: str) -> list:
    import json
    url = f"{BASE}/catalogo.json" if fuente == "repo" else f"{WEB}/api/catalogo"
    try:
        return limpiar_catalogo(json.loads(_pedir(url, MAX_CATALOGO).decode("utf-8")), fuente)
    except (ValueError, UnicodeDecodeError) as e:
        raise ErrorComunidad("El catálogo de la comunidad no se pudo leer.") from e


def catalogo() -> list:
    """Las plantillas del repositorio y las de la web, juntas. Si una fuente falla, se muestra la otra; si fallan las dos, el error."""
    listas, error = [], None
    for fuente in FUENTES:
        try:
            listas.append(_leer(fuente))
        except ErrorComunidad as e:
            error = error or e
    if not listas:
        raise error
    salida, vistos = [], set()
    for e in (x for lista in listas for x in lista):
        if e["id"] not in vistos:   # si un id se repitiera, gana el del repositorio
            vistos.add(e["id"])
            salida.append(e)
    return salida


def descargar(id_: str, fuente: str = "repo") -> bytes:
    """El archivo .plantilla de una entrada. Sin validar todavía: eso lo hace quien lo importa."""
    if not isinstance(id_, str) or not _ID.match(id_) or len(id_) > 40 or fuente not in FUENTES:
        raise ErrorComunidad("Esa plantilla no es válida.")
    return _pedir(url_plantilla(id_, fuente), MAX_PLANTILLA)


def previa_webp(imagen: bytes) -> bytes:
    """La captura de la vista previa lista para enviar: WebP de 1280×720 (recortada al centro si no es 16:9) y de menos de 600 KB."""
    import io

    from PIL import Image, UnidentifiedImageError
    if not imagen or len(imagen) > 20 * 1024 * 1024:
        raise ErrorComunidad("La captura no es válida.")
    try:
        with Image.open(io.BytesIO(imagen)) as im:
            im = im.convert("RGB")
            esc = max(1280 / im.width, 720 / im.height)
            im = im.resize((max(1280, round(im.width * esc)), max(720, round(im.height * esc))), Image.LANCZOS)
            izq, arr = (im.width - 1280) // 2, (im.height - 720) // 2
            im = im.crop((izq, arr, izq + 1280, arr + 720))
    except (UnidentifiedImageError, OSError) as e:
        raise ErrorComunidad("La captura no es una imagen válida.") from e
    for calidad in range(90, 20, -10):
        b = io.BytesIO()
        im.save(b, "WEBP", quality=calidad)
        if b.tell() <= MAX_PREVIA:
            return b.getvalue()
    raise ErrorComunidad("La captura pesa demasiado incluso comprimida.")
