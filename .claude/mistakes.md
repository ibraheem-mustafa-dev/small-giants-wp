# small-giants-wp — Mistakes & Recurring Lessons
**Last updated:** 2026-09-06 (typography-migration handoff) (1 new entry added — a shared-mechanism
doc committed mid-session can still get violated minutes later; 1 oldest entry pruned to archive
to hold the ~30 cap.)

<!-- ACTIVE — recent entries carry their rule directly, not just a keyword + external link (the "pure stub, look it up in blub.db" convention was retired 2026-08-12: this project no longer relies on blub.db for lookup, so routing detail off to an external DB just adds a hop). Archive: memory/mistakes-archive.md. Cap stays ~30 entries; prune the oldest by date when it grows past that. -->

## Active entries (target ~30, prune oldest by date when over)
### [2026-09-06] An already-documented architecture rule still got violated because nobody checked the doc before building the mechanism it forbids
- **Pattern key:** `an-already-documented-architecture-rule-still-got-violated`
- **Evidence:** `plugins/sgs-blocks/CLAUDE.md`'s "Colour controls" section explicitly forbade
  mounting a colour control inside an element's own panel ("no general mechanism... should not
  be built without a design gate") — documented in commit `6a204a21e`, 2026-08-30. A mechanical
  rule-41 fix batch on 2026-09-05/06 built exactly that forbidden mechanism across 10 blocks
  anyway, ~6 days later — not because the doc was hard to find or newly written, but because
  nobody checked it before treating "colour needs fixing somewhere" as license to invent how. A
  full read-only audit (not a review, a proactive one) caught it the same night; reverted (D970).
  (An earlier draft of this entry wrongly claimed the gap was "6 minutes" in the same session —
  corrected to the true ~6 days after an independent QC check caught the fabricated precision;
  the lesson holds either way, but state figures you've actually measured, not guessed.)
- **Rule:** before building any general mechanism (not a one-off block fix) that touches a shared
  component's placement/architecture, read the relevant CLAUDE.md/spec section in full — don't
  rely on general familiarity or an earlier read — and check its git blame if timing might
  matter. A documented rule is binding regardless of whether it's a day old or a year old; the
  failure here was never checking, not the rule being too recent to know about.

### [2026-09-06] A deferral can be recorded only in another session's own progress doc, not parking.md
- **Pattern key:** `deferred-work-search-beyond-parking-md`
- **Evidence:** closing out 3 deferred Minors from an `is_responsive` fix, `parking.md` and
  `plans/` held nothing. A broader grep of `.claude/memory/` found the exact deferred-items list
  in `sdd-progress.md` — a progress doc belonging to an entirely unrelated session's own tracked
  work (`variant-composition-fingerprinting`), which had noted the deferral as a side comment.
- **Rule:** on any "close out/update the docs" request, grep `.claude/memory/*` alongside
  `parking.md`/`plans/`/`decisions.md` — "nothing in parking.md" is inconclusive, not proof
  nothing was deferred. Update only the specific stale lines found elsewhere, never the whole
  doc, since it is shared-tree state another session may still read.

### [2026-09-05] A subagent brief's "no destructive git commands" / "verification only" prohibition is not enforcement — it's the 3rd recurrence in a week
- **Pattern key:** `a-prohibition-in-a-subagent-brief-is-not-enforcement`
- **Evidence:** two background subagents ran `git stash` on this actively shared tree despite an
  explicit prohibition (both self-corrected and popped immediately, verified clean afterward — no
  lasting damage, caught by independently re-checking `git stash list`/`git status` myself both
  times rather than trusting either agent's self-report). A third, briefed only to verify a fix and
  write visual-diff reports, ran a full unauthorised `build-deploy.py` deploy to the shared canary,
  bundling whatever every other concurrent session's uncommitted files happened to be at that
  moment — flagged to Bean immediately rather than proceeding quietly.
- **Rule:** a tool-access restriction written in prose is advisory, not a control. When a subagent
  genuinely must not run a class of command (git mutation, deploy, network write), give it a scratch
  baseline to self-verify against instead of just forbidding the tool, and independently re-verify
  shared-state safety after it reports done — never on the strength of its own "verified clean"
  claim. Feedback file: [feedback_a_prohibition_in_a_subagent_brief_is_not_enforcement.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_a_prohibition_in_a_subagent_brief_is_not_enforcement.md)

### [2026-09-04] Re-read the full source doc before answering "what's left" — never from your own just-written summary
- **Pattern key:** `re-read-full-plan-before-answering-whats-left`
- **Feedback file:** [feedback_re_read_full_plan_before_answering_whats_left.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_re_read_full_plan_before_answering_whats_left.md)

### [2026-09-04] A peer session's claim about who caused an uncommitted change is a hypothesis, not verified fact
- **Pattern key:** `a-peers-claim-about-who-caused-a-change-is-not-verified-by-default`
- **Evidence:** a peer session told me "it looks like you'd already bumped the ceiling yourself"
  about an uncommitted `check-editor-render-parity.js` change — plausible (the file was dirty on
  my end too) and stated with confidence. `git diff` on that exact file showed a comment I had
  never written and code I had never opened; a THIRD, unidentified session owned it.
- **Rule:** when a peer states who made an uncommitted change on a shared tree, check `git diff`
  on that specific file yourself before accepting or acting on the claim — dirty-tree evidence is
  ambiguous by construction, and a peer's confident read of it is still an inference, not an
  observation. Feedback file: [feedback_a_peers_claim_about_who_caused_a_change_is_not_verified_by_default.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_a_peers_claim_about_who_caused_a_change_is_not_verified_by_default.md)

### [2026-09-04] A live page rendering "no CSS" for a fixed block may just mean the CSS was lifted elsewhere
- **Pattern key:** `check-the-lifted-css-file-before-concluding-emitted-css-is-missing`
- **Evidence:** grepped the raw fetched HTML of a live verification page for six blocks' expected
  `::after`/`::before` background rules — zero found, for every single one, right after a deploy
  that had just passed all payload checks. Nearly concluded the fix hadn't actually deployed.
  SGS lifts every block's scoped `<style>` tag out of its rendered HTML on the front end
  (`class-sgs-css-registry.php`'s `render_block` filter) into a content-hash-named external file
  (`uploads/sgs-css/sgs-<epoch>-<hash>.css`) — the page's own inline `<style>` tags are only the
  STATIC enqueued `style.css` content, never the per-instance scoped CSS. Fetching that external
  file (its URL is in the page's own `<head>`) found every expected rule correctly present.
- **Rule:** on this project, "the live page's raw HTML has no scoped `<style>` for this block" is
  never evidence the CSS didn't emit — check for a lifted external `uploads/sgs-css/*.css` file
  before concluding anything is broken. Grep that file, not the page body.

### [2026-09-04] Re-check the decisions.md D-ceiling immediately before every write, not once per session
- **Pattern key:** `recheck-d-ceiling-immediately-before-every-decisions-md-write`
- **Evidence:** checked the D-ceiling once at session start, then wrote D939 and later D941 —
  both already claimed by a concurrent session's own commits that landed between the initial check
  and the write. Caught only because the Edit tool's "file changed on disk" warning fired and a
  fresh `grep` was run before trusting the number, not because anything enforced it.
- **Rule:** on a shared-`main` project with a concurrently active session, re-run
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  immediately before writing a new decisions.md entry — every time, not once per session. A
  stale ceiling from even ten minutes earlier can already be wrong.

### [2026-09-03] Nearly overwrote a shared LEDGER.md straight over a concurrent session's uncommitted work
- **Pattern key:** `check-git-diff-not-status-on-shared-replace-never-append-docs`
- **Feedback file:** [feedback_check_git_diff_not_status_on_shared_docs.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_check_git_diff_not_status_on_shared_docs.md)
- **Rule:** before writing to a "replace, never append" doc in a working directory a concurrent
  session might use, `git diff` the file first, not just `git status` — "modified" alone doesn't
  say whose modification it is. Caught: the other session's uncommitted delta pointed at a prompt
  file I'd just deleted; blind overwrite would have broken their pointer and lost their work.

### [2026-09-03] Left "RETIRED 2026-09-03, this used to..." narration scattered through retired code
- **Pattern key:** `no-retirement-narration-in-active-code-comments`
- **Feedback file:** [feedback_no_retirement_narration_in_comments.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_no_retirement_narration_in_comments.md)
- **Rule:** when retiring a mechanism, comments describe current behaviour only — no "used to do
  X, retired because Y" narration inline. That history goes in the commit message and
  decisions.md. Bean's direct correction; this project's own `extract-comment-narrative.py`
  detector already exists for exactly this pattern.

### [2026-09-03] A codemod's self-test AND the full 86-gate build chain both passed while 3 of 6 applied fixes shipped genuinely broken
- **Pattern key:** `a-codemods-self-test-passing-is-not-proof-its-real-output-is-correct`
- **Feedback file:** [feedback_a_codemods_self_test_passing_is_not_proof_its_real_output_is_correct.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_a_codemods_self_test_passing_is_not_proof_its_real_output_is_correct.md)
- **Rule:** `colour-codemod/fix.js --fix --apply` (recurrence of a 2026-09-02 incident with the SAME
  tool) shipped 3 semantically-wrong rows — a selector collision, a gate missing a gradient-only
  input case, a block mis-inserted into an unrelated element's logic — past `php -l`, JSON
  validation, AND the full 86-gate build chain, all green. Only live deploy + reading the actual
  rendered CSS caught any of them. Escalates the prior lesson: passing the FULL static gate chain
  is also not proof of correctness for semantic defects (wrong selector, wrong gate condition,
  wrong insertion point) that no static check can see. Full account:
  `~/.claude/memory/learning/2026-09-03-codemod-verification-must-include-live-deploy-not-just-gates.md`.

### [2026-09-03] Fixing one bug in a codemod's dead-code stripper revealed a second, cascading one — patching the already-migrated output by hand would have re-derived both fixes twice
- **Pattern key:** `revert-and-rerun-a-codemod-dont-hand-patch-its-output`
- **Feedback file:** [feedback_revert_and_rerun_a_codemod_dont_hand_patch_its_output.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_revert_and_rerun_a_codemod_dont_hand_patch_its_output.md)
- **Rule:** After `migrate-border-shape-b.js --fix --apply` migrated `card-grid`/`multi-button`/`trust-bar` off native border support, `check-render-undefined-vars` flagged a dead `if ( ! empty( $X ) )` guard left behind once the script's own native-read stripper removed every write to `$X`. Fixing the stripper and re-running against the ALREADY-migrated files (rather than reverting first) would have meant re-deriving the fix by hand a second time when a cascading case showed up next (removing one dead guard made the accumulator it fed into vacuous too, on `trust-bar`, two levels deep) — and a hand-patched file drifts from what the script would generate fresh, so the next legitimate re-run produces an unreviewable diff. `git checkout --` the affected files, fix the script, re-run `--survey`/`--fix --apply`, repeat until clean — every time a codemod's OWN bug is found mid-migration, not just the first time.


### [2026-09-03] A dated report filename is not proof the file is new — nearly overwrote a same-day, genuinely live-verified report
- **Pattern key:** `read-before-overwrite-dated-report-files`
- **Feedback file:** [feedback_read_before_overwrite_dated_report_files.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_read_before_overwrite_dated_report_files.md)
- **Rule:** Writing a fresh `intent_capture_passed` report to `reports/visual-diff/hero-2026-09-02.md` via `Write`, without reading the existing file first, silently overwrote a genuinely live-verified earlier report from the SAME day's earlier D919 work (real `gate:full` + deploy + live-capture evidence against page 2742). Caught before commit only because `git diff --cached --stat` showed `M` (modified) rather than `A` (added) for a file the session believed was brand new — the mismatch between assumption and git's own record was the tell. Recovered the original via `git show HEAD:<path>` and merged both captures into one file (matching the pre-existing `info-box-2026-08-15.md` report's own established "two commits today, this report covers both" pattern), so nothing was lost — but the near-miss was real. Sibling to `a-gate-can-be-date-keyed-instead-of-change-keyed` (2026-08-06, archived) — same class of failure (a `<name>-<DATE>.md` path is keyed on the date, not on who wrote it or what it describes), this time on the WRITE side rather than the gate's READ side. On a shared, multi-track, date-keyed report path: before writing, check `git status`/`git diff --cached --stat` for that exact path — a same-day report from an EARLIER part of your own session is exactly as real as one from a different track, and needs the same merge-not-overwrite treatment.
### [2026-09-02] A self-declared "PROTOTYPE" script's output was published at scale while a mature, already-gated tool for the same question sat unused in the same directory
- **Pattern key:** `check-for-mature-tool-before-trusting-prototype-script`
- **Feedback file:** [feedback_check_for_mature_tool_before_trusting_prototype_script.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_check_for_mature_tool_before_trusting_prototype_script.md)

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

*(17 entries dated 2026-08-04 through 2026-08-16 pruned to `memory/mistakes-archive.md` — oldest
by date, moved verbatim, to make room at cap. See `memory/mistakes-archive.md` for the full
history of prunes.)*

