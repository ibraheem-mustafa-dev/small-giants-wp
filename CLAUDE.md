# SGS WordPress Framework — Claude Code Instructions

## What this is

A custom WordPress block framework built by Claude Code: theme + blocks plugin (with forms) + booking plugin + client-notes plugin. Competes with Kadence / Spectra / GenerateBlocks. Used to deliver 5 priority client builds with Bean as QC only.

## Active focus (2026-05-27 onwards — Phase 2 hybrid block migration)

**Phase 1.5 CLOSED 2026-05-27 per D90 with just Fix 1 shipped (walker FR-22-3 #3 ordering, commit `5731dc36`; mean pixel-diff 81.55% → 58.6% = −22.9pp aggregate). Phase 2 reordered ahead of pixel-diff target per D91. Phase 2.5 = bridge to ≤1% (was original Phase 1.5 stretch).**

- **Canonical spec:** [Spec 22 — Universal Block-Equivalent Extraction](.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md). Replaces Spec 16 (archived 2026-05-26).
- **Active Phase 2 plan:** [`.claude/plans/2026-05-28-phase-2-hybrid-block-migration.md`](.claude/plans/2026-05-28-phase-2-hybrid-block-migration.md) — 4 streams; **Stream A scoped active** (DB-quality pre-pass + Fix 2b slot_synonyms + /sgs-update downstream + re-baseline measurement). Streams B/C/D deferred placeholders pending Stream A QA gate.
- **Phase 2 scope:** migrate 61 SGS hybrid blocks (per Phase 0.4 audit roster) to FR-22-6 InnerBlocks (`echo $content`) pattern via parallel /subagent-driven-development per FR-22-6.1.
- **Phase 2 acceptance:** per-section ≤5% × 3 viewports (7 body sections, 21 cells) + Bean visual sign-off (R-22-13 co-authoritative).
- **Phase 2.5:** bridge to ≤1% pixel-diff via pixel-diff.py vertical-anchor fix + chrome cropping + font-load timing (was original Phase 1.5 stretch).
- **Phase 2 sibling spec:** header/footer cloner at [`.claude/plans/2026-05-24-phase-2-header-footer-cloner.md`](.claude/plans/2026-05-24-phase-2-header-footer-cloner.md) — blocked on hybrid migration close.
- **Post-Fix-1 baseline (2026-05-27):** mean 58.6% across 27 captures (9 sections × 3 viewports) on Mama's Munches canary page 144. See `pipeline-state/mamas-munches-homepage-2026-05-27-193804/`.
- **Visual POC:** [`/hero-clone-poc/` page 29](https://sandybrown-nightingale-600381.hostingersite.com/hero-clone-poc/) — visual parity proof (54.5% script number is 60px chrome-bleed alignment artefact, not visual divergence).
- **FR-22-20 universal variant detection — PARTIALLY SHIPPED 2026-06-01** (Commits 1–5/6, D134, live-DOM verified; `blocks.variant_attr` column + `variant_slots` table built; hero `$is_split` band-aid reverted). **Remaining:** Commit 6 (modifier-class→enum path) redesign-pending per D135, + generalise to the other 32 variant blocks. See Spec 22 §FR-22-20 + D133/D134/D135 + parking P-FR2220-VARIANT-DETECTION.
- **Latest cloning-thread work (2026-06-01, undocumented until the doc-sweep — now D145/D146):** `sgs/button` replaces `core/button` everywhere + `sgs/multi-button` grouping (D146 / commit `270cd995`, Spec 11 complete); `is-style-*` carry onto cloned blocks + tag-authoritative content-leaf routing (D145 / commit `b93a3b51`). Both pending cloning-thread ratification.

## 14 binding rules (Spec 22 R-22-1 through R-22-14; gate every commit)

Full text in Spec 22 §6. Headlines:

1. **DB-first, no hardcoded dicts (R-22-1)** — All lookups via DB tables; `SKIP_TOP_LEVEL_TAGS` is the only permitted constant (3 entries: header/footer/nav). Tier C role-to-block derived from existing `slot_synonyms.role + standalone_block` data.
2. **BEM is the only recognition signal (R-22-2 / Spec 00 §3.1)** — HTML tag is rendering-shape only.
3. **Three permitted walker exceptions, no others (R-22-3)** — atomic-tag swap / chrome-skip at top level / top-level container wrap. Adding a 4th requires spec amendment.
4. **Pixel-diff gates every commit (R-22-4)** — `/sgs-clone --debug-trace` Stage 11 pre/post; commit message cites predicted vs actual delta.
5. **Phases never ship as single commits (R-22-5)** — Phase 1 walker rewrite splits into 5 commits.
6. **Output-only inference is a trap (R-22-6)** — verify mockup HTML + extract.json + live DOM at each milestone.
7. **Council fix-shapes are hypotheses, not specs (R-22-7)** — multi-rater proposals require empirical pre/post measurement.
8. **Schema enumeration before "missing X" (R-22-8)** — query `sgs-framework.db` via `/sgs-db` first.
9. **Universal mechanisms, no per-block hyperfocus (R-22-9)** — every fix passes "does this apply to all 66 SGS blocks?"
10. **Read full spec before proposing fix-shape (R-22-10)** — state architectural primitive in plain English first.
11. **Verify rendered output, not internal metrics (R-22-11)** — live Playwright DOM is canonical.
12. **QC gates are structural, not prompt (R-22-12)** — `pipeline-stage-gate.py` hook enforces /qc-council.
13. **Bean visual sign-off is co-authoritative (R-22-13)** — script measurement + Bean's eye + visual cropped-pair BOTH consulted; numbers alone don't close, eye alone doesn't close.
14. **FR-22-6 migrations never carry server-side legacy fallback hacks (R-22-14)** — added 2026-05-27 per D92. The hybrid render.php problem is exclusively SGS framework debt (zero core blocks on Phase 0.4 roster). Never add `if (empty($content) && !empty($legacy_attr)) { ...legacy scalar render... }` to a migrated render.php. Canonical backwards-compat: full 61-block roster migration + WP-CLI batch existing-post migration via deprecated.js. Bean P1 locked.

Sibling rules: blub.db 254 (read leftover-buckets first), 255 (multi-model /qc per converter commit), 256 (per-section cropped pixel-diff), 260 (db-first-no-hardcoded-dicts), 272 (schema enumeration before "missing X"), 276 (council fix-shapes are HYPOTHESES not specs), 281 (qc gate must be structural), 288 (phases never ship as single commits).

## Root-cause methodology (MANDATORY — no assumptions, evidence-first; gate EVERY diagnosis + fix)

This is the core working method for this project. It is non-negotiable and overrides any urge to move fast by guessing. Demonstrated + locked 2026-05-31 (D117/D118).

**Never assume, never reason from probability, never trust a claim** — yours, a subagent's, a doc's, or a metric's — without verifying it against real ground truth. Before proposing OR acting on any fix:

1. **Find the ROOT CAUSE first.** Read the actual evidence — do NOT pattern-match or theorise. Analyse ALL the logs + debug data (Spec 20/21 artefacts: `trace.jsonl`, `extract.json`, `leftover-buckets.json`, `stage-N.json`, `stage-11-pixel-diff.json`, computed CSS, render.php, `/wp-blocks schema`) BEFORE proposing a solution.
2. **Classify the layer:** is it an IMPLEMENTATION bug, or a GAP/FLAW in the spec/plan? Fix the right layer — patching code around a spec gap is a trap.
3. **Verify every dependency the theory rests on:** DB table data (`/sgs-db`, `/wp-blocks`), the block's ACTUAL functionality (e.g. does `sgs/container` really have a grid engine / the attrs you assume?), the pipeline spec (what it is SUPPOSED to do — Spec 22 + flow + stages), the truth-spec (`sites/<client>/mockups/.../TRUTH-SPEC.md` — does the fix hold for ALL relevant instances across the page, not just one?).
4. **Pixel-diff is misleading — verify the LIVE DOM (R-22-11), not the number.** An EMPTY section scores a false WIN (matches background); a REFLOWED-to-correct section scores a false LOSS. Use Playwright `el.innerText.length` + element-layout checks as the gate, never the pixel-diff alone. (Memory `empty-section-false-pixel-diff-win`.)
5. **Attest with evidence, twice** (`/verify-loop`): every load-bearing claim needs ≥2 independent evidence sources (e.g. emitted markup + live DOM). Never delegate the proof step for unproven work — open the live page yourself.
6. **Roll back fast on regression (STOP #19);** refine across a session boundary with the empirical evidence baked into the plan — don't iterate a failing sensitive fix inline under context pressure.

**Tools for this method (use the right one; don't hand-roll):** `/systematic-debugging` (root-cause gate), `/qc-council` (multi-rater validate fix-shapes from the FULL logs + code — converged-evidence beats single-model), `/verify-loop` (2-attestation), `/diagnostics` + `/lint` (static checks), `/subagent-driven-development` + `/dispatching-parallel-agents` (orchestrate independent work), `/brainstorming` (design before build), `/library-docs` (gold-standard reference), `/wp-blocks` + `/sgs-db` + `/sgs-wp-engine` + `/sgs-clone` (SGS ground truth), `/goals` (re-anchor), the `code-reviewer` + `wp-sgs-developer` agents (when registered + relevant). Captured: `feedback_read_ground_truth_before_concluding`, `feedback_qc_council_cross_family_triangulation_finds_bugs`, `empty-section-false-pixel-diff-win`.

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
| [`.claude/plans/2026-05-26-phase-1-spec-22-implementation.md`](.claude/plans/2026-05-26-phase-1-spec-22-implementation.md) | Active phase plan (5-commit walker rewrite + 4-phase implementation) |
| [`.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`](.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md) | Canonical pipeline spec; single-path universal walker; FR-22-1 through FR-22-13; R-22-1 through R-22-14 binding rules (R-22-14 added 2026-05-27 per D92 — no legacy fallback hacks). (Spec 16 retired 2026-05-26 — archived at `.claude/specs/archive/`.) |
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

### Universal block-equivalent extraction (Spec 22 FR-22-3, locked 2026-05-26)
Walker is a single recursive function with exactly 3 permitted exceptions (atomic-tag swap / top-level chrome-skip / top-level container wrap). Every BEM-classed DOM node resolves to a block slug via `slot_synonyms.standalone_block` lookup; per-block behaviour comes from DB rows, not code branches. Block-equivalent attrs (FR-22-2) become child InnerBlocks rather than scalar attrs (eliminates double-render). Spec 16's layered FR1/FR4/lift_subtree/F1/9-branch architecture retired 2026-05-26.

### DB-first, no hardcoded dicts (blub.db 260)
Before adding any hardcoded lookup dict in pipeline scripts, check sgs-framework.db: `property_suffixes` (117) + `kind_override` column (17 populated, replaces `_KIND_BY_SUFFIX` dict per D99), `block_supports` (1160 active post-D100 prune), `modifier_suffixes` (19), `slots` (96 = 92 element + 4 section post-D111 2026-05-30; was 105 at D99 — section pruned 16→4, element grew 89→92, replaces retired `slot_synonyms` + `legacy_role_lookup`), `roles` (20, replaces `slot_synonyms.role_classification` per D99), `block_attributes` (2074), `block_capabilities` (88), **`blocks.variant_attr` column** (DESIGN/build-pending — FR-22-20; names the variant-selector attr per block so the converter doesn't guess it), **`variant_slots` table** (DESIGN/build-pending — FR-22-20; stores each variant's DISCRIMINATING slots via set-difference; populated by `/sgs-update` from `supports.sgs.variants` in block.json). Refactor to `db_lookup.py` reads. Full mechanism: Spec 22 §FR-22-20.

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

### sgs/trust-bar — renamed from trust-badges (D123, 2026-05-31); dual-mode FR-24-10 SHIPPED 2026-06-01
D72 (2026-05-25) retired the ORIGINAL composite `sgs/trust-bar` (counter use-cases → `sgs/counter`; badge use-cases → universal-nesting). Then `sgs/trust-badges` was renamed → `sgs/trust-bar` (D123) — this is the CURRENT active block. As of 2026-06-01 (FR-24-10, commit d6358f32) it is **dual-mode**: `sourceMode='typed'` (curated icon/badge repeater, 3 variants) OR `sourceMode='bound'` (echoes `$content` → renders the cloning converter's emitted badge InnerBlocks; live-verified, 4 badges). render.php branches on the explicit `sourceMode` (R-22-14, never `empty($content)`); the converter sets `sourceMode='bound'` on cloned trust-bars.

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
5. **Handoff docs carry forward structural defences — never SUBTRACT** (D101 rule, captured 2026-05-29 / blub.db 290 / pattern_key `handoff-docs-carry-forward-structural-defences`). When overwriting `.claude/next-session-prompt.md` or any handoff doc with structural-defence sections (anti-pattern STOP catalogue, pre-flight self-attestation ritual, tiered mandatory reading list, "READ THIS BEFORE ANYTHING ELSE" boxes), READ THE PREVIOUS VERSION FIRST end-to-end. Carry every structural-defence section forward verbatim or extended. Only ADD based on this session's new learnings; never SUBTRACT without a recorded justification. After writing, COUNT: STOP entries ≥ previous + new; reading items ≥ previous + new; ritual questions ≥ previous + new. If any count went down without justification, the new doc is a regression — revise before commit. Captured because 2026-05-29 D93-D100 session-close prompt dropped 7-entry STOP catalogue + 5-question ritual + collapsed 16→5 reading list; Bean caught before next session ran. Sparser prompts let captured failure patterns recur (meta-lesson `feedback_lessons_must_be_operationally_surfaced_not_just_archived` — captured lessons sitting in memory files only prevent failures when operationally surfaced at session start; STOP catalogue at top of handoff IS the operational surfacing).

## Framework stats (counts verified 2026-06-01 via /sgs-update; narrative = 2026-05-30 D107-D113 batch unless noted)

66 sgs blocks (all dynamic) + 122 core/wp blocks indexed = 188 blocks total; 2077 block_attributes (canonical_slot ~692/2077 = 33.3% + role ~689/2077 = 33.2% post-D110 + XS-4 backfills; +3 attrs 2026-06-01 from the D145/D146 button work); **`slots` table 96 rows post-D111 (92 element + 4 section) — 12 wrong/dead section-scope rows deleted, testimonial + testimonial-slider re-inserted at element scope, `inner` passthrough element row added**; **21 roles (D99 base 20 + `scalar-media` added 2026-06-01 D128 for §FR-22-19 composite media routing)**; 117 property_suffixes (with 17 `kind_override` populated per D99); 19 modifier_suffixes (incl. Hover/Active/Focus/Disabled state-kind); 88 block_capabilities (wired into walker as FR-22-15 capability-aware tiebreaker per D96); **`blocks.tier` column added D107 — 2 rows seeded with `tier='class-section'` (sgs/hero, sgs/cta-section) from `supports.sgs.is_section_root`; voter at `per-section-convention-voter.py:295-305` queries this column to segregate section-root candidates**; **`block_composition` table added D108 — 188 rows (block_slug PK, wraps_block, composition_role enum [section-root|wrapper-shell|content-block|leaf], has_inner_blocks, accepts_allowed_blocks); walker consumption REVERTED at c76aa107 pending refined trigger (see parking P-XS-3-TRIGGER-REFINEMENT)**; **`blocks.variant_attr` column + `variant_slots` table — BUILT + hero PARTIALLY SHIPPED (FR-22-20 Commits 1–5/6, D134, live-DOM verified 2026-06-01; Commit 6 modifier-class→enum path redesign-pending per D135; generalisation to the other 32 variant blocks still pending — see parking P-FR2220-VARIANT-DETECTION)**; 47 patterns; WP 7.0 compatible. `/sgs-update` rebuilt as 10-stage v3 (Stage 10 v3 includes aggressive prune-orphans default + attr-level orphan detection + retired-blocks deletion per D94/D100). Style-variation system retired (per-client `theme-snapshot.json`). Single-command deploy: `plugins/sgs-blocks/scripts/build-deploy.py` (commit a23ff53f).

## Design context for current client builds

Per-client design context lives in `sites/<client>/CLAUDE.md`. Active clients:

- `sites/mamas-munches/` — current pipeline canary
- `sites/indus-foods/` — Heritage / Partnership / Ambition; teal+gold palette; B2B trade buyers
- `sites/helping-doctors/` — green palette; medical sector

Do NOT inline client-specific design context into framework CLAUDE.md. Always read the client's own CLAUDE.md when working on that client.
