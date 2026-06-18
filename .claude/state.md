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
- **One-line where-we-are (2026-06-18, D234):** **Phase-F F2 + F3-core both SHIPPED; NEXT = F4.** F2 (draft-derived CSS Accounting Ledger, `f8a746c7`, D232) + **F3-core (the LANDED render-oracle, `6b430dae`, D234) SHIPPED.** F3-core = `plugins/sgs-blocks/scripts/oracle/` (sibling of `ledger/`): verdict engine (§3 precedence, tri-state compare, ΔE≤1/≤1px reusing parity2 helpers — NOT its BEM matcher) + 4 false-win guards + MR-2 name-free-routing + frozen F3→F5 §6 contract + 181 tests wired into prebuild. **LIVE-CANARY PROVEN** (acceptance #1): cloned `rt-centred-maxwidth` → published live on canary page 1199 → probed getComputedStyle → 4 LANDED + 2 UNVERIFIED, all CORRECT on a non-default fixture (`_render-oracle/rt-centred-maxwidth.{landed,probe}.json` committed). Built via SDD (sonnet) → cross-model Opus review (4 HIGH+5 MED, all fixed) → live proof → qc-council (empirical hard-gate met; cross-family Gemini tool-blocked → stood in with a branch trace → FIX-M). **NEXT SESSION = build F4** (closed `excluded_properties` DB table, ships EMPTY + literal-ban gate) → F5 (build+ARM the 3 gates) → F6 (DB-as-code consistency) → stage-by-stage rebuild. **D-CEILING: D234.** Gate A green; `converter_v2/tests/` path does not exist — Gate A is the live converter suite. The 3 missing F5 gates (check-converter-cheats.py / generate-coverage-matrix.py / ledger checker) still do NOT exist — building them is F5. F3-RUNTIME (full-37 / cache / pixel-diff / deploy choreography / %-calc-vw length resolution / MR-1/MR-3) is DEFERRED.
- **Canonical specs:** `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` (v0.3 — THE build blueprint; read §12 FIRST) + `.claude/specs/22-...` (the underlying pipeline architecture). Reading order: see `docs-registry.yaml` `cold_start_reading_order` (Spec 31 + the pipeline map are now mandatory top reads).

## DONE / ARCHIVED — theme + WooCommerce layer (Spec 30, no longer an active thread)
- **Spec 30 COMPLETE + MERGED (D220, 2026-06-12) — SGS is a sellable shop.** This work is finished; it is NOT a parallel thread anymore. Session docs archived to `memory/handoff-theme-2026-06-12.md` + `next-session-prompt-theme-2026-06-12.md`. Deferred roadmap items (B2B ex-VAT, subscriptions/build-a-box, F5/F10) live in `parking.md` — pick up via a fresh `/handoff` only if/when a theme task is explicitly started. Specs: 30 (COMPLETE) · 27 (product/configurator master) · 28 (bulk pricing, COMPLETE) · 26 (global styles, build-deferred).

## DOC DISCIPLINE
- `decisions.md` / `parking.md` / `mistakes.md` are append-only — append, never clobber; D-ceiling check (above) MANDATORY before a new D.
- `/handoff` writes `handoff.md` + `next-session-prompt.md` + this block.

## BLOCKERS
- None block the next session. Known-open items live in `handoff.md` "Known Issues".

<!-- Caps: this file ≤24576 bytes, ≤60 lines of body. History → memory/state-archive.md. If a fact here also lives in another doc, that other doc is the SoT and this is a POINTER — do not duplicate detail. -->
