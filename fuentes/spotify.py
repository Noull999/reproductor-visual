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
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlencode, urlparse

import requests

import config

PUERTO = 8888
REDIRECT = f"http://127.0.0.1:{PUERTO}/callback"
SCOPES = ("user-read-playback-state user-modify-playback-state user-read-currently-playing "
          "user-library-read playlist-read-private")
TOKENS = config.CARPETA / "spotify.json"
API = "https://api.spotify.com/v1"
CUENTA = "https://accounts.spotify.com"


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
        return {"titulo": t.get("name"), "artista": ", ".join(a["name"] for a in t.get("artists", [])),
                "caratula": ((t.get("album") or {}).get("images") or [{}])[0].get("url"),
                "sonando": j.get("is_playing"), "posicion": (j.get("progress_ms") or 0) / 1000,
                "duracion": (t.get("duration_ms") or 0) / 1000, "dispositivo": (j.get("device") or {}).get("name")}

    def likes(self, maximo: int = 2000) -> list[dict]:
        salida, ruta, params = [], "/me/tracks", {"limit": 50}
        while ruta and len(salida) < maximo:
            r = self._pedir("GET", ruta, params=params); r.raise_for_status(); j = r.json()
            for it in j.get("items", []):
                t = it.get("track") or {}
                salida.append({"uri": t.get("uri"), "titulo": t.get("name"), "artista": ", ".join(a["name"] for a in t.get("artists", [])),
                               "caratula": ((t.get("album") or {}).get("images") or [{}])[0].get("url"), "duracion": (t.get("duration_ms") or 0) / 1000})
            ruta, params = j.get("next"), None
        return salida[:maximo]

    # ---- control (Premium) ----
    def tocar(self, uri: str | None = None, dispositivo: str | None = None) -> None:
        r = self._pedir("PUT", "/me/player/play", params={"device_id": dispositivo} if dispositivo else None,
                        json={"uris": [uri]} if uri else {})
        r.raise_for_status()

    def control(self, accion: str) -> None:
        metodo, ruta = {"pausa": ("PUT", "/me/player/pause"), "siguiente": ("POST", "/me/player/next"),
                        "anterior": ("POST", "/me/player/previous")}[accion]
        self._pedir(metodo, ruta).raise_for_status()
