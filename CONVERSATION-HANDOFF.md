---
recommended_model: sonnet
session_tag: small-giants-wp-2026-05-03-sgs-button-architecture
---

# Session Handoff — 2026-05-03

## Completed This Session

1. Investigated the recogniser's silent attribute coverage gap on sgs/hero. Result: 6/48 attributes extracted (12%), missing `splitImage`, every responsive variant, all colour overrides. Root cause: hand-written fingerprints. Bean's directive — fingerprints must be auto-derived from `block.json` so attribute extraction can never silently skip declared attributes.
2. Prototyped recogniser v2 at `tools/recogniser-v2/extract.py` — per-section CSS harvest using BS4's native selector engine + recursive @media block parsing. On the mamas hero: 17 block attributes auto-extracted, 27 CSS rules harvested, classified into block-attribute / universal / one-time-custom buckets.
3. Architecture pivot agreed with Bean: build `sgs/button` (canonical SGS button block) + `sgs/multi-button` (container, accepts 0..N sgs/button via InnerBlocks) instead of extending `core/button` or attaching a "Match Style" extension to every CTA-rendering block. Composition over extension.
4. Universal CSS foundations applied to `core-blocks-critical.css`: `* { box-sizing: border-box }`, `img { max-width: 100%; height: auto; display: block }`, canonical `@media (prefers-reduced-motion: reduce)` rule. Cleanup: removed 4 redundant per-block reduced-motion blocks across `core-blocks.css` and `back-to-top.css`.
5. Mama's heading typography aligned with mockup in `mamas-munches.json`: h1/h2/h3 lineHeight `1.2`, h1 letterSpacing `-0.022em`, h2 `-0.015em`, h3 unstyled. Added `styles.css` field carrying mockup-faithful focus-visible rule (2px solid `var(--text)`, border-radius 4px, offset 2px) — site-specific override of framework's 3px default.
6. Dispatched competitor button research (Spectra, Kadence, GenerateBlocks, Stackable) via background Sonnet subagent — output spec at `.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md` (read this file FIRST in next session — it informs the build). Spec includes a 387-line comparison matrix, 10 gaps identified, 2 over-engineering items moved to P2, and a final 87-attribute `block.json` skeleton.
7. Wrote `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md` covering the recogniser v2 architecture (schema-driven, all-CSS-harvest, forward-only, composition emitter for sgs/multi-button + sgs/button output).
8. Updated `.claude/architecture.md` with three new architectural decisions (#19 SGS Button Architecture, #20 Recogniser v2, #21 Universal CSS foundations).
9. Updated `.claude/specs/02-SGS-BLOCKS.md` plugin structure to add sgs/button + sgs/multi-button blocks with cross-references to spec 11.
10. Updated `.claude/specs/common-wp-styling-errors.md` with 6 new failure-pattern entries (section L) capturing this session's architectural mistakes.
11. Committed all changes (final commit on main after this handoff) + uploaded mockup images (IDs 21–25) to sandybrown WP media library so the upcoming hero clone has assets ready.

## Current State
- **Branch:** `main` at `aca8d72`
- **Tests:** no test suite at framework level; existing builds compile
- **Build:** unaffected (no JS/PHP changes touched the build pipeline)
- **Uncommitted changes:** none in tracked files; untracked items are stale next-session prompts and other-client `.claude/` dirs
- **Live deploy state (sandybrown):** universal CSS additions NOT yet deployed (need scp + cache flush after dispatch session lands)

## Known Issues / Blockers
- **Hero perfect-clone is blocked behind the button architecture build.** sgs/hero needs to be refactored to use InnerBlocks (sgs/multi-button → sgs/button) before its CTAs can render correctly. Don't attempt the hero clone until block architecture lands.
- **Existing block instances on sandybrown will need migration** — sgs/hero, sgs/cta-section, sgs/product-card all currently render CTAs internally via attributes (`ctaPrimaryText`, etc.). Refactoring to InnerBlocks composition needs a deprecation/migration path so existing posts don't break with "unexpected content" errors. See parking P-6, P-7, P-9 for related cleanup items.
- **3 reduced-motion rules outside the CSS cleanup scope** (`dark-mode.css`, `header-modes.css`, `reading-progress.css`) may now be redundant. Parking P-8.

## Next Priorities (in order)
1. **Read** `.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md` — the competitor research output. This is the input spec for the build.
2. **Build sgs/button block** — full attribute surface from the spec, dynamic block (`render.php` + `save: () => null`), supports `stylePreset: 'off'|'primary'|'secondary'` binding, all the per-breakpoint typography + spacing controls. ~2–3h.
3. **Build sgs/multi-button block** — container, InnerBlocks restricted to `sgs/button`, layout direction + per-breakpoint gap + alignment, default template auto-includes 2 sample buttons. ~2–3h.
4. **Build button-presets settings page** — clone the Business Details admin pattern (`includes/forms/class-form-admin.php` style). Two presets × full attribute set + hover states. Saves to `wp_options`. ~1.5h.
5. **theme.json mirror** — emit CSS custom properties from preset values so theme.json variations can override per-client. ~30min.
6. **Refactor existing CTA-rendering blocks** (sgs/hero, sgs/cta-section, sgs/product-card, sgs/feature-grid once it exists) — replace internal CTA attributes with InnerBlocks slot containing default `sgs/multi-button` template. Add deprecation paths so existing posts migrate cleanly. ~3–4h.
7. **QC** — visual diff vs mockup at 1440 + 375. Block validation check via Playwright + `wp.data.dispatch`. Handoff doc.

## Files Modified
| File | What changed |
|------|--------------|
| `theme/sgs-theme/assets/css/core-blocks-critical.css` | Added 3 universal foundation rules (box-sizing, img, prefers-reduced-motion canonical) |
| `theme/sgs-theme/assets/css/core-blocks.css` | Removed 3 redundant per-block prefers-reduced-motion blocks (footer-links, nav submenu, column hover, universal) |
| `theme/sgs-theme/assets/css/back-to-top.css` | Removed 1 redundant prefers-reduced-motion block |
| `theme/sgs-theme/styles/mamas-munches.json` | h1/h2/h3 typography aligned with mockup; added `styles.css` raw with mockup focus-visible rule |
| `tools/recogniser-v2/extract.py` | New 600-line Approach-B forward-only extractor: schema-driven attributes + all-CSS harvest + classification |
| `.claude/state.md` | Phase moved to sgs-button-architecture; decisions logged |
| `.claude/mistakes.md` | 3 new lessons (extension-vs-composition, fingerprints-from-block.json, all-CSS-every-time) |
| `.claude/parking.md` | 4 new parking items (P-6 to P-9) |

## Notes for Next Session
- **Dispatch the build via `/dispatching-parallel-agents` with Sonnet subagents.** Bean's explicit instruction. Independent work units: (A) sgs/button block, (B) sgs/multi-button block, (C) settings page. Then dependent unit (D) refactor existing blocks after A+B finish. QC + visual diff + handoff inline at the end.
- **Block deprecation pattern is documented in CLAUDE.md** — see `plugins/sgs-blocks/CLAUDE.md` "Gotchas" section. Static-block-with-existing-instances needs `deprecated.js` v1 with `save: () => null` + `migrate()` if attributes rename. Mostly relevant for the refactor step.
- **Two settings already on Mama's site:** Business Details (Settings > Business Details) and Style Variation activated. Button presets settings page goes alongside Business Details.
- **Sandybrown live state:** images 21–25 uploaded, style variation active. After button architecture deploys, hero post 8 will need updating (but only after block deprecation paths confirmed safe).
- **Recogniser-v2 hero output is byte-stable** but inert until sgs/hero is refactored to support `splitImage` extraction properly. Don't run extract.py against the live hero again until after refactor.
- **The four critic-reviews from the earlier session converged on "use WordPress as the serialiser, not a Python re-implementation"** — that's exactly what InnerBlocks composition gives us automatically, so we're now on the architecturally correct path.

## Next Session Prompt

~~~
recommended_model: sonnet
session_tag: small-giants-wp-2026-05-03-sgs-button-architecture

You are a senior SGS WordPress framework developer. This session is a focused architectural build: replace usage of `core/button` across the framework with a new `sgs/button` block + `sgs/multi-button` container, plus a button-presets settings page and refactor of existing CTA-rendering blocks to use InnerBlocks composition.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-03-sgs-button-architecture"`

Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then **read the button spec at `.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md` FIRST** — it's the input spec for this entire session.

## Where You Are

Plan: button architecture build (10–13h focused session)
Active phase: **sgs-button-architecture** — creating canonical SGS button blocks + presets system + refactor of existing CTA-rendering blocks
Progress: foundation laid in 2026-05-03 session (universal CSS, Mama's typography, recogniser v2 prototype, competitor research)
Next task: read the spec, plan the dispatch, kick off Sonnet subagents.

## Skills to Invoke

| Skill | When |
|-------|------|
| `/brainstorming` | Architectural decisions during the build |
| `/strategic-plan` | Plan implementation order before kicking off subagents |
| `/dispatching-parallel-agents` | **MANDATORY** — Bean explicit instruction. Use Sonnet subagents for parallel build, not inline |
| `/sgs-wp-engine` | All SGS WordPress block work |
| `/wp-block-development` | block.json, edit.js, render.php specifics |
| `/wp-interactivity-api` | If button needs Interactivity API state for preset binding |
| `/visual-qa` | After deploy — 8-layer SGS QA pipeline |
| `/handoff` | End of session |

## MCP Servers & Tools

| Tool | What for |
|------|---------|
| `mcp__plugin_playwright_playwright__*` | Block validation testing in editor + visual diff after deploy |
| `mcp__wp-blockmarkup` | Validate block markup schemas during refactor |
| `mcp__wp-devdocs` | Confirm WP hooks for InnerBlocks composition + block deprecation |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Heavy SGS WordPress block builds (mandatory per CLAUDE.md) |
| `design-reviewer` | After deploy — verify hero CTAs match mockup at 375 / 1440 |

## Tasks (in order)

### Task 1: Read the spec + plan dispatch (15 min)
Open `.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md`. Identify:
- Final attribute list for sgs/button (from competitor comparison + over-engineering check)
- Any unexpected gaps the research surfaced
- Implementer notes / quirks

Then plan the dispatch: which subagents, what each owns, dependencies.

### Task 2: Dispatch Sonnet subagents in parallel (90 min wallclock for the longest branch)
Via `/dispatching-parallel-agents`:
- **Agent A**: build `sgs/button` block — block.json from spec, edit.js, render.php with stylePreset binding, style.css, deprecation skeleton
- **Agent B**: build `sgs/multi-button` container — block.json restricted-children-to-sgs/button, edit.js with default template, render.php for layout, style.css for per-breakpoint gap + alignment + flex direction
- **Agent C**: build button-presets settings page — clone `includes/forms/class-form-admin.php` pattern, save to `wp_options`, expose to theme.json via filter
- **Agent D** (after A + B finish): refactor sgs/hero, sgs/cta-section, sgs/product-card to use InnerBlocks composition with default `sgs/multi-button` template; add deprecation paths

### Task 3: theme.json mirror + per-site values (30 min)
Add `settings.custom.buttonPresets` to `theme.json`. Update `mamas-munches.json` with mockup-aligned preset values (primary = coral pink filled, secondary = outline). CSS custom properties wire from theme.json into the button block via `--wp--custom--button-presets--*`.

### Task 4: Build + deploy + visual diff (60 min)
`npm run build`, deploy via tar method (see framework CLAUDE.md), clear LiteSpeed + OPcache. Open hero on sandybrown at 1440 + 375. Visual diff against mockup. Run `design-reviewer` agent.

### Task 5: Handoff (15 min)
Run `/handoff`. Document any deprecation issues encountered, any blocks that needed unexpected migration logic, what's left for the actual hero perfect-clone session.

## Guardrails

- Do NOT modify post_content via `wp post update` — hook blocks it. Use Playwright + `wp.data.dispatch` OR (after our 2026-05-03 verification) DB write of canonical markup if dynamic-only.
- Block deprecations are MANDATORY when changing static-block save() output. See `plugins/sgs-blocks/CLAUDE.md` Gotchas section.
- Branch discipline: framework changes go to `main`. If branching for stable-by-feature work, use `feat/sgs-button-architecture`.
- Universal CSS foundations from 2026-05-03 are committed but NOT YET DEPLOYED. Deploy them in this session along with the new blocks (single tar deploy).
~~~
