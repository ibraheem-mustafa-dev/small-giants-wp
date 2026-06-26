---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-06-26
note: "LEAN snapshot (single active workstream as of 2026-06-17 — the cloning CSS-transfer rebuild; theme/Spec-30 work COMPLETE + archived). Full history → memory/state-archive.md. This file holds ONLY the current pointer; detail lives in handoff.md + next-session-prompt.md (the SoT). Do NOT restate D-numbers / counts / commit hashes here — they drift. ≤24576 bytes."
---

# small-giants-wp — State Snapshot (lean)

## Human Summary
Cloning CSS-transfer foundation (Phase F) COMPLETE; the modular-scaffold VERTICAL SLICE COMPLETE (D243). **Step 3's FIRST stage — recognition / Method-2 (Spec 31 §12.6 step 3) — is now BUILT + LANDED + Bean-signed-off 2026-06-26 (D244):** the fresh `converter/` engine recognises a draft `.sgs-hero` as native `sgs/hero` with `variant=split` (BEM modifier ↔ `variant_slots.variant_value`), and the genuine `emit_block_markup()` output rendered live on a canary as a true `wp-block-sgs-hero` with the exclusive `sgs-hero--split` class. Universal (R-22-9) proven: all 10 variants across both variant-bearing blocks recognise + land their `--variant` class live (hero ×4, testimonial ×6-with-content). Built name-free from Spec 22 FR-22-3 + the DB + the draft (never `convert.py`); 75 converter + 603 scoped-regression tests green; `no_slug_literal` hardened (4 cheat-gaps closed) + `coverage --check` (loud UNRECOGNISED); multi-model review findings fixed; `convert.py` byte-identical (D-MODULAR). The single active workstream is **step 3 continuing — the next pipeline stage in order** (slot list / scalar-media child-shape fork, Stage 3c/4f), each its own design-gate + LANDED proof (A14). Design doc: `.claude/plans/2026-06-23-stage2-recognition-design.md` v2. D-ceiling D244, branch `main`.

## State Snapshot

## GROUND TRUTH FIRST — do not trust any doc's cached status; verify these every session
- **HEAD + tree:** `git log -1 --stat` + `git status` + `git branch --show-current`. NO doc's "latest_commit"/"working_tree" line is authoritative — verify against git.
- **D-number ceiling:** `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — `decisions.md` is the SOLE source of truth for the D-ceiling. Never assign a D without this check.
- **Framework counts (blocks/attrs/slots/roles):** query `/sgs-db` or `/wp-blocks` — the DB is authoritative; counts are NOT maintained in prose anywhere.
- **Commit discipline:** commit by EXPLICIT PATH (`git commit -- <paths>`), never `git add -A` — keeps unrelated in-flight edits out of a commit. `main` is the source of truth.

## ACTIVE WORKSTREAM — Cloning CSS-transfer rebuild (the ONLY active work)
- **SoT for current status:** `.claude/handoff.md` (latest session) + `.claude/next-session-prompt.md` (the operative opener, with the MANDATORY READING GATE). READ THOSE — do not rely on a summary here.
- **One-line where-we-are (2026-06-26, D244):** **Phase-F + the modular scaffold COMPLETE; step-3 Stage 2 (recognition / Method-2) BUILT + LANDED + Bean-signed-off; NEXT = the next pipeline stage in order (slot list / scalar-media child-shape fork, Stage 3c/4f).** **Stage 2 (D244, commits `81971f00`→`712f037d`):** fresh `converter/recognition.py` 4-branch (named→atomic→scalar→unrecognised), name-free DB-driven; `recognise()` routes `.sgs-hero`→`sgs/hero`+`variant=split` (BEM modifier ↔ `variant_slots.variant_value`); `has_inner` derived FRESH from save.js (Spec 31 §12.7, not the cached column); `GapOrigin.UNRECOGNISED` loud-fail; `no_slug_literal` hardened (slug-arg + variant bare-string + AnnAssign, 4 gaps closed) + `coverage --check`. **LANDED-proven** live: all 10 variants (hero ×4, testimonial ×6-with-content) render their own `--variant` class, never a container fallback. 75 converter + 603 scoped-regression green; multi-model review fixed; convert.py byte-identical (D-MODULAR). Bean signed off (R-22-13). **D-CEILING: D244.** **DEFERRED (A14):** scalar branch data-limited (`slots.standalone_block` 40/103 → seed via `/sgs-update`); content-requiring blocks' full visual LANDED is Stage-4f; golden-source gate (A8) + fixture-corpus conservation runnable (need the full walk); the prior slice's 5 stub resolvers' real logic (per-stage). **(P-F5-RESIDUALS:** css_router D1 media-axis still rebuild-MF-2-owned.)
- **Canonical specs:** `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` (v0.3 — THE build blueprint; read §12 FIRST) + `.claude/specs/22-...` (the underlying pipeline architecture). Reading order: see `docs-registry.yaml` `cold_start_reading_order` (Spec 31 + the pipeline map are now mandatory top reads).

## DONE / ARCHIVED — theme + WooCommerce layer (Spec 30, no longer an active thread)
- **Spec 30 COMPLETE + MERGED (D220, 2026-06-12) — SGS is a sellable shop.** This work is finished; it is NOT a parallel thread anymore. Session docs archived to `memory/handoff-theme-2026-06-12.md` + `next-session-prompt-theme-2026-06-12.md`. Deferred roadmap items (B2B ex-VAT, subscriptions/build-a-box, F5/F10) live in `parking.md` — pick up via a fresh `/handoff` only if/when a theme task is explicitly started. Specs: 30 (COMPLETE) · 27 (product/configurator master) · 28 (bulk pricing, COMPLETE) · 26 (global styles, build-deferred).

## DOC DISCIPLINE
- `decisions.md` / `parking.md` / `mistakes.md` are append-only — append, never clobber; D-ceiling check (above) MANDATORY before a new D.
- `/handoff` writes `handoff.md` + `next-session-prompt.md` + this block.

## BLOCKERS
- None block the next session. Known-open items live in `handoff.md` "Known Issues".

<!-- Caps: this file ≤24576 bytes, ≤60 lines of body. History → memory/state-archive.md. If a fact here also lives in another doc, that other doc is the SoT and this is a POINTER — do not duplicate detail. -->
