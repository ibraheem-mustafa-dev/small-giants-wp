---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-06-07
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
- **One-line where-we-are (2026-06-09, session 18):** council backlog 100% CLOSED (#17 stripper-centralise + file-splits, D196) + Spec 27 v6 F2 research corrections (D197, speakable descoped) + Spec 28 P2 engine (D198, 53/53 fixture-exact) + P3 preview-only authoring (D199) + a 3-rater VISUAL qc-council pass on the P3 admin UI (D200 — 2 browser-only functional bugs + 12 findings fixed). All live on canary 540 + on main through `187c2643`. **NEXT:** R4 (slug-templates) → F2 (FAQ block + llms.txt + Merchant feed, build from the research pack). P4/R5 stay GATED.
- **Canonical specs:** `.claude/specs/27-...md` (product/configurator master, absorbs 24/25), `.claude/specs/28-...md` (smart bulk pricing), `.claude/specs/26-...md` (global styles, build-deferred). Reading order: `docs-registry.yaml` `cold_start_reading_order_theme`.

## SHARED-STATE DISCIPLINE (two threads, one main)
- **Per-thread ownership:** each thread's `/handoff` writes ONLY its own block above + its own handoff/next-session-prompt. Never overwrite the other thread's block.
- **decisions.md / parking.md / mistakes.md** are shared append-only — append your entries, never interleave/clobber; D-ceiling check (above) is MANDATORY before a new D.
- **The real first-shop blocker is the CLONING converter** (the theme shop layer is complete + safe). Do not pull deferred theme work (Spec 28 P4 / R5) ahead of the converter.

## BLOCKERS
- None block either thread's next session. (Per-thread known-open items live in each thread's handoff "Known Issues".)

<!-- Caps: this file ≤24576 bytes, ≤60 lines of body. History → memory/state-archive.md. If a fact here also lives in another doc, that other doc is the SoT and this is a POINTER — do not duplicate detail. -->
