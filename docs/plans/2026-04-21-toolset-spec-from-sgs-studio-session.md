# SGS Toolset Master Spec — 2026-04-21 handoff from small-giants-studio session

**Source session:** `c--Users-Bean-Projects-small-giants-studio` 2026-04-20→21
**Destination:** small-giants-wp Phase 1 tooling audit (sessions D/E/F pending)
**Prepared by:** Opus main thread + 5 parallel Sonnet recon agents + 4-reviewer panels per skill

---

## 1. What this handoff contains

1. **Verified tool inventory** across 5 domains (design / wp-core / sgs-ecosystem / qa-review-deploy / meta-infrastructure) — 180 unique slugs, skill paths confirmed, paired CLIs mapped
2. **6 per-skill gap-analysis eval JSONs** at `C:/Users/Bean/.openclaw/workspace/memory/research/gap-analysis/2026-04-20-154111/` (animation-harvest, email-html-builder, playwright, sgs-discover, sgs-extraction, build-website — last 3 with 3-4 reviewer panels)
3. **13 pipelines designed + optimised** (6 existing + 7 new)
4. **Tier hierarchy** with spine (cross-cutting) + Tiers 1-5
5. **Change / Improve / Add / Subtract recommendations**
6. **Methodology corrections captured** (lesson id 151 in blub.db: `gap-analysis-read-the-scripts-not-just-skill-md`)
7. **sgs-extraction final gap set by role** (this session's missing closure)

---

## 2. Architecture — verified hierarchy

### Spine (cross-cutting — called at every relevant decision point)
- **/uimax (= /ui-ux-pro-max)** — design intelligence DB, 11,925+ rows, 16 stack CSVs. Queryable reference. NOT a sub-skill — called from every design decision point per 2026-04-14 lesson.
- **/sgs-db** (via /sgs-wp-engine) — 619-attribute SGS KB + `/sgs-update` refresh cmd
- **blub.db** — cross-system memory (knowledge + corrections + dispatch_log + pipeline_runs)
- **/library-docs** — Context7 wrap (replaces retired Context7 MCP)
- **/superdesign** — auto-loaded reference by evaluation skills (typography/OKLCH/spacing/animation)
- **/autopilot** — fires every message (classification + routing + ADHD support)
- **/delegate** — model-routing engine (shared by 6 consumer skills)
- **Cognitive discipline:** /brainstorming, /verification-before-completion, /test-driven-development, /receiving-code-review

### Tier 1 — Orchestrator Pipelines
`/build-website`, `/innovative-design`, `/design-review`, `/visual-qa` (SGS-only), `/site-reviewer` (universal), `/animation-harvest`, `/seo`, `/wordpress-router`

### Tier 2 — Coordinator Skills (standalone or pipeline stage)
`/sgs-extraction`, `/design-ref`, `/sgs-wp-engine`, `/sgs-discover`, `/gemini-vision-audit`, `/strategic-plan`, `/phase-planner`, `/project-consolidate`, `/project-init`, `/subagent-prompt`, `/dispatching-parallel-agents`, `/subagent-driven-development`, `/critique`, `/audit`, `/wp-performance`, `/seo-audit`, `/requesting-code-review`

### Tier 3 — Implementation Skills
`/clone-patterns`, `/a11y-audit`, `/deploy-check`, `/deploy-nextjs`, `/interactive-design`, `/wp-block-development`, `/wp-block-themes`, `/wp-interactivity-api`, `/wp-plugin-development`, `/wp-rest-api`, `/wp-wpcli-and-ops`, `/wp-abilities-api`, `/tailwind-design-system`, `/teach-impeccable`, `/extract`, `/onboard`, 12 `/seo-*` sub-skills, 5 research-tier skills, `/quoter`, `/lead-research-assistant`, `/sales-intelligence-advisor`

### Tier 4 — Modifier Skills
`/polish`, `/distill`, `/bolder`, `/quieter`, `/delight`, `/harden`, `/clarify`, `/normalize`, `/colourise`, `/adapt`

### Tier 5 — Infrastructure (commands wrapping CLIs)
`/wp-blocks`, `/wp-hooks`, `/wp-scaffold`, `/wp-perf`, `/wp-perf-gate`, `/wp-theme-check`, `/wp-hook-graph`, `/wp-project-triage`, `/diagnostics`, `/lint`, `/search`, `/research`, `/gap-analysis`, `/skillscore`, `/batch-gap-analysis`, `/capture-lesson`, `/handoff`, `/cerebras`, `/gemini-flash`, `/gemini-pro`

---

## 3. End-goals + effectiveness rubric (measurement standard for Phase 1 Stage 1c)

Every pipeline + every skill must be scored against:

1. **18-cell matrix coverage** — {block / container / page} × {static / animation / interactivity / device-responsive / content+tone / flow+UX}
2. **3 output paths** — /uimax DB ingest ✓ / SGS theme deploy ✓ / app delivery ✓
3. **Clone fidelity** — does it catch the Indus Foods "small important details" failure mode?
4. **Library growth** — enriches /uimax + /sgs-db + block inventory on every run?
5. **Pitch speed** — brief → demoable output wall-clock
6. **Design intelligence compounding** — mood board memory, taste accumulation across runs
7. **Client build time** — approval → shipped site wall-clock
8. **Reliability** — quality + consistency + human-QC-needed + token-efficiency

---

## 4. Pipelines — the 13

### Pipeline 1 — New client build (brief → shipped site)
0. `/lead-research-assistant` Phase 1+2 → client context
1. `/sgs-discover` (URL-only, industry match, mood board memory) → 3-5 references
2. `/sgs-extraction` each reference — raw HTML/DOM/a11y baseline
3. `/design-ref` each reference — tokens + confidence scores
4. `/uimax` pull — palette/type/stack direction
5. `/gemini-vision-audit` — cross-reference validation
6. `/sgs-wp-engine` + `/wp-blocks` — block inventory + gap scan
7. `/clone-patterns` — matched sections → PHP pattern files
8. `/wp-block-development` + `/wp-block-themes` + `/wp-interactivity-api` + `/interactive-design` — new blocks + motion
9. `/design-tokens` — theme.json sync
10. `/visual-qa` — SGS build QA
11. `/deploy-check` → deploy
12. Post-deploy `/site-reviewer` smoke + `/uimax` INGEST write-back

### Pipeline 2 — WP→SGS migration
1. `/wp-site-extraction` (SSH truth)
2. `/sgs-extraction` (frontend complement)
3. `/design-ref` (live-site tokens)
4. `/uimax` pull
5. `/sgs-wp-engine` + `/wp-blocks` + `/sgs-db` cascading impact
6. `/clone-patterns`
7. `/wp-block-development` fill gaps
8. `/wp-wpcli-and-ops` content migration
9. `/design-tokens` sync
10. `/seo-sitemap` + `/seo-technical` SEO preservation
11. `/visual-qa` vs original
12. `/deploy-check` → deploy
13. Post-deploy `/site-reviewer` smoke + `/uimax` INGEST

### Pipeline 3 — Draft → SGS (mockup input)
1. Source (HTML / screenshots / Figma)
2. `/sgs-extraction` (if HTML) OR skip to 3
3. `/design-ref` (tokens + Vision on screenshots)
4. `/gemini-vision-audit` multi-viewport (mockup usually single-size)
5. `/uimax` pull for missing tokens
6. `/sgs-wp-engine` + `/wp-blocks` match
7. `/clone-patterns`
8. `/wp-block-development` + `/interactive-design`
9. `/design-tokens`
10. `/visual-qa` compare build to mockup
11. `/deploy-check` → deploy + `/uimax` INGEST

### Pipeline 4 — Audit → redesign proposal (THE pitch engine)
1. `/lead-research-assistant` Phase 1 (prospect market)
2. Extracted 5-lens framework from `/sales-intelligence-advisor` (pattern not domain)
3. `/site-reviewer` (9-layer current-site audit)
4. `/seo-audit` (delegates to 6 specialists)
5. `/wp-perf` OR Lighthouse
6. `/a11y-audit`
7. `/gap-analysis` overall UX
8. `/lead-research-assistant` Phase 2 (TA + personas)
9. `/sgs-discover` (industry match from mood board)
10. `/uimax` pull (suggested direction)
11. **OPTIONAL homepage draft:** /sgs-extraction → /design-ref → /clone-patterns → quick SGS build
12. `/quoter` (enhanced — ingests all above as context) + absorbed sales-advisor PARSE→RESEARCH→ANALYSE→OUTPUT→LOG pattern
13. Package proposal doc

### Pipeline 6 — QA → deploy (pre-ship)
1. `/visual-qa` 2. `/a11y-audit` 3. `/wp-theme-check` 4. `/wp-perf` baseline compare 5. `/wp-perf-gate` (PreToolUse auto) 6. `/seo-technical` 7. `/diagnostics` 8. `/lint` 9. `/deploy-check` OR `/deploy-nextjs` 10. Deploy 11. `/site-reviewer` light smoke

### Pipeline 7 — /build-website (productised)
Keep 8-stage core + 4 additions:
- Stage 1: parallel `/wp-site-extraction` AND `/design-ref` AND `/sgs-extraction` (they capture different layers; current OR is a bug)
- Stage 5: explicit `/design-tokens` sync
- Stage 8: post-deploy `/site-reviewer` smoke
- Stage 9 (NEW): POST run telemetry to blub.db + `/uimax` INGEST

### Pipeline 8 — Content creation (NEW)
`/brand-voice-replicator` (NEW, client voice) OR `/style-replicator` (Bean voice) → `/seo-content` → `/seo-geo` → `/clarify` → `/wp-wpcli-and-ops` upload

### Pipeline 9 — Block development standalone (NEW formalisation)
`/wp-blocks` → `/wp-block-development` → `/wp-interactivity-api` → `/wp-hook-graph` → `/wp-hooks` → `/diagnostics` + `/lint` → `/visual-qa` single-block mode

### Pipeline 10 — /scroll-animation-originator (NEW skill — Chase Chapman workflow)
`/sgs-discover` → `/uimax` → `/nano-banana-pro` (start+end images) → **fal.ai LTX-Video 2.3** ($0.06/sec) → FFMPEG frame extract → new `sgs/scroll-animation` block (3 variants: individual / container-bg / page-bg) → `/design-tokens` → `/a11y-audit` (prefers-reduced-motion HARD GATE) → `/visual-qa`

### Pipeline 11 — Email campaign (NEW)
`/email-html-builder` → `/sgs-email-branding` → `/uimax` pull → `/gemini-vision-audit` (light+dark) → automation-engine email_send.py (MUST set html=True — Sonnet-confirmed silent plain-text bug)

### Pipeline 12 — Client onboarding (NEW formalisation — biggest revenue gap per handoff)
`/cloudflare-toolkit` (DNS) → `/vps-deploy` OR Hostinger SSH → `/wp-wpcli-and-ops` (WP install + users) → `/sgs-wp-engine` (framework install + theme activation) → `/design-tokens` (initial theme.json) → `/deploy-check`

### Pipeline 13 — App client build (NEW, parked — revenue priority is SGS theme first)
`/lead-research-assistant` → `/sgs-discover` (Mobbin for app UI refs) → mobile-viewport capture → `/uimax` pull (stack-specific: React Native / SwiftUI / Flutter — /uimax has all 3) → /frontend-design (post-merge into /innovative-design) → NEW `/app-block-library` → TestFlight / Play Console deploy

---

## 5. sgs-extraction — final gap set by role (closing the open thread)

sgs-extraction has **three roles** depending on invocation context:

### Role A — Solo standalone ("grab everything about this URL for archiving/investigation")
User invokes `/sgs-extraction https://example.com` directly.

| Gap | Priority | Fix |
|---|---|---|
| html-capture.js hard-exits on Cloudflare vs documented fallback | A | Stage 1 HARD GATE moves fallback logic to caller; exit code 2 = Cloudflare-specific |
| Vision pass is manual not automated | A | Wire Gemini API directly OR document as HARD GATE "manual Vision step required" |
| Wrong output filenames (design-tokens.json vs actual dembrandt-tokens.json) | A | Fix either script or docs; one is lying |
| No robots.txt / rate-limit / User-Agent gate | A | New Stage 0.5 shared ethics module |
| Cloudflare handling best-effort only | A | Stealth ladder: vanilla → playwright-extra + stealth → Browserless BQL → archive.org |
| Multi-viewport capture absent | A | Stage 3 at 375+1440 (verify 768 doesn't break) |
| No a11y baseline | A | Stage 3.5 `/a11y-audit` dispatch — mandatory, not optional |
| No /uimax INGEST after successful extraction | A | Stage 5 write-through + wiki stub |
| No blub.db cache at Stage 0 | B | 24h freshness short-circuit |
| Manifest LLM-synthesized not scripted | A | Python filesystem scan |
| Output dir collision on same-timestamp | B | UUID suffix |
| JS evaluator no error boundaries | B | try/catch wrap getComputedStyle calls |
| Dead trend-detection.md reference | A | Remove |
| Autopilot domain table missing entry | A | Cross-batch patch |

### Role B — Pipeline stage inside build-website / animation-harvest / scroll-animation-originator
Pipeline dispatches; outputs consumed by downstream stages.

| Gap | Priority | Fix |
|---|---|---|
| extraction-manifest.json not consumed by ANY downstream skill | A | Retrofit /design-ref Stage 0 + /build-website Stage 1 + /animation-harvest Stage 1 + /clone-patterns to read the manifest |
| Stage 1 in build-website uses OR — sgs-extraction absent entirely | A | Pipeline spec: wp-site-extraction AND design-ref AND sgs-extraction in parallel (different layers) |
| Output schema undocumented for consumers | B | Publish consumer contract spec |
| Stage 6 /clone-patterns chain missing | A | Optional Stage 6 — auto-convert matched sections to SGS pattern PHP |

### Role C — 3rd output: feeding /uimax + /sgs-db + apps
Extraction enriches design intelligence regardless of pipeline context.

| Gap | Priority | Fix |
|---|---|---|
| /uimax INGEST command doesn't exist — /uimax is read-only today | A | NEW command: /uimax ingest <extraction-manifest> |
| /sgs-db has no animations / sections_detected / block_opportunities tables | A | Schema migration via /sgs-update |
| No per-section interactivity extraction from scraped code | A (was "impossible" — Bean corrected me) | NEW skill: /interactivity-capture — parses captured HTML/CSS/JS for `:hover`, `:focus`, `:active`, `@media (hover:hover)`, `addEventListener('scroll'|'click')`, `data-wp-on--*`, IntersectionObserver patterns. FULLY possible from scraped source. |
| No content+tone extraction from reference sites | B | NEW skill: /reference-voice-extractor (sibling to /style-replicator) |
| No flow/UX capture in builds (only in audits via /site-reviewer L5) | A | Extract /site-reviewer L5 as reusable stage, dispatch in Pipelines 1/2/3/7 |

### Opportunities (4 across all roles)

1. blub.db extraction cache (medium showpiece) — 24h freshness
2. Stealth-bypass ladder (low) — Cloudflare handling
3. **a11y-baseline capture via axe-core (HIGH showpiece)** — differentiator: "SGS clones never regress a11y"
4. /clone-patterns chain — auto-convert to PHP patterns

**sgs-extraction post-remediation target:** A- (4.0-4.3) per 5-criterion rubric. S-grade path: opp 3 + opp 4 + /interactivity-capture + /uimax INGEST. Combined = "SGS is the only agency whose clones inherit accessibility, interactivity, and taste intelligence by default."

### sgs-extraction 18-cell matrix coverage (regrade per Section 3 rubric)

sgs-extraction is a **capture skill** — it produces data for downstream interpreters, not rendered output. Coverage reflects what raw layers it captures, not what it transforms.

| Axis | static | animation | interactivity | device-responsive | content+tone | flow+UX |
|---|---|---|---|---|---|---|
| **block** | ✓ (HTML+CSS+tokens) | partial (CSS keyframes captured; not parsed) | partial (hover/focus CSS + JS event listeners present in raw; not extracted) | ✗ (single viewport today — Role A gap) | partial (visible text captured; no tone analysis) | ✗ |
| **container** | ✓ | partial | partial | ✗ | partial | ✗ |
| **page** | ✓ (full-page screenshot + DOM) | partial | partial | ✗ | ✓ (raw copy) | ✗ |

**Coverage today: 7/18 full ✓, 8/18 partial, 3/18 absent (18/18 rows touched but half at partial).**
**Post-remediation target: 12/18 full ✓** — add multi-viewport (Role A gap 6) = +3 full; add `/interactivity-capture` downstream (Role C gap 3) = +3 full converts from partial. The animation row stays partial without a dedicated animation-parse step (parked to `/scroll-animation-originator`).
**Role B pipeline dispatch target: 15/18** — when sgs-extraction feeds parallel Stage 1 + `/interactivity-capture` + `/animation-harvest` stages, the downstream composite hits static + interactivity + animation fully; content+tone + flow+UX still need separate skills (`/reference-voice-extractor`, `/site-reviewer-l5-extract`).

---

## 6. build-website — 4-reviewer panel reconciled (2026-04-21)

**Final grade: B (3.7), grade_cap_applied by lens 6 (motivation_meaning) — unanimous fail across all 4 reviewers.**

### Reviewer score matrix

| Criterion | Sonnet | Flash | Cerebras | GPro* | Reconciled |
|---|---|---|---|---|---|
| goal_achievement | 4.6 | 4.0 | 4.0 | 4 | **4.2** (Sonnet overstated — SEO preservation gaps) |
| process_adherence | — | 4.5 | 4.0 | 4 | **4.2** |
| output_consistency | 4.5 | 3.5 | 3.0 | 3 | **3.5** (clear drop — 70% fidelity arbitrary, Stage 1 OR splits downstream) |
| tool_utilisation (thin_router) | 4.7 | 4.0 | 4.0 (5 raw) | 2 | **4.0** (missing sgs-extraction is the cap) |
| efficiency | 4.5 | 4.5 | 4.0 | 3 | **4.1** |
| ecosystem_awareness | 2.0 (floored) | 3.8 | — | — | **2.0** (dead /site-clone ref — floor stands per protocol) |
| Panel consistency estimate | — | 65% | 85% | — | **~52-65%** (Sonnet's ~52% confirmed conservative) |

*GPro thinking trace captured but final JSON never emitted (5× 503 retries). Scores extracted from reasoning.

### Unanimous findings (all 4 reviewers)
- **Lens 6 motivation_meaning = FAIL** — REPORT.md metrics-only, no USP / next-action / % impact on multi-hour flagship run
- **Stage 1 OR splits downstream** — wp-site-extraction vs design-ref produces structurally incompatible outputs; feature-check/pattern-gen becomes branch-dependent
- **`/sgs-extraction` missing from Stage 1 entirely** — raw HTML+DOM+a11y layer absent for non-SSH runs
- **Multi-source conflict resolution is manual** — doesn't scale to agency batch queueing

### New gaps surfaced by external panel (not in Sonnet's original)
**Flash:**
- Stage 0 WP detection is brittle (`curl /wp-json/` only — often blocked/disabled; no meta-tag or asset-path fallback)
- Stage 5 has no guard against overwriting non-empty target WP environment
- Stage 4 pattern-gen has no partial-success path — one section fail kills the 8-stage run
- Multi-source merge `first URL wins` for global tokens is poor foundation for mix-and-match

**Cerebras:**
- Stage 2 misses `hreflang` / `canonical` / `JSON-LD` / Twitter Card extraction — SERP feature loss on cloned site
- No `robots.txt` / rate-limit / User-Agent gate at Stages 1/5 (ethical-scraping + IP-ban risk)
- No `/uimax` INGEST post-deploy — flagship pipeline doesn't feed design intelligence library
- No post-deploy `/site-reviewer` smoke check — deploy success ≠ site works
- No cost/time tracking across retries — pathological runs burn compute silently
- blub.db records `pipeline_runs` only — no `/api/knowledge` POST with industry/tokens/blocks used

**GPro (from reasoning trace before 503):**
- Playwright content scrape in Stage 5 is disjoint from Stage 1 extraction (no shared DOM structure)
- Without `sgs-extraction`, "pixel-matched" claim is undeliverable (Indus Foods small-details failure mode)

### Reconciled 7-item remediation priority (blocks A-grade ascent)

1. **Stage 1 AND not OR** — parallel `wp-site-extraction` + `design-ref` + `sgs-extraction`; publish Stage 1 output schema so Stages 3+ consume a stable contract
2. **Delete `/site-clone` dead ref from frontmatter** — one edit unblocks ecosystem_awareness floor (2.0 → ~4.5), lifts overall from capped-B toward A
3. **REPORT.md motivation layer** — Top USP / specific next-action / % impact on next pitch — resolves lens 6 fail (unanimous)
4. **Stage 8 add `/site-reviewer` smoke** + **Stage 9 add `/uimax` INGEST** — closes post-deploy validation + feeds design brain
5. **Delete stale Opportunity Skills section** — 2 false "to be built" claims (sgs-discover AND validate-pipeline-artifact.py both live)
6. **Shared ethics gate module** (robots.txt + rate-limit + UA) — consumed by sgs-extraction / sgs-discover / animation-harvest / clone-patterns
7. **Stage 2 SEO completeness** — hreflang / canonical / JSON-LD / Twitter Card extraction; WP-detection fallbacks (meta-tag, asset-path)

### Lower-priority (post-A)
- Configurable fidelity threshold (`--fidelity-min`, defaults per industry)
- Stage 4 partial-success skip-and-warn path
- Stage 5 non-empty target guard
- Resume-mode HALT.timestamp re-validation (auto re-extract if >24h)
- Automated multi-source conflict resolver (score-based, close-call escalation)
- Cost/time tracking in REPORT.md
- Additional blub.db `/api/knowledge` POST (industry, tokens, blocks)

### 18-cell matrix coverage (regrade per Section 3 rubric)

| Axis | static | animation | interactivity | device-responsive | content+tone | flow+UX |
|---|---|---|---|---|---|---|
| **block** | ✓ (pattern-gen) | ✗ | ✗ | ✓ (theme.json) | partial | ✗ |
| **container** | ✓ | ✗ | ✗ | ✓ | partial | ✗ |
| **page** | ✓ (assemble) | ✗ | ✗ | ✓ | ✓ (content migrate) | ✗ |

**Coverage: 10/18 cells** (Sonnet estimated 12 — over-counted partial content+tone + one flow cell). Gaps:
- **Animation row (0/3)** — no animation extraction anywhere in 8 stages (addressed by separate `/animation-harvest` dispatch, but not folded into clone output)
- **Interactivity row (0/3)** — no :hover, :focus, event listeners, scroll handlers, `data-wp-on--*` extraction (needs `/interactivity-capture` per Bean's correction — new skill in Section 7 ADD)
- **flow+UX column (0/3)** — no user-journey / navigation-path / interaction-flow capture (needs `/site-reviewer-l5-extract` promotion per Section 7 ADD)

### Reviewer-class model notes (for /qc skill routing)

- **Sonnet 4.6** — default reviewer, produced the fullest gap register with 10 entries; reliable JSON output
- **Gemini Flash** — 4s single-shot; valid JSON; adds breadth on brittleness gaps; model for fast triangulation
- **Cerebras qwen-3-235b** — valid JSON once upstream queue clears; thinking-noise in stdout (strip before ingest); strong on ecosystem gaps (JSON-LD, robots.txt, /uimax)
- **Gemini Pro 3.1** — hit 5× 503 loop, never emitted final JSON; thinking trace useful but needs script-level retry with exponential backoff OR switch to `/gemini-pro` skill which handles retries differently

---

## 7. Change / Improve / Add / Subtract (consolidated)

### CHANGE
1. Merge `/frontend-design` → `/innovative-design` (recon confirms frontend-design only used as shared reference)
2. Reclassify `/style-replicator` → content/voice domain (NOT design)
3. Reclassify `/design-tokens` → WP-core domain (wraps wp-token-bridge.py)
4. Fix `/sgs-extraction` 4 factual errors (captured lesson id 151)
5. Autopilot domain table: add entries for `/playwright`, `/animation-harvest`, `/sgs-discover`, `/sgs-extraction` (4 skills invisible)
6. `/capture-lesson` skill Step 2 path: A:/.openclaw/ → C:/Users/Bean/.openclaw/ (skill self-drift)

### IMPROVE
1. `/quoter` — ingest /lead-research-assistant output + absorb sales-advisor's PARSE→RESEARCH→ANALYSE→OUTPUT→LOG pattern + 5-lens framework
2. `/sgs-discover` — URL-only, /uimax feedback, block-gap detection, industry matching, mood-board memory
3. `/uimax` — add INGEST command (currently read-only)
4. `/sgs-db` — new tables: `animations`, `sections_detected`, `block_opportunities`, `extraction_cache`
5. `/sgs-extraction` + `/design-ref` output schema coordination
6. `/visual-qa` — promote compare-to-mood-board to first-class mode
7. `/animation-harvest` split: Path A-only stays; Path B moves to new scroll-animation-originator
8. `/gap-analysis` validator: enforce 6 lenses (not 5) + block grade_cap_applied=null when any lens=fail
9. `/build-website` Stage 1: OR → AND parallel; add /uimax INGEST, post-deploy /site-reviewer, motivation layer in REPORT.md
10. Formalise Pipelines 1/2/3/4/6 as orchestrator skills (5 missing chargeable pipelines per handoff — biggest revenue gap)

### ADD (new skills + infrastructure)
1. `/scroll-animation-originator` (Tier 1 — Chase Chapman workflow with fal.ai LTX-Video)
2. `/brand-voice-replicator` (Tier 3 — client voice, sibling to /style-replicator)
3. `/interactivity-capture` (Tier 2 — CORRECTION from Bean: extract :hover, :focus, event listeners, scroll handlers from captured HTML/CSS/JS — FULLY possible from scraped code)
4. `/reference-voice-extractor` (Tier 3 — content+tone from reference sites)
5. `/site-reviewer-l5-extract` OR promote L5 stage to reusable dispatch (flow/UX capture in builds)
6. `/uimax` INGEST command + schema
7. `/sgs-db` schema migrations (4 new tables)
8. Shared ethics gate module (robots.txt + rate-limit + UA) for sgs-extraction, sgs-discover, animation-harvest, clone-patterns
9. Pipeline orchestrator skills × 5 (Pipelines 1, 2, 3, 4, 6)
10. Pipeline 13 `/app-block-library` + orchestrator (parked — SGS theme revenue priority first)

### SUBTRACT
1. `/frontend-design` (absorb into /innovative-design)
2. `/style-replicator` from design domain classification
3. Stale Opportunity Skills section in build-website SKILL.md (two stale claims)
4. `/site-clone` dead ref in build-website frontmatter
5. Redundant "design-ref is the canonical extractor — absorb the others" claim in TOOLING-REFERENCE.md (recon proves three distinct layers)
6. Tooling-doc claim /style-replicator overlaps /design-ref and /sgs-extraction (it's voice, not design)

---

## 8. Biggest leverage — prioritised action list for Phase 1 execution

| # | Action | Revenue impact | Matrix uplift | Effort |
|---|---|---|---|---|
| 1 | Formalise Pipeline 4 (audit→proposal) with enhanced /quoter ending | **THE pitch engine** | Full matrix coverage |  Medium |
| 2 | `/uimax` INGEST + touchpoints at every design decision | Compounding intelligence moat | Lifts every build pipeline | Medium |
| 3 | Fix `/sgs-extraction` 4 factual errors + 4-skill autopilot patch | Unblocks 4 pipelines | Reliability | Low |
| 4 | Formalise Pipeline 1 (new client build) orchestrator | Direct revenue — currently 0 of 1 | +11 cells | High |
| 5 | Extract `/site-reviewer` L5 as reusable stage | Closes flow/UX gap | +6 cells | Medium |
| 6 | Build Pipelines 2/3/6/12 orchestrators | Revenue per handoff | +12 cells | High |
| 7 | Split animation-harvest + build `/scroll-animation-originator` | Premium upsell | +2 cells | High |
| 8 | `/interactivity-capture` NEW skill | Closes interactivity row | +3 cells | High |
| 9 | Merge /frontend-design → /innovative-design | Cleaner hierarchy | Neutral | Low |
| 10 | Pipeline 13 (app delivery) + `/app-block-library` | 3rd output path | Entirely new surface | Parked |

---

## 9. Phase 1 slot-in for small-giants-wp session

This spec feeds directly into the existing Phase 1 plan at `.claude/plans/sgs-skill-system-upgrade.md`:

- **Stage 1a (inventory reconciliation):** use the verified inventory in Section 2 (180 slugs across 5 domains, paths confirmed)
- **Stage 1b (Sonnet batch dispatch):** 6 per-skill eval JSONs already produced in this session — skip re-grading these 6; regrade the other ~30 using this same 4-reviewer pattern
- **Stage 1c (4+6-lens decision table):** the effectiveness rubric in Section 3 IS the 6-lens test against the 18-cell matrix. Decision-table rows for these 6 skills are in Section 7
- **Stage 1d (implement):** priorities in Section 8 (ordered by revenue + matrix uplift)
- **Stage 1e (/project-consolidate):** this spec is a consolidation input
- **Stage 1f (/strategic-plan + /phase-planner):** use Sections 4 + 7 as the plan's content

---

## 10. Cross-session methodology corrections

1. **Gap-analysis must read actual scripts + consumer SKILL.mds** (blub.db correction 151) — applies to every Stage 1b profile
2. **skillscore passes BEFORE gap-analysis**, per earlier correction — the 6 skills in this batch had skillscore skipped (5 of 6 FAILED skillscore); regrades from Phase 1 Stage 1b must enforce the correct order
3. **/uimax is queryable cross-cutting reference, not a sub-skill** (2026-04-14 lesson) — Stage 1c decisions should treat /uimax like sgs-db.py
4. **Autopilot routing gap is systemic** — 4 of 5 reviewed skills invisible to domain table. Every new orchestrator + coordinator skill MUST register in autopilot before claiming done
5. **Documentation drift is a categorical failure** — SKILL.md vs actual script behaviour divergence caps process_adherence at ≤ 2.0

---

## 11. Files + data produced in this session

### In small-giants-studio session (source):
- `C:/Users/Bean/.openclaw/workspace/memory/research/gap-analysis/2026-04-20-154111/` — batch folder
  - 6 eval JSONs (animation-harvest, email-html-builder, playwright, sgs-discover, sgs-extraction, build-website)
  - `reviews/` — per-skill reviewer outputs (Flash / Cerebras / Gemini Pro / Sonnet)
  - `report.md` — compiled batch report
  - `waiting-queue.md` — Bean-review items
- `C:/Users/Bean/.openclaw/workspace/memory/learning/2026-04-20-gap-analysis-read-the-scripts-not-just-skill-md.md` — captured lesson
- blub.db knowledge rows 11296-11301 (6 evals)
- blub.db correction row 151 (methodology rule)
- 5 recon JSON outputs in `reviews/recon-*.json` (where applicable — some external-model retries went via Sonnet)
- This master spec

### For small-giants-wp session to consume (this file + handoff artefacts):
- `C:/Users/Bean/Projects/small-giants-wp/docs/plans/2026-04-21-toolset-spec-from-sgs-studio-session.md` — this document
- Reference Section 2 for verified inventory
- Reference Section 4 for 13-pipeline catalogue
- Reference Section 8 for prioritised action list

---

## 12. Open threads for next session

1. build-website external reviewer panel (Flash + Cerebras + Gemini Pro) — running in background task `bcnwjuai9` — reconcile their outputs with Sonnet's findings when session resumes
2. `/spec-writer` formalised version of this spec — this doc was written directly given context budget; a /spec-writer pass would add Q&A gaps
3. `/gap-analysis` on this spec itself — not run due to context budget
4. `/delegate` + `/research` validation of specific claims (e.g. interactivity-capture viability, uimax stack coverage for apps) — deferred
5. Update capture-lesson skill to fix its own A:/.openclaw/ path drift
