"""Compose the App Store product page header and search results assets.

Both placements are new in App Store Connect (iOS 27) and optional. They reuse
the raw simulator captures in raw/ and the brand tokens from build.py.

    python3 screenshots/v2/build_creatives.py

Specs (App Store Connect, creative assets):
    header          21:9  3840x1646  jpeg/png, no alpha
    search results  3:2   3840x2560  jpeg/png, no alpha
"""
import base64
import os
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
OUT = ROOT / "final" / "creatives"
WORK = ROOT / "html"
CHROME = os.environ.get(
    "CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

# Brand tokens from apps/mobile/lib/app/theme.dart (AppTheme)
GOLD = "#D4A853"
GOLD_BRIGHT = "#E5C078"
NAVY_DEEP = "#061A2E"
NAVY = "#0A2540"
TEAL_DEEP = "#0D4560"
TEAL_LIGHT = "#3A9ABA"

RAW_W, RAW_H = 1320, 2868


def data_uri(name: str) -> str:
    return "data:image/png;base64," + base64.b64encode((RAW / f"{name}.png").read_bytes()).decode()


def phone(name: str, screen_w: float, left: float, top: float, rotate: float = 0,
          z: int = 1) -> str:
    """A CSS iPhone frame around one raw capture, positioned on the canvas."""
    k = screen_w / 1060  # proportions match build.py at a 1060px screen
    bezel, rim, radius = 24 * k, 7 * k, 150 * k
    screen_h = screen_w * RAW_H / RAW_W
    w = screen_w + 2 * (bezel + rim)
    h = screen_h + 2 * (bezel + rim)
    return f"""
    <div class="phone" style="left:{left - w / 2}px; top:{top}px; width:{w}px; height:{h}px;
         padding:{rim}px; border-radius:{radius + bezel + rim}px; transform:rotate({rotate}deg);
         z-index:{z};">
      <div class="bezel" style="border-radius:{radius + bezel}px; padding:{bezel}px;">
        <div class="screen" style="width:{screen_w}px; height:{screen_h}px; border-radius:{radius}px;
             background-image:url('{data_uri(name)}');"></div>
      </div>
    </div>"""


BASE_CSS = f"""
  html, body {{ margin:0; overflow:hidden; background:#000; }}
  .canvas {{ position:relative; overflow:hidden; font-family:'Archivo', sans-serif; }}
  .phone {{ position:absolute; box-sizing:border-box;
           background:linear-gradient(145deg,#3e5466 0%,#14222e 30%,#33475a 55%,#0b1620 100%);
           box-shadow: 0 80px 160px rgba(6,26,46,.45), 0 24px 48px rgba(6,26,46,.35); }}
  .bezel {{ width:100%; height:100%; box-sizing:border-box; background:#050403; }}
  .screen {{ background-position:center; background-size:cover; background-repeat:no-repeat; }}
  h1 {{ margin:0; font-weight:800; letter-spacing:-0.035em; line-height:1; white-space:nowrap; }}
"""


def page(w: int, h: int, css: str, body: str) -> str:
    return f"""<!doctype html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&display=block" rel="stylesheet">
<style>{BASE_CSS}
  html, body, .canvas {{ width:{w}px; height:{h}px; }}
{css}</style></head>
<body><div class="canvas">{body}</div></body></html>"""


def header_html() -> str:
    # Mood over features: the binder's card art fanned on a dark Rift table.
    # The focal point stays in the middle third so device crops never clip it,
    # and the lower edge fades to navy under the icon and app name.
    W, H = 3840, 1646
    css = f"""
  .canvas {{ background:
      radial-gradient(ellipse 55% 85% at 50% 40%, rgba(58,154,186,.38) 0%, rgba(13,69,96,.25) 45%, rgba(6,26,46,0) 75%),
      linear-gradient(180deg, {NAVY} 0%, {NAVY_DEEP} 100%); }}
  .glow {{ position:absolute; left:50%; top:52%; width:2200px; height:900px; transform:translate(-50%,-50%);
          background:radial-gradient(ellipse at center, rgba(212,168,83,.22) 0%, rgba(212,168,83,0) 65%); }}
  .head {{ position:absolute; left:0; right:0; top:150px; text-align:center; z-index:10; }}
  .head h1 {{ font-size:168px; color:#F4F7F9; }}
  .head h1 em {{ font-style:normal; color:{GOLD_BRIGHT}; }}
  .fade {{ position:absolute; left:0; right:0; bottom:0; height:520px; z-index:9;
          background:linear-gradient(180deg, rgba(6,26,46,0) 0%, rgba(6,26,46,.85) 60%, {NAVY_DEEP} 100%); }}
"""
    body = f"""
  <div class="glow"></div>
  <div class="head"><h1>Trade with <em>confidence.</em></h1></div>
  {phone("card-detail", 700, W / 2 - 780, 560, rotate=-9, z=2)}
  {phone("trade-balanced", 700, W / 2 + 780, 560, rotate=9, z=2)}
  {phone("want-list", 760, W / 2, 470, z=3)}
  <div class="fade"></div>"""
    return page(W, H, css, body)


def search_html() -> str:
    # Search results: state the obvious. Real screens and one short line.
    W, H = 3840, 2560
    css = f"""
  .canvas {{ background:{GOLD}; }}
  .head {{ position:absolute; left:0; right:0; top:170px; text-align:center; }}
  .head h1 {{ font-size:200px; color:{NAVY_DEEP}; }}
  .head h1 em {{ font-style:normal; color:{TEAL_DEEP}; }}
"""
    body = f"""
  <div class="head"><h1>Fair Riftbound trades, <em>fast.</em></h1></div>
  {phone("binder-list", 860, W / 2 - 1180, 640)}
  {phone("trade-balanced", 940, W / 2, 560, z=2)}
  {phone("trending", 860, W / 2 + 1180, 640)}"""
    return page(W, H, css, body)


def render(html: str, slug: str, w: int, h: int):
    WORK.mkdir(exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    html_path = WORK / f"{slug}.html"
    html_path.write_text(html)
    png = OUT / f"{slug}.png"
    subprocess.run([
        CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=1", f"--window-size={w},{h + 200}",
        "--virtual-time-budget=8000", f"--screenshot={png}", html_path.as_uri(),
        *(["--no-sandbox"] if os.geteuid() == 0 else []),
    ], check=True, capture_output=True)
    # Some headless Chrome builds reserve part of the window, so render taller
    # and crop to the exact size. App Store rejects alpha channels.
    img = Image.open(png).convert("RGB").crop((0, 0, w, h))
    img.save(png)
    print("rendered", slug)


def main():
    render(header_html(), "header-21x9", 3840, 1646)
    render(search_html(), "search-results-3x2", 3840, 2560)


if __name__ == "__main__":
    main()
