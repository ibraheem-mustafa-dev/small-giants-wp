---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-06-21
note: "LEAN snapshot (single active workstream as of 2026-06-17 — the cloning CSS-transfer rebuild; theme/Spec-30 work COMPLETE + archived). Full history → memory/state-archive.md. This file holds ONLY the current pointer; detail lives in handoff.md + next-session-prompt.md (the SoT). Do NOT restate D-numbers / counts / commit hashes here — they drift. ≤24576 bytes."
---

# small-giants-wp — State Snapshot (lean)

## Human Summary
Cloning CSS-transfer foundation (Phase F) is COMPLETE and the 2026-06-23 doc audit aligned every doc to the universal-pipeline goal. The single active workstream is the stage-by-stage MODULAR REBUILD (Spec 31 §12.6 step 2 → step 3); `convert.py` is FROZEN (D-MODULAR). D-ceiling D241, branch `main`.

## State Snapshot

## GROUND TRUTH FIRST — do not trust any doc's cached status; verify these every session
- **HEAD + tree:** `git log -1 --stat` + `git status` + `git branch --show-current`. NO doc's "latest_commit"/"working_tree" line is authoritative — verify against git.
- **D-number ceiling:** `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — `decisions.md` is the SOLE source of truth for the D-ceiling. Never assign a D without this check.
- **Framework counts (blocks/attrs/slots/roles):** query `/sgs-db` or `/wp-blocks` — the DB is authoritative; counts are NOT maintained in prose anywhere.
- **Commit discipline:** commit by EXPLICIT PATH (`git commit -- <paths>`), never `git add -A` — keeps unrelated in-flight edits out of a commit. `main` is the source of truth.

## ACTIVE WORKSTREAM — Cloning CSS-transfer rebuild (the ONLY active work)
- **SoT for current status:** `.claude/handoff.md` (latest session) + `.claude/next-session-prompt.md` (the operative opener, with the MANDATORY READING GATE). READ THOSE — do not rely on a summary here.
- **One-line where-we-are (2026-06-23, D241):** **Phase-F COMPLETE + the DOC AUDIT COMPLETE; NEXT = the stage-by-stage modular rebuild (Spec 31 §12.6 step 2 → step 3).** Foundation (F1–F6 + the F5 gate cluster) all SHIPPED/armed/wired/hardened (D232–D241); 544 tests green; convert.py FROZEN (D-MODULAR). **Doc audit (2026-06-23, commits `73fe1b95`/`efdc277b`/`1c803bde`):** 12 shipped/superseded plans archived (only the 2 live clone-fix docs + the rebuild blueprint remain); stale statuses fixed (Spec 31 F5 row, Spec 22 H-C1/css-d1, Spec 29/WRAPPER widthMode→align/maxWidth, architecture slot_synonyms→slots, goals Goal A); registry repaired (added Spec 30/31/go-live-checklist, repointed 2 dead paths); Spec 22 counts de-hardcoded to `/sgs-db` pointers (live block_attributes=2819 ≠ the doc's old numbers — proof a fixed count re-drifts); mistakes.md trimmed 41→26 (≤30 cap); counter doc fixed static→dynamic. **D-CEILING: D241.** **DEFERRED (P-F5-RESIDUALS — 2, both rebuild/infra-scope):** F3-RUNTIME LANDED leg (needs a Playwright render-harness) + css_router D1 media-axis (D1 is a dead output; gate fails-safe; rebuild MF-2 owns it).
- **Canonical specs:** `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` (v0.3 — THE build blueprint; read §12 FIRST) + `.claude/specs/22-...` (the underlying pipeline architecture). Reading order: see `docs-registry.yaml` `cold_start_reading_order` (Spec 31 + the pipeline map are now mandatory top reads).

## DONE / ARCHIVED — theme + WooCommerce layer (Spec 30, no longer an active thread)
- **Spec 30 COMPLETE + MERGED (D220, 2026-06-12) — SGS is a sellable shop.** This work is finished; it is NOT a parallel thread anymore. Session docs archived to `memory/handoff-theme-2026-06-12.md` + `next-session-prompt-theme-2026-06-12.md`. Deferred roadmap items (B2B ex-VAT, subscriptions/build-a-box, F5/F10) live in `parking.md` — pick up via a fresh `/handoff` only if/when a theme task is explicitly started. Specs: 30 (COMPLETE) · 27 (product/configurator master) · 28 (bulk pricing, COMPLETE) · 26 (global styles, build-deferred).

## DOC DISCIPLINE
- `decisions.md` / `parking.md` / `mistakes.md` are append-only — append, never clobber; D-ceiling check (above) MANDATORY before a new D.
- `/handoff` writes `handoff.md` + `next-session-prompt.md` + this block.

## BLOCKERS
- None block the next session. Known-open items live in `handoff.md` "Known Issues".

<!-- Caps: this file ≤24576 bytes, ≤60 lines of body. History → memory/state-archive.md. If a fact here also lives in another doc, that other doc is the SoT and this is a POINTER — do not duplicate detail. -->
