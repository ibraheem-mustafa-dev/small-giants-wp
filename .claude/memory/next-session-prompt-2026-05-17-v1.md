---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-18-phase-9-universal-applicability
recommended_model: opus
generated: 2026-05-17
---

You are a senior SGS Framework architect opening Spec 16 Phase 9 — **universal applicability**. The 2026-05-17 session shipped 10 commits closing 7 distinct recognition + conversion flaws on the Mama's Munches canary (176 → 243 extracted attrs, +38%). The architectural foundation is now in place and DB-driven. **This session must prove the architecture is portable, not Mama's-specific, and that we're using the full breadth of DB tables and orchestration tools.**

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-18-phase-9-universal-applicability"`

## ALWAYS-LOAD invocations (in this order, before anything else)

1. `/autopilot` — first action, session-start dispatcher + ADHD support
2. Read `.claude/handoff.md` — yesterday's 10-commit summary
3. Read `.claude/state.md` — phase frontmatter + current_subphase_step
4. Read `.claude/parking.md` — open backlog incl. 5 QC-panel follow-ups (P-PHASE9-5/6/7/8/9)
5. Read **the 3 binding methodology rules** in `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md`:
   - Read leftover-buckets BEFORE conjecturing (blub.db row 254)
   - Multi-rater /qc panel BEFORE every commit (row 255)
   - Per-section cropped pixel diff (row 256)
6. Read **the 2 new captured rules** (also embedded as HARD-GATEs in `/sgs-clone` SKILL.md):
   - DB-first lookups, no hardcoded dicts when a table exists (row 260, Rule 11)
   - Default to full pipeline; don't skip Playwright (row 261, scope-corrected for cv2, Rule 12)

## Mandatory full-tool-and-data utilisation

Bean's directive verbatim: **make real progress on the pipeline producing universally applicable results, utilising all our data and tools.** Every action this session must check: am I using the canonical data source? Am I using the right tool?

| Source | Use it for | Don't substitute with |
|---|---|---|
| `sgs-framework.db` via `db_lookup.py` | All recognition + extraction vocabulary lookups | Hardcoded Python dicts (Rule 11) |
| `block_supports` table (370 rows) | WP native style.* attr emission per block | Per-block if-statements |
| `block_attributes` table (1406 rows) | Block schema + canonical_slot + role | Reading block.json at runtime |
| `property_suffixes` table (117 rows) | CSS-prop ↔ SGS-attr-suffix mapping | The old `_CSS_PROP_TO_SUFFIX` list |
| `modifier_suffixes` table (19 rows, kind='breakpoint') | Mobile/Tablet/Desktop suffix vocabulary | The old `_BREAKPOINT_SUFFIXES` list |
| `slot_synonyms` table | Canonical slot routing + aliases + standalone_block | LEGACY_ROLE_LOOKUP hardcoded dict |
| `block_compositions` table | Pattern composition structure | Reading pattern PHP files at runtime |
| `block_selectors` table | Per-block selector mapping | grep on class names |
| uimax `ui-ux-pro-max.db` (5,598 rows) | Design intelligence (palettes, fonts, UX rules) | Asking the LLM |
| `pipeline-state/<run>/leftover-buckets.json` | Gap analysis per (section, slot, reason) | Conjecture on extraction quality |

| Tool | When |
|---|---|
| `/sgs-db block <slug>` | Inspect any block's schema + supports + attrs |
| `/sgs-db match <keyword>` | Find best block for a section role |
| `/sgs-db context <client>` | Load client-specific context (style, mockups, brand) |
| `/uimax query <topic>` | Design intelligence on patterns, palettes, components |
| `/library-docs "<query>"` | WordPress supports/style API + block.json + Interactivity API |
| `/qc` | Multi-rater panel (Sonnet + Haiku + Gemini Flash + Cerebras) — BEFORE every commit per binding rule #2 |
| `/qc-inline` | Lightweight self-check during implementation |
| `/dispatching-parallel-agents` | When 2+ implementation streams can run independently — use `isolation: worktree` to avoid file collisions |
| `/visual-qa` | SGS-pipeline visual QA — multi-frame + parity validator + Superdesign |
| `/playwright` | Multi-viewport capture, computed-style inspection |
| `python scripts/pixel-diff.py --selector .sgs-<section>` | Per-section cropped diff (binding rule #3) |
| `/search` | When a recognition gap pattern matches an existing captured rule or research note |
| `/delegate` | Choose model for any subagent dispatch — Cerebras/Flash for zero-cost, Sonnet for quality |

## Priority order — UNIVERSAL APPLICABILITY uplift

### Priority 1 — Cross-mockup validation (~45-60 min)

**Goal:** Prove Phase 9's recognition + conversion architecture works beyond Mama's homepage. Surface client-specific patterns that the Mama's homepage never exposed.

Available mockups (inventory done 2026-05-17):
- `sites/mamas-munches/mockups/homepage/index.html` — current canary, fully migrated to canonical SGS-BEM
- `sites/mamas-munches/mockups/homepage-archive-2026-05-10/index.html` — older homepage shape; will expose pre-migration recognition gaps
- `sites/mamas-munches/mockups/product/index.html` — DIFFERENT PAGE SHAPE — second real-world test
- 7 style-variation JSONs in `theme/sgs-theme/styles/` (no mockups yet for: indus-foods, helping-doctors, healthcare, construction, professional, mosque, eye-care)

**Actions, in order:**

1. **Run cv2 on Mama's PRODUCT page** (`sites/mamas-munches/mockups/product/index.html`) — different shape, different blocks. Verify the 10-commit improvements port. ~10 min.
2. **Run cv2 on Mama's homepage-archive-2026-05-10** — older mockup, may use pre-canonical class names. Tests legacy-fallback paths. ~10 min.
3. **Generate a synthetic "all-blocks-all-supports" stress mockup** — programmatic recognition coverage test. Exercises every row in `property_suffixes` × every block in `block_supports`. Catches lifter gaps that real mockups don't exercise. ~30 min to author + run.

For each run report:
- Total attrs extracted vs expected (use `block_attributes` count as ceiling)
- Leftover-bucket counts by section
- Pixel-diff per section at 3 viewports (mandatory per binding rule #3)
- Any new recognition flaws surfaced — categorise by (a) parser, (b) lifter, (c) DB-vocabulary missing row, (d) walker structural

### Priority 2 — Close 5 QC-panel follow-ups (~30-45 min total)

All identified by the 4-rater /qc panel that ran on the 10 commits 2026-05-17. Non-blocking but harden robustness:

1. **P-PHASE9-5** — Empty-DB defensive assertion in `db_lookup.css_property_suffixes()`. Fail-fast with `RuntimeError` naming the DB path + `/sgs-update` recovery command. ~5 min.
2. **P-PHASE9-6** — `RETIRED_BLOCK_REMAP` future-block guard. Module-load assertion checking `db.registered_block_slugs()` for collisions. ~10 min.
3. **P-PHASE9-7** — Audit existing pattern PHP files for SGS-BEM grouping-wrapper preservation assumptions. ~15 min.
4. **P-PHASE9-8** — Inline thin `_css_prop_to_suffix()` + `_breakpoint_suffixes()` wrappers in convert.py. ~10 lines removed.
5. **P-PHASE9-9** — Rename `_kind_for` → `_value_kind_for_suffix` in db_lookup.py. ~3 min.

Bundle as one cleanup commit. Multi-rater /qc panel BEFORE commit (binding rule #2).

### Priority 3 — Bucket-router role classification refresh (~30-45 min)

**Why universal:** 56% of `block_attributes` rows (790/1406) have `role=NULL`. The bucket router's `_CONTENT_BEARING_ROLES` filter lets NULL-role rows through, inflating reported failures across EVERY client. Many entries flagged as "extraction failures" are intentional behaviour-toggle defaults (hoverEffect, showMedia, sgsAnimation, blockLink, staggerDelay).

**Actions:**
1. Run `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats` for current role distribution.
2. Refresh the role-classification pass via `/sgs-update` to backfill NULL roles using `slot_synonyms.role` + property-suffix inference.
3. Re-run pipeline; compare leftover-bucket count before/after. Expect 100+ entries to drop with zero code change.

Universal — affects every client run, not just Mama's.

### Priority 4 — Trust-bar schema/render mismatch decision (~15 min discussion + variable execution)

**Why universal:** Trust-bar at 99.7% pixel diff across all 3 viewports — block schema is stat-counter shape; Mama's mockup uses trust-badges (icon + text). Bean's deferred decision from 2026-05-16. Three paths:

- **A** — Extend trust-bar schema with `variant` enum (stat-counter vs trust-badge) + render branches. Cheapest. Single block, two shapes.
- **B** — Migrate Mama's mockup to stat-counter shape. Lossy — rewrites mockup intent.
- **C** — Split into two blocks: `sgs/trust-bar` (stat counters) + `sgs/trust-badges` (icon strip). Universal-by-construction. Different blocks for different intents.

Path C is canonical-SGS-thinking but adds a block (Phase 2 of the build queue). Path A is fastest. Use `/brainstorming design` to decide; `/dispatching-parallel-agents` to implement.

### Priority 5 — Per-instance lift fidelity for info-box children (~1-2 hours, P-PHASE9-3)

**Why universal:** Every client mockup with feature-grid / card-grid / info-box children will hit the same gap. Ingredients (30.8%) + gift (variable) pixel diffs are bottlenecked on info-box children — emoji/icon + heading + description per item lift incompletely. The universal BEM-child array lifter handles top-level items; doesn't recurse into per-item styling.

**Action:** Profile a single info-box from Mama's mockup → expected attrs vs lifted attrs. Generalise the lift in convert.py to recurse into named child slots with role='text-content' or 'image-object'. Multi-rater /qc panel BEFORE commit.

## Methodology rules (BINDING — re-state)

- READ `pipeline-state/<run>/leftover-buckets.json` BEFORE ANY converter conjecture (binding rule #1, blub.db row 254)
- Multi-rater /qc panel BEFORE every commit touching converter/pipeline/block logic (binding rule #2, row 255)
- Per-section cropped pixel diff via `--selector .sgs-{section}` (binding rule #3, row 256)
- DB-first lookups — check `.claude/db-tables-map.md` BEFORE adding any hardcoded dict (row 260, Rule 11 HARD-GATE)
- Don't skip Playwright when measuring lift fidelity on legacy path (row 261, Rule 12 HARD-GATE)
- UNIVERSAL solutions only — never section-specific class names hardcoded
- NEVER `return ob_get_clean()` / `return sprintf()` in render.php — use `printf`/`echo`/interleaved PHP
- NEVER set `"source": "html"` on dynamic block attrs (CLAUDE.md gotcha #3)
- Default time estimates LOW (see `~/.claude/rules/time-estimates.md`)

## Live state on sandybrown

- Post 65 (cv2 output): `/2026/05/15/spec16-p7-converter-v2-output-2026-05-15/`
- Post 66 (mockup baseline): `/2026/05/15/spec16-p7-mockup-baseline-2026-05-15/`
- Plugin + theme + mamas-munches.css all deployed 2026-05-17
- OPcache reset on 2026-05-17 ~09:48

## Credentials

`.claude/secrets/credentials.yml` (gitignored). Sandybrown WP REST creds at `.claude/secrets/sandybrown.env`. SSH alias `hd` (Hostinger).

## Subprojects

- `sites/mamas-munches/.claude/` — canary, full migration to canonical SGS-BEM complete
- `sites/indus-foods/.claude/` — Phase 4 brand work; no SGS mockups yet (style variation only)
- 6 other style variations (helping-doctors, healthcare, construction, professional, mosque, eye-care) — JSON only

## Definition of done for next session

Real universal-applicability progress means:
- Phase 9 architecture validated on 2+ mockups (1 real + 1 synthetic, OR 2 real)
- 5 QC follow-ups closed in one cleanup commit
- Bucket-router role refresh shipped (expecting 100+ leftover entries drop, zero code change)
- Trust-bar schema decision MADE (logged in decisions.md), implementation begun
- At least one new universal recognition flaw surfaced + fixed via a DB-driven (not hardcoded) approach
- All work behind binding-rule-2 multi-rater /qc panels

If any priority cannot complete in-session, run `/handoff` with explicit per-priority status. No quiet defers.

## Tooling reference (re-state)

| Skill | When |
|---|---|
| `/autopilot` | session start |
| `/systematic-debugging` | any "why doesn't this work" — read leftover-buckets in Phase 1 |
| `/brainstorming` | trust-bar schema decision (Priority 4) |
| `/qc` | multi-rater panel BEFORE every commit |
| `/qc-inline` | self-check during implementation |
| `/dispatching-parallel-agents` | when 2+ blocks need parallel work (worktree isolation) |
| `/handoff` | session close — regen handoff + state + next-session-prompt |
| `/sgs-update` | refresh DB + sgs-blocks-reference + uimax sync (Priority 3) |
| `/lifecycle` | when editing skills / agents / SKILL.md HARD-GATEs |

| Script | Purpose |
|---|---|
| `python scripts/pixel-diff.py --selector .sgs-X` | Per-section cropped diff |
| `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --converter-v2 ...` | Pipeline entry |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block sgs/X` | Inspect block schema |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats` | DB-wide role/coverage stats |
