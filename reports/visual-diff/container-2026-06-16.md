# Visual-diff report — sgs/container (wrapper grid de-cheat) — 2026-06-16

verdict: PASS
first_paint_capture_passed: true
block: container
change: gate sgs-cols-* on empty ratio + unify device-tier breakpoints 599→767 (768/1024 standard)
decision: D228

## What changed (device-tier grid system only)
- `class-sgs-container-wrapper.php`: emit `sgs-cols-{tablet,mobile}-N` shorthand classes ONLY when that tier has no explicit `gridTemplateColumns*` ratio (so the faithful `@media grid-template-columns` rule wins instead of being crushed by `repeat(N,1fr) !important`). Device-tier mobile breakpoint `599→767` everywhere; tablet `1023` kept.
- `container/style.css`: `sgs-cols-*` tablet boundary `max-width:1024px → 1023px`; mobile `767` already correct.
- `container/block.json`: version `0.2.0 → 0.2.1` (CDN cache-bust).

## Verification evidence (live, canary page 8 — sandybrown)
- **Live Playwright DOM, 1440px (post-deploy):** the hero now matches trust-bar EXACTLY — `maxWidth: none`, `margin-inline: -16px/-16px`, right-gap 15px (scrollbar). The feature-grid renders `grid-template-columns: 473px 473px` (2 equal cols) — faithful. 45 containers render; zero width anomalies. No desktop regression.
- **Conformance gate (Gate A golden harness):** 43 passed, 0 regressions (the golden grid markup unchanged — no container lost an `sgs-cols-*` class because none of the goldens carry an explicit ratio).
- **Full /sgs-clone + parity2 baseline (run mamas-munches-homepage-2026-06-16-181545):** content 100% across all 9 sections; stage-11 `wait_fonts` gate PASS on all 27 capture cells (`first_paint_capture_passed`); full fidelity 61.82% mobile (remaining work is the next-session grid rebuild, not a regression from this change).

## first-paint capture
- stage-11 FR-22-7 `wait_fonts` gate: PASS — all 27 cells report `wait_fonts=true` (fonts loaded before capture, so the diff is not a FOUT artefact).

## Scope note
This is the DEVICE-TIER grid system (the Mobile/Tablet/Desktop attr render path), not arbitrary visual breakpoints. Per D228, individual blocks' design-driven visual breakpoints (min-width:600, WP-columns 781) are deliberately untouched.
