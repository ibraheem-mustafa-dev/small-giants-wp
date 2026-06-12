---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-06-12
note: "LEAN per-thread snapshot (restructured 2026-06-06 per doc-council). Full pre-restructure history → memory/state-archive.md. This file holds ONLY the current per-thread pointer; detail lives in each thread's handoff + next-session-prompt (the SoT). Do NOT restate D-numbers / counts / commit hashes here — they drift. ≤24576 bytes."
---

# small-giants-wp — State Snapshot (lean)

## GROUND TRUTH FIRST — do not trust any doc's cached status; verify these every session
- **HEAD + tree:** `git log -1 --stat` + `git status` + `git branch --show-current`. NO doc's "latest_commit"/"working_tree" line is authoritative — they are stale the moment the other thread commits.
- **D-number ceiling:** `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — `decisions.md` is the SOLE source of truth for the D-ceiling. Never assign a D without this check (two threads share one decisions.md).
- **Framework counts (blocks/attrs/slots/roles):** query `/sgs-db` or `/wp-blocks` — the DB is authoritative; counts are NOT maintained in prose anywhere.
- **Which thread am I on?** TWO co-active threads share `main`. Pick your thread, then read ONLY its block below + its handoff + its next-session-prompt. Commit by EXPLICIT PATH (`git commit -- <paths>`), never `git add -A`.

## NEXT SESSION = SGS-THEME THREAD (continuing; updated 2026-06-11 NIGHT)
- Read `.claude/next-session-prompt-theme.md` + the plan `.claude/plans/2026-06-11-spec30-p2-differentiators-shop-schema.md` (has a `## Ground truth` block). **Spec 30 P2:** Gate A (FR-30-8 + FR-30-10) + Gate B (FR-30-3 shop archive) now BOTH COMPLETE + merged to main (D213). The shop archive works LIVE on the canary: WC filter sidebar renders + filters the grid instantly (Interactivity router), equal-height cards with baseline-aligned CTAs, accessible mobile filter drawer, new `sgs/collapsible-text` read-more (i18n'd). RESUME at **Step 6** (FR-30-6 searchable filter) → Step 7a/7b (FR-30-5 product search tentpole — design-gate + hardened REST) → Step 9 (FR-30-9 schema) → Step 11/12 (go-live + phase close). Commit by EXPLICIT PATH; exclude never-stage `lucide-icons.php`; the cloning thread has UNCOMMITTED staged testimonial work in the shared tree — do NOT sweep it.

## CLONING-PIPELINE THREAD  (owner of: this block, handoff.md, next-session-prompt.md)
- **DOC-COUNCIL BACKLOG CLOSED 2026-06-06** (all FATAL + HIGH shipped/recalibrated/dismissed — see `.claude/reports/2026-06-06-doc-council-findings.md` STATUS table). The "adversarially-review all .claude docs" sub-goal in next-session-prompt.md is DONE; the converter-fix continuation there still stands.
- **SoT for current status:** `.claude/handoff.md` (latest session) + `.claude/next-session-prompt.md` (the operative opener). READ THOSE — do not rely on a summary here.
- **One-line where-we-are (2026-06-12 LATE):** **The "Stage 1 padding routing" priority was a MISDIAGNOSIS — disproved live** (section padding renders correctly via WP-native spacing). The 55-row ledger was RE-BASELINED against the live DOM (`.claude/reports/2026-06-12-ledger-rebaseline-live-dom.md` — trust it over old family tags): ~13 already-fixed, ~22 broken in 8 patterns P1–P8, ~7 design decisions. **CLOSED + live-verified this session:** the text-CSS cluster — P1 margin (GF-C/GF-E/SP-B), P2 Fraunces font (FP-M/GF-E/F), colour+text-align, P4 label border-radius (GF-D.2) — via a 3-layer render-chain fix (orphaned scoped CSS → block attrs; number+unit split for number-typed attrs; font-family esc_attr→safecss mangle). On main: 87cd3ba0/691298d7/7867372f/44ab24fa. **NEXT (next-session-prompt.md): P5 block-quality cluster** (BR-C/SP-F/TB-A-B/FP-N-I-O-P/IN-C — block render-defaults, not converter routing) + P7/P8 + P3 content-band. Per-row live-DOM probes are the acceptance; parity aggregate retired. **HARD LESSON: emit-green ≠ rendered — verify the full render chain.**
- **Canonical spec:** `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`. Reading order: see `docs-registry.yaml` `cold_start_reading_order`.

## SGS-THEME THREAD  (owner of: this block, handoff-theme.md, next-session-prompt-theme.md)
- **SoT for current status:** `.claude/handoff-theme.md` (latest session) + `.claude/next-session-prompt-theme.md` (the operative opener). READ THOSE.
- **One-line where-we-are (2026-06-12, session 22, D214):** **Spec 30 P2 SHOP LAYER COMPLETE + merged to main (`141ddd71`).** FR-30-3 archive (D213) + FR-30-5 product search + FR-30-6 searchable filter all LIVE-VERIFIED on canary `/shop/` (QA Gate B filter + Gate C search 7/7: draft-leak, 429 rate-limit, XSS-inert, no-JS form, axe-0 combobox). Plus this session: `sgs/product-search` gained a `displayMode` attr with **inline-bar + icon-expand** variants (icon = native `<details>` disclosure, no-JS-safe); search is kept OUT of the framework default header and shipped as **3 opt-in header patterns** (`header-search-bar-above/below/icon`, category sgs-headers); the 5 hand-written architecture docs (specs 01/02/17 + plugin/theme CLAUDE.md) were synced to D191–D214. All merged to main via the co-active-safe temp-worktree cherry-pick (9 commits onto origin/main; cloning WIP on feat untouched). **NEXT:** **Step 9 — FR-30-9 schema** (net-new Organization + WebSite JSON-LD, cart/checkout/account `noindex`, `returnPolicyCountry`, remove dead FAQPage rich-result; design-gate FIRST per the draft-leak history) → Step 10 parked follow-ups → Step 11 go-live checklist → Step 12 phase close + R-22-13. Binding ORCHESTRATION MODEL: Opus main agent plans/delegates/QCs/live-tests/commits ONLY; subagents do all implementation (Bean directive 2026-06-11).
- **Canonical specs:** `.claude/specs/30-...md` (WC page types — P1 done, P2/P3/P4 ahead), `.claude/specs/27-...md` (product/configurator master, absorbs 24/25), `.claude/specs/28-...md` (smart bulk pricing), `.claude/specs/26-...md` (global styles, build-deferred). Live P1 plan `.claude/plans/2026-06-11-spec30-p1-wc-chassis.md` is COMPLETE (archive at next consolidation). Reading order: `docs-registry.yaml` `cold_start_reading_order_theme`.

## SHARED-STATE DISCIPLINE (two threads, one main)
- **Per-thread ownership:** each thread's `/handoff` writes ONLY its own block above + its own handoff/next-session-prompt. Never overwrite the other thread's block.
- **decisions.md / parking.md / mistakes.md** are shared append-only — append your entries, never interleave/clobber; D-ceiling check (above) is MANDATORY before a new D.
- **The real first-shop blocker is the CLONING converter** (the theme shop layer is complete + safe). Do not pull deferred theme work (Spec 28 P4 / R5) ahead of the converter.
- **RECONCILE NOTE (2026-06-11):** theme P1 FF-pushed to main, then origin/main was reconciled with the cloning thread's 25 unpushed local-main commits via merge `9f357129` (both lines verified present, zero conflicts). The cloning thread's local `main` (worktree `C:/tmp/sgs-p4`, `9c0321e6`) is now an ANCESTOR of origin/main → its next `git pull` fast-forwards cleanly. Cloning thread also has UNCOMMITTED staged converter work in the primary worktree's index — left untouched by the theme handoff (path-scoped commits only).

## BLOCKERS
- None block either thread's next session. (Per-thread known-open items live in each thread's handoff "Known Issues".)

<!-- Caps: this file ≤24576 bytes, ≤60 lines of body. History → memory/state-archive.md. If a fact here also lives in another doc, that other doc is the SoT and this is a POINTER — do not duplicate detail. -->
