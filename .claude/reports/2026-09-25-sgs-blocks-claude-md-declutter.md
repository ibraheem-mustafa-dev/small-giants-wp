# sgs-blocks CLAUDE.md declutter

## Sizes (before → after)

| File | Before | After |
|---|---|---|
| `plugins/sgs-blocks/CLAUDE.md` | 106,773 bytes | 10,593 bytes |
| `.claude/rules/block-editor-controls.md` (new) | — | 8,435 bytes |
| `.claude/rules/colour-emission.md` (new) | — | 14,246 bytes |
| `.claude/rules/backend-integrations.md` (new) | — | 2,134 bytes |
| `.claude/rules/migration-scripts.md` (new) | — | 7,292 bytes |
| `.claude/rules/motion-qa.md` (new) | — | 2,353 bytes |
| `.claude/rules/block-authoring.md` | 1,433 bytes | 3,396 bytes |
| `.claude/specs/02-SGS-BLOCKS.md` | 127,641 bytes | 125,934 bytes* |
| `CLAUDE.md` (root) | 7,536 bytes | 7,646 bytes |

\* Spec 02 shrank slightly net (a repointed sentence got shorter) despite the new HC2 paragraph
added.

Every block-touching session now loads 10.6 KB from the core file instead of 106.7 KB — the
path-scoped rule files only load when a session actually touches the matching files.

## Rule map — every old section, one row each

| Rule (short) | Verdict | Where it lives now / why |
|---|---|---|
| Migration-method banner | Deleted (duplicate) | Root `CLAUDE.md` already states it |
| What This Is | Kept, condensed | Core file, top |
| Plugin Structure tree | Kept, fixed | Core file — replaced stale `src/extensions/` with the real folder list; dropped the lucide-icons line count |
| Block Pattern | Kept as-is | Core file |
| Block Categories | Kept, condensed to slugs | Core file |
| Build Commands | Kept, fixed | Core file — added the missing `--webpack-copy-php` flag |
| Survey detectors intro + triad | Kept, moved | `.claude/rules/migration-scripts.md` |
| Inspector-surface calibration caveat | Deleted (duplicate) | Already in `scripts/surveys/survey-inspector-surface.js` header |
| Grid-item defaults qualification | Kept, moved | `.claude/rules/block-editor-controls.md` |
| Diff-against-working-block methodology | Kept, condensed | Core file |
| Media atom findings | Kept, moved | `.claude/rules/colour-emission.md` ("Media atom scoping") |
| Detector blind spots | Deleted | Narrow, dated scope-limit notes; not cross-cutting enough to survive — the two gates' own headers carry the same limits |
| Editor-canvas mirrors + 4 traps | Kept, moved | `.claude/rules/block-editor-controls.md`; Spec 02 §Block Customisation Standard repointed to it |
| `placement-reach.py` section | Deleted (duplicate) | Script's own docstring already carries it |
| Live motion QA + canary fixtures | Kept, moved | `.claude/rules/motion-qa.md`; root `CLAUDE.md` § Sites gained one pointer bullet |
| `migrate-render-closures.py` section | Deleted (duplicate), gotchas kept | Two non-obvious gotchas moved to `.claude/rules/migration-scripts.md` |
| `remove-vacuous-style-engine-guard.py` section | Deleted (duplicate), gotchas kept | Moved to `.claude/rules/migration-scripts.md` |
| `extract-comment-narrative.py` section | Deleted (duplicate), one fact kept | Moved to `.claude/rules/migration-scripts.md` |
| Tier-object migration S1–S3 | Kept, condensed, moved | `.claude/rules/migration-scripts.md` |
| S4 theme-scalar migration | Kept, condensed, moved | `.claude/rules/migration-scripts.md` |
| Build flags (`--experimental-modules`, `--webpack-copy-php`) | Kept | Core file, Build Commands |
| `check-dead-controls.js` / HC2 gate | Kept, condensed | Core file § Gates (dated report pointer dropped) |
| Gates born from bugs | Deleted | Each gate's own script header already documents what it catches and its baseline policy — verified against `check-dead-pattern-attrs.py`, `check-hardcoded-render-defaults.js`, `check-dead-api-calls.py`, `check-empty-inspector-containers.js`, `check-wrapper-capability-preconditions.js` |
| `gate:list` reminder | Kept | Core file § Gates |
| Conformance gates A/B + E11 | Deleted | `test_converter_conformance.py` and `check-hardcoded-render-defaults.js` headers already carry this |
| S5 stored post_content migration | Kept, condensed, moved | `.claude/rules/migration-scripts.md` |
| Never write post_content over an open editor tab | Kept | Core file § Cross-cutting gotchas |
| Deploy | Deleted (duplicate) | Root `CLAUDE.md` § Build and deploy |
| Per-block status | Kept, folded in | Core file, top paragraph |
| Backend Integrations table + notes | Kept, moved | `.claude/rules/backend-integrations.md` (new, path-scoped) |
| Block Customisation Standard | Kept, condensed | Core file — heading text preserved exactly |
| Border controls (`SgsBorderControl`) | Kept, moved | `.claude/rules/block-editor-controls.md` |
| Colour controls (`SgsColourPanel`) | Kept, moved | `.claude/rules/block-editor-controls.md` |
| `supports.sgs.colourExemptions` | Kept, moved | `.claude/rules/block-editor-controls.md` |
| Ungated paint detector | Deleted | `check-ungated-paint-rules.py`'s own docstring already carries the 3-bucket census and disclosed limits |
| Touch-safe HOVER helpers | Kept, condensed, moved | `.claude/rules/colour-emission.md` |
| Known precedent-function registry | Kept, moved | `.claude/rules/colour-emission.md` |
| Colour EMISSION helpers | Kept, moved | `.claude/rules/colour-emission.md` |
| Hover Controls Spec | Kept, condensed, moved | `.claude/rules/colour-emission.md` (folded into shadows/hover section) |
| Shadows | Kept, moved | `.claude/rules/colour-emission.md` |
| Scrims | Deleted (duplicate), one line kept | `.claude/rules/colour-emission.md` — the helper's own docblock carries the contract |
| Utility Functions | Kept | Core file |
| WC loop pinning (Gotcha) | Moved | `.claude/rules/block-authoring.md` |
| "NO block deprecations — see below" | Deleted (redundant self-pointer) | — |
| Core block "unexpected content" | Kept | Core file § Cross-cutting gotchas |
| `source: html` on dynamic blocks | Deleted (duplicate) | `.claude/specs/common-wp-styling-errors.md` row B2 |
| InnerBlocks.Content save | Kept, trimmed | Core file § Cross-cutting gotchas |
| post_content via WP-CLI/undeclared attrs | Merged, moved | `.claude/rules/block-authoring.md` (single consolidated version) |
| Canary credentials | Deleted (duplicate) | `.claude/dev-setup.md` |
| `style.css` vs `editor.css` | Kept | Core file § Cross-cutting gotchas |
| `viewScriptModule` vs `viewScript` | Deleted (duplicate) | Root `CLAUDE.md` |
| `:not([style*=…])` CSS fallback | Deleted (duplicate) | `.claude/rules/block-authoring.md` |
| `useInnerBlocksProps` (Gotcha + Key Rules, 2 copies) | Kept once | Core file § Key rules |
| CPT `custom-fields` for meta REST | Deleted (duplicate) | Memory `wp-registration-gotchas.md` |
| Theme CSS cache-bust | Deleted (duplicate) | `theme/sgs-theme/CLAUDE.md` |
| HC2 no dead controls | Moved | `.claude/specs/02-SGS-BLOCKS.md` § Block Customisation Standard |
| Block deprecations — not used | Moved (reasoning), deleted (terse dup) | Reasoning now in `.claude/rules/block-authoring.md`, replacing its one-line bullet |
| Forms | Deleted (duplicate), pointer kept | `.claude/specs/04-SGS-FORMS.md`; core file top paragraph carries the one-line pointer |
| Every block reads tokens, never hardcode | Kept | Core file § Key rules |
| THE DEFAULT-vs-HARDCODE TEST (full text) | Deleted (duplicate), pointer kept | `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` §6.1 |
| WordPress drops undeclared attrs (Key Rules copy) | Merged, moved | `.claude/rules/block-authoring.md` (same consolidated rule as the Gotcha) |
| Frontend JS vanilla / motion tiers | Deleted (duplicate) | Root `CLAUDE.md` |
| `viewScriptModule` (Key Rules copy) | Deleted (duplicate) | Root `CLAUDE.md` |
| Scroll-snap / Intersection Observer | Kept | Core file § Key rules |
| Progressive enhancement | Kept | Core file § Key rules |
| `useInnerBlocksProps` (Key Rules copy) | Deleted (internal duplicate) | — |
| REST endpoint security | Deleted (duplicate) | Root `CLAUDE.md` |
| Responsive controls | Kept | Core file § Key rules |

## Scripts whose header docstrings were checked (none needed edits)

`check-ungated-paint-rules.py`, `check-dead-controls.js`, `check-dead-pattern-attrs.py`,
`check-hardcoded-render-defaults.js`, `check-dead-api-calls.py`,
`check-empty-inspector-containers.js`, `check-wrapper-capability-preconditions.js`,
`test_converter_conformance.py`, `scripts/surveys/survey-inspector-surface.js`,
`placement-reach.py`. All already carry the fact CLAUDE.md was duplicating (bucket
definitions, baseline policy, "do NOT baseline" instructions, disclosed limits) — verified by
reading each header, not assumed.

## Nothing could not be placed

Every rule found a single home. The only judgement call: the "Gates born from bugs" and
"Conformance gates" narrative sections were deleted outright rather than partially kept, because
each gate script's own header was independently confirmed to carry the operative fact (what it
catches, how to run it standalone, baseline policy) — re-reading it in CLAUDE.md would have been
the third copy.

## Verification

- `wc -c` on every touched file — table above.
- `python .claude/hooks/handoff-preflight.py --check` — 4 of 4 checks passed (ledger-size,
  no-tombstones, no-dangling-links, memory-size).
- `python plugins/sgs-blocks/scripts/check-withdrawn-figures.py --check` — 0 files carry a
  withdrawn figure.
- Grepped the whole repo (excluding `node_modules`, `.git`, `pipeline-state`,
  `.claude/plans/archive`, `build/`, archived reports/decisions) for every removed section title
  ("Colour EMISSION", "precedent-function registry", "Hover Controls Spec", "Survey detectors",
  "S5 (STORED", "Editor-canvas mirrors", "Gates born", "Ungated paint detector", "Touch-safe
  HOVER") — every remaining hit now points at the new `.claude/rules/*.md` file, not the old
  106 KB CLAUDE.md. Files repointed: `.claude/specs/02-SGS-BLOCKS.md`,
  `plugins/sgs-blocks/includes/nav-menu-item-border-featured-css.php`,
  `plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py`,
  `plugins/sgs-blocks/scripts/colour-codemod/classify-end-shape.js`,
  `plugins/sgs-blocks/scripts/colour-codemod/fix.js`,
  `plugins/sgs-blocks/scripts/generate-helper-catalogue.py`,
  `plugins/sgs-blocks/scripts/migrate-tier-object.py`,
  `plugins/sgs-blocks/scripts/migrations/2026-09-05-helper-function-catalogue.py`,
  `plugins/sgs-blocks/src/blocks/audio/render.php`,
  `plugins/sgs-blocks/src/blocks/filter-search/render.php`,
  `plugins/sgs-blocks/src/blocks/info-box/render.php`,
  `plugins/sgs-blocks/src/blocks/mega-aside/render.php`,
  `plugins/sgs-blocks/src/blocks/modal/render.php`,
  `plugins/sgs-blocks/src/blocks/process-steps/render.php`,
  `plugins/sgs-blocks/src/blocks/product-search/render.php`,
  `plugins/sgs-blocks/src/blocks/whatsapp-cta/edit.js`,
  `plugins/sgs-blocks/src/blocks/whatsapp-cta/preview-style.js`. Compiled `build/blocks/*`
  mirrors were left untouched — gitignored, regenerated on next build.
