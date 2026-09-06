# Visual Diff Report: site-header (2026-09-03)

## Change Category
Gradient-capable text-colour paint path (survey row: `sgs/site-header` / `text` / `textColour`) — **REFUSED, no code changed**

## Changes Reviewed
None. This block was investigated and the requested change was refused.

## Why refused
`src/blocks/site-header/block.json` already carries an explicit, documented exemption
for this exact case:

```json
"colourExemptions": {
    "text": {
        "rule": "gradient",
        "reason": "A text gradient needs background-clip:text, which hijacks the
        element's own background box. On the header WRAPPER that would destroy the
        header background this same block paints. The mechanism is only valid on a
        leaf text element; this row colours the whole bar."
    }
}
```

The `textColour` row's owning element is `wrapper` — the SAME element that paints
`backgroundColour`/`backgroundColourGradient` for the whole header bar
(`css:background-color`, `css:background-color-gradient` are both mapped on it).
`sgs_text_colour_gradient_fallback_rule()`'s mechanism (used in the counter/tab/
site-footer-row/site-header-row fixes in this same batch) is `background-clip:text`
painted via `background-image`. Applying that to the `wrapper` element would compete
for the SAME `background-image`/`background-clip` box the header's own background
gradient already uses — the two features are mutually exclusive on a single element
that is both "the text colour surface" and "the whole-bar background surface". Setting
both a background gradient and a text gradient on this block would silently break one
of them.

This is not a case of "no element clearly owns the row" (block.json is unambiguous:
`wrapper` owns it) — it is a case where the row is owned by an element the codebase
has already, deliberately, ruled out for this specific capability, for a reason that
still holds. I did not override that documented decision, and did not add a `states`
entry to `wrapper` either (the task's explicit warning about this block's `scrolled`
state — the ~19-attribute `attrMap` under `states.scrolled` — was also respected: no
`states` block was touched).

## What I verified before refusing
- Read `src/blocks/site-header/block.json` in full (`supports.sgs.colourExemptions`,
  `elements.wrapper.attrMap`, `elements.wrapper.states.scrolled`).
- Read `src/blocks/site-header/render.php` around both the base `textColour` path
  (line ~74) and the `textColourScrolled` state path (line ~272) — both are the
  block-level background/colour surface, not a leaf text element.
- Confirmed `colourExemptions` is read by a DIFFERENT tool
  (`scripts/inspector-scan/rules/31-golden-colour-control.js`), not by
  `scripts/colour-codemod/survey.js` — the survey tool is exemption-blind, which is
  why it still flags this row as `REFUSED:gradient-not-extensible`. The survey's
  refusal and the schema's exemption are two independent signals that agree.

## Verdict
**verdict:** REFUSED

No files changed for this block. Recommend leaving the survey's
`no-gradient-capable-paint-path-found` verdict on this specific row as a permanent,
documented exception (or teaching `survey.js` to read `colourExemptions` so it stops
flagging rows the schema has already ruled out) rather than forcing a paint path that
would conflict with the header's background gradient.
