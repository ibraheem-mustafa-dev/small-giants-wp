# sgs/hero background standardisation — investigation + fix-shape options

**Type:** Investigation and design only. No code changed. Design-gated per project rule 7 (shared wrapper/composite architecture) — Bean's approval required before any build.

**Scope:** `sgs/hero` (`plugins/sgs-blocks/src/blocks/hero/{block.json,edit.js,render.php}`) + `SGS_Container_Wrapper` (`plugins/sgs-blocks/includes/class-sgs-container-wrapper.php`) + the cloning converter (`plugins/sgs-blocks/scripts/converter/`).

---

## 1. Capability map — every background-related attribute

### 1a. Hero's own, variant-scoped background media (block-private)

Declared in `sgs/hero/block.json` `supports.sgs.variants` (lines 62-77) and confirmed by the DB (`variant_slots`, §2 below):

| Variant | Attr(s) | Rendered by | Editor control |
|---|---|---|---|
| `standard` | `backgroundImage` | `render.php:797-826` — a real `<img class="sgs-hero__bg-img">` (not CSS `background-image`), first-hero LCP hint (`fetchpriority="high"`, `loading="eager"`), Ken-Burns/parallax classes | edit.js `PanelBody "Image"` → `MediaUpload`, gated `!isSplit && !isVideo && !isSvgAnimated` (edit.js:757-835) |
| `split` | `splitImage`, `splitMedia`, `splitImageMobile` | `render.php:883-991` — image/video in the dedicated `.sgs-hero__media` grid column (a layout column, not a background layer) | edit.js `PanelBody "Image"` → `MediaPicker`, gated `isSplit` (edit.js:837-999) |
| `video` | `backgroundVideo` | `render.php:761-790` — `<video class="sgs-hero__video-bg">`, gated `$is_video && !empty($bg_video['url'])` | edit.js `PanelBody "Background Video"`, gated `isVideo` (edit.js:1080-1157) |
| `svg-animated` | `svgContent` | `render.php:829-831` — raw `dangerouslySetInnerHTML` SVG markup, **no animation-preset engine of its own** (help text: "Animation will be handled by the SVG itself") | edit.js `PanelBody "SVG Background"`, gated `isSvgAnimated` (edit.js:1161-1197) |
| any | `overlayColour` / `overlayOpacity` (legacy) or `backgroundOverlayColour` / `backgroundOverlayOpacity` (WS-4 rename, preferred) | `render.php:834-841` — `.sgs-hero__overlay` span | Duplicated per-variant panel (each of the 3 variant panels repeats its own overlay colour/opacity controls) |

### 1b. Container-mirror background attrs also present on hero (composite-mirror rule, D152)

`block_composition.container_kind = 'section'` for `sgs/hero` (DB-confirmed, §2), so hero mirrors `sgs/container`'s full section-kind wrapper capability set, including its background family: `backgroundImage`, `backgroundImageTablet`, `backgroundImageMobile`, `backgroundSize`, `backgroundPosition`, `backgroundRepeat`, `backgroundAttachment`, `bgVideo`, `bgVideoMobile`, `bgSvgContent`, `bgSvgPosition`, `bgSvgAnimation`, `bgSvgAnimationSpeed`, `bgSvgOpacity`, `bgSvgMinHeight`, `bgSvgTextShadow`, `overlayGradient*`. All are declared attrs on `sgs/hero/block.json` (lines 602-692) — the DB (`block_attributes`) confirms `bgVideo`/`bgSvgContent`/`backgroundImageTablet`/`backgroundImageMobile` all exist on `sgs/hero` with `canonical_slot='backgroundMedia'`, identically to `sgs/container` and `sgs/trust-bar`.

`SGS_Container_Wrapper::render()` (called at `render.php:1043`) is `is_section` for hero (`kind='section'`, `render.php:1033`) and therefore WOULD render its own background-image/video/overlay/SVG layers from these attrs — **unless hero nulls them first.**

`render.php:1016-1030` nulls out `backgroundImage`, `backgroundImageTablet`, `backgroundImageMobile`, `backgroundVideo`, `bgVideo`, `bgVideoMobile`, `minHeight*` before calling the wrapper (the "C3 double-emit guard"). **`bgSvgContent` and its whole SVG-animation family are NOT in that null list.**

### 1c. Confirmed, literal overlap (not merely conceptual)

Three separate pieces of evidence converge on a real, currently-shippable defect, not a hypothetical:

1. **`hero/edit.js:1334`** unconditionally renders `<BackgroundPanel attributes={attributes} setAttributes={setAttributes} />` (imported from `container/components/ContainerWrapperControls.js:628`) on **every** hero variant, with no variant guard at all.
2. That `BackgroundPanel` is a `PanelBody title="Background"` with an `Image`/`Video`/`Animation`/`Overlay` `TabPanel` (`ContainerWrapperControls.js:628-660`) that reads/writes `backgroundImage`, `bgVideo`/`bgVideoMobile`, `bgSvgContent` + its animation family — **the exact same `backgroundImage` attribute** hero's own "Image" panel writes on the `standard` variant, and the exact `bgVideo`/`bgSvgContent` attrs render.php does NOT fully null.
3. `render.php:764-790` proves this is live, not inert: `$has_attr_video = !empty($bg_video_attr['url'])` (i.e. `bgVideo`) is checked **independently of `$is_video`**, and `bgVideo` wins over `backgroundVideo` when both are set (`$desktop_src = !empty($bg_video_attr['url']) ? $bg_video_attr['url'] : ($bg_video['url'] ?? '')`). The render.php docblock says this outright: *"These attributes work independently of the 'video' variant — any variant can have a video bg."*

So today, in the editor, a `standard`-variant hero shows **two separate "set background image" controls both writing `backgroundImage`**, and any variant can grow a video background via the generic `Background` panel regardless of the `variant` dropdown showing "Standard"/"Split"/"SVG Animated". `bgSvgContent` is writable via the same generic panel with zero null-guard on the render side and zero relationship to hero's own `svgContent` — it is a second, fully-functional SVG-background mechanism with its own animation-preset engine (`pulse`/`float`/`wave`, `bgSvgAnimationSpeed`) that hero's own `svg-animated` variant does not have.

### 1d. What is NOT overlapping

- **Native colour/gradient support already covers what Bean actually wants.** `block.json:25-30` declares `"color": {"background": true, "text": true, "gradients": true}` — flat colours and gradients are already handled by WordPress's native colour panel, identically to `sgs/container`. This part of Bean's ask is already true today; it is not something to build.
- **The `split` variant's image/video is a layout grid column, not a background layer** — it cannot be replaced by the container's background mechanism (which paints behind content, not beside it in a grid track).
- **The `standard` variant's LCP `<img>` is a real performance feature** (`fetchpriority`, `loading="eager"` on the first hero only) that a CSS `background-image` (what the container mechanism paints) cannot replicate — Core Web Vitals would regress if standard-variant backgrounds moved to the container's CSS-background path.

---

## 2. DB-grounded variant reality (not attribute guesswork)

Per the project's `variant_slots` rule (`ground-in-variant-db`), queried live via `sgs-db.py`:

```
block_slug  variant_value  unique_slot
sgs/hero    split          splitImage
sgs/hero    split          splitImageMobile
sgs/hero    standard       backgroundImage
sgs/hero    svg-animated   svgContent
sgs/hero    video          backgroundVideo
sgs/hero    video          bgVideo
```

`blocks.variant_attr` for `sgs/hero` = `variant` (confirmed; `sgs/container.variant_attr` = `NULL` — container has no variant concept at all, consistent with it being a pure capability host).

This is an **exact match** to `block.json supports.sgs.variants` (lines 62-77) — the DB and the source declaration agree, so the variant definition itself is not in dispute. The two DISCRIMINATING slots for `video` are `backgroundVideo` AND `bgVideo` — **the DB itself records that hero's video variant has two legitimate background-video destinations**, which is the schema-level fingerprint of the same duplication found in §1c, not just a UI accident.

`block_composition`: `sgs/hero.container_kind = 'section'`, `wraps_block = 'sgs/container'` — confirms hero is a full section-kind mirror of the container, which is the mechanism that pulled in the entire container background family per the composite-mirror rule (D152).

---

## 3. Root cause — the empty "Image" panel on the video variant

**Confirmed defect, isolated to hero.** `hero/edit.js:756` renders `<PanelBody title="Image" initialOpen={false}>` **unconditionally** (no variant guard on the `PanelBody` itself). Its entire body is three variant-gated fragments:

- `!isSplit && !isVideo && !isSvgAnimated && (...)` — standard-variant image picker (edit.js:757-835)
- `isSplit && (...)` — split-variant media picker (edit.js:837-999)
- `!isSplit && !isVideo && !isSvgAnimated && (...)` — "Background effects" tail, parallax/Ken-Burns/video toggles (edit.js:1002-1076)

**No fragment covers `isVideo === true`.** On the `video` variant, all three conditions evaluate false, so the panel mounts with a title and zero children — exactly the empty dropdown/panel Bean reported.

**Yes, an existing mechanism for hiding an inapplicable panel exists in this codebase, and hero itself uses it correctly elsewhere in the same file** — it just wasn't applied to this one panel. The established, repeated pattern is to wrap the **whole `<PanelBody>`** in the variant conditional, so the panel never mounts when inapplicable:

- `hero/edit.js:1080` — `{ isVideo && ( <PanelBody title="Background Video">...) }`
- `hero/edit.js:1161` — `{ isSvgAnimated && ( <PanelBody title="SVG Background">...) }`
- `media/edit.js:222` — `{ isImage && imageUrl && ( <PanelBody title="Image">...) }`
- `card-grid/edit.js:341` — `{ isWcProductMode && ( <PanelBody title="Products">...) }`

The bug is that the **generic "Image" panel** (which predates the later split-out of "Background Video" and "SVG Background" into their own gated panels) was never given the same `isVideo`-aware wrap, or split into a fourth `isVideo`-only panel, or (more precisely, since it currently mixes standard+split concerns) never got a `!isVideo` guard added at the `PanelBody` level to match its siblings.

**Roster-wide count.** Only 5 blocks in the framework have a `blocks.variant_attr` at all (DB-confirmed): `sgs/hero`, `sgs/product-card`, `sgs/testimonial`, `sgs/trust-bar`, `sgs/nav-drawer`. A targeted read of the other four's `edit.js` files found no matching defect:

| Block | Panels checked | Empty-on-some-variant bug? |
|---|---|---|
| `sgs/product-card` | Connected product, Product options, Content overrides, Card padding, Card, Price ×2, Buttons, CTA style, Card layout, Advanced SEO, Value ladder, Picker style | No — mode-specific panels are gated at the `PanelBody` level; the always-visible "Card" panel has an unconditional control regardless of `variantStyle` |
| `sgs/testimonial` | Layout variant, Rating, Media, Typography, Hover states, Width & spacing, SEO schema | No — "Rating"/"Media" wrapped at `PanelBody` level; the rest is variant-independent |
| `sgs/trust-bar` | Section, Padding & margin, Content band, Layout, Shadow, Style, Title, Appearance ×2, Label styling, Layout, Auto-scroll, Badges | No — "Badges" panel's inner editor component varies per `badgeStyle` but always renders the items list + "Add badge" button |
| `sgs/nav-drawer` | Drawer, Drawer container, Close button, Content | Not applicable — `variantPreset` is a block-variations picker (`variations.js`), never read as a runtime conditional in `edit.js` |

**Count: 1 of 5 variant-driven blocks (`sgs/hero` only), isolated to one panel.** This is a hero-only regression relative to hero's own established convention, not a systemic pattern requiring a universal mechanism build — the fix is applying the same `{ condition && <PanelBody> }` wrap hero already uses twice in the same file, to the one panel that was missed.

---

## 4. Fix-shape options for the background standardisation (defect 2)

All three options address the confirmed overlap in §1c (dual `backgroundImage` control, live `bgVideo` bypass, dead-but-writable `bgSvgContent` family). None touch the native colour/gradient support (§1d), which already satisfies Bean's stated end-state.

### Option A — Drop the container-mirror background family from `sgs/hero`; keep only hero's own variant-scoped media

**What moves where:** Remove `backgroundImage`/`backgroundImageTablet`/`backgroundImageMobile`/`backgroundSize`/`backgroundPosition`/`backgroundRepeat`/`backgroundAttachment`/`bgVideo`/`bgVideoMobile`/`bgSvgContent`+family/`overlayGradient*` from `sgs/hero/block.json`'s attribute list and from the `BackgroundPanel` import in `edit.js`. Hero keeps exactly its own 4 variant-scoped media attrs (`backgroundImage` for standard survives — see note), its own overlay controls (consolidated to one shared overlay panel instead of 3 copies), and native colour/gradient support.

Note: `backgroundImage` is used by BOTH the container-mirror family AND hero's own `standard` variant (same attr name, per §1c). Removing the mirror family means keeping this one attr but removing `backgroundImageTablet`/`backgroundImageMobile`/`backgroundSize`/etc. around it — those responsive/sizing controls currently exist only via the never-nulled inherited family and are otherwise unused by hero's own `<img>`-based rendering (which reads plain `backgroundImage.url`, not `backgroundSize`/`backgroundPosition`).

**What breaks:** Any existing content that set `bgVideo`/`bgVideoMobile`/`bgSvgContent` via the generic Background panel on a hero instance loses that data path at read time (the render.php uses `?? null` fallbacks so nothing fatals, but a live video-bypass-of-variant instance would silently stop showing its video). Given `bgSvgContent`'s render path was never nulled and the attr has DB-confirmed presence but is likely unused in practice (no fold logic wires it to anything hero-specific), this is probably a zero-instance migration in reality — but that must be verified against live content before shipping (D293/no-version-bumps rule: no deprecation infrastructure pre-production, so a WP-CLI content scan for non-empty `bgVideo`/`bgSvgContent` on live `sgs/hero` posts is the correct verification step, not a deprecated.js migrator).

**Cloning impact:** LOW risk. §2's `variant_slots` DB rows show `video`'s two "legitimate" slots are `backgroundVideo` AND `bgVideo` — this row would need trimming to `backgroundVideo` only, via `/sgs-update` re-derivation from a corrected `block.json supports.sgs.variants` (the DB is generated from block.json, not hand-maintained, so this is a one-line block.json edit + `/sgs-update` re-run, not a DB migration). The converter's media-routing is generic and DB-driven (`canonical_slot='backgroundMedia'`, resolved via `variant_detect.py` + `db_lookup.py`, confirmed no hero-slug-literal code exists) — removing `bgVideo`/`bgSvgContent` rows from `block_attributes` means the converter simply has one fewer valid destination for cloned video/SVG media on hero, and would gap it honestly (`NO_DESTINATION`) rather than mis-route it, per the resolver's documented no-cheats behaviour. **Zero converter code changes required** — this is entirely a schema-and-attribute-list change that the DB-first architecture already supports.

### Option B — Keep the container-mirror family, but gate `BackgroundPanel`'s UI to the variants where it's genuinely additive, and null `bgSvgContent` server-side

**What moves where:** No attribute removal. Wrap `BackgroundPanel` in edit.js with a variant guard (e.g. only show on `standard`, where it would be redundant with hero's own Image panel — so this option really only makes sense combined with removing the Image panel's own image picker and standardising on the generic one). Add `bgSvgContent` and its animation family to render.php's null list (closing the confirmed double-render risk in §1c/§1b) even if the attribute stays declared.

**What breaks:** Nothing removed, so no content migration. But this does NOT resolve Bean's actual complaint — it keeps two attribute families for the same concept, just with the redundant one's most dangerous branch (SVG double-render) neutralised. This is a patch on the symptom, not the standardisation Bean asked for.

**Cloning impact:** NONE — no attribute/DB change, converter untouched.

**Verdict on B:** Does not satisfy the brief ("the only thing the block needs regarding background visuals is colours, gradients etc.") — it leaves the overlapping image/video mechanisms in place, just less dangerous. Listed for completeness, not recommended.

### Option C — Invert the mirror: make hero's variant system the ONLY background-media path, and strip the equivalent generic attrs from `sgs/container`'s mirror contract for section-kind composites that already declare their own `variants` capability

**What moves where:** Same attribute removal as Option A, but framed as a rule change: "a composite that declares `supports.sgs.variants` with media-bearing variants opts OUT of the container's generic background-image/video/svg mirror, because its variant system IS the background-media mechanism." This would also apply to any other future composite with variants that carry media (none currently exist — `sgs/product-card`, `sgs/testimonial`, `sgs/trust-bar`'s variant attrs do not carry media per the DB `variant_slots` check in §3, and `sgs/nav-drawer`'s is a block-variations picker, not a runtime attribute).

**What breaks:** Same content-migration risk as Option A (bgVideo/bgSvgContent live-instance scan).

**Cloning impact:** Same as Option A at the `sgs/hero` level. The added generality (a DB rule: "container_kind='section' AND variant_attr IS NOT NULL AND variant carries media → suppress mirror background family") is currently a no-op for every other block (no other block matches the predicate today), so it costs nothing to build but is unverified against a second real case.

**Verdict on C:** Architecturally cleaner (states the invariant rather than one-block-at-a-time), but the extra generality is currently unfalsifiable — there's no second block to prove the rule against. Building it now is speculative generality for a population of one.

---

## 5. Recommendation

**Option A**, applied to `sgs/hero` only, ranked above B and C.

**Reasoning:**
1. It's the only option that actually satisfies Bean's stated end-state (background visuals reduced to colour/gradient + the block's own necessarily-distinct variant media).
2. The cloning-pipeline risk is genuinely low: the converter's media-routing is DB-driven with no hero-slug-literal code (confirmed via grep across `resolvers/`, `services/root_supports.py`, `services/lift_helpers.py`), so removing attribute rows is a schema change the architecture was built to absorb, not a converter rewrite.
3. It directly closes the confirmed dual-`backgroundImage`-control bug and the live variant-bypassing `bgVideo` bug from §1c — not just makes them safer (unlike B).
4. It doesn't invent a new universal rule on a population of one (unlike C) — if a second variant-with-media composite is ever built, the same manual pass can be repeated, or C's generalisation can be built then with two real cases to validate against.

**Before building:** run the WP-CLI content scan named in Option A's "what breaks" row (non-empty `bgVideo`/`bgVideoMobile`/`bgSvgContent` on live `sgs/hero` posts across both sites) — this is a 2-minute check that turns "probably zero instances" into a proven fact, which the project's prove-the-cause-before-fix rule requires before committing to "this is a safe removal."

---

## 6. Premise check — was Bean's "overlapping functionality" belief correct?

**Yes, and the evidence is stronger than a plausible-sounding complaint — it is a literal, currently-shippable defect**, not merely an architectural smell:

- Two UI controls write the identical `backgroundImage` attribute (§1c point 1-2).
- `bgVideo` is checked by render.php independently of the `video` variant and wins over the variant's own `backgroundVideo` when both are set — the code comment says this is intentional ("any variant can have a video bg"), but it directly contradicts the variant dropdown's implied contract that "Standard" means no video (§1c point 3).
- `bgSvgContent` has a working, unconditional editor control with its own animation-preset engine, is never nulled server-side, and duplicates the conceptual purpose of hero's own `svgContent` — which has no animation-preset engine at all (§1b, §1c).

**Where Bean's framing needs a correction, not a rejection:** the fix is not "the block only needs colours/gradients" taken literally — hero's `standard`/`split`/`video`/`svg-animated` variants each need their OWN media attribute (LCP `<img>`, grid-column media, `<video>`, inline SVG respectively), because these are structurally different rendering mechanisms the generic container background layer cannot replace (§1d). What's genuinely removable is the **second, redundant copy** of image/video/SVG background handling that got pulled in by the composite-mirror rule and was never suppressed for the parts hero doesn't use its own way. Bean's instinct to remove the duplication is correct; the literal request to reduce to "just colours/gradients" would break the standard variant's LCP image and the split variant's media column, which are not backgrounds in the CSS sense and were never in the overlap to begin with.

---

## Files referenced (evidence, not modified)

- `plugins/sgs-blocks/src/blocks/hero/block.json`
- `plugins/sgs-blocks/src/blocks/hero/edit.js`
- `plugins/sgs-blocks/src/blocks/hero/render.php`
- `plugins/sgs-blocks/src/blocks/container/components/ContainerWrapperControls.js`
- `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php`
- `plugins/sgs-blocks/scripts/converter/resolvers/outer_box.py`
- `plugins/sgs-blocks/scripts/converter/services/variant_detect.py`
- `plugins/sgs-blocks/scripts/converter/db/db_lookup.py` (canonical_slot / backgroundMedia routing)
- DB tables queried live: `variant_slots`, `blocks.variant_attr`, `block_composition.container_kind`/`wraps_block`, `block_attributes` (canonical_slot='backgroundMedia' rows for `sgs/hero`, `sgs/container`, `sgs/cta-section`, `sgs/trust-bar`)
