"""Exportar/importar plantillas: lo que entra de fuera se valida campo por campo y nunca ejecuta nada."""
import io
import json
import re
import zipfile
from pathlib import Path

import pytest
from PIL import Image

import plantillas as P

WEB = Path(__file__).resolve().parent.parent / "web"


def base(**cambios):
    spec = {"id": "pabc", "nombre": "Mi plantilla", "fondo": {"tipo": "haz", "color": "#0b0708", "imagen": "", "brillo": 100},
            "estilo": {"panel": "vidrio", "acento": "#ff2d3d", "fuente": "Geist"},
            "piezas": [{"n": "visual1", "tipo": "visual", "x": 30, "y": 16, "w": 40, "h": 40, "visual": "barras", "color": ""},
                       {"n": "titulo1", "tipo": "titulo", "x": 30, "y": 62, "w": 40, "h": 6},
                       {"n": "imagen1", "tipo": "imagen", "x": 5, "y": 5, "w": 20, "h": 30, "imagen": ""}]}
    spec.update(cambios)
    return spec


def zip_con(manifest, extras=None):
    m = io.BytesIO()
    with zipfile.ZipFile(m, "w") as z:
        z.writestr("manifest.json", json.dumps(manifest))
        for nombre, datos in (extras or {}).items():
            z.writestr(nombre, datos)
    return m.getvalue()


def webp(color=(200, 40, 40)):
    b = io.BytesIO()
    Image.new("RGB", (64, 48), color).save(b, "WEBP")
    return b.getvalue()


def manifiesto(spec):
    return {"formato": P.FORMATO, "version": P.VERSION, "plantilla": {k: v for k, v in spec.items() if k != "id"}}


def test_viaje_de_ida_y_vuelta_con_imagenes(tmp_path):
    origen, destino = tmp_path / "origen", tmp_path / "destino"
    origen.mkdir()
    Image.new("RGBA", (80, 60), (10, 200, 30, 120)).save(origen / "pabc-fondo.webp", "WEBP")
    Image.new("RGBA", (50, 50), (200, 10, 30, 120)).save(origen / "pabc-imagen1.webp", "WEBP")
    spec = base(fondo={"tipo": "imagen", "color": "#000000", "imagen": "/imagen?n=pabc-fondo.webp&v=123", "brillo": 90})
    spec["piezas"][2]["imagen"] = "/imagen?n=pabc-imagen1.webp"
    archivo = P.empaquetar(json.dumps(spec), origen)
    nueva = P.desempaquetar(archivo, "pnuevo", destino)
    assert nueva["id"] == "pnuevo" and nueva["nombre"] == "Mi plantilla"
    assert re.fullmatch(r"/imagen\?n=pnuevo-fondo\.webp&v=\d+", nueva["fondo"]["imagen"])
    assert nueva["piezas"][2]["imagen"].startswith("/imagen?n=pnuevo-imagen1.webp")
    assert (destino / "pnuevo-fondo.webp").is_file() and (destino / "pnuevo-imagen1.webp").is_file()
    assert Image.open(destino / "pnuevo-imagen1.webp").mode == "RGBA"   # la transparencia se conserva


@pytest.mark.parametrize("cambio", [
    {"fondo": {"tipo": "javascript:alert(1)", "color": "#000000", "imagen": "", "brillo": 100}},
    {"fondo": {"tipo": "haz", "color": "red; background:url(x)", "imagen": "", "brillo": 100}},
    {"estilo": {"panel": "vidrio", "acento": "#ff2d3d", "fuente": "Arial; x{}"}},
    {"estilo": {"panel": "../x", "acento": "#ff2d3d", "fuente": "Geist"}},
    {"fondo": {"tipo": "imagen", "color": "#000000", "imagen": "https://malo.example/x.png", "brillo": 100}},
    {"fondo": {"tipo": "imagen", "color": "#000000", "imagen": "/imagen?n=../../config.json", "brillo": 100}},
    {"piezas": []},
    {"piezas": "no es una lista"},
    {"piezas": [{"n": "a", "tipo": "script", "x": 0, "y": 0, "w": 10, "h": 10}]},
    {"piezas": [{"n": "lista1", "tipo": "lista", "x": 0, "y": 0, "w": 10, "h": 10}, {"n": "lista2", "tipo": "lista", "x": 0, "y": 0, "w": 10, "h": 10}]},
    {"piezas": [{"n": "a b", "tipo": "titulo", "x": 0, "y": 0, "w": 10, "h": 10}]},
    {"piezas": [{"n": "a", "tipo": "titulo", "x": "0", "y": 0, "w": 10, "h": 10}]},
    {"piezas": [{"n": "v", "tipo": "visual", "x": 0, "y": 0, "w": 10, "h": 10, "visual": "<img onerror=x>"}]},
])
def test_rechaza_lo_que_no_esta_permitido(cambio):
    with pytest.raises(P.PlantillaInvalida):
        P.validar(base(**cambio), "exportar")


def test_demasiadas_piezas():
    piezas = [{"n": f"p{i}", "tipo": "panel", "x": 0, "y": 0, "w": 5, "h": 5} for i in range(P.MAX_PIEZAS + 1)]
    with pytest.raises(P.PlantillaInvalida):
        P.validar(base(piezas=piezas), "exportar")


def test_descarta_campos_desconocidos_y_acota_numeros():
    spec = base(script="alert(1)", evil={"x": 1})
    spec["piezas"][1].update(x=95, w=500, onclick="x()")
    limpia = P.validar(spec, "exportar")
    assert set(limpia) == {"nombre", "base", "fondo", "estilo", "piezas"}
    t = limpia["piezas"][1]
    assert "onclick" not in t and t["x"] + t["w"] <= 100


def test_el_nombre_se_limpia():
    assert P.validar(base(nombre="a\x00b\x1b" + "x" * 100), "exportar")["nombre"] == "ab" + "x" * 38


def test_importar_rechaza_archivos_que_no_son_plantillas(tmp_path):
    for datos in (b"no soy un zip", zip_con({"formato": "otra-cosa", "version": 1}), zip_con({"formato": P.FORMATO, "version": 99, "plantilla": {}})):
        with pytest.raises(P.PlantillaInvalida):
            P.desempaquetar(datos, "p1", tmp_path)


@pytest.mark.parametrize("nombre", ["../afuera.webp", "imagenes/../../x.webp", "app.py", "imagenes/x.exe", "imagenes/sub/a.webp", "C:/x.webp", "imagenes\a.webp"])
def test_importar_rechaza_nombres_de_archivo_raros(tmp_path, nombre):
    spec = base()
    with pytest.raises(P.PlantillaInvalida):
        P.desempaquetar(zip_con(manifiesto(spec), {nombre: b"x"}), "p1", tmp_path)
    assert not list(tmp_path.glob("*"))


def test_importar_rechaza_bomba_de_tamano(tmp_path):
    spec = base()
    with pytest.raises(P.PlantillaInvalida):
        P.desempaquetar(zip_con(manifiesto(spec), {"imagenes/a.webp": b"\0" * (P.MAX_ZIP + 1)}), "p1", tmp_path)


def test_importar_rechaza_imagen_falsa_y_no_deja_basura(tmp_path):
    spec = base(fondo={"tipo": "imagen", "color": "#000000", "imagen": "img:fondo", "brillo": 100})
    with pytest.raises(P.PlantillaInvalida):
        P.desempaquetar(zip_con(manifiesto(spec), {"imagenes/fondo.webp": b"<script>alert(1)</script>"}), "p1", tmp_path)
    assert not list(tmp_path.glob("*.webp"))


def test_importar_rechaza_imagen_que_falta(tmp_path):
    spec = base(fondo={"tipo": "imagen", "color": "#000000", "imagen": "img:fondo", "brillo": 100})
    with pytest.raises(P.PlantillaInvalida):
        P.desempaquetar(zip_con(manifiesto(spec)), "p1", tmp_path)


def test_importar_rechaza_url_de_imagen_en_el_archivo(tmp_path):
    # un archivo ajeno no puede apuntar a una imagen de este equipo ni de internet
    spec = base(fondo={"tipo": "imagen", "color": "#000000", "imagen": "/imagen?n=pabc-fondo.webp", "brillo": 100})
    with pytest.raises(P.PlantillaInvalida):
        P.desempaquetar(zip_con(manifiesto(spec)), "p1", tmp_path)


def test_el_id_siempre_lo_pone_la_app(tmp_path):
    spec = base()
    m = manifiesto(spec)
    m["plantilla"]["id"] = "../../robado"
    assert P.desempaquetar(zip_con(m), "pseguro", tmp_path)["id"] == "pseguro"


def test_el_esquema_es_la_fuente_de_verdad_del_editor():
    js = (WEB / "esquema.js").read_text(encoding="utf-8")
    assert js.count("const ESQUEMA =") >= 1 and P.ESQUEMA["tipos"]["cabeza"]["ids"]
    # todos los tipos del esquema se pueden validar y todos sus enums tienen un predeterminado válido
    for tipo, d in P.ESQUEMA["tipos"].items():
        for clave, o in d["opciones"].items():
            if o["t"] == "enum":
                assert o["def"] in o["v"], (tipo, clave)
        x, y, w, h = d["rect"]
        P.validar(base(piezas=[{"n": "a", "tipo": tipo, "x": x, "y": y, "w": w, "h": h}]), "exportar")


def test_las_opciones_se_acotan_y_las_desconocidas_se_descartan():
    spec = base()
    spec["piezas"] = [{"n": "c", "tipo": "caratula", "x": 5, "y": 5, "w": 20, "h": 30, "inclinacion": 999, "forma": "circulo", "hack": "x", "efecto": "duotono"}]
    c = P.validar(spec, "exportar")["piezas"][0]
    assert c["inclinacion"] == 20 and c["forma"] == "circulo" and c["efecto"] == "duotono" and "hack" not in c and c["borde"] is False


@pytest.mark.parametrize("opcion", [{"forma": "triangulo"}, {"inclinacion": "5"}, {"borde": "si"}])
def test_opciones_invalidas_se_rechazan(opcion):
    spec = base()
    spec["piezas"] = [{"n": "c", "tipo": "caratula", "x": 5, "y": 5, "w": 20, "h": 30, **opcion}]
    with pytest.raises(P.PlantillaInvalida):
        P.validar(spec, "exportar")


def test_piezas_que_cumplen_la_misma_funcion_no_pueden_convivir():
    piezas = [{"n": "a", "tipo": "cabeza", "x": 0, "y": 0, "w": 40, "h": 90}, {"n": "b", "tipo": "titulo", "x": 50, "y": 0, "w": 40, "h": 10}]
    with pytest.raises(P.PlantillaInvalida):
        P.validar(base(piezas=piezas), "exportar")
    # ...pero la cabeza sí convive con lo que ella no cumple
    ok = [{"n": "a", "tipo": "cabeza", "x": 0, "y": 0, "w": 40, "h": 90}, {"n": "b", "tipo": "lista", "x": 50, "y": 0, "w": 40, "h": 50}, {"n": "c", "tipo": "volumen", "x": 50, "y": 60, "w": 20, "h": 5}]
    assert len(P.validar(base(piezas=ok), "exportar")["piezas"]) == 3


def test_base_debe_ser_una_incluida():
    assert P.validar(base(base="headspace"), "exportar")["base"] == "headspace"
    with pytest.raises(P.PlantillaInvalida):
        P.validar(base(base="../../x"), "exportar")


def test_el_degradado_y_el_acento_automatico_se_validan():
    spec = base(fondo={"tipo": "degradado", "color": "#101010", "color2": "#ff00aa", "angulo": 999, "imagen": "", "brillo": 100})
    assert P.validar(spec, "exportar")["fondo"]["angulo"] == 360
    spec = base(estilo={"panel": "vidrio", "acento": "#ff2d3d", "acentoAuto": True, "fuente": "Geist", "deformacion": 70})
    e = P.validar(spec, "exportar")["estilo"]
    assert e["acentoAuto"] is True and e["deformacion"] == 70


def test_el_recorte_de_tu_imagen_se_acota():
    spec = base(fondo={"tipo": "ascii", "color": "#020503", "brillo": 100, "imagenRecIzq": 41, "imagenRecArr": 500, "imagenRecDer": -3, "imagenRecAba": 22})
    f = P.validar(spec, "exportar")["fondo"]
    assert (f["imagenRecIzq"], f["imagenRecArr"], f["imagenRecDer"], f["imagenRecAba"]) == (41, 90, 0, 22)   # se acota a 0..90 %


def test_fondo_milkdrop_se_acepta_y_se_acota():
    spec = base(fondo={"tipo": "milkdrop", "color": "#000000", "brillo": 65, "cambio": 9999, "script": "x"})
    f = P.validar(spec, "exportar")["fondo"]
    assert f["tipo"] == "milkdrop" and f["cambio"] == 120 and "script" not in f   # el cambio se acota al máximo permitido


def test_opciones_nuevas_del_editor_se_validan():
    spec = base()
    spec["piezas"][1].update(efecto="neon", marquesina=False)
    spec["piezas"].append({"n": "barra1", "tipo": "barra", "x": 10, "y": 92, "w": 80, "h": 2.4, "modo": "linea", "grosor": 8, "acento": "#ff3fd8"})
    limpia = {p["n"]: p for p in P.validar(spec, "exportar")["piezas"]}
    assert limpia["titulo1"]["efecto"] == "neon" and limpia["titulo1"]["marquesina"] is False
    assert limpia["barra1"]["acento"] == "#ff3fd8"
    spec["piezas"].append({"n": "lista1", "tipo": "lista", "x": 72, "y": 8, "w": 24, "h": 60, "acento": "javascript:alert(1)"})
    with pytest.raises(P.PlantillaInvalida):   # un color que no es #rrggbb rechaza el archivo
        P.validar(spec, "exportar")


def test_adorno_y_carcasa_se_validan():
    spec = base()
    spec["piezas"] += [{"n": "adorno1", "tipo": "adorno", "x": 5, "y": 5, "w": 20, "h": 20, "forma": "alas", "acabado": "cromo", "puntas": 99, "reaccion": "girar"},
                       {"n": "adorno2", "tipo": "adorno", "x": 60, "y": 5, "w": 20, "h": 20, "forma": "marco"},
                       {"n": "carcasa1", "tipo": "carcasa", "x": 18, "y": 4, "w": 64, "h": 92, "imagen": "", "sombra": False}]
    limpia = {p["n"]: p for p in P.validar(spec, "exportar")["piezas"]}
    assert limpia["adorno1"]["forma"] == "alas" and limpia["adorno1"]["puntas"] == 24 and limpia["carcasa1"]["sombra"] is False
    spec["piezas"].append({"n": "adorno3", "tipo": "adorno", "x": 1, "y": 1, "w": 5, "h": 5, "forma": "<script>"})
    with pytest.raises(P.PlantillaInvalida):
        P.validar(spec, "exportar")
