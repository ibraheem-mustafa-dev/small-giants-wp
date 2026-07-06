---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-07-06-D284
note: "LEAN snapshot. Full history -> memory/state-archive.md. This file holds ONLY the current pointer; detail lives in handoff.md + next-session-prompt.md (the SoT). Do NOT restate D-numbers / counts / commit hashes here - they drift. <=24576 bytes."
---

# small-giants-wp — State Snapshot (lean)

## Human Summary
**THE PRODUCT-CARD FRONT IS DONE (D284, 2026-07-06).** Two commits, both LANDED on page 8 + pushed: (1) the typed/cloned product-card's **option-picker now clones** — root-caused 3 gaps on the real Featured node (no array-content-lift capability, no packSizes item-schema, and the array lifter refused a plain-text LEAF item's own text); fixed with a new UNIVERSAL match layer **L1d** in `converter/resolvers/array_content.py` (leaf item lifts its own text; leaf-guarded) + block.json capability/schema + typed render emits the self-contained `sgs/option-picker` via render_block; content parity 96→100. (2) **typed-element un-hardcoding** — typed CTA now attr-driven (cta* via sgs_button_element_style_css + marker class), descColour/priceNoteColour/desc-line-height controls added, and the hardcoded **'Fraunces'** price font (a client font in a framework block — Bean caught it) swapped for `var(--wp--preset--font-family--display)`; editor preview mirrors the frontend picker. Gates 0 net-new; 2 cross-model /qc-council raters GO on Task 0. **Prompt Tasks 1+2 (CSS-property column seeding + capability-roster rollout) NOT done** — deliberately scoped out; both fully mapped for next session. 4 items parked. **NEXT = Task 1+2 (`prompts/2026-07-06-block-fixes-testimonial-button.md`) OR the untouched container L1-L4 cascade thread (`next-session-prompt.md`).**

<!-- prior (D282) -->
**THE PAGE-8 QC BATCH IS DONE (D282, 2026-07-06).** D2 is NO LONGER DEPLOYED into the page (debug log only, `SGS_EMIT_D2_PAGE=1` restores) — so the live page shows the HONEST gap set (parity 80/81/81 D2-masked → 69/70/70 honest), which surfaced Bean's visible defects. Diagnosis-first (3 parallel read-only investigators, every root cause main-session-verified vs code+DB+live DOM) fixed 3: **#1 container gaps** — the L3 gap-gate (`root_supports.py`) was consuming `gap` into a dead `style.spacing.blockGap` leaf; fixed to check `blockGap` specifically, so gap reaches the wrapper-rendered `gap` attr (grids now show 16/60/14px; parity 70/71/71; Phase-4 red→green test + 2 partition tests corrected); **#4 hero image** (hardcoded split padding moved off the outer grid → image flush); **#9 testimonial** (hardcoded cream slide bg → transparent). Also **de-duped the hero** (splitGap was the ONLY true attr dupe on a 30-block audit — removed + its hardcoded 24px gap default) and **cleaned dead schema** (customWidth orphan off 27 composites +53 DB rows; dead blockGap off accordion/product-faq). Recurring cheat = D228 hardcoded defaults. Proven-open: **L4 per-area extraction** (composite grid-area box-CSS not fed to the wired area resolver → hero contentPadding "no value extracted") + **L3 universal reach** (Bean: universal = ALL L3 landing across examples, not one rule). **NEXT = the container L1-L4 cascade deep-dive (Bean's slow understand-first agenda: map → group L1-L4 → prove universal → explain simply → layer-by-layer test).** See next-session-prompt.md.

## State Snapshot

## GROUND TRUTH FIRST — do not trust any doc's cached status; verify these every session
- **HEAD + tree:** `git log -1 --stat` + `git status` + `git branch --show-current`. NO doc's cached line is authoritative.
- **D-number ceiling:** `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — decisions.md is the SOLE source of truth.
- **Framework counts:** query `/sgs-db` or `/wp-blocks` — the DB is authoritative; counts are NOT maintained in prose.
- **Commit discipline:** commit by EXPLICIT PATH, never `git add -A`. `main` is the source of truth.

## ACTIVE WORKSTREAM — Container blocks + the L1-L4 cloning cascade (deep-dive)
- **SoT for current status:** `.claude/handoff.md` (top entry, D282) + `.claude/next-session-prompt.md` (the container L1-L4 agenda + MANDATORY READING GATE + STOP catalogue). READ THOSE.
- **One-line where-we-are:** D2 no longer deployed (honest page, parity 70/71/71). The next front is a slow, understand-first study of the container CSS cascade: map `sgs/container` + shared wrapper's full setting/CSS surface → group all settings L1-L4 (Bean agrees) → prove whether the cascade is UNIVERSAL across class-section/div-section, container/container-equivalent/composite → explain non-technically THEN reconcile with the spec → test varied draft shapes per layer, ONE layer fully fixed + LANDED before the next.
- **Proven-open converter gaps:** L4 per-area extraction (composite grid-area box-CSS not fed to the wired `grid_area` resolver — hero contentPadding "no value extracted"); L3 universal reach (probe `sgs/multi-button` max-width). Also parked: P-DRAFT-CSSVAR-COLOUR-RESOLUTION, P-MULTIBUTTON-768-WRAP.
- **Canonical spec:** `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — read §2 (layer model) FIRST; §3.A + §13.4 = CSS routing. Also Spec 29 (container roster) + WRAPPER-CSS-ROUTING-DESIGN-GATE (DEC-1..5).

## DONE / ARCHIVED — theme + WooCommerce layer (Spec 30, not an active thread)
- Spec 30 COMPLETE + MERGED (D220). Deferred roadmap items live in parking.md.

## DOC DISCIPLINE
- decisions.md / parking.md / mistakes.md are append-only; D-ceiling check MANDATORY before a new D.
- /handoff writes handoff.md + next-session-prompt.md + this block.

## BLOCKERS
- None block the next session. Known-open items live in handoff.md "Known Issues".

<!-- Caps: this file <=24576 bytes, <=60 lines of body. History -> memory/state-archive.md. -->
