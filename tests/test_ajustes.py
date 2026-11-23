"""Compartir los ajustes de una plantilla incluida: lo que entra de fuera se valida y nunca ejecuta nada."""
import io
import json
import zipfile

import pytest
from PIL import Image

import ajustes as A
import plantillas as P

ZONAS = {"pantalla": [20, 20, 50, 40], "botones": [30, 10, 30, 6], "barra": [30, 64, 30, 4], "boca": [40, 80, 14, 5],
         "ojos": [[24, 70, 15, 7], [61, 70, 15, 7]], "parlantes": [[5, 30, 11, 32], [83, 30, 11, 32]]}


def webp(carpeta, nombre, modo="RGB"):
    Image.new(modo, (60, 40), (200, 30, 90)).save(carpeta / nombre, "WEBP")


def datos(**cambios):
    d = {"plantilla": "liquido", "variante": {"tema-liquido": "Propio"},
         "props": {"intensidad": 70, "velocidad": 30, "lista": False, "soloVisual": True, "colorLibre": "#ff7a00", "extra": {"deformacion": 90}}}
    d.update(cambios)
    return d


def zip_con(manifest, extra=()):
    m = io.BytesIO()
    with zipfile.ZipFile(m, "w") as z:
        z.writestr("manifest.json", json.dumps(manifest))
        for n, b in extra:
            z.writestr(n, b)
    return m.getvalue()


def test_ida_y_vuelta_con_fondo_y_cuerpo(tmp_path):
    origen, destino = tmp_path / "origen", tmp_path / "destino"
    origen.mkdir()
    webp(origen, "headspace-fondo.webp"); webp(origen, "headspace-cuerpo.webp", "RGBA")
    d = datos(plantilla="headspace", variante={"cuerpo-headspace": "Propio", "color-headspace": "Cielo"},
              props={"fondo": "/imagen?n=headspace-fondo.webp&v=1", "cuerpo": {"imagen": "/imagen?n=headspace-cuerpo.webp&v=2", "zonas": ZONAS}, "colorLibre": ""})
    sal = A.desempaquetar(A.empaquetar(json.dumps(d), origen), destino)
    assert sal["plantilla"] == "headspace" and sal["variante"]["color-headspace"] == "Cielo"
    assert sal["props"]["fondo"].startswith("/imagen?n=headspace-fondo.webp") and sal["props"]["cuerpo"]["imagen"].startswith("/imagen?n=headspace-cuerpo.webp")
    assert sal["props"]["cuerpo"]["zonas"]["ojos"][1] == [61, 70, 15, 7]
    assert (destino / "headspace-fondo.webp").is_file() and (destino / "headspace-cuerpo.webp").is_file()


def test_sin_imagenes_y_con_color_propio(tmp_path):
    sal = A.desempaquetar(A.empaquetar(json.dumps(datos()), tmp_path), tmp_path / "x")
    assert sal["props"]["colorLibre"] == "#ff7a00" and sal["props"]["fondo"] == "" and sal["props"]["extra"] == {"deformacion": 90}
    assert not (tmp_path / "x").exists()   # sin imágenes no se toca el disco


def test_un_video_de_fondo_no_se_comparte(tmp_path):
    d = datos(props={"fondo": "/imagen?n=liquido-fondo.mp4&v=1"})
    assert A.desempaquetar(A.empaquetar(json.dumps(d), tmp_path), tmp_path / "x")["props"]["fondo"] == ""


@pytest.mark.parametrize("malo", [
    datos(plantilla="otra"), datos(plantilla="../x"), datos(variante={"clave-rara": "x"}), datos(variante={"tema-liquido": "a<script>"}),
    datos(variante={"tema-liquido": 3}), datos(props={"colorLibre": "rojo"}), datos(props={"colorLibre": "#ff7a00; x"}),
    datos(props={"extra": {"a b": 1}}), datos(props={"extra": {"x": "1"}}), datos(props={"intensidad": "alta"}),
    datos(props={"cuerpo": {"zonas": ZONAS}}),                                  # solo Headspace admite cuerpo
    datos(plantilla="headspace", variante={}, props={"cuerpo": {"zonas": {"pantalla": [1, 2]}}}),
    datos(plantilla="psicodelico", variante={"color-psicodelico": "violeta"}),
])
def test_rechaza_lo_malo(malo):
    with pytest.raises(P.PlantillaInvalida):
        A.validar(malo)


def test_numeros_se_acotan():
    sal = A.validar(datos(props={"intensidad": 5000, "velocidad": -4}))
    assert sal["props"]["intensidad"] == 100 and sal["props"]["velocidad"] == 0


def test_archivos_ajenos_no_pasan(tmp_path):
    bueno = {"formato": A.FORMATO, "version": A.VERSION, **A.validar(datos())}
    for z in (b"no es un zip", zip_con({"formato": "otro", "version": 1}), zip_con({**bueno, "version": 99}), zip_con(bueno, [("../fuera.txt", b"x")]),
              zip_con(bueno, [("imagenes/otra.webp", b"x")]), zip_con({**bueno, "props": {**bueno["props"], "fondo": True}})):   # promete un fondo y no lo trae
        with pytest.raises(P.PlantillaInvalida):
            A.desempaquetar(z, tmp_path)


def test_imagen_corrupta_no_deja_nada(tmp_path):
    bueno = {"formato": A.FORMATO, "version": A.VERSION, **A.validar(datos(props={"fondo": "/imagen?n=liquido-fondo.webp&v=1"}))}
    with pytest.raises(P.PlantillaInvalida):
        A.desempaquetar(zip_con(bueno, [("imagenes/fondo.webp", b"esto no es una imagen")]), tmp_path / "x")
    assert not (tmp_path / "x").exists() or not list((tmp_path / "x").iterdir())


def test_distingue_ajustes_de_plantillas():
    assert A.es_de_ajustes(zip_con({"formato": A.FORMATO})) and not A.es_de_ajustes(zip_con({"formato": P.FORMATO})) and not A.es_de_ajustes(b"basura")
    with pytest.raises(P.PlantillaInvalida):   # y el importador de plantillas del Editor no los acepta
        P.desempaquetar(zip_con({"formato": A.FORMATO, "version": 1}), "pabc", __import__("pathlib").Path("."))
