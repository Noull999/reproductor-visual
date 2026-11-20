"""
Prueba de "Lo que suena en el PC": qué informa Windows (Spotify, navegador…)
y si se puede capturar el audio de los parlantes para mover los visuales.
Uso: pon música en Spotify y corre  python prueba_spotify.py
"""
import asyncio
import time

import numpy as np
import pyaudiowpatch as pyaudio
from winrt.windows.media.control import GlobalSystemMediaTransportControlsSessionManager as M


async def que_suena():
    for s in (await M.request_async()).get_sessions():
        p = await s.try_get_media_properties_async()
        c = s.get_playback_info().controls
        print(f"- {s.source_app_user_model_id}: {p.artist!r} — {p.title!r} | carátula: {'sí' if p.thumbnail else 'no'}"
              f" | ⏯ {c.is_pause_enabled or c.is_play_enabled} ⏭ {c.is_next_enabled} ⏮ {c.is_previous_enabled}")


def capturar(segundos=3):
    pa = pyaudio.PyAudio()
    try:
        salida = pa.get_device_info_by_index(pa.get_default_wasapi_loopback()["index"])
    except Exception as e:
        print("No hay dispositivo de captura del audio del PC:", e)
        return
    print("Capturando:", salida["name"])
    canales, tasa = int(salida["maxInputChannels"]), int(salida["defaultSampleRate"])
    flujo = pa.open(format=pyaudio.paFloat32, channels=canales, rate=tasa, input=True,
                    input_device_index=salida["index"], frames_per_buffer=1024)
    fin, bloques = time.time() + segundos, []
    while time.time() < fin:
        datos = np.frombuffer(flujo.read(1024, exception_on_overflow=False), dtype=np.float32)
        bloques.append(datos)
    flujo.close(); pa.terminate()
    audio = np.concatenate(bloques).reshape(-1, canales).mean(axis=1)
    espectro = np.abs(np.fft.rfft(audio[-2048:] * np.hanning(2048)))
    bajos = espectro[1:12].mean()
    print(f"nivel medio: {np.abs(audio).mean():.4f} | energía de bajos: {bajos:.2f}"
          f" → {'HAY sonido: los visuales pueden reaccionar' if np.abs(audio).mean() > 0.001 else 'silencio (¿está sonando algo?)'}")


asyncio.run(que_suena())
capturar()
