---
doc_type: session-archive
project: small-giants-wp
swept: 2026-08-23
reason: "LEDGER byte cap. NOT fully closed — its owed follow-ups live in reports/2026-08-21-unenforced-prohibition-register.md, which this section already points to."
---

## ▶ DOC-DEBT / MOTION-REGISTER TRACK — 2026-08-21 (a THIRD track; all pushed)

**All on `origin/main`. Build GREEN. Canary deployed + live-verified.**

**⛔ Two live defects — read first:**
1. **`sgs/hero`'s overlay gradient was silently replaced by the flat colour** (`fc261fd3`).
   `$overlay_gradient` never existed — one reference, zero assignments, ever — so the null fell
   through to `background-color` and the overlay still painted, which is why it survived.
   Live-proven fixed with a negative control:
   `reports/visual-diff/hero-overlay-gradient-2026-08-21.md`. ⚠ Cause: an asymmetric pair,
   `backgroundOverlayColour` vs `overlayGradient`.
2. **I broke `main` for ~5 min** (`87d904a6`): a `'src/blocks/*/render.php'` GLOB satisfied the
   path-scoped-commit hook and swept the co-active track's half-done edit. **A glob over a
   shared directory is `git add -A` wearing a pathspec.** Enumerate exact filenames.

**⛔ THREE comments asserted the OPPOSITE of their own code** (nav-menu ×2, responsive-logo) —
this codebase's doc debt is confident wrongness, not verbosity.

**Shipped:** motion registers + Spec 38 swept · 121 sanitiser closures across 57 files onto 3
shared helpers already existing at 3% adoption · ~370 lines of narrative cut from 78 files ·
no-inline prose → one pointer per block · `R-22-14`→`R-31-14` ×14 · scroll-smoother → `tier='H'`.

**⛔ Detail, owed follow-ups, and the 11-gate-backed-vs-37-UNENFORCED split:
`.claude/reports/2026-08-21-unenforced-prohibition-register.md`. Read before continuing.**
