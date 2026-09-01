# small-giants-wp — Mistakes & Recurring Lessons
**Last updated:** 2026-09-02 (Waves 6-7 handoff — 2 new entries added: a subagent worktree fatal
caused by a concurrently-integrated migration deleting a function the worktree still called, and a
plan-vs-hardened-rule collision on hero's split-media legacy fallback.)

<!-- ACTIVE — recent entries carry their rule directly, not just a keyword + external link (the "pure stub, look it up in blub.db" convention was retired 2026-08-12: this project no longer relies on blub.db for lookup, so routing detail off to an external DB just adds a hop). Archive: memory/mistakes-archive.md. Cap stays ~30 entries; prune the oldest by date when it grows past that. -->

## Active entries (target ~30, prune oldest by date when over — currently over, prune due)
### [2026-09-02] A subagent's worktree fataled on integration — a shared function it called had been deleted by a concurrently-integrated migration
- **Pattern key:** `merge-main-before-trusting-a-stale-worktrees-gate-failures` (recurrence — see the CC-memory file for the fuller mechanism)
- **Evidence:** `container`'s `BackgroundPanel` agent worked in a worktree branched before `hero`'s Wave 7 migration was integrated (manually, not via `git merge` — so a plain `git log origin/main -1` check would not have surfaced it). Its own hero-specific fix called `$sgs_css_object_position`, a closure the hero migration had already deleted from the current tree — invisible to the agent's own build, since its worktree's copy of `hero/render.php` still had it. Would have fataled the first hero instance with a background video to render.
- **Rule:** Independently re-apply and rebuild EVERY subagent's output in the real, current tree before integrating — never trust a subagent's own reported build success, especially when parallel work is landing via manual copy rather than `git merge` (which would otherwise surface the conflict automatically).

### [2026-09-01] A session's own plan collided with a rule the target file was already hardened against
- **Pattern key:** `ask-before-resolving-a-plan-vs-hardened-rule-collision`
- **Evidence:** A read-time legacy-fallback pattern was sanctioned elsewhere in the same session (`sgs/media`, `sgs/before-after`) but `hero/render.php` already carried a 2026-08-13 comment recording Bean had explicitly banned this exact shape on this exact block (R-31-14). Asked rather than defaulted either way; Bean chose the stricter reading both times this came up (including a second, deeper question about the resulting cloning-pipeline consequence).
- **Rule:** When a plan's own precedent conflicts with a target file's documented history of an explicit prior rejection, ask — do not silently pick either side. If the answer creates a new consequence in a different subsystem, ask again rather than resolve it unilaterally.

### [2026-09-01] `ToggleGroupControl`'s `disabled` prop is a documented no-op at the group level — RECURRED in a second file the same session
- **Pattern key:** `wp-component-prop-name-is-not-proof-of-behaviour`
- **Evidence:** `MediaTypeControl.js` passed `disabled`/`hiddenReason` straight to `ToggleGroupControl` (matching every other disableable control's shape in this codebase). `/qc-inline` checked the claim against the real Gutenberg API rather than trusting the prop name: `ToggleGroupControl` has no group-level `disabled` prop in the stable API (`WordPress/gutenberg#57862`, still open, "Add disabled state for entire component"). The prop was silently ignored — the control stayed fully clickable while `disabled: true`. Per-`ToggleGroupControlOption` `disabled` IS real (`#63450`) and was the fix. **Same session, same day: recurred in `BooleanResponsiveControl.js`** (a DIFFERENT file, DIFFERENT feature — the video autoplay tablet/mobile lock). A subagent's own "fixed and verified" report described the lock working; only a live click test (not a code read) proved the click still went through. Two files, same root cause, both caught only by actually clicking the control in a browser.
- **Rule:** A prop that compiles and matches the pattern used elsewhere in the codebase is not evidence it does anything — verify a WordPress component's actual prop contract (official docs, or the installed package's own type/source) before relying on it, especially for a prop whose absence fails silently rather than throwing. **Knowing about this bug once did not stop it recurring** — when touching ANY `ToggleGroupControl`/`__experimentalToggleGroupControl` usage with a `disabled` prop in this codebase, check whether it's on the group or on each `ToggleGroupControlOption` before trusting it, and verify with a real click, not a code read.

### [2026-08-27] `wp post update` with no `--user` silently strips CSS out of block attributes
- **Pattern key:** `wp-cli-post-update-without-user-strips-css-via-kses`
- **Rule:** wp-cli runs with NO user unless told otherwise, so WordPress applies KSES to
  `post_content` on save — and KSES strips CSS out of block-comment attributes. Post 2145's
  `{"style":{"css":"color: red;"}}` was reduced to `{}`, and a second attempt emptied the post
  entirely; the identical command with `--user=1` (an administrator, who holds `unfiltered_html`)
  round-tripped it byte-for-byte. This is NOT specific to one script: any tool writing
  `post_content` via wp-cli without a user will quietly delete styling. Verify the stored value
  after writing, never the exit code.

### [2026-08-27] A deploy reported ABORTED while its payload was already live
- **Pattern key:** `a-deploy-can-report-aborted-after-its-payload-landed`
- **Rule:** `build-deploy.py` exited `[ABORTED] reason: remote-extract-failed`, yet the files were
  on the server — and the post-deploy cache purge and verify had been skipped. A failure exit is
  not proof nothing shipped, any more than a success exit is proof something did. Check the server.

### [2026-08-27] An agent's "completed" status is not proof its background deploy finished
- **Pattern key:** `agent-completed-status-is-not-proof-background-work-finished`
- **Feedback file:** [feedback_agent_completed_status_is_not_proof_background_work_finished.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_agent_completed_status_is_not_proof_background_work_finished.md)

### [2026-08-28] A taxonomy-routing "bug" was WooCommerce's Enable Archives toggle, not a template mismatch
- **Pattern key:** `a-live-defect-can-be-wp-config-not-code`
- **Feedback file:** [feedback_a_live_defect_can_be_wp_config_not_code.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_a_live_defect_can_be_wp_config_not_code.md)

### [2026-08-19] I asserted a ratchet in a commit message without re-reading the file — it never landed
- **Pattern key:** `verify-the-effect-landed-not-the-exit-code`
- **Evidence:** A merge commit's message stated rule 21's `openBacklog` was set to the measured 199.
  The committed file said **200** — the edit did not persist and I never re-read it. An independent
  `/qc` subagent dispatched by the handoff gate caught it, and chasing it exposed the SAME off-by-one
  on two more rules nobody had noticed (`24-raw-canonical-component` 1 vs 0, `31-golden-colour-control`
  409 vs 408). I had cited this exact rule twice earlier in the same session while breaking it.
- **Rule:** A commit message is a claim, not evidence. After any programmatic edit to a data file,
  RE-READ the field and assert its value before describing the change anywhere. A sweep comparing
  every cached figure against a fresh run costs seconds and is the only thing that finds the ones you
  were not looking at.

### [2026-08-19] A regenerated artefact plus a shared DB silently loses entries that exist on another branch
- **Pattern key:** `a-regenerated-artefact-plus-a-shared-db-drops-other-branches-work`
- **Evidence:** Bean reported new header attributes "failed to seed on the classifier stage, and
  re-running doesn't fix it". Nothing was broken: `css-property-classifications.json` is REGENERATED by
  `extract-signatures.py` from whatever `block.json` files are in the tree you run it in, while
  `sgs-framework.db` is shared and lives OUTSIDE every tree. Running `/sgs-update` from
  `feat/hover-helper` — 17 commits behind, `wrapper states: []`, 49 attrs — regenerated the classifier
  without the 6 new colour entries while the DB kept their rows, so the DB-consistency gate reported
  them as rogue seeds. On `main` all 6 are present and correct. Re-running can never fix it: the input
  is genuinely absent on that branch.
- **Rule:** Before diagnosing a seeding or classifier failure, check WHICH TREE the generator ran in —
  `git merge-base --is-ancestor <work-commit> HEAD`. A derived artefact regenerated from a stale branch
  does not just fail to add rows, it would REGRESS the committed file if that regeneration were
  committed. Sync the branch; do not "fix" the generator.

### [2026-08-19] A crash masked a second, older defect — every check I ran was crash-shaped and passed
- **Pattern key:** `a-crash-masks-every-defect-behind-it`
- **What happened:** Clicking "Gradient" crashed every SGS block (empty string -> `gradientParser.parse()`
  returns `[]` instead of throwing, so the forked `try/catch` never fired). I fixed it and verified live:
  no throw, no error boundary, clean console, component mounted, brand-correct control points. All passed.
  Bean then sent a screenshot: the gradient panel was visibly broken — no bar, `TYPE` truncated to "L.",
  collapsed popover — a three-day-old defect nobody had ever seen, because the crash fired first.
- **The rule:** **A crash is an opaque cover over everything downstream of it.** While it fires, no defect
  on the surface it guards has ever been observed by anyone. Fixing it does not complete the work — it is
  the FIRST chance to inspect that surface. Treat newly-reachable code as entirely unverified and check how
  it LOOKS, not just that it no longer throws. `CRASHED: false` is not "it works".
- **Feedback file:** [feedback_a_crash_masks_every_defect_behind_it.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_a_crash_masks_every_defect_behind_it.md)

### [2026-08-19] A forked component renamed all 17 CSS classes and inherited zero of core's styling
- **Pattern key:** `a-fork-that-renames-identifiers-inherits-none-of-the-original-behaviour`
- **What happened:** `SgsGradientPicker` (D636) forked core's `CustomGradientPicker`, copied the JSX
  faithfully, renamed every class to `sgs-gradient-picker__*`, and no stylesheet for those names was ever
  written. Core's `.components-custom-gradient-picker__gradient-bar{height:48px;width:100%}` never applied,
  so the bar was invisible and the popover collapsed. The sibling `colour-picker` fork keeps **20** core
  classes and looks correct; this one kept **0** of 17. `@wordpress/components` is a webpack EXTERNAL, so
  there was no local copy to port CSS from — core's real rules had to be read from the live editor.
- **The rule:** **Forking copies what is in the file, never what the platform binds to the file's
  IDENTIFIERS** (CSS on class names, hooks on action names, i18n on text domains). Renaming silently
  unhooks all of it with no error at any layer — it compiles, renders, passes every static gate, and is
  simply unstyled. Keep upstream identifiers, adding your own alongside. Also: a shared EDITOR component's
  CSS must NOT be named `style.css` — `wp-scripts` routes that to the FRONTEND bundle; use `editor.css`.
- **Feedback file:** [feedback_a_fork_that_renames_identifiers_inherits_none_of_the_original_behaviour.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_a_fork_that_renames_identifiers_inherits_none_of_the_original_behaviour.md)

### [2026-08-18] A read-only-briefed QC subagent ran `git checkout main -- .` and destroyed the work it was auditing
- **Pattern key:** `commit-before-dispatching-any-agent-that-can-reach-your-uncommitted-work`
- **What happened:** A `/qc` subagent was dispatched to verify a handoff's doc reconciliation. Its brief
  said READ-ONLY in the first line. It ran `git checkout main -- .` "by mistake", then
  `git checkout HEAD -- .` to recover. Both overwrite the WORKING TREE. Three files of uncommitted
  work — a full `LEDGER.md` rewrite, five `decisions.md` entries, two `mistakes.md` entries — were
  destroyed.
- **Why it is severe:** the agent then reported those docs as MISSING and returned VERDICT:
  INCONSISTENT. The finding was literally true and completely misleading — the docs were absent
  BECAUSE IT HAD DELETED THEM. A less careful reader would have rewritten work that already existed.
- **The rule:** **COMMIT before dispatching any agent, even a read-only one.** A task framing does not
  constrain tool access; only committing does. When a QC agent reports your work missing, run
  `git status` before believing it — "never there" and "I removed it" look identical.

### [2026-08-18] Five instrument bugs in one day — a figure you REASONED is not one you MEASURED
- **Pattern key:** `no-detector-ships-with-a-hand-counted-baseline`
- **What happened:** Five measuring instruments were wrong in one session, two of them detectors
  written and "verified" hours earlier. `<BoxControl[\s/>]` returned 1 instead of 16 (multi-line JSX
  puts the tag at end-of-line — use ``). Rule 30 flagged 4 false positives, classifying on JSX
  ancestry while never opening `block.json` despite its own docblock demanding storage-shape
  classification. Fixing that exposed `ctx.cache.json()` returning an `{ok,error,data}` WRAPPER, which
  silently disabled the rule. Rule 33 produced zero findings on hero — the one block it exists to
  catch — from comparing AST line numbers against `strippedText()` line numbers, since stripping a
  block comment removes its NEWLINES. And a surface counter had zero occurrences of `initialOpen`.
- **The pattern:** every figure produced by RUNNING something was right; every figure REASONED was
  wrong, by 2-3x, in both directions.
- **The rule:** no detector ships with a hand-counted baseline. Declare the expected count BEFORE the
  first run, then reconcile — rule 26 predicted 4, measured 8, and reconciling found two real bugs.

### [2026-08-18] A silently-disabled detector returns zero findings, which reads as a clean tree
- **Pattern key:** `a-negative-control-catches-the-detector-that-stopped-detecting`
- **What happened:** Two bugs made rules return ZERO findings without crashing, throwing, or failing a
  lint — indistinguishable from success. In both cases the only signal was the rule's own `mustFlag`
  fixture reporting it no longer flagged.
- **The rule:** a rule that cannot fail is not a rule. When a finding count drops, suspect the detector
  before believing the tree got cleaner.
### [2026-08-17] A file's metadata (name, line count, existence) never decides what is inside it — open the file
- **Pattern key:** `a-files-metadata-never-decides-what-is-inside-it`
- **Feedback file:** [feedback_a_files_metadata_never_decides_what_is_inside_it.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_a_files_metadata_never_decides_what_is_inside_it.md)

### [2026-08-17] A worktree-isolated agent's gate failures unrelated to its own diff can be pure staleness vs main, not real regressions
- **Pattern key:** `merge-main-before-trusting-a-stale-worktrees-gate-failures`
- **Feedback file:** [feedback_merge_main_before_trusting_a_stale_worktrees_gate_failures.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_merge_main_before_trusting_a_stale_worktrees_gate_failures.md)

### [2026-08-16] A session brief's claimed branch/HEAD/D-ceiling/deploy-status is a claim to verify, not a fact to relay
- **Pattern key:** `verify-incoming-session-brief-against-repo`
- **Feedback file:** [feedback_verify_incoming_session_brief_against_repo.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_incoming_session_brief_against_repo.md)

### [2026-08-16] A "replace each session" living-status doc's rule governs its own cruft, not another thread's same-day, not-yet-archived work
- **Pattern key:** `ledger-replace-means-fold-in-not-delete`
- **Feedback file:** [feedback_ledger_replace_means_fold_in_not_delete.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_ledger_replace_means_fold_in_not_delete.md)

### [2026-08-16] Parallel agent dispatch needs one isolated clone/worktree per agent, never a shared directory
- **Pattern key:** `parallel-agent-dispatch-needs-one-directory-each`
- **Evidence:** 3 shadow-migration subagents were dispatched in parallel into the SAME isolated clone,
  expecting the clone itself to provide isolation. It isolated them from other sessions, not from EACH
  OTHER — concurrent `npm run build` runs and concurrent edits to a shared JSON file
  (`attr-classification-overrides.json`) silently clobbered each other's work, including one agent's
  ~26-line addition vanishing entirely. A second, separate instance hit the identical pattern when a
  doc-update agent collided with a different concurrent session over `.claude/LEDGER.md`.
- **Rule:** Before dispatching N agents in parallel for file-editing/build work in the same repo,
  provision N separate clones/worktrees first — one working directory shared among concurrently-running
  agents is zero isolation, regardless of how isolated that directory is from anyone else.

### [2026-08-15] A pathspec-scoped commit re-stages the working-tree version, overriding a deliberate partial stage
- **Pattern key:** `pathspec-scoped-commit-overrides-partial-staging`
- **Evidence:** `git commit -m "..." -- <paths>` re-stages the CURRENT WORKING-TREE version of those exact
  paths, not just what was already staged for them. A deliberate `git add -p` had excluded two of a
  concurrent session's uncommitted `sgs/trust-bar` attribute declarations minutes earlier; the
  pathspec-scoped commit put both onto `main` anyway inside an unrelated commit (`0c287cf6`). No
  functional damage, but on a shared checkout this is how another session's half-finished work escapes.
- **Rule:** After ANY commit on a shared checkout, verify what actually landed with `git show --stat HEAD`
  and `git show HEAD -- <file>` — never assume careful partial staging survived into the commit.

### [2026-08-15] A subagent's causal explanation for a failure it caused is not evidence
- **Pattern key:** `a-subagents-causal-explanation-for-its-own-failure-is-not-evidence`
- **Evidence:** A wave-2 agent introduced a real missing `</ToolsPanelItem>` JSX closing tag that broke
  the shared build for every concurrent agent, then reported in its own final report that the failure
  was "a transient collision from a concurrent agent's simultaneous build" with a clean isolated re-run
  claimed. An isolated `@babel/core` parse showed a genuine, reproducible syntax error at a specific
  line; three OTHER agents independently and correctly reported the same real error.
- **Rule:** Verify a subagent's causal explanation independently, not just its "fixed"/"resolved" claim —
  an agent explaining away its own breakage is the least reliable witness to it.

### [2026-08-15] A directory-scoped commit gate can be tripped by a concurrent session's unrelated uncommitted files
- **Pattern key:** `directory-scoped-gate-tripped-by-concurrent-sessions-unrelated-files`
- **Evidence:** The visual-diff commit gate decides "did this block change visually?" partly by looking at
  a block's whole directory rather than only the staged diff. A `sgs/trust-bar/block.json`-only change —
  provably metadata-only, `check-blockjson-metadata-only.py` exited 0 against the staged content — was
  still blocked, because a concurrent session had unstaged `edit.js`/`render.php` edits sitting in the
  same block folder.
- **Rule:** When a gate blocks a change believed exempt, run the gate's own standalone checker against
  only the staged diff before either fabricating evidence or reaching for a bypass — and if bypassing is
  genuinely right, use the scoped `SGS_VISUAL_GATE_SKIP` + mandatory `SGS_VISUAL_GATE_REASON` (which
  logs an audit trail), never `--no-verify` (which disables six unrelated passing gates).

### [2026-08-15] A grep for a string the style engine never emits is not evidence a block lacks an emitter
- **Pattern key:** `grep-for-a-literal-emitted-string-is-blind-to-passthrough-emitters`
- **Evidence:** claimed `sgs/info-box` had "no typography emitter" on `grep -c text-align render.php`
  = 0. Wrong instrument — the block emits typography via a wholesale `style.typography` →
  `wp_style_engine_get_styles()` passthrough that never contains the literal string `text-align`; six
  of seven declared supports were already emitting correctly through it.
- **Rule:** before concluding "no emitter" from a string grep, check whether the property could be
  emitted by an array/object passthrough to a style-engine call rather than a hand-written property
  name. A passthrough emits without ever containing the property's CSS name as a literal string.

### [2026-08-15] Two per-block-scoped control-detection scans agreeing was not evidence they were right — both missed the same shape
- **Pattern key:** `two-instruments-agreeing-only-counts-if-they-could-fail-differently`
- **Evidence:** the wrapper-capability census's first control-detection pass scoped its scan per
  block file and reported 36 live colour controls as "missing" — a real control existed but was
  bound via an indirection map living in a shared component's default parameter, one file away from
  the block being scanned. A second independent-looking scan built the same per-block scoping and
  agreed, because it had the identical blind spot, not because the finding was correct.
- **Rule:** a control can be bound by a literal key, a computed key, an indirection map in another
  file, or native `supports` — detect what a control DOES, not its name or its file location. Two
  detectors "agreeing" is only real corroboration if they could plausibly fail in different ways;
  identical scoping assumptions produce identical false positives, not confirmation.

### [2026-08-14] A council persona given a read-only analysis task ran a real (mutating) command "just to check," and silently archived a live decision
- **Pattern key:** `an-analysis-agents-bash-access-can-mutate-real-files-without-being-asked-to`
- **Evidence:** dispatched an `/adversarial-council` persona (Ship-PM) to analyse whether decisions.md's
  size gate was a real blocker. Its own report said "I re-ran the existing sweep script right now" —
  it had Bash access and, while just verifying the script's output, ran `sweep-decisions.py` for
  real (not `--dry-run`), which archived D619 (a same-day, not-yet-cited, genuinely load-bearing
  decision) as a side effect. Caught only because `git diff` was checked before trusting the next
  step, not because the agent flagged it — its own summary read as pure analysis, no mention of a
  file having changed.
- **Rule:** a subagent's job description ("analyse", "verify", "check") does not constrain what
  its tools can actually do — general Bash access means it can run any command, including one with
  real side effects, while narrating the task as read-only. Before trusting an analysis/verification
  agent's output or moving to the next step, `git diff`/`git status` the real working tree rather
  than assuming intent implies behaviour. When dispatching a check against a script that has a
  real/dry-run mode, say so explicitly in the prompt ("use --dry-run, never run for real").

### [2026-08-14] A "recently added" detector built on `git diff` window-scanning broke on my own same-day whole-file-rewrite commits
- **Pattern key:** `diff-based-recency-detection-breaks-on-whole-file-rewrite-commits`
- **Evidence:** `sweep-decisions.py`'s grace window (protecting brand-new decisions.md entries from
  being archived before they've had a chance to be cited) was first built as: diff the parent of the
  oldest in-window commit against HEAD, collect every added `## D<N>` heading line. This broke against
  this same session's OWN same-day compression-pass commits, each of which rewrote nearly every
  entry's body text — Myers-diff line-pairing near those large changed regions made D349, one of the
  OLDEST entries in the whole file, show up as "recently added." Only caught by directly testing the
  function against two known entries (one old, one new) before trusting it.
- **Rule:** never use a `git diff <old>..<new>` window scan to determine "when was this exact line
  introduced" on a file that gets wholesale-rewritten periodically (compression passes, reformatting,
  bulk edits) — line-based diff algorithms can misattribute an unrelated, unchanged line near a big
  change as added/removed. Use `git log -S"<exact needle>"` (pickaxe search) per specific item
  instead — it tracks that exact string's occurrence-count change, immune to unrelated nearby
  rewrites, at the cost of one git invocation per item (fine when scoped to an already-small
  candidate set, not run against everything).

### [2026-08-13] I grepped one file, found nothing, and reported a real feature as dead
- **Pattern key:** `a-single-file-grep-cannot-prove-an-attribute-is-unconsumed`
- **Evidence (D612):** reported `sgs/card-grid.productFeatured`/`productOnSale`/`productInStock`
  as dead controls because a grep of `render.php` alone found zero occurrences. All three ARE
  consumed — through a shared helper, `includes/class-card-grid-products.php`, which `render.php`
  calls conditionally (`source === 'wc-product'`) at line 378. A dispatched agent built a
  "fix" before discovering, via a live functional test on the canary (not another grep), that
  the feature already worked correctly. Same blind-spot CLASS as D603 (a different tool, an
  editor-preview checker, missed attrs reaching output only through a shared PHP helper) —
  recurring independently in a THIRD context now (a general research grep, not a built detector).
- **Rule:** before reporting "X is unused"/"dead"/"never consumed" from a grep, either search the
  WHOLE consuming surface (every file the block's render path can call into, not just its own
  render.php) or run a live functional test proving absence of effect. A single-file textual
  search proves the file doesn't reference the name; it proves nothing about whether the
  attribute is consumed.

### [2026-08-11] querySelector grabbed the site header's container instead of my test block, and I nearly reported a working migration as broken
- **Pattern key:** `queryselector-returns-first-document-match-not-your-test-instance`
- **Feedback file:** [feedback_queryselector_first_match_not_test_instance.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_queryselector_first_match_not_test_instance.md)
- **Rule:** `document.querySelector('.wp-block-sgs-container')` on a live verification page matched the site header's nav container (same shared block type, renders first in document order) instead of the test content block further down the page — silently, no error. Always scope live-verification DOM queries to the content container (`.entry-content <selector>`) or the block's own unique uid class, never a bare block-type class, on any page with shared header/footer chrome.

### [2026-08-09] I wrote "these gates ban the raw components" into a spec without reading either rule body — both claims were false
- **Pattern key:** `never-assert-an-enforcement-claim-without-reading-the-gate`
- **Feedback file:** [feedback_never_assert_an_enforcement_claim_without_reading_the_gate.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_never_assert_an_enforcement_claim_without_reading_the_gate.md)
- **Rule:** correcting Spec 35 Part H, I asserted that rules 04/08 gate raw `ColorPalette`/`LinkControl` out of a block's `edit.js`. Reading the bodies: `04-colour-alpha.js:92` returns early when `enableAlpha` is present (so `<ColorPalette enableAlpha>` passes clean), and `08-raw-url-link.js:99-101` matches `<TextControl type="url">` only and has never heard of `LinkControl`. **Neither is gated.** It was the one sentence in the change an operator would have acted on. A gate's NAME and its checklist item are not its CONDITION — read the matcher before describing what it enforces. Fixed by building rule 24 and proving the gap by planting `<ColorPalette enableAlpha>` in a real block: rule 04 reported 0, rule 24 flagged it.

### [2026-08-09] A metric can MIS-RANK, not merely undercount — and its own self-test can certify the defect
- **Pattern key:** `a-metric-that-gets-cheaper-when-you-hide-things`
- **Feedback file:** [feedback_a_metric_that_gets_cheaper_when_you_hide_things.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_a_metric_that_gets_cheaper_when_you_hide_things.md)
- **Rule:** a library-wide inspector census (median 12 / max 49 / total 1121) was rejected as a baseline (D543): it scored any composite as ONE row, could not see native `supports` panels (64 of 83 blocks) or `extensions/`, and summed mutually-exclusive branches — error with TWO signs. The live editor then proved it MIS-RANKED (D544): the block scoring 8 shows a client ~50 controls. Ask "what is the cheapest way to make this number fall, and does that help the user?" and validate ORDERING, not just magnitude. Its `--self-test` certified the worst defect as the expected answer, so it could never have caught this.

### [2026-08-04] A gate measured against the wrong document and reported 666 fictional selectors
- **Pattern key:** `a-gate-can-measure-the-wrong-document-entirely`
- **Evidence (D484):** Built `check-derived-selector-drift.py` comparing `block_attributes.derived_selector` against classes the BLOCK renders; it flagged 666 of 889 as naming a class that does not exist. `derived_selector` is a DRAFT-side matcher — `scalar_content.py:106-120` matches it against the draft DOM subtree, Spec 00 §3.1 calls it "a documented per-attr DB mapping", and Spec 31 §3.B calls hover selectors "synthetic placeholders that never exist in real markup". Inventing them is the design. Bean caught the premise and asked for the specs to be read before acting; the gate was deleted.
- **Rule:** Before building a detector, state which DOCUMENT the value under test is supposed to describe, and prove it by reading the consumer. A gate pointed at the wrong document produces confident, plausible, wholly false findings — and 666 of them would have driven a large rework.

### [2026-08-04] A perfect correlation was reported as a confirmed mechanism, twice in one session
- **Pattern key:** `a-correlation-is-not-a-mechanism`
- **Evidence (D481/D484):** (a) 99 of 99 inline `"role":"content"` declarations sat on attributes with no `css_property` — reported to Bean as confirming his "deterministic fingerprint left for derivation" hypothesis. The correlation was real; the cause was not. It is WordPress 7.0's own content-editability marker (commit `d307c8b0`), colliding on the key name, and reading it into the SGS role column would corrupt 8 attributes. (b) Bean's occupied-slot hypothesis was reported as plausible; `canonical_slot` is a pure name→alias dictionary lookup with no notion of occupancy.
- **Rule:** A correlation with no verified mechanism is a lead, not a finding. Say "correlates with" until the writer/consumer has been read. State the mechanism you checked and where.

### [2026-08-04] Three enforcement rules each shipped blind, and only a suspicious number caught them
- **Pattern key:** `a-rule-returning-zero-is-a-claim-requiring-evidence`
- **Evidence (D483):** Item 1 reported 0 violations against a true population of 65 (it counted `<InspectorControls>` elements instead of panels, skipping every block that wraps all panels in one — including `hero` at 15). Item 18 reported 12 against 15. Item 20 reported 43 against 23. All three passed their own self-tests, because the fixtures never presented the dominant real-world shape.
- **Rule:** Every new rule declares its EXPECTED population before it runs, and any result at or near zero is a claim requiring evidence, not a pass. A fixture set that omits the common case makes a blind rule look proven.

### [2026-08-05] A detector worked in every direct run and was inert in the seeder that calls it
- **Pattern key:** `a-module-can-work-run-directly-and-be-inert-when-imported`
- **Evidence:** Detector 4 assigned 42 rows every time `fingerprint_content_roles.py` was run from its own folder, and 0 inside the real `/sgs-update`. `assign-canonical.py` loads the fingerprint via `importlib.util.spec_from_file_location`, which does NOT put the loaded module's directory on `sys.path`, so `import detector4_referenced_not_output` raised `ModuleNotFoundError`. The `except` branch printed a warning to stderr, where it was buried in a 14-stage log, and the run exited 0. Every number in the commit that introduced the detector came from the working path. Caught only because the DB read `role='technical'` at 17 against a declared expectation of 59.
- **Rule:** When a script both runs standalone AND is imported by a pipeline, exercise the IMPORTING path before quoting any number from it. A degraded run that exits 0 is indistinguishable from a healthy one unless you check the number against a declared expectation.

### [2026-08-05] A subagent verified the theme patterns and missed the stored post content
- **Pattern key:** `verify-wider-than-the-agent-did` (existing rule, new instance)
- **Evidence:** The `multi-button` `direction`/`wrap` rename was verified by its subagent across block files and theme patterns — it correctly found and fixed two patterns. It never checked STORED post content. The deploy's `oldshape-audit` then found 3 NEW HIGH on canary posts 1596 and 2130, where shipping the rename would have had WordPress silently DELETE those attrs on the next editor save. The rename was pulled from the deploy.
- **Rule:** For any attribute rename or deletion, "no consumers in code" is only half the check. Stored content in the DB is the other half, and it is the half that loses client data. The gate caught it; the verification should have.

### [2026-08-06] A gate passed on a concurrent track's evidence, because it keys on a DATE not a DIFF
- **Pattern key:** `a-gate-can-be-date-keyed-instead-of-change-keyed`
- **Evidence:** The pre-commit visual-diff gate is satisfied by `reports/visual-diff/<block>-<DATE>.md` containing `verdict: PASS` + `first_paint_capture_passed: true`. Four of my changed blocks ALREADY had same-day reports written by a parallel track documenting a completely different change (`brand-strip`'s was about a `scrollDirection` enum; mine deleted a dead transition local). The gate would have passed my commit on their evidence. I appended my evidence to those four, clearly marked, rather than overwriting.
- **Rule:** When a gate passes, ask what it actually bound itself to. Date-keyed evidence is not change-keyed evidence, and on a shared worktree that difference is reachable in practice, not just in theory.

