---
doc_type: design
title: The SGS Media Element — architecture v2 (post-council)
date: 2026-08-30
last_updated: 2026-08-30
status: APPROVED and PARTLY BUILT — waves 1-2 shipped, deployed and live-verified; wave 3 in progress
owner: client-controls track
supersedes: 2026-08-30-media-element-architecture.md (v1, graded C/C+/D by a 7-seat council)
live_plan: ~/.claude/plans/media-element-zippy-boole.md
---

> ⚠ **READ THIS FIRST — this doc was written before anything was built, and NINE of its claims were
> measured false during waves 1-2. Every one is corrected in place and marked
> `⛔ CORRECTED`/`⚠ REVISED` at the point it changes the design; none was deleted, and every
> `✅ ONBOARDED` council attribution is preserved (D101 — a defence removed silently is a defence
> lost). Do not re-inherit an uncorrected claim from a summary of this file.**
>
> The nine: the generator was not gated and cannot see media keys (§0) · `KIND_PANELS` was neither
> 30-adopter nor most-adopted (§2 L2) · the PHP helper names must carry `media_element` (§2 L1) ·
> six atoms was the wrong cut, it is ten (§5) · `prefers-reduced-motion` was already implemented,
> STRUCK not built (§5) · object-fit's `custom` is a sizing mode, not a fit value (§5) · six SVG
> mounts and six allowlists, not three and two (§7) · the census is source-side only (§9) · and the
> falsification test's path was wrong in a way that would have silently broken the parity gate (§10).

# The SGS Media Element — architecture v2

v1 went to a 7-seat adversarial council. No seat graded it above C+. **The shape survived every
seat; every mechanism chosen from repo habit was overturned.** This is the rewrite. Each council
finding is marked ✅ ONBOARDED at the point it changed the design, so nothing sits unresolved.

---

## 0. Bean's question: is codegen made redundant by the helper architecture?

**Mostly yes — and the one gap it does not close has a better answer than codegen.**

Bean's reason for codegen was explicitly *not* convenience: *"not having to manually build every
single control over and over again and then sort out uniformity as an afterthought."* Taking the
three layers codegen would have covered:

| Layer | Covered by | Codegen needed? |
|---|---|---|
| **Control UI** | the panel registry (§3) — a panel is written once, mounted by name | **No** |
| **CSS** | one shared stylesheet + custom-property values (§5) | **No** |
| **Attribute DECLARATION** | ⚠ WordPress must know the attributes exist | **This was the real gap** |

**The gap, and why codegen is still the wrong tool for it.** WP silently discards an attribute a
block does not declare (D338), so the keys must be registered. The typography helper's own docstring
already names this: *"Use in a block's block.json generator or to register attrs — exported so a
block can spread the canonical set rather than hand-declaring each key."*

**The framework already solves this without generating anything.** Every `sgs*` extension injects its
attributes at runtime via `addFilter( 'blocks.registerBlockType', … )`
(`src/blocks/extensions/conditional-visibility.js:125`). No hand-declaration, no generated file.

**So: a block opts in declaratively and the attributes arrive.**

```jsonc
// block.json — the ONLY media-related thing a block writes
"supports": { "sgs": { "mediaElements": [
    { "prefix": "before", "context": "element" },
    { "prefix": "after",  "context": "element" }
] } }
```

A filter reads that and injects the full key set for each entry. **Uniformity is not sorted out
afterwards — it is a precondition of the injection**, because the keys come from one function.

⚠ **One narrow generator remains.** The server needs the same attributes registered so
`ServerSideRender` validates (12 blocks use it).

⛔ **CORRECTED 2026-08-30 (Wave 2, built).** This section said `generate-extension-attributes.js`
does that job today and *"is already gated"*, and that **"Media adds its attributes to that existing
mechanism rather than creating a second one."* Both halves were false, and both were measured:

1. **It was NOT gated.** The generator ran in write mode on every build; its `--check` mode was
   wired into nothing, and the script's own docblock said so. Now wired into `gates.json`.
2. **It structurally CANNOT see media keys.** `generate-extension-attributes.js:70` collects with
   `/\b((?:sgs|fx)[A-Za-z0-9]*)\s*:\s*\{([^}]*)\}/g` — `sgs*`/`fx*` prefixes only. Measured against
   11 representative media attribute names (`imageUrl`, `beforeImageUrl`, `splitImage`, `bgVideo`,
   `mediaType`, `objectFit`, `videoAutoplay`, …): **0 of 11 match.** Positive control: the same
   pattern matches `fxDisableMobile`, and the generated PHP contains no non-`sgs`/`fx` key. So the
   regex works and simply cannot reach these names — and "zero renames in v1" means it never will.

**What shipped instead (Bean's route, 2026-08-30):** a PHP filter on `register_block_type_args`
reads the SAME `supports.sgs.mediaElements` declaration the JS injection filter reads
(`includes/media-element-attrs-register.php`), plus one narrow generator of its own,
`scripts/generate-media-attributes.mjs`, emitting the base→type map from
`MediaElementControls.js`. **Still exactly one source of truth**, no rename, no existing extension's
generator touched. It is new code rather than the existing mechanism this section promised — that
promise rested on a false premise, so it could not have been kept.

✅ ONBOARDED — Cynic MF-2 (do not build a second source of truth beside
`check-control-helper-parity.py`), Ship-PM M5, Competitor (codegen is cost, not proof of need).
**MF-2 still holds — no second source of truth was created; only the *mechanism* satisfying it
changed.**

---

## 1. What must be true when this is done

1. A media element is declared **once** and works on any block, at any insertion point.
2. Adding a control reaches **every** surface with **no per-block edit**.
3. Attributes, editor UI, canvas preview and front-end render **cannot drift**.
4. Emitted markup is **recognisable to the cloning pipeline**, using the vocabulary it already reads.
5. A block that hand-rolls media controls **is caught by a gate**.
6. **A client can set a different mobile image, in the editor, in under 30 seconds, on any block
   with media.** ← the only user-visible criterion, and the one Bean can QC.

✅ ONBOARDED — Competitor MISSING 5 / Ship-PM MISSING 2: v1's success criteria were all internal
engineering invariants with nothing Bean could look at.

### ⛔ The corrected diagnosis (v1's founding claim was false)

v1 said `sgs_tier_media_toggle_css()` had **zero callers**. It does not — it is called at
`helpers-tier-media.php:267` from `sgs_tier_media_render()`, which hero (`render.php:1265`) and
timeline (`render.php:748`) both use. My search covered only direct block-level calls and I stated
it as covering all calls. Four seats caught it.

**True state: 2 adopters of ~9 surfaces, with one holdout (`sgs/media`) that hand-rolls past the
helper because of two incompatible signatures for the same cascade** — shared
`($present, $base_class, $uid)` versus a closure taking `($modifier_base, $tiers_present)`.

**The failure mode is PARTIAL adoption, and a signature mismatch is its cause.** That is a smaller
problem than v1 assumed, and it is why v2 is a three-day change rather than a three-week one.

---

## 2. The four layers

| Layer | Owns | Mirrors |
|---|---|---|
| **L1 Controls** | attribute NAMING | `sgs_typography_attr()` / `typographyAttrName()` — proven, gated |
| **L2 Panels** | GROUPING | `SgsColourPanel` — 65 adopters, the framework's most-adopted shared component (see the correction below) |
| **L3 Element** | DISPATCH + RENDER | `ContainerWrapperControls` + `SGS_Container_Wrapper` |
| **L4 Styling** | CSS | `before-after`'s custom-property pattern |

### L1 — naming, with a prefix

```js
mediaAttrName( prefix, base )   // 'before' + 'ImageUrl' -> 'beforeImageUrl'; '' -> 'imageUrl'
mediaAttrKeys( prefix )         // the canonical key set
```
```php
sgs_media_element_attr( $prefix, $base )                       // NOT sgs_media_attr — see below
sgs_media_element_stored_attr( $block_slug, $prefix, $base )
sgs_media_element_value( array $attributes, $name, $want )
```

⛔ **The PHP names carry `media_element`, not `media`, and that is load-bearing.** The parity gate
derives a slug from the JS component (`MediaElementControls` → `media_element`) and looks for a
`sgs_*` function under `includes/` containing it. `sgs_media_attr()` — the name this section
originally specified — would read as **ABSENT**, and Media would silently never register as the
fourth family.

⛔ **`src/components/`, not `src/media/controls/`** (Bean's decision, taken). The same gate discovers
helper families from disk by convention: a `*AttrName`/`*AttrKeys` export in `src/components/`, plus
the PHP twin. The originally-proposed `src/media/controls/` sits outside that scan.

Identical shape to typography, which `check-control-helper-parity.py` already measures
(*"3 name-keyed; of those 3, 3 complete"*). **Media becomes the fourth.**

⭐ **Measured while building it (Wave 2): the naming risk was small; the SHAPE risk was large.**
Across 128 real media attributes on six surfaces, `prefix + Base` reproduces every stored name except
**FOUR**, in two intentional cases — `before-after`'s block-level shared `videoAutoplay` (+2 tiers),
and `decorative-image`'s legacy composite `decorMedia`. So `STORED_AS` is tiny. But there are **TEN
distinct storage shapes** for one concept, and a name-only `storedAs` map — what this section
originally specified — could only ever have read one of them. Hence `sgs_media_element_value()`,
which reads across all ten (`media-object`, `attachment-id`, `attachment-id-union`, `url-string`,
`svg-markup`, `alt-string`, `tri-state-inherit`, `boolean`, `number`, `string`).

⛔ **`storedAs`: ZERO attribute renames in v1.** A rename is a stored-`post_content` migration,
because WP discards undeclared attributes — the client's image vanishes with every gate green. Each
descriptor carries the surface's EXISTING name (`beforeImageUrlTablet` stays as it is). Determinism
for the pipeline comes from the descriptor map, not from the string.
✅ ONBOARDED — Ship-PM M1.

### L2 — the panel registry

⛔ **CORRECTED 2026-08-30. The exemplar named here was wrong on both of its claims, measured.**

`KIND_PANELS` is **not** the framework's most-adopted shared component, and it does **not** have 30
adopters. The 30 was a plain grep for `ContainerWrapperControls` (which OWNS `KIND_PANELS`); scoped
to JSX mounts in `edit.js` it is **23**. `KIND_PANELS` itself appears in exactly ONE file, is
module-private, and no live mount passes `kind: 'section'` — a dead default branch. Measured
adoption (`grep -l "<Component" src/blocks/*/edit.js`):

```
65  SgsColourPanel          <- the actual most-adopted shared component
51  ResponsiveBoxControl
45  SgsBorderControl
23  ContainerWrapperControls
18  TypographyControls
```

⚠ `ContainerWrapperControls` also lives at `src/blocks/container/components/`, **not**
`src/components/` — it is a container-block-private component, so `check-control-helper-parity.py`
never sees it.

**The exemplar is therefore `SgsColourPanel`, and not only on adoption.** Its shape is
**caller-composed rows, not a hardcoded registry**: the component owns the row SHAPE and the panel
chrome; the caller passes `rows: [{ key, label, states, gradientCapable }]`, and *falsy entries are
dropped* so a condition inlines directly in the array literal (`shape !== 'none' && { … }`). That
fits media better than a `kind → fixed array` map, because media's disclosure rules are per-attribute
and per-type, not per-context — a `backdrop` surface is not "the `element` list minus two".

```js
// v2 shape — the caller composes, the layer owns the row shape and the chrome.
MediaElementControls( { attributes, setAttributes, prefix, context, insertion, atoms } )
//   → rows composed from `context` + the surface's declared atoms; falsy entries dropped.
```

⚠ **Inherit `SgsColourPanel`'s shape; do NOT inherit its two known flaws.**

1. **It hardcodes `group="styles"`** (`SgsColourPanel.js:116`, D621) — the cause of the C14 tab-split
   across all 65 adopters. `MediaElementControls` takes its group from `insertion`, never hardcodes.
2. **Its disclosure rule is the opposite of ours.** Its docblock: *"an entry that doesn't apply is
   omitted from the `rows` array by the calling block."* Media needs the reverse for gated controls —
   render **disabled with a `hiddenReason`**, because a silently-absent control is the "where did my
   setting go?" defect we are fixing. **Omit when it structurally cannot apply; disable-with-reason
   when it is merely not applicable yet.** Both states, deliberately (see §6).

✅ ONBOARDED — the "insert different sets" model Bean described from the colour helpers stands; it is
now pointed at the colour helper that actually implements it.

### L3 — dispatch, and the one place we do NOT copy the wrapper

```js
MediaElementControls( { attributes, setAttributes, context, prefix, insertion, types } )
```
```php
SGS_Media_Element::render( array $attributes, $block, string $prefix, string $context, array $opts )
```

⛔ **`ContainerWrapperControls` opens its own `<InspectorControls>`, so it always creates top-level
panels.** Correct for a block-level wrapper; wrong for element-level media, which by C14 must sit
inside its element's panel. So:

- `insertion: 'root'` → returns its own `<InspectorControls>`, like the wrapper.
- `insertion: 'element'` → returns bare rows for a parent element panel to absorb.

**This is also what fixes the Video/SVG panels drifting below Visibility Conditions in Bean's
screenshots** — they stop being free-floating top-level panels at all.

⚠ The wrapper mentions "prefix" **once** in the whole class; it reads bare `maxWidth`/`gap`. It gets
away with that because a block has exactly one wrapper. **Media cannot** — `before-after` has two,
`hero` has split + background. Prefix runs through all four layers.

### L4 — styling: rules in ONE stylesheet, values as custom properties

**This is the fix for the wrapper's real weakness, which Bean named.** `container/edit.js:217`
hand-builds a `style` object for the canvas while `class-sgs-container-wrapper.php:476-580` builds
the front-end CSS separately — two implementations, and its own comments record the bill twice
(*"a bare destructure was a real live bug for maxWidth's editor"*).

`before-after` already solves it: PHP emits only **custom-property values**
(`--sgs-before-after-divider-width`, `render.php:235`), while `style.css` holds the rules,
referencing them **17 times**. Its `block.json` declares `style: file:./style-index.css` — which
WordPress loads in **both** the canvas and the front end.

**So the styling logic exists once, in a stylesheet both sides load.** Each side only sets values.
Duplication shrinks from "all the CSS" to "read attribute → set variable" — small enough to be
covered by a shared fixture test.

⛔ **v1 claimed the canvas and server run "literally the same function". They cannot** — one is JS,
one is PHP. v2 claims what is achievable and testable: **one stylesheet, one descriptor, two thin
value-setters, and a fixture asserting both emit identical custom-property declarations for a fixed
attribute set.**

⭐ **The stylesheet's home, named (2026-08-30).** `before-after` solves this per-block via its own
`block.json` `style:` entry, which WordPress loads in both realms — but a SHARED layer has no block
to hang that on. The framework's existing answer is **`assets/css/extensions.css`**, enqueued twice
by design: `class-sgs-blocks.php:332-345` into the editor canvas (handle `sgs-extensions-editor`)
and `:419-428` on the front end (handle `sgs-extensions`). Media takes the same pattern with its own
file, **`assets/css/media-element.css`**.

⛔ **Breakpoints come from `SGS_BREAKPOINTS` (JS) / `SGS_Breakpoints` (PHP), never a literal — and
never a copy of `extensions.css`'s own pair, which is off by one.** Measured: its Image Controls
block uses tablet `min-width:769px` / mobile `max-width:768px` against the project's 768/1024
device-tier standard. That is a real bug in the device-tier system (not an arbitrary visual
breakpoint), recorded separately; the media stylesheet must not inherit it.

✅ ONBOARDED — Cynic MF-3, Ship-PM, Platform S2, Platform M2 (the one breakpoint source).

---

## 3. Attributes, breakpoints and the platform

### ⛔ Block Supports — corrected rejection

v1 gave three grounds. **The third was false.** `__experimentalSkipSerialization` has existed
per-feature since Gutenberg PR #36293 (2021), extended in #59887 and #75192 (2026), and the Block
Selectors API lets a support target inner elements. Supports do **not** have to auto-inline.

**The two surviving grounds are sufficient:**
1. **Singleton per block** — no instancing or prefixing. `before-after` genuinely cannot be expressed.
2. **No per-tier vocabulary** — *today*. See below.

**Where a support genuinely fits an atom (border, shadow), use the native support with
`__experimentalSkipSerialization` + `selectors` rather than wrapping it** — strictly less code.
✅ ONBOARDED — Platform M1.

### ⭐ Core is landing per-viewport breakpoints in WP 7.1 — the canary's own version

[Gutenberg #75707](https://github.com/WordPress/gutenberg/issues/75707) ("WordPress 7.1: configurable
breakpoints and theme.json integration") is **closed, Done**; PR #73994 implements per-breakpoint
behaviour through the Style Engine.

⛔ **Therefore: never hardcode 768/1024 in a media module.** Breakpoints resolve from ONE exported
source that can later point at `theme.json`'s viewport definitions. Otherwise SGS ships a second
breakpoint vocabulary beside core's on the same version, and inherits a migration that cannot be
done mechanically.
✅ ONBOARDED — Platform M2.

---

## 4. Markup — keep what the pipeline reads, add what the renderer needs

⛔ **v1's `<picture>` swap is DROPPED.** `media/render.php:686` records the current shape as a
deliberate decision: *"deliberately matching hero rather than `<picture>`/`<source>`, because the
draft vocabulary the cloning pipeline reads IS the BEM modifier. One convention on both ends means
the clone round-trips."* v1 reversed that with zero pipeline budget, against binding rule R-31-2.

**v2: the type stays in the BEM class AND gains a data attribute.**

```html
<figure class="sgs-media sgs-media--image" data-sgs-media="image">
  <img class="sgs-media__image" …>          <!-- __video / __svg for other types -->
```

- **Fixes the real defect** — `before-after` currently gives video and SVG the base class `__img`,
  so a BEM reader misclassifies them.
- **Costs the walker nothing** — it keeps reading the vocabulary it already reads.
- `data-sgs-media` is for output-side checks only, never the walker's input.

✅ ONBOARDED — Competitor MF2, Cynic MF-7, Ship-PM M3.

### Generate, then amend — not "build with the Tag Processor"

⛔ **v1 named the wrong class.** `WP_HTML_Tag_Processor` modifies attributes on matching tags; it
cannot pair open/close tags, set inner content, or create nodes, and the composable-templating work
did not ship in 6.9.

**v2: emit with `wp_get_attachment_image()`, then amend with `WP_HTML_Tag_Processor`**, using
`WP_HTML_Processor::create_fragment()` where structural work is genuinely needed.

**This also puts core's image pipeline underneath us instead of throwing it away** — `srcset`,
`sizes` (incl. `sizes="auto"` from 6.7), `loading`, `decoding`, `fetchpriority`, and the
`wp_get_attachment_image_attributes` filter chain. `hero/render.php:315` already depends on
`fetchpriority` for its LCP strategy; v1 would have regressed it.

⚠ **Four other mechanisms already amend block markup with the Tag Processor**
(`fx-surface-treatment.js`, `webgl/renderer.js`, `device-visibility.php`,
`animation-attributes.php`). Ordering must be declared — one writer per artefact.
✅ ONBOARDED — Platform M3, M4, N1–N4; Cynic MISSING M-F.

---

## 5. The atoms

**Common presentation** (image · video · svg): box-shape · **aspect-ratio** · object-fit ·
focal-point · padding · border+radius · opacity · shadow · alignment · max-width ·
**overlay** (colour, gradient, opacity ×3 tiers, blend mode).

**Meaning:** alt-text · decorative · caption · link.

**Image:** lazy-load · **priority/LCP** · ken-burns · parallax.
**Video:** autoplay · loop · muted · controls · playsinline · poster · preload · **`<track>` captions**.
**SVG:** svg-source · animation-source · path-draw.

### ⭐ v1 SHIPS TEN ATOMS, NOT THIRTY — and not six either

**REVISED 2026-08-30 (Bean's ruling), from six to ten.** ✅ The Ship-PM finding that produced the
original cut STANDS — *"the atom list was a wish-list, not a plan"* — and the list above is still a
wish-list. What changed is the cut line, for two measured reasons.

**1. The claim "the six cover every disagreement measured" was not true.** Of the 103 distinct media
attribute names in the census, **36 fell outside all six atoms** — the whole of meaning (7 pairs),
video behaviour (22), SVG presentation (8) and intrinsic dimensions (3). Worse, the plan's own
headline cross-attribute rule (autoplay ⇒ muted + playsinline) governs the video behaviour family,
which **no atom owned**.

**2. Nothing is wired to a block until step 4**, and several controls are already standardised, so
completeness costs roughly one extra hour against three named gaps we would return for.

**The roster — a roster now, not a wish-list:**

| # | Atom | Manifest |
|---|---|---|
| 1 | `source` | census (58 pairs) |
| 2 | `media-type` | census (8) |
| 3 | `video-behaviour` | census (22) — owns the `requires` rule |
| 4 | `meaning` (alt / decorative) | census (7) |
| 5 | `intrinsic` (width / height) | census (3) — no control; written from the chosen media |
| 6 | `svg-presentation` | census (8) |
| 7 | `object-fit` | ⚠ presentation half — see §9 |
| 8 | `focal-point` | ⚠ presentation half |
| 9 | `box-shape` | ⚠ presentation half |
| 10 | `overlay` | ⚠ presentation half |

The remaining ~20 concepts in the list above (caption, link, lazy-load, LCP priority, ken-burns,
parallax, path-draw, alignment, opacity, shadow, padding, border) stay v2.

⭐ **A control becomes the standard by BEING a shared helper, not by being described (Bean, 2026-08-30).**
Every control an atom needs that does not already exist ships as ONE component in
`src/components/media/controls/`, mountable anywhere — so divergence is impossible rather than
merely detectable. The alternative considered and rejected was registering each control's recipe in
`scripts/consistency/golden-controls.json`; measured, that file encodes 14 control types but exactly
**one** (`colour`) has a rule that reads it, so a `media` or `enum` recipe would be a row nothing
enforces. Spec 35 PART O remains the reference for what good looks like; the shared component is
what makes it universal.

✅ ONBOARDED — Ship-PM (the atom list was a wish-list, not a plan) — **finding upheld, cut line
revised from six to ten on measured coverage.** Plus Bean's shared-helper ruling, 2026-08-30.

### ⭐ object-fit across three enums — resolved inline (Bean, 2026-08-30)

Three rival vocabularies exist, and this was briefly planned as a design gate. Measured, it is not:

| Source | Values |
|---|---|
| canonical — `MediaSizingPanel`, `sgs/media`, `helpers-media-position.php`, `before-after/render.php` | `cover, contain, fill, none, scale-down` |
| `extensions/image-controls.js` | the same 5 **plus `""` = "Inherit (no override)"** |
| `hero/edit.js` `IMAGE_FIT_OPTIONS` | `cover, contain, fill,` **`custom`** — and hero declares NO enum, so `custom` round-trips |

⛔ **`custom` is not a fit value and not a media-type adaptation — it is a SIZING MODE.** Its label is
literally `'Custom (explicit width/height)'` (`hero/edit.js:68`), and `hero/render.php:625` gates
object-fit **off** so `splitMediaWidth`/`splitMediaHeight` take over. It behaves identically for
image, video and SVG. It is the same concept `sgs/media` already models properly as
`mediaSizing: auto|height|ratio`.

**Resolution: `custom` belongs to atom 9 (`box-shape`), not atom 7.** Atom 7's enum is the canonical
five; it *reads* hero's `custom` as "sizing mode = explicit" via its `reads` field. No rename, no
design gate.

⭐ **Hero already holds the correct answer for video and SVG, and the atoms adopt it.**
`hero/render.php:618-624` scopes the fit selector to `--image, --video` only, deliberately excluding
the SVG tier's `<span>` wrapper, with the reason stated in the code: *"these are replaced-element
properties and do nothing on the SVG tier's `<span>` wrapper, so emitting them there would be a lie
about what the property actually affects."* So SVG gets a genuinely separate implementation
(`preserveAspectRatio` or a sized wrapper), **never a third selector pretending the property
applies.**

⚠ The universal `image-controls` extension (`sgsObjectFit`/`sgsObjectPosition`, **21 blocks opted
in**) stays as it is for the blocks outside this population. The media atoms READ both vocabularies
and emit one; reworking the extension itself is out of scope and would be its own design gate.

### Cross-attribute constraints — a `requires` field, not just a `gate`

`autoplay` without `muted` + `playsinline` is silently blocked on every mobile browser. So a
descriptor carries `requires`, enforced in **both** the control UI and the renderer.

⛔ **This is not hypothetical — there is a live defect, measured 2026-08-30.** The coupling exists in
exactly ONE place and it is client-side only: `src/blocks/media/view.js:148-152` forces
`video.muted = true` when autoplay is on. `src/blocks/media/render.php:1076-1080` builds the three
flags **independently, with no guard at all**:

```php
$autoplay_attr = $video_autoplay ? ' autoplay' : '';
$muted_attr    = $video_muted    ? ' muted'    : '';
$inline_attr   = $video_inline   ? ' playsinline' : '';
```

So a client setting autoplay-on + muted-off gets server markup the browser refuses to play, and
`view.js` silently repairs it on hydration — **no-JS visitors keep the broken state**. `playsinline`
is not coupled anywhere. Every other surface hardcodes the trio together, so the rule holds there by
construction; `sgs/media` is the only surface where a client can unmute, which is also why it is the
only one with `<track>` captions.

**Atom 3 (`video-behaviour`) owns this**, and fixing `render.php` — not merely mirroring `view.js` —
is its acceptance criterion.
✅ ONBOARDED — Platform M6.

### Accessibility — three items that are compliance, not preference

- **`<track>` captions.** `grep -rn "<track"` returned **zero** across the framework, confirmed with
  a positive control (the identical command shape returns 68 matches for `<video>`, so the zero was
  real and not a filter artefact). WCAG 1.2.2 is **Level A**, below the stated AA baseline.
  ✅ **SHIPPED 2026-08-30** (`3b17d96a5`) on `sgs/media` — the only surface where a client can unmute,
  hence the only one where the requirement bites. Live-verified 6/6 with a negative control.
- **`prefers-reduced-motion`** on ken-burns and parallax — ⛔ **STRUCK, NOT BUILT.** This section
  called it *"absent in v1"*. It is **present, and thorough**: `hero/style.css` (476, 519, 558,
  567-577) guards split-media twice — a `no-preference` gate plus an explicit `reduce` override;
  `container/style.css` (235, 280) guards both Ken Burns paths; `assets/js/parallax.js:28` bails on
  `matchMedia('(prefers-reduced-motion: reduce)')` before any work. **Re-adding a guard produces a
  duplicate, which is its own defect class.** Recorded as struck rather than deleted so a later
  session does not "finish the job". If the media layer introduces a NEW motion atom, that atom
  carries its own guard — this strike covers the existing two only.
- **Decorative/alt** stays per-instance (the same logo is meaningful in a header, decorative in a
  footer strip). Now **atom 4 (`meaning`)** rather than an unowned principle.
✅ ONBOARDED — Platform M5, N8, N9 (N-whichever covered reduced motion is satisfied by construction,
not by new code).

---

## 5b. ⭐ THE SOURCE AXIS — static vs bound (a gap in my own onboarding, caught on re-audit)

**I accepted the Competitor's MF4 and then failed to represent it. Closing it here.**

Client sites need media that comes from **somewhere else**: a post's featured image, a WooCommerce
product image, a query-loop item, a meta field. WordPress ships the Block Bindings API for exactly
this. Kadence and Spectra both put dynamic-content pickers on image fields — it is what an agency
actually sells.

**Bean's own product-card ruling already requires it.** He ruled that bound mode must stop offering
a lone "Override image" boolean and instead *"open up the same panels that exist on the typed side
with the exact same functionality."* That IS the binding case, and v2 had no axis to express it.

**So `source` is a descriptor field, designed now and shipped later:**

```js
source: 'static' | 'binding'
```

- `static` — an attachment the client picked. Today's behaviour.
- `binding` — the value resolves from a source (product image, featured image, meta) **server-side,
  before the delivery/render step**. Everything downstream — presentation atoms, tiers, overlay,
  disclosure — is identical, because they operate on the RESOLVED media, not on where it came from.

**Why it must be designed now even if built later:** retrofitting a source axis after nine surfaces
are wired means every consumer needing bound media becomes a per-block fork — precisely the failure
this whole architecture exists to prevent, reintroduced through the one door left open.

⚠ **Interaction with Bean's variation ruling (already settled, do not re-open):** variation photos
are a *separate opt-in mechanism*, not a competing precedence layer. A variation swaps WHICH asset
displays; the tier machinery styles whatever is displayed; a binding resolves where the default came
from. Three independent choices, no conflict-resolution layer.

✅ ONBOARDED — Competitor MF4, and Bean's product-card bound-mode ruling of 2026-08-30.

---

## 6. Disclosure — and the affordance v1 was missing

1. Nothing that styles media appears before media exists.
2. Type-specific controls appear only for that type.
3. Every attribute that exists has a control.
4. ⛔ **Gate on the CONTENT, never on a sibling.** Hero's live bug is a content gate keyed to the
   wrong attribute — the media-type enum is gated on `splitImage?.url`, so video is unreachable
   without first uploading an unwanted image, while `render.php` supports image-free video fine.

### ⭐ `hiddenReason` — or we rebuild the bug we are fixing

v1's `gate: 'hasSource'` is **the same shape as the defect it was written to fix**. A hidden control
is a control the client cannot find, and *"where did my setting go?"* is the commonest support call.

**Every gated control carries a `hiddenReason`.** Where the gate depends on a value the client has
not set yet, the row renders **disabled with that reason**, not absent. Where it structurally cannot
apply, it is omitted. Two different states, deliberately.
✅ ONBOARDED — Support MUST-FIX 1, SHOULD-FIX 7/8.

### Day-two edits

Switching media type **never deletes another type's stored attributes** — switch and switch back is
non-destructive. Every picker is hard-restricted to its descriptor's `types`
(`MediaPicker` currently defaults to `['image','video']` unrestricted, so a video can land in an
image attribute and render as a broken `<img src="….mp4">`).
✅ ONBOARDED — Support MUST-FIX 2, SHOULD-FIX 6.

### Error states

`SGS_Media_Element::render()` declares behaviour for: deleted attachment, unreachable URL,
unsupported file, SVG failing sanitisation. Editor shows a placeholder naming the cause; the front
end's behaviour is documented rather than accidental.
✅ ONBOARDED — Support MUST-FIX 4.

---

## 7. Security

| Item | Position |
|---|---|
| **Editor SVG XSS** | ✅ **CLOSED 2026-08-30, and the counts here were wrong.** Not "three editor sites" — **SIX** unsanitised mounts (hero, media, timeline, IconPicker ×2, IconPreview). Not two server allowlists — **SIX**: two byte-identical copies (collapsed), two genuinely diverging (unified into `sgs_allowed_svg_tags()`), plus **two more in `button/render.php`** left alone deliberately, narrower still, and still open. Shipped: allowlists 6→1 (`ad414bfee`, `89f1aefdf`), JS sanitiser generated from the PHP + all 6 mounts (`52e232692`, `51591f936`), misleading help text corrected (`c86938f2a`). Live-verified: `window.SGS_PWNED` undefined in BOTH realms. ⚠ The SMIL bypass (`<a><animate attributeName="href" to="javascript:…">`) is **reasoned, not executed** — owed a canary probe WITH a positive control proving the harness can see a real execution. |
| **Attachment capability** | IDs come from attributes; any role that can edit a post can name any integer. Picker restricted to media the operator can manage; renderer treats an inaccessible attachment as "no media". |
| **Cloning pipeline = untrusted input** | It ingests third-party drafts and writes straight into attributes. **Sanitise on READ, not only on save** — never assume a value came from the inspector. |
| **CSS injection** | ⚠ **The council's finding here was WRONG and I verified it**: `media/render.php:303` already guards `objectPosition` with `preg_match('/^[a-zA-Z0-9%\s.,\-]+$/')`, which excludes `;{}`. **But the principle stands** — every atom's `css()` declares a validator, reject-to-default, because the Style Engine's vocabulary does not cover `object-fit`/`object-position`/`mix-blend-mode`, so those stay hand-composed. Each validator ships a **negative control** proving an out-of-vocabulary value is rejected rather than passed through. |
| **Sanitise on READ** | The cloning pipeline ingests third-party drafts and writes straight into attributes, so a value must never be assumed to have come from the inspector. Validation happens on read, not only on save. |
| **SVG upload policy** | Inline only after allowlist sanitisation; `path-draw`/`animation-source` gated on `unfiltered_html`. |
✅ ONBOARDED — Abuse MUST-FIX 1/3/4 (2 refuted, principle retained), Platform M7, Competitor MF5.

---

## 8. Gates — ratcheted, not binary

⛔ **A binary `--check` on a 20-block backlog is red on day one for 18 blocks, and the only compliant
move becomes "make the rule advisory" — which is how 17 of `inspector-scan`'s rules ended up
advisory.**

| Gate | Mode | Fails when |
|---|---|---|
| `media-no-handroll` | **ratchet + `openBacklog`** | a block declares a media attribute or media CSS outside the registry |
| `media-attr-parity` | binary | server-registered schema ≠ JS keys |
| `media-css-parity` | binary | the JS and PHP value-setters disagree on a fixture attribute set |
| `media-control-coverage` | binary | a declared attribute has no control, or a control shows for a type it does not apply to |
| `media-svg-sanitised` | binary | an SVG mount path is not provably passed through the shared sanitiser |
| `media-disclosure-coverage` | binary | a gated control has no `hiddenReason` |

Each ships a **negative control proving it does not overmatch**, and a fixture proving it can fail.
Gate 1 must state its relationship to the four existing control gates (`check-dead-controls`,
`check-duplicate-controls`, `check-control-ux`, `check-inert-controls`) or it will duplicate one.

⛔ **`media-markup-parity` is DROPPED as specified in v1** — it compared rendered DOM, which needs a
live canary, and the repo's existing live-canary gate WARNS-and-PASSES when unreachable. Replaced by
`media-css-parity`, a static fixture comparison.
✅ ONBOARDED — Ship-PM M7, Cynic MF-6 / SF-1 / SF-2, Spec-Lawyer MUST-FIX 2/3.

### The escape hatch — specified, because an abstraction without one gets nine undocumented ones

A surface that genuinely cannot be expressed declares `mediaUnsupported: [ 'reason' ]` in an
allowlist file the gate reads. **An entry is a backlog item with an owner and a removal criterion**,
not a permanent exemption.
✅ ONBOARDED — Cynic MISSING M-A.

### The debug trail — because an agent, not a human, will diagnose this

Every emitted element carries `data-sgs-media-src="<descriptor-key>@<prefix>"` so "which descriptor
produced this rule?" is answerable from the page. Without it the diagnosis chain is descriptor →
injection filter → PHP schema → renderer → stylesheet → custom property, with no provenance.
✅ ONBOARDED — Cynic MISSING M-B.

---

## 9. Migration, rollback and in-flight content

1. **Census first** — one JSON artefact in `reports/migrations/` answering "how many media attrs, on
   which surfaces, which are exempt", **before any edit**. THE-MIGRATION-METHOD requires the
   detector as the first deliverable past 3 files.
   ✅ **SHIPPED 2026-08-30** (`9b67c3885`) — `reports/migrations/media-element-census.json`:
   128 media attributes, 6 surfaces, 3 excluded with reasons, **10 storage shapes**, `STORED_AS` of
   four.
   ⚠ **SCOPE CORRECTION (2026-08-30).** §17 commissioned it as *"per surface: `prefix`, `context`,
   `insertion`, `mechanism`, `storedAs` map, and escape-hatch flags"* — i.e. the **source, type,
   meaning and behaviour** families. It delivered exactly that. It therefore records **no
   presentation attributes at all**: `objectFit`, `objectPosition`, `mediaSizing`, `height`,
   `backgroundOverlayColour` and `splitMediaObjectFit` are all absent, verified individually.
   **Atoms 7-10 have no manifest until the presentation half is persisted** — a further **34 distinct
   names / 55 surface-attribute pairs** (hero 22 · container 14 · media 13 · before-after 5 ·
   decorative-image 1 · product-card 0). That is a write-up of measurements already taken in the
   2026-08-30 survey pass, not a fresh study, and it is Wave 3 Stage 2. ⛔ Do not read §5's atom list
   as a census; the doc itself calls that list a wish-list.
2. **No renames in v1** (§2 `storedAs`), so no content migration is required to adopt the standard.
3. **`product-card.image`** (bare URL string, no attachment ID, no tiers) ships **separately, after
   the abstraction is proven**, and keeps the old attribute alongside the new for one deploy cycle
   with the renderer falling back to it. WP-CLI batch with `--user=1` (KSES strips CSS otherwise),
   dry-run against a DB snapshot reporting a diff count before `--execute`, and a
   `_sgs_media_legacy_backup` postmeta so the original is recoverable.
4. **Codemod**: isolated worktree, **one surface per commit**, path-scoped, re-runnable idempotently.
   ⛔ Five tracks share `main`.
5. **In-flight content**: because v1 renames nothing, a post saved between deploys round-trips
   unchanged. This is the main reason `storedAs` is non-negotiable.
✅ ONBOARDED — Spec-Lawyer MUST-FIX 8/9, Support MUST-FIX 3, Competitor MF6, Cynic SF-3/SF-6, Ship-PM M6.

---

## 10. Build order — two surfaces on day one

⛔ **v1 put the first consumer at step 6 of 8. Stop halfway and the tree has a registry, a codegen
step and gates that nothing calls — strictly worse than today's two-adopter helper.**

| # | Step | Safe to stop after? |
|---|---|---|
| 1 | Census artefact | yes — pure information |
| 2 | L1 helper pair + attribute injection filter | yes — additive, nothing consumes it |
| 3 | The six v1 atoms + L2 panel registry + L3 dispatch | yes |
| 4 | ⭐ **Wire `sgs/media` AND `before-after` together** | **yes — and this is the payoff point** |
| 5 | Bean's eye on both, live (R-31-13) | — |
| 6 | Gates, scoped to the two wired surfaces | yes |
| 7 | Remaining surfaces via codemod, one commit each | yes, per surface |
| 8 | `product-card` content migration | separate |

⛔ **The second surface is `before-after`, NOT hero.** Hero already shares `sgs_tier_media_render()`
with timeline, so it would pass and prove nothing. `before-after` has two independent instances,
video sync, and its own scoped-selector machinery — **it is the falsifying case.**

**The falsification test, made objective:** wiring the second surface must require **no edit to
`MediaElementControls`, `SGS_Media_Element`, or either injection filter**.

⛔ **PATH CORRECTED 2026-08-30 — this is load-bearing, not cosmetic.** The test originally read *"a
new file under `src/media/controls/*` with no changes outside that directory is a PASS."* The shared
layer does **not** live there and must not: `check-control-helper-parity.py` discovers helper
families from disk by convention — a `*AttrName`/`*AttrKeys` export in **`src/components/`** plus a
PHP twin whose slug matches — and `src/media/controls/` sits outside that scan, so Media would
silently never have registered as the fourth family (Bean's decision, taken).

**The test now reads:** `git diff --stat` after wiring `before-after` shows **no file outside
`src/components/Media*` and `includes/helpers-media-element.php`**.

⚠ `before-after` is currently BEST-IN-CLASS on two axes measured by the census — one parameterised
picker driving both slots with zero drift, and the narrowest per-type gating of any surface. **A
unification that downgrades it has failed.** Absorb those patterns; do not flatten them.
✅ ONBOARDED — Ship-PM M2, Competitor SHOULD-FIX 1, Spec-Lawyer MUST-FIX 4, Cynic MISSING M-C.

### Acceptance — the gates are all static, so they cannot close this

⛔ Every gate is build-time. None proves a page renders correctly. **Closing requires:** the six
original defects from Bean's report re-run live in the editor and on the front end, plus Spec 20
computed-parity across the wired surfaces, plus **Bean's visual sign-off (R-31-13)**. Numbers alone
do not close; the eye alone does not close.
✅ ONBOARDED — Spec-Lawyer MISSING, Support MUST-FIX 5, Competitor MISSING 5, Cynic MISSING M-G.

---

## 11. Effort — smallest plausible

**Revised 2026-08-30 against measured actuals from waves 1-2.**

| Step | Estimate | Actual |
|---|---|---|
| Census | 2h | ✅ shipped, with the two security items and 7 new gates, in one session |
| L1 helpers + injection filter | 4h | ✅ shipped same session (`cce7427bd`, `ea5f7ed09`) |
| Census — presentation half | +45m | write-up of measurements already taken |
| Architecture doc realignment | +1h | this rewrite |
| **10** atoms + shared helpers + selective injection | 6h → **~5.5h** | 4 parallel branches; 6 of ~8 controls already exist |
| Panel registry + dispatch | — | Wave 4 |
| Wire both surfaces | 4h | Wave 5 |
| Gates + negative controls | 6h | Wave 6 |
| Remaining surfaces (codemod) | 2-3 days, separately | Wave 7 |
| `product-card` content migration | separate, after proof | — |

⚠ Waves 1-2 came in materially faster than this table's originals. Treat the remaining figures as
upper bounds, not targets.

---

## 12. Dropped from v1, with reasons

| Dropped | Why |
|---|---|
| **Codegen** | The injection filter covers declaration; the existing generator covers server registration. No second source of truth (Cynic MF-2). |
| **Interactivity API rewrite** | Orthogonal to a controls goal; rewrites working runtimes; already in ~13 blocks so the "learning cost" risk was backwards; and `data-wp-bind--` sets attributes while video `currentTime` is a property, so sync still needs imperative code. |
| **`<picture>` swap** | Breaks the pipeline's recognition contract (R-31-2); discards core's image pipeline; and the `display:none` download justification was overstated — a lazy hidden image generally is not fetched. |
| **`media-markup-parity` as specified** | Needed a live canary; the repo's live-canary gate passes when unreachable. |
| **~20 of the 30 atoms** | ⚠ **REVISED 2026-08-30 — was "24 of 30", i.e. six shipped.** v1 now ships **ten** (§5): the original six missed the whole of meaning, video behaviour, SVG presentation and intrinsic dimensions — 36 of the census's 103 names — and left the headline `requires` rule with no owner. The remaining ~20 follow once the mechanism is proven. |
| **A golden-controls recipe per media control** | Considered and rejected 2026-08-30. `golden-controls.json` encodes 14 control types but exactly ONE (`colour`) has a rule that reads it, so the row would enforce nothing. A shared component enforces by construction. One `canonical.component` pointer line is still added per helper as a hook for Wave 6's `media-no-handroll` rule — **inert until that rule exists.** |

---

## 13. The five "open" items — resolved, after Bean challenged them (2026-08-30)

Bean: *"Why are those 5 left open? We can exclude responsive logo if that helps speed things up."*
Three were open out of caution rather than necessity. Resolved:

| Item | Verdict |
|---|---|
| **`responsive-logo`** | ⛔ **EXCLUDED from scope — Bean's call, taken.** It is already good: native `<picture><source media>`, zero JS, every attribute controlled, genuinely per-tier with inherit-up. Forcing it onto the shared shape would be a DOWNGRADE, and it is the only surface using that mechanism — excluding it removes a whole mechanism variant from v1. Revisit only if it develops a defect. |
| **Editor-canvas iframe breakpoints** | ✅ **NOT open — it is a v1 constraint, and L4 already answers it.** The canvas is an iframe whose width ≠ viewport, so media queries resolve against the iframe. That is exactly what the device-preview switcher WANTS. Because L4 puts the rules in a stylesheet both sides load and passes only custom-property VALUES, the canvas resolves the correct tier by construction. **The thing to avoid is a JS-computed preview tier** — which is precisely what `container/edit.js:351` does today and what L4 removes. Leaving this "open" was my error. |
| **AVIF / WebP** | ✅ **Partly free, and the rest is not blocked on us.** Using `wp_get_attachment_image()` (§4, generate-then-amend) inherits whatever modern-format handling core and the site's image pipeline provide, at the attachment level. Full `<picture type="image/avif">` negotiation needs the `<picture>` element, which v1 drops — so it travels with that decision, not separately. No action in v1; no gap either. |
| **Container queries** | ✅ **Genuinely additive later, and nothing needs it today.** A media element inside a 3-column grid would want container-relative art direction, and no `media`-attribute mechanism can express it. But adding it later is a NEW `mechanism` value, not a change to the four layers — the axis exists precisely so a new mechanism can be added without touching controls, panels or dispatch. Recorded as a known ceiling so it is not re-discovered as a surprise. |
| **`object-view-box`** | ✅ **Deferred on BROWSER SUPPORT, not on architecture.** It would art-direct one file instead of shipping three — attractive for the common "same image, tighter mobile crop" case. ⚠ Support is uneven and must be **verified at build time, not asserted** before anything depends on it. Like container queries, it lands later as a `mechanism` value. |

**Net effect: zero items remain open that could block or reshape v1.** One is excluded, one was never
open, three are additive extensions the `mechanism` axis exists to absorb.

---

## 14. Bean's frontloading model — right, with one ordering correction

Bean: *"once the first 2 surfaces have been wired up, then the rest are super easy — we can just use
a script to gut the current functionality we're going to replace and then use a script to insert our
set of helpers."*

**That is exactly THE-MIGRATION-METHOD's shape, and it is why the second surface choice matters.**

### Why the first two surfaces make the rest mechanical

`sgs/media` and `before-after` between them exercise **every hard case in the population**:

| Case | Covered by |
|---|---|
| root insertion, no prefix | `sgs/media` |
| element insertion, prefixed | `before-after` (`before`/`after`) |
| **two independent instances on one block** | `before-after` |
| all three media types | both |
| per-tier image sources | both |
| video behaviour + two-`<video>` sync | `before-after` |
| existing stored attribute names (`storedAs`) | both |

Once those are wired, the remaining surfaces are **combinations of cases already solved**, which is
what makes the codemod mechanical rather than exploratory. That is the whole argument for choosing
`before-after` over hero as surface two — hero would have passed easily and taught nothing.

### ⛔ The one correction: INSERT before GUT, per surface

The instinct to script both halves is right. The **order** matters, and gut-then-insert is the risky
version — it leaves a window where a surface has neither implementation, and if the insert step
fails on surface 4 of 7 the tree is half-migrated with live blocks rendering nothing.

**Per surface, in one commit:**

1. **INSERT** — add the opt-in to `block.json`, mount `MediaElementControls`, call
   `SGS_Media_Element::render()`.
2. **VERIFY** — the surface renders correctly with the new path.
3. **GUT** — delete the old attributes, panels and render code.

Both halves are still scripted; they are just sequenced so no surface is ever without a working
implementation. **A surface either has the old code or the new code, never neither.** This also makes
the rollback trivial — revert one commit, one surface.

### What the script genuinely cannot decide

Honest limits, so nobody discovers them mid-batch:

- **`prefix` / `context` / `insertion` per surface** — a judgement call, but only three values and
  one line per surface. Decide all of them in the census (step 1), before any edit.
- **`storedAs` mapping** where a surface's existing attribute names differ — mapped once per surface,
  from the census.
- **Genuinely unique behaviour** — `decorative-image`'s naked mode. Hand it back rather than
  improvise; that is what the escape hatch is for.

Everything else is mechanical.

---

## 15. Execution — the dependency chain, and what actually parallelises

Bean asked whether this can be built via `/dispatching-parallel-agents` + `/delegate`. **Yes, but
only the leaves fan out.** The foundation is a dependency chain and parallelising it would multiply a
wrong decision rather than divide the work.

| Wave | Work | Parallel? | Model | Why |
|---|---|---|---|---|
| **1** | **Census artefact** — per-surface `prefix` / `context` / `insertion` / `storedAs` | ❌ **inline** | strategic | `/delegate` REFUSES `synthesis` shapes — they stay in the main thread |
| **2** | **L1 helper pair + attribute injection filter** | ❌ **inline, serial** | strategic | the contract every later wave inherits |
| **3** | **The six v1 atoms** | ✅ **4 branches** | Sonnet | disjoint files, contract already fixed by wave 2 |
| **4** | Panel registry + dispatch layer | ❌ serial | Sonnet | composes the atoms |
| **5** | Wire `sgs/media`, **then** `before-after` | ❌ **deliberately serial** | Sonnet | see below |
| **6** | Six gates + negative controls | ✅ **4 branches** | Sonnet | disjoint |
| **7** | Remaining surfaces — insert → verify → gut, one commit each | ✅ one per surface | Sonnet | cases already solved in wave 5 |

`/delegate` routes mechanical branches to **Sonnet, fallback Haiku, capped at 4 parallel**.

### ⛔ Waves 1-2 stay inline — this is a routing rule, not a preference

`/delegate` carries a **strategic-work refusal**: `synthesis`, `spec_rewrite`, `gap_analysis` and
`research_decision` shapes are refused by the router and stay in the main thread. Wave 1 is a
synthesis of five survey reports plus Bean's rulings; wave 2 is the decision every later wave
inherits. **Dispatching either means four parallel agents building four wrong atoms in parallel.**

### ⛔ The two surfaces MUST be wired sequentially — parallelising destroys the design's only test

The falsification test is: *wiring the second surface must require no edit outside
`src/media/controls/`.* If `sgs/media` and `before-after` are built concurrently, **both agents can
quietly patch the shared layer to suit themselves**, and the signal is gone.

- `sgs/media` first → proves the layer works.
- `before-after` second → tests whether it works for something it was **not shaped around**.

Run them together and you get two wired surfaces and **no evidence**.

### Why waves 3-7 are genuinely mechanical (Bean's frontloading model, validated)

Bean: *"once the first 2 surfaces have been wired up, then the rest are super easy."* Correct — and
§14 records why: `sgs/media` + `before-after` between them exercise root insertion, element
insertion, two independent instances on one block, all three media types, per-tier sources, video
sync and `storedAs`. **Every later surface is a combination of cases already solved**, which is what
makes a codemod mechanical rather than exploratory.

⛔ **Per surface the order is INSERT → VERIFY → GUT in one commit**, never gut-then-insert. A surface
always has either the old code or the new code, never neither, and rollback is one revert.

---

## 16. Status of every open question

| Was open | Now |
|---|---|
| `responsive-logo` | ⛔ **EXCLUDED** — Bean's call. Already good (native `<picture>`, zero JS, per-tier); forcing it onto the shared shape is a downgrade, and excluding it removes a mechanism variant from v1 |
| Editor-canvas iframe breakpoints | ✅ **Not open** — a v1 constraint that L4 answers by construction. My error to list it |
| AVIF / WebP | ✅ Partly free via `wp_get_attachment_image()`; full negotiation travels with the dropped `<picture>` decision |
| Container queries | ✅ Additive later as a new `mechanism` value — the axis exists for this |
| `object-view-box` | ✅ Deferred on **browser support**, to be VERIFIED at build time, never asserted |
| Codegen | ✅ Redundant for UI and CSS; the attribute gap is closed by runtime injection. ⚠ **The rest of this row was false** — the existing generator was NOT gated and structurally cannot see media keys. See §0 for what shipped instead |
| Bound / dynamic media | ✅ `source: 'static' \| 'binding'` — §5b, designed now, built later. Carried as a descriptor field so a bound source never becomes a per-block fork |

**Nothing remains open that could block or reshape v1.**

### Added 2026-08-30 — resolved during waves 1-3 planning

| Item | Resolution |
|---|---|
| The L2 exemplar | `KIND_PANELS`'s "30 adopters, most-adopted" was false on both counts → `SgsColourPanel` (65), caller-composed rows (§2 L2) |
| The generator's gating | Was not gated, and cannot see media keys → PHP filter on `register_block_type_args` + its own narrow generator (§0) |
| `prefers-reduced-motion` | Already implemented and thorough → **STRUCK, not built** (§5) |
| SVG allowlist / mount counts | "three sites, two lists" → **six mounts, six lists** (+2 in `button/render.php`, still open) (§7) |
| Atom count | six → **ten**; 36 of 103 census names were uncovered and `requires` had no owner (§5) |
| object-fit's three enums | Resolved inline — `custom` is a sizing mode, reassigned to `box-shape`; hero's `--image, --video` scoping is the canonical video/SVG answer (§5) |
| How a control becomes standard | Shared helper, not a schema recipe — 1 of 14 golden-controls types is enforced (§5, §12) |
| Census scope | Source-side only; presentation half (34 names / 55 pairs) persisted in Wave 3 Stage 2 (§9) |
| Falsification-test path | `src/media/controls/*` → `src/components/Media*` — the parity gate only scans `src/components/` (§10) |

---

## 17. Next action

⚠ **This section previously commissioned Wave 1's census. That is DONE** (`9b67c3885`), along with
Wave 2's L1 pair and declarative injection (`cce7427bd`, `ea5f7ed09`) and both security items — all
deployed and live-verified on the canary. Evidence:
`reports/visual-diff/svg-sanitiser-captions-2026-08-30.md`, probe page 3143.

**Next: Wave 3 — the ten atoms.** Live plan: `~/.claude/plans/media-element-zippy-boole.md`.

| Stage | Work | Safe to stop after? |
|---|---|---|
| 1 | This rewrite — realign the canonical doc | yes |
| 2 | Persist the census's presentation half (34 names / 55 pairs) | yes — pure information |
| 3 | Atom contract + shared helpers + selective injection | serial; blocks the fan-out |
| 4 | The ten atoms — 4 parallel Sonnet branches | yes |
| 5 | `/qc-inline` per atom, `/qc-council` before the commit | — |

⛔ **Selective injection is a Wave 3 prerequisite, not a nicety.** The Wave 2 filters inject **all 34
bases** per declared prefix. `supports.sgs.mediaElements` has **zero adopters today**, so this has
never bitten — but declaring `sgs/product-card` (3 real media attrs) would inject ~80 attributes
nothing reads, which is the dead-control class `check-dead-controls.js` exists to stop. The entry
shape gains `atoms: [...]`, and the injected set becomes the union of those atoms' `bases`. This also
finally gives `context` a reader — it is declared in the entry shape and read by neither side today.

⚠ **Wave 3 cannot claim paint.** Atoms are not wired to a surface until Wave 5, so no live DOM check
is possible and none must be asserted. Wave 3 closes on JS/PHP parity, validator negative controls
and helper reuse; **Wave 5 closes on paint** (STOP-CONSUMED-IS-NOT-PAINTED).
