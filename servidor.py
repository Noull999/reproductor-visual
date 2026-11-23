"""
Servidor local (solo 127.0.0.1) que entrega las páginas de web/ y la música
de tus carpetas. La música admite "Range" para poder adelantar la canción.

Solo entrega archivos de audio que estén dentro de las carpetas elegidas: ninguna
página puede pedirle otro archivo del equipo.
"""
import mimetypes
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
from urllib.parse import parse_qs, urlparse

WEB = Path(__file__).resolve().parent / "web"
AUDIO = {".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".opus", ".aiff", ".aif"}
mimetypes.add_type("audio/flac", ".flac")
mimetypes.add_type("audio/aiff", ".aiff")
mimetypes.add_type("audio/aiff", ".aif")

carpetas_permitidas: list[Path] = []
CARPETA_IMAGENES = Path.home() / ".visualizador" / "imagenes"   # fondos que sube la persona
PUERTO = 47831   # fijo: el navegador guarda las preferencias (colores, skins…) por puerto; uno al azar las borraba en cada arranque


def permitido(ruta: str) -> Path | None:
    """La ruta, si es un audio dentro de una carpeta elegida; si no, None."""
    try:
        p = Path(ruta).resolve()
    except (OSError, ValueError):
        return None
    if p.suffix.lower() not in AUDIO or not p.is_file():
        return None
    return p if any(p.is_relative_to(c) for c in carpetas_permitidas) else None


def permitido_carpeta(ruta: str) -> bool:
    try:
        p = Path(ruta).resolve()
    except (OSError, ValueError):
        return False
    return p.is_dir() and any(p.is_relative_to(c) for c in carpetas_permitidas)


class Manejador(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(WEB), **kw)

    def log_message(self, *a):   # sin ruido en la consola
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")   # las páginas cambian mientras se desarrolla
        super().end_headers()

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/musica":
            return self._musica(parse_qs(url.query).get("r", [""])[0])
        if url.path == "/skin":
            return self._skin(parse_qs(url.query).get("n", [""])[0])
        if url.path == "/imagen":
            return self._imagen(parse_qs(url.query).get("n", [""])[0])
        if url.path == "/caratula":
            return self._caratula(parse_qs(url.query).get("r", [""])[0])
        return super().do_GET()

    def _musica(self, ruta):
        p = permitido(ruta)
        if not p:
            return self.send_error(404)
        total = p.stat().st_size
        inicio, fin = 0, total - 1
        rango = self.headers.get("Range", "")
        if rango.startswith("bytes="):
            a, _, b = rango[6:].partition("-")
            inicio = int(a) if a else max(0, total - int(b))
            fin = int(b) if a and b else total - 1
            fin = min(fin, total - 1)
            if inicio > fin:
                return self.send_error(416)
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {inicio}-{fin}/{total}")
        else:
            self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(p.name)[0] or "application/octet-stream")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(fin - inicio + 1))
        self.end_headers()
        with open(p, "rb") as f:
            f.seek(inicio)
            restante = fin - inicio + 1
            try:
                while restante > 0:
                    bloque = f.read(min(256 * 1024, restante))
                    if not bloque:
                        break
                    self.wfile.write(bloque)
                    restante -= len(bloque)
            except (BrokenPipeError, ConnectionResetError):
                pass   # el reproductor cortó (cambió de tema o adelantó)

    def _skin(self, ruta):
        """Pieza de un skin de Winamp importado: /skin?n=<id>/<pieza>.png (nada de rutas libres)."""
        import skins
        m = re.fullmatch(r"([0-9a-f]{16})/([a-z_]+)\.png", ruta or "")
        p = skins.CARPETA / m.group(1) / (m.group(2) + ".png") if m else None
        if not p or m.group(2) not in skins.PIEZAS or not p.is_file():
            return self.send_error(404)
        datos = p.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(datos)))
        self.end_headers()
        self.wfile.write(datos)

    def _imagen(self, nombre):
        """Imagen propia de la carpeta ~/.visualizador/imagenes (solo nombres simples, nada de rutas)."""
        p = CARPETA_IMAGENES / nombre
        if not nombre or nombre != Path(nombre).name or p.suffix.lower() != ".webp" or not p.is_file():
            return self.send_error(404)
        datos = p.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "image/webp")
        self.send_header("Content-Length", str(len(datos)))
        self.end_headers()
        self.wfile.write(datos)

    def _caratula(self, ruta):
        p = permitido(ruta)
        datos = None
        if p:
            try:
                from mutagen import File
                tags = File(p).tags
                if tags is not None:
                    for k in tags.keys():
                        if k.startswith("APIC"):
                            datos, tipo = tags[k].data, tags[k].mime or "image/jpeg"
                            break
                    if datos is None and "covr" in tags:          # m4a
                        datos, tipo = bytes(tags["covr"][0]), "image/jpeg"
            except Exception:
                datos = None
        if datos is None:
            return self.send_error(404)
        self.send_response(200)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(datos)))
        self.end_headers()
        self.wfile.write(datos)


def actualizar(carpetas: list[str]) -> None:
    """Cambia las carpetas permitidas sin reiniciar (al agregar o quitar una en Ajustes)."""
    carpetas_permitidas[:] = [Path(c).resolve() for c in carpetas if c and os.path.isdir(c)]


def iniciar(carpetas: list[str]) -> int:
    """Arranca en el puerto fijo (o en uno libre si está ocupado) y devuelve el puerto."""
    actualizar(carpetas)
    try:
        srv = ThreadingHTTPServer(("127.0.0.1", PUERTO), Manejador)
    except OSError:
        srv = ThreadingHTTPServer(("127.0.0.1", 0), Manejador)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1]
