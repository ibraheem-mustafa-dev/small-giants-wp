---
block: team-member
date: 2026-07-21
verdict: PASS
first_paint_capture_passed: true
target: sandybrown-nightingale-600381.hostingersite.com
change: "Task 4c — resting shadow base attr (Bean option A, token fallback)"
---

# team-member resting-state fix — visual verification

## What changed
sgs/team-member had `shadowHover` but no resting shadow attribute; the resting shadow was
hardcoded at style.css:28 (`box-shadow: var(--wp--preset--shadow--md)`) on the
`--elevated` card style. A client could style the card's shadow on hover but not at rest.
Added `cardShadow`, following the card-grid pattern shipped at 6ea12136.

## Deploy provenance
- Isolated worktree `C:/tmp/sgs-sv` at scratch SHA `6b09e339`; shared `main` never switched.
- `build-deploy.py --target sandybrown --blocks-only --skip-build`, exit 0.
- Shipped-code proof by CHECKSUM: local == server
  `build/blocks/team-member/style-index.css` = `c457fb850df55a525578c28bf49ff826`.

## Method
Two published pages, identical block content, differing only in the new attr:
- untouched  → /sv-team-untouched/  (page 1560)
- client-set → /sv-team-client-set/ (page 1561, cardShadow "0 20px 40px rgba(255,0,0,0.9)")

## Results — computed styles on the live card

| | untouched | client-set |
|---|---|---|
| box-shadow | `rgba(0,0,0,0.1) 0px 4px 12px` (theme `--wp--preset--shadow--md`) | `rgba(255,0,0,0.9) 0px 20px 40px` |
| `--sgs-card-shadow` | UNSET — no override emitted | `0 20px 40px #FF0000E6` |
| inline style attr | transition vars only | transition vars + `--sgs-card-shadow` |

## Verdict
PASS. Option A confirmed: the untouched card resolves to the THEME token, not a baked
literal, so per-client theming via theme-snapshot.json (Spec 33) keeps tracking. The
override is emitted as a custom-property VALUE, never an inline property declaration
(Spec 32).

Manifest: team-member's STATE_WITHOUT_BASE finding is now STATE_OK.
Global STATE_WITHOUT_BASE is now 0 (was 4).

## Not covered
ShadowControl inspector panel verified by live REST attribute registration (cardShadow
REGISTERED, 83 attrs total) and frontend render, NOT by opening the block editor UI.
ShadowControl has crashed on first live render before despite passing 180 unit tests, so
a human eye on this panel is specifically worth having (R-31-13).
