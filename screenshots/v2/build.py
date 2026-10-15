"""Compose App Store screenshots from raw simulator captures.

Each slide is rendered as HTML (headline + CSS device frame + optional
"breakout" panel cropped from the same capture) and rasterised with headless
Chrome at an exact App Store size.

    python3 screenshots/v2/build.py            # all slides, 6.9" + 6.5"
    python3 screenshots/v2/build.py 01 03      # only matching slides
"""
import base64
import os
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
OUT = ROOT / "final"
WORK = ROOT / "html"
CHROME = os.environ.get(
    "CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

# Brand tokens from apps/mobile/lib/app/theme.dart (AppTheme)
BG = "#D4A853"        # gold
INK = "#061A2E"       # navyDeep
ACCENT = "#0D4560"    # tealDeep, readable on gold

# Canvas = iPhone 6.9" (1320x2868). Captures are native 1320x2868 too.
W, H = 1320, 2868
RAW_W, RAW_H = 1320, 2868

SCREEN_W = 1060
SCALE = SCREEN_W / RAW_W
SCREEN_H = round(RAW_H * SCALE)
BEZEL = 24
RIM = 7
SCREEN_RADIUS = 150
PHONE_TOP = 640
HEAD_SIZE = 132  # one size for every slide; fits the longest line

# Breakout rects are in raw-capture pixels: (x, y, w, h). Re-check them whenever
# the raw captures change: each one should frame a single row or panel.
SLIDES = [
    dict(slug="01-fair-trades", raw="trade-balanced",
         l1="Fair trades,", l2="in seconds.",
         breakout=(0, 1200, 1320, 305), bw=1240),
    dict(slug="02-close-the-gap", raw="trade-filler",
         l1="Close the gap", l2="from your binder.",
         breakout=(30, 425, 1260, 580), bw=1220),
    dict(slug="03-live-prices", raw="card-detail",
         l1="Live prices for", l2="every printing.",
         breakout=(45, 1140, 1230, 550), bw=1230),
    dict(slug="04-spot-risers", raw="trending",
         l1="Spot the cards", l2="on the rise.",
         breakout=(20, 545, 1280, 170), bw=1240),
    dict(slug="05-binder-value", raw="binder-list",
         l1="Know what your", l2="binder is worth.",
         breakout=None, chip=("collection-stats", (100, 635, 545, 212)), bw=840),
    dict(slug="06-track-loans", raw="lend-list",
         l1="Never lose", l2="a lent card.",
         breakout=(30, 522, 1260, 418), bw=1220),
    dict(slug="07-want-list", raw="want-list",
         l1="Hand over your", l2="Want List.",
         breakout=None),
]


def data_uri(path: Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def breakout_html(src_uri: str, rect, target_w: int, center_y: float) -> str:
    x, y, w, h = rect
    k = target_w / w
    bw, bh = target_w, round(h * k)
    left = (W - bw) / 2
    top = center_y - bh / 2
    return f"""
    <div class="breakout" style="left:{left}px; top:{top}px; width:{bw}px; height:{bh}px;
         background-image:url('{src_uri}');
         background-size:{RAW_W * k}px {RAW_H * k}px;
         background-position:{-x * k}px {-y * k}px;"></div>"""


def slide_html(s) -> str:
    shot = data_uri(RAW / f"{s['raw']}.png")
    screen_top = PHONE_TOP + RIM + BEZEL
    phone_w = SCREEN_W + 2 * (BEZEL + RIM)
    phone_h = SCREEN_H + 2 * (BEZEL + RIM)

    extra = ""
    if s.get("breakout"):
        x, y, w, h = s["breakout"]
        center = screen_top + (y + h / 2) * SCALE + s.get("dy", 0)
        extra = breakout_html(shot, s["breakout"], s["bw"], center)
    elif s.get("chip"):
        chip_raw, rect = s["chip"]
        # Float the collection total over the top of the binder list.
        center = screen_top + 560 * SCALE
        extra = breakout_html(data_uri(RAW / f"{chip_raw}.png"), rect, s["bw"], center)

    return f"""<!doctype html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&display=block" rel="stylesheet">
<style>
  html, body {{ margin:0; width:{W}px; height:{H}px; overflow:hidden; background:{BG}; }}
  .canvas {{ position:relative; width:{W}px; height:{H}px; overflow:hidden; background:{BG};
            font-family:'Archivo', sans-serif; }}
  .head {{ position:absolute; top:170px; left:80px; right:80px; text-align:center; }}
  .head h1 {{ margin:0; font-weight:800; letter-spacing:-0.035em; line-height:0.98;
             color:{INK}; white-space:nowrap; }}
  .head h1 span {{ display:block; }}
  .head h1 .l2 {{ color:{ACCENT}; }}
  .phone {{ position:absolute; left:{(W - phone_w) / 2}px; top:{PHONE_TOP}px;
           width:{phone_w}px; height:{phone_h}px; box-sizing:border-box;
           border-radius:{SCREEN_RADIUS + BEZEL + RIM}px;
           background:linear-gradient(145deg,#3e5466 0%,#14222e 30%,#33475a 55%,#0b1620 100%);
           padding:{RIM}px;
           box-shadow: 0 60px 120px rgba(6,26,46,.35), 0 20px 40px rgba(6,26,46,.25); }}
  .bezel {{ width:100%; height:100%; box-sizing:border-box; background:#050403;
           border-radius:{SCREEN_RADIUS + BEZEL}px; padding:{BEZEL}px; }}
  .screen {{ width:{SCREEN_W}px; height:{SCREEN_H}px; border-radius:{SCREEN_RADIUS}px;
            background:url('{shot}') center/cover no-repeat; }}
  .breakout {{ position:absolute; border-radius:34px; background-repeat:no-repeat;
              box-shadow: 0 50px 90px rgba(6,26,46,.55), 0 14px 28px rgba(6,26,46,.35),
                          0 0 0 2px rgba(212,168,83,.35); }}
</style></head>
<body><div class="canvas">
  <div class="head"><h1 id="h"><span>{s['l1']}</span><span class="l2">{s['l2']}</span></h1></div>
  <div class="phone"><div class="bezel"><div class="screen"></div></div></div>
  {extra}
</div>
<script>
  const h = document.getElementById('h');
  let size = {HEAD_SIZE};
  h.style.fontSize = size + 'px';
  document.fonts.ready.then(() => {{
    if (h.scrollWidth > {W - 120}) document.title = 'OVERFLOW';
  }});
</script>
</body></html>"""


def render(html_path: Path, png_path: Path):
    subprocess.run([
        CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=1", f"--window-size={W},{H}",
        "--virtual-time-budget=8000", f"--screenshot={png_path}",
        html_path.as_uri(),
    ], check=True, capture_output=True)
    img = Image.open(png_path).convert("RGB")
    assert img.size == (W, H), img.size
    img.save(png_path)


def main():
    filters = sys.argv[1:]
    WORK.mkdir(exist_ok=True)
    (OUT / "6.9").mkdir(parents=True, exist_ok=True)
    (OUT / "6.5").mkdir(parents=True, exist_ok=True)
    for s in SLIDES:
        if filters and not any(s["slug"].startswith(f) for f in filters):
            continue
        if s.get("optional") and not filters:
            continue
        html_path = WORK / f"{s['slug']}.html"
        html_path.write_text(slide_html(s))
        big = OUT / "6.9" / f"{s['slug']}.png"
        render(html_path, big)
        # 6.5" slot is 1242x2688: same aspect within 0.1%, so a straight resize.
        Image.open(big).resize((1242, 2688), Image.LANCZOS).save(OUT / "6.5" / f"{s['slug']}.png")
        print("rendered", s["slug"])


if __name__ == "__main__":
    main()
