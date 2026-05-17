---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-19-phase-9b-foundation
generated: 2026-05-18
plan_revision: v10 (first orchestration-plan format under new /handoff Gate 6)
---

# Phase 9b foundation — fix the selector mismatches, then close intra-section diffs

You are a senior SGS Framework engineer with deep WordPress block + Gutenberg expertise. Tomorrow's work is Phase 9b foundation: build + deploy the 5 new auto-scaffolded blocks shipped today, fix two selector-mismatch bugs that are masking real pixel-diff measurements, then begin per-section intra-content closure.

## State recap (plain English)

Yesterday we shipped the architectural alignment-width system end-to-end. The cloning pipeline now uses WordPress PAGES (not POSTS), the container block has a per-viewport width-mode picker that uses WordPress's native `alignfull`/`alignwide` system, and the converter detects mockup section widths from CSS and writes them into each client's style variation automatically. We measured per-section pixel-diffs against the Mama's Munches mockup and learned the diffs that remain are inside each section's content (image positioning, typography, padding) — not at the section's width level. Last commits: `758ea302` (5 new auto-scaffolded blocks) → `47727609` (drop dead frontmatter fields) → `07b712f0` (orchestrator wiring), all on main.

Five new blocks were auto-scaffolded yesterday — `sgs/featured-product`, `sgs/footer`, `sgs/gift-section`, `sgs/header`, `sgs/social-proof`. Their render.php each emits the correct `sgs-<block>` class on the wrapper. After build + deploy, the bogus 98.7% footer pixel-diff (matching a stray `<h2>` instead of the real footer wrapper) will collapse, and we'll have honest numbers across all 9 sections.

The autopilot + handoff skills were also restructured yesterday in a late-session meta-skills pass — that's why this prompt looks different from previous ones. New default: main agent on Opus, subagents on sonnet/haiku for mechanical work, methodology guardrails baked in.

## Skills to invoke

| Skill | When |
|-------|------|
| `/brainstorming` | Architectural calls (e.g. "should `__inner` detection go in convert.py or a new helper?") |
| `/gap-analysis` | Grade each fix before commit |
| `/lifecycle` | If any skill/agent/pipeline edits land |
| `/research` | If WP block API behaviour needs verification |
| `/strategic-plan` | Order the section-by-section closure work |
| `/systematic-debugging` | When a section diff doesn't drop as expected post-fix |
| `/qc` + `/qc-inline` | Mandatory before every commit touching converter/pipeline/block logic |
| `/sgs-wp-engine` | All SGS framework work |
| `/sgs-update` | Refresh DB after new block additions / attr changes |
| `/wp-block-development` | New container attrs, supports.align semantics, render.php patterns |
| `/wp-wpcli-and-ops` | theme.json reload, OPcache reset, LiteSpeed purge |

## MCP servers + tools

| Tool | What for |
|------|---------|
| `mcp-wordpress` REST | Push new converter output to page 131; verify mtime advances |
| `playwright` | Multi-viewport screenshots + DOM inspection |
| `chrome-devtools-mcp` | Live DOM inspection if Playwright misses something |
| `python scripts/pixel-diff.py --selector .sgs-{section}` | Per-section cropped diff at 3 viewports |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | Block schema + style variation queries |
| Full orchestrator | `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py … --converter-v2 --client mamas-munches --no-playwright` (`--converter-v2` is REQUIRED — see lesson `feedback_converter_v2_flag_required_for_cv2`) |

## Agents to delegate to

| Agent | When |
|-------|------|
| `wp-sgs-developer` | If WP-specific judgement needed on render.php class emission |
| General-purpose Sonnet subagent | Mechanical edits to scaffolded blocks (style.css + render.php hardening) |
| General-purpose Sonnet subagent | Per-section diff measurement sweep at 768 + 375 viewports |

---

## Task 1 — Build + deploy the 5 new blocks (foundation)

**What:** Compile yesterday's 5 new SGS blocks (featured-product, footer, gift-section, header, social-proof) into the WordPress plugin bundle, deploy to sandybrown, reset OPcache.
**Why:** Without this, `.sgs-footer` selector still matches the stray `<h2 class="sgs-footer-label">` heading on page 131 — the 98.7% footer pixel-diff stays misleading. After deploy, the wrapper class lands and the real number comes out.
**Estimated time:** ~15 min

**Orchestration:**
- Execution: inline (main thread on Opus)
- Reason: short, sequential, every step has a measurable signal (build exit code, scp success, OPcache HTTP 200). Not worth subagent overhead.
- Depends on: none
- Parallel with: Task 2 (the converter regex fix can be edited while build runs)
- /qc gate after: `/qc-inline` (smoke check that build/blocks/footer/render.php contains `sgs-footer` class emission and a curl of page 131 shows `<footer class="...sgs-footer...">`)

**Acceptance:** `curl https://sandybrown-nightingale-600381.hostingersite.com/cv2-output-mamas-munches/ | grep -E '<footer[^>]*sgs-footer'` returns a match.

## Task 2 — Extend `_detect_client_layout_widths` for `__inner` element widths

**What:** The converter regex `_SGS_BEM_BLOCK_ROOT_RE` only accepts block-root selectors. Mama's mockup carries section widths on `__inner` elements (`.sgs-header__inner: 1280px`, `.sgs-trust-bar__inner: 1100px`, `.sgs-featured-product__inner: 1040px`, `.sgs-ingredients-section__inner: 960px`, etc.). Extend the regex to also accept `^\.sgs-[a-z][a-z0-9]*(-[a-z0-9]+)*__inner$` selectors so the detector returns a proper {contentSize, wideSize} pair instead of `{1000, 1000}`.
**Why:** Currently both `contentSize` and `wideSize` get the same value because only `.sgs-brand` (the one block-root with max-width) matched. After the extension, `wideSize ≈ 1280` and `contentSize ≈ 960` will be detected → next orchestrator run will write those into `theme/sgs-theme/styles/mamas-munches.json:settings.layout` correctly.
**Estimated time:** ~25 min (5 min edit + 10 min unit assertion + 10 min orchestrator re-run + verify)

**Orchestration:**
- Execution: delegated (single Sonnet subagent)
- Model: sonnet via /delegate (mechanical regex extension + smoke test; no novel design)
- Dispatch pattern: single-agent via /subagent-prompt
- Brief: "Extend `_detect_client_layout_widths` in `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` to also accept `__inner` element selectors. Update the regex constant + add a unit assertion across 8+ canonical cases (block root / kebab-root / `__inner` / `__title` / `--modifier` / `__element--modifier` / non-SGS). Re-run orchestrator with `--converter-v2 --client mamas-munches` and confirm `theme/sgs-theme/styles/mamas-munches.json:settings.layout` ends up with `wideSize > contentSize`."
- Context the subagent needs: `_SGS_BEM_BLOCK_ROOT_RE` lives in convert.py around line 78. The current regex is `^\.sgs-[a-z][a-z0-9]*(-[a-z0-9]+)*$` (segmented kebab, rejects `--`). The new accept-list adds `__inner` ONLY — not `__title` / `__lead` / `__card` etc. Section T of `.claude/specs/common-wp-styling-errors.md` documents the original BEM regex char-class trap; keep that pattern.
- Depends on: none
- Parallel with: Task 1
- /qc gate after: `/qc-inline` (regex unit assertion green; orchestrator re-run shows different wideSize / contentSize values in mamas-munches.json layout block)

**Acceptance:** `python -c "import json; d=json.load(open('theme/sgs-theme/styles/mamas-munches.json')); l=d['settings']['layout']; print(l)"` shows `wideSize != contentSize` AND both are derived from real `__inner` widths in the mockup.

## Task 3 — Re-measure all 9 sections at 3 viewports (clean baseline post-fixes)

**What:** With Tasks 1 + 2 shipped, re-run per-section cropped pixel-diff across all 9 sections × 3 viewports (1440 / 768 / 375) on page 131. Write the new clean baseline to `state.md` frontmatter and `reports/brand-walkdown-2026-05-19/page131-phase9b-baseline/`.
**Why:** Tasks 1 + 2 should drop footer + header diffs substantially. The other 7 sections' numbers stay roughly the same (intra-section). The new baseline is the input to Task 4's section-by-section parking.
**Estimated time:** ~10 min (27 diffs, parallel-friendly)

**Orchestration:**
- Execution: delegated (single Sonnet subagent)
- Model: sonnet via /delegate (mechanical measurement sweep, 27 invocations of pixel-diff.py)
- Dispatch pattern: single-agent
- Brief: "Run `scripts/pixel-diff.py --selector .sgs-{section} --viewport <vp>` for each of 9 sections × 3 viewports (27 runs). Write outputs to `reports/brand-walkdown-2026-05-19/page131-phase9b-baseline/<section>-<viewport>/`. Produce a summary table with worst-viewport per section, sorted worst-first. Verify no contamination: `curl page 131 | grep -c Notice` should be 0."
- Context the subagent needs: WP_DEBUG_DISPLAY is already false on sandybrown — confirm before running (curl check). Lesson `feedback_wp_debug_display_contaminates_pixel_diff` explains why this matters.
- Depends on: Task 1 + Task 2 (both shipped + deployed)
- Parallel with: none (post-Task-2 only)
- /qc gate after: none (measurement task; output IS the verification)

**Acceptance:** Summary table at `reports/brand-walkdown-2026-05-19/page131-phase9b-baseline/summary.md`; state.md frontmatter `clean_baseline_pixel_diff_2026_05_18` block replaced with the new numbers.

## Task 4 — Open per-section intra-content parking entries

**What:** For each of the 9 sections with residual diff (likely 7 of 9 after Tasks 1 + 2), open a parking entry in `.claude/parking.md` with: screenshot pair (mockup vs page 131 at 1440), root-cause hypothesis, candidate fix shape, estimated fix time.
**Why:** Sets up Phase 9c — actual per-section closure work in subsequent sessions. Each parking entry becomes one short focused session.
**Estimated time:** ~30 min

**Orchestration:**
- Execution: inline (main thread on Opus)
- Reason: Each parking entry requires interpreting visual evidence + framework knowledge + the universal-benefit principle — judgement work, not mechanical.
- Depends on: Task 3 (need the clean baseline numbers)
- Parallel with: none
- /qc gate after: `/qc-inline` (verify each entry follows the standard format; verify entries are framed at root-cause level not symptom level — per the methodology guardrails)

**Acceptance:** `.claude/parking.md` gains entries `P-SECTION-{slug}-INTRA-CONTENT-CLOSURE` for every section with residual diff > 10%. Each entry has: screenshot pair, hypothesis class (image positioning / typography / padding / layout / content), fix-shape sentence, time estimate.

## Task 5 — Commit + handoff (Gate runner)

**What:** Run the new `/handoff` skill at session close. This is the first session whose work the new gates will validate from start (Gate 4.5 registry walk, Gate 4.8 capture-lesson, Gate 3.5 outcome-vs-completion, Gate 2 auto-merge-to-main, Gate 6 orchestration plan).
**Why:** Exercises the methodology gates on a real session, surfaces any gate fragility, gives next-next-session a clean orchestration plan.
**Estimated time:** ~15 min

**Orchestration:**
- Execution: inline (main thread on Opus)
- Reason: the gates need to walk methodically; not delegable
- Depends on: Tasks 1-4 complete
- /qc gate after: none (handoff IS the gate)

**Acceptance:** Next session's `next-session-prompt.md` is written in the orchestration-plan format with concrete tasks for Phase 9c.

---

## Dependency graph

```
Task 1 (inline, Opus) + Task 2 (parallel, Sonnet)
  ↓ both shipped + deployed
Task 3 (Sonnet — measurement sweep)
  ↓ clean baseline captured
Task 4 (inline, Opus — judgement work)
  ↓
Task 5 (inline, Opus — handoff Gate runner)
  ↓
Commit + merge-to-main (auto via Gate 2)
```

## Methodology guardrails (do not skip)

- **Deploy before measure** — any change visible on a live URL requires `npm run build` + tar deploy + OPcache reset BEFORE running any pixel-diff / browser test against that URL. If you skip the deploy, the test is measuring stale output. (Captured 2026-05-18.)
- **Root cause before instance fix** — when a section fails parity, ask "what's the class of failure?" before fixing the specific instance. Section-by-section pixel tuning is the anti-pattern; converter / block-CSS / mockup-convention root causes are what actually compound across clients. (Captured 2026-05-18.)
- **Outcome vs completion** — if the work doesn't hit the stated outcome, do NOT mark the task done. Re-plan or escalate. Code shipped ≠ outcome achieved. (Captured 2026-05-18.)
- **/qc multi-rater BEFORE every commit** touching converter / pipeline / SGS block logic (binding rule blub.db row 255).
- **Per-section cropped pixel-diff** via `--selector .sgs-{section}`, never full-page (binding rule blub.db row 256).
- **`--converter-v2` required** on production orchestrator runs (captured 2026-05-18 — without it the legacy extract path runs silently).
- **WP_DEBUG_DISPLAY must stay false** on staging (captured 2026-05-18 — notices contaminate every pixel-diff by 15-40 points).
- **Plain English first** — every major update/explanation starts with a one-sentence plain-English statement before technical detail. No mid-context jargon openings. (Captured 2026-05-18 communication-standards HARD RULE in autopilot Stage 3.)
- **NO Co-Authored-By footer in commits** (Bean's recurring correction).
