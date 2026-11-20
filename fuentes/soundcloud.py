"""
SoundCloud: tus likes y el enlace de streaming de cada tema.

El enlace se pide al momento de tocar: SoundCloud los anula a los pocos minutos
(medido: 3 de 10 dejaron de servir en ~10 min, sin patrón), así que guardarlos
no sirve.
"""
import logging

import requests

logger = logging.getLogger(__name__)
API = "https://api-v2.soundcloud.com"
PUNTOS_ONDA = 240


class SoundCloud:
    def __init__(self, oauth_token: str, client_id: str):
        self.token = oauth_token if oauth_token.lower().startswith("oauth ") else f"OAuth {oauth_token}"
        self.client_id = client_id
        self.s = requests.Session()
        self.s.headers.update({"Authorization": self.token, "User-Agent": "Mozilla/5.0"})
        self.usuario = None
        self._likes = None

    def conectar(self) -> dict:
        r = self.s.get(f"{API}/me", params={"client_id": self.client_id}, timeout=15)
        if r.status_code == 401:
            raise ValueError("La sesión de SoundCloud venció: vuelve a conectar la cuenta.")
        r.raise_for_status()
        self.usuario = r.json()
        return {"usuario": self.usuario.get("username"), "likes": self.usuario.get("likes_count")}

    def likes(self, maximo: int = 2000) -> list[dict]:
        if self._likes is not None:
            return self._likes
        if not self.usuario:
            self.conectar()
        url, params, salida = f"{API}/users/{self.usuario['id']}/likes", {"client_id": self.client_id, "limit": 200}, []
        while url and len(salida) < maximo:
            r = self.s.get(url, params=params, timeout=20)
            r.raise_for_status()
            j = r.json()
            for item in j.get("collection", []):
                t = item.get("track")
                if not t or t.get("kind") != "track":
                    continue
                salida.append({
                    "url": t.get("permalink_url"), "id": t.get("id"),
                    "titulo": t.get("title") or "", "artista": (t.get("user") or {}).get("username") or "",
                    "caratula": (t.get("artwork_url") or (t.get("user") or {}).get("avatar_url") or "").replace("-large.", "-t500x500."),
                    "duracion": (t.get("full_duration") or t.get("duration") or 0) / 1000,
                    "onda_url": t.get("waveform_url") or "",
                    "fragmento": t.get("policy") == "SNIP",   # SoundCloud Go+: solo 30 s
                })
            url, params = j.get("next_href"), {"client_id": self.client_id}
        self._likes = salida[:maximo]
        return self._likes

    def stream(self, url: str) -> dict:
        """Enlace fresco para tocar el tema ahora mismo."""
        import yt_dlp
        opts = {"quiet": True, "no_warnings": True, "skip_download": True, "noplaylist": True,
                "socket_timeout": 15, "format": "http_mp3_1_0/hls_aac_160k/bestaudio",
                "extractor_args": {"soundcloud": {"oauth_token": [self.token]}}}
        with yt_dlp.YoutubeDL(opts) as y:
            info = y.extract_info(url, download=False)
        enlace = info.get("url") or ((info.get("requested_formats") or [{}])[0].get("url"))
        if not enlace:
            raise RuntimeError("SoundCloud no entregó audio para este tema.")
        return {"url": enlace, "hls": str(info.get("protocol", "")).startswith("m3u8")}

    def onda(self, onda_url: str) -> list[float]:
        """Forma de onda real del tema, reducida a PUNTOS_ONDA valores 0..1."""
        if not onda_url:
            return []
        j = self.s.get(onda_url.replace(".png", ".json"), timeout=15).json()
        m, alto = j["samples"], j.get("height") or max(j["samples"]) or 1
        paso = len(m) / PUNTOS_ONDA
        return [round(max(m[int(i * paso):int((i + 1) * paso)] or [0]) / alto, 3) for i in range(PUNTOS_ONDA)]
