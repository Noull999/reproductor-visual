"""
Compartir los ajustes de una plantilla incluida (variante, color propio, intensidad, velocidad, controles
extra, fondo propio y cuerpo propio de Headspace) en un .plantilla. Es otro formato que el de las plantillas
hechas en el Editor: aquí no hay piezas, solo datos que la misma plantilla de la otra persona aplica.
Todo lo que entra se valida campo por campo y nunca ejecuta nada.
"""
import io
import json
import re
import time
import zipfile
from pathlib import Path

from plantillas import MAX_ENTRADAS, MAX_IMAGEN, MAX_ZIP, PlantillaInvalida

FORMATO = "reproductor-ajustes"
VERSION = 1
# Qué claves de variante guarda cada plantilla (las mismas que lee al abrirse)
AJUSTABLES = {
    "liquido": ["tema-liquido"], "headspace": ["cuerpo-headspace", "color-headspace"], "dosmil": ["skin-2000s"], "ambiente": ["tema-ambiente"],
    "pixel": ["paleta-pixel"], "neoy2k": ["tema-neoy2k"], "psicodelico": ["color-psicodelico"], "dreamcore": ["escena-dreamcore"], "anime": [], "aero": ["color-aero"], "cromo": ["color-cromo"],
}
_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
_NOMBRE = re.compile(r"^[\w ·.-]{1,32}$")
_ID_EXTRA = re.compile(r"^[A-Za-z0-9]{1,24}$")
_URL_IMAGEN = re.compile(r"^/imagen\?n=([A-Za-z0-9]+)-(fondo|cuerpo)\.webp(?:&v=\d+)?$")
RANURAS = ("fondo", "cuerpo")


def _num(v, minimo, maximo, nombre):
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        raise PlantillaInvalida(f"{nombre} no es un número.")
    return round(max(minimo, min(maximo, float(v))), 2)


def _caja(v, nombre):
    if not (isinstance(v, list) and len(v) == 4):
        raise PlantillaInvalida(f"La zona «{nombre}» no es válida.")
    return [_num(x, 0, 100, nombre) for x in v]


def _zonas(z):
    if not isinstance(z, dict):
        raise PlantillaInvalida("Las zonas del cuerpo no son válidas.")
    limpio = {k: _caja(z.get(k), k) for k in ("pantalla", "botones", "barra", "boca")}
    for k in ("ojos", "parlantes"):
        lista = z.get(k)
        if not (isinstance(lista, list) and len(lista) == 2):
            raise PlantillaInvalida(f"La zona «{k}» no es válida.")
        limpio[k] = [_caja(c, k) for c in lista]
    return limpio


def validar(d) -> dict:
    """Devuelve los ajustes limpios; las imágenes quedan marcadas con True (van dentro del archivo)."""
    if not isinstance(d, dict) or d.get("plantilla") not in AJUSTABLES:
        raise PlantillaInvalida("Esos ajustes son de una plantilla que esta versión no conoce.")
    id_ = d["plantilla"]
    variante = d.get("variante", {})
    if not isinstance(variante, dict) or not set(variante) <= set(AJUSTABLES[id_]):
        raise PlantillaInvalida("La variante no corresponde a esa plantilla.")
    for k, val in variante.items():
        if not isinstance(val, str) or not (_HEX if k in ("color-psicodelico", "color-aero", "color-cromo") else _NOMBRE).match(val):
            raise PlantillaInvalida("La variante no es válida.")
    p = d.get("props", {})
    if not isinstance(p, dict):
        raise PlantillaInvalida("Los ajustes no son válidos.")
    color = p.get("colorLibre", "")
    if color != "" and not (isinstance(color, str) and _HEX.match(color)):
        raise PlantillaInvalida("El color propio no es válido.")
    extra = p.get("extra", {})
    if not isinstance(extra, dict) or len(extra) > 10 or not all(_ID_EXTRA.match(k) for k in extra):
        raise PlantillaInvalida("Los controles extra no son válidos.")
    props = {"intensidad": _num(p.get("intensidad", 50), 0, 100, "La intensidad"), "velocidad": _num(p.get("velocidad", 50), 0, 100, "La velocidad"),
             "lista": bool(p.get("lista", True)), "soloVisual": bool(p.get("soloVisual", True)), "colorLibre": color,
             "extra": {k: _num(v, -1000, 1000, k) for k, v in extra.items()}}
    props["fondo"] = bool(p.get("fondo"))
    cuerpo = p.get("cuerpo")
    if cuerpo:
        if id_ != "headspace" or not isinstance(cuerpo, dict):
            raise PlantillaInvalida("Esa plantilla no admite un cuerpo propio.")
        props["cuerpo"] = {"zonas": _zonas(cuerpo.get("zonas"))}
    return {"plantilla": id_, "variante": variante, "props": props}


def empaquetar(datos_json: str, carpeta_imagenes: Path) -> bytes:
    """datos: {plantilla, variante, props}; props.fondo y props.cuerpo.imagen son las URL locales de la imagen propia."""
    try:
        datos = json.loads(datos_json)
        crudo = datos.get("props", {}) if isinstance(datos, dict) else {}
        limpios = validar({**datos, "props": {**crudo, "fondo": bool(crudo.get("fondo")), "cuerpo": crudo.get("cuerpo") and {"zonas": (crudo["cuerpo"] or {}).get("zonas")}}})
    except json.JSONDecodeError as e:
        raise PlantillaInvalida("Los ajustes no se pudieron leer.") from e
    id_ = limpios["plantilla"]
    urls = {"fondo": crudo.get("fondo") or "", "cuerpo": (crudo.get("cuerpo") or {}).get("imagen") or ""}
    memoria = io.BytesIO()
    with zipfile.ZipFile(memoria, "w", zipfile.ZIP_DEFLATED) as z:
        for ranura in RANURAS:
            if not urls[ranura]:
                continue
            m = _URL_IMAGEN.match(urls[ranura])
            if not m or m.group(1) != id_ or m.group(2) != ranura:   # los videos de fondo no se comparten: solo imágenes
                if ranura == "fondo":
                    limpios["props"]["fondo"] = False
                    continue
                raise PlantillaInvalida("El cuerpo propio no se puede compartir.")
            archivo = carpeta_imagenes / f"{id_}-{ranura}.webp"
            if not archivo.is_file():
                raise PlantillaInvalida(f"Falta la imagen de «{ranura}» en este equipo.")
            z.writestr(f"imagenes/{ranura}.webp", archivo.read_bytes())
        z.writestr("manifest.json", json.dumps({"formato": FORMATO, "version": VERSION, **limpios}, ensure_ascii=False, indent=1))
    return memoria.getvalue()


def es_de_ajustes(datos: bytes) -> bool:
    """¿Es un archivo de ajustes (y no una plantilla del Editor)? Solo mira el nombre del formato."""
    try:
        with zipfile.ZipFile(io.BytesIO(datos)) as z:
            return json.loads(z.read("manifest.json")[:65536].decode("utf-8")).get("formato") == FORMATO
    except Exception:
        return False


def desempaquetar(datos: bytes, carpeta_imagenes: Path) -> dict:
    """Valida un archivo de ajustes ajeno, guarda sus imágenes (re-codificadas) y devuelve {plantilla, variante, props} listo para aplicar."""
    from PIL import Image
    try:
        z = zipfile.ZipFile(io.BytesIO(datos))
    except zipfile.BadZipFile as e:
        raise PlantillaInvalida("Ese archivo no es de este reproductor.") from e
    with z:
        entradas = z.infolist()
        if len(entradas) > MAX_ENTRADAS or sum(i.file_size for i in entradas) > MAX_ZIP:
            raise PlantillaInvalida("El archivo es demasiado grande.")
        for i in entradas:
            if i.filename != "manifest.json" and not re.fullmatch(r"imagenes/(fondo|cuerpo)\.webp", i.filename):
                raise PlantillaInvalida("El archivo trae contenido que no corresponde a unos ajustes.")
        try:
            manifest = json.loads(z.read("manifest.json").decode("utf-8"))
        except (KeyError, ValueError, UnicodeDecodeError) as e:
            raise PlantillaInvalida("Falta la configuración.") from e
        if not isinstance(manifest, dict) or manifest.get("formato") != FORMATO:
            raise PlantillaInvalida("Ese archivo no son ajustes de este reproductor.")
        if manifest.get("version") != VERSION:
            raise PlantillaInvalida("Esos ajustes son de otra versión de la app.")
        ajustes = validar(manifest)
        id_, props = ajustes["plantilla"], ajustes["props"]
        ts = int(time.time())
        pedidas = [r for r, quiere in (("fondo", props["fondo"]), ("cuerpo", "cuerpo" in props)) if quiere]
        listas = {}
        for ranura in pedidas:
            nombre = f"imagenes/{ranura}.webp"
            if nombre not in z.namelist():
                raise PlantillaInvalida(f"Falta la imagen de «{ranura}».")
            crudo = z.open(nombre).read(MAX_IMAGEN + 1)
            if len(crudo) > MAX_IMAGEN:
                raise PlantillaInvalida("Una imagen es demasiado grande.")
            try:
                img = Image.open(io.BytesIO(crudo))
                img.load()
                img = img.convert("RGBA" if ranura == "cuerpo" else "RGB")
                img.thumbnail((1600, 1600) if ranura == "cuerpo" else (1920, 1920))
            except Exception as e:
                raise PlantillaInvalida(f"La imagen de «{ranura}» no es válida.") from e
            listas[ranura] = img
        if listas:
            carpeta_imagenes.mkdir(parents=True, exist_ok=True)   # recién cuando todo es válido se escribe algo en la carpeta
        for ranura, img in listas.items():
            img.save(carpeta_imagenes / f"{id_}-{ranura}.webp", "WEBP", quality=88)
            url = f"/imagen?n={id_}-{ranura}.webp&v={ts}"
            if ranura == "fondo":
                props["fondo"] = url
            else:
                props["cuerpo"]["imagen"] = url
        if not props["fondo"]:
            props["fondo"] = ""
    return ajustes
