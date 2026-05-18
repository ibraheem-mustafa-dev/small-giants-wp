---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-20-phase-2a-massive
session_date: 2026-05-20
---

# Session Handoff — 2026-05-20

## Completed This Session

1. **Phase 2A massive — 8 parallel Sonnet subagents + 2 follow-ups.** Branches A-H dispatched in one round delivered: header behaviours layer (`Sgs_Header_Behaviours` + CSS + JS), `sgs/responsive-logo` block (3 logo slots + Vivus animation + site-logo fallback), `sgs/icon` block (Lucide + WP icons + Dashicons + emoji via Branch C+H), `sgs/timeline` block (date-based, scroll-reveal), `sgs/pricing-table` polish (5 Kadence-parity additions), 6 universal-extension React components, 9 block.json attribute retrofits + audit CSV. Legacy `sgs/icon-block` retired.
2. **Branch I — body_class injection strategy.** Replaced two failed DOM-injection attempts. `add_filter('body_class', ...)` walks rules + appends `sgs-has-header` + `sgs-header-behaviour-{slug}` to body. CSS targets `body.* header.wp-block-template-part`. Resolved P-PHASE-2A-WRAPPER-CLASS-NOT-INJECTED.
3. **Branch J — Spec 18 cleanup (-985 lines).** Deleted 7 theme-side files registering 16 orphan Customiser controls + a parallel renderer + 4 CSS/JS assets. Customiser → SGS Floating UI now shows exactly 7 Spec 18 canonical controls. Resolved P-S18-LEGACY-CUSTOMISER-CONTROLS-ORPHANED.
4. **WCAG 2.4.11 fix verified live.** `ResizeObserver` publishes `--sgs-header-height` (80px observed); `:root { scroll-padding-top: var(...) }` ensures anchor links land below sticky header. Competitive moat no WP competitor solves cleanly.
5. **CSS specificity fix on position+top.** WP core defaults won the specificity battle for `position` and `top` on `.wp-block-template-part`. Added `!important` on those two properties only. `z-index: 100` won naturally. Bumped `SGS_BLOCKS_VERSION` 0.1.1 → 0.1.2 to bust browser cache.
6. **Deployed live on sandybrown + palestine-lives.org.** All 3 new blocks registered. Sticky behaviour visually confirmed (`header_position: 'sticky'`, `header_top: '0px'`).
7. **Docs sweep.** Updated specs 02-SGS-BLOCKS, 17-HEADER-FOOTER-ARCHITECTURE, 18-SGS-FLOATING-UI, 19-SGS-CLI-COMMANDS, `parking.md` (3 resolutions), `decisions.md` (Decision 9 — parallax exclusion), `cloning-pipeline-flow.md` (new recogniser targets), `mistakes.md` (CSS specificity + body_class lesson), `state.md`, `docs-registry.yaml` (added specs 02/17/18/19), 3 outdated next-session-prompts archived to `memory/`.

## Current State

- **Branch:** `main` at `0201c0d9`
- **Tests:** 1259+ pass (+63 new this session), 0 fail, 0 errors
- **Build:** passes (vivus added as runtime dep)
- **Uncommitted changes:** docs sweep pending commit
- **Deploy status:** Phase 2A live on sandybrown + palestine-lives.org

## Known Issues / Blockers

None blocking. Three parked follow-ups (not blockers for next session):
- `P-S18-TRANSPARENT-PATTERN-IS-STUB` — Branch J audit recommends deleting 3 stub patterns; needs Bean decision
- `P-TIMELINE-ADVANCED-VISUAL-EFFECTS` — vine/tree/MIC-bricks textures + scroll-progressive fills, deferred to a later session
- CLI behaviour-flag plumbing — `wp sgs header_rules add` strips `behaviour` key; set via `wp eval` in the meantime

## Next Priorities (in order)

1. **Run `/sgs-update`** to sync `sgs-framework.db` + uimax `component-libraries.csv` with the 3 new blocks + new attributes.
2. **Return to cloning pipeline** — verify `pipeline-state/<latest-run>/leftover-buckets.json` first (binding rule), then continue Spec 16 phase 7 / orchestrator work.
3. **Recogniser update** for new SGS-BEM selectors (`.sgs-responsive-logo`, `.sgs-icon`, `.sgs-timeline`, `body.sgs-header-behaviour-*`).
4. **Decide stub-pattern fate** — read `reports/2026-05-20-framework-header-stub-audit.md`, lock decision.
5. **CLI behaviour-flag plumbing** (~20 min cheap win) — extend `Sgs_Header_Rules::add_rule` to accept `behaviour` key.

## Files Modified

| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/src/blocks/responsive-logo/` (NEW) | 3-slot logo block + site-logo fallback |
| `plugins/sgs-blocks/src/blocks/icon/` (NEW + Branch H extension) | Multi-source icon (Lucide / WP / Dashicon / emoji) |
| `plugins/sgs-blocks/src/blocks/timeline/` (NEW) | Date-based timeline with scroll-reveal |
| `plugins/sgs-blocks/src/blocks/pricing-table/` | 5 Kadence-parity additions |
| `plugins/sgs-blocks/src/blocks/icon-block/` (DELETED) | Legacy slug retired |
| `plugins/sgs-blocks/src/components/universal-extensions/` (NEW) | 6 shared React components |
| `plugins/sgs-blocks/src/header-behaviours/view.js` (NEW) | ResizeObserver + scroll listener |
| `plugins/sgs-blocks/assets/css/header-behaviours.css` (NEW) | Behaviour CSS + scroll-padding-top fix |
| `plugins/sgs-blocks/includes/class-sgs-header-behaviours.php` (NEW) | body_class filter + asset enqueuer |
| `plugins/sgs-blocks/includes/wp-icons.php` (NEW) | 45-icon WP @wordpress/icons SVG map |
| `theme/sgs-theme/inc/floating-ui-*.php` (DELETED 2 files) | Branch J Spec 18 cleanup |
| `theme/sgs-theme/assets/{css,js}/{back-to-top,reading-progress,customiser-preview}.*` (DELETED 5 files) | Branch J Spec 18 cleanup |
| `.claude/specs/02/17/18/19-*.md` | Phase 2A additions appended |
| `.claude/parking.md`, `decisions.md`, `mistakes.md`, `state.md`, `cloning-pipeline-flow.md`, `docs-registry.yaml` | Docs sweep |
| `reports/2026-05-20-*` (5 files) | Audit CSVs + audit report + 2 research reports |

## Notes for Next Session

- The 3 framework-header stub patterns are now byte-identical to default + a behaviour rule. Branch J recommends deletion; Bean decides.
- `wp sgs header_rules add` accepts only known keys; `behaviour` needs CLI plumbing (~20 min).
- `--converter-v2` flag required on production orchestrator runs (binding rule from 2026-05-18).
- Phase 2A code on main is verified live on sandybrown + palestine-lives.org — no deploy-pending follow-ups.
- All cloning-pipeline work is in scope of `.claude/next-session-prompt.md`.

## Next Session Prompt

See `.claude/next-session-prompt.md` — orchestration plan with per-task model selection + dispatch pattern + acceptance criteria.
