---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-18-brand-hero-evidence-walkdown
recommended_model: opus
generated: 2026-05-17
plan_revision: v3 (post-4-rater-panel review)
---

You are a senior SGS Framework architect opening **Spec 16 Phase 9 — brand + hero evidence-driven walkdown**. The 2026-05-17 session shipped 10 commits closing 7 recognition/conversion flaws on Mama's Munches (176 → 243 attrs, +38%). v1 + v2 of this prompt were reviewed by a 4-rater council (architecture / adversarial / pragmatist / evidence). v3 incorporates their consensus revisions.

**Pass condition (split into two metrics — evidence lens):**
- **Universality** = same converter handles structurally-different sections via DB-driven paths with no section-specific code. Declare at **attribute-coverage% ≥ 95%** on each tested section.
- **Fidelity** = pixel diff vs mockup baseline. Target **≤ 5%** for universality declaration; pursue **< 1%** only with remaining session runway.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-18-brand-hero-evidence-walkdown"`

## ALWAYS-LOAD invocations (in this order)

1. `/autopilot`
2. Read `.claude/handoff.md` — yesterday's 10-commit summary
3. Read `.claude/state.md` — phase frontmatter
4. Read `.claude/parking.md` — open backlog
5. Read 3 binding methodology rules in `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md` (rows 254, 255, 256)
6. Read 2 captured rules embedded as HARD-GATEs in `/sgs-clone` SKILL.md (rows 260, 261)
7. Read `.claude/memory/next-session-prompt-2026-05-17-v1.md` + `v2.md` ONLY if context on plan evolution is needed (otherwise skip — v3 is canonical)

## Pre-work — evidence infrastructure (~60 min)

The 4-rater panel agreed pre-work is essential but called out three required additions over v2:

**Step 1 — Lightweight trace extension** (~15 min)

Extend existing `_emit(trace_for(...))` calls in convert.py at 3 high-value decision points:
- `walker_branch_taken` — which path emitted the block (FR1 / composite-element / SGS-BEM-wrapper / pass-through / atomic-text / fallback)
- `attr_skipped` — value extraction failed, with reason (not_in_schema, already_set, kind_inference_failed, value_empty, db_lookup_no_row)
- `db_lookup_miss` — a DB query returned no row when one was expected

Feature-flag via `--debug-trace` CLI arg (defaults ON for clone runs, OFF for production register-tail). Per-section file at `pipeline-state/<run>/convert-trace-<boundary>.jsonl`.

**Step 2 — Expected-rules baseline** (~15 min) — **THE highest-leverage add from evidence lens**

For each section, BEFORE the walker runs, extract every CSS declaration that selects into the section's DOM subtree (use cssutils + BeautifulSoup). Write to `pipeline-state/<run>/expected-rules-<boundary>.jsonl`. Format: `{selector, declarations, source_media_condition_or_null}`.

This catches **silent misses** — yesterday's `parse_css` @media regex bug emitted ZERO trace events and looked like a clean section. With the expected-rules baseline, the diff `expected ∖ css_rule_seen` exposes every CSS rule the converter never saw.

**Step 3 — Split-metric pixel diff** (~10 min)

Extend `scripts/pixel-diff.py` to compute:
- **attribute-coverage%** = count(attrs lifted that match expected-rules baseline) / count(expected-rules) — pure converter score
- **pixel-diff%** = current per-section rendered diff — block + theme + render score

Sections where attribute-coverage% = 100% and pixel-diff% > 1% route to BLOCK/THEME work, NOT converter work. Yesterday's brand at 13% may already be in this bucket — verify first.

**Step 4 — Validation shakeout** (~10 min) — **adversarial lens required**

Run convert.py with `--debug-trace` on ONE already-closed minimal case. Diff `extract.json` against a known-good baseline (yesterday's `mamas-munches-homepage-2026-05-16-094727`). If extraction changes at all, the trace emitter has a side effect — BLOCK and fix before proceeding.

**Step 5 — Multi-rater /qc panel + commit** (~10 min)

Binding rule #2. 4-rater panel (Sonnet + Haiku + Gemini Flash + Cerebras) on the pre-work commit. Ship if all SHIP.

## Section work — brand FIRST, then hero (~2-3 hours total)

**Pre-walkdown order rule** (architecture lens): work the section to "next class-of-flaw identified", then fix universally, then measure impact across ALL sections, then re-rank and continue. Section drives DISCOVERY; fix commits at FLAW-CLASS scope.

### Section 1 — BRAND (~30-45 min — closest to passing, validates the workflow)

**Why brand first** (4 panels agreed): currently 13% pixel diff at tablet. Most likely converter-done (P-PHASE9-4 supports lift should have deposited padding/border/background attrs). If attribute-coverage% = 100%, brand is converter-complete and routes to block/theme work — fast first close validates the loop.

**Loop:**

1. **Single-section run with `--debug-trace`** (~3 min)
   ```bash
   python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
     --mockup sites/mamas-munches/mockups/homepage/index.html \
     --client mamas-munches --page homepage \
     --section "section.sgs-brand" \
     --converter-v2 --no-scaffold-new-blocks \
     --skip-register --skip-autonomy-gate \
     --mode draft --debug-trace
   ```

2. **Read evidence in order** (~5 min) — binding rule #1
   - `pipeline-state/<run>/expected-rules-brand.jsonl` vs `convert-trace-brand.jsonl` — diff for silent misses
   - `leftover-buckets.json` — declared slots unfilled
   - `extract.json` per_section_results — what was lifted
   - Attribute-coverage% from extended pixel-diff.py
   - Pixel-diff% at 3 viewports

3. **Branch on evidence:**
   - **IF attribute-coverage% ≥ 95% AND pixel diff% > 5%** → brand is converter-DONE. Log to decisions.md: "brand attribute-coverage at X%; residual diff is block/theme-side, parked as P-BRAND-RENDER". Move to hero. **NO council.** **NO /systematic-debugging.** Just verify + park.
   - **IF attribute-coverage% < 95%** → run `/systematic-debugging` on the trace + expected-rules diff. Single hypothesis → DB-first fix → verify.
   - **IF /systematic-debugging produces NO clear hypothesis** (and only then) → 4-rater 1-round council with forced perspectives.

4. **Fix + multi-rater /qc commit gate + redeploy + remeasure** (~15-20 min if fix needed)

5. **Park universal-rule candidate** in `pipeline-state/<run>/draft-rules.md` (NOT /capture-lesson yet — adversarial lens: capture only when validated across ≥2 sections OR at session close).

### Section 2 — HERO (~60-90 min — proves the loop on a hard case)

Currently 68% at 768, 70% at 1440, 80% at 375. P-PHASE9-3 territory (per-instance content/padding/font fidelity).

**Loop:** same A-E as brand. Probability of needing the council is high — hero has multiple entangled gaps. **IF council needed:**

- 4 forced perspectives (evidence lens — Sonnet=converter-internals advocate, Haiku=DB-schema advocate, Gemini Flash=mockup-CSS-source advocate, Cerebras=devil's-advocate)
- 1 round (not 3) — empirical gap analysis has ground truth via pixel diff
- Each rater MUST cite ≥3 specific trace events OR expected-but-missing rules
- Synthesis by main thread, not 3rd round

**Realistic outcome target for hero:** attribute-coverage% ≥ 95% + pixel diff ≤ 10% (not <1%). Open-ended fidelity work parks as P-HERO-CONTENT-LIFT for next session.

### Defer EVERYTHING else (~no time)

Explicitly DEFER to next session, no quiet defers:

- **Trust-bar** — needs schema decision (path A/B/C). NOT a pixel-diff fix. Park as P-TRUSTBAR-SCHEMA-BRAINSTORM (separate brainstorming session).
- **Social-proof** — same shape (testimonial-slider carousel vs static cards mismatch). Park alongside trust-bar.
- **Featured-product / ingredients / gift** — same family (info-box / product-card children). Park as P-INFOBOX-CHILDREN-LIFT for next-session walkdown.

## Cross-cutting work — bundle in ONE commit between sections (~45 min)

5 QC follow-ups from yesterday's panel + bucket-router role refresh, as a single batch:

1. **P-PHASE9-5** — Empty-DB defensive assertion in `db_lookup.css_property_suffixes()` (~5 min)
2. **P-PHASE9-6** — `RETIRED_BLOCK_REMAP` future-block guard (~10 min)
3. **P-PHASE9-7** — SGS-BEM grouping-wrapper pattern audit (~15 min)
4. **P-PHASE9-8** — Inline thin DB-lookup wrappers (~5 min)
5. **P-PHASE9-9** — Rename `_kind_for` → `_value_kind_for_suffix` (~3 min)
6. **Bucket-router role refresh** WITH regression check (~30 min):
   - Snapshot leftover-buckets.json for ALL 9 sections BEFORE refresh
   - Run `/sgs-update` to backfill 790 NULL roles
   - Re-run pipeline; diff bucket signal section-by-section
   - If any section's bucket count changes by >20% in unexpected ways, revert role assignment for that subset
   - Document deltas in commit message

Multi-rater /qc panel BEFORE commit.

## Session-end (~15 min)

1. **Promote draft-rules.md to /capture-lesson** — for ANY rule validated across both brand AND hero OR explicitly architectural. Single batch capture, not per-section.
2. **/handoff** — regen handoff + state + next-session-prompt for the deferred work (trust-bar/social-proof brainstorming + featured-product/ingredients/gift walkdown).

## Definition of done (HONEST budget)

Must close in-session:
- ✓ Pre-work shipped + validated (Step 4 shakeout clean)
- ✓ Brand: either converter-DONE (attribute-coverage% ≥ 95%, residual parked as render-side) OR closed to ≤5% pixel diff
- ✓ Hero: attribute-coverage% measured; at least one universal fix shipped DB-first; pixel diff progress logged
- ✓ Cross-cutting batch commit (5 follow-ups + role refresh) shipped with regression check
- ✓ End-of-session /capture-lesson if any rule validated

Acceptable explicit defers:
- Trust-bar / social-proof — schema-decision sessions of their own
- Featured-product / ingredients / gift — next walkdown session
- Hero pixel-diff <1% — open-ended P-HERO-CONTENT-LIFT

Unacceptable:
- Quiet defers (no parking entry pointing at the next action)
- Council debate before /systematic-debugging has produced no hypothesis
- /capture-lesson before validation across ≥2 sections or session end
- Skipping the trace shakeout (Step 4)
- Skipping the bucket-router regression check

## Why this revision (panel synthesis)

- **Brand first** (architecture + adversarial + pragmatist agreed) — closest to passing → fastest workflow validation
- **Drop trust-bar/social-proof from walkdown** (architecture + adversarial + pragmatist) — schema decisions, wrong work shape
- **Split metric** (pragmatist + evidence) — universality (attribute-coverage% ≥ 95%) ≠ fidelity (pixel diff < 1%); separate goals
- **Expected-rules baseline** (evidence lens, single highest-leverage add) — catches silent misses like yesterday's @media regex bug
- **Council only when /systematic-debugging fails** (architecture + pragmatist) — debate isn't free; empirical gap analysis has ground truth
- **1-round council with forced perspectives** (architecture + adversarial + evidence) — 3 rounds is ceremony; persona assignment prevents anchoring; ≥3 evidence citations per rater
- **Lessons at session end** (architecture + adversarial + pragmatist) — premature generalisation pollutes blub.db; draft-rules.md accumulator + batch promote
- **Honest 2-section target** (adversarial + pragmatist) — 7 sections × 50 min = 6 hours; 1 session is brand + hero, defer rest

## Data + tools (mandatory utilisation)

| Source | Use for |
|---|---|
| `sgs-framework.db` via `db_lookup.py` | Every recognition + extraction vocabulary lookup |
| `block_supports` (370 rows) | WP native style.* attr emission |
| `block_attributes` (1406 rows) | Schema + canonical_slot + role |
| `property_suffixes` (117 rows) | CSS-prop ↔ SGS-attr-suffix |
| `modifier_suffixes` | Breakpoint + corner + side + state suffixes |
| `slot_synonyms` | Canonical slots + aliases + standalone_block routing |
| `block_compositions` + `block_selectors` | Pattern structure + per-block selectors |
| uimax `ui-ux-pro-max.db` | Design intelligence — palettes, fonts, UX rules |
| NEW: `expected-rules-<boundary>.jsonl` | Per-section CSS-rule baseline for silent-miss detection |
| NEW: `convert-trace-<boundary>.jsonl` | Per-decision evidence chain |
| `pipeline-state/<run>/leftover-buckets.json` + `trace.jsonl` + `extract.json` | Existing gap + decision logs |

| Tool | When |
|---|---|
| `/sgs-db block <slug>` / `stats` / `context <client>` | DB inspection |
| `/library-docs` | WP supports + block.json + style API |
| `/systematic-debugging` | Per-section log analysis BEFORE council |
| `/qc` (forced perspectives, 1 round) | Only when /systematic-debugging produces no clear hypothesis |
| `/qc-inline` | Self-check during implementation |
| `/dispatching-parallel-agents` | When 2+ universal fixes can ship in parallel (worktree isolation) |
| `/brainstorming` | Trust-bar/social-proof schema decisions (deferred to own sessions) |
| `python scripts/pixel-diff.py --selector .sgs-X` (extended with attribute-coverage%) | Per-section split-metric diff |
| `/capture-lesson` | Session end ONLY, batch from draft-rules.md |
| `/delegate` | Pick model per agent dispatch |
| `/sgs-update` | DB role refresh (paired with regression check) |

## Methodology rules (BINDING — re-state)

- Read logs BEFORE conjecturing (row 254). "Logs" now includes the new `expected-rules-<boundary>.jsonl` + `convert-trace-<boundary>.jsonl`
- Multi-rater /qc panel BEFORE every commit (row 255). Pre-work commit, fix commits, cross-cutting batch
- Per-section cropped pixel diff via `--selector .sgs-{section}` (row 256). Now PAIRED with attribute-coverage%
- DB-first lookups — check `.claude/db-tables-map.md` BEFORE adding any hardcoded dict (row 260, Rule 11 HARD-GATE)
- Don't skip Playwright on legacy path (row 261, Rule 12 HARD-GATE)
- UNIVERSAL solutions only — section drives discovery; fix commits at flaw-class scope
- NEVER `return ob_get_clean()` / `return sprintf()` in render.php
- NEVER set `"source": "html"` on dynamic block attrs
- Default time estimates LOW (`~/.claude/rules/time-estimates.md`) — but the panel called out yesterday's plan as 2-3× over; v3 budget is honest

## Live state on sandybrown

- Post 65 (cv2 output): `/2026/05/15/spec16-p7-converter-v2-output-2026-05-15/`
- Post 66 (mockup baseline): `/2026/05/15/spec16-p7-mockup-baseline-2026-05-15/`
- Both refreshed 2026-05-17 ~09:48
- mamas-munches.css deployed 2026-05-17

## Credentials

`.claude/secrets/credentials.yml` (gitignored). Sandybrown WP REST at `.claude/secrets/sandybrown.env`. SSH alias `hd`.
