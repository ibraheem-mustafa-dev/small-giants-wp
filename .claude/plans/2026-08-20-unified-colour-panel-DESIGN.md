# The unified Colour panel — design

```
doc_type: design
created:  2026-08-20
project:  small-giants-wp
status:   FOR BEAN'S APPROVAL (project rule 7 — shared-mechanism design gate)
supersedes_questions_in: .claude/plans/2026-08-20-colour-background-panel-unification-BRIEF.md
council:  6 personas, 2026-08-20 — findings folded in below
decision: Bean, 2026-08-20 — "merge the background into the colour panel and redesign it to
          introduce any of the valuable/useful settings we were missing compared to our
          competitors and make sure it all works together"
```

## The problem in one paragraph

A client wanting to change a colour has to know which of two panels it lives in, and the two
panels disagree with each other. The Background panel's help text says *"there is no separate
overlay to set up"* while the control immediately beneath it is labelled **"Overlay colour"**.
Worse, that help text tells clients to lower the colour's **alpha** to blend with media — and
doing so silently converts their brand token into a raw hex, so a later rebrand leaves the
colour behind. Meanwhile `sgs/container` carries **17 attributes for background media and 2 for
the colour painted over it**, with no hover state and no responsive tier on either.

## The measured gap against competitors

| | Kadence | Elementor | Spectra | GenerateBlocks | **SGS today** |
|---|---|---|---|---|---|
| Background **type** selector | ✅ | ✅ | ✅ | ✗ (dev-facing) | **✗** |
| Overlay **opacity** slider | ✅ | ✅ | ✅ | — | **✗ (alpha only)** |
| **Hover** background | ✅ | ✅ | ✅ | ✅ | **✗** |
| **Responsive** background colour | ✅ | ✅ | ✅ | ✅ | **✗** |
| Blend mode | ✅ | ✅ | partial | via CSS | **✗** |
| Gradient stops bound to **theme tokens** | ✗ | ✗ | ✗ | ✗ | **✅ (ours alone)** |
| Slug-not-hex storage | ✗ | ✗ | partial | ✗ | **✅** |

Three of four competitors converge on a single background-**type** selector. The outlier is the
deliberately developer-facing product, and our user is explicitly non-technical.

⭐ **The two rows we win are the two the brief never listed as assets** — and both are destroyed
by the current alpha instruction. Protecting them is the highest-value part of this design.

---

## The design

**One panel, titled "Colour".** The Background panel is absorbed. The panel has two clearly
separated regions, in this order.

```
▼ COLOUR
  ┌─ BACKGROUND ─────────────────────────────────────────┐
  │  Type   [ None │ Colour │ Gradient │ Image │ Video │ SVG ]
  │                                                       │
  │  ── when Colour or Gradient ──                        │
  │  Background colour      [swatch]   Normal │ Hover     │
  │                                                       │
  │  ── when Image / Video / SVG ──                       │
  │  [ media picker + art-direction tiers ]               │
  │  Background colour      [swatch]   Normal │ Hover     │
  │      ⓘ Sits over the media. Use Opacity below to blend.│
  │  Opacity                [────●───]  60 %              │
  │  Blend mode             [ Normal ▾ ]                  │
  │  Motion                 ○ None ○ Parallax ○ Ken-burns │
  └───────────────────────────────────────────────────────┘
  ┌─ ELEMENT COLOURS ────────────────────────────────────┐
  │  Text colour            [swatch]   Normal │ Hover     │
  │  Border colour          [swatch]   Normal │ Hover     │
  │  Shadow colour          [swatch]   Normal │ Hover     │
  │  Divider colours        [swatch]  (when a divider is on)
  └───────────────────────────────────────────────────────┘
```

### D1 — The type selector is the spine

The mental model is currently **implicit**: a colour control floats above an Image/Video/SVG
tab strip, and whether it acts as "the background" or "a tint over media" depends on invisible
state. The type selector makes it explicit and is the single change that most improves a
head-to-head demo.

It is a **derived-and-committed** control, not a new source of truth: opening a block that
already has `bgVideo` set shows `Video` selected. Choosing a type reveals that type's controls
and hides the others; it does **not** delete the others' stored values, so switching Image →
Colour → Image does not lose the image.

### D2 — TWO layers, not one renamed control ⭐ REVISED (Bean, 2026-08-20)

> *"We could have bg colour and overlay colour exist as separate settings if that would be
> helpful."*

**Bean is right, this matches the industry, and it is better than the single-control design
below.** Kadence and Elementor both ship a background colour **and** a separate overlay:

| | Background colour | Separate overlay |
|---|---|---|
| Kadence | Classic / Gradient | ✅ Overlay Type + Opacity + Blend Mode |
| Elementor | Classic / Gradient | ✅ dedicated "Background Overlay" tab |
| SGS today | — | one control doing **both** jobs |

Today a single control silently changes meaning depending on whether media is set. Two named
settings each do one job:

- **Background colour** — the block's own surface. What shows when there is no media, and what
  shows through transparent parts of a PNG or an SVG.
- **Overlay** — a scrim painted **over** the media, with its own opacity and blend mode.

⭐ **This makes the existing attribute names CORRECT rather than requiring a rename.**
`backgroundOverlayColour` / `overlayGradient` genuinely *are* the overlay under this model. We
are not renaming a mis-named thing; we are **adding the layer that was missing**. That is a
strictly smaller change than the rename-and-relabel plan below.

⚠ **The one genuinely open problem: what to call the new base layer.** `backgroundColour`
(British) collides visually with the live American `backgroundColor` ghost — 42 theme
authorings that PHP keeps and paints today but the editor cannot show or edit. Three ways out,
and this needs a ruling before build:
1. **`surfaceColour`** — sidesteps the collision entirely, costs nothing, but is a new word for
   clients to learn.
2. **Kill the ghost first** — remove `render.php:89-99`, migrate the 42 authorings, then take
   the `backgroundColour` name cleanly. Correct, but it is a visual change across 17 pattern
   files and must be done with a before/after.
3. **Adopt the ghost** — re-enable `supports.color.background` and let WP's own
   `backgroundColor` be the base layer. The 42 authorings already work; preset output is a
   CLASS (`has-{slug}-background-color`), not an inline style, so Spec 32 is satisfied. But
   the editor currently cannot edit it, which is the whole reason it is a ghost.

⛔ **Verify before building:** the rendering council established media sits on `.{uid}::before`
at `z-index:-1`. A base colour must paint *below* that, and a `z-index:-1` pseudo-element
interacts with the parent's own background depending on stacking context. Check it in a
browser; do not reason about it.

### D2b — (superseded) "Overlay colour" renamed to "Background colour", ONE control

This is the answer to *"editable in both places"*. Bean's underlying goal is that a client never
hunts for the background colour. A **duplicated** control achieves that at the cost of two
copies of one truth that can visibly disagree — and the council proved they would, because
`GradientOverlayControl.js:93` holds Solid/Gradient mode in per-instance React state and its
Solid branch **clears the gradient on change**. Two mounts, and touching one silently wipes the
other's gradient.

Merging the panels achieves the same goal with **one** control: there is now only one place to
look, so duplication has nothing left to solve. The label changes; the attribute does not.

⛔ **The attribute stays `backgroundOverlayColour`. Do NOT rename it to `backgroundColour`.**
There is already a live American-spelled `backgroundColor` ghost on this block — 42 authorings
across the theme, read by `container/render.php:89` and painting on the frontend today (see D7).
A British `backgroundColour` alongside it would be indistinguishable at a glance and is exactly
the class of bug this repo has recorded before. Labels are client-facing; attribute names are
internal. Change the label only.

### D3 — Opacity becomes a real attribute. Alpha is never the blend control. ⭐

**This is the highest-severity fix in the design.**

`DesignTokenPicker.js:139-140` stores a palette **slug** only when the picked colour is exactly
string-equal to a palette entry:

```js
const match = ( colours || [] ).find( ( c ) => c.color === picked );
onChange( match ? match.slug : picked );
```

Lower the alpha and the value changes, the match fails, and a **raw hex is stored instead of the
token**. The shipped help text instructs clients to do precisely this. Every dimmed brand overlay
on every client site has quietly unlinked itself from the palette.

**Fix:** a new `backgroundOverlayOpacity` attribute (integer 0–100, default 100) rendered as a
`RangeControl`, applied in CSS — never folded into the colour value. The token survives. This is
also what Kadence, Elementor and Spectra all do, so it closes a competitive gap and fixes a
correctness bug with one control.

The alpha slider inside the picker **stays** — a client who genuinely wants a semi-transparent
custom colour may still have one. It simply stops being the documented mechanism for blending
over media.

### D4 — Three gradient mechanisms collapse to two

`GradientOverlayControl` (mechanism C) is not a distinct capability — it is mechanism A with a
different prop register (`attributes`/`setAttributes`/`attrNames` instead of `states[]`). It is
**single-state by construction**, which is the sole reason background colour can never have a
hover.

**Fix:** rewrite it as a thin adapter over `DesignTokenPicker` — read `attrNames`, hand down a
`states` array. Every call site keeps its exact props, so this is one file, not a migration
across blocks. Hover then arrives the moment a block declares the sibling attribute.

Two consequences worth stating plainly:
- **The brief's claim that "one block with all three mechanisms is architecturally unreachable"
  dissolves.** With C retired there are two mechanisms, and one block can carry both.
- ⚠ **A semantic divergence must be resolved in the same commit.**
  `GradientOverlayControl` clears the gradient on *every solid colour pick*; `DesignTokenPicker`
  clears it only when the operator *toggles to Solid*. Migrate naively and a client who had a
  gradient, then picks a solid, keeps the invisible gradient and sees no change.
  **Ruling: `GradientOverlayControl`'s semantic wins (clear on pick)** — it is the one that
  cannot leave a stale invisible value.

### D5 — `onGradientChange` / `gradientOnChange` unify

The same concept has two prop names across mechanisms A and B (`DesignTokenPicker.js:228` vs
`GradientCapableColourControl.js:101`). It leaks onto every future detector and every
maintainer. **Standardise on `onGradientChange`** (the majority spelling and the React
convention) in the same commit as D4.

### D6 — Hover and responsive tiers

New sibling attributes on each block that declares a background paint attr:
`backgroundOverlayColourHover`, `overlayGradientHover`, and the tier siblings
`…Tablet` / `…Mobile`.

⛔ **WordPress silently discards an attribute the block.json does not declare** — in the editor.
So each sibling must be declared in **every** block that mounts the panel, or the client's
setting vanishes on reload with no error. Measured mount counts (JSX mounts, **not** barrel
imports — the earlier "~30" was that mistake): `BackgroundPanel` **8**,
`ShapeDividersPanel` **4**, `GridItemDefaultsPanel` **3**.

This fan-out is **scriptable** — 8 files, a fixed key list, one deterministic Python pass.

### D6b — Grid items are shared, with one named exception (Bean, 2026-08-20)

> *"All of the blocks that have a grid should have the shared grid items unless they are like
> the hero and the split variant which is the only grid mode on it is in an L4 shape with the
> columns being named and completely unique in their styling."*

**Rule:** every block offering a grid layout mounts the shared `GridItemDefaultsPanel`, so grid
items are styled identically everywhere and a capability added to the panel propagates to all of
them. This is the composite-mirror rule applied to grid items.

**The exception is principled, not a carve-out.** `sgs/hero`'s `split` variant is not a grid of
interchangeable items — it is a **named two-column layout** whose columns are individually
styled and individually meaningful (media column / content column). A shared "grid item
defaults" panel is meaningless there because there is no repeating item to default. Any future
exception must meet the same bar: *named, non-repeating columns with per-column styling* — not
"this block is different".

⚠ **Measured, not assumed:** `GridItemDefaultsPanel` is currently mounted by **3** blocks. The
rule as stated means auditing every block that offers a grid layout and mounting it where
missing. That audit has not been run — it is the first deliverable of this decision, not a
consequence of it, and it must be an enumeration rather than an estimate.

### D7 — What we are NOT doing, and why

- **Not migrating the 42 `backgroundColor` authorings.** They are live (PHP keeps undeclared
  attributes; only the editor drops them), so removing them is a *visual* change needing a
  before/after, not a cleanup. Out of scope here; tracked separately.
- **Not building gradient shadows.** `box-shadow` takes a `<color>`, not an `<image>`. The
  glow effect is a separate blurred-pseudo-element feature, not a colour row. Declared
  exemption with the CSS-grammar reason.
- **Not moving motion into an unrelated panel.** Parallax and Ken-burns modify the media layer
  and are gated on media existing. They stay with the media, inside the Background region.
- **Not adopting WP-native `supports.color`.** Spec 32 forbids the inline styles it emits.

### D8 — Align the state vocabulary with WordPress 7.1

Core is shipping pseudo/custom style states (`:hover`, `:focus`, `:focus-visible`, `:active`)
declared via `block.json` `selectors.states`, with a state dropdown in the block card. Our
state keys should match those names now, so a later adoption is a rewire rather than a rename.
`site-header`'s `scrolled` remains a legitimate custom state.

---

## Dead code to resolve in the same pass

`WrapperColourPanel.js` is **mounted by nothing** — zero JSX call sites; its own docblock at
`BackgroundPanel.js:499` says so. Its four rows (`shapeDividerTopColour`,
`shapeDividerBottomColour`, `gridItemBackground`, `gridItemTextColour`) render for no client.

Two of those rows also **duplicate** live controls with *different* gradient semantics:
`ShapeDividersPanel.js:56,105` already writes `shapeDividerTopColour` **with** a
`…ColourGradient` sibling; `WrapperColourPanel.js:43` writes the same attribute with **no
gradient awareness at all**. Mount both and picking a solid leaves a stale gradient rendering.

**Ruling: delete `WrapperColourPanel.js`.** Its rows are absorbed into the unified panel's
Element-colours region, correctly wired, once. Do not mount it.

---

## ▶ BUILD PROGRESS — updated 2026-08-21

| # | Step | Status |
|---|---|---|
| 1 | Shadow-colour crash | ✅ `70c88348` — 5 mounts wired + wrapper consumption (or it was 4 dead controls) |
| 2 | Correct the false gate diagnostic | ✅ `e81ea92a` — D704, PHP keeps / JS drops |
| 3 | ~~Rename~~ + help text | ⚠ **SPLIT 2026-08-21 — half of this step was STALE.** The RENAME is CANCELLED: it came from D2b, which this doc marks *(superseded)*. Under D2 revised the overlay names are correct, and `sgs/container` now has a real separate `backgroundColour` base layer (`1905257e`) — so renaming would leave TWO controls both labelled "Background colour", which is the actual duplicate. ✅ The HELP TEXT is DONE: the shipped wording claimed this colour "is the background", said "there is no separate overlay to set up", and told clients to LOWER ITS ALPHA — the instruction that silently converts a brand token into a raw hex. All three were false or harmful; rewritten. |
| 4 | `backgroundOverlayOpacity` attr + slider | 🔵 **APPROVED BY BEAN 2026-08-21, NEXT SESSION'S FIRST TASK.** ⚠ It is a DECISION REVERSAL, not a gap-fill — see the block below. Scope is NOT the 40 min this doc estimates. |
| 5 | Mechanism-C adapter + prop-name unification | ❌ not done |
| 6 | Hover + tier siblings | ❌ **not started for the OVERLAY layer** — verified 2026-08-21: 0 of 10 `BackgroundPanel` blocks declare `backgroundOverlayColourHover`/`overlayGradientHover`. `52b96e68` added the BASE layer's `backgroundColourHover` to the container, which is a different attribute |
| 7 | Merge the panels + type selector; delete `WrapperColourPanel.js` | ❌ not done — re-verified 2026-08-21 that `WrapperColourPanel.js` still has ZERO JSX mounts (the only hit is a comment at `BackgroundPanel.js:499` saying so), so deleting it remains safe |
| 8 | Blend mode | ❌ not done |
| 9 | `sgs/button` as reference block | ❌ not done |

**Landed outside this doc's build order** (the session went where the live defects were):
container background made editable + 38 theme authorings migrated (`1905257e`, D704 mechanism);
`contentWidth` regression root-caused and fixed (`2d291992`, **D706**); padding/margin migrated
to block-owned box objects (`f9f4368b`, **D707**); dead hover-extension colours deleted
(`ebad91df`, **D708**); rule 31 widened (`20332725`, **D705**); resting border gradients ×2
(`6bbd0c7c`).

⭐ **D2's two-layer model is now VINDICATED and partly built.** Bean ruled background colour and
overlay should be separate settings — matching Kadence/Elementor. `backgroundOverlayColour` is
therefore CORRECTLY named as the overlay, and `sgs/container` gained a real `backgroundColour`
base layer beneath the media. **Live-verified**: paints through the `sgs-cst-` uid, zero ghost
classes.

✅ **THE "ONE OPEN DEFECT" IS CLOSED — and the fix named here was REFUTED before building.**
This block previously said D707's gutter default should move from the OUTER layer to the
CONTENT-BAND layer. That was disproved: each container renders exactly ONE band, so
band-padding stacks identically — three nested containers would still give 72px. It would
also have forced an extra `<div>` into every container site-wide.

The real cause was found by git archaeology + live DOM: `163f9fa7` migrated 96 `core/group`
blocks to `sgs/container`, carrying the max-width CAP across but not WordPress's gutter, and
`f9f4368b` then re-created that gutter by hand as a per-instance default — which has no
nesting reset, so it compounded. Fixed by re-adopting core's own `.has-global-padding`
(`865e6d8e`), which ships the nesting reset. A second, deeper bug was then found and fixed:
band CSS was being painted on the container's OUTER box (`669bc1e5`), which is what capped
backgrounds (**P2-1, now closed**), collapsed a grid item to 48px, and split the shop grid.
Full record: `.claude/reports/2026-08-21-HANDOVER-container-and-shop-completion.md`.

✅ **GATE 2 IS 3-of-3, CLOSED 2026-08-21.** `sgs/hero` and `sgs/trust-bar` verified with a
real editor login: colour panel present, swatch picked, value stored as a SLUG (token
survives), resting colour paints, and a REAL POINTER HOVER repaints — hero primary→accent,
trust-bar success→cookie-brown. Zero console errors, `isValid: true`, hover rules correctly
paired `:hover, :focus-visible`. `sgs/brand-strip` passed earlier.

⚠ **Step 6 needs restating — the two layers were being conflated.** `sgs/container` has
`backgroundColour` + `backgroundColourHover` (the BASE layer, which is what Gate 2
exercised). It does NOT have `backgroundOverlayColourHover` or `overlayGradientHover`.
Verified 2026-08-21: **0 of the 10 blocks mounting `BackgroundPanel` declare either overlay
hover sibling.** Step 6 is therefore NOT started for the overlay layer, not "partial".

### ▶ REFERENCE-BLOCK WORK — started 2026-08-21

**Decision (Bean):** build one block to a perfect colour surface, then propagate — rather
than the doc's original ordering, which had the reference block as step 9, LAST. The reason
is a lesson already recorded here: *gates compare a file to a contract, never to its
sibling*. A finished reference block IS that missing contract; without one, fanning out
across 10 blocks is 10 chances to diverge with nothing detecting it.

⚠ **The reference block is `sgs/hero`, not `sgs/button` and not `sgs/container`.** Measured
2026-08-21 — three blocks already carry the complete 8/8 surface (panel + textColour +
textColourGradient + bg + bgHover + bgGradient + overlay + overlayGradient): `sgs/hero`,
`sgs/site-footer`, `sgs/trust-bar`. `sgs/button` is a leaf and never exercises
overlay-over-media, which is exactly where step 4's token-corruption bug lives. Hero is also
the block QC Gate 2 proved end-to-end, so it has a verified baseline.

**⛔ Sequencing correction:** the reference block cannot be finished before steps 4, 5 and 6,
because each of those CHANGES the mechanism (a new opacity attribute; the mechanism-C
adapter; the hover/tier siblings). Build the reference first and you canonise a shape those
steps then move. So: settle 4/5/6 ON the reference, prove it, then propagate.

**Landed 2026-08-21 — `sgs/container` root text colour (`0f2c167f`).** Not cosmetic: the
container had NO reachable text-colour control at all. Its wrapper manifest mapped
`css:color` to `native:color.text` while `supports.color` is FALSE on the block, so the
binding pointed at a mechanism that does not exist — and
`check-element-manifest-conformance` was already reporting `text/css:color` and
`text/css:color-gradient` as GAPs. Now four owned attrs rendered through the same shared
emitters hero uses, plus a second row in its existing `SgsColourPanel`.
⚠ Committed but **NOT yet deployed or live-verified** — the deploy aborted on a dirty tree
(another session mid-work). The visual-diff report says so explicitly rather than implying a
capture that was not taken.

✅ **Open item "textColour parent/child ruling" is now SETTLED — see D713.** A section-class
block can parent any non-section block that has no forced parent, so a parent-level
`textColour` is the root-scoped INHERITABLE cascade default, and the child's control
overrides it for one instance. Two jobs, two controls, keep both. Applied as the acceptance
reason to all eight `parent-child-duplicate` textColour entries, replacing the gate's
generic placeholder. This is what HANDOVER-3 asked for: the pattern ruled ONCE across every
parent, not per block.

**Still missing on the section-kind roster** (enumerated from `block_composition`, not
estimated): `sgs/modal` has no `textColour` at all; `sgs/cta-section` and `sgs/site-header`
have no `textColourGradient`.

### 🔵 STEP 4 — APPROVED, AND IT IS A DECISION REVERSAL

**Bean approved it 2026-08-21 as next session's first task.** Before building, read this — the
doc's own framing of step 4 as a 40-minute gap-fill is wrong in a way that matters.

**The bug is REAL and REACHABLE, verified in code (not inferred):**
```js
const match = ( colours || [] ).find( ( c ) => c.color === picked );
onChange( match ? match.slug : picked );          // DesignTokenPicker.js:139-140
```
Exact string equality, and `enableAlpha` defaults to **`true`** (`DesignTokenPicker.js:468`).
So a client CAN lower alpha, the value stops matching the palette entry, and a **raw hex** is
stored instead of the slug. Their brand token silently unlinks; a later rebrand leaves that
colour behind.

⛔ **BUT THE FIX WAS DELIBERATELY RETIRED, AND THE CODE SAYS SO.**
`class-sgs-container-wrapper.php`, in the overlay branch:

> *"D5 (Background panel redesign, 2026-08-11): the separate opacity-percentage control is
> REMOVED — the colour/gradient picker's own alpha channel is the one place transparency is
> set now. `backgroundOverlayOpacity` no longer exists as an attribute (see block.json);
> **do not reintroduce it here.**"*

That is `D581` (2026-08-11), and `spec-39-seed-requirements.md` records the attribute as
RETIRED with the converter's write removed. **Verified 2026-08-21: no block declares it (0 of
83), and `_OVERLAY_SOLID_OPACITY` in `converter/services/pseudo_overlay.py:72` is a FOSSIL —
defined, never used.** (I first read that constant as proof the converter still wrote it. It
does not. A constant's existence is not a call site.)

**So the two decisions are in direct conflict, and nobody reconciled them:**

| | Position |
|---|---|
| D581 / redesign-D5 (11 Aug) | Alpha IS the transparency mechanism. Opacity control removed. |
| This doc's D3 (20 Aug) | Alpha DESTROYS the palette token. Add a real opacity attribute. |

⭐ **Frame the supersede carefully.** D581 was not wrong about SIMPLICITY — one transparency
mechanism genuinely beats two. It was wrong about WHICH mechanism, because alpha's
token-destroying side effect was not known when the call was made. Write it up that way, or
the next reader dismisses D581 wholesale and loses its real point.

**REAL SCOPE (not 40 min):** 8 `block.json` · the shared wrapper (Rule 7 design gate) ·
REMOVING an explicit in-code prohibition · superseding D581's D5 with a new D-number · and a
decision on whether `enableAlpha` should stay `true` once a real opacity control exists —
leaving both reopens the same trap.

## Build order

Each step is independently shippable and verifiable. Steps 1–2 are already dispatched.

| # | Step | Files | Est. |
|---|---|---|---|
| 1 | **Shadow-colour crash** — guard `ShadowControl`, wire 5 unwired mounts + declare attrs | `ShadowControl.js` + 5 blocks | 20 min |
| 2 | **Correct the false gate diagnostic** — PHP keeps / JS drops | `check-dead-pattern-attrs.py` | 15 min |
| 3 | **Rename + help text** — "Overlay colour" → "Background colour"; rewrite the contradictory help text | `GradientOverlayControl.js:76`, `BackgroundPanel.js:96-101` | 10 min |
| 4 | **`backgroundOverlayOpacity`** attr + `RangeControl` + CSS, applied without touching the colour value | 8 `block.json` + wrapper CSS | 40 min |
| 5 | **Mechanism-C adapter** (D4) + prop-name unification (D5) | `GradientOverlayControl.js`, `SgsColourPanel.js` | 45 min |
| 6 | **Hover + tier siblings** (D6), scripted fan-out | 8 `block.json` + wrapper | 40 min |
| 7 | **Merge the panels** — type selector, two regions; delete `WrapperColourPanel.js` | the 4 panel files | 90 min |
| 8 | **Blend mode** | 8 `block.json` + wrapper | 20 min |
| 9 | **`sgs/button` becomes the reference block** — add `gradientCapable` to its text row | `button/edit.js` | 20 min |

**~5 hours of focused work**, delivered in nine independently-verifiable pieces.

## Verification — the part that actually matters

⛔ **Every defect this council found is invisible to the frontend, to `audit-inline-styling.js`,
to computed-parity, and to a green build. They are only visible to a person clicking the
control.** A green build never opens the editor — which is exactly how the `sgs/heading`
inspector crash and this shadow-colour crash both shipped.

So the gate for every step is an **editor** check, not a build:

1. `npm run build` clean (necessary, nowhere near sufficient).
2. **Playwright editor login on the sandybrown canary** (credentials: `.claude/secrets/sandybrown.env`)
   — insert the block, open the Colour panel, click each control, confirm no console error and
   the canvas updates.
3. **Token survival test for D3:** set a background colour to a palette token, set opacity to
   50%, save, reload, and assert the stored attribute is still the **slug** — not a hex. This is
   the regression control for the highest-severity bug in this design, and it must genuinely
   fail against the pre-fix code before it is trusted.
4. **Reload persistence test for D6:** set a hover background, save, reload, confirm it survived
   (this is what catches an undeclared attribute being silently discarded).
5. Bean's eye on the panel (R-31-13) — measurement alone does not close.
