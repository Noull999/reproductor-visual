// Apariencia de las pantallas de la app (no de las plantillas): "oscuro" (predeterminado) o "claro".
// Va en el <head> para que la página no parpadee con el tema equivocado al abrir.
(() => { let t = "oscuro"; try { t = localStorage.getItem("tema-app") || t; } catch (e) {} document.documentElement.dataset.tema = t; })();
