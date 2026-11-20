"""
Reproductor visual (nombre pendiente). Ejecutar:  python app.py

Una ventana con las páginas de web/; Python entrega la música (SoundCloud, tus
carpetas o lo que suena en el PC) por medio de la clase Api.
"""
import logging
import sys

import webview

import config
import servidor
from fuentes import musica, pc
from fuentes.soundcloud import SoundCloud

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("app")


class Api:
    """Lo que las páginas pueden pedir (window.pywebview.api.*)."""

    def __init__(self):
        self.cfg = config.leer()
        self._sc = None
        self._captura = pc.Captura()

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
            return {"ok": True, "pistas": self._soundcloud().likes()}
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
    webview.create_window("Reproductor", f"http://127.0.0.1:{puerto}/inicio.html", js_api=api,
                          width=1280, height=800, min_size=(900, 600), background_color="#070405")
    webview.start(debug="--debug" in sys.argv)


if __name__ == "__main__":
    main()
