---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-06-11
note: "LEAN per-thread snapshot (restructured 2026-06-06 per doc-council). Full pre-restructure history → memory/state-archive.md. This file holds ONLY the current per-thread pointer; detail lives in each thread's handoff + next-session-prompt (the SoT). Do NOT restate D-numbers / counts / commit hashes here — they drift. ≤24576 bytes."
---

# small-giants-wp — State Snapshot (lean)

## GROUND TRUTH FIRST — do not trust any doc's cached status; verify these every session
- **HEAD + tree:** `git log -1 --stat` + `git status` + `git branch --show-current`. NO doc's "latest_commit"/"working_tree" line is authoritative — they are stale the moment the other thread commits.
- **D-number ceiling:** `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — `decisions.md` is the SOLE source of truth for the D-ceiling. Never assign a D without this check (two threads share one decisions.md).
- **Framework counts (blocks/attrs/slots/roles):** query `/sgs-db` or `/wp-blocks` — the DB is authoritative; counts are NOT maintained in prose anywhere.
- **Which thread am I on?** TWO co-active threads share `main`. Pick your thread, then read ONLY its block below + its handoff + its next-session-prompt. Commit by EXPLICIT PATH (`git commit -- <paths>`), never `git add -A`.

## NEXT SESSION = SGS-THEME THREAD (continuing; updated 2026-06-09)
- Read `.claude/next-session-prompt-theme.md` (R4 agency slug-templates, then F2 feeds — the LAST two Spec 27 units). The cloning thread is co-active AND has the shared tree checked out on `feat/stage1-converter-core` — theme commits go to main via a TEMP WORKTREE; do NOT pull cloning tasks into the theme session.

## CLONING-PIPELINE THREAD  (owner of: this block, handoff.md, next-session-prompt.md)
- **DOC-COUNCIL BACKLOG CLOSED 2026-06-06** (all FATAL + HIGH shipped/recalibrated/dismissed — see `.claude/reports/2026-06-06-doc-council-findings.md` STATUS table). The "adversarially-review all .claude docs" sub-goal in next-session-prompt.md is DONE; the converter-fix continuation there still stands.
- **SoT for current status:** `.claude/handoff.md` (latest session) + `.claude/next-session-prompt.md` (the operative opener). READ THOSE — do not rely on a summary here.
- **One-line where-we-are (2026-06-09, D194):** DESIGN/DB/DOCS session, no converter code. **D194** resolved the canonical_slot/wrapper-routing architecture — `canonical_slot` is content-fork metadata only (gated by role + attr_type), NOT the structural router; structural box CSS routes name-free via layer-detection (OUTER/CONTENT/GRID) + `property_suffixes` (matches Method-2; de-conflicted the Wave-2 docs that had drifted to canonical_slot-keyed). DB: added `content` element-slot, tagged 41 `content*` rows `content`/`layout` (`/sgs-update` maintains them; redundant seed script deleted); GUARD added in `seed-slot-synonyms.py` (fails if `content` gains a `standalone_block`). Bean's `--content-width` draft convention applied to the 7 Mama's inner-wrapper caps + Spec 00 §3.3/FR-22-21. Full doc sweep (Spec 22/00/29/02 + pipeline-flow/stages + architecture + dev-setup + Wave-2 design docs). `/qc` passed + `/adversarial-council` (6 personas) GO-conditional → Commit-2 build contract recorded in `STAGE1-DESIGN.md`. Wave-2 prompt files removed (consolidated into the main `.claude/` opener). **NEXT (next-session-prompt):** Stage 1 universal converter core (Method-2) — Task 1 parity2 containment fix → Task 2 Gate A/B harnesses → Task 3 converter core with the council build-contract. Design-gate is DONE (council-hardened).
- **Canonical spec:** `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`. Reading order: see `docs-registry.yaml` `cold_start_reading_order`.

## SGS-THEME THREAD  (owner of: this block, handoff-theme.md, next-session-prompt-theme.md)
- **SoT for current status:** `.claude/handoff-theme.md` (latest session) + `.claude/next-session-prompt-theme.md` (the operative opener). READ THOSE.
- **One-line where-we-are (2026-06-11, session 20):** **Spec 30 P1 COMPLETE + merged to main** (origin/main `9f357129` reconcile-merge — see "SHARED-STATE" note below). Working PDP + cart loop live on canary product 540: `sgs/buybox` (option-picker→cart bridge), `sgs/tabs` first deploy (PDP details tabs), branded sale badge/bands/trust-bar, shop = SGS product-cards (`showPickers` off), COD test order completes. Bean R-22-13 signed off (9-point fix wave). **FR-30-12 (product-page cloning) is UNGATED.** Open P1 follow-ups (parked, non-blocking): per-variation gallery image-swap, notify-me capture. **NEXT:** P2 (FR-30-8 price coupling + FR-30-10 reviews) OR P4 (FR-30-9 schema) — menu in `next-session-prompt-theme.md`.
- **Canonical specs:** `.claude/specs/30-...md` (WC page types — P1 done, P2/P3/P4 ahead), `.claude/specs/27-...md` (product/configurator master, absorbs 24/25), `.claude/specs/28-...md` (smart bulk pricing), `.claude/specs/26-...md` (global styles, build-deferred). Live P1 plan `.claude/plans/2026-06-11-spec30-p1-wc-chassis.md` is COMPLETE (archive at next consolidation). Reading order: `docs-registry.yaml` `cold_start_reading_order_theme`.

## SHARED-STATE DISCIPLINE (two threads, one main)
- **Per-thread ownership:** each thread's `/handoff` writes ONLY its own block above + its own handoff/next-session-prompt. Never overwrite the other thread's block.
- **decisions.md / parking.md / mistakes.md** are shared append-only — append your entries, never interleave/clobber; D-ceiling check (above) is MANDATORY before a new D.
- **The real first-shop blocker is the CLONING converter** (the theme shop layer is complete + safe). Do not pull deferred theme work (Spec 28 P4 / R5) ahead of the converter.
- **RECONCILE NOTE (2026-06-11):** theme P1 FF-pushed to main, then origin/main was reconciled with the cloning thread's 25 unpushed local-main commits via merge `9f357129` (both lines verified present, zero conflicts). The cloning thread's local `main` (worktree `C:/tmp/sgs-p4`, `9c0321e6`) is now an ANCESTOR of origin/main → its next `git pull` fast-forwards cleanly. Cloning thread also has UNCOMMITTED staged converter work in the primary worktree's index — left untouched by the theme handoff (path-scoped commits only).

## BLOCKERS
- None block either thread's next session. (Per-thread known-open items live in each thread's handoff "Known Issues".)

<!-- Caps: this file ≤24576 bytes, ≤60 lines of body. History → memory/state-archive.md. If a fact here also lives in another doc, that other doc is the SoT and this is a POINTER — do not duplicate detail. -->
