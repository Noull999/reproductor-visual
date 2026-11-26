# Plan — Sonix2K, reproductor visual personalizable

Estado (nov. 2026): app funcionando con 12 plantillas, Editor, Comunidad (repositorio y galería web), reacción al ritmo y Serato. Las fases de abajo quedan como historia de cómo se llegó aquí; el prototipo original se retiró del repositorio (sigue en el historial de git).
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
- [x] Conectar las cuentas desde la app (pantalla **Ajustes**): SoundCloud con su ventana de login (como Music Downloader:
      lee la sesión y detecta el Client ID sola) y Spotify con un botón (el Client ID de la app va incorporado;
      en modo desarrollo Spotify admite 5 cuentas autorizadas por el dueño).
- [x] Fuente **Mi música**: cada subcarpeta es una lista; audio con avance y carátula del archivo.
- [x] Elegir las carpetas desde la app (Ajustes: agregar con el selector de Windows y quitar).
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
   La captura ahora también vuelve a detectar la salida de audio si hay silencio sostenido.
   Pendiente: comprobarlo dentro de una plantilla con sonido real saliendo por los parlantes
   (la última prueba midió silencio exacto aunque Spotify decía "reproduciendo").
2. **Fuente Spotify**
   - [x] Conexión con PKCE (sin secreto), tokens en `~/.visualizador/spotify.json`.
         Probado: lee lo que suena, dispositivos y likes; pausa/reanuda (Premium confirmado).
   - [x] Botón "Conectar Spotify" en el inicio (primera vez abre el navegador; después entra directo).
   - [x] Lista: **Tus me gusta** viene elegida (1379 temas cargan en ~4 s) y las playlists tuyas son opcionales.
         Límite de Spotify: en modo desarrollo solo se pueden leer playlists propias o colaborativas (7 de 49).
   - [x] En las plantillas (probado en la app contra tu Spotify): tocar un tema de la lista lo pone en tu Spotify; ⏮ ⏯ ⏭,
         barra (seek) y volumen por la API. Estado y posición desde Windows (sin gastar
         peticiones a la API); si no hay Spotify abierto, avisar.
   - [x] Inicio con 3 paneles (Spotify, SoundCloud, Mi música) + enlace "otra app".
3. **Todas las plantillas con lista para elegir tema** — ✔ Headspace tiene un cajón de gel que
   se abre desde el lado con el botón "Lista" (la cabeza se corre para no taparse).
4. **Pulido de la revisión** (capturas del 20-11):
   - [x] Botón "← Plantillas": más contraste y con el estilo de cada plantilla (vidrio,
         gel, metal, serif, pixel).
   - [x] Líquido: capa oscura detrás de la lista para que el haz no tape los títulos.
   - [x] 2000s: bajar ~20 % el brillo del centro del túnel (sobre todo Grafito y LCD
         verde); separar "PL" de los skins; un poco más de contraste en PLAY/PAUSA/SC.
   - [x] Headspace: el título en la pantalla avanza como marquesina solo si no cabe.
   - [x] Ambiente: que se note más el cambio duotono ↔ original; margen bajo la lista.
   - [x] Pixel: la lista termina con degradado (no corta una fila a la mitad);
         Game Boy con texto inactivo más claro; miniaturas con borde de la paleta.
   - [x] Todas: margen inferior + desvanecido al final de cada lista con scroll.
   - [x] Volumen: clic en el ícono silencia y vuelve; mostrar el % al moverlo.
   - [x] Inicio: mismas etiquetas en los paneles ("Elegir →").
   - [x] *(Idea de Gemini)* modo "solo visual": los controles se ocultan tras 3 s sin
         mover el mouse (la tecla H lo activa o desactiva).
5. **Nombre de la app** (decisión de José) → reemplaza "sin nombre aún".

Límite a tener en cuenta: con la API en modo desarrollo, Spotify permite al dueño
(Premium) y hasta 5 usuarios autorizados. Para "la gente" el panel Spotify necesitaría
la cuota ampliada de Spotify (trámite aparte); mientras tanto usan "otra app".

## Fase 2 — Biblioteca y personalización (modelo: Wallpaper Engine)  ← AHORA

Idea: una página **Biblioteca** (plantillas con vista previa + panel de propiedades en vivo), luego un
**Editor** y por último una **Comunidad**. Cada plantilla declara qué se puede cambiar; lo que se
comparte son solo datos e imágenes, nunca código.

- [x] Biblioteca: cuadrícula con vista previa por plantilla y variante de color; "Usar esta" abre la plantilla ya con esa variante.
- [x] Vistas previas generadas con la app real y **carátulas pixeladas** (`tools/capturar_previas.py`, 31 imágenes en `web/img/previas/`).
- [x] Panel **Personalizar**: intensidad y velocidad de los visuales, mostrar/ocultar la lista, modo solo visual y
      **fondo propio** (imagen reducida a 1920 px y guardada en `~/.visualizador/imagenes/`). Se guarda por plantilla
      (`propiedades.js`) y se aplica en `nucleo.js`. Botón "Restablecer".
- [x] Puerto fijo del servidor local: antes cambiaba en cada arranque y se perdían los colores/skins elegidos.
- [x] **Cuerpo propio en Headspace**: se sube un PNG transparente y un **editor de zonas** (recuadros que se arrastran y se estiran) indica dónde van pantalla, botones, barra, ojos, boca y parlantes. Los colores del panel pasan a teñir LED y botones.
- [ ] Chasis propio en 2000s: su cuerpo es una maqueta CSS (varias piezas alineadas), no una imagen plana con zonas; necesita otro diseño (por ahora solo fondo propio).
- [x] **Vista previa en vivo** en el panel: la plantilla real corriendo en un marco con música inventada (fuente `demo`), que se recarga al cambiar cualquier propiedad. Las tarjetas de la cuadrícula siguen con capturas fijas.
- [x] Más propiedades por plantilla: deformación del vidrio (Líquido), cantidad de burbujas (Headspace), brillo del túnel (2000s), desenfoque del fondo (Ambiente) y tamaño de los píxeles (Pixel). Se definen en `propiedades.js` (`EXTRAS`).
- [x] Colores libres: un color propio en la Biblioteca que cada plantilla (Líquido, Headspace, 2000s, Ambiente, Pixel, Neo Y2K, Psicodélico) convierte en su variante «Propio».
- [x] Plantillas nuevas: **Psicodélico** (ojo pixel art, caleidoscopio, espiral, fractal; 8 colores), **Neo Y2K** (carátula con barrido de brillo; Ácido, Chicle, Hielo y Fuego con figura y partículas propias) y **Dreamcore** (VHS + ventanas de Windows 95; escenas Damero, Backrooms y Espacio con serafín; avisos y popups de virus).
- [x] **Fondo propio en video** (mp4/webm en loop), además de imagen.
- [x] Pulido final (23-nov): las 13 páginas cargan sin errores de JavaScript; el JS por cuadro de cada plantilla es menor a 3 ms salvo Dreamcore (5-6 ms tras optimizar el VHS y el suelo). Pendiente: probar con música y GPU reales en el PC.
- [ ] Audio del PC: con la salida de Windows silenciada la captura entrega silencio exacto (ahora la app avisa); falta probarlo con la salida sin silenciar.
- [ ] Dreamcore con fondos de IA animados (video maker / Higgsfield: damero_2 aprobado, falta el video en loop; backrooms y serafín sin generar).
- [ ] Frutiger Aero: rehacer (la primera propuesta no gustó).
- [x] Guía de imágenes (`guia.html`): medidas, esquema de zonas y textos para pedirle al generador.

## Fase 3 — Editor de plantillas (modelo de datos, sin código)  ← HECHA (primera versión)

Las 5 plantillas incluidas son páginas con su propio código y no se pueden recombinar pieza por pieza.
Para crear y mezclar hay un **motor de plantillas basado solo en datos** (`libre.html`) y un **editor** (`editor.html`).
Una plantilla propia es un objeto JSON (`plantillas-propias.js`): fondo, estilo y una lista de piezas con su posición en %.

- [x] **Crear la tuya**: "Nueva plantilla" en la Biblioteca (parte de una base: en blanco, reproductor central o con lista).
- [x] **Skin libre**: cada pieza (visual, carátula, título, artista, botones, barra, tiempo, volumen, lista, panel, imagen)
      se arrastra y se estira sobre una vista previa en vivo; el orden de capas se cambia con ▲ ▼; "Imagen" permite
      poner un cuerpo propio (PNG transparente) debajo de todo.
- [x] **Mezclar**: fondo (haz de luz, túnel, burbujas, luces, estrellas de píxel, color liso, imagen propia),
      visual (barras, bloques de píxel, segmentos LCD, onda, círculo), estilo de paneles (vidrio, metal, gel, píxel, liso),
      color de acento y letra. Son los elementos de las plantillas incluidas, combinables libremente.
- [x] Aparecen en la Biblioteca (con Editar, intensidad, velocidad y lista), se duplican y se eliminan.
- [x] Sin código propio: lo que se guarda es solo configuración e imágenes (listo para compartir).
- [x] Las 5 plantillas incluidas como **bases editables** por piezas, con reglas (`plantillas-propias.js`): Líquido, Ambiente y Pixel con piezas estándar; Headspace y 2000s con los módulos "cabeza" y "equipo" (`modulos.js`). "Editar esta plantilla" en la Biblioteca.
- [x] Más personalización: esquema único (`esquema.js`) con opciones por pieza (carátula con formas y efectos, título/artista con letra y color propios, barra de onda real, lista, opacidad…), fondos nuevos (carátula desenfocada, degradado), acento desde la carátula y deformación del vidrio.
- [ ] **Plantilla Anime / PS2** (idea del 21-11): estética de menú de juego de los 2000, personaje como imagen propia que reacciona al bajo (pulso, vibración, aberración de color, líneas de velocidad). Requiere: estilo de panel nuevo, fondo de columnas de luz y efecto de reacción para imágenes.
- [x] **Comunidad** (primera versión): repo público [reproductor-comunidad](https://github.com/Noull999/reproductor-comunidad) con `catalogo.json`, plantillas de ejemplo y revisor de envíos; la pestaña Comunidad de la app (`comunidad.py`, `comunidad.html`) lista, busca e instala (mismas validaciones que Importar).
- [ ] Comunidad: activar las dos automatizaciones del repo (validar envíos en cada pull request y regenerar `catalogo.json`); falta el permiso `workflow` de `gh` (`gh auth refresh -h github.com -s workflow`); están guardadas en `D:\Proyectos\_flujos_comunidad`.
- [ ] Comunidad: galería web (Vercel o Cloudflare Pages) generada desde el catálogo; subida directa solo si hay usuarios.
- [ ] Más visuales y fondos; piezas con colores y tamaños de letra propios; deshacer; alinear a una cuadrícula.
- [ ] Visuales programables en un entorno aislado (modo avanzado), más adelante.

## (Antes) Imágenes propias en las plantillas

- [ ] Cada plantilla declara **ranuras** de imagen (fondo, cabeza, botones…) con su
      tamaño recomendado. *(Headspace ya funciona así: el cuerpo es el dibujo o una imagen,
      y la pantalla, botones, ojos, boca y parlantes se ubican por zonas en %.)*
- [x] Headspace: cuerpos "Y2K" (translúcido con circuitos, elegido por José) y "Gel" de video maker; sin el dibujo SVG (WebP en `web/img/headspace/`, PNG originales en `arte/`).
- [ ] Headspace: evaluar un cuerpo distinto por color (~0,09 USD por imagen con video maker).
- [ ] Subir una imagen a una ranura desde la app (sin tocar carpetas ni código).
      Si la ranura está vacía, se usa el dibujo original.
- [ ] Pensado para imágenes de Higgsfield u otros generadores.

## (Plan original) Fase 3 — Editor de plantillas

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

## Fase 4 — Compartir creaciones  ← HECHA (primera versión)

- [x] **Exportar** una plantilla propia como **un archivo `.plantilla`** (zip: `manifest.json` + `imagenes/*.webp`). Botón en la
      Biblioteca y en el Editor.
- [x] **Importar** con el botón "Importar plantilla…" de la Biblioteca. El archivo se trata como contenido no confiable
      (`plantillas.py`): lista permitida de valores, colores y números acotados, solo `manifest.json` e `imagenes/<nombre>.webp`
      dentro del zip, límites de tamaño, imágenes re-codificadas con Pillow, el id lo pone la app. 33 pruebas, con archivos maliciosos.
- [x] Exportar las plantillas incluidas con tus ajustes (`ajustes.py`): variante, color propio, controles, fondo y cuerpo propio de Headspace; se importan con el mismo botón «Importar plantilla…».
- [ ] *(Más adelante)* catálogo de comunidad: un repositorio público con la lista de plantillas (sin servidor); moderación manual
      y revisión de derechos de las imágenes.
- [ ] *(Más adelante, solo si hay usuarios)* galería online con servidor.

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
