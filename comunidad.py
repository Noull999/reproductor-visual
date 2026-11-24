"""
Comunidad: lee el catálogo público de plantillas (github.com/Noull999/reproductor-comunidad) y baja las que
la persona elige. Solo habla con ese repositorio, por HTTPS y sin seguir redirecciones; el catálogo no trae
rutas ni direcciones (las URL se arman aquí a partir de un id validado) y lo que se baja pasa por los mismos
revisores que "Importar plantilla…" (plantillas.py y ajustes.py).
"""
import re

import requests

REPO = "Noull999/reproductor-comunidad"
BASE = f"https://raw.githubusercontent.com/{REPO}/main"
GUIA = f"https://github.com/{REPO}/blob/main/CONTRIBUIR.md"
MAX_CATALOGO = 512 * 1024
MAX_PLANTILLA = 10 * 1024 * 1024
MAX_ENTRADAS = 500
TIEMPO = 15
_ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_BASE = re.compile(r"^[A-Za-z0-9]{0,24}$")
_FECHA = re.compile(r"^(\d{4}-\d{2}-\d{2})?$")
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


def limpiar_catalogo(crudo) -> list:
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
        salida.append({"id": e["id"], "nombre": nombre, "autor": autor, "descripcion": _texto(e.get("descripcion"), 200), "tipo": tipo, "base": base, "fecha": fecha})
    return salida


def catalogo() -> list:
    import json
    try:
        return limpiar_catalogo(json.loads(_pedir(f"{BASE}/catalogo.json", MAX_CATALOGO).decode("utf-8")))
    except (ValueError, UnicodeDecodeError) as e:
        raise ErrorComunidad("El catálogo de la comunidad no se pudo leer.") from e


def descargar(id_: str) -> bytes:
    """El archivo .plantilla de una entrada. Sin validar todavía: eso lo hace quien lo importa."""
    if not isinstance(id_, str) or not _ID.match(id_) or len(id_) > 40:
        raise ErrorComunidad("Esa plantilla no es válida.")
    return _pedir(f"{BASE}/plantillas/{id_}.plantilla", MAX_PLANTILLA)
