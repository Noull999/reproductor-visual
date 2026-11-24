"""
Reproductor visual (nombre pendiente). Ejecutar:  python app.py

Una ventana con las páginas de web/; Python entrega la música (SoundCloud, tus
carpetas o lo que suena en el PC) por medio de la clase Api.
"""
import json
import logging
import re
import secrets
import shutil
import sys
import threading
import time

from pathlib import Path

import webview

import config
import ajustes
import comunidad
import plantillas
import servidor
import skins
from fuentes import musica, pc, soundcloud_acceso, vista_previa
from fuentes.soundcloud import SoundCloud
from fuentes import spotify
from fuentes.spotify import Spotify

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("app")


class Api:
    """Lo que las páginas pueden pedir (window.pywebview.api.*)."""

    def __init__(self):
        self.cfg = config.leer()
        self._sc = None
        self._sp = None
        self._sp_pistas: dict[str, list] = {}   # lista -> canciones (para tocar por posición)
        self._sp_cache: dict[str, tuple[float, dict]] = {}   # respuestas de listas guardadas 10 min (cada petición cuenta contra la cuota)
        self._captura = pc.Captura()
        self._login_sc = {"estado": "nada"}

    # ---- SoundCloud ----
    def _soundcloud(self) -> SoundCloud:
        if self._sc is None:
            sc = self.cfg.get("soundcloud") or {}
            if not sc.get("oauth_token") or not sc.get("client_id"):
                raise ValueError("Falta conectar tu cuenta de SoundCloud.")
            self._sc = SoundCloud(sc["oauth_token"], sc["client_id"])
        return self._sc

    def soundcloud_likes(self) -> dict:
        try:
            return {"ok": True, "pistas": vista_previa.preparar(self._soundcloud().likes())}
        except Exception as e:
            logger.exception("Likes")
            return {"ok": False, "error": str(e)[:200]}

    def soundcloud_stream(self, url: str) -> dict:
        try:
            return {"ok": True, **self._soundcloud().stream(url)}
        except Exception as e:
            logger.warning("Stream de %s: %s", url, e)
            return {"ok": False, "error": str(e)[:200]}

    def soundcloud_onda(self, onda_url: str) -> list:
        try:
            return self._soundcloud().onda(onda_url)
        except Exception:
            return []

    # ---- Spotify (API + tu Spotify de escritorio) ----
    def _spotify(self) -> Spotify:
        if self._sp is None:
            self._sp = Spotify((self.cfg.get("spotify") or {}).get("client_id") or spotify.CLIENT_ID_APP)   # uno propio gana (avanzado)
        return self._sp

    def _sp_llamar(self, f, *a):
        try:
            return {"ok": True, **(f(*a) or {})}
        except Exception as e:
            logger.warning("Spotify: %s", e)
            return {"ok": False, "error": str(e)[:200]}

    def spotify_cuenta(self) -> dict:
        return {"configurado": True, "conectado": self._spotify().conectado}

    def spotify_conectar(self) -> dict:
        """Abre el navegador para aceptar el acceso (espera hasta 3 minutos)."""
        return self._sp_llamar(lambda: self._spotify().conectar())

    def _con_cache(self, clave: str, f) -> dict:
        antes = self._sp_cache.get(clave)
        if antes and time.time() - antes[0] < 600:
            return antes[1]
        r = self._sp_llamar(f)
        if r["ok"]:
            self._sp_cache[clave] = (time.time(), r)
        return r

    def spotify_listas(self) -> dict:
        return self._con_cache("listas", lambda: {"listas": self._spotify().listas()})

    def spotify_canciones(self, lista: str) -> dict:
        def cargar():
            self._sp_pistas[lista] = self._spotify().canciones(lista)
            return {"pistas": self._sp_pistas[lista]}
        r = self._con_cache("canciones:" + lista, cargar)
        if r["ok"]:
            self._sp_pistas[lista] = r["pistas"]
        return r

    def spotify_tocar(self, lista: str, indice: int) -> dict:
        def tocar():
            pistas = self._sp_pistas.get(lista) or []
            if not 0 <= indice < len(pistas):
                raise ValueError("Ese tema no está en la lista.")
            self._spotify().tocar_lista(lista, pistas, indice)
        return self._sp_llamar(tocar)

    def spotify_estado(self) -> dict:
        try:
            return self._spotify().sonando() or {"hay": False}
        except Exception as e:
            logger.warning("Spotify estado: %s", e)
            return {"hay": False, "error": str(e)[:120]}

    def spotify_control(self, accion: str) -> dict:
        if accion not in ("pausa", "reanudar", "siguiente", "anterior"):
            return {"ok": False, "error": "Orden desconocida."}
        return self._sp_llamar(lambda: self._spotify().control(accion))

    def spotify_seek(self, segundos: float) -> dict:
        return self._sp_llamar(lambda: self._spotify().seek(float(segundos)))

    def spotify_volumen(self, porcentaje: int) -> dict:
        return self._sp_llamar(lambda: self._spotify().volumen(int(porcentaje)))

    # ---- Ajustes: cuentas y carpetas, sin tocar archivos ----
    def ajustes(self) -> dict:
        """Estado de cada cosa (nunca devuelve tokens ni claves)."""
        sc = self.cfg.get("soundcloud") or {}
        return {"carpetas": self.cfg.get("carpetas") or [],
                "soundcloud": {"conectado": bool(sc.get("oauth_token") and sc.get("client_id"))},
                "spotify": self.spotify_cuenta()}

    def _guardar_cfg(self) -> None:
        config.guardar(self.cfg)
        servidor.actualizar(self.cfg.get("carpetas") or [])

    def ajustes_agregar_carpeta(self) -> dict:
        """Abre el selector de carpetas de Windows y suma la elegida."""
        ventana = webview.windows[0] if webview.windows else None
        if ventana is None:
            return {"ok": False, "error": "No hay ventana abierta."}
        elegida = ventana.create_file_dialog(webview.FOLDER_DIALOG)
        if not elegida:
            return {"ok": True, "cancelado": True}
        carpetas = self.cfg.setdefault("carpetas", [])
        if elegida[0] not in carpetas:
            carpetas.append(elegida[0])
            self._guardar_cfg()
        return {"ok": True, "carpetas": carpetas}

    def ajustes_quitar_carpeta(self, ruta: str) -> dict:
        self.cfg["carpetas"] = [c for c in self.cfg.get("carpetas") or [] if c != ruta]
        self._guardar_cfg()
        return {"ok": True, "carpetas": self.cfg["carpetas"]}

    def soundcloud_login(self) -> dict:
        """Abre el login de SoundCloud en una ventana; al entrar lee la cookie de sesión (la app
        nunca ve la contraseña) y detecta el Client ID. El avance se consulta con soundcloud_login_estado."""
        if self._login_sc.get("estado") == "esperando":
            return {"ok": False, "error": "Ya hay una ventana de inicio de sesión abierta."}
        self._login_sc = {"estado": "esperando"}
        threading.Thread(target=self._login_soundcloud, daemon=True, name="sc-login").start()
        return {"ok": True}

    def soundcloud_login_estado(self) -> dict:
        return self._login_sc

    def _login_soundcloud(self) -> None:
        ventana = None
        try:
            ventana = webview.create_window("Iniciar sesión en SoundCloud", "https://soundcloud.com/signin", width=520, height=760)
            cerrada = threading.Event()
            ventana.events.closed += cerrada.set
            limite, token = time.time() + 600, None
            while not cerrada.is_set() and time.time() < limite and not token:
                time.sleep(1.5)
                try:
                    token = soundcloud_acceso.token_de_cookies(ventana.get_cookies())
                except Exception:
                    logger.debug("Todavía sin cookies legibles", exc_info=True)
            if not token:
                self._login_sc = {"estado": "error", "error": "No se detectó el inicio de sesión. Inténtalo de nuevo."}
                return
            cid = soundcloud_acceso.detectar_client_id()
            if not cid:
                self._login_sc = {"estado": "error", "error": "Entraste, pero no se pudo leer el Client ID de SoundCloud."}
                return
            usuario = SoundCloud(token, cid).conectar()   # valida: falla si el token no sirve
            self.cfg["soundcloud"] = {"oauth_token": token, "client_id": cid}
            self._guardar_cfg()
            self._sc = None
            self._login_sc = {"estado": "ok", "usuario": usuario.get("usuario")}
        except Exception as e:
            logger.exception("Login de SoundCloud")
            self._login_sc = {"estado": "error", "error": str(e)[:150]}
        finally:
            try:
                if ventana is not None:
                    ventana.destroy()
            except Exception:
                pass

    def soundcloud_desconectar(self) -> dict:
        self.cfg.pop("soundcloud", None)
        self._guardar_cfg()
        self._sc = None
        self._login_sc = {"estado": "nada"}
        return {"ok": True}

    def spotify_guardar_client_id(self, client_id: str) -> dict:
        cid = (client_id or "").strip()
        if len(cid) != 32 or not cid.isalnum():
            return {"ok": False, "error": "El Client ID de Spotify son 32 letras y números."}
        self.cfg["spotify"] = {"client_id": cid}
        self._guardar_cfg()
        self._sp = None
        return {"ok": True}

    def spotify_desconectar(self) -> dict:
        try:
            spotify.TOKENS.unlink(missing_ok=True)
        except OSError:
            pass
        self._sp = None
        return {"ok": True}

    # ---- Imágenes propias (fondos) ----
    def imagen_elegir(self, plantilla: str, ranura: str, transparente: bool = False) -> dict:
        """Selector de archivos de Windows; la imagen se reduce a 1920 px (1600 si es un cuerpo) y se guarda
        como WebP. Si `transparente`, conserva el fondo transparente del PNG (cuerpos de plantilla).
        Un fondo también puede ser un video corto (mp4/webm): se copia tal cual."""
        if not (plantilla.isalnum() and ranura.isalnum()):
            return {"ok": False, "error": "Nombre no válido."}
        ventana = webview.windows[0] if webview.windows else None
        tipos = ("Imágenes y videos (*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp;*.mp4;*.webm)",) if ranura == "fondo" else ("Imágenes (*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp)",)
        elegida = ventana.create_file_dialog(webview.OPEN_DIALOG, file_types=tipos) if ventana else None
        if not elegida:
            return {"ok": True, "cancelado": True}
        origen = Path(elegida[0])
        if ranura == "fondo" and origen.suffix.lower() in (".mp4", ".webm"):
            if origen.stat().st_size > 300 * 1024 * 1024:
                return {"ok": False, "error": "El video pesa más de 300 MB: usa uno más corto o más liviano."}
            servidor.CARPETA_IMAGENES.mkdir(parents=True, exist_ok=True)
            self.imagen_quitar(plantilla, ranura)
            nombre = f"{plantilla}-{ranura}{origen.suffix.lower()}"
            shutil.copyfile(origen, servidor.CARPETA_IMAGENES / nombre)
            return {"ok": True, "url": f"/imagen?n={nombre}&v={int(time.time())}"}
        try:
            self.imagen_quitar(plantilla, ranura)
            from PIL import Image
            img = Image.open(elegida[0]).convert("RGBA" if transparente else "RGB")
            img.thumbnail((1600, 1600) if transparente else (1920, 1920))
            servidor.CARPETA_IMAGENES.mkdir(parents=True, exist_ok=True)
            nombre = f"{plantilla}-{ranura}.webp"
            img.save(servidor.CARPETA_IMAGENES / nombre, "WEBP", quality=85)
        except Exception as e:
            logger.exception("Imagen propia")
            return {"ok": False, "error": f"No se pudo usar esa imagen: {str(e)[:100]}"}
        return {"ok": True, "url": f"/imagen?n={nombre}&v={int(time.time())}"}

    def imagen_quitar_fondo(self, plantilla: str, ranura: str) -> dict:
        """Le quita el fondo a una imagen ya elegida (con IA, en este PC; ver recorte.py) y la guarda con transparencia."""
        if not (plantilla.isalnum() and ranura.isalnum()):
            return {"ok": False, "error": "Nombre no válido."}
        ruta = servidor.CARPETA_IMAGENES / f"{plantilla}-{ranura}.webp"
        if not ruta.is_file():
            return {"ok": False, "error": "Primero elige una imagen."}
        import recorte
        try:
            ruta.write_bytes(recorte.quitar_fondo(ruta.read_bytes()))
        except recorte.RecorteNoDisponible as e:
            return {"ok": False, "error": str(e)}
        except Exception as e:
            logger.exception("Quitar fondo")
            return {"ok": False, "error": f"No se pudo quitar el fondo: {str(e)[:100]}"}
        return {"ok": True, "url": f"/imagen?n={ruta.name}&v={int(time.time())}"}

    def imagen_quitar(self, plantilla: str, ranura: str) -> dict:
        if plantilla.isalnum() and ranura.isalnum():
            for ext in (".webp", ".mp4", ".webm"):
                (servidor.CARPETA_IMAGENES / f"{plantilla}-{ranura}{ext}").unlink(missing_ok=True)
        return {"ok": True}

    # ---- Compartir plantillas propias: un solo archivo .plantilla (configuración + imágenes, sin código) ----
    def plantilla_exportar(self, spec_json: str) -> dict:
        ventana = webview.windows[0] if webview.windows else None
        if ventana is None:
            return {"ok": False, "error": "No hay ventana abierta."}
        try:
            datos = plantillas.empaquetar(spec_json, servidor.CARPETA_IMAGENES)
            nombre = re.sub(r"[^\w\- ]", "", plantillas.validar(json.loads(spec_json), "exportar")["nombre"]).strip() or "plantilla"
            destino = ventana.create_file_dialog(webview.SAVE_DIALOG, save_filename=f"{nombre}.plantilla", file_types=("Plantilla (*.plantilla)",))
            if not destino:
                return {"ok": True, "cancelado": True}
            ruta = Path(destino[0] if isinstance(destino, (list, tuple)) else destino)
            if ruta.suffix.lower() != ".plantilla":
                ruta = ruta.with_name(ruta.name + ".plantilla")
            ruta.write_bytes(datos)
            return {"ok": True, "ruta": str(ruta)}
        except plantillas.PlantillaInvalida as e:
            return {"ok": False, "error": str(e)}
        except OSError as e:
            return {"ok": False, "error": f"No se pudo guardar el archivo: {e.strerror or e}"}

    # ---- Skins de Winamp (quedan solo en este equipo) ----
    def skins_listar(self) -> list:
        return skins.listar()

    def skin_importar_url(self, url: str) -> dict:
        try:
            return {"ok": True, "skin": skins.desde_url(url)}
        except skins.SkinInvalido as e:
            return {"ok": False, "error": str(e)}
        except Exception as e:
            logger.exception("Skin desde link")
            return {"ok": False, "error": f"No se pudo descargar el skin: {str(e)[:100]}"}

    def skin_importar_archivo(self) -> dict:
        ventana = webview.windows[0] if webview.windows else None
        elegido = ventana.create_file_dialog(webview.OPEN_DIALOG, file_types=("Skin de Winamp (*.wsz;*.zip)",)) if ventana else None
        if not elegido:
            return {"ok": True, "cancelado": True}
        try:
            ruta = Path(elegido[0])
            if ruta.stat().st_size > skins.MAX_ZIP:
                raise skins.SkinInvalido("El skin es demasiado grande.")
            return {"ok": True, "skin": skins.importar(ruta.read_bytes(), ruta.stem.replace("_", " "))}
        except skins.SkinInvalido as e:
            return {"ok": False, "error": str(e)}

    def skins_abrir_museo(self) -> dict:
        """Abre el Winamp Skin Museum en el navegador de la persona (dirección fija: no abre links arbitrarios)."""
        import webbrowser
        webbrowser.open("https://skins.webamp.org/")
        return {"ok": True}

    def skin_borrar(self, sid: str) -> dict:
        skins.borrar(sid)
        return {"ok": True}

    def ajustes_exportar(self, datos_json: str) -> dict:
        """Guarda los ajustes de una plantilla incluida (variante, color, controles, fondo y cuerpo propios) en un .plantilla."""
        ventana = webview.windows[0] if webview.windows else None
        if ventana is None:
            return {"ok": False, "error": "No hay ventana abierta."}
        try:
            datos = ajustes.empaquetar(datos_json, servidor.CARPETA_IMAGENES)
            id_ = json.loads(datos_json)["plantilla"]
            destino = ventana.create_file_dialog(webview.SAVE_DIALOG, save_filename=f"{id_}-ajustes.plantilla", file_types=("Plantilla (*.plantilla)",))
            if not destino:
                return {"ok": True, "cancelado": True}
            ruta = Path(destino[0] if isinstance(destino, (list, tuple)) else destino)
            if ruta.suffix.lower() != ".plantilla":
                ruta = ruta.with_name(ruta.name + ".plantilla")
            ruta.write_bytes(datos)
            return {"ok": True, "ruta": str(ruta)}
        except plantillas.PlantillaInvalida as e:
            return {"ok": False, "error": str(e)}
        except OSError as e:
            return {"ok": False, "error": f"No se pudo guardar el archivo: {e.strerror or e}"}

    def plantilla_importar(self) -> dict:
        """Elige un .plantilla (una hecha en el Editor o los ajustes de una incluida), lo valida entero y lo devuelve para aplicarlo."""
        ventana = webview.windows[0] if webview.windows else None
        if ventana is None:
            return {"ok": False, "error": "No hay ventana abierta."}
        elegido = ventana.create_file_dialog(webview.OPEN_DIALOG, file_types=("Plantilla (*.plantilla)",))
        if not elegido:
            return {"ok": True, "cancelado": True}
        try:
            ruta = Path(elegido[0])
            if ruta.stat().st_size > plantillas.MAX_ZIP:
                raise plantillas.PlantillaInvalida("El archivo es demasiado grande.")
            return self._abrir_plantilla(ruta.read_bytes())
        except plantillas.PlantillaInvalida as e:
            return {"ok": False, "error": str(e)}
        except OSError as e:
            return {"ok": False, "error": f"No se pudo leer el archivo: {e.strerror or e}"}

    def _abrir_plantilla(self, datos: bytes) -> dict:
        """Un .plantilla (del Editor o los ajustes de una incluida), venga de un archivo o de la comunidad: se valida entero."""
        if ajustes.es_de_ajustes(datos):
            return {"ok": True, "ajustes": ajustes.desempaquetar(datos, servidor.CARPETA_IMAGENES)}
        nuevo_id = "p" + format(int(time.time() * 1000), "x") + secrets.token_hex(2)
        return {"ok": True, "spec": plantillas.desempaquetar(datos, nuevo_id, servidor.CARPETA_IMAGENES)}

    # ---- Comunidad: plantillas que comparte la gente (repositorio público) ----
    def comunidad_catalogo(self) -> dict:
        try:
            return {"ok": True, "plantillas": comunidad.catalogo(), "base": comunidad.BASE}
        except comunidad.ErrorComunidad as e:
            return {"ok": False, "error": str(e)}

    def comunidad_instalar(self, id_: str, fuente: str = "repo") -> dict:
        """Baja una plantilla del catálogo (del repositorio o de la web) y la valida igual que "Importar plantilla…"."""
        try:
            return self._abrir_plantilla(comunidad.descargar(id_, fuente))
        except (comunidad.ErrorComunidad, plantillas.PlantillaInvalida) as e:
            return {"ok": False, "error": str(e)}

    def comunidad_preparar_envio(self, tipo: str, datos_json: str, captura: str = "") -> dict:
        """Deja en ~/.visualizador/compartir/ el .plantilla y la captura (WebP) listos para subir, y abre la página de envío de la comunidad.
        Nada se sube desde aquí: la persona entra con GitHub en la web y elige los dos archivos."""
        import base64
        import subprocess
        import webbrowser
        try:
            if tipo == "ajustes":
                datos, nombre = ajustes.empaquetar(datos_json, servidor.CARPETA_IMAGENES), json.loads(datos_json)["plantilla"] + "-ajustes"
            elif tipo == "plantilla":
                datos, nombre = plantillas.empaquetar(datos_json, servidor.CARPETA_IMAGENES), plantillas.validar(json.loads(datos_json), "exportar")["nombre"]
            else:
                return {"ok": False, "error": "Tipo de plantilla no válido."}
            nombre = re.sub(r"[^a-z0-9]+", "-", nombre.lower()).strip("-")[:40] or "plantilla"
            previa = None
            if isinstance(captura, str) and captura:
                try:
                    previa = comunidad.previa_webp(base64.b64decode(captura.split(",")[-1]))
                except (comunidad.ErrorComunidad, ValueError):
                    previa = None   # sin captura automática: la persona sube la suya
            carpeta = Path.home() / ".visualizador" / "compartir"
            carpeta.mkdir(parents=True, exist_ok=True)
            ruta = carpeta / f"{nombre}.plantilla"
            ruta.write_bytes(datos)
            if previa:
                (carpeta / f"{nombre}.webp").write_bytes(previa)
            webbrowser.open(comunidad.ENVIAR)   # dirección fija
            subprocess.Popen(["explorer", "/select,", str(ruta)])
            return {"ok": True, "carpeta": str(carpeta), "captura": bool(previa)}
        except (plantillas.PlantillaInvalida, KeyError, ValueError) as e:
            return {"ok": False, "error": str(e) or "La plantilla no es válida."}
        except OSError as e:
            return {"ok": False, "error": f"No se pudo preparar el envío: {e.strerror or e}"}

    def comunidad_abrir_envio(self) -> dict:
        import webbrowser
        webbrowser.open(comunidad.ENVIAR)   # dirección fija: la página donde se envía una plantilla
        return {"ok": True}

    def comunidad_abrir_guia(self) -> dict:
        import webbrowser
        webbrowser.open(comunidad.GUIA)   # dirección fija: la guía para compartir una plantilla
        return {"ok": True}

    # ---- Mi música ----
    def musica_listas(self) -> list:
        return musica.listas(self.cfg.get("carpetas") or [])

    def musica_canciones(self, carpeta: str) -> dict:
        if not servidor.permitido_carpeta(carpeta):
            return {"ok": False, "error": "Esa carpeta no está entre las elegidas."}
        return {"ok": True, "pistas": musica.canciones(carpeta)}

    # ---- Lo que suena en el PC ----
    def pc_estado(self) -> dict:
        return pc.estado()

    def pc_control(self, accion: str) -> bool:
        return pc.control(accion)

    def pc_espectro(self) -> dict:
        self._captura.iniciar()
        return {"espectro": self._captura.espectro, "dispositivo": self._captura.dispositivo,
                "error": self._captura.error}


def main():
    if sys.platform != "win32":
        logger.warning("Por ahora la app está pensada para Windows.")
    api = Api()
    puerto = servidor.iniciar(api.cfg.get("carpetas") or [])
    webview.create_window("Reproductor", f"http://127.0.0.1:{puerto}/index.html", js_api=api,
                          width=1280, height=800, min_size=(900, 600), background_color="#070405")
    # Sin modo privado: así el navegador interno recuerda la plantilla elegida, Personalizar y las plantillas propias
    webview.start(debug="--debug" in sys.argv, private_mode=False, storage_path=str(Path.home() / ".visualizador" / "navegador"))


if __name__ == "__main__":
    main()
