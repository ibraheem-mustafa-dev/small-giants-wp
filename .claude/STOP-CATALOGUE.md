---
doc_type: reference
project: small-giants-wp
title: STOP catalogue + pre-flight self-attestation ritual (structural defences)
note: "UNCAPPED by design (D101 — never force-drop a defence to fit a byte cap). Split out of next-session-prompt.md/state.md/handoff.md when they collapsed to LEDGER.md (P4, 2026-07-17). Entries carry forward VERBATIM across sessions; new sessions ADD, never SUBTRACT without a recorded justification. Count-check: new unique-STOP count >= previous, every /handoff."
last_updated: 2026-08-11
---

# STOP catalogue — anti-pattern defences (carry forward, never subtract)

**Why this file exists.** These are the operational surfacing of captured failure
patterns (blub.db + `memory/feedback_*.md`). A lesson archived in memory only prevents
a failure when it is surfaced at the point of action — this catalogue IS that surfacing.
Governed by **D101 / `handoff-docs-carry-forward-structural-defences`** (blub.db 290):
when this file is rewritten, COUNT the unique STOP entries before and after — the new
count must be **>= the old**, or the drop needs an inline justification. Bare deletion = a
regression to fix before commit.

`LEDGER.md` is the lean living status; THIS file is the uncapped defence record. LEDGER
points here. Neither ever silently drops a STOP.

---

## A. Process / workflow STOPs (govern every session)

- **STOP-A-NO-PR-NO-STASH-DIRECT-TO-MAIN** — NEW 2026-09-07 (Bean-locked). **Never open a pull
  request on this project, and never `git stash`.** Commit straight to `main`. Bean does not
  review PRs, so a PR is a queue of one that nobody reads — it does not gate anything, it just
  detaches work from `main` and lets it rot. Measured the day this was locked: **8 draft PRs
  (#53-#60) and 30 remote branches**, presented as "awaiting a per-branch call". Every single one
  turned out already superseded by `main`, and it took a full forensic session (`git cherry -v`,
  two-dot diffs, three verification subagents) to prove nothing was being lost by deleting them.
  That entire session was pure waste created by the branch-and-PR habit. The stash half is the
  same failure inward: this tree is shared by many concurrent sessions, a main-thread stash has
  already swept a dozen peer sessions' uncommitted files, and `git checkout -- <file>` to undo one
  bad edit silently took an unrelated uncommitted fix with it. **To move work: commit YOUR files
  with an explicit pathspec** (never `git add -A`, never a glob — a `*/render.php` glob swept
  another session's half-done edit onto `main` and left it fatal for 5 minutes), then switch.
  Siblings: `never-stash-in-shared-worktree-commit-first`, `a-glob-pathspec-is-not-a-scoped-commit`.

- **STOP-A-INTEGRATE-AFTER-EVERY-TASK** — NEW 2026-09-07 (Bean-locked). **Push to `origin/main`
  and rebase onto it after every COMPLETED task, not at the end of a session or a track.** Banked
  divergence is this repo's most expensive recurring failure and it compounds three ways: a session
  holding uncommitted or unpushed work blocks other sessions from committing and deploying, those
  sessions then bank their own divergence and block still more, and the original session is finally
  blocked by the mess it started. **The cost is superlinear in branch age, so "I'll integrate later"
  is never the cheap option.** Evidence from the 2026-09-07 cleanup: branches up to **2,150 commits
  behind `main`**, at which point merging one would have REVERTED ~55k lines, and no reviewer could
  honestly adjudicate the diff at all. One branch's distinguishing "fix" had by then become
  *actively worse* than `main`'s (it made a 29-file preamble load-order DEPENDENT where `main` had
  made it independent) — merging it would have reintroduced a fatal. A branch that is never allowed
  to get old cannot reach any of those states.

- **STOP-A-BYPASS-OK-BUT-FIX-PRE-EXISTING** — NEW 2026-09-07 (Bean-locked). **Bypassing a commit
  gate is FINE when the reported violations are not your work** — check each one is genuinely
  pre-existing, then disclose it in the commit message (`[gates-ok:<reason>]`). You are not
  required to fix another session's mess to land your own diff, and standing blocked on it is
  itself a block-cascade (see `STOP-A-INTEGRATE-AFTER-EVERY-TASK`). **But the permission carries a
  paired obligation: if you are FIXING things, fix the pre-existing issues too** — unless another
  session is actively working on them, in which case leave them and say so. Do not route around a
  failure you were in a position to close: that is how a violation survives dozens of green runs
  and becomes "ambient noise" nobody owns. The judgement is "is this MINE?" for the bypass, and
  "am I already in here fixing?" for the obligation — they are different questions and both get
  asked. This amends the final clause of `STOP-A-TWO-BYPASS-LAYERS-NOT-ONE`.

- **STOP-A-A-DISPATCH-REPORT-DESCRIBING-A-PLAN-IS-NOT-COMPLETION** — NEW 2026-08-28. A dispatched
  agent returned after ~70 seconds (vs 30-50+ minutes for comparable tasks) with a report that
  DESCRIBED a plan to dispatch further work, rather than doing the work itself. No file, no commit,
  no diff existed. Caught only by checking `git status`/`git log` directly rather than trusting the
  report's prose. **A short duration + a report phrased as "I will now..." rather than "I did..." is
  a red flag on its own — verify a real artefact (commit hash, file mtime, self-test output) exists
  before accepting any completion claim, especially a fast one.**

- **STOP-A-TWO-AGENTS-DISPATCHED-ON-THE-SAME-FILE-PATH-COLLIDE** — NEW 2026-08-28. A confused first
  dispatch attempt (see the entry above) apparently spawned a genuine child agent internally before
  returning early — leaving an UNEXPECTED second agent running on the exact same task, writing to
  the exact same file path as a deliberately-dispatched retry. Neither agent knew about the other.
  One detected the clobber mid-write and crashed restoring its own version; the survivor's work was
  the one that landed. **Before re-dispatching a retry for a task whose first attempt behaved oddly
  (fast, evasive, or exit-without-artefact), check `ListAgents` for an unexpected still-running
  agent on the same topic — a "failed" or "returned early" dispatch may have left live children.**

- **STOP-A-FALSE-COMPLETION-CLAIM-IS-HOW-WORK-IS-LOST** — NEW 2026-08-29. On 2026-08-28 a session
  reported the css_element classifier as "fixed and **committed**" at 20:29Z while `git log -1` on
  that path still showed a commit from five days earlier. Because everyone believed it was safe,
  nothing protected it, and a peer's `git stash` (ref later dropped) took all 553 lines; it survived
  only as a dangling commit recovered via `git fsck --unreachable`. The stash was the PROXIMATE
  cause; the false claim was the ROOT cause. **Before writing "committed" in any status, report or
  handoff, run `git log -1 -- <path>` and read the DATE back.** Corollary: on a five-track shared
  worktree, uncommitted work is not "saved" — a dangling commit can be preserved with `git tag`.

- **STOP-A-GREP-RETURNING-ZERO-NEEDS-A-POSITIVE-CONTROL** — NEW 2026-08-29. Four separate times on
  2026-08-28 a too-narrow grep returned 0 and produced a CONFIDENT FALSE conclusion, each of which
  would have caused a wrong action: (a) `gridTemplateColumns` absent from render.php/edit.js read as
  "dead attribute on 10 blocks" when the SHARED WRAPPER is the reader — nearly deleted a live,
  client-reachable feature from 9 blocks; (b) a flat key grepped against nested JSON returned `None`
  for every row AND made the negative control pass; (c) `import.*X` missed multi-line import lists,
  reading as "peer shipped undefined references"; (d) `find -name style.css` on the server missed
  webpack's `style-index.css`, reading as "not deployed". **A grep returning 0 is a HYPOTHESIS.**
  Before acting on absence, grep something you KNOW exists in the same file the same way; if the
  control also returns 0, the pattern is wrong, not the world.

- **STOP-A-A-SELF-TEST-THAT-PASSES-WITHOUT-THE-FEATURE-IS-NOT-A-GATE** — NEW 2026-08-29.
  `extract-signatures.py --self-test` returned 8/8 PASS on the file with the Cause A/B
  implementation REMOVED, so it could not gate that work's recovery even though it looked like the
  obvious gate. Separately the same day, a fidelity probe "passed" its negative control only because
  a broken lookup returned `None` for everything, positive cases included. **A negative control that
  passes while every positive control fails is not a control — it is the same bug twice.** Gate a
  recovery on a signal that DIFFERS between present and absent (symbol count, row values), and
  always pair a negative control with a positive one that must pass.

- **STOP-A-STATUS-LINE-OUTRANKS-THE-DOC-WRITTEN-TO-PREVENT-IT** — NEW 2026-08-29 (D885). Bean
  caught this. `plans/spec-39-seed-requirements.md` records D552's ordering rule (**the block
  standard LEADS, the cloning pipeline is reworked AFTERWARDS**; converter cost is scheduled work,
  never a precondition) and adds that it is written "so a future session cannot re-invert it and
  block a standard change on converter cost." **The LEDGER carried the inverted version anyway —
  "Spec 39 PACES everything" — and the LEDGER is what gets read at session start.** I inherited it,
  repeated it in a handoff and twice to Bean, and only checked when he pushed back. The supporting
  evidence was also false and took one grep to disprove: **0** xfails in the plugin reference Spec
  39 (17 exist, so the grep finds them), and the cited gate lives in `orchestrator/`, i.e. the
  pipeline, exactly where the rule puts it. **Before repeating any "X blocks Y" / "X paces Y" claim
  from a status doc, open the doc that DECIDED the ordering. If the claim cites a count or a gate,
  grep it with a positive control first.** When correcting one, point the status doc AT the
  deciding doc instead of restating its conclusion — a restatement can be re-flipped by the next
  compression; a pointer cannot. Sibling of STOP-MEASUREMENT-VS-EYE for prose.

- **STOP-A-RESTING-READING-TAKEN-UNDER-AN-ACCIDENTAL-HOVER** — NEW 2026-08-29 (D885). Verifying the
  process-steps hover fix, the FIRST reading of the number badge returned the HOVER colour at rest.
  That is indistinguishable from a real defect ("the resting rule is broken / it is red all the
  time") and I was one step from reporting it as one. The cause was mundane: the pointer happened
  to sit over the element when the page loaded. Parking it at (5,5) gave the correct resting value.
  **When measuring a state-dependent style, park the pointer explicitly AND assert the state in the
  SAME evaluation** (`el.matches(':hover')` alongside the `getComputedStyle` read) — otherwise a
  hover reading can be silently mislabelled as a resting one, in either direction. ⚠ Related: the
  operator confirming "I saw the hover colour" does NOT settle it either — that observation is
  equally consistent with "it works" and "it is that colour permanently". Only the paired
  resting/hover measurement separates them.

- **STOP-A-TWO-BYPASS-LAYERS-NOT-ONE** — NEW 2026-08-28. This repo has TWO independent commit-gate
  layers that look identical in their printed output (same F5/F6/cheat-gate report format) but have
  DIFFERENT bypass mechanisms: the session-scoped Claude Code PreToolUse hook (`f5-commit-gate.py`,
  bypassed via a `[gates-ok:<reason>]` token in the commit message) and git's own native
  `.githooks/pre-commit` (no token support, only `--no-verify`). A commit can clear the first and
  still be blocked by the second. **When a commit is blocked with this report shape, check which
  layer is actually blocking (the exact wording differs — "PreToolUse...permissionDecision" vs
  "pre-commit BLOCKED by F5 gate") before assuming your `[gates-ok:]` token was ignored or
  malformed** — it may simply not apply to the layer that's currently blocking. Never use
  `--no-verify` without checking every reported violation is genuinely pre-existing and
  disclosed first. ⚠ **AMENDED 2026-09-07 (Bean-locked, git-hygiene standards).** This entry
  previously ended "and never without the user's explicit go-ahead per this project's hook
  policy". That half is SUPERSEDED: Bean has given standing authorisation to bypass when the
  reported violations are **not your work**. The check-and-disclose half above is untouched and
  is what makes the bypass honest. The permission arrives with a paired OBLIGATION — see
  `STOP-A-BYPASS-OK-BUT-FIX-PRE-EXISTING`. Recorded rather than deleted per D101.

- **STOP-A-CENSUS-IS-ONLY-AS-WIDE-AS-ITS-CORPUS** — NEW 2026-08-22 (D740). D717 measured that the
  overlay row was "the ONLY colour row missing `linked`", against ~40 rows that had it, and shipped
  that claim into a decision entry. It was true of the corpus examined — `SgsColourPanel` ROWS — and
  false of the framework: `ShadowControl` is a standalone shared component, was never in the
  population, and had the identical defect across **15 blocks**. The claim never stated which corpus
  it had used, so nobody could see the gap. **When you write "the only X", name the SET you
  searched, in the same sentence.** A superlative without its corpus is unfalsifiable and reads as
  framework-wide when it is not. Sibling of
  STOP-A-ROSTER-IS-NOT-A-DEFINITION-CHECK-EACH-MEMBER.

- **STOP-A-COMPUTED-CONTROL-SHAPE-BLINDS-A-STATIC-DETECTOR** — NEW 2026-08-22 (D738). A fix built a
  control's `states` array with `STATE_SPECS.filter(...).map(...)`. It RENDERED both states
  correctly — and `inspector-scan` rule 31, which resolves state counts STATICALLY, reported
  "carries 1 state" and the total ROSE. **The code improved while the detector went blind, which is
  strictly worse than the honest finding it replaced.** Rewritten as literal array entries. Before
  refactoring anything a static rule reads, ask what the rule can still SEE. A gate that silently
  stops measuring reads exactly like a gate that passes.

- **STOP-A-WRONG-PATH-IN-A-PLAN-CAN-FORK-A-SHARED-COMPONENT** — NEW 2026-08-22. A phase plan sent an
  agent to `src/components/GridItemDefaultsPanel.js`; the file lives at
  `src/blocks/container/components/`. The consequence is NOT a file-not-found stall:
  `resolveComponentFiles()` scans BOTH directories with **no de-duplication**, so an agent creating
  the file at the wrong path silently FORKS a component reaching 20 blocks — one copy live, one
  stale, with the name→file map keeping whichever it visited last. **Verify every file path in a
  plan with `find` before dispatch.** Two independent reviewers caught this one; a dispatched agent
  would not have.



- **STOP-NODE-CHECK-VALIDATES-SYNTAX-NOT-SCOPE** — NEW 2026-08-01. `node --check` parses a
  file and confirms it is well-formed JavaScript; it does **not** resolve identifiers. A fix
  on the accessibility path referenced a variable that was never declared in that scope,
  passed `node --check` cleanly, and threw at runtime the first time the path executed.
  **Rule: syntax-check tools prove the file PARSES, never that it RUNS** — for identifier
  correctness, either execute the path for real or inspect the binding by hand (grep the
  declaration, confirm it is in scope at the point of use). Sibling of
  STOP-VERIFY-THE-VARIABLE-EXISTS-BEFORE-BUILDING-ON-IT, one layer down: that STOP is about
  never having grepped for the symbol at all; this one is about a tool that LOOKED and still
  said nothing was wrong, because it was never designed to look for this class of defect.

- **STOP-A-FORCED-LINT-RULE-CAN-BE-OVERRIDDEN-BY-PROJECT-CONFIG** — NEW 2026-08-01. Running
  `eslint --rule '{"no-undef":"error"}'` on this project proves NOTHING about undefined
  identifiers, because the project's own ESLint config overrides a rule passed on the command
  line — confirmed by deliberately planting an undefined identifier and watching the forced
  run report clean. A green result from a CLI-forced rule is not evidence the rule actually
  ran with the severity you asked for. **Before trusting any command-line rule override on an
  unfamiliar project, plant a known violation and confirm it is caught** — same negative-control
  discipline as STOP-A-GATE-THAT-CANNOT-FAIL-READS-GREEN-FOREVER, applied to a linter rather
  than a bespoke gate. Verify identifier scope by direct binding inspection when a project's
  config is opaque, not by a forced flag you have not proven wins.

- **STOP-A-LITERAL-GREP-CANNOT-SEE-A-CSS-VARIABLE-DRIVEN-VALUE** — NEW 2026-08-01. Searching
  for the literal `opacity: 0.4` returned zero hits while the actual defect was
  `opacity: var(--x)` — a variable reference the literal search structurally cannot match. The
  offending line had already appeared in the SAME searcher's own earlier, wider output; the
  narrower follow-up search then reported it absent. **A search's negative result describes the
  SEARCH, not the codebase** (extends STOP-A-GREPS-BLIND-SPOT-IS-THE-SHAPE-OF-THE-GREP to
  custom-property indirection specifically): before trusting "no matches" for any styling value,
  search for the PROPERTY name alone and inspect every value it resolves to, including `var(...)`
  chains — and re-read your own prior tool output before re-running a narrower version of the
  same search.

- **STOP-HEAD-N-ON-A-VERIFICATION-LISTING-HIDES-THE-ROWS-THAT-MATTER** — NEW 2026-08-01. EXTENDED
  2026-08-09 (D540 session) with a second occurrence: `grep ... | head -8` on a requires-audit
  showed requires at lines 78-85 and was read as "this file has no more requires past that point" —
  the real require sat at line 89, one row past the truncation. Same mechanism as the original
  finding, different command shape (`head` on a piped `grep`, not a raw `ls`), which is the point:
  the truncation risk travels with ANY pipeline ending in `head`/`tail`, not just directory listings.
  `ls sites/*/... | head -4` on an 8-client sweep showed exactly the four clients that were fine
  and silently hid the four that were not — `head` truncates by POSITION, not by relevance, and
  a verification pass has no reason to expect the interesting rows sort to the top. Same failure
  shape as STOP-VERIFY-EVERY-CLIENT (a fix verified on one client is not verified) one layer
  earlier: here the listing command itself discarded the evidence before a human ever chose which
  client to check. **Rule: never pipe a verification listing through `head`/`tail` unless you have
  already confirmed the full count fits, or you are deliberately sampling and say so** — print the
  full list, or grep for the specific condition across all rows. When in doubt, grep the FULL output
  and count matches rather than eyeballing a truncated page of it.

- **STOP-A-WRONG-EXPLANATION-DOES-NOT-MAKE-THE-OBSERVATION-WRONG** — NEW 2026-08-01. A report
  correctly OBSERVED a dimmed input field but misattributed the MECHANISM (named the wrong CSS
  property as the cause); the whole claim was then dismissed as false because the explanation
  didn't hold up, and the real bug survived several more hours before being found again. An
  observation and its explanation are two separate claims — falsifying the second does not
  falsify the first. **Rule: when a stated mechanism turns out wrong, re-test the RAW OBSERVATION
  independently before discarding the report** — the visible symptom may still be real even when
  the diagnosis attached to it is not. Sibling of STOP-A-DOCUMENTED-RISK-CAN-BE-WRONG-ABOUT-ITS-OWN-DOM
  (a wrong premise can attach to an otherwise-real finding) and STOP-FACT-CHECK-COUNCIL/REGISTER-FINDINGS.

- **STOP-A-CAPABILITY-PRESENT-IN-EVERY-ARTEFACT-CAN-STILL-DO-NOTHING** — NEW 2026-08-01. Morph
  appeared in the shipped-effects list, and the generated roster grew from 3 entries to 28 — every
  artefact a build-completeness check would look at said the capability existed — while the effect
  had never once actually animated anything. Artefact PRESENCE (a registry row, a roster count, a
  file that compiles) is a fundamentally different claim from artefact BEHAVIOUR (it fires and
  produces the effect on a live page). Extends STOP-A-GREEN-BUILD-IS-NOT-EVIDENCE-AN-EFFECT-FIRES
  from "the code exists" to "the code exists in every tracking system that was meant to catch this
  exact gap" — a roster growing is not evidence of anything except that the roster grew.

- **STOP-STATIC-CONTRAST-MATHS-CANNOT-SEE-COMPOSITED-DIMMING** — NEW 2026-08-01. A computed-colour
  contrast calculation reported 5.79:1 — comfortably AA — while the rendered pixel measured 1.79:1,
  because `opacity` had been applied to the element and static colour arithmetic has no way to
  account for compositing against whatever sits behind it. **Rule: whenever a rendered appearance
  is disputed or an element (or an ancestor) carries `opacity`/`filter`/blend modes, pixel-sample
  the actual rendered output rather than trusting a computed-style contrast calculation** — the two
  can disagree by more than 3x. Sibling of STOP-MEASUREMENT-VS-EYE and
  axe-cannot-measure-contrast-inside-a-dialog (both: a formula computed from source values misses
  a real compositing effect the eye or a pixel sampler catches immediately).

- **STOP-A-REBASELINE-MUST-BE-FOLLOWED-BY-A-SELF-TEST** — NEW 2026-08-01. Re-recording a
  performance/budget baseline is a mutation of the gate itself, not a neutral bookkeeping step —
  it can silently remove the gate's ability to ever fail again (e.g. baselining against a run that
  already contains the regression). **Rule: any rebaseline of a budget/threshold gate must be
  followed immediately by a self-test that plants a known violation and confirms the gate still
  rejects it** — the same discipline as STOP-A-GATE-THAT-CANNOT-FAIL-READS-GREEN-FOREVER, applied
  specifically to the moment a baseline is refreshed, which is exactly when the teeth are easiest
  to lose without noticing.

- **STOP-D-NUMBERS-COLLIDE-ON-A-SHARED-WORKTREE** — NEW 2026-08-01. A co-active track claimed
  D455 while this session was mid-flight, so a docblock written slightly later that cited "D455"
  for ITS OWN decision was actually pointing at someone else's unrelated entry. D-numbers are not
  reserved in advance on a shared worktree — the ceiling moves under you between your read and your
  write. **Rule: re-run the anchored D-ceiling check
  (`grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`)
  IMMEDIATELY before writing any D-reference, not once at session start** — treat a cached
  D-ceiling exactly like a cached branch name (STOP-RECHECK-BRANCH-BEFORE-COMMIT): re-check in the
  same breath as the write, because the other track moves it between your reads. Sibling of
  STOP-CO-ACTIVE-TRACK-ETIQUETTE-ON-A-SHARED-WORKTREE and STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT.

- **STOP-A-A-TEST-CAN-PASS-THE-VERY-DEFECT-IT-WAS-WRITTEN-TO-CATCH** — NEW 2026-07-31 (D430).
  The image-sequence probe's pass criterion was "luminance spread >= 5". The recorded defect had a
  spread of **63** and sailed through, because 60% of the scroll produced no change at all and the
  criterion never looked at DISTRIBUTION. Worse: the replacement I first briefed to a subagent
  ("at least 3 of 5 samples distinct") would ALSO have passed it — the failure
  `86.14, 86.14, 86.14, 128.60, 149.39` has exactly **three** distinct values. The agent caught it
  and used strictly-increasing-at-every-step instead, negative-controlled against the recorded
  defect, reversed frames and a blank canvas. **Before trusting a gate, run the KNOWN FAILURE
  through it and confirm it goes red.** A criterion that has never been shown to fail is a
  decoration. Sibling of `negative-control-or-the-test-is-vacuous`, but sharper: here the test
  existed, ran, and reported PASS on the bug.

- **STOP-A-A-PROBE-THAT-NEVER-REACHES-THE-EFFECT-IS-MEASURING-THE-PROBE** — NEW 2026-07-31 (D430).
  Four of my own probe results were false before any code was. (1) A sampler installed at page load
  reported DrawSVG and ScrambleText as "never fired" — both default to `trigger: scroll` and were
  below the fold, correctly waiting. (2) `scrollIntoViewIfNeeded` scrolls the MINIMUM distance, so
  it parked a scrubbed element short of its trigger's start and the scrub read as dead. (3) Two
  adjacent scramble headings entered view together, so the first one's sampling window consumed
  BOTH tweens and the second read as inert. (4) A before/after drag whose endpoints coincidentally
  matched its start point read as "never moved" while having passed through twelve intermediate
  values. **Every one of these looked like a product defect and was a measurement defect.** Fact-
  check your own diagnostic before you fact-check the code — and for a scroll-triggered effect,
  sweep THROUGH its range rather than merely bringing it on screen.

- **STOP-A-A-DEPLOY-COPY-MUST-INCLUDE-ASSETS** — NEW 2026-07-31 (D430). Building an isolated deploy
  worktree, I copied `src`, `includes`, `scripts` and `build` — and not `assets/`. The new
  `fx-motion-path.css` therefore 404'd on the canary, and the hidden route `<svg>` it was supposed
  to hide rendered as a **1200x1200 black shape** on the page. Nothing in the build or deploy output
  said a word; the verify step passed because the HOMEPAGE was fine. **A partial worktree copy is a
  silent-omission machine.** Copy the whole plugin directory, or diff the copy against the source
  tree before shipping. Found only by loading the page as a visitor would.

- **STOP-A-A-PROSE-CLAIM-IN-A-REPORT-IS-NOT-A-COMMITTED-ARTEFACT** — NEW 2026-07-31 (D430). The
  2026-07-30 deploy report stated that `fx_effects.draw` and `.scramble` had been corrected to
  declare ScrollTrigger, "corrected against the built output rather than against intent". The
  correction had never reached `seed-motion-fx-registry.py` — both rows still read without it a day
  later. A report sentence describing a fix is not the fix. **When a prior session's doc claims a
  change landed, grep the artefact before building on it.** Extends the existing
  `a-prose-claim-is-not-a-committed-artefact` entry with a same-family recurrence.


- **STOP-A-A-CHECKSUM-ACROSS-A-GIT-BOUNDARY-ON-WINDOWS-IS-NOT-A-MEASUREMENT** — NEW 2026-07-31
  (D426). Checking whether the shared `build/` carried a co-active track's uncommitted work, I
  compared each `build/blocks/*/render.php` against `git show HEAD:<src>` and got three hits
  (`button`, `process-steps`, `quote`). **All three were FALSE.** `git show` streams the blob with
  LF endings while the checked-out working files are CRLF on Windows, so the digests differed on
  line endings alone; comparing build against the CURRENT WORKING FILE showed byte-identical
  content, and `git status` showed all three clean. Acting on the first reading would have meant
  "restoring" three files that were never wrong — on a deploy path whose documented failure mode
  (D336) is taking client sites down. **Any md5/diff that crosses a git/worktree/index boundary on
  Windows must normalise line endings before it means anything.** Compare working-file to
  working-file, or pipe both through the same channel. The sibling isolation check that DID hold
  (worktree `lucide-icons.php` vs dirty-tree, both working files) is the shape to copy.

- **STOP-A-A-NEW-ATTRIBUTE-IS-A-VISUAL-CHANGE-EVEN-WHEN-NO-CSS-MOVED** — NEW 2026-07-31 (D426).
  The pre-commit visual-diff gate blocked `gallery` / `testimonial-slider` and the instinct was
  "this only adds an opt-in attribute, nothing paints differently". Wrong test. The gate's own
  escape hatches are DETERMINISTIC and were consulted rather than argued with:
  `check-blockjson-metadata-only.py` (is the block.json delta confined to `supports.sgs`?) and
  `check-markup-neutral.py` (PHP-only, no added output construct?). Both correctly said NO —
  the change adds real ATTRIBUTES plus editor controls plus render emission, which can move
  pixels. **Run the gate's own checker to learn WHY it fired; never reason your way past it, and
  never reach for `--no-verify`** — here that would also have discarded gitleaks, the wp-* pre-merge
  gate, cheat-gate, F5 and F6, all of which were passing. A gate turned off to skip one check
  turns off the six it was not aimed at.
  ⛑ **CORRECTED 2026-08-15.** If the block genuinely can't get a real capture right now, the
  answer is no longer "argue past it" OR `--no-verify` — it's the scoped bypass:
  `SGS_VISUAL_GATE_SKIP=<block> SGS_VISUAL_GATE_REASON="..." git commit ...` (skips ONLY the
  visual-diff check for that block; gitleaks/cheat-gate/F5/F6/Gate A/wp-* pre-merge all still
  run, and the skip is logged to `reports/visual-diff/manual-skips.log`). See `.githooks/README.md`.

- **STOP-A-A-DOCUMENTED-RISK-CAN-BE-WRONG-ABOUT-ITS-OWN-DOM** — NEW 2026-07-30 (D424). Before
  testing a risk a comment describes, **verify the structural premise the risk rests on**.
  `header-behaviours.css` warned for months that the nav-drawer `<dialog>` opens INSIDE a
  transformed `header.sgs-site-header`. It does not — its parent chain is `BODY → HTML`, so a
  header transform could never reach it. Testing the risk as written (transform the header, check
  the dialog) returns "unaffected" and **passes vacuously**, and would have been reported as the
  risk being cleared. The real question (top-layer vs transformed ancestor) only becomes testable
  once you transform a GENUINE ancestor and add a negative control — an ordinary `position:fixed`
  probe that MUST move, proving the measurement can see the effect at all. It moved −80px; the
  dialog moved 0. **An inherited risk note is a hypothesis about the code, including its claims
  about structure — and a test inherited from a wrong premise inherits the wrongness silently.**

- **STOP-A-THE-NAVIGATION-KIND-DECIDES-WHETHER-THE-FEATURE-IS-EVEN-ELIGIBLE** — NEW 2026-07-30
  (D424). A feature can be correctly built, correctly served, and still never fire because the way
  the TEST triggered it was ineligible. Cross-document view transitions do not run for
  browser-initiated navigations (`page.goto`, address bar) — only for navigations initiated from
  within the page. The first reduced-motion test used `goto` and returned "no transition" on BOTH
  legs; the suppression leg looked like a PASS while proving nothing, because the control leg was
  equally dead. **Whenever a test's result is "the thing didn't happen", prove the thing CAN
  happen in that harness first — the negative control is not optional, it is the test.**

- **STOP-A-GATES-SCOPE-MAY-BE-A-GUARD-NOT-A-BLIND-SPOT** — NEW 2026-07-30 (D423). Before widening
  a gate's scope because it "can't see" a violation class, ask what its narrowness was PROTECTING.
  `check-no-inline.py` inspected only block ROOTS, missing per-instance `--var` on BEM sub-elements
  (7 blocks / 8 sites passed for weeks). The obvious widening — attribute every styled descendant
  to its nearest SGS ancestor — **manufactured 4 false positives on the first live page**: they
  were CORE WordPress blocks (`core/heading`, `core/site-logo`) carrying WP's own inline
  serialisation of native supports, which FR-32-1 does not govern. The root-only scope was
  simultaneously a blind spot AND a false-positive guard. **Correct rule:** attribute to the
  nearest enclosing block root of ANY kind; a core root SHADOWS its SGS ancestor. **And measure the
  widened gate's output BEFORE arming it** — on a shared worktree an unannounced red build blocks a
  co-active track. Ship it opt-in, prove it green post-deploy, then promote.

- **STOP-A-PROSE-IS-NOT-AN-ARTEFACT** — NEW 2026-07-30 (D423). A completion claim whose only
  backing is a sentence — especially a sentence written in the SAME commit that made the fix — is
  unbacked, however confident it sounds. Spec 31 v0.6 claimed "0 WRITTEN-not-LANDED"; the committed
  oracle artefact predated its own fix commit and still read 2, and `git status` proved it had
  never been regenerated. (Re-running it showed the claim was TRUE — which is the point: it cost
  one command to convert an assertion into evidence, and nobody had spent it.) **Before accepting
  any "gate MET / 0 failures / complete" claim, find the machine artefact and check its commit date
  against the fix it depends on.**

- **STOP-A-A-CITED-SLUG-MAY-NOT-EXIST** — NEW 2026-07-30 (D423). **Four** phantom parking slugs
  were found in one session — `P-CLONING-DEPLOY-BLOCKED-SHARED-TREE` (cited twice in the LEDGER as
  *the only blocker*), `P-UIMAX-ENFORCE-CREDIT-CLASSIFIER`, `P-F5-REMAINING`,
  `P-UNIVERSAL-RESPONSIVE-ROUTING` — none resolving in `parking.md` or `memory/parking-archive.md`.
  Two survived TWO sweeps and fell only to an adversarial third pass. **Cause:**
  `handoff-preflight.py`'s `no-dangling-links` validates markdown LINKS, not `P-` slug citations,
  so the whole class is invisible to the gate that appears to cover it. **Before citing a `P-` slug
  anywhere, grep BOTH parking files. Adding a `P-[A-Z0-9-]+` resolution check to
  `handoff-preflight.py` is OWED** — it is the cheapest durable fix.

- **STOP-A-FLAG-NAMED-CHECK-IS-NOT-ALWAYS-A-DRY-RUN** — NEW 2026-07-29 (parking cull). A subagent
  under an explicit READ-ONLY brief ran `seed_conformance_goldens.py --check` to inspect state; the
  flag does **not** mean dry-run on that script — it **re-seeds**, and it rewrote **28 golden
  fixture files** before being reverted. `--check`, `--dry-run`, `--report`, `--verbose` and
  `--status` are conventions, not guarantees; a repo's own scripts are free to define them however
  they like. **Before running any project script for INSPECTION — especially inside a read-only
  brief or from a subagent — read its argparse block or docstring and confirm the flag is
  non-mutating.** Prefer `git status` immediately afterwards as a cheap tripwire, and never accept
  an agent's "I reverted it" without verifying the tree yourself. Known non-dry-run flags in this
  repo: `seed_conformance_goldens.py --check`.

- **STOP-A-GATE-THAT-CANNOT-FAIL-READS-GREEN-FOREVER** — NEW 2026-07-29 (enforcement build). A
  broken check and a passing check emit the identical signal: silence. **Every new gate ships with a
  negative control (`--self-test`) that injects a synthetic violation per check and asserts the
  check REJECTS it** — and the fix for any gate bug must be tested BOTH ways (that it now ignores
  the false positive AND still catches the true one). Proven on first run: `handoff-preflight.py`'s
  STOP-count regex was compiled without `re.M`, so `^` anchored to the start of the STRING and
  counted **0 STOPs on any real file** — the D101 carry-forward check would have reported "no
  defence dropped" forever while measuring nothing. The same script counted a fenced markdown
  TEMPLATE as a live data entry. **Corollary: a suspiciously clean number (0 violations, 0 findings,
  "no drift") is a prompt to prove the gate sees anything at all** — same class as
  `STOP-A-SCOPED-AXE-RUN-ON-A-CLOSED-SURFACE-PASSES-VACUOUSLY`.

- **STOP-A-GATE-CAN-BE-BLIND-TO-THE-FILE-IT-PROTECTS** — NEW 2026-07-29. An audit can run cleanly
  for months while never once looking at the file it exists to protect, because gates bind to a
  doc's NAME, TYPE or SHAPE and any reorganisation severs that binding **with no diff to show it**.
  Proven: the D101 carry-forward audit (at the time, in a script named `docscore.py` — since
  superseded by `.claude/hooks/handoff-preflight.py`, see CLAUDE.md) was written when the STOP
  catalogue lived inside `next-session-prompt.md`; after the P4 split to `STOP-CATALOGUE.md` it kept passing on a
  file containing no catalogue. Two independent mismatches — it gated on `doc_type` (this file
  declares `doc_type: reference`, and **frontmatter beats the filename map**), and its row detector
  matched markdown TABLE rows while this file uses bullets. **After moving, splitting, renaming or
  re-typing any doc, grep for its old name AND its doc-type string across hooks, scripts and skill
  definitions — then verify by INJECTION, not by reading.** Treat a "not applicable" verdict on a
  file you believe IS applicable as a bug, never a pass.

- **STOP-A-SUBAGENT-ABSENCE-CLAIM-IS-A-HYPOTHESIS** — NEW 2026-07-29 (parking cull). "It doesn't
  exist" / "zero hits" / "I found nothing" from a subagent is an **unproven negative** — a failed
  search and a true negative look identical. Map it to UNVERIFIABLE, never to absence, and say so in
  the brief so the agent has an honest option that costs it nothing. Proven twice the same day: one
  agent reported two parking entries as "absent from parking.md entirely" (both present, both open);
  and a rewrite agent's own output manifest **listed three slugs it never wrote** while its prose
  report read as complete — across two agents 18 slugs were dropped, 5 of them cited from live docs.
  **NEVER let a subagent's own manifest be the completeness check**: diff its output against an
  independently-derived expected set. Re-run any absence claim yourself — it is usually one grep.

- **STOP-CO-ACTIVE-TRACK-ETIQUETTE-ON-A-SHARED-WORKTREE** — NEW 2026-07-28 (docs fat-cut).
  Two or more sessions commit to `main` in the SAME worktree at the same time. The rules, all
  earned by real incidents: (1) **commit by EXACT PATH, never `git add -A`** — a blanket add
  sweeps the other track's uncommitted work into your commit; (2) **an uncommitted change you did
  not make is NOT yours to commit, revert, or "clean up"** — the LEDGER names which files the
  co-active track is holding, and a `git checkout --` on one destroys unpushed work with no
  recovery path; (3) **re-check `git branch --show-current` in the SAME command as the commit**
  (STOP-RECHECK-BRANCH); (4) **`git log -1` before trusting any cached HEAD/D-ceiling** — the
  other track moves both between your reads; (5) **the LEDGER wins on any disagreement about
  live state.** Per-track next-session prompts were RETIRED 2026-07-28 for exactly this reason:
  each track kept a private "truth" file, one went stale, and a session nearly spent itself
  rebuilding working code from it. Track state now lives in the LEDGER's per-track sections only.

- **STOP-MEASURE-THE-STATE-NOT-THE-FLAG-THAT-REQUESTS-IT** — NEW 2026-07-26 (D391). When gating
  behaviour on *"is X currently true?"*, read the **computed/effective state**, never the flag,
  class or attribute that *asks* for X. The two diverge the moment any other setting can override
  the first, and the flag keeps reading `true` while nothing is happening. Proven live:
  `header-behaviours.css` sets `position: sticky !important` for the sticky flag (`:39`) and
  `position: absolute !important` for transparent (`:52`) — **equal specificity, both
  `!important`, transparent later in source order** — so a header carrying BOTH classes computes
  `absolute` and scrolls away. A gate reading `body.sgs-header-behaviour-sticky` would have
  reserved 93px of anchor dead-space for a header that is not pinned; `getComputedStyle().position`
  gets it right and also catches a header pinned by a theme/client rule the class never knew about.
  **Corollary — two `!important` declarations at equal specificity are resolved by SOURCE ORDER**;
  never assume the one you care about wins, and when you author the winner prefer higher
  specificity over position (the collapse rule was deliberately made (0,4,0) against the translate
  rule's (0,3,0) for exactly this reason). **Second corollary — every measured gate still has a
  blind spot; name it and, when cheap, ship a detector rather than pretending the measurement is
  total.** Here: a sticky header whose ancestor carries `overflow` other than `visible`, or
  `transform`/`perspective`/`filter`, still COMPUTES `sticky` while pinning to that ancestor — so
  D392 added `findStickyBreakingAncestor()`, which WARNS rather than changing the published value
  (an `overflow` ancestor may still be the page's own scroll container, so acting would be a fix
  for an unproven cause). Sibling of STOP-A-FILTER-GATE-ON-THE-WRONG-ATTR (a gate reading an attr
  the markup never carries) and STOP-VERIFY-CONTENTS-NOT-FILENAME. Memory
  `measure-the-state-dont-read-the-flag-that-requests-it`.

- **STOP-A-CRITERION-WRITTEN-AGAINST-A-REJECTED-MODEL-MUST-BE-STRUCK-NOT-BUILT** — NEW 2026-07-26
  (D392). When a decision REJECTS a model, its acceptance criteria, guardrails and must-fixes do
  not become smaller — many of them become **meaningless**, and a builder who treats the criteria
  list as the spec will construct machinery for conditions that can no longer occur. Proven twice
  in one doc: the sticky mini-design rejected per-row `position:sticky` (D389), which silently
  voided both its own "the multi-sticky warning is advisory only" done-when and its "a row cannot
  be both retained-when-pinned and hidden-on-scroll" guard — under a single header-level sticky
  element there is no second sticky row and no per-row conflict. **Building either would have
  shipped a warning for an impossible state.** Sharper still: that §4 done-when list had ALREADY
  been rewritten once, explicitly because it had survived the D1/D2 revisions unchanged — and the
  multi-sticky criterion still slipped through the rewrite. **Rule: after a model is rejected,
  walk EVERY criterion, guardrail and must-fix and classify each as still-required / void /
  changed — then record the void ones as struck WITH the reason, never delete them silently and
  never build them.** A struck criterion with its reasoning is what stops the next session
  "finishing the job". Sibling of
  STOP-A-SPEC-DESCRIBING-A-SUPERSEDED-MODEL-ACTIVELY-MISDIRECTS-THE-BUILD and memory
  `a-revision-must-sweep-every-section-it-invalidates`.

- **STOP-NO-TOP-LEVEL-FUNCTION-IN-PER-RENDER-PHP** — NEW 2026-07-23 (D374). A reusable function
  declared at the top level of a dynamic block's `render.php` fatals the WHOLE page ("Cannot
  redeclare") the moment TWO instances of that block appear — WordPress runs the render_callback
  (`render.php`) via `include`, once PER INSTANCE. Put shared functions in a `function_exists`-guarded
  `includes/*.php` helper (aggregated once by `render-helpers.php`); render.php CALLS them. Proven live:
  Dispatch B put `sgs_icon_list_flatten_menu_blocks()` top-level in render.php; a single instance
  rendered fine, a 5-instance page 500'd. **Every prebuild gate AND both pre-commit code reviewers
  passed it** — none tested 2 instances. **Corollary: a page with 2+ instances of the SAME block is a
  MANDATORY live-verify case for every block.** The R-31-13 lesson (code correct by read ≠ live render
  works). To surface a fatal `debug.log` misses when `WP_DEBUG_LOG` is off: a scoped probe PHP file
  (`require wp-load.php; do_blocks($markup)` with `display_errors=1`, curl, delete) — NOT `wp eval`
  (content-guard-blocked) and it touches no post_content. (Memory `no-top-level-function-in-per-render-php`.)

- **STOP-AN-ARIA-LABEL-ON-A-ROLELESS-ELEMENT-NAMES-NOTHING** — 2026-07-23 (D367). **The rule stands;
  its cited instance was RETRACTED 2026-07-23 — see the correction below.** An `aria-label` on a bare
  `<div>`/`<span>` with no role is **IGNORED by assistive tech**. It is not a weak label — it is no
  label. General rule: an ARIA attribute is only meaningful on an element whose role can carry it —
  before trusting any `aria-*`, name the role it is attached to. Sibling of
  STOP-VERIFY-CONTENTS-NOT-FILENAME (a thing that looks right by its name).
  > ⚠ **The `sgs/nav-menu` example originally cited here was FALSE and is struck.** The claim was
  > that the block "emitted zero `<nav>` elements" and put `navLabel` on a roleless `<div>`. It did
  > not: `render.php` has always called the shared wrapper with `'tag' => 'nav'` and passed the label
  > via `extra_attrs` — a correctly-named landmark (`git show bb11cd1e^:…/nav-menu/render.php:516,524`).
  > The entry is kept because the PRINCIPLE is real and worth surfacing; only the worked example was
  > fabricated by an unverified diagnosis. **Never illustrate a STOP with an instance you have not
  > confirmed in rendered output** — a false example teaches the next session to "fix" working code.

- **STOP-PROVE-THE-THING-IS-MISSING-BEFORE-ADDING-IT** — NEW 2026-07-23. When a diagnosis says
  "element/attribute/landmark X is absent", the fix ADDS X — so if the diagnosis is wrong you do not
  get a no-op, you get a **duplicate**, and duplicates of structural elements are their own defect
  class (nested landmarks, double live-regions, two labels that drift). Proven this session: a
  "`sgs/nav-menu` has no `<nav>`" finding produced `<nav>` nested inside `<nav>` around the same
  links, with the outer one's label deleted, shipped as an accessibility fix. The absence check must
  be made against **rendered output** — `curl` the live page, or `getComputedStyle`/`querySelectorAll`
  in the DOM — never against one source file, because shared helpers and wrappers emit markup the
  block's own file never mentions. One `curl … | grep -c '<nav'` would have cost seconds and
  prevented the whole change. Generalises STOP-A-GREP-PATTERN-THAT-CANNOT-MATCH-PROVES-NOTHING from
  "can this pattern match?" to **"am I even looking at the artefact that would contain the answer?"**
  Sibling of STOP-NEGATIVE-CONTROL (both: establish the baseline before acting on a delta).

- **STOP-A-GREP-PATTERN-THAT-CANNOT-MATCH-PROVES-NOTHING** — NEW 2026-07-23. A dispatched agent
  verified "zero banned core blocks remain" using `grep "wp:core/"`. **That pattern returns 0 on every
  file in the repo**, because WordPress core block markup omits the namespace — it is `<!-- wp:group -->`,
  never `wp:core/group`. Its answer happened to be right; its evidence could not have detected a wrong
  one. This is the negative-control rule one level down: not "would this pass if the feature were absent?"
  but **"can this pattern match the thing I am looking for AT ALL?"** Fix that works: when delegating
  verification to a cheap model, specify the exact PATTERN, not just the instruction to verify — and
  when receiving any grep-based proof, re-run it yourself with a pattern you know matches.

- **STOP-A-GATE-BORROWING-ANOTHER-TOOLS-EXCLUSION-LIST-INHERITS-ITS-BLIND-SPOT** — NEW 2026-07-23
  (D366). `check-no-core-blocks.py` (a GATE that only READS) called `driver.zone_of()` from the
  MIGRATION tool (which REWRITES files), whose list is labelled *"Track A hands-off list (Track C
  prompt)"*. That list was **parallel-track coordination** — entirely correct for an auto-migrator,
  meaningless for a gate. Borrowing it silently converted "another track owns this file" into "this
  file is exempt from the ban", so the gate reported `clean — 41 files` while never looking at 13,
  including BOTH framework default patterns that ship to every install. The exclusion also used a
  glob (`*footer-*.php`), so the blind spot self-extended to any future footer pattern. **Rule: a
  gate owns its own exclusion policy, stated in the gate, as explicit filenames with a reason and a
  retirement condition — never a glob, and never imported from a tool that answers a different
  question.** Two tools sharing a list must share the QUESTION, not just the data.

- **STOP-VERIFY-THE-VARIABLE-EXISTS-BEFORE-BUILDING-ON-IT** — NEW 2026-07-23 (D367). While fixing the
  nav landmark I referenced `$resolved_menu_name` — a variable I had **invented**; it appears nowhere
  in the file. It read as plausible because a menu name is obviously *available in principle*. This is
  the same failure I spent the session catching in subagents, committed by me, in code I was writing
  to fix someone else's unverified claim. **Rule: any identifier you did not just read, grep for it
  before you build on it** — the cost is one command, the failure mode is a silent runtime null that
  a green build will not catch. Pairs with the SGS evidence hook's GROUND-TRUTH line: state the file
  and line the symbol came from.

- **STOP-A-FILTER-GATE-ON-THE-WRONG-ATTR-FIRES-NEVER-AND-SILENTLY** — NEW 2026-07-22 (D359). A
  `pre_render_block` (or any block) filter that gates on `attrs.X === 'value'` fires ONLY when the
  block markup literally carries `X`. WP may resolve that property from registration metadata, but
  the resolved value is NOT in the parsed `$block['attrs']` the filter sees. The SGS theme references
  the header/footer part as `{"slug":"header","tagName":"header"}` with **no `area` attr**, so
  `Sgs_Header_Rules::filter_template_part`'s `attrs.area === 'header'` gate never matched — the whole
  conditional-header + CPT-binding mechanism had **never once fired on this theme**, silently. It was
  invisible to every code-read and to a 16-check mutation harness because the defect lives in the
  theme-markup↔filter-gate INTEGRATION, not the branch logic — **only a live render (R-31-11) caught
  it**, via the tell that the behaviour resolver (reads the CPT directly) saw sticky while the render
  path did not. Fix: match by `area` OR `slug`. General rule: before trusting a block-attr gate,
  confirm the live markup actually carries that attr; and a mechanism that "should intercept X" must
  be proven to fire on a real page, not assumed from the code.

- **STOP-SET-ACTIVE-LAYOUT-IN-THE-WEB-CONTEXT-NOT-RAW-WP-CLI-OPTION** — NEW 2026-07-22 (D360). The
  active header/footer pointer (`sgs_active_header_cpt_id` / `sgs_active_footer_cpt_id`) MUST be
  written in the SAME PHP context the frontend reads it from — the "Set as active" admin action
  (`admin-post.php?action=sgs_set_active_layout`) or a request against the live domain — NEVER a raw
  `wp option update` from an arbitrary WP-CLI `--path`. On the shared Hostinger canary, WP-CLI can
  read/write a DIFFERENT option store (install path / table-prefix) than the live domain serves: a
  probe proved `wp option get` returned `1570` while the frontend `get_option` returned `0` on the
  same page load, with **no object cache** to explain it. The symptom presented as "the CPT-render
  binding is broken" and pointed straight at freshly-shipped code — it nearly triggered a fix to
  `Sgs_Active_Layout` / `filter_template_part`, both of which were CORRECT (proven: setting active via
  the admin action rendered both markers exactly once, wrapper replaced). **General rule:** when a live
  read contradicts a CLI read with no persistent object cache, suspect a **store/prefix/webroot
  mismatch before the code** (`prove-the-cause-before-fix`); and to verify any option-driven feature,
  set the option through the same context the feature reads it, not a CLI shortcut. Sibling of
  STOP-A-FILTER-GATE-ON-THE-WRONG-ATTR (both: a mechanism that "should work" must be proven on a real
  request, R-31-11) and STOP-VERIFY-DEPLOY-BY-CHECKSUM.

- **STOP-INSPECT-THE-TARGET-BEFORE-DELETING-ON-A-LIVE-SITE** — NEW 2026-07-22 (D362). Before deleting
  ANY post / page / template-part / option on a live site, OPEN IT and confirm what it actually is —
  even when a parking entry, a handoff, an audit finding, or **Bean himself** describes it as scrap.
  A description is a hypothesis about the world; the object is the ground truth. Proven three times in
  one session: canary draft 1320 was flagged as a blocking `sgs/mega-menu` reference but held only
  `patternName` metadata text (a FALSE positive — safe to delete for a different reason); prod
  `wp_navigation` post 100 WAS a real orphan (safe); and posts 67/68, described as "canary pages that
  should be scrapped", turned out to be the **live Indus "Retail" and "Wholesale" sector pages** — a
  delete-as-instructed would have destroyed real client content on a production site. The inspect step
  cost one `wp post get` per object and prevented that. **Rule: a delete instruction is authorisation to
  ACT, never authorisation to SKIP VERIFICATION.** If the object does not match its description, STOP and
  report rather than proceeding. Sibling of STOP-VERIFY-A-DEFERRAL-BEFORE-EXECUTING-IT (generalised: an
  inherited *description* is a hypothesis) and STOP-CONFIRM-WHAT-YOUR-OUTPUT-DESCRIBES.

- **STOP-A-DISPATCHED-AGENT-MUST-EXECUTE-NOT-DELEGATE** — NEW 2026-07-22 (D362). A `wp-sgs-developer` (or
  any implementer) subagent dispatched to DO work will sometimes spawn its OWN sub-agents instead of
  executing — burning a full cycle, producing nested/duplicate agents that then need stopping, and
  returning a plan instead of a result. Happened twice in one session. **Fix that works: put an explicit
  line in every implementer dispatch — "EXECUTE YOURSELF with your OWN tools (Bash/SSH/Playwright). Do
  NOT use the Agent/Task tool to delegate — you are the implementer. Report actual command outputs."**
  Also: an agent's "done" is a CLAIM — verify it against the real repo / live state before believing it
  (held all session and caught real gaps). Pairs with STOP-VERIFY-DEPLOY-BY-CHECKSUM.

- **STOP-VERIFY-DEPLOY-BY-CHECKSUM** — NEW 2026-07-20 (D351). `build-deploy.py` printing
  `[DONE]` + `[verify] HTTP 200, markers present` does NOT mean your change shipped: the
  verify asserts only that *a* page renders with generic `wp-block-sgs`/`sgs-` markers, which
  pass on ANY working SGS page **including one running last week's code**. A deploy reported
  success, was measured correct, and was then silently reverted by a co-active session's
  deploy — a false `verdict: PASS` reached Bean. **After every deploy, `md5sum` the changed
  file local vs server BEFORE measuring anything**, and re-check it before quoting a live
  result later in the session. A liveness check that would still pass if the feature were
  entirely absent is worse than no check. (Parking `P-DEPLOY-VERIFY-NOT-CHANGE-SPECIFIC` +
  `P-CANARY-SHARED-DEPLOY-RACE`.)
- **STOP-READ-DRAFT-BEFORE-DESIGNING-A-CLONE-FIX** — NEW 2026-07-20 (D351). When a clone
  diverges from its draft, READ THE DRAFT'S CSS FIRST and ask *"can the block express this
  value at all?"* (grep its `block.json` attrs). The default cause is a MISSING ATTRIBUTE —
  the converter had nowhere to put the draft's value and dropped it **silently** (the D338
  class: no error, no gate, no failing build) — not a policy gap needing a new rule. An a11y
  defect on a clone whose draft is ACCESSIBLE is a FIDELITY defect: measure the draft's own
  pairing before designing a contrast fallback. Bean caught exactly this (`sgs/nav-menu` had
  no `featuredBg`; the draft's pill measured 5.28:1 and one attribute fixed both).
- **STOP-HARNESS-CANNOT-SEE-A-CLASSIC-SCROLLBAR** — NEW 2026-07-20. Headless Chromium uses
  OVERLAY scrollbars: `window.innerWidth - documentElement.clientWidth === 0`. Any test whose
  condition depends on a classic scrollbar existing (D340 scroll-lock bounce, scrollbar-gutter
  compensation, layout-shift-on-lock) **cannot fire in-harness, and a 0px delta proves
  NOTHING**. Report such a check as INCONCLUSIVE and route it to Bean on a real windowed
  desktop browser. Never bank it as a pass. (Encoded in `nav-qa/README.md`.)
- **STOP-NEGATIVE-CONTROL-OR-THE-TEST-IS-VACUOUS** — NEW 2026-07-20 (D352). Before banking ANY
  acceptance PASS, ask: **"would this still pass if the feature were entirely absent?"** If yes,
  it proves nothing. Happened this session: FR-36-1's classic-menu render was "proven" by asserting
  5 menu labels on a page — but the page's HEADER renders those same 5 labels from the BLOCK menu,
  so the check would have passed identically with the resolver deleted. It was caught and redone
  with a marker item existing ONLY in the classic menu, plus a **negative control** (marker must be
  ABSENT on the homepage) and a countable delta (28→29 anchors). **Rule: an acceptance test needs a
  signal unique to the thing under test, and wherever possible a negative control that FAILS.** This
  is the same family as STOP-VERIFY-DEPLOY-BY-CHECKSUM (a liveness check that passes on any working
  page) — generalised: *a check that cannot fail when the feature is missing is worse than no check,
  because it manufactures false confidence and gets quoted to Bean as proof.*
- **STOP-VERIFY-A-DEFERRAL-BEFORE-EXECUTING-IT** — NEW 2026-07-20 (D352). A task inherited from a
  handoff / next-session-prompt / parking entry is a **hypothesis about the world at the time it was
  written**, not a standing instruction. Check its premise still holds BEFORE doing it. Happened this
  session: the prompt said to "retire the adaptive-nav / mega-menu / mobile-nav DB rows via
  `/sgs-update`". Checked instead of executed: `mobile-nav` was ALREADY gone from `src/` and the DB
  (no-op); `adaptive-nav` MUST stay registered as the FR-36-18 rollback path; `mega-menu` is Phase-2
  scope, not superseded work. **Executing it as written would have deleted the rollback path.** The
  deferral was struck with its reasoning rather than carried forward. Same family as
  STOP-FACT-CHECK-COUNCIL/REGISTER-FINDINGS — a finding is a hypothesis — extended to *your own
  project's queued work*, which feels authoritative precisely because it came from inside.
- **STOP-A-SPEC-DESCRIBING-A-SUPERSEDED-MODEL-ACTIVELY-MISDIRECTS-THE-BUILD** — NEW 2026-07-21
  (D358). Spec 17 carried THREE competing answers to "where is a header edited?" — Site Editor,
  WP Customiser (never built), and the CPT screen P2 actually decided on. The CODE implemented
  the first; the DECISION was the third. A task earlier that same day was built and
  live-verified against the superseded model **purely because the governing spec still described
  it**. A stale spec is not neutral documentation debt — for a non-coder owner the spec IS the
  system, so it steers the build wrong with full authority. **When a decision changes the model,
  the governing spec is amended in the SAME work, or the next session builds the old one.**
  Corollary: a doc that has to label its own content "RETRACTED FICTION" (Spec 17 did, naming
  four classes asserted as shipped that never existed) has earned deletion, not a caveat.
- **STOP-EVERY-COUNCIL-NEEDS-A-CODE-GROUNDED-SEAT** — NEW 2026-07-21 (D358), promoting P2's own
  rule to a STOP because it was proved again the day it was written. A 6-persona adversarial
  council reviewed Spec 37. **Five prose reviewers missed that FR-37-3's central instruction
  cited a filter with ZERO subscribers** (`sgs_header_rule_resolved` — two hits in the tree: the
  `apply_filters` and a comment claiming it matters). Only the seat whose entire job was
  verifying claims against live source caught it, and traced the REAL breakage one file over
  (`Sgs_Header_Behaviours` hooks `body_class`, resolves via `get_header_content()`, which reads
  the file the spec's own FR-37-6 empties). Built as written it would have shipped a header that
  renders and is then **silently not sticky**. The same seat caught FR-37-16 ordering a reversal
  of council-gated STOP-NO-KSORT. **A council without a source-grounded reviewer converges on
  rhetoric and rubber-stamps code-level claims** — including fiction the author just wrote.
- **STOP-RECHECK-BRANCH-BEFORE-COMMIT** — on a shared worktree with co-active sessions,
  put `git branch --show-current` in the SAME guarded command as the commit; a
  session-start check is stale the moment a co-active session runs `git checkout`. Use
  `test "$(git branch --show-current)" = main && git commit -- <paths>`. (Memory
  `recheck-branch-immediately-before-every-commit-on-shared-worktree`; a P3proj commit
  landed on the wrong branch exactly this way.)
- **STOP-PATH-SCOPED-COMMIT** — NEVER `git add -A` / `git add .`. Commit scoped by EXACT
  path (`git commit -- <paths>`). A merge (whole index) needs a `[batch-ok:<reason>]`
  token IN THE COMMAND (the guard scans the command, not the message file).
- **STOP-VERIFY-CONTENTS-NOT-FILENAME** — never trust a hook/doc/agent by its NAME, or
  that it is "wired": read the body AND prove its event-wiring fires + does the work
  (wired no-op `sys.exit(0)` stubs, docs named for a need, unparseable agents all hide
  behind the name). Before renaming, grep for EVERY real reference (the plan named 2
  global hooks; grep found 4). Bean hard NEVER rule (memory
  `verify-contents-not-filename-or-wiring`).
- **STOP-PROVE-CAUSE-BEFORE-FIX** — no fix for an UNPROVEN cause, and no 2nd fix
  overlapping a working one (unfalsifiable). `"not A"` != "therefore B". Fact-check your
  OWN diagnostic output (value <-> key) before theorising. (`~/.claude/rules/prove-the-cause-before-fix.md`.)
- **STOP-ONE-PHASE-PER-SESSION** — the setup-simplification plan runs ONE phase per
  session. Stop at the phase's DONE-WHEN; do NOT drift into the next phase.
- **STOP-GLOBAL-MINI-SIGN-OFF** — before ANY `~/.claude/` edit, show Bean the exact diffs
  + get approval. Global tooling serves EVERY project — every patch must be additive
  (new behaviour opt-in, old behaviour intact), never a replace.
- **STOP-D101-NEVER-DROP-A-DEFENCE** — when collapsing/rewriting docs, count STOP entries
  before and after — new >= old, or record the justification. (This whole file is the
  D101 defence.)
- **STOP-FACT-CHECK-COUNCIL/REGISTER-FINDINGS** — a council/register finding is a
  HYPOTHESIS; fact-check every one vs live code/DOM before acting ("main ships the broken
  drawer" = FALSE; "180 tests pass" = suite-conflation; D339's "87 of 95" was 78). Memory
  `fact-check-council-register-findings-before-acting`, `retract-the-content-not-just-the-label`.
- **STOP-MEASUREMENT-VS-EYE** — automated measurement reporting parity does NOT override
  Bean's eye; extend the measurement set (full background family + filter + mixBlendMode +
  pseudo-elements + parent chain) or pixel-sample until you find the missing variable or
  confirm at the pixel level. Extended 2026-07-15: a probe can match a STYLESHEET rule
  instead of an element, grab a lookalike (disclosure != toggle), flag a logo image for
  text contrast, or read an unsettled transition value; Grep can render `/*` as `\*`.
  Verify the probe before the conclusion. (`~/.claude/rules/measurement-vs-eye.md`.)

- **STOP-FIXING-ONE-INSTANCE-OF-A-FAILURE-CLASS-DOES-NOT-IMMUNISE-THE-NEXT** — NEW 2026-07-29
  (D411). The axe openness guard was built, negative-controlled and written up as a STOP entry —
  and then, **within the same session**, the reference-screenshot capture shipped with the
  IDENTICAL flaw: it clicked a trigger and photographed, never asserting a panel had opened. Result:
  a closed homepage recorded as a "captured reference", and a "6/7 captured" tally that was false.
  When you fix a vacuous-check, immediately grep the session's OTHER harnesses for the same shape
  ("does this check assert the state it claims to measure?") and fix them in the same pass. The
  class is the finding; the instance is not.
- **STOP-A-GATE-THAT-GLOBS-A-DIRECTORY-IS-BLIND-TO-EVERYTHING-OUTSIDE-IT** — NEW 2026-07-30 (D422).
  `check-motion-bundle-budget.py` globbed exactly two directories (`vendor-modules`,
  `shared/effects/gsap`). A new module landed at `shared/effects/smooth-scroll.js` — one level up —
  and **built, shipped and enqueued while the gate printed GATE PASSED, having never measured it**.
  A directory-scoped gate silently narrows every time the codebase grows a sibling. When you add a
  file a gate is supposed to cover, RUN the gate and confirm the new file appears BY NAME in its
  output; "the gate passed" is not evidence it looked. Sibling of
  `a-gate-that-cannot-fail-reads-green-forever`.
- **STOP-A-ZERO-FROM-AN-UNAUTHENTICATED-FETCH-PROVES-NOTHING** — NEW 2026-07-30 (D422). Checking
  that wp-admin ships no frontend bytes, the credential env failed to source (the password contains
  shell metacharacters), so three requests went out LOGGED OUT, were redirected to the login page,
  and dutifully reported "0 references" — a clean-looking PASS for a test that never ran. Any
  absence-check MUST carry a positive control asserting the fetched thing is what you think it is
  (auth cookie present AND the page contains an admin-only marker). A zero is only evidence when
  you have proved you were looking in the right place.
- **STOP-A-GREP-COUNT-IS-NOT-A-MEASUREMENT** — NEW 2026-07-30 (D422). `grep -c
  'wp:sgs/site-header-row'` returned 5 and was reported as "the header has 5 rows". Block markup
  emits an OPENING and a CLOSING comment per block (and one comment for a self-closing empty
  block), so 3 rows = 5 matches. The header is `templateLock: 'all'` at 3 rows — had 5 been true it
  would have meant the lock was BREACHED, a phantom bug someone could have chased. Bean caught it.
  Before quoting a count from a regex, state what a single unit looks like in the text and confirm
  the pattern matches it exactly once. Second instance in the same session (a "missing" settings
  blob was present; the pattern broke on the tag). Sibling of `confirm-what-your-output-describes`.
- **STOP-AN-OPTION-NAME-THAT-DOES-NOT-EXIST-IS-DISCARDED-IN-SILENCE** — NEW 2026-07-30 (D422). The
  smoother shipped `smoothTouch: false` to keep phone scrolling native. That option does not exist
  in Lenis 1.3.25 (zero occurrences in `lenis.mjs` AND `lenis.d.ts`); an unknown key on an options
  object is destructured past with no warning, no error, no console notice. The stated guarantee
  was being delivered ENTIRELY by the vendor's own default and would have flipped the day upstream
  changed it. When passing options to any third-party library, verify each key against the
  INSTALLED version's types/source — not memory, not the docs of another major version — and pass
  values you depend on EXPLICITLY rather than relying on a default that agrees today.
- **STOP-A-CONTRAST-CHECK-MUST-WALK-EVERY-TEXT-ELEMENT-IN-THE-SURFACE** — NEW 2026-07-29 (D411).
  A contrast check scoped to ONE selector reports the health of that selector, not the surface.
  The Task-5 sweep measured `.sgs-nav-menu__link-text` only and returned 13.14:1 for a drawer that
  was simultaneously rendering child-block text at **1:1** (`rgb(58,46,38)` on `rgb(58,46,38)` —
  invisible). Walk every element with its own text node, resolve the first painted ancestor
  background, and report the WORST ratio in the surface.
- **STOP-A-GREEN-MEASUREMENT-IS-NOT-FIDELITY-AND-MUST-NOT-BE-PRESENTED-AS-IT** — NEW 2026-07-29
  (D411). "21/21 cells PASS" covering axe / geometry / focus / reduced-motion / JS-off says nothing
  about whether a clone RESEMBLES its reference, yet it was written — and repeated into the LEDGER —
  in a way that read as fidelity. Bean rejected the result in seconds. When reporting a visual
  surface, state plainly which dimension each number covers and name what was NOT measured, before
  any pass tally.
- **STOP-A-REJECTION-RECORD-IS-A-HYPOTHESIS-TOO** — NEW 2026-07-29 (D411). The first write-up of
  Bean's rejection asserted `centred-statement` "renders 3 menu items where the extraction recorded
  7". False — the 7-item site is studionamma; fantasy.co genuinely has 3. Left standing it would
  have driven a rework that ADDED four items that should not exist. Fact-check a rejection/critique
  record against the source data before it becomes the rework brief, exactly as you would a council
  finding.
- **STOP-THE-AUTOMATIONS-OWN-CURSOR-CONTAMINATES-THE-MEASUREMENT** — NEW 2026-07-29 (D411). After a
  click the pointer STAYS there, so an opened full-screen panel routinely renders a link underneath
  it in `:hover`. axe then measured that link's hover colour and reported a *serious* 2.14:1 contrast
  violation that vanished the moment the pointer moved. Park the pointer (e.g. `mouse.move(2,2)`)
  after any open step, and measure hover states DELIBERATELY rather than by accident.

- **STOP-RENDER-INJECTORS-MUST-ANCHOR-PAST-THE-LEADING-SCOPED-STYLE** — NEW 2026-07-28
  (Spec 35 build-surface close-out). A `render_block` injector that assumes "the first tag in
  the markup is the block root" and writes its payload there will land it INSIDE the Spec-32
  leading scoped `<style>` block whenever one is present — and the p99 lift pass then STRIPS
  that whole `<style>` block on its way to `uploads/sgs-css/`, erasing the injection AND the
  evidence it ever ran (no error, no console warning — the feature is just quietly dead).
  Proven live across FOUR injectors this session (hover-effects, animation, parallax,
  image-controls) — each had to be fixed to anchor past the leading `<style>` before writing.
  The same bug had a second, subtler cost: chasing it down exposed that the earlier-claimed
  D346 "inline-zero win" was PARTLY VACUOUS — some of the inline CSS-variable writes it
  declared "moved to scoped rules" had in fact been silently deleted by this exact mechanism,
  so the feature they drove was inert, not merely relocated. Never trust "the injector ran" as
  evidence the payload survived to the page — verify the COMPUTED value on the live rendered
  element, not the presence of injector code. Sibling of STOP-MEASURE-THE-STATE-NOT-THE-FLAG
  and STOP-GREEN-BUILD-IS-NOT-EVIDENCE. Memory: the injector-vars-route-through-scoped-rules fix
  at `helpers-scoped-instance-vars.php` is the corrected pattern to copy for any NEW injector.

- **STOP-A-SHARED-WRAPPER-READING-A-GENERIC-ATTR-NAME-COLLIDES-WITH-BLOCK-VOCABULARY** — NEW
  2026-07-28 (Spec 35 build-surface close-out, post-grid squish). `SGS_Container_Wrapper` reads
  a GENERIC attribute name (`layout`) off whatever block calls it to decide whether to apply
  grid CSS. `sgs/post-grid` also owns an attribute literally named `layout` — but for its OWN
  vocabulary (a query/display-mode enum, nothing to do with CSS grid). The wrapper had no way to
  tell the two apart, read post-grid's `layout` value as a grid instruction, and double-gridded
  the block (its own grid CSS stacked with the wrapper's, producing the visible squish). This
  was found ONLY after ruling out the more visible defensive `auto-fit`/`minmax` layer as a red
  herring — the attr-name collision was the REAL cause underneath it. **Rule: before a shared
  wrapper/helper reads ANY attribute off a consuming block by a generic name, check whether that
  block already owns a key of the same name for its OWN purpose; strip/rename block-vocabulary
  keys before delegating to the wrapper, never let the wrapper guess from a bare name.** Sibling
  of STOP-A-GATE-BORROWING-ANOTHER-TOOLS-EXCLUSION-LIST-INHERITS-ITS-BLIND-SPOT (same shape: a
  shared mechanism silently inherits meaning from a namespace it doesn't own).

- **STOP-CHAINED-SHELL-COMMANDS-MASK-A-FAILED-STAGE** — NEW 2026-07-28 (near-miss at commit
  `07c67642`). An `&&`-chained build-then-push shell command reports overall exit 0 as long as
  the LAST stage in the chain succeeds — a failed intermediate build stage can be swallowed if a
  later stage (e.g. the git push) still runs and exits clean, or if the chain's final command
  masks an earlier non-zero code. This was caught as a near-miss, not a shipped defect: the build
  had actually failed but the push still proceeded, discovered only by re-checking the individual
  stage output rather than trusting the chain's aggregate exit code. **Rule: guard each stage's
  exit code EXPLICITLY** (`cmd1 && echo "stage1 OK" || exit 1`, or separate commands with an
  inline check between them) rather than relying on a long `&&` chain's overall result — this is
  especially load-bearing on a deploy/build/push sequence where a masked failure ships stale or
  broken code while looking green. Sibling of STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT (the
  git-side twin: a green local step is not proof of the remote state either).

- **`git add -A` IS NEVER A FALLBACK ON A SHARED WORKTREE — AND NEVER BEHIND `||`.** (2026-08-07,
  D520-adjacent.) I caught a co-active track's work in my index, did careful surgery to excise it,
  verified the staged diff was one line — then wrote
  `git apply --cached x.patch 2>/dev/null || git add -A <dirs>` while testing something unrelated.
  The apply failed silently, the fallback re-staged everything, and the excised work landed in my
  commit under my message. The point of index surgery is that index and worktree disagree ON
  PURPOSE; `git add -A` exists to end that disagreement. **Worse: it landed HALF a feature** —
  `render.php` read `$attributes['photoTablet']` while its `block.json` stayed uncommitted, and WP
  SILENTLY DISCARDS undeclared attributes, so the feature was dead on main with no error and no
  failing gate. Stage explicit paths; never put a staging command behind `||`; never pair
  `2>/dev/null` with a command whose failure changes what gets committed; re-run
  `git diff --cached --stat` immediately BEFORE `git commit`, not once at the point of surgery.
  Attribute-DECLARING and attribute-READING files must land together or the feature is silently inert.

- **A GATE KEYED ON THE DATE VERIFIES NOTHING ON A SHARED REPO.** (2026-08-07, D520.) The
  visual-diff gate accepted any `<block>-<TODAY>.md` with `verdict: PASS` — so six blocks passed on
  reports ANOTHER track wrote hours earlier for its own edits to those same blocks. Two tracks on
  `main` is this repo's normal state. Before trusting any gate, ask what it is keyed on: if the key
  is not derived from the CHANGE ITSELF, it will read green for the wrong reason. Fixed via
  `source_sha` over staged bytes (`visual-report-sha.py`).

- **A PRESET WRITTEN TO TWO LAYERS DUPLICATES; IT DOES NOT OVERRIDE.** (2026-08-07, D518.) WP keys
  presets by ORIGIN (`default`/`theme`/`custom`); the user layer sits ALONGSIDE the theme layer, so
  same slug = later wins, DIFFERENT slug = both survive. Equally: a per-client
  `theme-snapshot.json` is SCP'd over `theme.json` WHOLESALE, so a preset missing from a snapshot is
  DELETED for that client — it does NOT fall back to the framework file. Stripping a ladder from the
  wrong layer took the canary's whole spacing scale down to WP defaults. Verify which LAYER a value
  must live in before adding or removing it, and read the LIVE CSS to confirm.

---


### A12 - Session 8 (2026-08-11): the deploy lied, and so did my own instrument

- **STOP-A-GREEN-DEPLOY-VERIFY-DOES-NOT-MEAN-YOUR-CODE-IS-RUNNING** - NEW 2026-08-11 (D576).
  `build-deploy.py`'s verify checks HTTP 200 + markers present. A co-active session deploying
  from its own worktree shipped an OLDER `build/` over this track's, silently reverting every
  migrated `block.json` to `type:string`. WordPress then REJECTED every object attribute in
  `prepare_attributes_for_render()` and refilled from the old scalar default, so the value never
  reached render.php at all - and the deploy reported success. **Rule: after any deploy that
  matters, verify the DEPLOYED REGISTERED SCHEMA (`wp eval` on `WP_Block_Type_Registry`), not
  the HTTP status.** Two sessions of PHP debugging chased a bug no PHP fix could ever reach.

- **STOP-GIT-COMMIT-AMEND-IGNORES-THE-ORIGINAL-PATHSPEC** - NEW 2026-08-11. `git commit -- <paths>`
  is path-scoped; `git commit --amend` is NOT - it flushes the WHOLE index regardless of what the
  original commit was scoped to. Used to fix a stray character in a subject line, it swept 89
  deliberately-staged migration files into an unrelated commit. Caught in `git show --stat`, undone
  with `reset --soft` + re-commit by path. **Rule: amend ONLY when the index is empty; otherwise
  re-commit by explicit path.** Note `--pathspec-from-file` does NOT satisfy the co-active
  path-scoped-commit hook either - a verified whole-index commit needs an explicit
  `[batch-ok: <reason>]` token in the message.

- **STOP-A-UNIVERSAL-SELECTOR-RULE-IS-NEVER-A-PROPERTYS-TARGET** - NEW 2026-08-11 (D576). A
  measurement probe resolved which element a property styles by finding a rule that (a) mentions
  one of the element's own classes and (b) declares that property. The container wrapper emits
  `.sgs-container-<uid> > * { min-width:0; min-height:0 }` - the shrink-to-fit backstop - which
  satisfies both. The probe accepted it, resolved to a CHILD block, and reported `64px` for a
  property with NO rule of its own anywhere on the page. **Rule: reject any selector whose final
  compound is universal (`> *`, ` *`) - it is a blanket backstop, never the element an attribute
  styles.** Sibling of D573 (wrong property) and D574 (wrong element).

- **STOP-A-PROVENANCE-FIELD-IS-ONLY-A-DEFENCE-IF-SOMETHING-READS-IT** - NEW 2026-08-11. The same
  probe recorded WHICH element it measured in a `propTargets` field, correctly, the entire time -
  including the bogus `.sgs-container-<uid> > *`. The analysis read `propValues` alone and never
  looked at the field sitting next to it, so a wrong reading was reported to Bean twice as fact.
  **Rule: when a tool records provenance alongside a value, the consumer MUST assert on the
  provenance, not just the value** - otherwise it is decoration.

- **STOP-RECURSE-ON-LENGTH-NEVER-ON-TRUTHINESS** - NEW 2026-08-11. Chrome's `CSSStyleRule` has
  exposed an (empty) `cssRules` list since CSS Nesting shipped, so `if (rule.cssRules) { recurse;
  continue; }` treats EVERY ordinary style rule as a group and skips it. Measured: 64 stylesheets
  walked, **0 rules examined**, "this block emits no rule" reported for all 130 measurements - a
  total blackout that looked like a clean result. **Rule: recurse on `.cssRules.length`.**

- **STOP-A-CLASS-NAME-INCLUDES-CHECK-IS-A-SUBSTRING-TEST** - NEW 2026-08-11. Every BEM element
  class starts with its block class, so `.sgs-button__icon` contains `.sgs-button` and the icon's
  `width:15px` was returned as the button's own `customWidth`. **Rule: match class tokens at a
  boundary, never with a substring check.** Sibling of the recorded
  `a-substring-match-is-not-a-word-match` lesson, in CSS-selector form.

- **STOP-A-DELETED-SIBLING-READ-IS-ONLY-A-DEFECT-WITH-NO-OBJECT-PATH** - NEW 2026-08-11. A new
  detector flagged every read of a deleted flat tier attr (`gapTablet`, `contentWidthTablet`) as a
  live bug and failed its gate on three properties that render perfectly. Those reads are inert
  dead code - the same file also has a WORKING object-emission path. `minHeight` was the real bug
  precisely because it had NO such path. **Rule: the discriminator is "does a working object path
  exist in the same file", not "does a stale read exist". A gate that fires on non-defects gets
  switched off.**

- **STOP-AN-ASSUMPTION-IN-A-DETECTORS-DOCS-BECOMES-ONE-IT-ENFORCES** - NEW 2026-08-11 (D575).
  `migrate-tier-object.py`'s docstring asserted "the wrapper already reads an object value", so
  every block delegating to that wrapper was classified DELEGATED (= done) with nothing ever
  verifying the wrapper's own read. It reported **0 findings across all 41 properties** while 125
  broken declarations were live. **Rule: an assumption written into a tool's documentation is
  load-bearing - verify it or delete it.** Its file scope was the other half: it scanned only
  `src/blocks/*/render.php`, never shared includes, putting the highest-blast-radius consumer
  outside the census by construction.

- **STOP-A-CORRECT-ROOT-CAUSE-DOES-NOT-VALIDATE-THE-WHOLE-REPORT** - NEW 2026-08-11. A
  `/systematic-debugging` agent found the real root cause AND asserted, in the same report, that
  the measurement harness "just echoes the input rather than reading computed style" - which would
  have invalidated every measurement of the session. Disproved in one command (the field is a live
  `getComputedStyle()` call, and it returned `0px` where the input was `64px`). Its supporting
  evidence had a mundane explanation. **Rule: fact-check each claim independently; being right
  about the cause earns no credit for the surrounding assertions.**

- **STOP-MAKE-THE-AGENT-PRE-REGISTER-ITS-PREDICTION** - NEW 2026-08-11 (positive pattern, keep).
  Two debugging agents were FORBIDDEN from deploying (parallel deploys to a shared canary is a
  recorded incident) and required instead to state the exact expected measurement per block per
  viewport BEFORE the single verification deploy. Both predictions were confirmed exactly.
  **Rule: when an agent cannot run the verifying action itself, require a pre-registered
  prediction - it is far harder to fudge than a post-hoc explanation, and it converts a plausible
  story into proof.**


### A13 - Session 2026-08-15: three false alarms, all from my own measurement

**STOP-A13a — A subagent's INFRASTRUCTURE claim needs the same verification as its findings.**
An agent reported "the shared `sgs-framework.db` is missing the `property_suffixes` table entirely;
the DB is mid-migration under another agent's hands." **False** — 36 tables, 156 rows, both gates
running clean. It hit a transient read during another session's write. Acting on that report meant
restoring a snapshot over a parallel session's live work. We verify subagents' *findings* by habit;
this one was about the environment and slipped straight through.

**STOP-A13b — Changing measurement TOOL or COMMAND SHAPE mid-comparison manufactures a false
regression.** Three in one session, every one self-caught only because the number was re-measured
the same way as the baseline:
1. `ls -1 | wc -l` reported `node_modules` at 970 against a PowerShell `-Force` baseline of 973 —
   bash excludes dotfiles (`.bin`, `.cache`, `.package-lock.json`). Read as deletion damage.
2. `cd X && … && node gate ; echo $?` reported a gate failing with exit 1. The `cd` failed, the
   `&&` chain short-circuited, **the gate never ran**, and `$?` captured the cd's exit.
3. A scope control read "the `Width` suffix was deleted too" — the parser used `row.get('suffix')`
   on rows that are **arrays**, so every lookup returned nothing and every suffix read as absent.
**Rule:** re-measure with the *identical* command that produced the baseline before reporting any
delta. A tool swap is a different instrument.

**STOP-A13c — A column reset is only safe if the derivation can RE-DERIVE every legitimate value.**
Extending a reseed's `NULL`-reset to `css_element` looked safe (ownership was checked — no other
writer). It still destroyed correct routing data, because the *derivation itself* could not
re-derive one block's value. The danger is not a competing writer; it is the derivation's
incompleteness. Result would have been `post-grid`'s image hover-zoom silently dropping on every
clone. Caught only by a converter test that existed for exactly that defect.

**STOP-A13d — A reseed re-seeds the SHARED DB to YOUR working tree.** Running `/sgs-update` on a
branch makes every other session on `main` see mismatches for commits they do not have — it cost a
parallel session 7 spurious errors until the branch merged. Snapshot first, name the rollback, and
merge promptly or expect to explain it.

**STOP-A13e — Do not chase a number you cannot reseed to, and never reseed to make your own figures
look better.** Two agents were explicitly told the DB would keep old values until the next reseed
and to prove correctness at unit level instead. Both complied and stated their gap plainly. The
prior round, running the reseed to "confirm" numbers is what surfaced three regressions late.

**STOP-A13f — Windows worktree removal: check for junctions BEFORE removing, and expect long-path
failure.** `git worktree remove` fails with "Filename too long" on deep `node_modules` but
**deregisters the worktree anyway**, leaving orphaned files. Use `cmd /c rmdir /s /q` with the
long-path prefix. Verify `node_modules` counts either side — a prior incident emptied the main
checkout's (962 → 0) because a junction pointed into it.

**STOP-A13g — "Not an ancestor of main" is NOT "not merged".** Four worktree branches read as
unmerged by SHA; all four were verified content-identical to `main` (rebased/cherry-picked). One
showed a 406-line diff that was **main being ahead**, not stranded work. Compare content and
behaviour per commit before deleting or re-merging a branch.

### A14 - Session 2026-08-18: five instruments were wrong, two of them mine, shipped the same day

The inspector-enforcement session. Four detectors shipped; along the way FIVE separate measuring
instruments proved wrong, two of them detectors I had written, verified and committed hours earlier.
The through-line: every figure produced by RUNNING something was exactly right; every figure produced
by READING or REASONING was wrong, by 2-3x, in both directions.

- **STOP-NO-DETECTOR-SHIPS-WITH-A-HAND-COUNTED-BASELINE** - declare the expected finding count BEFORE
  the first live run, run it, then RECONCILE the gap. Reconciliation is where the value is: rule 26
  predicted 4, measured 8, and reconciling surfaced two real detector bugs a label-grep structurally
  could not find. Counts corrected by measurement this session: double-painted labels 12 -> 5; raw
  `BoxControl` 12 -> 0; `BooleanResponsiveControl` mounts 9 -> 7; D4 population ~150/~55 -> 138/50;
  "178 orphan elements" -> no formula reproduces it, struck. A number in prose is a copy that rots.
- **STOP-A-JSX-TAG-PATTERN-NEEDS-A-WORD-BOUNDARY-NOT-A-TRAILING-CLASS** - `<BoxControl[\s/>]`
  returned **1 hit against a true 16**, and `<ToolsPanel[\s
]` returned **0 against 33**, because
  multi-line JSX puts `<Component` at END-OF-LINE with no following character on that line. A false
  ABSENCE reads exactly like a clean result. Use ``, or an AST.
- **STOP-A-DETECTOR-MUST-OPEN-THE-DATA-IT-CLAIMS-TO-CLASSIFY-BY** - rule 30 flagged 4 false positives
  because it classified on "is there a `ResponsiveOverride` ancestor?" and never opened `block.json`
  - despite its OWN DOCBLOCK stating classification must be by storage shape. Doc described the right
  principle; code did not implement it. Acting on those 4 would have replaced correct controls with
  ones that silently drop the client's value.
- **STOP-CTX-CACHE-JSON-RETURNS-A-WRAPPER-NOT-THE-PARSED-OBJECT** - `ctx.cache.json()` returns
  `{ok, error, data}`. Reading `.attributes` straight off it yields `undefined`, which made every
  attribute look non-tiered and SILENTLY DISABLED the rule while it still exited 0.
- **STOP-NEVER-COMPARE-AST-LINE-NUMBERS-AGAINST-STRIPPEDTEXT-LINE-NUMBERS** - `strippedText()` blanks
  a multi-line comment's ENTIRE CHARACTER RANGE INCLUDING ITS NEWLINES, collapsing them and shifting
  every subsequent line number. That produced ZERO findings on `sgs/hero` - the one block the rule
  existed to catch. Character OFFSETS stay aligned between raw and stripped text; line numbers do not.
  Sibling of D661's comment-stripper incident.
- **STOP-A-SILENTLY-DISABLED-DETECTOR-RETURNS-ZERO-WHICH-LOOKS-LIKE-A-CLEAN-TREE** - neither of the
  two bugs above crashed, threw, or failed a lint. Each made a rule return zero findings, which is
  indistinguishable from success. In BOTH cases the only signal was the rule's own `mustFlag` fixture
  reporting that it no longer flagged. When a finding count drops, suspect the detector before
  believing the tree got cleaner.
- **STOP-A-CLOSED-ACCORDION-IS-PROGRESSIVE-DISCLOSURE** - `check-simple-surface-cap.js` had ZERO
  occurrences of `initialOpen` and counted controls inside a `<PanelBody initialOpen={false}>` as
  default-visible, over-reporting `sgs/site-footer` by 3 rows. Its header's claim that a bare control
  in a PanelBody "is unconditionally shown" holds only for an OPEN panel. It also counted a
  `<Notice>` - a conditional contrast WARNING - as a control. The cap was never wrong; the counter was.
- **STOP-A-COMMAND-SCANNING-HOOK-CAN-MATCH-YOUR-COMMIT-MESSAGE-PROSE** - the baseline-update gate
  blocked a commit because the MESSAGE described a flag (`--update-baseline`) the command never ran.
  A bypass token existed; using it would have been dishonest. Reword the prose instead.

### A15 - Session 2026-08-19: sources of truth that nothing reads, and a detector that measured its own blind spot

Every figure below was measured by running a command on 2026-08-19; none rounded or softened.
The through-line: a file, a spec section, or a query can look authoritative while nothing actually
reads the part being relied on — and a detector can undercount silently the same way a false
ABSENCE reads as a clean result.

- **STOP-A-DATA-FILE-SECTION-WITH-ZERO-READERS-IS-NOT-A-SOURCE-OF-TRUTH** - `cluster-member-sets.json`
  carries a five-state vocabulary (hover/focus/selected/pressed/disabled) with CSS realisations, and
  it reads as authoritative. All four consumers of that file - `check-element-manifest-conformance.js`,
  `check-cluster-coverage.py`, `placement-reach.py`, `extract-signatures.py` - read only its `clusters`
  and `order` keys. The `states` block has ZERO readers. A golden-schema draft cited it as "the single
  source" and had to be corrected. Before deferring to a data file, grep for who reads the SPECIFIC KEY
  you are relying on, not the file. Sibling of `a-column-with-no-writer-and-no-reader-still-looks-like-data`.
- **STOP-AN-ARGUMENT-BUILT-ON-UNREAD-DATA-IS-AN-ARGUMENT-BUILT-ON-NOTHING** - advice against renaming
  the `selected` state rested on it colliding with `pressed`. `pressed` has zero DB rows and exists
  only in that unread block. The real constraint turned out to be different and smaller (a 9-step
  derived-column migration). Check that the thing you are citing as a constraint actually EXISTS in
  the enforced layer before treating it as one.
- **STOP-A-SPEC-CAN-CONTRADICT-ITSELF-IN-THE-SAME-DOCUMENT** - Spec 35 Part O §6 names
  `StateToggleControl` as the canonical state component and calls it "verified adoptable today" with a
  live `nav-menu` mount. Spec 35 line 736 of the SAME file says it is dead code with 0 imports and 0
  JSX mounts. The tree agrees with :736 - 0 JSX mounts across `src/blocks`; the only references are two
  comments recording where it USED to live. Reading one section is not reading the spec; grep the
  component name across the whole document before quoting a canonical-component claim.
- **STOP-A-DETECTOR-THAT-CANNOT-RESOLVE-AN-INDIRECT-VALUE-UNDERCOUNTS-SILENTLY** - rule 31's first live
  run returned 173 and 164, below an independent regex prediction. Instrumenting rows-processed (206)
  against a fresh per-block count (239) localised the entire 33-row gap to three blocks -
  `product-card`, `nav-menu`, `social-icons` - each scoring ZERO rows despite having colour panels,
  because all three build the `rows` prop indirectly (`.push()`, a separately-declared `const` array,
  a spread-of-conditional) rather than as an inline array literal. A false ABSENCE reads exactly like
  a clean result. When a measured count comes in BELOW an independent prediction, instrument the
  population the detector actually processed before accepting the number.
- **STOP-A-GREP-OVER-A-DIRECTORY-IS-NOT-A-CENSUS-OF-ONE-FILENAME** - `grep -rln "<SgsColourPanel"
  src/blocks/` returned 61 and was reported as "61 blocks mount it". Restricting to `edit.js` returns
  60; the extra hit was a different file in a block directory. Scope the census to the exact filename
  that defines the population.
- **STOP-A-CHECKER-THAT-COMPARES-HEAD-TO-STAGED-PROVES-NOTHING-WHEN-NOTHING-IS-STAGED** -
  `check-blockjson-metadata-only.py hero` was run manually to understand why the visual gate blocked,
  and exited 0. That exit proved nothing: the checker compares HEAD against the STAGED version, and
  nothing was staged. A verification method that cannot see the thing it is checking will report
  success.
- **STOP-A-SCRIPT-CAN-IGNORE-HELP-AND-EXECUTE** - `extract-signatures.py --help` was run expecting
  usage text. It ignored the flag, ran the full extraction, and rewrote `css-property-classifications.json`.
  Check whether a script parses argv before probing it with a flag, or run it somewhere it cannot write.
- **STOP-A-DERIVED-ARTEFACT-CAN-BE-NON-DETERMINISTIC** - two consecutive runs of `extract-signatures.py`
  on an unchanged tree produce different output: `css_tier` values cycle between `desktop`/`mobile`/
  `tablet` on a small number of attributes, 2-4 lines churning per run. That file is described as the
  "reseed-durable channel". Blast radius is low (`css_tier` is ~1% populated with no dedicated
  consumer) but every regeneration produces a spurious diff, so never commit a wholesale regeneration
  as part of an unrelated change - extract only the lines your change actually caused.
- **STOP-A-COMMAND-SCANNING-HOOK-MATCHES-YOUR-SCRIPT-CONTENT-TOO** - the path-scoped-commit gate
  blocked a Bash call because the shell-script content being written contained a literal
  `git commit …` example inside help text. This is the same class as A14's commit-message-prose entry,
  one layer out: the scanner sees the whole command string including heredoc payloads. Reword the
  embedded prose; do not reach for the bypass token.

### A16 - Session 2026-08-19 (header completeness): a gate can go blind because the world changed under it

Every figure below was measured by running a command on 2026-08-19. The through-line: three separate
defences reported CLEAN while being wrong, and each was wrong for a DIFFERENT structural reason -
the world moved under the gate, the environment lacked what the gate reads, or the label on the
measurement was wrong rather than the measurement.

- **STOP-A-GATE-KEYED-ON-A-DECLARATION-GOES-BLIND-WHEN-DECLARED-BUT-OFF-BECOMES-CONFORMANT** -
  `check-dead-pattern-attrs.py` exists precisely to catch attributes WordPress silently discards. It
  missed SEVEN in one commit. Turning `supports.color`'s sub-flags false stops WP REGISTERING
  `backgroundColor`, and seven theme header patterns stored their background under that name - all
  would have rendered with no background, no error anywhere. The gate keeps that attr in an
  always-allowed list and asks whether `supports.color` is DECLARED, never whether its sub-flags are
  ON. Safe while declaring the key implied the UI; unsafe the moment `golden-controls.json` named
  "declared with every sub-flag false" as the CONFORMANT shape. **When a migration changes what a
  DECLARATION MEANS, grep every gate keyed on that declaration's presence before shipping it.**
- **STOP-THE-STYLE-ENGINE-EMITS-AN-UNRESOLVED-SLUG-AS-INVALID-CSS-IT-DOES-NOT-DROP-IT** - measured
  live: `wp_style_engine_get_styles(['color'=>['background'=>'primary']])` returns
  `background-color:primary;` verbatim. `DesignTokenPicker` stores a SLUG when `linked: true`, so two
  row blocks emitted invalid CSS the browser discarded - a client picking a palette swatch got
  NOTHING, silently. A raw hex works, which is why hand-testing with a hex would have "proved" the
  path fine. **Any DesignTokenPicker value must pass through `sgs_colour_value()` before the style
  engine; its ABSENCE beside a style-engine call is the defect.**
- **STOP-A-SHARED-DB-RESEED-FROM-ONE-WORKTREE-BREAKS-EVERY-OTHER-TREES-DB-GATE** - the canonical DB
  is shared and lives outside every tree. Running `/sgs-update` from a worktree taught it 7 new
  attributes while the classifier file DECLARING them existed only in that worktree, so the other
  session's tree reported 6 NEW rogue-seed violations. Diagnosed by running the gate from both trees
  and comparing, not by assuming. **It resolves when the branches converge - but check WHICH TREE a
  failing gate is evaluating before treating its finding as real.**
- **STOP-A-FRESH-WORKTREE-FAILS-EVERY-GATE-THAT-READS-A-GITIGNORED-FILE** - `handoff-preflight`
  flagged a dangling link to `02-SGS-BLOCKS-REFERENCE.md`. The obvious fix - repoint or delete the
  link - would have edited a CORRECT doc: the README row itself says the file is gitignored and
  generated by `/sgs-update`, and it exists in the primary tree at 269 KB. A worktree lacks EVERY
  gitignored file by construction. **`git check-ignore -v <path>` answers this in one command; run
  it before "fixing" any doc to satisfy a gate.**
- **STOP-IDENTIFY-A-PROBE-BY-ITS-CONTENT-NEVER-BY-DOCUMENT-ORDER** - three verification probes were
  mapped to their content-addressed uids by DOM order. Reading "probe 1" showed one rule where six
  were expected, and the sentence reporting the feature as broken was half-written. The MAPPING was
  wrong; all three probes were correct. A content-addressed id carries no ordering information at
  all. The same slip recurred later picking a row uid with `sed -n '2p'`. **When a verification looks
  surprising, re-check the IDENTIFICATION before concluding the code is broken.**
- **STOP-A-SYNTAX-CHECK-CANNOT-CATCH-A-STRAY-JSX-NAMESPACED-ATTRIBUTE** - a stray `onChange: undefined`
  line inside a JSX element PARSED CLEAN, because JSX reads `name: value` as a namespaced attribute.
  It is valid syntax and completely inert. Only the full webpack build would have caught it.
  **Parse-clean is not correct; for JSX edits the build is the check, not the parser.**
- **STOP-A-STATIC-GATES-GREEN-DOES-NOT-MEAN-THE-CASCADE-RESOLVED-CORRECTLY** — NEW 2026-09-04
  (D948 Phase 3, session 8 colour track). `whatsapp-cta`'s `labelColour`/`labelColourGradient`
  wiring passed every static check available — `php -l`, `survey.js`'s verdict transition,
  `check-dead-controls`, `check-element-manifest-conformance` — because all four ask "is this
  code shape correct", never "does the browser actually render what this code produces". The
  gradient CSS was emitted onto the wrapper `<a>` instead of the child `<span>` that held the
  visible text; `color` inherits from parent to child in CSS, but `background-image`/
  `background-clip` do not, so the label rendered genuinely invisible on the live canary
  despite a fully green build. Only a live probe (`check-colour-gradient-roundtrip.js`,
  modelled on `check-border-roundtrip.js`'s positive/negative-control discipline) caught it —
  by reading `getComputedStyle()` on the real rendered element, not by inspecting source.
  **Any change whose correctness depends on CSS inheritance, cascade, or a browser-computed
  value (not just "does this code parse/typecheck") needs a live computed-style probe before
  being called done — a green build proves the code shape, never the painted result.**

## B. Domain STOPs — carried VERBATIM from next-session-prompt.md (2026-07-16, D338–D342)

- **STOP-SCROLLBAR-LOCK (D340)** — locking body scroll (`position:fixed`/`overflow:hidden`)
  makes the CLASSIC scrollbar vanish MID-ANIMATION → viewport widens ~15px → any
  edge-anchored fixed/absolute element's anchor JUMPS = a "bounce past the end position".
  Overlay-scrollbar emulation CANNOT reproduce it — test on a desktop browser. Fix idiom:
  pin the root scrollbar track while locked (`documentElement overflowY='scroll'`, gated on
  `innerWidth − clientWidth > 0`). Instances: adaptive-nav FIXED; sgs/modal PARKED.
- **STOP-67-GATE-ANOMALY (D339d)** — the pre-commit visual-diff gate printed "COMMIT
  BLOCKED" yet the commit was created (19:09, `4e049ba9`). `SGS_EXIT=1` + `exit $SGS_EXIT`
  should have blocked. UNEXPLAINED — investigate before trusting it as the only net; write
  reports BEFORE committing, don't rely on the gate to remind you.
- **STOP-TRUNCATED-SURVEY (D651, 2026-08-17)** — ⛔ **NEVER pipe a population-defining survey
  through `head -N`.** A `head` on the command that DEFINES a sweep's scope is not a display
  convenience, it is a silent data-loss step. Measured: `grep -rn "templateMode" …/block.json
  …/edit.js | head -20` cut a **23**-block population to 20. The sweep then ran its full course
  against the short list — 4 agent batches, 19 commits, green build, all gates clean, successful
  deploy, live verification — and was written up as COMPLETE while 3 blocks (`testimonial-slider`,
  `trust-bar`, `trustpilot-reviews`) still carried the defect. **`head` truncates at exactly the
  band where the short answer still looks like a plausible complete one.** Count first
  (`| wc -l`), page second. **And the deeper rule: a COMPLETENESS error is invisible to every
  CORRECTNESS gate** — the ~50-gate prebuild chain, the 83/83 deploy checksum verify, and live
  `getComputedStyle` checks all answer "is what I changed right?", never "did I change everything
  I should have?". Nothing in the defence stack can catch this class. It was found only by
  re-deriving the roster from `git grep` while fact-checking the close-out doc, AFTER deploy.
  **Re-query the population at close-out; never close a sweep against the list you opened it
  with.** (Same session, same shape, twice more: D646 said "19 blocks" where the commit log shows
  20 — and contradicted its own "4 batches of ~5"; a `grep -c … | paste -sd+ | bc` check reported
  0 existing `allowedBlocks` for a block that has one at `edit.js:133`, nearly causing a wrong
  wire-vs-remove call. Read the file; don't trust the count.) Memory:
  `feedback_a_completeness_error_is_invisible_to_every_correctness_gate`.
- **STOP-EMPTY-INSPECTOR-CONTAINER (D639, 2026-08-16)** — an inspector container rendered
  with NO children is a client-visible dead control: an empty `<ToolsPanelItem>` still
  appears in its ToolsPanel's "+" menu and in `resetAll`, then shows nothing when opened.
  **The ~50-gate `prebuild` stack had zero coverage for this** — `check-dead-controls.js`
  checks the INVERSE (an attribute whose control nothing renders), and a container whose
  children were deleted still has valid wiring, so it reads clean. One shipped through a
  full green build to prove it (moving `<BackgroundPanel>` out of `sgs/site-header` deleted
  the mount and left the wrapper). Gate: `scripts/check-empty-inspector-containers.js`,
  wired into `prebuild`. **Whenever you MOVE a control between panels/tabs, check what its
  wrapper was — deleting a mount is not the same as deleting the control.**
- **STOP-PARSE-DONT-REGEX-JSX (D639, 2026-08-16)** — "does this JSX element have children?"
  cannot be answered by a regex, and getting it wrong is not a near-miss. Two attempts on
  the SAME question: `<(Tag)[^>]*?>\s*</\1>` returned **0** (the char class cannot cross the
  `=>` in an arrow-function prop, and every real container has one) and `>\s*\n\s*</(Tag)>`
  returned **471** (it matches the closing `>` of the last self-closing CHILD). A false
  absence and a false flood from one question; the truth was **1**. JSX children are a tree —
  use `@babel/parser`. Extends `feedback_a_greps_blind_spot_is_the_shape_of_the_grep`.
- **STOP-VERIFY-THE-FIX-NOT-JUST-THE-SYMPTOM (D639, 2026-08-16)** — the first removal of the
  empty container above cut a line short and left an **unterminated JSX comment** — a worse
  break than the bug — and the detector still reported clean, because a parse failure is not
  a finding. After any surgical text edit: re-parse the file, and assert the removed slice
  was self-contained BEFORE writing, not after.
- **STOP-GATE-COMMENT-STRIPPER (D339d)** — `check-dead-controls.js` strips comments
  naively: a PHP STRING containing a block-comment opener swallows the rest of the file and
  every attr below reads as dead (false positives) — and the same swallow would hide REAL
  findings (false negatives). Keep `/*`-like sequences out of PHP string literals in
  render.php, or fix the stripper.
- **STOP-HARDCODE-IS-OVERRIDE-NOT-LITERAL (D339, Bean-locked)** — a hardcode = a value
  that OVERRIDES a legitimate channel: (1) inline/`!important`, (2) a valid GLOBAL default
  (theme.json), (3) a meaningful UA default (`align-items`, `flex-wrap` — a draft that
  leaves them unset MEANS the UA value; a block default that fills them in diverges the
  clone). An overridable default fighting no channel is a DEFAULT — ship it. Test: "what
  else could set this, and does my value beat it?" (Memory `hardcode-is-override-not-literal`.)
- **STOP-CONTAINER-TIER-IS-NOT-VIEWPORT (D340)** — §S9 rows emit container-query tiers
  alongside media tiers (FR-S9-6). A row can collapse to mobile while the VIEWPORT is
  tablet-width (footer inner = 705px at 768 viewport = mobile tier, BY DESIGN). Measure the
  container before calling a tier boundary an off-by-one.
- **STOP-SILENT-ATTR-DISCARD (D338)** — WP discards undeclared attrs silently. Gate:
  `check-dead-pattern-attrs.py`. Never blanket-rename `textColor` (correct on core blocks).
- **STOP-WP-STYLE-SUBSTRING-COLLISION (D343)** — a CSS custom-property NAME emitted inline
  must NOT contain the substrings `border-width` / `border-color` / `border-top-color` etc.
  WP core ships `html :where([style*="border-width"]){border-style:solid}` (and siblings) —
  an attribute-SUBSTRING selector that matches ANY element whose `style` contains that text,
  including your `--sgs-tile-border-width` var, and paints a phantom `3px currentColor`
  border. British `--*-colour` dodges the `border-color` rule; `width` is spelled the same,
  so name width vars `--*-thickness`. Found it via a stylesheet-disable bisect (or use
  `extract-css-diff.js --why`). (D343 brand-strip 3px black frame.)
- **STOP-VERIFY-EVERY-CLIENT (D338)** — a colour/contrast fix verified on ONE client is NOT
  verified. All 8 `sites/*/theme-snapshot.json` palettes. (D339 drawer: 8/8 measured.)
- **STOP-TOKEN-NAME-IS-NOT-A-LUMINANCE (D338)** — `primary-dark` is a PINK on
  mamas-munches. Resolve slug→hex, COMPUTE the fg (`helpers-colour-wcag.php`).
- **STOP-D328-SHAPE-NOT-JUST-VALUE (D338)** — specify the SHAPE (object vs flat; support vs
  attr) or WP coerces to default. Now structurally frozen (Spec 37 Guardrail). (Memory
  `object-typed-attr-coerces-flat-to-default`, `blockjson-enum-coerces-invalid-to-default`.)
- **STOP-GATE-BLIND-TO-DELETION (D338)** — delete attr + hardcode value ⇒ build stays
  green. Nothing catches render-without-control.
- **STOP-DIALOG-DISPLAY-GATE (D338)** — never put `display` on a `<dialog>` base rule; any
  author `display` beats the UA's `dialog:not([open]){display:none}`.
- **STOP-COUNCIL/REGISTER-FINDINGS-ARE-HYPOTHESES (D333)** — see STOP-FACT-CHECK above.
- **STOP-GATES-GREEN-IS-NOT-VERIFIED (D337)** — a green gate is necessary, not sufficient;
  verify the LIVE rendered output.
- **STOP-67** — write visual-diff reports BEFORE commit (repo-root `reports/visual-diff/`), not after.
- **STOP-21** — emit-green != LANDED; verify the live page carries the change.
- **STOP-16** — a subagent's "verified clean" is a HYPOTHESIS; re-verify anything
  load-bearing on the live page.
- **STOP-19** — roll back fast on regression; refine across a session boundary with the
  empirical baseline in the plan, don't iterate a failing sensitive fix inline.
- **STOP-44** — a role-seed that maps to a dead render path is a render no-op — don't seed it.
- **STOP-57** — (superseded pre-production) block version bumps / deprecations — see
  no-version-bumps rule below.
- **STOP-64** — a wrapper-class residual can't override an ID-scoped block rule; route the
  class-scoped rule so the residual wins.
- **STOP-66** — `/sgs-update` stage discipline: `--stage 1` seeds, **`--stage 9`** prunes orphans. ⚠ Was `--stage 10` until 2026-08-10 (D555): the retired Stage 3 slot was deleted and stages 4-14 renumbered down one, so `prune_orphans` moved 10 → 9 and `--stage 10` is now `container_mirror_report`. Verify against the stage map in `sgs-update-v2.py:1-63` rather than trusting this line.
- **STOP-68** — no inline grid across live SGS elements (grid/flex moved inline→scoped, D296).

### Recovered numeric STOPs (2026-07-31, D427)

These were defined in the three status docs collapsed into this catalogue on 2026-07-17
(`a55d0fc1`); only 9 numerics were carried across, so the rest were cited-but-undefined for
two weeks. Harvested back from `memory/` + `plans/archive/`; full provenance per entry in
`reports/2026-07-31-stop-catalogue-recovery.md`. **Citations in the wild are bare numerics**
(`STOP-39`), so the bare token is the defined identifier here — the descriptive name follows
it as prose, never as the token (see STOP-67 vs STOP-67-GATE-ANOMALY for why that matters).

- **STOP-2** — one orchestrator for all shared file writes — when using `/subagent-driven-development` with multiple implementer subagents, one main-session orchestrator owns ALL writes to shared files; subagents implement their OWN assigned files only and RETURN data rather than touching the shared tree directly.
- **STOP-3** — ledger input is draft derived — a conservation/accounting ledger's input must be derived from the DRAFT (source of truth), never from the converter's own output/DB-derived shorthand decomposition — sourcing a ledger from the same system it's meant to check makes the check circular.
- **STOP-4** — written not landed — an attribute the converter WRITES/emits is a progress signal only, never proof of fidelity; only a live computed-style read on the rendered page (LANDED) that matches the draft counts as done. Catches wrong-layer transfer that an emit-only check misses.
- **STOP-6** — a gate must be wired to something that runs — a gate that exists, is baselined, and is tested but is never invoked by any real trigger (pre-commit hook, CI, pipeline stage) protects nothing; prove every gate's failure path AND its run-trigger before claiming it's enforced.
- **STOP-9** — variant grids are db defined — a composite block's variant grid/structure is defined in the `variant_slots` DB table (queried via frozen `detect_variant`), never hardcoded as an `if slug==...` branch in converter code.
- **STOP-10** — empty section false win — an empty cloned section is usually a soft-fail, not a pass; a render-oracle match must require BOTH the guard (e.g. `el.innerText.length > 0` and element present) AND the value comparison — a guard failure is always a FAIL, never counted as a match. Same phenomenon as the already-catalogued memory `empty-section-false-pixel-diff-win`.
- **STOP-11** — schema enumeration not usage enumeration — "missing X" claims (e.g. "~15 properties have no DB destination") must be measured against the LIVE DB schema at run time, never a stale doc's cached list — a doc's enumeration is a usage/example snapshot, not the schema's ground truth.
- **STOP-14** — baseline gates against current legacy output — a new gate must be baseline-armed against the system's CURRENT (legacy) output before it can meaningfully flag regressions — arming a gate against an idealised or future output makes every existing case a false positive.
- **STOP-15** — a council or rater finding is a hypothesis — a multi-rater council or subagent finding is a hypothesis, not a fact; fact-check every load-bearing claim against ground truth (file:line, live DOM, DB) before acting on it, even when raters agree.
- **STOP-17** — key by full identity not a tier blind join — a resolver/gap-baseline lookup must key on the FULL identity tuple (e.g. `(block, layer, property)` or `(block, attr/slot, fixture)`), never a narrower join (e.g. `(css_property, writer_path)` alone, or by source line) — a narrow key collides across tiers/fixtures and produces false matches or false gate-fires.
- **STOP-18** — disposition every item as done by port or close or defer with blocker — when auditing a checklist of legacy items being ported/rebuilt (e.g. the G1-G5 disposition), every item must be explicitly classified as DONE-BY-PORT / CLOSE-IN-<phase> / DEFER-with-a-named-blocker — no silent "not mentioned" gaps. *(reconstructed from citation glosses, not a verbatim original)*
- **STOP-22** — port working logic do not recreate it — when moving working converter logic into a new module/engine, re-house the existing, already-proven logic faithfully; do not rebuild it from scratch against the new structure (a recreation drops edge cases the working version already handles). *(reconstructed from citation glosses, not a verbatim original)*
- **STOP-23** — qc council on built code not design — run pre-commit `/qc-council` on the code as actually BUILT (verifying e.g. input-class≠output-class, that render.php actually reads the attr that was written), not merely on the design/plan — a design-time review does not catch build-time drift.
- **STOP-24** — co active shared prebuild may be red — (a) on a shared worktree, the prebuild gate may read RED because of a co-active parallel track's unrelated in-flight change (e.g. a DB↔block.json reseed mismatch) — build via `npx wp-scripts build --experimental-modules --webpack-copy-php` directly rather than the shared prebuild, and never "fix" the other track's red state yourself; (b) any new DB-vocabulary addition (e.g. `slots.aliases`) must be wired into the canonical `/sgs-update` reseed path, not just a one-off seeder script, or it will not survive the next reseed. *(reconstructed from citation glosses, not a verbatim original)*
- **STOP-25** — one ledger never a parallel tracker — a new tracking need (e.g. content-conservation) extends the ONE existing ledger mechanism; never spin up a second parallel tracker/ledger for the same concern.
- **STOP-27** — new guards raise not assert — every new invariant guard re-homed from a deleted case-fork (or written fresh) in the converter must `raise` on violation, never `assert` (asserts are stripped under `-O` / silently skipped, and are the wrong signal for a data-integrity violation the pipeline must fail loudly on).
- **STOP-28** — new engine stays opt in until its completion gates close — the modular/new converter engine (`SGS_NEW_ENGINE` flag) must remain opt-in with the frozen `convert.py` as the production default until every completion-programme gate (media-map A1, content-ledger A2, etc.) is proven closed; do not flip the prod default early. *(reconstructed from citation glosses, not a verbatim original)*
- **STOP-29** — "never 'out of scope' on a spec'd surface; map every deferral to a named spec stage." Matches `.claude/decisions.md:2415` and `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md:38`. --- ## UNRESOLVED — not reached in the timebox (zero fabrication) The following phantom numbers were in-scope but not reached with real defining prose before the 30-minute timebox closed: **STOP-8, STOP-13, STOP-26 (own definition — only "extends STOP-26" glosses were found, pointing at a scope/ carve-out discipline, but the actual STOP-26 text itself was not located), STOP-37, STOP-38, STOP-45, STOP-51, STOP-54, STOP-58, STOP-61, STOP-62, STOP-63, STOP-65, STOP-69 (context seen only as "the STOP-69 `*/`-in-JS-comment trap" — a real gloss exists but wasn't independently confirmed/expanded before time ran out)**. Recommended next step: re-run targeted `grep -rn "STOP-N\b" .claude/ -C3` for each of the above individually (no batching) — several (STOP-26, STOP-69) clearly have real definitions sitting one hop away (their citing sentences were visible but got cut off by the batched grep's line-omission truncation in this pass). *(reconstructed from citation glosses, not a verbatim original)*
- **STOP-30** — reverify every load bearing claim at file line and db — when fact-checking a prior session's "confident-but-unverified" claims (e.g. "covers N routes"), re-verify EVERY load-bearing claim yourself at file:line + DB — do not accept a prior summary's numbers, even if plausible-sounding.
- **STOP-31** — widen and plant test a narrowed gate — when widening a gate's scanned-file scope (e.g. `no_slug_literal.py` `_SCAN_FILES`) to cover new modules, the widening itself must be plant-tested (plant a violation, confirm the gate now fires) — not just assumed to work because the file list grew.
- **STOP-34** — reproduce on the real node not a synthetic one — root-cause a converter bug against the REAL draft/page node, not a synthetic/handwritten test fixture — a synthetic test can mask the actual failure path (e.g. a synthetic multi-button test used a named-root-class path that a real full-homepage run didn't).
- **STOP-35** — default is container deviation — the new engine's recognition step must default an unrecognised (slug-None) section to `sgs/container` + recurse (FR-31-4), never fail loud — failing loud on the default case blocks the majority of real homepage sections from converting at all.
- **STOP-39** — solo coding subagent only — dispatch mechanical build work to ONE coding subagent at a time, foreground, named files, "do the work yourself, spawn no agents"; NEVER 2+ concurrent writers on shared files; read-only reviewers/tracers/research agents may still run in parallel. Coding subagents "cascade-fail" on this pipeline when used in the banned 2+-writer shape — build INLINE instead.
  - ⭐ **SCOPE RULED BY BEAN 2026-08-22: STOP-39 binds ONE WRITER PER FILE, not one agent at a
    time.** Parallel coding subagents are PERMITTED when their file sets are DISJOINT. The ban is
    on two writers touching the same file, which is what "cascade-fail" describes and what the
    originating incident actually was — `STOP-CATALOGUE.md:2439` restates it as *"one writer per
    file … violated by the ORCHESTRATOR rather than by parallel subagents."*
  - ⚠ **Why this clarification exists, recorded so it is not re-litigated:** the entry's headline
    ("ONE coding subagent at a time") and its closing sentence ("build INLINE instead") read as a
    blanket ban on parallelism, while its middle clause says "on shared files". A council rater
    flagged the contradiction on 2026-08-22 against a plan dispatching 4 agents on disjoint block
    sets, and it had to be escalated because the entry could not settle its own scope. **The
    defence is NOT weakened:** 2+ writers on one file remains banned, and the orchestrator is
    explicitly one of the writers it counts.
  - ⛔ **The load-bearing companion is S-7 / STOP-PATH-SCOPED-COMMIT.** Disjoint agents are safe
    only if the INTEGRATION COMMIT is exact-path-scoped. `87d904a6` proved the real failure mode is
    the coordinator sweeping a co-active track's work with a GLOB pathspec — parallelism was never
    the defect there.
- **STOP-40** — verify against the drafts actual layout not a glance — don't declare a converted section "fixed" just because it now renders as *a* grid with the right item count; check it against the DRAFT's ACTUAL desktop layout (e.g. a 2×2 grid is not "fixed" if the draft wants 4-in-a-row) — a superficial visual glance can pass a wrong layout.
- **STOP-41** — no slug literal gate covers shared extractors too — the `no_slug_literal` gate (R-31-1 DB-first enforcement) must also cover per-slot/per-role literal carve-outs moved into shared/un-gated helper files (e.g. `field_extractors`), not just the originally-scanned files — a carve-out relocated to an ungated file silently escapes the gate. *(reconstructed from citation glosses, not a verbatim original)*
- **STOP-42** — computed css diff keyed by content not class — clone-fidelity measurement must compare getComputedStyle values on the LIVE clone vs the SOURCE draft, matched by normalised TEXT CONTENT (not BEM class or source-declaration diff) — this is CLAUDE.md root-cause rule 4a's project-level name.
- **STOP-43** — *alias of `STOP-PROVE-CAUSE-BEFORE-FIX`* (same defence, no independent definition ever existed). "prove the premise/diagnosis on the REAL rendered node before proposing or shipping a fix" — see verbatim gloss "Prove the premise on the real node (S.
- **STOP-48** — no separate defining prose found beyond the paired citation "STOP-48/49 over-count" (`specs/20-CLONE-FIDELITY-MEASUREMENT.md:134`). *(reconstructed from citation glosses, not a verbatim original)*
- **STOP-49** — computed parity over counts — the computed-parity aggregate percentage over-counts false mismatches (font-family stacks, clone-only props not present in the draft, etc.) and legitimately reads BELOW true visible fidelity; never quote it alone as the fidelity number — always pair with Bean's eye / a human-dispositioned ledger.
- **STOP-52** — d2 doctrine no silent css drop — an unroutable CSS declaration (e.g. `::before`/`::after` pseudo-element rules) must route to a client-editable residual channel (`sgsCustomCss`) or be recorded in `excluded_properties` — never silently dropped. Named "Bean STOP-52 D2 doctrine" at the close of the D279 diagnosis-first fix wave. *(reconstructed from citation glosses, not a verbatim original)*
- **STOP-60** — render side relocation needs no conformance golden move — when a change only relocates WHERE already-generated CSS is emitted (render-side collector/relocation) without touching the converter/walker/pipeline or changing what CSS is generated, no conformance golden fixture needs to move and no block version bump is required.
- **STOP-NODE-NPM-VIA-POWERSHELL** — the nvm shim is broken in Git Bash; run Node/npm via PowerShell.
- **STOP-WINDOWS-BASH-STALE** — Bash ls/find/git-add can have a STALE view of a Write-tool
  file; verify + commit via PowerShell (memory `windows-bash-stale-view-of-write-tool-files`).
- **STOP-CACHE-URL-NEVER-CHANGES (D338)** — filemtime `?ver` on branches, NOT on `main`;
  Cloudflare holds 7 days incl. 0-byte files. Clear caches (incl. Hostinger CDN) before measuring.
- **STOP-TEST-DONT-GUESS (D337)** · **STOP-REUSE-THE-WORKING-BLOCK (D337)** ·
  **STOP-READ-THE-ENV-CONFIG (D337)** — palestine-lives = DEV, sandybrown = STAGING/canary.
- **STOP-REPLICATE-EXACTLY (D337)** · **STOP-CORE-BLOCK-WITH-SGS-REPLACEMENT (D337)** — DB
  `blocks.replaces` (column `slug`) is authoritative.
- **STOP-INNERBLOCKS-ARE-NOT-ALWAYS-THE-MENU (D337)** · **STOP-DEPLOY-CANARY-FIRST (D337)**.
- **STOP-HIDDEN-PARALLEL-SYSTEM (D330)** — before building on a "dormant" mechanism, grep
  the whole codebase (plugin+theme) for a SECOND system doing the same job; a default-off
  system is one admin click from active. Prove dormant by its live trigger, not assumption.
  (Memory `grep-for-hidden-parallel-system-before-building`.)
- **STOP-PARALLEL-TRACK-SWEEP (D326)** — pre-existing dirt (`phase4-*.txt`, root `.db`,
  `rr.json`, `iapi.html`) is NOT yours; package-lock CRLF churn = restore, never commit.
- **STOP-NO-ALLOWLIST (D335)** — route by DB-owned `role`, never a hardcoded
  `css_property in (a,b,c)` allowlist (memory `route-by-role-not-hardcoded-property-list`).
- **STOP-ONE-SOURCE-BUSINESS-INFO (D335)** — all business info optional, one source (Site
  Info), never hardcoded.
- **STOP-VERIFY-COLOUR (D318)** — verify colour on the LIVE rendered node (an early
  merge-from-partial stripped 136 baseline keys; `presets.py` dropped alpha → opaque black).
- **STOP-NO-KSORT (D327)** — write-time uid stability via a canonicalisation oracle, not ksort.
- **STOP-SHARED-CHECKOUT-HAZARD** — a shared checkout shares `git HEAD`; a co-active
  branch switch silently reverts your working-tree edits. Take your own `git worktree`;
  verify `git show <sha>:<path>`, never the working tree, before believing a file committed.

- **STOP-DIALOG-CLOSE-KILLS-THE-EXIT-ANIMATION** — NEW 2026-07-20. `dialog.close()` removes
  `[open]`, which makes a `<dialog>` `display:none` **in the same tick** — so an exit class
  added immediately before `close()` never paints a single frame and its keyframes are
  unreachable. (This shipped: the drawer's exit animation had never once run, for either the
  original vertical keyframes or the new directional ones — Bean spotted it as "it just
  goes".) Animate FIRST, `close()` on `animationend` (target-checked — `animationend` bubbles
  from children), with a fail-safe timeout reading the REAL computed `animationDuration`; a
  stuck-open dialog is far worse than a missing animation. Also: **native ESC on a modal
  `<dialog>` bypasses your close handler entirely** — intercept `cancel` or ESC will behave
  differently from every other close route.

- **STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT** — NEW 2026-07-22 (Track-1, earned Fronts
  1/2). On a shared checkout with a co-active session, the hash a `git commit` REPORTS can be
  the OTHER session's racing commit. Verify via `git log -1` (your message at HEAD) + `git
  status` (files clean), NEVER the reported hash. (Recovered a nearly-lost Front 2 whose
  "reported" hash was Track 2's ledger commit.) Extends STOP-SHARED-CHECKOUT-HAZARD.
- **STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC** — NEW 2026-07-22 (Track-1). The SGS pre-commit
  visual-diff gate blocks any touch of a block's render.php/block.json/edit.js without a passing
  visual-diff report; its OWN message sanctions `--no-verify` for non-visual (logic/attr/meta)
  changes — use that, never fabricate a PASS report.
  ⛑ **CORRECTED 2026-08-15 — the gate's message no longer sanctions `--no-verify` at all** (that
  line discarded gitleaks/cheat-gate/F5/F6/Gate A/wp-* pre-merge along with the one check it was
  aimed at). Two real answers now: (1) if the change is genuinely non-visual, check whether it
  matches one of the five deterministic auto-skip detectors (`check-blockjson-metadata-only.py`,
  `check-markup-neutral.py`, `check-editor-only.py`, `check-interaction-only-css.py`,
  `check-token-rename-neutral.py`) — if it does, it's already exempt with no action needed; (2) if
  it's a real visual change but a before/after capture isn't possible right now, write a report
  with `intent_capture_passed: true` (single live capture vs a stated assertion — see
  `.githooks/README.md`) or use `SGS_VISUAL_GATE_SKIP`/`SGS_VISUAL_GATE_REASON` (scoped, logged
  bypass — same doc). Never fabricate a PASS report either way.
- **STOP-RESIDUE-DECLARED-IRREDUCIBLE-USUALLY-ISNT** — NEW 2026-07-22 (Track-1). A subagent
  (or you) declaring a leftover "irreducible / can't be lowered further" is a hypothesis — re-derive
  it from the tool/DB before banking it; the residue usually has a real cause.
- **STOP-VERIFY-THE-DELIVERABLE-EXISTS** — NEW 2026-07-22 (Track-1). Before accepting a
  "done" claim, confirm the named deliverable (file/function/attr/row) actually EXISTS — open it,
  don't trust the name or the wiring claim.
- **STOP-PRE-EXISTING-CLAIM-CHECK-SESSION-START** — NEW 2026-07-22 (Track-1). When a subagent
  says a finding is "pre-existing" (not caused by this session), verify against the session-start
  baseline — a Front-2 subagent claimed 5 variant findings pre-existing and was wrong (this
  session's data caused them).
- **STOP-TEMPLATELOCK-ALL-REAPPLIES-THE-TEMPLATE** — NEW 2026-07-27 (Track-2b, D393). A block
  passing BOTH a `template` and `templateLock: 'all'`/`'contentOnly'` re-applies that template on
  EVERY mount, not only when empty — WP core: `shouldApplyTemplate = currentInnerBlocks.length
  === 0 || templateLock === 'all' || templateLock === 'contentOnly'`. `synchronizeBlocksWithTemplate`
  then matches by **array position + block name only**; any identifying attribute (`rowSlot`…) is
  ignored. This silently overwrote 15/16 header/footer starter patterns and DESTROYED content.
  Pass the template only when the container is genuinely empty; the lock is unaffected
  (`if (!template) return blocks;`). Never assume a template merely seeds an empty block.
- **STOP-A-MATCHING-MD5-PROVES-CONSISTENCY-NOT-CORRECTNESS** — NEW 2026-07-27 (Track-2b, D394).
  A local↔server checksum match only proves the two files agree — it does NOT prove the file is
  the one you built. PowerShell `Copy-Item -Recurse` into an EXISTING directory NESTS it
  (`build\build`) instead of replacing, so a deploy shipped the stale tree while md5 "verified"
  clean at every step (both sides were the old file). This nearly got mis-read as "the fix
  didn't work / wrong root cause". Verify deployed CONTENT — `grep` for the changed line, check
  the line count — not just that two hashes agree. Extends STOP-VERIFY-DEPLOY-BY-CHECKSUM.
- **STOP-CHECK-BOTH-HOOK-LAYERS-BEFORE-COMMIT** — NEW 2026-07-22 (Track-1). A commit can be
  gated by more than one hook layer (path-scope gate + secret-scan + visual-diff); check ALL of
  them before assuming a bare `git commit` will land, and read each gate's own bypass guidance.

- **STOP-A-SCOPED-AXE-RUN-ON-A-CLOSED-SURFACE-PASSES-VACUOUSLY (2026-07-28)** — `axe.run('.selector')`
  scoped to a drawer/modal/panel returns **"0 violations" whether or not the surface is OPEN**,
  because axe's `excludeHidden` defaults true and simply skips hidden content. Proven by negative
  control: `nav-qa/axe-run.mjs --scope .sgs-nav-drawer` WITHOUT `--open` reported exactly the same
  "0 violations" as the opened run. **Any past "axe = 0 on the drawer/panel" claim made with that
  harness proves nothing.** Every axe run on a disclosure/dialog surface must first ASSERT the
  surface is open (element `open`/`aria-expanded=true`, height > 0, focusable-count > 0) and report
  **VACUOUS**, never PASS, when the guard fails. Generalises STOP-NEGATIVE-CONTROL to the
  measurement tool itself: the question is not only "would this pass with the feature absent?" but
  "is the tool even LOOKING at the thing?" Sibling of STOP-VERIFY-DEPLOY-BY-CHECKSUM.

- **STOP-A-CSS-RULE-THAT-CANNOT-WORK-STILL-LOOKS-CORRECT-IN-SOURCE (2026-07-28)** — a CSS rule can
  be perfectly written and structurally incapable of ever working, and reading it will never tell
  you. Two in one session: (1) `left:50%;transform:translateX(-50%)` centring on a mega panel could
  NEVER centre, because every `.sgs-nav-menu__item` is `position:relative` (needed for the indicator
  pill), so the wrap's containing block was always the ~100px menu ITEM — the panel shrink-to-fit to
  101px and the edge-pin fallback then glued it to the item's own edge. (2) An item divider written
  `:not(:last-child)` painted a TRAILING edge, because the bar also contains the absolutely-positioned
  indicator, so the last ITEM is not the last CHILD (`item + item` is the immune form). **Both were
  found by MEASURING the rendered box, never by reading the selector.** Rule: for any positioning or
  nth-child rule, measure the computed result on the live page — and specifically identify which
  ancestor is the containing block rather than assuming it is the one you intended.

- **STOP-A-SHAPE-MISMATCH-SILENTLY-DROPS-THE-WHOLE-VALUE (2026-07-28, D401)** — extends STOP-D328
  from "WP coerces to the default" to "the CONSUMER drops it entirely". `sgs/mega-panel`'s
  `panelPadding` defaulted to the SCALAR `{desktop:'28px'}` while render.php emits it through
  `sgs_emit_responsive_css(..., 'box' => true)`, which reads `{top,right,bottom,left}` — so the
  padding was silently discarded and the panel rendered flush at `padding:0`, headings touching its
  own border. No error, no failing gate, and the sibling block (`sgs/mega-aside`) had the CORRECT box
  shape all along, which is precisely why IT had padding and the panel did not. **When two sibling
  blocks differ visibly in the same property, diff their attribute SHAPES before diffing their CSS.**

- **STOP-A-UNIVERSAL-EXTENSION-ATTACHES-TO-BLOCKS-IT-MAKES-NO-SENSE-ON (2026-07-28, D401)** — the
  four universal extensions (`hover-effects`, `parallax`, `custom-spacing`, `animation`) attach to
  EVERY `sgs/*` block unconditionally; the opt-out (`supports.sgs.hideExtensions`) exists and is
  already used by `sgs/brand-strip`, but a block that never declares it inherits every panel. Result:
  `sgs/nav-menu` offered a client Block Link (wrap the whole nav in one `<a>`), Element parallax on a
  sticky bar, Click Effects, and a Hover Effects panel duplicating its own per-element hover controls
  — **13 inspector panels on a navigation menu.** Worse, the Spacing panel was **silently DEAD**: its
  fields write `sgsMarginTop/…`, which `custom-spacing.js` never registered when a block declared
  native spacing, so every value a client set was discarded on save. *(`custom-spacing.js` itself was
  since deleted, `d54e41db` 2026-08-03, "purge a dead spacing panel" — the panel this entry describes
  no longer exists; the bug was fixed by removal, not by fixing registration. The general lesson below
  still applies to any future extension panel.)* **Rule: a new block must
  declare `hideExtensions` deliberately — inheriting all four is a decision, not a default. And an
  extension panel rendering is NOT evidence its attributes are registered.**

- **STOP-A-SCHEMA-AUDIT-READING-ONLY-BLOCKJSON-CANNOT-SEE-EXTENSION-ATTRS (2026-07-28)** — the
  oldshape-audit deploy gate flagged 2 NEW HIGH "undeclared-attr → WP deletes it on save" findings
  (`sgsBlockLink`/`sgsBlockLinkLabel` on page 1849's card-grid) and ABORTED a deploy. Both were
  FALSE POSITIVES: those attrs are registered by the universal block-link extension via the
  `blocks.registerBlockType` JS filter, so they exist in the editor schema and are NOT discarded on
  save — but the audit reads only block.json, which is structurally blind to filter-registered
  attributes. The gate firing was still evidence about the DATA (STOP-A-GATE-FIRING-IS-EVIDENCE):
  the finding was explained against the extension source (`extensions/hover-effects.js`) BEFORE
  baselining, and the baseline entry carries the register reference (precedent: the baselined
  `sgs/icon-list sgsHoverScalePreset`, same class). **Rule: before treating an "undeclared attr"
  audit finding as stranded content, grep the extensions for a filter that registers it — and any
  schema audit that reads only block.json must either model extension-registered attrs or document
  the blind spot in its own output.** Structural fix parked (`P-OLDSHAPE-AUDIT-EXTENSION-ATTRS`).

- **STOP-A-GREEN-BUILD-IS-NOT-EVIDENCE-AN-EFFECT-FIRES (2026-07-27)** — THREE separate
  "built but inert" bugs shipped past `php -l`, `eslint` AND every prebuild gate in one
  session: (1) a `MutationObserver` watching a `hidden` attribute the panel NEVER carries,
  so the stagger animation could never run; (2) an indicator using `scaleX()` on a 1px box
  with `border-radius`, stretching the corners ~120x into a smeared lozenge; (3) two new
  theme patterns added with NO theme version bump, so WP served its CACHED pattern list and
  both new block variants were uninsertable. Every one was syntactically perfect and did
  nothing. **Rule: for any effect/animation/registration, name the OBSERVABLE SIGNAL and
  verify it on a live page. "The code exists" and "the gates are green" are worth zero
  here.** All three were caught only by tracing each side of the contract to the file that
  emits it — never by reading one file.
- **STOP-NEW-PATTERN-FILES-NEED-A-THEME-VERSION-BUMP (2026-07-27)** — WordPress caches the
  pattern-file list against the theme's `style.css` `Version:` header. Adding a
  `theme/sgs-theme/patterns/*.php` WITHOUT bumping it means the pattern never appears in the
  editor on any cached install — the feature ships, deploys, and is unreachable. Precedent:
  theme 1.5.44 was bumped for the 3 earlier mega patterns; 1.5.46->1.5.47 for the 2 new
  ones. **Verify by querying the live `wp/v2/block-patterns/patterns` REST endpoint after
  deploy — do not assume registration.**
- **STOP-BLOCK-JSON-ASSET-TARGET-MUST-EXIST-IN-BUILD (2026-07-27)** — a `block.json`
  `file:` reference pointing at a file the build never produced makes WP silently enqueue
  NOTHING: no error, no warning, no failing gate. `sgs/table-of-contents` rendered COMPLETELY
  UNSTYLED because `index.js` never imported `style.css`, so `style-index.css` was never
  compiled. 5th instance of the D382 class (4 swept July, this one missed).
  **NOW STRUCTURALLY ENFORCED** by `scripts/check-block-asset-targets.js` wired into
  `postbuild` (NOT prebuild — prebuild runs `clean:build`, which deletes `build/`, so the
  gate could only ever false-fail there). Negative-control verified: it genuinely fails on a
  corrupted reference and recovers on restore.
- **STOP-VERIFY-A-DOC-IS-LYING-BEFORE-YOU-FIX-IT (2026-07-27)** — I identified 3 project
  docs as carrying false claims and queued corrections. Verifying each against primary
  source BEFORE editing proved 2 right and **1 WRONG — my own claim**. Spec 36 FR-36-5 makes
  a product-REPLACEMENT claim about Kadence Pro and confines its ACCESSIBILITY claims to Max
  Mega Menu (which research supports); it never claimed what I accused it of. **I would have
  edited a CORRECT document into being wrong.** Rule: a doc you believe is lying is a
  HYPOTHESIS, exactly like a subagent's finding or a council's fix-shape. Verify against the
  primary source (the commit, the code, the DB) before editing. Applies with full force to
  your OWN diagnostic claims — this is the `prove-the-cause-before-fix` rule turned inward.
- **STOP-A-GREPS-BLIND-SPOT-IS-THE-SHAPE-OF-THE-GREP (2026-07-30, D425)** — a sweep's
  "zero remaining" is bounded by the pattern it used. Searching the literal `style="--`
  cannot see `sprintf( ' style="…%s"' )` or `' style="' . implode(…) . '"'`. That single
  blind spot defeated THREE independent checks in one session — the audit's inventory, my own
  "ZERO — all sites fixed" verification, AND the earlier sweep's "team-member is the last
  render-level inline writer" claim — while the deployed page served the violation. Widening
  to attribute ASSEMBLY immediately found 2 more sites. **A negative search result is a
  statement about the SEARCH, not the codebase.** Report the pattern alongside the result;
  before claiming none remain, name the shapes the pattern structurally cannot match. Also:
  when a prior claim says "the last one", check the SCOPE of the sweep that produced it.
- **STOP-A-COMMENT-THAT-JUSTIFIES-A-BREACH-IS-A-DATED-OPINION (2026-07-30, D425)** — an
  in-code comment explaining why a rule does not apply *here* was written under the contract
  of its day, and is the most effective thing at stopping re-investigation. The SAME
  pre-D345 comment ("only the custom-property VALUE rides inline — permitted") shielded FOUR
  separate FR-32 breaches in one sweep (`cta-section:333`, `countdown-timer`,
  `class-post-grid-rest.php:323`, `class-sgs-container-wrapper.php:1800,1828`). A sibling
  failure: post-grid's comment asserted AJAX cards land "outside the block's scoped `<style>`"
  — they land INSIDE the block root, so a descendant rule reaches them; a confidently-worded
  mechanism claim in a comment can simply be wrong. **When you amend a contract, grep for
  comments citing the OLD reasoning. When you fix such a site, DELETE the stale comment** —
  leaving it re-arms the trap for the next sweep.
- **STOP-CONFIRM-BUILD-IDENTITY-AT-THE-MOMENT-OF-CAPTURE (2026-07-30, D425)** — on a shared
  deploy target, "I deployed it" and "it is deployed now" are DIFFERENT CLAIMS. A co-active
  track redeployed from committed `main` 17 minutes after a verified build, reverting it and
  resurrecting the inline emits; a later independent check correctly reported the fix as not
  landed. **Both observations were correct about different moments.** Proven by mtimes, not
  inferred — `.bak` stamped 20:58 UTC (my deploy) vs the live dir 21:15 UTC — which only
  reads correctly after normalising server UTC against local UTC+1. Rule: capture
  `md5sum` of the deployed artefact AND the local build **in the same step as the
  measurement**, and record both in the evidence. Prefer COMMITTING over holding fixes
  uncommitted on a shared target — once committed, the other track's next build carries them
  and the race ends.

### Standing architectural STOPs (always-on, not D-numbered)
- **Composite-mirror (R-31-9 / D294)** — no per-block CSS hack that diverges from the
  shared wrapper's computed behaviour; content-KIND box+width composites go block-private,
  section/layout composites keep `SGS_Container_Wrapper`.
- **No inline `style=""`** on SGS blocks (Spec 32) — native supports serialise via
  `__experimentalSkipSerialization` → scoped `#uid` CSS.
- **No block version bumps / deprecations pre-production (D270/D293 — overrides STOP-57)** —
  old-shape posts are re-cloned, not deprecation-migrated. The theme `style.css` Version IS
  required and is NOT a block version. (Memory `no-version-bumps-or-deprecations-preproduction`.)
- **Fix a11y/fidelity at the DRAFT source, not the clone** (memory
  `fix-a11y-at-draft-source-not-the-clone`) — draft-inherited issue → edit the mockup +
  re-clone; genuine clone divergence → fix the converter (R-31-9).
- **Verify converter fixes on the REAL draft + the LIVE code path** (memory
  `verify-converter-fix-on-live-path-not-synthetic`) — synthetic unit-green != real-draft-correct.
- **The git INDEX is shared too, not just the worktree (D461, 2026-08-02)** — a co-active track had
  **20 files staged** mid-session; a bare `git commit` would have taken all of them. ALWAYS
  `git commit -- <exact paths>` (a partial commit ignores the index for unlisted files), and never
  `--amend` on a shared index. `git diff --quiet -- <file>` compares working-tree to the **INDEX**, so
  it reports "clean" on a file the other track has already staged — use `git diff HEAD -- <file>`.
  (Memory `a-shared-git-index-can-hold-another-tracks-staged-files`.)
- **`grep -c` exits 1 on zero matches (D461)** — chaining a verification `grep -c` to a real action
  with `&&` silently skips the action; a `git commit --amend` never ran and the stale read was then
  reported as a git fault. Use `;`, or `n=$(grep -c X f || true)`. Mirror image of the already-caught
  `sed` trap (sed exits 0 on zero matches). (Memory
  `a-verification-grep-exits-nonzero-and-kills-your-chain`.)
- **A correct fix can still never run (D461)** — the css_layer fix edited Task A while the reseed
  invokes only `extract-signatures.py --task-b-only`; the committed artefact it feeds had to be
  regenerated by `--task-a-only` separately. Verify a fix EMITS, not that the emitting code exists.
- **Fact-check your OWN brief before a panel decides on it (D461, 2nd occurrence)** — an adjudicator
  correctly reported "13 unexplained rows" from a figure I supplied: a file mtime quoted where the
  committed content was 6 days older. The council was not wrong; the brief was.

---

### E16. Earned 2026-08-18 — S1 of the spec-verification programme (D656-D660)

- **STOP-A-SUBAGENT-MUST-NEVER-MUTATE-A-REPO-FILE-AS-A-TEST-FIXTURE.** An agent dispatched with an
  explicit "do not modify `button/render.php`" instruction **restored the defective line** in that
  file, in order to test its detector against the known-bad state, and mentioned it only in passing
  ("defect restored"). A deploy ran in that window and shipped the defective version. The existing
  entries cover an agent clobbering work via CLEANUP; this one reverted **deliberately, as a correct
  part of doing its job**. Detection: its `git status` showed the file CLEAN when it should have shown
  modified. **Rule: every dispatch prompt must forbid mutating ANY repo file as a fixture and require
  a temp directory instead — and the orchestrator must diff its own working set after any dispatch.**
  Sibling of STOP-A-SUBAGENTS-CLEANUP-DESTROYS-CONCURRENT-AGENTS-WORK and
  STOP-A-PEERS-ACCOUNT-OF-YOUR-OWN-WORKTREE-IS-A-HYPOTHESIS.

- **STOP-A-VERDICT-FUNCTION-NEEDS-THE-SAME-CAN-THIS-FAIL-PROOF-AS-A-GATE.** Verifying Spec 32
  §12.5(b) ("No snapshot is missing a slot"), the check ran the RIGHT command and returned `DONE`
  while merely pasting the output — it never asserted the output was empty. The claim was FALSE: 7 of
  8 clients were missing framework slugs, including `text` (303 references) missing from 5. A verdict
  that could not fail, inside the tooling built to stop exactly that, reporting a clean bill of health
  on a real defect. **Rule: a function that ASSIGNS a verdict is a gate and needs a negative control —
  prove it returns NOT-DONE on a known-bad input before trusting any pass it issues.** Extends
  STOP-A-GATE-THAT-CANNOT-FAIL-READS-GREEN-FOREVER from detectors to the judgement layer above them.

- **STOP-GIT-GREP-C-WITH-AN-EXPLICIT-PATH-PRINTS-PATH-COLON-COUNT.** `git grep -c <pat> -- <file>`
  prints `path:count`, NOT a bare integer. An `out.strip().isdigit()` test on that output failed for
  every row and defaulted to NOT-DONE, **manufacturing 9 false NOT-DONE verdicts in one pass** against
  claims that were all true. **Rule: parse the trailing integer (`:(\d+)$`), and when a batch of
  verdicts all fail the same way, suspect the parser before the codebase.**

- **STOP-A-REGEX-WORD-BOUNDARY-MATCHES-INSIDE-A-HYPHENATED-SIBLING.** `--wp--preset--color--contrast`
  matches the `contrast` inside `contrast-2`, because `-` IS a word boundary. A migration rewrote
  `contrast-2` to `text-2` — a slug that does not exist — silently creating the very defect it was
  written to remove. Caught only by re-running the verification sweep afterwards. **Rule: for
  slug/identifier substitution use `(?![-\w])`, never ``, and always re-run the detector after a
  migration rather than trusting the diff.**

- **STOP-PYTHON-SHELL-TRUE-ON-WINDOWS-IS-CMD-EXE-NOT-BASH.** `subprocess.run(cmd, shell=True)` uses
  cmd.exe on Windows, where single-quoted git pathspecs, globs and alternation behave differently.
  `git grep -l X -- 'sites/*/f.json'` returned 0 AND its `-L` complement ALSO returned 0 — two
  logically opposite results, both zero, which is only possible if the pathspec matched nothing. The
  real answers were 2 and 6. Reading those zeros as refutations would have written a false "this
  requirement is unmet" into a governing spec. **Rule: invoke `[bash, '-lc', cmd]` explicitly, and
  ship a positive control that proves which shell you are in before trusting any result.**


## C. Pre-flight self-attestation ritual (answer inline before first Write/Edit)

Carried from next-session-prompt.md. General form for any cloning-pipeline session:

1. Read the governing spec (Spec 31, the named section) IN FULL + the recent decisions +
   this session's LEDGER before starting?
2. Did the prior in-session work actually LAND? (Read the LEDGER's live status — the step
   list shifts.)
3. Am I about to assert a cause I have NOT tested? (STOP-PROVE-CAUSE-BEFORE-FIX.)
4. Verifying colour/contrast on ALL 8 client palettes, not one? (STOP-VERIFY-EVERY-CLIENT.)
5. Passing the declared SHAPE (object vs flat; support vs attr)? Shape freeze respected
   (new sibling attr, never a reshape)? (STOP-D328.)
6. Does an SGS block/helper already do this? Did I grep? Did a parallel track already do it?
   (STOP-HIDDEN-PARALLEL-SYSTEM.)
7. Am I building ahead of reconciling with what already shipped? (rework trap.)
8. Canary before dev-site? Full cache clear incl. Hostinger CDN before measuring? Desktop
   browser (classic scrollbars) for any animation/geometry check? (STOP-SCROLLBAR-LOCK.)
9. D-ceiling (`grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
   — **anchor on the heading**) + branch (`git branch --show-current`) verified in the SAME
   command as the commit?
   ⚠ Bounding the digits does NOT fix this and was already tried: `D[0-9]{1,4}` still returns
   **D5557**, because the hex colour `#0D5557` on `decisions.md:412` has exactly 4 digits after
   the `D` and satisfies the bound. True ceiling on 2026-08-01 was D453. Only anchoring on the
   `^## D` heading excludes prose. Fixed in three places 2026-08-01 (D455) — this ritual,
   `.claude/CLAUDE.md`, `LEDGER.md`; the first two-place fix MISSED this one, which is the
   "fixing one instance does not immunise the class" pattern.
10. Am I touching another track's files/branches without checking their state first?
11. Is my VERIFICATION METHOD itself capable of seeing the thing I'm checking — literal grep
    vs var()-driven values, static contrast maths vs composited opacity/filter, `head`-truncated
    listings, a syntax-checker mistaken for a scope-checker, a forced lint rule the project's own
    config can override, a BARE STRING search that will match a substring of a longer identifier,
    a case-sensitive search claiming absence of prose that exists in a different casing, a DOM
    query scoped to the wrong document (top-level vs an editor `<iframe>`), or a bare selector
    matching the FIRST instance in document order instead of your test block (e.g. a site
    header's chrome sharing a class with the content block under test)? (STOP-A-LITERAL-GREP-CANNOT-SEE-A-CSS-VARIABLE-DRIVEN-VALUE,
    STOP-STATIC-CONTRAST-MATHS-CANNOT-SEE-COMPOSITED-DIMMING,
    STOP-HEAD-N-ON-A-VERIFICATION-LISTING-HIDES-THE-ROWS-THAT-MATTER,
    STOP-NODE-CHECK-VALIDATES-SYNTAX-NOT-SCOPE,
    STOP-A-FORCED-LINT-RULE-CAN-BE-OVERRIDDEN-BY-PROJECT-CONFIG,
    STOP-A-SUBSTRING-MATCH-IS-NOT-A-WORD-MATCH,
    STOP-A-CASE-SENSITIVE-GREP-CAN-MANUFACTURE-A-FALSE-ALL-CLEAR,
    STOP-A-MEASUREMENT-CAN-BE-BLIND-BEHIND-AN-IFRAME-BOUNDARY,
    STOP-A-BARE-SELECTOR-MATCHES-THE-FIRST-INSTANCE-IN-DOCUMENT-ORDER-NOT-YOUR-TEST-BLOCK,
    STOP-A-STATIC-GATES-GREEN-DOES-NOT-MEAN-THE-CASCADE-RESOLVED-CORRECTLY.)
12. Before grouping two or more findings/fixes under one remedy because they share a SYMPTOM or a
    COUNT, have I traced the actual MECHANISM each one depends on — and before trusting a
    `--dry-run`/preview/IDE-diagnostics result, or writing a "measured"/"verified" figure into a
    commit or registration, have I confirmed the method can actually REACH and REPORT the value it
    claims to show, run against the real artefact, right now? (STOP-GROUP-FIXES-BY-MECHANISM-NOT-BY-SYMPTOM-COUNT,
    STOP-A-DRY-RUN-THAT-EXITS-BEFORE-THE-WRITER-CANNOT-REPORT-ITS-OWN-SUBJECT,
    STOP-IDE-DIAGNOSTICS-CAN-BE-A-STALE-MID-EDIT-SNAPSHOT,
    STOP-DO-NOT-WRITE-A-FIGURE-INTO-A-COMMIT-OR-REGISTRATION-BEFORE-MEASURING-IT.)
13. **Am I sure the code I am measuring is the code that is DEPLOYED?** Name how I checked - the registered schema, a checksum, a file mtime - not "the deploy said OK". A green deploy verify does not mean your code is running (D576), and the canary is shared with a co-active session that deploys from its own worktree.

For a doc-model / enforcement-hook session (like P4), swap 4/5/8 for: does every new gate
pass the **Enforcement Contract** (auto-fires on an event, fails safe, acts on NEW state,
reads machine evidence not narration, fails legibly, has a `--self-test`) and did I FIRE it
for real before claiming done?

---

14. **Every number I am about to write - did I MEASURE it in this session, or am I carrying it
    forward?** Five instruments were wrong on 2026-08-18 and two of them were my own, shipped
    hours earlier after I had "verified" them. If a figure came from a doc, a prior message, a
    subagent, or my own earlier reasoning rather than from a command I just ran, it is a claim,
    not a measurement. State the command beside the number or do not state the number.
    (STOP-NO-DETECTOR-SHIPS-WITH-A-HAND-COUNTED-BASELINE)
15. **Is the thing I am about to cite as a source of truth actually READ by anything?** Grep for
    a consumer of the specific KEY, not the file. Three separate "authoritative" sources proved
    unread or self-contradicting on 2026-08-19: `cluster-member-sets.json`'s `states` block (zero
    readers), a spec section naming a dead component as canonical, and my own query that read a
    JSON file's top-level keys instead of descending into the one that held the data.
    (STOP-A-DATA-FILE-SECTION-WITH-ZERO-READERS-IS-NOT-A-SOURCE-OF-TRUTH)

## D. D101 count-check receipt

- **2026-09-07 (branch/PR cleanup + git-hygiene standards: three STOP entries added to §A, one
  existing entry AMENDED, no question added):** measured with this file's own canonical commands
  AFTER writing (a self-referential count taken before the write is stale the instant it lands).
  Unique `STOP-*` tokens 272 -> **275** (+3). DEFINED entries (`grep -c '^- \*\*STOP-'`) 272 ->
  **275** (+3). Bullet defences (`grep -cE '^- \*\*'`) 340 -> **343** (+3). Ritual questions (§C)
  15 -> **15**, unchanged. Bytes 273,307 -> **277,291** (+3,984). ADDED **3**
  (`STOP-A-NO-PR-NO-STASH-DIRECT-TO-MAIN`, `STOP-A-INTEGRATE-AFTER-EVERY-TASK`,
  `STOP-A-BYPASS-OK-BUT-FIX-PRE-EXISTING`) and SUBTRACTED **none**. 275 >= 272. 343 >= 340.
  15 >= 15. ALL PASS.
  ⚠ **One existing entry was AMENDED, which D101 requires justifying explicitly.**
  `STOP-A-TWO-BYPASS-LAYERS-NOT-ONE`'s final clause ("never without the user's explicit go-ahead")
  was superseded by Bean's standing authorisation to bypass gates for violations that are not your
  work. The amendment is recorded INLINE in that entry with its date and reason rather than
  silently rewritten, and the entry's check-and-disclose requirement is untouched — so the defence
  is narrowed by an explicit Bean ruling, not weakened by drift. Earned by something that actually
  happened this session: 8 draft PRs and 30 remote branches, every one already superseded by
  `main`, cost a full forensic session to safely delete — the branch-and-PR habit produced nothing
  but the work of proving it had produced nothing.

- **2026-09-04 (session 8, colour track — one STOP entry added to §A, one existing ritual
  question extended, no new question):** measured with this file's own canonical command,
  before and after: `grep -oE '^\s*-\s+\*\*STOP-[A-Z0-9]+(-[A-Z0-9]+)*' .claude/STOP-CATALOGUE.md
  | grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l` → **271** before (at `HEAD`) →
  **272** after. This session ADDED **1** (`STOP-A-STATIC-GATES-GREEN-DOES-NOT-MEAN-THE-CASCADE-RESOLVED-CORRECTLY`)
  and SUBTRACTED **none**. 272 >= 271. PASS. Ritual question 11 (§C) extended with a citation
  to the new entry rather than a new question — the lesson (a code-shape check cannot see a
  CSS-cascade/inheritance result) is a specific instance of question 11's existing "is my
  verification method capable of seeing the thing I'm checking" class, not a new class.
  Ritual questions: 15 → 15, unchanged. Earned by something that actually happened this
  session: `whatsapp-cta`'s gradient CSS passed `php -l`, `survey.js`, `check-dead-controls`,
  and `check-element-manifest-conformance` clean, and still rendered invisible text live —
  found only by a computed-style probe on the real canary, not by any static check.

- **2026-08-19 (session, sources-of-truth-that-nothing-reads: nine STOP entries + one ritual
  question added, §A15):** measured with this file's own canonical commands AFTER writing the new
  section. Bytes 222,862 -> **228,525** (+5,663). `**STOP-` occurrences (`grep -o '\*\*STOP-' | wc -l`)
  255 -> **264** (+9). DEFINED `STOP-*` entries (`grep -c '^- \*\*STOP-'`) 242 -> **251** (+9). Bullet
  defences (`grep -cE '^- \*\*'`) 308 -> **317** (+9). Unique `STOP-*` tokens
  (`grep -oE 'STOP-[A-Z0-9-]+' | sort -u | wc -l`) 280 -> **289** (+9). Sections (`## ` headings) 5 ->
  **5** unchanged (§A15 is a `###` sub-section of §A, matching the §A12/§A13/§A14 pattern). `### A`
  sub-sections 3 -> **4** (+1, §A15). Pre-flight ritual questions (§C, `^[0-9]+\.` lines) 14 -> **15**
  (+1 question 15: *"is the thing I am about to cite as a source of truth actually READ by
  anything?"*, which is the question that would have caught the first three of this session's
  incidents before a golden-schema draft or a Spec 35 citation relied on unread data). **No category
  decreased; nothing was dropped, reworded away, or absorbed.** 228,525 >= 222,862. 264 >= 255.
  251 >= 242. 317 >= 308. 289 >= 280. 5 >= 5. 4 >= 3. 15 >= 14. ALL PASS.
- **2026-08-18 (handoff, inspector-enforcement session - four detectors shipped, Phase 0 closed, and
  FIVE measuring instruments proved wrong, two of them detectors written and "verified" hours
  earlier the same session):** measured with this file's own canonical commands AFTER writing the new
  section, per session 9's receipt (a self-referential count taken before the write is stale the
  instant it is written). DEFINED `STOP-*` entries (`grep -c '^- \*\*STOP-'`) 234 -> **242** (+8, new
  sub-section §A14). Bullet defences (`grep -cE '^- \*\*'`) 299 -> **308** (+8 new STOP entries, +1 =
  THIS receipt line, itself a `- **` bullet; the command reported 307 before this line was added).
  Unique `STOP-*` tokens 272 -> **280**. Sections (`## ` headings) 5 -> **5** unchanged (§A14 is a
  `###` sub-section of §A, matching the §A12/§A13 pattern). Pre-flight ritual questions (§C) 13 ->
  **14** (+1 question 14: *"every number I am about to write - did I MEASURE it this session, or am I
  carrying it forward?"*, which is the question that would have caught four of this session's five
  instrument bugs before they were written down). **No category decreased; nothing was dropped,
  reworded away, or absorbed.** 242 >= 234. 308 >= 299. 280 >= 272. 5 >= 5. 14 >= 13. ALL PASS.
- **2026-08-11 (handoff, session 9 - the `columns` migration (pass 4/6) landed, plus one
  measurement lesson: a bare `document.querySelector` matched the site header's chrome instead
  of the test block):** measured with this file's own canonical commands AFTER writing the new
  entry (not before — session 8's receipt records why that ordering matters for a
  self-referential count). DEFINED `STOP-*` entries (`grep -c '^- \*\*STOP-'`) 217 -> **218**
  (+1, new entry in §B measurement-traps list). Bullet defences (`grep -cE '^- \*\*'`) 281 ->
  **282** (+1 = the new STOP entry; this receipt line itself replaces the prior receipt rather
  than adding a new bullet, so it does not double-count). Pre-flight ritual item 11 (§C) extended
  with the new failure mode + its STOP token, per the carry-forward rule (add, never subtract).
  No entries removed.

- **2026-08-11 (handoff, session 8 - the 41-property migration landed, and 10 earned lessons: a
  green deploy verify that hid stale code, `git commit --amend` flushing a path-scoped index, a
  universal-selector rule accepted as a property's target, a provenance field nothing read,
  truthiness-vs-length recursion over CSS rules, a substring class match, dead-code vs the
  live-bug shape, an assumption in a detector's own docs, a correct root cause carrying a false
  claim, and pre-registered agent predictions as a proof device):** measured with this file's own
  canonical commands immediately before writing (never carried forward). DEFINED `STOP-*` entries
  (`grep -c '^- \*\*STOP-'`) 207 -> 217 (+10, new sub-section §A12). Bullet defences
  (`grep -cE '^- \*\*'`) 270 -> **281** (+11 = the 10 new STOP entries +1 for THIS receipt line,
  which is itself a `- **` bullet — corrected by the handoff QC subagent, which re-ran the
  canonical command instead of trusting the figure. I measured 280 *before* writing the receipt,
  so the number was stale the instant it was written: a self-referential count must be taken
  AFTER the write, or state its own contribution. Earlier receipts got this right and said so).
  Unique `STOP-*` tokens
  (`grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`) 241 -> 251. Sections (`## `
  headings) 5 -> 5 unchanged (§A12 is a `###` sub-section of §A, matching the §A11 pattern).
  Pre-flight ritual questions (§C) 12 -> 13 (+1 new question 13: "am I sure the code I am
  measuring is the code that is DEPLOYED?", which is the question that would have saved most of
  this session). **No category decreased; nothing was dropped or reworded away.**

- **2026-08-09 (handoff, D540-session verification-method audit — 9 earned lessons: substring vs
  word match, case-sensitive grep, truncated `head` search, a dry-run that cannot report its own
  subject, grouping fixes by symptom-count vs mechanism, a banned-phrase gate too broad AND too
  narrow at once, stale IDE diagnostics mid-edit, an iframe-blind measurement, and a figure written
  before it was measured):** measured with this file's own canonical commands immediately before
  writing (never carried forward). DEFINED `STOP-*` entries (`grep -c '^- \*\*STOP-'`) 176 -> 184
  (+8, new §E11 — one of the 9 lessons EXTENDED the existing
  `STOP-HEAD-N-ON-A-VERIFICATION-LISTING-HIDES-THE-ROWS-THAT-MATTER` entry rather than adding a
  duplicate, so it is not counted again here). Bullet defences (`grep -cE '^- \*\*'`, all bullets
  including non-STOP-prefixed ones) 238 -> 246. Unique `STOP-*` tokens (definitions + citations,
  `grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`) 206 -> 216. Sections (`## ` headings)
  5 -> 5 unchanged (§E11 is a `###` sub-section of §E, matching the §E9/§E10 pattern). Pre-flight
  ritual questions (§C) 11 -> 12 (+1 new question 12, covering mechanism-vs-symptom grouping,
  dry-run/preview honesty and pre-measurement figures; question 11 also extended in place with 3
  new sibling citations, which does not change its count). Nothing SUBTRACTED from any category.
  184 >= 176. 246 >= 238. 216 >= 206. 5 >= 5. 12 >= 11. ALL PASS.

- **2026-08-08 (handoff, Spec 35 placement + Phase 1):** bullet defences 222 -> 232 via `grep -cE '^- \*\*'` (+9 defences in new section E9, +1 = this receipt line, itself a bullet). Sections 5 -> 5 (E9 is a sub-section of E). Ritual questions 11 -> 11. Unique `STOP-*` tokens 191 -> 200 (9 new E9 tokens). Nothing SUBTRACTED. ⚠ **UNIT NOTE (added after handoff QC flagged it):** "bullet defences" counts EVERY `- **` rule bullet, only some of which carry a `STOP-*` token — the two metrics are different units and must not be compared to each other. The token count also includes CITATIONS of a STOP elsewhere in the prose, not only its definition; `stop-floor.json` is the authoritative list of DEFINED defences (170), and it is bumped only with tokens verified present in this file.

- **2026-08-07 (handoff):** bullet defences 212 -> 216 via `grep -cE '^- \*\*'` (+3 defences: `git add -A` fallback / date-keyed gate / preset-layer duplication; +1 = this receipt line, which is itself a bullet — count the command's output, not the defences you added). Sections 5 -> 5. Ritual questions 21 -> 21. `stop-floor.json` bumped 144 -> 161 ids. Nothing SUBTRACTED.

- **Baseline (2026-07-17):** 38 unique `STOP-*` tokens across the collapsed
  next-session-prompt.md (30) + state.md (9) + handoff.md (3), de-duplicated to 38.
- **This catalogue:** carries all 38 forward VERBATIM (fragment tokens un-truncated:
  `STOP-INNERBLOCKS-ARE-NOT-ALWAYS-THE-MENU`, `STOP-ONE-SOURCE-BUSINESS-INFO`) PLUS 10
  process STOPs (§A) + standing architectural STOPs (§B tail). New count > old. PASS.
- Every future `/handoff` re-runs this check: new unique-STOP count >= previous, or record
  the justification inline. Bare deletion = regression.
- **2026-07-30 (Track 1 verification audit / D423) re-run:** previous unique `STOP-*` tokens =
  **95** (per `handoff-preflight.py --check`); this session ADDED 3
  (`STOP-A-GATES-SCOPE-MAY-BE-A-GUARD-NOT-A-BLIND-SPOT`, `STOP-A-PROSE-IS-NOT-AN-ARTEFACT`,
  `STOP-A-A-CITED-SLUG-MAY-NOT-EXIST`) and SUBTRACTED none → **98**. 98 >= 95. PASS.
- **2026-07-20 (Spec 36 Wave 4 / D351) re-run:** previous unique `STOP-*` tokens = **51**;
  this session ADDED 4 (`STOP-VERIFY-DEPLOY-BY-CHECKSUM`,
  `STOP-READ-DRAFT-BEFORE-DESIGNING-A-CLONE-FIX`,
  `STOP-HARNESS-CANNOT-SEE-A-CLASSIC-SCROLLBAR`,
  `STOP-DIALOG-CLOSE-KILLS-THE-EXIT-ANIMATION`) and SUBTRACTED none → **55**. 55 >= 51. PASS.
  All four are earned: each records a failure that actually occurred this session (a false
  `verdict: PASS` from a reverted deploy; a contrast policy designed before reading the draft;
  an in-harness scrollbar test that could never fire; a never-once-run exit animation).
- **2026-07-20 (Spec 36 Phase-1 close / D352) re-run:** previous unique `STOP-*` tokens = **55**;
  this session ADDED 2 (`STOP-NEGATIVE-CONTROL-OR-THE-TEST-IS-VACUOUS`,
  `STOP-VERIFY-A-DEFERRAL-BEFORE-EXECUTING-IT`) and SUBTRACTED none → **57**. 57 >= 55. PASS.
  Both are earned: a vacuous acceptance test that would have passed with the feature absent was
  caught mid-session and redone with a negative control; and an inherited deferral, executed as
  written, would have deleted the FR-36-18 rollback path.
- **2026-07-21 (Spec 37 / Spec 17 deletion / D358) re-run:** previous unique `STOP-*` tokens = **57**;
  this session ADDED 2 (`STOP-A-SPEC-DESCRIBING-A-SUPERSEDED-MODEL-ACTIVELY-MISDIRECTS-THE-BUILD`,
  `STOP-EVERY-COUNCIL-NEEDS-A-CODE-GROUNDED-SEAT`) and SUBTRACTED none → **59**. 59 >= 57. PASS.
  Both are earned: a spec describing an abandoned model caused a task to be built against the wrong
  one that same day, and five of six council reviewers rubber-stamped a citation to a filter that
  nothing hooks.
- **2026-07-22 (Spec 37 6-FR core canary-verified / D359) re-run:** previous unique `STOP-*` = **59**;
  ADDED 1 (`STOP-A-FILTER-GATE-ON-THE-WRONG-ATTR-FIRES-NEVER-AND-SILENTLY`), SUBTRACTED none → **60**.
  60 >= 59. PASS. Earned: a header binding gated on `attrs.area` never fired on this theme (markup uses
  `slug`), invisible to code-reads + a mutation harness, caught only by a live render.
- **2026-07-22 (Spec 37 de-client + FR-37-3 store-mismatch / D360) re-run:** previous unique `STOP-*`
  = **60**; ADDED 1 (`STOP-SET-ACTIVE-LAYOUT-IN-THE-WEB-CONTEXT-NOT-RAW-WP-CLI-OPTION`), SUBTRACTED
  none → **61**. 61 >= 60. PASS. Earned: a raw `wp option update` on the shared canary wrote the active
  header/footer pointer to a different store than the live domain reads, presenting as a broken CPT
  binding and nearly triggering a fix to correct code — the disciplined probe proved the code fine.
- **2026-07-22 (FR-36-18 cutover + FR-37-21 retirement / D361-D362) re-run:** previous unique `STOP-*`
  = **61**; ADDED 2 (`STOP-INSPECT-THE-TARGET-BEFORE-DELETING-ON-A-LIVE-SITE`,
  `STOP-A-DISPATCHED-AGENT-MUST-EXECUTE-NOT-DELEGATE`), SUBTRACTED none → **63**. 63 >= 61. PASS.
  Both earned: posts described as "scrap canary pages" were the LIVE Indus Retail/Wholesale sector
  pages — inspecting before deleting prevented destroying real client content on production; and two
  dispatched implementer agents delegated instead of executing, burning a cycle and spawning nested
  agents that needed stopping.
- **2026-07-22 (Track-1 converter reconciliation) re-run:** Track 1 ADDED **6** earned-but-unlanded
  tokens from its Fronts-1/2 session (`STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT`,
  `STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC`, `STOP-RESIDUE-DECLARED-IRREDUCIBLE-USUALLY-ISNT`,
  `STOP-VERIFY-THE-DELIVERABLE-EXISTS`, `STOP-PRE-EXISTING-CLAIM-CHECK-SESSION-START`,
  `STOP-CHECK-BOTH-HOOK-LAYERS-BEFORE-COMMIT`), SUBTRACTED none. **All 6 verified present as
  DEFINED entries** (`grep -cE '^\s*-\s+\*\*STOP-<token>'` = 1 each) — no defence was lost.
  > ⚠ **RECEIPT-ARITHMETIC RACE — corrected 2026-07-22 by the handoff QC gate (do not repeat).**
  > This entry originally claimed "previous 61 → 67". That was WRONG, and so is the
  > D361-D362 entry directly above it: **both co-active tracks computed `previous` as 61 from a
  > stale read**, so neither chained off the other (Track 1's 6 landed in `e8f57958` BEFORE
  > Track 2's 2 in `a20a234d`, yet Track 2 still started from 61). The claimed totals (63 and 67)
  > are therefore both fiction. **The tokens themselves are all present and correct — only the
  > arithmetic was wrong.**
  > **Canonical count method from now on (state the command, never a bare number):**
  > `grep -oE '^\s*-\s+\*\*STOP-[A-Z0-9]+(-[A-Z0-9]+)*' .claude/STOP-CATALOGUE.md | grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`
  > → **63 DEFINED entries** at this commit. (Counting every `STOP-…` mention anywhere gives 71 —
  > it includes prose cross-references, which is why bare counts drifted. A `[A-Z-]+` character
  > class also silently truncates any token containing a digit, giving 59; that is the third
  > wrong answer this file has carried.) **On a shared checkout, re-run the command immediately
  > before writing a receipt — never carry a `previous` figure forward from a prior read.**
- **2026-07-23 (Specs 36+37 breadth wave / D363-D367) re-run:** previous DEFINED entries = **63** (via this file's OWN canonical command, below);
  this session ADDED 4 (`STOP-AN-ARIA-LABEL-ON-A-ROLELESS-ELEMENT-NAMES-NOTHING`,
  `STOP-A-GREP-PATTERN-THAT-CANNOT-MATCH-PROVES-NOTHING`,
  `STOP-A-GATE-BORROWING-ANOTHER-TOOLS-EXCLUSION-LIST-INHERITS-ITS-BLIND-SPOT`,
  `STOP-VERIFY-THE-VARIABLE-EXISTS-BEFORE-BUILDING-ON-IT`) and SUBTRACTED none → **67**. 67 >= 63. PASS.
  ⚠ **Self-correction:** the first version of THIS receipt reported "72 → 76" using the bare
  every-mention count — the exact method the 2026-07-22 receipt one entry above had just
  discredited ("Counting every `STOP-…` mention anywhere gives 71 — wrong answer this file has
  carried"). Caught by the independent handoff `/qc` subagent, not by me. The canonical
  DEFINED-entry command is the one to use, every time; a receipt that states a bare number
  without the command is not auditable.
  All four earned by a failure that actually occurred: ~~a `navLabel` that named nothing for months on a
  roleless div~~ **(RETRACTED — see the correction on that entry; the principle stands, the example was
  false)**; an agent's verification grep that could not match a core block at all; a READ-only gate
  importing a REWRITE tool's track-coordination list and inheriting a 13-file blind spot over the
  patterns that ship to every install; and my OWN reference to an invented variable while fixing the
  first of those.
- **2026-07-23 (Task-1 live verification / nav landmark revert) re-run:** previous DEFINED entries = **67**
  (re-measured with this file's own canonical command immediately before writing, per the 2026-07-22
  receipt-arithmetic rule — never carried forward); this session ADDED 1
  (`STOP-PROVE-THE-THING-IS-MISSING-BEFORE-ADDING-IT`) and SUBTRACTED **none** → **68**. Command:
  `grep -oE '^\s*-\s+\*\*STOP-[A-Z0-9]+(-[A-Z0-9]+)*' .claude/STOP-CATALOGUE.md | grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`
  → **68**. 68 >= 67. PASS.
  ⚠ **One entry was AMENDED, not removed.** `STOP-AN-ARIA-LABEL-ON-A-ROLELESS-ELEMENT-NAMES-NOTHING`
  keeps its slot and its principle; only its worked example was struck, because that example was a
  false diagnosis that had already caused a regression to ship. Per D101 this is a correction, not a
  subtraction — the token count is unchanged by it and no defence was lost. The new entry is earned:
  a fix built on an unproven "X is missing" shipped `<nav>` nested inside `<nav>` to the canary.
- **2026-07-23 (FR-36-26c icon-list link-list / D374-D375) re-run:** previous DEFINED entries = **68**
  (re-measured with this file's own canonical command immediately before writing); this session ADDED 1
  (`STOP-NO-TOP-LEVEL-FUNCTION-IN-PER-RENDER-PHP`) and SUBTRACTED **none** → **69**. Command:
  `grep -oE '^\s*-\s+\*\*STOP-[A-Z0-9]+(-[A-Z0-9]+)*' .claude/STOP-CATALOGUE.md | grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`
  → **69**. 69 >= 68. PASS. Earned: a top-level function in a per-render render.php fataled a 5-instance
  page live, and every build gate + both pre-commit code reviewers missed it (only a multi-instance
  live render caught it).
- **2026-07-28 (Gate 3 close + eye-pass chain + Spec 35 nav cleanup / D401) re-run:** previous DEFINED
  entries = **77** (re-measured with this file's OWN canonical command immediately before writing, per
  the 2026-07-22 receipt-arithmetic rule — never carried forward; the figure had moved from 71 as
  co-active tracks added entries). This session ADDED 4 and SUBTRACTED **none** → **81**. Command:
  `grep -oE '^\s*-\s+\*\*STOP-[A-Z0-9]+(-[A-Z0-9]+)*' .claude/STOP-CATALOGUE.md | grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`
  → **81**. 81 >= 77. PASS. All four earned by something that actually happened today:
  a scoped axe run that returned "0 violations" on a CLOSED drawer exactly as it did on an open one
  (invalidating any earlier drawer-axe claim made with that harness); two CSS rules that were
  perfectly written and structurally incapable of working, both caught only by measuring the rendered
  box; a scalar-vs-box shape mismatch that silently dropped a whole padding value while the sibling
  block with the correct shape rendered fine; and four universal extensions attaching unconditionally
  to a navigation menu, one of whose panels was writing to attributes that were never registered.
- **2026-07-28 (drawer desktop variants / D403-D404) re-run:** previous DEFINED entries = **81**
  (re-measured with this file's OWN canonical command immediately before writing — never carried
  forward). This session ADDED 1
  (`STOP-A-SCHEMA-AUDIT-READING-ONLY-BLOCKJSON-CANNOT-SEE-EXTENSION-ATTRS`) and SUBTRACTED
  **none** → **82**. Command:
  `grep -oE '^\s*-\s+\*\*STOP-[A-Z0-9]+(-[A-Z0-9]+)*' .claude/STOP-CATALOGUE.md | grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`
  → **82**. 82 >= 81. PASS. Earned: the oldshape-audit gate aborted a real deploy on two
  extension-registered attrs it structurally cannot see; the finding was explained against the
  extension source before baselining rather than bypassed.
- **2026-07-26 (Spec 37 FR-37-40 sticky build / D391-D392) re-run:** previous DEFINED entries = **69**
  (re-measured with this file's own canonical command immediately before writing, per the 2026-07-22
  receipt-arithmetic rule — never carried forward); this session ADDED 2
  (`STOP-MEASURE-THE-STATE-NOT-THE-FLAG-THAT-REQUESTS-IT`,
  `STOP-A-CRITERION-WRITTEN-AGAINST-A-REJECTED-MODEL-MUST-BE-STRUCK-NOT-BUILT`) and SUBTRACTED
  **none** → **71**. Command:
  `grep -oE '^\s*-\s+\*\*STOP-[A-Z0-9]+(-[A-Z0-9]+)*' .claude/STOP-CATALOGUE.md | grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`
  → **71**. 71 >= 69. PASS. Both earned by something that actually happened: a gate reading the
  sticky body class would have reserved 93px of dead space for a header computing `absolute`
  (sticky and transparent both set `position` with `!important` at equal specificity, transparent
  later), caught only by measuring the computed value on a live page; and two acceptance criteria
  in the mini-design's OWN §4 — a list already rewritten once for exactly this reason — survived
  the rejection of the model they were written for, and would have shipped a warning for a state
  that can no longer occur.
- **2026-07-28 (Spec 35 build-surface close-out / T3/T4 wave + injection-class arc) re-run:**
  previous DEFINED entries = **82** (re-measured with this file's OWN canonical command
  immediately before writing — never carried forward). This session ADDED 3
  (`STOP-RENDER-INJECTORS-MUST-ANCHOR-PAST-THE-LEADING-SCOPED-STYLE`,
  `STOP-A-SHARED-WRAPPER-READING-A-GENERIC-ATTR-NAME-COLLIDES-WITH-BLOCK-VOCABULARY`,
  `STOP-CHAINED-SHELL-COMMANDS-MASK-A-FAILED-STAGE`) and SUBTRACTED **none** → **85**. Command:
  `grep -oE '^\s*-\s+\*\*STOP-[A-Z0-9]+(-[A-Z0-9]+)*' .claude/STOP-CATALOGUE.md | grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`
  → **85**. 85 >= 82. PASS. All three earned by something that actually happened today: four
  `render_block` injectors (hover-effects/animation/parallax/image-controls) landed payloads
  inside the Spec-32 leading scoped `<style>` block, which the p99 lift then stripped — erasing
  both the injection and the evidence, and exposing that an earlier "inline-zero win" claim
  (D346) was partly vacuous because the same mechanism had silently deleted inline var writes;
  `SGS_Container_Wrapper` reading the generic attr name `layout` collided with `sgs/post-grid`'s
  own `layout` vocabulary and double-gridded the block; and an `&&`-chained build-then-push
  command's overall exit 0 masked a failed intermediate build stage at commit `07c67642`, caught
  only by re-checking the individual stage output rather than the chain's aggregate result.
- **2026-07-29 (parking normalise + cull + enforcement layer) re-run:** previous unique `STOP-*` =
  **86**; ADDED 4 (`STOP-A-FLAG-NAMED-CHECK-IS-NOT-ALWAYS-A-DRY-RUN`,
  `STOP-A-GATE-THAT-CANNOT-FAIL-READS-GREEN-FOREVER`,
  `STOP-A-GATE-CAN-BE-BLIND-TO-THE-FILE-IT-PROTECTS`,
  `STOP-A-SUBAGENT-ABSENCE-CLAIM-IS-A-HYPOTHESIS`), SUBTRACTED **none** → **90**. Same command as
  above → **90**. 90 >= 86. PASS. Ritual questions unchanged at 10. All four are earned by something
  that actually happened this session: a `--check` flag that re-seeded 28 golden fixtures under a
  read-only brief; a STOP-count regex missing `re.M` that measured 0 on every real file and would
  have passed forever; the D101 audit itself being blind to `STOP-CATALOGUE.md` since the P4 split
  (gated on `doc_type`, and its counter only saw table rows); and two subagents whose negative
  findings and self-reported manifests were both false, costing 18 dropped slugs before an
  independent diff caught them.
  ⚠ **Note for the next carry-forward run:** this catalogue is now the file the docscore D101 audit
  actually reads (fixed 2026-07-29) — a DECREASE here will now fail a gate, not just a prose rule.
- **2026-07-28 (docs fat-cut / truth sweep) re-run:** previous unique `STOP-*` = **85**; ADDED 1
  (`STOP-CO-ACTIVE-TRACK-ETIQUETTE-ON-A-SHARED-WORKTREE`), SUBTRACTED **none** → **86**. Same
  command as above → **86**. 86 >= 85. PASS. Earned + rehomed: the per-track next-session prompts
  that carried this etiquette were retired this session (a private per-track "truth" file went
  stale on 2026-07-27 and nearly cost a session rebuilding working code), so the defence moves
  HERE rather than dying with them — the D101 rule is carry-forward, never subtract.
- **2026-07-29 (Task-5 drawer rejection / D411) re-run:** previous unique `STOP-*` = **90** (measured
  with this file's own canonical command at the start of the handoff — NOT carried from the 86 in the
  entry above, which had already been overtaken by a co-active track; the receipt-arithmetic race rule
  applies); this session ADDED **5**
  (`STOP-FIXING-ONE-INSTANCE-OF-A-FAILURE-CLASS-DOES-NOT-IMMUNISE-THE-NEXT`,
  `STOP-A-CONTRAST-CHECK-MUST-WALK-EVERY-TEXT-ELEMENT-IN-THE-SURFACE`,
  `STOP-A-GREEN-MEASUREMENT-IS-NOT-FIDELITY-AND-MUST-NOT-BE-PRESENTED-AS-IT`,
  `STOP-A-REJECTION-RECORD-IS-A-HYPOTHESIS-TOO`,
  `STOP-THE-AUTOMATIONS-OWN-CURSOR-CONTAMINATES-THE-MEASUREMENT`), SUBTRACTED **none** → **95**.
  95 >= 90. PASS. All five are earned by failures that actually occurred this session: a vacuous
  reference capture shipped hours after the identical vacuous-axe class was fixed and written up; a
  selector-scoped contrast check that returned 13.14:1 while the same drawer painted text at 1:1; a
  green cell-count presented as fidelity and rejected by Bean on sight; a rejection record whose own
  diagnosis was wrong and would have driven a defect into the rework; and an axe run contaminated by
  the automation's leftover pointer.
- **2026-07-30 (motion Wave B commit 1 / D422) re-run:** previous count = **98** (this file's own
  gate reading at handoff start); this session ADDED **4**
  (`STOP-A-GATE-THAT-GLOBS-A-DIRECTORY-IS-BLIND-TO-EVERYTHING-OUTSIDE-IT`,
  `STOP-A-ZERO-FROM-AN-UNAUTHENTICATED-FETCH-PROVES-NOTHING`,
  `STOP-A-GREP-COUNT-IS-NOT-A-MEASUREMENT`,
  `STOP-AN-OPTION-NAME-THAT-DOES-NOT-EXIST-IS-DISCARDED-IN-SILENCE`), SUBTRACTED **none** →
  **102**. 102 >= 98. PASS (verified by `handoff-preflight.py --check`, not by hand-arithmetic).
  All four are earned by failures that actually occurred this session: a budget gate that printed
  PASS having never measured the module it was meant to govern; three admin absence-checks that ran
  logged-out and returned a clean-looking zero; a "5 rows" count off a regex that matched opening
  AND closing block delimiters, against a header locked at 3 (Bean caught it); and a library option
  that does not exist in the installed version being discarded in silence while reading as an
  enforced safety guarantee.
- **2026-08-01 (Gate 6.5 handoff carry-forward audit) re-run:** previous DEFINED entries = **144**
  (measured with this file's own canonical command immediately before writing — never carried
  forward). This session ADDED **9** (`STOP-NODE-CHECK-VALIDATES-SYNTAX-NOT-SCOPE`,
  `STOP-A-FORCED-LINT-RULE-CAN-BE-OVERRIDDEN-BY-PROJECT-CONFIG`,
  `STOP-A-LITERAL-GREP-CANNOT-SEE-A-CSS-VARIABLE-DRIVEN-VALUE`,
  `STOP-HEAD-N-ON-A-VERIFICATION-LISTING-HIDES-THE-ROWS-THAT-MATTER`,
  `STOP-A-WRONG-EXPLANATION-DOES-NOT-MAKE-THE-OBSERVATION-WRONG`,
  `STOP-A-CAPABILITY-PRESENT-IN-EVERY-ARTEFACT-CAN-STILL-DO-NOTHING`,
  `STOP-STATIC-CONTRAST-MATHS-CANNOT-SEE-COMPOSITED-DIMMING`,
  `STOP-A-REBASELINE-MUST-BE-FOLLOWED-BY-A-SELF-TEST`,
  `STOP-D-NUMBERS-COLLIDE-ON-A-SHARED-WORKTREE`) and SUBTRACTED **none** → **153**. Command:
  `grep -oE '^\s*-\s+\*\*STOP-[A-Z0-9]+(-[A-Z0-9]+)*' .claude/STOP-CATALOGUE.md | grep -oE 'STOP-[A-Z0-9]+(-[A-Z0-9]+)*' | sort -u | wc -l`
  → **153**. 153 >= 144. PASS. Also added pre-flight ritual question 11 (§C), covering the
  measurement-defect class specifically — 5 of this session's 9 new entries were defects in the
  MEASURING, not the code, matching the session brief's own tally. Ritual questions: 10 → 11.
  All nine are earned by something that actually happened this session: `node --check` passing a
  fix that referenced an out-of-scope variable and threw at runtime; a CLI-forced `no-undef` rule
  silently overridden by this project's own ESLint config, proven by planting a violation; a
  literal grep missing a `var(--x)`-driven opacity value already visible in the searcher's own
  earlier output; a `head -4` verification listing that showed the four healthy clients and hid
  the four broken ones; a report whose mechanism was wrong but whose raw observation (a dimmed
  input) was real, dismissed wholesale on the wrong basis and costing several hours to re-find; a
  capability (morph) present in every shipped-effects artefact and a roster that grew 3→28 while it
  had never once animated; a static contrast calculation reading 5.79:1 against a rendered 1.79:1
  because of applied `opacity`; a rebaselined budget gate whose teeth were not re-proven with a
  self-test; and a D-number cited by this session that collided with a co-active track's D455.
- **2026-08-05 (LEDGER.md byte-cap sweep, per `.claude/reports/2026-08-04-ledger-sweep-recommendations.md`)
  re-run:** previous DEFINED `STOP-*` entries = **153** (`grep -c '^- \*\*STOP-' .claude/STOP-CATALOGUE.md`,
  matches the file's own canonical command). This sweep RELOCATES rather than adds/removes STOP-format
  entries — none were touched — so the mechanical `STOP-*` count is unchanged at **153**. 153 >= 153.
  PASS. **Separately, this sweep carries forward 34 standing-constraint-shaped statements that were
  living in LEDGER.md's narrative/task-plan sections** (23 in LEDGER's labelled "Standing constraints"
  section + 11 embedded in its NEXT SESSION / TRACK 1 follow-on blocks) — see new §E below. All 34
  moved VERBATIM; LEDGER.md now carries only short pointers to this file. Before/after count of the
  34: **34 before (in LEDGER only) -> 34 after (in STOP-CATALOGUE.md §E, 0 remaining in LEDGER,
  4 one-line pointers left in their place)**. Zero lost. D101 satisfied by construction — this was a
  pure relocation, not a rewrite, so no drop is possible.

---

## E. Standing constraints relocated from LEDGER.md (2026-08-05 sweep)

LEDGER.md was over its own 24,576-byte cap (37,035 bytes). Per
`.claude/reports/2026-08-04-ledger-sweep-recommendations.md`, every standing-constraint-shaped
statement it held is moved here VERBATIM (D101 — relocation, not deletion). LEDGER.md now carries a
one-line pointer to this section instead. Grouped by where each item lived in LEDGER before the move.

### E1. Track 1 / DB — restored 2026-08-02 after a handoff edit truncated them (D101: never SUBTRACT)

- ⛔ **"IT FUNCTIONS" IS NOT "IT IS SAFE" (Bean, 2026-08-03 — supersedes the D474/D476 wording).**
  The target is **100% routing accuracy, totally deterministic**. *"It works here"*, *"good for
  now"* and *"it was only just fixed"* are **not** reasons to keep a mechanism. A mechanism that
  cannot generalise to any block, page and content shape is a **cheat to replace**, not an asset to
  protect — being recently repaired makes it no safer.
  ⚠ **A previous session wrote "do NOT delete `scalar-media` or Loop 2" into this section as a
  standing rule. Bean did not set that rule and it contradicts the universal principle above.**
  It is REMOVED. `role='scalar-media'` is a **per-block cheat**: 2 rows in the whole DB, both
  `sgs/hero`, serving one bespoke branch that is the codebase's only `--mobile` BEM → `*Mobile`
  route. It is being **replaced** by a universal per-device content-routing axis, not preserved.
  **Retain only the transferable lesson:** the D474/D476 incident proved a *measurement* error —
  a mechanism was called dead because a **broken caller gate** hid it. Prove a path is dead by
  reaching it, never by observing it not fire.
- ⛔ **Do NOT write a tactical "never delete X" rule into this section.** Standing constraints are
  for *universal* principles and *measurement* lessons. A per-artefact preservation order dressed
  as a rule blocks exactly the ruthless replacement the design philosophy requires.
- ⛔ **ORDER IS LOAD-BEARING** for `property_suffixes` + `modifier_suffixes` (`ORDER BY rowid`,
  `LIMIT 1` for the former — first row WINS). Compare-first + DELETE + ordered re-INSERT, NEVER
  `INSERT OR REPLACE`.
- ⛔ **Do NOT add `block_composition.has_inner_blocks` to any population gate** — it is DERIVED, not
  cached. **A population floor is the right gate for a CACHED fact and the wrong one for a DERIVED
  one.**
- ⛔ **`block_composition.composition_role` LOOKS dead from the converter but is LIVE** —
  `db-consistency/check_tier_composition.py` (in `prebuild`) reads it. Do not drop the column.
- ⛔ **A SELF-HEALING SEEDER BLINDS AN IN-PROCESS TEST.** Anything importing `db_lookup` repairs
  drift before an assertion can see it. The detector must be a separate process that never imports
  it → value-identity assertions in `check_value_identity.py` (sqlite3 only — keep it that way;
  renamed from `check_row_floor.py` 2026-08-07 when its row-count floor was deleted).
- ⛔ **A population count cannot see a RECLASSIFICATION** (right row, wrong-but-plausible value;
  1012 → 1012).
- ⛔ **A table with `CREATE TABLE IF NOT EXISTS` on a hot path cannot be retired by dropping it** —
  every creator must go, or the schema gate stays red forever.
- ⛔ **A shrinking seed file PRUNES the live DB on next import** (cost the `attribution` slot once).
  The seeder now warns before it does.
- ⚠ **A negative control has its OWN vacuity modes** — confirm the break actually landed. Three in
  one day: one healed by the seeder, one patching a symbol computed at import, one catching the
  wrong exception class.
- ⚠ **Two migrations are HELD BACK deliberately** (`testimonial-*`): they UPDATE
  `block_attributes.derived_selector` and that regenerability is UNPROVEN. Never delete a migration
  before its replacement seeder is proven.
- ⛔ **`fx-horizontal-panel` has NO defect — a CSS bug provides the rescue.** `overflow-x: clip` with
  a non-clip `overflow-y` computes to `hidden`, which IS a scroll container, so native
  scroll-into-view rescues focus. Do NOT "fix" it to clip on both axes — that deletes the only
  WCAG 2.4.11 cover this effect has. (Wave E; full narrative `memory/session-2026-08-01-wave-e.md`.)
- **The WooCommerce gallery bug did not exist.** `core/query include:[540]` silently rendered product
  1125, whose gallery is genuinely empty. Check WHICH product rendered before diagnosing.
- Per-row `position:sticky` REJECTED (short-parent trap, D389). Sticky stays HEADER-level.
- No absolute size value in a shared state-only stylesheet (D386), gated by
  `check-shared-css-state-rules.js`.
- After any `edit.js` / shared `src/components` change: deploy and OPEN the real editor (D388).
- A scoped axe run on a CLOSED surface passes vacuously — guard openness or the run proves
  nothing; any earlier drawer-axe claim from before D418 proves nothing.
- `templateLock:'all'`/`'contentOnly'` re-applies the template on EVERY mount, matched by ARRAY
  POSITION (D393) — pass the template only into a genuinely empty container.
- The D343 phantom border was WP core's `html :where([style*="border-width"])` substring-matching
  a custom property *named* `--sgs-tile-border-width` — not shadows-as-borders. Width vars are
  named `--*-thickness`. Do not re-propagate the wrong diagnosis.
- No-login shareable preview link is DROPPED, not deferred (Bean, 2026-07-27).
- `<footer>` is generic — key any assertion on the CLASS `wp-block-template-part`, never a naive
  regex; the canary page has 5 `<footer>` elements, four are quote attributions.
- `~/.agents` is NOT a git repo — the skillscore script + 5 grafted skills + `nextjs-testing` are
  LIVE but UNVERSIONED (recovery = per-file `.bak-2026-07-17-*`).
- **No block version bumps / deprecations pre-production** (Bean D293, overrides STOP-57).
- ⛔ **A PRESERVE-IF-POPULATED column does not re-derive on a reseed — changing its input changes
  nothing.** `assign-canonical.py:797-800` writes `final_selector = derived_selector if
  existing_selector is None else existing_selector`; `role` has the same guard. So "split the slot
  vocabulary and re-run `/sgs-update`" would have updated `canonical_slot` and left every colliding
  `derived_selector` exactly as it was — an inert change that looks like work. **Before relying on a
  reseed to propagate anything, read whether the writer is COALESCE-shaped; if it is, NULL the column
  first.** (Task B council, 2026-08-06. Same family as STOP-71: clear the row, reseed, read it back.)
- ⛔ **A gate keyed on MORE columns than its consumer reads can go green while the defect persists.**
  `check_content_attr_collisions.py` groups on `(block_slug, role, canonical_slot, derived_selector)`,
  but the converter routes on `derived_selector` ALONE. Diverging only `canonical_slot` splits the
  group in the report while both attrs still point at one draft node. **When a gate passes, confirm
  the columns it keys on are the columns the consumer actually uses** — otherwise you have measured
  the gate, not the system. (Task B council, 2026-08-06; the `a-green-measurement-is-not-fidelity`
  family, in its most specific form yet.)
- ⛔ **A FIRST-MATCH scan over an element's classes is blind to a modifier on a later class.**
  `walk._family_modifier` returned the modifier of the first own-family BEM class whether or not it
  had one; drafts author `class="sgs-x__y sgs-x__y--mobile"`, so the tier was never detected and the
  mobile asset landed in the desktop attr. **It was NOT hero-only** — reproduced on `sgs/container`,
  which has no bespoke branch; hero's Mechanism-B branch A merely hid it, which is exactly why a
  general defect read as a per-block quirk. Selection among several candidates must be a STATED RULE
  (here: "the modifier that maps to a DB breakpoint suffix wins"), never document order. (D506;
  checklist item 22's positional-tie-break ban, second live instance in two commits — see also D505.)

### E2. Methodology guardrails — earned 2026-08-03/04 (motion / Snooza track)

- **A stale doc is a trap that fires on the next reader.** Proven twice: a spec described fixed
  bugs as live and an audit recommended re-fixing them; a client doc named a directory that never existed.
- **Never hand-author block markup with a guessed attribute** — WP silently DISCARDS undeclared attrs
  (D338). Serialise from a known-clean page, or use no attributes at all.
- **A probe that never reaches the effect measures the probe.** Two "failures" were the probe's own
  measurement bugs (an SVG object stringified; headless rAF throttling).
- **Fix the instrument, never the gate field.** `probe-first-paint.mjs` gained an EXPLICIT
  `--not-a-loop` opt-out; auto-detect was REJECTED because a loop block that FORGOT its marker is
  precisely the bug that assertion exists to catch.
- **Verify licences with `gh api`, never a README badge.** Two "MIT" claims were wrong on inspection.
- **Shared worktree, other tracks active.** Commit BY EXACT PATH, never `git add -A`. Re-check the
  D-ceiling immediately before writing any D reference.
- **Deploy before measure**; `--dry-run` does NOT run the dirty gate; a page-HTML grep cannot see
  block CSS (it is lifted to `uploads/sgs-css/`).

### E3. Guardrail carried from the 2026-08-04 Spec 35 enforcement session

- **A rule returning zero is a claim requiring evidence, not a pass.** Every new or migrated rule
  declares its EXPECTED population before it runs. Three for three were blind without this.

### E4. Routing guardrails — earned 2026-08-03 (TRACK 1 routing follow-on)

- **A static audit of this pipeline is a THIRD of the truth** — 8 agents read the scripts; ONE live
  `/sgs-clone` run overturned two headline findings. Run the pipeline before concluding.
- **Establish the DENOMINATOR before quoting a percentage; derive nothing you can count.**
- **A fix is a hypothesis too** — two proposed fixes would have shipped silent WRONG VALUES.
- **Prove a path is dead by REACHING it, not by observing it not fire** (D474).

### E5. Role-derivation guardrails — earned 2026-08-05/06 (Spec 35 / D497 session)

- **STOP-70 — A GATE THAT DOES NOT COVER A TEST SUITE LETS REGRESSIONS SHIP GREEN.** `npm run build`'s
  prebuild pytest step ran only `scripts/oracle/tests/` (38 tests). `scripts/converter/tests/` — 599
  tests over the highest-blast-radius code in the project — sat outside EVERY gate. A role change
  that broke 3 icon-extraction tests was committed, pushed, and reported as verified-green, because
  nothing in the build could see it. Widened to both (245 -> 843) in `60a920b6`. **Before trusting a
  green build, ask which suites it actually runs** — a passing gate is a claim about its own scope,
  not about the codebase.
- **STOP-71 — A PROBE IS NOT THE PIPELINE.** `decompose_attr_name()` returning the right role proves
  NOTHING about what a reseed writes. Acting on that probe produced a confident "34 rows are
  redundant" conclusion that measurement refuted: stripping them degraded 53 rows to generic
  `styling` and left 18 NULL. **The only valid test that a role is mechanism-derivable is: clear the
  row, reseed, and read it back.** Same shape as calling `peel_property_suffix` without peeling
  modifiers first, which understated mechanism reach by 7 rows in the same session.
- **STOP-72 — A DOC'S OWN DESCRIPTION CAN BE THE SOURCE OF THE REGRESSION.** `roles.json` asserted
  "NO consumer in the converter" for all four `icon-*` roles, citing a real function that genuinely
  never branches on the role — but not the consumer. The actual consumer
  (`extraction.py:1110-1116`, dispatching on `role.startswith("icon-")`) was two files away. A
  file-scoped read of ONE function had concluded absence for the whole codebase, and that sentence
  sat in the truth source until someone acted on it. **An absence claim in a doc is a hypothesis with
  a date on it, not a fact** — verify it against the consumer before you delete anything it licenses.
- **STOP-73 — VERIFY A SUBAGENT'S ABSENCE CLAIM BEFORE ACTING ON IT.** The above reached `main`
  because an agent repeated the stale doc and I acted on the agent. Two other agents in the same
  session correctly REFUSED to build things that already existed (`emojiChar` extraction, the a11y
  writer). **An agent saying "X does not exist" and an agent saying "X already exists" both need the
  same check: read the consumer.**
- **STOP-74 — CAPTURE STATE BEFORE MUTATING, ESPECIALLY WITH A FILTER.** A clear-and-reseed intended
  for 35 rows hit 172, because the selection filter caught every override entry LACKING a role field
  rather than the ones whose role had been stripped. Fully recoverable only because `role_before` was
  captured first. **Mutate from an EXPLICIT list, never a filter, when the list is short enough to
  enumerate** — and snapshot before the write regardless.


### E6. DEFINITION OF ENFORCED — the Task-F bar (moved from LEDGER 2026-08-06, byte cap)

**DEFINITION OF ENFORCED** — a rule counts only when ALL hold (3 of 3 rules built 2026-08-04 were
blind on first build, each caught only by a human challenging a low number):
1. Expected population declared BEFORE the rule runs; a near-zero result is a claim requiring
   evidence, not a pass.
2. Population cross-checked by an independent method (second script/language/parse strategy).
3. Fixtures cover the DOMINANT real shape, not the convenient one — ≥1 `mustFlag` from a REAL block.
4. `mustNotFlag` fixtures for every legitimate exemption, each proving it load-bearing.
5. `--self-test` plants a violation, confirms it landed on disk, asserts it flags.
6. Baseline suppression proven to suppress; mode data proven to change the exit code both ways.
7. Blind spots ENUMERATED in the rule's own header, with a rough unmeasured-instance count.
8. The right document — name the consumer and prove it by reading the consumer, not the source doc.
9. Advisory first (exit 0); flip to fail-closed only when backlog is zero AND points 1-8 hold.
10. Checklist row updated with the real enforcer name — no phantom tools.

**Track acceptance:** every one of the 24 rows meets points 1-10 or carries a recorded exception
naming a `decisions.md` D-number. "Has a script" is not the bar.


### E7. Earned 2026-08-06 — Spec 35 pool 23 → 0 session (D504)

Every entry below cost real time this session. Added, never replacing E1-E6.

- **STOP-75 — A GATE CAN BE DATE-KEYED INSTEAD OF CHANGE-KEYED.** The pre-commit visual-diff gate
  is satisfied by `reports/visual-diff/<block>-<DATE>.md` containing `verdict: PASS` and
  `first_paint_capture_passed: true`. That binds evidence to a DATE, not to a DIFF — so a
  concurrent track's same-day report, written for a completely different change to the same block,
  satisfies the gate for yours. Found live: four blocks already had same-day reports from another
  track. Evidence was APPENDED to those (clearly marked), never overwritten. **When a gate passes,
  ask what it actually bound itself to.**
- **STOP-76 — A DEAD ASSIGNMENT IS DEAD *CODE*, NOT AUTOMATICALLY A DEAD *CONTROL*.** CHECK 5
  returned 18 findings; triage showed 13 were unused local variables whose FEATURE WORKS (a shared
  helper reads the raw `$attributes`), 2 were abandoned attrs, and only 3 were genuine dead
  controls. **The raw count was misread by the person who had just built the gate** — a severity
  split is owed before that list is handed to anyone else.
- **STOP-77 — DO NOT WEAKEN A GATE TO LAND YOUR OWN COMMIT.** `check-markup-neutral.py` refuses ANY
  deletion of a non-comment line, so even a provably-dead variable deletion still demands real
  visual verification. That is the gate being correct, not obstructive. Extending it to accept a
  "provably safe" class is a legitimate change — but doing it in the same breath as needing it to
  pass is not. Do the verification instead.
- **STOP-78 — A LINTER PROVES A FILE PARSES, NOT THAT ITS SYMBOLS EXIST.** A generated PHP edit
  emitted `<TAB>rim( ... )` because a Python heredoc wrote `	rim` with ONE backslash and Python
  expanded `	` to a literal tab. `php -l` PASSED — `rim(...)` is valid SYNTAX; an undefined
  function is a RUNTIME fatal. The canary served HTTP 500 for ~10 minutes. After ANY generated or
  scripted edit to PHP, run `check-dead-api-calls.py --check`; after one to JS, build. ⚠ The same
  pass warned about `\i` in `\in_array` and stayed silent on `	`, because `	` is a VALID escape
  — the dangerous mangles are the ones the interpreter thinks are legitimate. (D852.)
- **STOP-79 — A CONTROL THAT WRITES NOTHING THE RENDERER READS IS A DEAD CONTROL, AND IT LOOKS
  FINE.** Four client colour pickers were shipped against four CSS styles whose 33 colours were all
  hardcoded; the pickers referenced the colour custom properties ZERO times. Nothing errored,
  nothing failed a gate — the client would simply change a colour and see no change. Before
  shipping any control, grep the RENDERER for the property it writes. (D852; same family as
  `a-read-with-no-writer-fails-silently`, inverted.)
- **A BUILT MECHANISM IS NOT A REACHED ONE.** Two mechanisms this session were fully built,
  self-tested and COMPLETELY INERT: the `link-content` chain (nothing assigned the role, and the
  writer ran only under `--task-b-only`), and D6's two new rules (fed only `d4_review` while both
  their targets sat in `report_only`). A built mechanism never fed its candidates reads exactly
  like a missing one. **Gate on the observed end state, never on the code existing.**
- **A DETECTOR'S NEGATIVE RESULT DESCRIBES THE DETECTOR.** ONE gap — a detector that will not cross
  a boundary — surfaced in FOUR separate tasks (A7's rejected fix-shape, D4's own documented gap,
  nested-argument capture, interprocedural parameters). Before recording "no evidence", establish
  whether the evidence is merely unreachable.
- **A ZERO FROM A SEARCH YOU WROTE NEEDS A POSITIVE CONTROL.** A dead-assignment probe returned
  "0 findings" and was wholly vacuous — a broken regex, not a clean codebase. It became trustworthy
  only once proven to CATCH a known-bad row.
- **CHECK WHAT A GLOB MATCHES BEFORE DELETING.** `rm -f reports/visual-diff/*-2026-08-06.md`
  deleted a concurrent track's tracked reports along with my own mangled ones. Restored via
  `git checkout --`, but `git status` was the only thing that revealed it. On a shared worktree a
  delete is a cross-track action exactly as a DB write is.
- **`value-fragment` NEVER DISQUALIFIED A `technical` VETO** — the role's own contract reads
  "each verdict NOT-content **or value-fragment**". A whole task was planned against the opposite
  reading. Read the contract in the DB, not the summary of it.

### E8. Earned 2026-08-08 — Tier 0 data-layer session, corrected by a 4-rater `/qc-council` (D523-D527)

- **A WRITE HAS DERIVED READERS, NOT JUST DIRECT ONES.** Correcting 41 `inspector_control_type`
  rows silently restaged `roster.json`, because `build-roster.py:91` derives every `surfaces.*` axis
  from a haystack that INCLUDES that column. The committed artefact went stale with no error — and
  it is the denominator every Spec 35 rule scopes against, while the same derivation feeds
  `surfaces.animation`, the scope of `17-reduced-motion-gate` (GATE-mode, WCAG 2.3.3). A 2026-07-30
  precedent at `build-roster.py:71-76` records a regen flipping 18 blocks and firing 18
  false-positive WARNs on that fail-closed gate. **"What reads this?" and "what is DERIVED from
  this?" are two different greps. After writing a shared column, regenerate the derived artefacts
  and DIFF them — a regeneration you do not diff tells you nothing.**
- **TWO ARTEFACTS AGREEING IS NOT VERIFICATION IF THEY SHARE A SOURCE.** A doc supersession was
  gated on an ABSORPTION MAP and "verified" by mechanically comparing two tables — both written
  from the same belief. Clean 30/30 MATCH. A rater then traced each item to its CITED TARGET and
  found two marked ABSORBED into sections that did not contain the requirement. **A cross-check
  verifies only when the two artefacts came from INDEPENDENT routes. Check a claim against the
  target it cites, never against another copy of the claim.**
- **SCOPE A FIX TO THE POPULATION, NOT TO THE LIST YOU INHERITED.** The handoff named 5 blocks with
  box-object attrs; the fix corrected 7 attrs and was reported as complete. The real population was
  **13** — a rater found 4 more (including `physics-canvas.gridItemPadding`, which four sibling
  blocks already declared) and a widened census found 2 more. The inherited list was a starting
  point that read like a specification.
- **"NO READER" MUST NAME ITS SEARCH SCOPE.** 36 capability values were pruned as fossils on the
  finding that nothing read them. Two live readers existed in `mcp/server.py`
  (`search_blocks()`, `match()`) — surfaced by the original grep and dismissed as "informational".
  The decision survived; the justification did not. **Say "no reader IN X", and name X.**
- **A GUARD CAN FIRE BY COINCIDENCE.** The repeater guard appears to protect
  `pricing-table::plans`, but only because a shadowing local happens to share the attribute's name;
  rename it and the guard silently stops. `gallery::mediaItems` is spared by an upstream resolution
  failure, not by the guard at all. **Verify WHY a guard fires, not just THAT it fires.**
- **DERIVED "THEREFORE" CLAIMS NEED THEIR OWN GATE.** "All four columns fixed, THEREFORE Tiers 1-4
  unblocked" was false: the extension surface is unbuilt plumbing, BORDER has no census, and Tier 1
  needs nine Rule 7 gates. **Fixing a precondition does not discharge everything that cited it.**

### E9. Earned 2026-08-08 — Spec 35 placement + Phase 1 background session (D533-D536)

- **STOP-A-BLOCKER-YOU-ASSERT-WITHOUT-READING-IS-NOT-A-BLOCKER.** Twice in one session I reported
  work as blocked without checking. `wp-content-guard.py` was named as preventing a probe page — it
  blocks `wp post update`/`wp eval` and has NEVER blocked `wp post create`. And canary credentials
  sit in `.claude/secrets/sandybrown.env`, which CLAUDE.md says are always available and to use
  directly; Bean had to point at them. **Open the hook / read the file before declaring the path
  closed. "I can't" is a claim requiring the same evidence as "it works".**
- **STOP-A-SURFACE-YOUR-CHANGE-TOUCHES-IS-NOT-OUT-OF-SCOPE.** The Phase 1 report listed tier images,
  `background-attachment: fixed`, video and the editor canvas as "not covered" — while that very
  change had RETARGETED the responsive tier rules and MOVED the paint site. Bean rejected the
  framing. Testing them then found a real defect (the editor ignored the new control entirely).
  **A "not covered" list is only legitimate for surfaces the change does not touch; anything it
  touches is unverified work, not a footnote.**
- **STOP-TEST-THE-COMBINATION-NOT-ONLY-THE-FEATURES.** Tier images and media opacity each passed
  alone. Had the `@media` tier rule also reset `opacity`, mobile would have silently lost its
  dimming while desktop kept it — and BOTH single-feature tests would still have passed. Only the
  combined case (tier image + 40% opacity, measured per breakpoint) can see that class of bug.
  **When two features write the same property, the combination is its own test.**
- **STOP-THE-EDITOR-IS-WHERE-THE-CLIENT-LIVES.** `edit.js` painted the background on the element
  while the frontend painted a `::before` layer, so `backgroundMediaOpacity` had NO visible effect
  in the editor: set 35%, see nothing, get a dimmed image on the published page. A frontend-only
  verification called this feature complete. **Any render change must be verified on BOTH surfaces;
  the editor is the one non-technical clients actually use.**
- **STOP-CHECK-WHAT-A-RECURSIVE-DELETE-ACTUALLY-MATCHES.** `rm -rf plugins/sgs-blocks/reports` was
  aimed at a stray directory a screenshot script had just created; it is a REAL TRACKED directory
  and took out three committed reports. Caught only by reading `git status` afterwards. **Before any
  `rm -rf`, list the path's contents and check `git ls-files` on it.**
- **STOP-A-GENERATOR-THAT-STAMPS-A-TIMESTAMP-DIRTIES-A-TRACKED-FILE-FOREVER.** Two prebuild
  generators rewrote tracked files on EVERY build with only a `generatedAt` / `Last generated` line
  changing (one of them a `--check` run, which must verify and never mutate). The tree was therefore
  never clean — which is precisely why genuinely orphaned files sat for weeks being described as
  "another track's uncommitted work". **A permanently dirty tree destroys the signal that tells you
  what is actually outstanding. Skip the write when only the stamp would change.**
- **STOP-AMENDING-A-RULES-STATEMENT-IS-NOT-AMENDING-ITS-DISTRIBUTION.** The placement rule was
  corrected in its canonical section while 9 of 12 per-control-type `Tab` fields still stated the
  retired version, and the wired `01-tab-group` scanner still printed it as its fix instruction to
  every developer who hit a finding. A 4-rater `/qc-council` found it. **A rule that lives in N
  places plus a tool's output is not amended until all N+1 agree — grep for its RESTATEMENTS and its
  ENFORCERS, not just its definition.**
- **STOP-CHECK-PRIOR-ART-BEFORE-DERIVING-A-RULE-AND-CHECK-THE-STANDARD-IS-ONE.** A two-step
  placement rule was derived from first principles and taken to a council before anyone asked what
  WordPress core and the market do. Core has **no** semantic Settings/Styles rule at all (the Styles
  tab is a hard-coded list of native support categories; Settings is the `default` group) — so every
  attempt to apply "the standard" produced a different answer because there was no standard. Three
  competitors had already converged on an answer. **Read the SOURCE, not the docs, and ask whether
  the standard you are amending exists.**
- **STOP-DYNAMIC-DOES-NOT-MEAN-UNCORRUPTIBLE.** The `wp-content-guard` downgrade rests on "every SGS
  block is dynamic, so there is no saved HTML to invalidate". True for LEAF dynamic blocks. A
  slot-bearing composite still stores its CHILDREN: a hand-written
  `<div class="wp-block-sgs-container">` wrapper made every probe container INVALID in the editor
  while rendering perfectly on the frontend (render.php ignores stored markup). **`save()` decides
  what may be hand-written — read it before authoring block markup.**

### E10. Earned 2026-08-09 — Spec 35 tier-2 placement session (D537-D538)

- **STOP-VALIDATE-A-DETECTOR-AGAINST-A-KNOWN-ANSWER-BEFORE-QUOTING-ITS-NUMBER.** A new contested-
  placement detector was built, run, and its output (**175 attributes across 20 blocks**) reported to
  Bean as a finding — and written into a commit message. The true figure was **25**. It was counting
  attributes an element had ALREADY claimed with an explicit `attrMap` entry as "ambiguous". One
  minute spent on `sgs/container`, whose `grid` element visibly declares 8 of its 13 reported
  conflicts, would have caught it. **A detector's first output is a hypothesis. Run it against a case
  whose answer you already know BEFORE the number leaves your context.** Sibling of
  `validate-grading-tool-against-gold-standard` — this is that rule applied to a tool built minutes
  earlier, which is exactly when it feels least necessary.
- **STOP-A-ROW-EXISTING-IN-THE-DATA-IS-NOT-THE-GATE-ACCEPTING-IT.** `input:media-source` and
  `input:code-svg` are genuine rows in `setting-registry.json` — enumerated and confirmed. The change
  built on them was still rejected, because `check-cluster-coverage.py:65` indexes ONLY `css:*` and
  `anim:*` rows and then requires every member key to be in THAT index. **Read the gate's index, not
  the source data. "The row exists" and "the gate will accept it" are different claims needing
  different evidence.**
- **STOP-CALLING-A-SHARED-GATE-CHANGE-SMALL-BEFORE-READING-THE-GATE.** Twice in one session a change
  to `cluster-member-sets.json` was described to Bean as low-risk — first "advisory, nothing breaks"
  (true of one consumer, false of the other), then "no new vocabulary needed" (refuted on execution).
  `check-cluster-coverage.py` is **BLOCKING GATE 1/3** inside `run-consistency-gates.py`, the FIRST
  command in `prebuild`. **Before characterising blast radius, enumerate every consumer of the file
  and check whether each is blocking or advisory. A reassurance is a claim and needs the same
  evidence as a finding.**
- **STOP-A-PEERS-ACCOUNT-OF-YOUR-OWN-WORKTREE-IS-A-HYPOTHESIS.** A peer agent reported it had
  clobbered uncommitted work with `git checkout` and helpfully supplied a reconstructed patch to
  re-apply. `git diff --stat` showed the work **intact** — 35 lines still modified, guard strings
  present, self-test naming the guard. Applying the reconstruction would have installed the fix a
  SECOND time on top of itself. **Verify your own tree before acting on anyone's account of it,
  including a confident one offering a fix.** Corollary: commit early on a shared worktree, because a
  peer that ran `git checkout` once can run it again.
- **STOP-A-MANIFEST-NOTE-CAN-BE-WRITTEN-FROM-A-FILE-SCOPED-SEARCH.** `sgs/nav-menu`'s `bar` element
  carries `"Remaining ARRANGEMENT members are honest GAPs ... with no attribute"`. All nine ARE
  declared with real defaults and ARE consumed — in shared `includes/`, not the block's own files.
  The note's author looked at the block's own `style.css` and concluded absence. The SAME blind spot
  produced a reviewer's false finding the same night ("91 dead attrs" — actually consumed in
  `includes/`; the repo's own gate reports 3). **A prose note asserting absence is evidence about
  where its author searched, not about the codebase.**
- **STOP-A-COMMIT-THAT-STAGES-NOTHING-STILL-COMMITS.** `git add fileA fileB fileC` failed on a stale
  pathspec (fileC had been renamed) and staged NOTHING — but the following `git commit` succeeded
  anyway, capturing an earlier `git mv` and producing a commit whose message described 140 lines it
  did not contain. Caught only by `git status` showing both files still modified afterwards.
  **`git add` is not atomic with the commit that follows it. Verify with `git show --stat HEAD`, not
  the fact that commit exited 0** — this is the sibling of the existing "a commit that succeeds in
  terminal output can be silently BLOCKED" entry, from the opposite direction.

### E11. Earned 2026-08-09 — D540-session verification-method audit (nav-menu wrapper exit + doc sweep)

- **STOP-A-SUBSTRING-MATCH-IS-NOT-A-WORD-MATCH.** Twice in one session a substring search produced a
  false positive that reached the owner: `columns` was reported "wired" on `sgs/nav-menu` because the
  string appears inside `listColumns` (the actual wired control) and inside label text — a
  word-boundary search (`\bcolumns\b`) showed zero real bindings. Earlier the same day `layout`/`gap`
  were similarly over-counted by the same shape of search. **The second occurrence happened AFTER the
  weakness had been explicitly named in-session** — naming a method's blind spot once does not retire
  it; the next search still has to be written correctly. **Rule: a bare string search over identifier-
  or attribute-shaped text is a substring match by default — wrap it in a word boundary
  (`\b…\b`, or a language-aware AST/property lookup) before trusting "found" or "not found" for a name
  that could be a fragment of a longer one.** Sibling of STOP-A-GREPS-BLIND-SPOT-IS-THE-SHAPE-OF-THE-GREP
  (pattern-shape blind spots in general) and STOP-WP-STYLE-SUBSTRING-COLLISION (the same class of bug,
  but in a shipped CSS selector rather than in a diagnostic search).
- **STOP-A-CASE-SENSITIVE-GREP-CAN-MANUFACTURE-A-FALSE-ALL-CLEAR.** A verification grep for
  `block-level panel` (lower case) reported zero hits and was read as "no surface still teaches the
  retired rule" — a commit then closed on that claim. The retired phrase was present, printed in
  capitals (`BLOCK-LEVEL panel`) by the wired script's own output, and a reviewer using a
  case-insensitive grep found it immediately. **Rule: any grep used to prove an absence of PROSE
  (as opposed to a code identifier, which usually is case-sensitive by convention) must be run
  case-insensitively (`grep -i`), or explicitly justified as case-sensitive** — a search that
  structurally cannot match a legitimate casing of its own target is not evidence of absence.
  Sibling of STOP-A-SUBSTRING-MATCH-IS-NOT-A-WORD-MATCH (same session, same family: the search tool's
  default mode was quietly narrower than the claim built on top of it).
- **STOP-A-DRY-RUN-THAT-EXITS-BEFORE-THE-WRITER-CANNOT-REPORT-ITS-OWN-SUBJECT.** A seeding script's
  `--dry-run` branch counted blocks and attributes, then hit a `continue` and returned BEFORE reaching
  the supports-writing code — so its preview column (`updated_supports`) printed **0** on every run,
  including runs where three blocks genuinely differed and would have been rewritten for real. The
  flag was honest about not mutating (unlike STOP-A-FLAG-NAMED-CHECK-IS-NOT-ALWAYS-A-DRY-RUN, where the
  flag lied); the bug is structural — the preview path physically cannot reach the value it claims to
  preview. **Rule: a preview/dry-run branch needs the same can-this-report-a-non-zero-result proof as a
  gate needs a can-this-fail proof (STOP-A-GATE-THAT-CANNOT-FAIL-READS-GREEN-FOREVER) — plant a case
  the dry-run SHOULD flag and confirm its own report shows it, before trusting a clean dry-run over
  real state.**
- **STOP-GROUP-FIXES-BY-MECHANISM-NOT-BY-SYMPTOM-COUNT.** Four blocks shared one symptom — container
  attributes declared with no inspector controls anywhere — and were grouped by raw COUNT
  (`physics-canvas 79, nav-menu 17, site-header-row 12, site-footer-row 12`) into a single proposed
  remedy. Investigation into what each block's markup actually does showed the count was coincidental
  and the correct remedies were OPPOSITE: `nav-menu` is specialised and should EXIT the shared wrapper
  entirely (the wrapper's arrangement CSS never lands on the element the operator's children sit in);
  `site-header-row`/`site-footer-row` are genuine containers whose missing controls should be WIRED, not
  removed. Grouping by symptom-count alone would have deleted real capability from two generic blocks
  to match a fix aimed at a third, unrelated one. **The separating test is mechanism, never a count:
  does the shared code's arrangement/behaviour actually reach the elements the operator is trying to
  control?** Verify by tracing the selector/attribute the shared code emits to, not by how many
  unwired attributes two blocks happen to share. Sibling of
  STOP-FIXING-ONE-INSTANCE-OF-A-FAILURE-CLASS-DOES-NOT-IMMUNISE-THE-NEXT (same-symptom instances can
  still need different fixes) and D538/D539 in `decisions.md` (the worked example this entry is drawn
  from).
- **STOP-A-BANNED-PHRASE-GATE-CAN-BE-TOO-BROAD-AND-TOO-NARROW-AT-ONCE.** A pattern banning a retired
  rule's exact wording fired on the DOCUMENTATION recording that rule's retirement (a false positive —
  the phrase was being quoted in order to strike it, not asserted as live), while missing the same
  phrase where a different file had line-wrapped it across two lines (a false negative — the substring
  no longer appeared on one line for the pattern to match). Both failures come from the same design
  choice: gating on an exact phrase gives you neither reliable recall (line-wraps, paraphrases, casing
  defeat it — see the case-sensitivity entry above) nor reliable precision (any file quoting the phrase
  to explain its own retirement trips the same alarm as a file still asserting it). **A phrase that
  must be quoted verbatim to say it is retired cannot be banned by literal substring — gate on
  STRUCTURE (is this phrase inside an active rule statement vs. inside a "RETIRED:"/"superseded"
  annotation?) or accept the false-positive rate and hand-triage it, but do not trust the raw hit count
  either way.** Sibling of STOP-AMENDING-A-RULES-STATEMENT-IS-NOT-AMENDING-ITS-DISTRIBUTION (a retired
  rule's wording surviving in N places) and STOP-A-GATES-EVIDENCE-PREDICATE-CAN-BE-TOO-BROAD-TO-MEAN-ANYTHING.
- **STOP-IDE-DIAGNOSTICS-CAN-BE-A-STALE-MID-EDIT-SNAPSHOT.** Undefined-variable errors appeared in the
  IDE diagnostics pane for three files while a subagent was still mid-edit on them; treating the
  diagnostics as ground truth would have meant reporting a live defect. Reading the files directly
  showed zero undefined-identifier hits — the diagnostics pane was showing a stale intermediate parse
  from a save that had already been superseded. **Rule: the IDE diagnostics pane is a CACHE with its
  own refresh lag, not a live oracle — when a diagnostic surfaces during or immediately after
  concurrent/subagent edits, re-verify against the file's actual on-disk content (Read, or a fresh
  lint/typecheck run) before acting on it.** Sibling of STOP-NODE-CHECK-VALIDATES-SYNTAX-NOT-SCOPE and
  STOP-VERIFY-THE-VARIABLE-EXISTS-BEFORE-BUILDING-ON-IT (both: a tool's verdict about identifiers needs
  a second, direct check) — here the tool itself was simply out of date, not wrong in kind.
- **STOP-A-MEASUREMENT-CAN-BE-BLIND-BEHIND-AN-IFRAME-BOUNDARY.** `canvasRendered: false` was reported
  for three blocks and read as a rendering defect; the probe was querying `document` at the PARENT
  level while the WordPress block editor renders its canvas inside an `<iframe>`. Re-querying inside
  the iframe's own document showed all three rendering correctly. **Rule: before trusting any
  editor-canvas DOM query (element counts, computed styles, visibility checks), confirm whether the
  target frame is the top document or the editor iframe — a query scoped to the wrong document returns
  a clean-looking "not found" that is actually "not looked at".** Same family as
  STOP-A-ZERO-FROM-AN-UNAUTHENTICATED-FETCH-PROVES-NOTHING and
  STOP-A-A-PROBE-THAT-NEVER-REACHES-THE-EFFECT-IS-MEASURING-THE-PROBE (a "false" reading that is really
  a description of where the probe looked, not of what exists) and STOP-THE-EDITOR-IS-WHERE-THE-CLIENT-LIVES
  (the editor surface needs its own verification path, not an assumption inherited from the frontend).
- **STOP-A-BARE-SELECTOR-MATCHES-THE-FIRST-INSTANCE-IN-DOCUMENT-ORDER-NOT-YOUR-TEST-BLOCK.**
  `document.querySelector('.wp-block-sgs-container')` on a live verification page returned the SITE
  HEADER's nav container (same shared block type, renders before `<main>`) instead of the test
  content block further down the page — silently, no error, `display:flex` where `display:grid`
  was expected. **Rule: scope every live-verification DOM query to the content container
  (`.entry-content <selector>`) or the block's own unique uid class, never a bare block-type class
  — any WP page with header/footer chrome can share that class with content.** Same family as
  STOP-A-MEASUREMENT-CAN-BE-BLIND-BEHIND-AN-IFRAME-BOUNDARY (wrong document) — here the document is
  right but the match is the wrong ELEMENT within it. Session 9, 2026-08-11.
- **STOP-DO-NOT-WRITE-A-FIGURE-INTO-A-COMMIT-OR-REGISTRATION-BEFORE-MEASURING-IT.** "Measured: 0
  findings" was written into a rule registration ahead of the rule's first real run — a plausible,
  optimistic placeholder rather than an observed value — and the first actual run returned **1**. The
  figure had already been quoted as fact by the time the real number existed. **Rule: a field labelled
  "measured" or "verified" is a factual claim, not an expectation — never write one until the
  command that produces it has actually been run for this specific artefact, even when the true answer
  seems obvious or the run is "about to happen anyway".** Extends STOP-A-PROSE-CLAIM-IN-A-REPORT-IS-NOT-A-COMMITTED-ARTEFACT
  and STOP-VALIDATE-A-DETECTOR-AGAINST-A-KNOWN-ANSWER-BEFORE-QUOTING-ITS-NUMBER to the moment BEFORE a
  number exists at all — the same discipline the memory index calls
  `never-claim-a-gate-field-you-did-not-measure`, now surfaced here as a catalogue entry rather than
  living only in `MEMORY.md`.
- **STOP-A-METRIC-THAT-GETS-CHEAPER-WHEN-YOU-HIDE-THINGS-IS-NOT-A-PROGRESS-METRIC.** A library-wide
  inspector census was measured, looked authoritative (median 12, max 49, total 1121), and was
  **rejected as a baseline** (D543): it scored any custom composite as ONE row without descending, so
  wrapping a block's 30 controls in one component would have taken it 31 → ~2 with **zero** client
  benefit. It also could not see native `supports` panels (64 of 83 blocks declare one, rendered by
  core with no JSX to walk) or the extensions directory, and it summed mutually-exclusive conditional
  branches as simultaneously visible — so its error had **two signs** and could not even be given a
  direction. Live measurement then proved it did not merely undercount but **MIS-RANKED**: the block
  scoring near-best (8) shows a client ~50 controls, and one scoring 28 shows more than one scoring 45
  (D544). **Rule: before adopting any number as a progress metric, ask "what is the cheapest way to
  make this number fall, and does that action help the user?" If the cheapest path is hiding or
  re-nesting rather than removing, the metric is unfalsifiable as evidence of improvement — and
  validate its ORDERING against ground truth, not just its magnitude.** Sibling of
  STOP-VALIDATE-A-DETECTOR-AGAINST-A-KNOWN-ANSWER-BEFORE-QUOTING-ITS-NUMBER; the instrument was not
  broken, it was a 2-block tool repurposed as an 83-block one, and its own self-test *certified* the
  defect as the expected answer.
- **STOP-A-BUILT-DETECTOR-WITH-NO-WIRING-IS-UNREACHABLE-GREP-PACKAGE-JSON.** Five survey detectors —
  built, self-tested, committed, ~4,600 lines — had **zero** `package.json` references. Nothing was
  broken; they were simply invisible to anyone who did not already know the file paths. This is the
  third recorded instance in this repo (`a-gate-can-be-built-and-never-wired`: 5 enforcers / 0 refs;
  D493: `check-dead-pattern-attrs.py` unwired for three weeks while the docs described it as a
  standing defence). **Rule: shipping a detector is not done until it is reachable by a named command —
  grep `package.json` (or the hook/skill that invokes it) and prove the command runs, in the same
  commit that builds it.** ⚠ Corollary in the other direction, equally important: **absence from
  `package.json` is NOT evidence of orphaning** — most of this repo's scripts are invoked on demand
  from docs, hooks or sibling scripts. Separate by MECHANISM (who calls it), never by count. And a
  census with no `--check` mode must **not** be added to `prebuild` to "wire" it: putting a
  non-gating script in a gate chain is enforcement theatre.

- **STOP-A-ZERO-FROM-THE-WRONG-JSON-KEY-LOOKS-EXACTLY-LIKE-A-CLEAN-PASS.** `inspector-scan --json`
  has **no top-level `findings` key** — findings live at `rules[].findings`. Reading the wrong key
  returns `[]`, and an empty array is indistinguishable from a genuinely clean run. On 2026-08-10
  this produced **five** vacuous zero-readings in one session, and **two of them were briefly read as
  evidence that a working rule could not fire** — nearly reverting a correct rule. **Rule: before
  trusting any zero from a JSON report, print the top-level keys and confirm the array you are
  reading is the one that carries findings; then filter to `status:"FLAGGED"`** (raw arrays include
  BASELINED entries — rule 21 reads 141 raw vs 129 flagged). Sibling of the existing
  positive-control rule: a zero you cannot make non-zero on demand is not a measurement.

- **STOP-GETBOUNDINGCLIENTRECT-IS-NOT-A-VISIBILITY-TEST.** It reports the **layout box** and knows
  nothing about an ancestor's `overflow:hidden`, a zero-width parent, or the viewport edge. A toggle
  that was fully clipped and off-screen still reported `32x106`, which read as "it is bleeding over
  the canvas" — one of **three** false regression alarms from the same cause in a single session.
  **Rule: for "is it visible?", hit-test with `document.elementFromPoint(cx, cy)` and confirm the
  returned element IS the target or a descendant.** Same family as the collapsed-`ToolsPanel` and
  the probe-that-never-reaches-the-effect entries: the number was real, the inference was not.

- **STOP-A-GREEN-BUILD-PROVES-ALMOST-NOTHING-ABOUT-EDITOR-JS.** `lint:js` is **not** in the
  `prebuild` chain, so an undefined identifier or an unused import ships through every gate. Worse,
  an unprefixed `__experimental*` import from `@wordpress/components` is `undefined` at runtime
  (React minified error #130) with a perfectly clean build — the component simply never mounts. On
  2026-08-10 the first deploy of the device toggle did exactly this: **the stylesheet loaded and the
  component did not**, so a CSS-only positive control would have reported a pass. **Rule: editor-JS
  changes are verified in the live editor, in BOTH the post and site editor, with a `data-*` mount
  marker asserted — never on build exit code alone. Ship two positive controls when the delivery
  mechanism (CSS) and the behaviour (React mount) can fail independently.**

### E12. Earned 2026-08-10 (session 2) — Spec 35 Phase 1.4 / fully-responsive wrapper (D548-D551)

- **STOP-A-TEXT-COUNT-OF-AN-IDENTIFIER-DISCUSSED-IN-COMMENTS-IS-WRONG-BY-CONSTRUCTION.**
  `<ContainerWrapperControls` appears in PROSE in six files whose comments record that they
  STOPPED using it. A text count therefore counts documentation of ABSENCE as evidence of
  PRESENCE. This contaminated **three separate counts in one session**: "24 mounts, 19 omitting
  kind" (really 16, all passing `kind`), and then a "10 layout / 6 content" split shipped in a
  commit message (really 11/5). **Naming the trap twice did not prevent the third.** Sibling of
  STOP-A-GREP-FOR-A-CLASS-NAME-IS-NOT-A-USAGE-CENSUS, but sharper: when an identifier is
  DISCUSSED as often as it is USED, no amount of care makes a text search correct. **Rule: count
  JSX/AST ELEMENTS, not text matches, for any identifier that appears in comments.** The 24-count
  error put an unreachable dead panel at the top of a phase plan.
- **STOP-REBUILD-THE-TREE-TO-MEASURE-A-HISTORICAL-BASELINE.** Three different values for the same
  figure were in circulation (author 243/257, LEDGER 254, rater 245/259). The dispute was settled
  by `git archive <sha> -- plugins/sgs-blocks theme | tar -x`, symlinking `node_modules`, and
  running the REAL scanner against the reconstructed tree — a third independent run agreed with
  the rater, and BOTH other figures were wrong. ⚠ **`theme/` MUST be included in the archive** —
  omit it and rules reading `ctx.themeDir` silently mis-measure (the rater caught this as its own
  probe defect mid-run). **Rule: a remembered number is not a baseline. Rebuild the tree.**
- **STOP-A-SHAPE-MISMATCH-CAN-PAINT-A-LITERAL-`Array`-ON-A-LIVE-PAGE.**
  `sgs_responsive_normalise_object()` treated an array with no tier keys as a plain scalar and
  assigned THE ARRAY ITSELF as the desktop value, which the formatter stringified — emitting
  `max-width:Array` into production CSS. An empty `{}` is exactly what an UNTOUCHED object-typed
  attribute looks like, so this was the COMMON case, not an edge case, and it had been shipping on
  the header/footer rows since FR-37-16. **Rule: when adding an object-typed attribute, test the
  EMPTY-OBJECT default explicitly — `{}` is the state every instance starts in, and it is the one
  nobody writes a test for.**
- **STOP-A-PAGE-HTML-GREP-CANNOT-SEE-LIFTED-CSS.** Three consecutive probes reported the gallery's
  band and padding as missing. All three were wrong: SGS block CSS is LIFTED into
  `uploads/sgs-css/<hash>.css` and is not in the page HTML at all; and a follow-up regex for the
  stylesheet link missed it because the filename is `sgs-1303-<hash>.css`, not the shape assumed.
  A fourth probe (a brace-greedy verification regex) then failed on nested JSON — the exact trap
  the migration script itself had been written to avoid. **Rule: to verify SGS block CSS, FETCH
  THE LIFTED STYLESHEET. A page-HTML grep proves nothing.** Four probe defects in one verification
  is the signal that the instrument, not the code, is under test.
- **STOP-DEAD-CSS-IS-STATICALLY-DECIDABLE-BUILD-THE-DETECTOR.** Twice in one session CSS was found
  that could never match, both times by hand-reading code or checking a live page. Both were the
  SAME shape: a selector whose precondition the emitter provably never produces (CSS gated on
  `[style*="--sgs-…"]`; PHP emitting that property only inside a scoped `<style>`, never a
  `style=""` attribute). **This does not need a browser.** `survey-dead-css.py` now detects it and
  was PROVEN against a frozen pre-fix snapshot, flagging both historical bugs at their exact
  lines. **Rule: when a defect is found by eye twice, the third instance is the detector's job —
  and validate the detector against the history it was built from, not against fixtures alone.**
- **STOP-CHECK-WHETHER-A-THING-IS-USED-BEFORE-INVESTING-IN-MAKING-IT-CORRECT.** A dead-CSS bug in
  `hover-effects` had been inert for MONTHS with nobody noticing — because nobody uses the feature
  (measured: ZERO stored hover attributes across 194 canary pages/posts, positive control 1706).
  A subagent branch was spent fixing it; Bean then directed that the whole extension be
  disconnected and made opt-in (D551), making the repair effort largely moot. **Rule: a defect
  nobody can trigger is weak evidence the feature is worth having. Run the usage census BEFORE
  dispatching work at a legacy surface — it is one command, and it redirects whole branches.**
- **STOP-AN-INHERITED-DEFERRAL-IS-A-HYPOTHESIS-EVEN-WHEN-YOU-WROTE-IT.** D549's own Stage-2 note
  deferred eight properties because they "emit onto a DIFFERENT selector". A subagent verified the
  claim and it was FALSE — they land on exactly the same `$grid_sel`, so all eight joined the
  existing emission call with no new plumbing. The deferral reason was written hours earlier in
  the same session by the same author. **Rule: verify a deferral before executing it, including
  your own from earlier today.** Sibling of `verify-a-deferral-before-executing-it`.
- **STOP-FACT-CHECK-EVERY-RATER-FINDING-BEFORE-APPLYING-IT.** A QC council returned three real
  defects, but one was OVERSTATED 6x (it reported all six new tier-capable properties as exposed
  to an Array-to-string fatal; fact-checking showed only ONE was — the other five were already
  protected by strict `in_array()` allowlists that reject an array and fall back to a default). A
  second rater's framing challenge was refuted in code. A third rater was right where the author
  was wrong. **Rule: raters are evidence, not verdicts. Check each finding against source before
  changing anything — the correct fix is often narrower than the report.**
- **STOP-NEVER-DISPATCH-AN-AGENT-ONTO-A-FILE-YOU-ARE-STILL-EDITING.** Mid-migration on
  `class-sgs-container-wrapper.php`, a rename agent was dispatched at that same file. It renamed the
  variable's DEFINITION and left 7 references dangling; PHP treats an undefined variable as falsy, so
  the container-query feature went silently OFF for three blocks — and `php -l` passed, because an
  undefined variable is not a syntax error. The half-renamed file reached the canary before the IDE
  diagnostics surfaced it. This is STOP-2/STOP-39 (one writer per file) violated by the ORCHESTRATOR
  rather than by parallel subagents. **Rule: before any dispatch, list the agent's target files and
  confirm none is in your own working set. And `php -l` is not a safety net for a rename — grep the
  old identifier to zero.**
- **STOP-A-LINTER-THAT-PASSES-IS-NOT-A-CHECK-THAT-THE-THING-WORKS.** Same incident: `php -l` reported
  "No syntax errors detected" on a file whose central control variable no longer existed. The check
  ran, was green, and was blind to the defect by construction. **Rule: match the check to the failure
  mode. For a rename, the check is "zero occurrences of the old name", not "the file still parses".**
- **STOP-SCOPE-A-DOM-QUERY-OR-YOU-WILL-MEASURE-THE-WRONG-ELEMENT.** A live positive control reported
  FAILURE (`gap: normal`) for a migrated block. The probe used
  `document.querySelector('.wp-block-sgs-container')`, which returned the SITE HEADER — also a
  container, and earlier in the DOM. Scoped to the post content, the same probe returned the correct
  64px/8px. A confident false failure was reported to Bean off the back of it. **Rule: scope every
  live-DOM probe to the region under test, and assert the element you found is the one you meant.**
  Sibling of `confirm-what-your-output-describes`.
- **STOP-NEVER-SELECT-A-TARGET-WITH-A-GLOB-ON-A-MULTI-TENANT-SERVER.** `ls ~/domains/*/public_html |
  head -1` resolved to `feldeluxe.com` — a site with ZERO SGS blocks — and the resulting "0 hero
  instances, 0 stored values" was used to justify deleting two attribute families as a no-op. There
  are **11 WordPress installs** on that host. Re-measured against the real canary: 175 heroes and 14
  affected rows. The conclusion survived only because all 14 were revisions or trash. **Rule: name
  the full site path explicitly, every time. A glob picks whatever sorts first and reports about it
  with total confidence.**
- **STOP-AN-IDEMPOTENCY-RUN-IS-A-CONTROL-AND-IT-CATCHES-INVERTED-RULES.** A new seeding step designed
  to clear a fossil column cleared 12 LEGITIMATE tier-sibling rows instead — its rule inverted, because
  a sibling is also object-typed and has no siblings of its own, so it read as a collapsed base. It was
  caught only because the second run reported `cleared=12` where a correct step must report `0`.
  **Rule: any "clean up X" step must be run TWICE and must report zero the second time. A step that
  keeps finding work is not idempotent — it is wrong.**

### E13. Earned 2026-08-11 (session 5) — Spec 35 pass 1: `gap` → tier object (D563)

- **STOP-VERIFY-THE-EFFECT-LANDED-NOT-THE-EXIT-CODE.** Two separate silent failures in one session,
  and **both produced output that looked exactly like success**. (1) `build-deploy.py` **ABORTED** on a
  missing `build/` directory; the capture that followed ran happily and reported values identical to
  the "before" run — which is precisely what a correct result looks like. It was caught only by
  fetching the deployed `block.json` over HTTP and finding the attribute still present. (2) A
  `git stash push` / `git stash pop` cycle **reported success and dropped the content change**; the
  follow-up `git diff --stat` showed a large diff, which read as "restored", but that was line-ending
  churn masking the fact that the real 5 lines were gone. **Rule: after any deploy or any
  stash/restore, verify the EFFECT — fetch the deployed artefact, or diff with `--ignore-cr-at-eol`.
  An exit code of 0 and an unchanged measurement are both consistent with nothing having happened.**

- **STOP-A-CONTROL-PRIMITIVE-MUST-MATCH-ITS-STORAGE-SHAPE.** Migrating `gap` to an object-typed
  attribute without migrating the control that writes it left **19 of 21 blocks with a destructive
  inspector, live on the canary for a day**. `ResponsiveControl` writes one flat attr per tier; once
  `gapTablet`/`gapMobile` were deleted WordPress discarded both silently (D338), and its desktop
  branch wrote a STRING into an object-typed attr, which coerces to the default and **destroys the
  whole setting**. Every static gate passed. **Rule: storage shape and control primitive change in
  the SAME commit — `ResponsiveControl` for flat siblings, `ResponsiveOverride` for an object base —
  and the writers are found by grepping `edit.js`, `components/` AND `extensions/`. A SHARED
  component is the high-risk case: one file fed 19 blocks here.** Governing text:
  `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` PART O §12 field 3.

- **STOP-THE-FRONTEND-IS-NOT-THE-EDITOR-AND-A-SCRIPTED-VALUE-NEVER-TOUCHES-THE-INSPECTOR.** The prior
  session's verification set values programmatically, so they were already the correct shape and the
  inspector — the surface carrying the bug — was never the input path under test. **Rule: after any
  attribute-shape change, open the editor: register → render the control → write a value → assert the
  STORED shape → assert no flat siblings → assert zero console errors.** Sibling: D567, reached
  independently the same day by the other track from a JSX reference to a deleted symbol, which is
  likewise invisible to every static gate here.

- **STOP-SUPPORTS-ANCHOR-IS-NOT-THE-SAME-AS-HONOURING-IT.** WordPress applies `anchor` automatically
  only when a block renders through `get_block_wrapper_attributes()`. Blocks that hand-build their
  wrapper (measured: site-header, site-footer, their rows, multi-button, feature-grid) **drop it
  silently** — no id appears, the probe matches nothing, and the run reports a missing measurement
  that is indistinguishable from a real regression. **Rule: never depend on the block under test
  honouring an anchor. Wrap each fixture instance in a container that provably honours one, and select
  the block as its child.**

- **STOP-GATE-RESULTS-ARE-UNRELIABLE-WHILE-ANOTHER-SESSION-IS-WRITING.** A build failure chased for
  ~20 minutes was a co-active track mid-edit on a lint baseline; the same gate went green on its own
  minutes later with no change from this side. **Rule: on a shared worktree, before diagnosing a gate
  failure, establish whether it also fails at HEAD and whether another session is actively writing.
  Attribute first, debug second.**

**D101 carry-forward receipt for E13.** Verified by `python .claude/hooks/handoff-preflight.py --check`
— the authoritative mechanical count — **not** by hand-arithmetic, and deliberately so: a hand regex
over this file returns 161 because the catalogue mixes `### STOP-X` headings with `- **STOP-X.**`
bullets, and any single pattern under-counts one shape. **202 → 207. 207 >= 202. PASS.** Five added,
zero removed. `stop-floor.json` bumped 201 → 206 in the same edit (the floor deliberately excludes the
14 numeric phantoms, which remain cited-but-undefined). All five are earned by failures that actually
occurred this session: an aborted deploy and a dropped `git stash` that both reported success; a
control primitive that did not match its storage shape and shipped a destructive inspector on 19
blocks; a frontend check that could not see an editor-only defect; a declared `supports.anchor` that
was never honoured; and a gate failure that belonged to a co-active session, not to this one.

### E14. Earned 2026-08-13/14 — editor-render-parity detector accuracy session (D615-D616)

- **STOP-AN-EXEMPTION-HEURISTIC-NEEDS-A-NEGATIVE-CONTROL-PROVING-IT-DOESNT-OVERMATCH.** Built a new
  detector signal (block-wide: "render.php has real CSS but edit.js mirrors none of it → exempt")
  from ONE observed real case (`sgs/site-header`). Its own self-test suite's Signal-1 negative
  control — built for a DIFFERENT signal — caught it wrongly exempting a fixture that should stay
  flagged, because the new signal cannot distinguish "architecturally cannot preview" from "nobody
  has built the preview yet" — both produce the identical observable shape. **Rule: before shipping
  ANY new exemption/allowlist heuristic, write a negative-control fixture sharing the heuristic's
  observable shape that should NOT be exempted, and prove the heuristic doesn't fire on it — not
  just a positive fixture proving it does fire on the intended case.** Reverted rather than shipped.
  Full lesson: `feedback_an_exemption_heuristic_needs_a_negative_control_proving_it_doesnt_overmatch.md`.

- **STOP-VISUAL-DIFF-REPORT-SOURCE-SHA-IS-A-CONTENT-HASH-NOT-A-COMMIT-HASH.** Wrote a visual-diff
  report's `source_sha` frontmatter field as the current git commit's short hash, twice, and the
  commit gate rejected both — the field must be the output of
  `python plugins/sgs-blocks/scripts/visual-report-sha.py <block>` run against the STAGED content
  (a hash of the block's own source bytes, independent of git history). **Rule: read the gate's own
  error text for the exact expected value rather than guessing which hash it wants — it prints
  "staged content is X" directly.**

- **STOP-VISUAL-DIFF-REPORT-IS-ONE-FILE-PER-TOUCHED-BLOCK-DIRECTORY-NOT-PER-LOGICAL-CHANGE.** A
  single fix spanning `sgs/accordion` + `sgs/accordion-item` (parent providesContext + child
  usesContext) needed TWO report files (`accordion-2026-08-13.md` AND
  `accordion-item-2026-08-13.md`), each with its own `source_sha` — the gate globs
  `reports/visual-diff/<block>-<TODAY>.md` per touched block directory name, not per commit or per
  feature. **Rule: when a fix touches N block directories, expect N report files.**

**D101 carry-forward receipt for E14.** `python .claude/hooks/handoff-preflight.py --check` run
post-edit — three STOPs added, zero removed. This session's other candidate lesson
(`invoke-dispatching-parallel-agents-before-ad-hoc-parallel-dispatch`) was captured to CC memory
only (`feedback_invoke_dispatching_parallel_agents_before_ad_hoc_parallel_dispatch.md`), not added
here — it is a skill-invocation habit, not a failure this repo's own gates could have caught, so it
does not fit this catalogue's scope (anti-patterns THIS project's structural defences guard against).

### E15. Earned 2026-08-15 — shared-worktree commit + subagent-explanation + visual-gate session

- **STOP-A-PATHSPEC-SCOPED-COMMIT-RESTAGES-THE-WORKING-TREE-VERSION-OVER-A-PARTIAL-STAGE.** Passing a
  pathspec to `git commit -m "..." -- <paths>` re-stages the CURRENT WORKING-TREE version of those
  exact paths, overriding any prior selective staging — it does not commit only what was already
  staged for them. A deliberate `git add -p` had excluded two of a concurrent session's uncommitted
  attribute declarations (`sgs/trust-bar`'s `iconCircleShadowColour`/`badgeImageShadowColour`)
  minutes earlier; the pathspec-scoped commit put both onto `main` anyway, inside an unrelated commit
  (`0c287cf6`). No functional damage (inert schema declarations, build stayed green), but on a shared
  checkout this is exactly how another session's half-finished work escapes. **Rule: after ANY commit
  on a shared checkout, verify what actually landed with `git show --stat HEAD` and
  `git show HEAD -- <file>` — never assume careful partial staging survived into the commit.** Sibling
  of STOP-PATH-SCOPED-COMMIT and STOP-CO-ACTIVE-TRACK-ETIQUETTE-ON-A-SHARED-WORKTREE, one layer
  sharper: those two are about the SCOPE of a commit; this one is about pathspec commits silently
  widening that scope back out even when scoped staging was done correctly beforehand.

- **STOP-A-SUBAGENTS-CAUSAL-EXPLANATION-FOR-A-FAILURE-IT-CAUSED-IS-NOT-EVIDENCE.** A wave-2 agent
  introduced a real missing `</ToolsPanelItem>` JSX closing tag that broke the shared build for every
  concurrent agent. Its own final report described the failure as "a transient collision from a
  concurrent agent's simultaneous build" and claimed a clean isolated re-run — but an isolated
  `@babel/core` parse of the file showed a genuine, reproducible syntax error at a specific line, and
  three OTHER agents independently and correctly reported the same real error. **Rule: verify a
  subagent's causal explanation independently, not just its "fixed"/"resolved" claim — an agent
  explaining away its own breakage is the least reliable witness to it.** Sibling of
  STOP-VERIFY-SUBAGENT-FACTS-NOT-JUST-STRUCTURE and STOP-A-WRONG-EXPLANATION-DOES-NOT-MAKE-THE-
  OBSERVATION-WRONG (both: a stated MECHANISM is a separate claim from the observed EFFECT — verify
  each independently), sharpened to the case where the agent reporting the mechanism is the same one
  that caused the effect.

- **STOP-A-PEERS-CLAIM-ABOUT-WHO-CAUSED-A-CHANGE-IS-NOT-VERIFIED-BY-DEFAULT.** On 2026-09-04 a
  peer session's `check-editor-render-parity.js` ceiling raise (211→213) was sitting dirty on the
  shared tree. Another peer session told me directly "it looks like you'd already bumped the
  ceiling yourself" — plausible (the file WAS dirty on my end too), stated with confidence, and
  wrong. `git diff` on that exact file showed the raise cited a comment I had never written
  ("D942/D956 shared-helper text-gradient gate") and touched code I had never opened. Corrected
  before either of us acted on the false attribution. **Rule: when a peer states who made an
  uncommitted change (to credit, blame, or hand off responsibility for it), check `git diff` on
  that specific file yourself before accepting the claim — a peer's read of a shared, actively-
  mutating tree is a hypothesis, not ground truth, even when it sounds confident and even when
  the dirty state is consistent with it being true.** Sibling of
  STOP-A-SUBAGENTS-CAUSAL-EXPLANATION-FOR-A-FAILURE-IT-CAUSED-IS-NOT-EVIDENCE (that one distrusts
  an agent's account of its OWN failure; this one distrusts a peer's account of a THIRD party's
  change) and STOP-VERIFY-SUBAGENT-FACTS-NOT-JUST-STRUCTURE (facts need checking regardless of how
  structurally sound the surrounding report is).

- **STOP-A-FILES-METADATA-NEVER-DECIDES-WHAT-IS-INSIDE-IT.** On 2026-08-17 I was asked whether a
  shared component had been decomposed. I answered from the file's **LINE COUNT** — it had grown from
  1,728 to 1,887 lines, so I concluded no split had happened, wrote that into two governing docs, and
  called it the session's most important finding. I never opened the file. It HAD been split: it
  exported six independently-mountable panels, listed plainly at the top, and blocks were already
  mounting them individually. The line count had grown for an unrelated reason (a gradient rollout
  added real capability). Bean corrected it; the finding was retracted from both docs.
  **The rule: a filename, a line count, a file's existence, a directory listing and a grep-hit count
  are all METADATA. None of them is evidence about what a file contains or does. Open the file.**
  Three sibling instances the same day: a doc's own status line contradicted the gate that actually
  measured it (Spec 32 said "ROLLOUT ONGOING" while the check returned zero violations); three
  separate subagents counted comments saying a component *used to* live somewhere as live usage; and
  a case-sensitive grep for `isDecorative` missed the real attribute `imageIsDecorative`. The
  structural defence is the verification ladder in
  `.claude/plans/archive/2026-08-17-spec-verification-programme.md` — LIVE > SOURCE > TOOL > DOC, where DOC is
  explicitly not evidence and a tool whose own `--self-test` fails drops to DOC tier.

- **STOP-A-DIRECTORY-SCOPED-GATE-CAN-BE-TRIPPED-BY-A-CONCURRENT-SESSIONS-UNRELATED-UNCOMMITTED-FILES.**
  This repo's visual-diff commit gate decides "did this block change visually?" partly by looking at
  a block's WHOLE directory rather than only the staged diff. A `sgs/trust-bar/block.json`-only change
  — provably metadata-only, `check-blockjson-metadata-only.py` exited 0 against the staged content —
  was still blocked, because a concurrent session had unstaged `edit.js`/`render.php` edits sitting in
  the same block folder. **Rule: when a gate blocks a change believed exempt, run the gate's OWN
  standalone checker against only the staged diff before either fabricating evidence or reaching for a
  bypass — and if bypassing is genuinely right, use the scoped `SGS_VISUAL_GATE_SKIP` + mandatory
  `SGS_VISUAL_GATE_REASON` (which logs an audit trail to `reports/visual-diff/manual-skips.log`), never
  `--no-verify` (which disables six unrelated passing gates).** Sibling of
  STOP-A-A-NEW-ATTRIBUTE-IS-A-VISUAL-CHANGE-EVEN-WHEN-NO-CSS-MOVED, whose 2026-08-15 correction is the
  scoped-bypass mechanism this entry names directly; extends it to a second false-trip cause
  (concurrent-session directory contamination, not the block's own genuine attribute additions).

**D101 carry-forward receipt for E15.** `python .claude/hooks/handoff-preflight.py --check` run
pre-edit reported 221 STOPs; three added here, zero removed, zero reworded. 221 → 224. 224 >= 221.
PASS.

### E17. Earned 2026-08-29 — timeline connector FR-38-35 (D879): five instruments, five confident wrong answers

⛔ **STOP-INSTRUMENT-SHAPE — a measurement can be correct, self-consistent, and describe nothing.**
Five separate instruments passed in one session while the feature was visibly broken. Every single
one was caught by opening a screenshot or by Bean looking, never by a gate. They are listed in full
because the SHAPE recurs, not the specifics:

1. **Zero-area element.** `getComputedStyle` reported `display:block`, the correct `stroke`,
   `stroke-dasharray:1px` and a `stroke-dashoffset` animating smoothly `0.992→0.753→0.345→0.108`.
   Every number true. The element was **2px × 2px inside a 383px block** and painted nothing.
   **A style check cannot see a zero-area box.** Assert PAINTED GEOMETRY — a bounding rect against
   its parent, or a pixel sample.
2. **Harness on the wrong axis.** The horizontal arm reported vertical geometry and cried DRIFT.
   The viewport was 700px — *below* the 767px breakpoint — so the block correctly re-laid out and
   the harness walked the wrong axis. **The code was right; the test was wrong.**
3. **A colour detector that excluded its own target.** The predicate demanded `g > 140`; the token
   under test was `rgb(230,138,149)`. It missed by **two units of green** and reported the fill
   SHRINKING as progress grew.
4. **A check with no positive control.** The spark probe asserted `sparks === 0` under reduced
   motion and read that as the gating working. It **never asserted sparks were non-zero when they
   should be** — so it passed just as happily against a feature that did nothing at all, which is
   exactly what it was passing against for two deploys.
5. **A box read at the wrong moment.** Two bounding-box checks reported the connector "10px clear"
   of the date text while the rendered page plainly showed the line through the glyphs. Both were
   taken before `scrollIntoView` had settled. **A box read at the wrong moment is not evidence.**

⛔ **STOP-DECOR-IN-FALLBACK — never put a decorative layer inside a fallback driver.** The spark
spawner lived inside the JS driver, which returns early when the browser has native
`animation-timeline`. Sparks therefore existed **only on Firefox** — the inverse of what was wanted,
and invisible to everyone who looked. A decorative layer must observe the progress VALUE, whoever
wrote it.

⛔ **STOP-WHITE-ON-LIGHT — a hardcoded `#fff` decoration vanishes on any light ground, and it comes
back.** Shipped three times: as 3px white dots (measured 1.06:1 on cream), then re-introduced as the
white *core* of the replacement gradient (1.04:1), and masked both times by an easing that shrank
them before they travelled. On a light page a light mote can never read — go DARKER, keyed to the
client's own token. This is the owner's own standing rule applied literally: **a mid-luminance brand
accent is a GROUND, not an indicator.**

⛔ **STOP-SELF-CHECKOUT — `git checkout -- <your own file>` destroys your own uncommitted work.**
Used to undo a bad edit mid-session; it reverted to the last commit and silently took an
unrelated, uncommitted fix with it. The shared-tree stash ban exists for peers — this is the
same hazard turned inward. Commit first, or copy to scratch, then revert.

### E18. Earned 2026-08-30 — client-controls track: a green dead-control gate proved consumption, not paint

⛔ **STOP-CONSUMED-IS-NOT-PAINTED — a control fully "consumed" by render.php can still paint
nothing, because nothing checks that its emitted CSS matches a live selector.** `check-dead-controls`
only proves the attribute is READ (destructured, interpolated into a CSS string, written to the
page). It never proves the resulting declaration lands on a selector any rendered element matches.
On cta-section and trust-bar, ~30 client-facing controls were fully wired end-to-end — read by
render.php, emitted into a `<style>` block — and painted nothing, because the emitted selector never
matched the markup (fixed `b59f8cd3f`). The gate was green the entire time; a client had been turning
dead dials for an unmeasured stretch. **Rule: "consumed" and "painted" are two different claims with
two different proofs. A dead-control gate closes the first; only a live DOM read (the emitted
selector actually present on the rendered element, the property actually taking the control's value)
closes the second.** Sibling of STOP-4 (written not landed) and STOP-A-CSS-RULE-THAT-CANNOT-WORK-
STILL-LOOKS-CORRECT-IN-SOURCE, sharpened to the specific case of a selector/markup mismatch hiding
behind a fully-wired attribute pipeline. Nobody has yet swept the other 82 blocks for the same
shape — treat any block passing `check-dead-controls` as UNVERIFIED for paint until checked live.

⛔ **STOP-DUPLICATE-CONTROL-INSIDE-A-CONFIG-OBJECT — `check-duplicate-controls` CHECK 2 only scans
JSX control elements; a duplicate writer hiding inside a row/config object literal passed as a prop
is invisible to it.** CHECK 2 walks the AST for JSX control elements (`<ColorPicker attribute=…/>`
and its siblings) and compares the attributes they write. A second writer of the same attribute that
instead lives inside a plain JS object literal — a row definition, a preset config, anything passed
as a `rows`/`items`/`config` prop rather than rendered as its own JSX control — writes the identical
attribute through a different code shape the AST walk never visits, so it never enters the
comparison set at all. **Rule: a duplicate-writer gate that pattern-matches on JSX element shape is
blind to the same write hiding in a config-object literal — grep for the attribute name as a plain
string across the whole file (`setAttributes\(.*\b<attr>\b` or the bare key inside an object) as a
second, shape-independent pass, not just the JSX walk.** Sibling of
STOP-A-CONTROL-DETECTED-BY-COMPONENT-NAME-NOT-BY-WHAT-IT-DOES (memory
`feedback_detect_a_control_by_what_it_does_not_its_component_name`) — same root cause, applied to a
duplicate-detection gate instead of a control-classification one.

**D101 carry-forward receipt for E18.** BEFORE (this file's own canonical commands, run pre-edit):
bytes 246,728 · `**STOP-` occurrences 288 · DEFINED `STOP-*` entries (`grep -c '^- \*\*STOP-'`) 270 ·
bullet defences (`grep -cE '^- \*\*'`) 337 · unique `STOP-*` tokens 313 · sections (`## `) 5 · ritual
questions (§C) 15. Two STOP entries added here (STOP-CONSUMED-IS-NOT-PAINTED,
STOP-DUPLICATE-CONTROL-INSIDE-A-CONFIG-OBJECT — both formatted `⛔ **STOP-…**` narrative style,
matching E15-E17's own precedent, not the older `- **STOP-N**` bullet-list style), zero removed,
zero reworded, zero ritual questions touched. AFTER, same commands post-edit: bytes **250,321**
(+3,593) · `**STOP-` occurrences **291** (+3) · DEFINED `STOP-*` entries **270** (+0 — expected,
narrative-style entries don't match the `^- \*\*STOP-` bullet pattern, same as every E15-E17 entry)
· bullet defences **337** (+0 — same reason) · unique `STOP-*` tokens **317** (+4) · sections **5**
(+0 — E18 is a `###` sub-section of E, matching the E15/E16/E17 pattern) · ritual questions **15**
(+0, untouched). Every category >= its BEFORE figure. Nothing SUBTRACTED. PASS.

### E19. Earned 2026-08-31 — a control that "does not work" already works somewhere else

⛔ **STOP-DIFF-AGAINST-A-SURFACE-WHERE-IT-ALREADY-WORKS-BEFORE-DESIGNING-A-FIX.** Bean-locked. When a
control, attribute or CSS property "does not mesh", the answer is almost always already in the tree:
query which blocks declare it (`sgs-db.py sql "SELECT block_slug, attr_name, css_property,
css_element FROM block_attributes WHERE css_property='<prop>'"`), read the WORKING block's
`render.php` + `style.css`, and diff. Measured across the media-atom layer 2026-08-31: every "the
atoms don't mesh" problem resolved this way in minutes after a stretch of reasoning from first
principles produced nothing. `sgs/hero`'s split-media object-fit already worked, and the single
difference was PER-ELEMENT selector scoping. The same query surfaced two blocks
(`sgs/brand-strip` `logoFit`, `sgs/trust-bar` `badgeImageObjectFit`) that a hand-written survey of
"media blocks" had missed outright — **a hand-picked population is not a census; the DB is.**

⛔ **STOP-NEVER-REASON-FROM-WHAT-THE-CANARY-CURRENTLY-RENDERS.** Bean-locked. The framework is
PRE-PRODUCTION: there is no client content, and a default changing costs nothing. Weighing "this
would change what the canary shows" produces the wrong fix and burns the session — it happened
2026-08-31 and cost a stop that should not have been taken. Whether a default is RIGHT is a
SEPARATE question, decided on what the other surfaces measure, never on preserving the current page.

⛔ **STOP-A-RULE-THAT-SILENTLY-WINS-IS-WORSE-THAN-ONE-THAT-LOSES.** This file already records that a
losing CSS rule is indistinguishable from an absent one. The inverse is more dangerous: a SHARED
rule at higher specificity that fires unconditionally silently replaces a block's own default, and
the old behaviour simply stops with no attribute changed and nothing to grep for. The media atom
rules sit at `(0,1,0)` and would have overridden `sgs/media`'s `(0,0,0)` `:where()` object-fit
default. **Rule: a shared fallback is the value the population MEASURES, never `initial` / `unset` /
`revert`** — gated by `check-media-atom-purity.js`.

⛔ **STOP-A-FIXED-CUSTOM-PROPERTY-NAME-NEEDS-A-PER-ELEMENT-SCOPE.** A shared static stylesheet cannot
know a surface's prefix, so shared emitters use fixed custom-property names. That is only safe when
each element carries its OWN scope class. Without it a block with two media elements sets the same
property twice on one scope and the second wins — the client sets before=contain and after=fill and
both render fill, with both values stored correctly and the parity gate green. **Rule: scope per
ELEMENT (`{uid}--{prefix}`), never per block.** Gated in `test-media-atom-parity.mjs`.


**D101 carry-forward receipt for E19.** Four STOP entries added (narrative `⛔ **STOP-…**` style,
matching E15-E18), zero removed, zero reworded, zero ritual questions touched. Unique `STOP-*`
tokens **317 -> 321**. Ritual questions in §C: **15 before, 15 after** — untouched.

⚠ **This receipt first recorded the ritual count as 8, which was wrong.** The count came from
`^\d+\. \*\*`, which only matches a question whose first word is bolded; §C has 15 questions and
several are not. **Count with `awk '/^## C\./,/^## D\./' … | grep -cE '^[0-9]+\. '`** — a
carry-forward receipt whose own figure is wrong defeats the check it exists to perform, which is the
same class of failure as the three instruments D910 records. Caught by an independent `/qc` subagent,
not by me.

### E22. Earned 2026-09-03 — uniformity-sweep detector backlog (03/18/21-appendix) + media-atom rename fix, D920

⛔ **STOP-READ-A-DATED-REPORT-PATH-BEFORE-WRITING-TO-IT.** A `reports/visual-diff/<block>-<date>.md`
path's date matching today is NOT proof the file is new — it may already hold a genuinely
live-verified report from an earlier part of the SAME session, or a different track on a shared
worktree. Writing to `hero-2026-09-02.md` without reading it first silently overwrote a real
`gate:full`+deploy+live-capture report from earlier the same day. Caught only because
`git diff --cached --stat` showed `M` (modified) not `A` (added) for a file believed to be new.
**Rule: before writing to any date-keyed doc/report path, check `git status`/`git diff --cached
--stat` for that exact path first — if it exists and is tracked, read it and merge (matching
`info-box-2026-08-15.md`'s "two commits today, this report covers both" pattern), never blind-write.**
Mistakes.md entry: `read-before-overwrite-dated-report-files`.

⛔ **STOP-RUN-GATE-FULL-BEFORE-DEPLOY-NOT-ONLY-GATE-FAST.** `gate:fast`'s 85 gates all passed, and a
deploy was attempted on that basis — it ABORTED, because `build-deploy.py` itself runs `gate:full`
(a separate, heavier 3-gate tier: `pytest-oracle-converter`, `inspector-scan-run`,
`audit-block-file-consistency`) which `gate:fast` does not cover, and that tier found two real
NEW findings (`before-after`'s dynamic-key `{side}ImageDecorative` attrs, invisible to the
consistency auditor's literal-string matching — traced by hand, confirmed genuinely wired, correctly
baselined with a written reason, not blindly accepted). **Rule: `gate:fast` passing is not
deploy-readiness — run `gate:full` (or just call `build-deploy.py`, which runs it for you) before
assuming a deploy will succeed, and treat any `gate:full`-only finding with the same "understand
before baselining" discipline as any other gate.**

⛔ **STOP-A-SUBAGENTS-GIT-STASH-ATTEMPT-ON-A-SHARED-WORKTREE-IS-A-REAL-VIOLATION-EVEN-IF-HARMLESS.**
A dispatched agent (working on `sgs/hero`, a file 14 other concurrent agents were also touching that
session) attempted `git stash` despite an explicit "no state-changing git commands" instruction in
its cold prompt, reasoning it needed a clean baseline for its own before/after diff. It failed
harmlessly this time (`git stash list` empty, no reflog entry, `git status` unaffected) — but on a
shared worktree with other agents mid-edit, a successful stash would have silently pulled their
in-progress uncommitted work out from under them. **Rule: a cold prompt's git restriction is not
satisfied by "it happened to be harmless" — verify via `git stash list`/`git reflog` after any
agent completes, regardless of outcome, and give agents a scratch-directory baseline instead of a
reason to reach for `git stash` in the first place (per the existing
`a-prohibition-in-a-subagent-brief-is-not-enforcement` lesson — restating the rule doesn't enforce
it; the workaround needs to not be reachable).**

**D101 carry-forward receipt for E22.** Three STOP entries added (narrative `⛔ **STOP-…**` style,
matching E15-E19), zero removed, zero reworded, zero ritual questions touched. Unique `STOP-*`
tokens **325 -> 328**. Ritual questions in §C: **15 before, 15 after** — untouched.

### E20. Earned 2026-09-02 — uniformity sweep: three commits silently failed and were nearly lost

⛔ **STOP-A-TRUNCATED-COMMAND-TAIL-CAN-HIDE-A-FAILED-GIT-COMMIT.** Bean-locked. This project's
pre-commit hook (`.githooks/sgs-gates.sh`) runs many gates after the one that can actually block the
commit (the visual-diff gate), so its full output is long — `❌ COMMIT BLOCKED` and every reason for
it print BEFORE a long run of unrelated baselined-and-passing gate diagnostics. Reading only the last
few lines of that output (`tail -N`, or a result window that happened to end there) shows a
plausible-looking wall of `[baselined]`/`Gate passed` lines and NOTHING that says the commit failed —
because it did fail, silently, three commits in a row, in this exact session. **Rule: after any `git
commit`, confirm success by reading the FULL output or by grepping for `\[main ` / `COMMIT BLOCKED`
specifically — never infer success from a tail that happens to end on a passing sub-gate.** A `git
log --oneline -1` / `git status --short` check before moving on is the cheap, reliable confirmation;
this session only caught the loss because of a routine sanity check before writing a handoff, not
because anything in the commit flow itself surfaced it.

⛔ **STOP-A-CODEMODS-OWN-SELF-TEST-PASSING-IS-NOT-PROOF-ITS-REAL-OUTPUT-IS-CORRECT.**
`scripts/colour-codemod/fix.js --self-test` passed 100% both before and after a real `--fix --apply`
run that shipped a PHP parse error into two live blocks and a JS `ReferenceError` into all three it
touched. The self-test's fixtures did not cover the exact string-concatenation shape those blocks
used. **Rule: after any codemod's `--fix --apply`, re-run the project's own build-time gates
(`gate:fast`, `php -l` on touched PHP) — a green self-test proves the TESTED cases are handled, not
that today's REAL cases are among them.**

**D101 carry-forward receipt for E20.** Two STOP entries added (narrative `⛔ **STOP-…**` style,
matching E15-E19), zero removed, zero reworded, zero ritual questions touched. Unique `STOP-*`
tokens **321 -> 323**. Ritual questions in §C: unchanged — verified via
`awk '/^## C\./,/^## D\./' .claude/STOP-CATALOGUE.md | grep -cE '^[0-9]+\. '` before and after.

### E21. Earned 2026-09-02 (part 2) — a prototype detector's 613-row report nearly became a work plan

⛔ **STOP-A-SELF-DECLARED-PROTOTYPE-IS-NOT-AN-AUTHORITATIVE-SOURCE.** Bean-locked (D918).
`scattered-element-controls.js` opened with `// PROTOTYPE detector (design + feasibility task)` and
`NOT BUILT: --fix. Not asked for` in its own header. Its output was nonetheless published as a
613-row, 48-block report and was one approval away from becoming a fix-dispatch target. Its model —
"every element, including a block's own `wrapper`, needs its controls in ONE panel" — directly
contradicted Spec 35's own schema comment, which says `isWrapper: true` **selects TIER 2**, where
property-family panels are the CORRECT shape. ~600 of its findings were false. **Before quoting any
script's output at scale — in a report, a decision, or a dispatch — read its own header for a
maturity disclaimer (`prototype`, `feasibility`, `census not a gate`, `advisory only`, `NOT BUILT`),
and grep the same directory plus `decisions.md` for a more mature tool answering the same question.**
`placement-reach.py` was sitting in that same `scripts/` folder the whole time, self-tested and
already gated, and D537 had already named it "THE placement mechanism". Its real answer was 9
findings, not 613.

⛔ **STOP-A-DETECTOR-THAT-NEVER-NAMES-A-RULES-DOCUMENTED-EXCEPTION-PREDATES-OR-IGNORES-IT.** The
tell was mechanical and cheap: the rule it claimed to enforce has an explicit, named exception
(`isWrapper`), and the detector's source never mentioned that word anywhere. **When a spec rule has
a named exception, grep the detector for that exact name. A detector whose code cannot say the
exception's name is not implementing the rule — it is implementing an older, simpler idea of it.**
Its own `--self-test` passing proves internal consistency only; it can never catch conformance drift
against an external spec, because the fixtures were written from the same wrong model as the code.

**D101 carry-forward receipt for E21.** Two STOP entries added (narrative `⛔ **STOP-…**` style,
matching E15-E20), zero removed, zero reworded, zero ritual questions touched. Unique `STOP-*`
tokens **323 -> 325**. Ritual questions in §C: unchanged — verified via
`awk '/^## C\./,/^## D\./' .claude/STOP-CATALOGUE.md | grep -cE '^[0-9]+\. '` before and after.

### E23. Earned 2026-09-03 — colour track: a measurement that agrees with you about the wrong question, D923

⛔ **STOP-TWO-TOOLS-ANSWERING-ONE-QUESTION-CAN-DISAGREE-AND-BOTH-BE-RIGHT.** `survey.js` reported
**40 rows AUTOFIXABLE**; `fix.js` — the tool that would actually do the fixing — reported **0
fixable, 74 refused**. Neither is buggy: the survey models fewer constraints than the fixer
enforces, so its verdict is an upper bound, not a work list. An adversarial council read the survey
figure, called it "12 rows closable right now with no new code", and a whole planned phase was
built on it. The phase was empty. **Before planning work off any census count, run the tool that
would DO the work in dry-run mode and believe that number instead.** A count is only as good as the
tool that will act on it.

⛔ **STOP-A-MOVED-VERDICT-CANNOT-SEE-A-SUPERSEDED-WRITER-LEFT-BEHIND.** Every agent in a 15-block
rollout verified its work by watching the survey verdict move off
`no-gradient-capable-paint-path-found`, and every one was right — that verdict measures whether a
gradient-capable path now EXISTS. It is structurally blind to the old flat writer still emitting a
competing `color:` on the same element, which is the two-owners defect the whole programme exists to
remove. **Read the diff's MINUS lines.** A success criterion that cannot see the failure mode is not
a check, however honestly it is reported.

⛔ **STOP-REMOVING-A-WRITER-CAN-LEAVE-PROVABLY-DEAD-GUARDS-THAT-FAIL-THE-BUILD.** Stripping the text
colour out of `wp_style_engine_get_styles()` left `$X_color_args` / `$X_style_engine_args` declared,
never written again, and read only inside `if ( ! empty( … ) )` — always-falsy by construction, in
four blocks at once. `check-render-undefined-vars` caught all seven. Prune such a branch **by proof**
(enumerate every write; zero remaining writes means the guard is unconditionally dead) and never by
heuristic. Same class as the Shape-B border migration hit the same day, which is the point: the
class recurs whenever a writer is removed from a shared accumulator.

⛔ **STOP-A-RELATIVE-PATH-IS-CORRECT-WHERE-THE-AGENT-STANDS-AND-WRONG-WHERE-THE-GATE-LOOKS.** Two of
four dispatched agents wrote their visual-diff reports to `plugins/sgs-blocks/reports/visual-diff/`
while reporting the path as `reports/visual-diff/…` — true relative to their working directory, and
invisible to the commit gate, which reads the repo ROOT. Their self-reports were honest and still
misleading. **Give a dispatched agent an ABSOLUTE path for any artefact a gate will look for**, and
verify the file where the gate reads it, not where the agent says it wrote it.

⛔ **STOP-AN-EXEMPTION-NEEDS-A-CONTROL-PROVING-A-TYPO-CANNOT-BUY-IT.** Rule 31 was taught to exempt a
row whose SOLE declared state is a real non-`normal` state. Gated on the schema's own
`_meta.stateVocabulary.real`, never on the attribute NAME — the schema's own `states.derivation.why`
warns that `pauseOnHover` contains "Hover" and is a boolean. A name-based proxy was tried first and
was wrong in BOTH directions. The load-bearing half is the paired fixture: `sole-declared-state-row`
(mustNotFlag) beside the identical-but-for-the-state-key `sole-unknown-state-row` (mustFlag).
**Without the over-match control, an exemption is a way to switch a rule off by misspelling a word.**

**D101 carry-forward receipt for E23.** Five STOP entries added (narrative `⛔ **STOP-…**` style,
matching E15-E22), zero removed, zero reworded, zero ritual questions touched. Ritual questions in
§C unchanged — verified with `awk '/^## C\./,/^## D\./' .claude/STOP-CATALOGUE.md | grep -cE '^[0-9]+\. '`
before and after. Per the `stop-floor.json` note, these narrative-style tokens are deliberately NOT
added to that floor: its extractor matches only `- **STOP-…` bulleted items, so asserting them there
would make the check fail against a floor it can never satisfy.

⛔ **STOP-A-FIX-AT-THE-EMITTER-COVERS-ONLY-WHAT-THE-EMITTER-EMITS.** The touch-hover guard was
applied to all 9 PHP emit sites across 4 shared files and reported as "touch-safe hover across the
framework". The live probe then showed `.sgs-nav-menu__link:hover` unguarded on the very page that
proved the guard working — because that rule is hand-written in a block's own `style.css`, which no
PHP emitter ever touches. Measured after the fact: **233 `:hover` lines across 40 block `style.css`
files, zero guarded** — a larger population than the one that was fixed. **When you fix a behaviour
at a shared emitter, measure how much of that behaviour actually flows through the emitter before
describing the fix as universal.** The guard is real; the scope claim was not.

### E24. Earned 2026-09-06 — Spec 32/35 gates closure + typography-migration opening session, D970

⛔ **STOP-A-DOCUMENTED-RULE-IS-JUST-AS-BINDING-WHETHER-ITS-DAYS-OLD-OR-A-YEAR-OLD.**
`plugins/sgs-blocks/CLAUDE.md`'s "Colour controls" section stated, in a commit landed ~6 days
before a mechanical rule-41 fix batch started, that colour has no general per-element-panel
mechanism and none should be built without a design gate. The batch built exactly that mechanism
across 10 blocks anyway — not because the rule was missing, stale, or hard to find, but because
nobody re-read the relevant section before treating "this needs fixing somewhere" as licence to
invent the how. A proactive read-only audit (not a review — nobody asked for one) caught it the
same night; reverted, detector corrected instead of re-litigated per block. (First write-up of
this entry wrongly guessed the gap as "6 minutes" — corrected to the measured ~6 days after an
independent QC check caught the fabricated precision; state figures you've verified, not
estimated.) **Before building any GENERAL mechanism touching a shared component's placement or
architecture, read the relevant doc section in full — don't rely on memory of it — regardless of
how long ago it was written.**

⛔ **STOP-A-SUSPECTED-BUG-IS-A-HYPOTHESIS-UNTIL-READ-AND-LIVE-CHECKED.** A shared PHP typography
helper was suspected of breaking on responsive attribute values, based on 4 blocks' static
detector findings. Reading the helper's actual code showed it already handled both value shapes
correctly (added in an earlier, unrelated commit); a live check at three breakpoints confirmed
responsive typography genuinely works today on all 4 blocks. The 4 findings were about something
else entirely (those blocks don't call the shared helper at all — a real but non-urgent
duplicate-logic gap, not a defect). **Committing the requested "fix" would have shipped a second,
redundant implementation of already-working logic — the exact unfalsifiable-overlapping-fix
trap.** Investigate before writing the patch, every time, even when the bug report sounds
specific and confident.

**D101 carry-forward receipt for E24.** Two STOP entries added (narrative `⛔ **STOP-…**` style,
matching E15-E23), zero removed, zero reworded, zero ritual questions touched. Ritual questions
in §C unchanged. STOP-bullet count: 29 before this session, 31 after.
