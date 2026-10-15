# App Store screenshots (v2)

Same pipeline as FAB Trades: raw simulator captures in `raw/`, composed by `build.py`
into `final/6.9` (1320x2868) and `final/6.5` (1242x2688).

## Raw captures

iPhone 17 Pro Max simulator (native 1320x2868), app in dark mode, clean status bar:

    xcrun simctl status_bar booted override --time 9:41 --batteryState charged \
      --batteryLevel 100 --cellularBars 4 --wifiBars 3
    xcrun simctl io booted screenshot raw/<name>.png

| File | Screen |
| --- | --- |
| `trade-balanced.png` | Trade with valuable cards on both sides, close to even |
| `trade-filler.png` | Find Trade Filler sheet open on that trade |
| `card-detail.png` | Card detail for a chase card, prices visible |
| `trending.png` | Browse → See Trending |
| `binder-list.png` | Binder with 6+ priced cards |
| `collection-stats.png` | Collection Stats for that binder |
| `lend-list.png` | Lend tab with a person and lent cards |
| `want-list.png` | Want List with several cards |

## Render

    python3 screenshots/v2/build.py          # all slides
    python3 screenshots/v2/build.py 03       # one slide

Needs Pillow and Google Chrome (`CHROME=/path/to/chrome` to override).
