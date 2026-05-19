---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-22-universal-extraction-rc-fixes
generated: 2026-05-21
prior_session: small-giants-wp-2026-05-21-pipeline-cleanup-option-A
primary_goal: "Close the 4 root-cause gaps surfacing in Wave 3 verification, run pipeline end-to-end, then council audit + /systematic-debugging on remaining gaps"
---

# Universal-extraction root-cause fixes + pipeline end-to-end verification

Yesterday's session shipped four waves of cv2 cleanup (commits `62ee8b87` → `e60fe58e`). The cloning pipeline is now structurally sound: cv2 is the only converter path, legacy fallback removed, documented gates enforced, universal-extraction CSS D3 safety net wired. But Wave 3 verification surfaced four specific root causes preventing universal extraction from actually catching every CSS rule. Today's session fixes those four RCs, runs the pipeline end-to-end, then dispatches a focused gap-analysis council to identify what's still missing.

You are a senior SGS Framework engineer specialising in cv2 / universal extraction. Main agent on Opus (Bean's binding rule). Orchestrate Sonnet + Haiku + Gemini Flash + Gemini Pro + Cerebras via `/delegate`.

## Primary goal

Reach **<1% pixel parity per section** via `/sgs-clone`, working **1 section at a time**, **no targeted cheats**. Universal extraction over per-block legacy porting (see `memory/feedback_universal_extraction_no_per_block_legacy.md`). Every CSS rule maps to (a) existing block attribute via DB fingerprint OR (b) new-attribute proposal via D3 — never silently drops.

## State recap (post-2026-05-21 session)

### What shipped (4 commits on main)

| Commit | Wave | Summary |
|--------|------|---------|
| `62ee8b87` | Foundation | Rounds 1+2 audits + /sgs-update regen + Task 0.3 recogniser + Phase 1 QC scripts (qc-anti-cheat, qc-correctness-regression, qc-coverage-honesty) |
| `ee8db653` | Wave 1 | cv2-only path (`--converter-v2` default-True; legacy subprocess removed; halt-with-clear-error on non-BEM); Stage 8 stub gate fixed (no more silent 0.0 pass) |
| `7d713ba0` | Wave 2 | Per-section pixel-diff via `--selector .sgs-{section}`; `unresolved_slots==0` deploy gate; uimax licensing reject; confidence ≥0.7 gate; `require_schema=True` default |
| `e60fe58e` | Wave 3 | CSS D3 destination wired in convert.py walk(); Stage 3 calls DB canonical_slot; LEGACY_ROLE_LOOKUP→DB table; RETIRED_BLOCK_REMAP soft-emptied; 7 Indus heritage-strip files migrated to brand |

Mama's homepage post-Wave-3 measurements:
- 989 `attribute_gap_candidate` rows in `sgs-framework.db` (14 new from this run — previously silent drops)
- 153 / 188 (81.4%) Stage 3 slots resolved via DB canonical_slot
- 17 `legacy_role_lookup` entries migrated to DB; idempotent seed runs on every `/sgs-update`

### What's still broken — 4 root causes (full evidence at `reports/2026-05-21-wave-3-verification.md`)

**RC-3 — `slot_synonyms` DB gaps. (HIGH ROI, DATA-ONLY FIX)**
`canonical_slot_for('split-image')` returns None. The `slot_synonyms` table doesn't have entries for composite slot names like `split-image`, `split-media`. Because canonical_slot lookup fails, `_lift_styling_attrs` never fires for those elements, so D3 never sees their CSS rules. Estimated ~20 hero attrs (object-fit, object-position, image grid controls) silently drop for this reason alone. Universal benefit: every block with composite-named slots gets unblocked.
**Fix:** add entries to `slot_synonyms` DB table for every composite slot name found across SGS blocks. Could be a `/sgs-update` extension that auto-discovers slot-name patterns from `block.json` and populates the synonym table.

**RC-2 — `_SUPPORTS_HANDLED_PROPS` over-exclusion. (HIGH ROI, CODE FIX)**
`convert.py` excludes properties like `justify-content` and `grid-template-columns` from D3 because they're tagged "supports-handled". But `_lift_root_supports_to_style()` only writes WP-native `style.*` attrs — it has no path for block-specific layout attrs like `verticalAlignment` or `splitColumnRatio`. So those properties fall into no-man's land: excluded from D3 (flagged supports-handled), but not actually handled by supports lift. Silent drop, zero trace.
**Fix:** tighten `_SUPPORTS_HANDLED_PROPS` to only props supports actually handles, OR add a block-attr fallback path after supports lift fails (the D3 net should still catch it).

**RC-1 — D3 Mode 2 breakpoint coverage gap. (HIGH ROI, CODE FIX)**
D3 Mode 2 fires when a CSS property has a `property_suffixes` mapping but no candidate landed in the block's schema. The check only inspects `base_decls`. Mobile-first CSS where `font-family: 'Fraunces'` only appears inside `@media (min-width: 768px)` never reaches `_lifted_css_props`. Desktop-overrides typography pipeline drops silently.
**Fix:** D3 Mode 2 must walk every breakpoint variant of the rule, not just base_decls. Use `_breakpoint_suffixes` DB-driven vocabulary to derive breakpoint-suffixed attr name (e.g. `headlineFontFamilyDesktop`).

**RC-4 — `_collect_css_decls_for_element` grouped-selector bug. (NARROW BUG)**
`split()` on `h1, h2, h3` returns `['h1', 'h2', 'h3']` but code uses `parts[-1]` giving `'h3'`. Rule like `h1, h2, h3 { font-family: Fraunces; }` never matches any `<h1>` element.
**Fix:** iterate every part of the grouped selector, not just the last. ~5-line fix.

## Today's execution plan

### Phase 0 — Pre-flight (Opus inline, ~5 min)

1. Read `reports/2026-05-21-wave-3-verification.md` in full (file:line evidence for the 4 RCs).
2. Read `memory/feedback_universal_extraction_no_per_block_legacy.md` (the binding rule).
3. Baseline check: current `attribute_gap_candidates` row count (so we can measure delta after RC fixes).
4. Verify no uncommitted work from yesterday: `git status`.
5. **NEW** — drift-check hooks are now active (`.claude/hooks/drift-check-dispatcher.py` wired via `.claude/settings.json`). 5 checks fire on Edit/Write/Bash. Mixed posture: A (warn via systemMessage) for script-inventory + skill-dispatch + stage-status + Spec 16 FR/R nudges; B (BLOCK exit 2) for DB schema row-count drift. Expect 1-2 warn surfaces per pipeline-script edit — this is by design. If the DB-drift block fires, address it before continuing (update flow doc / Spec 16 counts to match actual DB state).

### Phase 1 — Fix the 4 RCs (orchestrated parallel waves, ~2 hr wall)

#### Task 1a — RC-3: `slot_synonyms` DB gaps

**What:** Composite slot names like `split-image` resolve to None in `canonical_slot_for()`, so `_lift_styling_attrs` never fires for those elements and D3 never sees their CSS rules. ~20 attrs silently drop per affected block.
**Why:** Universal-extraction completeness for every block with composite-named slots (split-image, split-media, side-card, etc.).
**Estimated time:** 30 min.

**Orchestration:**
- Execution: delegated, sonnet via `/delegate`
- Dispatch: single-agent
- Brief: Investigate which `__<element>` slot names appear in `plugins/sgs-blocks/src/blocks/<slug>/block.json` files that AREN'T yet in `slot_synonyms`. Propose a deterministic auto-population rule. Extend `/sgs-update` to populate `slot_synonyms` from block.json on every run.
- Context the agent needs: `slot_synonyms` table schema, `db_lookup.canonical_slot_for()` signature, `update-db.py` insertion patterns (see Wave 3c `seed-legacy-role-lookup.py` precedent at `plugins/sgs-blocks/scripts/uimax-tools/`).
- Depends on: none
- Parallel with: Task 1b, 1c, 1d (file-disjoint)
- /qc gate after: `/qc-inline` self-check + verify `canonical_slot_for('split-image')` returns non-None

**Acceptance:** post-edit, re-running `/sgs-clone --converter-v2` on Mama's homepage produces measurably MORE entries via D1 lift (was 153/188 = 81.4%) — at least 5 percentage points higher.

#### Task 1b — RC-2: `_SUPPORTS_HANDLED_PROPS` over-exclusion

**What:** Properties like `justify-content` and `grid-template-columns` are tagged "supports-handled" so D3 skips them, but `_lift_root_supports_to_style()` only writes WP-native `style.*` attrs — block-specific layout attrs (`verticalAlignment`, `splitColumnRatio`) silently drop in no-man's land.
**Why:** Wave 0 finding — hero's `verticalAlignment` + `splitColumnRatio` were silent-drop examples. Fixing this lifts every block's layout attrs through the universal path.
**Estimated time:** 45 min.

**Orchestration:**
- Execution: delegated, sonnet via `/delegate`
- Dispatch: single-agent
- Brief: Inspect `_lift_root_supports_to_style()` to determine which CSS properties supports actually handles. Tighten `_SUPPORTS_HANDLED_PROPS` to that exact set. Add D3 fallback for properties previously flagged as supports-handled but not routed by supports.
- Context: `convert.py` `_lift_root_supports_to_style()` body; `_SUPPORTS_HANDLED_PROPS` set; Wave 3a's D3 emission infrastructure at convert.py `_record_gap_candidate()`.
- Depends on: none
- Parallel with: 1a, 1c, 1d
- /qc gate after: `/qc-inline` + spot-check that hero's `verticalAlignment` now appears in either extract.json (D1 lift) OR `attribute_gap_candidates` (D3 fallback)

**Acceptance:** `attribute_gap_candidate` row count delta on Mama's homepage post-fix is positive (more universal-extraction coverage); zero hero layout attrs silently drop in spot-check.

#### Task 1c — RC-1: D3 Mode 2 breakpoint coverage

**What:** D3 Mode 2 only inspects `base_decls`. Mobile-first CSS where `font-family: 'Fraunces'` only appears inside `@media (min-width: 768px)` never reaches `_lifted_css_props`. Desktop-overrides typography pipeline drops silently.
**Why:** Universal-extraction completeness across breakpoints — every responsive variant should surface via D1 or D3, never drop.
**Estimated time:** 30 min.

**Orchestration:**
- Execution: delegated, sonnet via `/delegate`
- Dispatch: single-agent
- Brief: Refactor D3 Mode 2 in `convert.py` to walk all breakpoint variants (mobile/tablet/desktop) and propose breakpoint-suffixed attr names (e.g. `headlineFontFamilyDesktop`) via existing `_breakpoint_suffixes` DB-driven vocabulary.
- Context: `convert.py` `_lift_styling_attrs` Mode 2 trigger; `db_lookup.breakpoint_suffix_rules()`; `modifier_suffixes` DB table (19 rows, 3 breakpoints).
- Depends on: none
- Parallel with: 1a, 1b, 1d
- /qc gate after: `/qc-inline` + verify mobile-first @media CSS in Mama's hero now appears as breakpoint-suffixed gap rows (e.g. `sgs/hero.headlineFontFamilyDesktop`)

**Acceptance:** new gap rows post-fix include breakpoint-suffixed proposals; previously dropped @media font/spacing/colour rules now surface.

#### Task 1d — RC-4: grouped-selector bug

**What:** `_collect_css_decls_for_element` splits `h1, h2, h3` and uses `parts[-1]` → only `'h3'` matches. Rules like `h1, h2, h3 { font-family: Fraunces; }` never match `<h1>` elements.
**Why:** Narrow bug, ~5-line fix. Universal benefit: any draft using grouped heading selectors gets correctly attributed.
**Estimated time:** 15 min.

**Orchestration:**
- Execution: delegated, haiku via `/delegate`
- Dispatch: single-agent
- Brief: Fix `_collect_css_decls_for_element` to iterate every part of grouped CSS selectors. Add a regression test for `h1, h2, h3 { font-family: Fraunces; }` against `<h1>` element.
- Context: convert.py line ~2200-2400 region (find function); existing convert.py tests for collection patterns.
- Depends on: none
- Parallel with: 1a, 1b, 1c
- /qc gate after: `/qc-inline` + new test passes

**Acceptance:** grouped-selector regression test green; one previously-misattributed Mama's CSS rule now lifts correctly.

#### Phase 1 closure — multi-rater /qc + commit

After all 4 tasks return: dispatch `/qc` 4-rater panel (Sonnet + Haiku + Gemini Flash + Cerebras) on the combined diff. Binding rule blub.db row 255 — converter-touching commits require multi-rater /qc. Then commit + push + merge to main (already on main per Wave 4 standing posture).

### Phase 2 — Pipeline end-to-end re-run (Opus inline, ~15 min)

Run `/sgs-clone --converter-v2` against Mama's homepage:

```bash
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --converter-v2 \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --client mamas-munches --page homepage \
  --auto-section --skip-autonomy-gate --skip-register --mode draft
```

Measure:
- Total `attribute_gap_candidate` rows added (should be significantly higher than yesterday's +14 — every previously-dropped attribute now surfaces)
- Stage 3 canonical_source ratio (should improve toward 100% if RC-3 closes the slot_synonyms gaps)
- Per-section pixel-diff numbers (Stage 8 runs per-section via `--selector` per Wave 2a) — capture for council audit input

### Phase 3 — Council audit + /systematic-debugging on remaining gaps (~2-3 hr)

For each section that's STILL above 1% pixel-diff after Phase 1+2:
1. Read `pipeline-state/<run>/leftover-buckets.json` for that section (binding rule blub.db row 254)
2. Read `attribute_gap_candidates` rows for the block + section
3. `/systematic-debugging` on the specific gap: root cause → evidence → proposed fix → explicit link to end-goal
4. Branch decision: build the fix OR formally defer with Decision-log entry

Council shape: 3 Sonnet + 1 Gemini Flash + 1 Gemini Pro auditors per section.

**Critical:** verify each Gemini auditor's specific claims by grep before relaying — yesterday's session had 2 Gemini panels fabricate quotes/line numbers. Sonnet panels were reliable; Gemini panels need verification.

### Phase 4 — Truth-doc consolidation (DEFERRED FROM 2026-05-21, ~45 min)

Yesterday's Wave 4 agent hit context-limit trying to absorb 4 large docs in one pass. Today's redispatch:

- Agent A (Haiku, ~20 min): UPDATE `cloning-pipeline-flow.md` for the 4 wave commits' state changes. ONLY update — no absorption work.
- Agent B (Sonnet, ~25 min): ABSORB `tooling-map.md` + `skills-commands-map.md` + `db-tables-map.md` into `cloning-pipeline-flow.md`. Replace the 3 sibling docs with redirect stubs. Sweep references.

### Phase 5 — Spec 15 → Spec 16 absorption (COMPLETED 2026-05-21 LATE — skip)

This was deferred at first handoff write but completed inline same session. Spec 16 §12 Appendix A folds Spec 15's canonical content; Spec 15 status flipped to `ABSORBED_INTO_SPEC_16`. Skip this phase. If any /qc finding from yesterday's flow-doc raters (P-WAVE-4-DOC-FOLLOWUPS in parking.md) needs follow-up, do that instead.

## Dependency graph

```
Phase 0 — pre-flight (Opus inline, 5 min)
  ↓
Phase 1 — RC fixes (4 parallel agents, ~2 hr wall)
  ├─ Task 1a sonnet — RC-3 slot_synonyms                ┐
  ├─ Task 1b sonnet — RC-2 SUPPORTS_HANDLED_PROPS       ├─ all file-disjoint, parallel
  ├─ Task 1c sonnet — RC-1 D3 breakpoint coverage       ┤
  └─ Task 1d haiku — RC-4 grouped-selector bug          ┘
  ↓
Phase 1 closure — /qc multi-rater (4 raters: Sonnet + Haiku + Gemini Flash + Cerebras) + commit + push + merge-to-main
  ↓
Phase 2 — Pipeline end-to-end run (Opus inline, ~15 min) — measure D1/D3 coverage delta vs yesterday's baseline
  ↓
Phase 3 — Per-section /systematic-debugging on still-above-1% sections (Opus inline + per-section Sonnet diagnostician, ~2-3 hr)
  ↓ per section closed
  /qc multi-rater + commit per section
  ↓
Phase 6 — Followups (parallel low-priority during waits)
```

### Phase 6 — Other followups (parallel low-priority during waits)

- Test-pollution fix: `test_licensed_in_description_rejected` fails when `test_staged_merge` runs first; passes isolated. Module-level state leak. ~20 min Haiku.
- Mama's `annotated-index.html` still has `.sgs-heritage-strip` selectors. ~10 min Haiku migration.
- PHP type nit at `food-service-page.php:413` (`$result` int interpolation). ~5 min.

## Skills to invoke

| Skill | When |
|-------|------|
| `/autopilot` | First — establishes live skill routing + ADHD support |
| `/brainstorming` | Phase 1 design decisions (e.g. how to auto-populate slot_synonyms) |
| `/dispatching-parallel-agents` | Phase 1 4-agent parallel dispatch + Phase 3 council |
| `/subagent-prompt` | Cold prompts for each Phase 1 / Phase 3 dispatch |
| `/delegate` | Pick model per task |
| `/qc-inline` | Self-check after each Wave 1 sub-task before commit |
| `/qc` | Multi-rater panel before any commit touching converter / pipeline / SGS block logic (binding rule blub.db row 255) |
| `/systematic-debugging` | Phase 3 per-section gap diagnosis |
| `/sgs-clone` | Phase 2 end-to-end run |
| `/sgs-update` | Phase 1 RC-3 (auto-populate slot_synonyms) |
| `/sgs-db` | Query gap-candidate table + slot_synonyms |
| `/sgs-wp-engine` | Block-level questions during Phase 3 |
| `/gap-analysis` | Grade Phase 3 fix proposals before commit |

## Tool bindings

| Tool | What for |
|------|----------|
| `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --converter-v2 ...` | Phase 2 pipeline run |
| `python ~/.agents/skills/sgs-wp-engine/scripts/sgs-db.py` | Block / attr queries |
| `mcp__plugin_playwright_playwright__browser_*` | Pixel-diff verification per section |
| `gh` | Cross-reference any historical fix or related issue |

## Methodology guardrails (binding — do not skip)

- **Read leftover-buckets.json BEFORE conjecturing.** Pipeline-state evidence is canonical (blub.db row 254).
- **Multi-rater /qc panel BEFORE every commit** touching converter / pipeline / SGS block logic (blub.db row 255).
- **Per-section cropped pixel-diff** via `scripts/pixel-diff.py --selector .sgs-{section}`, NOT full-page (blub.db row 256).
- **Universal extraction over per-block legacy porting** (`memory/feedback_universal_extraction_no_per_block_legacy.md`). Every CSS rule maps to existing attr OR new-attr proposal. No silent drops. Leftover buckets are debug surfaces, NOT production destinations.
- **`--converter-v2` is the ONLY converter path** (Wave 1 ee8db653). Don't reintroduce a legacy fallback flag without architectural review.
- **WP_DEBUG_DISPLAY=false** on staging.
- **DB-first lookups, no hardcoded dicts** (Rule 11, blub.db row 260). `legacy_role_lookup` is now in DB (Wave 3c).
- **No destructive git verbs in subagents** (`stash`, `reset --hard`, `checkout --`, `restore`, `clean`).
- **No `Co-Authored-By` footer in commits.**
- **Verify Gemini agent claims by grep** before relaying as fact — fabrications were caught in both audit rounds yesterday.

## Acceptance criteria (whole session)

- **Phase 1 complete:** all 4 RCs fixed + committed + pushed. Wave 3 verification re-run on Mama's homepage shows PASS verdict (universal extraction surfaces every spot-checked hero attr via D1 or D3, zero silent drops in the 10-attr sample).
- **Phase 2 complete:** new `attribute_gap_candidate` row count measurably higher than yesterday's baseline; Stage 3 canonical_source ratio improved; per-section pixel-diff numbers captured per viewport.
- **Phase 3 in progress:** at least 1 section's gap fully diagnosed via `/systematic-debugging` with proposed fix linked to end-goal.
- **Phase 4 + 5:** stretch goals; ship if Phase 1-3 close under budget.

## Sandybrown / palestine-lives credentials

`.claude/secrets/credentials.yml` (gitignored). SSH alias `hd`. WP_DEBUG_DISPLAY=false on staging.

## Key files to read at session start

- `reports/2026-05-21-wave-3-verification.md` — the 4 RCs with file:line evidence
- `memory/feedback_universal_extraction_no_per_block_legacy.md` — the binding behavioural rule
- `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` — converter v2 spec (Spec 15 absorption deferred to today's Phase 5)
- `.claude/cloning-pipeline-flow.md` — pipeline implementation reference (full consolidation pending Phase 4)
- `.claude/handoff.md` — yesterday's full session digest
