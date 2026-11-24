"""El kit para crear skins: el skin en blanco tiene que importarse tal cual con todas sus piezas, y las guías salen."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import kit_skin  # noqa: E402
import skins  # noqa: E402


@pytest.fixture(autouse=True)
def carpeta(tmp_path, monkeypatch):
    monkeypatch.setattr(skins, "CARPETA", tmp_path / "skins")


def test_el_skin_en_blanco_se_importa_con_todas_las_piezas(tmp_path):
    kit = kit_skin.escribir(tmp_path / "kit")
    m = skins.importar((kit / "skin-en-blanco.wsz").read_bytes(), "En blanco")
    assert set(m["piezas"]) == set(skins.PIEZAS)   # el kit trae cada pieza que la plantilla sabe leer
    assert m["pledit"]["normal"] == "#7ee8fa" and len(m["vis"]) == 24
    assert (kit / "LEEME.txt").exists() and len(list((kit / "guias").glob("*.png"))) == len(kit_skin.PIEZAS)


def test_las_zonas_caben_en_su_pieza():
    for n, (w, h, _, zonas) in kit_skin.PIEZAS.items():
        for z, (x, y, zw, zh) in zonas.items():
            assert x >= 0 and y >= 0 and x + zw <= w and y + zh <= h, f"{n}: «{z}» se sale de la pieza"
