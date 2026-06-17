---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-06-16
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
- **One-line where-we-are (2026-06-17, D229):** **PLANNING SESSION — no code shipped. Concluded the cloning CSS-transfer system is not soundly patchable → CLEAN MODULAR STAGE-BY-STAGE REBUILD, gated by adversarial-council + qc-council, Bean-locked.** Produced the build blueprint: **`specs/31-...` v0.3** (§12 = the rebuild direction; build-ready), the **exhaustive 24-stage pipeline routing map** (`reports/pipeline-routing-map-2026-06-17.html` — every branch/DB-call/terminal + 3 cross-stage mechanism traces M1/M2/M3 + a 22-finding gap register, 6 HIGH), the **council register** (`reports/2026-06-17-adversarial-council-register-and-rebuild-direction.md`), and the **reviewer-persona roster** (`reports/2026-06-17-cross-stage-reviewer-personas.md`). Parity baseline (the METRIC, not the goal): content 100%; full mobile 61.82% / tablet 59.09% / desktop 55.45%. **Locked direction (D229):** clean rebuild (not spot-fixes); modular per-resolver files behind one dispatch table + remade orchestrator; stage-by-stage build order with a per-stage universality test; the **draft-derived CSS Accounting Ledger + render-diff oracle + armed gates** are the Tier-1 FOUNDATION built FIRST (the spine that gates each stage). **NEXT SESSION = build Phase F (the Tier-1 foundation) per Spec 31 §12.2 + §12.7, then the stage-by-stage rebuild.** **D-CEILING: D229.** Gate A + `converter_v2/tests/` — run BOTH; the new gates (check-converter-cheats.py / generate-coverage-matrix.py / ledger checker) do NOT exist yet — building them is Phase F.
- **Canonical specs:** `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` (v0.3 — THE build blueprint; read §12 FIRST) + `.claude/specs/22-...` (the underlying pipeline architecture). Reading order: see `docs-registry.yaml` `cold_start_reading_order` (Spec 31 + the pipeline map are now mandatory top reads).

## DONE / ARCHIVED — theme + WooCommerce layer (Spec 30, no longer an active thread)
- **Spec 30 COMPLETE + MERGED (D220, 2026-06-12) — SGS is a sellable shop.** This work is finished; it is NOT a parallel thread anymore. Session docs archived to `memory/handoff-theme-2026-06-12.md` + `next-session-prompt-theme-2026-06-12.md`. Deferred roadmap items (B2B ex-VAT, subscriptions/build-a-box, F5/F10) live in `parking.md` — pick up via a fresh `/handoff` only if/when a theme task is explicitly started. Specs: 30 (COMPLETE) · 27 (product/configurator master) · 28 (bulk pricing, COMPLETE) · 26 (global styles, build-deferred).

## DOC DISCIPLINE
- `decisions.md` / `parking.md` / `mistakes.md` are append-only — append, never clobber; D-ceiling check (above) MANDATORY before a new D.
- `/handoff` writes `handoff.md` + `next-session-prompt.md` + this block.

## BLOCKERS
- None block the next session. Known-open items live in `handoff.md` "Known Issues".

<!-- Caps: this file ≤24576 bytes, ≤60 lines of body. History → memory/state-archive.md. If a fact here also lives in another doc, that other doc is the SoT and this is a POINTER — do not duplicate detail. -->
