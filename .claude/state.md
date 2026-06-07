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

## NEXT SESSION = SGS-THEME THREAD (Bean-directed 2026-06-06)
- Read `.claude/next-session-prompt-theme.md` (Wave 3 #17 file-split + centralise lean-seed stripper, then Spec 27/28 to 100%). The cloning thread is co-active (a separate live session is mid bound-purge / converter work) — do NOT pull cloning tasks into the theme session.

## CLONING-PIPELINE THREAD  (owner of: this block, handoff.md, next-session-prompt.md)
- **DOC-COUNCIL BACKLOG CLOSED 2026-06-06** (all FATAL + HIGH shipped/recalibrated/dismissed — see `.claude/reports/2026-06-06-doc-council-findings.md` STATUS table). The "adversarially-review all .claude docs" sub-goal in next-session-prompt.md is DONE; the converter-fix continuation there still stands.
- **SoT for current status:** `.claude/handoff.md` (latest session) + `.claude/next-session-prompt.md` (the operative opener). READ THOSE — do not rely on a summary here.
- **One-line where-we-are (2026-06-07 PM):** SHIPPED this session (D184-D188) — icon-identity resolver (trust-bar badges clone to correct icons, live page 8); Stage 9 schema fix (autonomy gate was rolling back EVERY deploy — now promotes); UNIVERSAL gap consolidation (one shared `sgs/container` gap control across all composite/wrapper blocks, council-gated + frontend-verified); pre-existing heading React #130 crash fixed (info-box/hero/feature-grid); Task 3 scope CORRECTED (`sgs/container` is the valid DB-driven target — complete the §FR-22-21 attribute-transfer, do NOT force composites; lesson blub.db 329). **NEXT (next-session-prompt):** (1) `/sgs-update` DB sync; (2) the converter **Method-2 universal CSS-transfer** (the real fidelity lever); (3) 11-block icon-migration to the shared picker; (4) gap council follow-ups (`P-GAP-CONSOLIDATION-FOLLOWUPS`). parity2 Stage 11.5 measures Method-2 pre/post.
- **Canonical spec:** `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`. Reading order: see `docs-registry.yaml` `cold_start_reading_order`.

## SGS-THEME THREAD  (owner of: this block, handoff-theme.md, next-session-prompt-theme.md)
- **SoT for current status:** `.claude/handoff-theme.md` (latest session) + `.claude/next-session-prompt-theme.md` (the operative opener). READ THOSE.
- **One-line where-we-are (2026-06-06, session 17):** Spec 27 (Phases 1+2) + Spec 28 P1 SHIPPED; the adversarial-council must-fix backlog Wave 1 (9) + Wave 2 (8, value-ladder authoring UI + UK consumer-law) + Wave 3 #2 (PREFLIGHT visibility + auto-variesBy) ALL SHIPPED + live-verified on canary 540, R-22-13 signed. **NEXT:** Wave 3 #17 (file-split + CENTRALISE the lean-seed stripper) → Phase 2 (Spec 27 R4+F2; Spec 28 P2/P3; P4/R5 gated).
- **Canonical specs:** `.claude/specs/27-...md` (product/configurator master, absorbs 24/25), `.claude/specs/28-...md` (smart bulk pricing), `.claude/specs/26-...md` (global styles, build-deferred). Reading order: `docs-registry.yaml` `cold_start_reading_order_theme`.

## SHARED-STATE DISCIPLINE (two threads, one main)
- **Per-thread ownership:** each thread's `/handoff` writes ONLY its own block above + its own handoff/next-session-prompt. Never overwrite the other thread's block.
- **decisions.md / parking.md / mistakes.md** are shared append-only — append your entries, never interleave/clobber; D-ceiling check (above) is MANDATORY before a new D.
- **The real first-shop blocker is the CLONING converter** (the theme shop layer is complete + safe). Do not pull deferred theme work (Spec 28 P4 / R5) ahead of the converter.

## BLOCKERS
- None block either thread's next session. (Per-thread known-open items live in each thread's handoff "Known Issues".)

<!-- Caps: this file ≤24576 bytes, ≤60 lines of body. History → memory/state-archive.md. If a fact here also lives in another doc, that other doc is the SoT and this is a POINTER — do not duplicate detail. -->
