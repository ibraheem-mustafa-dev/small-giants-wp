# Session Handoff — 2026-06-01 (hero fix-shape: qc-council rejects H2, locks H-conv §FR-22-19; trust-bar reframed dual-mode §FR-24-10)

## What happened this session (docs-only; NO code shipped — by design)
This session did the disciplined front-half of a sensitive converter change: **full read → code-level root-cause → 3-rater qc-council → build-ready design captured**. No code was rammed at a context-heavy tail (STOP #19/#32). The qc gate PREVENTED a wrong build.

1. **Verified the entry state** — git showed Wave-2/A-1 were already verified on the canary (run 223313, commit `0f52a3ba`, pre-session): 6/7 sections structurally green; **hero is the one RED section**.
2. **Completed the full MANDATORY READING LIST** (Spec 22 full, TRUTH-SPEC, decisions D102-D124, Spec 21, Spec 24, flow, wireframe) + the ground-truth converter output for hero + trust-bar + the walker code.
3. **Code-level root-cause:**
   - **Hero double-wrapper:** the walker emits the hero interior as two generic `sgs/container` columns (§FR-22-4.1); render.php ALSO wraps `$content` in `.sgs-hero__content` + renders its own scalar media column → double `.sgs-hero__content` + classless `sgs/media` children. KEY FINDING (reading render.php:760-788): **render.php is ALREADY correct** — its 169-attr image pipeline + the `--mobile/--desktop` art-direction `@media` CSS already work for a bare-content + scalar-media model. So the fix is CONVERTER-side, not block-side.
   - **Trust-bar:** renders 4 badges via its DEFAULT `items` (coincidental Mama's match), ignoring the converter's emitted badge InnerBlocks.
4. **3-rater qc-council** (compliance / pipeline-impact / universality) on the hero fix-shape:
   - **REJECTED H2** (block thin-shell + images→sgs/media + universal className-preservation): retires the hero's image pipeline + art-direction onto sgs/media (can't replicate) → violates "preserve full functionality"; blast radius 7 sections + 5 block files + a migration + invalidates the pixel-diff baseline.
   - **CHOSE H-conv** (converter routes content→bare `$content` InnerBlocks; images→scalar `splitImage`/`splitImageMobile`): render.php/edit.js/block.json UNCHANGED; 1-section blast radius; preserves all functionality; universal across the 4 `wraps_block` composites (hero/cta-section/modal/quote) + the FR-22-6 roster.
5. **Captured the design:** Spec 22 **§FR-22-19** (hero H-conv + build sequence + the OPEN GAP: a DB-first mapping of a composite's media-column BEM element → its scalar attr target — never a per-block slug conditional). Spec 24 **§FR-24-10** (trust-bar dual-mode — Typed curated repeater OR Bound `echo $content`, same pattern as product-card). Decisions D125-D127. Parking updated. Council brief at `.claude/scratch/2026-06-01-hero-fix-shape-qc-brief.md`.

## Current state
- **Branch:** `feat/fr22-4-1-universal-wrapper` (NOT merged; main clean). Docs committed this session; no code.
- **Hero:** fix-shape LOCKED = §FR-22-19 H-conv; build pending (focused session — sensitive walker work + the OPEN GAP to close DB-first).
- **Trust-bar:** fix-shape = §FR-24-10 dual-mode; build pending (after hero).
- Canary 144 = run-223313 build (hero still RED).

## Next priorities (full detail + build sequence in next-session-prompt.md)
1. **Build hero §FR-22-19 (H-conv)** — DB role reclassification → close the OPEN GAP (DB-first media-BEM→scalar mapping) → convert.py slot-router → live-DOM gate + roll-back-fast.
2. **Build trust-bar §FR-24-10 dual-mode.**
3. product-card full dual-mode (spec variation-sets FIRST); A-1 Phase 2; generalise §FR-22-19 to cta-section/modal/quote.

## Mistakes AVOIDED this session (the methodology working)
Reading the full render.php flipped H2→H-conv (STOP #30/#31). The qc-council caught H2's functionality loss before it shipped (blub.db 255). Sensitive walker change deferred to a focused build, not rammed (STOP #19/#32). New STOP entries #30/#31/#32 added to next-session-prompt.

## Next Session Prompt
See `.claude/next-session-prompt.md` — STOP catalogue #1-#32 (was #1-#29), 16-item reading list, 10-question ritual, the §FR-22-19 build sequence + the OPEN GAP, §FR-24-10 dual-mode. Structural defences carried forward + extended per D101 (counts all up).
