# M2 — sgs/hero split-media surface: evidence report

Read-only investigation. Scope: `sgs/hero` split-media only (Settings-tab "Split image" panel
+ Styles-tab "Split image styling" panel). Files: `plugins/sgs-blocks/src/blocks/hero/{edit.js,
block.json,render.php,style.css}`, `plugins/sgs-blocks/includes/helpers-tier-media.php`,
`plugins/sgs-blocks/src/components/{MediaPicker,GradientOverlayControl,ResponsiveControl}.js`.

**Expected population declared before counting:** the split-media attribute family in
`block.json` has 33 members (`splitImage`/Tablet/Mobile, `splitMediaType`×3, `splitVideo`×3,
`splitSvg`×3, `splitMediaObjectFit`, `splitMediaObjectPosition`×3, `splitMediaWidth`×3+Unit,
`splitMediaHeight`+Unit, `splitMediaBorderRadius`×3, `splitMediaBorderStyle`, `splitMediaBorderWidth`,
`splitMediaBorderColour`+Gradient, `splitMediaPadding`×3, `mediaBackground`+Gradient,
`mediaOverlayColour`+Gradient, `mediaParallax`, `mediaKenBurns`, `mediaAnimationDuration`,
`mediaPadding`×3). All 33 were traced to a control before concluding anything was orphaned.

---

## Defect verdicts

### 1. "Media-type dropdown only appears after you pick a main image" — CONFIRMED, real bug

`edit.js:680` — `{ splitImage?.url && ( <ResponsiveControl label="Media type">…</ResponsiveControl> ) }`.
The entire Media-Type control (all three device tiers, including desktop) is gated on
`splitImage?.url` truthy.

The gate is deliberate for the *tablet/mobile override* case (comment at `edit.js:675`: "a
per-device override for media that is not there is a dead control"), but that rationale does not
extend to the **desktop** tier — there is no image dependency for a desktop-only video/SVG hero at
the render layer. Proof: `render.php`'s `$sgs_hero_resolve_split_type()` (line 1162) resolves
`'video'` from `$video['url']` alone and `'svg'` from `$svg` alone — neither branch reads
`$image` at all. So render.php fully supports an image-free split hero; the editor cannot reach
that state, because the only way to unlock the type selector is to first upload and keep an
unrelated "main image."

Verdict: **accidental scope creep of a deliberate tablet/mobile rule onto the desktop base case.**
Not "impossible" to fix cheaply — the fix is decoupling the *base/desktop* row of the Media Type
control from `splitImage?.url`.

### 2. "No video/SVG-specific controls appear" — MIXED, three distinct sub-findings

**(a) Video/SVG source pickers DO exist and DO render** — once past Defect 1. `edit.js:736-773`
(video: `MediaUpload`/`MediaUploadCheck` "Select video"/"Replace video" button) and `edit.js:775-802`
(SVG: `TextareaControl` "SVG code") both render correctly the moment `currentType` resolves to
`'video'`/`'svg'`. If Bean never got past Defect 1's gate, this is why "nothing appeared."

**(b) Styling controls (object-fit, object-position, width, height, border, padding, background)
in the "Split image styling" panel DO reach video and SVG at the CSS layer** — this was fixed on
2026-08-27 (commit `33816708e`, documented in `block.json:265-284` and `render.php:1253-1264`).
Confirmed independently by reading the render.php emission code directly (not just trusting the
comment): padding (`render.php:546-559`), border-radius/width/colour (`561-617`), object-fit/
position (`619-641`, deliberately scoped to `--image,--video` only — excluded from the SVG `<span>`
because these are replaced-element CSS properties that are a no-op on inline SVG), width (`643-655`,
gated on `custom` fit, same gate as the editor), height (`657-674`, ungated). All target the
type-agnostic `.sgs-hero__split-media` base class, which every tier carries regardless of type.
So: **object-fit/object-position are genuinely inert on SVG** (documented, deliberate, not a bug);
**everything else does style video and SVG already.**

However, the panel gives **zero visual signal** that this is happening: it is titled "Split image
styling", and its object-position preview (`FocalPositionField` at `edit.js:1348`) always shows
`url={ splitImage?.url }` — the main IMAGE, never the selected video/SVG — regardless of which
type is actually rendering. A client who switches to video and opens this panel sees an
image-labelled panel showing an image thumbnail, which reasonably reads as "this doesn't apply to
my video," even though the values it writes do reach the video.

**(c) Genuinely missing controls (case: does not exist)** — there is **no control anywhere** for
video playback behaviour: autoplay, loop, muted, native controls visibility, or a poster image.
`sgs_tier_media_render()` (`includes/helpers-tier-media.php:231-242`) hardcodes
`loop muted playsinline` on every `<video>` tag and defaults `video_autoplay` to `true`
(`hero`'s call site at `render.php:1265` passes no `$options` override, so it gets the default).
No `splitVideoLoop`/`Autoplay`/`Muted`/`Poster` attribute is declared in `block.json`, confirmed by
grep returning zero hits. This is the one piece of Bean's report that is unambiguously true and
unambiguously a gap, not a mislabel.

### 3. "Two panels that should be one" — CONFIRMED, by design (WP tab convention), not an accident

- **"Split image"** — `edit.js:602`, inside the default `<InspectorControls>` (Settings tab,
  `edit.js:574-901`). Contains: main image + tablet/mobile art-direction picker, the Media Type
  selector (+ video/SVG source sub-controls), the media overlay colour/gradient, and the media
  Ken-Burns/parallax motion pair.
- **"Split image styling"** — `edit.js:1295`, inside `<InspectorControls group="styles">` (Styles
  tab, `edit.js:905-1617`). Contains: object-fit, object-position, custom width/height (gated),
  the border control, image (inner) padding, media background colour/gradient, and media (outer)
  padding.

This is WordPress's standard Settings-vs-Styles tab split (source picked in Settings, appearance
in Styles) — the same convention the framework uses elsewhere, not a duplicate-panel bug. What IS
a real usability cost: **both panels carry "image" in the title** even though both now cover video
and SVG too, so a client configuring one media element has to recognise two differently-tabbed,
identically-mislabelled panels as belonging to the same thing.

### 4. Rename surface — narrower than it first looks; most of the family is ALREADY generic

Bean's framing ("naming says split image, controls now cover all three types → rename to split
media") is correct at the **panel-title / label** layer, but the **attribute layer was already
migrated to generic naming on 2026-08-27** (same commit that fixed CSS reach in #2b). Concrete
inventory:

**Needs renaming (client-facing, still says "image"):**
| Location | Current text | file:line |
|---|---|---|
| PanelBody title (Settings tab) | "Split image" | `edit.js:602` |
| PanelBody title (Styles tab) | "Split image styling" | `edit.js:1295` |
| ResponsiveControl label wrapping the main-media MediaPicker | "Split image" | `edit.js:625` |
| Help text | `'Set the image above in "Split image".'` | `edit.js:729-734` (self-consistent once the panel above is renamed) |

**Do NOT rename (genuinely image-specific, renaming would be inaccurate):**
- `splitImage`/`splitImageTablet`/`splitImageMobile` attributes — these hold only an
  `{id,url,alt}` image object; video/SVG have their own separate attrs (`splitVideo*`, `splitSvg*`).
  Renaming these to "media" would misdescribe what they actually store.
- `.sgs-hero__split-image` CSS class and the `split-image` element in `block.json`'s Rosetta
  manifest (`block.json:258-265`) — by design this is the IMAGE type's own extra class for
  image-only structural CSS (base 100%×100% sizing + hover-zoom, `style.css:292,305-318`). It is
  correctly scoped and explicitly documented as such.

**Already generic (no action needed — this is the part of the rename Bean is describing that has
already shipped):** `splitMediaType*`, `splitMediaObjectFit`, `splitMediaObjectPosition*`,
`splitMediaWidth*`, `splitMediaHeight*`, `splitMediaBorder*`, `splitMediaPadding*`,
`mediaOverlay*`, `mediaParallax`, `mediaKenBurns`, `mediaAnimationDuration`, `mediaBackground*`,
`mediaPadding*`, and the `split-media` element in the manifest (`block.json:267-284`, label
"Split media", already the type-agnostic owner of the whole `splitMedia*` family).

**Net:** the rename job left to do is 2 panel titles + 1 control label + matching help text —
not an attribute-level migration.

### 5. "Controls are outdated" — one confirmed instance, everything else current

- **`RRangeControl` (splitMediaWidth family) — CONFIRMED outdated primitive.** Defined as a
  bespoke local function inside `hero/edit.js:128`, used exactly once, at `edit.js:1363`, for
  `splitMediaWidth`/`splitMediaWidthTablet`/`splitMediaWidthMobile`. It is a hand-rolled
  `ResponsiveControl` + flat-scalar-trio pattern — the OLD shape the framework's tier-object
  migration (Spec 35/D549, `scripts/migrate-tier-object.py`) was built to replace. Its own sibling
  attribute on the same panel, `splitMediaHeight`, was already migrated to the current tier-OBJECT
  shape and uses the current `ResponsiveOverride` component (`edit.js:1383-1402`) — the contrast is
  documented in the surrounding comment (`edit.js:1377-1382`) but the width control itself was
  never migrated to match.
- **`SgsBorderControl`** (`edit.js:1419`) — current standard (44-block rollout, D876/D881). Correct.
- **`GradientOverlayControl`** (media overlay + media background rows) — this is NOT the raw/legacy
  `<DesignTokenPicker>` shape; it was rebuilt 2026-08-22 (D4) as a thin adapter over
  `DesignTokenPicker` that renders the identical row/popover/tab shape every `SgsColourPanel` row
  uses (see its own docblock, `GradientOverlayControl.js:1-45`). Current, not outdated.
- **`ResponsiveBoxControl`** (image padding, media padding) — matches the current box-object /
  `BoxControl` standard. Current.
- **Plain `SelectControl`** for Object fit and Media Type — an enum dropdown; no shared "standard"
  component supersedes a plain `SelectControl` for this shape. Not outdated.

**Bonus finding (not one of the 5 asked, but load-bearing for #2 and worth flagging):**
`MediaPicker` (the shared component used for the main "Split image" picker, `edit.js:634`) is
called **without an `allowedTypes` restriction**, so it inherits the component's own default of
`['image', 'video']` (`MediaPicker.js:77`). That means the WP media-library modal opened by this
picker will let an operator select an actual video file into `splitImage`. Hero's call site then
force-labels whatever comes back as `type: 'image'` on read (`edit.js:636-638`,
`current?.url ? { ...current, type: 'image' } : null`) and writes only `{id, url, alt}` — dropping
the picker's own `type`/`mime` fields — into the `splitImage` attribute, which `render.php` always
treats as an `<img>` source. A video selected here would silently render as a broken `<img src="…mp4">`.
This is a real, distinct latent bug in the "Split image" (main-media) control, separate from the
typed `splitVideo`/`splitSvg` family.

---

## Full attribute inventory

| Attribute | Control | Panel (tab) | Order | Gated on | Styles | Applies to |
|---|---|---|---|---|---|---|
| `splitImage` | `MediaPicker` (via `ResponsiveControl`) | Split image (Settings) | 1 | `isSplit` | — | image (but picker itself also accepts video files, see bug above) |
| `splitImageTablet` | same, bp='tablet' | Split image (Settings) | 1 | `isSplit` | — | image |
| `splitImageMobile` | same, bp='mobile' | Split image (Settings) | 1 | `isSplit` | — | image |
| `splitMediaType` | `SelectControl` (via `ResponsiveControl`) | Split image (Settings) | 2 | `isSplit` AND `splitImage?.url` (defect 1) | — | selector |
| `splitMediaTypeTablet` | same, bp='tablet' | Split image (Settings) | 2 | same | — | selector |
| `splitMediaTypeMobile` | same, bp='mobile' | Split image (Settings) | 2 | same | — | selector |
| `splitVideo` | `MediaUpload` button | Split image (Settings) | 2 (nested) | `currentType==='video'` (desktop) | — | video |
| `splitVideoTablet` | same, bp='tablet' | Split image (Settings) | 2 (nested) | `currentType==='video'` (tablet) | — | video |
| `splitVideoMobile` | same, bp='mobile' | Split image (Settings) | 2 (nested) | `currentType==='video'` (mobile) | — | video |
| `splitSvg` | `TextareaControl` | Split image (Settings) | 2 (nested) | `currentType==='svg'` (desktop) | — | svg |
| `splitSvgTablet` | same, bp='tablet' | Split image (Settings) | 2 (nested) | `currentType==='svg'` (tablet) | — | svg |
| `splitSvgMobile` | same, bp='mobile' | Split image (Settings) | 2 (nested) | `currentType==='svg'` (mobile) | — | svg |
| `mediaOverlayColour` | `GradientOverlayControl` (solid) | Split image (Settings) | 3 | `isSplit` | — | all (foreground media overlay) |
| `mediaOverlayGradient` | `GradientOverlayControl` (gradient) | Split image (Settings) | 3 | `isSplit` | — | all |
| `mediaKenBurns` | `ToggleControl` | Split image (Settings) | 4 | `isSplit` | — | all |
| `mediaParallax` | `ToggleControl` | Split image (Settings) | 4 | `isSplit` | — | all |
| `mediaAnimationDuration` | `RangeControl` | Split image (Settings) | 4 (nested) | `mediaKenBurns` truthy | — | all |
| `splitMediaObjectFit` | `SelectControl` | Split image styling (Styles) | 1 | `isSplit` | — | image, video (no-op on svg by CSS scope) |
| `splitMediaObjectPosition` | `FocalPositionField` (via `ResponsiveControl`, desktop) | Split image styling (Styles) | 2 | `isSplit` | — | image, video (no-op on svg) |
| `splitMediaObjectPositionTablet` | same, bp='tablet' | Split image styling (Styles) | 2 | `isSplit` | — | image, video |
| `splitMediaObjectPositionMobile` | same, bp='mobile' | Split image styling (Styles) | 2 | `isSplit` | — | image, video |
| `splitMediaWidth` | `RRangeControl` (outdated, see #5) | Split image styling (Styles) | 3 | `splitMediaObjectFit==='custom'` | — | all |
| `splitMediaWidthTablet` | same | Split image styling (Styles) | 3 | same | — | all |
| `splitMediaWidthMobile` | same | Split image styling (Styles) | 3 | same | — | all |
| `splitMediaWidthUnit` | `SgsLengthControl` | Split image styling (Styles) | 3 | `splitMediaObjectFit==='custom'` | — | all |
| `splitMediaHeight` | `ResponsiveOverride` + `RangeControl` | Split image styling (Styles) | 3 | `splitMediaObjectFit==='custom'` (editor); UNGATED at render | — | all |
| `splitMediaHeightUnit` | `SgsLengthControl` | Split image styling (Styles) | 3 | `splitMediaObjectFit==='custom'` | — | all |
| `splitMediaBorderRadius`/`Tablet`/`Mobile` | `SgsBorderControl` (radius) | Split image styling (Styles) | 4 | `isSplit` | — | all |
| `splitMediaBorderStyle` | `SgsBorderControl` (style, in colour popover) | Split image styling (Styles) | 4 | `isSplit` | — | all |
| `splitMediaBorderWidth` | `SgsBorderControl` (width) | Split image styling (Styles) | 4 | `isSplit` | — | all |
| `splitMediaBorderColour`/`Gradient` | `SgsBorderControl` (colour) | Split image styling (Styles) | 4 | `isSplit` | — | all |
| `splitMediaPadding`/`Tablet`/`Mobile` | `ResponsiveBoxControl` ("Image padding") | Split image styling (Styles) | 5 | `isSplit` | — | all |
| `mediaBackground`/`Gradient` | `GradientOverlayControl` | Split image styling (Styles) | 6 | `isSplit` | — | all |
| `mediaPadding`/`Tablet`/`Mobile` | `ResponsiveBoxControl` ("Media padding") | Split image styling (Styles) | 7 | `isSplit` | — | all |

**Declared-but-uncontrolled count: 0.** Every one of the 33 split/media attributes in `block.json`
resolves to a live editor control. There is no orphan in this family — the earlier-documented gap
("dead controls: splitMediaType, splitVideo, splitSvg families, all 9 attrs", `edit.js:207-209`
comment) was closed on 2026-08-13 and is no longer current.

**Controls that show when irrelevant:** none found that render but do nothing whatsoever — the
closest case is object-fit/object-position rendering identically regardless of whether the current
type is SVG (for which they are a documented no-op), which is a *visibility* problem (panel doesn't
say so), not a rendering-when-impossible problem.

**Full rendered panel order (isSplit only), Advanced marked:** no "Advanced" InspectorControls
group is used anywhere in this surface (WP's Advanced group is unrelated — HTML anchor etc. — and
hero doesn't touch split-media attrs there).

1. Settings tab → PanelBody "Split image" (closed by default)
   1. Split image (ResponsiveControl: main image + tablet/mobile art-direction)
   2. Media type (ResponsiveControl, **gated on splitImage?.url** — defect 1) → nested video/SVG/image sub-controls
   3. Overlay (heading) → GradientOverlayControl (mediaOverlay*)
   4. Ken-burns / parallax toggles → nested RangeControl (gated on Ken-burns)
2. Styles tab → PanelBody "Split image styling" (closed by default)
   1. Display (heading) → Object fit SelectControl
   2. Object position (ResponsiveControl → FocalPositionField, image-only preview)
   3. Custom dimensions (gated on `splitMediaObjectFit==='custom'`) → Width (RRangeControl, outdated) + unit, Height (ResponsiveOverride) + unit
   4. SgsBorderControl (width/style/colour/gradient/radius)
   5. Image padding (ResponsiveBoxControl)
   6. Background (heading) → GradientOverlayControl (mediaBackground)
   7. Media padding (ResponsiveBoxControl, outer)

---

## What could not be determined statically

- Whether an operator ever actually manages to select a video file through the mislabeled
  `MediaPicker` in practice (the WP media-modal UI would show it as a valid choice given
  `allowedTypes` defaults to `['image','video']`) — this needs a live editor check, not a static read.
- Live visual confirmation that video/SVG really do pick up border/padding/width/height on the
  canary — the CSS emission is proven from source, but was not verified against a rendered page in
  this pass (out of scope for a read-only source-evidence pass; flagged for whoever picks up the fix).
