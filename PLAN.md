# Plan — reproductor visual personalizable

Estado: prototipo de 4 plantillas funcionando con likes de SoundCloud (`prototipo/`).
Este plan se ajusta según prioridades: lo de arriba se hace primero.

## Cómo se usa la app (flujo)

1. **Inicio** — pantalla estilo vidrio (como el portfolio de José): un fondo animado
   que el vidrio desenfoca y deforma. Desde aquí se elige **de dónde suena** (3 paneles):
   - **Spotify** — tus likes y playlists; suena en tu Spotify de escritorio y la app lo
     controla por la API (Premium). Los visuales siguen el audio del PC.
   - **SoundCloud** — tus likes, suenan dentro de la app (control total).
   - **Mi música** — tus carpetas, suenan dentro de la app (control total).
   - *(enlace chico)* **Otra app** — lo que suena en el PC (navegador, etc.): título,
     carátula y ⏮ ⏯ ⏭ de Windows. Es también el plan B de quien no tenga Premium.
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
- [x] Galería para elegir plantilla (5 plantillas: Líquido, Headspace, 2000s, Ambiente, Pixel).
- [x] **Ambiente** (reemplaza Vidrio y Oscuro): colores sacados de la carátula, carátula en duotono, onda real de SoundCloud.
- [x] **Líquido** pulido: la carátula flota detrás del vidrio, barras de vidrio, mini carátula que gira como vinilo,
      haz que se mece y reacciona a bajos, medios y agudos (anillo en cada golpe), 5 temas de color.
- [x] **Ambiente**: temas "Carátula" (automático) + Noche, Atardecer, Bosque y Mono.
- [x] **Pixel**: 8 bits con 7 paletas a elegir (la carátula se redibuja con los colores de la paleta).
- [x] **2000s** rehecha: equipo de metal con LCD (marquesina, reloj, espectro en segmentos, carátula en trama), perilla de volumen, playlist y 4 skins.
- [x] Tipografías incluidas en `web/fonts/` (Geist, Geist Mono, Pixelify Sans, Silkscreen; licencia OFL).

## Fase 1.5 — Spotify dentro de la app y pulido  ← AHORA

Orden de trabajo (cada paso se prueba en la app antes del siguiente):

1. **Captura del audio del PC** — ✔ arreglada. Causa del silencio: el dispositivo estaba
   bien (parlantes Realtek), pero con el volumen bajo de Windows el sonido caía bajo la
   escala fija del analizador. Ahora la captura usa ganancia automática (`escalar` en
   `fuentes/pc.py`): la música se ve igual a cualquier volumen y el silencio no se amplifica.
   Medido con Spotify sonando: máx 226/255, graves 156, medios 128, agudos 81.
   Pendiente: comprobarlo dentro de una plantilla a la vez que suena Spotify.
2. **Fuente Spotify**
   - [x] Conexión con PKCE (sin secreto), tokens en `~/.visualizador/spotify.json`.
         Probado: lee lo que suena, dispositivos y likes; pausa/reanuda (Premium confirmado).
   - [ ] Botón "Conectar Spotify" en el inicio (primera vez abre el navegador).
   - [ ] Elegir lista como en Mi música: **Tus me gusta** o cada playlist.
   - [ ] En las plantillas: tocar un tema de la lista lo pone en tu Spotify; ⏮ ⏯ ⏭,
         barra (seek) y volumen por la API. Estado y posición desde Windows (sin gastar
         peticiones a la API); si no hay Spotify abierto, avisar.
   - [ ] Inicio con 3 paneles (Spotify, SoundCloud, Mi música) + enlace "otra app".
3. **Todas las plantillas con lista para elegir tema**: Headspace no tiene. Propuesta:
   cajón de gel que se abre desde el lado con un botón "Lista" en la barra de abajo.
4. **Pulido de la revisión** (capturas del 20-11):
   - [ ] Botón "← Plantillas": más contraste y con el estilo de cada plantilla (vidrio,
         gel, metal, serif, pixel).
   - [ ] Líquido: capa oscura detrás de la lista para que el haz no tape los títulos.
   - [ ] 2000s: bajar ~20 % el brillo del centro del túnel (sobre todo Grafito y LCD
         verde); separar "PL" de los skins; un poco más de contraste en PLAY/PAUSA/SC.
   - [ ] Headspace: el título en la pantalla avanza como marquesina solo si no cabe.
   - [ ] Ambiente: que se note más el cambio duotono ↔ original; margen bajo la lista.
   - [ ] Pixel: la lista termina con degradado (no corta una fila a la mitad);
         Game Boy con texto inactivo más claro; miniaturas con borde de la paleta.
   - [ ] Todas: margen inferior + desvanecido al final de cada lista con scroll.
   - [ ] Volumen: clic en el ícono silencia y vuelve; mostrar el % al moverlo.
   - [ ] Inicio: mismas etiquetas en los paneles ("Elegir →").
   - [ ] *(Idea de Gemini)* modo "solo visual": los controles se ocultan tras 3 s sin
         mover el mouse.
5. **Nombre de la app** (decisión de José) → reemplaza "sin nombre aún".

Límite a tener en cuenta: con la API en modo desarrollo, Spotify permite al dueño
(Premium) y hasta 5 usuarios autorizados. Para "la gente" el panel Spotify necesitaría
la cuota ampliada de Spotify (trámite aparte); mientras tanto usan "otra app".

## Fase 2 — Imágenes propias en las plantillas

- [ ] Cada plantilla declara **ranuras** de imagen (fondo, cabeza, botones…) con su
      tamaño recomendado. *(Headspace ya funciona así: el cuerpo es el dibujo o una imagen,
      y la pantalla, botones, ojos, boca y parlantes se ubican por zonas en %.)*
- [x] Headspace: cuerpos "Y2K" (translúcido con circuitos, elegido por José) y "Gel" de video maker; sin el dibujo SVG (WebP en `web/img/headspace/`, PNG originales en `arte/`).
- [ ] Headspace: evaluar un cuerpo distinto por color (~0,09 USD por imagen con video maker).
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
- Si la app es gratuita (como Music Downloader) o no.

## Aprendido en el prototipo

- SoundCloud solo da streaming HLS (AAC 160 kbps); se reproduce con hls.js y el
  análisis del audio funciona (CORS abierto).
- Los enlaces dicen durar ~2 horas, pero al pedir enlaces nuevos de un tema los
  anteriores dejan de servir (403). En la app: pedir el enlace al momento de tocar.
- SoundCloud entrega la forma de onda real de cada tema (1.800 puntos).
- Windows informa qué suena en SoundCloud del navegador y en Spotify (título, artista,
  carátula, ⏮ ⏯ ⏭, barra).
- Spotify (feb. 2026): las apps en modo desarrollo exigen dueño Premium, 5 usuarios y
  ya no entregan el plan en /me; el control de reproducción sí funciona con Premium.
  La API no entrega el audio ni su análisis: los visuales salen de la captura del PC.

## Cuidados

- Sin imágenes ni íconos de Microsoft/foobar tal cual; diseños propios o con licencia.
- Las plantillas compartidas no pueden ejecutar código (solo configuración e imágenes),
  para que una plantilla ajena no sea un riesgo.
