---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-19-phase-9b-intra-section
generated: 2026-05-18
plan_revision: v9 (post full P-WP-ALIGNMENT-WIDTH-SYSTEM cycle close)
---

You are continuing the SGS Framework Phase 9 brand walkdown. P-WP-ALIGNMENT-WIDTH-SYSTEM closed in full on 2026-05-18: pages-not-posts canary surface, widthMode infrastructure, editor InspectorControls, converter wiring through the orchestrator. Your job this session: **Phase 9b intra-section closure.** Start by fixing the two selector-mismatch parking entries (so further measurements are trustworthy), then tackle the largest residual section diffs.

## State (one-paragraph)

Page 131 (`/cv2-output-mamas-munches/`) carries fresh converter output from the full cv2 pipeline run with `--converter-v2 --client mamas-munches`. 376 attrs extracted across 9 sections; 5 widthMode hits in markup; `mamas-munches.json:settings.layout` populated to `{contentSize: 1000px, wideSize: 1000px}` (incomplete because the SGS-BEM block-root regex misses `__inner` element widths — known follow-up). WP_DEBUG_DISPLAY suppressed on sandybrown. Clean per-section diff baseline at 1440 measured — footer 98.7% is the most-broken result and it's a selector-mismatch bug, not a render bug.

## ALWAYS-LOAD invocations (in this order)

1. `/autopilot`
2. `.claude/state.md` — clean-baseline diff matrix in frontmatter
3. `.claude/handoff.md` — 2026-05-18 session close
4. `.claude/parking.md` — 5 new P-* entries opened today
5. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md` — top binding rules (3 new lessons today)

## Reading list

1. `.claude/parking.md` Phase 9b entries:
   - P-FOOTER-WRAPPER-CLASS-MISSING
   - P-HEADER-WRAPPER-CLASS-AUDIT
   - P-DETECT-INNER-ELEMENT-WIDTHS
   - P-UTF8-MOJIBAKE-IN-CONVERTER
   - P-INTRA-SECTION-CLOSURE
2. `plugins/sgs-blocks/src/blocks/footer/render.php` + `plugins/sgs-blocks/src/blocks/header/render.php` — find where wrapper classes are emitted
3. `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` lines 1640-1702 — `_detect_client_layout_widths` (regex extension target)
4. `pipeline-state/mamas-munches-homepage-2026-05-17-105020/` — last cv2 run-dir; inspect `extract.json` + `leftover-buckets.json` BEFORE conjecturing

## Skills to invoke

| Skill | When |
|-------|------|
| `/brainstorming` | Architectural calls (e.g. "should `__inner` detection be in convert.py or its own helper?") |
| `/gap-analysis` | Grade each section-fix before commit |
| `/lifecycle` | Any skill/agent/pipeline edits |
| `/research` | If WP block API behaviour needs verification |
| `/strategic-plan` | Plan the Phase 9b section sweep order |
| `/systematic-debugging` | When a section diff doesn't drop as expected post-fix |
| `/qc` + `/qc-inline` | Mandatory before every commit touching converter/pipeline/block logic |
| `/sgs-wp-engine` | All SGS framework work |
| `/sgs-update` | Refresh DB after any new attr / block change |

## MCP & tools

| Tool | What for |
|------|---------|
| `mcp-wordpress` REST | Push new converter output to page 131; verify mtime advances |
| `playwright` | Multi-viewport screenshots + DOM inspection |
| `python scripts/pixel-diff.py --selector .sgs-{section}` | Per-section cropped diff at 3 viewports |
| Full orchestrator | `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py … --converter-v2 --client mamas-munches --no-playwright` (`--converter-v2` is REQUIRED — see lesson `feedback_converter_v2_flag_required_for_cv2`) |

## Task 1 — selector reliability (~30 min, foundation)

Fix P-FOOTER-WRAPPER-CLASS-MISSING + P-HEADER-WRAPPER-CLASS-AUDIT first. The 98.7% footer diff is comparing the mockup's `<footer>` against a stray `<h2 class="sgs-footer-label">` because the sgs/footer block doesn't emit `.sgs-footer` on its wrapper. Same suspected pattern for header. Add `sgs-<block>` to the wrapper class list in each render.php. Re-measure both sections at 3 viewports; expect material drops on both.

**Verification:** `python -c "import urllib.request, re; html = urllib.request.urlopen('https://sandybrown-nightingale-600381.hostingersite.com/cv2-output-mamas-munches/').read().decode(); m = re.search(r'<footer[^>]*>', html); print(m.group(0) if m else 'no footer')"` — the `<footer>` tag's class attribute must contain `sgs-footer`.

## Task 2 — `__inner` element width detection (~20 min)

Fix P-DETECT-INNER-ELEMENT-WIDTHS. Extend `_detect_client_layout_widths` to also accept `^\.sgs-[a-z][a-z0-9]*(-[a-z0-9]+)*__inner$` selectors as width signals. Re-run orchestrator with `--converter-v2 --client mamas-munches`; expect `mamas-munches.json:settings.layout` to gain a wider `wideSize` (probably ~1280px from `.sgs-header__inner`) and a different `contentSize` (probably ~960-1040px clustered).

**Verification:** confirm `wideSize > contentSize` after the change, and confirm `_detect_client_layout_widths` still rejects non-`__inner` modifier/element shapes.

## Task 3 — UTF-8 mojibake (~30 min)

Fix P-UTF8-MOJIBAKE-IN-CONVERTER. The gift-section promo bar shows `ƒÄë New product launch ÖÇö get 20% off` — CP-1252-as-UTF-8 mojibake. Trace from mockup HTML through `convert.py` to `block_markup` to identify where the encoding flips.

## Task 4 — intra-section closure planning (~30 min)

For P-INTRA-SECTION-CLOSURE, open one parking entry per section in `.claude/parking.md` with: screenshot pair (mockup vs page 131 at 1440), root-cause hypothesis, estimated fix time. Use `/strategic-plan` if more than 5 sections need cross-cutting prep work.

## Task 5 — exercise the new /handoff gates (~15 min)

This session is the first to run under the new `/handoff` Gate 3.5 (Opus default), Gate 4.5 (registry-first walk), and Gate 4.8 (`/capture-lesson` mandatory). Walk through them deliberately and surface anything that feels rough so the gates can be tightened before they ossify.

## Guardrails

- **`--converter-v2` is REQUIRED** on any production orchestrator run (lesson captured 2026-05-18)
- **WP_DEBUG_DISPLAY must stay false** on sandybrown wp-config.php; if pixel-diffs suddenly inflate uniformly, check it first
- **Multi-rater /qc panel** BEFORE every commit touching converter/pipeline/block logic
- **Per-section cropped pixel-diff** via `--selector .sgs-{section}`, never full-page
- **DB-first lookups** when extending convert.py (binding rule)
- **NO Co-Authored-By footer in commits**
- **Test the seed mechanism IS firing** by checking `_LIFT_CONTEXT["theme_widths"]` post-`reset_pipeline_seed()` + first convert_section call

## Definition of done (HONEST budget)

Must close in-session:
- ✓ Footer + header wrapper class emission fixed; re-measured diffs reflect REAL section rendering
- ✓ `__inner` element width detection extended; second orchestrator run produces wider wideSize than contentSize
- ✓ UTF-8 mojibake root-caused (fix may carry to follow-up if encoding-flip is non-trivial)
- ✓ At minimum 3 intra-section parking entries opened with screenshot pairs
- ✓ Handoff exercises the three new gates

Acceptable explicit defers:
- Per-section fixes themselves (each gets its own parking entry; closure happens in subsequent sessions)
- Indus Foods second-client validation (separate session)

Unacceptable:
- Measuring before fixing selector mismatches (numbers won't be trustworthy)
- Skipping the orchestrator re-run after `__inner` detection extension
- Committing without /qc panel
