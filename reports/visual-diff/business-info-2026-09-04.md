# Visual diff — sgs/business-info — 2026-09-04

verdict: PASS (intent capture — not yet live-deployed)
intent_capture_passed: true
source_sha: b863f1f787e10f61

## What changed

Phase 3 (golden-colour text-gradient rollout, finishing commit `778879732`). Two attributes
gained a `{attr}Gradient` sibling so rule 31 (`missing-gradient`) stops flagging them:

- `textColour` → `textColourGradient` (new attribute, default `""`)
- `labelColour` → `labelColourGradient` (new attribute, default `""`)

Both moved OFF the block's existing `--sgs-bi-*` custom-property bridge and onto a direct
scoped declaration via the shared helpers (`sgs_resolve_text_colour_or_gradient()` →
`sgs_text_colour_decl()` → `sgs_text_colour_gradient_fallback_rule()`), the same mechanism
`sgs/counter`'s `numberColour`/`labelColour` already use. A custom property can hold a flat
colour but can never legally hold a CSS gradient, so the bridge had to go for these two
specifically (`iconColour`'s bridge is untouched — out of scope, and it already has its own
gradient sibling via a different mechanism, SVG stroke gradient).

`textColour` paints `.{uid}` (the wrapper, matches `.sgs-business-info-wrap`). `labelColour`'s
only real paint target is `.sgs-business-hours__day` (style.css:167) — the generic
`.sgs-business-info__label` span carries no colour rule of its own and only ever inherits, so
the gradient sibling follows the actual selector, not the nominal element name.

**`linkHoverTextColour` was assigned but NOT wired — flagged, not guessed at.** That attribute's
`color:` declaration lives exclusively inside
`@supports not ((background-clip:text) or (-webkit-background-clip:text))` (style.css:116-126) —
the branch that exists specifically because that browser CANNOT render `background-clip:text`.
Wiring a gradient sibling there via `sgs_text_colour_decl()`'s gradient branch would inject
`background-image:...;background-clip:text;color:transparent` into the exact block whose own
comment (style.css:114-115) says that shape "would render the credit INVISIBLE" — the very
regression the fallback exists to prevent. `linkHoverBackgroundImage` (already gradient-capable,
untouched) is this attribute's real gradient-capable sibling for supporting browsers; recommend
either an explicit rule-31 exemption for `linkHoverTextColour` or leaving it flagged for Bean.

## Why intent capture, not before/after

`textColourGradient`/`labelColourGradient` are new attributes with an empty default — no existing
content has ever been able to set them, so a before/after diff on any real page shows no
difference by construction. The unset behaviour is unchanged either way: when neither the flat
nor the gradient attr is set, `sgs_resolve_text_colour_or_gradient()` returns `''`, nothing is
emitted, and style.css's `var(--sgs-bi-text-colour, currentColor)` /
`var(--sgs-bi-label-colour, currentColor)` fallbacks resolve to `currentColor` exactly as before
(WCAG 1.4.3 inherit-from-container contract preserved).

## Verification run this session

- `php -l` clean on `render.php`.
- `node scripts/colour-codemod/survey.js --json`: `textColour` and `labelColour` both moved from
  `REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found` to
  `AUTOFIXABLE:wire-state-emitter`. `linkHoverTextColour` unchanged (still REFUSED, as flagged
  above — deliberately not touched). `iconColour`/`linkHoverBackgroundImage` unchanged.
- WPCS: 0 errors (pre-existing warning count only) on `render.php`.

## Risk

Additive + a mechanism swap that preserves identical unset-state behaviour. The only behaviour
change on an EXPLICITLY-set flat `textColour`/`labelColour` is the paint route (custom-property
→ direct scoped `color:` declaration) — same resolved colour, same cascade-winning selector
(the scoped `<style>` block still out-specifies style.css by source order). Not yet deployed or
live-verified on the canary — that is a later, centralised step in this session per the batch
build-deploy plan.

## Gates

`php -l` clean · WPCS 0 new errors · `node scripts/colour-codemod/survey.js` confirms the
expected verdict transition for both wired attributes. Live deploy + Playwright DOM probe
deferred to the session's centralised Step 3.
