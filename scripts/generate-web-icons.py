"""
Generate the web / PWA icons into `public/` from the app icon.

Usage:
    python3 scripts/generate-web-icons.py assets/icon.png public

Produces:
    public/icon-192.png          192x192 "any" icon (install / manifest)
    public/icon-512.png          512x512 "any" icon (install / manifest, splash)
    public/icon-maskable-512.png 512x512 maskable icon (art inside the safe zone)
    public/apple-touch-icon.png  180x180 iOS "Add to Home Screen" icon

The browser-tab favicon (favicon.ico) is generated separately by Expo from
`app.json`'s `web.favicon`; this script only covers what Expo does NOT generate.

Caveat: the source `assets/icon.png` is the stopgap 4:1 wordmark centred in a
square (see assets/README.md and CLAUDE.md "Release configuration"). These PWA
icons are therefore only as good as that source — replace the artwork and rerun.
"""

import sys

from PIL import Image


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: generate-web-icons.py <src.png> <out-dir>")
    src, outdir = sys.argv[1], sys.argv[2]
    icon = Image.open(src).convert("RGB")  # the square wordmark-on-white mark

    def resize_to(size: int, path: str) -> None:
        icon.resize((size, size), Image.LANCZOS).save(path)

    # Standard "any" icons: the full square mark.
    resize_to(192, f"{outdir}/icon-192.png")
    resize_to(512, f"{outdir}/icon-512.png")
    resize_to(180, f"{outdir}/apple-touch-icon.png")

    # Maskable: keep the art inside the centre ~72% safe zone (Android/Chrome
    # crop up to a fifth off each edge), on a white ground so corners never go
    # black.
    canvas = Image.new("RGB", (512, 512), (255, 255, 255))
    inner = int(512 * 0.72)
    off = (512 - inner) // 2
    canvas.paste(icon.resize((inner, inner), Image.LANCZOS), (off, off))
    canvas.save(f"{outdir}/icon-maskable-512.png")

    print("generated web icons in", outdir)


if __name__ == "__main__":
    main()
