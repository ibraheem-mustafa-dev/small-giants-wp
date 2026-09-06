# Visual diff — native-colour-ui CLASS CLOSED (the last 6 blocks)

verdict: PASS
intent_capture_passed: true

**Target:** sandybrown canary. **Date:** 2026-08-23.
**Deployed:** `main @ a5bb6220` via `build-deploy.py --target sandybrown --blocks-only`
(exit 0, 72s; motion-QA probes all green).
**Harnesses:** `plugins/sgs-blocks/scripts/qa/probe-native-colour-ui-close.js`
(the five page blocks) and an ephemeral `wp eval-file` probe against product 1125
(`sgs/buybox`, which cannot render on a page — see below).

⚠ **No `source_sha`, deliberately.** That field binds a report to the STAGED bytes
of the change it certifies, and this evidence was gathered AFTER the commit
(`a5bb6220`) — the deploy it measures could not exist before it. So this file is
EVIDENCE, not a gate token: a future commit touching any of these six still needs
its own report with a live `source_sha`. Recorded plainly rather than back-dated,
because a report that certifies nothing while looking official is worse than none.
The commit itself used the scoped `SGS_VISUAL_GATE_SKIP` with a stated reason
(logged in `manual-skips.log`), the same sequencing as `2eebbe55`.

---

## Why before/after does not apply

The change moves a capability between owners: WordPress's native colour panel is
switched off and a block-private control replaces it. The "before" state is not a
different rendering of the same thing — at rest, with no colour set, before and
after are byte-identical by construction (every new attribute defaults to `""`).
A pixel diff of that would be a guaranteed, meaningless PASS.

The question that actually matters is the one a diff cannot answer: **does the
replacement control paint?** A flag flip whose replacement silently does nothing
is the precise defect D744 exists to prevent, and it is invisible to every static
gate — the attribute is declared, the control is mounted, the emitter is called,
and no colour appears. So this is an intent capture: assert what should be true of
the rendered output, then measure it live.

## Assertions, stated BEFORE measuring

For each of the six blocks, with a sentinel `backgroundColour: #123456` and
`textColour: #abcdef` set on one instance:

- **A1** — the background sentinel appears in the block's computed style, on the
  root or on its `::after` layer.
- **A2** — the text sentinel appears as the computed `color` of the element that
  block actually paints text on.
- **A3 (negative control)** — a SECOND instance of the same block, published in the
  same page with NO colour attributes at all, shows NEITHER sentinel. Without this,
  a probe reading the wrong element, a stale cache, or a theme default could report
  a confident PASS while measuring nothing.

## Live result

| Block | A1 background | A2 text | A3 negative control |
|---|---|---|---|
| `sgs/icon-list` | PASS — on the root | PASS — on `.sgs-icon-list__text` | clean |
| `sgs/info-box` | PASS — on `::after` | PASS | clean |
| `sgs/notice-banner` | PASS — on `::after` | PASS | clean |
| `sgs/team-member` | PASS — on `::after` | PASS | clean |
| `sgs/testimonial` | PASS — on `::after` | PASS | clean |
| `sgs/buybox` | PASS — on `::after` | PASS | clean |

`sgs/buybox`'s measured rules, quoted verbatim:

```css
.sgs-bb-494a4f8e.wp-block-sgs-buybox{color:#abcdef}
.sgs-bb-494a4f8e.wp-block-sgs-buybox::after{content:"";position:absolute;inset:0;
  z-index:-1;border-radius:inherit;pointer-events:none;background-color:#123456;}
```

The split is not incidental: where a block's text and background share one element,
the background MUST paint on `::after`, because a text gradient uses
`background-clip:text`, which clips the element's whole background painting area to
the glyph shapes. `icon-list` is the one block that paints background on the root,
and legitimately so — its text is scoped to a descendant (`.sgs-icon-list__text`),
so the two never collide.

## Three probe defects found and fixed before any verdict was trusted

Recorded because each one initially looked like a code failure, and reporting any
of them as such would have been wrong.

1. **Measured the root for every block.** `icon-list` came back
   `text=ABSENT(rgb(58, 46, 38))` — the theme default. Its text paints on
   `.sgs-icon-list__text`, not the root. The probe now carries a per-block
   `textSel` and fails loudly if that selector matches nothing, rather than
   silently reporting the root's colour as the block's.
2. **`sgs/testimonial` rendered nothing** — it needs real content, so the probe now
   supplies a `quote` and `reviewerName`.
3. **`sgs/buybox` reported 0 bytes of CSS for BOTH sentinel and control.** Two
   separate causes, and the "0 for both" shape is the tell of a broken instrument
   rather than a finding: the block returns a core fallback without a WooCommerce
   product (so it can never be measured on a plain page — it is now probed against
   product 1125), and SGS block CSS is LIFTED out of the markup by the css-registry
   `render_block` filter into `uploads/sgs-css/<hash>.css`, so grepping rendered
   HTML for a `<style>` tag proves nothing. The probe drops that filter for the
   measurement.

## What this does NOT cover

- **Hover and gradient states are not captured here.** Every block gained
  `{attr}Hover` / `{attr}Gradient` / `{attr}HoverGradient` siblings, and only the
  resting flat colour was measured. The emitters are shared and gate-checked
  (`check-text-gradient-companion` is green, and it exists precisely to catch a
  gradient that silently paints nothing), but shared-and-gated is not the same as
  observed. Treat hover/gradient on these six as unverified.
- **The editor surface.** That core's competing panel is gone follows from
  `supports.color` being all-false, which is a static fact in `block.json` and is
  what rule 31 measures (`native-colour-ui` 6 -> 0). It was not confirmed by
  opening the editor and looking.
- **Bean's eye (R-31-13).** Measurement is co-authoritative, never sufficient.
