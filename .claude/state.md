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
- **One-line where-we-are (2026-06-18, D231):** **Width-model fix SHIPPED + Phase-F started.** This session: (1) a Bean-initiated exact-match width fix — **D230 (`484d04d9`)** retired `widthMode`/`customWidth` for a 3-layer model (`align` breakout / `maxWidth` literal / `contentWidth` token-or-literal), **D231 (`d5416ae8`)** renamed contentWidth tokens (`normal`/`wide`/`full`, default `full`) + swept 29 vestigial `widthMode` block.json decls; designed via brainstorming→adversarial-council→qc-council, **LANDED-verified live on the canary**, both conformance suites green, DB reseeded (113 orphan attrs pruned). (2) **Phase F step F1 DONE** — the multi-shape fixture corpus exists at `plugins/sgs-blocks/scripts/tests/fixtures/phase-f/` (README index + `sgs-media` + 5 red-team fixtures, each with an `expected.md`). The clean-rebuild blueprint is unchanged: **`specs/31-...`** (§12 = rebuild direction; §2/§3/§8 updated for the shipped width model; §12.7 F1 marked done), the **24-stage routing map** (`reports/pipeline-routing-map-2026-06-17.html`), the **council register** (`reports/2026-06-17-adversarial-council-register-and-rebuild-direction.md`). Parity baseline (METRIC, not goal): content 100%; full mobile 61.82% / tablet 59.09% / desktop 55.45%. **NEXT SESSION = Phase F step F2** (draft-declaration parser → the CSS Accounting Ledger, per Spec 31 §12.2.1 + §12.7), then F3-F6, then the stage-by-stage rebuild. **D-CEILING: D231.** Gate A + `converter_v2/tests/` — run BOTH; the new gates (check-converter-cheats.py / generate-coverage-matrix.py / ledger checker) still do NOT exist — building them is F5.
- **Canonical specs:** `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` (v0.3 — THE build blueprint; read §12 FIRST) + `.claude/specs/22-...` (the underlying pipeline architecture). Reading order: see `docs-registry.yaml` `cold_start_reading_order` (Spec 31 + the pipeline map are now mandatory top reads).

## DONE / ARCHIVED — theme + WooCommerce layer (Spec 30, no longer an active thread)
- **Spec 30 COMPLETE + MERGED (D220, 2026-06-12) — SGS is a sellable shop.** This work is finished; it is NOT a parallel thread anymore. Session docs archived to `memory/handoff-theme-2026-06-12.md` + `next-session-prompt-theme-2026-06-12.md`. Deferred roadmap items (B2B ex-VAT, subscriptions/build-a-box, F5/F10) live in `parking.md` — pick up via a fresh `/handoff` only if/when a theme task is explicitly started. Specs: 30 (COMPLETE) · 27 (product/configurator master) · 28 (bulk pricing, COMPLETE) · 26 (global styles, build-deferred).

## DOC DISCIPLINE
- `decisions.md` / `parking.md` / `mistakes.md` are append-only — append, never clobber; D-ceiling check (above) MANDATORY before a new D.
- `/handoff` writes `handoff.md` + `next-session-prompt.md` + this block.

## BLOCKERS
- None block the next session. Known-open items live in `handoff.md` "Known Issues".

<!-- Caps: this file ≤24576 bytes, ≤60 lines of body. History → memory/state-archive.md. If a fact here also lives in another doc, that other doc is the SoT and this is a POINTER — do not duplicate detail. -->
