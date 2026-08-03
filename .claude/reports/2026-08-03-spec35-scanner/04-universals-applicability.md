# Universal extensions — applicability contract, U2 crash root cause, detector rules

**Date:** 2026-08-03
**Scope:** `plugins/sgs-blocks/src/blocks/extensions/*.js` + the server-side mirror
`plugins/sgs-blocks/includes/extension-attrs-rest-register.php`
**Method:** static read of every extension + **live reproduction in the canary editor**
(sandybrown, WP 7.0.2, logged in as `Claude`), sweeping all 84 registered `sgs/*` block
types. Deployed bundle verified byte-identical to the local build before testing
(`md5 d4d330a8bd95c315cbc5d204641bad7c`, local `plugins/sgs-blocks/build/extensions/index.js`
vs the same path fetched over HTTP from the canary) so the live result describes this
source tree.
**Status:** READ-ONLY investigation. Nothing was fixed. Two auto-draft pages (IDs 2142,
2143) were created on the canary by the editor harness and left unpublished.

---

## 0. Headline

1. **U2 is one defect, not a class.** Every crash observed anywhere in the framework
   traces to a single wrong import line — `image-controls.js:28` imports
   `FocalPointPicker` from `@wordpress/block-editor`, where it does not exist. It lives
   in `@wordpress/components`. Proven live, twice over.
2. **Bean's framing on U1 is correct, but the named example is wrong.** Image controls is
   the *best*-gated extension in the set (a real declared capability, 15 blocks of 84).
   Block Link, Hover Effects, Click Effects, Element parallax, Visibility Conditions,
   Custom CSS and Device visibility are the ones with no meaningful applicability check
   — they attach to essentially everything.
3. **The worst finding is not in Bean's list.** The universal **Spacing** panel is
   **completely inert on every block that shows it** — the values save into the block
   comment and *nothing anywhere* consumes them. Proven below. It renders on ~50 blocks.
4. **A working model already exists in-repo.** `fx.js` derives applicability from a
   declarative per-effect `requires` column in the DB matched against per-block
   provisions, precomputed by a generator. That is the contract to generalise (§5).

---

## 1. Extension inventory

11 injecting extensions live in `src/blocks/extensions/` (all loaded unconditionally by
`extensions/index.js:13-22`), producing **13 distinct inspector panels**, plus one
server-side attribute mirror. `check-universal-fit.js` knows about 10 of them — it
predates `fx.js` and does not model it at all.

| # | File | Panel(s) injected | Attributes registered | Current gating rule | Class |
|---|------|-------------------|-----------------------|---------------------|-------|
| 1 | `animation.js` | **Animation** (`:139-140`) | `sgsAnimation`, `sgsAnimationDelay/Duration/Easing` | `name.startsWith('sgs/')` OR one of 4 named core blocks (`:62`) + opt-out `animation` (`:73`, `:122`) | prefix-match + opt-out |
| 2 | `hover-effects.js` | **Hover Effects** (`:282`) | 14 `sgsHover*`/`sgsFocusRing`/`sgsStaggerDelay` | `supports.className !== false` (`:154`, `:240`) + opt-out `hover` | opt-out-only |
| 3 | `hover-effects.js` | **Block Link** (`:385`) | `sgsBlockLink`, `sgsBlockLinkTarget`, `sgsBlockLinkLabel` | same + opt-out `blockLink` (`:197`, `:251`) | opt-out-only |
| 4 | `hover-effects.js` | **Click Effects** | `sgsClickEffect`, `sgsClickRippleColour/Duration` | same + opt-out `clickEffects` (`:211`, `:252`) | opt-out-only |
| 5 | `conditional-visibility.js` | **Visibility Conditions** (`:261`) | 7 `sgsCondition*` | `supports.className !== false` (`:53`, `:249`) — **no opt-out slug exists** | near-unconditional |
| 6 | `custom-css.js` | **Custom CSS** in Advanced (`:45`) | `sgsCustomCss` | **none whatsoever** — the HOC (`:36-64`) tests nothing; the attribute filter (`:17-28`) only checks that `settings.attributes` exists. Applies to core blocks too. | unconditional |
| 7 | `custom-spacing.js` | **Spacing** (`:101`) | `sgsMarginTop/Bottom`, `sgsPaddingTop/Bottom` | attrs: `sgs/` prefix + `!settings.supports.spacing` (`:27`, `:32`). Panel: `sgs/` prefix + opt-out `spacing` + `!props.attributes.style?.spacing` (`:74`, `:80`, `:85`) — **the two conditions test different things** | mismatched |
| 8 | `parallax.js` | **Element parallax** (`:184`) | `sgsParallax`, `sgsParallaxStrength` | `supports.className !== false` (`:123`) + opt-out `parallax` (`:129`) | opt-out-only |
| 9 | `parallax.js` | Background parallax toggle, injected into the native **Colour** panel (`:144`, `group="color"`) | (shares `sgsParallax`) | additionally `getBlockSupport(name, ['color','background'])` (`:104`) | **capability-derived** (half the panel only) |
| 10 | `responsive-visibility.js` | **Device visibility** in Advanced (`:115`) | `sgsHideOnMobile/Tablet/Desktop` | `supports.className !== false` (`:46`, `:91`) — no opt-out slug | near-unconditional |
| 11 | `image-controls.js` | **Image Controls** (`:158`) | `sgsObjectPosition`, `sgsObjectFit`, `sgsMaxWidth`, `sgsHeight{Desktop,Tablet,Mobile}`, `sgsHeightUnit` | `supports.sgs.imageControls === true` (`:43-51`, `:76`, `:114`) — no opt-out slug (none needed) | **capability-declared** |
| 12 | `block-defaults.js` | **Save as Default** button in Advanced (`:88`) | none | `name.startsWith('sgs/')` (`:57`) | prefix-match |
| 13 | `fx.js` | fx **ToolsPanel** in the Styles tab (`:1230`, `group="styles"`) | 25 `fx*` attributes | `shouldHaveFx(name)` → `fxOptionsForBlock(name).length > 1`, read from `generated-fx-qualifying-blocks.json` (`:720-722`, `:732`, `:1092`) + opt-out `fx` (`:739`) | **capability-derived (DB)** |
| — | `includes/extension-attrs-rest-register.php:64-79` | *(no panel)* | **all ~70 extension attributes, on every block** | `supports.className !== false` only | unconditional (server) |

**Classification tally — 13 panels:**

- capability-derived: **2** (fx panel; the background-parallax half-panel)
- capability-declared: **1** (Image Controls)
- opt-out-only: **4** (Hover, Block Link, Click Effects, Element parallax)
- prefix-match + opt-out: **1** (Animation)
- prefix-match only: **1** (Save as Default)
- near-unconditional (only `supports.className`): **2** (Visibility Conditions, Device visibility)
- unconditional: **1** (Custom CSS)
- mismatched (attribute gate ≠ panel gate): **1** (Spacing)

**→ 10 of 13 panels have no real applicability check** (everything below
"capability-declared"). `supports.className !== false` is not an applicability check — it
is a *rendering* precondition; no `sgs/*` block in the tree sets it to `false`, so in
practice it excludes nothing.

**Opt-out slug integrity.** Seven slugs are implemented (`animation`, `blockLink`,
`clickEffects`, `fx`, `hover`, `parallax`, `spacing` — grep of `isExtensionHidden(` call
sites). Twenty-six block.json files declare `hideExtensions`, using exactly those seven
and nothing else: `{animation:18, hover:17, blockLink:17, clickEffects:17, parallax:17,
fx:7, spacing:3}`. **There are currently zero typo slugs.** But nothing validates them —
a misspelling would be silently discarded by `hide-extensions.js:38`
(`list.includes(slug)`), and the module docblock (`hide-extensions.js:20`) is already
stale: it lists six recognised slugs and omits `fx`, which seven blocks depend on.

---

## 2. U2 — root cause, proven

### The failure

`plugins/sgs-blocks/src/blocks/extensions/image-controls.js:28`

```js
import { FocalPointPicker, InspectorControls } from '@wordpress/block-editor';
```

`FocalPointPicker` is exported by **`@wordpress/components`**, not `@wordpress/block-editor`.
`@wordpress/scripts` externalises the package to the `wp.blockEditor` global, so the
import resolves to `undefined` at runtime with **no build error** — webpack does not
validate named exports of an external, and ESLint has no rule that knows the WP package
surface. The bundle builds green, deploys green, and every prebuild gate passes.

### Why it only fires "on selecting image controls"

`PanelBody` renders its children only while expanded. The panel is declared
`initialOpen={false}` (`image-controls.js:159`), so `<FocalPointPicker …>` — i.e.
`React.createElement(undefined, …)` — is not constructed until the client clicks the
panel header. At that instant React throws **error #130** ("Element type is invalid …
got: undefined"), the throw propagates up the fill's React tree to the block's
`BlockCrashBoundary`, and the block renders **"This block has encountered an error and
cannot be previewed."** The whole inspector below the block title unmounts at the same
time.

### Evidence (three independent sources)

1. **Live console at the moment of expansion** (canary, `sgs/team-member` inserted,
   "Image Controls" header clicked):
   `Error: Minified React error #130; …?invariant=130&args[]=undefined&args[]=`
   — `args[]=undefined` is the element type. Nothing else was clicked.
2. **Runtime symbol probe**, same page, same session:
   `typeof wp.blockEditor.FocalPointPicker === "undefined"`;
   `typeof wp.components.FocalPointPicker === "function"`;
   `Object.keys(wp.blockEditor).filter(k => /focal/i.test(k)) === []`.
3. **The crash placeholder itself**, read from the editor-canvas iframe:
   `document.querySelector('iframe[name="editor-canvas"]').contentDocument`
   → `.block-editor-warning` innerText = *"This block has encountered an error and cannot
   be previewed."*

### Which of Bean's three hypotheses is right

Not (a) "the extension throwing on a bad assumption", not (b) an attribute-shape
mismatch — **(c) something else: a resolve-time `undefined` component**. Both other
hypotheses were actively ruled out rather than merely not chosen:

- **The `url=''` assumption is safe.** WP 7.0.2's `FocalPointPicker` handles a missing
  source (`components.js:41720-41726`: `if (!src) return <MediaPlaceholder …>`), and every
  ref read is null-guarded (`:41807`, `:41823`, `:41838`). The heuristic URL lookup at
  `image-controls.js:134-140` cannot crash it.
- **The attribute shapes are safe.** `sgsObjectPosition` is read defensively
  (`:142-151`), and the live probe shows the attribute is registered on both paths.

### Blast radius — measured, not inferred

Every one of the 84 registered `sgs/*` block types was inserted, selected, and had **every
collapsed inspector panel expanded**, with the canvas checked for the crash placeholder
after each. Result:

- **15 blocks crash**, all with the identical React #130 signature:
  `before-after`, `brand-strip`, `card-grid`, `decorative-image`, `gallery`, `hero`,
  `image-sequence`, `info-box`, `product-card`, `responsive-logo`, `team-member`,
  `testimonial`, `testimonial-slider`, `timeline`, `trust-bar`.
- That set is **exactly** the set of blocks declaring `supports.sgs.imageControls: true`
  (verified independently against the live registry). Correlation 15/15, both directions.
- **51 further blocks were fully expanded and did not crash** — 0 other defects. Panel
  counts on those ran 4–18.
- 18 blocks are `parent`-restricted and could not be inserted at the document root by the
  harness. Six representatives were re-tested inside their real parents
  (`form-field-text`, `form-field-select` in `sgs/form`; `tab` in `sgs/tabs`;
  `site-header-row` in `sgs/site-header`; `accordion-item` in `sgs/accordion`;
  `mega-group` in `sgs/mega-panel`) — **none crashed**. The remaining twelve are the
  sibling `form-field-*` blocks and share the tested blocks' shape; they are untested, not
  cleared.

### On "a lot of blocks still have drop downs that break the block"

**Not reproduced.** Across 51 root-insertable blocks with every panel expanded, and 6
parent-restricted blocks, the only crash signature in the entire framework was this one
import. Bean's perception is explained by the fact that the 15 affected blocks are the
visually prominent ones (hero, card-grid, gallery, testimonial, team-member, trust-bar) —
they *feel* like "most blocks" during a real editing session. Two caveats before treating
this as closed: the sweep used freshly-created blocks with default attributes, so a
crash that only fires on a *saved* attribute value (e.g. a legacy string in
`sgsObjectPosition`) would not surface; and twelve `form-field-*` blocks remain untested.

### The generalisable rule this exposes

`FocalPointPicker` is the only wrong import in the tree — but that is luck, not
discipline. Every named import of every `@wordpress/*` package across `src/` (117 symbols
over 13 packages) was extracted statically and checked against the live editor globals.
Exactly one is missing: `wp.blockEditor.FocalPointPicker`. (`wp.icons` is absent from the
post-editor page entirely; that is a page-scoped enqueue fact, not an import defect, and
it is inconclusive from this probe.) The whole class is invisible to `npm run build`,
to ESLint, and to every prebuild gate in the repo — the same blind spot recorded in
`decisions.md` for the two `sgs/site-header-row` crashes: *"no gate in this repo executes
the editor bundle."* Detector D1 (§6) closes it.

---

## 3. The Spacing panel is inert — the biggest live defect in the set

Not on Bean's list, found while mapping the gating. Distinct from U2 and arguably worse,
because it is silent.

**Chain, each link verified:**

1. `custom-spacing.js:100-135` renders four `SpacingControl`s writing `sgsMarginTop`,
   `sgsMarginBottom`, `sgsPaddingTop`, `sgsPaddingBottom` (theme spacing-preset slugs,
   e.g. `"40"`).
2. The only consumer is `applySpacingClasses` (`custom-spacing.js:156-196`), registered on
   **`blocks.getSaveContent.extraProps`** (`:192-196`). That filter runs only for blocks
   with a real `save()`. Nearly every SGS block is dynamic (`save: null`), so it never
   runs for them.
3. Even when it *does* run, it emits `sgs-mt-{value}` / `sgs-mb-` / `sgs-pt-` / `sgs-pb-`
   classes. **No such CSS rule exists anywhere** in `plugins/` or `theme/` (grep for
   `sgs-mt-|sgs-pt-|sgs-mb-|sgs-pb-` across all `.css`/`.scss`/`.php`/`.json` returns only
   unrelated matches: a `wp_unique_id('sgs-mb-')` prefix in `multi-button/render.php:85`
   and the `--sgs-pt-ribbon-bg` custom property in `pricing-table`).
4. There is no `includes/custom-spacing.php` — no server-side counterpart at all, unlike
   `device-visibility.php`, `hover-effects.php`, `parallax.php`, `image-controls.php`.

**Live confirmation.** `sgs/media` (no native spacing) and `sgs/heading` (native spacing)
were each set to `sgsMarginTop: "40"`. Both persisted; serialised markup was
`<!-- wp:sgs/media {"sgsMarginTop":"40"} /-->` and `<!-- wp:sgs/heading {"sgsMarginTop":"40"} /-->`
— attribute stored, **`sgs-mt-40` absent from the output**, and no rule would match it if
it were present.

**Scale.** The panel renders on every `sgs/*` block that has not opted out — only
`sgs/brand-strip` and `sgs/nav-menu` declare `hideExtensions: [… "spacing"]`. Fifty of
those blocks additionally declare native `supports.spacing` and so already carry WP's own
Dimensions panel, giving a client **two "Spacing" panels, one of which does nothing**
(seen live on `sgs/team-member` and `sgs/text`).

**Correction to a prior capture.** The memory
`universal-extensions-attach-where-they-make-no-sense` records that the panel's values are
*"discarded on save"* because `custom-spacing.js` never registers the attributes on
natively-spaced blocks. That is **no longer true** and was probably never the whole story:
`includes/extension-attrs-rest-register.php` registers all extension attributes on every
block server-side, so `sgsMarginTop` exists on `sgs/heading` (as `{type:'string'}`, no
default — the PHP shape, distinguishable from the JS shape `{type:'string',default:''}`)
and the value persists fine. The panel is dead at the **render** end, not the **save** end.
Same symptom for the client, different fix.

---

## 4. Variation taxonomy — "a universal attaches where it shouldn't"

Patterns, with a detectable signature, measured scale, and representative citations.

### V1 — No applicability check at all
The HOC tests nothing about the block; every block that reaches the filter gets the panel.
- *Signature:* the HOC body has no `name`/`supports`/capability test before returning the
  fill.
- *Scale:* 1 panel, ~348 registered block types including core.
- *Example:* `custom-css.js:36-64` — Custom CSS on `core/paragraph` as readily as on
  `sgs/hero`. `check-universal-fit.js:311-322` classifies this as "legitimately universal,
  no opt-out needed"; that is an assertion in the tool's own hardcoded roster, not a
  derived fact.

### V2 — A rendering precondition masquerading as an applicability check
`supports.className !== false` is treated as the gate. It answers "can I attach a class?",
never "does this control mean anything here?".
- *Signature:* the only gate expression is `supports?.className === false`.
- *Scale:* 4 panels (Hover, Block Link, Click Effects, Element parallax) reach 83–84 of 84
  `sgs/*` blocks before opt-outs; Visibility Conditions and Device visibility reach all 84
  with no opt-out available.
- *Examples:* `hover-effects.js:154`/`:240`, `conditional-visibility.js:53`/`:249`,
  `responsive-visibility.js:46`/`:91`, `parallax.js:59`/`:123`.
- *Consequence:* Block Link offers to wrap a whole navigation bar or a form in one `<a>`;
  Element parallax offers scroll-displacement on a sticky header row.

### V3 — Namespace prefix as a proxy for capability
`name.startsWith('sgs/')` stands in for "this block can do X".
- *Signature:* the gate is a string prefix test.
- *Scale:* 3 panels (Animation, Spacing, Save as Default).
- *Examples:* `animation.js:62`, `custom-spacing.js:27`/`:74`, `block-defaults.js:57`.
- *Note:* `animation.js` additionally carries a 4-entry hardcoded core-block allowlist
  (`:57-62`) — a surviving hardcoded dict of exactly the kind R-31-1 forbids.

### V4 — The attribute gate and the panel gate test different things
Attributes are registered under condition A, the panel under condition B, A ≠ B.
- *Signature:* the `blocks.registerBlockType` filter and the `editor.BlockEdit` HOC in the
  same file guard on different expressions.
- *Scale:* 1 (the worst-consequence variation in the set).
- *Example:* `custom-spacing.js:32` gates attributes on `settings.supports?.spacing`
  (a **block-type declaration**), while `custom-spacing.js:85` gates the panel on
  `props.attributes.style?.spacing` (a **per-instance authored value**, undefined until a
  client sets one). The two can never agree. `fx.js` is the counter-example: its docblock
  (`:707-717`) makes "attributes and panel must never diverge" an explicit hard constraint
  and uses the *same* function for both.

### V5 — A capability check that covers only part of the panel
One control in the fill is capability-checked; its siblings are not.
- *Signature:* a `getBlockSupport(…)` / capability test whose result guards some JSX in the
  return but not all of it.
- *Scale:* 1.
- *Example:* `parallax.js:104` correctly restricts *Background parallax* to
  background-colour-capable blocks (`:139-179`), while *Element parallax* immediately
  below (`:182-234`) is ungated.

### V6 — Opt-out declared but ineffective (silent-typo shape)
A block lists a slug in `hideExtensions` that matches no extension; the panel stays and
nobody is told.
- *Signature:* a declared slug not in the implemented set.
- *Scale:* **0 instances today** — all 7 declared slugs are implemented. The *mechanism*
  is unguarded: `hide-extensions.js:37-38` does a bare `Array.isArray(list) &&
  list.includes(slug)` with no validation, and the module's own docblock (`:20`) is
  already one slug out of date (omits `fx`). This is a latent variation, and it is exactly
  the class of failure the project has been bitten by before (`smoothTouch`,
  `sourceMode` on trust-bar — attributes and options that do not exist are discarded in
  silence).

### V7 — Opt-out granularity too coarse to express the real need
`hideExtensions` is all-or-nothing per panel; a block that wants *one* control from a
panel must take all of it or none.
- *Signature:* a block declaring an opt-out and then re-implementing part of that panel
  privately.
- *Scale:* structural. Visible in the shape of the data: 17 blocks hide `hover`,
  `blockLink`, `clickEffects` and `parallax` as a block of four, because there is no way to
  say "keep the focus ring, drop the tilt".

### V8 — Server-side attribute registration with no applicability check
Every extension attribute is added to every block server-side, unconditionally.
- *Signature:* `register_block_type_args` merging a flat attribute map.
- *Scale:* ~70 attributes × every block type with `className` support.
- *Example:* `includes/extension-attrs-rest-register.php:64-79`.
- *Assessment:* this is **deliberate and load-bearing**, not a bug —
  `WP_REST_Block_Renderer_Controller` validates `ServerSideRender` attributes with
  `additionalProperties => false`, so an attribute the JS registers and the PHP does not
  breaks the editor preview outright (the file's docblock `:5-19` says exactly this).
  It matters here because it means **any narrowing of the JS gates must not narrow this
  mirror**, or SSR preview breaks. Cost input for §5.

### V9 — A panel that renders but has no consumer
The control writes an attribute nothing reads.
- *Signature:* an attribute with a writer in an extension and no reader in any
  `render.php`, `includes/*.php`, CSS rule, or view script.
- *Scale:* 4 attributes (`sgsMarginTop/Bottom`, `sgsPaddingTop/Bottom`) on ~80 blocks —
  see §3 for the full proof.

### V10 — The detector itself is stale
`check-universal-fit.js` carries a **hardcoded 11-entry `EXTENSIONS` roster**
(`:253-380`) listing each extension's panel and attributes by hand.
- It **does not know `fx.js` exists** — the largest universal in the tree (81 KB, 25
  attributes, added after the tool) is entirely absent from its output.
- Its `imageControls` attribute list omits `sgsObjectFit` (`image-controls.js:93`).
- It hardcodes the verdict "legitimately universal; no opt-out needed" for
  conditionalVisibility / customCss / responsiveVisibility rather than deriving it.
- This is a direct R-31-1 breach (no hardcoded dicts) in the very tool meant to police
  applicability, and it is why the tool reports "INAPPROPRIATE-FIT FLAGS (0)" while the
  live editor shows Element parallax on `sgs/tab`.

---

## 5. The applicability contract — recommendation

### Option A — keep the opt-out model, extend it
Every extension gets an opt-out slug (Visibility Conditions, Device visibility, Custom CSS
and Image Controls currently have none) and every block declares its exclusions.

*Cost:* ~30 block.json edits, plus a slug validator.
*Why it loses:* it makes the default wrong and asks 84 blocks to say so, once per
extension, forever. Each new block inherits every panel until someone notices. Each new
extension silently lands on all 84 blocks. It is `O(blocks × extensions)` declarations to
maintain, all of them negative, none of them checkable — a block that *should* have opted
out looks identical to one that deliberately did not. The nav-menu incident (13 panels) is
this model working exactly as designed.

### Option B (recommended) — declarative capability requirement, DB-first, derived per block

Invert the default: **an extension declares what a block must provide; a block's
provisions are derived from facts it already owns; the intersection is precomputed at
`/sgs-update` time into a generated artefact the extension imports.** `hideExtensions`
survives as a *narrowing* override only (a block that qualifies but does not want the
panel), never as the primary mechanism.

**This is not a new design — it is `fx.js` generalised.** That mechanism is already
built, shipped and load-bearing:

- `fx_effects.requires` (DB) holds one of `none | text | track | section | surface |
  item-set | svg-subtree` per effect — the declarative requirement.
- `scripts/generate-fx-qualifying-blocks.py::_block_provisions()` (`:586-660`) derives the
  set of tokens each block satisfies from **facts the block already owns**:
  `supports.sgs.containerKind`, RichText presence in `edit.js`, a desktop-reachable
  `overflow-x` in its stylesheet, `bgSvgContent` in its attributes, and explicit
  `supports.sgs.fx.{draggable,pairedFilter,motionSurface,providesNatively}` escape hatches
  owned by the block, never a slug map in the script.
- The intersection is written to `generated-fx-qualifying-blocks.json` +
  `includes/generated-fx-qualifying-blocks.php` (one computation, two consumers, no
  timestamps), regenerated by `/sgs-update` Stage 12.
- `fx.js:720-722` reads it; `:732` and `:1092` use the **same** function for attributes and
  panel, with the divergence ban stated as a hard constraint in the docblock.

Requirement tokens the other extensions need — all derivable from existing artefacts, no
new hand-maintained dict:

| Extension | Requires | Derived from |
|---|---|---|
| Image Controls | `renders-image` | an `<img>`/`MediaUpload` in the block's own `edit.js`/`render.php`, or a media attribute (`imageId`, `mediaItems[]`, `bgSvgContent`) — the block.json `supports.sgs.imageControls` flag becomes the *override*, not the source |
| Block Link | `link-target` | block is not itself a link/nav/form-input: no `sgs/button`-style `<a>` root, `block_capabilities.capability NOT IN ('form-input','navigation','action-button')` |
| Click Effects | `link-target` | as above |
| Hover Effects | `hover-surface` | has a paintable background or border support (`supports.color.background`, `containerKind` set) |
| Element parallax | `motion-target` | reuse the fx `panel`/`surface` provisions verbatim — same question, already answered |
| Background parallax | `background` | `getBlockSupport(name,['color','background'])` — already correct, keep |
| Spacing | *(delete)* | fix §3 first; if kept, requires `!supports.spacing` computed **once** and used for both gates |
| Visibility Conditions | `none` | genuinely universal — but move to Advanced (§7) |
| Device visibility | `none` | genuinely universal, already in Advanced |
| Custom CSS | `none` | genuinely universal, already in Advanced |

**On DB-first (R-31-1).** `block_capabilities` exists but is a *semantic* taxonomy
(`form-input`, `social-proof`, `trust-indicators`, `icon-text` — 39 distinct values over
~110 rows), not a mechanical one. It answers "what is this block *for*", not "does it
render an image". It is usable for the exclusion half of the Block Link / Click Effects
rules (`form-input` is 17 rows and is exactly the set that should never be link-wrapped)
but it is **not** a drop-in oracle. Two changes are needed and both follow existing
precedent:

1. A new `extension_requirements` table (`extension_slug`, `requires`) mirroring
   `fx_effects.requires` — the effect-side declaration, DB-owned.
2. Block-side provisions derived from block.json/edit.js/style.css exactly as
   `_block_provisions()` already does, **not** stored in the DB. That script's own
   docblock (`:283-289`) records why: block.json ships and is readable at runtime, the
   SQLite DB is not (no PHP in this project opens it). Storing provisions in the DB would
   create a second source of truth that drifts.

**Migration cost.** Roughly a day, in five ordered steps, each independently verifiable:

1. Fix `image-controls.js:28` (one line) — unblocks 15 blocks immediately. ~5 min.
2. Decide Spacing: delete the panel, or build its missing server-side renderer + CSS.
   Deleting is the honest call — 50 of the blocks showing it already have WP's Dimensions
   panel. ~30 min either way.
3. Generalise `generate-fx-qualifying-blocks.py` into
   `generate-extension-applicability.py` emitting one
   `generated-extension-applicability.json` keyed `{extension: [block, …]}`. The
   provision-derivation code is reusable as-is. ~3 h.
4. Replace each extension's gate with a single `qualifies(extension, name)` read, used by
   **both** the attribute filter and the HOC. ~2 h across 10 files.
5. Wire the generator into `/sgs-update` Stage 12 alongside the fx artefacts, and add a
   `--check` drift mode (the pattern `scripts/generate-extension-attributes.js` already
   uses). ~1 h.

**What must NOT change:** `includes/extension-attrs-rest-register.php` keeps registering
every attribute on every block (V8). Narrowing the panel is a UI decision; narrowing the
REST schema breaks `ServerSideRender` previews on any block whose stored content still
carries a now-unregistered attribute. Keep the server mirror wide, gate the UI narrow.

---

## 6. Detector rules

Each is implementable by a static scanner; two need a live editor session and are marked.

| ID | Detects | Rule | False-positive risk |
|----|---------|------|---------------------|
| **D1** | **U2's whole class** — a named import that resolves to `undefined` | Parse every `import { … } from '@wordpress/*'` in `src/**/*.js`; map the package to its editor global (`@wordpress/block-editor`→`wp.blockEditor` etc.); assert each symbol is defined. **Requires a live editor page** (Playwright `evaluate`), because externals only exist at runtime. | **Low.** Real risk is the reverse — a page where the handle is not enqueued reports a false missing (this is why `wp.icons` came back absent here). Mitigate: assert the namespace object itself exists first and report `NAMESPACE_NOT_LOADED` separately from `SYMBOL_MISSING`. |
| **D1-static** | same class, cheaper | Check each imported symbol against the `.d.ts`/`index.js` export list of the package in `node_modules`. | **High here** — `node_modules/@wordpress` in this repo holds only ~20 build-time packages; `components` and `block-editor` are not installed. D1-static is unusable until they are, so D1 (live) is the load-bearing one. |
| **D2** | V4 — attribute gate ≠ panel gate | Per extension file, extract the guard expressions of the `blocks.registerBlockType` filter and of the `editor.BlockEdit` HOC; flag when they are not the same call/expression. | **Medium.** Legitimately different-but-equivalent phrasings exist. Reduce by flagging only when one side references `props.attributes.*` and the other references `settings.supports.*` — the exact shape at `custom-spacing.js:32` vs `:85`. |
| **D3** | V1/V2 — no real applicability check | Flag any `editor.BlockEdit` HOC in `extensions/` whose only guards are `supports.className === false`, a `startsWith('sgs/')` prefix, or nothing at all. | **Low**, but needs an allowlist for genuinely universal extensions (Custom CSS, Device visibility, Visibility Conditions). Store that allowlist in the DB alongside `requires='none'` — not in the scanner, or it becomes `check-universal-fit.js` again. |
| **D4** | V6 — opt-out slug matching no extension | Union of `supports.sgs.hideExtensions` across all block.json vs the union of string literals passed to `isExtensionHidden(`; flag any declared slug not implemented, **and** any implemented slug missing from `hide-extensions.js`'s docblock roster. | **Very low.** Both sides are literal. Currently 0 slug findings and 1 docblock finding (`fx`). |
| **D5** | V9 — a control with no consumer | For every attribute an extension registers, grep for a reader outside the extension itself: any `render.php`, any `includes/*.php`, any CSS selector containing the class it emits, any view script. Zero readers = inert control. | **Medium.** Server readers use varied idioms (`$attrs['x']`, `$block['attrs']['x']`, `data-sgs-*`). Reduce by also asserting that a class an extension emits has ≥1 matching CSS selector — that half is exact and is what catches `sgs-mt-*`. |
| **D6** | V5 — partial capability coverage | Within one HOC return, flag when some JSX is guarded by a capability variable and sibling JSX at the same level is not. | **Medium-high.** Deliberate mixed panels exist. Best as an advisory that names the unguarded sibling rather than a hard fail. |
| **D7** | V10 — detector staleness | Assert every file in `src/blocks/extensions/*.js` that calls `addFilter('editor.BlockEdit'…)` appears in the scanner's own roster, and that each roster entry's attribute list equals the attributes actually registered in that file. | **Very low.** Both derivable. Would have caught `fx.js`'s absence and the missing `sgsObjectFit` the day each landed. |
| **D8** | V8 drift | Compare `includes/extension-attributes.generated.php` against the `sgs*`/`fx*` attributes actually registered in `extensions/*.js`. | **None** — `scripts/generate-extension-attributes.js --check` already does exactly this. It is written but **not wired into any automated step** (its own docblock, `extension-attrs-rest-register.php:25-27`). Wiring it is free. |
| **D9** | **The gap all of the above share** — no gate executes the editor bundle | A live smoke sweep: insert every registered `sgs/*` block, select it, expand every collapsed inspector panel, assert zero `.block-editor-warning` in the canvas iframe and zero React-error console entries. Blocks with `parent`/`ancestor` restrictions must be inserted into their declared parent, not skipped. | **Low.** Slow (~4 min for 84 blocks) so it belongs in a pre-deploy gate, not a pre-commit hook. Must not silently skip parent-restricted blocks — that would have hidden 12 form-field blocks in this very sweep. This is the single highest-value detector in the table: it is the only one that would have caught U2 *and* both prior `site-header-row` crashes *and* the `sgs/media` `imageId` crash. |

---

## 7. Moving Visibility Conditions to Advanced

### Current state (measured, and it corrects the brief)

- The panel is a `PanelBody title="Visibility Conditions"` inside a **plain
  `<InspectorControls>`** — `conditional-visibility.js:259-261`, closing `:461-462`. Plain
  `InspectorControls` = the `default` group = the **Settings tab, top level**. The
  docblock states the choice explicitly (`:238-240`: *"Uses InspectorControls (the standard
  panel, not Advanced) so the controls are discoverable"*), so this is a decision being
  reversed, not an oversight.
- **Live confirmation** on `sgs/text`: top-level panels are
  `Colour, Typography, Layout, Spacing, Border, Drop cap, Animation, Visibility Conditions,
  Hover Effects, Block Link, Click Effects, Spacing, Element parallax, Advanced` —
  Visibility Conditions sits 8th at top level; the Advanced panel's contents are
  `HTML anchor · Additional CSS class(es) · Additional CSS · Styles/Apply globally ·
  Device visibility · Save as Default`.

**Two corrections to the brief's premises:**

1. *"only 4 of 81 blocks emit any `group=` at all"* — the true count is **7 files**: five
   blocks (`before-after/edit.js:339,607`; `brand-strip/edit.js:442`;
   `nav-drawer/edit.js:280`; `nav-menu/edit.js:843`; `site-header/edit.js:450,599`) plus
   two extensions (`fx.js:1230` `group="styles"`, `parallax.js:144` `group="color"`).
2. *"`group="advanced"` appears nowhere"* — literally true, but misleading. The Advanced
   route is already in use through its canonical alias **`InspectorAdvancedControls`**, in
   `custom-css.js:11,45`, `responsive-visibility.js:20,115`, `block-defaults.js:44,88` and
   `src/components/universal-extensions/CustomCssPanel.js`. There is no missing capability
   to build — three extensions already land in Advanced today, proven live.

### What the move requires

**The edit is small and low-risk.** In `conditional-visibility.js`:

1. Swap the import at `:23` from `InspectorControls` to `InspectorAdvancedControls`
   (`FocalPointPicker` aside, both are real `@wordpress/block-editor` exports — verified
   live).
2. Replace `<InspectorControls>` (`:259`) / `</InspectorControls>` (`:462`) with the
   Advanced equivalents.
3. **Drop the `PanelBody` wrapper** (`:260-261` / `:461`). Advanced is itself a
   `PanelBody`; nesting one inside it produces a collapsed panel inside a collapsed panel.
   The precedent to copy is `responsive-visibility.js:115-194`, which renders its controls
   bare inside `InspectorAdvancedControls`. The section headings the panel already uses
   (`:384-395`, the uppercase `<p>` labels) carry the visual grouping without a PanelBody.
4. Keep the active-condition `Notice` (`:253`, `hasActiveCondition`) — with the panel
   collapsed inside Advanced, that Notice is the only signal a client has that a rule is
   set, and it should stay at the top of the fill. The `editor.BlockListBlock` indicator
   (`:482-514`, dashed orange border) is unaffected and remains the primary at-a-glance cue.
5. Update the file docblock (`:13`) and the design note at `:238-240`, both of which
   currently assert the opposite. Leaving them is the "comment that justifies a breach"
   shape.

**Nothing else changes.** Attributes (`:66-105`), the server-side evaluator
(`includes/conditional-visibility.php`, priority 9), the `BlockListBlock` indicator and
the REST mirror are all independent of where the fill renders.

**One trade-off to put to Bean.** Advanced is collapsed by default and sits at the very
bottom of the Settings tab. That is the right home for a developer-ish control, and it
matches Device visibility — but a condition set by mistake becomes *much* harder for a
tech-illiterate client to find and clear. The `hasActiveCondition` Notice and the orange
canvas border become load-bearing rather than nice-to-have; if either is ever dropped, a
block will silently vanish on the front end with nothing visible in the editor to explain
it. Recommend keeping both, and verifying the Notice is legible inside Advanced before
signing the move off.

---

## 8. Evidence appendix

| Claim | Source 1 | Source 2 |
|---|---|---|
| Deployed code == this source tree | `md5 plugins/sgs-blocks/build/extensions/index.js` = `d4d330a8bd95c315cbc5d204641bad7c` | same md5 for the file fetched over HTTP from the canary |
| `FocalPointPicker` is not a block-editor export | `typeof wp.blockEditor.FocalPointPicker === "undefined"` (live) | `Object.keys(wp.blockEditor).filter(/focal/i) === []` (live); `typeof wp.components.FocalPointPicker === "function"` |
| The crash is the panel expanding | React error #130 appears only after clicking the panel header | `PanelBody` renders children only when open; `initialOpen={false}` at `image-controls.js:159` |
| Crash set == imageControls set | 84-block live sweep: 15 crashes, named | live registry filter on `supports.sgs.imageControls === true`: the same 15 |
| Empty `url` is not the cause | `components.js:41720-41726` returns a placeholder when `!src` | `:41807`, `:41823`, `:41838` — every ref read null-guarded |
| Spacing panel is inert | serialised markup carries `sgsMarginTop` but no `sgs-mt-40` class (live) | no `sgs-mt-*` CSS anywhere in `plugins/` or `theme/`; the only writer is a static-save-only filter (`custom-spacing.js:192-196`) |
| One bad import in the whole tree | 117 symbols over 13 packages extracted statically from `src/**/*.js` | each checked against live editor globals: exactly one missing |
| Advanced routing already works | `custom-css.js:45`, `responsive-visibility.js:115`, `block-defaults.js:88` | live: Advanced panel contains Additional CSS, Device visibility, Save as Default |
