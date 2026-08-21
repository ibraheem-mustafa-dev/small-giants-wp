---
doc_type: session-archive
project: small-giants-wp
date: 2026-08-21
note: "Moved VERBATIM out of LEDGER.md 2026-08-21 to bring the ledger back under its 24,576-byte cap. The track was already CLOSED with nothing pending; nothing was edited or dropped."
---

## ▶ TIER W (MOTION) TRACK — CLOSED 2026-08-21

**Status: SHIPPED, merged to `main`, deployed, live-verified. Nothing pending.**
Do not re-open this section to "continue" it — if you are here for motion work, the open
register is `.claude/plans/2026-07-31-motion-wave-D-client-readiness.md`, not this.

**What shipped.** Spec 38's fourth tier (Tier W / WebGL, D479) had **zero code** for
eighteen days while the spec, `specs/README.md`, the gap register and fourteen memory files
all described it as part of the system. It now exists, with one effect on its closed list:
**FR-38-29 surface treatments** — grain / halftone / duotone, GPU shaders applied to the
image a block already renders, offered on 15 image-bearing blocks.

- Substrate: `src/shared/effects/webgl/` — zero-dependency WebGL2 behind D479's
  `init / setUniform / destroy` interface. A Gate-A grep enforces that nothing outside that
  directory imports `renderer.js`, so "swappable in one file" is a CHECKED invariant.
- Motion: the treatment DEVELOPS IN on scroll (`uResolve` 1 → 0). Client toggle
  "Reveal on scroll", default ON.
- Colour: every treatment has a client colour, defaulted to the site palette and stored as
  palette slugs, so re-theming re-colours every treated image.
- **5,674 bytes gzip — 4.6% of the named 120KB Tier W allowance.**
- Canary `/tier-w-surface-canary/` (page 2594); probe
  `scripts/motion-qa/probe-tier-w-surface.mjs` → **23/23**, 1 honestly SKIPPED.
- Evidence: `reports/visual-diff/tier-w-surface-2026-08-21.md`.

**Owed, and deliberately not done** (all recorded in Spec 38 §3 FR-38-29, none silently
dropped):
- **Naked-`<img>`-root blocks no-op.** `sgs/decorative-image` renders its `<img>` AS the
  block root; the boot module looks for a nested one. 13 of 15 offered blocks nest theirs.
  Fixing needs a re-parent or wrapper, and that block's responsive tiers use compound
  selectors on the `<img>` — a design decision, not a patch.
- **`sgs/media` is not offered at all** — no fx panel, and `creates_panel=0` correctly will
  not create one. Escape hatch is `supports.sgs.fx.motionSurface: true` on that block.
- **`sgs/media` + `sgs/decorative-image` both violate a standing project rule**: they render
  an `<img>` and neither declares `imageControls`. Pre-existing.
- **Probe arm 7's GPU-tally assertion is unverifiable on a live page** and reports SKIPPED,
  never PASS.

**D-entries: LANDED as D714 / D715 / D716.** They were staged in a scratch file during the
build rather than written straight into `decisions.md`, because that file was carrying 91
uncommitted lines from the colour-golden track all session and committing it by path would
have swept their work into this branch. The colour-golden track merged them in on
2026-08-21; verified present and complete, and the scratch file is deleted.

**FR numbering:** FR-38-29, not 28 — `FR-38-28` is reserved by the Bean-signed but unbuilt
pointer-reactive-backgrounds design gate (`plans/2026-07-31-step7-cursor-follow-background-design-gate.md`).

### Separately answered this session: does FR-38-12 Flip animate? NO.

Not a bug in `fx-flip.js` — **do not let anyone "fix" it.** The site setting had never been
switched on, and with it on the effect still cannot animate because WooCommerce performs a
FULL PAGE NAVIGATION on a filter change (proven: a stamped `window` variable did not survive,
2 main-frame navigations, products 5 → 3). There is no client-side re-layout for
`Flip.from()` to animate — D426 recurring at the redirected target. The next question is a
WooCommerce one. Evidence + three candidate causes:
`reports/2026-08-21-flip-does-it-animate.md`. Setting restored to its found state.
