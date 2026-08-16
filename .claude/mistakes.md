# small-giants-wp — Mistakes & Recurring Lessons
**Last updated:** 2026-08-16 (2 entries added — session-brief verification, LEDGER-rewrite fold-in-not-delete; 2 oldest by date archived to keep at target — 30 → 32 → 30 active.)

<!-- ACTIVE — recent entries carry their rule directly, not just a keyword + external link (the "pure stub, look it up in blub.db" convention was retired 2026-08-12: this project no longer relies on blub.db for lookup, so routing detail off to an external DB just adds a hop). Archive: memory/mistakes-archive.md. Cap stays ~30 entries; prune the oldest by date when it grows past that. -->

## Active entries (target ~30, prune oldest by date when over)
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

### [2026-07-28] An unreachable capability is a CONTROL-SURFACE problem, not a capability gap
- **Pattern key:** `an-unreachable-capability-is-a-control-surface-problem`
- **blub.db row:** `411`
- **Feedback file:** [feedback_unreachable_capability_is_a_control_surface_problem.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_unreachable_capability_is_a_control_surface_problem.md)
### [2026-07-21] An accurate derived value can still be UNUSABLE if under-keyed — ask what it must be KEYED BY before writing it
- **Pattern key:** `derived-value-must-be-keyed-to-be-usable`
- **blub.db row:** `407`
- **Feedback file:** [feedback_derived_value_must_be_keyed_to_be_usable.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_derived_value_must_be_keyed_to_be_usable.md)
### [2026-07-21] A gate firing on NEW findings is evidence about your data — explain every finding before baselining or bypassing
- **Pattern key:** `a-gate-firing-is-evidence-about-your-data`
- **blub.db row:** `408`
- **Feedback file:** [feedback_a_gate_firing_is_evidence_about_your_data.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_a_gate_firing_is_evidence_about_your_data.md)
### [2026-07-30] A budget gate globbed two directories and was structurally blind to the module it was meant to govern
- **Pattern key:** `a-gate-that-globs-a-directory-is-blind-to-everything-outside-it`
- **Evidence (D422):** `check-motion-bundle-budget.py` scanned `vendor-modules` + `shared/effects/gsap`. A new module at `shared/effects/smooth-scroll.js` — one level up — built, shipped and enqueued while the gate printed `GATE PASSED`, having never measured it. Fixed by adding `shared/effects` to `_WATCHED_SUBDIRS` and baselining at 5,777 bytes gz.
- **Rule:** After adding a file a gate is supposed to cover, RUN the gate and confirm the file appears BY NAME in its output. "The gate passed" is not evidence it looked.

### [2026-07-30] Three admin absence-checks ran logged-out and returned a clean-looking zero
- **Pattern key:** `a-zero-from-an-unauthenticated-fetch-proves-nothing`
- **Evidence (D422):** Verifying wp-admin ships no frontend bytes, the credential env failed to source (password contains shell metacharacters). The requests were redirected to the login page and reported "0 references" — a PASS for a test that never ran. Caught only because the result looked too clean; re-run with a real auth cookie plus a control asserting the page was an admin page.
- **Rule:** Every absence-check carries a positive control proving the fetched thing is what you think it is. A zero is evidence only once you have proved you were looking in the right place.

### [2026-07-30] A grep count was reported as a row count; the header was locked at 3, the regex said 5
- **Pattern key:** `a-grep-count-is-not-a-measurement`
- **Evidence (D422):** `grep -c 'wp:sgs/site-header-row'` returned 5 and was stated as "5 rows". Block markup emits an opening AND a closing comment per block (self-closing empty blocks emit one), so 3 rows = 5 matches. The header is `templateLock:'all'` at 3 rows — had 5 been true it would have meant the lock was BREACHED. Bean caught it. Second instance the same session: a "missing" settings blob was present; the pattern broke on the tag.
- **Rule:** Before quoting a count from a regex, state what ONE unit looks like in the text and confirm the pattern matches it exactly once.

### [2026-07-30] A library option that does not exist was passed for a session, reading as an enforced safety guarantee
- **Pattern key:** `an-option-name-that-does-not-exist-is-discarded-in-silence`
- **Evidence (D422):** The smoother passed `smoothTouch: false` to keep phone scrolling native. That option does not exist in Lenis 1.3.25 (zero occurrences in `lenis.mjs` AND `lenis.d.ts`); unknown keys are destructured past with no warning. The guarantee was delivered entirely by the vendor default and would have flipped if upstream changed it. Real name `syncTouch`. Found by the pre-commit qc-council.
- **Rule:** Verify every option key against the INSTALLED version's types/source — not memory, not another major version's docs — and pass values you depend on EXPLICITLY rather than relying on a default that happens to agree.

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

### [2026-08-06] I misread my own gate's output within minutes of building it
- **Pattern key:** `a-dead-assignment-is-dead-code-not-a-dead-control`
- **Evidence:** CHECK 5 (dead assignment) returned 18 findings and I reported them to Bean as "18 client-facing controls that do nothing". Triage against the real consumers: 12 were unused locals whose feature WORKS (`sgs_transition_vars( $attributes )` reads the raw attributes itself), 1 more the same via `SGS_Container_Wrapper`, 2 were abandoned attrs, and only 3 were genuine dead controls. The actionable backlog was 5, not 18 — and the wrong number would have justified a fleet of agents for work that mostly did not exist.
- **Rule:** A finding count is not a severity. Before handing a gate's list to anyone, check what each row's consumer actually does — especially when the gate is one you just wrote and are inclined to trust.

### [2026-08-06] I deleted a concurrent track's committed files with a careless glob
- **Pattern key:** `check-what-a-glob-matches-before-deleting`
- **Evidence:** After a bash-escaping accident produced malformed report files, I ran `rm -f reports/visual-diff/*-2026-08-06.md` to clean up "my" files. That glob also matched 10 TRACKED reports another track had committed the same day (`image-sequence`, `nav-menu`, `site-header`, `trust-bar`, …). Only `git status` showing ` D ` lines revealed it; restored with `git checkout -- reports/visual-diff/`.
- **Rule:** On a shared worktree a DELETE is a cross-track action exactly as a DB write is. List what a glob matches before removing it, and check `git status` immediately after any bulk delete.

### [2026-08-08] A truncated search manufactured a false absence, and I told Bean it "existed nowhere"
- **Pattern key:** `a-truncated-search-manufactures-a-false-absence`
- **Evidence:** Bean asked whether the QC council's control-ORDER point had been captured. I searched the contract for `order|ordering|sequence|cluster`, piped it through `Select-Object -First 20`, saw only `BorderRadius`/`border` hits, and reported that ordering "existed nowhere". It did exist — Cross-cutting A carried it at ~line 980 ("Panel order — three competitors converged on ordering being deliberate"), well past the 20-hit cutoff. I then wrote a NEW obligation on top of research that was already there. Only re-running the same search unbounded found it.
- **Rule:** A capped search can only ever prove PRESENCE, never absence. Before writing "X does not exist", re-run the search with no `head`/`-First`/`Select-Object` limit, or count total matches first. Distinct from `a-greps-blind-spot-is-the-shape-of-the-grep` — there the PATTERN was wrong; here the pattern was right and the OUTPUT was cut.

