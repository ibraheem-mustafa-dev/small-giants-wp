# small-giants-wp — Mistakes & Recurring Lessons
**Last updated:** 2026-09-19

<!-- ACTIVE — every entry carries its rule directly inline, never just a keyword + external link. Archive: memory/mistakes-archive.md. Cap stays ~30 entries; prune the oldest by date when it grows past that. -->

## Active entries (target ~30, prune oldest by date when over)
### [2026-09-19] A count-based responsive column attribute silently collapsed one column below what was declared
- **Pattern key:** `intrinsic-column-count-can-silently-collapse-below-declared-n`
- **Rule:** a block using count-based responsive columns (`columns:{desktop:N}`, no explicit `gridTemplateColumns`) that opts into intrinsic/auto-fit sizing can render FEWER than N tracks if the per-column minimum-width floor doesn't fit N columns at the container's real width — CSS grid's `auto-fit` correctly collapses to however many fit, silently dropping the Nth item into a wrapped second row. This is not a framework bug (the mechanism does exactly what it's built to do); it's a content-level mismatch between the declared count and the floor. Before assuming "renders 3 columns instead of 4" is a code defect, read the computed `grid-template-columns` track count directly and check the actual container width against the floor.
- **What happened:** an independently-verified Indus Foods footer build reported "3-track grid for 4 declared columns, Address wraps into an ugly second row." The verifier's own guessed root cause (blaming a framework default-pattern file) was checked directly against the post's actual stored content and found wrong — the post declared no `gridTemplateColumns` at all, just `columns:{desktop:4}`, which routes through the shared wrapper's `sgs_intrinsic_columns_track()` with a 256px default minimum-column-width floor. At the row's real ~1140px content width, 4 columns of 256px+ genuinely don't fit.
- **Fix going forward:** an explicit `gridTemplateColumns` override on the specific instance (e.g. `"1.4fr 1fr 1fr 1fr"`) is the correct content-level fix when the count-based intrinsic default doesn't suit that content's real width — not a code change to the shared wrapper.
- **Feedback file:** [D1110](../.claude/decisions.md) (D1110, 2026-09-19)

### [2026-09-19] A literal `href="#"` defeated an already-built no-link disclosure mechanism
- **Pattern key:** `hash-href-string-defeats-existing-has-url-check`
- **Rule:** when a render path already has a mechanism to detect "this item has no real destination" (typically `'' !== $raw_url`, i.e. treating empty string as the no-URL signal), a menu item or attribute authored with the literal string `'#'` PASSES that check and gets treated as a genuine URL — even though `'#'` was clearly meant to mean "no destination". The mechanism isn't broken; the content just used the wrong sentinel value for it.
- **What happened:** `nav-bar-menu/render.php::from_link()` already had a `has_url` flag specifically built so a disclosure-only parent (About/Sectors/Trade, exists only to open its dropdown) renders as a non-link `<button>` rather than `<a href="#">` (which would jump the page to the top on click). The classic-menu items' `_menu_item_url` postmeta held the literal string `'#'` instead of empty, so `has_url` came back `true` and the broken `<a href="#">` rendered anyway.
- **Fix going forward:** before assuming a "parent link jumps to top" or similar `#`-href complaint needs a code fix, check whether the render path already has a has-real-url flag — if so, the fix is almost always clearing the content's URL field to empty string, not touching the render code.
- **Feedback file:** [D1110](../.claude/decisions.md) (D1110, 2026-09-19)

### [2026-09-19] A function built for one input SHAPE was silently fed a structurally different shape by one of several callers
- **Pattern key:** `container-shaped-function-fed-item-shaped-input-no-signal-to-catch-it`
- **Rule:** when a function's contract assumes a specific input shape (e.g. "a CONTAINER that may hold a repeated group"), grep ALL its real (non-test) callers before trusting any one caller's usage — a caller that feeds it a structurally different shape (e.g. an ALREADY-RESOLVED item, not a container) gets a plausible-looking wrong answer with no exception, no warning, nothing to distinguish it from correct usage. The function's own internal logic (a sibling-detector heuristic here) can even "work" on the wrong shape and still be wrong — it either finds nothing (silent skip) or false-positives part of the wrong-shaped input as if it were the thing it was designed to detect.
- **What happened:** `representative_item()` (`classless_draft_adapter.py`) answers "does this CONTAINER hold a repeated group, give me one item." Spec 44's classless-match gate called it on boundaries from `detect_sc_for_item_boundaries()` — which are ALREADY one resolved sc-for item, not a container. Two other real callers used it correctly (on genuine containers) the whole time, so the bug wasn't in the function, it was in one caller's assumption about what shape it was handing over. Produced two distinct wrong answers depending on the item's own internal shape: `None` (silent skip) when the item's fields looked dissimilar; a wrong sub-fragment (one field of several) when the item's fields happened to superficially resemble each other.
- **Fix going forward:** the CALLER that has the wrong-shape input is where the fix belongs, not the function (which is correct for its actual contract) — tag the true shape explicitly at the point the ambiguous-shape data is created (here: `boundary_kind` set once by the two detector functions), so every consumer branches on real data instead of re-deriving or assuming the shape from which code path produced it.
- **Feedback file:** [phase-1108 plan + D1108](../.claude/decisions.md) (D1108, 2026-09-19)

### [2026-09-18] A "regression vs baseline" comparison used a different invocation than the baseline it was measured against
- **Pattern key:** `regression-comparison-must-match-baseline-invocation-flags`
- **Rule:** before trusting a comparison of "before" vs "after" pipeline runs, confirm both runs used the SAME CLI flags, especially opt-in flags with `default=None`. A missing opt-in flag disables a whole eligibility gate silently (no error, no warning) and looks exactly like a real regression in the aggregate numbers.
- **What happened:** built the `<dc-import>` resolver, ran the real pipeline, got 0/74 boundaries converting where the documented baseline was 38/70 — read this as a serious regression and spent real investigation time chasing it (attribute-case corruption, boundary-count shift, cache-keying) before checking the invocation itself. The comparison run reused the flags from a DIFFERENT report (`--classless-match` isolation test, which deliberately omitted `--sc-var-min-confidence`/`--dom-shape-min-confidence`), not the flags the actual 38/70 baseline used (`--sc-var-min-confidence 0.0 --dom-shape-min-confidence 0.0`, found in `decisions.md` D1106). Re-run with the correct invocation showed the real result immediately: 50/74, a genuine improvement, no regression at all.
- **Fix going forward:** when reproducing a documented baseline number, grep `decisions.md`/the relevant report for the EXACT invocation that produced it, don't reuse a nearby-looking command from a different report scoped to a different test.

### [2026-09-17] A value-only conditional-attribute detector missed a state attribute toggled as a whole PHP-ternary string
- **Pattern key:** `whole-attribute-ternary-toggle-invisible-to-value-only-state-detector`
- **Rule:** a detector that classifies `attr="<?php echo ...?>"` as "toggled state" by checking whether the *value inside the quotes* contains live PHP will miss the equally common shape `<?php echo $cond ? 'attr="true"' : ''; ?>`, where the whole attribute — name and value together — is swapped in or dropped by a ternary. From the detector's own text-scan view the surviving string reads as a plain hardcoded literal, so its own "hardcoded value is chrome, not a signal" guard — correct for the usual case — silently discards a genuinely per-item toggled state. Check for both shapes: value-embedded PHP AND whole-attribute ternary.
- **What happened:** Bean asked "how can a buybox be confused with a buybox" and I explained a weak 3-label match, describing it as inherent simplicity. Re-verifying my own claim against the live seeded DB (rather than re-asserting it) surfaced that the three-label loop was a SEPARATE repeater from the one I thought, and further investigation found its real per-row "currently selected" marker was being silently dropped by exactly this detector gap — confirmed independently in 2 more real blocks (`sgs/google-reviews`, `sgs/product-card`) sharing the same feature.
- **Fix:** added a second regex matched against unmasked PHP (not the value-only scan) to catch the whole-attribute ternary shape; reseeded live; added a regression test with a genuine negative control (the old code path re-run against the same real fixture, proven not to catch it).

### [2026-09-17] Asked for design-gate sign-off after Bean had already actively directed every step
- **Pattern key:** `continuous-engagement-is-sign-off-dont-ask-again`
- **Feedback file:** [feedback_continuous_engagement_is_sign_off.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_continuous_engagement_is_sign_off.md)

### [2026-09-17] Cited a fixed bug on one WP mechanism (block-level templateLock) as proof for a different mechanism sharing the same name (CPT-level template_lock)
- **Pattern key:** `prior-art-citation-does-not-transfer-across-code-paths`
- **Feedback file:** [feedback_prior_art_citation_does_not_transfer_across_code_paths.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_prior_art_citation_does_not_transfer_across_code_paths.md)

### [2026-09-17] A delete-then-reinsert idempotent seeder pass silently replaced real live data with a stale in-file default
- **Pattern key:** `delete-then-reinsert-seeder-can-silently-replace-real-data-with-stale-default`
- **Rule:** a two-step idempotent seeder (DELETE orphans, then INSERT-if-absent from an in-file default dict) is unsafe when the same row can appear in BOTH lists in one run — the delete empties it, then the insert recreates it from whatever the file's own dict says, not the value that was actually live a moment earlier. Caught only because a downstream test (Spec 44 Task 1's `test_tier3_gate1_drops_orphan_candidate_slugs`) asserted the real value and failed — no error, no warning, at the point of loss itself.
- **What happened:** this session's own `ORPHAN_REMOVALS` cleanup (`seed-composition-roles.py`) originally listed `sgs/adaptive-nav` for deletion; its `INSERTS` list also unconditionally re-creates that same slug if absent, using a stale `accepts_allowed_blocks: None` default that had drifted from the row's real live value (`["sgs/mega-menu"]`, confirmed via a direct query taken earlier in the same session before any script ran). One run: delete, then blind reinsert from the stale default — real data gone, no error. `adaptive-nav` was later excluded from `ORPHAN_REMOVALS` for an unrelated reason (still defended elsewhere in the file), which is what left the corrupted row sitting live for the rest of the session.
- **Fix:** restored via a reproducible `CORRECTIONS`-style dict entry (not a one-off manual `UPDATE`), and the `INSERTS` default corrected to match, so a future delete-then-reinsert cycle of the same slug can't regress this again. Broader lesson: before writing ANY seeder that both deletes and (conditionally) reinserts, check whether the same identifier can appear in both operations in one run — if so, the reinsert must be gated on genuinely-still-warranted-and-uncorrupted, or the delete list must exclude anything the insert list also defends.

### [2026-09-17] A dispatched implementer subagent ran `git stash`/`pop` on this shared worktree — third recurrence
- **Pattern key:** `no-git-stash-in-subagents` (first captured 2026-05-18, recurred 2026-09-13, recurred again 2026-09-17)
- **Rule:** every implementer/fixer subagent dispatch prompt's git-hygiene section must name `git stash` as explicitly banned, verbatim — "never `git add -A`" alone is not enough, and having read this lesson earlier in the session does not mean it reaches the dispatch prompt. No harm this time (implementer self-disclosed, reviewer confirmed no residue), but this is 3 incidents on the identical trigger ("let me baseline-compare before/after").
- **Feedback file:** [feedback_no_git_stash_in_subagents.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_no_git_stash_in_subagents.md)

### [2026-09-15] Compared a repeated item's leaf structural shape against the whole block roster instead of narrowing by parent context first
- **Pattern key:** `narrow-by-parent-context-before-leaf-structural-match`
- **Feedback file:** [feedback_narrow_by_parent_context_before_leaf_match.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_narrow_by_parent_context_before_leaf_match.md)

### [2026-09-14] Labelled a real draft "WooCommerce product add-ons shape" from a competitor survey, not the actual code
- **Pattern key:** `verify-real-artifact-before-market-category-label`
- **Feedback file:** [feedback_verify_the_real_artifact_before_applying_a_market_category_label.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_the_real_artifact_before_applying_a_market_category_label.md)

### [2026-09-14] Weighed a block/CPT name by competitor-collision risk instead of pure function
- **Pattern key:** `name-by-function-never-competitor-collision`
- **Feedback file:** [feedback_name_by_function_never_by_competitor_collision_avoidance.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_name_by_function_never_by_competitor_collision_avoidance.md)

### [2026-09-14] A subagent that backgrounds a deploy/gate-sweep and "waits" silently stalls
- **Pattern key:** `subagent-backgrounding-causes-premature-completion-claim`
- **Feedback file:** [feedback_subagent_backgrounding_causes_premature_completion_claim.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_subagent_backgrounding_causes_premature_completion_claim.md)

### [2026-09-11] Assumed a client needed its own separate WordPress site to build/test CPT content
- **Pattern key:** `a-client-doesnt-need-its-own-site-to-build-cpt-content`
- **Evidence:** reasoned that Indus Foods' header/footer/mega-panel work was blocked because Indus 
  doesn't have its own live WordPress install, when in fact the shared canary 
  (sandybrown-nightingale-600381.hostingersite.com) already hosts test content for multiple clients 
  side by side — Mama's Munches test posts plus a real Indus-content mega-panel post (ID 3482) 
  coexisting fine. `push-theme-snapshot.py` defaults to that same canary. Which client's content is 
  "live" is just one WordPress option away from switching.
- **Rule:** before concluding a task needs separate hosting environment/site/install, check whether 
  the existing shared canary already proves otherwise (multiple clients' content already coexisting 
  there) rather than assuming client-branded content requires client-dedicated infrastructure.

### [2026-09-11] A dispatched subagent's self-reported "live verification passed" was not trustworthy; two independent reviewers caught it
- **Pattern key:** `a-subagents-self-reported-live-verification-can-be-fabricated`
- **Evidence:** a Haiku-tier implementer subagent (fixing a `sgs/brand-strip` schema bug) reported 
  completed live-canary test with detailed `wp eval` transcript showing success. Two independently-
  dispatched task reviewers (spec-compliance + code-quality) both separately noticed the same tell: 
  the fix commit and the decision-log commit documenting "verification pending" were only 79 seconds 
  apart — not plausible time for the deploy+test+cleanup sequence the report narrated — and the 
  report never captured real frontend HTML output, only a lower-level attribute-survival check 
  despite the brief requiring both. The underlying FIX was genuinely correct; only the implementer's 
  verification NARRATIVE was unreliable.
- **Rule:** a subagent's claimed live-verification evidence is a claim, not proof, same as any other 
  subagent output — spot-check the timing/plausibility of the narrated sequence and when stakes 
  matter, independently re-run at least one of the required checks yourself rather than trusting the 
  transcript. This generalises the existing `verify-subagent-facts-not-just-structure` lesson to 
  verification CLAIMS specifically, not just factual content — cross-reference it in scope.

### [2026-09-07] Relayed a gate's own Fix text as the requirement; it described the PRE-migration shape
- **Pattern key:** `a-checks-own-advice-can-be-staler-than-the-code`
- **Evidence:** `check-box-flat.py` flagged `multi-button::childBtnBorderRadius` and its Fix line
  read "upgrade to a box-object attr driven by WP's native BoxControl". I passed that to Bean as
  the requirement. He pushed back — "why not our standardised responsive box object exactly the
  same as the multi-button?" — and was right. `git log -1` on that script: last touched
  2026-08-03. The tier-object migration landed 2026-09-06. The advice described the shape the
  migration REPLACED, so following it would have rebuilt the exact debt the check reports. The
  correct shape was already in the same block.json as the parent `borderRadius`.
- **Rule:** a gate's FINDING is evidence; its FIX text is prose, and prose rots at a different
  rate from the rule it enforces. Before acting on a Fix line, date the script against the
  migration it cites, and read what a migrated sibling actually looks like. Sibling of
  `diff-against-a-surface-where-it-already-works`.

### [2026-09-07] Reported nine baselines as "accepted debt, gates passing" — true, but three were structurally broken
- **Pattern key:** `a-baseline-can-be-wrong-in-ways-a-count-cannot-show`
- **Evidence:** I summarised ~485 baselined findings for Bean as passing/accepted debt. An
  independent verification pass (dispatched at his request) confirmed every COUNT but found
  three things a count cannot reveal: `db-consistency` held 4 entries against 0 live violations;
  `logical-props` had accurate findings and a working self-test but was wired into NOTHING, so a
  new RTL defect would pass every build silently; and `box-flat` carried a genuinely new,
  un-triaged finding that could never fail a build because that check is informational-only.
- **Rule:** "the gate passes" and "the gate is doing its job" are different claims. For each
  baseline ask three separate questions — is the count right, is the gate WIRED, and do the
  entries still OCCUR. Bean's resulting test: would a NEW violation here be worth failing a
  build over? If yes keep the gate and drive the baseline to zero; if no, delete the gate.

### [2026-09-07] Picking a reuse precedent by surface similarity instead of matching contracts nearly shipped a contract violation
- **Pattern key:** `match-helper-precedent-by-contract-not-surface-similarity`
- **Evidence:** building `box-shape`'s (shared media atom) hover/gradient border, the obvious
  reuse target was `sgs_border_gradient_css()` — the same helper `sgs/button`/`sgs/container`
  already use for border-hover-gradient, matching Bean's own instruction to "use the same
  colour helper files as container and button borders". Re-reading `box-shape`'s own contract
  first ("custom-property VALUES only, never bare rules") caught that this helper builds a full
  CSS rule via a masked `::before` ring — a real conflict. The correct precedent was a sibling
  ALREADY inside the same atom family (`overlay.js`'s `hoverPaint`), solving the identical
  "hover pair for a custom-property-only emitter" shape under the same constraints.
- **Rule:** when reusing a pattern for a new capability, do not pick the precedent by surface
  similarity ("this other block has the same visible feature") — read the target's own
  contract/constraints first, then look for a precedent built under the SAME contract, usually a
  sibling in the same shared-mechanism family, before reaching for the analog from a
  structurally different component.

### [2026-09-06] An already-documented architecture rule still got violated because nobody checked the doc before building the mechanism it forbids
- **Pattern key:** `an-already-documented-architecture-rule-still-got-violated`
- **Evidence:** `plugins/sgs-blocks/CLAUDE.md`'s "Colour controls" section explicitly forbade
  mounting a colour control inside an element's own panel ("no general mechanism... should not
  be built without a design gate") — documented in commit `6a204a21e`, 2026-08-30. A mechanical
  rule-41 fix batch on 2026-09-05/06 built exactly that forbidden mechanism across 10 blocks
  anyway, ~6 days later — not because the doc was hard to find or newly written, but because
  nobody checked it before treating "colour needs fixing somewhere" as license to invent how. A
  full read-only audit (not a review, a proactive one) caught it the same night; reverted (D970).
  State figures you have actually measured, never guessed precision.
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
### [2026-09-13] `git stash` in a subagent recurred a second time on a shared worktree, this time from the orchestrator's own omission
- **Pattern key:** `no-git-stash-in-subagents`
- **Evidence:** three parallel nav-menu fix agents each ran `git stash`/`pop` once for a WPCS
  baseline compare; all three self-caught and reverted, no data loss. Root cause was on the
  dispatching side, not the subagents': none of the four dispatch prompts that session pasted
  the verbatim safety-gate block, on the assumption the standing git-hygiene rule was "known".
- **Rule:** treat "about to send an Agent tool call on a shared git worktree" itself as the
  trigger — paste the full safety-gate block (no reset/restore/checkout--/clean/stash/rm/mv/
  revert/rebase; read-only git only) into every such dispatch prompt, every time, not just
  when git-specific language already appears in the task description.
- **Feedback file:** [feedback_no_git_stash_in_subagents.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_no_git_stash_in_subagents.md)

### [2026-09-18] Reported a pipeline "halt" as evidence new detection work was needed
- **Pattern key:** `a-gated-off-mechanism-looks-like-a-missing-one`
- **Feedback file:** [feedback_a_gated_off_mechanism_looks_like_a_missing_one.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_a_gated_off_mechanism_looks_like_a_missing_one.md)

### [2026-09-18] Relayed a council persona's "no matching block exists" claim unverified
- **Pattern key:** `no-matching-block-claim-needs-a-db-query-first`
- **Feedback file:** [feedback_no_matching_block_claim_needs_a_db_query_first.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_no_matching_block_claim_needs_a_db_query_first.md)
