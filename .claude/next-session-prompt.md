---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-21-mobile-responsive-attr-flow-and-promotion-driven-r2-closure
generated: 2026-05-20
prior_session: small-giants-wp-2026-05-20-phase-1-spec16-rewrite-plus-phase-2-future-capabilities
primary_goal: "Fix the F5 mobile-responsive-attr flow that causes hero 375 + social-proof 768 regressions, then drive the first operator-driven attribute-gap promotion run to start closing the dead-CSS-selector problem (council R2). End-state: pixel-diff target on 1440 average ≤ 10%, 375 average ≤ 15%."
---

# F5 mobile-responsive-attr flow + first attribute-promotion run + P1.B.x follow-ups

Last session shipped 11 commits implementing Spec 16 §FR6 architectural rewrite (Phase 1) plus four future capabilities (Phase 2). Pipeline is structurally sound. Pixel-diff isn't yet at target because (a) F5 D1 media-field flow is incomplete — base values render at all viewports causing mobile regressions, and (b) the dead-CSS-selector problem (council R2) is unaddressed pending operator-driven attribute promotion.

Invoke `/autopilot` before doing anything else.

## Skills to Invoke

| Skill | When |
|-------|------|
| `/autopilot` | FIRST — establishes live skill routing + ADHD support |
| `/systematic-debugging` | F5 investigation: hypothesis → evidence → minimal repro → fix |
| `/sgs-wp-engine` | Block-development context for any block.json mutations |
| `/wp-blocks` | Schema queries for `block_attributes` table (responsive variant attrs) |
| `/library-docs` | If WP responsive-attr conventions need a reference |
| `/qc` | Multi-rater panel BEFORE every commit (binding rule blub.db row 255) |
| `/qc-inline` | Self-check during implementation |
| `/handoff` | At session close |

## Tools

| Tool | What for |
|------|----------|
| `mcp__plugin_playwright_playwright__browser_*` | Visual eyes-on for the mobile hero regression |
| `scripts/pixel-diff.py --selector .sgs-{section}` | Per-section cropped pixel-diff (binding rule blub.db row 256) |
| `python ~/.claude/hooks/wp-blocks.py dump` | Schema enumeration (binding rule #4) |
| `python plugins/sgs-blocks/scripts/orchestrator/stage_attribute_promotion.py list --top 10` | Surface high-confidence promotion candidates |
| `python plugins/sgs-blocks/scripts/orchestrator/stage_attribute_promotion.py promote --id <row_id>` | Execute a promotion (manual confirmation gate) |
| `python reports/2026-05-20-pipeline-root-gap-council/run-pixel-diff-matrix.py` | 21-cell pixel-diff measurement |

## Task 1 — F5 mobile-responsive-attr flow fix

**Symptom:** hero 375 regressed +13.3pt + social-proof 768 +5.1pt after P1.B.x. The P1.B.x F5 fix preserved the `media` field in D1 assignments but the reader at `convert.py:_load_d1_assignments` only merges base values (`media=None`). Responsive variants from `@media (min-width: ...)` rules are stored in the sidecar but never applied to the block's responsive-variant attrs (e.g. `headlineFontSizeMobile` vs `headlineFontSize`).

**Investigation steps (per `/systematic-debugging` Phase 1):**
1. Read `pipeline-state/<latest-run>/css-d1-assignments.json` — find D1 entries with non-null `media` field.
2. Find a hero block attr that has a responsive variant in `plugins/sgs-blocks/src/blocks/hero/block.json` (e.g. `headlineFontSize` + `headlineFontSizeMobile` + `headlineFontSizeTablet`).
3. Check `convert.py:_load_d1_assignments` — what does it do with non-null `media` entries today? (Should be: skip entirely per F5.)
4. The fix: when `media: "@media (max-width: 767px)"` matches the mobile breakpoint, route the value to the `<attr>Mobile` variant. When `media: "@media (min-width: 1024px)"` → `<attr>Desktop`. When base (`media=None`) → `<attr>`.

**Fix shape (~60-100 LOC):**
- Map media-condition strings to breakpoint slugs (`mobile` / `tablet` / `desktop`) per the SGS breakpoint convention (375 / 768 / 1440).
- For each non-base D1 assignment, derive the responsive-variant attr name (e.g. `headlineFontSize` + `Mobile` = `headlineFontSizeMobile`).
- Query block.json to confirm the responsive variant attr exists; if yes, set it. If no, fall back to gap candidate.
- Write tests covering the mobile / tablet / desktop variants.

**Acceptance:**
- Hero 375 mobile drops back to ≤ post-C baseline (73.2%, down from current 86.5%).
- Social-proof 768 drops back to ≤ post-C baseline (74.6%, down from current 79.7%).
- Final 21-cell pixel-diff matrix: 1440 average ≤ 10%, 375 average ≤ 15%.

## Task 2 — First operator-driven attribute promotion run

**Goal:** Start closing council R2 (dead-CSS-selector problem). 1128 rows in `attribute_gap_candidates`; promote 3-5 high-frequency candidates as a proof-of-loop.

**Steps:**
1. `python plugins/sgs-blocks/scripts/orchestrator/stage_attribute_promotion.py list --top 10` — review ranked candidates.
2. Pick 3-5 with highest `seen_count × confidence` AND clear semantic mapping (e.g. `sgs/trust-bar.padding.right: 20px`).
3. For each: `python ... promote --id <row_id>`, type `"promote"` at the confirmation gate, observe block.json + render.php mutation.
4. `cd plugins/sgs-blocks && npm run build` after each batch.
5. Re-run pipeline + measure pixel-diff. Expected: D1 lift rate climbs above 37%; gap candidates drop; some pixel-diff cells improve incrementally.

## Task 3 — P1.B.x follow-ups (minor, low priority)

Two follow-up tickets from the P1.B.x /qc panel:
1. **Comma-grouped @media inner selectors** — `@media (min-width: 768px) { .sgs-hero, .sgs-cta { ... } }` only scopes `.sgs-hero`; `.sgs-cta` is left unscoped. Fix the `_scope_media_rule()` helper to split on comma and scope each part.
2. **Nested @supports inside @media** — produces invalid CSS today. Either recurse the scope-injection OR pass through unchanged. Both low-frequency in real mockups.

Both ~20-30 LOC each in `css_router.py`. Include test cases in `test_css_router.py`.

## Task 4 — Capture session lessons to blub.db (5 patterns)

| Pattern key | Why |
|---|---|
| `token-snap-strict-exact-match-not-nearest` | Bean's step 3 binding — only snap when literal value matches token value |
| `css-router-media-scope-prefix-required` | Without scoping @media inner selectors, base specificity wins → responsive overrides silently die |
| `pipeline-extension-routes-to-output-d2-not-csv` | Dedup at write time prevents per-property routing from inflating CSS file |
| `header-footer-recurrence-blocked-via-defence-in-depth` | Both tool-layer hook (P2.0) + source-layer chrome-skip (P2.i) needed |
| `qc-panel-finds-real-bugs-multi-rater-wins` | Council format with rater diversity catches issues a single-Sonnet review misses |

POST each to `http://localhost:5050/api/corrections` with the standard payload shape (pattern_key, category, priority, body).

## Methodology guardrails (binding rules)

- **Multi-rater /qc panel before every commit** touching converter/pipeline/SGS block logic (blub.db row 255).
- **Per-section cropped pixel-diff** is closure unit, never full-page (blub.db row 256).
- **Schema enumeration via `wp-blocks.py dump`** before any "missing X" claim (blub.db row 272).
- **Header/footer/nav are template parts, not blocks** (blub.db row 274). P2.0 + P2.i defence-in-depth ships.
- **Read `leftover-buckets.json` before any pixel-diff conjecture** (blub.db row 254).
- **Universal-extraction-no-per-block-legacy** — fix universal primitives, never per-section patches.
- **No `git stash` / reset / checkout--/ restore / clean** in subagents.
- **No `Co-Authored-By:` lines** in commits.
- **Always merge to main** when committing (squash + delete branch + checkout main + pull).

## Acceptance criteria (whole session)

- Hero 375 + social-proof 768 regressions resolved (pixel-diff back to ≤ post-C baseline).
- ≥ 3 attribute promotions executed via the P2.ii CLI.
- Final 21-cell pixel-diff matrix: 1440 average ≤ 10%, 375 average ≤ 15%.
- 2 P1.B.x follow-ups landed.
- 5 session lessons captured to blub.db.
- `/handoff` at close.

## Key files to read at session start

- `.claude/handoff.md` — last session's full digest
- `.claude/state.md` — current phase + blockers
- `.claude/plans/phase-1-spec16-rewrite-2026-05-20.md` — predecessor plan (now archived in scope but useful for context)
- `reports/2026-05-20-pipeline-root-gap-council/p1b-investigation-rater-*.md` — the 4 council reports (F5 root cause documented)
- `reports/2026-05-20-pipeline-root-gap-council/pixel-diff-matrix.csv` — final state baseline
- `plugins/sgs-blocks/scripts/orchestrator/convert.py:_load_d1_assignments` — F5 reader site
- `plugins/sgs-blocks/scripts/orchestrator/css_router.py:_scope_media_rule` — P1.B.x follow-up site
