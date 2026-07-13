---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-13
session: D318/D319 — Spec 33 Part 1 BUILT (draft global-styles extractor) + D303 killed live; palette made additive (pink regression fixed)
---

# Session Handoff — 2026-07-13 (D318/D319)

## Completed This Session
0. **D319 — extractor palette made ADDITIVE (Bean-caught pink regression fixed).** After the D318 deploy, `surface-pink` sections (hero/trust-bar/gift) + gift-card labels went CREAM — the palette generator renamed `surface-pink`→`custom-surface-pink`, dropped declared tokens, and was a subset missing hand-added colours → already-cloned blocks' `var(--…--surface-pink)` went undefined. Fix: raw-token-name slugs + emit-all-declared + `extract.py --merge-onto <existing>` (additive, preserves extras + component CSS). LANDED live (all pink restored, 21 slugs, 0 errors); 18 tests. Also archived 3 complete plans. Commit `067d7bbe`.
1. **BUILT the Spec 33 draft global-styles extractor** — `plugins/sgs-blocks/scripts/theme-extractor/` (9 modules: `measure.js` + `colour/token_map/roles/palette/typography/presets/extract/schema_validate`). Hybrid Node(Playwright)+Python, outside `converter/` so free to use `tinycss2`+`colormath`. Executed Phases 1-4 of `.claude/plans/go-parallel-blum.md`.
2. **The iron law (FR-33-1/3) — D303 killed by construction.** Emitted value is ALWAYS the COMPUTED value on a rendered node; declared CSS supplies only name/role. Base body = the longest main-content `<p>` (16px); heading line-height = the MODE ratio across non-chrome headings (1.2 — the hero's 1.15 is an outlier excluded by construction; naive "first h1" IS the hero → would re-ship the drift); rem vs real computed root.
3. **Palette (FR-33-2)** — role by usage-context (`:hover` selectors excluded from identity), two-pass slug assignment (identity roles first, then a logged name-tiebreak): primary=coral #E68A95 (the button bg, not the near-white footer link); ΔE≤1 dedup, alpha a separate axis; translucent + dead `:root` tokens gap-logged.
4. **Guards** — 16 tests (`theme-extractor/tests`), byte-identical re-run (determinism FR-33-8), frozen `build_draft_root_colour_map` asserted unchanged (golden FR-33-10), theme.json v3 schema-validate (FR-33-7), no converter regression (import-ban scoped to `converter/`; freeze unit test green).
5. **Deploy safety (FR-33-11)** — `push-theme-snapshot.py` gained default-on `--backup` (persists live disk theme.json + wp_global_styles), one-command `--rollback`, and a Site-Editor drift warning.
6. **PROVEN LIVE on Mama's sandybrown page 8** (Bean chose full cutover) — deployed the generated snapshot (backup taken; OPcache+LiteSpeed cleared). base 16px/1.6, brand quote 16px, h2/h3 1.2, hero h1 1.15 faithful, buttons faithful; all baseline theme.json keys preserved.
7. **Two bugs caught via LIVE measurement (STOP-VERIFY-COLOUR), not code review** — (1) an early merge-from-partial would have stripped 136 baseline keys; fixed by merging generated-full + carried-forward component CSS. (2) `presets.py` dropped alpha → the draft's transparent secondary/outline buttons rendered opaque BLACK; fixed to preserve alpha + regression test.
8. **Docs** — Spec 33 → v1.0.0 (built); D318 decision; state.md + parking (`P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE` → PARTIAL); 2 lessons captured.

## Current State
- **Branch:** `main` at `067d7bbe` (pushed: e0a73b04 D318 build, a30c8901 D318 handoff, 067d7bbe D319 palette fix).
- **Tests:** extractor 18/18 pass; converter freeze/import-ban unit tests green; full converter suite NOT re-run (no converter code touched — extractor is decoupled).
- **Build:** n/a this session (Python/data/docs only — no `npm run build` needed; no block CSS/JS changed).
- **Uncommitted changes:** the handoff docs being written now (state.md, handoff.md, next-session-prompt.md, parking.md) — committed at Gate 2.
- **Live:** sandybrown page 8 driven by the generated snapshot; D303 dead; caches cleared.

## Known Issues / Blockers
- **Transitional component CSS in the Mama's snapshot** — the hand-authored `styles.css` (buttons/hero-CTA/focus-ring) is carried forward in `sites/mamas-munches/theme-snapshot.json` to avoid regression, but the extractor emits global tokens/base only; this CSS should migrate to theme/block CSS (Phase 6).
- **Full pipeline reclone NOT run** — the D303 proof holds on the deployed snapshot + existing page (theme-level inheritance + buttonPresets driving live button colour). The FR-33-12 ordering gate + a full reclone are Phase 5.
- Dashboard down (WinError 10061) — 2 lessons marked `pending_upload`; POST to `/api/learning` when up.

## Next Priorities (in order)
1. **Phase 5 — FR-33-12 orchestrator fail-closed freshness gate** (extractor must run + validate before ANY block clone; insert in `sgs-clone-orchestrator.py` after Stage-0 theme load ~line 2373, before conversion ~line 2416; reuse the `(client_slug, hash(css))` pattern from `styling_helpers.py:276`, persisted) + `cloning-pipeline-flow.md`/`spec-31 §3.A`/`../CLAUDE.md` doc updates.
2. **Phase 6 — FR-33-5 Pass B advisory** (derived tokens `_source:derived`+confidence, never auto-live; nothing-usable→baseline+skip; parser-fail→HALT) + FR-33-6 dark-theme/preview-shell safety + FR-33-13 header/footer namespace reserve + re-point `P-DRAFT-CSSVAR-*` at `build_draft_root_token_map()`.
3. **Migrate the transitional component `styles.css`** out of the Mama's snapshot into theme/block CSS, then re-verify no regression.
4. **(later)** Roll out to the other 5 client snapshots (each behind its own reclone + parity, FR-33-11); then Part 2 = header/footer clone (Spec 17).

## Files Modified
| File | What changed |
|---|---|
| plugins/sgs-blocks/scripts/theme-extractor/ (9 new modules + tests/ + expected/) | NEW — the extractor package |
| plugins/sgs-blocks/scripts/push-theme-snapshot.py | `--backup`/`--rollback`/drift-warn (FR-33-11) |
| sites/mamas-munches/theme-snapshot.json | deployed: generated globals + carried-forward component CSS |
| sites/mamas-munches/theme-snapshot.generated.json, theme-extract-trace.json | NEW — pure extractor output + provenance trace |
| .claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md | → v1.0.0 (built), FRs shipped, last_verified |
| .claude/decisions.md | D318 |
| .claude/state.md, parking.md | D318 summary; P-DRAFT-TOKEN-EXTRACTION → PARTIAL |
| .claude/plans/go-parallel-blum.md | NEW — the D318 build plan (approved) |

## Notes for Next Session
- **The extractor palette is ADDITIVE (D319)** — client colours keep their raw draft-token-name slug; deploy to an existing site via `extract.py --merge-onto <existing>` (preserves extra slugs + component CSS). NEVER a straight palette replace on an already-cloned site (breaks slug references → the pink regression). A reclone is the correct end-state (Phase 5 / FR-33-12), but was NOT needed to un-break — additive preserved every slug name.
- **Plans archived (D319)** — `2026-07-04-new-engine-to-parity-delete-converter-v2.md` (+ its execution companion stays as a spec-31 design record), `2026-07-05-css-property-column-design.md`, `2026-07-05-preset-sync-design.md` → `.claude/plans/archive/`. CLAUDE.md pointers updated. A fuller plan-archive sweep (the other July design docs referenced by specs 31/32) was left — they're active-spec design records.
- **The extractor is DECOUPLED from the converter** — it lives outside `converter/`, adds no converter dependency, and touched no converter code. The `converter/tests/test_import_ban.py` is scoped to `converter/` only, so `tinycss2`/`colormath` are fine in the extractor.
- **The generated snapshot is a FULL baseline-overlaid theme.json** (extract.py deep-copies `theme/sgs-theme/theme.json`) — because `push-theme-snapshot` SCPs it AS the server theme.json (full replacement). Never deploy a partial or a generated-onto-partial merge (strips baseline keys).
- **Outcome (Gate 3.5):** OUTCOME ACHIEVED for the checkpoint Bean chose (D303-dead-live + committed). CODE SHIPPED, OUTCOME NOT YET HIT for the FULL Spec 33 scope — FR-33-5/6/12/13 + the component-CSS migration + other-5-client rollout are named Phase 5-6 stages, not "out of scope".

## Next Session Prompt
See `.claude/next-session-prompt.md` (Phase 5-6 orchestration + carried-forward STOP catalogue + reading gate).
