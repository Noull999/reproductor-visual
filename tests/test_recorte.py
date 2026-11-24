"""Quitar fondo: sin el complemento da un aviso claro; con él devuelve un WebP transparente recortado a lo que quedó."""
import io
import sys
import types

import pytest
from PIL import Image

import recorte


def png(w=120, h=80):
    b = io.BytesIO(); Image.new("RGB", (w, h), (200, 30, 90)).save(b, "PNG"); return b.getvalue()


def test_sin_complemento_avisa(monkeypatch):
    monkeypatch.setattr(recorte, "disponible", lambda: False)
    with pytest.raises(recorte.RecorteNoDisponible, match="requirements-recorte"):
        recorte.quitar_fondo(png())


def test_con_complemento_recorta(monkeypatch):
    falso = types.ModuleType("rembg")
    def remove(im, session=None, post_process_mask=False):   # deja opaco solo un cuadrado del centro
        out = im.copy(); a = Image.new("L", im.size, 0); a.paste(255, (40, 20, 80, 60)); out.putalpha(a); return out
    falso.remove, falso.new_session = remove, lambda nombre: "sesion"
    monkeypatch.setitem(sys.modules, "rembg", falso)
    monkeypatch.setattr(recorte, "disponible", lambda: True)
    monkeypatch.setattr(recorte, "_sesion", None)
    im = Image.open(io.BytesIO(recorte.quitar_fondo(png())))
    assert im.format == "WEBP" and im.size == (40, 40)   # recortado a lo que quedó (40×40)
