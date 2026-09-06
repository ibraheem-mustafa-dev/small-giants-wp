---
verdict: PASS
intent_capture_passed: true
date: 2026-08-18
blocks: [hero, icon-list, process-steps, testimonial]
fixture: https://sandybrown-nightingale-600381.hostingersite.com/s1-probe-spec32/ (page 2502)
---

# `:focus-within` twins — live verification (Spec 32 v1.6 §5 NFR)

Single live capture against a stated assertion (`intent_capture_passed`), because there is no
pre-change baseline: these blocks rendered on NO canary page before this session, which is precisely
why the gate had nothing to diff against.

## Assertion
Adding a `:focus-within` twin to each `:hover` selector gives keyboard users the state that was
mouse-only, AND changes nothing at first paint.

## Why the gate was right to block this
`:hover` needs a pointer. **`:focus-within` can be true at first paint** — restored focus, a deep
link, autofocus. So this is genuinely not "interaction-only" CSS, and `check-interaction-only-css.py`
correctly refused to auto-exempt it.

## Measured, live

**Deployed:** `payload-verify PASS: all 83 deployed block.json match the payload`. Rules present in
the served per-block stylesheets: hero 2 · icon-list 3 · process-steps 8 · testimonial 8 = **21**.

**At rest — the first-paint risk, DISPROVEN:**
```
nothingMatches : true      (no :focus-within selector matches with nothing focused)
activeElement  : BODY
```

**Under focus — the state actually applies (sgs/icon-list):**
```
containerMatchedFocusWithin : true
icon transform at rest      : none
icon transform under focus  : matrix(1.05, 0, 0, 1.05, 0, 0)
restoredAfterBlur           : true
```
Matched by content (the item carrying `url: https://example.com/i1`), not by position.

## ⚠ Honest limitation — 2 of the 4 blocks are currently INERT

| Block | instances | with a focusable descendant |
|---|---|---|
| icon-list | 2 | **2** — proven working above |
| process-steps | 2 | **0** |
| testimonial | 1 | **0** |
| hero | 0 on this page | n/a — has CTAs by design; rule correct, not directly exercised |

`process-steps.steps[]` (`description`/`icon`/`number`/`title`) and `sgs/testimonial` declare **no
url/link property at all**, so they render nothing focusable and their `:focus-within` rules cannot
fire from their own content.

**This is not the defect the change was fixing, and it is not harmful.** A `:focus-visible` rule on a
non-focusable container can NEVER match; a `:focus-within` rule matches the moment any descendant
becomes focusable — a nested child block, or a future `url` property. It is correct-and-dormant, not
dead. But the a11y benefit TODAY is real only for `icon-list` and `hero`, and this report says so
rather than implying all four blocks gained a keyboard-reachable state.

**Follow-up (not done here):** decide whether `process-steps` / `testimonial` should expose a link
property at all. That is a block-capability question for Spec 35, not a styling-contract question.
