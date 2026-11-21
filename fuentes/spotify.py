"""
Spotify Web API (control de tu Spotify de escritorio y tus listas).

Acceso con PKCE: solo hace falta el Client ID, nunca un secreto. Los tokens se
guardan en ~/.visualizador/spotify.json (fuera del proyecto). Requiere Premium
para controlar la reproducción; el audio no pasa por aquí (los visuales siguen
usando la captura del sonido del PC).
"""
import base64
import hashlib
import json
import secrets
import threading
import time
import webbrowser
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlencode, urlparse

import requests

import config

# Client ID de la app en Spotify (público por diseño: el acceso usa PKCE y no lleva secreto).
# Cada persona solo aprieta "Conectar". En modo desarrollo Spotify deja entrar a 5 cuentas
# autorizadas por el dueño (panel de Spotify > User management); más gente exige cuota ampliada.
CLIENT_ID_APP = "7250390111f845ecb2d429e87864c549"
PUERTO = 8888
REDIRECT = f"http://127.0.0.1:{PUERTO}/callback"
SCOPES = ("user-read-playback-state user-modify-playback-state user-read-currently-playing "
          "user-library-read playlist-read-private")
TOKENS = config.CARPETA / "spotify.json"
API = "https://api.spotify.com/v1"
CUENTA = "https://accounts.spotify.com"


def _portada(t: dict) -> str:
    imgs = (t.get("album") or {}).get("images") or []
    # la de ~640 px (la primera) alcanza; si no hay, vacío
    return imgs[0]["url"] if imgs else ""


def _pista(t: dict) -> dict:
    return {"uri": t.get("uri"), "titulo": t.get("name") or "", "artista": ", ".join(a["name"] for a in t.get("artists", [])),
            "caratula": _portada(t), "duracion": (t.get("duration_ms") or 0) / 1000}


class Spotify:
    def __init__(self, client_id: str):
        self.client_id = client_id
        self.s = requests.Session()
        try:
            self.t = json.loads(TOKENS.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            self.t = {}

    # ---- acceso ----
    @property
    def conectado(self) -> bool:
        return bool(self.t.get("refresh_token"))

    def _guardar(self, j: dict) -> None:
        self.t = {"access_token": j["access_token"], "refresh_token": j.get("refresh_token") or self.t.get("refresh_token", ""),
                  "vence": time.time() + j.get("expires_in", 3600) - 60}
        config.CARPETA.mkdir(parents=True, exist_ok=True)
        TOKENS.write_text(json.dumps(self.t), encoding="utf-8")

    def conectar(self, espera: int = 180) -> None:
        """Abre el navegador para que aceptes el acceso; espera la respuesta en 127.0.0.1."""
        verificador = secrets.token_urlsafe(64)
        reto = base64.urlsafe_b64encode(hashlib.sha256(verificador.encode()).digest()).rstrip(b"=").decode()
        estado, recibido = secrets.token_urlsafe(16), {}

        class Retorno(BaseHTTPRequestHandler):
            def do_GET(self):
                q = parse_qs(urlparse(self.path).query)
                if urlparse(self.path).path == "/callback":
                    recibido.update({k: v[0] for k, v in q.items()})
                    self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8"); self.end_headers()
                    self.wfile.write("<h2>Listo, ya puedes cerrar esta pestaña y volver a la app.</h2>".encode())
                else:
                    self.send_error(404)

            def log_message(self, *a):
                pass

        srv = HTTPServer(("127.0.0.1", PUERTO), Retorno)
        srv.timeout = 1
        webbrowser.open(f"{CUENTA}/authorize?" + urlencode({
            "client_id": self.client_id, "response_type": "code", "redirect_uri": REDIRECT, "scope": SCOPES,
            "state": estado, "code_challenge_method": "S256", "code_challenge": reto}))
        limite = time.time() + espera
        while not recibido and time.time() < limite:
            srv.handle_request()
        srv.server_close()
        if recibido.get("state") != estado or "code" not in recibido:
            raise RuntimeError("No se completó el acceso a Spotify" + (f": {recibido['error']}" if "error" in recibido else "."))
        r = self.s.post(f"{CUENTA}/api/token", data={
            "grant_type": "authorization_code", "code": recibido["code"], "redirect_uri": REDIRECT,
            "client_id": self.client_id, "code_verifier": verificador}, timeout=20)
        r.raise_for_status()
        self._guardar(r.json())

    def _token(self) -> str:
        if not self.conectado:
            raise RuntimeError("Falta conectar la cuenta de Spotify.")
        if time.time() >= self.t.get("vence", 0):
            r = self.s.post(f"{CUENTA}/api/token", data={
                "grant_type": "refresh_token", "refresh_token": self.t["refresh_token"], "client_id": self.client_id}, timeout=20)
            r.raise_for_status()
            self._guardar(r.json())
        return self.t["access_token"]

    def _pedir(self, metodo: str, ruta: str, **kw) -> requests.Response:
        r = self.s.request(metodo, API + ruta if ruta.startswith("/") else ruta,
                           headers={"Authorization": f"Bearer {self._token()}"}, timeout=20, **kw)
        if r.status_code == 429:
            time.sleep(min(10, int(r.headers.get("Retry-After", "2"))))
            return self._pedir(metodo, ruta, **kw)
        return r

    # ---- lectura ----
    def perfil(self) -> dict:
        r = self._pedir("GET", "/me"); r.raise_for_status(); j = r.json()
        return {"nombre": j.get("display_name"), "plan": j.get("product")}

    def dispositivos(self) -> list[dict]:
        r = self._pedir("GET", "/me/player/devices"); r.raise_for_status()
        return [{"id": d["id"], "nombre": d["name"], "tipo": d["type"], "activo": d["is_active"]} for d in r.json().get("devices", [])]

    def sonando(self) -> dict | None:
        r = self._pedir("GET", "/me/player")
        if r.status_code == 204:
            return None
        r.raise_for_status()
        j = r.json(); t = j.get("item") or {}
        return {"hay": True, "uri": t.get("uri"), "titulo": t.get("name"), "artista": ", ".join(a["name"] for a in t.get("artists", [])),
                "caratula": _portada(t), "sonando": j.get("is_playing"), "posicion": (j.get("progress_ms") or 0) / 1000,
                "duracion": (t.get("duration_ms") or 0) / 1000, "dispositivo": (j.get("device") or {}).get("name"),
                "volumen": (j.get("device") or {}).get("volume_percent")}

    def _paginas(self, ruta: str, tam: int, maximo: int) -> list[dict]:
        """Todas las páginas de una lista: pide la primera para saber el total y el resto en paralelo."""
        r = self._pedir("GET", ruta, params={"limit": tam, "offset": 0}); r.raise_for_status(); j = r.json()
        items = list(j.get("items", []))
        total = min(j.get("total", len(items)), maximo)

        def pagina(offset):
            rr = self._pedir("GET", ruta, params={"limit": tam, "offset": offset}); rr.raise_for_status()
            return rr.json().get("items", [])
        with ThreadPoolExecutor(max_workers=5) as pool:
            for resto in pool.map(pagina, range(tam, total, tam)):
                items += resto
        return items[:maximo]

    def likes(self, maximo: int = 2000) -> list[dict]:
        return [_pista(it["track"]) for it in self._paginas("/me/tracks", 50, maximo) if (it.get("track") or {}).get("uri")]

    def listas(self) -> list[dict]:
        """Tus me gusta y tus playlists. En modo desarrollo Spotify solo deja leer las canciones
        de playlists tuyas o colaborativas (las de otros dan 403), así que solo esas se ofrecen."""
        r = self._pedir("GET", "/me/tracks", params={"limit": 1}); r.raise_for_status()
        salida = [{"id": "me-gusta", "nombre": "Tus me gusta", "canciones": r.json().get("total", 0)}]
        yo = self._pedir("GET", "/me").json().get("id")
        ruta, params = "/me/playlists", {"limit": 50}
        while ruta:
            r = self._pedir("GET", ruta, params=params); r.raise_for_status(); j = r.json()
            for p in j.get("items", []):
                n = (p.get("items") or p.get("tracks") or {}).get("total", 0)
                if n and (p["owner"]["id"] == yo or p.get("collaborative")):
                    salida.append({"id": p["id"], "nombre": p["name"], "canciones": n})
            ruta, params = j.get("next"), None
        return salida

    def canciones(self, lista: str, maximo: int = 2000) -> list[dict]:
        if lista == "me-gusta":
            return self.likes(maximo)
        salida = []
        for it in self._paginas(f"/playlists/{lista}/items", 100, maximo):
            t = it.get("item") or it.get("track") or {}
            if t.get("type") == "track" and t.get("uri") and not it.get("is_local"):
                salida.append(_pista(t))
        return salida

    # ---- control (Premium) ----
    def _dispositivo(self) -> str | None:
        """El dispositivo activo o, si no hay, el Spotify de este PC."""
        ds = self.dispositivos()
        elegido = next((d for d in ds if d["activo"]), None) or next((d for d in ds if d["tipo"] == "Computer"), None) or (ds[0] if ds else None)
        return elegido["id"] if elegido else None

    def _ok(self, r: requests.Response) -> None:
        if r.status_code in (200, 202, 204):
            return
        if r.status_code == 404:
            raise RuntimeError("Abre Spotify en tu PC y vuelve a intentarlo.")
        if r.status_code == 403:
            raise RuntimeError("Spotify rechazó la orden (hace falta Premium).")
        r.raise_for_status()

    def tocar_lista(self, lista: str, pistas: list[dict], indice: int) -> None:
        """Pone a sonar pistas[indice] y deja el resto de la lista detrás para que ⏭ siga el orden."""
        dispositivo = self._dispositivo()
        if not dispositivo:
            raise RuntimeError("Abre Spotify en tu PC y vuelve a intentarlo.")
        if lista == "me-gusta":   # sin contexto propio: se manda una tanda de hasta 100 temas
            cuerpo = {"uris": [p["uri"] for p in pistas[indice:indice + 100]]}
        else:
            cuerpo = {"context_uri": f"spotify:playlist:{lista}", "offset": {"uri": pistas[indice]["uri"]}}
        self._ok(self._pedir("PUT", "/me/player/play", params={"device_id": dispositivo}, json=cuerpo))

    def seek(self, segundos: float) -> None:
        self._ok(self._pedir("PUT", "/me/player/seek", params={"position_ms": int(max(0, segundos) * 1000)}))

    def volumen(self, porcentaje: int) -> None:
        self._ok(self._pedir("PUT", "/me/player/volume", params={"volume_percent": max(0, min(100, int(porcentaje)))}))

    def tocar(self, uri: str | None = None, dispositivo: str | None = None) -> None:
        self._ok(self._pedir("PUT", "/me/player/play", params={"device_id": dispositivo} if dispositivo else None,
                             json={"uris": [uri]} if uri else {}))

    def control(self, accion: str) -> None:
        if accion == "reanudar":
            return self.tocar()
        metodo, ruta = {"pausa": ("PUT", "/me/player/pause"), "siguiente": ("POST", "/me/player/next"),
                        "anterior": ("POST", "/me/player/previous")}[accion]
        self._ok(self._pedir(metodo, ruta))
