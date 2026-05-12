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
- **Branch:** `feat/spec-15-p5-<sub>` per sub-phase. Sub-phase commit format: `feat(spec-15-p5-<sub>): <description>`. All on origin/main after PR merge.
- **Stop conditions** per master plan §Verification Discipline Rule 3.

---

## Sub-phase 5a — Gap detection (~1 hr)

**Goal:** Wire gap detection into `/sgs-clone` Stage 9. Failed extractions feed `attribute_gap_candidates` for operator review.

**Entry preconditions** (verify before 5a.1):
- Spec 14 FR9 + FR10 referenced (read Spec 15 §10)
- `plugins/sgs-blocks/scripts/recogniser/leftover-bucket-router.py` exists (Spec 14 P1/P7 ship)
- `attribute_gap_candidates` + `functionality_gap_candidates` uimax tables exist (Spec 14 P2 ship; query: `SELECT name FROM sqlite_master WHERE type='table'` against `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db`)
- Phase 1 `property_suffixes` table seeded (32 rows; query: `SELECT COUNT(*) FROM property_suffixes` against sgs-framework.db)
- Phase 2 `/sgs-update` Stage 10 wired (drift validator + gap detection writes to attribute_gap_candidates)
- `recursion-guard.py` available at `plugins/sgs-blocks/scripts/recogniser/recursion-guard.py`

| # | Step | Model | Time | Notes + `/qc-inline` |
|---|---|---|---:|---|
| 5a.1 | Patch `leftover-bucket-router.py` for 4 gap-level routing | **Sonnet** | 20 min | Existing 5-bucket router needs to emit `(bucket, severity, gap_level)` triples per spec 14 FR9. Gap levels: `attribute` / `functionality` / `convention` / `structural`. **`/qc-inline`:** feed router 4 synthetic mockup chunks (one per gap level); assert each returns the correct level. |
| 5a.2 | Bucket-C role-taxonomy classifier (FR10) | **Sonnet** | 25 min | New module `plugins/sgs-blocks/scripts/recogniser/bucket-c-classifier.py`. Reads `property_suffixes.role` per attribute; classifies the unmatched DOM element by which Layer 2 role it most closely satisfies. **`/qc-inline`:** classifier output for 3 known mismatches (one colour, one spacing, one text); assert correct role assignment within confidence ≥ 0.7. |
| 5a.3 | Functionality gap detector | **Sonnet** | 20 min | Reads `block_attributes.output_signature` to detect when a draft DOM element expects behaviour (data-action, data-toggle, click handlers) that no SGS block currently provides. Writes to `functionality_gap_candidates` uimax table. **`/qc-inline`:** synthesise a click-toggle widget; run detector; assert it surfaces an FR8 functionality gap row with selector + observed_behaviour fields populated. |
| 5a.4 | Wire `provenance` + `run_id` stamping into gap-candidate writes | **Sonnet** | 15 min | Every gap-candidate row gets `provenance='sgs-clone'` + `run_id=<sgs-clone-run-id>` for traceability back to the clone run that surfaced it. **`/qc-inline`:** run a /sgs-clone on Mama's mockup; query attribute_gap_candidates WHERE run_id = current; assert non-empty + provenance correct. |
| 5a.5 | Operator-review interface for surfaced gaps | **Sonnet** | 20 min | Generates a markdown report at `pipeline-state/sgs-clone/<run_id>/gap-review.md` with per-row: `gap_level` / `selector` / `proposed_action` / `decided_at` columns. **`/qc-inline`:** run on a populated gap_candidates set; open the .md; assert renders correctly + every column present + sorted by severity. |
| 5a.6 | Commit + sub-phase QC | **Inline + Gemini Flash ×3 panel** | 15 min | Branch `feat/spec-15-p5a-gap-detection`. Commit msg `feat(spec-15-p5-gap-detection): wire gap detection + operator review`. Multi-rater /qc panel. Gate: ≥ 2/3 pass/ship. |

**Sub-phase 5a success criteria:**
- [ ] 4-level gap routing returns correct level for synthetic inputs
- [ ] Bucket-C classifier achieves ≥ 0.7 confidence on 3 known mismatch types
- [ ] Functionality gap detector writes rows with selector + observed_behaviour
- [ ] Every gap-candidate row carries provenance + run_id
- [ ] Operator markdown report renders + sorts correctly
- [ ] Branch merged to origin/main via PR

---

## Sub-phase 5b — Staged scaffolding (~1.5 hr)

**Goal:** Build the staged-output infrastructure (pipeline-state directory layout) + the FR12 attribute staged-application + FR13 functionality bulk-application + FR14 atomic-block auto-scaffold + the FR20 build mutex + the FR19 media sideloader.

**Entry preconditions:**
- Spec 14 FR11/12/13/14/19/20 understood (read Spec 15 §10 FR table)
- 9 static-block snapshots exist at `tests/golden/static-block-snapshots/` (Spec 14 P1 ship — verify by `ls tests/golden/static-block-snapshots/*.json | wc -l` returns ≥ 9)
- Phase 3 catalogue retired (sub-phase 5a verified this; canonical_slot in sgs-db)
- `/sgs-db impact` + `/wp-blocks validate` + `/wp-hook-graph validate` CLI tools available
- WP REST API credentials in `~/.openclaw/.env` (for FR19 media sideload)
- `pipeline-state/` directory writable

| # | Step | Model | Time | Notes + `/qc-inline` |
|---|---|---|---:|---|
| 5b.1 | Staged-output directory + file-naming convention | **Sonnet** | 15 min | Pattern: `pipeline-state/sgs-clone/<run_id>/stage-N-*.json`. Stage outputs survive between `/sgs-clone` stages so the next stage reads its input from disk. **`/qc-inline`:** create a dummy run; assert dir layout matches; run validator script on the dir; assert no orphan files. |
| 5b.2 | Per-stage artifact validator | **Sonnet** | 25 min | New module `plugins/sgs-blocks/scripts/orchestrator/validate-stage-artifact.py`. Validates JSON schema between stages (similar pattern to existing `validate-pipeline-artifact.py`). Per-stage schema lives in `plugins/sgs-blocks/scripts/orchestrator/schemas/stage-N.json`. **`/qc-inline`:** feed validator a malformed stage-3 artifact (missing `slots` array); assert rejection. Feed valid; assert accept. |
| 5b.3 | Confirm no `--resume` flag (architectural reaffirm) | **Inline** | 5 min | `grep -nE '\\-\\-resume' tools/recogniser-v2/*.py plugins/sgs-blocks/scripts/orchestrator/*.py` — expect zero hits per blub.db row 224. **`/qc-inline`:** if any found, halt + surface as architectural violation. |
| 5b.4 | FR20 build mutex | **Sonnet** | 20 min | New module `plugins/sgs-blocks/scripts/orchestrator/mutex.py`. Prevents parallel `/sgs-update` + `/sgs-clone` from corrupting sgs-framework.db. Uses file-based lock at `.claude/scratch/spec-15-mutex.lock` with stale-lock detection (>1 hr old = take over). **`/qc-inline`:** try to start two concurrent `/sgs-clone` runs; second must block + report mutex holder. |
| 5b.5 | FR19 media sideloader | **Sonnet** | 30 min | New module `plugins/sgs-blocks/scripts/orchestrator/media-sideload.py`. For each `image-object` slot in extracted data, uploads via WP REST `/wp/v2/media`; updates the block.json attr with the returned WP attachment id. **`/qc-inline`:** sideload a known PNG from Mama's mockup; assert attachment id + URL returned + writable to the block.json attr. |
| 5b.6 | FR12 attribute staged-application | **Sonnet** | 20 min | When extraction populates a static block's attrs, write them to a STAGING file first (not the canonical `post_content`). Operator approval gate before staging → production. Uses `block_deprecations.json` to migrate existing posts via the FR12 deprecation pattern. **`/qc-inline`:** stage 1 attr change to sgs/counter; assert staging file written; assert canonical post_content unchanged until approval. |
| 5b.7 | FR13 functionality bulk-application | **Sonnet** | 20 min | New attribute or behaviour that affects multiple block instances → bulk-apply via `wp eval-file` updates wrapped in transactions. Includes rollback on error. **`/qc-inline`:** apply a fake new attribute to 3 sgs/info-box instances; assert all 3 updated atomically; force rollback test (deliberate error mid-apply) and verify zero side effects. |
| 5b.8 | FR14 atomic-block auto-scaffold | **Sonnet** | 25 min | When a `bucket-C` classifier surfaces a new-block candidate, scaffold a minimal block (block.json + render.php + edit.js + save.js) in `plugins/sgs-blocks/src/blocks/<new-slug>/` ready for human polishing. Includes spec-13 BEM compliance + spec-15 canonical_slot registration. **`/qc-inline`:** scaffold a test block from a synthetic gap; assert files exist + block.json valid + the new attribute rows appear in sgs-framework.db. |
| 5b.9 | Commit + sub-phase QC | **Inline + Gemini Flash ×3 panel** | 15 min | Branch `feat/spec-15-p5b-staged-scaffolding`. Commit `feat(spec-15-p5-staged-scaffolding): staged artefacts + validator + mutex + sideloader + 3 application paths`. Multi-rater /qc. |

**Sub-phase 5b success criteria:**
- [ ] `pipeline-state/sgs-clone/<run_id>/` dir layout enforced + validated
- [ ] Per-stage artifact validator rejects malformed, accepts valid
- [ ] No `--resume` flag anywhere in orchestrator code
- [ ] Mutex blocks concurrent runs; stale-lock recovery works
- [ ] Media sideloader returns valid WP attachment ids
- [ ] FR12/13/14 staged paths all atomic + rollback-safe
- [ ] Branch merged to origin/main

---

## Sub-phase 5c — Lingua-franca conversion (~1.5 hr)

**Goal:** When external sources enter `/sgs-clone` (AI-builder outputs, scraped competitor sites), convert their convention to SGS-BEM at scrape time. Source convention preserved as sibling in `equivalent_implementations` per Spec 13 §5 (now Spec 15 §8.1).

**Entry preconditions:**
- Spec 15 §8.1 lingua-franca rule absorbed
- uimax `naming_conventions` table populated (16 rows; query: `SELECT COUNT(*) FROM naming_conventions` = 16)
- `/uimax-classify-naming` skill exists at `~/.claude/skills/uimax-classify-naming/`
- Phase 1 `property_suffixes` table seeded (used by conversion rules)

| # | Step | Model | Time | Notes + `/qc-inline` |
|---|---|---|---:|---|
| 5c.1 | Inventory `extraction_rule` coverage per convention | **Sonnet** | 15 min | For each of 16 `naming_conventions` rows where `is_canonical_for_sgs_drafts=0`, check if `extraction_rule` column is populated. Surface those needing rule authoring. **`/qc-inline`:** query naming_conventions; assert SGS-BEM is the canonical (is_canonical_for_sgs_drafts=1); list non-canonical conventions; expect 15. |
| 5c.2 | Author conversion rules per convention (highest-priority 5) | **Sonnet** | 40 min | Author conversion rules for: BEM-bare (.hero-copy), Tailwind utility (flex items-center), Bootstrap component (.btn .btn-primary), shadcn (data-slot attr), kebab-semantic (.team-grid). Each rule: regex + slot-mapping table → SGS-BEM output. Write to `naming_conventions.extraction_rule` JSON column. **`/qc-inline`:** for each of 5 conventions, run rule against a sample input; assert canonical SGS-BEM emitted + source preserved in equivalent_implementations. |
| 5c.3 | Build `lingua_franca.py` converter | **Sonnet** | 25 min | New module `plugins/sgs-blocks/scripts/orchestrator/lingua_franca.py`. Reads naming_conventions; given an input HTML + source convention slug, returns the converted SGS-BEM HTML + a `equivalent_implementations` map. **`/qc-inline`:** round-trip 5 known patterns; assert byte-identical recovery (source → SGS-BEM → source). Edge case: hashed/minified classes (`.css-x4j8`) → fall through to layout-signature path with `is_gap_candidate=true`. |
| 5c.4 | Wire into Stage 1 BOUNDARY of `/sgs-clone` | **Sonnet** | 20 min | At section-boundary detection, call `/uimax-classify-naming` to identify the source convention. Run `lingua_franca.py` to convert. Continue downstream with SGS-BEM as the canonical. **`/qc-inline`:** run `/sgs-clone` against a Bootstrap-style mockup; assert lingua_franca fires + downstream stages see SGS-BEM classes. Run against Mama's (already SGS-BEM); assert lingua_franca skips (no conversion needed) + no false rewrites. |
| 5c.5 | Commit + sub-phase QC | **Inline + Gemini Flash ×3 panel** | 10 min | Branch `feat/spec-15-p5c-lingua-franca`. Commit `feat(spec-15-p5-lingua-franca): SGS-BEM primary + source preserved per Spec 15 §8.1`. Multi-rater /qc. |

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
- Spec 14 FR22/23/24/25/27/28/30/34 understood (Spec 15 §10 FR table)
- Phase 3 catalogue retired (canonical_slot in sgs-db)
- Phase 1 token value-matcher + default-inheritance available
- `/wp-blocks` + `/wp-theme-check` CLI tools available
- SSH access to palestine-lives.org confirmed (key at `~/.ssh/id_ed25519`)
- `theme/sgs-theme/styles/<client-slug>.json` variation files present for at least 1 client

| # | Step | Model | Time | Notes + `/qc-inline` |
|---|---|---|---:|---|
| 5d.1 | Token surface inventory capture | **Inline** | 10 min | `/wp-theme-check presets theme/sgs-theme/theme.json --json > pipeline-state/p5d-token-inventory.json`. **`/qc-inline`:** parse the JSON; assert contains palette + spacingSizes + fontSizes + shadow presets; spot-check 3 token slugs match what Phase 1 value-matcher snaps to. |
| 5d.2 | FR22 + FR34 token resolver | **Sonnet** | 25 min | New module `plugins/sgs-blocks/scripts/orchestrator/token-resolver.py`. Given (block_slug, attr_name, extracted_value), call Phase 1's snap_color / snap_spacing / etc. to get a token slug. Returns either `var(--wp--preset--color--<slug>)` or raw value + gap flag. **`/qc-inline`:** resolve 5 attrs (3 should snap to known tokens, 2 should flag as gap candidates); assert correct CSS var emitted. |
| 5d.3 | FR22 write-path: per-client variation file routing | **Sonnet** | 30 min | When the operator commits a token change, route to `theme/sgs-theme/styles/<client-slug>.json` (NOT root theme.json, which is the framework default). Per Spec 15 §4.7 — style variations override per client; slugs stay constant. **`/qc-inline`:** simulate a `--primary` change for indus-foods; assert write lands in `theme/sgs-theme/styles/indus-foods.json` and root theme.json untouched. |
| 5d.4 | FR23 supports-first attribute writer | **Sonnet** | 30 min | Before writing a per-block override, check if the value matches a `supports.X` native default (e.g. `supports.color.text`). If it matches, OMIT the override (let WP native styling apply). Same principle as Phase 1's default-inheritance check but at write time. **`/qc-inline`:** synthesise a value matching the global default for sgs/hero textColor; assert writer emits NO `textColor` attr (lets supports.color.text inherit). Then synthesise a different value; assert override is emitted. |
| 5d.5 | FR24 button-role modifier extractor | **Sonnet** | 20 min | When extraction surfaces a `button` slot, classify it as `--primary` / `--secondary` / `--ghost` per Spec 15 §3.6 modifier vocabulary. Maps to sgs/button preset binding (Spec 11). **`/qc-inline`:** feed extractor 3 button DOM elements with different visual treatments; assert correct modifier assigned + sgs/button block.json reflects the variant. |
| 5d.6 | FR25 dynamic-link modifier extractor | **Sonnet** | 25 min | When extraction surfaces `:latest-post(category=blog,limit=3)` style modifiers in href values, parse into a `query_descriptor` JSON per Spec 15 §5.1 query-descriptor role. **`/qc-inline`:** feed parser 3 modifier strings; assert correct `{verb, args, raw, parsed}` JSON returned + `parsed=true` for well-formed ones. |
| 5d.7 | FR27 `/wp-blocks` CLI integration | **Sonnet** | 15 min | When orchestrator needs to validate emitted block markup, call `/wp-blocks validate "<markup>"`. Fail the stage on validation error. **`/qc-inline`:** feed `/wp-blocks` valid + invalid block markup; assert pass/fail outcomes match expectations. |
| 5d.8 | FR28 block-variation matcher | **Sonnet** | 20 min | When a block has registered `block.json` variations (e.g. `sgs/hero` with `variant: split`), match extracted attrs against each variation's defaults; pick the closest match to minimise per-block overrides. **`/qc-inline`:** feed matcher hero attrs that match `variant: split` defaults exactly; assert matcher picks `split` and emits zero overrides. |
| 5d.9 | FR30 lightbox + duotone + appearanceTools native routing | **Sonnet** | 20 min | These are WP-native features. When extraction surfaces them, route through native channels (lightbox via `core/image.lightbox`, duotone via `filter.duotone`, appearanceTools via theme.json `appearanceTools: true`) rather than emitting custom CSS. **`/qc-inline`:** synthesise an image with hover-zoom + duotone filter; assert orchestrator emits native props, not custom CSS. |
| 5d.10 | WP-CLI deploy helper | **Sonnet** | 20 min | Push generated `post_content` to live site via `wp eval-file` + `scp` (the deploy pattern from CLAUDE.md). Dry-run mode for testing. **`/qc-inline`:** `--dry-run` against a staging slug; assert command sequence matches established deploy pattern. NEVER push to production without explicit Bean go. |
| 5d.11 | Commit + sub-phase QC | **Inline + Gemini Flash ×3 panel** | 15 min | Branch `feat/spec-15-p5d-wp-integration`. Commit `feat(spec-15-p5-wp-integration): token resolver + variation router + supports-first + 7 native paths`. Multi-rater /qc. |

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

**Goal:** The autonomy gate that decides when `/sgs-clone` can advance without operator review. Pre-flight chain, pre-commit gate chain, FR21 staged-merge orchestrator (the keystone), visual-QA auto-invoke + bundle, auto-invoke `/sgs-update` on PASS.

**Entry preconditions:**
- Spec 14 FR15/16/21/31/32/33 referenced (Spec 15 §10 FR table)
- Sub-phase 5b staged-output dir exists (`pipeline-state/sgs-clone/<run_id>/`)
- `/visual-qa` skill available at `~/.claude/skills/visual-qa/`
- Playwright + chromium installed (`playwright install chromium`)
- Deploy infrastructure working (CLAUDE.md tar pattern)
- `visual_qa_config.json` schema agreed (per absorbed plan Step 0)

| # | Step | Model | Time | Notes + `/qc-inline` |
|---|---|---|---:|---|
| 5e.0 | Define `visual_qa_config.json` thresholds | **Sonnet** | 15 min | Author `tools/recogniser-v2/visual_qa_config.json`: `{pass_threshold: 0.01, surface_threshold: 0.005, viewports: [375, 768, 1440], scope: "full-page"}`. Updated to 1% pass per Spec 15 §7. **`/qc-inline`:** schema-validate the JSON; assert all 4 fields present with correct types + 1% pass / 0.5% surface match Spec 15. |
| 5e.1 | FR15 pre-flight chain | **Sonnet** | 20 min | Before `/sgs-clone` starts: verify timer file exists, verify mutex free, verify sgs-framework.db reachable, verify all entry-precondition files for the run's target block list, verify `/visual-qa` available. Abort if any fail with named gap. **`/qc-inline`:** force each pre-flight condition to fail individually; assert clean abort message naming the failed check. |
| 5e.2 | FR32 pre-commit gate chain | **Sonnet** | 20 min | Before any commit emitted by `/sgs-clone`: run BEM lint (Phase 4) + token lint (Phase 4) + canonical-slot drift validator + Phase 1 unit tests. Fail closed. **`/qc-inline`:** deliberately break BEM in a staged file; assert pre-commit gate fires + commit blocked. |
| 5e.3 | FR21 staged-merge orchestrator (the keystone) | **Sonnet** | 35 min | The big one. Walks all staged stage-N JSON artefacts in pipeline-state/<run_id>/, validates each, applies in order, rolls back atomically on any failure. Writes a `merge-log.md` audit trail. **`/qc-inline`:** simulate a 9-stage run; halt mid-stage 5 with synthetic error; assert orchestrator rolls back stages 1–4 cleanly + staging dir empty + log records the failure. |
| 5e.4 | FR16 visual-QA auto-invoke + bundle | **Sonnet** | 25 min | After staged-merge, auto-invoke `/visual-qa` with the `visual_qa_config.json` thresholds. Capture screenshots at 3 viewports + bundle to `pipeline-state/<run_id>/visual-qa-bundle.zip`. Side-by-side diff thumbnails for any region > 0.5%. **`/qc-inline`:** run on Mama's mockup post-deploy; assert 6 screenshots (3 viewports × 2 sides) + diff JSON + thumbnails for surfaced regions. |
| 5e.5 | Autonomy gate — auto-proceed past Stage 8 | **Sonnet** | 20 min | Decision logic: visual-QA diff ≤ 1% AND zero console errors AND zero failed pre-flights → auto-proceed (no operator gate). Otherwise → surface to operator. **`/qc-inline`:** test 4 scenarios — (a) 0.3% diff + clean: auto-proceed; (b) 0.8% diff + clean: proceed but surface; (c) 1.2% diff: halt; (d) 0.5% diff + console error: halt. Assert correct gate outcome each. |
| 5e.6 | FR33 auto-invoke `/sgs-update` on PASS | **Sonnet** | 15 min | After successful staged-merge + visual-QA PASS, auto-run `/sgs-update` so sgs-framework.db reflects any new blocks/attrs scaffolded during the clone (FR14 atomic-block creates). **`/qc-inline`:** run a clone that scaffolds a new block; assert post-clone `/sgs-update` populates the new block row in sgs-framework.db.blocks. |
| 5e.7 | Deliverable bundle output | **Sonnet** | 15 min | Final output: `pipeline-state/<run_id>/deliverable.md` summarising the run — what shipped, coverage %, visual-QA result, gap candidates surfaced, links to all artefacts. **`/qc-inline`:** open the .md; assert all sections present + links resolve + readable by a non-technical operator. |
| 5e.8 | Wire FR15 + FR21 + FR33 into orchestrator `main()` | **Sonnet** | 20 min | Final wiring. The orchestrator's main entry point now drives: pre-flight → stages 1–9 → staged-merge → visual-QA → autonomy gate → auto-update → deliverable. **`/qc-inline`:** read main(); confirm the 7-step call sequence; run end-to-end smoke test (mocked stages) to verify wiring. |
| 5e.9 | Commit + sub-phase QC | **Inline + Gemini Flash ×3 panel** | 20 min | Branch `feat/spec-15-p5e-visual-qa`. Commit `feat(spec-15-p5-visual-qa): pre-flight + staged-merge + visual-qa + autonomy gate + auto-update`. Multi-rater /qc. |

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

**Goal:** The 5-check critical-fix-verification per Spec 14 FR18 P1 KJC2. Final acceptance gate before Phase 5 declares done.

**Entry preconditions:**
- Sub-phases 5a–5e shipped on origin/main (verify: `git log --oneline | grep "feat(spec-15-p5-"` returns 5 entries)
- Spec 14 FR18 + P1 KJC2 understood (`grep "FR18\|KJC2" .claude/decisions.md` returns the 5 named checks)
- sgs-framework.db + uimax accessible
- Mama's mockup ready for E2E run

| # | Step | Model | Time | Notes + `/qc-inline` |
|---|---|---|---:|---|
| 5f.1 | `critical-fix-verification.py` — 5 boundary checks | **Cerebras** (bounded single file) | 20 min | Five checks per FR18 P1 KJC2: (1) no root `theme.json` mutation outside Spec 15 §4.7 channels (variation routing), (2) no canonical-block files mutated outside FR21 staged-merge commit, (3) no licensing strings in uimax writes (per blub.db row 211), (4) `/sgs-update` idempotency green (re-run produces 0 diffs), (5) `pipeline-state/<run_id>/` staging dir empty post-success. **`/qc-inline`:** run harness against current main; all 5 should pass. Deliberately violate check 1 (mutate root theme.json); rerun; assert check 1 fails + others pass. Restore. |
| 5f.2 | Run harness E2E against Mama's mockup | **Inline** | 25 min | Full `/sgs-clone` E2E run on `sites/mamas-munches/mockups/homepage/index.html`. Targets: ≥ 90% block attr coverage + ≤ 1% visual parity diff at 3 breakpoints + 5/5 harness checks green. **`/qc-inline`:** capture coverage numbers per section + visual diff %; surface to operator if any target missed; do NOT auto-pass without all three thresholds met. |
| 5f.3 | Phase 5 final QC | **Inline + Gemini Flash ×3 panel** | 20 min | 3-rater /qc against the entire Phase 5 deliverable (all 6 sub-phases together). Gate: ≥ 2/3 raters pass/ship + 5/5 harness checks green + E2E target met. |
| 5f.4 | Commit + handoff for Phase 6 (cross-platform output) | **Inline** | 10 min | Branch `feat/spec-15-p5f-acceptance-harness`. Commit `feat(spec-15-p5-acceptance-harness): 5-check harness + E2E Mama's clone`. Generate `/handoff` for Phase 6 cold-start. |

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