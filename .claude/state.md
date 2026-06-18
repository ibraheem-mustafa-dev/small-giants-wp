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
- **One-line where-we-are (2026-06-18, D233):** **Phase-F F2 SHIPPED; F3 designed + re-scoped (build next).** This session: (1) **F2 — the draft-derived CSS Accounting Ledger input parser — SHIPPED** (`f8a746c7`, D232): standalone `plugins/sgs-blocks/scripts/ledger/` (tinycss2, INDEPENDENT of css_router/convert/DB per STOP-3), surjective `declare_input`, fail-CLOSED, PHYSICAL-declarations-only (Bean's catch: the DB already owns shorthand decomposition — no expansion module; F3 owns partial-lifts). 37 fixtures, 515 declarations, 167 tests, `--check` wired into prebuild. Built via brainstorming→6-persona adversarial-council→Bean gate→SDD→cross-model review (caught 3 silent-drop holes, fixed pre-commit). (2) **F3 — the render-oracle — DESIGNED + COUNCIL-CORRECTED + RE-SCOPED (D233, NOT built)**: the council found the original "bare-draft-vs-WP-clone pixel-diff" was apples-to-oranges (~100% false-fails) + over-scoped; Bean approved a re-scope to **F3-core** (computed-style-primary LANDED verdict + 4 guards + MR-2 on ONE fixture) with **F3-runtime deferred** (full-37, cache, deploy-orchestration). Design doc `.claude/plans/2026-06-18-f3-render-oracle-design.md` (v2). **NEXT SESSION = build F3-core** (per that design doc + Spec 31 §12.2.3/§12.7), then F4/F5/F6, then the stage-by-stage rebuild. **D-CEILING: D233.** Gate A green (43); `converter_v2/tests/` path does not exist — Gate A is the live converter suite. The 3 missing gates (check-converter-cheats.py / generate-coverage-matrix.py / ledger checker) still do NOT exist — building them is F5.
- **Canonical specs:** `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` (v0.3 — THE build blueprint; read §12 FIRST) + `.claude/specs/22-...` (the underlying pipeline architecture). Reading order: see `docs-registry.yaml` `cold_start_reading_order` (Spec 31 + the pipeline map are now mandatory top reads).

## DONE / ARCHIVED — theme + WooCommerce layer (Spec 30, no longer an active thread)
- **Spec 30 COMPLETE + MERGED (D220, 2026-06-12) — SGS is a sellable shop.** This work is finished; it is NOT a parallel thread anymore. Session docs archived to `memory/handoff-theme-2026-06-12.md` + `next-session-prompt-theme-2026-06-12.md`. Deferred roadmap items (B2B ex-VAT, subscriptions/build-a-box, F5/F10) live in `parking.md` — pick up via a fresh `/handoff` only if/when a theme task is explicitly started. Specs: 30 (COMPLETE) · 27 (product/configurator master) · 28 (bulk pricing, COMPLETE) · 26 (global styles, build-deferred).

## DOC DISCIPLINE
- `decisions.md` / `parking.md` / `mistakes.md` are append-only — append, never clobber; D-ceiling check (above) MANDATORY before a new D.
- `/handoff` writes `handoff.md` + `next-session-prompt.md` + this block.

## BLOCKERS
- None block the next session. Known-open items live in `handoff.md` "Known Issues".

<!-- Caps: this file ≤24576 bytes, ≤60 lines of body. History → memory/state-archive.md. If a fact here also lives in another doc, that other doc is the SoT and this is a POINTER — do not duplicate detail. -->
