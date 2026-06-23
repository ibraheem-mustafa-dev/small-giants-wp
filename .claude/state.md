---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-06-23
note: "LEAN snapshot (single active workstream as of 2026-06-17 — the cloning CSS-transfer rebuild; theme/Spec-30 work COMPLETE + archived). Full history → memory/state-archive.md. This file holds ONLY the current pointer; detail lives in handoff.md + next-session-prompt.md (the SoT). Do NOT restate D-numbers / counts / commit hashes here — they drift. ≤24576 bytes."
---

# small-giants-wp — State Snapshot (lean)

## Human Summary
Cloning CSS-transfer foundation (Phase F) is COMPLETE. The modular-scaffold VERTICAL SLICE (Spec 31 §12.6 step 2) is BUILT + LANDED + Bean-signed-off 2026-06-23 (D243): the new modular engine's `outer_box` resolver transfers a draft `max-width:1200px` → `maxWidth` and it LANDS on a live canary (oracle/verdict.py = LANDED, all 4 guards). 3 commits (`51737bb0` gate spine → `576afce3` routing spine → `abe35427` resolver layer + slice proof); 2 static anti-cheat gates wired + proven; 580+6xfail tests green; `convert.py` byte-identical (D-MODULAR). The architecture go/no-go on the whole rebuild is GO. The single active workstream is now **step 3 — stage-by-stage rebuild, recognition (Method-2 native-composite routing) FIRST** (§12.6 step 3); each stage gets its own design-gate + LANDED proof (A14 — never bank generalisation from the slice). Design doc: `.claude/plans/2026-06-23-modular-scaffold-design.md` v3. D-ceiling D243, branch `main`.

## State Snapshot

## GROUND TRUTH FIRST — do not trust any doc's cached status; verify these every session
- **HEAD + tree:** `git log -1 --stat` + `git status` + `git branch --show-current`. NO doc's "latest_commit"/"working_tree" line is authoritative — verify against git.
- **D-number ceiling:** `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — `decisions.md` is the SOLE source of truth for the D-ceiling. Never assign a D without this check.
- **Framework counts (blocks/attrs/slots/roles):** query `/sgs-db` or `/wp-blocks` — the DB is authoritative; counts are NOT maintained in prose anywhere.
- **Commit discipline:** commit by EXPLICIT PATH (`git commit -- <paths>`), never `git add -A` — keeps unrelated in-flight edits out of a commit. `main` is the source of truth.

## ACTIVE WORKSTREAM — Cloning CSS-transfer rebuild (the ONLY active work)
- **SoT for current status:** `.claude/handoff.md` (latest session) + `.claude/next-session-prompt.md` (the operative opener, with the MANDATORY READING GATE). READ THOSE — do not rely on a summary here.
- **One-line where-we-are (2026-06-23, D243):** **Phase-F COMPLETE + the modular-scaffold VERTICAL SLICE BUILT + LANDED + Bean-signed-off; NEXT = step 3 stage-by-stage rebuild, recognition (Method-2) FIRST.** Foundation (F1–F6 + F5 gates) SHIPPED/armed/wired/hardened (D232–D241). **Slice (D243, commits `51737bb0`/`576afce3`/`abe35427`):** new `converter/` modular home — 2 static anti-cheat gates (no-slug-literal AST hardened past design + import-ban; baselined clean, proven exit-1, wired to f5-commit-gate) + dispatch_table (names no block) + typed Ctx/Decl + 7 services + the ONE real `outer_box` (max-width→maxWidth) + 6 GAP-stubs + orchestrator (conservation/totality/unrouted hard-fail) + coverage report. **LANDED-proven** on a live canary (verdict.py = LANDED; computed max-width 1200px == draft, box actually 1200px, non-default). 580+6xfail tests; convert.py byte-identical (D-MODULAR). Bean signed off (R-22-13). **D-CEILING: D243.** **DEFERRED to step-3 stages (A14):** the 6 stub resolvers' real logic + per-stage LANDED proof; golden-source gate (A8) + fixture-corpus conservation runnable (need the full walk); media_signal DB-source (A11, scalar stage); outer_box's non-max-width OUTER props (padding/gap/background/align — honest stubs now); the full F3-runtime harness (slice proved the minimal one-fixture probe). **(P-F5-RESIDUALS:** css_router D1 media-axis still rebuild-MF-2-owned.)
- **Canonical specs:** `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` (v0.3 — THE build blueprint; read §12 FIRST) + `.claude/specs/22-...` (the underlying pipeline architecture). Reading order: see `docs-registry.yaml` `cold_start_reading_order` (Spec 31 + the pipeline map are now mandatory top reads).

## DONE / ARCHIVED — theme + WooCommerce layer (Spec 30, no longer an active thread)
- **Spec 30 COMPLETE + MERGED (D220, 2026-06-12) — SGS is a sellable shop.** This work is finished; it is NOT a parallel thread anymore. Session docs archived to `memory/handoff-theme-2026-06-12.md` + `next-session-prompt-theme-2026-06-12.md`. Deferred roadmap items (B2B ex-VAT, subscriptions/build-a-box, F5/F10) live in `parking.md` — pick up via a fresh `/handoff` only if/when a theme task is explicitly started. Specs: 30 (COMPLETE) · 27 (product/configurator master) · 28 (bulk pricing, COMPLETE) · 26 (global styles, build-deferred).

## DOC DISCIPLINE
- `decisions.md` / `parking.md` / `mistakes.md` are append-only — append, never clobber; D-ceiling check (above) MANDATORY before a new D.
- `/handoff` writes `handoff.md` + `next-session-prompt.md` + this block.

## BLOCKERS
- None block the next session. Known-open items live in `handoff.md` "Known Issues".

<!-- Caps: this file ≤24576 bytes, ≤60 lines of body. History → memory/state-archive.md. If a fact here also lives in another doc, that other doc is the SoT and this is a POINTER — do not duplicate detail. -->
