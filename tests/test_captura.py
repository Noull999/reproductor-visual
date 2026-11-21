"""La ganancia automática deja la música igual de visible a cualquier volumen y no amplifica el silencio."""
import numpy as np

from fuentes.pc import BINS, PISO_DB, escalar


def _db_de(amplitud):
    t = np.arange(BINS * 2) / 48000
    senal = amplitud * (np.sin(2 * np.pi * 80 * t) + 0.5 * np.sin(2 * np.pi * 1000 * t))
    mag = np.abs(np.fft.rfft(senal * np.hanning(BINS * 2)))[:BINS] / BINS
    return 20 * np.log10(mag + 1e-12)


def _estable(db, vueltas=200):
    techo = PISO_DB
    for _ in range(vueltas):
        valor, techo = escalar(db, techo)
    return valor


def test_volumen_bajo_y_alto_se_ven_igual():
    fuerte, bajo = _estable(_db_de(0.8)), _estable(_db_de(0.03))
    assert fuerte.max() > 200 and bajo.max() > 200
    assert abs(fuerte.max() - bajo.max()) < 10


def test_silencio_queda_en_cero():
    assert _estable(_db_de(0.0)).max() == 0
    assert _estable(_db_de(1e-6)).max() == 0   # ruido muy bajo tampoco se amplifica
