---
doc_type: plan
project: small-giants-wp
phase: parking-finishers-close-out
session_tag: small-giants-wp-2026-05-23-parking-finishers
generated: 2026-05-23
parent_session: small-giants-wp-2026-05-22-architecture-programme-close-out
plan_label: opus
docscore_grade: B+ (self-assessed pending external grade)
---

# Phase — Parking Finishers Close-Out

**USP:** Close every STILL-OPEN parking entry EXCEPT `P-BATCH-GA-14-SKILLS`. Skills come LAST because they describe tools/scripts the other entries fix; grading them now would measure stale content. Clearing parking unblocks the next clean session-start and removes the cognitive overhead of "what's still open?" from every future planning pass.

**Plan label:** `[PLAN: opus]` — multiple architectural decisions, multi-hop reasoning, expensive-to-undo cloning-pipeline changes.

**Aggregate cost estimate:** ~5.5–7.5 hrs wall-clock across 2–3 sessions. Calibrated DOWN per `~/.claude/rules/time-estimates.md` from handoff's original 8–12 hr estimate.

## Phase success criteria (done when)

- [ ] Every STILL-OPEN parking entry (excluding P-BATCH-GA-14-SKILLS) reaches RESOLVED or REFRAMED-then-Resolved status
- [ ] parking.md "Open" section contains zero entries beyond P-BATCH-GA-14-SKILLS
- [ ] state.md regenerated via `/handoff` reflects the cleared parking lot
- [ ] All commits closing 2+ entries simultaneously passed multi-model `/qc-council` (blub.db row 255)
- [ ] All pipeline / converter / SGS-block touches passed `/qc-inline` per commit (single-entry) OR `/qc-council` (multi-entry)
- [ ] Live verification evidence attached to all G-series closures (per-section pixel-diff at 375/768/1440)
- [ ] Doc-drift entries (cloning-pipeline-flow + SKILL.md renumber) shipped
- [ ] If Task 4 entries span multiple sessions: clean `/handoff` between sessions with next-session-prompt explicitly scoped to remaining work

## Entry context (read before starting)

- `.claude/parking.md` — live state, ~17 STILL OPEN (after P-WPCS shipped earlier this session)
- `.claude/handoff.md` — 2026-05-22 session summary (architecture programme close-out)
- `.claude/state.md` — programme CLOSED status
- `.claude/next-session-prompt.md` — handoff prompt with original Task 1-6 framing (Tasks 1-5 in this plan + Task 6 deferred)
- `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` — FR7 + cv2 invariants (Task 3 + Task 4 reference)
- `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md` — 7+ binding behavioural rules
- `reports/2026-05-22-parking-sweep-classification.md` + `-tail-classification.md` — handoff classifier inputs

## References

- blub.db row 176 — `/gap-analysis` runs in main conversation (deferred to Task 6, separate session)
- blub.db row 255 — multi-model `/qc` panel before converter/pipeline/SGS-block commits
- blub.db row 256 — per-section cropped pixel-diff via `--selector .sgs-{section}`, never full-page
- blub.db row 272 — schema enumeration BEFORE "missing X" claims via `python ~/.claude/hooks/wp-blocks.py dump`
- blub.db row 283 — verify WP API surface via `developer.wordpress.org/reference/functions/<name>/` before dismissing intelephense warnings
- blub.db row 284 (NEW this session) — no per-client CSS variation files as deploy artefacts; pipeline intermediates under `pipeline-state/<run>/`
- `~/.claude/rules/time-estimates.md` — estimates default LOW, live-calibrate downward
- `~/.claude/rules/adhd-collaboration.md` — Rules 1 (full map), 2 (smallest first), 9 (negotiated decisions), 13 (session sprawl)

## Tooling Index

| Type | Name | Used in |
|------|------|---------|
| skill | `/qc-inline` | per-entry quick verification (Steps 1, 2.x, 5.x) |
| skill | `/qc-council` | multi-entry commits (Steps 4.x boundaries) |
| skill | `/sgs-clone` | per-section pixel-diff (Step 3 G-series) |
| skill | `/capture-lesson` | new lessons during pipeline work |
| skill | `/dispatching-parallel-agents` | Step 2 4-entry batch (if genuinely independent) |
| skill | `/handoff` | end-of-session close-out (between Task 3 and Task 4, end of Task 4 sessions) |
| agent | `wp-sgs-developer` | big-ticket entries (Steps 4.1–4.5) |
| mcp | Playwright | live-page-144 verification (Steps 2.1, 3.x) |
| cli | WP-CLI over SSH | live verifications on sandybrown |
| cli | `gh` | Mode B Sources 1+3 (already verified working) |
| hook | `~/.claude/hooks/wp-blocks.py` | schema enumeration before any "missing X" claim |
| python | `scripts/pixel-diff.py` | per-section cropped pixel-diff |

---

# Steps

## Task 2 — Medium-effort entries (this session, ~45–60 min)

### Step 2.0 — Resume context check `[SESSION-START]` `[MARKER: this turn]`

```
Step 2.0 — Resume context check
  Model:       inline
  Action:      Confirm git working tree state + read .claude/parking.md tail (last 5 entries) + verify P-WPCS commit 1be164ce in log
  Files:       .claude/parking.md (read), git log (read)
  Inputs:      none
  Outcome:     One-line "ready" confirmation; any unexpected state flagged before dispatch
  Exec:        SEQUENTIAL
  Deps:        none
  Marker:      SESSION-START
  Time:        2 min
  Tooling:     Bash, Grep
  On-Fail:     If working tree dirty beyond parking.md edits, stash before proceeding
  Cold-Entry:  .claude/plans/2026-05-23-parking-finishers.md (this file), .claude/parking.md, .claude/state.md
  Test:
    Happy:       `git log -1 --format=%h` returns 1be164ce → continue
    Edge:        Branch ≠ main → switch to main per CLAUDE.md branch discipline
    Fail:        Uncommitted vendor/ or composer.phar appearing in git status → check .gitignore drift
    Integration: standalone
```

### Step 2.1 — P-ARCH-WP70-VIEW-TRANSITIONS-VERIFY

```
Step 2.1 — Live-verify view transitions fire when navigating Customiser panels
  Model:       inline
  Action:      Open sandybrown Customiser (Appearance → Customise) via Playwright; navigate between SGS Floating UI / SGS Header / SGS Footer panels; capture before/after DOM snapshots + browser_evaluate for @view-transition computed style; confirm WP 7.0 native view transitions fire
  Files:       (read-only verification)
  Inputs:      sandybrown URL, WP admin creds (Claude / wp-app-passwords.env)
  Outcome:     parking.md entry P-ARCH-WP70-VIEW-TRANSITIONS-VERIFY moved to Resolved with evidence cite (snapshot path + computed style assertion)
  Exec:        SEQUENTIAL
  Deps:        Step 2.0 complete
  Marker:      (none)
  Time:        10 min
  Tooling:     Playwright MCP, sandybrown URL
  On-Fail:     If view transitions don't fire → REOPEN parking entry with finding; don't auto-close
  Test:
    Happy:       Playwright observes `@view-transition` rule applied + visible cross-fade between panels
    Edge:        WP 7.0 admin bar interferes with capture → use `wp.customize` API directly via browser_evaluate
    Fail:        view-transitions polyfill from sgs-blocks.php:200-217 still active (function_exists branch firing) → P-SESSION-B-DEFERRED-VIEW-TRANSITIONS-CLEANUP ready to close too
    Integration: connected to P-SESSION-B-DEFERRED-VIEW-TRANSITIONS-CLEANUP (if native works, the 6.x fallback can retire)
```

### Step 2.2 — P-PHASE-5B-INERT-CUSTOMISER-OUTPUT (Option A)

```
Step 2.2 — Wire Customiser renderer to emit :root CSS custom properties + consume via theme.json
  Model:       inline (architectural; small surface)
  Action:      In plugins/sgs-blocks/includes/header-footer/class-sgs-floating-ui-renderer.php (or whichever class emits Customiser output), emit `:root { --sgs-header-bg: <value>; --sgs-footer-bg: <value>; }` from the Customiser settings; update theme.json `styles.color.background` (or similar) to consume `var(--sgs-header-bg)` for header template part; verify in Playwright that changing the Customiser value live-updates the rendered output
  Files:       plugins/sgs-blocks/includes/header-footer/class-sgs-floating-ui-renderer.php (or sibling), theme/sgs-theme/theme.json
  Inputs:      state.md:68 referenced "Option A" — confirm by reading the spec; parking.md entry text for exact properties
  Outcome:     Live customiser change to header bg colour propagates to rendered output via CSS custom prop; parking.md entry moved to Resolved with commit SHA
  Exec:        SEQUENTIAL
  Deps:        Step 2.1 complete (uses same Customiser surface)
  Marker:      (none)
  Time:        20 min
  Tooling:     Edit, Bash (build + deploy if needed), Playwright (live verify)
  On-Fail:     If CSS custom prop doesn't propagate → check theme.json key path (settings.custom vs styles); revert via `git revert`
  Test:
    Happy:       Customiser change → live preview reflects → reload → still reflects via :root var
    Edge:        Variation picker overrides — confirm priority order (theme.json default → Customiser :root override)
    Fail:        --sgs-header-bg unset in :root → fallback to theme.json default (test by deleting Customiser value)
    Integration: header template part + footer template part both consume the var
```

### Step 2.3 — P-QC-COUNCIL-FIXTURE-SMOKE-TEST

```
Step 2.3 — Run scripts/fixtures/example-council.json through /qc-council
  Model:       inline
  Action:      Locate scripts/fixtures/example-council.json (in /qc-council skill directory at ~/.agents/skills/qc-council/scripts/fixtures/); invoke /qc-council with the fixture as input; verify all 8 stages produce expected artefacts (stage-0 through stage-8); capture run output
  Files:       ~/.agents/skills/qc-council/scripts/fixtures/example-council.json (read), ~/.claude/pipeline-state/qc-council/<run_id>/* (write via pipeline mode)
  Inputs:      example-council.json fixture (2026-05-21 Wave-1 G2+G4 case study)
  Outcome:     Fixture run completes; either expected behaviour confirmed OR drift found between SKILL.md and fixture; parking entry Resolved with run-id cite
  Exec:        SEQUENTIAL
  Deps:        Step 2.2 complete
  Marker:      (none)
  Time:        15 min
  Tooling:     Skill /qc-council
  On-Fail:     If fixture run errors → capture the error + REOPEN parking entry with bug detail; do NOT silently close
  Test:
    Happy:       Stage 5 hard gate catches the 2 no-op proposals (G2 + G4) — matching the case study's expected outcome
    Edge:        Fixture references blub.db rows that have changed since 2026-05-21 → flag drift
    Fail:        /qc-council pipeline state directory not writable → check permissions
    Integration: This is THE pipeline that validated this very plan's earlier proposals
```

### Step 2.4 — P-SUBAGENT-DRIVEN-DEV-VERIFY-LOOP-XREF

```
Step 2.4 — Cross-check /subagent-driven-development dispatch graph nodes
  Model:       inline
  Action:      Read ~/.agents/skills/subagent-driven-development/SKILL.md; identify each dispatch-graph node referenced (verify_loop, gap_analysis, etc.); for each, confirm the referenced skill exists OR is tagged `<!-- dispatch-graph-validator: ignore -->`; surface any genuine missing nodes
  Files:       ~/.agents/skills/subagent-driven-development/SKILL.md (read), referenced skills (read)
  Inputs:      The SKILL.md
  Outcome:     Either: all nodes resolve / are documented-ignored → parking entry Resolved; OR: genuine missing reference found → reframe parking entry as actionable
  Exec:        SEQUENTIAL
  Deps:        Step 2.3 complete
  Marker:      (none)
  Time:        10 min
  Tooling:     Read, Grep
  On-Fail:     If multiple genuine missing references found → escalate to /lifecycle for SKILL.md edit
  Test:
    Happy:       Every dispatch-graph reference either resolves to a skill OR has the ignore tag
    Edge:        Tags exist but point to deprecated skills → surface separately as docs-drift entry
    Fail:        SKILL.md itself missing/moved → check ~/.claude/commands/ + ~/.agents/skills/ both
    Integration: connects to /subagent-prompt + /dispatching-parallel-agents skills
```

### QA Gate 2.A — Task 2 batch verification

```
QA Gate 2.A — Task 2 batch verification
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Steps 2.1–2.4 complete
  Check:   `grep -E "P-ARCH-WP70-VIEW-TRANSITIONS-VERIFY|P-PHASE-5B-INERT-CUSTOMISER-OUTPUT|P-QC-COUNCIL-FIXTURE-SMOKE-TEST|P-SUBAGENT-DRIVEN-DEV-VERIFY-LOOP-XREF" .claude/parking.md | grep -c "RESOLVED\|REFRAMED"`
  Pass:    Returns 4 (all four entries closed or reframed)
  Fail:    Re-open the entries that didn't close; do NOT batch-commit any of them
  Marker:  QA
```

### Step 2.5 — Commit Task 2 batch

```
Step 2.5 — Commit Task 2 batch + parking.md updates
  Model:       inline
  Action:      `git add` parking.md + any code changes from 2.2; commit message lists all 4 entries closed with their evidence (commit SHAs, run-ids, snapshot paths)
  Files:       .claude/parking.md, plugins/sgs-blocks/includes/header-footer/class-sgs-floating-ui-renderer.php (if 2.2 touched code), theme/sgs-theme/theme.json (if 2.2 touched it)
  Inputs:      QA Gate 2.A passed
  Outcome:     Single commit closes Task 2 entries; main branch advanced
  Exec:        SEQUENTIAL
  Deps:        QA Gate 2.A
  Marker:      (none)
  Time:        5 min
  Tooling:     git
  On-Fail:     If commit hook fires (wpcs-lint, sgs-validate) → fix the linted issue + recommit
  Test:
    Happy:       `git log -1` shows the batch commit; working tree clean
    Edge:        Pre-existing parking.md merge marker → resolve before commit
    Fail:        Push rejected (non-fast-forward) → pull --rebase + recommit
    Integration: triggers PostToolUse hooks
```

---

## Task 5 — Documentation drift (this session, ~15 min)

### Step 5.1 — P-CLONING-PIPELINE-FLOW-DOC-DRIFT

```
Step 5.1 — Fix 2 inaccuracies + document 2 undocumented changes in cloning-pipeline-flow.md
  Model:       inline
  Action:      Read .claude/cloning-pipeline-flow.md; locate the 4 drift points referenced in the parking entry; apply corrections; cross-check against current Stage 0.7 + G2 merge code paths (already validated in this session's QC)
  Files:       .claude/cloning-pipeline-flow.md
  Inputs:      parking entry text for the 4 drift points; this session's QC findings (S4+S5 validated convert.py:3851 + orchestrator:1412 locations)
  Outcome:     Doc accurately describes current pipeline; parking entry Resolved
  Exec:        SEQUENTIAL
  Deps:        Step 2.5 commit
  Marker:      (none)
  Time:        10 min
  Tooling:     Read, Edit
  On-Fail:     If "drift" points actually describe correct behaviour and parking entry is wrong → update parking entry instead of the doc
  Test:
    Happy:       Doc reflects (a) Wave 2 Change 1 at convert.py:3851 (b) G2 merge at orchestrator:1412 (c) the 2 other undocumented changes
    Edge:        Doc line numbers shifted since parking entry was written → use grep for landmark text
    Fail:        2026-05-21 section already updated → no-op the drift point + note in parking entry
    Integration: docs-registry.yaml lists this doc; no separate registry update needed
```

### Step 5.2 — P-SKILL-MD-LICENSING-HARD-RULE-CLEAN

```
Step 5.2 — Renumber Rules 2-14 in /sgs-clone SKILL.md after Rule 1 retirement
  Model:       inline
  Action:      Read ~/.agents/skills/sgs-clone/SKILL.md or wherever /sgs-clone lives; find "Hard Rules" section; renumber 2-14 → 1-13 (or whatever count remains); confirm no other file references the old numbering
  Files:       /sgs-clone SKILL.md (locate first via `find ~/.agents/skills ~/.claude/skills -name SKILL.md | xargs grep -l "/sgs-clone"`)
  Inputs:      Current SKILL.md state
  Outcome:     Sequential numbering; parking entry Resolved
  Exec:        SEQUENTIAL
  Deps:        Step 5.1 complete
  Marker:      (none)
  Time:        5 min
  Tooling:     Read, Edit, Grep
  On-Fail:     If Rule 1 was retired but Rule 2 still depends on its preamble → preserve preamble under the new Rule 1 banner
  Test:
    Happy:       Rules read 1, 2, 3, … with no gap
    Edge:        Old "Rule N" references in other skills → grep for "sgs-clone.*Rule" cross-references
    Fail:        Rule 1 retirement was incomplete → consult /qc-council 2026-05-21 reasoning before patching
    Integration: lifecycle-gate.py may fire on SKILL.md edit
```

### Step 5.3 — Commit Task 5

```
Step 5.3 — Commit Task 5 doc drift
  Model:       inline
  Action:      Commit cloning-pipeline-flow.md + /sgs-clone SKILL.md edits with [qc:doc-drift-2026-05-23] tag
  Files:       .claude/cloning-pipeline-flow.md, /sgs-clone SKILL.md, .claude/parking.md (entries moved)
  Inputs:      Steps 5.1+5.2 complete
  Outcome:     Doc-drift commit
  Exec:        SEQUENTIAL
  Deps:        Steps 5.1, 5.2
  Marker:      (none)
  Time:        3 min
  Tooling:     git
  On-Fail:     Pre-commit hook on SKILL.md may trip → likely lifecycle-gate.py; bypass requires /lifecycle invocation (Bean decision)
  Test:
    Happy:       Commit lands
    Edge:        lifecycle-gate.py blocks SKILL.md edit → fall through to /lifecycle on next session
    Fail:        Multiple SKILL.md files matched the grep — pick the one in `~/.agents/skills/sgs-clone/` (canonical) over `~/.claude/skills/sgs-clone/` (deprecated location)
    Integration: triggers lifecycle-gate hook (advisory)
```

---

## Task 3 — G-series live verification (this session if time, else next session, ~60–90 min)

**Decision boundary:** Run Task 3 in this session ONLY if `[SESSION-CHECK]` after Task 5 shows <90 min wall-clock used so far. Otherwise → `/handoff` here + Task 3 in next session.

### Step 3.0 — Session-time check `[SESSION-CHECK]`

```
Step 3.0 — Decide: continue with Task 3 this session or handoff
  Model:       inline
  Action:      Estimate session elapsed time + tool-call count; if <90 min elapsed AND <60 tool calls used → proceed to Step 3.1; else → jump to "End-of-session handoff" block below
  Files:       (no file ops)
  Inputs:      session-state intuition
  Outcome:     Decision logged
  Exec:        SEQUENTIAL
  Deps:        Step 5.3 complete
  Marker:      (none)
  Time:        1 min
  Tooling:     (none — judgement call)
  On-Fail:     n/a
  Test:        n/a (decision step)
```

### Step 3.1 — P-G1-HERO-INNERBLOCKS live verification

```
Step 3.1 — Verify hero CTAs render on page 144 via Playwright + REST + console
  Model:       inline (Playwright orchestration) — or wp-sgs-developer agent if Playwright tool calls run hot
  Action:      Run /sgs-clone with --selector .sgs-hero on page 144 across 375/768/1440 viewports per blub.db row 256; check console errors; check REST returns hero block markup; capture per-section pixel-diff vs sandybrown-deployed baseline
  Files:       (read-only verification)
  Inputs:      sandybrown URL + page 144 path; /sgs-clone in repo
  Outcome:     Hero CTAs render correctly across 3 viewports; pixel-diff ≤1% each; parking entry Resolved with evidence
  Exec:        SEQUENTIAL (do not parallel — pixel-diff measurement contamination per P-G4)
  Deps:        Step 3.0 decision = continue
  Marker:      (none)
  Time:        20 min
  Tooling:     Playwright MCP, /sgs-clone, scripts/pixel-diff.py
  On-Fail:     If pixel-diff >1% on any viewport → REOPEN P-G1 with the actual delta + the section where it failed; do not auto-close
  Test:
    Happy:       Per-section pixel-diff returns ≤1% across 3 viewports; CTAs visible + clickable
    Edge:        Admin bar contaminates measurement → wp-admin logout before capture (P-G4 territory)
    Fail:        REST returns hero without CTA innerBlocks → P-G5 territory, escalate
    Integration: hero block uses InnerBlocks; verify InnerBlocks.Content emit at save.js (not null-save)
```

### Step 3.2 — P-G2-PAGE-ID-SCOPE-STRIP live verification

```
Step 3.2 — Verify variation CSS scope-strip works in live render
  Model:       inline
  Action:      Same shape as 3.1 but for trust-bar section; per blub.db row 256 use --selector .sgs-trust-bar; confirm scope-prefix-stripped rules apply correctly (convert.py:3013-3015 logic is exercised in live render)
  Files:       (read-only verification)
  Inputs:      page 144, sandybrown
  Outcome:     Trust-bar renders with correct scoped CSS; pixel-diff ≤1%; parking entry Resolved
  Exec:        SEQUENTIAL (after 3.1)
  Deps:        Step 3.1 complete
  Marker:      (none)
  Time:        15 min
  Tooling:     Playwright, /sgs-clone, pixel-diff
  On-Fail:     If scope-strip silently no-ops → REOPEN P-G2 with stripped-vs-unstripped DOM evidence
  Test:
    Happy:       Trust-bar CSS variables resolve; visible parity to mockup baseline
    Edge:        Multiple .page-id-N scopes in a single rule → confirm regex handles all
    Fail:        Pixel-diff >1% → check for measurement contamination first (admin bar, browser zoom)
    Integration: depends on G2 fix at convert.py:3013 + G2 merge at orchestrator:1412 (both validated in this session's QC)
```

### Step 3.3 — P-G3-STAGE-3-VISUAL-SLOT-MAPPING live verification

```
Step 3.3 — Verify visual slot mapping resolves correctly on page 144
  Model:       inline
  Action:      Use --selector for one or two sections beyond hero+trust-bar (e.g. .sgs-cta-section, .sgs-card-grid); confirm slot-resolver text-only path no longer fires for sections with composite content
  Files:       (read-only)
  Inputs:      page 144, sandybrown
  Outcome:     Composite sections render with full content (no text-only-truncation); pixel-diff ≤1%; parking entry Resolved
  Exec:        SEQUENTIAL
  Deps:        Step 3.2 complete
  Marker:      (none)
  Time:        20 min
  Tooling:     Playwright, /sgs-clone, pixel-diff
  On-Fail:     If composite section renders text-only → P-G5 PER-BLOCK-DOM-SHAPE territory, escalate
  Test:
    Happy:       Each tested composite section renders all child elements
    Edge:        Section with 0 composite children → confirm no false-positive flag
    Fail:        slot_synonyms DB row missing → run `python ~/.claude/hooks/wp-blocks.py dump` to enumerate (row 272 enforcement)
    Integration: connects to Spec 16 FR7 closure
```

### QA Gate 3.A — G-series acceptance

```
QA Gate 3.A — G-series per-section pixel-diff acceptance
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Steps 3.1–3.3 complete
  Check:   For each tested section, pixel-diff returned ≤1% on each of 375/768/1440 viewports
  Pass:    All ≤1% → parking entries P-G1+P-G2+P-G3 Resolved with attached evidence
  Fail:    Any section >1% → REOPEN that specific G-entry; do NOT close others until all pass
  Marker:  QA
```

### Step 3.4 — Commit Task 3

```
Step 3.4 — Commit Task 3 G-series verification
  Model:       inline
  Action:      Commit parking.md updates for G1+G2+G3; attach run-ids + pixel-diff results in commit body
  Files:       .claude/parking.md
  Inputs:      QA Gate 3.A pass
  Outcome:     Single commit closes 3 G-entries
  Exec:        SEQUENTIAL
  Deps:        QA Gate 3.A
  Marker:      HANDOFF (clean stopping point)
  Time:        5 min
  Tooling:     git
  On-Fail:     n/a
  Test:        Happy: commit lands. Other layers: n/a (docs-only commit).
```

---

## End-of-session handoff (between Task 3 and Task 4, OR after Task 5 if Task 3 deferred)

### Step 6.0 — Handoff `[HANDOFF]`

```
Step 6.0 — Generate session handoff + next-session-prompt
  Model:       inline
  Action:      Invoke /handoff; ensure next-session-prompt scopes remaining work (Task 4 big-ticket OR Task 3 + Task 4 if 3 deferred); update state.md current_phase to "parking-finishers-in-progress"
  Files:       .claude/handoff.md, .claude/next-session-prompt.md, .claude/state.md
  Inputs:      All progress so far in this session
  Outcome:     Clean session close; next session reopens with focused scope
  Exec:        SEQUENTIAL
  Deps:        Either QA Gate 3.A OR Step 5.3 (depending on whether Task 3 ran this session)
  Marker:      HANDOFF
  Time:        15 min
  Tooling:     Skill /handoff
  On-Fail:     If /handoff fails to regenerate state.md → manually edit current_phase + last_updated
  Cold-Entry:  This plan file (.claude/plans/2026-05-23-parking-finishers.md)
  Test:
    Happy:       state.md timestamp updated to 2026-05-23; next-session-prompt names Task 4 explicitly
    Edge:        Living-docs registry doesn't list one of the touched files → add it
    Fail:        /handoff stalls → fall back to manual file edits
    Integration: closes the loop with /autopilot next session
```

---

## Task 4 — Big-ticket entries (NEW SESSION(S), sequential, ~3–5 hrs across 2 sessions)

**Session boundary:** Task 4 entries are STRICTLY sequential with `/qc-council` between each. Do NOT fan-out to parallel subagents — shared state risk on converter / orchestrator / SGS framework files. Each entry gets its own commit and its own `/qc-council` validation gate. Realistically Task 4 = 2 sessions (3 entries Session A, 2-3 entries Session B).

Order chosen for minimum cross-dependency:
1. **P-WAVE-2-RESHAPE** first (touches converter; foundational for G5 + universal extraction)
2. **P-5A relocate** second (orchestrator helper change; clean follow-on, low risk after Wave 2)
3. **P-G5-PER-BLOCK-DOM-SHAPE** third (depends on Wave 2 wiring complete)
4. **P-UNIVERSAL-EXTRACTION-RC-FIXES** fourth (depends on G5 DOM shapes)
5. **P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER** fifth (independent surface, can also slot in if a session opens with energy)
6. **P-11-M9** last (multi-section orchestrator + live deploy — needs everything else stable first)

### Step 4.1 — P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP `[SESSION-START]`

```
Step 4.1 — Reshape Wave 2 wiring (includes P-FR1 sibling sites at convert.py:3926 + :3970)
  Model:       wp-sgs-developer agent (delegated for converter mechanical work) + /qc-council inline
  Action:      (1) Read parking.md entry text + Spec 16 §FR6 + .claude/decisions.md D1-D6 for full architectural scope; (2) optionally invoke /research-check --tier extended on the DB-wiring architecture if scope still ambiguous; (3) dispatch wp-sgs-developer agent with cold prompt below to implement the wiring change + sibling-site appends; (4) before commit: invoke /qc-council with the implementation diff + predicted post-fix metrics (leftover-buckets reduction)
  Files:       plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py (FR1 fast path l.3839-3867 already correct; sibling sites at l.3926-3937 + l.3970-3991 need same one-line variation_buf.append), other Wave 2 wiring files per Spec 16
  Inputs:      Spec 16 §FR6, decisions.md D1-D6, parking entry text, this session's blub.db row 284 (no per-client CSS as deploy artefacts)
  Outcome:     Wave 2 wiring shipped; sibling FR1 sites closed; leftover-buckets count reduced by predicted delta; parking entries P-WAVE-2-RESHAPE + P-FR1 (full) both Resolved
  Exec:        SEQUENTIAL
  Deps:        Step 6.0 handoff complete (new session)
  Marker:      SESSION-START
  Time:        60–90 min (calibrated DOWN from handoff's 2-4 hr estimate; live-recalibrate on first 20 min)
  Tooling:     Read, Edit, Bash, /research-check (optional), /qc-council, Agent (wp-sgs-developer)
  On-Fail:     If wp-sgs-developer agent produces a no-op diff (low confidence the wiring fired) → /qc-council Stage 5 hard gate will catch it; revert if needed
  Cold-Entry:  This plan file + .claude/parking.md (P-WAVE-2-RESHAPE entry) + .claude/specs/16-DETERMINISTIC-CONVERTER-V2.md (§FR6) + .claude/decisions.md (D1-D6) + reports/2026-05-20-pipeline-root-gap-council/real-path-synthesis.md
  Prompt:      |
    You are dispatched by /phase-planner via /subagent-driven-development for Task 4 Step 4.1 of the parking-finishers plan.

    PRIMARY OBJECTIVE:
    Reshape Wave 2 wiring per Spec 16 §FR6 (four-destination CSS router + cascade-on-edit token-snap). The honest-path council finding 2026-05-20 confirmed: dominant 50-85% of remaining pixel-diff comes from STRUCTURAL gaps. This step lands the structural fix, NOT operator-promotion.

    CONCRETE FILE TOUCHES (audit + implement):
    1. plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py
       - l.3839-3867 FR1 fast path: ALREADY DONE (Wave 2 Change 1, commit 8ceb8787, 2026-05-22). Verify present + correct.
       - l.3926 essence-match tier: ADD `variation_buf.append(_collect_css_for_classes(classes, css_rules))` after lift before return.
       - l.3970 composite-element branch: ADD same one-line append after lift before return.
       - Read Spec 16 §FR6 + §FR7 to confirm whether Wave 2 reshape involves additional surfaces beyond these three call-sites.
    2. Any other file Spec 16 §FR6 names — read the spec FIRST to confirm full surface area.

    METHODOLOGY GUARDRAILS (must respect, all blub.db rows):
    - row 254: read pipeline-state/<run>/leftover-buckets.json BEFORE conjecturing root cause
    - row 255: multi-model /qc panel BEFORE commit (this is a converter touch)
    - row 256: per-section cropped pixel-diff via --selector .sgs-{section}, never full-page
    - row 272: schema enumeration via `python ~/.claude/hooks/wp-blocks.py dump` BEFORE any "missing X" claim
    - row 283: verify WP API surface via curl developer.wordpress.org BEFORE dismissing intelephense warnings
    - row 284: NO per-client CSS variation files as deploy artefacts; pipeline intermediates under pipeline-state/<run>/

    ACCEPTANCE CRITERIA:
    1. The 2 sibling FR1 sites carry variation_buf.append (matching the proven Wave 2 Change 1 pattern at l.3851).
    2. Predicted leftover-bucket reduction: at least 20% drop in `extraction_failed` bucket for the hero + trust-bar sections.
    3. Per-section pixel-diff (via scripts/pixel-diff.py --selector .sgs-{section}) on a representative test client (mamas-munches) shows measurable improvement across 375/768/1440.
    4. /qc-council Stage 5 validates predicted post-fix metric BEFORE you commit. Do NOT commit if Stage 5 verdict ≠ proceed.

    SAFETY:
    - Never use `git stash` (blub.db lesson — wipes work).
    - Never use `git add .` or `-A` (scope commits by exact path).
    - Never use --no-verify on commits.
    - If you find pre-existing uncommitted parking.md state, leave it — main thread owns those edits.
    - Branch discipline: this is core SGS work → commit to main.

    OUTPUT:
    Report back with: (a) commit SHA, (b) leftover-bucket before/after delta, (c) per-section pixel-diff before/after, (d) /qc-council verdict + run-id.
  Test:
    Happy:       /qc-council Stage 5 verdict=proceed + commit lands + leftover-buckets drop visible
    Edge:        Sibling sites already carry the append (uncommitted) → confirm + close parking
    Fail:        /qc-council Stage 5 falsifies the predicted delta → escalate inline (do NOT auto-retry)
    Integration: Validates against G2 merge (already shipped) + Wave 2 Change 1 (already shipped)
```

### QA Gate 4.A — Wave 2 reshape acceptance

```
QA Gate 4.A — Wave 2 reshape /qc-council validation
  Model:   inline (read agent's report + council output)
  Exec:    SEQUENTIAL
  Deps:    Step 4.1 complete
  Check:   /qc-council Stage 5 returned verdict=proceed AND commit landed AND leftover-buckets delta matches prediction
  Pass:    All 3 conditions → P-WAVE-2-RESHAPE + P-FR1 (full) Resolved
  Fail:    Any condition → revert commit OR re-dispatch with refined prompt
  Marker:  QA
```

### Step 4.2 — P-5A-CLIENT-VARIATION-CSS-PATH relocate

```
Step 4.2 — Relocate Stage 0.7 intermediate CSS from theme/sgs-theme/styles/ to pipeline-state/<run>/
  Model:       inline (small surface, architectural decision already made)
  Action:      Update plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py:319 `_client_variation_css_path()` to return `REPO / "pipeline-state" / run_id / "variation.css"` (or similar); update css_router.py:719 comment; update convert.py:3009 comment; run /sgs-clone end-to-end on a test client (mamas-munches) to confirm G2 merge still works with new path
  Files:       sgs-clone-orchestrator.py:319, css_router.py:719 (comment), convert.py:3009 (comment)
  Inputs:      blub.db row 284 (this session's captured rule), parking entry text
  Outcome:     CSS intermediate lives under pipeline-state/; G2 merge consumes from new path; theme/sgs-theme/styles/ stays empty; parking entry Resolved
  Exec:        SEQUENTIAL (after QA Gate 4.A)
  Deps:        Step 4.1 + QA Gate 4.A
  Marker:      (none)
  Time:        25 min (council promoted from 15)
  Tooling:     Read, Edit, /sgs-clone, /qc-inline (single-entry commit, council not required for inline change)
  On-Fail:     If G2 merge breaks → revert; the file MUST still be reachable by orchestrator:1412 read path
  Test:
    Happy:       /sgs-clone run on mamas-munches produces variation.css under pipeline-state/<run>/; G2 merge log shows the file was read
    Edge:        run_id isn't yet known at the point _client_variation_css_path() fires → pass run_id through helper signature
    Fail:        theme/sgs-theme/styles/ gets accidentally repopulated → revert (this is the exact failure mode the captured lesson prevents)
    Integration: closes the architectural loop captured in blub.db row 284
```

### Step 4.3 — P-G5-PER-BLOCK-DOM-SHAPE-FIXES `[SESSION-START candidate]`

```
Step 4.3 — Fix per-block DOM shape mismatches (Spec 16 §13 + §14)
  Model:       wp-sgs-developer agent + /qc-council
  Action:      Per Spec 16 §13 known-gaps list, fix the per-block DOM shape mismatches; agent enumerates each block's expected DOM shape vs actual emit shape and fixes the converter emit logic
  Files:       plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py (emit functions), possibly slot-resolver + InnerBlocks emit logic
  Inputs:      Spec 16 §13 + §14 (known gaps blocking ≤1% target), parking entry text, leftover-buckets from latest /sgs-clone run
  Outcome:     Per-block DOM shape parity; pixel-diff improvement per affected section
  Exec:        SEQUENTIAL (likely needs fresh SESSION-START if 4.1+4.2 consumed session capacity)
  Deps:        Step 4.2 + QA Gate 4.A
  Marker:      SESSION-START candidate (depends on 4.1+4.2 wall-clock)
  Time:        45–60 min
  Tooling:     Read, Edit, Agent (wp-sgs-developer), /qc-council, /sgs-clone
  On-Fail:     If DOM shape fix breaks an unrelated block emit → council Stage 5 catches via pixel-diff; revert and refine
  Cold-Entry:  This plan file + Spec 16 §13 + §14 + .claude/parking.md (P-G5 entry) + latest pipeline-state/<run>/leftover-buckets.json
  Prompt:      |
    Cold-prompt template (instantiate per block once enumeration is complete):
    "Implement per-block DOM shape fix for sgs/<block>. Expected shape: <X>. Actual emit: <Y>. Predicted post-fix: pixel-diff for .sgs-<block> drops from <baseline>% to ≤1% across 375/768/1440. Run scripts/pixel-diff.py --selector .sgs-<block> for baseline. Apply fix. Re-run. Report deltas + commit SHA. /qc-council Stage 5 BEFORE commit. Same safety clauses as 4.1."
  Test:
    Happy:       Per-block pixel-diff ≤1% after fix
    Edge:        Block already at parity (no shape mismatch) → close that sub-item, continue with others
    Fail:        Fix introduces regression elsewhere → /qc-council catches; revert
    Integration: depends on Step 4.1 + 4.2 stable; feeds into Step 4.4
```

### Step 4.4 — P-UNIVERSAL-EXTRACTION-RC-FIXES

```
Step 4.4 — Universal extraction RC fixes (after G5 DOM shapes stable)
  Model:       wp-sgs-developer agent + /qc-council
  Action:      Per parking entry text, fix the universal-extraction RCs that depend on G5 DOM shapes being correct first
  Files:       converter_v2/convert.py extraction paths, possibly css_router.py
  Inputs:      Parking entry text, post-4.3 leftover-buckets baseline
  Outcome:     Universal extraction RC reduced per parking entry's acceptance criteria
  Exec:        SEQUENTIAL
  Deps:        Step 4.3 + QA Gate
  Marker:      (none)
  Time:        45 min
  Tooling:     Read, Edit, Agent, /qc-council, /sgs-clone
  On-Fail:     Revert + refine prompt; do not chase
  Test:        Happy: extraction RC delta matches prediction. Edge: regression in previously-fixed block. Fail: bucket count unchanged → re-diagnose. Integration: depends on 4.3 wiring.
```

### Step 4.5 — P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER

```
Step 4.5 — Handler for header/footer template parts in cloning pipeline
  Model:       wp-sgs-developer agent + /qc-council
  Action:      Brief upfront research on wp_template_part post type vs page content (handoff prompt called this out); design handler that detects header/footer markup in mockup + emits as template-part block reference instead of inline markup
  Files:       sgs-clone-orchestrator.py, possibly new handler module
  Inputs:      Parking entry text, /research-check output on wp_template_part shape
  Outcome:     Header/footer mockup sections emit correctly as Spec 17 template parts, not inline
  Exec:        SEQUENTIAL
  Deps:        Step 4.4 OR can run independently if energy/session allows
  Marker:      SESSION-START candidate
  Time:        45–60 min
  Tooling:     /research-check, Read, Edit, Agent, /qc-council
  On-Fail:     If wp_template_part semantics differ from research expectation → /research-buddies escalate
  Cold-Entry:  This plan + Spec 17 § header/footer architecture + parking entry text
  Test:        Happy: cloned mockup renders header/footer via template parts. Edge: mockup has no clear header/footer landmark. Fail: handler emits inline anyway → diagnose detection logic. Integration: connects to Spec 17 floating UI.
```

### Step 4.6 — P-11-M9

```
Step 4.6 — Multi-section orchestrator + live deploy
  Model:       wp-sgs-developer agent + /qc-council (multi-entry close = council mandatory)
  Action:      Per parking entry text — multi-section orchestrator landing + live deploy to sandybrown for end-to-end verification
  Files:       sgs-clone-orchestrator.py (multi-section orchestration), deploy scripts
  Inputs:      All prior 4.x steps complete + stable
  Outcome:     Cloning pipeline runs end-to-end on a full multi-section mockup; deploys to sandybrown; parity verified via pixel-diff per section
  Exec:        SEQUENTIAL (final big-ticket entry)
  Deps:        Steps 4.1–4.5 complete
  Marker:      HANDOFF (Task 4 close)
  Time:        60–90 min
  Tooling:     /sgs-clone, /qc-council, SSH (deploy), Playwright (live verify)
  On-Fail:     If live deploy fails → revert; do not chase the failure into a second commit
  Test:        Happy: per-section pixel-diff ≤1% on full multi-section mockup deployed live. Edge: 1 section out of N drops parity → reopen that section's gap entry. Fail: deploy itself fails (SSH, build, OPcache) → revert + diagnose. Integration: this is the integration test for the entire Task 4 arc.
```

### QA Gate 4.Z — Task 4 close-out

```
QA Gate 4.Z — Task 4 full acceptance + parking sweep
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    All Step 4.x complete
  Check:   `grep -E "P-WAVE-2-RESHAPE|P-5A-CLIENT-VARIATION|P-G5-PER-BLOCK|P-UNIVERSAL-EXTRACTION-RC|P-CLONE-PIPELINE-HEADER-FOOTER|P-11-M9" .claude/parking.md | grep -c "RESOLVED"` returns 6
  Pass:    Task 4 closed; only P-BATCH-GA-14-SKILLS remains in Open section
  Fail:    Any entry didn't close → REOPEN with the specific failure detail
  Marker:  QA
```

### Step 4.Z+1 — Phase close handoff `[HANDOFF]`

```
Step 4.Z+1 — Phase close + Task 6 next-session prompt
  Model:       inline
  Action:      Invoke /handoff; next-session-prompt scopes Task 6 only (P-BATCH-GA-14-SKILLS, dedicated session, blub.db row 176 enforcement); state.md current_phase advances to "parking-closed-skills-ga-pending"
  Files:       .claude/handoff.md, .claude/next-session-prompt.md, .claude/state.md
  Inputs:      All Task 4 closed
  Outcome:     Clean phase boundary; Task 6 dedicated session prepped
  Exec:        SEQUENTIAL
  Deps:        QA Gate 4.Z
  Marker:      HANDOFF
  Time:        15 min
  Tooling:     /handoff
  On-Fail:     n/a
  Cold-Entry:  Task 6 entry in this plan (sub-step below)
  Test:        Happy: handoff scope = Task 6. Edge: 1+ entries reopened mid-Task-4 → next prompt scopes those AND Task 6. Fail: /handoff stalls → manual file edits.
```

---

## Task 6 — Final polish (DEDICATED FUTURE SESSION, ~3 hrs)

### Step 6.1 — P-BATCH-GA-14-SKILLS

```
Step 6.1 — /batch-gap-analysis on 14 WP/SGS skills
  Model:       inline (blub.db row 176 HARD GATE: /gap-analysis must run in main conversation, NO subagent dispatch substitution)
  Action:      Invoke /batch-gap-analysis with the 14 WP/SGS skill paths; full /gap-analysis per target sequentially; produce per-target JSON eval + 1 review report + waiting-queue for S-grade confirmations + opportunity selections
  Files:       (per-target eval JSONs + 1 review report)
  Inputs:      reports/phase-7-skills-audit-2026-05-22.md + -extended- (baseline inputs); current skill content (post Tasks 1-5 fixes landed)
  Outcome:     14 graded skill evaluations; S-grade confirmations queued; opportunities triaged
  Exec:        SEQUENTIAL (must — blub.db row 176)
  Deps:        Step 4.Z+1 complete (all Tasks 1-5 shipped)
  Marker:      SESSION-START (dedicated session)
  Time:        ~3 hrs (acknowledged dedicated-session scope)
  Tooling:     Skill /batch-gap-analysis, /gap-analysis
  On-Fail:     If a skill's eval comes back D or below → triage individually; don't batch the fix
  Cold-Entry:  This plan file + reports/phase-7-skills-audit-2026-05-22.md + reports/phase-7-skills-audit-extended.md + .claude/handoff.md
  Test:
    Happy:       14 evaluations complete; review report + waiting queue produced
    Edge:        Skill content changed during eval run → freeze inputs at session start
    Fail:        /batch-gap-analysis itself errors → invoke /gap-analysis 14 times manually
    Integration: this is the final acceptance gate for the entire parking-finishers phase
```

---

# Key Judgement Calls

## Primary decisions (surfaced during planning)

**Decision 1:** Should Task 3 (G-series live verification) run in this session or be deferred to a fresh session?
- **Options:** (A) Inline this session if <90 min elapsed; (B) Always defer; (C) Always inline regardless of elapsed time
- **Recommendation:** A — session-time-aware gate at Step 3.0
- **Why:** Playwright tool calls are heavyweight (~60 sec each); 3 sections × 3 viewports = ~10 Playwright operations + diff comparisons. Total ~60-90 min wall-clock. If session is already 90 min in, the cognitive overhead of holding Task 4 in mind alongside is high. The 3.0 decision step makes the call explicit, not invisible.
- **Cost of wrong choice:** Inline when tired → Task 3 sloppy + Task 4 contaminated. Defer when fresh → unnecessary handoff overhead.
- **Who decides:** inline at Step 3.0 (no Bean approval needed mid-execution)

**Decision 2:** Should Task 4 big-ticket entries be dispatched to wp-sgs-developer agent or run inline?
- **Options:** (A) Agent for all 4.x; (B) Inline for all 4.x; (C) Mix per entry shape
- **Recommendation:** A — agent for all, with /qc-council as the gate between dispatch and commit
- **Why:** Converter / pipeline / SGS-block work is well-scoped per Spec 16 §13 + §14. Cold prompts can carry full context. Main thread stays Opus for the council adjudication + handoff orchestration. Cost-aware delegation per `/delegate`.
- **Cost of wrong choice:** Inline → burns Opus budget on mechanical work; agent → cold context risk, mitigated by Spec 16 + parking entry detail in cold prompts.
- **Who decides:** locked at plan time (Bean's prior directives + handoff prompt make this clear)

**Decision 3:** /qc-council before every Task 4 commit, or only commits closing 2+ entries?
- **Options:** (A) Every Task 4 commit (mandatory by blub.db row 255 — "multi-model /qc panel BEFORE every commit touching converter / pipeline / SGS block logic"); (B) Only 2+ entry commits
- **Recommendation:** A — row 255 is explicit
- **Why:** Row 255 captured the exact failure mode where single-Sonnet review missed regression patterns. Task 4 commits all touch converter/pipeline/SGS-block code.
- **Cost of wrong choice:** Skip the panel → 2026-05-21 Wave 1 G2+G4 no-op pattern recurs.
- **Who decides:** locked at plan time

**Decision 4:** Run /research-check before Step 4.1 (Wave 2 reshape) and/or Step 4.5 (header/footer handler)?
- **Options:** (A) Yes both; (B) Yes 4.5 only; (C) No, the spec covers it
- **Recommendation:** B — handoff prompt explicitly suggested it for 4.5; 4.1 is well-covered by Spec 16 §FR6
- **Why:** wp_template_part vs page content semantics is a WP-API surface where row 283 enforcement applies (verify before implementing). Spec 16 §FR6 is the single source of truth for 4.1 — no research gap.
- **Cost of wrong choice:** Skip research on 4.5 → handler emits wrong shape; refactor later. Run research on 4.1 → wasted 30 min.
- **Who decides:** locked at plan time

## Pre-emptive decisions (Hidden Decisions pass — inline self-review)

*Hidden Decisions pass executed inline rather than dispatched (cost-benefit weak for parallel subagent review on a planning artifact about to be executed directly).*

**Pre-empt 1:** What if Step 2.2 reveals that the "Option A" CSS-custom-prop approach conflicts with WP 7.0's native Customiser preview mechanism (live-preview JS expects DOM mutation, not :root var update)?
- **Pre-answer:** Test in Playwright FIRST (read-only check) before writing any code. If conflict → reopen P-PHASE-5B with the WP-API constraint; don't force the approach.

**Pre-empt 2:** What if Step 3.1's pixel-diff baseline doesn't exist (no prior baseline screenshot for page 144 on sandybrown)?
- **Pre-answer:** First run captures the baseline against the mockup file, not against a prior screenshot. /sgs-clone's pixel-diff supports mockup-vs-rendered comparison directly. Document this in the run-id artefact.

**Pre-empt 3:** What if Step 4.1 wp-sgs-developer agent reports back with a no-op diff (claims fix landed but variation_buf.append insertion location isn't where the runtime actually executes)?
- **Pre-answer:** /qc-council Stage 5 catches this via predicted-delta validation. The agent's report is necessary but not sufficient — the council's pre/post measurement is the actual gate. Trust but verify.

**Pre-empt 4:** What if Step 4.2's `pipeline-state/<run>/` directory write breaks the G2 merge because run_id isn't available at the helper's call-site?
- **Pre-answer:** Pass run_id through `_client_variation_css_path()` signature change. Document this in the lesson-capture follow-up (extends blub.db row 284 with the implementation detail). Smoke test: /sgs-clone end-to-end before commit.

**Pre-empt 5:** What if Task 4 sessions exceed the 2-session estimate and end up needing 3 or 4 sessions?
- **Pre-answer:** Acceptable — Step 4.Z+1 ONLY fires when QA Gate 4.Z passes. Each Task 4 session uses its own handoff/next-session-prompt scoped to remaining entries. No artificial deadline pressure.

**Pre-empt 6:** What if Bean wants to ship Task 5 (doc drift) before Task 2 (medium entries) for cognitive-warmup reasons?
- **Pre-answer:** Plan order is recommendation, not mandate. Tasks 2 + 5 are independent; either order works in this session. Tasks 3, 4 have real dependencies. Surface this option if Bean asks at Step 2.0.

**Pre-empt 7:** What if `/qc-council` fixture smoke-test (Step 2.3) reveals the fixture is stale (references blub.db rows that changed since 2026-05-21)?
- **Pre-answer:** Update the fixture as part of closing the parking entry. The fixture is part of /qc-council skill; lifecycle-gate.py may fire on SKILL.md adjacent edits → invoke /lifecycle if so.

**Pre-empt 8:** What if Step 5.2 (/sgs-clone SKILL.md renumber) hits lifecycle-gate.py blocking the edit?
- **Pre-answer:** Yes it will (blub.db lesson: SKILL.md edits route through /lifecycle). Reframe Step 5.2 to: invoke `/lifecycle` with the renumber task; the gate's enforcement IS the right path, not a problem.

---

# Session boundary recommendation

**Realistic shape (calibrated per ~/.claude/rules/time-estimates.md):**

| Session | Steps | Wall-clock | Marker |
|---------|-------|------------|--------|
| THIS session (continued) | 2.0 → 2.5 → 5.1 → 5.3, then 3.0 decision | ~90 min | Either commit + handoff OR continue to 3.x |
| Optional this session | 3.0 (continue) → 3.4 | +60 min if energy permits | HANDOFF at 3.4 |
| **Session A (fresh, big-ticket)** | 4.1 + 4.2 (Wave 2 + relocate) | ~2 hrs | HANDOFF |
| **Session B (fresh, big-ticket)** | 4.3 + 4.4 (G5 + universal extraction) | ~2 hrs | HANDOFF |
| **Session C (fresh, big-ticket)** | 4.5 + 4.6 (header/footer + M9) | ~2 hrs | HANDOFF at 4.Z+1 |
| **Session D (dedicated)** | 6.1 (P-BATCH-GA-14-SKILLS) | ~3 hrs | end |

**Total wall-clock:** 8–10 hrs across 4–5 sessions. Bean's prior 8–12 hr estimate is well-calibrated; this plan does not inflate it.

**ADHD rule alignment:**
- Rule 1 (full map): this plan IS the full map
- Rule 2 (smallest first): Step 2.0 is 2 min, zero dependencies
- Rule 7 (motivation): USP at top of plan
- Rule 9 (negotiated decisions): KJC + Hidden Decisions surfaced
- Rule 13 (session sprawl): explicit session-boundary table above + Step 3.0 decision gate

---

# Living docs updates (Stage 8)

After this plan is written:

- `.claude/decisions.md` — no new architectural decisions (everything traces back to existing D1-D6 + blub.db rules)
- `.claude/parking.md` — no new entries beyond the deferred Pre-empt 4 follow-up (mentioned in Step 4.2's On-Fail)
- `.claude/state.md` — current_phase still "architecture-programme-CLOSED-2026-05-22"; will advance to "parking-finishers-in-progress" at first /handoff (Step 6.0)
- `.claude/plans/plan.md` — this plan is the active phase; update plan.md index if it exists

---

# Aggregate Cost Estimate

Using `~/.agents/skills/delegate/data/routing-table.json` defaults (cerebras/gemini-flash ~free; sonnet ~$3/$15 per M tokens; opus higher; inline session = opus-pricing for time used):

- Inline (this session continuation + Task 4 main thread): ~150K–250K tokens across 4–5 sessions on Opus 4.7
- Agent dispatches (Task 4 steps): ~5 wp-sgs-developer dispatches × ~80K tokens each (cold prompt + work) on Sonnet 4.6
- /qc-council dispatches (between commits): ~5 council runs × ~40K tokens on mixed-model panel
- /research-check (Step 4.5 only): ~15K tokens on Sonnet × 2 parallel

**Rough total:** ~$25–40 in API costs across 4–5 sessions. Cheap compared to the cost of stalled progress.
