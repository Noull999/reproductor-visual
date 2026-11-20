"""Abre la app de verdad, recorre las plantillas y revisa que carguen y suenen."""
import json, threading, time
import webview
import app as A, servidor

api = A.Api()
puerto = servidor.iniciar(api.cfg.get("carpetas") or [])
base = f"http://127.0.0.1:{puerto}"
ventana = webview.create_window("Prueba", f"{base}/inicio.html", js_api=api, width=1280, height=800)

def js(codigo, espera=0):
    time.sleep(espera)
    return ventana.evaluate_js(codigo)

def ir(ruta):
    ventana.load_url(base + ruta); time.sleep(4)

def prueba():
    time.sleep(4)
    print("inicio:", js("document.querySelectorAll('.fuente').length + ' fuentes'"))
    ir("/index.html?fuente=musica")
    js("document.querySelectorAll('#carpetas button')[1].click()", espera=2)
    print("carpeta guardada:", js("sessionStorage.getItem('carpeta')"))
    ir("/oscuro.html?fuente=musica")
    print("mi música:", js("JSON.stringify({pistas: R.pistas.length, titulo: document.getElementById('titulo').textContent, artista: document.getElementById('artista').textContent})", espera=3))
    js("R.cargar(0)")
    print("sonando:", js("JSON.stringify({t: R.audio.currentTime.toFixed(1), pausado: R.audio.paused, espectro: Math.max(...R.espectro())})", espera=5))
    ir("/liquido.html?fuente=soundcloud")
    js("R.cargar(3)")
    for s_ in (3, 6, 12):
        print(f"líquido a los {s_}s:", js("JSON.stringify({t: R.audio.currentTime.toFixed(1), pausado: R.audio.paused, artista: document.getElementById('artista').textContent})", espera=3 if s_==3 else s_-{6:3,12:6}[s_]))
    ventana.destroy()

threading.Thread(target=prueba, daemon=True).start()
webview.start()
