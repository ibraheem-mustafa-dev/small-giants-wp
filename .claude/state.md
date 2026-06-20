---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-06-18
note: "LEAN snapshot (single active workstream as of 2026-06-17 — the cloning CSS-transfer rebuild; theme/Spec-30 work COMPLETE + archived). Full history → memory/state-archive.md. This file holds ONLY the current pointer; detail lives in handoff.md + next-session-prompt.md (the SoT). Do NOT restate D-numbers / counts / commit hashes here — they drift. ≤24576 bytes."
---

# small-giants-wp — State Snapshot (lean)

## GROUND TRUTH FIRST — do not trust any doc's cached status; verify these every session
- **HEAD + tree:** `git log -1 --stat` + `git status` + `git branch --show-current`. NO doc's "latest_commit"/"working_tree" line is authoritative — verify against git.
- **D-number ceiling:** `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — `decisions.md` is the SOLE source of truth for the D-ceiling. Never assign a D without this check.
- **Framework counts (blocks/attrs/slots/roles):** query `/sgs-db` or `/wp-blocks` — the DB is authoritative; counts are NOT maintained in prose anywhere.
- **Commit discipline:** commit by EXPLICIT PATH (`git commit -- <paths>`), never `git add -A` — keeps unrelated in-flight edits out of a commit. `main` is the source of truth.

## ACTIVE WORKSTREAM — Cloning CSS-transfer rebuild (the ONLY active work)
- **SoT for current status:** `.claude/handoff.md` (latest session) + `.claude/next-session-prompt.md` (the operative opener, with the MANDATORY READING GATE). READ THOSE — do not rely on a summary here.
- **One-line where-we-are (2026-06-18, D236):** **Phase-F F2 + F3-core + F4 SHIPPED; F5 PARTIAL; NEXT = F6.** F2 (CSS Accounting Ledger, `f8a746c7`, D232), F3-core (LANDED render-oracle, `6b430dae`, D234, live-canary-proven), F4 (closed `excluded_properties` table ships EMPTY, `870f48aa`, D235) all SHIPPED. **F5 PARTIAL (D236):** the anti-mirror gate `check_no_mirror.py` armed with a committed legacy baseline (`6193f3e9`; 10 keys / 13 instances; `--enforce --baseline` fails only on a NEW draft-class violation, grandfathers the 13 the rebuild will fix; 10 tests + qc-inline 5/5). **KNOWN GAP (STOP-6):** the orchestrator does NOT yet call `pipeline-stage-gate.py` → the gate does NOT auto-run (NOT claimed enforced). The OTHER 5 F5 gates (`check-converter-cheats.py`, `generate-coverage-matrix.py`, the pipeline-close ledger checker, the EXCLUDED-literal gate, the PreToolUse git hook) + the orchestrator-wire are OPEN — tracked `P-F5-REMAINING`. **NEXT SESSION = F6** (DB-as-code consistency suite — Bean's chosen order, before finishing F5) then F5-remaining then the stage-by-stage rebuild. **D-CEILING: D236.** convert.py FROZEN (D-MODULAR — never edited by F2–F5). Gate A green. F3-RUNTIME (full-37 / cache / pixel-diff / deploy choreography / %-calc-vw length / MR-1/MR-3) DEFERRED.
- **Canonical specs:** `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` (v0.3 — THE build blueprint; read §12 FIRST) + `.claude/specs/22-...` (the underlying pipeline architecture). Reading order: see `docs-registry.yaml` `cold_start_reading_order` (Spec 31 + the pipeline map are now mandatory top reads).

## DONE / ARCHIVED — theme + WooCommerce layer (Spec 30, no longer an active thread)
- **Spec 30 COMPLETE + MERGED (D220, 2026-06-12) — SGS is a sellable shop.** This work is finished; it is NOT a parallel thread anymore. Session docs archived to `memory/handoff-theme-2026-06-12.md` + `next-session-prompt-theme-2026-06-12.md`. Deferred roadmap items (B2B ex-VAT, subscriptions/build-a-box, F5/F10) live in `parking.md` — pick up via a fresh `/handoff` only if/when a theme task is explicitly started. Specs: 30 (COMPLETE) · 27 (product/configurator master) · 28 (bulk pricing, COMPLETE) · 26 (global styles, build-deferred).

## DOC DISCIPLINE
- `decisions.md` / `parking.md` / `mistakes.md` are append-only — append, never clobber; D-ceiling check (above) MANDATORY before a new D.
- `/handoff` writes `handoff.md` + `next-session-prompt.md` + this block.

## BLOCKERS
- None block the next session. Known-open items live in `handoff.md` "Known Issues".

<!-- Caps: this file ≤24576 bytes, ≤60 lines of body. History → memory/state-archive.md. If a fact here also lives in another doc, that other doc is the SoT and this is a POINTER — do not duplicate detail. -->
