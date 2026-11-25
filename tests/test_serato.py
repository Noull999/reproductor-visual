"""Serato: la última canción cargada, leída del registro (sin tocar nada de Serato)."""
import os
import time

import fuentes.serato as serato


def _log(carpeta, nombre, lineas, antiguedad=0):
    f = carpeta / nombre
    f.write_text("\n".join(lineas), encoding="utf-8")
    t = time.time() - antiguedad
    os.utime(f, (t, t))
    return f


def test_toma_la_ultima_cancion_del_registro_mas_nuevo(tmp_path):
    _log(tmp_path, "viejo.log", ["I2026 [View] The cache `D:/Musik/Vieja.mp3` was requested"], antiguedad=500)
    _log(tmp_path, "nuevo.log", ["I2026 [Application] Scratch Bank [ deck 0 ] : Slot is loaded",
                                  "I2026 [View] The cache `D:/Musik/Hardgroove/Uno.mp3` was requested",
                                  "I2026 [View] The cache `D:/Musik/Hardgroove/Kiko Tesla - Dos.mp3` was requested"])
    assert serato.ultima_ruta([tmp_path]) == "D:/Musik/Hardgroove/Kiko Tesla - Dos.mp3"


def test_sin_canciones_o_sin_carpeta(tmp_path):
    assert serato.ultima_ruta([tmp_path / "no-existe"]) is None
    _log(tmp_path, "a.log", ["I2026 [Application] nada que ver"])
    assert serato.ultima_ruta([tmp_path]) is None and serato.estado([tmp_path]) is None


def test_si_el_ultimo_registro_no_tiene_canciones_se_usa_el_anterior(tmp_path):
    _log(tmp_path, "anterior.log", ["[View] The cache `D:/Musik/A - B.mp3` was requested"], antiguedad=300)
    _log(tmp_path, "reciente.log", ["recien abierto, sin canciones"])
    assert serato.ultima_ruta([tmp_path]) == "D:/Musik/A - B.mp3"


def test_estado_usa_el_nombre_del_archivo_si_no_hay_etiquetas(tmp_path):
    _log(tmp_path, "x.log", ["[View] The cache `Z:/no/existe/Kiko Tesla - DESIGNED TO GROOVE.mp3` was requested"])
    serato._cache.update(ruta=None, datos=None)
    e = serato.estado([tmp_path])
    assert e["hay"] and e["app"] == "Serato" and e["artista"] == "Kiko Tesla" and e["titulo"] == "DESIGNED TO GROOVE"
