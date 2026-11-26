"""
Arma Sonix2K para Windows (sin instalador todavía):

    python empaque/construir.py

Deja dist/Sonix2K/Sonix2K.exe (con su carpeta) y dist/Sonix2K-prueba.zip. Necesita PyInstaller (pip install pyinstaller).
Solo se empaqueta lo que está en git dentro de web/: nada local (criaturas convertidas, pruebas) se cuela en el .exe.
"Quitar fondo" (rembg, ~650 MB) queda fuera a propósito.
"""
import shutil
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
NOMBRE = "Sonix2K"
FUERA = ("rembg", "onnxruntime", "cv2", "scipy", "matplotlib", "pandas", "pytest", "tkinter", "numba", "llvmlite", "skimage", "pymatting", "torch")


def web_limpio() -> Path:
    destino = RAIZ / "build" / "web_limpio"
    if destino.exists():
        shutil.rmtree(destino)
    lista = subprocess.run(["git", "ls-files", "-z", "web"], cwd=RAIZ, capture_output=True, check=True).stdout.decode("utf-8").split("\0")
    for rel in filter(None, lista):
        (destino / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(RAIZ / rel, destino / rel)
    return destino / "web"


def main():
    web = web_limpio()
    args = [sys.executable, "-m", "PyInstaller", "--noconfirm", "--windowed", "--name", NOMBRE, "--icon", str(RAIZ / "empaque" / "icono.ico"),
            "--add-data", f"{web};web", "--specpath", str(RAIZ / "build"), "--workpath", str(RAIZ / "build" / "pyinstaller"), "--distpath", str(RAIZ / "dist"),
            "--collect-submodules", "winrt", "--collect-all", "webview", "--collect-binaries", "pyaudiowpatch", "--collect-submodules", "yt_dlp"]
    for m in FUERA:
        args += ["--exclude-module", m]
    subprocess.run(args + [str(RAIZ / "app.py")], cwd=RAIZ, check=True)
    zipeo = shutil.make_archive(str(RAIZ / "dist" / f"{NOMBRE}-prueba"), "zip", RAIZ / "dist", NOMBRE)
    print("listo:", RAIZ / "dist" / NOMBRE / f"{NOMBRE}.exe", "y", zipeo)


if __name__ == "__main__":
    main()
