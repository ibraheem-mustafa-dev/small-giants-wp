---
doc_type: strategic-plan
title: "Element-driven inspector — one model for panels, colour, background and hover"
spec_ref: .claude/specs/35 (control-type contract) — CO-2, CO-28, COLOUR, STATE, BORDER
date: 2026-08-08
status: ADOPTED — became THE PLACEMENT RULE, Spec 35 Part O (D537, 2026-08-09). 9 blocks
                built against it directly on 2026-09-03 (D933): card-grid, gallery,
                google-reviews, multi-button, process-steps, site-footer-row, site-header-row,
                text, timeline — each restructured into TIER-1 per-element panels + TIER-2
                property-family panels. This status line is a correction, not new build work —
                it was stale for weeks while the design was already live and enforced.
supersedes: "the 2026-08-08 hand-sorted Settings/Styles split (commit dfba396b) — see §8"
---

# Element-driven inspector

## FOR BEAN — plain English first

**The problem.** Every block's inspector is hand-built. Someone decides, block by block, which
panels exist, what they are called, what order they sit in, and which tab they land in. Nothing
checks those decisions, so they drift apart — and that is why you are seeing two "Colour" panels,
two "Border" panels, hover in the wrong place, and a Styles tab I crammed by hand.

**The thing that makes this fixable.** Your blocks *already* describe themselves properly. All 83 of
them carry a machine-readable map in `block.json` — for each part of the block (headline, media,
CTA…) it records the part's name, its order, which CSS properties it owns, which of those WordPress
handles natively, and what changes on hover. **283 parts described across the library.** The
inspector ignores every word of it and gets hand-written instead.

**The fix.** Build the inspector *from* that map. A part of the block gets one panel, named and
ordered by what the map says, holding that part's content, its styling and its hover state together.
Anything that belongs to no single part — the section's own background, width, padding — goes in the
Styles tab. That is your model, made structural instead of a convention people re-argue every time.

**What that buys you beyond tidiness:** the same map tells us, automatically, when a block has two
controls for one thing. That becomes a build check, so this class of mess cannot come back.

---

## 1. Evidence this rests on (all measured 2026-08-08, not estimated)

| Fact | Figure | How |
|---|---|---|
| Blocks declaring `supports.sgs.elements` | **83 of 83** | parsed every `block.json` |
| Elements described | **283** | same |
| `attrMap` entries already tagged `native:` | **403** | same |
| Elements declaring a hover state | **18 of 283** | same |
| Blocks with native colour support AND a CUSTOM colour attr for the same property | **27** | see derivation below |
| Blocks declaring `__experimentalBorder` | **48** | supports scan |
| Blocks running TWO hover systems (own `*Hover` + universal `sgsHover*`) | **16** | attrs vs extension reach |
| Blocks relying SOLELY on the universal hover extension | **48** | same |
| Blocks already opted out of it | **17** | `supports.sgs.hideExtensions` |

⛔ **The colour-duplication figure was WRONG in the first draft (38) and is corrected to 27.**
Caught by the handoff QC subagent, which could not reproduce 38 by any derivation. 38 came from a
loose regex (`/DesignTokenPicker|Colour\b/` against `edit.js`) that matched almost any mention of
colour, not actual duplication. **The reproducible derivation, and the one that governs:**

> a block declares `supports.color.background` or `.text`, AND at least one of its
> `sgs.elements[].attrMap` entries maps `css:color` or `css:background-color` to an attribute NOT
> prefixed `native:`.

That is genuine duplication — WordPress renders a panel for the property while the block also owns a
custom attribute for it. **27 of 83.** Anyone re-deriving this must state their predicate; three
different plausible predicates gave 55, 30 and 2.

⚠ **Two claims were checked and did NOT hold** — recorded so nobody designs around them:
- *"Border colour control is missing completely."* `sgs/button` has `colourBorder` and
  `colourBorderHover` controls, and renders both. The failure is that they cannot be FOUND, which is
  a placement problem, not a missing feature. Other blocks still need auditing individually.
- *"The universal background panel only allows media."* Overstated — it already offers overlay
  opacity, gradient overlay with from/to colour pickers, parallax scroll, Ken Burns, position,
  repeat, size, attachment and SVG.

  ⛔ **BUT MY OWN CORRECTION TO IT WAS ALSO WRONG.** The first draft said "media opacity" exists and
  that flat colour was "the one real gap". Both parts are wrong, caught by the handoff QC:
  `sgs/container` declares exactly **two** opacity attributes — `backgroundOverlayOpacity` and
  `bgSvgOpacity`. There is **no media/image opacity anywhere**. The `Opacity (%)` label I read in a
  grep sits directly after `bgSvgPosition` (`ContainerWrapperControls.js:978`) — it is the **SVG**
  opacity control, and I attributed it to media without checking what it was bound to.

  **THE REAL GAPS ARE TWO: flat background colour AND media opacity.** Both must be built before any
  native colour support is stripped (§5), and Bean's §3 model needs media opacity anyway — a colour
  layer painting over media is only useful if the media beneath can also be dimmed independently.

---

## 2. The model

### 2.1 Where a panel goes

> **An element-scoped control belongs to its element's panel, in Settings. Only controls that scope
> to NO single element belong in the Styles tab.**

Derived, never hand-sorted:

| Declared shape | Panel | Tab |
|---|---|---|
| Element with a content or CSS surface (`headline`, `media`, `cta`…) | one panel, titled `label` | **Settings** |
| Element marked `isWrapper: true`, or scoping the section/root (`wrapper`, `grid`, `content-band`) | root panels | **Styles** |

Panel ORDER is the element's declared `order` (this closes **CO-28** with data instead of a
convention — order stops being a thing anyone chooses per block).

### 2.2 What a panel contains

One element panel holds, in this order:

1. **Content** — the element's text/media/link controls
2. **Style clusters** — in the declared `clusters` order (`text` → `fill` → `layout`)
3. **Hover** — inline, immediately after the base value it modifies

**Hover is never a separate panel.** `states.hover.attrMap` already sits *inside* the element in the
data; the UI simply renders it there. This is the fix for the split you have raised repeatedly.

### 2.3 The gap this model has, and how it is closed

`attrMap` covers CSS properties only. It does **not** say which *content* attribute (a headline's
text, a CTA's URL) belongs to which element. Without that, an element panel cannot gather its own
content controls.

**Resolution:** extend each element with a `contentAttrs` list naming the attributes it owns. This is
additive, machine-checkable, and the same generator that maintains `attrMap` can seed it. **Until an
element declares `contentAttrs`, its content controls stay where they are** — no guessing.

---

## 3. Background — one system (Bean decision 1)

**Target capability**, all in the SGS background panel, for any block using the shared wrapper:

1. **Flat colour with alpha** — MISSING today, build it
2. **Gradient** — from/to colour pickers + angle (the existing `GradientOverlayControl` shape,
   already correct)
3. **Media** — image/video/SVG, with the existing position/repeat/size/parallax/Ken Burns, **plus a
   media opacity control, which is also MISSING today** (only overlay and SVG opacity exist)
4. **Automatic overlay.** When a colour or gradient is set *and* media is present, the colour layer
   paints ABOVE the media. No separate "overlay" concept, no extra toggle — the client lowers the
   colour's alpha to let the image through. One mental model instead of two.

**Consequences, stated plainly:**
- `sgs/cta-section`'s bespoke background (4 fixed gradient choices + image opacity) is **deleted**.
  A four-item dropdown is strictly worse than a colour picker, and it is the source of your duplicate
  "Background" panel.
- The existing `backgroundOverlayColour` / `overlayGradient*` attributes are the natural home for
  (1) and (2) — this is mostly a **relabel + ungate + repaint-order** change, not a new subsystem.
  Verify before building: confirm the current paint order and whether the overlay is gated on media.

---

## 4. Hover — delete the universal system (Bean decision 2)

> # ⛔ SUPERSEDED 2026-08-10 by D551, ruled at D553. DO NOT EXECUTE THIS SECTION.
>
> This section (and Phase 4 in the phase table below) required **capability-first in five ordered
> steps**, gated on *"no block loses capability"*, because 48 blocks rely on the hover extension
> solely. **D551 is newer and Bean-verbatim, and it governs:** `hover-effects`, `block-link` and the
> other problematic extensions are **DISCONNECTED and made opt-in as part of Phase 2.1**, and effort
> spent making them correct is effort entrenching a mechanism being removed.
>
> The evidence that settled it: **ZERO stored hover attributes across 194 canary pages** (positive
> control — 1706 SGS block openings parsed, so the zero is a measurement). *"48 blocks rely on it"*
> and *"nobody uses it"* are both true; which one governs was Bean's call, not a deduction.
>
> Owner is now Phase 2.1 in `go-track-1b-*`. Kept here for its measurements and its 48-block census,
> **not** as instructions.

**Destination:** `extensions/hover-effects.js`'s colour controls go. Hover belongs to the element.

⛔ **It cannot be step one.** 48 blocks have NO hover attributes of their own and rely entirely on
that extension. Deleting first removes a capability from 48 blocks. Order:

1. Extend `states.hover` in the element model to cover every element that should have hover
   (today: **18 of 283**).
2. Render hover inline in the element panel (§2.2).
3. Migrate the 16 dual-system blocks onto their own attrs; retire the extension's colour fields.
4. For the 48 extension-only blocks: either give them element hover, or record — per block — that
   they are not meant to have it. **Never a silent capability loss.**
5. Delete the extension's colour controls, and gate against reintroduction (§6).

`sgsHoverScale` / `Shadow` / `ImageZoom` / `Grayscale` are effects, not element colours. **Answered
2026-08-08 — see §10.1:** they survive the extension's deletion as a capability, but are placed by
block scale (leaf → one block-level section; composite → attached to the element they target), and
only where §10.2's binding rule is satisfied.

**§10.2 changes step 4 above.** "Give them element hover, or record that they should not have it" is
replaced by a derivation: a block gets hover where it has an element whose CSS the hover would
actually change, and none where it does not. No per-block opinion, no silent loss — the absence is
explainable.

---

## 5. Retiring the native duplicates

Native supports are the *source* of the duplicate Color and Border panels (38 and 48 blocks). They
cannot simply be stripped: they carry real capability.

**Sequence — capability first, always:**

1. Enumerate exactly what each native support provides per block (colour: background/text/gradients/
   link; border: radius/width/style/colour).
2. Confirm the SGS equivalent exists — §3 for background, plus per-element `css:color` /
   `css:border-*` already declared in `attrMap`.
3. Strip the native support from ONE block, verify in the live editor, then roll out.
4. Anything native offers that SGS lacks is **built before the strip**, never dropped.

The American spelling (`Color`) is a reliable detector for the native panel and should be used by the
gate in §6 — but as a *signal*, not the rule. The rule is the `attrMap` comparison, which cannot be
fooled by a label.

---

## 6. Enforcement — so this cannot recur

New `inspector-scan` rules, each shipped with a fixture pair (must-flag + must-not-flag), advisory
until its backlog is zero:

| Rule | Fires when | Source of truth |
|---|---|---|
| `native-duplicates-custom` | a block declares a native support for a CSS property its own `attrMap` serves with a custom attr | `supports` vs `attrMap` |
| `element-panel-conformance` | an element's controls are split across panels, or a panel exists for no declared element | `supports.sgs.elements` |
| `hover-not-inline` | a hover control renders outside its base value's element panel | `states.hover` |
| `universal-hover-colour` | any `sgsHover*Colour` attribute survives | extension source |
| `panel-order` | panel order ≠ declared element `order` | `elements[].order` (**closes CO-28**) |

⚠ Three of these need the **extension surface** the scanner gained today (`extensionsDir`,
commit 9169d546) — that prerequisite is now met.

---

## 7. POC — `sgs/hero` (Bean decision 3)

Hero is the right proof: 9 declared elements, a genuine mix of root and element scope, and it is one
of the blocks I mis-sorted.

**Its elements today** — note every one reads `hover: no`, so the POC includes enriching them:

| order | element | label | scope under §2.1 |
|---|---|---|---|
| 1 | `wrapper` | Wrapper | **Styles** (root) |
| 2 | `grid` | Grid / flex layout | **Styles** (root) |
| 3 | `content-band` | Content band | **Styles** (root) |
| 4 | `content` | Content column | **Styles** (root) |
| 5 | `media` | Media column | **Settings** — media source + its styling |
| 6 | `grid-item` | Grid item | **Styles** (root) |
| 7 | `headline` | Headline | **Settings** — text + typography + colour + hover |
| 8 | `sub-headline` | Sub-headline | **Settings** — ⚠ `clusters` empty, needs filling |
| 9 | `cta` | CTA buttons | **Settings** — ⚠ `clusters` empty, needs filling |

**Done means:** hero's Styles tab holds only root panels; each element panel holds its content, its
styling and its hover together, ordered by `order`; no duplicate Color/Border panel; and Bean's eye
signs it off in the live editor (R-31-13 — a green scanner does not close this).

---

## 8. What happens to the 2026-08-08 split

Commit `dfba396b` hand-sorted 8 blocks on the wrong model. It is **superseded, not reverted**: the
Settings/Styles split itself stays, the *assignment* changes. Those 8 blocks are re-derived by this
model like any other. Reverting would restore the single-crammed-tab problem, which is worse than
what is there now.

The contract's §6 field 4 ("behaviour → Settings; appearance → Styles") is the rule I followed and it
is **wrong** — it must be amended to §2.1 as part of this work, or the next session repeats my
mistake from the same source.

---

## Out of scope

Named explicitly so none of it is silently absorbed, and so a later session does not assume it was
covered here:

- **The remaining 57 blocks in the `01-tab-group` backlog.** This design defines the model and proves
  it on one block. Rolling it across the library is Phase 6 and is not specified here.
- **`sgsHoverScale` / `Shadow` / `ImageZoom` / `Grayscale` placement mechanics.** §10.1 decides WHERE
  they belong; the build is not scoped.
- **Native `spacing` / `typography` / `shadow` supports.** Only `color` and `__experimentalBorder`
  are addressed. The same duplication question applies to the others and is deliberately not opened
  in this plan.
- **The `sgs/media` residual ChildBlock and the `scalar-media` retirement** — a different track's
  blocker, unaffected by this work.
- **Any change to `SGS_Motion_Registry`'s private module map.** Out of bounds by that file's own
  ownership note.

## Phase overview

Six phases, each gated. Nothing after Phase 0 starts until Bean signs off on the contract amendment,
because Phase 0 corrects the sentence that caused the rejected split in the first place. Phases 1
and 2 are the proof (capability, then one block end-to-end). Phase 3 makes the model enforceable.
Phases 4 and 5 remove the duplicated systems — both strictly capability-first, because 48 blocks
depend on the hover extension and every block depends on the native colour panel for flat
backgrounds. Phase 6 is the library-wide roll-out, which only begins once the gates in Phase 3 read
zero.

## 9. Phasing

| Phase | Work | Gate |
|---|---|---|
| 0 | Amend contract §6 field 4 + CO-2 to §2.1; add `contentAttrs` to the element schema | Bean sign-off |
| 1 | Background: flat colour + alpha, gradient, auto-overlay paint order | Live editor, one block |
| 2 | Hero POC end-to-end (§7) | **Bean's eye** |
| 3 | Enforcement rules (§6), advisory | Fixture pairs pass |
| 4 | Hover migration (§4), in the stated order | No block loses capability |
| 5 | Native retirement (§5), capability-first | Per-block live verify |
| 6 | Roll the model across the remaining blocks | Gates promote when backlog = 0 |

## 10. Answered by Bean, 2026-08-08

### 10.1 Hover effects — scale with the block, and the axis already exists

**Bean:** *"For something like button, since it's a single element, all of the colours should be
together — bg, border and text — and then it should have a section for hover effects. For a larger
composite like hero it needs to be separated per nested element."*

Two different things were tangled in the original question, and they resolve differently:

| | Where it goes |
|---|---|
| **Hover COLOURS** (`css:color`, `background-color`, `border-color` under `states.hover`) | **Always** inline beside the base value, inside the element panel. Never a separate section. Unchanged from §2.2. |
| **Hover EFFECTS** (`sgsHoverScale` / `Shadow` / `ImageZoom` / `Grayscale`) | **Leaf block** → ONE block-level "Hover effects" section. **Composite** → attached to the element it actually targets. |

⚠ **Worth noting: the per-element model already delivers what Bean wants for button**, without a
special case. Button's `attrMap` puts `css:color`, `css:background-color` and `css:border-color` all
on the SAME `button` element — so one element panel naturally holds bg + border + text together. Its
`icon` element separately owns `css:color`. The "single element feels unified, composite feels
separated" difference is an emergent property of the data, not a rule anyone has to apply. **Only the
hover-EFFECTS placement genuinely needs the leaf/composite split.**

**The discriminator is `block_composition.composition_role`** — measured live, scoped to the roster
and summing exactly to 83:

| role | blocks | hover-effects placement |
|---|---|---|
| `leaf` | **10** | one block-level section |
| `content-block` | **64** | per element where it has >1 element with a hover target; otherwise block-level |
| `section-root` | **8** | per element |
| `wrapper-shell` | **1** | per element |

Verified: `sgs/button`, `sgs/heading`, `sgs/text`, `sgs/icon` = `leaf`; `sgs/hero`,
`sgs/cta-section` = `section-root`. R-31-1 satisfied — a DB column, not a hardcoded list.

### 10.2 Hover must be BOUND to something, never floating

**Bean:** *"Most or maybe all of the blocks could have something that is hover-effect friendly. But
it needs to actually be applied to something and not just randomly exist."*

This is the binding rule, and it settles §4 step 4:

> **A block gets a hover control only where a concrete element/target exists for it to apply to.
> A hover attribute with no target is a defect, not a feature.**

That is precisely the dead-control shape the framework already fails builds over
(`check-dead-controls.js`) and the fourth quadrant rule 21 measures. So the answer to "do all 48
extension-only blocks want hover?" is neither yes nor no per block — it is **derived**: a block gets
element hover where it has an element whose CSS the hover would actually change, and gets none where
it does not. No per-block opinion required, and no silent capability loss either, because the
absence is then explainable rather than arbitrary.

The universal extension is exactly what this rule condemns: it attached 11 hover attributes to **67
blocks** wholesale, with no check that any of them targeted anything real. That is why it goes.

### 10.3 What `contentAttrs` means (jargon in the first draft — my fault)

**Plain English.** The element map records, per element, which **styling** properties it owns —
"the headline owns its font size and its colour". It records nothing about which **content** field
belongs to that element — "the headline's actual words live in the attribute called `headline`".

**Why that matters here.** Your model says an element's panel holds its content *and* its styling
together. To build the Headline panel I need both halves. I have the styling half in data. The
content half is currently only knowable by reading each block's editor code by hand — which is
exactly the hand-authoring this whole design removes.

`contentAttrs` is just a short list, per element, naming its content fields:

```
"headline": { "label": "Headline", "contentAttrs": [ "headline", "headlineTag" ] }
```

**Two ways to get it:**

| | Effort | Risk |
|---|---|---|
| **(a) Hand-written** per element across 83 blocks | high — 283 elements | drifts the moment a block changes |
| **(b) Generated** from what `render.php` actually prints inside each element, then reviewed | low | a generator guess needs a human pass |

**Recommendation: (b), with review.** The same generator already maintains `attrMap`, so this rides
existing machinery, and generated-then-reviewed is how `attrMap`'s own 403 `native:` entries got
there. **Until an element declares `contentAttrs`, its content controls stay where they are** — the
model degrades to "no worse than today" rather than guessing and moving a client's controls wrongly.

✅ **DECIDED 2026-08-08 — Bean: "Generate and review." Option (b).**

Binding conditions on that, so "generated" never quietly becomes "assumed":

1. **The generator's output is a PROPOSAL until reviewed.** It writes `contentAttrs` for the POC
   block (`sgs/hero`) first and Bean reads it before a single further block is touched.
2. **It must report what it could NOT determine**, per element, rather than emitting a confident
   guess. An element whose content fields cannot be resolved gets NO `contentAttrs` and says why —
   the model then leaves that element's controls where they are (the no-worse-than-today floor).
3. **It ships with a `--check` mode** so drift is caught by the build rather than by someone
   noticing, matching how every other generated artefact in this repo is gated.
4. **Re-runnable and idempotent**, like `attrMap`'s own generator — a block changing shape must not
   require hand-repair.

⚠ The honest risk, named up front: a generator that reads `render.php` infers content ownership from
how markup is assembled, and blocks whose render is heavily conditional (variant-driven ones like
`hero`, `testimonial`, `product-card`) are exactly where inference is weakest. Condition 2 is what
keeps that from becoming silent damage — those elements surface as "unresolved", not as a wrong
answer that moves a client's controls into the wrong panel.
