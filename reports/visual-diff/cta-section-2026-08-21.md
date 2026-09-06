# Visual diff — sgs/cta-section — 2026-08-21 (root text colour reachable + gradients)

verdict: PASS
intent_capture_passed: true
source_sha: 6b3b30ab38d3ec38

## What changed

`sgs/cta-section` gets a reachable root text colour and the gradient siblings:
`textColourGradient` + `textColourHoverGradient` added; `supports.color.text` switched
OFF; the wrapper element wired to `textColour`/`textColourGradient` with a hover state;
the headline's dead `native:color.text` mapping removed; hover text routed through the
shared resolver; and a **new `text` row in the block's `SgsColourPanel`**.

## Assertions — stated BEFORE measuring

- **A1.** `textColour` and `textColourHover` ALREADY existed and were ALREADY rendered, but
  had **no editor control anywhere on this block** — a client could not reach either.
  `grep -c textColour edit.js` returned **0**. This is a dead-control fix, not a new feature.
- **A2.** Switching `supports.color.text` off is safe: **zero** authorings use native text
  colour. Measured across `theme/` and `sites/` — 13 files author `wp:sgs/cta-section`, none
  carries `textColor` or a `"color":{` style block.
- **A3.** Leaving `supports.color.text` ON while adding an `SgsColourPanel` text row would
  put WordPress's native colour UI in competition with it — a rule-31 violation
  (`31-golden-colour-control.js`, check *(1) native-colour-ui*). So the flag had to move.
- **A4.** The flat resting colour keeps its existing preset-class path
  (`has-text-color` + `has-{slug}-color`); only a GRADIENT gets a declaration. Emitting the
  flat case as well would duplicate it. Same split `sgs/container` uses.
- **A5.** The headline's `css:color → native:color.text` mapping had to be REMOVED, not left:
  with the support disabled it would have become exactly the dead binding fixed on
  `sgs/container` in `0f2c167f`.

## Live result — DEPLOYED AND VERIFIED

Deployed `--blocks-only`, measured from the served bytes on fixture page 2595
(`/text-colour-verification/`), cache-busted. ⚠ SGS lifts block CSS into
`uploads/sgs-css/` — the page HTML carries none of it, so the lifted stylesheet is what to read.

**Resting colour — via the preset class, as designed (A4):**
`class="… wp-block-sgs-cta-section has-text-color has-success-color has-background
has-accent-background-color …"` ✅

**Hover — via a declaration, correctly paired:**
```css
.sgs-cta-section-d1531775.wp-block-sgs-cta-section:hover,
.sgs-cta-section-d1531775.wp-block-sgs-cta-section:focus-visible{color:var(--wp--preset--color--cookie-brown)}
```
✅ Both as TOKENS, not hexes.

⚠ **A false alarm worth recording, because the mechanism recurs.** On first check I reported
the preset classes MISSING and suspected my own `supports.color.text: false` change had
disabled them. It had not — I had piped the class list through `head -6` and the list is 16
classes long, so `has-text-color` was simply below the cut. Fourth truncation-induced
misreading in this session, same family as computing a selector's specificity from a
70-character slice. **Never conclude an absence from a truncated view.**

## Why `intent_capture` and not `first_paint_capture`

There is no meaningful "before" image: the control did not exist in the editor at all, so the
pre-state renders nothing for a client to compare against. A live check that the new row
paints proves more than a diff against absence.

## ⚠ A near-miss that was correctly refused first

A subagent was originally asked to "add `textColourGradient`, extending the row that exists".
It made **zero changes** and reported why, which was right: there was no row to extend, and
both shortcuts were traps — flipping `supports.color.gradients` on would have turned on
native gradient UI (a rule-31 violation), and building a row unilaterally was outside its
brief. Bean then authorised the row explicitly. Recorded because the refusal is what stopped
a divergent-but-plausible second pattern being established.

## Residual, named

- The `headline` element now has NO `css:color` mapping, so the conformance gate will report
  a GAP for it. That is honest: headline INHERITS the root colour the wrapper sets (D713). A
  wrong mapping would have been worse than a reported gap.
- The editor CANVAS does not preview the text colour — the same known parity gap `padding`
  and container's `textColour` already have.
