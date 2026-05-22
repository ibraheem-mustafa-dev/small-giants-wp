---
doc_type: phase-plan
project: small-giants-wp
phase: 7
phase_name: WP 7.0 Alignment — AI Connectors Infrastructure + WP-Skills Audit
session_marker: Step 7.1 (Sgs_Ai_Connector class committed and confirmed safe-fail) — safe session boundary before skills audit
calibrated_time: ~75-165 min build + 15 min /qc-inline = ~90-180 min total
prerequisites:
  - Phase 1 (merged sgs-framework.db — skills reference the DB for code examples)
  - Phase 6 (must complete BEFORE Phase 7 dispatches — skills audit revisions affect the same blocks Phase 6 is editing; prevent conflicts)
parallel_with: Phases 4, 5a, 5b can run in parallel once Phase 1 lands. NOT Phase 6 — Phase 6 must ship first.
qc_gate_after: /qc-inline after Step 7.1; /qc-council Stage 5 after full phase
generated: 2026-05-21
---

# Phase 7 — WP 7.0 Alignment: AI Connectors Infrastructure + WP-Skills Audit

## Plain-English goal

WP 7.0 shipped a native AI Connectors framework on 2026-05-14 — a PHP abstraction over AI providers (`wp_get_connector()`, `wp_get_connectors()`, `wp_is_connector_registered()`, ~14 functions, `wp_connectors_init` hook). Any SGS AI feature built after today — alt-text generation, headline suggestions, image generation — should call into this native layer rather than building bespoke MCP wrappers. After this phase: `Sgs_Ai_Connector` is a registered PHP class that wraps the native WP 7.0 connector functions, exposes SGS-specific call sites, and safe-fails when no provider plugin is active. This is infrastructure-only — no actual AI calls are made in this phase, no provider plugins are required. Separately, 10 WP-family skills (`wp-block-development`, `wp-block-themes`, `wp-interactivity-api`, `wp-plugin-development`, `wp-rest-api`, `wp-wpcli-and-ops`, `wp-performance`, `wp-abilities-api`, `wp-site-extraction`, `wp-project-triage`) are audited and updated for WP 7.0 alignment. Each skill revision includes a minimal working code example tested on the dev site before commit. This is a once-off catch-up pass; skills update on subsequent WP releases via Phase 4's `/sgs-update --refresh-upstream` mechanism.

## Decisions in scope

- **Decision 26** (§11 Decision 26, §4.14) — Register `Sgs_Ai_Connector` PHP class wrapping `wp_get_connector()` / `wp_get_connectors()` / `wp_is_connector_registered()`. Infrastructure-only — no actual AI calls. Safe-fail when no provider plugin is active. Document supported provider roadmap (OpenAI, Anthropic, Gemini, Ollama).
- **Decision 29** (§11 Decision 29, §4.4, §4.7, §4.8, §4.9, §4.11, §4.13) — Audit all 10 WP-family skills for WP 7.0 alignment. Per skill: deprecated APIs, missing new APIs, stale code examples, WP 7.0 best practices. Each revision includes a minimal code example tested on dev site (WP 7.0) before commit.

## Risk mitigations (from risk-assessment.md)

| Risk | Mitigation step |
|---|---|
| Skill revisions introduce misunderstood WP 7.0 APIs → every downstream task using that skill generates buggy code | Step 7.2: Each skill revision includes a minimal code example tested live on dev site (Playwright + console error check). "Audited" ≠ "verified" — gate is working code, not just reading docs. |
| Sgs_Ai_Connector: wp_get_connector() returns null without a provider plugin → fatal error | Step 7.1: `Sgs_Ai_Connector::get()` checks `wp_is_connector_registered($provider)` BEFORE calling `wp_get_connector()`. Returns `WP_Error` with message (NOT throw). Class safe to instantiate with zero registered providers. |
| Phase 7 skills audit affects blocks Phase 6 is editing simultaneously | Phase 6 MUST complete + merge before Phase 7 dispatches. Annotated in prerequisites. |
| WP 7.1 ships mid-programme (~4-month cadence puts 7.1 within window) | If 7.1 ships before Phase 7 dispatches: expand Phase 7 scope to include 7.1 additions. Note in cold prompt: check `developer.wordpress.org/reference/deprecated-7.1/` if 7.1 is live. |

## Pre-resolved decisions (from hidden-decisions.md)

- **Sgs_Ai_Connector — makes actual AI calls?** RESOLVED: Infrastructure-only. No calls. Registers provider hooks via `wp_connectors_init`. Future AI feature work plugs in via `Sgs_Ai_Connector::get($provider)->generate_text($prompt)` pattern.
- **Skills audit — what counts as deprecated?** RESOLVED: Anything removed in WP 7.0 OR marked deprecated in `developer.wordpress.org/reference/deprecated-7.0/`. "No longer recommended but still works" is a soft flag, not a hard fix. Hard fixes for deprecated APIs; soft flags documented in skill as "prefer X over Y in WP 7.0+".
- **Audit completeness — block on critical incompatibility?** RESOLVED: Audit reports findings + remediation cost per skill. Bean decides whether to block Phase 7 for critical findings or split into 7a (critical) + 7b (deferrable). Implementer does NOT unilaterally split — surface findings and ask.
- **PHP-only block registration (§12.5):** RESOLVED: Criteria-gated — block has no editor JS surface AND is server-rendered only. Audit (Step 7.2) identifies candidates. Do NOT convert blocks to PHP-only without explicit Bean approval. List candidates only.

---

## Steps

### Step 7.1 — Implement Sgs_Ai_Connector PHP class (Decision 26)

- **Action:** Create `plugins/sgs-blocks/includes/class-sgs-ai-connector.php`:
  1. Class `Sgs_Ai_Connector` with static and instance methods
  2. `Sgs_Ai_Connector::is_available( string $provider = '' ) : bool` — wraps `wp_is_connector_registered()`. If `$provider` empty, checks if ANY connector is registered (`count(wp_get_connectors()) > 0`).
  3. `Sgs_Ai_Connector::get( string $provider = '' ) : WP_Connector|WP_Error` — calls `wp_get_connector( $provider )`. Returns `WP_Error( 'sgs_no_ai_connector', 'No AI connector registered. Activate an AI provider plugin.' )` if `!$this->is_available($provider)`. NEVER throws.
  4. `Sgs_Ai_Connector::get_all() : array` — calls `wp_get_connectors()`. Returns empty array if none registered.
  5. Add a `wp_connectors_init` hook handler `Sgs_Ai_Connector::on_connectors_init()` — currently a no-op stub with a doc comment: "Register SGS-specific connector configuration here when AI features are added."
  6. Provider roadmap as PHPDoc: `@roadmap OpenAI (via openai-for-wp), Anthropic, Gemini, Ollama (local). Feature: alt-text gen, headline gen, image gen for hero/card backgrounds.`
  7. Add safety guard: `if ( ! function_exists( 'wp_get_connector' ) ) { return; }` at the top of the constructor and each method that calls WP 7.0 functions — safe on WP 6.x if accidentally included.
  8. Register class in `sgs-blocks.php` with a `is_wp_7_or_later()` guard so it only loads on WP 7.0+.
  9. Add one unit test file `plugins/sgs-blocks/tests/test-sgs-ai-connector.php`: test that `Sgs_Ai_Connector::get()` returns a `WP_Error` when `wp_is_connector_registered()` returns false (mock the WP function). Test that `is_available()` returns false when `wp_get_connectors()` returns empty array.
- **Files:** CREATE `plugins/sgs-blocks/includes/class-sgs-ai-connector.php`; CREATE `plugins/sgs-blocks/tests/test-sgs-ai-connector.php`; MODIFY `plugins/sgs-blocks/sgs-blocks.php` (require + wp7 guard)
- **Inputs:** WP 7.0 AI Connectors API: `wp_get_connector()`, `wp_get_connectors()`, `wp_is_connector_registered()`, `wp_connectors_init` hook (staging doc §4.14, §11 Decision 26). Web search "wp_get_connector WP 7.0 AI Connectors API" to confirm exact function signatures before writing.
- **Outputs:** `Sgs_Ai_Connector` class registered; safe-fail confirmed via unit tests; WP 7.0+ guard in place
- **Time:** 20-35 min
- **Tooling:** Write tool; web search for WP 7.0 AI Connectors API signatures; PHP unit test (or manual WP-CLI eval-file test on dev site if PHPUnit not configured); WP-CLI eval to confirm class loads correctly
- **On-Fail:** If `wp_get_connector()` function signature differs from staging doc §4.14 (API docs may be more specific), adapt class to correct signature. Do NOT guess a wrong function signature.
- **QC gate:** `wp eval 'Sgs_Ai_Connector::get("nonexistent");' | grep WP_Error` must return truthy. `/qc-inline` after this step before proceeding to Step 7.2.

### Step 7.2 — Audit + update 10 WP-family skills for WP 7.0 (Decision 29)

- **Action:** For each of the 10 skills listed below, run the audit pass then update. Each skill lives at `~/.claude/skills/<skill-name>/SKILL.md` (or `~/.agents/skills/<skill-name>/SKILL.md` — check both locations). Audit protocol per skill:
  1. Read the skill's code examples section
  2. Check against `developer.wordpress.org/reference/deprecated-7.0/` for any deprecated APIs referenced
  3. Check for missing WP 7.0 features that belong in this skill's domain (see per-skill checklist below)
  4. Identify stale code examples (WP 6.x patterns now superseded)
  5. Write a 1-page audit finding: skill name, deprecated-API hits, missing-API gaps, stale examples, remediation cost (low/med/high)
  6. For HIGH-cost remediations: surface to Bean BEFORE committing (split option: 7a critical / 7b deferrable)
  7. For LOW/MED remediations: update the skill's SKILL.md. Every update must include a minimal code example tested on dev site (WP 7.0) before committing the revision. "Audited" without a live test = not done.

  **Per-skill WP 7.0 checklist items to check for:**

  | Skill | WP 7.0 items to check |
  |---|---|
  | `wp-block-development` | apiVersion 3 (iframed editor), role:content attribute, PHP-only block registration candidates, listView support, @wordpress/grid package, pseudo-element theme.json support |
  | `wp-block-themes` | theme.json pseudo-elements (:hover/:focus), preset dimensions, per-site theme.json model (Phase 5a), Font Library dedicated page UX, Site Identity in Design panel |
  | `wp-interactivity-api` | watch() + data-wp-watch reactive primitives (4.11), any deprecated directive patterns from WP 6.x |
  | `wp-plugin-development` | AI Connectors registration pattern, Script Module translations, WP_REST_Icons_Controller usage |
  | `wp-rest-api` | WP_REST_Icons_Controller (registered icons endpoint), WP_Sync_Post_Meta_Storage (collaborative sync infra), WP_REST_Abilities_V1_List_Controller (Abilities API confirmed stable in 7.0) |
  | `wp-wpcli-and-ops` | wp sgs CLI commands surface (from Spec 19); any WP-CLI handbook updates for WP 7.0 commands |
  | `wp-performance` | Any WP 7.0 performance changes: iframed editor impact, Script Module loading changes, View Transitions CSS cost |
  | `wp-abilities-api` | Abilities API confirmed stable in WP 7.0 (§4.19). Update skill to note WP 7.0 as canonical version. `WP_REST_Abilities_V1_List_Controller` class. |
  | `wp-site-extraction` | WP 7.0 block structures (apiVersion 3, role:content) affect extraction parsing; update expected block.json shapes |
  | `wp-project-triage` | WP 7.0 as new baseline; add 7.0-specific triage checks: iframed editor breakage, missing role:content, deprecated APIs |

- **Files:** `~/.claude/skills/<skill>/SKILL.md` or `~/.agents/skills/<skill>/SKILL.md` for each of the 10 skills (MODIFY); CREATE `reports/phase-7-skills-audit-<date>.md` consolidating all 10 audit findings
- **Inputs:** 10 skill SKILL.md files; `developer.wordpress.org/reference/deprecated-7.0/`; `developer.wordpress.org/reference/since/7.0.0/`; dev site (WP 7.0) for code example testing; Phase 6 completed (blocks have apiVersion 3 + role:content by this point)
- **Outputs:** 10 updated skill files; consolidated audit report; PHP-only block candidates list (not converted — listed only); any HIGH-cost remediation items surfaced to Bean for splitting decision
- **Time:** 50-110 min (varies significantly — skills may need light touch or substantial update)
- **Tooling:** Read tool for SKILL.md files; web search for WP 7.0 deprecated API list; Playwright + WP-CLI eval for minimal code example testing per skill revision; Write/Edit for SKILL.md updates
- **On-Fail:** If a skill has HIGH-cost remediations (e.g. entire code-example section needs rewrite due to deprecated APIs): commit audit findings report + list of HIGH items. Surface to Bean. Do NOT spend >20 min on a single HIGH-cost skill revision without Bean approval to continue.

---

## Acceptance criteria

- `plugins/sgs-blocks/includes/class-sgs-ai-connector.php` exists and is registered in `sgs-blocks.php`
- `wp eval 'var_dump(Sgs_Ai_Connector::is_available());'` returns `bool(false)` on dev site (no provider plugin active — expected)
- `wp eval '$r = Sgs_Ai_Connector::get(); var_dump($r instanceof WP_Error);'` returns `bool(true)` on dev site
- WP 7.0 guard in place: class does NOT load on WP < 7.0
- `reports/phase-7-skills-audit-<date>.md` exists with findings for all 10 skills
- All 10 skill SKILL.md files updated (or explicitly noted "no changes required" in audit report)
- Each updated skill includes at least one minimal code example confirmed working on WP 7.0 dev site
- No skill revision introduces a code example that references a function in `developer.wordpress.org/reference/deprecated-7.0/`
- PHP-only block candidates listed in audit report (NOT converted — listed only, awaiting Bean decision)

## Subagent cold prompt (for the orchestrator to dispatch)

```
You are implementing Decisions 26 and 29 from the SGS architecture programme — WP 7.0 AI Connectors infrastructure wrapper + comprehensive WP-family skills audit.

# CRITICAL: Phase sequencing check

Before writing any code, verify:
1. Phase 1 shipped: python ~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py → all assertions pass. If not, STOP.
2. Phase 6 shipped: git log --oneline | grep 'phase-6' → expect at least one commit. If missing, STOP — Phase 6 must complete before Phase 7 dispatches (skills audit affects same blocks Phase 6 modified).

If WP 7.1 is now live (check: wp eval 'echo $GLOBALS["wp_version"];' on dev site):
  - Expand Step 7.2 audit scope to include deprecated-7.1 APIs.
  - Check developer.wordpress.org/reference/deprecated-7.1/ as additional input for each skill.

# Read first

- .claude/plans/2026-05-21-architecture-staging.md §3 Phase 7 row + §11 Decisions 26, 29 + §4.14 AI Connectors framework
- .claude/reports/strategic-plan-2026-05-21/risk-assessment.md Phase 7 section (3 risks)
- .claude/reports/strategic-plan-2026-05-21/hidden-decisions.md Phase 7 section

# What to build — 2 steps

## Step 1: Sgs_Ai_Connector class (Decision 26)

Web search "wp_get_connector WP 7.0 WordPress AI Connectors" FIRST — confirm exact function signatures before writing a single line. The canonical reference is developer.wordpress.org/reference/since/7.0.0/ filtered for wp_*connector* functions.

CREATE plugins/sgs-blocks/includes/class-sgs-ai-connector.php

Required methods:
  Sgs_Ai_Connector::is_available( string $provider = '' ) : bool
    → wraps wp_is_connector_registered()
    → if $provider empty, returns count(wp_get_connectors()) > 0

  Sgs_Ai_Connector::get( string $provider = '' ) : WP_Connector|WP_Error
    → checks is_available($provider) first
    → returns WP_Error('sgs_no_ai_connector', 'No AI connector registered.') if not available
    → NEVER throws

  Sgs_Ai_Connector::get_all() : array
    → wraps wp_get_connectors()
    → returns [] if none registered

  static method Sgs_Ai_Connector::on_connectors_init() : void
    → no-op stub. PHPDoc: "Register SGS-specific connector config here when AI features ship."

Safety guards:
  - if ( ! function_exists( 'wp_get_connector' ) ) { return; } at top of each method
  - WP 7.0+ class-load guard in sgs-blocks.php: only require_once if version_compare( $wp_version, '7.0', '>=' )

Provider roadmap as class PHPDoc (not implementation):
  @roadmap OpenAI, Anthropic, Gemini, Ollama. Features: alt-text gen, headline gen, image gen.

CREATE plugins/sgs-blocks/tests/test-sgs-ai-connector.php
Tests:
  - get() returns WP_Error when wp_is_connector_registered() is false
  - is_available() returns false when wp_get_connectors() returns []
  - is_available() returns true when wp_get_connectors() returns non-empty

Register class in sgs-blocks.php.
Run on dev site: wp eval '$r = Sgs_Ai_Connector::get(); var_dump($r instanceof WP_Error);' → must return bool(true)
Run /qc-inline before Step 2.

## Step 2: Audit + update 10 WP-family skills (Decision 29)

Skills to audit:
1. wp-block-development
2. wp-block-themes
3. wp-interactivity-api
4. wp-plugin-development
5. wp-rest-api
6. wp-wpcli-and-ops
7. wp-performance
8. wp-abilities-api
9. wp-site-extraction
10. wp-project-triage

Skills live at ~/.claude/skills/<name>/SKILL.md or ~/.agents/skills/<name>/SKILL.md — check both locations.

For each skill, run this protocol:

(a) AUDIT: Check against developer.wordpress.org/reference/deprecated-7.0/ for deprecated APIs.
    Check for missing WP 7.0 features relevant to the skill (see per-skill checklist below).
    Identify stale code examples (WP 6.x patterns superseded by 7.0).
    Record: deprecated-API hits | missing-API gaps | stale examples | remediation cost (LOW/MED/HIGH)

(b) DECISION:
    HIGH cost (>20 min revision) → surface to Bean, await decision to split (7a critical / 7b defer)
    LOW/MED cost → update SKILL.md directly

(c) UPDATE: Every update must include a minimal code example confirmed working on dev site.
    wp eval-file test OR Playwright console-error check.
    "Audited but not tested" = incomplete. Test or don't update.

Per-skill WP 7.0 checklist (check these items specifically for each skill):

wp-block-development: apiVersion 3 iframed editor behaviour, role:content attribute, PHP-only block registration (list candidates, don't convert), listView support, @wordpress/grid, pseudo-elements in theme.json
wp-block-themes: theme.json pseudo-elements, preset dimensions, per-site theme.json model, Font Library page UX, Site Identity in Design panel
wp-interactivity-api: watch() + data-wp-watch (new in 7.0), deprecated directive patterns from 6.x
wp-plugin-development: AI Connectors registration (wp_connectors_init), Script Module translations (wp_set_script_module_translations), WP_REST_Icons_Controller
wp-rest-api: WP_REST_Icons_Controller, WP_Sync_Post_Meta_Storage, WP_REST_Abilities_V1_List_Controller (Abilities API stable in 7.0)
wp-wpcli-and-ops: wp sgs CLI surface from Spec 19, WP-CLI handbook updates for 7.0
wp-performance: iframed editor performance impact, Script Module loading changes, View Transitions CSS budget
wp-abilities-api: WP 7.0 is canonical version — update to confirm stability. WP_REST_Abilities_V1_List_Controller.
wp-site-extraction: apiVersion 3 + role:content affect block extraction shape; update expected block.json parsing
wp-project-triage: WP 7.0 as new baseline; add triage checks for iframed editor breakage, missing role:content, deprecated APIs

Output consolidated audit at:
reports/phase-7-skills-audit-<date>.md

# Commit gates

Do NOT commit if:
- Phase 1/6 checks show any phase incomplete
- wp eval test of Sgs_Ai_Connector::get() does not return WP_Error when no provider active
- Any skill revision introduces a code example calling a function in deprecated-7.0/
- Audit report missing for any of the 10 skills
- Any skill update lacking a live-tested code example

Commit message: "feat(phase-7): Sgs_Ai_Connector + WP 7.0 skills audit — Decisions 26/29 [qc:phase-7-self-verify]"

# Time budget

75-165 min realistic. 180 min ceiling.
Step 1 safe boundary: after Sgs_Ai_Connector committed + /qc-inline passes.
At ceiling: commit Step 1 completed + partial Step 2 progress. Surface remaining skills to next session.

# Safety clauses

- Sgs_Ai_Connector is INFRASTRUCTURE ONLY. Zero actual AI calls. No provider plugins required.
- Skills audit: list PHP-only block candidates but do NOT convert any block without explicit Bean approval.
- HIGH-cost skill remediations: surface and ask, don't unilaterally descope or convert to partial updates.
- Step 2 update rule: each skill revision tested on WP 7.0 dev site with a working code example. No exceptions.

# Methodology guardrails (do not skip)
- blub.db 254 — Read pipeline-state/<run>/leftover-buckets.json BEFORE conjecturing
- blub.db 255 — Multi-model /qc panel BEFORE every converter/pipeline/SGS-block commit (Decision 31 hook from Phase 0.5)
- blub.db 256 — Per-section cropped pixel-diff, never full-page
- blub.db 272 — Schema enumeration BEFORE missing-X claims
- blub.db 276 — Council fix-shape proposals are hypotheses; empirical pre/post baseline required
- blub.db 281 — QC gate must be structural; commit messages MUST cite [qc:<run_id>]
- blub.db 282 — Fix what QC surfaces regardless of provenance
- No git stash, reset --hard, restore, checkout --, clean -f
- No --no-verify
- No Co-Authored-By
- Commit by exact path (never git add . or -A)
- Stay on main directly
```

## Post-phase QC

/qc-council Stage 5 (Sonnet + Haiku + Gemini Flash + Cerebras):

1. **Sonnet primary:** Review `Sgs_Ai_Connector` class — confirm safe-fail path on `wp_get_connector()` call, confirm WP 7.0+ version guard, confirm no actual AI calls anywhere in the class. Spot-check 3 skill revisions for WP 7.0 accuracy (check code examples against `developer.wordpress.org/reference/since/7.0.0/`).
2. **Haiku cross-check:** Run `grep -rn "deprecated\|@deprecated" ~/.claude/skills/wp-*/SKILL.md ~/.agents/skills/wp-*/SKILL.md` — confirm no code examples in updated skills reference deprecated-7.0 APIs. Confirm audit report exists and covers all 10 skills.
3. **Gemini Flash:** WP-CLI test on dev site — `wp eval '$r = Sgs_Ai_Connector::get(); echo ($r instanceof WP_Error) ? "safe-fail OK" : "BROKEN";'` → must output "safe-fail OK". Also `wp eval 'echo Sgs_Ai_Connector::is_available() ? "available" : "not available";'` → must output "not available" (no provider plugin installed).
4. **Cerebras:** Review skills audit report `reports/phase-7-skills-audit-<date>.md` — confirm all 10 skills have audit entries with explicit deprecated-API and missing-API findings documented. Flag any skill where "no changes required" was noted without evidence of checking the WP 7.0 deprecated list.

All 4 raters must agree. Programme complete after Phase 7 QC passes.
