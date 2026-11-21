"""Las 5 plantillas incluidas, hechas de piezas, deben pasar siempre el validador de Python (misma fuente: web/esquema.js)."""
import json
import shutil
import subprocess
from pathlib import Path

import pytest

import plantillas as P

WEB = Path(__file__).resolve().parent.parent / "web"
pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="hace falta Node para leer las bases del editor")


def bases_del_editor(tmp_path):
    js = tmp_path / "dump.js"
    js.write_text("""
const fs = require("fs"), web = process.argv[2];
global.localStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; } };
eval(fs.readFileSync(web + "/esquema.js", "utf8").replace(/^const ESQUEMA/m, "global.ESQUEMA"));
eval(fs.readFileSync(web + "/plantillas-propias.js", "utf8").replace(/^const Propias/m, "global.Propias"));
const salida = {};
for (const id of Object.keys(Propias.INCLUIDAS)) salida[id] = Propias.desdeBase(id);
for (const id of Object.keys(Propias.BASES)) salida["libre-" + id] = Propias.nueva(id);
console.log(JSON.stringify(salida));
""", encoding="utf-8")
    return json.loads(subprocess.run(["node", str(js), str(WEB)], capture_output=True, text=True, check=True).stdout)


def test_todas_las_bases_pasan_el_validador(tmp_path):
    specs = bases_del_editor(tmp_path)
    assert set(specs) >= {"liquido", "headspace", "dosmil", "ambiente", "pixel"}
    for nombre, spec in specs.items():
        limpia = P.validar(spec, "exportar")
        assert len(limpia["piezas"]) == len(spec["piezas"]), nombre
        assert limpia["base"] == spec["base"]


def test_las_bases_incluidas_cumplen_sus_propias_reglas(tmp_path):
    specs = bases_del_editor(tmp_path)
    exigidas = {"liquido": {"titulo", "botones", "barra"}, "headspace": {"cabeza"}, "dosmil": {"equipo"}, "ambiente": {"titulo", "botones", "barra"}, "pixel": {"titulo", "botones", "barra"}}
    for nombre, tipos in exigidas.items():
        assert tipos <= {p["tipo"] for p in specs[nombre]["piezas"]}, nombre
