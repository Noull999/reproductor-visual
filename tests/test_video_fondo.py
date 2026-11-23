"""Fondo propio en video: el servidor lo entrega por partes (Range) y no deja salir de la carpeta."""
import urllib.request
import urllib.error

import pytest

import servidor


@pytest.fixture
def puerto(tmp_path, monkeypatch):
    monkeypatch.setattr(servidor, "CARPETA_IMAGENES", tmp_path)
    monkeypatch.setattr(servidor, "PUERTO", 0)   # puerto libre: la app de verdad puede estar abierta en el fijo
    (tmp_path / "dreamcore-fondo.mp4").write_bytes(bytes(range(256)) * 4)
    return servidor.iniciar([])


def pedir(puerto, ruta, rango=None):
    r = urllib.request.Request(f"http://127.0.0.1:{puerto}{ruta}", headers={"Range": rango} if rango else {})
    return urllib.request.urlopen(r)


def test_video_por_partes(puerto):
    r = pedir(puerto, "/imagen?n=dreamcore-fondo.mp4", "bytes=10-19")
    assert r.status == 206 and r.headers["Content-Type"] == "video/mp4" and r.read() == bytes(range(10, 20))


@pytest.mark.parametrize("nombre", ["../config.json", "dreamcore-fondo.exe", ""])
def test_solo_archivos_de_la_carpeta(puerto, nombre):
    with pytest.raises(urllib.error.HTTPError):
        pedir(puerto, f"/imagen?n={nombre}")
