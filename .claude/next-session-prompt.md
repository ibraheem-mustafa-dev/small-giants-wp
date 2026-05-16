---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-20-redeploy-coverage-metric-then-hero
recommended_model: sonnet
generated: 2026-05-19
plan_revision: v5 (post brand-walkdown universal lift)
---

You are a senior SGS Framework architect resuming Spec 16 Phase 9 — brand walkdown verification and hero walkdown start. The 2026-05-19 session shipped the universal core-block CSS lift across 3 commits on `main` (HEAD `8444d4e4`). Two blockers must close before brand walkdown can produce honest before/after numbers: redeploy baseline + extend coverage metric.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-20-redeploy-coverage-metric-then-hero"`

## ALWAYS-LOAD invocations (in this order)

1. `/autopilot`
2. Read `.claude/handoff.md` — 2026-05-19 brand walkdown summary
3. Read `.claude/state.md` — frontmatter contract, blockers, recommended_model
4. Read `.claude/parking.md` — 5 new entries from this walkdown
5. Read 4 binding methodology rules in `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md`:
   - `feedback_qc_panel_must_assert_file_existence` (new 2026-05-19 — when artefact is a file, raters MUST assert file appears with non-zero bytes + schema check)
   - `feedback_read_leftover_buckets_before_conjecturing` (row 254)
   - `feedback_multi_model_qc_before_commit` (row 255)
   - `feedback_per_section_cropped_pixel_diff` (row 256)

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Architectural decision on whether to ship the parent-qualified tag-selector smarter guard or park further |
| `/gap-analysis` | Grade the coverage-metric extension before shipping |
| `/lifecycle` | If any skill/agent/pipeline edits are needed |
| `/research` | If a coverage-metric design question needs sourcing |
| `/strategic-plan` | Plan hero walkdown loop after brand closes |
| `/systematic-debugging` | Per-section log analysis on hero |
| `/qc` | Multi-rater panel before every commit touching converter/pipeline (binding rule #2) |
| `/qc-inline` | Self-check during implementation |
| `/sgs-wp-engine` | All SGS Framework work — block dev, mockup-to-blocks, design QA |
| `/sgs-update` | If DB role refresh is bundled with cross-cutting batch |
| `/wp-block-development` | If new attribute work touches block.json schema |
| `/capture-lesson` | Session end ONLY, batch from in-session findings |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `mcp-wordpress` (REST) | Update sandybrown post 65 with new converter block_markup |
| `playwright` | Re-screenshot brand at 3 viewports after redeploy |
| `chrome-devtools-mcp` | DOM inspect if pixel-diff shows unexpected residuals |

## Agents to Delegate To

| Agent | When |
|------|------|
| Sonnet via `/delegate` | Implementation of coverage-metric extension (~30 min, mechanical, well-spec'd) |
| Sonnet adversarial via `/delegate` | Cerebras replacement in the next /qc panel (Cerebras still unreliable per 2026-05-18 + 2026-05-19 sessions) |
| `wp-sgs-developer` | If post-65 redeploy needs REST + cache invalidation work |

## Research Approach

None of the planned tasks need fresh external research. The coverage-metric extension reuses `_CORE_BLOCK_STYLE_MAP` from convert.py as ground truth.

---

## Task 1: Redeploy sandybrown post 65 with new converter output (~20 min)

P-PHASE9-REDEPLOY-BASELINE. Run full-page `/sgs-clone` on Mama's homepage. Extract the brand section's `block_markup` from extract.json. Update sandybrown post 65 (`/2026/05/15/spec16-p7-converter-v2-output-2026-05-15/`) via REST API (mcp-wordpress) OR wp-admin. Hostinger edge cache purge if needed. Verify the new `image.style.scale`, `image.style.dimensions.maxHeight`, `heading.style.typography.fontSize` etc. render in the page DOM.

## Task 2: Extend `compute_attribute_coverage` to count nested style.* paths (~30 min)

P-COVERAGE-METRIC-CORE-STYLE. Modify `scripts/pixel-diff.py compute_attribute_coverage` to walk nested `*.style` dicts in extracted_attrs. For each leaf path, derive the equivalent CSS property via the `_CORE_BLOCK_STYLE_MAP` inverse lookup (style.color.text → `color`, style.typography.fontSize → `font-size`, etc.). Mark expected-rule as covered if any of its declarations match.

Multi-rater /qc panel before commit (Sonnet + Haiku + Gemini Flash + Sonnet adversarial — Cerebras still skip). **Apply the new binding rule: every rater MUST assert the pixel-diff diff.json contains the expected `attribute_coverage.covered_rules` count via end-to-end command + file inspection, not just behavioural-equivalence.**

## Task 3: Re-run brand pixel-diff at 3 viewports + measure honest delta (~10 min)

After Task 1 + 2 ship, re-run:

```bash
python scripts/pixel-diff.py \
  --mockup "<sandybrown post 66>" --sgs "<sandybrown post 65>" \
  --selector ".sgs-brand" --viewport 1440x900 \
  --out reports/brand-walkdown-2026-05-20/diff-1440x900.json \
  --expected-rules pipeline-state/<latest>/expected-rules-b1.jsonl \
  --extracted-attrs reports/brand-walkdown-2026-05-20/brand-attrs.json
```

Expected: coverage% should jump from 18.75% toward 60-80% (subject to remaining tag-only-selector gaps parked as P-PARENT-QUALIFIED-TAG-LIFT). Pixel diff% should drop materially if the lift translates to visible style application.

## Task 4: Branch on evidence + park or fix (~variable)

- If coverage% ≥ 95% on brand-scoped denominator AND pixel diff ≤ 5% → brand converter-DONE, move to hero
- If coverage% < 95% → run /systematic-debugging on the trace + expected-rules diff; single hypothesis → DB-first fix → multi-rater /qc commit gate
- If parent-qualified tag-selector gap proves to bite (≥-1 attr/section consistently across hero too) → unpark P-PARENT-QUALIFIED-TAG-LIFT, implement smarter guard

## Task 5: Open hero walkdown (~60-90 min if time remains)

Same loop as brand. Run single-section command:

```bash
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --client mamas-munches --page homepage \
  --section "section.sgs-hero" \
  --converter-v2 --no-scaffold-new-blocks \
  --skip-register --skip-autonomy-gate \
  --mode draft --debug-trace
```

Read evidence in order: expected-rules-b1.jsonl → convert-trace-b1.jsonl → leftover-buckets.json → extract.json per_section_results → pixel-diff with split-metric. Branch on coverage% per Task 4 rules.

Council /qc only if /systematic-debugging produces no clear hypothesis. Sonnet adversarial as Cerebras replacement.

## Guardrails

- **Binding rule reminders:** Read pipeline-state evidence BEFORE conjecturing (row 254). Multi-model /qc BEFORE every commit (row 255). Per-section cropped pixel diff (row 256). **NEW: QC raters MUST assert file artefacts exist with expected content (2026-05-19 rule).**
- **DB-first lookups:** check `.claude/db-tables-map.md` before adding any hardcoded dict (row 260).
- **Don't break the canary:** hero=62, trust-bar=6. Shakeout after every fix.
- **Never `return ob_get_clean()` / `return sprintf()` in render.php.** Never set `"source": "html"` on dynamic block attrs.
- **Default time estimates LOW** per `~/.claude/rules/time-estimates.md`.
- **Handoff walks docs registry** — every doc in `.claude/docs-registry.yaml` checked at session end.
- **Worktree cleanup:** `git worktree remove --force .claude/worktrees/agent-afad3a430908ba2fc` if confirmed stable.
