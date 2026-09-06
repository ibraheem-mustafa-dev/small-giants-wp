---
doc_type: design
project: small-giants-wp
title: Container layer model — declared roles for decorative layers
status: NO-GO AS WRITTEN — 5-seat adversarial council, 2026-08-25. Awaiting Bean's pick from the three options in §7.
date: 2026-08-25
governs: every block that paints a decorative layer behind or over its content
related: D784 (child-lift de-specification), Spec 32, Spec 38 §3.3
---

# Container layer model — a design gate

**Rule 7 gate. No code has been written. This touches the render path of every block with an
overlay, so it needs your ruling before anything is built.**

---

## 1. The problem, in plain English

An SGS block often paints things *behind* or *over* its words — a background image, a dark tint
over that image so white text stays readable, a moving gradient, a trail of particles. Something
has to decide what sits on top of what.

Today nothing decides it centrally. Each block invents its own answer, and the answers do not
agree with each other.

**Measured, not estimated** — across `src/blocks/*/style.css`:

| | |
|---|---|
| `z-index` declarations | **65** |
| blocks declaring at least one | **22** |
| distinct values in use | **17** — `0, 1, 2, 3, 4, 5, 6, 10, 20, 30, 31, 100, 200, 999, 1000, 99999, 100000` |
| declarations using a shared token | **1** (`whatsapp-cta/style.css:97`) |

`before-after` climbs 1→6. `gallery` uses `10`, `2`, `100000`, `1`. `cart` uses `20` and `1`. These
are not a scale; they are 22 private conventions that happen to coexist because the blocks rarely
meet. **The effect is that "which layer wins" is decided by whoever wrote that block last**, and a
new decorative layer has no way to know where it belongs.

### Why this surfaced now

D784 fixed the acute version. `sgs/container`'s child-lift rules used to carry a hand-maintained
`:not()` chain naming every decorative layer that must not be lifted — 47 exclusions. Each `:not()`
*raises* the rule's specificity, so every name added made the next unlisted layer more certain to
lose. **Six features learned this independently**, each fixed by appending one more name.

The rules are now `:where()`-wrapped at zero specificity, so any layer declaring its own `position`
wins automatically and no registration is needed. That closed the trap **in that one file**.

⛔ **It is not closed everywhere.** [`fx-wave-gradient.css:83`](../../plugins/sgs-blocks/assets/css/fx-wave-gradient.css#L83)
still carries a live exclusion chain:

```css
> *:not( .sgs-wave-gradient__canvas ):not( .sgs-wave-gradient__toggle ) {
```

Same shape, same failure mode, unguarded. Whatever we decide must cover this, or D784's lesson is
half-learned.

---

## 2. Your proposal, and what the data says about it

> Pair a content attribute with its overlay sibling, and let the overlay always sit above.

**The pairing genuinely exists in the data.** `backgroundImage` ↔ `backgroundOverlayColour`,
`mediaBackground` ↔ `mediaOverlayColour`, repeated verbatim across eight blocks. Nothing reads it.

**But it is not symmetric, and the design has to say what happens in both unpaired directions.**

| | Blocks |
|---|---|
| Have `backgroundOverlayColour` | 8 — container, cta-section, hero, multi-button, physics-canvas, site-footer, site-header, trust-bar |
| Have `backgroundImage` | **9** — the same eight **plus `sgs/nav-drawer`** |

So every overlay has an image to dim, but **`nav-drawer` has an image and no overlay at all**. Two
further backgrounds are unpaired the same way: `mega-panel.accentBackgroundImage` and
`business-info.linkHoverBackgroundImage`.

And three overlays are unpaired on the *content* side — they dim something that is not an attribute:

- `gallery.overlayColourHover` and `team-member.overlayHover` — hover-only tile scrims
- `modal.overlayColour` / `overlayOpacity` / `closeOnOverlay` — a modal scrim, a different thing
  entirely

**Coverage, honestly: pairing answers 8 of the ~15 layer-bearing cases.** It is a real rule for a
real majority, not a universal one. The rest need something else, which is §4.

---

## 3. Declare the pairing. Never infer it.

⛔ **A substring rule on `"overlay"` is wrong and would break a working block.**
[`modal/block.json:105`](../../plugins/sgs-blocks/src/blocks/modal/block.json#L105) declares
`closeOnOverlay` — a **boolean about click behaviour**, not a layer. A name-matching rule stacks it
as one. This is the same class of error as detecting a control by its component name rather than by
what it does.

The pairing must be **stated by the block**, in one place, and read from there.

---

## 4. The part your proposal does not reach — and my recommendation

Four layers have **no content attribute to pair with**, because they are minted by JS or PHP rather
than driven by an attribute:

| Layer | Class | Minted at |
|---|---|---|
| Particle canvas | `sgs-particles__canvas` | `particles.js:183` |
| Wave-gradient canvas | `sgs-wave-gradient__canvas` | `fx-wave-gradient.js:112` |
| fx path visual | `sgs-fx-path-route` | `fx-path-routes.php:358` |
| fx shape visuals | `sgs-fx-shape-visual` / `__target` | `fx-shape-routes.php:398` / `:406` |

Pairing cannot describe these. **They need a declared role instead.**

### Recommendation: one concept, not two

Rather than shipping *pairing* and *roles* as two mechanisms, ship **one**: every decorative layer
declares **what it is**, and the model assigns stacking from that. Pairing then becomes a *derived
convenience* — an overlay whose paired content attribute is set sorts above that content — not a
separate system.

Proposed roles, deliberately few:

| Role | Sits | Examples |
|---|---|---|
| `ground` | behind everything | background image/video/svg |
| `wash` | over ground, under content | background overlay, media overlay, modal scrim |
| `content` | the block's own words | `.sgs-container > *` |
| `ambient` | over content, non-interactive, `pointer-events:none` | particle canvas, wave gradient, fx visuals |
| `control` | over everything, interactive | wave-gradient pause toggle, gallery lightbox |

**Why this and not pairing alone:** it answers `nav-drawer` (a `ground` with no `wash` — fine, no
rule needed), it answers the four generative layers, it answers the wave-gradient's `__toggle`
(which is why that file still has an exclusion chain — the toggle is `control`, the canvas is
`ambient`, and a `:not()` chain was the only way to say so), and it gives the 22 blocks currently
improvising a scale one thing to point at.

**Why it is safe:** the D784 contract is preserved exactly — a layer declaring its own `position`
still wins, at zero specificity, with no registration. Roles set *ordering among declared layers*;
they do not reintroduce a list that must be maintained to stay correct.

---

## 5. The justification that does NOT apply

⛔ **The cloning-fidelity argument is REFUTED. Do not use it to justify this work.**

`computed-parity.js` blocklists `position` and `z-index` by design, and `pseudo_overlay.py` already
extracts overlays through a DB attribute-existence check. **A pairing edge is consumed by nothing in
the cloning pipeline today.** If this ships, it ships because 22 blocks improvising 17 z-index values
is a maintenance defect and a recurring trap — not because clones need it.

---

## 6. Open questions for you

1. **One mechanism or two?** My recommendation is roles-only with pairing derived (§4). Your original
   proposal is pairing-first. Roles cover strictly more cases; pairing is simpler to state.
2. **Where does the declaration live?** `block.json` `supports.sgs` (visible with the block, no DB
   round-trip) or a DB column (queryable, matches the DB-first rule R-31-1). Both are defensible;
   `block.json` is my lean, because a layer role is a property of the block's own markup.
3. **Scope of the first pass.** Retrofitting all 22 improvising blocks is a large sweep. A first pass
   covering only the 8 paired blocks + the 4 generative layers + the wave-gradient residue is small
   and closes the recurring trap; the other 14 can follow behind a detector.

**Nothing is built until you rule on these.**

---

# 7. COUNCIL VERDICT — NO-GO as written (5 seats, 2026-08-25)

Grades: **C−** maintainability · **B−** technical soundness · **D+** shippability ·
**C−** specification quality · **D** operational safety.

**I verified every load-bearing finding below against the tree myself. All of them hold.**

## 7.1 The design as written would have shipped a visible regression

⛔ **§4 files the wave-gradient canvas under `ambient` ("over content"). It is a `ground`.**
`fx-wave-gradient.css:54-58` says so in its own comment — *"The canvas sits behind the block's
own content, never over it"* — at `z-index: 0`, painting an opaque full-bleed gradient.
Shipping the table as written would paint that **over every heading and button in the section**.
The table was written from class names rather than from the rules. Same page,
`.sgs-particles__canvas` genuinely IS over content: two canvases, opposite intent, one role.

## 7.2 The premise is half-hollow — and where it is not hollow, it is worse than I claimed

- **My census was wrong.** 58 real declarations, not 65 — I counted comment prose. **42 of the
  58 are `0`/`1`/`2`**, the trivial sit-above-my-sibling idiom. They agree; they are not improvising.
- **They mostly never meet.** `container/style.css:80-84` gives every direct child
  `position:relative; z-index:1` — a stacking context. A nested block's whole 0–100000 vocabulary
  **collapses to `1`** at the outer level. A global role order is not expressible across that boundary.
- **Where escape WAS intended, it has already failed silently.** `--sgs-modal-z-index: 99999`
  has **zero consumers** (grep: one hit, its own definition) — the dialog uses `showModal()`,
  i.e. the top layer, where z-index does not apply. Gallery's lightbox `100000` is sealed inside
  a container child at `1`, so `site-header`'s `100` **paints over the open lightbox**. That is a
  live bug this design would have enshrined rather than fixed.
- **The one "good pattern" I cited is dead.** `--wp--custom--z-index--floating` is defined
  nowhere; `theme.json` `settings.custom` has no zIndex key. It always falls back to `200`.

## 7.3 Fatal collisions with things that already exist

- ⛔ **`layer` is an occupied field.** `supports.sgs.elements[].layer` already exists — **63
  declarations across 30 block.json files**, vocabulary `OUTER`(27)/`GRID`(15)/`CONTENT`(13)/
  `GRID_AREA`(8), read into `block_attributes.css_layer` and driving `layer_detect.py`. My
  proposed `content` role **collides directly** with the existing `CONTENT`.
- ⛔ **There is already a corpse in that field.** `GRID_AREA` was removed from the converter on
  2026-08-16 (D642 — both `dispatch_table.py:43` and `layer_detect.py:7` say so) yet is still
  declared in 4 blocks. A declared value with zero readers. **The drift surface this design
  would join already has a body in it, and no gate caught it.**
- ⛔ **`ambient` is unimplementable where anything isolates.** `helpers-tokens.php:878` emits
  `isolation:isolate` on every block using the border ring; plus `hero/style.css:444`,
  `extensions.css:273`, `fx-wave-gradient.css:22`. Inside those, "over content" cannot happen.
- ⛔ **`sgs/modal` is a native `<dialog>`** (`render.php:93`, `::backdrop` styling). Top layer —
  not orderable by z-index at all. §4 filed it as `wash`.
- ⛔ **`decorative-image` gives the client an editable `zIndex` box** (`edit.js:248`). A
  compile-time role model cannot govern a runtime, per-instance, operator-authored value.

## 7.4 The residue is THREE files, not one

§1 named `fx-wave-gradient.css:83`. Also live:
- `fx-cursor-field.css:444` — `[data-sgs-cursor-field] > *` child-lift with **no `:where()`**.
- `fx-surface-treatment.css:19-37` — **documents itself as a victim of that rule**, and hand-raised
  its own selector's specificity to survive. A seventh feature learned D784's lesson independently,
  *after* D784.

## 7.5 What the council converged on instead

Four of five seats independently reached the same place: **the acute problem is a small
structural fix, and the repo's own rule says the detector is the first deliverable, not the edit.**

The unanimous small fix:
```css
:where([data-sgs-fx="wave-gradient"]) > * { position: relative; z-index: 1; }
```
Zero specificity — canvas and toggle both win on their own declarations, the `:not()` chain is
deleted, no roles, no block.json, no reader. D784's proven remedy, applied to the two files that
still need it. Its **negative control**: revert `fx-surface-treatment.css`'s defensive scoping to
a bare class rule and prove it still wins. If it does not, the migration is incomplete.

## 7.6 What was missing from the design entirely

No acceptance criterion. No negative control. No rollback path. No editor-canvas parity — and
**21 of the 22 blocks with z-index have no editor-side mirror at all** (only `container` does),
so a frontend-only model means the client sees one stack while editing and another when published.
No diagnostic surface for a support call. No deletion criterion for the roles themselves — which
is exactly how the 47 exclusions grew, one honest name at a time.
