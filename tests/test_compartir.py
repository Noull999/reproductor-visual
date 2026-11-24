"""«Compartir en la comunidad»: deja el archivo y la captura listos y abre la web, sin subir nada."""
import base64
import io
import json
import subprocess
import webbrowser
from pathlib import Path

from PIL import Image

import app
import comunidad
import servidor

DATOS = {"plantilla": "liquido", "variante": {"tema-liquido": "Propio"},
         "props": {"intensidad": 70, "velocidad": 30, "lista": False, "soloVisual": True, "colorLibre": "#ff7a00", "extra": {}}}


def captura_b64():
    b = io.BytesIO()
    Image.new("RGB", (800, 600), (30, 60, 200)).save(b, "WEBP")
    return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()


def preparar(monkeypatch, tmp_path, tipo, datos, captura):
    abiertas, lanzadas = [], []
    monkeypatch.setattr(Path, "home", classmethod(lambda cls: tmp_path))
    monkeypatch.setattr(webbrowser, "open", lambda url: abiertas.append(url))
    monkeypatch.setattr(subprocess, "Popen", lambda cmd, *a, **k: lanzadas.append(cmd))
    monkeypatch.setattr(servidor, "CARPETA_IMAGENES", tmp_path / "img")
    (tmp_path / "img").mkdir(exist_ok=True)
    return app.Api.comunidad_preparar_envio(object.__new__(app.Api), tipo, json.dumps(datos), captura), abiertas, lanzadas


def test_prepara_archivo_y_captura_y_abre_la_web(monkeypatch, tmp_path):
    r, abiertas, lanzadas = preparar(monkeypatch, tmp_path, "ajustes", DATOS, captura_b64())
    assert r["ok"] and r["captura"]
    carpeta = tmp_path / ".visualizador" / "compartir"
    assert (carpeta / "liquido-ajustes.plantilla").stat().st_size > 0
    assert Image.open(carpeta / "liquido-ajustes.webp").size == (1280, 720)
    assert abiertas == [comunidad.ENVIAR] and lanzadas[0][0] == "explorer"


def test_sin_captura_deja_el_archivo_y_avisa(monkeypatch, tmp_path):
    for captura in ("", "esto-no-es-base64!!", base64.b64encode(b"no es imagen").decode()):
        r, _, _ = preparar(monkeypatch, tmp_path, "ajustes", DATOS, captura)
        assert r["ok"] and r["captura"] is False
    assert not list((tmp_path / ".visualizador" / "compartir").glob("*.webp"))


def test_datos_malos_no_abren_nada(monkeypatch, tmp_path):
    for tipo, datos in (("raro", DATOS), ("ajustes", {"plantilla": "inventada"}), ("plantilla", {"nombre": "x"})):
        r, abiertas, lanzadas = preparar(monkeypatch, tmp_path, tipo, datos, captura_b64())
        assert not r["ok"] and r["error"] and not abiertas and not lanzadas
