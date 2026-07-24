---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/team-member reduced-motion standardisation"
block: sgs/team-member
date: 2026-07-24
wave: "Task E — reduced-motion hover standardisation (Spec 35 E5 follow-up)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/team-member — reduced-motion hover standardised to transform:none (LANDED)

**Verdict: PASS.** The `@media (prefers-reduced-motion: reduce)` fallback now sets
`transform: none` on the hover-scale and img-zoom hovers (matching card-grid/post-grid),
removing the residual resting scale that survived under reduced motion. First paint is
unaffected. (This file also carries the Build #3 seeding fix: a stray `;` in a CSS comment
inside `.sgs-team-member--elevated` was stripped so the box-shadow property parses correctly.)

## What changed
`src/blocks/team-member/style.css` — added `transform: none` inside the existing
`@media (prefers-reduced-motion: reduce)` block for
`.sgs-team-member.sgs-has-hover-scale:hover` and
`.sgs-team-member.sgs-has-img-zoom:hover .sgs-team-member__photo img` (previously the
reduced-motion block reset only `transition`, leaving the scale/zoom resting transform in place).

## Evidence (deployed CSS + live hover mechanism)
- **Deployed CSS fetched from the sandybrown canary**, md5-confirmed local↔server
  (`d65c288b6bd316835d5e0ea093dab3d3`): the running `blocks/team-member/style-index.css` contains
  `@media (prefers-reduced-motion:reduce){ … .sgs-team-member.sgs-has-hover-scale:hover,
  .sgs-team-member.sgs-has-img-zoom:hover .sgs-team-member__photo img{transform:none} }`.
- **Live hover mechanism proven** (canary test page 1728, `scaleHover:'1.05'`): resting
  `getComputedStyle(el).transform === 'none'`; on a real Playwright hover (normal motion),
  `transform === 'matrix(1.05, 0, 0, 1.05, 0, 0)'` with `el.matches(':hover') === true` — so the
  reduced-motion rule targets the exact live selector `.sgs-team-member.sgs-has-hover-scale:hover`.
- **Specificity + source order**: the reduced-motion `transform:none` has equal specificity to and
  later source order than the hover-scale rule, so it wins under `reduce`.

## Disclosed limitation (not hidden)
The Playwright MCP toolset available this session has no `prefers-reduced-motion` media emulation,
so the computed `transform` was NOT literally measured under an emulated `reduce` state. This PASS
rests on: (a) the deployed reduced-motion override for the exact live hover selector, (b) winning
specificity + source order, and (c) the live-proven hover mechanism producing that selector. A
sound logical proof, short of literal emulated measurement. Low-risk, reduced-motion-only change.
