---
doc_type: design
title: "Element-driven inspector — one model for panels, colour, background and hover"
spec_ref: .claude/specs/35 (control-type contract) — CO-2, CO-28, COLOUR, STATE, BORDER
date: 2026-08-08
status: DESIGN — awaiting Bean sign-off, nothing built
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
| Blocks with native colour support AND custom colour controls | **38** | supports vs `edit.js` |
| Blocks declaring `__experimentalBorder` | **48** | supports scan |
| Blocks running TWO hover systems (own `*Hover` + universal `sgsHover*`) | **16** | attrs vs extension reach |
| Blocks relying SOLELY on the universal hover extension | **48** | same |
| Blocks already opted out of it | **17** | `supports.sgs.hideExtensions` |

⚠ **Two claims were checked and did NOT hold** — recorded so nobody designs around them:
- *"Border colour control is missing completely."* `sgs/button` has `colourBorder` and
  `colourBorderHover` controls, and renders both. The failure is that they cannot be FOUND, which is
  a placement problem, not a missing feature. Other blocks still need auditing individually.
- *"The universal background panel only allows media."* It already offers media opacity, overlay
  opacity, gradient overlay with from/to colour pickers, parallax scroll, Ken Burns, position,
  repeat, size, attachment and SVG. **The one real gap is a flat background colour** — which today
  exists only in the native WP Color panel. That single gap is what makes deleting the native panel
  dangerous, and is why §3 is sequenced first.

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

1. **Flat colour with alpha**
2. **Gradient** — from/to colour pickers + angle (the existing `GradientOverlayControl` shape,
   already correct)
3. **Media** — image/video/SVG, with the existing opacity/position/repeat/size/parallax/Ken Burns
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

`sgsHoverScale` / `Shadow` / `ImageZoom` / `Grayscale` are a separate question — they are effects,
not element colours. **Not in scope here; decide separately.**

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

## 10. Open questions

1. **Non-colour hover effects** (`sgsHoverScale`/`Shadow`/`ImageZoom`/`Grayscale`) — keep as a
   universal extension, or move into the element model too?
2. **The 48 extension-only blocks** — do they all *want* element hover, or is the honest answer that
   many should simply not have it?
3. **`contentAttrs`** — hand-authored per block, or generated from render.php usage and reviewed?
