"""Comunidad: lo que llega de internet se trata como no confiable."""
import json

import pytest
import requests

import comunidad as C


def entrada(**cambios):
    e = {"id": "liquido-atardecer", "nombre": "Líquido atardecer", "autor": "Ana", "descripcion": "Naranja", "tipo": "ajustes", "base": "liquido", "fecha": "2026-11-24"}
    e.update(cambios)
    return e


def catalogo(*entradas, version=1):
    return {"version": version, "plantillas": list(entradas)}


def test_catalogo_bueno():
    sal = C.limpiar_catalogo(catalogo(entrada(), entrada(id="otra", tipo="plantilla", base="", fecha="")))
    assert [e["id"] for e in sal] == ["liquido-atardecer", "otra"] and sal[0]["autor"] == "Ana"


@pytest.mark.parametrize("malo", [None, [], {"version": 2, "plantillas": []}, {"version": 1}, {"version": 1, "plantillas": "x"}])
def test_catalogo_con_formato_malo(malo):
    with pytest.raises(C.ErrorComunidad):
        C.limpiar_catalogo(malo)


@pytest.mark.parametrize("cambio", [
    {"id": "../../config"}, {"id": "Con Mayusculas"}, {"id": "a" * 41}, {"id": ""}, {"id": 5}, {"nombre": ""}, {"nombre": 7}, {"autor": ""},
    {"tipo": "script"}, {"base": "x/y"}, {"base": "a" * 30}, {"fecha": "ayer"}, {"fecha": 20261124},
])
def test_se_descarta_la_entrada_mala_y_se_conserva_el_resto(cambio):
    sal = C.limpiar_catalogo(catalogo(entrada(**cambio), entrada(id="buena")))
    assert [e["id"] for e in sal] == ["buena"]


def test_repetidos_largos_y_extras():
    sal = C.limpiar_catalogo(catalogo(entrada(id="x"), entrada(id="x"), entrada(id="y", nombre="n" * 100, descripcion="d" * 999, url="http://malo")))
    assert [e["id"] for e in sal] == ["x", "y"] and len(sal[1]["nombre"]) == 40 and len(sal[1]["descripcion"]) == 200 and "url" not in sal[1]


def test_catalogo_demasiado_grande_se_recorta():
    assert len(C.limpiar_catalogo(catalogo(*[entrada(id=f"p{i}") for i in range(C.MAX_ENTRADAS + 50)]))) == C.MAX_ENTRADAS


def test_descargar_solo_ids_validos(monkeypatch):
    pedidas = []
    monkeypatch.setattr(C, "_pedir", lambda url, maximo: pedidas.append((url, maximo)) or b"zip")
    assert C.descargar("liquido-atardecer") == b"zip"
    assert pedidas == [(f"{C.BASE}/plantillas/liquido-atardecer.plantilla", C.MAX_PLANTILLA)]
    for malo in ["../x", "a/b", "A", "", "http://malo.com/x", None, "x" * 41]:
        with pytest.raises(C.ErrorComunidad):
            C.descargar(malo)
    assert len(pedidas) == 1   # lo malo ni siquiera sale a internet


def test_catalogo_lee_json_y_rechaza_basura(monkeypatch):
    monkeypatch.setattr(C, "_pedir", lambda url, maximo: json.dumps(catalogo(entrada())).encode())
    assert C.catalogo()[0]["id"] == "liquido-atardecer"
    monkeypatch.setattr(C, "_pedir", lambda url, maximo: b"<html>no es json</html>")
    with pytest.raises(C.ErrorComunidad):
        C.catalogo()


class Respuesta:
    def __init__(self, estado=200, trozos=()):
        self.status_code, self._t = estado, trozos
    def __enter__(self): return self
    def __exit__(self, *a): return False
    def iter_content(self, n): return iter(self._t)


def test_pedir_tope_de_tamano_estado_y_red(monkeypatch):
    vistos = {}
    def falso(url, **kw):
        vistos.update(kw); return Respuesta(trozos=[b"x" * 600, b"x" * 600])
    monkeypatch.setattr(C.requests, "get", falso)
    with pytest.raises(C.ErrorComunidad, match="grande"):
        C._pedir("https://x", 1000)
    assert C._pedir("https://x", 5000) == b"x" * 1200
    assert vistos["allow_redirects"] is False and vistos["timeout"] == C.TIEMPO and vistos["stream"] is True
    monkeypatch.setattr(C.requests, "get", lambda url, **kw: Respuesta(estado=404))
    with pytest.raises(C.ErrorComunidad):
        C._pedir("https://x", 10)
    def sin_red(url, **kw): raise requests.ConnectionError("sin red")
    monkeypatch.setattr(C.requests, "get", sin_red)
    with pytest.raises(C.ErrorComunidad, match="conectar"):
        C._pedir("https://x", 10)


def test_usuario_de_github_y_origen_de_las_imagenes():
    sal = C.limpiar_catalogo(catalogo(entrada(github="ana-gh", imagenes={"origen": "ia", "detalle": "Higgsfield"}),
                                      entrada(id="b", github="<script>", imagenes={"origen": "robado"}), entrada(id="c")))
    assert sal[0]["github"] == "ana-gh" and sal[0]["imagenes"] == {"origen": "ia", "detalle": "Higgsfield"}
    assert sal[1]["github"] == "" and sal[1]["imagenes"] is None      # lo raro se descarta, la entrada se conserva
    assert sal[2]["github"] == "" and sal[2]["imagenes"] is None
