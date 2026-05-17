---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-18-wp-alignment-width-system
recommended_model: sonnet
generated: 2026-05-17
plan_revision: v7 (post brand walkdown + 11 parked fixes shipped)
---

You are a senior SGS Framework architect implementing **P-WP-ALIGNMENT-WIDTH-SYSTEM** — the architectural fix that unblocks brand pixel-diff (and all cross-client cloning fidelity downstream of it).

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-18-wp-alignment-width-system"`

## THE PROBLEM (one-paragraph summary)

Brand pixel-diff against raw mockup file:// is stuck at 47-58% because WP's `single.html` post template constrains `.entry-content` to `max-width: 800px` while the raw mockup has no theme wrapper. Sections that author themselves at non-WP-aligned widths (like brand's `max-width: 1000px`) get capped at 800. The hero-clone-poc at https://sandybrown-nightingale-600381.hostingersite.com/hero-clone-poc/ proves the architecture works: PAGE template (`page.html`, no constraint) + `alignfull` class on the hero block = perfect clone of the mockup hero at 1440×n.

## THE FIX (Bean's directive, 2026-05-17)

Two layers, both within WordPress block-theme conventions:

1. **Per-client `contentSize` / `wideSize` in theme.json style variations.** Each client's `theme/sgs-theme/styles/{client}.json` gets `settings.layout.contentSize` + `wideSize` derived from the mockup CSS section widths. Per-viewport variants supported.

2. **sgs/container `widthMode` attr** — enum `default | wide | full | custom` × per-viewport (Mobile/Tablet/Desktop). When `widthMode="full"` block emits `alignfull` class to escape `.entry-content`. When `"wide"` emits `alignwide`. When `"custom"` emits inline max-width.

Full implementation plan + reading list in `.claude/parking.md` under **P-WP-ALIGNMENT-WIDTH-SYSTEM** (phases A-F).

## ALWAYS-LOAD invocations (in this order)

1. `/autopilot`
2. `.claude/parking.md` → search `P-WP-ALIGNMENT-WIDTH-SYSTEM` — the full architecture + reading list + phases A-F
3. `.claude/state.md` — frontmatter contract, blockers, 13-commit list
4. `.claude/handoff.md` — 2026-05-17 session close summary
5. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md` — top 5 binding rules

## Reading list (load in order, ~20 min total)

1. **Live evidence — hero-clone-poc page-source diff:**
   - https://sandybrown-nightingale-600381.hostingersite.com/hero-clone-poc/ (the working clone)
   - https://sandybrown-nightingale-600381.hostingersite.com/2026/05/15/spec16-p7-converter-v2-output-2026-05-15/ (the not-working post 65)
   - Use Playwright to inspect both: parent chain, classList, getComputedStyle on `.sgs-hero` / `.sgs-brand`
2. **`theme/sgs-theme/theme.json`** — current `settings.layout.contentSize` + `wideSize` values
3. **`theme/sgs-theme/styles/mamas-munches.json`** — does the style variation override layout? (probably not yet)
4. **`plugins/sgs-blocks/src/blocks/hero/block.json`** — find `supports.align` declaration. This is what lets hero use `alignfull` on hero-clone-poc.
5. **`plugins/sgs-blocks/src/blocks/container/block.json`** — current sgs/container schema, no `align` support yet
6. **`plugins/sgs-blocks/src/blocks/container/render.php`** — current `sgs-container--width-{wide|content|full}` class emission. New `widthMode` work extends this.
7. **`plugins/sgs-blocks/src/blocks/container/style.css`** — current `.sgs-container--width-wide` CSS rules (max-width: 1200px etc.)
8. **`/wp-block-development` skill** — `supports.align` block.json semantics + alignment behaviour
9. **`/wp-block-themes` skill** — theme.json layout configuration + style variations
10. **WordPress docs (web fetch):**
    - https://developer.wordpress.org/themes/global-settings-and-styles/settings/layout/
    - https://developer.wordpress.org/block-editor/reference-guides/block-api/block-supports/#align
11. **`.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md`** §7 stages 3-7 (converter pipeline reference)
12. **`.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md`** — slot-aware DOM walker (where new lift rules will plug in)

## Skills to Invoke

| Skill | When |
|-------|------|
| `/brainstorming` | Architecture decisions on per-viewport widthMode UX |
| `/gap-analysis` | Grade the implementation before commit |
| `/lifecycle` | If skill/agent edits needed |
| `/research` | If specific WP alignment behaviour needs verifying |
| `/strategic-plan` | Plan phases A-F + cross-block container changes |
| `/systematic-debugging` | If pixel-diff doesn't drop as expected post-fix |
| `/qc` | Multi-rater panel BEFORE every commit touching converter/pipeline/SGS block logic (binding rule #2) |
| `/qc-inline` | Self-check during implementation |
| `/sgs-wp-engine` | All SGS framework work |
| `/sgs-update` | Refresh sgs-framework.db after new container attrs land |
| `/wp-block-development` | New container attrs, supports.align semantics |
| `/wp-block-themes` | theme.json layout config, style variations |
| `/wp-wpcli-and-ops` | theme.json reload, cache purge |
| `/library-docs` | If specific WordPress API needs verification |

## MCP Servers & Tools

| Tool | What for |
|------|---------|
| `mcp-wordpress` REST | Inspect/update sandybrown posts 65 + hero-clone-poc (verify template) |
| `playwright` | Compare hero-clone-poc vs post 65 DOM/computed-style + re-screenshot brand after fix |
| `chrome-devtools-mcp` | Live DOM inspection if Playwright misses something |
| `python scripts/pixel-diff.py --selector .sgs-brand` | Per-section split-metric diff |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | Block schema + style variation queries |
| `gh` CLI | If a PR is the right way to ship the multi-block container change |

## Agents to Delegate To

| Agent | When |
|------|------|
| Sonnet via `/delegate` | sgs/container widthMode attr addition (~1 hr, mechanical extension of existing widthMode patterns) |
| Sonnet adversarial | Cerebras replacement in /qc panel (Cerebras still unreliable per 2026-05-18 session) |
| `wp-sgs-developer` agent | If theme.json + container changes need WP-specific judgement |

## Research Approach

The hero-clone-poc is the existence proof — read its rendered HTML first, then verify the mechanism in WP docs, then implement the same pattern on sgs/container. No external research needed beyond the WordPress block API + theme.json docs. The /research-check tier should be enough if any question comes up.

---

## Task 1 — Discovery + reference reading (~30 min)

Read the 12 items in the reading list above. Anchor the implementation in WP-native conventions before writing code.

Specifically confirm:
- What does `theme.json:settings.layout` look like in the current SGS theme?
- What does `supports.align` look like in sgs/hero's block.json (the working example)?
- Does WP's `alignfull` mechanism use negative margins or a different escape technique?
- Can theme.json style variations override `settings.layout.contentSize` per-client?

## Task 2 — Per-client contentSize/wideSize lift (~1.5 hrs)

Stage 0.5 or 0.7 of `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` (CSS-lift) gains a new helper `_detect_client_layout_widths(css_rules) -> dict`:
- Scan top-level section CSS for `max-width` values
- Take MIN of declared section widths as `contentSize` candidate
- Take MAX as `wideSize` candidate
- Per-viewport: read `@media` query overrides for these properties → emit mobile/tablet/desktop variants

Write the values to `theme/sgs-theme/styles/{client}.json` under `settings.layout.contentSize` / `wideSize`. Idempotent — re-running shouldn't keep growing the file.

## Task 3 — sgs/container widthMode attr (~1 hr)

Add to `plugins/sgs-blocks/src/blocks/container/block.json`:
- `widthMode`: enum `["default", "wide", "full", "custom"]` (default "default")
- `widthModeMobile`, `widthModeTablet`, `widthModeDesktop`: same enum (default "")
- `customWidth`, `customWidthMobile`, `customWidthTablet` already exist — reuse for `custom` mode

In `container/render.php`:
- Read widthMode attrs (per-viewport)
- When `widthMode="full"` add `alignfull` class to wrapper class list
- When `"wide"` add `alignwide`
- When `"custom"` emit inline `max-width: {customWidth}{customWidthUnit}`
- When `"default"` no override (inherits theme contentSize via existing `sgs-container--width-content` class)
- Per-viewport: emit scoped `<style>` block that switches `max-width` per `@media` breakpoint

Also: add `"align": ["wide", "full"]` to `supports` in container's block.json so WP's alignment API recognises the block.

## Task 4 — Converter wiring (~30 min)

In convert.py `_lift_root_supports_to_style` (where `max-width` is currently lifted as `style.dimensions.maxWidth`):
- Compare lifted max-width to client's `contentSize` / `wideSize` (from theme.json)
- If matches contentSize → emit `widthMode: "default"`
- If matches wideSize → emit `widthMode: "wide"`
- If is "none" / "100vw" → emit `widthMode: "full"`
- Else → emit `widthMode: "custom"` + `customWidth` (current behaviour)

This makes the lift convention-aware instead of always emitting custom max-width.

## Task 5 — Verification (~30 min)

1. Re-run pipeline on Mama's mockup
2. Push to post 65 (keep on `single.html` template to test alignfull escape works on a constrained parent)
3. Re-measure brand pixel-diff vs file:// raw mockup at 3 viewports
4. Expected: ≤5% on at least one viewport
5. Bonus: change post 65's template to `page.html` (via `_wp_page_template` post-meta) — should match hero-clone-poc behaviour

## Task 6 — Multi-rater /qc panel + commit (~20 min)

Per binding rule #2 — 4 raters before any commit touching converter/pipeline/block logic. Same dispatch shape as 2026-05-17 (Sonnet universality + Haiku DB + Sonnet optimality + Sonnet adversarial). Cerebras still unreliable — use Sonnet adversarial as 4th rater.

## Task 7 — Session close + handoff (~15 min)

Walk `.claude/docs-registry.yaml` per binding rule. Update every doc that the architecture-fix work touched. Capture lessons.

## Guardrails

- **Read pipeline-state evidence BEFORE conjecturing** (binding rule, blub.db row 254)
- **Multi-rater /qc panel BEFORE every commit** (rule 255) — Sonnet + Haiku + Gemini Flash + Sonnet-adversarial
- **Per-section cropped pixel diff** (rule 256) — `--selector .sgs-{section}`
- **QC raters MUST assert file artefacts** (2026-05-19 rule) — when artefact is .jsonl/.json/.png/.html, include `ls` + `wc -l` + `head -1` schema check
- **DB-first lookups** (rule 260)
- **`<tag <?php echo`** — ALWAYS leading space before `<?php echo $wrapper_attrs` (2026-05-17 bug)
- **`function_exists()` guard** on every top-level helper in render.php
- **Default time estimates LOW** per `~/.claude/rules/time-estimates.md`
- **Handoff walks docs-registry** at session end (binding rule)
- **NO Co-Authored-By footer in commits** (recurring correction)
- **Commit message specificity** — name the parking entry closed + the trigger
- **Hero-clone-poc URL** = https://sandybrown-nightingale-600381.hostingersite.com/hero-clone-poc/ — read its DOM before implementing

## Definition of done (HONEST budget)

Must close in-session:
- ✓ theme.json contentSize/wideSize lifted into mamas-munches.json from mockup CSS
- ✓ sgs/container widthMode attr (Default/Wide/Full/Custom × per-viewport) shipped with WP-native align class emission
- ✓ Converter emits widthMode based on contentSize/wideSize comparison
- ✓ Brand pixel-diff at ≤5% on at least one viewport
- ✓ Multi-rater /qc panel ran + ratified
- ✓ Backwards-compat verified (existing posts without widthMode default to current behaviour)
- ✓ Handoff walks the docs registry

Acceptable explicit defers:
- Per-viewport widthMode UI affordances in the editor inspector (operator-facing)
- Theme-side Customiser exposure of contentSize/wideSize (Bean has done this on other sites — could be follow-up)
- Sweep across other clients' style variations

Unacceptable:
- Quiet defers (no parking entry pointing at the next action)
- Skipping the discovery phase (Task 1) and going straight to implementation
- Treating wrapper-context as "measurement noise" again — it's a real architectural fix
- Committing without /qc panel
