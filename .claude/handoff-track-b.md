---
doc_type: handoff
project: small-giants-wp
project_id: 14
session_date: 2026-05-01
session_tag: small-giants-wp-2026-05-01-track-b-pipeline-rubrics
recommended_model: sonnet
track: B (pipeline rubrics)
---

# Session Handoff — 2026-05-01 (Track B — pipeline rubrics)

## Completed This Session

1. P4 rubric (Audit→Redesign Proposal) drafted, Stage QC peer-reviewed (Sonnet — Flash workspace-blocked, Cerebras queue-saturated), 6 unambiguous fixes applied, 3 negotiated decisions resolved, signed off. Saved at `~/.claude/pipelines/.rubrics/audit-redesign-proposal.md`. 10 criteria (14.0 weight), 12 Never Dos, 4 Lens 6 anchors.
2. P7 rubric (`/build-website` productised) drafted, Stage QC reviewed (Sonnet + Flash both returned, Cerebras dropped — third strike), 5 unambiguous fixes applied, 4 expert-call decisions applied (criterion 5 weight 1.5→2.0, criterion 6 weight 1.0→1.5, criterion 10 weight 1.0→1.5, Never Do #15 silent-INGEST-200), signed off. Saved at `~/.claude/pipelines/.rubrics/build-website.md`. 10 criteria (15.0 weight), 15 Never Dos.
3. P1 rubric (New Client Build greenfield) drafted, Stage QC reviewed (Sonnet + Flash strong convergence), 11 expert-call edits applied, signed off. Saved at `~/.claude/pipelines/.rubrics/new-client-build.md`. 10 criteria (16.0 weight), 15 Never Dos, 4 Lens 6 anchors.
4. P2 rubric (WP→SGS Migration) drafted, Stage QC NOT YET DISPATCHED. Saved at `~/.claude/pipelines/.rubrics/wp-to-sgs-migration.md` with `bean_signoff: pending`. 10 criteria (14.5 weight), 13 Never Dos, 4 Lens 6 anchors. Next session must dispatch reviewers + apply fixes + sign off.
5. Property-level (tool-agnostic) rubric anchor framing established as session standard — every "infrastructure" property (rendered-DOM verification, Blueprint as artefact, multi-perspective review, INGEST after no-revision window) graded by world-state not tool name. Survives any tool swap including the HTML→SGS-blocks script potentially replacing WP Studio.
6. Parking entry P-3 added to `.claude/parking.md` — block-validation canonicalisation property. Per Bean's call, NOT pre-baked into build-pipeline rubrics; revisit only if recogniser-branch fix doesn't structurally eliminate the issue.
7. Stage QC reviewer-dispatch lessons captured: (a) inline rubric content INTO reviewer prompts (Flash workspace-permission failure on prior dispatch); (b) Cerebras qwen unreliable for this task class (3-strike pattern: queue saturation + random file-ops + zero-byte output) — drop from remaining rubrics; (c) Sonnet + Flash 2-reviewer panel is sufficient triangulation when both return strong findings.

## Current State

- **Branch:** `feat/recogniser-v1` at `d63e8cc` (parking entry committed; rubric files live globally at `~/.claude/pipelines/.rubrics/`, not in repo)
- **Tests:** no test suite (rubric drafting work)
- **Build:** n/a (no code changes)
- **Uncommitted changes:** `.claude/state.md` modified by parallel recogniser session (not by this session — leave for that session's handoff)
- **Rubrics confirmed (3 of 6):** P4 ✓, P7 ✓, P1 ✓
- **Rubrics pending Stage QC + signoff (1 of 6):** P2 (drafted)
- **Rubrics not yet started (2 of 6):** P3 (Draft→SGS), P6 (QA→deploy)

## Known Issues / Blockers

1. **Cerebras qwen reviewer is unreliable for this task class.** Three consecutive dispatches in this session: queue-saturated all three times, two produced zero-byte outputs, one ran random file-ops without ever attempting the review. Drop from remaining P2/P3/P6 reviewer panels — use Sonnet + Gemini Flash 2-reviewer panel instead.
2. **Flash needs rubric content INLINED into the prompt.** Flash's sandbox blocks paths outside the project workspace (`~/.claude/...` paths fail). Must inline the rubric file content into the review prompt, not point to it. Pattern established in this session works — reuse it.
3. **Parallel recogniser session has its own handoff at `.claude/handoff.md`** — do NOT overwrite. This session uses `handoff-track-b.md` and `next-session-prompt-track-b.md` to preserve both tracks.

## Next Priorities (in order)

1. **Dispatch P2 Stage QC reviewers** (Sonnet + Gemini Flash inlined, NO Cerebras). Apply unambiguous fixes + apply expert-call decisions on ambiguous ones (per Bean's "you're the expert here" mandate). Sign off P2. ~15 min.
2. **Draft P3 (Draft → SGS, mockup input) rubric.** Property-level framing established; what P3 uniquely owns: taking static designer artefact (HTML/Figma/screenshots) and producing fully responsive interactive site that PRESERVES designer intent while INVENTING missing viewports + states. Designer Mode B autonomous from mockup. Confidence scoring on intent inference. ~25 min including Stage QC + signoff.
3. **Draft P6 (QA → deploy pre-ship gate) rubric.** Cross-cutting; pulls in Council 4-reviewer pattern, rendered-DOM verification, block-validation gate (ref P-3 parking entry — handle either as Never Do or as criterion depending on whether the canonicalisation pattern has shipped in recogniser branch by then). ~25 min including Stage QC + signoff.
4. **Final QC pass:** read all 6 confirmed rubrics back-to-back. Verify no contradictions, no overlapping criteria that should be cross-referenced, no anchor-style drift across rubrics. ~15 min.
5. **Update `~/.claude/pipelines/.rubrics/README.md`** (create if missing) — index page listing all 6 rubrics with one-line summaries + canonical save paths. ~5 min.

## Files Modified

| File | What changed |
|------|--------------|
| `~/.claude/pipelines/.rubrics/audit-redesign-proposal.md` | NEW — P4 rubric, signed off (10 criteria, 14.0 weight, 12 Never Dos, 4 Lens 6 anchors) |
| `~/.claude/pipelines/.rubrics/build-website.md` | NEW — P7 rubric, signed off (10 criteria, 15.0 weight, 15 Never Dos, 4 Lens 6 anchors) |
| `~/.claude/pipelines/.rubrics/new-client-build.md` | NEW — P1 rubric, signed off (10 criteria, 16.0 weight, 15 Never Dos, 4 Lens 6 anchors) |
| `~/.claude/pipelines/.rubrics/wp-to-sgs-migration.md` | NEW — P2 rubric DRAFT, `bean_signoff: pending`, Stage QC not dispatched |
| `.claude/parking.md` | Added P-3 entry — block-validation canonicalisation property in build-pipeline rubrics (committed `d63e8cc`) |
| `.claude/handoff-track-b.md` | NEW — this file |
| `.claude/next-session-prompt-track-b.md` | NEW — Track B fresh-session prompt |

## Notes for Next Session

- Property-level framing is the rubric standard now — every "infrastructure" criterion grades the world-state property (e.g. "no live deploy without rendered-DOM verification") not the tool that produced it. This survives WP Studio being replaced by the HTML→SGS-blocks script. Keep it.
- Stage 5 cross-turn pause was relaxed mid-session per Bean's "you're the expert here" mandate — apply unambiguous fixes + apply expert-call on ambiguous ones in the same turn for P2/P3/P6, save with signoff, move on. Don't spend a turn presenting decisions for Bean to confirm.
- The 6 rubrics are not isolated artefacts — they will feed the design-brain Phase 4 work as the optimisation targets when Bean redesigns the tooling stack ("no tool is safe"). Keep that in mind: the rubric defines what END-STATE the future tool must hit, not what the current tool produces.
- For P3 specifically: the recogniser pipeline IS the live P3. The 2026-05-01 handoff at `.claude/handoff.md` (parallel session) describes the recogniser deploy state — read it before drafting P3 to ground the rubric in real failure modes, not speculation. Validation-error class, fidelity diff %, partial-success path are all already documented there.
- For P6 specifically: handle the block-validation canonicalisation property either as a Never Do (if recogniser fix has shipped + validated) or as a dedicated criterion (if it's still recurring). Check parking entry P-3's trigger conditions first.

## Next Session Prompt

~~~
recommended_model: sonnet
session_tag: small-giants-wp-2026-05-01-track-b-pipeline-rubrics

You are a senior pipeline-rubric author specialising in v2-format end-goal rubrics for the SGS WordPress framework. Your goal this session is to finalise P2 (signoff pending), draft P3 (mockup→SGS) and P6 (QA→deploy) rubrics, then run a final QC pass across all 6.

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-01-track-b-pipeline-rubrics"

Read in this order before doing anything:
1. `.claude/handoff-track-b.md` (this session's summary)
2. `.claude/handoff.md` (parallel recogniser session — for P3 grounding only, do not act on its tasks)
3. `~/.claude/pipelines/.rubrics/audit-redesign-proposal.md`, `build-website.md`, `new-client-build.md`, `wp-to-sgs-migration.md` — all 4 existing rubrics; pattern-match for style + framing
4. `~/.claude/skills/rubric-writer/SKILL.md` — the rubric-writer skill
5. `~/.claude/skills/gap-analysis/references/end-goal-rubric.md` — canonical reference rubric

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Drafting each new rubric — what the pipeline UNIQUELY owns, where its end-state differs from siblings |
| `/gap-analysis` | After all 6 confirmed — grade each rubric against the v2 spec to catch drift |
| `/lifecycle` | Only if a rubric edit needs to flow into a sibling skill or pipeline JSON |
| `/research` | Skip unless P3 or P6 surfaces a knowledge gap — rubrics here ground in toolset spec + handoffs, not external research |
| `/strategic-plan` | Skip — work is sequential and small |
| `/rubric-writer` | Mandatory for each new rubric draft (Stages 1–6) |

## MCP Servers & Tools

| Tool | What to use it for |
|------|--------------------|
| Gemini Flash CLI | Stage QC reviewer (inlined-prompt pattern — see this handoff's lesson) |
| Sonnet via Agent tool | Stage QC reviewer (skill-eval + domain-practitioner personas) |
| `~/.claude/agents/cerebras-agent/agent.py` | DO NOT USE — three consecutive failures this session, dropped from panel |

## Agents to Delegate To

| Agent | When |
|-------|------|
| general-purpose (Sonnet) | Stage QC reviewer dispatch for P2/P3/P6 rubrics (skill-eval + domain-practitioner personas, inlined rubric content) |

---

## Task 1: Finalise P2 (WP→SGS Migration)

Read the P2 draft at `~/.claude/pipelines/.rubrics/wp-to-sgs-migration.md`. Build a Stage QC reviewer prompt with the rubric content INLINED (Flash sandbox cannot read paths outside project workspace). Dispatch Sonnet (skill-eval + migration-practitioner personas) and Gemini Flash in parallel. Apply unambiguous fixes + expert-call on ambiguous decisions. Set `bean_signoff: confirmed`.

## Task 2: Draft + sign off P3 (Draft → SGS, mockup input)

Save path: `~/.claude/pipelines/.rubrics/draft-to-sgs.md`. P3 uniquely owns: taking static mockup (HTML/Figma/screenshots) → fully responsive interactive site that PRESERVES designer intent while INVENTING missing viewports + states. Designer Mode B autonomous. Confidence scoring on intent inference. Ground in the recogniser session at `.claude/handoff.md` (live P3 case study — validation errors, fidelity diff %, partial-success) — do not speculate.

## Task 3: Draft + sign off P6 (QA → deploy pre-ship gate)

Save path: `~/.claude/pipelines/.rubrics/qa-to-deploy.md`. P6 is cross-cutting — pulls in Council 4-reviewer pattern, rendered-DOM verification, every QA gate. Block-validation canonicalisation: check parking entry P-3 in `.claude/parking.md` to decide Never Do vs criterion. <5 min ideal else QA gets skipped — speed is part of the rubric.

## Task 4: Final QC pass

Read all 6 confirmed rubrics back-to-back. Check for contradictions, overlapping criteria that should cross-reference, anchor-style drift across rubrics. If anything surfaces, decide expert-call edits.

## Task 5: Update rubrics index

Create `~/.claude/pipelines/.rubrics/README.md` — one-line summary per rubric, canonical save paths, link back to the toolset spec at `.claude/plans/strategy/2026-04-21-toolset-spec-from-sgs-studio-session.md`.

## Guardrails

- Property-level (tool-agnostic) framing for every infrastructure anchor
- World-state anchors only (spec §2.3) — process language gets rewritten before continuing
- 6–10 criteria per rubric; 4 Lens 6 anchors; Never Do entries grounded in real failure modes
- Cerebras qwen IS DROPPED from the reviewer panel for the rest of these rubrics
- Inline rubric content into reviewer prompts (Flash workspace-permission lesson)
- Apply unambiguous fixes + expert-call on ambiguous in same turn (no decision-menu turn-burning)
- Parallel recogniser session's `.claude/handoff.md` and `.claude/state.md` are NOT this session's responsibility — leave them alone
- All rubric files at `~/.claude/pipelines/.rubrics/` (global path, not in repo)
~~~
