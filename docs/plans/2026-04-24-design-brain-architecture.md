# Design Brain Architecture — Spec

**Author:** Ibraheem Mustafa + Claude (Opus, max-effort multi-advisor research)
**Date:** 2026-04-24
**Status:** Approved direction; implementation pending
**Stakes:** Foundational restructure that Bean has flagged as "make or break" for SGS revenue work.
**Sources:** Research evidenced by Gemini-Pro × 2 (architecture + operational), Sonnet (Claude-internal verification with file-level grep + Anthropic skills repo benchmarks), Gemini-Flash (community signals from r/SideProject, HN, r/vibecoding, Apr 2026 reports). Cerebras advisor failed (queue saturated); coverage maintained by other 3 angles.

---

## 1. Problem Statement

### What's currently broken
1. **Inconsistent design output** that requires too many fix-and-iterate loops. WCAG drift sneaks through.
2. **Design philosophy is scattered across 3 skills** that don't talk to each other reliably:
   - `/superdesign` (97 lines, opinionated principles) — auto-loaded only by *evaluation* skills, never by *creation* skills. The principles are absent at the moment they matter most.
   - `/frontend-design` (43 lines, anti-AI-aesthetic philosophy) — orphan, content already duplicated in `/innovative-design` Phase 0, never deleted.
   - `/ui-ux-pro-max` (540-line SKILL.md, 11,964 DB rows) — has implicit philosophy in its `ui-reasoning.csv` and `ux-guidelines.csv` but no unified surface; LLMs working from training data instead of the curated DB.
3. **Sub-skill richness gap:** 8 of 13 modifier skills under `/innovative-design` are smaller than the DB content they should consult. They're working from training-data clichés, not curated data.
4. **No "designer/architect" role** before execution. The model defaults to training-data assumptions or competitor mimicry. Builder gets the toolbox before the blueprint exists.
5. **Design judgement (post-creation review)** is monolithic LLM grading — sycophancy, bias collapse, missed regressions. No multi-perspective check.
6. **No self-improvement loop.** Validated client outcomes aren't fed back into the curated DB. The brain doesn't learn from real-world success.
7. **Static skill files can't keep up.** Tailwind v4 evolves; React Server Components pattern shifts; the skill files don't auto-update from official docs.

### What "fixed" looks like
A single design-brain entry point (`/ui-ux-pro-max`) interrogates the brief (interactive Q&A or autonomous research), produces a strict JSON Blueprint that captures brand archetype × pricing tier × top task × competitor positioning × atmosphere × required functionality, then hands the blueprint to a thin execution layer. A multi-bias council (with intentional model heterogeneity) reviews the output. Validated outcomes append to the DB, growing the brain's curated knowledge over time. Static skill files give way to DB queries + library-docs (current standards) + diagnostics + review feedback.

---

## 2. Architectural Decisions (Evidence-Backed)

| Decision | Source / pattern | Why it holds |
|---|---|---|
| **Two-Pass Blueprint Pipeline** (designer-before-router) | MetaGPT (Hong et al. 2023), v0.dev / Lovable / Galileo AI internals; HN Feb 2026 user report: *"v0 ends up paying for mistakes — buggy code because it didn't ask enough questions about the data schema"* | Production AI systems use intermediate JSON blueprint to prevent "premature token commitment" — model paints itself into a corner without a spatial anchor. Lovable's interview-mode is specifically winning on this point per r/SideProject Jan 2026. |
| **`AskUserQuestion` + `context: fork` for the Designer interview**, NOT prose state-machine in SKILL.md | Anthropic skills docs (skill content lifecycle: loaded once, not re-read; competes with conversation pressure); Anthropic's own `feature-dev` plugin uses this exact pattern; neonwatty.com practitioner report | Prose `[CURRENT_STATE: 1_DISCOVERY]` directives drift after 3-4 turns under conversational pressure. Forked subagent context with no prior conversation history is the ONLY architecture that reliably enforces "refuse to propose until constraints filled" in Claude Code. |
| **Archetype × Pricing-Tier → CSS tokens (deterministic mapping)** | Mark & Pearson "The Hero and the Outlaw" (Jung 12 archetypes); Mark Ritson pricing semiotics; Nielsen Norman Group (NN/g) eye-tracking; practitioner mapping matrix at marlostudios.co Feb 2026 | "Alike-but-unique" differentiation is programmable, not subjective. Premium = high whitespace + desaturated + serif. Mass-market = high saturation + dense + heavy sans-serif. Practitioners further refine via 80/20 hybrid blends to avoid pure-archetype clichés. |
| **Core-Utility DOM Anchor** (top task drives spatial layout, aesthetics wrap) | JTBD (Christensen); Top Task Analysis (McGovern); NN/g eye-tracking | If a user comes to a site to use a calculator (the "Top Task"), forcing them past an aesthetic Hero causes friction. Required functionality must be the spatial anchor; aesthetics wrap around it. |
| **Adversarial Triage Council with model heterogeneity** for design review | Mixture-of-Agents (Wang et al. 2024); ChatEval (Chan et al. 2023); Refute-or-Promote Report Apr 2026 (*"80+ agents unanimously endorsed a non-existent vulnerability"*) | Single LLM = sycophancy. Homogenous panels = bias collapse (empirically demonstrated). Diverse priors + different model providers per reviewer is mandatory, not optional. |
| **Council as a Skill stage with main-thread Task calls**, NOT a PostToolUse hook | GitHub Issue anthropics/claude-code#34692: *"hooks do not fire for tool calls made by subagents"*; hooks are shell scripts that can't invoke `Task` tool | Three parallel Claude subagents triggered from a hook is not a supported pattern. Council must be invoked from main thread. |
| **Pre-creation philosophy auto-load via PreToolUse `additionalContext`** | Verified file: `~/.claude/settings.json` lines 397-404 already wires PreToolUse on Skill matcher; Claude Code hooks docs confirm `additionalContext` JSON output enters model context before skill body | Hook returns `{"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": "<philosophy>"}}` — this guarantees philosophy loads at design-creation time (the load-bearing gap today). |
| **Progressive disclosure for the merged skill** (Level 1 / 2 / 3) | Anthropic skills docs: "Keep SKILL.md under 500 lines. Move detailed reference material to separate files." | A 6-mode monolith violates this. Mode-specific behaviour goes in `/references/modes/*.md` as Level 3 files loaded on demand per mode. |
| **Self-improving DB writes only on client-validated outcomes** | Goodhart's law; Sentrux Model Context Protocol (MCP) precedent (r/vibecoding Mar 2026); Aesthetic Decay risk (Gemini-Flash community report) | Validation gate: rows append after client sign-off + 30-day no-revision window. Quarterly diversity audit checks DB variance hasn't collapsed. Prevents the brain from learning from its own taste. |

---

## 3. The New Architecture

### 3.1 The Designer Brain

`/ui-ux-pro-max` is restructured into 6 progressive-disclosure modes. SKILL.md body stays under 500 lines; mode-specific behaviour lives in `/references/modes/`.

```
ui-ux-pro-max/
├── SKILL.md                                    # Level 2 — mode router + canonical CLI + references inventory
├── references/
│   ├── modes/
│   │   ├── designer-interactive.md             # Level 3 — AskUserQuestion + context:fork interview
│   │   ├── designer-autonomous.md              # Level 3 — research-driven brief from client name/brief
│   │   ├── toolbox-handoff.md                  # Level 3 — Blueprint → /innovative-design or direct CLI
│   │   ├── grader.md                           # Level 3 — invoke council; standards lane vs interpretation lane
│   │   ├── ingest.md                           # Level 3 — DB write-back from /sgs-extraction or /design-ref outputs
│   │   └── query.md                            # Level 3 — current CLI lookups
│   ├── superdesign-philosophy.md               # NEW — prose half of merged superdesign content
│   ├── aesthetic-reference.md                  # NEW — surviving uniques from frontend-design
│   ├── blueprint-schema.json                   # NEW — strict JSON contract Designer outputs
│   ├── ingest-contract.md                      # SPLIT from integration-contract.md
│   ├── query-contract.md                       # SPLIT from integration-contract.md
│   ├── correction-ledger.md                    # KEEP
│   ├── data-dictionary.md                      # KEEP
│   ├── base/                                   # KEEP
│   ├── platforms/                              # KEEP
│   └── shared-references/                      # KEEP
├── data/                                       # KEEP — 38 CSVs + 16 stack tables
├── scripts/
│   ├── search.py                               # KEEP — query CLI
│   ├── core.py                                 # KEEP — BM25 + CSV loader
│   ├── ingest-extraction.py                    # KEEP — INGEST already built this session
│   ├── ingest-aria-practices.py … (13 ingest scripts) # KEEP
│   ├── modify.py                               # NEW — `uimax modify --mode <X>` CLI handler (replaces 8 modifier sub-skills)
│   ├── designer.py                             # NEW — orchestrates designer modes A & B
│   ├── council.py                              # NEW — Triage Council dispatcher (4 reviewers via Task tool from caller)
│   └── update-db.py / sync-skill-stats.py      # KEEP
└── hooks/
    └── README.md                               # KEEP
```

### 3.2 The Designer Interview (Mode A — interactive)

**Pattern:** `AskUserQuestion` tool + `context: fork` frontmatter. Forked subagent receives interview directives as its entire prompt. No prior conversation history exists to override the gate.

**Question topics (one at a time, derived from Pentagram constraint framework + Bean's philosophy + new DB tables):**
1. **Purpose & Top Task** — what one job must this site/app do? (jobs-to-be-done)
2. **Target audience** — demographics, expertise level, what they care about, what they're tired of seeing
3. **Brand archetype** (primary 80% + secondary 20%) — Sage / Magician / Ruler / Hero / Lover / Jester / Caregiver / Creator / Outlaw / Innocent / Explorer / Everyman
4. **Pricing tier** — luxury / premium / mid / affordable / budget
5. **Atmosphere & emotional appeal** — friendly / authoritative / playful / serious / family / expert / community
6. **Required functionality** — booking widget / configurator / calculator / product browser / membership portal — and where it must anchor on the page
7. **Competitor positioning** — model-from list / break-from list / industry-default to subvert (Bean's "solicitor-from-Apple" example)
8. **Constraints** — WCAG 2.2 AA (always), framework, performance budget, content available
9. **Differentiation** — what's the one thing someone will remember? ("Differentiator" per Phase 0)

**Exit gate:** explicit `[TRANSITION_TO_BLUEPRINT]` token only when sufficient constraints are filled. Cannot exit on user pressure ("just give me the design") because the forked context has no main-thread pressure.

### 3.3 The Designer Research (Mode B — autonomous)

Given a client name/brief, no live operator:
1. `/research` — quick-tier research on client + their current site + competitor set
2. `/sgs-discover` — find 3-5 reference sites that fit the archetype × tier
3. `/uimax query` — DB lookups for matching palette / typography / styles
4. Compose Blueprint from research findings
5. Surface for Bean's review (only human gate before TOOLBOX phase)

### 3.4 The Blueprint (output of Designer)

Strict JSON conforming to `references/blueprint-schema.json`. Validated by `pipeline-stage-gate.py` via new `~/.claude/pipelines/blueprint-validator.json`. Schema sketch:

```json
{
  "client": {"name": "...", "industry": "...", "audience": "..."},
  "archetype": {"primary": "Sage", "secondary": "Magician", "mix_ratio": [80, 20]},
  "pricing_tier": "premium",
  "top_task": {"description": "Book consultation", "dom_anchor": "sticky-right desktop / scroll-snap mobile"},
  "atmosphere": ["authoritative", "warm", "expert-but-approachable"],
  "differentiation": "Centred hero with watch-crown rotation on scroll — that's what they remember",
  "tokens": {
    "palette": {"dominant": "#0F0D0B", "accent": "#C8A46D", "text": "#F5F0E6", "source": "uimax DB query result"},
    "typography": {"display": "Canela Deck", "body": "Untitled Serif", "source": "uimax DB query result"},
    "spacing_scale": "1.5x (premium archetype)",
    "saturation_profile": "muted-monochrome",
    "animation_curve": "cubic-bezier(0.22, 1, 0.36, 1) 800ms",
    "shadow_scale": "subtle (≤0.10 opacity)"
  },
  "constraints": {"wcag": "2.2 AA", "stack": "Next.js 16", "performance_budget": "Largest Contentful Paint (LCP) <2.5s"},
  "model_from": ["url-1", "url-2"],
  "break_from": ["url-3 (industry default)"],
  "required_components": ["hero", "consultation-booking-widget", "credentials-band", "case-studies", "testimonials"],
  "execution_plan_pointer": "<filled by phase-planner in next stage>"
}
```

### 3.5 The Toolbox (revised — dramatically slimmer)

Bean's question was right: most of the toolbox is vestigial given DB queries + `/library-docs` + `/phase-planner` + diagnostics + QC council. Concrete consolidation:

#### 3.5.1 Skill Consolidation Matrix

| Skill | Lines | Verdict | Replacement | Rationale |
|---|---|---|---|---|
| `colourise` | 173 | **DELETE** | `uimax modify --mode colourise` | DB has 269 colours + 5,164 design tokens — query is richer than skill |
| `bolder` | 146 | **DELETE** | `uimax modify --mode bolder` | DB-backed; skill just routes |
| `quieter` | 118 | **DELETE** | `uimax modify --mode quieter` | DB-backed; skill just routes |
| `normalize` | 81 | **DELETE** | `uimax modify --mode normalize` | DB has 73 typography + 161 ui-reasoning — skill is tiny vs DB |
| `polish` | 215 | **DELETE** | `uimax modify --mode polish` + `/lint` + `/diagnostics` | Existing tools cover spacing/alignment; uimax DB covers shadow/spacing rules |
| `distill` | 137 | **DELETE** | `uimax modify --mode distill` (uses `top_task_templates` table to identify what to keep) | DB-backed |
| `delight` | 317 | **DELETE skill, KEEP content** | `uimax modify --mode delight` + content moves to `philosophy_rules` table (severity: principle) | 317 lines of joy/personality philosophy is real value — moves to DB |
| `adapt` | 299 | **DELETE skill, KEEP content** | `uimax modify --mode adapt --stack <X>` queries the 16 stack tables | DB has 49-60 rows per stack, more current than static skill |
| `harden` | 397 | **DELETE skill, KEEP content** | Council persona "Resilience Reviewer" + content moves to `philosophy_rules` (i18n + edge cases) | i18n / edge cases / overflow are evaluation concerns — fit council |
| `optimise` | 269 | **DELETE skill** | `/wp-perf` + `/wp-perf-gate` + `/library-docs` for current framework perf | Already three perf tools; this duplicates |
| `audit` | 128 | **MERGE INTO `/site-reviewer`** | `/site-reviewer` does 9-layer audit superset | Already flagged for merge in master spec |
| `critique` | 118 | **DELETE skill** | Council persona "UX Sceptic" | Critique IS one of the 3 council biases |
| `tailwind-design-system` | 875 | **REPURPOSE** | `/library-docs tailwind v4` + uimax stacks/html-tailwind table | Static 875 lines vs current docs — library-docs always fresher |
| `clarify` | 179 | **KEEP** | — | Copy/microcopy is content domain, not design; doesn't fit DB shape |
| `extract` | 94 | **KEEP** | — | DOM-active script execution, not a DB lookup |
| `onboard` | 242 | **KEEP** | — | Workflow design specialty (first-run flows); unique enough to stay |
| `interactive-design` | 297 | **KEEP** | — | Animation specialty paired with `/animation-harvest`; unique |
| `teach-impeccable` | 69 | **KEEP** | — | One-time project setup, unique |
| `frontend-design` | 43 | **DELETE** | Already absorbed in `/innovative-design` Phase 0 | Orphan; surviving uniques → `aesthetic-reference.md` |
| `superdesign` | 97 | **MERGE INTO ui-ux-pro-max** | Structured rules → `philosophy_rules` table; prose → `superdesign-philosophy.md` | The whole point of this restructure |

**Net effect:** 13 modifier skills + 4 design skills + 5 keep-as-is + various overlaps → 5 keep-as-is + 1 designer/brain skill + thin toolbox + DB-backed CLI. **From ~22 skills + 1 router to ~7 skills + 1 brain + DB.**

#### 3.5.2 What `/innovative-design` becomes

The router shrinks dramatically. New shape:

```
TOOLBOX router (was Phase 0-5):
  - REMOVE Phase 0 (aesthetic direction) — now lives in Designer interview
  - REMOVE Phase 1 (options-loading check) — Designer always loads DB
  - REMOVE Phase 5 (direct creation) — Designer + phase-planner cover this
  - KEEP a thin classify-and-dispatch:
      "fix spacing"   → uimax modify --mode polish
      "make it pop"   → uimax modify --mode bolder
      "too cluttered" → uimax modify --mode distill
      "needs colour"  → uimax modify --mode colourise
      "tone it down"  → uimax modify --mode quieter
      "fix overflow"  → council persona "Resilience Reviewer" + uimax modify --mode harden
      "rewrite copy"  → /clarify
      "extract pattern" → /extract
      "onboarding"    → /onboard
      "animations"    → /interactive-design
      "responsive"    → uimax modify --mode adapt --stack <X>
      "review this"   → council (full)
      "audit this"    → /site-reviewer
```

**Open question:** is even this thin router needed, or can the Designer hand directly to a CLI/`/phase-planner` for execution? My recommendation: **keep `/innovative-design` as a thin classifier-only router** — its job becomes mapping intent verbs to CLI modes / sibling skills. ~50-line SKILL.md. It's the "fix this small thing" entry point when no Designer phase fired.

### 3.6 The Council (4 reviewers, model-heterogeneous)

| Reviewer | Persona | Model | What it grades |
|---|---|---|---|
| 1 | **Accessibility Hardliner** | Claude Sonnet 4.6 | WCAG 2.2 AA hard standards, contrast, focus states, touch targets, prefers-reduced-motion. Standards lane = deterministic pass/fail. |
| 2 | **Brand Police** | Gemini-Pro | Cross-references output against `archetype_token_matrix` for the Blueprint's archetype × pricing tier. "This is Premium / The Ruler — border-radius 16px is too playful, reduce to 0-4px." |
| 3 | **UX Sceptic** | Cerebras Qwen-3-235b | User friction, confusing copy, broken mental models, top-task-anchor compliance. |
| 4 | **Visual Quality Reviewer** | `/gemini-vision-audit` (existing skill) | Multi-viewport screenshots → Gemini Vision evaluation of rendered output. Catches what text reviewers can't see (visual hierarchy, emotional resonance, "feels right"). |
| Synthesiser | Inline (Opus or Sonnet) | — | Merges 4 gap registers. Standards-lane verdicts override interpretation-lane debate. Final pass/partial/fail with prioritised next-actions. |

**Why 4, not 3:** Bean's `/gemini-vision-audit` skill already exists and produces structured visual audit markdown. Folding it in as a council persona is free — adds visual perception that text reviewers can't give. Multi-modal council > text-only council.

### 3.7 Self-Improvement Loop (Sentrux precedent)

Validated outcomes feed the DB:

```
[design ships]
   ↓
[client sign-off + 30-day no-revision window]
   ↓
[ui-ux-pro-max ingest --mark-validated]
   ↓
[append to DB:]
  - new palette combination → colors table (with archetype/tier metadata)
  - new font pairing → typography (with client-profile JSON)
  - new pattern → component-libraries (with provenance: "shipped for X-archetype/Y-tier in March 2026")
  - new top-task layout → top_task_templates (with industry tag)
  - council gap register → corrections.json (what reviewers caught pre-deploy that turned out to be false positives — fewer false flags over time)

[quarterly diversity audit]
  - check DB variance per dimension (palette, typography, archetype-mix)
  - if variance dropping → diversity decay warning → don't ingest until next ship breaks pattern
```

### 3.8 New SQLite Tables

```sql
CREATE TABLE archetype_token_matrix (
    id INTEGER PRIMARY KEY,
    primary_archetype TEXT,         -- Jung 12: 'The Sage', 'The Jester', 'The Ruler' …
    secondary_archetype TEXT,       -- 80/20 hybrid blend
    mix_ratio_primary INTEGER,      -- e.g. 80
    pricing_tier TEXT,              -- 'budget' | 'mid' | 'premium' | 'luxury'
    whitespace_scale TEXT,          -- 'dense (4px*0.8)' | 'standard' | 'relaxed (4px*1.5)'
    saturation_profile TEXT,        -- 'muted-monochrome' | 'balanced' | 'high-contrast-vibrant'
    typography_weight_profile TEXT,
    animation_curve TEXT,           -- 'cubic-bezier(...) Nms'
    shadow_opacity_max REAL,        -- premium: 0.10; mass: 0.20
    seed_examples_json TEXT         -- ["url-1", "url-2"]
);

CREATE TABLE brand_pillars (
    id INTEGER PRIMARY KEY,
    archetype_id INTEGER,
    pillar_name TEXT,               -- 'Trust', 'Authority', 'Approachability', 'Mystery'
    ui_translation_rule TEXT        -- "Trust = thick borders, low rounded corners"
);

CREATE TABLE top_task_templates (
    id INTEGER PRIMARY KEY,
    industry TEXT,                  -- 'solicitor', 'spa', 'mortgage broker', 'dental'
    top_task TEXT,                  -- 'Book Consultation', 'Get Quote', 'Configure Product'
    dom_anchor_layout TEXT,         -- 'sticky right column desktop / scroll-snap mobile'
    component_hierarchy_json TEXT
);

CREATE TABLE council_personas (
    id INTEGER PRIMARY KEY,
    persona_name TEXT,              -- 'Accessibility Hardliner' | 'Brand Police' | 'UX Sceptic' | 'Visual Quality Reviewer'
    focus_area TEXT,
    evaluation_prompt TEXT,
    severity_weight REAL,
    model_provider TEXT             -- 'sonnet' | 'gemini-pro' | 'cerebras' | 'gemini-vision'
);

CREATE TABLE philosophy_rules (
    id INTEGER PRIMARY KEY,
    domain TEXT,                    -- 'spacing' | 'typography' | 'colour' | 'animation' | 'shadow' | 'a11y' | 'delight' | 'harden'
    rule_name TEXT,
    value TEXT,                     -- the rule's value/threshold
    severity TEXT,                  -- 'standard' (must-pass) | 'principle' (debate-able)
    source TEXT                     -- 'superdesign' | 'delight-skill-migration' | 'harden-skill-migration' | 'bean-philosophy' | 'practitioner'
);
```

---

## 4. Hook Wiring

### 4.1 Pre-creation philosophy auto-load (NEW)

```python
# ~/.claude/hooks/philosophy-autoload.py — PreToolUse on Skill matcher
# Fires before ui-ux-pro-max SKILL.md loads
# Returns: {"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": "<superdesign-philosophy.md content + relevant philosophy_rules>"}}
```

Wired in `~/.claude/settings.json` as a PreToolUse Skill hook with matcher `ui-ux-pro-max`.

### 4.2 Blueprint stage-gate (NEW pipeline JSON)

```json
// ~/.claude/pipelines/blueprint-validator.json
{
  "pipeline_name": "design-brain",
  "stages": [
    {"name": "designer-output", "schema": "ui-ux-pro-max/references/blueprint-schema.json", "next": "council-review"},
    {"name": "council-review", "required_artifacts": ["accessibility-pass", "brand-pass", "ux-pass", "visual-pass"], "next": "execute"},
    {"name": "execute", "next": "post-deploy"},
    {"name": "post-deploy", "next": "ingest-validated"}
  ]
}
```

Existing `pipeline-stage-gate.py` consumes this — zero changes to the gate script itself, just register the new pipeline.

### 4.3 Council dispatcher (NEW skill stage)

`~/.agents/skills/ui-ux-pro-max/scripts/council.py` — dispatches 4 parallel `Task` calls from main thread (Sonnet, Gemini-Pro, Cerebras, gemini-vision-audit), waits for all 4, synthesises gap register. NOT a hook — invoked from the Skill via Bash.

---

## 5. Pipeline Reshaping (the 8 SGS pipelines)

### Pipeline 1 — New Client Build (brief → shipped site)

**Before:**
```
/sgs-discover → /sgs-extraction or /design-ref → /sgs-wp-engine →
/wp-block-themes + /wp-block-development + /interactive-design →
/visual-qa → /deploy-check → deploy
```
*Design philosophy injection: scattered/missing.*

**After:**
```
[NEW] /ui-ux-pro-max DESIGNER (interactive Mode A) →
       Blueprint JSON
   ↓
/sgs-discover (now constrained by Blueprint archetype/tier) →
/sgs-extraction or /design-ref (Blueprint pre-fills target tokens) →
/sgs-wp-engine →
/wp-block-themes + /wp-block-development + /interactive-design (now Blueprint-driven) →
[NEW] uimax modify --mode adapt --stack html-tailwind (replaces /adapt) →
/visual-qa →
[NEW] Council (4 reviewers, model-heterogeneous, gates pre-deploy) →
/deploy-check → deploy →
[NEW] ui-ux-pro-max ingest (after 30-day client-validation window)
```
*Design philosophy is in the Blueprint and grounds every downstream stage.*

**Critique loop:** After first run, do scenarios match? If Blueprint fields are too narrow ("atmosphere" too rigid) → expand interview Q-set. If council fires false positives on premium-tier non-issues → tune `archetype_token_matrix` thresholds.

### Pipeline 2 — WP → SGS Migration

**Before:**
```
/wp-site-extraction → /sgs-extraction → /sgs-wp-engine → /wp-block-development →
/design-review → /visual-qa → /deploy-check
```
*Design decisions implicit; legacy aesthetic gets ported by default.*

**After:**
```
/wp-site-extraction (technical capture) →
/sgs-extraction (current design tokens) →
[NEW] /ui-ux-pro-max DESIGNER Mode A (with extraction artefacts pre-loaded) → asks: "keep current direction OR redesign?" → Blueprint
   ↓
/sgs-wp-engine →
/wp-block-development (Blueprint-driven) →
/design-review →
[NEW] Council pre-deploy →
/visual-qa → /deploy-check
```
*Migration becomes a deliberate design choice, not a default port.*

**Critique loop:** Do clients want a refresh during migration or strict 1:1? Likely both — Blueprint mode fork: "preserve existing" (skip Designer) vs "elevate during migration" (full Designer). Add this as an interview branch.

### Pipeline 3 — Draft → SGS (mockup HTML/JS/image)

**Before:**
```
/design-ref → /clone-patterns → /sgs-wp-engine → /wp-block-development →
/design-review → /visual-qa → /deploy-check
```

**After:**
```
[NEW] /ui-ux-pro-max DESIGNER Mode B (autonomous, given mockup) →
   - extracts implicit Blueprint from mockup
   - flags mockup ambiguities for human resolution
   - Blueprint JSON
   ↓
/design-ref (validate token extraction matches Blueprint) →
/clone-patterns →
/sgs-wp-engine → /wp-block-development →
[NEW] Council pre-deploy →
/visual-qa → /deploy-check
```
*Mockups often have ambiguities (which palette swatch is dominant? what's the brand atmosphere?) — Designer Mode B explicitly resolves these BEFORE block work begins.*

### Pipeline 4 — Audit → Redesign Proposal

**Before:**
```
/site-reviewer → /seo-audit → /wp-perf → /a11y-audit → /gap-analysis → proposal doc
```

**After:**
```
/site-reviewer (now invokes Council as part of its pipeline) →
/seo-audit → /wp-perf → /a11y-audit (still standalone for completeness) →
[NEW] /ui-ux-pro-max DESIGNER Mode B (proposal mode — given current site + audit findings, propose target Blueprint) →
/gap-analysis (target-type=design with the proposed Blueprint as evaluation rubric) →
proposal doc (now includes: current state, target Blueprint, gap to close, implementation order)
```
*The proposal becomes evidence-backed by the same Blueprint that would drive implementation.*

### Pipeline 5 — Client Onboarding (hosting → live WP)

**Before:** unchanged (this is hosting/DNS/WP install — no design phase).

**After:** unchanged. Design Brain enters at Pipeline 1 after onboarding completes.

### Pipeline 6 — QA → Deploy (orchestrated pre-ship)

**Before:**
```
/visual-qa → /design-review → /wp-theme-check → /wp-perf-gate → /diagnostics → /lint → /deploy-check → deploy
```

**After:**
```
/visual-qa → /design-review →
[NEW] Council 4-reviewer panel (replaces single-LLM /design-review pass) →
/wp-theme-check → /wp-perf-gate → /diagnostics → /lint → /deploy-check → deploy
```
*Council folds into existing QA chain; standards-lane (a11y) gates hard, interpretation-lane debates and synthesises.*

### Pipeline 7 — `/build-website` (productised 8-stage)

**Before:** URL → extract → patterns → blocks → QA → deploy.

**After:**
```
Stage 0: target detect (existing)
Stage 1: parallel /wp-site-extraction + /design-ref + /sgs-extraction (existing — already correct per master spec)
[NEW] Stage 1.5: /ui-ux-pro-max DESIGNER Mode B (autonomous from extraction) → Blueprint JSON
Stage 2: SEO (existing)
Stage 3: feature-coverage (existing)
Stage 4: pattern-gen (existing, now Blueprint-constrained)
Stage 5: build (existing)
Stage 6: QA (existing — extends with Council)
Stage 7: deploy (existing)
[NEW] Stage 8: ingest validated outcome (after client sign-off + 30 days)
```
*Adds a Designer pre-pattern stage and an ingest post-deploy stage.*

### Pipeline 8 — Block Development Standalone

**Before:**
```
/wp-blocks → /wp-block-development → /wp-hooks → /diagnostics → /lint → /visual-qa
```

**After:**
```
/wp-blocks (lookup: does block exist?) →
[OPTIONAL] /ui-ux-pro-max query --domain product (for block-pattern guidance) →
/wp-block-development (now consults uimax DB stack table for current React/Tailwind patterns; falls back to /library-docs for newest framework changes) →
/wp-hooks →
/diagnostics → /lint →
/visual-qa →
[NEW] Council 4-reviewer if block is design-surfaced (skip if pure-logic block)
```
*Blocks are framework-current via library-docs and aesthetic-current via uimax DB.*

---

## 6. Risks + Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| State-machine interview fails to gate (drift after 3-4 turns) | High | Use `AskUserQuestion` + `context: fork` per Sonnet review. Validated by Anthropic's own `feature-dev` plugin. |
| Council bias collapse (4 reviewers converge despite different prompts) | Medium-High | Model heterogeneity (Sonnet + Gemini-Pro + Cerebras + Gemini-Vision) is mandatory. Refute-or-Promote Apr 2026 demonstrates 80+ same-model agents endorsing non-existent vulnerability. |
| Hook can't dispatch subagents → council-review.py doesn't work | High | Sonnet verified: redesigned as Skill stage with main-thread Task calls + pipeline-stage-gate enforcement. NOT a hook. |
| Pre-creation philosophy auto-load wiring assumption wrong | Medium | Sonnet verified: PreToolUse on Skill matcher CAN return `additionalContext` JSON. Hook structure: `{"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": "<text>"}}`. Achievable. |
| Goodhart drift on self-improving DB (council marks designs "good", DB learns council taste) | Medium | Validated-only ingestion gate (client sign-off + 30-day no-revision window). Quarterly diversity audit. |
| Aesthetic Decay (DB converges on bland global average over time) | Medium | Diversity audit checks variance per dimension. Don't ingest if variance dropping until next ship breaks the pattern. Council can flag "too-similar-to-existing" outcomes. |
| Deleting toolbox skills breaks pipelines that hard-reference them | Medium | Phase 1 grep step finds all references first; Phase 2 deletes after dependencies updated. Frontend-design specifically: colourise + bolder reference it; delete those FIRST or update them to remove the call. |
| 8 deleted modifier skills lose their unique content (e.g. delight's 317 lines) | Medium | Per skill-consolidation matrix: content moves to `philosophy_rules` table OR CLI mode docstrings. Nothing gets lost. |
| Tailwind-design-system replacement (`/library-docs` + DB stacks table) less rich than 875-line skill | Medium | Spot-check: does `/library-docs tailwind v4` return depth comparable to current skill? If not, keep skill until library-docs depth proven. |
| Designer Mode B (autonomous) hallucinates client identity | Medium-High | Mode B always surfaces draft Blueprint for human review before TOOLBOX phase. Cannot proceed silently. |
| Multi-mode SKILL.md exceeds 500-line limit | Medium | Progressive disclosure: SKILL.md body = router; mode behaviour in `/references/modes/*.md` Level 3. |
| Skill versioning across active sessions | Low-Medium | Bean's existing `lifecycle-gate` already covers this for skill edits. No new mechanism needed. |
| Anthropic skills repo updates break our pattern assumptions | Low | Skills repo is reference, not load-bearing. Our patterns are validated against current docs at design time. |

---

## 7. Implementation Phases

### Phase 1 — Cleanup & Verification (~3-4h, low risk)

1. Grep workspace for all references to: `colourise`, `bolder`, `quieter`, `normalize`, `polish`, `distill`, `delight`, `adapt` — find every consumer
2. Audit each skill's content for non-DB unique value; preserve as `--mode <X>` docstring or `philosophy_rules` row
3. Update `colourise` + `bolder` SKILL.md to remove `frontend-design` invocation lines
4. Delete `frontend-design/SKILL.md` (no live callers remain)
5. Move surviving frontend-design uniques to `ui-ux-pro-max/references/aesthetic-reference.md`
6. Verify pipelines still function via skillscore on touched files

### Phase 2 — Superdesign Consolidation (~1-2h, low risk)

1. Create `philosophy_rules` table with seed data from superdesign structured content (typography pairings, OKLCH (modern colour-space format) rules, spacing scale, animation timings, shadow scale, theme patterns, A+ to D grading criteria)
2. Create `ui-ux-pro-max/references/superdesign-philosophy.md` with prose half
3. Update `visual-qa/SUPERDESIGN.md` content to redirect to canonical reference (or delete duplicate, point at canonical)
4. Update `site-reviewer/references/design-quality.md` similarly
5. Update routing entry in `innovative-design/SKILL.md` line 165
6. Update reference note in `interactive-brief/SKILL.md` line 118
7. Delete `superdesign/SKILL.md`
8. Verify: 5 evaluation skills still produce equivalent output on test cases

### Phase 3 — DB Expansion & CLI Refactor (~10-14h, medium risk)

1. SQLite schema for `archetype_token_matrix`, `brand_pillars`, `top_task_templates`, `council_personas`, `philosophy_rules`
2. Seed data:
   - Jung 12 archetypes × 4 pricing tiers = 48 rows in `archetype_token_matrix`
   - 36+ brand pillars across archetypes
   - ~20 top-task templates per top 5 SGS industries (solicitor, dental, spa, mortgage, e-commerce)
   - 4 council personas (Accessibility Hardliner, Brand Police, UX Sceptic, Visual Quality Reviewer)
3. Build `scripts/modify.py` — `uimax modify --mode <X> --target <file>` CLI handlers per mode
4. Build `scripts/designer.py` — Designer Mode A interactive + Mode B autonomous orchestrators
5. Build `scripts/council.py` — 4-Task dispatcher + synthesiser
6. Split `integration-contract.md` → `ingest-contract.md` + `query-contract.md`
7. Add `blueprint-schema.json`
8. Smoke test: run a full Pipeline 1 scenario end-to-end with a fixture client

### Phase 4 — Skill Restructure & Hook Wiring (~8-12h, medium risk)

1. Rewrite `ui-ux-pro-max/SKILL.md` as Level 2 mode-router (under 500 lines) + create 6 Level 3 mode files
2. Rewrite `innovative-design/SKILL.md` as thin classifier (~50 lines) → CLI modes
3. Delete the 8 deprecated modifier SKILL.md files
4. Delete or merge: `audit` (→ `/site-reviewer`), `critique` (→ council persona), `tailwind-design-system` (→ library-docs + stacks table)
5. Create `~/.claude/hooks/philosophy-autoload.py` PreToolUse hook
6. Register `~/.claude/pipelines/blueprint-validator.json` for pipeline-stage-gate
7. Wire `philosophy-autoload.py` in `settings.json`
8. End-to-end test: full Pipeline 7 (`/build-website`) on a real fixture URL

### Phase 5 — Self-Improvement & Telemetry (~4-6h, low risk)

1. Implement `--mark-validated` flag on `ui-ux-pro-max ingest`
2. Build quarterly diversity-audit script: `scripts/diversity-audit.py` — checks variance per dimension, flags decay
3. Hook council outputs back into `corrections.json` so false-positive flags reduce over time
4. Build dashboard widget on Blub: "Designs shipped this quarter, archetype distribution, council false-positive trend"

**Total: ~26-38h focused implementation work.** Sequencing prevents broken state mid-rebuild.

---

## 8. Success Metrics (How We'll Know It Worked)

| Metric | Baseline | Target | Measurement |
|---|---|---|---|
| Design-iteration count per client engagement | TBD (Bean to log next 3 engagements) | -50% | Track explicit fix-and-redo loops in Pipeline 1 |
| WCAG drift incidents (issues caught post-deploy) | Current "sneaks through" | 0 from Council standards-lane | Council standards-lane is hard-pass-fail |
| Time from brief to first Blueprint | TBD | Designer Mode A completes in 15-25min | Telemetry on Designer interview duration |
| Client sign-off rate on first Blueprint review | TBD | >70% | Track Mode B autonomous Blueprint acceptance rate |
| Council false-positive rate | TBD | <10% per persona after 3 months tuning | Track gaps flagged that Bean overrode as "not real" |
| DB row growth from validated-outcomes | 0 today | +50 rows/quarter once shipping | INGEST log |
| DB diversity variance per dimension | Baseline at Phase 5 | No more than 5% variance loss/year | Quarterly diversity-audit script |

---

## 9. Open Questions for Next Session

1. **Designer Mode A interview question order** — should it be strict ladder (constraints-first) or adaptive (based on what client has already articulated)? Worth user-testing once the fork-context skill exists.
2. **Top-task templates seed data** — which 5 industries does Bean prioritise? (Likely: solicitor, dental, spa, mortgage broker, e-commerce.) 20 templates × 5 industries = 100 rows of seed work.
3. **Council severity-weight calibration** — initial weights should be set by Bean (which persona's concerns weigh most for SGS work?) and tuned via false-positive feedback.
4. **`/library-docs` depth check** — does it actually return Tailwind v4 / Next.js 16 patterns at depth comparable to the current 875-line `/tailwind-design-system` skill? Test before deletion.
5. **Designer Mode B autonomous research depth** — quick-tier (`/research-check`) or buddies-tier (`/research-buddies`) per project? Likely depends on project budget; default quick.
6. **Is `/innovative-design` thin-router worth keeping vs deletion?** If 95% of design work flows through Designer → Toolbox, the residual "fix small thing" intent verbs may be rare enough to fold into `/uimax modify` as bare commands. Decide after Phase 4 telemetry.

---

## 10. Approvals & Sign-off

- [x] Architecture direction approved (Bean, 2026-04-24)
- [ ] This spec reviewed
- [ ] Phase 1 sequenced
- [ ] Phase 2-5 reviewed for effort accuracy
- [ ] Council persona prompts authored (deferred to Phase 3)
- [ ] Industry top-task templates authored (deferred to Phase 3)
- [ ] Council severity weights set (deferred to Phase 5)

---

**End of spec.** Implementation work tracked in next-session prompts and Phase-1-through-5 PR descriptions.
