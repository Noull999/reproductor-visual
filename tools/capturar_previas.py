"""
Genera las vistas previas de la Biblioteca (web/img/previas/*.webp): abre la app de verdad con las
carátulas pixeladas, recorre cada plantilla y cada variante de color, y saca una captura de cada una.

    python tools/capturar_previas.py            (todas)
    python tools/capturar_previas.py pixel      (solo las de una o más páginas)

Necesita Windows y la cuenta de SoundCloud conectada. La ventana pasa por la pantalla unos minutos.
"""
import ctypes
import ctypes.wintypes as wt
import os
import sys
import threading
import time
from pathlib import Path

os.environ["VISUALIZADOR_VISTA_PREVIA"] = "1"   # antes de importar app: las carátulas salen pixeladas
RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
ctypes.windll.user32.SetProcessDPIAware()

import webview  # noqa: E402
from PIL import ImageGrab  # noqa: E402

import app as A  # noqa: E402
import servidor  # noqa: E402

SALIDA = RAIZ / "web" / "img" / "previas"
ANCHO_FINAL = 1000

# (página, selector que elige la variante, nombre del archivo)
ESCENAS = (
    [("liquido", f'#temas [data-t="{t}"]', f"liquido-{n}") for t, n in
     (("Rojo", "rojo"), ("Hielo", "hielo"), ("Violeta", "violeta"), ("Ácido", "acido"), ("Oro", "oro"))]
    + [("headspace", (cuerpo, color), f"headspace-{cuerpo.lower()}-{color.lower()}")
       for cuerpo in ("Y2K", "Gel") for color in ("Lima", "Chicle", "Cielo", "Mandarina", "Cromo")]
    + [("dosmil", f'#skins [data-s="{s}"]', f"dosmil-{n}") for s, n in
       (("Plata", "plata"), ("Grafito", "grafito"), ("LCD verde", "lcd-verde"), ("Azul", "azul"))]
    + [("ambiente", f'#temas [data-t="{t}"]', f"ambiente-{n}") for t, n in
       (("Carátula", "caratula"), ("Noche", "noche"), ("Atardecer", "atardecer"), ("Bosque", "bosque"), ("Mono", "mono"))]
    + [("pixel", f'#paletas [data-p="{p}"]', f"pixel-{n}") for p, n in
       (("Sangre", "sangre"), ("Game Boy", "game-boy"), ("NES", "nes"), ("Vaporwave", "vaporwave"),
        ("Matrix", "matrix"), ("Hielo", "hielo"), ("Ámbar", "ambar"))]
)

ESCENAS = [e for e in ESCENAS if not sys.argv[1:] or e[0] in sys.argv[1:]]   # python tools/capturar_previas.py pixel  -> solo esas

api = A.Api()
puerto = servidor.iniciar(api.cfg.get("carpetas") or [])
base = f"http://127.0.0.1:{puerto}"
ventana = webview.create_window("CapturaApp", f"{base}/inicio.html", js_api=api, width=1440, height=860, x=40, y=20, on_top=True)


def js(codigo, espera=0.0):
    time.sleep(espera)
    return ventana.evaluate_js(codigo)


def area_cliente():
    u = ctypes.windll.user32
    h = u.FindWindowW(None, "CapturaApp")
    r, p = wt.RECT(), wt.POINT(0, 0)
    u.GetClientRect(h, ctypes.byref(r))
    u.ClientToScreen(h, ctypes.byref(p))
    return (p.x, p.y, p.x + r.right, p.y + r.bottom)


def foto(nombre):
    ventana.restore()
    ventana.on_top = True
    time.sleep(1.2)
    img = ImageGrab.grab(bbox=area_cliente()).convert("RGB")
    img = img.crop((0, 0, img.width, img.height - 16))   # la ventana deja una franja negra abajo
    img = img.resize((ANCHO_FINAL, round(img.height * ANCHO_FINAL / img.width)))
    img.save(SALIDA / f"{nombre}.webp", "WEBP", quality=80, method=6)
    print("ok", nombre, flush=True)


def correr():
    try:
        SALIDA.mkdir(parents=True, exist_ok=True)
        time.sleep(4)
        pagina_actual = None
        for pagina, eleccion, nombre in ESCENAS:
            if pagina != pagina_actual:
                ventana.load_url(f"{base}/{pagina}.html?fuente=soundcloud&mudo=1")   # mudo=1: no suena nada
                time.sleep(4)
                js("R.cargar(2)", 0)
                time.sleep(9)
                pagina_actual = pagina
            if isinstance(eleccion, tuple):   # Headspace: cuerpo y color
                js(f"document.querySelector('#cuerpos [data-c=\"{eleccion[0]}\"]').click()")
                js(f"document.querySelector('#colores [data-c=\"{eleccion[1]}\"]').click()", 0.3)
            else:
                js(f"document.querySelector('{eleccion}').click()")
            time.sleep(2.2)
            foto(nombre)
    except BaseException:
        import traceback
        traceback.print_exc()
    finally:
        ventana.destroy()


threading.Thread(target=correr, daemon=True).start()
webview.start()
