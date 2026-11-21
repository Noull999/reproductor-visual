"""
Lo que suena en el PC (Spotify, el navegador…): lo que informa Windows y la
captura del audio que sale por los parlantes, para que los visuales reaccionen.
Solo Windows.
"""
import asyncio
import base64
import logging
import threading
import time

logger = logging.getLogger(__name__)
BINS = 512   # mismo formato que el analizador de la página: 512 valores 0..255
PISO_DB = -90.0   # bajo esto es silencio o ruido: la ganancia automática no lo amplifica
RANGO_DB = 65.0
BAJADA_DB = 0.04  # cuánto baja el techo por lectura (~2 dB/s): se adapta a temas más bajos


def escalar(db, techo):
    """Ganancia automática: el pico reciente queda cerca de 243 (como el analizador del
    navegador con un tema fuerte), sin importar el volumen de Windows o de la app.
    Devuelve (valores 0..255, techo nuevo)."""
    import numpy as np
    pico = float(np.percentile(db[1:300], 99))
    if pico < PISO_DB:   # silencio o ruido: no hay música que mostrar
        return np.zeros_like(db), techo
    techo = max(pico, techo - BAJADA_DB, PISO_DB)
    return np.clip((db - (techo - RANGO_DB + 3)) / RANGO_DB * 255, 0, 255), techo


def _correr(coro):
    return asyncio.run(coro)


async def _sesion():
    from winrt.windows.media.control import GlobalSystemMediaTransportControlsSessionManager as M
    return (await M.request_async()).get_current_session()


async def _estado() -> dict:
    s = await _sesion()
    if s is None:
        return {"hay": False}
    p = await s.try_get_media_properties_async()
    info, tl = s.get_playback_info(), s.get_timeline_properties()
    caratula = ""
    if p.thumbnail:
        try:
            from winrt.windows.storage.streams import Buffer, InputStreamOptions
            flujo = await p.thumbnail.open_read_async()
            buf = Buffer(flujo.size)
            await flujo.read_async(buf, flujo.size, InputStreamOptions.READ_AHEAD)
            caratula = "data:image/jpeg;base64," + base64.b64encode(bytes(memoryview(buf))).decode()
        except Exception:
            logger.debug("Sin carátula legible", exc_info=True)
    sonando = int(info.playback_status) == 4
    pos = tl.position.total_seconds()
    if sonando:   # Windows solo actualiza la posición de vez en cuando: se estima
        pos += max(0.0, time.time() - tl.last_updated_time.timestamp())
    return {"hay": True, "app": s.source_app_user_model_id.split("!")[-1].split(".")[0],
            "titulo": p.title, "artista": p.artist, "caratula": caratula, "sonando": sonando,
            "posicion": pos, "duracion": tl.end_time.total_seconds()}


def estado() -> dict:
    try:
        return _correr(_estado())
    except Exception as e:
        logger.exception("No se pudo leer qué suena")
        return {"hay": False, "error": str(e)[:150]}


def control(accion: str) -> bool:
    async def hacer():
        s = await _sesion()
        if s is None:
            return False
        if accion == "alternar":
            return await s.try_toggle_play_pause_async()
        if accion == "siguiente":
            return await s.try_skip_next_async()
        if accion == "anterior":
            return await s.try_skip_previous_async()
        return False
    try:
        return bool(_correr(hacer()))
    except Exception:
        logger.exception("No se pudo controlar la reproducción")
        return False


class Captura:
    """Escucha el audio de la salida por defecto y deja el último espectro listo."""

    def __init__(self):
        self.espectro = [0] * BINS
        self.dispositivo = ""
        self.error = ""
        self._hilo = None

    def iniciar(self):
        if self._hilo is None:
            self._hilo = threading.Thread(target=self._bucle, daemon=True)
            self._hilo.start()

    def _abrir(self):
        """(Re)detecta la salida por defecto de Windows y abre su loopback. Un PyAudio nuevo
        cada vez: el anterior no se entera si cambias de parlantes a audífonos."""
        import pyaudiowpatch as pyaudio
        pa = pyaudio.PyAudio()
        disp = pa.get_device_info_by_index(pa.get_default_wasapi_loopback()["index"])
        canales, tasa = int(disp["maxInputChannels"]), int(disp["defaultSampleRate"])
        flujo = pa.open(format=pyaudio.paFloat32, channels=canales, rate=tasa, input=True,
                        input_device_index=disp["index"], frames_per_buffer=1024)
        return pa, flujo, canales, disp["name"]

    def _cerrar(self, pa, flujo):
        for cerrar in (flujo.stop_stream, flujo.close, pa.terminate):
            try:
                cerrar()
            except Exception:
                pass

    def _bucle(self):
        import numpy as np
        try:
            pa, flujo, canales, self.dispositivo = self._abrir()
        except Exception as e:
            self.error = f"No hay salida de audio para escuchar: {e}"
            return
        ventana, previo, techo = np.hanning(BINS * 2), np.zeros(BINS), PISO_DB
        memoria = np.zeros(BINS * 2, dtype=np.float32)
        sin_senal = time.time()
        while True:
            try:
                datos = np.frombuffer(flujo.read(1024, exception_on_overflow=False), dtype=np.float32)
            except Exception as e:
                self.error = str(e)
                time.sleep(0.5)
                continue
            if datos.size and np.abs(datos).max() > 1e-5:
                sin_senal = time.time()
            elif time.time() - sin_senal > 4:   # silencio sostenido: quizá cambió la salida de audio
                sin_senal = time.time()
                try:
                    nuevos = self._abrir()
                    self._cerrar(pa, flujo)
                    pa, flujo, canales, self.dispositivo = nuevos
                    self.error = ""
                except Exception as e:
                    self.error = f"No hay salida de audio para escuchar: {e}"
                continue
            mono = datos.reshape(-1, canales).mean(axis=1)
            memoria = np.concatenate([memoria, mono])[-BINS * 2:]
            mag = np.abs(np.fft.rfft(memoria * ventana))[:BINS] / BINS
            valor, techo = escalar(20 * np.log10(mag + 1e-12), techo)
            previo = previo * 0.8 + valor * 0.2
            self.espectro = previo.astype(int).tolist()
