---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-30-A5-canary-measurement-plus-cleanups
generated: 2026-05-29
parent_session: small-giants-wp-2026-05-29-architectural-cleanup-batch-D93-D100
primary_goal: "Run /sgs-clone canary measurement on Mama's Munches page 144 to validate D93-D100 architectural batch + backfill sgs/media.videoUrl canonical_slot + port seed-slot-synonyms.py to slots-table architecture + apply remaining row corrections based on measurement results."
---

# Next Session — A5 Canary Measurement + Stream A Cleanups

> ## ⚠ READ THIS BEFORE ANYTHING ELSE ⚠
>
> Last session (2026-05-29 D93-D100 batch) hit the pattern where I ONLY GREP-SKIMMED Spec 22 instead of reading it end-to-end — missed `equivalent_block_for()` cornerstone in §FR-22-2 entirely, proposed adding a "parent_block_required" feature when the mechanism was already in `block_attributes.attr_type='array'` per §FR-22-2.5. Bean caught this. The structural defences below are operational guards, not advisory notes. Read them; quote them back to yourself before any action.
>
> **Captured lesson:** `feedback_lessons_must_be_operationally_surfaced_not_just_archived.md` — captured lessons that aren't operationally surfaced at session start get violated again. Per-session anti-pattern STOP catalogue + pre-flight self-attestation ritual at the TOP of every next-session-prompt is the structural defence.

## Architectural primitive — quote this verbatim before any fix-shape proposal

Per Spec 22 §0 (canonical, plain English): **"Read each div's BEM class, look up which SGS block it equates to in the database, emit that block, recurse into its children. Three precisely-enumerated exceptions are permitted (atomic-tag swap, top-level chrome skip, top-level container wrap — see FR-22-3). No others. Same code for sgs/hero, sgs/product-card, sgs/quote, sgs/text, sgs/media, every BEM-class div in any mockup."**

Per R-22-9 (Bean P1 locked): **"Universal mechanisms, no per-block hyperfocus."**

Per R-22-14 (Bean P1 locked D92): **"FR-22-6 migrations never carry server-side legacy fallback hacks."**

Per blub.db 260 + R-22-1: **"DB-first, no hardcoded dicts."** (Exception per Subagent C/E: convention-ordering lists like `_BREAKPOINT_RULES` + `_CAPABILITY_PRIORITY` are runtime config not data; legitimately stay as Python constants. Static spec facts like `_ROLE_CLASSIFICATION_MAP` belong in proper DB tables — D99.)

## Anti-pattern STOP catalogue — if you find yourself doing X, STOP

| # | If you find yourself proposing | STOP — because |
|---|---|---|
| 1 | Grep-skimming Spec 22 instead of reading sections end-to-end | Last session's #1 failure mode. Spec 22 §FR-22-2 / 2.1 / 2.2 / 2.5 is the cornerstone that defines `equivalent_block_for()`. Missing it = recommending features that already exist. READ FULLY, not grep. |
| 2 | Referencing `slot_synonyms` or `legacy_role_lookup` as live tables | Both DROPPED 2026-05-29 D99. Live equivalent: `slots` table with composite PK `(slot_name, scope)`. 89 element + 16 section = 105 rows. Walker queries `slots WHERE scope='element'`. |
| 3 | Referencing `slot_synonyms.role_classification` column | Retired D99. Live equivalent: `roles` table (20 rows). Walker queries `roles WHERE classification='content-bearing'`. |
| 4 | Treating `.claude/skills/sgs-wp-engine/sgs-framework.db` and `.agents/skills/sgs-wp-engine/sgs-framework.db` as two DBs | They share inode via NTFS junction = SAME PHYSICAL FILE. Prior "mirror-DB divergence" framing was structurally impossible. Real two DBs are sgs-framework.db + ui-ux-pro-max.db (different physical files). See `feedback_dbs_are_junction_not_mirror.md`. |
| 5 | Building a new bespoke SGS block per mockup section (`sgs/gift-section` etc.) | R-22-9 violation. Framework stays ~67 reusable primitives. Mockup-section variation comes via `slots WHERE scope='element'` rows + walker container default (FR-22-4), not new code. |
| 6 | Adding `if (empty($content) && !empty($legacy_attr)) { ...scalar render... }` to a migrated render.php | R-22-14 violation. FR-22-6 hybrid problem is exclusively SGS framework debt. Canonical backwards-compat = full roster migration + WP-CLI batch existing-post migration script. |
| 7 | Batching multiple DB row changes then measuring once | `row-by-row-measurement-gate-per-db-change` lesson. Ship one row + /sgs-clone Stage 11 measurement between each. |
| 8 | Routing a section-root BEM class (e.g. `social-proof`) to a content-block primitive (e.g. `sgs/testimonial-slider`) | `section-root-aliases-target-sgs-container-only` lesson. Section roots → `sgs/container` (or walker's FR-22-4 default). |
| 9 | Proposing a fix shape without reading the relevant Spec section + flow + stages + plan end-to-end | `read-full-spec-before-proposing-architectural-fix-shape` lesson. State the architectural primitive in plain English FIRST. |
| 10 | Acting on a load-bearing claim in a doc/handoff without grep-verifying against the codebase | `grep-verify-handoff-diagnostic-premises` + `grep-verify-spec-claims-finds-drift` lessons. 60s `find`/`grep`/`ls` BEFORE acting. |
| 11 | Using `sgs-db.py sql` for INSERT/UPDATE/DELETE | The wrapper is read-only — DELETE silently no-ops. Use direct `sqlite3` Python calls for writes. (Caught last session via Subagent 1 svg-merge.) |

## Pre-flight self-attestation ritual — answer ALL FIVE inline before any agent dispatch or fix-shape proposal

Before dispatching any subagent OR proposing any fix shape, write these out in your response:

1. **What's the architectural primitive in plain English?** (Quote Spec 22 §0 above or rephrase.)
2. **Which binding rule(s) (R-22-N) govern this fix shape?** Name them explicitly.
3. **Which captured lessons (feedback_*) apply?** List by filename + cite the load-bearing claim.
4. **What's the proposed fix shape, in 1-3 sentences?**
5. **Does it match ANY entry in the Anti-pattern STOP catalogue above?** If yes, the fix shape is wrong; re-anchor on the primitive.

Skipping this ritual is what caused 5+ prior sessions of repeat-failure (per the meta-lesson `feedback_lessons_must_be_operationally_surfaced_not_just_archived`).

---

## TL;DR

Last session shipped 8 D-numbered decisions in one massive architectural batch (commit `bcbafe09` on origin/main, then `e2df4eca` handoff, `70cb18cd` doc refresh, `4f06f3c1` QC fixes): slots/roles tables unified, link-href bug closed at gate, svg+cert+media+container all extended, /sgs-update gained Stage 1 UPDATE-on-drift + Stage 10 v3 aggressive prune. **A5 (the /sgs-clone canary pixel-diff measurement) was deferred** because it was too late at session-end + risk of integration issues from all the new code. This session validates the work empirically + closes 3 remaining cleanups.

## MANDATORY reading (READ FULLY, not grep — last session's failure mode)

**Tier 1 — session context (read first):**

1. This file (you are reading it)
2. `.claude/handoff.md` — full last-session context with Known Issues list (Known Issues #1-#8)
3. `.claude/state.md` — current_phase + db_state_post_d99 block + blockers list
4. `.claude/decisions.md` D93-D100 entries at top of file — **read EACH ENTRY end-to-end, not just the D# headers.** D99 in particular contains the full slots/roles migration narrative.

**Tier 2 — Spec 22 sections (READ FULLY; grep-skimming is the failure mode from last session):**

5. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` — read §0 (Purpose) + §2 (Architecture diagram) end-to-end. THEN read §FR-22-2 through §FR-22-2.5 END-TO-END (these define `equivalent_block_for()` — the cornerstone). THEN read §FR-22-15 (capability tiebreaker, D96). THEN read §4 (Data layer — post-D99 table inventory). THEN read §6 (Binding rules R-22-1 through R-22-14). DO NOT just grep keywords.
6. `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` — read END-TO-END. Mandatory before conjecturing about any pipeline output gap. Last session never opened this.

**Tier 3 — pipeline reference docs (read fully — these explain HOW the code works):**

7. `.claude/cloning-pipeline-flow.md` — overview + cross-cutting principles. Last session never opened this; missing context cost ~30 min of conjecture. Note the D99 architectural-batch summary box at the top.
8. `.claude/cloning-pipeline-stages.md` — per-stage detail (DB tables touched, scripts run, skills dispatched per stage). Read the stages relevant to today's tasks (Stage 1 + Stage 10 for /sgs-update tasks; Stage 4/5/6/9/10 for /sgs-clone measurement).

**Tier 4 — block + DB reference (read on-demand per task):**

9. `.claude/specs/02-SGS-BLOCKS.md` — block-by-block reference. Read sgs/media + sgs/container + sgs/trust-badges sections (touched by D93-D100). Also Section 18 (svg-bg RETIRED) + Section 15 (cert-bar RETIRED) for retirement notice patterns.
10. `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` — auto-generated per-block attribute reference (regenerated by /sgs-update Stage 7). Use as ground-truth for what attrs/supports each block currently has.

**Tier 5 — captured lessons (memory, READ FULLY):**

11. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_dbs_are_junction_not_mirror.md` — CORRECTED 2026-05-29: mirror-DB divergence was structurally impossible; real two DBs are sgs-framework + ui-ux-pro-max
12. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_lessons_must_be_operationally_surfaced_not_just_archived.md` — META-LESSON; explains why the anti-pattern STOP catalogue above MUST be at the top of next-session-prompts
13. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_db_rows_via_sgs_update_not_direct_seed.md` — slot-row addition flow (now seed-slot-synonyms.py is broken post-D99; relevant to Task 2)
14. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_section_root_aliases_target_sgs_container_only.md` — section-roots route to sgs/container (relevant to Task 4 row corrections)
15. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_fr22_6_hybrid_problem_is_sgs_only_no_legacy_fallback_hacks.md` — R-22-14 binding rule
16. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_grep_verify_handoff_diagnostic_premises.md` — grep-verify claims before acting

**Tier 6 — task-specific code reads (per-task):**

For Task 1 (videoUrl backfill):
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` lines 941-1019 (`equivalent_block_for()` — the function whose behaviour Task 1 unlocks)
- `plugins/sgs-blocks/src/blocks/media/block.json` (the source-of-truth for sgs/media's current attrs)
- `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` (the canonical assignment dry-run flow if you don't want to UPDATE directly)

For Task 2 (seed script port):
- Current broken: `plugins/sgs-blocks/scripts/uimax-tools/seed-slot-synonyms.py` (references dropped `slot_synonyms` table)
- Pattern to mirror: `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` `_migrate_roles_table()` at line 82 + `_migrate_property_suffixes_kind_override()` at line 737 (both use INSERT OR REPLACE seed pattern from Python dict)

For Task 3 (sgs-clone measurement):
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (the orchestrator)
- Most recent `pipeline-state/<run>/` directory + Spec 21 artefact map

## DB exploration pre-flight (not just count verification)

Last session, I queried `block_attributes` column list ONCE and never explored the values. That missed `attr_type='array'` and `equivalent_implementations` JSON column which were directly relevant to the architecture. Do these exploration queries BEFORE Task 1:

```bash
# Distinct attr_type values across block_attributes
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT DISTINCT attr_type, COUNT(*) AS n FROM block_attributes GROUP BY attr_type ORDER BY n DESC"

# Sample equivalent_implementations JSON for product-card.packSizes (the canonical array example)
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT block_slug, attr_name, attr_type, canonical_slot, role, equivalent_implementations FROM block_attributes WHERE block_slug='sgs/product-card' AND attr_name='packSizes'"

# Sample sgs/media current attrs (the block Task 1 touches)
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT attr_name, attr_type, canonical_slot, role, derived_selector FROM block_attributes WHERE block_slug='sgs/media' ORDER BY attr_name"

# slots table sample — confirm scope filtering works
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT slot_name, scope, aliases, standalone_block FROM slots WHERE slot_name IN ('media','heading','text','price','social') ORDER BY scope, slot_name"

# roles table verification — confirm all 5 content-bearing roles present
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT role_name, classification FROM roles ORDER BY classification, role_name"

# Verify retired tables are actually gone
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('slot_synonyms','legacy_role_lookup','slots','roles')"
```

Expected output checkpoints:
- `attr_type` values: string (~1300), number (~450), boolean (~280), array (~52), object (~42), rich-text (~21), integer (~14), string|boolean (~6)
- `sgs/product-card.packSizes`: attr_type='array', canonical_slot='button', role='content', equivalent_implementations JSON shows sgs_wp/html_css/sgs_bem_element mappings
- `sgs/media`: should now have 12 video attrs + ~30 image attrs; videoUrl row should have canonical_slot=NULL initially (Task 1 fixes this)
- `slots`: 5 rows back for the IN-clause query (1 each from media/heading/text/price + 1 from social; section-scope filtered out)
- `roles`: 20 rows total with 5 content-bearing (text-content, image-object, content, link-href, identity) + 15 styling-behaviour
- `sqlite_master`: should ONLY return `slots` + `roles` (slot_synonyms + legacy_role_lookup should be MISSING — they were DROPPED D99)

If any of these checks fails, something regressed since last session — investigate before proceeding to tasks.

## First action (under 5 min — ADHD Rule 2)

After reading Tier 1 + skimming Tier 2 headers + running the DB exploration above, run this single command to verify the slots/roles/kind_override counts:

```bash
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT 'slots-element' AS what, COUNT(*) AS n FROM slots WHERE scope='element' UNION ALL SELECT 'slots-section', COUNT(*) FROM slots WHERE scope='section' UNION ALL SELECT 'roles', COUNT(*) FROM roles UNION ALL SELECT 'kind_override', COUNT(*) FROM property_suffixes WHERE kind_override IS NOT NULL"
```

Expected:
- slots-element: 89
- slots-section: 16
- roles: 20
- kind_override: 17

Then verify the link-href fix at the function layer:

```bash
python -c "
import sys
sys.path.insert(0, r'c:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/orchestrator/converter_v2')
import db_lookup
print('content-bearing roles:', sorted(db_lookup._content_bearing_roles()))
print('equivalent_block_for sgs/media.videoUrl:', db_lookup.equivalent_block_for('sgs/media', 'videoUrl'))
"
```

Expected:
- content-bearing roles: `['content', 'identity', 'image-object', 'link-href', 'text-content']` (5 items including link-href)
- equivalent_block_for sgs/media.videoUrl: `None` (because Task 1 hasn't populated canonical_slot yet — POST-Task-1 it should return `sgs/media`)

If any count is off OR if `link-href` is missing from content-bearing roles, something regressed — investigate before proceeding.

## Tasks (in priority order)

### Task 1 — Backfill sgs/media.videoUrl canonical_slot (HIGHEST PRIORITY)

**Why:** The link-href bug closure (Subagent E, D99) fixed the gate but Subagent D's video extension added 12 new video attrs to block_attributes without canonical_slot/role/derived_selector populated. Result: `equivalent_block_for('sgs/media', 'videoUrl')` returns None because Tier A can't fire (no canonical_slot). The gate works; the data doesn't yet exist for the gate to apply to.

**Per pre-flight ritual:** This is a Tier A backfill (FR-22-2.1) — not a new mechanism. Single binding rule: R-22-1 (DB-first). Captured lesson: `feedback_db_rows_via_sgs_update_not_direct_seed.md` — direct UPDATE is acceptable for one-off corrections; assign-canonical.py dry-run is the audited flow for batches.

**Fix:** Direct UPDATE on the videoUrl row + similar rows for other video attrs that should be content-bearing:
```sql
UPDATE block_attributes SET canonical_slot='media', role='link-href', derived_selector='.sgs-media__media' WHERE block_slug='sgs/media' AND attr_name='videoUrl';
UPDATE block_attributes SET canonical_slot='media', role='image-object' WHERE block_slug='sgs/media' AND attr_name='videoPoster';
-- videoSource / videoId / videoMimeType / videoAutoplay / videoLoop / videoMuted / videoControls / videoPlaysInline / videoLazyLoad are configuration (not content) — leave NULL
```

Verify post-UPDATE:
```python
import db_lookup; db_lookup.equivalent_block_for.cache_clear()
print(db_lookup.equivalent_block_for('sgs/media', 'videoUrl'))  # should be 'sgs/media'
```

(LRU cache must be cleared after the UPDATE — same-process queries return stale results otherwise.)

Estimated time: 15 min.

### Task 2 — Port seed-slot-synonyms.py to slots-table architecture

**Why:** Subagent E migrated slot_synonyms rows into the new slots table via direct INSERT, but seed-slot-synonyms.py at `plugins/sgs-blocks/scripts/uimax-tools/` was never updated. It still references the dropped slot_synonyms table. Next time anyone adds a slot row via the script, it will either error or write to a phantom location.

**Per pre-flight ritual:** This is R-22-1 compliance (DB-first). Pattern to mirror: D99's roles + kind_override migrations. Captured lesson: `feedback_db_rows_via_sgs_update_not_direct_seed.md` — clarifies canonical flow.

**Options:**
- (a) Rewrite seed-slot-synonyms.py to write to slots table with composite (slot_name, scope) PK; default scope='element'
- (b) Retire seed-slot-synonyms.py + create seed-slots.py as the new canonical seed
- (c) Make the slots data live in Python constants seeded via INSERT OR REPLACE migration in db_lookup.py (like roles table) — strongest R-22-1 alignment

Recommended: **(c)** since it matches the pattern Subagent E set for roles + property_suffixes.kind_override at db_lookup.py:82 + 737. Reference both functions when implementing.

Estimated time: 30-45 min.

### Task 3 — Run /sgs-clone canary measurement (THE EMPIRICAL GATE)

**Why:** Validate the D93-D100 architectural work empirically. Compare to post-Fix-1 baseline of 58.6% mean pixel-diff on Mama's Munches homepage page 144.

**Per pre-flight ritual:** R-22-4 binding rule — pixel-diff gates every commit. Captured lesson: blub.db 256 — per-section cropped pixel-diff via `--selector .sgs-{section}`, never full-page (full-page has 30-45% noise floor). MANDATORY pre-read: Spec 21 PIPELINE-STATE-ARTEFACTS (mandatory before conjecturing about any pipeline output).

**Command:**
```bash
cd c:/Users/Bean/Projects/small-giants-wp
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --client mamas-munches --page homepage \
  --auto-section --converter-v2 --debug-trace --spec-22-acceptance \
  --deploy-target page:144
```

**Expected:** mean pixel-diff drops substantially because (a) link-href routing now works (sgs/media.videoUrl after Task 1), (b) container has grid-item defaults + better grid controls, (c) trust-bar correctly uses sgs/trust-badges, (d) capability-aware tiebreaker resolves multi-class BEM cases.

**Watch for integration issues** — many blocks changed render.php in the batch; verify no PHP errors on first deploy. After run, READ `pipeline-state/<latest>/leftover-buckets.json` FIRST (per captured lesson `feedback_read_leftover_buckets_before_conjecturing`).

Estimated time: 10-15 min.

### Task 4 — Apply remaining Stream A row corrections (BASED ON TASK 3 RESULTS)

**Why:** Last session identified 3 wrong slot rows in our Cases 1/2/3 audit. Only price was fixed (price → sgs/text). Remaining candidates:
- `items` (element scope) standalone_block=sgs/info-box — aliases over-broad (includes nav, menu, filters, social, social-link, thumbs etc.)
- `social` (element scope) standalone_block=sgs/social-icons — alias `social-link` overlaps with items
- Section-root routings: `featured-product → sgs/featured-product`, `social-proof → sgs/testimonial`, `gift-section → sgs/feature-grid` — should likely default to sgs/container (walker FR-22-4) instead per captured lesson `feedback_section_root_aliases_target_sgs_container_only`

**Per pre-flight ritual:** R-22-9 (universal mechanism) applies — section-roots route to sgs/container, not bespoke content-block primitives. Captured lessons: section-root-aliases + row-by-row-measurement-gate (ship one row + measure between each, NOT batched).

**Strategy:** Let Task 3's measurement results drive priorities. If specific sections show high pixel-diff post-measurement, fix the slot rows for THOSE sections first. If pixel-diff is already at target, this task may be moot.

Estimated time: 30-60 min (depends on measurement results).

### Task 5 — Stage 10 cleanup of 44 pre-existing stale rows

**Why:** Stage 10 v2/v3 made aggressive default; the 44 pre-existing `is_stale=1` rows from earlier sessions should clean up next time stage 10 runs. Verify post-cleanup count drops to 0.

```bash
python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 10
```

Then verify: `SELECT COUNT(*) FROM block_supports WHERE is_stale=1` → 0

Estimated time: 5 min.

## Skills to Invoke

| Skill | When | NB |
|---|---|---|
| `/autopilot` | FIRST — every session start (HARD GATE) | Loads anti-pattern STOP catalogue + ADHD rules into context |
| `/sgs-wp-engine` | always for this project | SGS framework knowledge base |
| `/qc-inline` | per-task before commit | Single-file sanity check |
| `/qc` | retrospective audit if Task 3 measurement surfaces issues OR doc-state drift suspected | Full 7-stage; used at session-close 2026-05-29 to find 7 gaps |
| `/qc-council` | multi-rater review of any non-trivial fix-shape proposal | Required for converter/walker/SGS-block commits per blub.db 255 |
| `/research-check` | if a row-routing decision is genuinely ambiguous (Task 4) | Two-rater parallel Sonnet ~2 min |
| `/handoff` | session close | Walks docs-registry per Gate 4.5 |
| `/capture-lesson` | any new corrective rule surfaced | Adds to MEMORY.md + project memory + blub.db |

## Tool bindings

| Tool | Use for | Caveat |
|---|---|---|
| `sgs-db.py sql` | DB queries (READ-ONLY — wrapper silently no-ops DELETE/UPDATE/INSERT) | For writes: `python -c "import sqlite3; ..."` direct calls |
| `wp-blocks.py dump` | block schema verification per blub.db 272 | Schema enumeration BEFORE "missing X" claims |
| `sgs-update-v2.py` | DB refresh + prune + spec regen (10 stages) | Stage 10 v3 is aggressive-prune by default per D94/D100 |
| `populate-db.py` | block_capabilities seed refresh per D96 (INSERT OR REPLACE + pre-pass DELETE) | Run if you edit CAPABILITY_RULES |
| `sgs-clone-orchestrator.py` | THE measurement (Task 3) | `--deploy-target page:144` deploys to sandybrown canary |
| `pixel-diff.py --selector .sgs-{section}` | per-section diff per blub.db 256 | NEVER full-page (30-45% noise floor) |
| Playwright MCP | live-page DOM verification per R-22-11 | Verify rendered output, not internal metrics |

## Hard constraints (carried forward — these are LOAD-BEARING)

- **R-22-1 — DB-first, no hardcoded dicts** (exception: convention-ordering lists like `_BREAKPOINT_RULES` + `_CAPABILITY_PRIORITY` are runtime config, not data; legitimately stay as Python constants. Static spec facts belong in DB tables — D99 precedent.)
- **R-22-4 — pixel-diff gates every commit** — Task 3's measurement IS the empirical gate for D93-D100 work
- **R-22-9 — universal mechanisms, no per-block hyperfocus** — applies to ANY slot routing decision
- **R-22-13 — Bean visual sign-off co-authoritative** — script measurement + visual cropped-pair both consulted
- **R-22-14 — no server-side legacy fallback hacks in FR-22-6 migrations**
- **--no-verify only with Bean explicit approval per-commit** — used 4× during 2026-05-29 batch; default is normal commit through visual diff gate going forward

## Out-of-scope this session

- Pre-existing test_phase_3_inner_blocks.py hero CTA failures (confirmed pre-existing via git stash; unrelated to D93-D100 batch)
- Stream A deeper section-root reshape if Task 3 measurement shows it's not needed
- block_capabilities wider wire-in (currently only FR-22-15 tiebreaker; longer-term qc-council register line 476 mentioned `block_allowed_children` derivation)
- Trust-badges + certification-bar live-deploy validation (parking entry P-TRUST-BADGES-MERGE-VALIDATION exists)
- sgs/media video extension live-deploy validation (parking entry P-MEDIA-VIDEO-VALIDATION exists)
- sgs/svg-background migration live-deploy validation (parking entry P-SVG-BACKGROUND-MIGRATION-VALIDATION exists)
- /qc-council retrospective on D93-D100 batch (only if Task 3 measurement surfaces issues)
