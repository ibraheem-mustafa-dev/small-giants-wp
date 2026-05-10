# sgs-framework.db audit — 2026-05-10

DB: `~/.agents/skills/sgs-wp-engine/sgs-framework.db`
Total tables: 24
Empties surveyed: 5

## Per-table verdict

| Table | Rows | Cols | Verdict | Reason |
|---|---:|---:|---|---|
| animation_tokens | 7 | 9 | keep | populated, motion design tokens |
| animations | 0 | 15 | keep | schema migrated 2026-05-10 (gap-flag columns); /sgs-update Stage 4 will populate |
| block_attributes | 1314 | 8 | keep | core SGS block schema |
| block_capabilities | 88 | 3 | keep | core |
| block_changes | 639 | 5 | keep | history log |
| block_compositions | 36 | 8 | keep | seeded 2026-05-10 |
| block_opportunities | 0 | 8 | **drop candidate** | only in 2 retired toolset specs (2026-04-21, 2026-04-27); no active script |
| block_selectors | 68 | 4 | keep | block.json `selectors` API config (per session decision 2026-05-10) |
| block_supports | 340 | 4 | keep | core |
| blocks | 66 | 13 | keep | core |
| components | 9 | 5 | keep | populated |
| deploy_steps | 9 | 6 | keep | populated |
| design_tokens | 28 | 5 | keep | core |
| extraction_cache | 0 | 5 | **drop candidate** | URL-keyed cache, never populated; only referenced in 2 retired specs |
| gotchas | 12 | 7 | keep | populated |
| hooks | 6 | 7 | keep | populated |
| pattern_coverage | 96 | 5 | keep | populated |
| patterns | 36 | 17 | keep | populated |
| pipeline_corrections | 4 | 8 | keep | populated |
| plugins | 3 | 7 | keep | populated |
| sections_detected | 0 | 8 | **drop candidate** | only in 2 retired toolset specs; no active script |
| style_variations | 8 | 11 | keep | populated |
| theme_parts | 22 | 5 | keep | populated |
| weaknesses | 0 | 8 | **drop candidate** | 18 hits but all word-match false positives (unrelated skills mention "weaknesses"); no active script writes this table |

## Drop candidates: 4

`block_opportunities`, `extraction_cache`, `sections_detected`, `weaknesses`.

All 4 share the same provenance — speculative scaffolding from the 2026-04-21 / 2026-04-27 toolset / optimisation-toolkit specs. None has been populated; none is on the M9 / convention-rollout critical path; none is referenced by any current script.

## Cross-reference notes

- `animations` is intentionally empty post-2026-05-10 schema migration; keep.
- `extraction_cache` per Decisions 2026-05-10: "extraction_cache is empty + URL-keyed cache" — confirmed unused.