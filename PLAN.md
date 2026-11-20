# Plan — reproductor visual personalizable

Estado: prototipo de 4 plantillas funcionando con likes de SoundCloud (`prototipo/`).
Este plan se ajusta según prioridades: lo de arriba se hace primero.

## Cómo se usa la app (flujo)

1. **Inicio** — pantalla estilo vidrio (como el portfolio de José): un fondo animado
   que el vidrio desenfoca y deforma. Desde aquí se elige **de dónde suena**:
   - **SoundCloud** — tus likes, suenan dentro de la app (control total).
   - **Mi música** — tus carpetas, suenan dentro de la app (control total).
   - **Lo que suena en el PC** — Spotify o el navegador: la app muestra qué suena y
     tiene ⏮ ⏯ ⏭; los visuales siguen el audio del PC.
2. **Elegir plantilla** — galería con vista previa de cada una.
3. **Reproducción** — la plantilla a pantalla completa o en ventana.
4. **Menú Plantillas** (desde el inicio o la reproducción) — modificar, crear y compartir.

## Fase 1 — La app funcionando de verdad  ← PRIMERO

- [x] Ventana propia (Windows primero), sin depender de Music Downloader (`python app.py`).
- [x] Inicio en vidrio con fondo animado + selector de fuente.
- [x] Fuente **SoundCloud**: lista de likes completa, enlace pedido al tocar (con reintento).
- [ ] Conectar la cuenta desde la app (hoy se importa de Music Downloader).
- [x] Fuente **Mi música**: cada subcarpeta es una lista; audio con avance y carátula del archivo.
- [ ] Elegir las carpetas desde la app (hoy se importan de Music Downloader).
- [x] Fuente **Lo que suena en el PC**: título/carátula/botones de Spotify o el
      navegador (probado con Spotify y SoundCloud del navegador).
- [ ] Captura del audio del PC: hecha, pero salió en silencio en la primera prueba (revisar
      con música sonando; ¿audífonos?).
- [x] Galería para elegir plantilla (5 plantillas).
- [x] **2000s** con capa psicodélica (no solo barras y líneas).
- [ ] Tipografías incluidas (hoy Líquido/inicio las piden a internet y tardan en abrir).

## Fase 2 — Imágenes propias en las plantillas

- [ ] Cada plantilla declara **ranuras** de imagen (fondo, cabeza, botones…) con su
      tamaño recomendado.
- [ ] Subir una imagen a una ranura desde la app (sin tocar carpetas ni código).
      Si la ranura está vacía, se usa el dibujo original.
- [ ] Pensado para imágenes de Higgsfield u otros generadores.

## Fase 3 — Editor de plantillas

- [ ] Modificar: colores, intensidad y velocidad de los visuales, mostrar/ocultar piezas.
- [ ] **Mezclar**: elegir el fondo de una plantilla, el panel de otra y la barra de otra.
- [ ] **Crear la tuya**: partir de una base, guardarla con nombre.
- [ ] **Crear de cero ("skin libre")**, como las skins de Windows Media Player:
      subir una imagen como cuerpo del reproductor (PNG con transparencia) y
      arrastrar encima la pantalla de visuales, los botones, la barra de progreso,
      el título y la carátula. Cada pieza con su tamaño, color y estilo.
      No requiere saber programar: basta con saber hacer o generar la imagen.
- [ ] Límites a propósito: sin código propio (seguridad al compartir); los visuales
      se eligen de una biblioteca (barras, ondas, túnel, haz, partículas…) y se ajustan.
- [ ] *(Más adelante, si hace falta)* modo avanzado con visuales programables en un
      entorno aislado.

## Fase 4 — Compartir creaciones

- [ ] Exportar una plantilla como **un archivo** (configuración + imágenes) para
      pasarla por WhatsApp, Discord, etc.
- [ ] Importar plantillas de otros.
- [ ] *(Más adelante, solo si hay usuarios)* galería online. Implica servidor,
      moderación y revisar derechos de las imágenes que suba la gente.

## Después / ideas sueltas

- Versión Mac (lo de "lo que suena en el PC" se hace distinto ahí).
- Modo fondo de escritorio real (detrás de los íconos).
- Letras de las canciones.

## Decisiones pendientes

- Nombre de la app.
- Link del portfolio de José, para copiar el estilo vidrio.
- Si la app es gratuita (como Music Downloader) o no.

## Aprendido en el prototipo

- SoundCloud solo da streaming HLS (AAC 160 kbps); se reproduce con hls.js y el
  análisis del audio funciona (CORS abierto).
- Los enlaces dicen durar ~2 horas, pero al pedir enlaces nuevos de un tema los
  anteriores dejan de servir (403). En la app: pedir el enlace al momento de tocar.
- SoundCloud entrega la forma de onda real de cada tema (1.800 puntos).
- Windows informa qué suena en SoundCloud del navegador (título, artista, carátula,
  ⏮ ⏯ ⏭, barra). Falta probar Spotify y la captura del audio del PC.

## Cuidados

- Sin imágenes ni íconos de Microsoft/foobar tal cual; diseños propios o con licencia.
- Las plantillas compartidas no pueden ejecutar código (solo configuración e imágenes),
  para que una plantilla ajena no sea un riesgo.
