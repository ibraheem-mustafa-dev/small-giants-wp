# Snooza Chair — Image Shortlist for 3D Model Generation

Generated: 2026-03-31
Purpose: Select best reference images for Tripo Pro multi-photo 3D model input


## 1. Best Images for Tripo Pro (Ranked)

The base model should be the **blue variant** — it has the most coverage across angles.

| Rank | File | Angle | Why it's good |
|------|------|-------|---------------|
| 1 | `product-images/fortuna-blue.jpg` | Three-quarter front-left, slightly elevated | Highest resolution isolated shot. Clean domestic background, no person occluding. Shows front face, left side, seat interior, and top of backrest. Best single image of the chair. |
| 2 | `curated-cropped/seg1_0201.png` | Three-quarter front-right, eye level | Cleanly cropped from video. Person's torso is behind the chair (not occluding shape). Shows right side panel, front opening, and right arm. Complements fortuna-blue's left-side view. |
| 3 | `curated-cropped/seg1_0301.png` | Front-right, slightly angled, eye level | Tighter crop, person's hands cropped out. Clear view of right side panel seams, front face, and base/floor contact. Good for understanding the boxy base shape. |
| 4 | `curated-cropped/seg1_0151.png` | Three-quarter front-right, slightly more rotated | Shows more of the right side and back curve than seg1_0201. Useful as an intermediate angle between front and side. |
| 5 | `curated-cropped/seg1_0401.png` | Front-left, eye level | Clean crop. Shows left arm, front opening, and seat cavity. Hands out of frame. Good complementary angle to the right-side shots. |
| 6 | `product-images/video-still-060.jpg` | Right side profile | Chair rotated so we see the right side almost straight-on. Person behind, not blocking the chair. Shows the side silhouette and backrest curve clearly. Best side-profile shot available. |
| 7 | `product-images/video-still-160.jpg` | Right side profile with legrest attached | Shows the chair from the right side with the legrest accessory in place. Useful for understanding the side profile even though the legrest is present — the chair body shape is visible. |
| 8 | `product-images/fortuna-pink.jpg` | Top-down three-quarter, elevated camera | Different colour but critical angle. Taken from above looking down into the seat. Shows the seat cavity, headrest position, pommel attached, arm shapes, and the rounded back from above. No other image shows this overhead perspective. |
| 9 | `product-images/video-still-100.jpg` | Three-quarter front-left, person behind | Full-length video still. Person is behind and to the left, not blocking the chair. Shows left side, front, and gives scale context. |
| 10 | `product-images/video-still-040.jpg` | Three-quarter front-right, slightly elevated | Person behind, chair shown from right side with front visible. Shows the curve of the back and the relationship between the boxy base and rounded upper section. |
| 11 | `product-images/fortuna-orange.jpg` | Three-quarter front-left, elevated | Different colour but shows headrest accessory attached and full front-left view. Higher vantage point than fortuna-blue. Domestic background. |
| 12 | `curated-cropped/seg1_0051.png` | Front-right, eye level | Similar to seg1_0201 but slightly different rotation. Clean crop, person minimally visible. |


## 2. Colour Reference Images

One image per colour variant for texture mapping after the base 3D model is built.

| Colour | File | Notes |
|--------|------|-------|
| Royal Blue | `product-images/fortuna-blue.jpg` | Best isolated shot. Blue vinyl outer, grey/white vinyl inner, black quilted seat pad. |
| Mandarin Orange | `product-images/fortuna-orange.jpg` | Good quality. Shows headrest attached. Orange vinyl outer, grey inner. |
| Hot Pink | `product-images/fortuna-pink.jpg` | Excellent overhead angle. Pink vinyl outer, grey inner. Shows pommel accessory. |
| Apple (Green) | `product-images/fortuna-green.png` | Real product photograph. Shows a child seated in a green chair with tray and legrest. Good colour reference for the green variant. |
| Grey | No isolated shot available | Grey variant visible in `ophir-01-main.png` (small, grouped with other colours). No dedicated high-res image. |
| Black | No isolated shot available | Black variant visible in `ophir-01-main.png` (small, grouped). No dedicated high-res image. |


## 3. Accessory Reference Images

| Accessory | File | Notes |
|-----------|------|-------|
| Profile Headrest | `product-images/fortuna-headrest.jpg` | Close-up of headrest sitting on top of chair back. Shows "snooza" brand label. Grey vinyl, contoured shape. Good for modelling as a separate piece. |
| Leg Rest | `product-images/fortuna-legrest.jpg` | Close-up showing legrest attached to front of chair (orange variant). Grey vinyl block with wheels visible underneath. Shows how it connects to the base. |
| Pommel (Medial Thigh Support) | `product-images/fortuna-pommel.jpg` | Three-quarter view of red/orange chair with grey pommel cushion between the legs area. Shows positioning and relative scale. |
| Padded Tray | `product-images/fortuna-tray.jpg` | Front view of orange chair with grey tray attached across the arms. Shows the flat tray surface and how it sits on the armrests. |
| Rocker Base | No isolated shot | Visible in some ophir images (corrupted) and briefly in video. Not available as a clean reference. |
| Mobile Base | `product-images/video-still-180.jpg` | Chair shown on the black mobile base platform. Shows wheels and base dimensions relative to chair. Person partially in frame. |
| Hip Belt | `product-images/video-still-050.jpg` | Video still showing the presenter demonstrating the harness/belt system. Straps visible across the seat opening. |
| Breathable Wrap/Cover | `product-images/video-still-050.jpg` | Same still — grey breathable cover visible draped over the backrest. |


## 4. Corrupted / Unusable Images

These files have bad JPEG/PNG headers or are too small/low-quality to use:

| File | Status |
|------|--------|
| `product-images/ophir-01-all-colours-overhead.jpg` | Corrupted JPEG |
| `product-images/ophir-02-pink-canopy-rocker.jpg` | Corrupted JPEG |
| `product-images/ophir-03.jpg` | Corrupted JPEG |
| `product-images/ophir-04.jpg` | Corrupted JPEG |
| `product-images/ophir-05.jpg` | Corrupted JPEG |
| `product-images/ophir-06.jpg` | Corrupted JPEG |
| `product-images/ophir-07.jpg` | Corrupted JPEG |
| `product-images/ophir-08.jpg` | Corrupted JPEG |
| `product-images/ophir-09.png` | Corrupted PNG |
| `product-images/ophir-10.png` | Corrupted PNG |
| `product-images/ophir-11.jpg` | Corrupted JPEG |
| `product-images/ophir-12.jpg` | Corrupted JPEG |
| `product-images/ophir-13.jpg` | Corrupted JPEG |
| `product-images/ophir-14.jpg` | Corrupted JPEG |
| `product-images/ophir-01-main.png` | Renders but extremely small/low resolution — shows all 6 colours in a row. Usable only as a colour reference thumbnail. |
| `product-images/ophir-02.png` | Renders but extremely small/low resolution — shows chair from behind on a sofa. Too small for 3D reference. |
| `product-images/fortuna-green.png` | Real photograph — retained as colour reference. |


## 5. Recommendation — Primary Tripo Pro Input Set

**Upload these 8 files to Tripo Pro for the base blue model:**

1. `product-images/fortuna-blue.jpg` — primary reference, three-quarter front-left
2. `curated-cropped/seg1_0201.png` — three-quarter front-right
3. `curated-cropped/seg1_0301.png` — front-right, closer
4. `curated-cropped/seg1_0151.png` — intermediate right angle
5. `product-images/video-still-060.jpg` — right side profile
6. `product-images/video-still-100.jpg` — front-left with scale
7. `product-images/fortuna-pink.jpg` — overhead/elevated angle (different colour but only source for top-down view)
8. `product-images/video-still-040.jpg` — front-right elevated

9. `product-images/video-still-175.jpg` — rear-left three-quarter (best rear angle available, presenter partially blocks upper back)
10. `product-images/video-still-135.jpg` — left side profile (fills the left-side gap)

**Why this set works:**
- Covers front, both sides, and a top-down view
- Mix of isolated product shots (sharp, clean) and video crops (additional angles)
- The blue chair dominates (6 of 8 images), with the pink only for the overhead angle that no blue image provides
- Person is behind the chair in video frames, not blocking geometry

**Why not curated-cropped only:**
The curated-cropped frames are well-cropped but all show very similar angles (front-right three-quarter, eye level). They lack side profiles and top-down views. The fortuna product shots fill those gaps.


## 6. Gaps — What Would Improve the 3D Model

| Missing angle | Impact | How to get it |
|---------------|--------|---------------|
| **Back view (rear)** | HIGH — no image shows the back of the chair. Tripo will have to guess the rear surface, seams, and any labels/handles. | Photograph the chair from directly behind. Even a phone snapshot would help. |
| **Pure side profile (left)** | MEDIUM — we have right-side views from the video but no clean left-side shot. | Photograph from the left side. |
| **Bottom / underside** | MEDIUM — no image shows the base underside. The flat bottom, any grip pads, or zippers are invisible. | Tip the chair and photograph the base. |
| **Top-down (blue variant)** | MEDIUM — only top-down view is the pink fortuna-pink.jpg. A blue version would avoid colour confusion in Tripo. | Photograph the blue chair from above. |
| **Clean background shots** | LOW-MEDIUM — fortuna-blue has a domestic background (wooden floor, skirting board). Video stills have the presenter behind the chair. Pure white/grey backgrounds would help Tripo isolate the geometry. | Use a plain sheet or photograph against a wall. |
| **Close-up of seams and texture** | LOW — the quilted black seat pad and vinyl panel seams are visible but not in detail. | Close-up photos of material textures for PBR material creation later. |

**Bottom line:** The biggest gap is the complete absence of a rear view. If you can get one photo of the back of the chair before the Tripo session, it will significantly improve the model quality. Everything else is workable.
