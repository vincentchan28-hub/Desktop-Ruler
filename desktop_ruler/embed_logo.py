"""Logo Embedding Utility for Desktop Ruler.

Converts any image file (PNG, JPG, SVG, etc.) into base64 and bakes it
directly into `desktop_ruler/embedded_logo.py` and `desktop_ruler/assets/logo.png`.

When compiled into an executable (PyInstaller, etc.), the logo is embedded
directly into the compiled bytecode so it can NEVER be missing, deleted, or detached.
"""
import os
import sys
import shutil
import base64

def embed_logo_file(source_image_path: str = None) -> bool:
    base_dir = os.path.dirname(os.path.abspath(__file__))

    # If no source provided, search for candidates
    if not source_image_path:
        candidates = [
            os.path.join(base_dir, "x03.png"),
            os.path.join(base_dir, "logo.png"),
            os.path.join(base_dir, "assets", "logo.png"),
        ]
        for c in candidates:
            if os.path.exists(c) and os.path.getsize(c) > 0:
                source_image_path = c
                break

    if not source_image_path or not os.path.exists(source_image_path):
        print(f"[ERROR] Logo source image not found! Checked: {source_image_path}")
        return False

    print(f"[INFO] Reading logo source: {source_image_path} ({os.path.getsize(source_image_path)} bytes)")

    with open(source_image_path, "rb") as f:
        img_bytes = f.read()

    b64_str = base64.b64encode(img_bytes).decode("ascii")

    # 1. Ensure assets/logo.png is updated
    assets_dir = os.path.join(base_dir, "assets")
    os.makedirs(assets_dir, exist_ok=True)
    target_asset = os.path.join(assets_dir, "logo.png")
    try:
        if os.path.abspath(source_image_path) != os.path.abspath(target_asset):
            shutil.copyfile(source_image_path, target_asset)
    except Exception as e:
        print(f"[WARN] Could not copy to assets/logo.png: {e}")

    # 2. Write desktop_ruler/embedded_logo.py
    embedded_py_path = os.path.join(base_dir, "embedded_logo.py")
    content = f'''"""Embedded Logo Asset for Desktop Ruler.

Contains the base64-encoded binary data of your permanent brand logo.
This guarantees the logo is compiled directly into the application executable
so it can never be lost, deleted, or missing on user machines.
"""
import base64

EMBEDDED_LOGO_BASE64 = "{b64_str}"

def get_embedded_logo():
    """Load and return the embedded brand logo as a QPixmap."""
    try:
        from PySide6.QtGui import QPixmap
        pixmap = QPixmap()
        raw_data = base64.b64decode(EMBEDDED_LOGO_BASE64)
        pixmap.loadFromData(raw_data)
        return pixmap
    except Exception:
        return None

def get_embedded_logo_bytes() -> bytes:
    """Return raw binary bytes of the embedded logo."""
    return base64.b64decode(EMBEDDED_LOGO_BASE64)
'''

    with open(embedded_py_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[SUCCESS] Logo successfully embedded into: {embedded_py_path}")
    print("[SUCCESS] The logo is now permanently compiled into the Python code.")
    return True

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else None
    success = embed_logo_file(src)
    sys.exit(0 if success else 1)
