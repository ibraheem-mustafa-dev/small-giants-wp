---
doc_type: phase-plan
phase_id: spec-15-phase-5
parent_spec: .claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md
parent_plan: .claude/plans/spec-15-master-execution-plan.md
project: small-giants-wp
title: Phase 5 — Clone Pipeline E2E
session_date: 2026-05-12
plan_label: PLAN sonnet (mostly mechanical code-gen against locked architecture; some inline orchestration)
status: APPROVED — execution starts after Phases 1–4 ship
estimated_wall_time: 8–10 hr (6 sub-phases)
estimated_cost_usd: ~0.80 (12–15× Sonnet steps; Cerebras + Gemini Flash free)
absorbs: ['scratch/absorbed/phase-5-gap-detection.md', 'scratch/absorbed/phase-6-staged-scaffolding.md', 'scratch/absorbed/phase-7-lingua-franca.md', 'scratch/absorbed/phase-8-wp-integration-wiring.md', 'scratch/absorbed/phase-9-autonomy-and-visual-qa.md', 'scratch/absorbed/phase-10-acceptance-harness.md']
---

# Phase 5 — Clone Pipeline E2E (Spec 15)

The keystone phase: `/sgs-clone` runs end-to-end on a Bean-controlled draft. Output is a deployed SGS WordPress page with visual parity ≤ 1% vs the draft. Six sub-phases (5a–5f) absorb Spec 14 P5–P10 with their content adapted to Spec 15's DB-driven canonical-slot architecture.

## Architectural delta from absorbed plans

The absorbed Spec 14 P5–P10 plans assumed a different mapping layer. Critical updates baked into every step below:

| Was (Spec 14) | Now (Spec 15) | Source of truth |
|---|---|---|
| Layer 3 catalogue JSON files | `block_attributes.canonical_slot` + `derived_selector` columns | sgs-framework.db (Phase 1 populates) |
| Layer 2 role-templates JSON | `property_suffixes` table | sgs-framework.db (Phase 1 seeds) |
| Slot drift detected manually | `/sgs-update` Stage 9 drift validator | Phase 2 wires this |
| Visual parity ≤ 0.5% | Visual parity ≤ 1% (regions 0.5–1% surfaced for review) | Spec 15 §7 stage 8 |
| Manual gap-candidate flagging | `/sgs-update` Stage 10 + `attribute_gap_candidates` (uimax) | Phase 2 wires this |
| Hero override in `overrides/hero.py` | DELETED in Phase 3; canonical-slot path drives all blocks | Spec 15 FR40 |
| Implicit "all preceding phases done" | Explicit entry preconditions per sub-phase (below) | Verification discipline Rule 3 |

## Global rules (inherit from master plan)

- **Session timer:** must already be running from Phase 1 Step 0 (`.claude/scratch/spec-15-session-start.txt`). If missing, halt before 5a.1 and run Step 0 first.
- **`/qc-inline` after every subagent dispatch.** Never trust the subagent's "I did X" report — verify the artefact independently.
- **Multi-rater `/qc` panel at end of every sub-phase** (Haiku + Sonnet + Gemini Flash). Gate to advance: ≥ 2/3 raters return `pass/ship`. Sonnet's `partial` overrides 2 other `pass` votes when concerns are concrete.
- **`/delegate` before every dispatch.** Honour returned model + fallback chain.
- **Branch + commit format (unified, includes sub-phase letter for clarity):** branch `feat/spec-15-p5<letter>-<descriptor>` (e.g. `feat/spec-15-p5a-gap-detection`); commit `feat(spec-15-p5<letter>-<descriptor>): <description>` (e.g. `feat(spec-15-p5a-gap-detection): ...`). All on origin/main after PR merge.
- **Stop conditions** per master plan §Verification Discipline Rule 3.

---

## Sub-phase 5a — Gap detection (~1 hr)

**Goal:** Wire gap detection into `/sgs-clone` Stage 9. Failed extractions feed `attribute_gap_candidates` for operator review.

**Entry preconditions** (verify before 5a.1):
- **Spec 15 FRs that apply:** FR8 (gap-candidate tables) + FR10 (slot extraction with role-keyed strategies) + FR16 (recognition_log feedback loop) + FR33 (`/sgs-update` Stages 3+4+9+10 wired)
- `plugins/sgs-blocks/scripts/recogniser/leftover-bucket-router.py` exists (Spec 14 P1 ship; `ls` to verify)
- `attribute_gap_candidates` + `functionality_gap_candidates` uimax tables exist (Spec 14 P2 ship; query: `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%gap_candidates'` against `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` returns 2 rows)
- Phase 1 `property_suffixes` table seeded (32 rows; query: `SELECT COUNT(*) FROM property_suffixes` against sgs-framework.db = 32)
- Phase 2 `/sgs-update` Stage 10 wired (drift validator + gap detection writes to attribute_gap_candidates); verify by re-running `/sgs-update` and checking row count delta
- `recursion-guard.py` available at `plugins/sgs-blocks/scripts/recogniser/recursion-guard.py` (`python -c "import sys; sys.path.insert(0, 'plugins/sgs-blocks/scripts/recogniser'); from recursion_guard import RecursionGuard; print('ok')"` returns ok)

| # | Step | Model | Time | Notes + `/qc-inline` |
|---|---|---|---:|---|
| 5a.1 | Patch `leftover-bucket-router.py` for 4 gap-level routing | **Sonnet** | 20 min | Existing 5-bucket router needs to emit `(bucket, severity, gap_level)` triples. Gap levels: `attribute` / `functionality` / `convention` / `structural`. **`/qc-inline`:** feed router 4 synthetic mockup chunks (one per gap level); assert each returns the correct level. |
| 5a.2 | Bucket-C role-taxonomy classifier (FR10) | **Sonnet** | 25 min | New module `plugins/sgs-blocks/scripts/recogniser/bucket-c-classifier.py`. Reads `property_suffixes.role` per attribute; classifies the unmatched DOM element by which Layer 2 role it most closely satisfies. **`/qc-inline`:** classifier output for 3 known mismatches (one colour, one spacing, one text); assert correct role assignment within confidence ≥ 0.7. |
| 5a.3 | Functionality gap detector | **Sonnet** | 20 min | Reads `block_attributes.output_signature` to detect when a draft DOM element expects behaviour (data-action, data-toggle, click handlers) that no SGS block currently provides. Writes to `functionality_gap_candidates` uimax table. **`/qc-inline`:** synthesise a click-toggle widget; run detector; assert it surfaces an FR8 functionality gap row with selector + observed_behaviour fields populated. |
| 5a.4 | Wire `provenance` + `run_id` stamping into gap-candidate writes | **Sonnet** | 15 min | Every gap-candidate row gets `provenance='sgs-clone'` + `run_id=<sgs-clone-run-id>` for traceability back to the clone run that surfaced it. **`/qc-inline`:** run a /sgs-clone on Mama's mockup; query attribute_gap_candidates WHERE run_id = current; assert non-empty + provenance correct. |
| 5a.5 | Operator-review interface for surfaced gaps | **Sonnet** | 20 min | Generates a markdown report at `pipeline-state/sgs-clone/<run_id>/gap-review.md` with per-row: `gap_level` / `selector` / `proposed_action` / `decided_at` columns. **`/qc-inline`:** run on a populated gap_candidates set; open the .md; assert renders correctly + every column present + sorted by severity. |
| 5a.6 | Commit + sub-phase QC | **Inline + Haiku + Sonnet + Gemini Flash panel** | 15 min | Branch `feat/spec-15-p5a-gap-detection`. Commit msg `feat(spec-15-p5a-gap-detection): wire gap detection + operator review`. Multi-rater /qc panel. Gate: ≥ 2/3 pass/ship. |

**Sub-phase 5a success criteria:**
- [ ] 4-level gap routing returns correct level for synthetic inputs
- [ ] Bucket-C classifier achieves ≥ 0.7 confidence on 3 known mismatch types
- [ ] Functionality gap detector writes rows with selector + observed_behaviour
- [ ] Every gap-candidate row carries provenance + run_id
- [ ] Operator markdown report renders + sorts correctly
- [ ] Branch merged to origin/main via PR

---

## Sub-phase 5b — Staged scaffolding (~1.5 hr)

**Goal:** Build the staged-output infrastructure (pipeline-state directory layout) + the attribute staged-application + functionality bulk-application + atomic-block auto-scaffold + the build mutex (Spec 15 FR19) + the media sideloader.

**Entry preconditions:**
- **Spec 15 FRs that apply:** FR11 (coverage report per block) + FR12 (WP block-comment markup with InnerBlocks) + FR19 (mutex: no concurrent /sgs-update + /sgs-clone) + FR20 (pipeline state directory cleanup) + FR21 (no canonical mutation outside designated FRs)
- 9 static-block snapshots exist at `tests/golden/static-block-snapshots/` (Spec 14 P1 ship; `ls tests/golden/static-block-snapshots/*.json | wc -l` returns ≥ 9)
- Phase 3 catalogue retired (sub-phase 5a verified; canonical_slot in sgs-db)
- `/sgs-db impact` + `/wp-blocks validate` + `/wp-hook-graph validate` CLI tools available (verify: `ls ~/.claude/commands/sgs-db.md ~/.claude/hooks/wp-blocks.py ~/.claude/hooks/wp-hook-graph.py` returns 3 files)
- WP REST API credentials in `~/.openclaw/.env` (for the media sideloader at 5b.5; verify: `grep -c "WP_REST_USER\|WP_REST_APP_PASSWORD" ~/.openclaw/.env` returns ≥ 1)
- `pipeline-state/` directory writable (verify: `mkdir -p pipeline-state/spec-15-p5b-test && rmdir pipeline-state/spec-15-p5b-test`)
- **Note for 5b.2:** the pattern reference is `~/.claude/hooks/validate-pipeline-artifact.py` (existing /qc pipeline validator — read it to understand the JSON-schema validation idiom)

| # | Step | Model | Time | Notes + `/qc-inline` |
|---|---|---|---:|---|
| 5b.1 | Staged-output directory + file-naming convention | **Sonnet** | 15 min | Pattern: `pipeline-state/sgs-clone/<run_id>/stage-N-*.json`. Stage outputs survive between `/sgs-clone` stages so the next stage reads its input from disk. **`/qc-inline`:** create a dummy run; assert dir layout matches; run validator script on the dir; assert no orphan files. |
| 5b.2 | Per-stage artifact validator | **Sonnet** | 25 min | New module `plugins/sgs-blocks/scripts/orchestrator/validate-stage-artifact.py`. Validates JSON schema between stages (model after the existing pattern at `~/.claude/hooks/validate-pipeline-artifact.py` — read it first). Per-stage schema lives in `plugins/sgs-blocks/scripts/orchestrator/schemas/stage-N.json`. **`/qc-inline`:** feed validator a malformed stage-3 artifact (missing `slots` array); assert rejection. Feed valid; assert accept. |
| 5b.3 | Confirm no `--resume` flag (architectural reaffirm) | **Inline** | 5 min | Cross-shell python check: `python -c "import re, glob; hits = [f for f in glob.glob('tools/recogniser-v2/*.py') + glob.glob('plugins/sgs-blocks/scripts/orchestrator/*.py') if re.search(r'--resume', open(f).read())]; print('VIOLATION' if hits else 'CLEAN', hits)"` — expect `CLEAN []` per blub.db row 224. **`/qc-inline`:** if any found, halt + surface as architectural violation. |
| 5b.4 | Build mutex (Spec 15 FR19) | **Sonnet** | 20 min | New module `plugins/sgs-blocks/scripts/orchestrator/mutex.py`. Prevents parallel `/sgs-update` + `/sgs-clone` from corrupting sgs-framework.db. Uses file-based lock at `.claude/scratch/spec-15-mutex.lock` with stale-lock detection (>1 hr old = take over). **`/qc-inline`:** try to start two concurrent `/sgs-clone` runs; second must block + report mutex holder. |
| 5b.5 | Media sideloader (under Spec 15 FR21 mutation discipline + Phase 5 own work) | **Sonnet** | 30 min | New module `plugins/sgs-blocks/scripts/orchestrator/media-sideload.py`. For each `image-object` slot in extracted data, uploads via WP REST `/wp/v2/media`; updates the block.json attr with the returned WP attachment id. **`/qc-inline`:** sideload a known PNG from Mama's mockup; assert attachment id + URL returned + writable to the block.json attr. |
| 5b.6 | Attribute staged-application (uses Spec 15 FR12 WP block-comment serialisation) | **Sonnet** | 20 min | When extraction populates a static block's attrs, write them to a STAGING file first (not the canonical `post_content`). Operator approval gate before staging → production. Uses `block_deprecations.json` to migrate existing posts via the FR12 deprecation pattern. **`/qc-inline`:** stage 1 attr change to sgs/counter; assert staging file written; assert canonical post_content unchanged until approval. |
| 5b.7 | Functionality bulk-application (under Spec 15 FR21 mutation discipline) | **Sonnet** | 20 min | New attribute or behaviour that affects multiple block instances → bulk-apply via `wp eval-file` updates wrapped in transactions. Includes rollback on error. **`/qc-inline`:** apply a fake new attribute to 3 sgs/info-box instances; assert all 3 updated atomically; force rollback test (deliberate error mid-apply) and verify zero side effects. |
| 5b.8 | Atomic-block auto-scaffold (uses Spec 15 FR36 polymorphic media for new blocks with images) | **Sonnet** | 25 min | When a `bucket-C` classifier surfaces a new-block candidate, scaffold a minimal block (block.json + render.php + edit.js + save.js) in `plugins/sgs-blocks/src/blocks/<new-slug>/` ready for human polishing. Includes spec-13 BEM compliance + spec-15 canonical_slot registration. **`/qc-inline`:** scaffold a test block from a synthetic gap; assert files exist + block.json valid + the new attribute rows appear in sgs-framework.db. |
| 5b.9 | Commit + sub-phase QC | **Inline + Haiku + Sonnet + Gemini Flash panel** | 15 min | Branch `feat/spec-15-p5b-staged-scaffolding`. Commit `feat(spec-15-p5b-staged-scaffolding): staged artefacts + validator + mutex + sideloader + 3 application paths`. Multi-rater /qc. |

**Sub-phase 5b success criteria:**
- [ ] `pipeline-state/sgs-clone/<run_id>/` dir layout enforced + validated
- [ ] Per-stage artifact validator rejects malformed, accepts valid
- [ ] No `--resume` flag anywhere in orchestrator code
- [ ] Mutex blocks concurrent runs; stale-lock recovery works
- [ ] Media sideloader returns valid WP attachment ids
- [ ] All three staged paths (attribute / functionality / atomic-block) atomic + rollback-safe
- [ ] Branch merged to origin/main

---

## Sub-phase 5c — Lingua-franca conversion (~1.5 hr)

**Goal:** When external sources enter `/sgs-clone` (AI-builder outputs, scraped competitor sites), convert their convention to SGS-BEM at scrape time. Source convention preserved as sibling in `equivalent_implementations` per Spec 13 §5 (now Spec 15 §8.1).

**Entry preconditions:**
- **Spec 15 FRs that apply:** FR9 (lingua-franca conversion at scrape time)
- Spec 15 §8.1 lingua-franca rule absorbed (read it)
- uimax `naming_conventions` table populated (16 rows; query: `SELECT COUNT(*) FROM naming_conventions` against `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` = 16)
- `/uimax-classify-naming` skill exists at `~/.claude/skills/uimax-classify-naming/` (`ls ~/.claude/skills/uimax-classify-naming/SKILL.md` succeeds)
- Phase 1 `property_suffixes` table seeded (used by conversion rules — verify: `SELECT COUNT(*) FROM property_suffixes` = 32)

| # | Step | Model | Time | Notes + `/qc-inline` |
|---|---|---|---:|---|
| 5c.1 | Inventory `extraction_rule` coverage per convention | **Sonnet** | 15 min | For each of 16 `naming_conventions` rows where `is_canonical_for_sgs_drafts=0`, check if `extraction_rule` column is populated. Surface those needing rule authoring. **`/qc-inline`:** query naming_conventions; assert SGS-BEM is the canonical (is_canonical_for_sgs_drafts=1); list non-canonical conventions; expect 15. |
| 5c.2 | Author conversion rules per convention (highest-priority 5) | **Sonnet** | 40 min | Author conversion rules for: BEM-bare (.hero-copy), Tailwind utility (flex items-center), Bootstrap component (.btn .btn-primary), shadcn (data-slot attr), kebab-semantic (.team-grid). Each rule: regex + slot-mapping table → SGS-BEM output. Write to `naming_conventions.extraction_rule` JSON column. **`/qc-inline`:** for each of 5 conventions, run rule against a sample input; assert canonical SGS-BEM emitted + source preserved in equivalent_implementations. |
| 5c.3 | Build `lingua_franca.py` converter | **Sonnet** | 25 min | New module `plugins/sgs-blocks/scripts/orchestrator/lingua_franca.py`. Reads naming_conventions; given an input HTML + source convention slug, returns the converted SGS-BEM HTML + a `equivalent_implementations` map. **`/qc-inline`:** round-trip 5 known patterns; assert byte-identical recovery (source → SGS-BEM → source). Edge case: hashed/minified classes (`.css-x4j8`) → fall through to layout-signature path with `is_gap_candidate=true`. |
| 5c.4 | Wire into Stage 1 BOUNDARY of `/sgs-clone` | **Sonnet** | 20 min | At section-boundary detection, call `/uimax-classify-naming` to identify the source convention. Run `lingua_franca.py` to convert. Continue downstream with SGS-BEM as the canonical. **`/qc-inline`:** run `/sgs-clone` against a Bootstrap-style mockup; assert lingua_franca fires + downstream stages see SGS-BEM classes. Run against Mama's (already SGS-BEM); assert lingua_franca skips (no conversion needed) + no false rewrites. |
| 5c.5 | Commit + sub-phase QC | **Inline + Haiku + Sonnet + Gemini Flash panel** | 10 min | Branch `feat/spec-15-p5c-lingua-franca`. Commit `feat(spec-15-p5c-lingua-franca): SGS-BEM primary + source preserved per Spec 15 §8.1`. Multi-rater /qc. |

**Sub-phase 5c success criteria:**
- [ ] 5 conversion rules authored + tested
- [ ] `lingua_franca.py` round-trips losslessly on known patterns
- [ ] Hashed classes fall through to layout-signature with gap flag
- [ ] Stage 1 BOUNDARY auto-detects convention + converts
- [ ] Bean-controlled SGS-BEM drafts pass through unchanged (no false rewrites)
- [ ] Branch merged to origin/main

---

## Sub-phase 5d — WP integration wiring (~2 hr)

**Goal:** Wire the canonical-slot output into actual WordPress writes. Token resolution, per-client variation routing, supports-first attribute writes, button-role + dynamic-link modifiers, `/wp-blocks` CLI integration, native lightbox/duotone/appearanceTools routing.

**Entry preconditions:**
- **Spec 15 FRs that apply (Phase 1 prerequisites that 5d consumes):** FR27 (behavioural canonicalisation rule), FR28 (canonical decomposition template), FR30 (vocab tables), FR34 (token value-matcher — directly used in 5d.2), FR35 (default-inheritance check — directly used in 5d.4). **Plus FRs 5d itself ships:** FR12 (WP block-comment markup with InnerBlocks), FR21 (no canonical mutation outside designated FRs), FR25 (dynamic-link modifiers `:latest-post(...)` etc.)
- Phase 3 catalogue retired (canonical_slot in sgs-db; verify: `SELECT COUNT(*) FROM block_attributes WHERE canonical_slot IS NULL` returns 0)
- Phase 1 token value-matcher exists at `plugins/sgs-blocks/scripts/value-matcher/match.py` (verify: `ls plugins/sgs-blocks/scripts/value-matcher/match.py plugins/sgs-blocks/scripts/value-matcher/inheritance.py`)
- `/wp-blocks` CLI tool available (verify: `python ~/.claude/hooks/wp-blocks.py --help` returns help text)
- `/wp-theme-check` CLI tool available (verify: `ls ~/.claude/commands/wp-theme-check.md` succeeds)
- SSH access to palestine-lives.org confirmed (verify: `ssh -o BatchMode=yes -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73 echo ok` returns `ok`)
- `theme/sgs-theme/styles/<client-slug>.json` variation files present for at least 1 client (verify: `ls theme/sgs-theme/styles/*.json | wc -l` ≥ 1)

| # | Step | Model | Time | Notes + `/qc-inline` |
|---|---|---|---:|---|
| 5d.1 | Token surface inventory capture | **Inline** | 10 min | `/wp-theme-check presets theme/sgs-theme/theme.json --json > pipeline-state/p5d-token-inventory.json`. **`/qc-inline`:** parse the JSON; assert contains palette + spacingSizes + fontSizes + shadow presets; spot-check 3 token slugs match what Phase 1 value-matcher snaps to. |
| 5d.2 | Token resolver (consumes Spec 15 FR34 value-matcher) | **Sonnet** | 25 min | New module `plugins/sgs-blocks/scripts/orchestrator/token-resolver.py`. Given (block_slug, attr_name, extracted_value), call Phase 1's snap_color / snap_spacing / etc. to get a token slug. Returns either `var(--wp--preset--color--<slug>)` or raw value + gap flag. **`/qc-inline`:** resolve 5 attrs (3 should snap to known tokens, 2 should flag as gap candidates); assert correct CSS var emitted. |
| 5d.3 | Write-path: per-client variation file routing (per Spec 15 §4.7) | **Sonnet** | 30 min | When the operator commits a token change, route to `theme/sgs-theme/styles/<client-slug>.json` (NOT root theme.json, which is the framework default). Per Spec 15 §4.7 — style variations override per client; slugs stay constant. **`/qc-inline`:** simulate a `--primary` change for indus-foods; assert write lands in `theme/sgs-theme/styles/indus-foods.json` and root theme.json untouched. |
| 5d.4 | Supports-first attribute writer (parallels Spec 15 FR35 default-inheritance at write time) | **Sonnet** | 30 min | Before writing a per-block override, check if the value matches a `supports.X` native default (e.g. `supports.color.text`). If it matches, OMIT the override (let WP native styling apply). Same principle as Phase 1's default-inheritance check but at write time. **`/qc-inline`:** synthesise a value matching the global default for sgs/hero textColor; assert writer emits NO `textColor` attr (lets supports.color.text inherit). Then synthesise a different value; assert override is emitted. |
| 5d.5 | Button-role modifier extractor (per Spec 15 §3.6 modifier vocabulary + Spec 11 button architecture) | **Sonnet** | 20 min | When extraction surfaces a `button` slot, classify it as `--primary` / `--secondary` / `--ghost` per Spec 15 §3.6 modifier vocabulary. Maps to sgs/button preset binding (Spec 11). **`/qc-inline`:** feed extractor 3 button DOM elements with different visual treatments; assert correct modifier assigned + sgs/button block.json reflects the variant. |
| 5d.6 | Dynamic-link modifier extractor (Spec 15 FR25) | **Sonnet** | 25 min | When extraction surfaces `:latest-post(category=blog,limit=3)` style modifiers in href values, parse into a `query_descriptor` JSON per Spec 15 §5.1 query-descriptor role. **`/qc-inline`:** feed parser 3 modifier strings; assert correct `{verb, args, raw, parsed}` JSON returned + `parsed=true` for well-formed ones. |
| 5d.7 | `/wp-blocks` CLI integration | **Sonnet** | 15 min | When orchestrator needs to validate emitted block markup, call `/wp-blocks validate "<markup>"`. Fail the stage on validation error. **`/qc-inline`:** feed `/wp-blocks` valid + invalid block markup; assert pass/fail outcomes match expectations. |
| 5d.8 | Block-variation matcher (block.json `variations` field) | **Sonnet** | 20 min | When a block has registered `block.json` variations (e.g. `sgs/hero` with `variant: split`), match extracted attrs against each variation's defaults; pick the closest match to minimise per-block overrides. **`/qc-inline`:** feed matcher hero attrs that match `variant: split` defaults exactly; assert matcher picks `split` and emits zero overrides. |
| 5d.9 | Lightbox + duotone + appearanceTools native routing | **Sonnet** | 20 min | These are WP-native features. When extraction surfaces them, route through native channels (lightbox via `core/image.lightbox`, duotone via `filter.duotone`, appearanceTools via theme.json `appearanceTools: true`) rather than emitting custom CSS. **`/qc-inline`:** synthesise an image with hover-zoom + duotone filter; assert orchestrator emits native props, not custom CSS. |
| 5d.10 | WP-CLI deploy helper | **Sonnet** | 20 min | Push generated `post_content` to live site via `wp eval-file` + `scp` (the deploy pattern from CLAUDE.md). Dry-run mode for testing. **`/qc-inline`:** `--dry-run` against a staging slug; assert command sequence matches established deploy pattern. NEVER push to production without explicit Bean go. |
| 5d.11 | Commit + sub-phase QC | **Inline + Haiku + Sonnet + Gemini Flash panel** | 15 min | Branch `feat/spec-15-p5d-wp-integration`. Commit `feat(spec-15-p5d-wp-integration): token resolver + variation router + supports-first + 7 native paths`. Multi-rater /qc. |

**Sub-phase 5d success criteria:**
- [ ] Token resolver snaps within tolerance + flags gaps
- [ ] Variation file routing — writes never touch root theme.json
- [ ] Supports-first writer omits matching-default overrides
- [ ] Button-role + dynamic-link + query-descriptor extractors return structured output
- [ ] `/wp-blocks` validate + block-variation match + native-feature routing all wired
- [ ] Deploy helper dry-run matches CLAUDE.md pattern
- [ ] Branch merged to origin/main

---

## Sub-phase 5e — Autonomy + visual QA (~2 hr)

**Goal:** The autonomy gate that decides when `/sgs-clone` can advance without operator review. Pre-flight chain, pre-commit gate chain, Staged-merge orchestrator (the keystone — Spec 15 FR21 no-canonical-mutation discipline), visual-QA auto-invoke + bundle, auto-invoke `/sgs-update` on PASS.

**Entry preconditions:**
- **Spec 15 FRs that apply:** FR15 (operator hand-off interface), FR16 (recognition_log feedback loop), FR21 (no canonical mutation outside designated FRs). **Prerequisites from earlier phases:** FR31 (block_attributes extended columns — Phase 1), FR32 (static analyser — Phase 1), FR33 (`/sgs-update` Stages 3+4+9+10 — Phase 2)
- Sub-phase 5b staged-output dir exists at `pipeline-state/sgs-clone/<run_id>/` (verify with a dummy run from 5b)
- `/visual-qa` skill available at `~/.claude/skills/visual-qa/` (verify: `ls ~/.claude/skills/visual-qa/SKILL.md`)
- Playwright + chromium installed (verify: `python -c "from playwright.sync_api import sync_playwright; print('ok')"` returns ok)
- Deploy infrastructure working (CLAUDE.md tar pattern verified — SSH key + Hostinger reachable per 5d preconditions)
- `visual_qa_config.json` schema agreed (will be authored at 5e.0)

| # | Step | Model | Time | Notes + `/qc-inline` |
|---|---|---|---:|---|
| 5e.0 | Define `visual_qa_config.json` thresholds | **Sonnet** | 15 min | Author `tools/recogniser-v2/visual_qa_config.json`: `{pass_threshold: 0.01, surface_threshold: 0.005, viewports: [375, 768, 1440], scope: "full-page"}`. Updated to 1% pass per Spec 15 §7. **`/qc-inline`:** schema-validate the JSON; assert all 4 fields present with correct types + 1% pass / 0.5% surface match Spec 15. |
| 5e.1 | Pre-flight chain (per Spec 15 FR15 operator handoff for ambiguous cases) | **Sonnet** | 20 min | Before `/sgs-clone` starts: verify timer file exists, verify mutex free, verify sgs-framework.db reachable, verify all entry-precondition files for the run's target block list, verify `/visual-qa` available. Abort if any fail with named gap. **`/qc-inline`:** force each pre-flight condition to fail individually; assert clean abort message naming the failed check. |
| 5e.2 | Pre-commit gate chain (BEM lint + token lint + drift validator) | **Sonnet** | 20 min | Before any commit emitted by `/sgs-clone`: run BEM lint (Phase 4) + token lint (Phase 4) + canonical-slot drift validator + Phase 1 unit tests. Fail closed. **`/qc-inline`:** deliberately break BEM in a staged file; assert pre-commit gate fires + commit blocked. |
| 5e.3 | Staged-merge orchestrator (the keystone — Spec 15 FR21 no-canonical-mutation discipline) | **Sonnet** | 35 min | The big one. Walks all staged stage-N JSON artefacts in pipeline-state/<run_id>/, validates each, applies in order, rolls back atomically on any failure. Writes a `merge-log.md` audit trail. **`/qc-inline`:** simulate a 9-stage run; halt mid-stage 5 with synthetic error; assert orchestrator rolls back stages 1–4 cleanly + staging dir empty + log records the failure. |
| 5e.4 | Visual-QA auto-invoke + bundle (writes results back to Spec 15 FR16 recognition_log) | **Sonnet** | 25 min | After staged-merge, auto-invoke `/visual-qa` with the `visual_qa_config.json` thresholds. Capture screenshots at 3 viewports + bundle to `pipeline-state/<run_id>/visual-qa-bundle.zip`. Side-by-side diff thumbnails for any region > 0.5%. **`/qc-inline`:** run on Mama's mockup post-deploy; assert 6 screenshots (3 viewports × 2 sides) + diff JSON + thumbnails for surfaced regions. |
| 5e.5 | Autonomy gate — auto-proceed past Stage 8 | **Sonnet** | 20 min | Decision logic: visual-QA diff ≤ 1% AND zero console errors AND zero failed pre-flights → auto-proceed (no operator gate). Otherwise → surface to operator. **`/qc-inline`:** test 4 scenarios — (a) 0.3% diff + clean: auto-proceed; (b) 0.8% diff + clean: proceed but surface; (c) 1.2% diff: halt; (d) 0.5% diff + console error: halt. Assert correct gate outcome each. |
| 5e.6 | Auto-invoke `/sgs-update` on PASS (uses Spec 15 FR33 extended stages) | **Sonnet** | 15 min | After successful staged-merge + visual-QA PASS, auto-run `/sgs-update` so sgs-framework.db reflects any new blocks/attrs scaffolded during the clone (5b.8 atomic-block scaffold output). **`/qc-inline`:** run a clone that scaffolds a new block; assert post-clone `/sgs-update` populates the new block row in sgs-framework.db.blocks. |
| 5e.7 | Deliverable bundle output | **Sonnet** | 15 min | Final output: `pipeline-state/<run_id>/deliverable.md` summarising the run — what shipped, coverage %, visual-QA result, gap candidates surfaced, links to all artefacts. **`/qc-inline`:** open the .md; assert all sections present + links resolve + readable by a non-technical operator. |
| 5e.8 | Wire pre-flight + staged-merge + auto-update into orchestrator `main()` | **Sonnet** | 20 min | Final wiring. The orchestrator's main entry point now drives: pre-flight → stages 1–9 → staged-merge → visual-QA → autonomy gate → auto-update → deliverable. **`/qc-inline`:** read main(); confirm the 7-step call sequence; run end-to-end smoke test (mocked stages) to verify wiring. |
| 5e.9 | Commit + sub-phase QC | **Inline + Haiku + Sonnet + Gemini Flash panel** | 20 min | Branch `feat/spec-15-p5e-visual-qa`. Commit `feat(spec-15-p5e-visual-qa): pre-flight + staged-merge + visual-qa + autonomy gate + auto-update`. Multi-rater /qc. |

**Sub-phase 5e success criteria:**
- [ ] `visual_qa_config.json` reflects 1% pass / 0.5% surface thresholds
- [ ] Pre-flight + pre-commit chains fail-closed
- [ ] Staged-merge rolls back atomically on synthetic mid-run failure
- [ ] Visual-QA bundle generated with 6 screenshots + diff thumbnails
- [ ] Autonomy gate makes correct decision in all 4 test scenarios
- [ ] Post-PASS `/sgs-update` populates new blocks in sgs-framework.db
- [ ] Deliverable.md readable by non-technical operator
- [ ] Branch merged to origin/main

---

## Sub-phase 5f — Acceptance harness (~30 min)

**Goal:** The 5-check critical-fix-verification per Spec 15 FR18 P1 KJC2. Final acceptance gate before Phase 5 declares done.

**Entry preconditions:**
- **Spec 15 FRs that apply:** FR18 (recogniser script lifecycle + P1 KJC2 5-check harness scope), FR21 (no canonical mutation outside designated FRs)
- Sub-phases 5a–5e shipped on origin/main (verify: `git log --oneline | grep -cE "feat\\(spec-15-p5[a-e]-"` returns 5)
- FR18 + P1 KJC2 5-check definition present in `.claude/decisions.md` (verify: `grep -c "FR18\\|KJC2" .claude/decisions.md` returns ≥ 2 lines — appended this session)
- sgs-framework.db + uimax accessible (verify Phase 1 entry preconditions still hold)
- Mama's mockup ready at `sites/mamas-munches/mockups/homepage/index.html`

| # | Step | Model | Time | Notes + `/qc-inline` |
|---|---|---|---:|---|
| 5f.1 | `critical-fix-verification.py` — 5 boundary checks | **Cerebras** (bounded single file) | 20 min | Five checks per FR18 P1 KJC2: (1) no root `theme.json` mutation outside Spec 15 §4.7 channels (variation routing), (2) no canonical-block files mutated outside FR21 staged-merge commit, (3) no licensing strings in uimax writes (per blub.db row 211), (4) `/sgs-update` idempotency green (re-run produces 0 diffs), (5) `pipeline-state/<run_id>/` staging dir empty post-success. **`/qc-inline`:** run harness against current main; all 5 should pass. Deliberately violate check 1 (mutate root theme.json); rerun; assert check 1 fails + others pass. Restore. |
| 5f.2 | Run harness E2E against Mama's mockup | **Inline** | 25 min | Full `/sgs-clone` E2E run on `sites/mamas-munches/mockups/homepage/index.html`. Targets: ≥ 90% block attr coverage + ≤ 1% visual parity diff at 3 breakpoints + 5/5 harness checks green. **`/qc-inline`:** capture coverage numbers per section + visual diff %; surface to operator if any target missed; do NOT auto-pass without all three thresholds met. |
| 5f.3 | Phase 5 final QC | **Inline + Haiku + Sonnet + Gemini Flash panel** | 20 min | 3-rater /qc against the entire Phase 5 deliverable (all 6 sub-phases together). Gate: ≥ 2/3 raters pass/ship + 5/5 harness checks green + E2E target met. |
| 5f.4 | Commit + handoff for Phase 6 (cross-platform output) | **Inline** | 10 min | Branch `feat/spec-15-p5f-acceptance-harness`. Commit `feat(spec-15-p5f-acceptance-harness): 5-check harness + E2E Mama's clone`. Generate `/handoff` for Phase 6 cold-start. |

**Sub-phase 5f success criteria:**
- [ ] 5-check harness runs against main + detects deliberate violations
- [ ] E2E Mama's clone: ≥ 90% coverage + ≤ 1% visual diff at 3 viewports + 5/5 harness green
- [ ] Multi-rater /qc panel converges on pass/ship
- [ ] Branch merged to origin/main
- [ ] Phase 6 handoff written

---

## Phase 5 overall acceptance

Phase 5 declares done when ALL of:

- [ ] Sub-phases 5a–5f shipped on origin/main (6 commits visible)
- [ ] E2E run on Mama's mockup hits: ≥ 90% block attr coverage + ≤ 1% visual parity + 5/5 critical-fix-verification green
- [ ] Multi-rater /qc on the full Phase 5 deliverable returns ≥ 2/3 pass/ship
- [ ] `pipeline-state/sgs-clone/<run_id>/deliverable.md` for Mama's run readable by Bean without translation
- [ ] No `feat(spec-15-p5-` commit left behind on a feature branch — all merged

After Phase 5 ships: `/handoff` for Phase 6 (cross-platform output — Bootstrap/Tailwind/shadcn/React/Node.js generators using uimax `equivalent_implementations` + design_tokens cross-platform columns). Phase 6 is the extension phase; not blocking Phase 5 acceptance.