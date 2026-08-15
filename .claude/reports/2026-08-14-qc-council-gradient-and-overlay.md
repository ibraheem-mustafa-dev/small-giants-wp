# QC Council — gradient storage shape + the overlay→colour-panel remodel

```
doc_type: report
date: 2026-08-14
council_type: fix-shape (validation gate mandatory)
raters: 4 × Sonnet, distinct angles — consumer-path (A), token integrity (B),
        cross-library forensics (C), overlay code-path (D). All routed via /delegate.
proposals_in: 3   validated: 2   falsified: 1
```

## Verdict, plain English

**Store a gradient as ONE attribute holding the complete CSS value, per state** — not as five
attributes, and not as a structured object. Three of four raters' evidence converges on it, the one
dissent turned out to rest on a claim that is false in this codebase, and the sanitiser the shape
needs **is already written and sitting unused** in the repo.

**And the overlay remodel is mostly already decided** — "the overlay IS the background colour" is
ruled doctrine (D536, 2026-08-08) and the media already paints behind it. What is genuinely new is
moving the control into the Colour panel and adding a hover state, which does not exist on the
shared wrapper at all today.

---

## Stage 4 — TRUSTED diagnostics (triangulated across ≥2 raters)

1. **The current five-attribute shape is lossy and duplicated.** `GradientOverlayControl.js:38-53`
   admits only a linear two-stop gradient is saved; radial collapses to first/last colour, 3+ stops
   collapse to first+last. `sgs/hero` alone carries **three** byte-for-byte copies of the same
   five-line `sprintf` reconstruction (`render.php:654-662`, `:673-677`, `:722-733`). (A, B)
2. **Neither shape delivers token-aware gradient stops today, and that is not a storage problem.**
   WP's `GradientPicker` renders a bare `ColorPicker` per stop, never `ColorPalette`, so a stop
   cannot be set to a theme colour by any storage shape. Bean already ruled a bespoke stop editor
   "not worth the time" (D3/D582, 2026-08-11). (B, corroborated by contract §1 field 8)
3. **Both one-attribute shapes fix a recorded clone-time crash class.** `AmbiguousLayerAttrError`
   was caused by three gradient attrs claiming one `css_property` on one element; collapsing to one
   attribute removes the tie to break. (A, B)
4. **"Overlay = background colour" is already the ruled doctrine and the code already implements
   it.** The `$has_any_bg &&` gate was removed 2026-08-08; media paints at `z-index:-1` beneath the
   colour layer; native `supports.color.background` is already stripped from container, cta-section,
   trust-bar and hero. (D)
5. **Hover-on-background is a genuinely NEW capability.** Zero `hover` matches anywhere in
   `class-sgs-container-wrapper.php`; no hover pattern exists on the shared wrapper to mirror. (D)

## Stage 4 — HYPOTHESIS proposals and their verdicts

| # | Proposal | Verdict |
|---|---|---|
| P-1 | **Shape S** — one attribute holding the complete CSS gradient string, per state | **validated** |
| P-2 | **Shape O** — one attribute holding `{type, angle, stops[], position}` | **falsified** (see below) |
| P-3 | **Overlay becomes a Colour-panel row with resting + hover states**; media controls stay in the Background panel | **validated, with one premise corrected** |

## Stage 5 — empirical validation

### P-2 falsified: the decisive objection to Shape S is false in this codebase

Rater B's case for the object shape rested on one claim: *"Shape S needs a brand-new gradient-string
extractor built from scratch on the converter's output side."*

**Measured, and it is the opposite.** `scripts/converter/services/pseudo_overlay.py` (376 lines)
**already receives a CSS gradient string from the draft and decomposes it** — `parse_overlay_background`
(`:222-250`) splits stops on top-level commas and writes first/last colour into
`overlayGradientFrom`/`To`. Its own docstring records the cost of that decomposition: *"≥2 stops
required; a single-stop gradient is not mappable — falls to the honest-gap path."*

So under Shape S the converter would **store the draft's string verbatim and delete the
decomposition** — less code, not more. It would also *raise clone fidelity*, because radial and
single-stop draft gradients currently fall into the gap path and would stop doing so.

- **Falsifiable prediction:** adopting Shape S reduces gradient-handling code rather than adding it.
- **Baseline:** `pseudo_overlay.py` = 376 lines; `GradientOverlayControl.js` = 320 lines, containing
  a `parseLinearGradient`/`buildGradientCss` pair that exists only to bridge string↔scalars.
- **Commit gate for the eventual build:** do not commit if the net line count across those two files
  goes UP, or if any draft gradient that clones today stops cloning.

Rater B's remaining finding stands and is worth keeping: gradient stops are excluded from the
converter's token-snapping today, so *neither* shape is token-aware without further work.

### P-1 validated: the sanitiser Shape S needs already exists, unused

`includes/helpers-tokens.php:696-717`, `sgs_css_gradient_value()` — verified by direct read. It
exact-matches `^(repeating-)?(linear|radial|conic)-gradient\(...\)$` against a safe character class,
then rejects breakout/URL/markup patterns. **Zero call sites** (only a docblock mention in
`render-helpers.php:10`).

⭐ Note the character class permits letters, digits, hyphens and parentheses — so
`linear-gradient(135deg, var(--wp--preset--color--accent) 0%, ...)` **passes this validator today**.
Shape S is therefore not permanently token-blind: if SGS ever builds its own per-stop palette
picker, it can write `var()` stops into a Shape-S value with no storage migration. That removes the
only durable advantage the object shape had.

### P-3 validated, with a premise correction

- **Corrected:** Bean's brief named "gradient parallax" as an overlay-serving control to move into
  the Colour panel. Rater D found no code tying `bgParallax` or `bgKenBurns` to the gradient path —
  both are media-layer modifiers (`background-attachment:fixed`, image zoom) that behave identically
  whether the background is flat or gradient. **They belong with the media, not the colour.**
- **Already satisfied:** the requirement to "make sure the media sits behind the background colour"
  needs no work — media is at `z-index:-1`, the colour layer at `0`, content at `1`.
- **Genuinely new:** the hover state, and the panel relocation.

## The market evidence (Rater C — answers "why does Kadence use each?")

**Kadence's split is repeater-vs-standalone, not block type.** Same feature, same plugin:
`singlebtn/block.json` stores `"gradient": {"type":"string"}`; `advancedbtn` stores each repeater
row's gradient as `["#999999", 1, 0, 100, "linear", 180, "center center"]` because PHP recomputes
base *and* hover variants per row from those raw fields, and a repeater needs a cloneable per-row
default. Every Kadence block with a standalone gradient uses the string.

| Library | Shape | Source |
|---|---|---|
| WP core | slug attr + full CSS string in `style.color.gradient` | `hooks/color.js` |
| Kadence, standalone attrs | plain string | `rowlayout`/`column`/`image`/`singlebtn` `block.json` |
| Kadence, repeater rows | 7-value array in one attr | `class-kadence-blocks-advancedbtn-block.php` |
| Otter | plain string ("Reuse Gradient Control from Core" — their changelog) | `blocks/flip/edit.tsx` |
| **Spectra (ground-up rebuild on modern core APIs)** | **string per state** — `backgroundGradient`, `backgroundGradientHover`, `backgroundGradientActive`, `backgroundGradientActiveHover` | `button`/`tabs`/`accordion` `block.json` |
| Stackable | decomposed siblings + `backgroundColorType` discriminator | `block-components/helpers/backgrounds/attributes.js` |

⭐ **Spectra's per-state sibling strings are the closest match to SGS's own colour-row state model**
and are the single strongest signal, because Spectra chose it while rebuilding from scratch today.

⚠ **Gaps recorded, not guessed:** GitHub rate-limited repeatedly; Kadence's editor-side gradient
component was not located, Kadence git history was not reachable, and legacy Spectra's storage was
not found at all. Those are "not found in what was searched", never "does not exist".

## Recommended shape

Per colour row that gets gradient capability, per state:

```
colourBackground              string   ""   // flat — a palette slug (D619) or a literal
colourBackgroundGradient      string   ""   // complete CSS gradient; non-empty WINS
colourBackgroundHover         string   ""
colourBackgroundGradientHover string   ""
```

- **No boolean discriminator** — non-empty gradient wins, exactly as core resolves it.
- **One CSS property at render** — `background: <value>`, which legally accepts either a colour or a
  gradient. Kadence emits precisely this. ⚠ `sgs/separator` is the real exception (`border-image`
  plus a trailing ` 1` slice token) and keeps its own branch.
- **Every emission routed through `sgs_css_gradient_value()`** — wiring its first call site.

## Breakage list (must move in ONE commit)

`container` · `hero` (3 independent gradient sites) · `cta-section` · `trust-bar` · `site-header` ·
`site-footer` · `separator` · `GradientOverlayControl.js`'s `DEFAULT_ATTR_NAMES` and all ~6
`attrNames` call sites · `theme/sgs-theme/patterns/hero-video-background.php:12` (authors
`backgroundOverlayColour` literally — WordPress silently discards an attribute a block no longer
declares, D338) · `converter/services/pseudo_overlay.py:61-66` hardcoded attr-name constants ·
`converter/tests/test_pseudo_overlay_lift.py`.

⛔ **Existing stored content.** `deprecated.js` is banned framework-wide (D270) and there are no
pre-production version bumps (D293), so a value transformation needs a one-off WP-CLI migration
script or existing gradients are lost. Cost this before building.

---

## ⛔ POST-COUNCIL CORRECTIONS — Bean, same day, after reading this report

Three of this report's conclusions are amended. Read these before acting on anything above.

1. **The migration cost is struck.** "Existing stored content needs a one-off WP-CLI migration or
   gradients are lost" was named the largest cost of changing shape. Bean: no migration is required
   — the canary's stored gradients are disposable. The storage change is therefore materially
   cheaper than this report concluded.

2. **Rater D answered the wrong parallax question, and P-3's correction is partly withdrawn.** This
   report said parallax is a media modifier with no gradient relationship, so it should stay with the
   media. Rater D searched for a link between the EXISTING `bgParallax` (which is
   `background-attachment:fixed` on media) and the gradient path — correctly finding none. But the
   effect Bean means is a different one that does not exist yet: **a gradient whose colour stops
   shift position as the page scrolls, with no media involved at all.** "No code ties parallax to
   gradients" is true and is not evidence about a feature that has not been built. Under
   investigation as its own item.

3. **Hover-on-background is ordinary work, not a new capability class.** Rater D correctly measured
   zero `hover` matches in the shared wrapper and concluded this needs separate scoping. Bean's
   ruling reframes it: it is one more state on a colour row plus a `:hover` rule, exactly as
   `sgs/button` already works. Only the layering against background media is genuinely
   wrapper-specific.

4. **The palette-per-stop abandonment (D3/D582) is RE-OPENED.** TRUSTED diagnostic #2 above — "no
   storage shape can deliver token-aware stops, because WP's picker renders a bare `ColorPicker`" —
   is accurate about *core's* control but was treated as a permanent constraint. It is not: it only
   binds while SGS extends core's sealed `GradientPicker`. SGS now composes its own popover
   (`DesignTokenPicker` = `Dropdown` + native `ColorPalette`), so the palette-capable picker can be
   mounted per stop. Feasibility is under investigation; if it holds, palette-linked gradient stops
   become available under either storage shape, and the token argument stops being a tie-breaker at
   all.

⭐ **What survives all four corrections: the recommendation itself.** Shape S still wins — the
validator already exists, the converter's decomposition still gets deleted rather than written, and
Spectra's per-state sibling strings still match SGS's state model. Correction 4 in fact strengthens
it, because the existing validator already accepts `var(--wp--preset--color--X)` inside a gradient
string, so palette-linked stops need no storage change.

## Saved

Catching P-2 pre-dispatch avoided building a structured-object shape plus its normaliser, its
object-coercion defence, and a converter change — against a codebase whose existing gradient parser
would have had to stay. Roughly one build wave plus its review cycle.
