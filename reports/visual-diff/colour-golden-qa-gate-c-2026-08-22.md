---
report: QA Gate C — colour-golden track
date: 2026-08-22
target: sandybrown (the only canary)
deployed: main @ 4fcf4a2d (merge of fix/nav-drawer-editor-canvas)
verdict: PASS
intent_capture_passed: true
---

# QA Gate C — colour-golden, 2026-08-22

Settles the visual-diff skips logged across this session. Each was taken with a
written reason naming what had to be proven live; this is that proof.

METHOD. Probe pages authored via the REST API with the exact attribute
COMBINATIONS the defects require, then two independent readings:
  1. the block CSS as SERVED — fetched from `uploads/sgs-css/<hash>.css`, not the
     page HTML. ⛔ SGS block CSS is LIFTED to an external file; grepping the page
     source finds nothing and proves nothing, which cost a false negative here
     before the stylesheet was fetched.
  2. `getComputedStyle()` on the real element AND on its `::after`, at 1440px.
Probe pages deleted afterwards — canary content is a test rig.

## Results

| # | Assertion | Verdict |
|---|---|---|
| A | `sgs/heading` with a background AND a text gradient renders BOTH | PASS |
| B | a heading inside a container that has its own background keeps its own backdrop | PASS |
| C | `sgs/label`'s NEW text gradient renders | PASS |
| C2 | `sgs/label` background paints on the `::after` layer | PASS |
| D | drop-cap hover colour set ALONE takes effect, on `::first-letter` only | PASS |
| E/F | `sgs/text` with a background AND a text gradient renders BOTH | PASS |

## Evidence

A — `.sgs-hdg-….wp-block-sgs-heading` carries
`background-image:linear-gradient(…);background-clip:text;color:transparent`,
and `::after` carries `background-color:var(--wp--preset--color--primary)` at
`z-index:-1`. Computed: `isolation:isolate`, `position:relative`,
`::after` background `rgb(230,138,149)`. The two capabilities coexist; before
this fix the text gradient overwrote the background outright (same
`background-image` property) or clipped it to the glyph shapes.

B — THE ASSERTION NO STATIC CHECK COULD SETTLE. Computed `isolation:isolate`
with `::after` painting `rgb(230,138,149)`. Without the stacking context a
`z-index:-1` layer sinks behind the ancestor's background and computes to
nothing; the heading would silently lose its backdrop.

D — emitted:
`.wp-block-sgs-text.{uid}:hover::first-letter,.wp-block-sgs-text.{uid}:focus-visible::first-letter{color:var(--wp--preset--color--primary);}`
Proves BOTH halves of that fix: the rule fired with ONLY `firstLetterColourHover`
set, which the pre-fix code could not do (`$has_hover` never tested it, and the
inner gate required an already-non-empty array); and it targets `::first-letter`
rather than the root, so it recolours the drop cap instead of the whole
paragraph. Both selectors are written out in full — a pseudo-element appended to
an imploded selector list binds to the LAST selector only.

F — `sgs/text`, background `accent` + text gradient. Computed:
element `color:rgba(0,0,0,0)` with the gradient clipped to the glyphs,
`::after` background `rgb(245,208,80)`, `z-index:-1`.

## Tokens survive

Every background resolved to `var(--wp--preset--color--…)`, never a raw hex, so a
client's brand token still follows a palette change through the relocated paint
path. That was a live risk: the preset-class fold could have baked in a resolved
colour and silently unlinked the token — the defect D717 and D740 each shipped.

## One case that read as a failure and was not

An earlier probe set `backgroundColour:"secondary"` and its `::after` computed
`rgba(0,0,0,0)`. Cause: `secondary` is NOT in this theme's palette (21 slugs,
`primary` yes, `secondary` no), so `var()` resolved to nothing. A bad test value,
not a defect — re-run with `accent` and it paints. Recorded because a transparent
computed value looks exactly like a broken layer.

## Still owed

Not covered here — these need an editor session, not a rendered page:
  - pick a palette colour in the EDITOR, save, RELOAD, assert the STORED value is
    the slug and not a hex
  - hover repaint under a REAL pointer (this gate proves the rule is emitted and
    correctly targeted; it does not exercise the hover)
  - `sgs/nav-drawer`'s background image, drawer text colour and background
    gradient — the drawer needs to be opened
