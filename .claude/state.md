---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-06-21
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
- **One-line where-we-are (2026-06-21, D239):** **Phase-F COMPLETE (F1–F6 + the F5 gate cluster all SHIPPED, armed + WIRED); NEXT = the stage-by-stage rebuild (Spec 31 §12.6 step 3).** F2 (`f8a746c7`, D232), F3-core (`6b430dae`, D234), F4 (empty `excluded_properties`, `870f48aa`, D235), F6 (db-consistency suite, D237) SHIPPED. **F5 COMPLETE (D238+D239):** check_no_mirror auto-wired into the clone orchestrator (`2341e761`, D238) + the 4 gates built/armed/wired (`a77ff324` cheat-gate, `64b2a4d9` excluded-gate, `76f2883f` coverage-matrix, `f97e7ae0` ledger-checker, `e7679b09` the `f5-commit-gate.py` PreToolUse hook + prebuild/prestart wiring). 511 tests green across the 6 foundation modules. STOP-6 closed: gates RUN on every `git commit` (commit-hook) + clone (pipeline-stage-gate). **NEXT SESSION = the stage-by-stage rebuild** (§12.6 step 3 — each stage gated by the ledger+oracle before the next). **D-CEILING: D241** (D240 = adversarial-council hardening; D241 = residuals fact-checked + closed). convert.py FROZEN (D-MODULAR). Gate A green. 544 tests. **DEFERRED (P-F5-RESIDUALS — only 2, both evidenced as rebuild/infra-scope, NOT habit-deferral):** F3-RUNTIME LANDED leg (needs a Playwright render-harness + deploy over the fixture corpus) + css_router D1 media-axis (D1 is a dead output; the gate fails-safe; the rebuild's MF-2 owns it).
- **Canonical specs:** `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` (v0.3 — THE build blueprint; read §12 FIRST) + `.claude/specs/22-...` (the underlying pipeline architecture). Reading order: see `docs-registry.yaml` `cold_start_reading_order` (Spec 31 + the pipeline map are now mandatory top reads).

## DONE / ARCHIVED — theme + WooCommerce layer (Spec 30, no longer an active thread)
- **Spec 30 COMPLETE + MERGED (D220, 2026-06-12) — SGS is a sellable shop.** This work is finished; it is NOT a parallel thread anymore. Session docs archived to `memory/handoff-theme-2026-06-12.md` + `next-session-prompt-theme-2026-06-12.md`. Deferred roadmap items (B2B ex-VAT, subscriptions/build-a-box, F5/F10) live in `parking.md` — pick up via a fresh `/handoff` only if/when a theme task is explicitly started. Specs: 30 (COMPLETE) · 27 (product/configurator master) · 28 (bulk pricing, COMPLETE) · 26 (global styles, build-deferred).

## DOC DISCIPLINE
- `decisions.md` / `parking.md` / `mistakes.md` are append-only — append, never clobber; D-ceiling check (above) MANDATORY before a new D.
- `/handoff` writes `handoff.md` + `next-session-prompt.md` + this block.

## BLOCKERS
- None block the next session. Known-open items live in `handoff.md` "Known Issues".

<!-- Caps: this file ≤24576 bytes, ≤60 lines of body. History → memory/state-archive.md. If a fact here also lives in another doc, that other doc is the SoT and this is a POINTER — do not duplicate detail. -->
