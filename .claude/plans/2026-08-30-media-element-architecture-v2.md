---
doc_type: design
title: The SGS Media Element — architecture v2 (post-council)
date: 2026-08-30
status: PROPOSED — every council finding onboarded; awaiting Bean's approval
owner: client-controls track
supersedes: 2026-08-30-media-element-architecture.md (v1, graded C/C+/D by a 7-seat council)
---

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

⚠ **One narrow generator remains, and it already exists.** The server needs the same attributes
registered so `ServerSideRender` validates (12 blocks use it). That is exactly what
`generate-extension-attributes.js` does today, and it is already gated. **Media adds its attributes
to that existing mechanism rather than creating a second one.** No new build step.

✅ ONBOARDED — Cynic MF-2 (do not build a second source of truth beside `check-control-helper-parity.py`),
Ship-PM M5, Competitor (codegen is cost, not proof of need).

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
| **L2 Panels** | GROUPING | `KIND_PANELS` — 30 adopters, the framework's most-adopted shared component |
| **L3 Element** | DISPATCH + RENDER | `ContainerWrapperControls` + `SGS_Container_Wrapper` |
| **L4 Styling** | CSS | `before-after`'s custom-property pattern |

### L1 — naming, with a prefix

```js
mediaAttrName( prefix, base )   // 'before' + 'ImageUrl' -> 'beforeImageUrl'; '' -> 'imageUrl'
mediaAttrKeys( prefix )         // the canonical key set
```
```php
sgs_media_attr( $prefix, $base )
sgs_media_css_rule( array $attributes, $prefix, $selector )
```

Identical shape to typography, which `check-control-helper-parity.py` already measures
(*"3 name-keyed; of those 3, 3 complete"*). **Media becomes the fourth.**

⛔ **`storedAs`: ZERO attribute renames in v1.** A rename is a stored-`post_content` migration,
because WP discards undeclared attributes — the client's image vanishes with every gate green. Each
descriptor carries the surface's EXISTING name (`beforeImageUrlTablet` stays as it is). Determinism
for the pipeline comes from the descriptor map, not from the string.
✅ ONBOARDED — Ship-PM M1.

### L2 — the panel registry

```js
const MEDIA_PANELS = {
  root:     [ SourcePanel, PresentationPanel, BehaviourPanel, MeaningPanel ],
  element:  [ SourcePanel, PresentationPanel, BehaviourPanel, MeaningPanel ],
  backdrop: [ SourcePanel, PresentationPanel, BehaviourPanel ],   // no caption/link, no player chrome
};
```

One file per panel; a context is **which array you get**. Exactly `KIND_PANELS`'s shape, and exactly
the "insert different sets" model Bean described from the colour helpers.

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
✅ ONBOARDED — Cynic MF-3, Ship-PM, Platform S2.

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

### ⭐ v1 SHIPS v1 WITH SIX ATOMS, NOT THIRTY

The six that cover every disagreement measured across all surveyed surfaces:
**source · media-type · object-fit · focal-point · box-shape · overlay.** The rest are v2.
✅ ONBOARDED — Ship-PM (the atom list was a wish-list, not a plan).

### Cross-attribute constraints — a `requires` field, not just a `gate`

`autoplay` without `muted` + `playsinline` is silently blocked on every mobile browser. So a
descriptor carries `requires`, enforced in **both** the control UI and the renderer.
✅ ONBOARDED — Platform M6.

### Accessibility — three items that are compliance, not preference

- **`<track>` captions.** `grep -rn "<track"` returns **zero** across the framework. WCAG 1.2.2 is
  **Level A**, below the stated AA baseline. A non-muted video requires at least one track before
  the gate passes.
- **`prefers-reduced-motion`** on ken-burns and parallax — a stated non-negotiable, absent in v1.
- **Decorative/alt** stays per-instance (the same logo is meaningful in a header, decorative in a
  footer strip).
✅ ONBOARDED — Platform M5, N8, N9.

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
| **Editor SVG XSS** | ⛔ v1 restated a known privilege-escalation bug without closing it. Three editor sites inject operator SVG via `dangerouslySetInnerHTML` with no sanitiser while the front end runs `wp_kses`. **v2 ports `sgs_allowed_svg_tags()` to a JS constant from ONE source and sanitises before every mount**, with a PHP/JS parity gate. The misleading help text (`timeline/edit.js:462`) is corrected in the same change. |
| **Attachment capability** | IDs come from attributes; any role that can edit a post can name any integer. Picker restricted to media the operator can manage; renderer treats an inaccessible attachment as "no media". |
| **Cloning pipeline = untrusted input** | It ingests third-party drafts and writes straight into attributes. **Sanitise on READ, not only on save** — never assume a value came from the inspector. |
| **CSS injection** | ⚠ **The council's finding here was WRONG and I verified it**: `media/render.php:303` already guards `objectPosition` with `preg_match('/^[a-zA-Z0-9%\s.,\-]+$/')`, which excludes `;{}`. **But the principle stands** — every atom's `css()` declares a validator, reject-to-default, because the Style Engine's vocabulary does not cover `object-fit`/`object-position`/`mix-blend-mode`, so those stay hand-composed. |
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
`compose.js`, `MediaElementControls`, `SGS_Media_Element`, or the injection filter**. A new file
under `src/media/controls/*` with no changes outside that directory is a PASS.
✅ ONBOARDED — Ship-PM M2, Competitor SHOULD-FIX 1, Spec-Lawyer MUST-FIX 4, Cynic MISSING M-C.

### Acceptance — the gates are all static, so they cannot close this

⛔ Every gate is build-time. None proves a page renders correctly. **Closing requires:** the six
original defects from Bean's report re-run live in the editor and on the front end, plus Spec 20
computed-parity across the wired surfaces, plus **Bean's visual sign-off (R-31-13)**. Numbers alone
do not close; the eye alone does not close.
✅ ONBOARDED — Spec-Lawyer MISSING, Support MUST-FIX 5, Competitor MISSING 5, Cynic MISSING M-G.

---

## 11. Effort — smallest plausible

| Step | Estimate |
|---|---|
| Census | 2h |
| L1 helpers + injection filter | 4h |
| 6 atoms + panel registry + dispatch | 6h |
| Wire both surfaces | 4h |
| Gates + negative controls | 6h |
| **v1 total** | **~3 days** |
| Remaining surfaces (codemod) | 2-3 days, separately |
| `product-card` content migration | separate, after proof |

---

## 12. Dropped from v1, with reasons

| Dropped | Why |
|---|---|
| **Codegen** | The injection filter covers declaration; the existing generator covers server registration. No second source of truth (Cynic MF-2). |
| **Interactivity API rewrite** | Orthogonal to a controls goal; rewrites working runtimes; already in ~13 blocks so the "learning cost" risk was backwards; and `data-wp-bind--` sets attributes while video `currentTime` is a property, so sync still needs imperative code. |
| **`<picture>` swap** | Breaks the pipeline's recognition contract (R-31-2); discards core's image pipeline; and the `display:none` download justification was overstated — a lazy hidden image generally is not fetched. |
| **`media-markup-parity` as specified** | Needed a live canary; the repo's live-canary gate passes when unreachable. |
| **24 of the 30 atoms** | v1 ships six; the rest follow once the mechanism is proven. |

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
| Codegen | ✅ Redundant for UI and CSS; the attribute gap is closed by runtime injection, and the one generator needed already exists and is already gated |
| Bound / dynamic media | ✅ `source: 'static' \| 'binding'` — §5b, designed now, built later |

**Nothing remains open that could block or reshape v1.**

---

## 17. Next action

**Wave 1, inline: the census.** Synthesise the five existing survey reports
(`.claude/reports/2026-08-30-media-M1..M5-*.md`) into a build manifest — per surface: `prefix`,
`context`, `insertion`, `mechanism`, `storedAs` map, and escape-hatch flags — re-measuring only what
Bean's rulings changed. ⛔ Do NOT re-run the surveys; they are done. Output to
`reports/migrations/media-element-census.json`.
