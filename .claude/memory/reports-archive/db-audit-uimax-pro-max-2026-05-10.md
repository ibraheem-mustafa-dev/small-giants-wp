# uimax-pro-max.db audit — 2026-05-10

DB: `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db`
Total tables: 47 (one was dropped or `_meta` differs from SKILL.md inventory of 48)
Empties surveyed: 9

## Per-table verdict — empties

| Table | Rows | Cols | Verdict | Reason |
|---|---:|---:|---|---|
| mood_board_items | 0 | 6 | keep | /uimax-mood-board references it directly; pipeline-pending |
| mood_boards | 0 | 8 | keep | /uimax-mood-board references it directly; pipeline-pending |
| patterns | 0 | 18 | keep | /sgs-clone Stage 9 + /uimax-sgs-scrape-pattern + +REGISTER populate this on first runs (M9 critical path) |
| recognition_log | 0 | 13 | keep | /sgs-clone references directly; M9 critical path |
| stack_bootstrap | 0 | 12 | **drop candidate** | only in SKILL.md inventory + 2 retired specs; no active write path |
| stack_html_css | 0 | 12 | **drop candidate** | same as above |
| stack_php | 0 | 12 | **drop candidate** | same as above |
| stack_wordpress | 0 | 12 | **drop candidate** | same as above |
| stack_sgs_wordpress | 0 | 12 | keep | Phase 4 of convention rollout will populate (sgs-blocks → uimax mirror) |

## Per-table verdict — populated (no action)

| Table | Rows |
|---|---:|
| _meta | 2 |
| animations | 63 |
| app_interface | 30 |
| chart_templates | 626 |
| charts | 25 |
| colors | 269 |
| component_libraries | 210 |
| design_tokens | 5164 |
| ft_chart_vocabulary | 39 |
| google_fonts | 1923 |
| gov_patterns | 68 |
| icon_libraries | 225 |
| icons | 105 |
| interaction_patterns | 30 |
| landing | 34 |
| naming_conventions | 16 (SGS-BEM canonical, this session) |
| products | 161 |
| react_performance | 44 |
| stack_angular / astro / flutter / html_tailwind / jetpack_compose / laravel / nextjs / nuxt_ui / nuxtjs / react / react_native / shadcn / svelte / swiftui / threejs / vue | 49–60 each |
| styles | 84 |
| typography | 74 |
| ui_reasoning | 161 |
| ux_guidelines | 161 |

## Drop candidates: 4

`stack_bootstrap`, `stack_html_css`, `stack_php`, `stack_wordpress`.

Per Phase 2 KJC #2 (recommendation C): drop the 4 truly-empty stack_* tables that have no scheduled population path; keep `stack_sgs_wordpress` for Phase 4 propagation.

## Skill-body update required after drops

`~/.agents/skills/ui-ux-pro-max/SKILL.md` body inventory references all 5 stack_* empties. After drop, update inventory text to remove the 4 dropped tables. Add to Phase 4 batch list.