---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-18-section-by-section-walkdown
recommended_model: opus
generated: 2026-05-17
---

You are a senior SGS Framework architect opening **Spec 16 Phase 9 — section-by-section walkdown to <1% pixel diff**. The 2026-05-17 session shipped 10 commits closing 7 distinct recognition + conversion flaws on the Mama's Munches canary (176 → 243 extracted attrs, +38%). Architecture is DB-driven and the pass condition is now precise: **each class section on Mama's mockup hits <1% per-section pixel diff at 375 / 768 / 1440px viewports**.

This session is iterative, section-by-section, with full logs + a research-council-style debate panel per section. Universal rules surface FROM the section-by-section work, not before it.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-18-section-by-section-walkdown"`

## ALWAYS-LOAD invocations (in this order)

1. `/autopilot` — session-start dispatcher + ADHD support
2. Read `.claude/handoff.md` — yesterday's 10-commit summary
3. Read `.claude/state.md` — phase frontmatter
4. Read `.claude/parking.md` — open backlog
5. Read the 3 binding methodology rules in `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md`:
   - Read leftover-buckets BEFORE conjecturing (blub.db row 254)
   - Multi-rater /qc panel BEFORE every commit (row 255)
   - Per-section cropped pixel diff (row 256)
6. Read the 2 captured rules embedded as HARD-GATEs in `/sgs-clone` SKILL.md:
   - DB-first lookups, no hardcoded dicts (row 260, Rule 11)
   - Default to full pipeline; don't skip Playwright (row 261, Rule 12)

## Pass condition (per Bean 2026-05-17)

**Each class section on Mama's mockup hits <1% pixel diff vs mockup baseline at all 3 viewports (375 / 768 / 1440px), with full debug logs proving every recognition + lift decision was correct.**

The pass condition is NOT "test 2 mockups" — that's long-term. The pass condition is **cross-section coverage on one mockup**, because Mama's mockup contains 7 different class sections with 7 different block compositions + content shapes. Closing all 7 to <1% proves universal applicability across the recognition + conversion surface.

## Pre-work — instrument convert.py with per-decision tracing (~30-45 min)

**Why:** Current run artefacts are sparse. `pipeline-state/<run>/trace.jsonl` only emits 9 stage-4 events (one summary per section). `leftover-buckets.json` shows GAPS but not the CONVERSION DECISIONS that led to them. Without per-decision trace, `/systematic-debugging` and the /qc council can only diagnose from gap symptoms, not from the cause chain.

**Action:** Add a structured trace emitter to `convert.py`:

1. New file `pipeline-state/<run>/convert-trace-<boundary_id>.jsonl` per section
2. Each line: `{ts, boundary_id, section_id, decision_type, target, source_css, css_property, suffix_matched, attr_name, attr_value, status, reason}`
3. Emit events at every lift decision:
   - `css_rule_seen` — a CSS rule was inspected for a slot element
   - `suffix_matched` — a property suffix matched the rule's css_property
   - `attr_set` — a value was assigned to attrs
   - `attr_skipped` — value extraction failed (reason: not_in_schema, already_set, kind_inference_failed, value_empty, etc.)
   - `media_query_routed` — a @media block was routed to a breakpoint suffix
   - `walker_branch_taken` — which walker path emitted the block (FR1 / composite-element / SGS-BEM-wrapper / pass-through / atomic-text / fallback)
   - `db_lookup` — which DB table was queried + the rows returned
   - `value_resolution` — token snap / unit infer / colour parse outcome

Emit via a helper `_trace(decision_type, **kwargs)` writing to the per-boundary file. Append-only JSONL. ~30 min implementation + adopt at all internal decision points.

Result: every recognition gap becomes traceable to a specific line in convert.py + a specific row (or missing row) in the DB.

Multi-rater /qc panel BEFORE commit (binding rule #2).

## Section-by-section walkdown — 7 sections, one at a time

For each section, run the loop below. **Do NOT move to the next section until <1% is achieved OR Bean explicitly defers with reason logged in decisions.md.**

### The per-section loop

**Step A — Targeted single-section run** (~3 min)

Run cv2 on just one section to get focused logs:

```bash
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
    --mockup sites/mamas-munches/mockups/homepage/index.html \
    --client mamas-munches --page homepage \
    --section "section.sgs-<section-name>" \
    --converter-v2 --no-scaffold-new-blocks \
    --skip-register --skip-autonomy-gate \
    --mode draft
```

Per Rule 12, omit `--no-playwright` unless this is a smoke test. If using `--no-playwright`, document why in the run summary.

Outputs to read in order (binding rule #1):
1. `pipeline-state/<run>/leftover-buckets.json` — what wasn't extracted
2. `pipeline-state/<run>/convert-trace-<boundary>.jsonl` — every decision the converter made (after pre-work above)
3. `pipeline-state/<run>/trace.jsonl` — stage-level decisions
4. `pipeline-state/<run>/extract.json` per_section_results — what WAS extracted
5. `pipeline-state/<run>/stage-2.json` match.json — recogniser confidence + ranked candidates

**Step B — `/systematic-debugging` on the logs** (~10-15 min)

Run `/systematic-debugging` with the section's logs as input. The skill walks Phase 1 (reproduce + minimal case) → Phase 2 (hypothesis from log evidence) → Phase 3 (verify hypothesis) → Phase 4 (universal fix).

Output: a numbered list of (issue, log evidence, root cause, fix shape). Save to `pipeline-state/<run>/debug-<section>.md`.

**Step C — `/qc` research-council debate panel** (~15-20 min)

Dispatch 4 parallel agents (Sonnet + Haiku + Gemini Flash + Cerebras via `/delegate`) on the section's debug report. Each agent independently analyses:

- The leftover-bucket entries for this section
- The convert-trace-<boundary>.jsonl decisions
- The pixel-diff numbers at 3 viewports
- The mockup CSS for this section vs what the converter lifted

Each writes a "gap analysis": what's still preventing <1% pixel diff. Format like research-council:

- **Round 1**: independent analysis — each agent's diagnosis (3-5 specific gaps, with log line references)
- **Round 2**: cross-debate — agents see each other's findings and respond (which gaps are universal vs section-specific, which fix has the highest leverage, which would regress other sections)
- **Round 3**: synthesis — consensus on the top 1-3 universal fixes + dissent noted

Output: `pipeline-state/<run>/council-<section>.md` with the 3-round debate.

**Step D — Implement universal fix** (~variable)

Take the council's top recommendation. Implement DB-first (Rule 11 HARD-GATE): if a DB table needs a row added, add it via migration; if convert.py needs a path change, make it universal not section-specific.

Multi-rater /qc panel BEFORE commit (binding rule #2).

**Step E — Re-run + verify <1%** (~5 min)

1. Re-run cv2 single-section
2. Deploy to sandybrown (post 65 update + CSS SCP + OPcache reset)
3. `python scripts/pixel-diff.py --mockup <post-66-url> --sgs <post-65-url> --viewport 375x812 --selector .sgs-<section> --out reports/...`
4. Repeat at 768 + 1440
5. If all 3 viewports <1% → section CLOSED, move on
6. If not <1% → loop back to Step A with a more focused single-issue run

**Step F — Capture the universal rule** (~5 min)

If the fix surfaced a rule that applies beyond this section (e.g. "lifter X should always consult DB table Y"), capture via `/capture-lesson` so it embeds across the 4 layers (workspace + CC memory + blub.db + relevant SKILL.md HARD-GATE).

### Section order (work down the page)

1. **Hero** — currently 68% diff at 768; needs content/padding/font fidelity work. Largest visual section, biggest impact.
2. **Trust-bar** — currently 99.7% across all viewports. Schema/render mismatch (Bean's deferred decision). May need block-shape change (variant enum OR split into 2 blocks). Use `/brainstorming design` at Step D.
3. **Featured-product** — currently 62% across viewports. Per-instance product-card attrs. Tests info-box/composite-element lift breadth.
4. **Brand** — currently 13% at tablet, 32-36% at desktop/mobile. Closest to pass condition. Likely needs P-PHASE9-4 block-root supports lift to land — verify the new code path actually deposits style.* attrs on the rendered DOM.
5. **Ingredients-section** — currently 30-44%. Info-box children — heaviest per-instance lift work.
6. **Gift-section** — currently 48-62%. Same family as ingredients.
7. **Social-proof** — currently 78-81%. Testimonial-slider carousel vs static cards mismatch (deferred). May need block-shape change.

## QC follow-ups (close in parallel with section work)

5 robustness items from yesterday's /qc panel. Bundle as ONE commit when convenient (between sections):

1. **P-PHASE9-5** — Empty-DB defensive assertion in `db_lookup.css_property_suffixes()` (~5 min)
2. **P-PHASE9-6** — `RETIRED_BLOCK_REMAP` future-block guard (~10 min)
3. **P-PHASE9-7** — Pattern PHP audit for SGS-BEM grouping-wrapper assumptions (~15 min)
4. **P-PHASE9-8** — Inline thin `_css_prop_to_suffix()` / `_breakpoint_suffixes()` wrappers in convert.py (~10 lines removed)
5. **P-PHASE9-9** — Rename `_kind_for` → `_value_kind_for_suffix` in db_lookup.py (~3 min)

Multi-rater /qc panel BEFORE commit.

## Cross-cutting opportunity — bucket-router role refresh

56% of `block_attributes` rows (790/1406) have `role=NULL`. The bucket router's `_CONTENT_BEARING_ROLES` filter lets NULL-role rows through, inflating reported failures across EVERY client. Many entries flagged as failures are intentional behaviour defaults (hoverEffect, showMedia, sgsAnimation).

Run `/sgs-update` to backfill NULL roles. Universal — affects every future pipeline run's signal accuracy. ~30 min including verification.

## Data sources + tools (mandatory utilisation table)

| Source | Use for |
|---|---|
| `sgs-framework.db` via `db_lookup.py` | Every recognition + extraction vocabulary lookup |
| `block_supports` table (370 rows) | WP native style.* attr emission |
| `block_attributes` table (1406 rows) | Schema + canonical_slot + role |
| `property_suffixes` table (117 rows) | CSS-prop ↔ SGS-attr-suffix |
| `modifier_suffixes` table | Mobile/Tablet/Desktop + corners + sides + states |
| `slot_synonyms` table | Canonical slots + aliases + standalone_block routing |
| `block_compositions` + `block_selectors` tables | Pattern structure + per-block selectors |
| uimax `ui-ux-pro-max.db` (5,598 rows) | Design intelligence — palettes, fonts, components, UX rules |
| `pipeline-state/<run>/*.json` + `trace.jsonl` + new `convert-trace-<boundary>.jsonl` | Per-decision evidence chain |

| Tool | When |
|---|---|
| `/sgs-db block <slug>` / `match <kw>` / `context <client>` / `stats` | DB inspection |
| `/uimax query <topic>` | Design intelligence |
| `/library-docs "<query>"` | WP supports + block.json + style API |
| `/systematic-debugging` | Per-section log analysis (Step B) |
| `/qc` | 4-rater council panel per section (Step C) AND before every commit |
| `/qc-inline` | Self-check during implementation |
| `/dispatching-parallel-agents` | Multiple sections OR multiple universal fixes in parallel (worktree isolation) |
| `/brainstorming` | Trust-bar schema decision + any 3-path choice |
| `/visual-qa` | SGS multi-frame + parity validator + Superdesign for final per-section sign-off |
| `/playwright` | Multi-viewport capture, computed-style inspection |
| `python scripts/pixel-diff.py --selector .sgs-X` | Per-section cropped diff (binding rule #3) |
| `/capture-lesson` | When universal rule surfaces from section work (Step F) |
| `/delegate` | Pick model per agent dispatch |
| `/sgs-update` | DB refresh + role backfill |

## Methodology rules (BINDING — re-state)

- READ logs BEFORE conjecturing (binding rule #1, row 254). With the new per-decision trace, "logs" means leftover-buckets.json + convert-trace-<boundary>.jsonl + extract.json per_section_results
- Multi-rater /qc panel BEFORE every commit (binding rule #2, row 255). Section closures need both the Step C council debate AND the binding-rule-2 commit-gate panel
- Per-section cropped pixel diff via `--selector .sgs-{section}` (binding rule #3, row 256)
- DB-first lookups — check `.claude/db-tables-map.md` BEFORE adding any hardcoded dict (row 260, Rule 11 HARD-GATE)
- Don't skip Playwright on legacy path (row 261, Rule 12 HARD-GATE)
- UNIVERSAL solutions only — section-by-section workflow surfaces rules; fixes apply across sections
- NEVER `return ob_get_clean()` / `return sprintf()` in render.php
- NEVER set `"source": "html"` on dynamic block attrs
- Default time estimates LOW (`~/.claude/rules/time-estimates.md`)

## Live state on sandybrown

- Post 65 (cv2 output): `/2026/05/15/spec16-p7-converter-v2-output-2026-05-15/`
- Post 66 (mockup baseline): `/2026/05/15/spec16-p7-mockup-baseline-2026-05-15/`
- Both refreshed 2026-05-17 ~09:48

## Credentials

`.claude/secrets/credentials.yml` (gitignored). Sandybrown WP REST creds at `.claude/secrets/sandybrown.env`. SSH alias `hd`.

## Definition of done

Real section-by-section progress means:
- Pre-work: per-decision tracing instrumented in convert.py + emitting to `convert-trace-<boundary>.jsonl`
- **At least 2 sections closed to <1% pixel diff at all 3 viewports** (start with hero + brand since brand is closest to passing)
- For each closed section: `/systematic-debugging` report + 3-round /qc council debate + universal fix shipped + verification artefacts in `reports/`
- 5 QC follow-ups closed in one commit (between sections)
- Bucket-router role refresh shipped (expecting 100+ leftover entries drop with zero code change)
- At least one universal rule captured via `/capture-lesson` if the section work surfaces a cross-section pattern
- All work behind binding-rule-2 multi-rater /qc panels

If a section can't close to <1% in-session, explicit defer with: (a) what the residual gap is, (b) the council debate's conclusion on whether the residual is content-fidelity vs structural, (c) the parking entry pointing at the next-best-action.

If pre-work tracing instrumentation can't ship in-session, drop to a manual approach (read existing trace.jsonl + convert.py code by hand) but flag this explicitly — the council panel's diagnosis quality degrades sharply without per-decision evidence.
