# Visual diff — sgs/process-steps — 2026-09-04

verdict: PASS (static gates); live-capture DEFERRED to this session's centralised deploy step
intent_capture_passed: true
source_sha: bdcc23a90968b4b2

## What changed

Phase 3 golden-colour rollout (finishing 778879732's text-colour → gradient wiring, rule
`31-golden-colour-control` "missing-gradient"). Two attributes gain a gradient sibling:

- `titleColour` → `titleColourGradient` (element `title`, selector `.sgs-process-steps__title`)
- `descriptionColour` → `descriptionColourGradient` (element `description`, selector
  `.sgs-process-steps__description`)

`block.json`: both `{attr}Gradient` string attrs added (default `""`); `attrMap` on the `title`
and `description` elements gained `"css:background-image": "{attr}Gradient"`.

`render.php`: both colours now resolve via `sgs_resolve_text_colour_or_gradient()` →
`sgs_text_colour_decl()` → the mandatory `sgs_text_colour_gradient_fallback_rule()` companion,
mirroring `sgs/counter`'s `numberColour`/`labelColour` exemplar exactly. Flat-colour behaviour
is unchanged byte-for-byte when the gradient sibling is empty (the resolver falls through to
the existing flat value).

`edit.js`: both rows kept their existing raw `DesignTokenPicker` mount (a small, scoped
migration to `SgsColourPanel` was considered but rejected — see below) — `gradientValue`/
`onGradientChange` added directly to each row's single `states` entry (DesignTokenPicker's own
D636 gradient-toggle support, the same mechanism `sgs/trust-bar` and `sgs/google-reviews`
already use for a raw, non-panel-wrapped row). Canvas preview for both elements now uses
`resolveTextColourPreviewStyle()` instead of a hand-built `{ color: colourVar(...) }` object.

## SgsColourPanel-migration decision

Rejected migrating these two rows onto `SgsColourPanel`. Two reasons: (1) `SgsColourPanel`
hardcodes its `PanelBody` title to "Colour" with no per-caller override, and process-steps
deliberately keeps four differently-titled panels ("Step number badge" / "Step title" / "Step
description" / "Text & fill") per THE PLACEMENT RULE (D537) — migrating would collapse that
grouping. (2) `DesignTokenPicker` itself already supports a gradient-capable state
(`gradientValue`/`onGradientChange`, D636 border-gradient rollout) with no component swap
needed — smaller diff, and it stays visible to `scripts/colour-codemod/survey.js`'s census
(which only recognises the literal `DesignTokenPicker`/`SgsColourPanel` JSX names). A first
attempt swapped to `GradientCapableColourControl` directly; that made both rows silently
disappear from the survey's row list — caught before commit by re-running `survey.js` and
noticing the row count drop from 262 to 260 with no matching REFUSED verdicts. Reverted.

## Verification so far

- `node scripts/colour-codemod/survey.js --json`: `titleColour` and `descriptionColour` both
  moved from `REFUSED:no-gradient-capable-paint-path-found` to
  `AUTOFIXABLE:helper-at-existing-selector`. Total row count held at 262 throughout.
- `php -l src/blocks/process-steps/render.php` — clean.
- `git diff --stat` scoped to exactly `block.json` / `edit.js` / `render.php` for this block —
  no cross-block leakage.

## Why intent capture, not before/after

Both gradient attributes are brand new (`default: ""`) — no existing content has ever been able
to set them, so a before/after diff on any real page shows no difference by construction. Live
verification (does a resolved `linear-gradient(...)` actually reach the DOM, with a flat-colour
negative control) is this session's Step 3, run once across all four blocks together via the
gradient-roundtrip probe.

## Risk

Additive only — the new attribute defaults to empty and the resolver falls through to the
existing flat `titleColour`/`descriptionColour` value unchanged. No existing instance can
regress.

## Gates

`php -l` clean · `survey.js` census verdicts moved as expected, total unchanged at 262 ·
build/deploy/live-probe deferred to the session's centralised Step 3.
