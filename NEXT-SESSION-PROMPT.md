recommended_model: sonnet
session_tag: small-giants-wp-2026-05-03-sgs-button-architecture

Invoke `/autopilot` before doing anything else.

You are a senior SGS WordPress framework developer specialising in custom Gutenberg block development. This session is a focused architectural build: replace usage of `core/button` across the framework with a new `sgs/button` block + `sgs/multi-button` container, plus a button-presets settings page and a refactor of existing CTA-rendering blocks to InnerBlocks composition.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-03-sgs-button-architecture"`

Read `CONVERSATION-HANDOFF.md` and `CLAUDE.md` for full context, then **read the button spec at `.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md` FIRST** — it's the input spec for this entire session, including the 87-attribute final block.json skeleton and the verbatim competitor research matrix. Also skim `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md` because the recogniser v2 emitter depends on this session's output.

## Where You Are

Plan: `.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md` (button spec) + `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md` (downstream pipeline)
Active phase: **sgs-button-architecture** — build the canonical button block pair + presets system + refactor existing CTA-rendering blocks
Progress: foundation laid in 2026-05-03 session (universal CSS, Mama's typography, recogniser v2 prototype, competitor research → 87-attr final spec)
Next task: read both specs, plan the parallel dispatch, kick off Sonnet subagents.

## What's already done (don't redo)

- Universal CSS foundations applied to `core-blocks-critical.css` — committed to main, NOT YET DEPLOYED to sandybrown. Deploy in this session.
- Mama's `mamas-munches.json` typography aligned with mockup (h1/h2/h3 lineHeight 1.2; mockup-faithful focus-visible in `styles.css`).
- Competitor research complete — sgs/button has a final 87-attribute spec covering Spectra/Kadence/Stackable/core. Don't re-research.
- Recogniser v2 prototype at `tools/recogniser-v2/extract.py` — generalisation deferred until after this session lands.
- Mockup images uploaded to sandybrown (IDs 21–25) for the eventual hero clone.

## Skills to Invoke

| Skill | When |
|-------|------|
| `/autopilot` | FIRST — establishes live skill routing + ADHD support for the session |
| `/brainstorming` | When an architectural decision surfaces mid-build that the spec doesn't already cover |
| `/strategic-plan` | Plan implementation order before kicking off subagents (Section 6 of spec 11 has the phase plan) |
| `/dispatching-parallel-agents` | MANDATORY — Bean's explicit instruction. Use Sonnet subagents for parallel build, not inline |
| `/sgs-wp-engine` | All SGS WordPress block work — block.json, edit.js, render.php standards |
| `/wp-block-development` | Per-block specifics during build |
| `/wp-interactivity-api` | If button needs Interactivity API state for preset binding (probably not — preset is server-rendered via class) |
| `/visual-qa` | After deploy — 8-layer SGS QA pipeline |
| `/gap-analysis` | After each phase ships — grade against the spec's acceptance criteria |
| `/handoff` | End of session |

## MCP Servers & Tools

| Tool | What for |
|------|---------|
| `mcp__plugin_playwright_playwright__*` | Block validation testing in editor; visual diff after deploy at 1440 + 375; `wp.data.dispatch` for safe page-content edits |
| `mcp__wp-blockmarkup` | Validate block markup schemas during refactor |
| `mcp__wp-devdocs` | Confirm WP hooks for InnerBlocks composition + block deprecation |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block sgs/<name>` | Quick attribute lookup on existing SGS blocks during refactor |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Heavy SGS WordPress block builds (mandatory per CLAUDE.md). Dispatch via `/dispatching-parallel-agents`, not inline. |
| `design-reviewer` | After deploy — verify hero CTAs match mockup at 375 / 1440 |

## Tasks (in order)

### Task 1 — Read the spec + plan dispatch (~15 min)

Open `.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md`. Confirm:
- Section 6 phasing matches your build plan
- Section 8's 87-attribute final list is what you'll implement
- Section 5's refactor strategy is sound for sgs/hero, sgs/cta-section, sgs/product-card

Then plan the dispatch: which subagents, what each owns, dependencies. Spec 11 §6 says P1.A + P1.B + P1.C parallelisable; P2 needs P1.C; P3 needs P1.A + P1.B.

### Task 2 — Dispatch Sonnet subagents in parallel (~90 min wall-clock for the longest branch)

Via `/dispatching-parallel-agents` to Sonnet subagents:

- Agent A (sgs/button block): build `plugins/sgs-blocks/src/blocks/button/` — block.json from spec §8, edit.js with all controls grouped into Inspector panels, render.php with `inheritStyle` binding (emits `is-style-primary`/`is-style-secondary`/`is-style-outline` class when not custom; emits inline CSS only when `inheritStyle === 'custom'`), style.css with hover/focus rules + transition controls. Lucide icon rendering via `sgs_render_lucide_icon()` helper.

- Agent B (sgs/multi-button container): build `plugins/sgs-blocks/src/blocks/multi-button/` — InnerBlocks restricted to `sgs/button` children, layout direction + per-breakpoint gap + alignment + wrap, default template auto-includes 2 sample buttons (`{ inheritStyle: 'primary' }` + `{ inheritStyle: 'secondary' }`).

- Agent C (button-presets settings page): build `plugins/sgs-blocks/includes/class-button-presets-admin.php` — clone the Business Details admin pattern. Two presets (primary, secondary) × full attribute set + hover states. Saves to `wp_options.sgs_button_presets` as a structured array.

- Agent D (after A + B finish — refactor existing blocks): refactor sgs/hero, sgs/cta-section, sgs/product-card to use InnerBlocks composition with default `sgs/multi-button` template. Add `deprecated.js` v1 with `migrate()` for each, mapping old `ctaPrimary*`/`ctaSecondary*` attributes to InnerBlocks structure.

### Task 3 — theme.json mirror + Mama's preset values (~30 min)

Add `settings.custom.buttonPresets` schema to `theme.json`. Update `mamas-munches.json` with mockup-aligned preset values (primary = coral pink filled, secondary = outline). Wire CSS custom properties via theme.json so `.is-style-primary` etc. consume `var(--wp--custom--button-presets--primary--background)`.

### Task 4 — Build + deploy + visual diff (~60 min)

- `cd plugins/sgs-blocks && npm run build`
- Deploy via tar method (see framework `CLAUDE.md` deploy commands) to sandybrown
- This deploy ALSO needs the universal CSS foundations from 2026-05-03 — `core-blocks-critical.css` changes haven't shipped yet
- Clear LiteSpeed cache + rm `wp-content/litespeed/css/*` + reset OPcache via HTTP
- Open hero on sandybrown at 1440 + 375. Visual diff against mockup
- Run `design-reviewer` agent

### Task 5 — Handoff (~15 min)

Run `/handoff`. Document any deprecation issues, any unexpected migration logic needed, what's left for the actual hero perfect-clone session (which is the FOLLOW-UP to this one — not part of this session's scope).

## Guardrails

- Don't try the hero clone in this session. That's a separate session after the architecture lands.
- Don't modify post_content via `wp post update` — hook blocks it. Use Playwright + `wp.data.dispatch` OR direct DB write of canonical markup (verified safe in 2026-05-02 test for dynamic-block-heavy content).
- Block deprecations are MANDATORY when changing static-block save() output. Pattern in `plugins/sgs-blocks/CLAUDE.md` Gotchas section.
- Branch discipline: framework changes go to `main`. If you want isolation for this build, use `feat/sgs-button-architecture` then merge.
- Universal CSS foundations from 2026-05-03 are committed but NOT YET DEPLOYED. Deploy them in this session along with the new blocks (single tar deploy).
- After every PHP deploy: clear LiteSpeed cache + OPcache reset via HTTP (CLI is a different pool — confirmed in CLAUDE.md gotchas).

## Other findings from the prep session — context only, NOT this session's scope

The following came up during the 2026-05-03 prep session. They are NOT this session's work, but the implementer should KNOW about them so a refactor doesn't paint over a known issue. Each is parked or will be parked.

| # | Finding | Decision needed (eventually) | Park ID |
|---|---------|------------------------------|---------|
| 1 | sgs/hero needs per-breakpoint headline font size attrs (`headlineFontSizeMobile/Tablet/Desktop`), `splitImageMobileHeight`, `subHeadlineMaxWidth` — 5 new attrs from the hero CSS audit. Question: hero-only block.json additions, OR a typography extension across all blocks with text. | Decide before next mockup section (trust-bar, brand-story) since each will surface the same need | P-10 |
| 2 | Ingredients section in the Mama's mockup has a full-width disclaimer paragraph BELOW the 4-cell ingredient grid — the container is two rows, not just the grid. This shapes the eventual `sgs/feature-grid` build (P-5). | When sgs/feature-grid is built | P-5 (extend) |
| 3 | Featured-product container in Mama's mockup is 2/3 + 1/3 column split (main Zookies card 2/3 width, Trial Pack 1/3 with callout). Quantity picker routes to product page (since flavours/toppings need picking — can't add to basket directly). | When refactoring sgs/product-card to InnerBlocks composition | P-5 (sibling) |
| 4 | Gift-section gift packages are "products formatted differently". Decision: extend sgs/product-card with `variantStyle: gift` OR build new sgs/gift-card block. | Before building the gift section | new park |
| 5 | Block coverage gap audit: cross-cutting task. For every SGS block, list every attribute declared in block.json vs what the recogniser would extract today. Recogniser v2 must auto-derive fingerprints from block.json, so this audit informs the v2 generalisation work. | Before recogniser v2 ships | P-9 |
| 6 | DB-write of canonical block markup is verified safe for dynamic-block-heavy posts (2026-05-02 test, byte-perfect round-trip). Need a documented decision rule: when DB-write vs Playwright + `wp.data.dispatch`. | Document in CLAUDE.md once we've used it 2-3 times | new park |

## Mockup section → SGS block mapping (for the post-architecture clone session)

This table is the input for the FOLLOWING session (hero perfect-clone + remaining sections). NOT this session's work, but useful context for the refactor in Task 2D so the deprecation paths preserve forward compatibility:

| Mamas mockup container | Maps to | Notes |
|-----------------------|---------|-------|
| `site-header` | universal `header.html` template part + sgs/business-info auto-populated nav/cart | already in shape |
| `hero` | sgs/hero (split variant) + sgs/multi-button slot for 2 CTAs | refactor target this session |
| `trust-bar` | sgs/trust-bar OR sgs/trust-badges (4-cell on pink band) | clone-session work |
| `featured-product` | sgs/multi-button or core/columns container + 2× sgs/product-card | clone-session work |
| `brand-story` | sgs/info-box OR core/columns with text + image | clone-session work |
| `ingredients` | sgs/feature-grid (4-cell) + full-width paragraph for disclaimer (P-5 covers feature-grid build) | clone-session work |
| `gift-section` | sgs/feature-grid (or sgs/product-card gift variant — see finding #4) | clone-session work |
| `social-proof` | Trustpilot Mini widget + 3× sgs/testimonial cards (Bean's hybrid choice) | clone-session work |
| `site-footer` | universal `footer.html` template part + sgs/business-info | already in shape |

## Success criteria

This session is done when:

1. `sgs/button` block exists, builds, deploys, and renders correctly with all four `inheritStyle` values
2. `sgs/multi-button` container exists, accepts only sgs/button children, and renders with per-breakpoint layout
3. Button presets settings page is live at `Settings → SGS Button Presets` and saves to `sgs_button_presets` option
4. theme.json mirror exposes preset values as CSS custom properties
5. sgs/hero, sgs/cta-section, sgs/product-card refactored to InnerBlocks composition; existing post content migrates without "unexpected content" errors
6. Hero on sandybrown renders the SGS button block in place of the old internal CTAs (visual diff vs mockup pending — that's the next session)
7. New CONVERSATION-HANDOFF.md written for the hero perfect-clone session
