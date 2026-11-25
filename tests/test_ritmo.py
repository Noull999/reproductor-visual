"""El detector de ritmo (web/ritmo.js) con una canción simulada: cuenta bombos, cajas y la caída. Necesita Node; si no está, se salta."""
import shutil
import subprocess
from pathlib import Path

import pytest


@pytest.mark.skipif(not shutil.which("node"), reason="sin Node")
def test_ritmo_detecta_bombo_caja_y_caida():
    r = subprocess.run(["node", str(Path(__file__).with_name("ritmo_test.js"))], capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr + r.stdout
    assert "ritmo ok" in r.stdout
