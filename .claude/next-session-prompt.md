---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-30-A5-canary-measurement-plus-cleanups
generated: 2026-05-29
parent_session: small-giants-wp-2026-05-29-architectural-cleanup-batch-D93-D100
primary_goal: "Run /sgs-clone canary measurement on Mama's Munches page 144 to validate D93-D100 architectural batch + backfill sgs/media.videoUrl canonical_slot + port seed-slot-synonyms.py to slots-table architecture + apply remaining row corrections based on measurement results."
---

# Next Session — A5 Canary Measurement + Stream A Cleanups

## TL;DR

Last session shipped 8 D-numbered decisions in one massive architectural batch (commit `bcbafe09` on origin/main): slots/roles tables unified, link-href bug closed at gate, svg+cert+media+container all extended. **A5 (the /sgs-clone canary pixel-diff measurement) was deferred** because it was too late at session-end + risk of integration issues from all the new code. This session validates the work empirically + closes 3 remaining cleanups.

## Mandatory READING

1. This file
2. `.claude/handoff.md` — full last-session context with Known Issues list
3. `.claude/state.md` — current_phase
4. `.claude/decisions.md` D93-D100 entries (top of file) — what changed architecturally
5. Memory: `feedback_dbs_are_junction_not_mirror.md` — corrects mirror-DB framing (.claude and .agents are same physical file via NTFS junction; real two DBs are sgs-framework + ui-ux-pro-max)

## First action (under 5 min — ADHD Rule 2)

Verify the current state of slots + roles tables + the link-href gate before doing anything else. Single command:

```bash
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT 'slots-element' AS what, COUNT(*) AS n FROM slots WHERE scope='element' UNION ALL SELECT 'slots-section', COUNT(*) FROM slots WHERE scope='section' UNION ALL SELECT 'roles', COUNT(*) FROM roles UNION ALL SELECT 'kind_override', COUNT(*) FROM property_suffixes WHERE kind_override IS NOT NULL"
```

Expected:
- slots-element: 89
- slots-section: 16
- roles: 20
- kind_override: 17

If any count is off, something regressed since last session — investigate before proceeding.

## Tasks (in priority order)

### Task 1 — Backfill sgs/media.videoUrl canonical_slot (HIGHEST PRIORITY)

**Why:** The link-href bug closure (Subagent E, D99) fixed the gate but Subagent D's video extension added 12 new video attrs to block_attributes without canonical_slot/role/derived_selector populated. Result: `equivalent_block_for('sgs/media', 'videoUrl')` returns None because Tier A can't fire (no canonical_slot). The gate works; the data doesn't yet exist for the gate to apply to.

**Fix:** Direct UPDATE on the videoUrl row + similar rows for other video attrs that should be content-bearing:
```sql
UPDATE block_attributes SET canonical_slot='media', role='link-href', derived_selector='.sgs-media__media' WHERE block_slug='sgs/media' AND attr_name='videoUrl';
UPDATE block_attributes SET canonical_slot='media', role='image-object' WHERE block_slug='sgs/media' AND attr_name='videoPoster';
-- videoSource / videoId / videoMimeType / videoAutoplay / videoLoop / videoMuted / videoControls / videoPlaysInline / videoLazyLoad are configuration (not content) — leave NULL
```

Verify post-UPDATE:
```python
import db_lookup; print(db_lookup.equivalent_block_for('sgs/media', 'videoUrl'))  # should be 'sgs/media'
```

OR consider using `assign-canonical.py` dry-run flow if available + Bean-approve the slots.

Estimated time: 15 min.

### Task 2 — Port seed-slot-synonyms.py to slots-table architecture

**Why:** Subagent E migrated slot_synonyms rows into the new slots table via direct INSERT, but seed-slot-synonyms.py at `plugins/sgs-blocks/scripts/uimax-tools/` was never updated. It still references the dropped slot_synonyms table. Next time anyone adds a slot row via the script, it will either error or write to a phantom location.

**Options:**
- (a) Rewrite seed-slot-synonyms.py to write to slots table with composite (slot_name, scope) PK; default scope='element'
- (b) Retire seed-slot-synonyms.py + create seed-slots.py as the new canonical seed
- (c) Make the slots data live in Python constants seeded via INSERT OR REPLACE migration in db_lookup.py (like roles table) — strongest R-22-1 alignment

Recommended: **(c)** since it matches the pattern Subagent E set for roles + property_suffixes.kind_override.

Estimated time: 30-45 min.

### Task 3 — Run /sgs-clone canary measurement (THE EMPIRICAL GATE)

**Why:** Validate the D93-D100 architectural work empirically. Compare to post-Fix-1 baseline of 58.6% mean pixel-diff on Mama's Munches homepage page 144.

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

**Watch for integration issues** — many blocks changed render.php in the batch; verify no PHP errors on first deploy.

Estimated time: 10-15 min.

### Task 4 — Apply remaining Stream A row corrections (BASED ON TASK 3 RESULTS)

**Why:** Last session identified 3 wrong slot rows in our Cases 1/2/3 audit. Only price was fixed (price → sgs/text). Remaining candidates:
- `items` (element scope) standalone_block=sgs/info-box — aliases over-broad (includes nav, menu, filters, social, social-link, thumbs etc.)
- `social` (element scope) standalone_block=sgs/social-icons — alias `social-link` overlaps with items
- Section-root routings: `featured-product → sgs/featured-product`, `social-proof → sgs/testimonial`, `gift-section → sgs/feature-grid` — should likely default to sgs/container (walker FR-22-4) instead

**Strategy:** Let Task 3's measurement results drive priorities. If specific sections show high pixel-diff post-measurement, fix the slot rows for THOSE sections first. If pixel-diff is already at target, this task may be moot.

Estimated time: 30-60 min (depends on measurement results).

### Task 5 — Stage 10 conservative aggressive cleanup of 44 pre-existing stale rows

**Why:** Stage 10 v2 made aggressive default; the 44 pre-existing `is_stale=1` rows from earlier sessions should clean up next time stage 10 runs. Verify post-cleanup count drops to 0.

```bash
python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 10
```

Then verify: `SELECT COUNT(*) FROM block_supports WHERE is_stale=1` → 0

Estimated time: 5 min.

## Skills to Invoke

| Skill | When |
|---|---|
| `/autopilot` | FIRST — every session start (HARD GATE) |
| `/sgs-wp-engine` | always for this project |
| `/qc-inline` | per-task before commit |
| `/qc-council` | retrospective multi-rater review of D93-D100 if measurement surfaces issues |
| `/research-check` | if a row-routing decision is genuinely ambiguous (Task 4) |
| `/handoff` | session close |
| `/capture-lesson` | any new corrective rule surfaced |

## Tool bindings

| Tool | Use for |
|---|---|
| `sgs-db.py` | DB queries (read-only — use direct sqlite3 for writes) |
| `wp-blocks.py dump` | block schema verification per blub.db 272 |
| `sgs-update-v2.py` | DB refresh + prune + spec regen |
| `sgs-clone-orchestrator.py` | THE measurement (Task 3) |
| `pixel-diff.py --selector .sgs-{section}` | per-section diff per blub.db 256 |
| Playwright MCP | live-page DOM verification per R-22-11 |

## Hard constraints (carried forward)

- **R-22-1 — DB-first, no hardcoded dicts** (with the exception established by Subagent C: convention-ordering lists like _BREAKPOINT_RULES + _CAPABILITY_PRIORITY are runtime config, not data; they correctly stay as Python constants)
- **R-22-4 — pixel-diff gates every commit** — Task 3's measurement is THE gate for D93-D100 work
- **R-22-9 — universal mechanisms, no per-block hyperfocus** — applies to any slot routing decision
- **R-22-13 — Bean visual sign-off co-authoritative** — script measurement + visual cropped-pair both consulted
- **R-22-14 — no server-side legacy fallback hacks in FR-22-6 migrations**
- **--no-verify only with Bean explicit approval per-commit** — last session used it for the D93-D100 batch; default is normal commit through visual diff gate going forward

## Out-of-scope this session

- Pre-existing test_phase_3_inner_blocks.py hero CTA failures (confirmed pre-existing via git stash; unrelated to D93-D100 batch)
- Stream A2-A5 deeper section-root reshape if Task 3 measurement shows it's not needed
- block_capabilities wider wire-in (currently only FR-22-15 tiebreaker; longer-term qc-council register line 476 mentioned `block_allowed_children` derivation)
- Trust-badges + certification-bar live-deploy validation (parking entry P-TRUST-BADGES-MERGE-VALIDATION exists)
