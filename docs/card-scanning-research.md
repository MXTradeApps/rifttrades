# Card Scanning Research: How "PokeScan"-Style Card Recognition Works and What RiftTrades Should Build

*Research date: July 15, 2026. All claims are cited; anything that could not be verified against a primary source is explicitly marked as unverified or speculation.*

## Table of contents

1. [What "PokeScan" is — disambiguation and what is verifiably known](#1-what-pokescan-is)
2. [How TCG card scanners generally work (detection → identification)](#2-how-tcg-card-scanners-generally-work)
3. [Training methods](#3-training-methods)
4. [Recommended tech stack for RiftTrades](#4-recommended-tech-stack-for-rifttrades)
5. [Source list](#5-source-list)

---

## 1. What "PokeScan" is

**There is no single app called "PokeScan."** At least five unrelated products use the name, plus several near-namesakes. None of the apps literally named "PokeScan" has published technical details about its recognition pipeline. The closest thing to a primary-source engineering write-up in this space comes from a similarly named app, **PokeScope**, whose developers published a detailed blog post about their stack (covered below).

### 1.1 The apps named "PokeScan"

| App | Platform / developer | What is verifiable about the implementation |
|---|---|---|
| **PokeScan** (Yeti Apps) | Android; Daniel Ladebeck ([Google Play](https://play.google.com/store/apps/details?hl=en_US&id=com.yetiapps.pokescan)) | Camera-based card scanning; card data from the open TCGdex database. **No public information about the recognition method.** |
| **PokeScan AI** | iOS; Lucas Alvarenga ([App Store](https://apps.apple.com/us/app/pokescan-ai/id6755688940)) | Store listing states recognition is **fully on-device ("Works 100% Offline — Your data never leaves your device")** and uses **"real-time scanning with multi-frame confirmation for accuracy."** The model architecture and training method are **not disclosed**. |
| **Card Value Scanner: PokeScan** | iOS; Štěpán Záliš ([App Store](https://apps.apple.com/us/app/card-value-scanner-pokescan/id6477778856), [site](https://stepanzalis.github.io/pokescan/)) | The developer is a Flutter developer ([GitHub profile](https://github.com/stepanzalis)), so this is plausibly a Flutter app, but the scanner implementation is **not public**. |
| **Pokescan – TCG Card Scanner** | iOS; Alexandre Morcos ([App Store](https://apps.apple.com/ml/app/pokescan-tcg-card-scanner/id6759465431)) | Scan-to-price app. **No implementation details published.** |
| **PokeScan** (web, Japanese) | Web tool ([pokescan.etcetera.work](https://www.pokescan.etcetera.work/)) | Explicitly states it sends the card photo to **Google Gemini** (a cloud multimodal LLM) to identify name/rarity/set — a completely different approach from on-device recognition. |
| **PokeScan** (Titan Cards) | iOS ([App Store](https://apps.apple.com/us/app/pokescan/id1462580054)) | Unrelated: a **QR-code scanner** for PTCGO code cards, not a card recognizer. |

**Bottom line:** if the owner saw an app called "PokeScan" that visually recognizes Pokémon cards, it is most likely one of the first three above — and none of them documents its internals. Any specific claim about "PokeScan's tech stack" would be speculation. What we *can* do is study the near-identical apps whose developers **have** written about their approach, plus open-source projects. They all converge on the same architecture.

### 1.2 PokeScope — the best primary-source write-up of a Pokémon scanner

The **PokeScope** team published a long developer blog post, ["How I Built a Pokemon Card Scanner App with AI"](https://pokescope.app/blog/how-i-built-pokemon-card-scanner-ai-50000-users/), describing their production pipeline:

- **Detection:** YOLOv8 for real-time card detection (locating the card in the camera frame).
- **Identification:** **CLIP image embeddings** for visual matching against the card database. They report that switching from "basic image comparison" to CLIP embeddings took match accuracy from ~60% to 95%+.
- **Verification:** **OCR (Tesseract) on the collector number** in the bottom corner as a final tie-breaker for visually near-identical variants ("CLIP for visual matching and OCR for final verification").
- **Training data:** 50,000+ training images. For robustness through sleeves/binders they combined **10,000+ manual photographs** (cards in penny sleeves, top loaders, binder pages, varied lighting) with a **custom synthetic augmentation pipeline** simulating "sleeve reflections, glare patterns, and perspective distortions," plus scratched-sleeve noise and multi-layer plastic distortion.
- **Backend:** PHP/MySQL, card data and pricing from the Scrydex API.

This is the single most detailed public account of how a commercial Pokémon card scanner is built, and it matches every other verifiable source below.

### 1.3 Other verifiable Pokémon-scanner implementations

- **qtran1018/TCG** ([GitHub](https://github.com/qtran1018/TCG)) — open-source Pokémon/One Piece scanner. On-device **YOLO (TFLite, ~150 ms via Snapdragon NNAPI)** for card bounding boxes, **CLIP embeddings** (backend) for visual identity, **ML Kit OCR** for name/collector number, and **Reciprocal Rank Fusion** to merge the visual and OCR candidate lists, with a bonus weight for collector-number matches. Also uses a **consecutive-frame confirmation gate** (top match must repeat on two consecutive frames) — the same trick RiftTrades' current OCR scanner already uses.
- **MyPokemonScanner** ([project page](https://ankush.one/projects/2026.pokemon-scanner/)) — fully client-side browser scanner: **YOLO11n** detection + **MobileCLIP-S2** embeddings via ONNX Runtime, no server, offline-capable. Notable because it demonstrates that a small CLIP variant works for card identification **without fine-tuning**.
- **lo-calvin/Trading-Card-Scanner** ([GitHub](https://github.com/lo-calvin/Trading-Card-Scanner/blob/main/README.md)) — **YOLOv11-segmentation fine-tuned on synthetic data** ("cards scattered across varied environments") + **ResNet50 feature embeddings compared against embeddings generated from official card images**. This is exactly the "embed the clean catalog images, embed the camera crop, nearest-neighbor match" pattern.
- **Roboflow blog, "Automate TCG Inventory: Pokémon Card OCR"** ([blog](https://blog.roboflow.com/trading-card-inventory-management/)) — tutorial pipeline: RF-DETR detection/segmentation of the card, then an OCR/reasoning stage to validate name, ID, and set.

### 1.4 Delver Lens (the canonical MTG scanner)

Delver Lens was built by **Cassio Santos, a computer scientist with a Master's in AI** whose academic work is in large-scale image retrieval ([delver.app About page](https://delver.app/), [LinkedIn](https://linkedin.com/in/cassiosantosjr)). Verifiable facts:

- Recognition **"scans the full card"** — the developer's own scanning guidance says the card border must be visible, and lighting/contrast with the background matter most ([Google Play listing](https://play.google.com/store/apps/details?id=delverlab.delverlens&hl=en_US), [delverlab.com](https://www.delverlab.com/)). This implies whole-card image matching, not text reading.
- It recognizes all ~37,000+ MTG cards **offline on-device**, and the current generation uses a recognition model the developer calls **"lambda"** ([delver.app FAQ](https://delver.app/)).
- **Not verifiable:** the exact architecture and training method of Delver Lens. Despite extensive searching (Reddit, blog posts, talks), I found **no public technical write-up by the developer** describing whether it uses embeddings, hashing, or a classifier, or how the model was trained. The common community claim that it was "trained on synthetic images generated from Scryfall scans" could not be traced to a primary source — treat it as **plausible but unverified speculation**.

---

## 2. How TCG card scanners generally work

Every verifiable implementation — commercial or open source — uses the same **two-stage pipeline**:

### Stage 1: Detection + rectification (find the card, flatten it)

Locate the card quadrilateral in the camera frame and perspective-warp it to a canonical flat rectangle. Two families of approach:

1. **Classical CV (no ML):** grayscale → adaptive threshold / CLAHE normalization → contour detection → pick 4-corner quadrilaterals → 4-point perspective transform. Used by [tmikonen's magic_card_detector](https://tmikonen.github.io/quantitatively/2020-01-01-magic-card-detector/) (OpenCV + CLAHE), the [Moss Machine card sorter](https://github.com/KairiCollections/Moss-Machine---Magic-the-Gathering-recognition-and-sorting-machine) ("OpenCV-based card detection with contour finding and perspective correction... 4-point perspective transform"), and [hj3yoo/mtg_card_detector](https://github.com/hj3yoo/mtg_card_detector), which **started with YOLO and deliberately switched back to classical CV** in 2018. Works well when the card sits on a contrasting background; fragile with cluttered backgrounds, overlapping cards, and binder pages.
2. **Learned detectors:** YOLOv8/YOLO11 or RF-DETR trained to detect/segment cards. Used by [PokeScope](https://pokescope.app/blog/how-i-built-pokemon-card-scanner-ai-50000-users/) (YOLOv8), [qtran1018/TCG](https://github.com/qtran1018/TCG) (on-device YOLO TFLite), [MyPokemonScanner](https://ankush.one/projects/2026.pokemon-scanner/) (YOLO11n), [lo-calvin/Trading-Card-Scanner](https://github.com/lo-calvin/Trading-Card-Scanner/blob/main/README.md) (YOLOv11-seg), and the [Roboflow TCG tutorial](https://blog.roboflow.com/trading-card-inventory-management/) (RF-DETR). Robust to messy scenes; requires training data (which everyone generates synthetically — see §3).

A third, simpler option used by many apps in practice: **a guide rectangle in the UI** — ask the user to fill the frame with the card, and skip detection entirely for v1. (RiftTrades' current OCR scanner effectively does this already.)

### Stage 2: Identification (which of the N cards is it?)

Three approaches appear in the wild, in increasing order of robustness:

1. **OCR of name/collector number** — what RiftTrades does today (`apps/mobile/lib/features/scan/scan_screen.dart` matches ML Kit text against the in-memory catalog). Cheap, but fails on stylized fonts, foils, glare over the text line, and can't distinguish art variants with identical text. Every serious scanner keeps OCR only as a **secondary verification signal** ([PokeScope](https://pokescope.app/blog/how-i-built-pokemon-card-scanner-ai-50000-users/), [qtran1018/TCG](https://github.com/qtran1018/TCG)).
2. **Perceptual hashing (pHash/dHash):** hash the rectified card image into a short binary fingerprint; compare against precomputed hashes of every clean catalog scan by Hamming distance. Verified implementations: [magic_card_detector](https://tmikonen.github.io/quantitatively/2020-01-01-magic-card-detector/) (pHash against all Alpha cards, recognition threshold = 4σ from the mean hash distance), [freeall/mtg-card-detector](https://github.com/freeall/mtg-card-detector) (pHash database of **all ~80,000 MTG printings**, ~1 s lookup), and the [Moss Machine](https://github.com/KairiCollections/Moss-Machine---Magic-the-Gathering-recognition-and-sorting-machine) (256-bit pHash with per-RGB-channel hashes, ~2 s/card in a physical sorting robot). Strengths: zero training, tiny database (a few bytes per card), trivially fast. Weaknesses: pHash is a global, pixel-statistics fingerprint — it degrades under **glare, foil rainbow shift, sleeves, partial occlusion, and imperfect rectification**, which is exactly why PokeScope describes its initial "basic image comparison" approach as failing.
3. **CNN/CLIP embeddings + nearest-neighbor search:** run the rectified crop through an embedding network; match against precomputed embeddings of the clean catalog images by cosine similarity. Verified implementations: PokeScope (CLIP, [blog](https://pokescope.app/blog/how-i-built-pokemon-card-scanner-ai-50000-users/)), qtran1018/TCG (CLIP, [GitHub](https://github.com/qtran1018/TCG)), MyPokemonScanner (MobileCLIP-S2 off-the-shelf, [project page](https://ankush.one/projects/2026.pokemon-scanner/)), lo-calvin (ResNet50, [GitHub](https://github.com/lo-calvin/Trading-Card-Scanner/blob/main/README.md)), nmichlo/mtg-vision (ConvNeXt V2 trained with metric learning, [GitHub](https://github.com/nmichlo/mtg-vision)), and Zach Brown's write-up using VGG16 features + Redis vector search ([Medium](https://medium.com/@TheZachBrown/using-computer-vision-to-catalogue-trading-cards-c22981191149)). Embeddings are far more tolerant of lighting, glare, angle, and sleeves — PokeScope attributes a ~60% → 95%+ accuracy jump to this switch.

**Production-grade scanners fuse signals:** visual match candidates + OCR candidates merged (e.g. Reciprocal Rank Fusion in [qtran1018/TCG](https://github.com/qtran1018/TCG)), plus temporal smoothing (same top match on 2+ consecutive frames before locking — used by both qtran1018/TCG and PokeScan AI's "multi-frame confirmation", and already implemented in RiftTrades' OCR scanner).

---

## 3. Training methods

### 3.1 Synthetic data augmentation from clean scans (the standard approach)

Nobody hand-labels tens of thousands of real card photos to start. The universal pattern is: **take the clean catalog scans you already have, and programmatically make them look like camera photos.** Verified examples:

- **hj3yoo/mtg_card_detector** ([GitHub](https://github.com/hj3yoo/mtg_card_detector)): `fetch_data.py` downloads Scryfall card images, `transform_data.py` "generate[s] training images using the aggregated card images" to train YOLO — the model then handled "hard images with glaring & skew."
- **nmichlo/mtg-vision** ([GitHub](https://github.com/nmichlo/mtg-vision)): explicitly "Real-time and Real-world MTG card recognition **using only synthetic data**." Cards from Scryfall are "placed and warped randomly onto random background images," augmented twice per card to form positive pairs for metric learning; the detection dataset is built the same way with transformed bounding boxes.
- **diegovazquez/mtg_synthetic_dataset_generator** ([GitHub](https://github.com/diegovazquez/mtg_synthetic_dataset_generator)): goes further with photorealistic Blender/BlenderProc2 renders — randomized camera rotation, HDRI lighting, card pose — publishing a pre-generated dataset on Hugging Face.
- **lo-calvin/Trading-Card-Scanner** ([GitHub](https://github.com/lo-calvin/Trading-Card-Scanner/blob/main/README.md)): "The YOLOv11 model is finetuned on a pre-trained version **using synthetic data of cards scattered across varied environments**."
- **PokeScope** ([blog](https://pokescope.app/blog/how-i-built-pokemon-card-scanner-ai-50000-users/)): custom augmentation functions simulating sleeve reflections, flash glare on top loaders, plastic optical distortion, worn-sleeve noise — layered on top of ~10k real photos. Their view is that the sleeve/binder robustness (which required real photos + heavy augmentation) was the hard part and the moat; bare-card recognition is the easy part.
- **Delver Lens:** community lore says it was trained the same way, but as noted in §1.4 this is **unverified** — no primary source found.

Typical augmentations (union of the sources above): random perspective warp, rotation, scale/crop jitter, random backgrounds (desks, playmats, binder pages), motion/defocus blur, brightness/contrast/white-balance shifts, specular glare blobs and streaks, partial occlusion, JPEG noise.

### 3.2 Metric learning vs. classification

With one reference image per card and new sets released regularly, the field-standard formulation is **retrieval, not N-way classification**:

- Train (or reuse) an embedding network so that two views of the same card are close and different cards are far apart, then nearest-neighbor match. [nmichlo/mtg-vision](https://github.com/nmichlo/mtg-vision) uses **CircleLoss from `pytorch-metric-learning`** with positive pairs made by augmenting the same Scryfall scan twice — this is the cleanest verified recipe for a from-scratch card embedder. (ArcFace and triplet loss are the other standard losses in that library for the same purpose.)
- A classifier head (one softmax class per card) also works at RiftTrades' scale (~1631 classes) but must be retrained for every new set and gives poorly calibrated "none of the above" behavior; none of the surveyed card scanners use it. Retrieval lets you add a new set by just embedding its images.
- **Zero-training baseline:** off-the-shelf CLIP-family image encoders already separate card artwork well — [MyPokemonScanner](https://ankush.one/projects/2026.pokemon-scanner/) ships un-fine-tuned **MobileCLIP-S2** and identifies cards client-side in the browser. [MobileCLIP](https://github.com/apple/ml-mobileclip) (Apple, CVPR 2024) is a family of CLIP models designed for mobile latency (S0 is ~5× faster and 3× smaller than ViT-B/16 CLIP at similar accuracy, per the [paper](https://arxiv.org/pdf/2311.17049)). PokeScope reported that **fine-tuning** CLIP on cards was what unlocked variant-level discrimination (holo vs reverse-holo, etc.).

### 3.3 Perceptual hashing (no training at all)

pHash reduces the image to a small binary fingerprint (DCT of a downscaled grayscale image; variants hash RGB channels separately). No GPU, no training, database of a few KB for 1631 cards. Verified working at 80k-card scale ([freeall/mtg-card-detector](https://github.com/freeall/mtg-card-detector)) and in a physical sorting machine ([Moss Machine](https://github.com/KairiCollections/Moss-Machine---Magic-the-Gathering-recognition-and-sorting-machine)). The critical dependency is **accurate rectification first** — pHash compares aligned images, so a skewed or glared crop shifts the hash. tmikonen's write-up documents the accept/reject logic: match if the best hash distance is >4 standard deviations below the mean distance ([blog](https://tmikonen.github.io/quantitatively/2020-01-01-magic-card-detector/)).

---

## 4. Recommended tech stack for RiftTrades

### 4.1 Context

- Catalog: **~1631 cards, every card has a clean `image_url`** in Supabase. This is a *small* retrieval problem — 1631 embeddings × 512 floats ≈ 3.3 MB, or 1631 pHashes ≈ 50 KB. Brute-force on-device search is microseconds; no ANN index needed.
- App: Flutter (Android + iOS), already using `camera` + `google_mlkit_text_recognition`, with an offline in-memory catalog and a two-consecutive-frame lock in `scan_screen.dart`.
- Dev machine: Windows — fine for the offline pipeline (Python + PyTorch/OpenCV run natively; heavier training can use Colab/Kaggle free GPUs).

### 4.2 Recommended approach: two phases, both offline on-device

**Phase 1 — pHash matcher (days of work, no ML training).**

1. **Offline (Python on Windows):** download all 1631 `image_url` images from Supabase, compute a pHash per card (e.g. 16×16 → 256-bit, per-RGB-channel like the [Moss Machine](https://github.com/KairiCollections/Moss-Machine---Magic-the-Gathering-recognition-and-sorting-machine)), ship as a small asset or a Supabase table synced into the app's existing offline catalog.
2. **In-app:** add a card-shaped guide overlay; grab the preview frame, crop to the guide, optionally refine with a lightweight corner/contour pass, perspective-normalize, compute the pHash in Dart (it is just DCT + thresholding — no plugin required), and brute-force Hamming distance over 1631 hashes. Use tmikonen's outlier test (best distance ≫ mean distance) for accept/reject ([source](https://tmikonen.github.io/quantitatively/2020-01-01-magic-card-detector/)).
3. **Fuse with the existing OCR scanner** rather than replacing it: rank-fuse pHash candidates with name/collector-number candidates the way [qtran1018/TCG](https://github.com/qtran1018/TCG) does (RRF with a bonus for collector-number agreement), and keep the existing two-frame confirmation gate.

This alone will likely beat OCR-only scanning for non-foil cards under decent lighting, and it costs nothing to maintain: new set → hash the new images.

**Phase 2 — embedding retrieval (the "PokeScope-class" upgrade) when foils/glare/sleeves/angle matter.**

1. **Model:** start with an **off-the-shelf MobileCLIP-S0/S2 image encoder** ([apple/ml-mobileclip](https://github.com/apple/ml-mobileclip)) exported to TFLite/ONNX — verified viable without fine-tuning by [MyPokemonScanner](https://ankush.one/projects/2026.pokemon-scanner/). If variant discrimination or foil robustness is insufficient, **fine-tune with metric learning** exactly as [nmichlo/mtg-vision](https://github.com/nmichlo/mtg-vision) does: positive pairs = the same catalog image augmented twice (perspective warp, glare blobs, blur, random backgrounds, color jitter), CircleLoss/ArcFace via `pytorch-metric-learning`, then export. With 1631 source images this trains comfortably on a free Colab GPU.
2. **Runtime:** run the encoder with **`flutter_litert`** (the maintained successor fork of `tflite_flutter`, with bundled native libs and GPU/NPU acceleration via LiteRT — [pub.dev](https://pub.dev/packages/flutter_litert)); alternatively `onnxruntime_v2` for ONNX with NNAPI/CoreML acceleration ([pub.dev](https://pub.dev/packages/onnxruntime_v2)). LiteRT's model contract for image embedders (1×H×W×3 input, [1×N] float output) is documented in the [ImageEmbedder task docs](https://developers.google.com/edge/litert/libraries/task_library/image_embedder).
3. **Matching:** **brute-force cosine similarity on-device** over the 1631 precomputed embeddings (a ~3 MB Float32 asset regenerated per set release). At this scale a vector index is unnecessary, and on-device matching keeps the scanner fully offline like the current one — matching how PokeScan AI and Delver Lens both advertise offline recognition.
4. **Detection stage:** keep the guide-rectangle crop from Phase 1 initially. If free-form scanning (cards on a table, binder pages, multi-card) becomes a goal, train a YOLO11n/RF-DETR nano detector on synthetic composites (catalog images warped onto random backgrounds — the [hj3yoo](https://github.com/hj3yoo/mtg_card_detector)/[nmichlo](https://github.com/nmichlo/mtg-vision)/[Roboflow](https://blog.roboflow.com/trading-card-inventory-management/) recipe) and run it via the same TFLite runtime, as [qtran1018/TCG](https://github.com/qtran1018/TCG) does on-device.
5. **Keep OCR fusion** from Phase 1 — the collector number is the perfect disambiguator for the rare cases where two Riftbound printings share near-identical art, mirroring PokeScope's "CLIP + OCR verification" design.

### 4.3 Where matching should run: on-device vs Supabase pgvector

| | On-device brute force (recommended) | Supabase pgvector |
|---|---|---|
| Latency per frame | Microseconds (1631 × 512-dim dot products) | Network round-trip per frame — unusable for live viewfinder scanning |
| Offline | Yes (matches current scanner behavior) | No |
| Ops | Ship a ~3 MB embedding asset with app/set updates | Store embeddings in a `vector(512)` column, match via an RPC function with the `<=>` operator ([Supabase vector columns guide](https://supabase.com/docs/guides/ai/vector-columns), [pgvector guide](https://supabase.com/docs/guides/database/extensions/pgvector)) |
| Good use | The live scanner | Optional server-side features: "identify from a photo upload," web version, analytics; embeddings pipeline mirrors Supabase's own [CLIP image-search example](https://supabase.com/docs/guides/ai/examples/image-search-openai-clip) |

Recommendation: **on-device for the scanner; add a pgvector column later only if a server-side lookup feature is wanted.** At 1631 rows even pgvector needs no HNSW/IVFFlat index.

### 4.4 What to avoid

- **Cloud LLM per frame** (the Gemini approach of the Japanese PokeScan web tool): high latency, per-scan cost, no offline — wrong fit for a live scanner.
- **N-way softmax classifier over card IDs:** retrain on every set release; retrieval formulation avoids this entirely (§3.2).
- **Heavy real-photo data collection:** PokeScope's months of manual sleeve photography solved a problem (binder scanning through plastic) that RiftTrades does not need to solve for v1. Synthetic augmentation of the 1631 clean images is the verified, sufficient starting point.

---

## 5. Source list

**PokeScan-named apps (disambiguation)**
- PokeScan (Yeti Apps) — Google Play: https://play.google.com/store/apps/details?hl=en_US&id=com.yetiapps.pokescan
- PokeScan AI (Lucas Alvarenga) — App Store: https://apps.apple.com/us/app/pokescan-ai/id6755688940
- Card Value Scanner: PokeScan (Štěpán Záliš) — App Store: https://apps.apple.com/us/app/card-value-scanner-pokescan/id6477778856 ; site: https://stepanzalis.github.io/pokescan/ ; developer GitHub: https://github.com/stepanzalis
- Pokescan – TCG Card Scanner (Alexandre Morcos) — App Store: https://apps.apple.com/ml/app/pokescan-tcg-card-scanner/id6759465431
- PokeScan web tool (Gemini-based, Japanese): https://www.pokescan.etcetera.work/
- PokeScan QR scanner (Titan Cards, unrelated): https://apps.apple.com/us/app/pokescan/id1462580054

**Commercial scanner engineering write-ups**
- PokeScope — "How I Built a Pokemon Card Scanner App with AI": https://pokescope.app/blog/how-i-built-pokemon-card-scanner-ai-50000-users/
- Delver Lens official site (scanning guidance): https://www.delverlab.com/
- Delver Lens Google Play listing (full-card recognition, developer identity): https://play.google.com/store/apps/details?id=delverlab.delverlens&hl=en_US
- Delver about/FAQ ("lambda" model, developer background): https://delver.app/
- Cassio Santos (Delver Lens developer, image-retrieval background): https://linkedin.com/in/cassiosantosjr

**Open-source card recognition projects**
- qtran1018/TCG (Pokémon scanner: YOLO TFLite + CLIP + ML Kit OCR + RRF fusion): https://github.com/qtran1018/TCG
- MyPokemonScanner (YOLO11n + MobileCLIP-S2, client-side): https://ankush.one/projects/2026.pokemon-scanner/
- lo-calvin/Trading-Card-Scanner (YOLOv11-seg + ResNet50 embeddings, synthetic training): https://github.com/lo-calvin/Trading-Card-Scanner/blob/main/README.md
- tmikonen/magic_card_detector (OpenCV + pHash): https://github.com/tmikonen/magic_card_detector ; blog: https://tmikonen.github.io/quantitatively/2020-01-01-magic-card-detector/
- freeall/mtg-card-detector (pHash at 80k-card scale): https://github.com/freeall/mtg-card-detector
- Moss Machine (256-bit RGB pHash sorting robot): https://github.com/KairiCollections/Moss-Machine---Magic-the-Gathering-recognition-and-sorting-machine
- hj3yoo/mtg_card_detector (YOLO on synthetic data → classical CV + pHash): https://github.com/hj3yoo/mtg_card_detector
- nmichlo/mtg-vision (synthetic-only training, ConvNeXt V2 + CircleLoss metric learning): https://github.com/nmichlo/mtg-vision
- diegovazquez/mtg_synthetic_dataset_generator (BlenderProc2 synthetic renders): https://github.com/diegovazquez/mtg_synthetic_dataset_generator
- Zach Brown — "Using Computer Vision to Catalogue Trading Cards" (VGG16 embeddings + vector search): https://medium.com/@TheZachBrown/using-computer-vision-to-catalogue-trading-cards-c22981191149
- Roboflow — "Automate TCG Inventory: Pokémon Card OCR" (RF-DETR detection): https://blog.roboflow.com/trading-card-inventory-management/

**Models, runtimes, and infrastructure**
- MobileCLIP (Apple): https://github.com/apple/ml-mobileclip ; paper: https://arxiv.org/pdf/2311.17049
- flutter_litert (maintained LiteRT/TFLite Flutter plugin): https://pub.dev/packages/flutter_litert
- tflite_flutter (original TensorFlow-managed plugin): https://pub.dev/packages/tflite_flutter
- onnxruntime_v2 (ONNX Runtime Flutter plugin with NNAPI/CoreML): https://pub.dev/packages/onnxruntime_v2
- LiteRT ImageEmbedder task API (embedder model contract): https://developers.google.com/edge/litert/libraries/task_library/image_embedder
- Supabase pgvector extension guide: https://supabase.com/docs/guides/database/extensions/pgvector
- Supabase vector columns + RPC match functions: https://supabase.com/docs/guides/ai/vector-columns
- Supabase image search with CLIP example: https://supabase.com/docs/guides/ai/examples/image-search-openai-clip
