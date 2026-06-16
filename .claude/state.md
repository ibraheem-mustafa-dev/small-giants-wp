---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-06-16
note: "LEAN per-thread snapshot (restructured 2026-06-06 per doc-council). Full pre-restructure history → memory/state-archive.md. This file holds ONLY the current per-thread pointer; detail lives in each thread's handoff + next-session-prompt (the SoT). Do NOT restate D-numbers / counts / commit hashes here — they drift. ≤24576 bytes."
---

# small-giants-wp — State Snapshot (lean)

## GROUND TRUTH FIRST — do not trust any doc's cached status; verify these every session
- **HEAD + tree:** `git log -1 --stat` + `git status` + `git branch --show-current`. NO doc's "latest_commit"/"working_tree" line is authoritative — they are stale the moment the other thread commits.
- **D-number ceiling:** `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — `decisions.md` is the SOLE source of truth for the D-ceiling. Never assign a D without this check (two threads share one decisions.md).
- **Framework counts (blocks/attrs/slots/roles):** query `/sgs-db` or `/wp-blocks` — the DB is authoritative; counts are NOT maintained in prose anywhere.
- **Which thread am I on?** TWO co-active threads share `main`. Pick your thread, then read ONLY its block below + its handoff + its next-session-prompt. Commit by EXPLICIT PATH (`git commit -- <paths>`), never `git add -A`.

## NEXT SESSION = CLONING-PIPELINE THREAD (theme thread COMPLETE — Spec 30 done D220; see cloning block below)
- **Spec 30 P2 COMPLETE + MERGED (D220, 2026-06-12).** All FRs shipped: FR-30-3/5/6 shop layer, FR-30-8/10 differentiators, FR-30-9 schema (D215), FR-30-7 buybox, FR-30-10 notify-me (D217), FR-30-13 go-live checklist. Plan archived. **SGS is a sellable shop.** Theme session docs ARCHIVED to `memory/` (theme thread complete); next theme work = roadmap (Spec 30 Open Q3 B2B ex-VAT / Q4 subscriptions + parking F-items), picked up via a fresh `/handoff` when a theme session runs. The cloning converter is the first-shop blocker — see cloning thread block below.

## CLONING-PIPELINE THREAD  (owner of: this block, handoff.md, next-session-prompt.md)
- **DOC-COUNCIL BACKLOG CLOSED 2026-06-06** (all FATAL + HIGH shipped/recalibrated/dismissed — see `.claude/reports/2026-06-06-doc-council-findings.md` STATUS table).
- **SoT for current status:** `.claude/handoff.md` (latest session) + `.claude/next-session-prompt.md` (the operative opener). READ THOSE — do not rely on a summary here.
- **One-line where-we-are (2026-06-16, D228):** **Missing-hero bug recovered, all branches reconciled to a single clean main, 2 visible bugs fixed + the container grid DE-CHEATED (faithful ratios + 768/1024 device-tier breakpoints) — the FOUNDATION for the grid rebuild.** Shipped on main: converter `_trace` dict-positional fix (recovered the whole-section soft-fail that dropped the hero, `2e437a4d`); Issue A hero full-bleed CSS hacks removed (`7736432c`); Issue B multi-button alias disambiguation (`437b2f82`); wrapper grid de-cheat — sgs-cols-* gated on empty ratio + 599→767 (`e66f8973`); converter `_GRID_TABLET_BP` 600→768 (`f997af25`); Stage-11 team-member roster fix (`70bcf164`); docs hardened D228 (`98859a6e`). Parity baseline: content 100% all sections; full mobile 61.82% / tablet 59.09% / desktop 55.45% (fidelity drops as viewport widens). **Bean corrections now CLAUDE.md rules:** composites are never a separate system; hardcoded wrapper defaults are cheats-to-remove not blockers; device-tier vs visual breakpoints are distinct (no blanket sweeps); variant setups are DB-defined (variant_slots). **NEXT SESSION = the grid/container-extraction REBUILD (analyse sgs/container block.json + DB + SGS_Container_Wrapper end-to-end → faithful capability map into every composite + responsive) → then hero fold (Stage 2) → product-card (Stage 3) → remove wrap_inner option (Stage 4) → then the Fam B/C/D/E/F defect register.** **D-CEILING: D228.** Gate A + `converter_v2/tests/` — run BOTH.
- **Canonical spec:** `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`. Reading order: see `docs-registry.yaml` `cold_start_reading_order`.

## SGS-THEME THREAD  (COMPLETE — Spec 30 D220; session docs archived to memory/handoff-theme-2026-06-12.md + next-session-prompt-theme-2026-06-12.md)
- **Status:** Spec 30 COMPLETE + MERGED (D220). Session docs archived to `memory/`. Next theme work = roadmap (Spec 30 Open Qs + parking); a fresh `/handoff` regenerates session docs when a theme session next runs.
- **One-line where-we-are (2026-06-12, D220):** **Spec 30 COMPLETE + MERGED to main (D220).** All Spec 30 P2 FRs shipped and Bean R-22-13 sign-off given. Plan archived (`.claude/plans/archive/2026-06-11-spec30-p2-differentiators-shop-schema-COMPLETE.md`). Open deferred items (B2B ex-VAT, subscriptions/build-a-box, F10 hex-flag guard, F5 org settings UI) are in parking. Binding ORCHESTRATION MODEL: Opus main agent plans/delegates/QCs/live-tests/commits ONLY; subagents implement (Bean directive 2026-06-11).
- **Canonical specs:** `.claude/specs/30-SGS-WOOCOMMERCE-PAGE-TYPES.md` (COMPLETE), `.claude/specs/27-...md` (product/configurator master), `.claude/specs/28-...md` (smart bulk pricing, COMPLETE), `.claude/specs/26-...md` (global styles, build-deferred). Reading order: `docs-registry.yaml` `cold_start_reading_order_theme`.

## SHARED-STATE DISCIPLINE (two threads, one main)
- **Per-thread ownership:** each thread's `/handoff` writes ONLY its own block above + its own handoff/next-session-prompt. Never overwrite the other thread's block.
- **decisions.md / parking.md / mistakes.md** are shared append-only — append your entries, never interleave/clobber; D-ceiling check (above) is MANDATORY before a new D.
- **The real first-shop blocker is the CLONING converter** (the theme shop layer is complete + safe). Do not pull deferred theme work (Spec 28 P4 / R5) ahead of the converter.
- **RECONCILE NOTE (2026-06-11, superseded 2026-06-13):** the co-active worktree reconcile + staged-converter-work caveat from 2026-06-11 is now superseded — D221/D222 shipped those staged changes to `main`. No outstanding staged converter work remains as of 2026-06-13 (`git status` clean except uncommitted doc/plan files). Both threads sharing `main` — path-scoped commits remain mandatory; D-ceiling check before every new D.

## BLOCKERS
- None block either thread's next session. (Per-thread known-open items live in each thread's handoff "Known Issues".)

<!-- Caps: this file ≤24576 bytes, ≤60 lines of body. History → memory/state-archive.md. If a fact here also lives in another doc, that other doc is the SoT and this is a POINTER — do not duplicate detail. -->
