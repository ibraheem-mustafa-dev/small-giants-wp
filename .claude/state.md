---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-06-23
note: "LEAN snapshot (single active workstream as of 2026-06-17 — the cloning CSS-transfer rebuild; theme/Spec-30 work COMPLETE + archived). Full history → memory/state-archive.md. This file holds ONLY the current pointer; detail lives in handoff.md + next-session-prompt.md (the SoT). Do NOT restate D-numbers / counts / commit hashes here — they drift. ≤24576 bytes."
---

# small-giants-wp — State Snapshot (lean)

## Human Summary
Cloning CSS-transfer foundation (Phase F) is COMPLETE. The modular-scaffold DESIGN-GATE (Spec 31 §12.6 step 2) PASSED 2026-06-23 (D242): 6-persona adversarial-council + 3 conformance audits (spec/anti-cheat/end-goal), all GO, on a corrected design. Bean ratified 3 decisions — VERTICAL SLICE not horizontal scaffold (D-A), draft-vs-clone only / NO shadow-vs-old (D-B), report-only fail-loud first (D-C). The single active workstream is now the BUILD of that vertical slice (one OUTER `max-width`→`maxWidth` resolver, end-to-end, LANDED on real page 8); `convert.py` is FROZEN (D-MODULAR). Design doc (APPROVED, build-ready): `.claude/plans/2026-06-23-modular-scaffold-design.md` v3. D-ceiling D242, branch `main`.

## State Snapshot

## GROUND TRUTH FIRST — do not trust any doc's cached status; verify these every session
- **HEAD + tree:** `git log -1 --stat` + `git status` + `git branch --show-current`. NO doc's "latest_commit"/"working_tree" line is authoritative — verify against git.
- **D-number ceiling:** `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — `decisions.md` is the SOLE source of truth for the D-ceiling. Never assign a D without this check.
- **Framework counts (blocks/attrs/slots/roles):** query `/sgs-db` or `/wp-blocks` — the DB is authoritative; counts are NOT maintained in prose anywhere.
- **Commit discipline:** commit by EXPLICIT PATH (`git commit -- <paths>`), never `git add -A` — keeps unrelated in-flight edits out of a commit. `main` is the source of truth.

## ACTIVE WORKSTREAM — Cloning CSS-transfer rebuild (the ONLY active work)
- **SoT for current status:** `.claude/handoff.md` (latest session) + `.claude/next-session-prompt.md` (the operative opener, with the MANDATORY READING GATE). READ THOSE — do not rely on a summary here.
- **One-line where-we-are (2026-06-23, D242):** **Phase-F COMPLETE + the modular-scaffold DESIGN-GATE PASSED; NEXT = BUILD the vertical slice (Spec 31 §12.6 step 2, vertical-slice form).** Foundation (F1–F6 + the F5 gate cluster) all SHIPPED/armed/wired/hardened (D232–D241); 544 tests green; convert.py FROZEN (D-MODULAR). **Design-gate (2026-06-23, D242, commits `90e44377`/`07350ac1`):** the §12.6-step-2 scaffold was designed → 6-persona `/adversarial-council` (graded v1 D/D+, CONDITIONAL GO) → STOP-15 fact-check (3 real ground-truth errors fixed, 1 false council headline dismissed with evidence) → Bean design-gate ratified 3 decisions → 3 read-only conformance audits (spec-31 / anti-cheat-rules / end-goal, all GO conditional) folded in → design doc v3 APPROVED. **Bean's 3 decisions:** D-A vertical slice not horizontal scaffold · D-B draft-vs-clone ONLY (old engine never an oracle) · D-C report-only fail-loud first. **Design doc (build-ready):** `.claude/plans/2026-06-23-modular-scaffold-design.md` v3 (§10 = the binding conformance corrections). **D-CEILING: D242.** **DEFERRED (P-F5-RESIDUALS — 2, both rebuild/infra-scope):** F3-RUNTIME LANDED leg (the slice arms a minimal one-fixture form of it via `oracle/verdict.py`+`capture.py`, both BUILT) + css_router D1 media-axis (rebuild MF-2 owns it).
- **Canonical specs:** `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` (v0.3 — THE build blueprint; read §12 FIRST) + `.claude/specs/22-...` (the underlying pipeline architecture). Reading order: see `docs-registry.yaml` `cold_start_reading_order` (Spec 31 + the pipeline map are now mandatory top reads).

## DONE / ARCHIVED — theme + WooCommerce layer (Spec 30, no longer an active thread)
- **Spec 30 COMPLETE + MERGED (D220, 2026-06-12) — SGS is a sellable shop.** This work is finished; it is NOT a parallel thread anymore. Session docs archived to `memory/handoff-theme-2026-06-12.md` + `next-session-prompt-theme-2026-06-12.md`. Deferred roadmap items (B2B ex-VAT, subscriptions/build-a-box, F5/F10) live in `parking.md` — pick up via a fresh `/handoff` only if/when a theme task is explicitly started. Specs: 30 (COMPLETE) · 27 (product/configurator master) · 28 (bulk pricing, COMPLETE) · 26 (global styles, build-deferred).

## DOC DISCIPLINE
- `decisions.md` / `parking.md` / `mistakes.md` are append-only — append, never clobber; D-ceiling check (above) MANDATORY before a new D.
- `/handoff` writes `handoff.md` + `next-session-prompt.md` + this block.

## BLOCKERS
- None block the next session. Known-open items live in `handoff.md` "Known Issues".

<!-- Caps: this file ≤24576 bytes, ≤60 lines of body. History → memory/state-archive.md. If a fact here also lives in another doc, that other doc is the SoT and this is a POINTER — do not duplicate detail. -->
