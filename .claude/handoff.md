---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-30-D107-D113-canary-fixes-batch
generated: 2026-05-30
parent_session: small-giants-wp-2026-05-29-architectural-cleanup-batch-D93-D100
primary_goal: "Shipped 7 D-numbered decisions (D107-D113) across 14 commits. Pixel-diff trajectory 58.6% → 56.40% (-2.20pp aggregate). XS-3 walker code attempted + REVERTED post-regression (+13.07pp featured-product / +10.40pp social-proof); block_composition table data layer persists. D6 inheritance script shipped but threshold too tight (4 blocks; Bean wants 20-30+). XS-3 refined trigger + D6 re-tune queued for next session."
---

# Session Handoff — 2026-05-30

## Completed This Session

1. **XS-1 + XS-8 + XS-9 + XS-10** — CSS sentinel fix, slot-list noise filter, atomic-tag rich-text for core/*, HTML comment skip (4 atomic commits earlier in session)
2. **XS-9.1 + XS-9.2 + URL hardening** — SGS atomic rich-text (sgs/heading + sgs/text + sgs/quote) + sgs/button wp_kses tightened allowlist (no `<a>`) + `_safe_href()` scheme blocking at converter layer (commit 40a6f8ab; 11 adversarial smoke tests pass)
3. **Mojibake source fix** — announcement-bar/block.json:38 `­ƒÄë New product launch ÔÇö` → `🎉 New product launch — ` (commit 88436693; live page verified via Playwright)
4. **Featured variant** — sgs/product-card variantStyle enum extended + featuredTag attr + render branch (commit 669115f0)
5. **D3 build-deploy.py** — 367 LOC canary-fast-cycle deploy automation with 5-step pipeline + 3 guards + dry-run (commit a23ff53f)
6. **D5 STOP catalogue #12 + pre-flight Q6** — routing-path verification methodology rule (commit 32c70774)
7. **D1 + XS-2 + XS-5** — `blocks.tier` column added (sgs/hero + sgs/cta-section flagged class-section via `supports.sgs.is_section_root`); voter rewritten to DB-driven; 12 wrong section-scope slot rows DELETED; testimonial + testimonial-slider re-inserted at element scope (commit e2c8597e)
8. **XS-3 walker REVERTED** — universal layout-wrapper condition shipped (f173b351) then reverted (c76aa107) after +13.07pp regression on featured-product + +10.40pp on social-proof. `block_composition` table (188 rows) data layer PERSISTS past revert
9. **XS-4 assign-canonical port + backfill** — assign-canonical.py D99-ported (9 references migrated); batch backfill canonical_slot 52→692 (33.4%), role 110→689 (33.2%) (commits 04fa0f2b + 52408c7e XS-4 follow-ups: camelCase regex + slot vocab + Tier B2 compound selectors)
10. **D6 sync-container-wrapping-blocks.py** — 468 LOC inheritance audit script + 9-signal scoring + 4 blocks flagged wraps_block='sgs/container' (sgs/hero, sgs/cta-section, sgs/modal, sgs/quote) (commit 062c69d1)
11. **Comprehensive doc updates** — 26 docs updated across 4 commits: decisions.md D107-D113, parking.md (3 RESOLVED + 5 NEW), state.md, CLAUDE.md, mistakes.md, architecture.md, dev-setup.md, goals.md, docs-registry.yaml, plan.md, all 5 phase plans, Spec 22 (NEW §FR-22-16 + §FR-22-17), specs 00/02/11/19/20/21, common-wp-styling-errors.md, cloning-pipeline-flow.md, cloning-pipeline-stages.md, qc-council-issue-register

## Current State

- **Branch:** main at `dbe7cf8c` (HEAD; this handoff commit closes the session)
- **Tests:** 12/12 converter_v2 tests pass post-XS-2; all 6 implementer subagents reported zero errors; 11 adversarial XSS smoke tests pass on sgs/button
- **Build:** npm run build clean (webpack 5.105.2); build-deploy.py --dry-run passes
- **Uncommitted changes:** none (auto-regen lucide-icons.php only, never committed per state.md)
- **Pixel-diff:** 58.6% baseline → **56.40% final** = -2.20pp aggregate session movement
- **DB:** blocks.tier column populated 2 rows (sgs/hero, sgs/cta-section); block_composition table 188 rows (4 wraps_block='sgs/container'); slots 96 (92 element + 4 section); block_attributes canonical_slot 33.4% (692/2074) / role 33.2% (689/2074)

## Known Issues / Blockers

- **XS-3 walker code DEFERRED** — refined trigger needed (immediate-child-of-section-root constraint); queued at P-XS-3-TRIGGER-REFINEMENT
- **D6 threshold DEFERRED** — sync-container-wrapping-blocks.py currently flags only 4 blocks; Bean wants 20-30+; queued at P-D6-THRESHOLD-RETUNE
- **D107-D113 source changes not yet deployed to canary** — block.json supports.sgs.is_section_root + button render.php wp_kses + product-card featured render need `npm build` + `build-deploy.py --target sandybrown` before they take live effect; pipeline /sgs-clone reflects convert.py changes only
- **block_attributes 1316 NULL canonical_slot rows** — vocab/regex gaps; runtime Tier B2 in db_lookup handles some at lookup time without DB backfill
- **mistakes.md at 33 stubs** — exceeds ~30 active guideline per CLAUDE.md doc-op standards; prune pass deferred

## Next Priorities (in order)

1. **Refined XS-3 walker condition** — re-enable with immediate-child-of-section-root constraint (biggest predicted pixel-diff lever; queue subagent-driven-development with spec + quality reviewers)
2. **D6 threshold re-tune** — broaden sync-container-wrapping-blocks.py heuristic to flag 20-30 container-wrapping blocks per Bean's list (feature-grid, info-box, form, announcement-bar, product-card, etc.)
3. **Build + deploy D107-D113 to canary** — `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` + /sgs-clone verification
4. **XS-4 vocab + regex follow-ups** — extend slot aliases + role regex camelCase variants (target canonical_slot coverage 33.4% → ~50%)
5. **/qc-council retrospective** — multi-rater consistency check across D107-D113 docs

## Files Modified

| Commit | Files | What |
|---|---|---|
| 40a6f8ab | convert.py + button.{render.php,block.json} | XS-9.1 + XS-9.2 + URL hardening |
| 88436693 | announcement-bar/block.json | Mojibake fix |
| 669115f0 | product-card/{block.json,render.php} | Featured variant |
| b3feb9a2 | parking.md | 6 follow-up entries |
| a23ff53f | scripts/build-deploy.py (NEW) | D3 deploy automation (367 LOC) |
| 32c70774 | next-session-prompt.md | D5 STOP #12 + Q6 |
| e2c8597e | 5 files (voter + db_lookup + sgs-update + hero/cta-section block.json) | D1 + XS-2 + XS-5 |
| f173b351→c76aa107 | convert.py | XS-3 walker (REVERTED) |
| 04fa0f2b | assign-canonical.py | XS-4 D99 port + backfill |
| 062c69d1 | scripts/sync-container-wrapping-blocks.py (NEW) | D6 inheritance script (468 LOC) |
| 8eaba520 | 7 docs | D107-D113 consolidated + STOP #13-#16 |
| 52408c7e | assign-canonical.py + db_lookup.py + seed-slot-alias-extensions.py | XS-4 follow-ups |
| aef1767a | 11 docs (Spec 22, specs 00/02/21, pipeline-flow/stages, arch, dev-setup, mistakes, registry, goals) | Comprehensive doc round-1 |
| ca7026b1 | 11 docs (specs 11/19/20, common-wp-styling-errors, 6 plans, qc-council register) | Comprehensive doc round-2 |

## Notes for Next Session

- **XS-3 + D6 deferred per Bean's explicit decision** — both need more architectural thought; don't re-attempt without refined design
- **block_composition table IS LIVE** even after XS-3 walker revert — refined walker just needs to CONSUME the existing data layer; don't redesign the schema
- **Routing-path verification is a now a binding pre-flight question (Q6)** — XS-9.1 redundancy lesson; trace which slug RECEIVES the affected attr before predicting impact
- **Docs appliers can be over-conservative** — first applier this session deferred 51 spec edits incorrectly because XS-3 walker reverted (most architecture WAS live); distinguish "code reverted" from "all related changes deferred"
- **Per-section pixel-diff noise floor ~±2pp** — confirmed across multiple measurements; deltas within ±2pp at single-viewport are not significant

## Next Session Prompt

See `.claude/next-session-prompt.md` for the full orchestration plan (5 tasks with per-task orchestration blocks + dependency graph + methodology guardrails + 19 STOP catalogue entries + 7 pre-flight ritual questions + 6 tiered mandatory reading lists).

---

# Session Handoff — 2026-05-29

## TL;DR

Massive architectural cleanup batch shipped. 8 D-numbered decisions (D93-D100), 10 subagents, 99 files changed in one commit (bcbafe09 on origin/main). Highlights: slot_synonyms + legacy_role_lookup unified into a single `slots` table; new `roles` table FIXES the link-href content-bearing gap (sgs/media.videoUrl was returning None from equivalent_block_for, now returns sgs/media); sgs/svg-background merged into container; sgs/certification-bar merged into trust-badges with auto-scroll; sgs/media extended to handle video; container ship-blockers landed (grid-item defaults + advanced grid controls); /sgs-update gained Stage 1 UPDATE-on-drift + Stage 10 v3 (aggressive default + attr-level orphan detection + retired-blocks cleanup); 51 render.php WP_Block PHPDoc fixes; mojibake fix. **A5 canary measurement deferred to next session** — too late at session end + risk of integration issues from all the new code.

## Completed this session

1. **D93 — sgs/svg-background → sgs/container merge** (Subagent 1). 7 new bgSvg* attrs + animation keyframes + deprecated.js v2 cross-block migration. Source + build dirs deleted. DB cleaned.
2. **D94 — /sgs-update Stage 1 UPDATE-on-drift + Stage 10 v2** (Subagents 3 + A). Stage 1 now UPDATEs existing rows when block.json drifts (6 stale blocks refreshed incl. sgs/heading description); Stage 10 v2 aggressive default + attr-level orphan detection purged 205 attr ghosts + 26 stale supports.
3. **D95 — sgs/certification-bar → sgs/trust-badges merge + auto-scroll** (Subagent B). badgeStyle variants (icon-circle/text-only/image-badge) + view.js conditional overflow marquee + deprecated.js v2.
4. **D96 — block_capabilities wired into walker via FR-22-15 capability-aware BEM tiebreaker** (Subagent C). Fixes `sgs-testimonial-slider sgs-container` was resolving alphabetical to sgs/container; now resolves correctly to sgs/testimonial-slider. populate-db.py CAPABILITY_RULES seed propagation bug fixed (INSERT OR IGNORE → INSERT OR REPLACE).
5. **D97 — sgs/media extended from image-only to unified image/video** (Subagent D). 12 new video attrs (mediaType, videoUrl, videoSource, videoId, etc.); render.php branches; YouTube/Vimeo iframe + native video for MP4/internal WP library; deprecated.js v1 backwards-compat.
6. **D98 — sgs/container ship-blockers** (5 capability extensions). SB-1 grid-item defaults + providesContext; SB-2 editor preview honours gridTemplateColumns string; QB-1 gridTemplateRows/gridAutoRows/justifyItems/alignContent; QB-2 gridTemplateColumns inspector control; QB-3 templateMode allowedBlocks guidance. 13 new attrs + deprecated.js v3.
7. **D99 — slot_synonyms + legacy_role_lookup UNIFIED into new slots table** (Subagent E — the biggest refactor). 89 element + 16 section = 105 rows; composite PK on (slot_name, scope). NEW roles table (20 rows) replaces slot_synonyms.role_classification — FIXES THE LINK-HREF BUG. INSERT OR REPLACE on html_tag_to_core_block seed. property_suffixes.kind_override column replaces _KIND_BY_SUFFIX hardcoded dict. 6 dead slot_synonyms columns dropped.
8. **D100 — Stage 10 v3 + phpunit intelephense stub** (Subagent F). Stage 10 v3 deletes retired blocks from `blocks` table (4 ghosts purged: back-to-top, data-display, icon-block, reading-progress); is_stale column added to blocks. `phpunit` added to intelephense.stubs (clears PHPUnit\Framework\TestCase warnings on test files).
9. **51 render.php WP_Block PHPDoc fixes** (inline). Bare `WP_Block` → `\WP_Block` across all src/blocks/*/render.php — clears intelephense P1133 warnings.
10. **container/block.json mojibake fix** + **generate-block-reference.py updated** (queries slots table now) + **MEMORY.md mirror-DB lesson correction** (feedback_dbs_are_junction_not_mirror.md: .claude and .agents share inode via NTFS junction = same physical file).
11. **/sgs-update full sweep ran live** — all 10 stages green (Stage 1: 28 new attrs + 5 updated; Stages 2-10 clean).
12. **populate-db.py refresh ran** — 66 blocks, 299 records, capabilities seed propagated.
13. **A2 (Stream A) — price slot UPDATE applied** — `slots WHERE slot_name='price' AND scope='element'`: standalone_block sgs/pricing-table → sgs/text (price content is text, not whole pricing table).
14. **Commit bcbafe09 pushed to origin/main** with --no-verify per Bean explicit approval (visual diff gate would have required 50+ block screenshots — changes are additive with backwards-compat preserved via deprecated.js).

## Current state

- **Branch:** `main` at `bcbafe09` (pushed to origin)
- **Tests:** 5/5 equivalent_block_for + FR-22-15 tiebreaker PASS. Pre-existing 3 hero CTA test failures in test_phase_3_inner_blocks.py confirmed via git stash baseline (not introduced by this batch).
- **Build:** `npm run build` clean (webpack 5.105.2, both passes)
- **DB state:** slots table 105 rows (89 element + 16 section); roles table 20 rows (5 content-bearing + 15 styling-behaviour); property_suffixes.kind_override populated 17 rows; old slot_synonyms + legacy_role_lookup tables DROPPED.
- **Link-href bug:** CLOSED at the gate (roles table returns all 5 content-bearing roles); user-visible video routing depends on canonical_slot backfill (see Known Issues #2).
- **Working tree:** clean (everything committed + pushed).

## Known Issues / Blockers

1. **/sgs-clone canary measurement NOT YET RUN** — pixel-diff comparison vs the post-Fix-1 baseline (58.6%) is the empirical gate for this session's architectural work. Deferred to next session.
2. **sgs/media.videoUrl canonical_slot is NULL after /sgs-update** — Subagent D added the 12 new video attrs to block.json; /sgs-update Stage 1 inserted them into block_attributes but without canonical_slot/role/derived_selector populated. Means equivalent_block_for('sgs/media','videoUrl') returns None despite the gate being fixed. Needs assign-canonical.py to backfill OR manual UPDATE setting canonical_slot='media' + role='link-href' on that row.
3. **seed-slot-synonyms.py likely stale** — Subagent E migrated slot_synonyms rows into the new slots table via direct INSERT, but the seed-slot-synonyms.py script at `plugins/sgs-blocks/scripts/uimax-tools/` was not updated to write to the slots table. Next time someone needs to add a slot row, the script will either fail (slot_synonyms doesn't exist) or write to a phantom location. Needs porting to slots-table architecture OR retirement + replacement with a new seed-slots.py.
4. **Section-root row routing for Mamas-mockup-classes** — RESOLVED 2026-05-30 D107 + D111. XS-2 retired the voter literal-slug-match short-circuit and replaced it with a DB-driven `blocks.tier` lookup; XS-5 deleted the 12 wrong/dead section-scope rows in `slots` (`featured-product`, `social-proof`, `gift-section`, `ingredients-section`, `ingredients`, `brand-story`, header/footer chrome rows) and re-inserted testimonial + testimonial-slider at element scope. Featured-product now routes via XS-2 gap-candidate path → FR-22-4 container default (no slot row needed). slots table now 95 rows (89 element + 6 section).
5. **Pre-existing 3 hero CTA test failures** in test_phase_3_inner_blocks.py — confirmed pre-existing via git stash baseline. Not caused by this session. Worth fixing but out of scope.
6. **Items slot aliases over-broad** — `items` (element scope) standalone_block=sgs/info-box, aliases include `arrow, arrows, badges, dot, dots, features, filter, filters, list, menu, nav, option, set, social, social-link, thumbs` — many of these aren't info-box content (navigation, dots/arrows are different primitives). Section-root trap risk. Audit + split next session.
7. **44 pre-existing stale block_supports rows** — Stage 10 v2 aggressive mode (now default) should clean these on next /sgs-update run. Verify post-clean count.
8. **block_capabilities wire-in is the tiebreaker only** — FR-22-15 currently uses it ONLY for resolving multi-class BEM ambiguity. Bean had mentioned wiring it into allowedBlocks derivation longer-term; that's a follow-on task (qc-council register line 476).

## Next priorities (in order)

1. **Run /sgs-clone canary measurement** on Mama's Munches homepage page 144 — empirical gate for this session's architectural work. Compare to post-Fix-1 baseline of 58.6% mean pixel-diff. Expected: drop substantially because (a) walker now correctly routes link-href content via roles table, (b) sgs/container has grid-item defaults + better grid controls, (c) trust-bar uses correct trust-badges block, (d) capability-aware tiebreaker resolves the multi-class BEM cases correctly.
2. **Backfill sgs/media.videoUrl canonical_slot** (Known Issue #2) — either via assign-canonical.py dry-run + Bean approval, or direct UPDATE setting canonical_slot='media' + role='link-href'. Without this, the link-href bug fix isn't user-visible for video URLs.
3. **Port seed-slot-synonyms.py to slots-table architecture** OR retire + replace with seed-slots.py (Known Issue #3). Needed before any future slot row additions.
4. **Apply remaining Stream A row corrections** — based on /sgs-clone measurement results, decide which of these to fix:
   - `items` slot (Known Issue #6) — split over-broad aliases
   - `social` slot — element scope, may be fine
   - Section-root rows (Known Issue #4) — `featured-product`, `social-proof`, `gift-section` etc. routing
5. **Run /qc-council across the D99 architectural changes** post-canary-measurement — multi-rater review of the slots/roles refactor. Was skipped at commit-time due to scope; worth doing retroactively if measurement surfaces issues.
6. **Address pre-existing hero CTA test failures** (Known Issue #5) — unrelated to this session but should be fixed.

## Files modified

| File path | What changed | Commit |
|---|---|---|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | Subagent E: helpers query slots/roles tables; _migrate_roles_table; _migrate_property_suffixes_kind_override; INSERT OR REPLACE for html_tag; _content_bearing_roles/_styling_behaviour_roles query roles table | bcbafe09 |
| `plugins/sgs-blocks/scripts/sgs-update-v2.py` | Subagent 3 + A: Stage 1 UPDATE-on-drift, Stage 10 v2 (attr orphan detection + aggressive default). Subagent F: Stage 10 v3 (retired blocks deletion + is_stale column). | bcbafe09 |
| `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py` | Subagent E: queries slots WHERE scope='section' instead of legacy_role_lookup | bcbafe09 |
| `plugins/sgs-blocks/scripts/generate-block-reference.py` | Updated query to use slots table (was referencing dropped slot_synonyms) | bcbafe09 |
| `plugins/sgs-blocks/src/blocks/container/*` | Subagent 1 (svg merge) + Subagent D98 (ship-blockers) — 20 bgSvg* + gridItem* + advanced grid + templateMode attrs total, deprecated.js v2 + v3 | bcbafe09 |
| `plugins/sgs-blocks/src/blocks/media/*` | Subagent D — 12 video attrs, render.php image/video branching, deprecated.js v1 | bcbafe09 |
| `plugins/sgs-blocks/src/blocks/trust-badges/*` | Subagent B — badgeStyle variants + auto-scroll view.js + deprecated.js v2 (cross-block from cert-bar) | bcbafe09 |
| `plugins/sgs-blocks/src/blocks/svg-background/` | DELETED (entire dir) | bcbafe09 |
| `plugins/sgs-blocks/src/blocks/certification-bar/` | DELETED (entire dir) | bcbafe09 |
| 51 × `plugins/sgs-blocks/src/blocks/*/render.php` | WP_Block → \WP_Block PHPDoc fix | bcbafe09 |
| `C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/populate-db.py` | Subagent C: INSERT OR REPLACE for CAPABILITY_RULES + pre-pass DELETE for orphaned tags | bcbafe09 |
| `.vscode/settings.json` | Subagent F: `"phpunit"` added to intelephense.stubs | bcbafe09 |
| `.claude/decisions.md` | D93-D100 prepended | bcbafe09 |
| `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` | FR-22-15 (Subagent C); §FR-22-2.2 amended for roles table (Subagent E); §4 data layer updated | bcbafe09 |
| `.claude/specs/02-SGS-BLOCKS.md` | svg-background + cert-bar retirement notices | bcbafe09 |
| `plugins/sgs-blocks/CLAUDE.md` | block status table updates | bcbafe09 |
| `.claude/parking.md` | P-SVG-BACKGROUND-MIGRATION-VALIDATION + P-TRUST-BADGES-MERGE-VALIDATION + P-MEDIA-VIDEO-VALIDATION added | bcbafe09 |
| `C:/Users/Bean/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_dbs_are_junction_not_mirror.md` | NEW — mirror-DB lesson correction | (memory dir, not git-tracked) |

## Notes for Next Session

- **The link-href bug closure is partially user-visible** — gate is fixed (roles table includes link-href) but sgs/media.videoUrl needs canonical_slot backfill before video URLs actually route as child blocks. Highest-priority Known Issue.
- **/sgs-update Stage 7 (spec_doc_regen) was broken by D99 and fixed inline** — generate-block-reference.py was still querying dropped slot_synonyms; updated to query slots table. Pattern: when refactoring DB tables, grep for ALL consumers, not just the obvious ones.
- **Hard-link discovery changes how we think about "both DBs"** — .claude and .agents share one physical file via NTFS junction. The REAL two DBs are sgs-framework + ui-ux-pro-max (different physical files). Cross-skill bridge is /sgs-update Stage 8.
- **seed-slot-synonyms.py needs porting OR retirement** — currently broken (references dropped slot_synonyms table). Either rewrite as seed-slots.py with the new schema, OR replace with a curated migration script that handles slot_name+scope composite key.
- **All deprecated.js cross-block migrations need live-deploy validation** — svg-background, certification-bar, media (image-only → image/video) all have deprecated.js entries that haven't been tested against real WP posts yet. Parking entries filed.
- **--no-verify was used for this commit** — Bean explicitly approved given changes are additive + backwards-compat preserved. Next commits should respect the visual diff gate normally.

## Next Session Prompt

See `.claude/next-session-prompt.md` for the full orchestration plan.
