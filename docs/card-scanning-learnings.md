# Card scanning learnings (July 2026)

Ported from shipping and debugging the FAB Trades live scanner on a real
Pixel 6a, after the pHash + OCR pipeline was already in place. Applied to
RiftTrades' scanner in `apps/mobile/lib/features/scan/` and `apps/mobile/lib/core/scan/`.

---

## 1. Where the scanner stands

**Working path today:** OCR (ML Kit) + two-frame confirmation, with visual pHash
as a secondary signal that rarely wins on a phone camera.

**Shipped improvements in this pass:**

| Change | Why |
|---|---|
| Offline accuracy harness (`tool/evaluate_scan.dart`) | Measure baseline vs rectified pHash under synthetic camera conditions |
| Guide-region card rectification (`lib/core/scan/rectify.dart`) | Recover offset / scale / modest tilt before hashing; defer to fixed crop when the card already fills the guide |
| Collector-number bonus in RRF fusion | Boost candidates whose printed number agrees with OCR |
| OCR errors isolated from visual path | An ML Kit `PlatformException` must not discard a whole frame |
| Confirmation key = stripped card name (not printing id) | Foil / set / parenthetical variants were flipping the lock forever |
| Tolerate 1–2 empty OCR frames | Real-device OCR flickers empty between good reads |
| Prefer longer name-token matches | `"Ahri - Inquisitive"` outranks bare `"Ahri"` |

---

## 2. Desktop webcam ≠ Pixel camera

The scanner once “worked” on a Windows webcam and then appeared completely
broken on a Pixel back camera. That was not one bug — it was several stacking
differently by platform.

| Factor | Webcam (Windows) | Pixel 6a |
|---|---|---|
| Stream format | BGRA8888 | NV21 via CameraX (requested nv21; plugin converts planes) |
| Sensor orientation | Often 0° | Typically 90°; stream stays 1280×720 landscape |
| OCR reliability | Relatively steady | Flickers empty between good frames; can throw `PlatformException` |
| Printing variants in OCR hits | Felt fine | Multiple foil + set rows for one physical card |
| Visual pHash vs catalog | Closer framing → sometimes usable | `best ≈ 90–100` Hamming bits, z ≈ 3.5–4.0 vs 5σ gate → almost always rejected |

**Lesson:** Never trust “it worked on desktop camera” as proof the Android path
is healthy. Validate on a physical phone with logcat/`debugPrint` diagnostics.

---

## 3. Root causes that made Pixel scanning feel dead

### 3.1 Two-frame gate keyed on printing `id` (primary lock bug)

OCR correctly read names and returned many catalog printings. Confirmation
used `matches.first.id`.

Reality for Riftbound (and FAB):

- Same card name → many printings (foil, sets, overnumbered tags).
- Top-of-list printing flipped every frame → pending hits reset → **never locked**.

**Fix:** Confirm on a stripped name key (all parentheticals removed, lowercased),
then lock the fused candidates that share that key. User picks the right
finish/set from the list.

### 3.2 Empty OCR frames wiping progress

Even after the key fix, good frames alternated with `ocr=0 (empty)`. Clearing
pending on every empty frame meant the gate rarely reached 2.

**Fix:** Allow up to two consecutive misses while a pending key is in flight
before resetting.

### 3.3 OCR exceptions aborted the whole frame

`_processImage` wrapped visual + OCR in one `try/catch`. On release builds we
saw `PlatformException` from ML Kit on every frame; that discarded visual work
too (even though visual was already weak).

**Fix:** Run OCR in its own try/catch; fuse whatever visual + OCR produced.
Also enforce the ML Kit contract: Android = single-plane NV21 only (match
`google_mlkit_commons` docs).

### 3.4 Visual pHash is not phone-ready yet

Live Pixel stats with a card in the guide:

```
hash=ok best≈90–100 mean≈120–130 z≈3.5–4.0  →  CardHashIndex rejects (needs z ≥ 5)
```

So the hash runs, but the probe is still far from clean catalog scans. The
outlier gate is correctly saying “this isn’t a confident catalog hit.” Lowering
the threshold alone would accept desk noise (we also saw z ≈ 3.4 on non-card
frames).

Harness result (synthetic, after rectification on FAB catalog):

| | Baseline top-1 / top-3 (reject) | Rectified |
|---|---|---|
| Overall | ~31% / ~47% (48%) | ~47% / ~73% (14%) |
| Aligned (`clean` / `bright` / …) | ~62% / ~92% | ~parity (defer-to-guide) |
| Misaligned (`offset` / `rotate10`) | ~0% | ~40% / ~60% |

Rectification helps synthetic misalignment a lot; **real phone photos are a
harder domain** (lighting, foil, imperfect fill, residual geometry mismatch).

### 3.5 iOS: image stream dies after ~5 frames while the preview stays live

Found via TestFlight overlay screenshots (July 2026): `f=1 rx=5 proc=1`,
frozen for 15+ seconds, stats line byte-for-byte identical across camera
positions — yet the preview kept updating. Per the diagnostics decision tree
that is "`rx` frozen → camera stream died at the plugin level", ruling out
the ML Kit-hang hypothesis (which would show `rx` climbing with `proc`
frozen).

Root cause: `camera_avfoundation` 0.10.x (the 0.10.0+3 "type-safe Pigeon
code for image streaming" rewrite). Native iOS refuses to send a streamed
frame unless fewer than 4 are unacknowledged (`maxStreamingPendingFramesCount`);
each frame must be acked from Dart via `receivedImageStreamData`, and the ack
is a fire-and-forget future whose errors are silently swallowed. When the
handshake breaks, the counter pins at 4 and delivery stops forever — the
preview survives because it's fed by the same native `captureOutput` callback
through a texture, not through the event channel. `rx=5` is the signature:
1 acked frame + 4 that consumed the pending budget.

Two-layer fix:

1. `dependency_overrides: camera_avfoundation: 0.9.23+2` in `apps/mobile/pubspec.yaml`
   — last release before the streaming rewrite (`camera` 0.12 requires
   `^0.10.0`, hence override). Remove once upstream fixes streaming.
2. Stall watchdog in `scan_screen.dart`: every 2 s, if `rx` hasn't moved while
   `_streaming && !_locked`, stop + restart the image stream (restart resets
   the native pending counter to 0, so this also recovers 0.10.x). Restarts
   show as `rst=N` in the overlay liveness line.

---

## 4. How we diagnosed it (feedback loop)

Instrument `_processImage` with tagged logs:

```
[DEBUG-scan] rot=… hash=ok|null best=… z=… vis=N ocr=N ("snippet"|empty|err=…)
[DEBUG-scan] pending=… hits=…
[DEBUG-scan] LOCK key="…" n=…
```

Capture with:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb -s <deviceId> logcat -c
# hold a card in the guide for ~10s
& $adb -s <deviceId> logcat -d | Select-String "DEBUG-scan"
```

What the loop proved on device:

1. Format/rotation/catalog/hash index were fine (`nv21/17`, `rot=90`, idx≈ catalog size).
2. OCR *was* reading card text → not a “camera broken” problem.
3. `vis=0` always → visual path not contributing.
4. No `LOCK` until confirmation key ignored printing id.

**Lesson:** For camera ML, a red-capable on-device diagnostic beats theorizing
from desktop-only tests.

---

## 5. Accuracy harness (keep using it)

From `apps/mobile/`:

```bash
dart run tool/evaluate_scan.dart --samples=200 --seed=1
dart run tool/evaluate_scan.dart --offline
dart run tool/evaluate_scan.dart --augs=offset,rotate10,tilt
```

Compares **fixed guide crop** vs **rectified** hashing against the bundled
`assets/scan/card_hashes.json`. Use it before changing pHash thresholds,
rectify config, or regenerating the hash asset.

Regenerate catalog hashes after set releases:

```bash
dart run tool/generate_card_hashes.dart
```

---

## 6. Architecture notes that matter

### Pipeline (per frame)

1. Throttle (~350 ms).
2. pHash of guide region (optional rectify) → `CardHashIndex.match` (5σ outlier).
3. ML Kit OCR → `identifyCards` → `parseScanNumbers`.
4. `fuseScanCandidates` (RRF + optional number bonus).
5. Two-frame confirm on `_scanConfirmKey` → lock → show list.

### Geometry contract

`frame_hasher.dart` / `phash.dart` share viewport + guide constants with the
scan overlay. Preview uses `BoxFit.cover`; the hasher samples the same region
in rotated sensor space. If you change the overlay, change the hasher.

### Rectification policy

Detect a card quad only when it **meaningfully differs** from the guide
(`quadMatchesGuide`); otherwise keep the fixed inset crop so well-framed scans
don’t regress.

### Fusion

Visual alone or OCR alone is allowed. Collector-number bonus applies when OCR
saw an `NNN/TTT`-style number (Riftbound’s primary printed id).

---

## 7. What not to do

- **Don’t** key two-frame confirmation on printing `id`.
- **Don’t** let OCR failures abort visual matching.
- **Don’t** clear pending hits on the first empty OCR frame.
- **Don’t** lower the pHash σ threshold without an absolute distance cap and
  harness + device numbers — false accepts look like “random card locked.”
- **Don’t** send non-NV21 / multi-plane buffers to ML Kit on Android.
- **Don’t** treat cloud LLM-per-frame as a live-scanner strategy (latency, cost,
  offline).

---

## 8. Open follow-ups (in priority order)

1. **Phone visual match** — close the gap between live crops and catalog hashes
   (guide/preview geometry audit, optional tighter crop alignment in
   `generate_card_hashes.dart`, absolute `best < N` gate alongside z-score).
2. **Phase 2 embeddings** (MobileCLIP / metric learning) once the harness shows
   pHash saturating on glare/foil/tilt — already researched in
   `card-scanning-research.md`.
3. **Remove or gate `[DEBUG-scan]` logs** for production if volume is noisy
   (keep them behind a debug flag).
4. **Release-vs-debug ML Kit** — early Pixel release build threw
   `PlatformException` every frame; debug later succeeded (model download /
   timing). Worth a cold-install check on a fresh device before each store push.
5. **Drop the `camera_avfoundation` override** (see §3.5) once an upstream
   release fixes the Pigeon image-stream throttle stall; re-test on a physical
   iPhone with the overlay (`rx` must keep climbing past 5).

---

## 9. Key files

| Path | Role |
|---|---|
| `apps/mobile/lib/features/scan/scan_screen.dart` | Camera stream, fusion, confirm/lock |
| `apps/mobile/lib/core/scan/phash.dart` | DCT pHash + shared guide constants |
| `apps/mobile/lib/core/scan/frame_hasher.dart` | Camera frame → hash (rectify + fallback) |
| `apps/mobile/lib/core/scan/rectify.dart` | Edge/quad detection + quad sampling |
| `apps/mobile/lib/core/scan/card_hash_index.dart` | Brute-force Hamming + outlier gate |
| `apps/mobile/lib/core/data/card_repository.dart` | `identifyCards`, `fuseScanCandidates`, `parseScanNumbers` |
| `apps/mobile/tool/evaluate_scan.dart` | Offline accuracy harness |
| `apps/mobile/tool/generate_card_hashes.dart` | Rebuild `assets/scan/card_hashes.json` |
| `apps/mobile/assets/scan/card_hashes.json` | Bundled visual index |

---

## 10. One-line summary

On a real Android phone, **OCR was working but the lock logic wasn’t**; visual
pHash still needs a phone-quality upgrade. Fix confirmation identity and OCR
resilience first; measure visual changes with the harness before trusting them
in production.
