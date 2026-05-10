# Phase 4 Sub-80 Audit — 18 Surfaces
**Date:** 2026-05-10
**Validator:** sgs-skillscore v2
**Scope:** 18 surfaces below threshold after Phase 4 convention-rollout propagation

---

## B3 polish — 47.2% F

**File type judgement:** Mini-skill (sub-skill routed via `/innovative-design`, not user-invocable)

**Content quality assessment:**
Yes, the content is correct and complete for its type. It covers a thorough, methodical final-pass checklist across visual alignment, typography, interactions, states, responsiveness, and code quality. The `user-invocable: false` front-matter and the note "routed via `/innovative-design`" are both present. Content is substantive and directly usable.

**Per-tier failure analysis:**
- `fatal_negative_routing_desc` — rubric mismatch. A non-user-invocable sub-skill has no need for a description-level negative routing clause; negative routing belongs in the parent router.
- `fatal_when_not_to_use` — rubric mismatch. Sub-skills don't need their own "When NOT to use" section; the router decides when to call them.
- All QUALITY failures (goal section, common mistakes, correction ledger, references dir, HARD GATE, numbered stages, self-orchestration, system-effect) — rubric mismatch. A 200-line sub-skill is not a standalone full skill; none of these structures are appropriate at this scale.
- `hygiene_uk_english` (line 85: "gray") — **genuine debt.** Two US spellings confirmed in the file (`gray`, line 85; `gray` in checklist). Worth fixing as a hygiene pass.
- All ARCHITECTURE failures (hooks dir, scripts dir, shared-references, process summary) — rubric mismatch.

**Recommendation:** Minor structural addition — fix the US English spellings ("gray" -> "grey", "colors" -> "colours", "optimize" -> "optimise" in checklist items). Everything else is rubric mismatch noise.

**Reasoning:** This skill does exactly one thing well and is never invoked directly by the user. The rubric expects a full standalone skill with stages, references, and gates — none of which a one-action sub-skill needs. The only real debt is a handful of US English spellings.

---

## B3 bolder — 41.5% F

**File type judgement:** Mini-skill (sub-skill routed via `/innovative-design`, not user-invocable)

**Content quality assessment:**
Yes, solid content for its type. It covers context gathering, amplification strategy, and systematically addresses typography, colour, spatial drama, visual effects, and motion. The anti-AI-slop warnings are particularly strong and differentiated. The embedded "magic numbers" (line 14: "5,598") are the uimax DB count — legitimately explained in context.

**Per-tier failure analysis:**
- `fatal_negative_routing_desc`, `fatal_when_not_to_use` — rubric mismatch. Same as polish above.
- All QUALITY failures — rubric mismatch.
- `hygiene_no_magic_numbers` (line 14) — rubric mismatch. The number "5,598" is the documented size of the uimax DB, cited in context. Not a magic number.
- `hygiene_uk_english` (line 49: "analyze") — **genuine debt.**
- `quality_imperative_voice` (line 36) — borderline. The line uses "you MUST STOP and call" which is addressed to Claude, not Bean. This is instruction-to-Claude voice, which is the correct mode for a skill body. Not genuine debt.
- All ARCHITECTURE failures — rubric mismatch.

**Recommendation:** Minor structural addition — fix US English ("analyze" -> "analyse"). All other failures are rubric mismatch.

**Reasoning:** Content is well-differentiated, opinionated, and anti-slop. The rubric failures are 100% structural noise for a sub-skill of this type.

---

## B3 colourise — 43.5% F

**File type judgement:** Mini-skill (sub-skill routed via `/innovative-design`, not user-invocable)

**Content quality assessment:**
Yes, strong content for its type. Covers colour strategy, OKLCH usage, semantic colour application, accessibility checks, and the 60/30/10 rule. The advice is specific and actionable. Eight US English spelling instances are a real hygiene gap.

**Per-tier failure analysis:**
- `fatal_negative_routing_desc`, `fatal_when_not_to_use` — rubric mismatch.
- All QUALITY failures — rubric mismatch.
- `quality_imperative_voice` (line 36) — same as bolder above, instruction-to-Claude voice, not genuine debt.
- `hygiene_uk_english` (8 lines, e.g. "gray", "colorize") — **genuine debt.** Multiple instances throughout, including "colorize" in the description arg comment (line 6) and "gray" in multiple code examples.
- All ARCHITECTURE failures — rubric mismatch.

**Recommendation:** Minor structural addition — fix all 8 US English instances. The front-matter `description` also has `colorize` which should be `colourise` if possible.

**Reasoning:** The skill name itself is correctly spelt ("colourise") but the body has drifted back to US spellings in several places. Genuine hygiene debt worth a single-pass fix. Everything structural is rubric mismatch.

---

## B3 distill — 43.5% F

**File type judgement:** Mini-skill (sub-skill routed via `/innovative-design`, not user-invocable)

**Content quality assessment:**
Yes, clear and complete for its type. Covers information architecture simplification, visual simplification, layout, interaction, content, and code — all well-structured. Missing the uimax DB lookup block that the other mini-skills have (polish, bolder, colourise all start with a Consult ui-ux-pro-max section; distill does not). This is a genuine content gap — distill would benefit from querying the UX domain before recommending simplification decisions.

**Per-tier failure analysis:**
- `fatal_negative_routing_desc`, `fatal_when_not_to_use` — rubric mismatch.
- All QUALITY failures — rubric mismatch.
- `quality_imperative_voice` (line 22) — instruction-to-Claude voice, not genuine debt.
- `hygiene_uk_english` (2 lines: "analyze") — **genuine debt.**
- All ARCHITECTURE failures — rubric mismatch.

**Recommendation:** Minor structural addition — (1) fix US English ("analyze" -> "analyse"), (2) add the uimax DB lookup block at the top (matching the pattern in polish, bolder, colourise) so the skill queries the UX domain before simplifying.

**Reasoning:** The missing uimax lookup is the only genuine content gap relative to its sibling mini-skills — those all consult the DB first. Distill skips it, which means simplification decisions lack the curated backing. Two-line fix.

---

## B3 normalize — 47.2% F

**File type judgement:** Mini-skill (sub-skill routed via `/innovative-design`, not user-invocable)

**Content quality assessment:**
Yes, solid content for its type. Covers design system discovery, deviation analysis, and execution across typography, colour, spacing, components, motion, responsiveness, and accessibility. US English is scattered (3 instances: "analyze"). Missing the uimax DB lookup like distill.

**Per-tier failure analysis:**
- `fatal_negative_routing_desc`, `fatal_when_not_to_use` — rubric mismatch.
- All QUALITY failures — rubric mismatch.
- `hygiene_uk_english` (3 lines: "analyze") — **genuine debt.**
- All ARCHITECTURE failures — rubric mismatch.

**Recommendation:** Minor structural addition — fix US English and add the uimax DB lookup block (matching bolder/colourise pattern with `--domain ux`).

**Reasoning:** Same pattern gap as distill — sibling skills consult the DB, normalize does not. One-line addition fixes both the rubric appearance and the actual functional gap.

---

## B3 humanize — 50.0% D

**File type judgement:** Mini-skill — but this one is a CLI tool wrapper, not a design sub-skill. It documents Python scripts (`detect.py`, `transform.py`, `compare.py`) for AI text detection/transformation.

**Content quality assessment:**
Content is internally consistent but has a structural problem: the SGS-BEM Convention block appended at the end (lines 184-191) is copy-pasted from design mini-skills and makes zero sense here. This skill has nothing to do with CSS class names, drafts, or the SGS WordPress framework. It rewrites text to bypass AI detectors. The Spec 13 block is noise — it was applied mechanically during Phase 4 propagation without checking relevance.

> "Integration in this skill: Routed via `/innovative-design`." — This is also wrong. `/humanize` is a standalone command, not an `/innovative-design` sub-skill.

The bash blocks flagged for `hygiene_bash_error_handling` reference scripts that likely live at a fixed path — the error handling concern is real if the scripts can fail silently.

**Per-tier failure analysis:**
- `fatal_negative_routing_desc`, `fatal_when_not_to_use` — **genuine debt**, modest. This skill could usefully say "Do NOT use for design text — use `/innovative-design`. Do NOT use for technical documentation." Would stop misdirected invocations.
- All QUALITY failures — largely rubric mismatch for a CLI doc wrapper.
- `hygiene_bash_error_handling` — **genuine debt.** The batch processing loops at lines 163-172 have no error handling; a failed script in a loop silently continues.
- Architecture failures — rubric mismatch.

**Recommendation:** Minor structural addition — (1) Remove the SGS-BEM Convention block entirely (it is wrong content for this skill), (2) fix the "Routed via `/innovative-design`" line (this is not correct), (3) add a brief "When NOT to use" naming alternatives like `/writing-clearly-and-concisely` for general editing.

**Reasoning:** The SGS-BEM block is actively misleading in this file — it implies class-name output that will never happen. This is the only file in the 18 where Phase 4 propagation introduced incorrect content rather than just structural noise.

---

## B3 quieter — 46.4% F

**File type judgement:** Mini-skill (sub-skill routed via `/innovative-design`, not user-invocable)

**Content quality assessment:**
Yes, solid content. Good coverage of colour refinement, visual weight reduction, simplification, and motion reduction. Clear "Quieter doesn't mean boring" framing. Missing the uimax DB lookup like distill and normalize.

**Per-tier failure analysis:**
- `fatal_negative_routing_desc`, `fatal_when_not_to_use` — rubric mismatch.
- All QUALITY failures — rubric mismatch.
- `quality_imperative_voice` (line 22) — instruction-to-Claude voice, not genuine debt.
- `hygiene_uk_english` (3 lines: "analyze") — **genuine debt.**
- All ARCHITECTURE failures — rubric mismatch.

**Recommendation:** Minor structural addition — fix US English; add uimax DB lookup (matching pattern from bolder/colourise).

**Reasoning:** Same pattern gap as distill and normalize. Sibling mini-skills query the DB for domain context; quieter does not.

---

## B3 delight — 48.0% F

**File type judgement:** Mini-skill (sub-skill routed via `/innovative-design`, not user-invocable)

**Content quality assessment:**
Yes, strong content. Most detailed of the mini-skills — comprehensive coverage of micro-interactions, personality in copy, illustrations, sound design, Easter eggs, loading states, and celebration moments. At 317 lines it is at the edge of being too long (`arch_body_concise` flagged). The length is justified: delight has many sub-domains and the specificity (Konami code, rotation messages, library names) is genuinely useful. One US English instance ("optimize", line 295).

**Per-tier failure analysis:**
- `fatal_negative_routing_desc`, `fatal_when_not_to_use` — rubric mismatch.
- `quality_imperative_voice` (line 22) — instruction-to-Claude voice, not genuine debt.
- All other QUALITY failures — rubric mismatch.
- `arch_body_concise` (317 lines) — **borderline genuine debt.** The length is earned — no padding — but the implementation patterns section (Framer Motion, Howler.js, React Spring) could be a reference link rather than inline if trimming were needed. Not urgent.
- `hygiene_uk_english` (line 295: "optimize") — **genuine debt.**
- All ARCHITECTURE failures — rubric mismatch.

**Recommendation:** Minor structural addition — fix US English ("optimize" -> "optimise"). Length is fine as-is.

**Reasoning:** This is the most thorough of the mini-skills and the length reflects genuine content depth, not padding. One spelling fix needed.

---

## B3 audit — 47.2% F

**File type judgement:** Mini-skill (sub-skill routed via `/innovative-design`, not user-invocable)

**Content quality assessment:**
Yes, solid audit reporter. Covers accessibility, performance, theming, and responsive design dimensions. The output structure (anti-patterns verdict, executive summary, findings by severity, systemic issues, positive findings, recommendations, suggested commands) is well-designed. The reference to `/colorize` in the suggested commands list (lines 74, 111) should be `/colourise` — this is a genuine routing error that would produce a failed invocation.

**Per-tier failure analysis:**
- `fatal_negative_routing_desc`, `fatal_when_not_to_use` — rubric mismatch.
- All QUALITY failures — rubric mismatch.
- `hygiene_uk_english` (5 lines: "gray") — **genuine debt.** Additionally, `/colorize` in the suggested command lists is wrong — the skill is named `colourise`.
- All ARCHITECTURE failures — rubric mismatch.

**Recommendation:** Minor structural addition — fix US English and fix the `/colorize` command references to `/colourise` in lines 74 and 111. These are functional errors, not cosmetic.

**Reasoning:** The `/colorize` references are the only genuine functional error across the mini-skills — they would cause a failed skill invocation if Bean followed the suggested command. Worth fixing.

---

## B3 optimise — 47.2% F

**File type judgement:** Mini-skill (sub-skill routed via `/innovative-design`, not user-invocable)

**Content quality assessment:**
Yes, thorough performance optimisation reference. Covers images, JS bundles, CSS, fonts, loading strategy, rendering, animations, React-specific patterns, network, and Core Web Vitals. 13 US English spellings flagged — the highest count of any mini-skill. The irony that the file is named `optimise` but the body repeatedly uses "optimize" is notable.

**Per-tier failure analysis:**
- `fatal_negative_routing_desc`, `fatal_when_not_to_use` — rubric mismatch.
- All QUALITY failures — rubric mismatch.
- `hygiene_uk_english` (13 lines: "optimize", "optimized", etc.) — **genuine debt.** This is the most significant spelling issue across all 18 surfaces.
- All ARCHITECTURE failures — rubric mismatch.

**Recommendation:** Minor structural addition — systematic UK English pass throughout the body (13 instances including "optimize", "optimization", "optimized"). A `replace_all` on the core variants would clear this in one step.

**Reasoning:** A skill named `optimise` that uses "optimize" 13 times in its body is a hygiene issue worth fixing in a single pass. All structural failures are rubric mismatch.

---

## B5 clone-patterns — 60.0% D

**File type judgement:** Slash command (lives in `~/.claude/commands/`, user-invocable shortcut)

**Content quality assessment:**
Yes, correct and complete for a command file. It documents the CLI, parse rules for three subcommands (analyse, generate, clone), and the SGS-BEM convention. Short and precise — appropriate for a command wrapper. The `argument-hint` is well-formed.

**Per-tier failure analysis:**
- `quality_hard_gate` — rubric mismatch. Command wrappers don't gate on HARD GATE markers.
- `quality_numbered_stages` — rubric mismatch. The three subcommand modes (analyse/generate/clone) are the stages — they're documented but not formatted as a numbered list.
- `quality_specific_alternatives` — **genuine debt, modest.** The "When NOT to use" clause is present implicitly (this runs the CLI; for pattern library management use `/sgs-update`, for block lookup use `/wp-blocks`) but naming them explicitly would help routing.
- `arch_process_summary` — rubric mismatch.

**Recommendation:** Minor structural addition — add a brief "When NOT to use" line naming `/sgs-update` (for DB regen, not pattern gen) and `/wp-blocks` (for block schema lookup) as alternatives. Two lines. Everything else is rubric mismatch.

**Reasoning:** The command is correctly scoped. The only real gap is explicit negative routing so the router doesn't misdirect.

---

## B7 sgs-update — 70.0% C

**File type judgement:** Slash command (lives in `~/.claude/commands/`, 4-stage pipeline runner)

**Content quality assessment:**
Yes, well-structured and complete. The four-stage sequence is clear, the idempotency notes are correct, and the Stage 2 fallback instruction is a good defensive pattern. The hardcoded Windows paths in the bash blocks are correct (these are the actual paths on Bean's machine) and appropriate for a user-specific command file.

**Per-tier failure analysis:**
- `quality_hard_gate` — rubric mismatch. Commands don't use HARD GATE markers.
- `quality_specific_alternatives` — **genuine debt, modest.** No "When NOT to use" section. A line naming `/sgs-db` (for read-only queries) and `/clone-patterns` (for one-off pattern generation without a full regen) would sharpen routing.
- `arch_process_summary` — rubric mismatch.

**Recommendation:** Minor structural addition — add a brief "When NOT to use" naming `/sgs-db` (read queries don't need a full regen) and `/clone-patterns` (pattern generation without DB update). Two lines.

**Reasoning:** Otherwise well-built. The only real gap is explicit negative routing — currently nothing tells users "don't run this just to look something up."

---

## B7 wp-blocks — 60.0% D

**File type judgement:** Slash command (lives in `~/.claude/commands/`, CLI wrapper for `wp-blocks.py`)

**Content quality assessment:**
Yes, correct and complete. Clean subcommand table (search, schema, attrs, markup, match, variations, validate, tokens, gaps, impact, weaknesses, health). The SGS-BEM convention block is relevant here (this skill returns slot ids and attribute values used to construct BEM class names — the integration note is correct).

**Per-tier failure analysis:**
- `quality_hard_gate` — rubric mismatch.
- `quality_numbered_stages` — rubric mismatch. The subcommand list is the equivalent of stages.
- `quality_specific_alternatives` — **genuine debt, modest.** No "When NOT to use." Should name `/sgs-db` (for richer framework context: deploy steps, gotchas, cascading impact) and `/clone-patterns` (for full pattern generation from a URL).
- `arch_process_summary` — rubric mismatch.

**Recommendation:** Minor structural addition — add "When NOT to use" naming `/sgs-db` (for broader framework context beyond block schema) and `/sgs-update` (for adding new blocks to the DB). Two lines.

**Reasoning:** The command correctly wraps the CLI but lacks routing guardrails that would prevent users calling it when `/sgs-db` is more appropriate.

---

## B7 sgs-db — 70.0% C

**File type judgement:** Slash command (lives in `~/.claude/commands/`, direct DB query shortcut)

**Content quality assessment:**
Yes, well-structured. The only command file in the set that already has an explicit "When NOT to use" section with named alternatives (`/wp-hooks`, `/wp-blocks`, `/sgs-update`). This is the closest of the command files to rubric compliance. The numbered stages and HARD GATE failures are rubric mismatch for a command file.

**Per-tier failure analysis:**
- `quality_hard_gate` — rubric mismatch.
- `quality_numbered_stages` — rubric mismatch. The usage table is the equivalent.
- `arch_process_summary` — rubric mismatch.

**Recommendation:** No change — rubric mismatch baseline. Content is correct, "When NOT to use" is already present, alternatives are named.

**Reasoning:** This is the best-structured command file in the set. The three remaining failures are all structural checks that don't apply to a command wrapper. No real debt.

---

## B7 dev — 70.0% C

**File type judgement:** Slash command (lives in `~/.claude/commands/`, dev workflow router)

**Content quality assessment:**
Yes, well-structured. The phase routing table is clear (start/debug/review/feedback/verify/ship/commit), the chained execution for verify/ship/commit is explained in detail including the deliberate reasoning for not using a hook. The examples section is good. The SGS-BEM Convention block is marginally relevant (the `ship` and `commit` phases emit class names) but the "Dev-pipeline phases that emit class names" framing is accurate.

**Per-tier failure analysis:**
- `quality_hard_gate` — rubric mismatch.
- `quality_numbered_stages` — rubric mismatch. The phase table is the stages.
- `quality_specific_alternatives` — **genuine debt, modest.** The "When NOT to use" is absent. Should say: "Do NOT invoke for: SGS block builds (use `wp-sgs-developer` agent), design reviews (use `design-reviewer` agent), or isolated git commits (use `/commit` directly if you want to skip diagnostics)."
- Architecture failures — n/a, this command passes architecture checks.

**Recommendation:** Minor structural addition — add "When NOT to use" naming `wp-sgs-developer` (for WordPress-specific builds), `design-reviewer` (for visual QA), and `/commit` (for direct commits bypassing diagnostics).

**Reasoning:** The routing table tells you what each phase does, but doesn't tell you when `/dev` is the wrong entry point entirely. That's a genuine routing gap.

---

## B8 wp-sgs-developer — 46.8% F

**File type judgement:** Agent definition file (lives in `~/.claude/agents/`)

**Content quality assessment:**
Largely good. The four operating modes (Replication, Build, QA/Audit, Maintenance) are well-defined. The CSS Override Rule, CSS Debugging Rule, Tool Budget Awareness, Hover Interaction verification table, and Rollback/Error Recovery sections are substantive and directly useful. The agent is long (287 lines) but the length is earned — it contains dense, specific operational protocols.

Genuine issues:
1. **Phantom skills** flagged: `themes`, `sgs-booking`, `arrow`, `sgs-rollback-`, `backdrop-filter`. Looking at the file, `arrow` and `backdrop-filter` appear in CSS property contexts, not as skill invocations — these are false positives from the validator. `sgs-rollback-` appears in a bash variable name (`sgs-rollback-$(date...)`), also a false positive. `themes` and `sgs-booking` appear in namespace references (`SGS\Booking`), not as skill invocations. All phantom skill flags are false positives.
2. **Tool bloat** flagged: `Write`, `Grep`, and all Playwright tools declared but not mentioned by name in the body. This is correct agent design — tools are listed in the header to give the agent access, not to be individually narrated in the body. Rubric mismatch.
3. **Hardcoded paths** (lines 52, 130) — **genuine debt.** `C:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks` in the build sequence. If this agent were ever used on a different machine these would break. However this is a single-user agent file — the risk is low in practice.
4. **agent_body_length** (287 lines) — borderline. The length is justified by operational complexity. Removing any of the four mode sections, CSS debugging rules, or the hover verification table would genuinely reduce quality.
5. **Description has 4 "and" clauses** — rubric flag on "Builds and maintains the theme, develops blocks, replicates any website design using SGS blocks and editor settings, sets up client sites, innovates features, and keeps the framework ahead of competition." This is accurate scope, not scope creep.
6. **Missing "When NOT to use"** — **genuine debt.** The `design-reviewer` agent is the natural complement but the file doesn't name it as the boundary. A "Do NOT delegate to this agent for: design review and visual QA (use `design-reviewer`), performance profiling (use `performance-auditor`)" would sharpen dispatch routing.

**Recommendation:** Minor structural addition — add a "When NOT to use" section naming `design-reviewer` (visual QA), `performance-auditor` (Lighthouse/Core Web Vitals), and `seo-auditor` (SEO analysis). The hardcoded path on line 52 is low-risk in a single-user context — leave unless building for portability.

**Reasoning:** Agent is well-built and operationally dense. The main real gap is missing negative routing that distinguishes it from `design-reviewer`.

---

## B8 design-reviewer — 53.3% D

**File type judgement:** Agent definition file (lives in `~/.claude/agents/`)

**Content quality assessment:**
Strong content. The 11-phase Mockup-to-WordPress Workflow (Extract spec → Human review → Screenshot mockup → Screenshot WP → Per-device walkthrough → States → Content stress testing → Technical comparison → Fix → Verify → Report) is the most thorough agent protocol in the SGS system. The Per-Finding Specificity Template, Fix Mandate, and Hard Issues vs Design Choices sections are excellent operational controls.

The `fatal_body_line_limit` flag (593 lines, limit 500) is the only FATAL failure. The length is real but the content is dense with operational value — the phase walkthrough alone is worth the length. However, the length could be reduced:
- PHASE 3 bash server snippet (lines 147-153) is boilerplate that could be a reference link
- PHASE 4/5 device walkthroughs repeat guidance that could be condensed
- The Design Quality section (lines 506-534) overlaps with content in the phase walkthroughs

**Genuine issues:**
1. **Body length 593 lines** — borderline genuine debt. Reduction would require removing substantive content. Consider whether the QA Audit Mode (lines 340-383) could be extracted into a separate reference file or condensed.
2. **agent_tool_bloat** — rubric mismatch. Same as wp-sgs-developer — tools declared for agent access, not narrated in body.
3. **Phantom skills** (`pressed`, `missing`, `specs`, `axe-core`, `interactivity`) — false positives. These are English words appearing in context, not skill invocations.
4. **agent_scope_creep** (6 "and" clauses) — the description is legitimately broad but accurate. "Also handles SEO visual analysis: above-the-fold content, mobile rendering..." is an absorbed scope (from seo-visual). Could be trimmed.
5. **Missing Common Mistakes table** — **genuine debt, modest.** The "Hard Issues vs Design Choices" section at lines 562-579 is the nearest equivalent but it's not formatted as a mistakes table. The most common failure mode (accepting a text report from a tool as visual evidence without Playwright verification) is not called out.
6. **Magic numbers** (6 lines, e.g. line 153: "8765" as http.server port) — rubric mismatch in context. Port 8765 is explained in surrounding bash — not an unexplained magic number.

**Recommendation:** Substantive rewrite needed — specifically: (1) extract the QA Audit Mode section (lines 340-383) into a `references/qa-audit-mode.md` and link from the agent body to reduce line count below 500, (2) add a brief "Common Mistakes" table capturing the top 2-3 agent failure modes (accepting tool reports without visual verification, not running axe-core first, skipping content stress testing).

**Reasoning:** The 593-line limit breach is a real structural issue — the rubric threshold (500 lines) is not arbitrary; it reflects the context budget an agent has available when it reads its own definition. Extracting the QA Audit Mode is a clean separation that doesn't lose content, just moves it to a reference the agent loads on demand.

---

## B9 test-driven-development — 47.5% F

**File type judgement:** Discipline reference doc (comprehensive TDD guide, not a workflow skill)

**Content quality assessment:**
Yes, content is correct and useful — this is a rigorous TDD reference covering the Red-Green-Refactor cycle, the Iron Law, common rationalisations, anti-patterns, a verification checklist, and a debugging integration note. The DOT graph for the TDD cycle is a nice touch. The file is 374 lines — over the 300-line "working budget" — but the content is genuinely dense and non-padded.

Genuine issues:
1. **US English** (9 instances: "behavior", "minimize", etc.) — **genuine debt.**
2. **Description uses second-person voice** ("Use when implementing any feature or bugfix") — **genuine debt.** Should be third-person: "Guides implementation of any feature or bugfix using test-first discipline."
3. The SGS-BEM Convention block at the end (lines 373-377) is present but abbreviated — it drops the "Routed via `/innovative-design`" line correctly, but the "When this skill emits class names..." framing is odd for a TDD skill that would rarely emit CSS class names. Low-harm but slightly incongruous.

**Per-tier failure analysis:**
- `fatal_desc_third_person` — **genuine debt.** Description is "Use when..." which is second-person.
- `fatal_negative_routing_desc` — **genuine debt, modest.** The description has no "Do NOT invoke for" clause. It would benefit from "Do NOT invoke for: code review of completed work (use `/dev review`), debugging existing failures (use `/dev debug`)."
- `fatal_when_not_to_use` — **genuine debt, modest.** No "When NOT to use" section in the body.
- All QUALITY failures (goal, common mistakes, numbered stages, etc.) — rubric mismatch for a discipline reference doc.
- `hygiene_uk_english` — **genuine debt.**
- `arch_body_concise` — borderline rubric mismatch. 374 lines is long for a skill but the content earns it.

**Recommendation:** Minor structural addition — (1) fix description to third-person, (2) add a brief "When NOT to use" naming `/dev debug` (existing bug, not new feature), `/dev review` (review of completed work), (3) fix 9 US English spellings.

**Reasoning:** Unlike the mini-skills, TDD is user-invocable (no `user-invocable: false`) so the FATAL failures around description voice and negative routing are genuine — they affect how autopilot routes to this skill. The structural quality failures (stages, goal section, HARD GATE) remain rubric mismatch for a discipline reference doc.

---

## Summary Table

| # | Surface | Recommendation |
|---|---------|----------------|
| 1 | B3 polish | Minor structural addition — fix US English spellings (grey, colours, optimise) |
| 2 | B3 bolder | Minor structural addition — fix US English ("analyse") |
| 3 | B3 colourise | Minor structural addition — fix 8 US English instances including front-matter arg comment |
| 4 | B3 distill | Minor structural addition — fix US English + add uimax DB lookup block (matches sibling pattern) |
| 5 | B3 normalize | Minor structural addition — fix US English + add uimax DB lookup block |
| 6 | B3 humanize | Minor structural addition — remove incorrect SGS-BEM block, fix wrong "Routed via `/innovative-design`" claim, add "When NOT to use" |
| 7 | B3 quieter | Minor structural addition — fix US English + add uimax DB lookup block |
| 8 | B3 delight | Minor structural addition — fix US English ("optimise") |
| 9 | B3 audit | Minor structural addition — fix US English + fix `/colorize` -> `/colourise` command references (functional routing error) |
| 10 | B3 optimise | Minor structural addition — systematic UK English pass (13 instances) |
| 11 | B5 clone-patterns | Minor structural addition — add "When NOT to use" naming `/sgs-update` and `/wp-blocks` |
| 12 | B7 sgs-update | Minor structural addition — add "When NOT to use" naming `/sgs-db` and `/clone-patterns` |
| 13 | B7 wp-blocks | Minor structural addition — add "When NOT to use" naming `/sgs-db` and `/sgs-update` |
| 14 | B7 sgs-db | No change — rubric mismatch baseline ("When NOT to use" already present) |
| 15 | B7 dev | Minor structural addition — add "When NOT to use" naming `wp-sgs-developer`, `design-reviewer`, `/commit` |
| 16 | B8 wp-sgs-developer | Minor structural addition — add "When NOT to use" naming `design-reviewer`, `performance-auditor`, `seo-auditor` |
| 17 | B8 design-reviewer | Substantive rewrite needed — extract QA Audit Mode to references/ to reduce body below 500 lines; add Common Mistakes table |
| 18 | B9 test-driven-development | Minor structural addition — fix description to third-person, add "When NOT to use", fix 9 US English spellings |
