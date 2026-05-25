# SGS WordPress Framework — Claude Code Instructions

## What this is

A custom WordPress block framework built by Claude Code: theme + blocks plugin (with forms) + booking plugin + client-notes plugin. Competes with Kadence / Spectra / GenerateBlocks. Used to deliver 5 priority client builds with Bean as QC only.

## Active focus (2026-05-25 onwards — gates everything until met)

**Cloning pipeline delivers ≤1% pixel-diff per body section × 3 viewports (375/768/1440) irrespective of mockup content variations, from any Claude-generated SGS-BEM HTML draft.**

- **Phase 1 (now):** per-section ≤30% × 3 viewports — universal-extraction backbone (F1 universal-nesting + DB-driven ATOMIC_TAG_MAP + universal child/array extraction + 20 cheats removed). Plan: [`.claude/plans/2026-05-25-phase-1-universal-extraction.md`](.claude/plans/2026-05-25-phase-1-universal-extraction.md). Register (full evidence): [`.claude/reports/2026-05-25-qc-council-issue-register.md`](.claude/reports/2026-05-25-qc-council-issue-register.md).
- **Phase 1.5:** per-section ≤1% — section-by-section closure (scope emerges from Phase 1 measurements).
- **Phase 2:** header + footer cloner (parked until Phase 1.5 hits ≤1%).
- **Baseline (2026-05-25):** mean 63.2% across 9 sections × 3 viewports on Mama's Munches canary page 144 (sandybrown). See `pipeline-state/mamas-munches-homepage-2026-05-25-101222/`.

## 11 binding rules (gate every commit)

Full text in Section P of the canonical register. Headlines:

1. **Universally-applicable mechanisms (P1)** — no per-block hyperfocus; mechanisms work for ALL future client drafts
2. **All div classes are blocks; just some nested inside others (P15)** — THE structural primitive in operator language
3. **Empty InnerBlocks array → walk direct child div descendants (P7)** — the F1 fallback in actionable form
4. **Pipeline must achieve ≤1% deterministically (P17)** — allowed manual work = block functionality extension + pipeline scripts only; NEVER hand-author patterns or per-section bespoke fixes
5. **Universal flat-scanning preserves hierarchy + accurately assigns CSS rules and content to direct owner (P18)**
6. **Per-property cascade-fold not binary uniformity gate (P6 + blub.db 287)** — wrapper blocks always exist carrying className; defaults hoist to parent, divergent values override on the child
7. **One fix at a time with /verify-loop (P20)**
8. **Don't agree, disagree, or propose without evidence — find it first (P26)**
9. **Read full spec before proposing architectural fix-shape (blub.db 285)** — state the primitive in plain English BEFORE proposing
10. **Check sgs-db block capability before evaluating (blub.db 286)** — `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block <slug>`
11. **Phases never ship as single commits (blub.db 288)** — every major task commits separately with /qc-council + measurement + predicted/actual delta in message

Sibling rules: blub.db 254 (read leftover-buckets first), 255 (multi-model /qc per converter commit), 256 (per-section cropped pixel-diff), 269 (universal extraction; walker stays universal), 272 (schema enumeration before "missing X" claim), 276 (council fix-shapes are HYPOTHESES not specs).

## Repository structure

```
small-giants-wp/
├── theme/sgs-theme/          # Block theme (own CLAUDE.md). styles/ retired Phase 5a — empty.
├── plugins/
│   ├── sgs-blocks/           # Gutenberg blocks + forms (own CLAUDE.md)
│   ├── sgs-booking/          # Appointment + event booking (own CLAUDE.md)
│   └── sgs-client-notes/     # Visual annotation system (own CLAUDE.md)
├── sites/<client>/           # Client mockups + content + theme-snapshot.json
│                             #   (own CLAUDE.md — e.g. sites/indus-foods/CLAUDE.md for that client's design context)
├── .claude/                  # Working area — plans/, specs/, decisions.md, parking.md, reports/
└── CLAUDE.md                 # This file
```

Each sub-project + each client site has its own CLAUDE.md. Read the relevant one when working on that component or client.

## Canonical pointers

| Doc | What |
|---|---|
| [`.claude/reports/2026-05-25-qc-council-issue-register.md`](.claude/reports/2026-05-25-qc-council-issue-register.md) | THE current cloning-pipeline register (~110 items, Sections A-R) |
| [`.claude/plans/2026-05-25-phase-1-universal-extraction.md`](.claude/plans/2026-05-25-phase-1-universal-extraction.md) | Active phase plan (19 commits) |
| [`.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md`](.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md) | Converter v2 spec; §15 universal walker; §FR1-FR9; §14 G1-G5 gaps |
| [`.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md`](.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md) | Pipeline-state artefact map (read BEFORE conjecturing) |
| [`.claude/cloning-pipeline-flow.md`](.claude/cloning-pipeline-flow.md) + [`-stages.md`](.claude/cloning-pipeline-stages.md) | Stage map + per-stage detail |
| [`.claude/dev-setup.md`](.claude/dev-setup.md) | Build / deploy / SSH / local environment / gotchas |
| [`.claude/decisions.md`](.claude/decisions.md) | D-numbered architectural log |
| [`.claude/parking.md`](.claude/parking.md) | OPEN deferred work (6 taxonomy buckets) |
| [`.claude/goals.md`](.claude/goals.md) | Active near-term + long-term goals |

## Naming convention

Full rules: [`.claude/specs/00-naming-conventions.md`](.claude/specs/00-naming-conventions.md). CI linter: `python scripts/lint-naming-conventions.py`.

- Theme `sgs-theme`; plugins `sgs-blocks` / `sgs-booking` / `sgs-client-notes`
- PHP namespace `SGS\Theme` / `SGS\Blocks` / `SGS\Booking` / `SGS\ClientNotes`; text domains match plugin/theme slugs; hook prefix `sgs_`
- CSS `.sgs-` prefix; BEM: `.sgs-<block>__<element>--<modifier>` (hyphens only)
- Block namespace `sgs/block-name`; pattern slugs `sgs/<role>` (framework) or `sgs/<role>-<client-slug>` (client)
- `wp_options` keys `sgs_*`; post-meta `_sgs_*` (private) / `sgs_*` (public)

## Agent + skill delegation (MANDATORY)

| Work | Route to |
|---|---|
| Heavy WP build (pages, templates, blocks, plugins, migrations, fidelity) | `wp-sgs-developer` agent |
| Skill / agent / pipeline / router lifecycle | `/lifecycle` |
| Cloning pipeline work | `/sgs-clone` + register the result via `/sgs-update` |
| Doc edits | `docscore-on-doc-edit` PostToolUse hook auto-runs |
| Model picking per task | `/delegate` (Haiku mechanical / Sonnet architectural / Cerebras+Gemini Flash validation) |
| Multi-rater code-review before commit on converter/pipeline/SGS-block | `/qc-council` (per blub.db 255) |
| Per-file checks inline | `/qc-inline` |
| Parallel work across disjoint files | `/dispatching-parallel-agents` |
| Implementer + 2 reviewers pattern | `/subagent-driven-development` |
| Cold prompts | `/subagent-prompt` (embed dispatch bindings A/B/C/D verbatim) |
| 2-attestation per load-bearing claim | `/verify-loop` |
| Root-cause investigation | `/systematic-debugging` |
| New architectural rule surfaced | `/capture-lesson` |
| Live-page DOM verification | Playwright MCP |
| Schema check BEFORE "missing X" claim | `python ~/.claude/hooks/wp-blocks.py dump` |
| DB query | `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` |
| Session close | `/handoff` |

## Git workflow

**Before every commit/push:** run `git branch --show-current` and verify branch matches scope.

| Work | Branch |
|---|---|
| Core SGS (plugins/sgs-blocks/src/, theme/sgs-theme/, plugin PHP) | `main` |
| Client-specific (sites/<client>/, per-client snapshot) | `feat/<client>-*` |
| New framework feature | `feat/<feature>` branched from `main` |

**Never commit core framework changes to a client/feature branch.** If on wrong branch mid-work: stash → switch → pop → commit. See global CLAUDE.md for full git workflow rules.

## Build & deploy (one-liners; full sequence in dev-setup.md)

```bash
cd plugins/sgs-blocks && npm run build
# Build uses @wordpress/scripts with --experimental-modules + --webpack-copy-php (PHP render.php copied to build/)

# Deploy via tar (scp -r creates nested dirs on Hostinger)
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' --exclude='plugins/sgs-blocks/src' \
    --exclude='theme/sgs-theme/styles/*.json' --exclude='plugins/sgs-blocks/_retired' \
    theme/sgs-theme plugins/sgs-blocks
# Then SCP, extract, OPcache reset (HTTP, CLI reset is a separate pool). Full sequence in dev-setup.md.

# Per-client theme snapshot (post Phase 5a — no per-client .json in theme/sgs-theme/styles/)
python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client <slug> --target <ssh-host>
```

- **Dev site:** palestine-lives.org (WP 6.9.1). **Staging/canary:** sandybrown-nightingale-600381.hostingersite.com (WP 7.0). Canary page for Mama's = 144 (`/rc-fix-verification-mamas-munches/`).
- **SSH:** `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73` (alias `ssh hd`). WP admin user: `Claude`.
- **No Node.js on server** — build locally, deploy compiled `build/`.

## Architecture rules

### SGS is a standalone framework, not a client project
Theme + blocks must work on ANY WordPress install for ANY client. Every design decision must pass: "Will this make sense for a restaurant, a wedding planner, AND a law firm — not just <current client>?" Never hard-code client colours, copy, imagery, structure into base theme / blocks plugin. Client-specific work lives in `sites/<client>/` only.

### cv2 output goes to WP PAGES, not POSTS
Posts use `single.html` which constrains `.entry-content` to `max-width: 800px` — wrong for landing-page clones. Pages use `page.html` with no such constraint. `/sgs-clone --deploy-target page:144` for current Mama's canary.

### Client experience is primary
No block feature is complete until it has full block-editor UI controls. Clients are tech-illiterate — they use the block editor exclusively. Every customisable property must be exposed as an inspector control. If a setting requires touching code, it is not done. WP-CLI is a developer tool only; never something clients touch.

### Universal-extraction primitive (Spec 16 §15 line 990)
Every composite block emits OPEN with InnerBlocks children mirroring the mockup's parent-child shape — NOT flat-attrs lifted from descendants. Every BEM-class div becomes its own emitted block, carrying its mockup className. When `_lift_inner_blocks` returns empty, walk direct child descendants per binding rule P7.

### DB-first, no hardcoded dicts (blub.db 260)
Before adding any hardcoded lookup dict in pipeline scripts, check sgs-framework.db: `property_suffixes` (117), `block_supports` (1216), `modifier_suffixes` (19), `slot_synonyms` (89), `block_attributes` (2246), `block_capabilities` (85). Refactor to `db_lookup.py` reads.

### Rosetta Stone discipline (uimax cross-platform translation)
Every uimax row describing a design artefact MUST carry equivalent-name mappings across SGS blocks + vanilla HTML/CSS + Bootstrap + shadcn/Radix + Tailwind + React + AI-builder. Missing SGS equivalent = gap candidate, never silently dropped. `uimax` = DB/data layer; `/ui-ux-pro-max` = intelligence skill that USES the DB. Captured 2026-05-06 blub.db 213.

### Bean-controlled drafts use SGS-BEM (Spec 15 §8.1, blub.db 236)
`.sgs-<block>__<element>--<modifier>`. `/sgs-clone` Stage 0 hard-rejects non-conforming on production runs; `--draft-mode` = soft warning; `--legacy` bypasses. Live scrapes use lingua-franca conversion at write time.

### Saved-defaults model (canonical, retired 2026-05-08 — do NOT reintroduce parallel infra)
Four WordPress-native channels: (1) visual styling defaults → Site Editor Styles panel (`wp_global_styles` over `theme.json`); (2) structural starting state → block patterns at `plugins/sgs-blocks/includes/block-patterns.php`; (3) per-operator session memory → `useLastUsedAttributes` sessionStorage hook; (4) per-instance customisation → block inspector. NO `withSaveAsDefault` HOC, NO `<BlockDefaultsPanel>`, NO `wp_options`-backed defaults store.

### Block customisation standard (MANDATORY)
Every block: (1) native `supports` for wrapper-level controls; (2) custom attrs + controls for each inner text element; (3) custom attrs + controls for CTAs; (4) CSS fallback colours use `:not([style*="color"])` so custom values win; (5) Block Selectors API in `block.json` targets native typography to primary text element.

### Image controls discipline
Every new block rendering `<img>` MUST declare `"imageControls": true` in `block.json` `supports.sgs` so the universal image-controls extension applies. Document deliberate opt-out in the block's own CLAUDE.md or block.json description.

### No hard-coded environment paths
PHP: `get_theme_file_uri()` / `get_stylesheet_directory_uri()` / `wp_upload_dir()`. JS/CSS: CSS custom properties via `wp_add_inline_style()` or `wp_localize_script()`. Never `/wp-content/themes/sgs-theme/assets/image.png` (breaks on non-standard installs).

### Style-variation system retired (D28, Phase 5a 2026-05-21)
`theme/sgs-theme/styles/` is empty. Per-client colour/typography lives at `sites/<client>/theme-snapshot.json` and deploys via `push-theme-snapshot.py`. Client-specific CSS goes into the snapshot's `styles.css` OR `sites/<client>/theme-overrides.css`. Never into framework's `style.css`.

### sgs/trust-bar retired (D72, 2026-05-25)
Counter use-cases route to `sgs/counter`; badge use-cases emit via universal-nesting (`sgs/container` > `sgs/label` children, walker resolves `__badge` BEM elements to sgs/label via slot_synonyms).

## Non-negotiables

- WCAG 2.2 AA accessible, mobile-first responsive (44px minimum touch targets, 4.5:1 contrast)
- No jQuery — vanilla JS only frontend; `viewScriptModule` (ES modules) for interactive blocks
- All REST endpoints: nonces, capability checks, sanitisation, prepared statements (`$wpdb->prepare()`)
- Performance budget: <100KB CSS, <50KB JS per page; green Core Web Vitals
- UK English in all code, comments, user-facing text
- Cross-project sync: any change affecting sgs-booking REST must also update `specs/03-SGS-BOOKING.md` + `plugins/sgs-booking/CLAUDE.md`

## Doc-op standards (Phase 13 close, 2026-05-24)

Architectural record: `.claude/decisions.md` D57-D65. Canonical templates: `~/.agents/skills/shared-references/doc-templates/`.

1. **parking entries** carry `**Status:** OPEN|PARTIAL|BLOCKED|DEFERRED` + one of 6 taxonomy buckets
2. **specs** use `FR-{spec_id}-{N}` for requirement IDs (e.g. `FR-16-3`)
3. **mistakes.md** is a keyword-stub index only — body links to `feedback_*.md` + blub.db row
4. **plans** use strategic-plan + phase-plan templates (timebox / ROAM / 16-field step block)

## Framework stats (2026-05-25, post architecture programme + trust-bar retirement)

69 blocks (all dynamic); 2246 block attributes; 89 slot_synonyms rows; 117 property_suffixes; 19 modifier_suffixes (incl. Hover/Active/Focus/Disabled state-kind); 85 block_capabilities; 184 design tokens; 35 patterns; WP 7.0 compatible (`Sgs_Ai_Connector` + `wp_set_script_module_translations()` wired). `/sgs-update` rebuilt as 9-stage v2. Style-variation system retired (per-client `theme-snapshot.json`).

## Design context for current client builds

Per-client design context lives in `sites/<client>/CLAUDE.md`. Active clients:

- `sites/mamas-munches/` — current pipeline canary
- `sites/indus-foods/` — Heritage / Partnership / Ambition; teal+gold palette; B2B trade buyers
- `sites/helping-doctors/` — green palette; medical sector

Do NOT inline client-specific design context into framework CLAUDE.md. Always read the client's own CLAUDE.md when working on that client.
