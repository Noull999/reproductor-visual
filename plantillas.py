"""
Exportar e importar plantillas propias como UN archivo (.plantilla = zip con la configuración y sus imágenes).

Una plantilla propia es solo DATOS (ver web/plantillas-propias.js). Al importar se trata como contenido
no confiable: la configuración se revisa campo por campo contra listas permitidas, las imágenes se abren y
se vuelven a guardar con Pillow (nunca se copian tal cual) y el zip se lee con límites de tamaño y de
nombres. Si algo no cuadra, se rechaza todo el archivo.
"""
import io
import json
import re
import time
import zipfile
from pathlib import Path

FORMATO = "reproductor-plantilla"
VERSION = 1
MAX_ZIP = 40 * 1024 * 1024        # lo que se descomprime en total
MAX_IMAGEN = 8 * 1024 * 1024      # cada imagen
MAX_ENTRADAS = 40
MAX_PIEZAS = 30

def _cargar_esquema() -> dict:
    """web/esquema.js es la única fuente de verdad (la leen también el motor y el editor): JSON tras 'const ESQUEMA ='."""
    texto = (Path(__file__).resolve().parent / "web" / "esquema.js").read_text(encoding="utf-8")
    return json.loads(texto.rsplit("const ESQUEMA =", 1)[1].strip().rstrip(";"))


ESQUEMA = _cargar_esquema()
MAX_PIEZAS = ESQUEMA["maxPiezas"]

_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
_ALNUM = re.compile(r"^[A-Za-z0-9]{1,24}$")
_URL_IMAGEN = re.compile(r"^/imagen\?n=([A-Za-z0-9]+)-([A-Za-z0-9]+)\.webp(?:&v=\d+)?$")   # imagen guardada en este equipo
_MARCA_IMAGEN = re.compile(r"^img:([A-Za-z0-9]{1,24})$")                                    # imagen dentro del archivo


class PlantillaInvalida(ValueError):
    pass


def _texto(v, maximo, defecto=""):
    if not isinstance(v, str):
        return defecto
    return "".join(c for c in v if c.isprintable())[:maximo].strip() or defecto


def _numero(v, minimo, maximo, nombre):
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        raise PlantillaInvalida(f"{nombre} no es un número.")
    n = round(max(minimo, min(maximo, float(v))), 1)
    return int(n) if n == int(n) else n


def _opcion(d, v, nombre):
    """Valida un valor contra su definición del esquema; None si falta (se usa el predeterminado al dibujar)."""
    if v is None:
        return d["def"]
    t = d["t"]
    if t == "enum":
        if not isinstance(v, str) or v not in d["v"]:
            raise PlantillaInvalida(f"{nombre} no es válido.")
        return v
    if t == "num":
        return _numero(v, d["min"], d["max"], nombre)
    if t == "bool":
        if not isinstance(v, bool):
            raise PlantillaInvalida(f"{nombre} no es válido.")
        return v
    if t == "color":
        if d.get("vacio") and v == "":
            return ""
        if not isinstance(v, str) or not _HEX.match(v):
            raise PlantillaInvalida(f"{nombre} no es un color válido.")
        return v.lower()
    raise PlantillaInvalida(f"{nombre}: opción desconocida.")


def _opciones(definiciones, origen, nombre, imagen):
    """Solo se conservan las opciones del esquema; lo demás se descarta."""
    salida = {}
    for clave, d in definiciones.items():
        v = origen.get(clave)
        salida[clave] = imagen(v if v is not None else "", f"{nombre}") if d["t"] == "imagen" else _opcion(d, v, f"{nombre} · {d.get('n', clave)}")
    return salida


def validar(spec, modo):
    """
    Devuelve una copia limpia de la plantilla o lanza PlantillaInvalida.
    modo "exportar": las imágenes vienen como /imagen?n=…; modo "importar": vienen como img:<ranura>.
    Solo se conserva lo que el esquema conoce: cualquier otro campo se descarta.
    """
    if not isinstance(spec, dict):
        raise PlantillaInvalida("La plantilla no tiene el formato esperado.")
    patron = _URL_IMAGEN if modo == "exportar" else _MARCA_IMAGEN

    def imagen(v, nombre):
        if v == "" or _es_incluida(v):   # imagen que ya viene con la app: no se empaqueta
            return v
        if not isinstance(v, str) or not patron.match(v):
            raise PlantillaInvalida(f"{nombre}: la imagen no es válida.")
        return v

    fondo, estilo, piezas = spec.get("fondo"), spec.get("estilo"), spec.get("piezas")
    if not isinstance(fondo, dict) or not isinstance(estilo, dict) or not isinstance(piezas, list):
        raise PlantillaInvalida("Faltan partes de la plantilla.")
    if not 0 < len(piezas) <= MAX_PIEZAS:
        raise PlantillaInvalida(f"Debe tener entre 1 y {MAX_PIEZAS} piezas.")
    base = spec.get("base", "")
    if base != "" and base not in ESQUEMA["bases"]:
        raise PlantillaInvalida("La plantilla base no es válida.")
    tipo_fondo = fondo.get("tipo")
    if tipo_fondo not in ESQUEMA["fondos"]:
        raise PlantillaInvalida("El tipo de fondo no es válido.")
    limpia = {"nombre": _texto(spec.get("nombre"), 40, "Plantilla importada"), "base": base,
              "fondo": {"tipo": tipo_fondo, **_opciones(ESQUEMA["fondo"], fondo, "Fondo", imagen)},
              "estilo": _opciones(ESQUEMA["estilo"], estilo, "Estilo", imagen), "piezas": []}
    vistos, tipos, ids = set(), [], set()
    for p in piezas:
        if not isinstance(p, dict):
            raise PlantillaInvalida("Una pieza no tiene el formato esperado.")
        n = p.get("n")
        if not isinstance(n, str) or not _ALNUM.match(n) or n in vistos:
            raise PlantillaInvalida("Los nombres de las piezas no son válidos.")
        vistos.add(n)
        tipo = p.get("tipo")
        definicion = ESQUEMA["tipos"].get(tipo) if isinstance(tipo, str) else None
        if definicion is None:
            raise PlantillaInvalida("El tipo de pieza no es válido.")
        if not definicion.get("repetible") and tipo in tipos:
            raise PlantillaInvalida(f"La pieza «{definicion['etiqueta']}» solo puede aparecer una vez.")
        if ids & set(definicion["ids"]):
            raise PlantillaInvalida(f"«{definicion['etiqueta']}» choca con otra pieza que ya cumple su función.")
        ids |= set(definicion["ids"])
        tipos.append(tipo)
        x, y = _numero(p.get("x"), 0, 100, "x"), _numero(p.get("y"), 0, 100, "y")
        w, h = _numero(p.get("w"), 1, 100, "ancho"), _numero(p.get("h"), 1, 100, "alto")
        nueva = {"n": n, "tipo": tipo, "x": x, "y": y, "w": min(w, 100 - x), "h": min(h, 100 - y)}
        nueva.update(_opciones(definicion["opciones"], p, definicion["etiqueta"], imagen))
        nueva.update(_opciones(ESQUEMA["comunes"], p, definicion["etiqueta"], imagen))
        limpia["piezas"].append(nueva)
    return limpia


def _es_incluida(v):
    return v in ESQUEMA.get("imagenesIncluidas", [])


def _nombres_de_imagenes(spec):
    """(ranura, valor) de cada imagen de la plantilla: 'fondo' y el nombre de cada pieza imagen."""
    salida = []
    if spec["fondo"]["imagen"] and not _es_incluida(spec["fondo"]["imagen"]):
        salida.append(("fondo", spec["fondo"]["imagen"]))
    salida += [(p["n"], p["imagen"]) for p in spec["piezas"] if p.get("imagen") and not _es_incluida(p["imagen"])]
    return salida


def empaquetar(spec_json: str, carpeta_imagenes: Path) -> bytes:
    """Zip con manifest.json y las imágenes que la plantilla usa (imagenes/<ranura>.webp)."""
    try:
        spec = validar(json.loads(spec_json), "exportar")
    except json.JSONDecodeError as e:
        raise PlantillaInvalida("La plantilla no se pudo leer.") from e
    memoria = io.BytesIO()
    with zipfile.ZipFile(memoria, "w", zipfile.ZIP_DEFLATED) as z:
        for ranura, url in _nombres_de_imagenes(spec):
            m = _URL_IMAGEN.match(url)
            archivo = carpeta_imagenes / f"{m.group(1)}-{m.group(2)}.webp"
            if not archivo.is_file():
                raise PlantillaInvalida(f"Falta la imagen de «{ranura}» en este equipo.")
            z.writestr(f"imagenes/{ranura}.webp", archivo.read_bytes())
            _reemplazar(spec, ranura, f"img:{ranura}")
        manifest = {"formato": FORMATO, "version": VERSION, "plantilla": {k: v for k, v in spec.items() if k != "id"}}
        z.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=1))
    return memoria.getvalue()


def _reemplazar(spec, ranura, valor):
    if ranura == "fondo":
        spec["fondo"]["imagen"] = valor
    else:
        for p in spec["piezas"]:
            if p["n"] == ranura:
                p["imagen"] = valor


def desempaquetar(datos: bytes, nuevo_id: str, carpeta_imagenes: Path) -> dict:
    """Lee un .plantilla ajeno: lo valida todo, guarda sus imágenes (re-codificadas) y devuelve la plantilla lista para usar."""
    from PIL import Image
    try:
        z = zipfile.ZipFile(io.BytesIO(datos))
    except zipfile.BadZipFile as e:
        raise PlantillaInvalida("Ese archivo no es una plantilla.") from e
    with z:
        entradas = z.infolist()
        if len(entradas) > MAX_ENTRADAS or sum(i.file_size for i in entradas) > MAX_ZIP:
            raise PlantillaInvalida("El archivo es demasiado grande.")
        permitidos = {"manifest.json"}
        for i in entradas:
            if i.filename != "manifest.json" and not re.fullmatch(r"imagenes/[A-Za-z0-9]{1,24}\.webp", i.filename):
                raise PlantillaInvalida("El archivo trae contenido que no corresponde a una plantilla.")
            permitidos.add(i.filename)
        try:
            manifest = json.loads(z.read("manifest.json").decode("utf-8"))
        except (KeyError, ValueError, UnicodeDecodeError) as e:
            raise PlantillaInvalida("Falta la configuración de la plantilla.") from e
        if not isinstance(manifest, dict) or manifest.get("formato") != FORMATO:
            raise PlantillaInvalida("Ese archivo no es una plantilla de este reproductor.")
        if manifest.get("version") != VERSION:
            raise PlantillaInvalida("Esa plantilla es de otra versión de la app.")
        spec = validar(manifest.get("plantilla"), "importar")
        spec["id"] = nuevo_id
        carpeta_imagenes.mkdir(parents=True, exist_ok=True)
        ts = int(time.time())
        for ranura, marca in _nombres_de_imagenes(spec):
            nombre = f"imagenes/{_MARCA_IMAGEN.match(marca).group(1)}.webp"
            if nombre not in permitidos:
                raise PlantillaInvalida(f"Falta la imagen de «{ranura}».")
            crudo = z.open(nombre).read(MAX_IMAGEN + 1)
            if len(crudo) > MAX_IMAGEN:
                raise PlantillaInvalida("Una imagen es demasiado grande.")
            try:
                img = Image.open(io.BytesIO(crudo))
                img.load()
                img = img.convert("RGBA")
                img.thumbnail((1920, 1920))
            except Exception as e:
                raise PlantillaInvalida(f"La imagen de «{ranura}» no es válida.") from e
            img.save(carpeta_imagenes / f"{nuevo_id}-{ranura}.webp", "WEBP", quality=88)
            _reemplazar(spec, ranura, f"/imagen?n={nuevo_id}-{ranura}.webp&v={ts}")
    return spec
