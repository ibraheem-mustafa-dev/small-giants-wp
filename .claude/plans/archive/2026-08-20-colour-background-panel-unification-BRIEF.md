# Colour + Background panel unification — design brief

```
doc_type: design-brief
created: 2026-08-20
project: small-giants-wp
status: FOR COUNCIL — nothing here is approved
blast_radius: ~30 blocks mount the container shared panels (measured, see §1)
gate: project CLAUDE.md rule 7 — shared-mechanism change, design gate before build
```

## Why this exists

Bean's brief, verbatim:

> *"it should have shadow colour, which I'm a little confused why we haven't simply added
> gradients to that too. If there is no true perfect setup then please upgrade heading or
> button to do that. Also, I already spoke about the overlay. That is supposed to be turned
> into a dupe control of the new background control. So, that people can edit it in both
> places. Then for the background overlay setup itself we need to work out some logic to
> always have the bg media always sit behind the bg colour. And, also have background
> gradient colour parallax and any other controls that directly connect to the colour alone
> sit in the colour panel. We could also have bg colour just function regularly and then if
> someone sets a bg media that might sit on top if that's a default behaviour and then we
> have a boolean setting to use bg colour as an overlay and then the help text should mention
> that the colour picker itself has an opacity slider so to use that."*

Two deliverables, in his priority order: **(a) a textbook-example block**, and **(b) unify
the overlapping colour / background panel setup.**

---

## §1 — Ground truth (measured 2026-08-20, every line traceable to a command)

⛔ Nothing in this section is recalled. Each is a file read or a script run this session.

### The shared panels and what they actually contain

| File | Colour-row mounts | Shape |
|---|---|---|
| `container/components/WrapperColourPanel.js:33` | 1 × `SgsColourPanel`, **4 rows** | `shapeDividerTopColour`, `shapeDividerBottomColour`, `gridItemBackground`, `gridItemTextColour` — **all single-state (`normal` only), none with a gradient path** |
| `container/components/GridItemDefaultsPanel.js` | 4 × `DesignTokenPicker` at `:138`, `:192`, `:218`, `:237` | `:138` Background (no `states`, no gradient) · `:192` Border (1 state `base`, **has** gradient) · `:218` Border-hover (1 state `hover`, **has** gradient) · `:237` Text (no `states`, no gradient) |
| `container/components/BackgroundPanel.js:102` | 1 × `GradientOverlayControl` | writes `backgroundOverlayColour` + `overlayGradient` |
| `container/components/ShapeDividersPanel.js:56,105` | 2 × `GradientOverlayControl` | divider fills |

**30 blocks** mount these panels (`grep -rln` over `*/edit.js` for the four panel names +
`ContainerWrapperControls`).

### The finding that reframes the whole brief

`BackgroundPanel.js:100` already ships this help text:

> *"This colour is the background. With an image or video behind it, lower its alpha to let
> the media show through — there is no separate overlay to set up."*

**Bean's proposed model is the SHIPPED model.** The control immediately beneath that text is
`GradientOverlayControl`, and it is the container's only live background-colour control.
What is wrong is the **naming and the location**, not the mechanism.

### `sgs/container` has no native colour path

`block.json` → `"supports": { "color": false }`. There is exactly one live background-colour
path, not two.

⚠ **OPEN, being verified live — do not design on either answer yet.**
`container/render.php:89,97,99` reads `$attributes['backgroundColor']` and emits
`has-{slug}-background-color`. That attribute is neither declared nor registered, so D338
says WordPress discards it and the code is dead. But `.claude/LEDGER.md` records a live
verification that `has-surface-alt-background-color` *does* render. Both cannot be true.
A read-only agent is resolving this. **The council must treat this as unresolved.**

### The three gradient mechanisms, and why no block has all three

| Mechanism | Component | Correct for | Discriminator in source |
|---|---|---|---|
| **A** per-state toggle | `DesignTokenPicker` (`:228`) | background / border / icon | a state carries `onGradientChange` |
| **B** text gradient | `GradientCapableColourControl` (`:153`) | **text only** (needs `background-clip:text`) | row declares `gradientCapable: true` (`SgsColourPanel.js:115-117`) |
| **C** whole-block overlay | `GradientOverlayControl` (`:78`) | block background | JSX identifier + `attrNames` map |

⚠ A and B use **different prop names for the same thing** — `onGradientChange` vs
`gradientOnChange`. Any detector or refactor must handle both.

**Measured across all 83 blocks: no block scores 3.** The closest are `sgs/heading` and
`sgs/text`: text row (normal+hover, mechanism B) + background row (normal+hover, mechanism A)
+ border row **1 state only**. Mechanism C reaches only wrapper blocks, and wrapper blocks have
no text-colour row because HC2 gives typography to the child. **So "one block with all three"
is unreachable under the current architecture** — the golden must describe *A+B at row level,
C at block level*, not three row-level mechanisms.

### Shadow colour cannot take a gradient

`box-shadow`'s grammar takes a `<color>`; a gradient is an `<image>`. `box-shadow: 0 4px 8px
linear-gradient(…)` is invalid and dropped wholesale. `filter: drop-shadow()` is likewise
colour-only. A gradient *glow* is achievable only via a separate blurred pseudo-element behind
the box — a different mechanism, not a colour row.

⚠ Narrow-true / broad-false check: the claim "CSS forbids gradient shadows" is **narrow-true**
(no `box-shadow` gradient syntax exists) and **broad-false** (the visual effect is buildable).
The council must decide which of those two framings governs.

Today exactly **one** `colourExemptions` entry exists tree-wide (`site-header/block.json:63-68`).

### Motion controls are media-scoped, not colour-scoped

`bgParallax` / `bgKenBurns` / `bgAnimationDuration` (`BackgroundPanel.js:80-82,445-465`) are
mutually-exclusive toggles that animate the **media layer**. Bean's brief groups "background
gradient colour parallax" together; on the evidence, gradient is colour-adjacent but parallax
and ken-burns are media-adjacent. **This grouping needs an explicit ruling.**

---

## §2 — The questions for the council

**Q1. Where does background colour live?** Bean wants a duplicated control editable in both
the Colour panel and the Background panel. Duplicated controls writing one attribute are a
known confusion source (two visible values that must never disagree) — but so is hunting for
the background colour in a panel called "Background" when every other colour is in "Colour".
Options: single home in Colour with a cross-reference · single home in Background · genuine
dual mount of one control bound to one attribute.

**Q2. Retire mechanism C?** `GradientOverlayControl` is single-state by construction, so any
block using it can never offer a hover background. Replacing it with a `DesignTokenPicker` row
would unify on one mechanism and gain states for free — but it is mounted in 3 places across
2 shared panels reaching ~30 blocks, and its `attributes`/`setAttributes`/`attrNames` API is a
different register from `value`/`onChange`.

**Q3. Media/colour stacking.** Bean offers two models: (i) colour always above media (current
shipped behaviour, alpha as the blend control), or (ii) colour behaves "normally", media sits
on top by default, plus a boolean "use background colour as overlay" with help text pointing at
the picker's own opacity slider. (ii) adds a control and a state; (i) is already built. Which?

**Q4. Which controls are colour-adjacent enough to move to the Colour panel?** Gradient — yes.
Parallax / ken-burns / animation duration — these animate media, not colour. Ruling needed.

**Q5. Shadow colour.** Declared exemption with the CSS-grammar reason, or build the
pseudo-element gradient-glow mechanism as a real feature? These have very different costs.

**Q6. The textbook example.** `sgs/heading` and `sgs/text` are tied and each one attribute
short (a `borderColourHover` sibling). `sgs/button` has 2-state text/background/border and
per-state gradients on background and border, but no mechanism B and a false-positive shadow
finding. Which block becomes the reference, and what exactly must it demonstrate given that
"all three mechanisms in one block" is architecturally unreachable?

---

## §3 — Constraints the council may not trade away

- **No block may emit an inline `style` property declaration** (Spec 32). Scoped `<style>` only.
- **WordPress silently discards an undeclared attribute** (D338). Any new state on a shared
  row requires the sibling attribute declared in **every mounting block's** `block.json`.
- **Pre-production: no version bumps, no deprecations** (D293).
- **HC2:** a parent block must not carry a per-element typography/colour control that duplicates
  a child's — it is dead by CSS specificity.
- **Client-facing:** clients are non-technical and use the block editor exclusively. A control
  that needs code is not done.
- **R-31-1:** no hardcoded property→attr dicts; lookups come from the DB or declared schema.
