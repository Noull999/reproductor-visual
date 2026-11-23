"""Importador de skins de Winamp (.wsz): solo lee piezas conocidas, las re-guarda como PNG y nunca escribe fuera de su carpeta."""
import io
import json
import zipfile

import pytest
from PIL import Image

import skins


@pytest.fixture(autouse=True)
def carpeta(tmp_path, monkeypatch):
    monkeypatch.setattr(skins, "CARPETA", tmp_path / "skins")
    return tmp_path / "skins"


def bmp(w=275, h=116):
    b = io.BytesIO(); Image.new("RGB", (w, h), (10, 20, 30)).save(b, "BMP"); return b.getvalue()


def wsz(archivos):
    b = io.BytesIO()
    with zipfile.ZipFile(b, "w") as z:
        for nombre, datos in archivos.items():
            z.writestr(nombre, datos)
    return b.getvalue()


def test_importa_piezas_colores_y_region(carpeta):
    datos = wsz({"Mi Skin/MAIN.BMP": bmp(), "cbuttons.bmp": bmp(136, 36), "otra_cosa.exe": b"MZ",
                 "pledit.txt": '[Text]\r\nNormal="#00FF00"\r\nCurrent=#ffffff\r\nSelectedBG=zz\r\nFont=Arial\r\n',
                 "viscolor.txt": "0,0,0\n24,33,41 // puntos\n",
                 "region.txt": "[Normal]\nNumPoints=4\nPointList=0,0, 275,0, 275,116, 0,116\n"})
    m = skins.importar(datos, "Mi skin")
    assert m["piezas"] == ["cbuttons", "main"]
    assert m["pledit"] == {"normal": "#00ff00", "current": "#ffffff", "font": "Arial"}   # el color inválido se descarta
    assert m["vis"] == [[0, 0, 0], [24, 33, 41]]
    assert m["region"] == [[[0, 0], [275, 0], [275, 116], [0, 116]]]
    hechos = sorted(p.name for p in (carpeta / m["id"]).iterdir())
    assert hechos == ["cbuttons.png", "main.png", "skin.json"]   # nada del zip se guarda tal cual (ni el .exe)
    assert json.loads((carpeta / m["id"] / "skin.json").read_text(encoding="utf-8"))["nombre"] == "Mi skin"
    assert skins.listar()[0]["id"] == m["id"]


def test_rutas_raras_no_salen_de_la_carpeta(carpeta, tmp_path):
    m = skins.importar(wsz({"../../fuera/main.bmp": bmp()}), "x")
    assert (carpeta / m["id"] / "main.png").is_file()
    assert not (tmp_path / "fuera").exists()


@pytest.mark.parametrize("datos, texto", [(b"no soy un zip", "No es un skin"), (wsz({"text.bmp": bmp(155, 18)}), "main.bmp")])
def test_rechaza_lo_que_no_es_un_skin(datos, texto, carpeta):
    with pytest.raises(skins.SkinInvalido, match=texto):
        skins.importar(datos, "x")
    assert not any(carpeta.glob("*/skin.json"))


def test_bmp_dañado_no_deja_restos(carpeta):
    with pytest.raises(skins.SkinInvalido):
        skins.importar(wsz({"main.bmp": b"BM roto"}), "x")
    assert not carpeta.exists() or not any(carpeta.iterdir())


@pytest.mark.parametrize("url", ["https://evil.com/skin/0a9ba779cd63d95168fa33486f4bf045/x.wsz", "https://skins.webamp.org/skin/123/x.wsz", "", "file:///c:/x.wsz"])
def test_solo_links_del_museo(url):
    with pytest.raises(skins.SkinInvalido):
        skins.desde_url(url)


def test_link_del_museo_se_reconoce():
    m = skins.URL_MUSEO.match("https://skins.webamp.org/skin/0a9ba779cd63d95168fa33486f4bf045/Neon%20Genesis%20Evangelion%20-%20Luce.wsz")
    assert m and m.group(1) == "0a9ba779cd63d95168fa33486f4bf045"


def test_borrar_ignora_ids_raros(carpeta):
    m = skins.importar(wsz({"main.bmp": bmp()}), "x")
    skins.borrar("../..")
    skins.borrar(m["id"])
    assert not (carpeta / m["id"]).exists()
