---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-07-05-D276
note: "LEAN snapshot. Full history -> memory/state-archive.md. This file holds ONLY the current pointer; detail lives in handoff.md + next-session-prompt.md (the SoT). Do NOT restate D-numbers / counts / commit hashes here - they drift. <=24576 bytes."
---

# small-giants-wp — State Snapshot (lean)

## Human Summary
**THE CONVERTER COMPLETION PROGRAMME IS EXECUTED (D274 plan, Steps 3-16, Gates A/B/C all closed, 2026-07-04/05).** The modular `converter/` engine is the ONLY converter: the frozen `orchestrator/converter_v2/` tree (6,386-line convert.py) is DELETED, the `SGS_NEW_ENGINE` flag is gone, `block_composition.has_inner_blocks` is dropped, and the FR-31-2.6/2.7/2.8 architecture (per-attr emit_shape walk / container-vs-composite classifier / destination-parametric registry dispatch) is live. Product-card lands (28px Fraunces price computed on page 8), the trial-variant badge paints, the 600px F-ii band renders 4-across via the D2 passthrough, A2 (the content-conservation ledger) is armed as the last STOP-28 gate. Honest parity (instrument de-polluted twice, Bean-caught): **content 90% / CSS 67-69-76** vs the session-start 47/49/54. 744 tests + all gates green, everything pushed. **NEXT = Bean-mandated MASSIVE QC SESSION** (per-step spec/rules/cheats/drop-attribution verification of all 16 steps + a full-shape universality QC) — see next-session-prompt.md.

## State Snapshot

## GROUND TRUTH FIRST — do not trust any doc's cached status; verify these every session
- **HEAD + tree:** `git log -1 --stat` + `git status` + `git branch --show-current`. NO doc's cached line is authoritative.
- **D-number ceiling:** `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — decisions.md is the SOLE source of truth.
- **Framework counts:** query `/sgs-db` or `/wp-blocks` — the DB is authoritative; counts are NOT maintained in prose.
- **Commit discipline:** commit by EXPLICIT PATH, never `git add -A`. `main` is the source of truth.

## ACTIVE WORKSTREAM — Cloning pipeline: post-programme QC (the ONLY active work)
- **SoT for current status:** `.claude/handoff.md` (top entry, D276) + `.claude/next-session-prompt.md` (the QC-session orchestration plan with the MANDATORY READING GATE). READ THOSE.
- **One-line where-we-are:** programme COMPLETE (18 commits `c85254db^..c8690345`, all pushed); the QC session verifies each step against Spec 31 + the 7 rules + the cheat catalogue + homepage-drop attribution, then QCs the full shape (universal / draft-agnostic / DB-rooted / flow-docs-match). Tracked residuals: card CTA + packSizes + imageAlt (A2-baselined, P-GATE-A-CARD-RESIDUALS).
- **Canonical spec:** `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — read §2 FIRST; §13 = binding rules/FRs. NOTE: the spec's §12 build-state prose predates Step 16 (frozen-engine references are now historical) — the QC session updates it.

## DONE / ARCHIVED — theme + WooCommerce layer (Spec 30, not an active thread)
- Spec 30 COMPLETE + MERGED (D220). Deferred roadmap items live in parking.md.

## DOC DISCIPLINE
- decisions.md / parking.md / mistakes.md are append-only; D-ceiling check MANDATORY before a new D.
- /handoff writes handoff.md + next-session-prompt.md + this block.

## BLOCKERS
- None block the next session. Known-open items live in handoff.md "Known Issues".

<!-- Caps: this file <=24576 bytes, <=60 lines of body. History -> memory/state-archive.md. -->
