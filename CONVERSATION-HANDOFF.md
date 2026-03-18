# SGS WordPress Framework — Session Handoff — 2026-03-16

## What Changed This Session (SGS WP Ecosystem)

This session focused on **tooling and methodology** for the SGS WordPress Framework, not direct block/theme code changes. No code was deployed to palestine-lives.org. The previous WP handoff (2026-02-27) remains the active implementation state.

### 1. Agent Renamed: wp-developer → wp-sgs-developer

**What:** The generic `wp-developer` agent was renamed to `wp-sgs-developer` to distinguish it from general WordPress work. The new name starts with `wp-` for easy reference.

**Files changed:**
- `~/.claude/agents/wp-sgs-developer.md` — NEW (created with updated description, fidelity comparison mode added)
- `~/.claude/agents/wp-developer.md` — DELETED
- 6 config files updated with the rename:
  - `~/.claude/CLAUDE.md` — agent list
  - `~/.claude/MY-SETUP-GUIDE.md` — agent reference table
  - `~/.claude/commands/handoff.md` — agent routing suggestion
  - `~/.claude/agents/project-manager.md` — routing table (`wp-developer` → `wp-sgs-developer`)
  - `~/.claude/agents/design-reviewer.md` — cross-reference to WP agent
  - `~/.claude/projects/C--Windows-System32/memory/MEMORY.md` — agent list

**What the new agent adds over the old:**
- Description explicitly mentions fidelity comparisons and SGS client sites
- New "Fidelity Comparison Mode" section with instructions to load `references/fidelity-comparator.md`
- Gemini comparison tool usage documented:
  ```bash
  python ~/.claude/skills/site-reviewer/scripts/gemini-design-review.py \
    --compare ref.png target.png --breakpoint desktop \
    --ref-url <reference> --target-url <target>
  ```

### 2. SGS Fidelity Comparator Built (NEW — Not Yet Executed)

**What:** A specialised comparison methodology that compares an SGS-built site against a reference site and produces SGS-actionable fixes. This is NOT the generic site-reviewer — it knows SGS blocks, attributes, tokens, and classifies fixes by mechanism.

**Design spec:** `~/.claude/specs/2026-03-15-sgs-fidelity-comparator-design.md`

**Reference doc:** `~/.claude/skills/sgs-wp-engine/references/fidelity-comparator.md` — detailed 6-phase methodology:

| Phase | What | Tools |
|-------|------|-------|
| 1. Extract Reference | wp-site-extraction via SSH (colours, fonts, sections, block content) | SSH, WP-CLI |
| 2. Map Sections → SGS Blocks | `sgs-db.py match` with confidence thresholds (75%+: direct, 50-74%: try, <50%: flag) | sgs-db.py |
| 3. Screenshot + Visual Comparison | Playwright at 375/768/1440px, Gemini `--compare` mode | Playwright, Gemini |
| 4. Attribute Diff | Chrome DevTools computed styles, only for Gemini-flagged sections (<8/10) | Chrome DevTools MCP |
| 5. Classify & Fix | Mechanical decision tree: content → tokens → attributes → theme.json → plugin code | Decision tree |
| 6. Verify & Loop | Section-level re-screenshot, max 3 loops before escalation | Playwright, Gemini |

**Fix classification decision tree (mechanical, no judgement):**
```
Text/image content? → WP editor (wp post update)
Colour/font mismatch? → Token exists? → Block attribute / Add token (theme.json)
Spacing/layout? → Attribute exists? → WP-CLI / Spacing token / Feature gap (plugin)
Visual effect? → Block supports? → Block attribute / Feature gap (plugin)
Structural? → Block editor reorder
```

**Fidelity definition:** "Match or exceed" = same sections, same visual impact, same UX quality — using SGS blocks and tokens (never hardcoded). Where SGS can improve on the reference (better accessibility, responsive behaviour), it should. Every intentional divergence flagged and justified.

**Tolerance rules:**
| Property | Tolerance |
|---|---|
| Font size | +/- 1px |
| Padding/margin | +/- 4px |
| Colour | Exact for brand colours; +/- 5% lightness for neutrals |
| Border radius | +/- 2px |
| Line height | +/- 0.05 |

### 3. sgs-wp-engine SKILL.md Updated

**Two additions to the skill file:**

1. **Skill routing table** — new row:
   ```
   | Fidelity comparison | Load fidelity-comparator.md |
   ```

2. **Reference guides table** — new row:
   ```
   | fidelity-comparator.md | Comparing SGS site against a reference — 6-phase loop with fix classification |
   ```

### 4. Gemini Design Review Script Extended

**File:** `~/.claude/skills/site-reviewer/scripts/gemini-design-review.py`

**What was added:** A `--compare` mode that sends TWO screenshots in a single Gemini API call for side-by-side comparison.

**Usage:**
```bash
python gemini-design-review.py \
  --compare ref-screenshot.png target-screenshot.png \
  --breakpoint desktop \
  --ref-url <reference-url> \
  --target-url <target-url>
```

**How it works:**
- Both images are base64-encoded and sent as inline data parts in one API request
- A comparison-specific prompt asks Gemini to:
  - Identify matching sections between the two screenshots
  - Score each section's similarity (1-10)
  - List specific visual differences per section
  - Note where the target is actually better than the reference
- Returns structured JSON with per-section scores and diffs
- 90-second timeout (vs 60 for single review) to handle the larger payload
- Shares the same API key fallback chain as single-review mode

**New prompt structure:** `COMPARISON_PROMPT` constant with `{{` escaped braces for `.format()` compatibility.

### 5. Site-Reviewer CMX GREEN Test (Passed)

The site-reviewer agent (`~/.claude/skills/site-reviewer/SKILL.md`) was tested on cmx-group.com:
- Full 9-layer pipeline completed
- Gemini cross-validation: WORKING
- Deep L4 visual analysis: WORKING (Gemini 8/10, Claude 6/10)
- PageSpeed API fallback to Playwright-based capture worked when quota exhausted
- Report: `~/site-reviews/cmx-group-2026-03-15-v2.md`

This validates the site-reviewer + Gemini integration for future use in fidelity comparisons.

### 6. Search-Conversations Agent Created

**File:** `~/.claude/agents/search-conversations.md`

**Why:** The `episodic-memory:remembering-conversations` skill tries to dispatch a `search-conversations` subagent type, but it didn't exist. The plugin ships with a prompt template (`prompts/search-agent.md`) but doesn't register the agent itself.

**What it does:** Uses Haiku model, has access to `mcp__plugin_episodic-memory_episodic-memory__search` and `mcp__plugin_episodic-memory_episodic-memory__read` tools. Searches historical conversations, reads top 2-5 results, synthesises findings in max 1000 words.

### 7. OC-to-CC Gap Analysis and Asset Porting

**Spec:** `~/.claude/specs/2026-03-16-sgs-wp-gap-analysis.md`

**What:** Systematic comparison of OpenClaw workspace assets vs Claude Code tooling, followed by porting everything useful.

**28+ assets ported from OC:**
- Design-compare tool (650-line JS with token validator, a11y audit, perf check)
- `brand.json` (brand identity data)
- `rubric.yaml` (quality rubric)
- 6 AI prompts (design review, content audit, etc.)
- 6 QA JavaScript scripts
- Touch audit tool
- Marketing playbook
- Automation discovery document
- 3 Indus comparison data files
- Invoice pipeline

### 8. Five WP Skills Ported to Claude Code

**Skills added:**
- `wp-playground` — WordPress Playground workflows (local instances, blueprints, debugging)
- `wp-abilities-api` — WordPress Abilities API integration
- `wp-phpstan` — PHPStan static analysis for WordPress
- `wp-project-triage` — Deterministic WordPress repo inspection
- `wpds` — WordPress Design System components and tokens

CC now has **14 WP skills** total.

### 9. Five Style Variations Deployed

Deployed to the project directory:
- **Healthcare** style variation
- **Construction** style variation
- **Professional** style variation
- **Mosque** style variation
- **Eye-care** style variation

### 10. Spec vs DB Gap Analysis

- Block grades: all NULL (no blocks graded)
- Supports coverage: only 42-58% of blocks have colour/typography/spacing supports
- 5 new style variations not registered in the DB
- 0 weaknesses logged

### 11. Competitive Analysis

**Spec:** `~/.claude/specs/2026-03-17-wp-competitive-analysis.md`

| Competitor | Blocks | Strengths |
|---|---|---|
| Spectra | 43 | SGS's base (Astra ecosystem) |
| Kadence | 45 | Best AI integration |
| GenerateBlocks | 6 | Best performance (smallest footprint) |
| Greenshift | 100+ | Sleeper hit — animation powerhouse |

**SGS advantages:** Fluid typography, design tokens, WCAG 2.2 AA, curated font pairings.

**Competitor monitor reference doc** created. **n8n workflow** built (needs Firecrawl + Telegram env vars).

### 12. Other Porting Work

- Synced Gemini `--compare` mode to OpenClaw
- `wp-sgs-developer` agent rewritten as full SGS WordPress employee (not just a generic WP dev)

## Current State of SGS WordPress

- **Live site:** palestine-lives.org — unchanged this session
- **Branch:** main — clean, pushed (from 2026-02-27 session)
- **Hero block:** 3 known bugs from last session (heading colour, secondary CTA, content width) — NOT fixed yet
- **Design-reviewer agent changes:** May need partial reverting (service card gradients)
- **Fidelity comparator:** Built but NOT executed — ready to run against reference site
- **Framework:** 55 blocks, 619 attributes, 25 design tokens, 2 style variations, 25 patterns
- **Style variation:** indus-foods (Montserrat headings, Source Sans 3 body, teal/amber palette)

## Known Issues / Blockers (WP-specific)

1. **Hero heading invisible** — `headlineColour` in DB is `#424242` but renders as `var(--wp--preset--color--surface)` (white). Either post content was changed by previous agent or caching issue
2. **Hero secondary button solid teal** — should be transparent, renders solid
3. **Hero no content width control** — no `contentWidth` attribute in block.json
4. **Hero split image scales forever** — no max-height on `.sgs-hero__media`
5. **Design-reviewer made incorrect changes** — service card gradients all set to same teal (should differ)
6. **Full colour audit incomplete** — blocked by hero bugs
7. **DB stale** — block grades all NULL, 5 style variations not registered, 0 weaknesses logged
8. **Supports coverage low** — only 42-58% of blocks have colour/typography/spacing supports
9. **n8n competitor workflow** — needs Firecrawl + Telegram env vars configured before it will run

## Next Priorities for SGS WordPress

1. **Audit all SGS agents and skills** — Use `skill-auditor`, `agent-auditor`, `skill-optimiser`, and `agent-optimiser` before relying on any of the ported tools. Many were ported from OC without testing in CC context.
2. **Fix hero block bugs** — Existing plan at `docs/plans/2026-02-27-hero-fixes.md` (4 code fixes: heading colour, secondary CTA, content width, split image)
3. **Validate WP Playground locally** — Test the newly ported `wp-playground` skill with a real SGS project
4. **Execute Indus migration** — First real test of the fidelity comparator pipeline. Run against lightsalmon-tarsier-683012.hostingersite.com → palestine-lives.org
5. **Update DB** — Register 5 new style variations, populate block grades, log weaknesses, improve supports coverage

## Files Modified This Session (WP Ecosystem Only)

```
~/.claude/agents/wp-sgs-developer.md                              NEW (renamed + fidelity mode)
~/.claude/agents/wp-developer.md                                  DELETED
~/.claude/agents/search-conversations.md                          NEW
~/.claude/agents/project-manager.md                               renamed reference
~/.claude/agents/design-reviewer.md                               renamed reference
~/.claude/skills/sgs-wp-engine/SKILL.md                           fidelity routing + reference table
~/.claude/skills/sgs-wp-engine/references/fidelity-comparator.md  NEW (6-phase methodology)
~/.claude/skills/site-reviewer/scripts/gemini-design-review.py    --compare mode added
~/.claude/specs/2026-03-15-sgs-fidelity-comparator-design.md      NEW (design spec)
~/.claude/CLAUDE.md                                               agent rename
~/.claude/MY-SETUP-GUIDE.md                                       agent rename
~/.claude/commands/handoff.md                                      agent rename

# Added in late session (2026-03-16/17):
~/.claude/specs/2026-03-16-sgs-wp-gap-analysis.md                  NEW (OC↔CC gap analysis spec)
~/.claude/specs/2026-03-17-wp-competitive-analysis.md              NEW (Spectra/Kadence/GenerateBlocks/Greenshift)
~/.claude/skills/wp-playground/SKILL.md                            NEW (ported from OC)
~/.claude/skills/wp-abilities-api/SKILL.md                         NEW (ported from OC)
~/.claude/skills/wp-phpstan/SKILL.md                               NEW (ported from OC)
~/.claude/skills/wp-project-triage/SKILL.md                        NEW (ported from OC)
~/.claude/skills/wpds/SKILL.md                                     NEW (ported from OC)
~/Projects/small-giants-wp/ (5 style variations)                   NEW (healthcare, construction, professional, mosque, eye-care)
~/.claude/agents/wp-sgs-developer.md                               REWRITTEN (full SGS employee agent)
# 28+ ported OC assets (brand.json, rubric.yaml, 6 prompts, 6 QA scripts, design-compare tool, etc.)
# n8n competitor monitor workflow (needs env vars)
# Competitor monitor reference doc
```

## Relevant Tooling

### Skills
| Skill | When |
|-------|------|
| `/sgs-wp-engine` | All SGS WP work — invoke first, loads context |
| `/wp-site-extraction` | Phase 1 of fidelity comparison — extract reference design |
| `/wp-block-development` | Hero block fixes (render.php, block.json, edit.js) |
| `/superpowers:brainstorming` | Before WP Playground skill design |
| `/superpowers:writing-skills` | Building WP Playground as a new skill |
| `/superpowers:executing-plans` | Working through hero-fixes.md plan |
| `/firecrawl:firecrawl-cli` | Research WP Playground approaches |

### Agents
| Agent | Responsibility |
|-------|---------------|
| `wp-sgs-developer` | ALL SGS WordPress code — blocks, theme, deploy, fidelity comparison. Must follow plans step-by-step. |
| `design-reviewer` | Screenshot comparison only. Must NOT make autonomous changes. |
| `test-and-explain` | Post-deploy verification in plain English |

### Key Infrastructure
- SSH: `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73`
- WP path: `~/domains/palestine-lives.org/public_html`
- WP admin (both sites): username: Claude, password: 49LyNdp%%T@0@2$VbLnALVt1
- Reference site: lightsalmon-tarsier-683012.hostingersite.com
- Target site: palestine-lives.org
- Style variation: indus-foods
- sgs-db.py: `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py <command>`
- Deploy: tar method documented in previous handoff (2026-02-27)

## Next Session Prompt

```
/superpowers:using-superpowers

SGS WordPress Framework had a MAJOR tooling session: 28+ assets ported from OC, 5 WP skills added (14 total), 5 style variations deployed, competitive analysis completed, DB gaps identified. Agent rewritten as full SGS employee. No code deployed to palestine-lives.org — hero bugs from 2026-02-27 still pending.

Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then:

1. **Audit all SGS agents and skills first** — Before using any ported tools, run `skill-auditor` and `agent-auditor` across the SGS-related skills and agents. Many were ported from OC without CC testing. Fix issues before relying on them.

2. **Fix hero block bugs** — Follow plan at docs/plans/2026-02-27-hero-fixes.md. Four fixes: heading colour render bug, secondary CTA transparent bg, contentWidth attribute, split image max-height. Delegate to `wp-sgs-developer`.

3. **Validate WP Playground locally** — Test the `wp-playground` skill with a real SGS project to confirm it works in CC context.

4. **Execute Indus migration** — First real test of the fidelity comparator. Run against lightsalmon-tarsier-683012.hostingersite.com → palestine-lives.org. Invoke `/sgs-wp-engine`, load `references/fidelity-comparator.md`, use `sgs-db.py context indus-foods` first. Delegate to `wp-sgs-developer`.

5. **Update DB** — Register 5 new style variations, populate block grades, log weaknesses. Current state: grades all NULL, 42-58% supports coverage, 0 weaknesses.

Critical context:
- Agent is now `wp-sgs-developer` (rewritten as full SGS employee, not generic WP dev)
- Gap analysis spec: ~/.claude/specs/2026-03-16-sgs-wp-gap-analysis.md
- Competitive analysis: ~/.claude/specs/2026-03-17-wp-competitive-analysis.md
- SSH: ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73
- WP admin (both sites): username: Claude, password: 49LyNdp%%T@0@2$VbLnALVt1
- Reference: lightsalmon-tarsier-683012.hostingersite.com | Target: palestine-lives.org
- Style variation: indus-foods
- Gemini API: main key rate-limited, use GOOGLE_API_KEY_FREE fallback
- design-reviewer agent must NOT make autonomous changes — give explicit instructions only
- n8n competitor workflow needs Firecrawl + Telegram env vars before it will run
```
