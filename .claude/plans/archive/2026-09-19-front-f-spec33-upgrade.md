---
doc_type: plan
plan_id: front-f-spec33-upgrade
status: DONE (parts 1 to 3; part 4 open, see Open items)
governing_spec: 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md
created: 2026-09-19
approved_by: Bean (2026-09-19, scope and the palette-overlay widening, both approved in conversation)
---

# Front F, Spec 33 upgrade: read a Claude Design draft's declared design system

## Why

Spec 33 was built for drafts that declare tokens in a `<style>` `:root` block. A Claude Design handoff declares its design system in three other places (a README token table, script data, inline styles) and Spec 33 read none of them. On the Eye Care Birmingham test site that left the framework's teal `primary`, 8px-rounded buttons and a 1200/1400 layout, a scrollbar-hover grey as `surface-alt`, and no business details in the Site Info store.

## Scope (approved)

Parts 1 to 3 now; part 4 (the pipeline inserting saved values in place of `{{ }}` placeholders) is a separate converter change and follows once this is verified.

1. Read the draft's declared values: README token table, script variant sets, inline styles, JS values that feed a style attribute, rendered facts. Rendered value wins any disagreement.
2. Build a per-site palette OVERLAY on the base SGS palette from colours with a proven consistent role. Everything else stays literal hex on its block. Placeholder-tier colours get no slot. Alternative accent sets are stored under `settings.custom.accentSets`, not in the picker.
3. Fix the extractor faults found on the real page: Pass B voting on scrollbar/hover rules; Pass B replacing the framework palette; classless buttons never measured; the push script wiping the palette when it strips advisory entries and failing on a brand-new site.
4. Extend the business-details step: read the script data object and labelled page text, run for any draft location, target the right site, and emit a placeholder map (`{{ phone }}` to `phone`).

## Guards

- Mama's Munches: byte-identical snapshot before and after (`test_matches_golden_snapshot`, `test_determinism_byte_identical`).
- Universal: no client literals in code; vocabulary in data tables.
- Global defaults only; no per-element values.

## Steps

| # | Step | Owner | Files (exclusive) | Done when |
|---|---|---|---|---|
| 0 | Restore the extractor test baseline (helper missed the `repo` argument) | controller | `tests/test_extractor.py` (helper only) | 29 of 29 pass |
| A1 | Pass B skips UA-chrome and state selectors; Pass B overlays instead of replacing | subagent | `roles.py`, `derive.py`, `extract.py` palette block, one test | new tests plus golden green |
| A3 | `declared_sources.py`: README tokens, script variant sets | subagent | new module and tests | tests green on synthetic and real files |
| A4 | `usage_census.py`: three-source usage count and promotion rule | subagent | new module and tests | tests green; rule verified on real draft |
| A5 | `measure.js` and `presets.py`: classless buttons, custom properties | subagent | `measure.js`, `presets.py`, new tests | Mama's presets unchanged; classless captured |
| A2 | `push-theme-snapshot.py`: strip restores base colour; fresh-site backup; exit code | subagent | that script and its tests | strip never empties the palette |
| A6 | Business details: script data object and labelled text, any draft path, right site, placeholder map | subagent | `sync-business-info.py`, business block of `upload_and_patch.py`, one orchestrator argument | extractor finds all Eye Care settings |
| A7 | Integration: wire A1 to A5 into `build_snapshot` (palette overlay by role, accentSets, layout, heading weight, buttons) | subagent | `extract.py`, new mapping module, tests | Eye Care snapshot correct; Mama's identical |
| R | Independent review per wave (different model family) | reviewer | read-only | no Critical or Important open |
| V | Real-page verification on the Eye Care test site (palette, buttons, Site Info values) | controller | live test site | Playwright and `wp` reads match |
| Q | `/qc-council`, then spec, decisions, ledger and plan updates | controller | docs | preflight passes |

## Risks

| Risk | Response |
|---|---|
| Two agents editing `extract.py` | A1 finishes before A7 starts; only those two touch it |
| Role mapping too specific to one draft | Vocabulary lives in a data table; tests include a second (Mama's) draft |
| Overlay hides a wrong guess | Derived entries stay advisory; the push restores the base value |
| Font files written into the shared theme by extraction | Extractor is never run end to end by agents; flagged for a decision |

## Result

Built, reviewed twice (implementer reviews plus a three-rater QC council), fixed and verified on the Eye Care test site: decision D1120 and Spec 33 FR-33-15 to FR-33-17 hold the detail. Steps 0, A1 to A8, F1 to F6 and R done; V (live verification) and Q (council and docs) done. Two steps grew beyond the plan and are recorded in D1120: a freshness key for Claude Design drafts, and variable-font faces.

## Open items carried out of this plan

Part 4 (the pipeline inserts the saved values in place of `{{ }}` bindings, using `sites/eye-care-ward-end/site-info-placeholder-map.json`); Task 3 (missing homepage sections); Task 4 (runtime bindings); cloned buttons painting transparent.
