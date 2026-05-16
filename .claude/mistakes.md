# small-giants-wp — Mistakes & Recurring Lessons
**Last updated:** 2026-05-19 (1 new lesson — QC panels validating file artefacts must assert file existence end-to-end, not just function-level byte-equality)

## 2026-05-19 — QC panel byte-equality check was tautological while the writer was inert

**What:** The 2026-05-18 Phase 9 pre-work shipped `--debug-trace` infrastructure supposed to emit per-section `convert-trace-<boundary>.jsonl` files. 4-rater /qc panel ratified the change SHIP across all lenses. Step 4 shakeout reported "byte-identical extraction with trace on vs off — leaked_trace=False on every section".

**Reality (caught 2026-05-19):** First brand-walkdown command produced `expected-rules-b1.jsonl` but NO `convert-trace-b1.jsonl`. Root cause: `stage_4_5_6_7_8_extract` in `sgs-clone-orchestrator.py` assigned `_trace_mod` without a `global` declaration. Python compiles it as a local; the `is None` check on the prior line raises silent `UnboundLocalError` swallowed by the broad `except: _cv2_trace = None`. The trace was never bound. The "byte-identical extraction" was tautologically true because nothing was being captured either way.

**Why the panel missed it:** All 4 raters reviewed the diff at the FUNCTION level. None ran the orchestrator end-to-end and asserted the file appeared at the expected path with expected event count. The behavioural-equivalence shakeout was the wrong test — it would pass equally if the writer was correct AND if the writer was inert.

**Rule for future panels:** When the QC artefact under test is a FILE (any .jsonl/.json/.png/.css/.md the change is supposed to produce), every rater's prompt MUST include:

1. Run the production command end-to-end with the flag enabled
2. `ls <run_dir>` — confirm the file exists
3. `wc -l <file>` — confirm non-zero
4. `head -1 <file>` — confirm schema matches the spec
5. Compare event count against expected emission sites

Function-level behavioural equivalence is NOT sufficient. Captured as `feedback_qc_panel_must_assert_file_existence.md` in CC auto-memory. Sibling rule: `verify-rendered-output-not-internal-metrics` (blub.db row 194) — same shape, different domain.

## 2026-05-18 — Substring matching on bounded-suffix vocabulary is too permissive (false-positive coverage)

**The rule:** When matching a key against a set of known suffixes from a controlled vocabulary, do NOT use Python `in` (substring). The match must be ANCHORED to the suffix boundary — either `endswith(suffix)` for bare matches, or `endswith(suffix + tail)` for known optional tails. Substring matching silently inflates positive-match rate whenever ANY vocabulary suffix is also a substring of any other vocabulary item.

**Incident:** `compute_attribute_coverage` in `scripts/pixel-diff.py` initial implementation used `suf_l in k` where `suf_l` is lowercase SGS-attr-suffix (e.g. "size") and `k` is a lowercase attr name (e.g. "iconsize"). The check was meant to ask "is the attr `iconSize` evidence that the `size`-property was lifted onto something?". For the suffix "color" → keys like `backgroundColor` / `borderColor` this works (no other vocabulary item contains "color" as substring). For "size" the substring is shared across `fontSize` / `iconSize` / `imageSize` — three distinct semantic suffixes from the property_suffixes table. A CSS `font-size` rule could be flagged COVERED if the section happened to have `iconSize` lifted onto an unrelated block. Caught by the adversarial QC rater (Sonnet-as-Cerebras-replacement) before the bug shipped to production walkdown.

**Why this is high-impact recurrence risk:** The metric was being designed AS the gate for tomorrow's brand+hero walkdown. A 95%-coverage false-positive routes the operator to block/theme work when the converter actually missed font-size; the silent miss never gets diagnosed and the brand declaration of "converter-DONE" is wrong. The substring shortcut would have looked safe in dev-time smoke testing (small attr stubs without iconSize/imageSize never expose the false-positive) and bitten at production scale.

**Fix:** suffix-anchored match — `key.endswith(suffix)` OR `key.endswith(suffix + breakpoint_tail)` where `breakpoint_tail` is one of {mobile, tablet, desktop, hover, focus, active, disabled} drawn from `modifier_suffixes` vocabulary. Adversarial probe verifies fix: stub with only `iconSize` + `imageSize` (no fontSize) returns 0% coverage for font-size rules. Commit `397295c3` (2026-05-18).

**Generalisation:** Any time you write a vocabulary-matching check against a string key, ask "could ANY vocabulary item be a substring of another vocabulary item?" If yes (and it almost always is — the SGS property_suffixes table has 117 entries with extensive shared roots), do not use substring; use anchored match.

---

## 2026-05-18 — Docstring promised "soft-reset to None at function exit" but implementation never did

**The rule:** When a docstring describes behaviour at function-lifetime boundaries (entry/exit, success/failure paths), the implementation MUST actually do it. Drift between docstring and code is a recurring source of subtle bugs that pass tests for the current call shape but fail in any extension (exception path, parallel dispatch, future maintainer reading the docstring as truth).

**Incident:** Pre-work `convert_section()` in `plugins/sgs-blocks/scripts/orchestrator/converter_v2/__init__.py` bound `v3.set_trace(trace, boundary_id)` at entry. The docstring above the call read "Soft-reset to None at function exit so subsequent sections don't inherit." The reset was never implemented. Sequential dispatch happened to be safe (next call overwrites the `_TRACE` global immediately, so trace-leak between sections was invisible). Caught by Sonnet converter-internals QC rater because the docstring made the intent visible — the rater compared docstring to code and flagged the gap.

**Why this is high-impact recurrence risk:** Future parallel/threaded dispatch (mentioned explicitly in this session's plan) would race on the module-level `_TRACE` global. Thread A binds for section "hero", Thread B binds for section "brand"; Thread A's walker emits into Thread B's trace file. The docstring suggested this was already handled; it wasn't. A future maintainer reading the docstring and not checking implementation would assume safety they don't have.

**Fix:** Split `convert_section` body into `_convert_section_body()` helper. Wrap call in `try/finally`. `finally: v3.set_trace(None, "")`. Re-shakeout confirms `leaked_trace=False` on every section. Commit `10a93d87` (2026-05-18).

**Generalisation:** Apply the verify-rendered-output-not-internal-metrics discipline (blub.db row 194) to docstrings too. A docstring claims behaviour; verify the implementation actually does it. When you write a docstring describing lifecycle behaviour ("resets at exit", "cleans up on failure", "idempotent on retry"), write the test or shakeout that PROVES the claim before shipping. If you can't write that proof cheaply, the docstring is aspiration, not contract.

---

## 2026-05-17 — parse_css regex captured 0 of 13 @media blocks; every responsive variant silently dropped at parse time

**The rule:** Recogniser bugs that emit ZERO trace events look identical to clean runs. Before declaring a recognition gap "missing feature in converter", verify the parser saw the source data at all. Add `parse_input` trace events + an `expected-rules-<boundary>.jsonl` baseline that lists every CSS declaration selecting into the section's DOM subtree. Diff `expected ∖ css_rule_seen` to surface silent misses.

**Incident:** During Phase 9 lift-fidelity sweep, categorised 537 leftover-bucket entries: 22% (120 entries) classified as "responsive variants failing". Parked as P-PHASE8-NEW-4 (CSS-lift media-query support) — assumed cv2 walker needed media-query support added. Spent ~90 min on the categorisation work. When the parallel implementation agent investigated, the actual root cause was `parse_css` regex `@media[^{]+\{((?:[^{}]+\{[^{}]+\})+)\}` requiring media body to end with `}` immediately after the last inner rule's `}`. Real CSS always has whitespace between, so the regex matched 0 of 13 @media blocks on Mama's mockup. Every responsive override was silently dropped at parse time. After the brace-balanced scanner fix: 13/13 captured, hero headlineFontSizeDesktop correctly 58 (was 34 from base-CSS only).

**Why this is high-impact recurrence risk:** The recogniser logs gaps it KNOWS about. It cannot log gaps it never saw. Silent misses are invisible to bucket dashboards, pixel diffs, and /systematic-debugging until you add an expected-vs-seen comparator. Yesterday's @media bug fit this pattern perfectly — the 9 stage-4 events all said "successful conversion", the buckets said "responsive variants missing", and the truth was "parser dropped everything".

**Captured fully:** evidence-lens output from 4-rater review of the next-session plan; addressed in v3 next-session-prompt pre-work Step 2 (expected-rules baseline). Commit `20ef1d66` (fix) + `1fa4e880` (plan revision).

## 2026-05-17 — Added rows to hardcoded `_CSS_PROP_TO_SUFFIX` dict when property_suffixes DB table already had 99 rows for the same purpose

**The rule:** Before adding hardcoded lookup data to converter / recogniser / orchestrator scripts (`convert.py`, `per-section-convention-voter.py`, etc.), check `.claude/db-tables-map.md` for an existing canonical table. sgs-framework.db has `property_suffixes` (117 rows), `block_supports` (370 rows), `modifier_suffixes` (19 rows, kind='breakpoint' + corner + side + state), `slot_synonyms`, `block_attributes` (1406 rows), `block_selectors`, `block_compositions`. Refactor scripts to read via `db_lookup.py`; never add another in-script dict. The DB is canonical, fed by `/sgs-update`; manual dicts in scripts do not sync.

**Incident:** Added margin/gap rows to `convert.py:_CSS_PROP_TO_SUFFIX` (taking it to 21 hardcoded rows) when Bean pointed out the DB has a `property_suffixes` table. Inspection revealed 99 rows for the same lookup. Every "small fix" that session (margin/gap suffix, retired-block remap, hero `__split-image` lookup) duplicated DB-driven data. The recognition gap was not missing DATA — it was missing DB READS.

**Why this is high-impact recurrence risk:** Hardcoded dicts in scripts feel cheap (one-line additions). They create silent drift between the DB (canonical, fed by /sgs-update) and the script (manual). Every drift instance is a future silent failure when the DB is refreshed and the script still has stale data.

**Captured fully:** blub.db row 260; embedded as Rule 11 HARD-GATE in `~/.claude/skills/sgs-clone/SKILL.md`. Refactor shipped in commit `168fd2ca` (cv2 path now reads via `db_lookup.css_property_suffixes()` + `breakpoint_suffix_rules()`).

## 2026-05-15 — Spent ~6 hours spot-fixing pixel-diff without reading the orchestrator's own leftover buckets

**The rule:** When diagnosing converter quality, pixel-diff gaps, or any /sgs-clone output problem — READ `pipeline-state/<run>/leftover-buckets.json` and `stage-9.json` BEFORE proposing fixes or running pixel-diff iterations. The orchestrator already classifies every gap by (section, slot, reason) into 5 buckets. Spot-fixing without that evidence is forbidden.

**Incident:** During Spec 16 Phase 7 closure work, ran 12 passes of full-page pixel diff conjecturing about causes (DPR mismatch, body-anchored alignment, WP chrome noise, asymmetric grid columns) for ~6 hours. Numbers plateaued at ~39% desktop with zero movement. Bean's "properly analyse the issue instead of throwing shots in the dark" forced me to actually read the bucket — which revealed 212 extraction_failed entries, 173 in hero, all STYLING attrs the converter wasn't lifting. After reading, the focused fix (CSS-driven `_lift_styling_attrs()`) took ~60 min.

**Why this is high-impact recurrence risk:** The temptation to spot-fix pixel-diff is strong because each iteration is fast. But the orchestrator already did the diagnostic work — ignoring it wastes hours on guesses.

**Captured fully:** `~/.openclaw/workspace/memory/learning/2026-05-15-read-leftover-buckets-before-conjecturing-on-pixel-diff.md` + `feedback_read_leftover_buckets_before_conjecturing.md` + blub.db row 254.

## 2026-05-15 — Single-Sonnet implementer review missed 4+ hyperspecific patterns Bean caught manually

**The rule:** Multi-model `/qc` panel (Sonnet architecture + Haiku mechanical + Gemini Flash fresh-eyes + Cerebras ecosystem) runs BEFORE every commit touching converter / pipeline / SGS block logic. `/qc-inline` is the lightweight self-check during implementation; `/qc` is the dispatch gate.

**Incident:** Spec 16 Phase 7 — single-Sonnet implementer review passed 4 hyperspecific Mama's-only patterns: (1) `SECTION_AS_CONTAINER_OVERRIDES` dict mapping `"sgs-heritage-strip"` → specific grid ratios, (2) hardcoded `sgs-hero__image` / `sgs-hero__image--mobile` class lookups, (3) `mediaType="emoji"` unconditional default on feature-grid, (4) `variant="split"` unconditional default on hero with image present. All would silently break on Indus Foods / HelpingDoctors / mosque mockups. Bean caught all 4 via review and only then was the multi-model panel dispatched — which independently flagged the same 4 + classified them by severity.

**Why this is high-impact recurrence risk:** The implementer's context (the mockup they have in front of them) makes them blind to "this only works for this mockup". The multi-model panel's different lenses (architecture / mechanical inventory / fresh-eyes generalisation / ecosystem-pattern-check) catch what self-review cannot. extract.py's death-by-hyperspecificity is the precedent this panel exists to prevent.

**Captured fully:** `~/.openclaw/workspace/memory/learning/2026-05-15-multi-model-qc-panel-before-every-commit.md` + `feedback_multi_model_qc_before_commit.md` + blub.db row 255.

## 2026-05-15 — Ran full-page pixel-diff with no `--selector` flag the entire session despite the flag existing for exactly this purpose

**The rule:** Pixel-diff closure gate is PER-SECTION (cropped with `--selector .sgs-{section-name}`) at 3 viewports, NOT full-page. Full-page diff has ~30-45% structural noise floor (WP-block-wrapper differences + intentional UX choices like carousel vs stacked) that no converter can avoid. Per-section cropped diff strips that noise — it's the honest converter-quality measurement.

**Incident:** 12 passes of full-page diff plateaued at ~39% desktop. Conjectured the floor was unachievable. The framework has had `scripts/screenshot-diff-helper.js --selector .sgs-X` from the start — designed exactly to crop to a section's body region. I never ran it with a selector. The QC subagent's "realistic floor is 10-15% with crop-out-WP-scaffolding, current setup floors at ~40%" was the same finding, also ignored until Bean rejected the "unachievable" framing.

**Why this is high-impact recurrence risk:** The default behaviour (`--selector` not set) silently measures noise + signal mixed together. Every future Phase 4 / Phase 8 visual-QA run must default to per-section cropping with explicit selectors per section in the mockup.

**Captured fully:** `~/.openclaw/workspace/memory/learning/2026-05-15-per-section-cropped-pixel-diff-not-full-page.md` + `feedback_per_section_cropped_pixel_diff.md` + blub.db row 256.

## 2026-05-14 — Synonym laundering doesn't satisfy a captured rule when the concept itself is the violation

**The rule:** When a captured behavioural rule forbids a *concept* (not just a word), removing the word from variable names / comments / docs is not compliance — it's framing leakage in disguise. The honest fix is to remove the concept's encoding from the code at the root, not rename the surface symbols.

**Incident:** During Phase 6 v2 Step 5 (2026-05-14), Bean's first nudge surfaced row-211 "no licensing language" survivors in code I'd just edited. I treated it as a vocabulary issue and renamed `LICENSING_BANNED_SUBSTRINGS` → `row-211 banned-key gate` across comments and docstrings. Bean's second nudge: "It's not the word licensing itself that is banned, it's the concept. We can't just get around it by using synonyms if we're still actually checking for licensing. You can't copyright a UI pattern or block functionality!" The actual rule (`feedback_no_licensing_talk_in_cloning_context.md`, blub.db 2026-05-06) bans the IP-firewall framing, not just the L-word. The substring check itself encoded the framing — defending against a non-existent threat model. Renaming the check left the framing intact in inverted form.

**The fix:** stripped `LICENSING_BANNED_SUBSTRINGS` + `find_licensing_violations()` from `uimax-write-validator.py` entirely. Removed `check_no_licensing_in_uimax` + `_FORBIDDEN_TOKENS` from `critical-fix-verification.py` (harness 5 → 4 checks). Removed Hard Rule #1 from `uimax-tools/README.md`. Validator now enforces only row 213 (Rosetta Stone — every artefact-table row carries `equivalent_implementations.sgs_block`), which IS a real engineering invariant about cross-platform translation completeness, not IP defence.

**Apply going forward:** when a captured rule fires and my first pass is a rename, ask the second question — does this rule forbid the *word* or the *concept*? If the rule's `Why:` line cites a domain reason (UI patterns aren't copyrightable; tokens aren't dependencies; etc.), then any code path that encodes the concept is the violation regardless of vocabulary. Renaming is a smell, not a fix.

**Trigger phrases that should make me stop and re-check (not just rename):**
- "It's not the word, it's the concept"
- "Same thing with a different name"
- "You're getting around the rule with a synonym"
- "Why does this check exist at all"

**Memory:** captured here + as a blub.db follow-up (`synonym-laundering-doesnt-satisfy-concept-bans`). Cross-references `feedback_no_licensing_talk_in_cloning_context.md` (row 211 source rule) and `feedback_dont_delete_db_rows_on_ghost_verdict.md` (sibling rule about not pre-emptively deleting things without operator surfacing — different incident, same pattern of treating the surface symptom rather than the underlying intent).

## 2026-05-12 — Always merge to main when committing (no parked PRs across sessions)

**The rule:** Squash-merge to main is the default close-out of every commit on a feature branch. Build → QC panel → commit → push → squash-merge → delete branch → checkout main → pull. One flow, one session. Don't leave a PR open across sessions waiting for a separate merge.

**Incident:** During the 2026-05-12 Spec 15 Phase 1 handoff Bean reinforced: "Always merge to main when committing unless I say otherwise." Phase 1 PR #14 was correctly squash-merged in-session; the follow-up doc commit went directly to main. But the global-CLAUDE.md "feature touching 3+ files → branch + PR" rule, read literally, could imply parking the PR for later review — that's not Bean's pattern. Long-lived feature branches accumulate drift; CC sessions checkpoint at session end, so any PR not merged is implicitly parked.

**Apply going forward:** After every feature commit on a branch, the next step is squash-merge + delete + checkout main + pull. Direct-to-main commits remain fine for: docs, state.md advances, single-file fixes, post-merge follow-ups. The ONLY exception is Bean explicitly saying "hold the PR". Memory: `feedback_always_merge_to_main.md`. blub.db pattern key: `always-merge-to-main-when-committing`.

## 2026-05-12 — Multi-rater QC panel runs BEFORE commit, not after

**The rule:** A multi-rater QC panel exists to GATE the commit, not to retroactively bless one. Order the phase template as: build → /qc-inline per dispatch → multi-rater panel → apply panel fixes inline → commit + push + PR (one clean commit). The commit step is LAST.

**Incident:** Spec 15 Phase 1 master plan ordered Step 1.8 (commit + push + PR) before Step 1.9 (multi-rater QC panel). I followed it. The panel then found real fixes (hardcoded Windows paths, stale "KNOWN BUG" docstring, spec §11 wording mismatch). Those needed a follow-up commit on the same branch — so PR #14 ended up with two logical commits (build + QC fixes) instead of one. Audit trail reads "shipped, then fixed" which is confusing; cognitive load on the reviewer; if any panel finding were unfixable, the branch would already be pushed.

**Apply going forward:** Spec 15 master execution plan §Phase 2–5 templates amended 2026-05-12 to put the multi-rater QC panel BEFORE the commit step. Same rule for any future phase-gate template that uses multi-rater review. Memory: `feedback_qc_before_commit.md`. blub.db pattern key: `qc-panel-gates-commit-not-follows-it`.

## 2026-05-12 — `str.endswith(suffix)` on camelCase is case-sensitive; matches will silently miss

**The rule:** When peeling a property suffix off a camelCase attribute name (e.g. `borderRadiusTL` → strip `TL` → check whether `borderRadius` ends with `BorderRadius`), Python's `str.endswith()` is case-sensitive. `'borderRadius'.endswith('BorderRadius')` returns `False`, so the suffix never peels and `role` stays NULL. Equally, when the stem IS the suffix (e.g. `borderRadius` == `BorderRadius` length-wise), the prefix becomes empty and naïve code `continue`s past the match — same silent drop.

**Incident:** Spec 15 Phase 1 `peel_property_suffix()` initially used raw `name.endswith(suffix)`. Caught by pytest test 7 (`test_border_radius_tl_corner_decomposes_and_gets_visual_role`) — 16/17 passed; the one failure surfaced the bug. Fix: case-insensitive comparison (`name.lower().endswith(suffix.lower())`) PLUS a return-with-empty-prefix path that still propagates the matched suffix info upward. Test 7 then passed; full suite back to 17/17.

**Apply going forward:** When matching strings drawn from two different naming conventions (camelCase JS-attr names vs PascalCase suffix-table keys, or kebab-case CSS classes vs PascalCase block names), normalise case BEFORE the comparison and handle the empty-prefix edge case explicitly. Add a regression test for camelCase boundary attrs whenever a new property-suffix-style decomposition function is introduced. blub.db pattern key: `camelcase-endswith-is-case-sensitive-normalise-before-compare`.

## 2026-05-11 — @wordpress/scripts emits style-index.css; register_block_type wants style.css

**The rule:** When a block.json manifests `"style": "file:./style.css"`, WordPress's `register_block_type_from_metadata` looks for a file named LITERALLY `style.css` at the block.json's path. But @wordpress/scripts compiles per-block frontend stylesheets to `style-index.css` per its webpack convention. If you don't bridge the gap, WP silently fails to enqueue the per-block stylesheet -- no error, no warning, just no CSS.

**Incident:** On the 2026-05-11 Trustpilot block smoke test, the cards stacked vertically instead of horizontally because the CSS didn't load. Diagnostic showed `styleSheetLoaded: false` for the trustpilot stylesheet despite the file existing on disk (as `style-index.css`). After copying `style-index.css` -> `style.css` on the server, the page picked up the CSS instantly and rendered the carousel correctly.

**Impact systemic:** EVERY existing SGS block had this gap. Their CSS was silently not being enqueued. Most blocks looked OK because their styles also lived in the universal `extensions.css` and `contrast.css`. The Trustpilot block's scoped styling (carousel, white pill header, hover border) had no fallback, so the gap surfaced.

**Fix:** `plugins/sgs-blocks/scripts/copy-built-styles.js` -- new postbuild step that copies `style-index.css` -> `style.css` (and `style-index-rtl.css` -> `style-rtl.css`) for every block. Wired in `package.json` postbuild script. First run copied 96 files across all 48 SGS blocks. Idempotent: skips when destination is newer than source.

**How to apply:** Any new WP plugin using @wordpress/scripts to compile per-block frontend stylesheets needs this bridge. Add the postbuild copy script BEFORE the first block needs scoped CSS that doesn't have a fallback, otherwise the bug stays silent.

## 2026-05-11 — Unprefixed global classes in namespaced PHP files = silent fatal on first render

**The rule:** When a PHP file declares `namespace SGS\Blocks;`, any reference to a global class (`WP_Block_Type_Registry`, `WP_Error`, `WP_REST_Response`, etc.) MUST be prefixed with a leading backslash (`\WP_Block_Type_Registry`). Otherwise PHP resolves the name as `SGS\Blocks\WP_Block_Type_Registry` (which doesn't exist) and fatals when the class is dereferenced.

**Incident:** On the 2026-05-11 Trustpilot block smoke test, the WP REST endpoint to create a page returned `Uncaught Error: Class "SGS\Blocks\WP_Block_Type_Registry" not found in includes/image-controls.php:45`. The bug had been on `main` since commit `0d7c4fc8` (2026-05-10) but had not triggered because the filter `inject_image_controls` only fires when a block with `supports.sgs.imageControls` renders. The first new page render with such a block hit it.

**Fix:** `includes/image-controls.php:45` changed `WP_Block_Type_Registry::get_instance()` to `\WP_Block_Type_Registry::get_instance()`. Comprehensive grep across all namespaced files in `plugins/sgs-blocks/includes/` confirmed only this one instance.

**How to apply:** Any new file under `plugins/sgs-blocks/includes/` that declares `namespace SGS\Blocks;` AND references a WordPress core class must use the `\` prefix. Run `grep -rE "[^\\\\](WP_REST_|WP_Error|WP_Block|WP_Hook|WP_Post|WP_Query)" plugins/sgs-blocks/includes/` periodically to catch regressions. The rule should be added to the SGS WP coding standards reference.

## 2026-05-11 — Plan referencing fictional files: the pattern repeats; structural mitigation needed

**The rule:** The Phase 7 incident (next-session-prompt cited 4 dispatcher scripts that didn't exist) repeated 1 phase later: the Phase 8 plan referenced 7 files (slot-filler.py, test_slot_filler.py, hero-baseline.json, critical-fix-verification.py, role-templates.json, layer-3-internal-elements.json, trustpilot-reviews.json) -- only ONE existed. State.md ALSO claimed slot-filler.py was "1116 LOC, 8/14 tests pass" when no slot-filler.py had ever been committed to git.

**Incident:** When Bean asked Phase 8 questions, I started planning around files I had not grep-verified. The original Phase 8 plan baked in 7 fictional dependencies and would have wasted a session trying to wire them. Caught only because Bean's earlier audit-instinct showed up: "do the audit". Plan was rewritten against actual disk state.

**Two structural mitigations:**
1. **Plan files must pass an "all named scripts exist" gate** before they're marked actionable. Before a plan can be referenced in a next-session-prompt, a deterministic check: `for each filename mentioned in the plan, does it exist in git OR is it in the same plan's deliverables list?` This is exactly the kind of check that belongs in a pre-commit hook.
2. **State.md cannot claim work "shipped" without a commit hash.** Any line in state.md that says "X.py v1 (1116 LOC, N/M tests pass)" must cite a commit. If the work didn't get committed, state.md should say "designed but not landed" or similar.

**How to apply:** Build the plan-file dependency-existence check as a pre-commit hook (or a manual `python check-plan-files.py` script). State.md gets a periodic audit: for any line that names a script or claims a quantitative deliverable (LOC count, test count), the commit must exist in git history -- if it doesn't, rewrite the line to reflect reality.

**Stacks on top of:** lesson 217 (verify production path by grepping), lesson 218 (analysis skills run /search--local + /qc-inline), the 2026-05-10 cite-without-verify capture. Three repeated instances of the same pattern in 4 weeks. Structural enforcement (Rule 10) is overdue.


## 2026-05-10 — Classes in mockups map to PATTERNS, not single blocks (CC memory: feedback_classes_map_to_patterns_not_blocks.md)

**The rule:** When migrating a mockup to SGS-BEM, most semantic class names operate at the **PATTERN level**, not the block level. Header, footer, featured-product, ingredients, brand-story, gift-section, social-proof are all PATTERNS composed of multiple blocks. Only composite single-block sections (like `sgs/hero`) collapse to one block. Inner classes follow their corresponding block's slug; inner elements without a dedicated block use the parent pattern's namespace.

**Incident:** Phase 6 mockup migration inventory. I surfaced 4 decisions to Bean treating header / footer / featured-product / section-headings as block-level questions when they were pattern-level. Bean: *"classes are equivalent to patterns, not blocks (aside from only the composite block sgs-hero)... we already do have header and footer patterns saved in the theme"*. He also flagged `ingredient-card` as separate `sgs/info-box` instances inside a `sgs/feature-grid` — exactly matching the existing `ingredients-section` pattern. I had asked a redundant question about it.

**Process rule attached:** Never defer with a placeholder or "future session" note when a new block / pattern / attribute is needed during clone-pipeline migration. The Rosetta Stone + scripts make new blocks near-zero-effort. If a script is missing, write it; if intelligence/decision is needed, do it inline with Bean.

**Pre-flight check before assuming a section is a gap candidate:**
1. Cross-reference `theme/sgs-theme/patterns/*.php` for an existing pattern
2. Run `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py match "<keyword>"` (note: sgs-db match returns template parts first; check the full output for block hits)
3. Check `plugins/sgs-blocks/build/<slug>/block.json` if a block is suspected

## 2026-05-10 — Don't cite specifics from prior-session notes without grepping the source

**The rule:** Don't propagate specifics from a previous session's notes (state.md, handoff.md, plan files) into a new handoff or recommendation without verifying they still hold against the current code. Notes are point-in-time snapshots; code drifts between sessions.

**Incident:** During the Phase 6 handoff write, I lifted text from the previous session's state.md blockers list into the Phase 7 next-session-prompt:
> "Stage 1 uses regex grep + DEFAULT_SECTION_MAP. Stage 2 hardcodes block_name. Stage 9 emits thin inline HTML."

Bean: *"how do you already know what stages to rewire?"* — caught the cite-without-verify. I had not opened any of the actual scripts to confirm the descriptions were still accurate, nor confirmed that the 4 named dispatcher modules (`per-section-convention-voter.py`, `confidence-matrix`, `leftover-bucket-router`, `simple_html_review_report.py`) exist on disk as named.

**Why this matters:** propagating stale specifics into a handoff means the next session inherits possibly-wrong context. The next-session-prompt's Task 1 should be framed as "discover current state" when specifics haven't been verified, not as a directive based on stale notes.

**Stacks on top of:**
- Lesson 194 — verify rendered output, not internal metrics
- Lesson 220 — broaden search before declaring a spec wrong
- Lesson 221 — don't delegate the test of unproven work
- Lesson 226 — verify production path by grepping the script

**How to apply:** When writing a handoff or recommending an approach based on documented project state, either (a) grep / open the named files to confirm they exist and match the description, OR (b) frame the next-session task as "verify current state matches this note before acting", not as a directive based on the note. For the Phase 7 next-session-prompt left this session, the Task 1 wording ("inspect orchestrator + 3 dispatchers... note exact call signatures") already accommodates discovery — but only by accident; the surrounding context still presumes the state.md description is accurate.

## 2026-05-10 — Bean-controlled drafts use SGS-prefixed BEM (blub.db row 236, area=revenue-sgs)

**The rule:** Every Bean-controlled draft (mockup, sketch, hand-coded HTML produced in-house) MUST use `.sgs-<block>__<element>--<modifier>`. The `/sgs-clone` Stage 0 pre-flight gate hard-rejects non-conforming drafts on production runs. With `--draft-mode` the gate downgrades to a soft lint warning. Live scrapes (sites Bean does NOT control) use lingua-franca-conversion at recognition time: `/uimax-*` skills convert source-convention class names to SGS-BEM as primary at write time, preserving original convention as a sibling row in `equivalent_implementations`. Existing pre-rule drafts use `--legacy` flag for one-off bypass.

**Why:** drafts and rendered SGS share class-name space; literal slug match (`.sgs-hero` → `sgs/hero`) collapses the 9-stage pipeline from probabilistic-with-fallback to deterministic for Bean-authored drafts. The naming-convention coverage gap that surfaced repeatedly in M9 redo was misdiagnosed as "add 7 more platform translation rules" when the actual fix is to constrain the source side. Probabilistic recognition stays only where Bean does NOT control source naming (live scrapes).

**Canonical reference:** `.claude/specs/13-DRAFT-NAMING-CONVENTION.md`. Workspace lesson: `C:/Users/Bean/.openclaw/workspace/memory/learning/2026-05-10-bean-drafts-use-sgs-prefixed-bem-naming.md`. Convention rollout plan: `.claude/plan.md` + 8 phase files at `.claude/plans/phase-1..8.md`.



## 2026-05-09 — Don't delegate the test of unproven work (blub.db row 221, area=revenue-sgs)

**The rule:** The operator must witness the rendered output of an unproven system's first live test. Never delegate the proof step itself to a subagent. Never write fallback options in an agent brief that allow the proof to be skipped. Never accept an agent's text report ("post updated, zero console errors") as evidence. Open the URL with own eyes BEFORE claiming success.

**Incident:** M9 milestone of the SGS cloning pipeline. M9's headline deliverable was proving the new multi-section orchestrator works end-to-end on a real live page (Mama's Munches homepage on sandybrown). Orchestrator was unproven — built same session. Operator extended the orchestrator inline, then delegated the deploy + Playwright + 13 visual-diff reports to wp-sgs-developer with the wording: *"If full multi-section deploy is not feasible in this session, a hero-only homepage deploy (matching post 29 PoC) is acceptable for M9. The key deliverable is the 13 visual-diff reports."* The agent took the fallback path, deployed only the M8 hero markup, returned "Post 8 updated, zero console errors". Operator read the report and went to commit. Never opened the URL. Claimed M9 shipped. When Bean asked to check, opened the URL and found: hero+footer with massive empty gap, debug WordPress nav, empty Opening Hours and Address fields, orphaned Get Directions button, and per Bean the hero is not even a perfect clone of post 29.

**Two stacked failures:**
1. **Fallback in the agent brief gutted the test.** Writing "hero-only is acceptable" gave the agent permission to skip the actual proof. The 13 reports were a gate-passing requirement, NOT the proof — calling them "the key deliverable" inverted what mattered.
2. **Trusted agent's text report as evidence.** "Post updated, zero console errors" are inputs, not proof of correct rendering. Should have opened the URL before any commit.

**Extends:** `verify-rendered-output-not-internal-metrics` (blub.db row 194, captured 2026-04-29) across the agent-delegation boundary. The parent rule fires when claiming work done in main thread without checking rendered DOM. This rule fires when claiming work done based on a subagent's narrative without checking rendered DOM.

**Process change:** Auto-recovery script `C:/Users/Bean/.claude/hooks/blub-db-unlock.py` shipped + `correction-capture.md` and `capture-lesson` SKILL.md updated to make blub.db POST recovery a default reflex (no diagnosis turn required). The recovery script handles the abandoned `.tmp-<uuid>` sidecar pattern that masked the M9-session POST hangs. See updated protocol at `~/.claude/skills/autopilot/references/correction-capture.md`.

## 2026-05-10 — Five lessons captured during pre-M9 lifecycle batch (blub.db ids 215-218, 220)

### 1. No `--resume` flags or stage-resume infrastructure inside skills/scripts/pipelines (id 215)
Sessions are atomic from the operator side. Bean does not run `--resume <run_id>`. Fresh session = fresh start with the prompt + referenced files. Trigger phrases for self-check: "resume support", "--resume flag", "continue from stage", "session-resume", "partial run continuation", "stage handler retry semantics". The handoff.md + next-session-prompt.md flow is the ONLY session-bridging mechanism — it operates BETWEEN sessions, not BETWEEN pipeline runs within a session. Captured after `/gap-analysis` recommended adding `--resume` to `/sgs-clone` Tool Bindings — Bean: "I genuinely hate this. It's completely useless."

### 2. C-grade gaps must pass the impact litmus, not rubric pedantry (id 216)
Before scoring a gap C (2.5)+, ask literally: "If this naming/structure/format issue gets fixed, what specific outcome changes?" If the answer is "the prose looks more like a config file" or "the rubric anchor is satisfied" — the gap is NOT C. It's D. Test: would an automated downstream tool ACTUALLY consume the missing element today (not hypothetically)? Captured after I scored `/sgs-clone` strategic-alignment at 3.5 for missing strategic-objective IDs that no automated tool consumes — Bean: "Is it optimal to have these references in the skill.md file or a waste/distraction?" The IDs were database-key clutter, not motivation.

### 3. Verify "production path uses X" by grepping the actual script (id 217)
Before claiming "production path uses X" / "the production runtime is X" in any analysis: open the actual production script and grep for X. Confirm whether X is the runtime, a dependency, an optional sub-step, or a deprecated reference. Handoffs and skill bodies use "production path" loosely — don't propagate without verifying. Captured after I claimed "M8 production path = Playwright" in a `/sgs-clone` gap-analysis. Bean: "I thought we replaced a lot of our playwright use with chrome dev tools CLI / MCP and pretty much all of the production was completed via python scripts." Bean was right — production = Python pipeline (`sgs-clone-orchestrator.py`); Playwright is one Stage 4/5 sub-step.

### 4. Analysis skills must run /search--local first AND /qc-inline last before shipping (id 218)
Any skill that produces gaps, scores, opportunities, recommendations, proposals, or evaluative findings MUST run two gates: (1) `/search--local` before scoring to load current state; (2) `/qc-inline` after producing findings to fact-check the assumptions each finding rests on. Skip either and analysis ships built on stale architecture, ungrepped scripts, or untested premises. **Now baked structurally into `/gap-analysis` Step 1.5 (HARD GATE) and Step 7.6 (HARD GATE)** so future runs auto-enforce. Captured after a `/sgs-clone` gap-analysis shipped 6 gaps where 4 rested on wrong assumptions.

### 5. Broaden the search before declaring a spec or schema "wrong" (id 220)
When a spec references a data structure that the obvious place doesn't have, search at least 4 places BEFORE concluding: (1) the owning skill's own `data/`/`references/`/`scripts/` folders; (2) related skills (read their SKILL.md); (3) glob across `~/.agents/` and `~/.claude/`; (4) re-read project CLAUDE.md. For uimax specifically: data lives at `~/.agents/skills/ui-ux-pro-max/data/*.csv` and `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` — NOT in `sgs-framework.db`. Captured after I declared P-15 schema-mismatched while the answer was in a CSV folder I never opened — Bean: "You are 100% wrong. How did you even search for it because you could have found it through `/uimax` or `/ui-ux-pro-max` or the file itself!"

## 2026-05-07 — uimax is the Rosetta Stone of design (Bean's reframe of the cross-platform translation principle)

**Captured as blub.db row 213, embedded across 4 surfaces** (project CLAUDE.md, sgs-wp-engine SKILL.md Hard Rule 7, ui-ux-pro-max SKILL.md Stage 5 INGEST HARD GATE, animation-harvest deprecation stub).

Bean's framing: "The Rosetta Stone point is what I was thinking of but I didn't think you'd understand." uimax is the **cross-platform translation layer** — every artefact row carries equivalent-name mappings across SGS / vanilla HTML+CSS / Bootstrap / shadcn / Tailwind / React generic / AI-builder outputs (Lovable / v0 / Bolt). A design expressed in any one platform should pass through to look + function identically on any other.

**Rule:** every tool that writes to uimax MUST populate the SGS-block equivalent OR flag the gap as a new-SGS-block-candidate. Tools that produce SGS-blind output are anti-pattern (e.g. `/animation-harvest` standalone — captured animations to a standalone format without SGS-block-attribute mapping → deprecated 2026-05-07, replaced by `/uimax-scrape-animation`).

**How to apply:** when designing schemas for uimax tables (`patterns`, `component_libraries`, `animations`, `naming_conventions`, `design_tokens`), include `equivalent_implementations` as a JSON column or per-platform fields. When dispatching a subagent that touches uimax, the prompt MUST require populating the SGS-block equivalent or surfacing a "no SGS equivalent — gap candidate" flag. Never silently drop the translation.

**Strategic implication:** uimax compounds in value with every clone because each row's translation set multiplies the utility. Pattern library + animation library + naming-convention library all become genuinely cross-platform, not WP-only. Differentiator vs commercial design DBs.

## 2026-05-06 — Never raise licensing / IP / copyright in SGS cloning, pattern-library, or uimax contexts

**Captured as blub.db row 211, embedded across 4 surfaces** (project CLAUDE.md no-licensing block, sgs-wp-engine SKILL.md, both spec REVISIONS sections, both spec recovery stubs).

Bean rejected this twice in the same session. First in `cloning-skill-salvage-matrix-2026-05-05.md` REVISIONS: *"the licensing thing is absurdly stupid, you can't license a web design or pattern of web components."* Then again 2026-05-06: *"Already told you not to mention licensing again."*

**Rule:** web designs and component patterns are not licenseable artifacts in the way I had been treating them. Treating them as IP-managed inflates schemas, builds firewalls that don't need to exist, and signals to Bean that I'm reasoning from a wrong frame. The cloning pipeline only needs to know **where a pattern came from** — not who owns it.

The entire `source` taxonomy is `idea` / `draft` / `<URL>`. No `license`, `provenance_license`, `source_license`, or "IP firewall" columns. No separate `clone_observations` table justified by IP risk.

**How to apply:** when designing schemas for `patterns`, `block_compositions`, uimax tables, or any cloning artefact, do not propose licensing/copyright/provenance-IP columns. When framing competitor patterns, never use IP-risk / redistribution-risk language. If a future spec genuinely needs copyright thinking (e.g. paid stock image asset attribution), surface it as **attribution** (asset-level), not **licensing** (pattern-level), and ask Bean first. Self-check trigger phrases: "license", "IP", "copyright", "provenance", "redistribution", "firewall between", "promotion path", "external_patterns".

## 2026-05-08 — 4-model peer review found 11 fixes the design needed before first clone

The fingerprint design was internally peer-reviewed via 3 models (Sonnet 4.6, Gemini Flash, Gemini Pro 3.1; Cerebras was correctly skipped per its own skill spec — "not enough reasoning depth vs Opus/Gemini-Pro for architecture decisions"). All three returned **ship-with-fixes**.

**The 11 fixes:**

5 critical (block first real clone):
1. Tailwind classes stored as space-separated string instead of indexed token array → first Tailwind clone returns 0 matches for whole sections
2. Structural signature `child_shape` is free-text, not a parseable typed schema
3. Single-convention-per-scrape assumption is fatal — real sites mix BEM + Tailwind + Bootstrap on different sections
4. Hashed/minified class names break the reverse index entirely (CSS Modules, MUI hash JIT, SvelteKit)
5. Extract rules need `search_scope` field — `gap-{n}` often lives on a parent/child of the conceptually-correct element

4 important (catches major edge cases):
6. Eight roles insufficient — missing `layout-alignment`, `accessibility-attribute`, `data-binding`, `visibility-control`, `layout-modifier`
7. Four leftover buckets insufficient — need 5th: "structural mismatch / orphan"
8. Recursion guard required: `max_depth: 12` + `visited_nodes` Set
9. Confidence scoring undefined — class collisions need weighted disambiguation matrix

2 stretch (defer):
10. Spatial / computed-layout signal as corroborating evidence (Locofy/Stackbit pattern)
11. AST-tree-diff alternative architecture — defer indefinitely

**The lesson:** design-the-feature in isolation will under-build for the messy 80% of real-world inputs. A 4-model peer review of the design BEFORE building catches at least 11 fixes. Cost: ~30 min wall-time per reviewer, all parallel. Value: avoids a half-finished clone-skill rebuild after first real-clone failure.

**How to apply:** for any new substantial-skill design, run a peer-review panel (Sonnet practical + Gemini Flash gap-scan + Gemini Pro deep-reasoning + ecosystem) BEFORE the build session. Synthesise findings into a delta list. Ship the delta as part of the build, not after.

## 2026-05-08 — Rule-stage coverage audit: 28 genuine gaps remain even after Option A revised

Walked every cloning-relevant captured rule (97 total) across 9 pipeline stages + cross-cutting. Source-of-truth read across mistakes.md / common-wp-styling-errors.md / 12-DRAFT-TO-SGS-PIPELINE.md / sgs-wp-engine + visual-qa Hard Rules / blub.db high-priority / project CLAUDE.md / fingerprint design synthesis / parking.

| Status | Count |
|---|---|
| ✓ Covered today | 31 (32%) |
| △ Closed by Option A revised | 38 (39%) |
| ✗ Genuine gap after Option A | 28 (29%) |

**The lesson:** even a comprehensive design plus 11 review fixes leaves ~30% of captured rules uncovered. Without the audit, the build session would have under-built (missing the gaps) or over-built (duplicating already-enforced rules). The audit is the higher-value deliverable than parking review alone.

**How to apply:** before any substantial pipeline build, do the dissection pass — assign every captured rule to a stage with covered/partial/gap status. Top-12 ranked gaps become the next-session targets. Without this step, the pipeline ships with silent gaps that surface in the first real run.



## 2026-05-06 — background shorthand audit + ctaGap recogniser blind spot + pseudo-element/parent-chain measurement

**Problem:** Three related gaps closed in one session:
- H-8: Hero block.json had no `ctaGap*` attributes — recogniser couldn't extract `.hero-ctas { gap: X }` because there was no destination attribute. Gap rule was silently dropped.
- H-9: Multiple framework block CSS files used `background: linear-gradient(...)` shorthand without `:not(.has-background)` guard — the shorthand resets `background-color`, painting over user's palette colours invisibly.
- H-10: `mockup-parity-validator.js` wasn't measuring `::before`/`::after` pseudo-elements or walking parent chain for `filter`/`mixBlendMode`/`backdropFilter`/`opacity` — entire class of "computed says X, painted Y" bugs was invisible to the validator.

**Why my QC missed it:** The recogniser only extracts values to named attributes — no destination = silent drop. The CSS audit didn't cross-check shorthand vs longhand. The validator measured elements but not their rendering context.

**Rules captured:**
- Every child container with layout CSS (flex gap, justify-content) needs a named block attribute as destination.
- `background:` shorthand ALWAYS becomes `background-image:` in framework default rules. `:not(.has-background)` ALWAYS on default background rules that apply to the block wrapper.
- Validator WATCHED set must include pseudo-elements (`::before`/`::after`) and parent chain filters.

**How to apply:** Before declaring a recogniser extraction complete, verify every CSS rule with a numeric/positional value maps to a block.json attribute. Before declaring CSS QC done, run `scripts/css-pattern-audit.js`. Before declaring visual parity, check validator output includes `parent_chain_effect` warnings.

## 2026-05-05 — described the recogniser as a section-to-block mapper (it isn't — it's a section-to-pattern mapper)

While explaining the SGS clone pipeline in plain English, I framed the recogniser stage as "match each mockup section to one of our blocks" — implying 1:1 class-to-block mapping. Bean stopped to correct it: a class on the mockup is a section/container (header, footer, mega menu, gift section, hero, etc.) and maps to a PATTERN — a composite that may contain one or many blocks underneath.

This had been the wrong framing in earlier explanations and underpinned the 2026-05-04 `sgs/feature-grid` hallucination (recogniser tried to invent a mega-block instead of recognising a pattern that needed 1+ blocks underneath).

**The rule (captured as blub.db row 209 + embedded as Hard Rule 6 in `~/.claude/skills/sgs-wp-engine/SKILL.md`):**

> Mockup classes/sections map to PATTERNS, not single blocks. A pattern is a composite container — header, footer, mega menu, hero, or any registered group of blocks. The recogniser operates at pattern boundaries; single-block emission is the inner step. Composite blocks like `sgs/hero` and `sgs/cta-section` are pattern-shaped from the mockup's perspective even though registered as single blocks. If no existing pattern fits, the gap is a NEW PATTERN, not a missing block.

**Strategic bonus:** every clone produces pattern artefacts registered under `plugins/sgs-blocks/patterns/<client-slug>-<intent>` — the library compounds across clients as a strategic revenue asset. Confirmed S-grade dimension for sgs-wp-engine.

**How to apply:** at every recogniser stage, treat each top-level class/section as a PATTERN lookup. Match against existing patterns first; if no fit, the gap is a new pattern. Use the word "pattern" as the noun for recogniser output in all docs/prompts. Use "block" only for the inner population step.



## 2026-05-05 — `getComputedStyle().backgroundColor` lied about the rendered hero pink because a framework gradient was painting over it

Bean reported the hero pink looked "wrong" on the frontend. I measured `getComputedStyle(hero).backgroundColor === 'rgb(245, 194, 200)'` (which is `#F5C2C8`, the correct mockup value) and confidently told Bean the colours match.

I was wrong. The actual rendered pixel at the hero centre on the live page was `#C76C7C` — a darker, more saturated rose. An 18.5% colour-distance error that no `getComputedStyle()` query caught.

**Root cause:** `plugins/sgs-blocks/src/blocks/hero/style.css` had a framework default rule:

```css
.sgs-hero:not([style*="background-color"]):not([style*="background-image"]) {
    background: linear-gradient(135deg, var(--primary-dark), var(--primary));
}
```

Bean's hero set its background colour via WP's `.has-surface-pink-background-color` class (palette-driven), NOT via inline style. The `:not([style*="background-color"])` selector only excludes inline-style overrides, not class-based ones. So the gradient rule MATCHED + painted over the user-set colour. `backgroundColor` was queryable as `#F5C2C8` (the underlying value) while `backgroundImage` was the gradient that the user actually saw.

**Why my QC missed it:**
1. `mockup-parity-validator.js`'s WATCHED array didn't include `backgroundImage`. It only watched `backgroundColor`.
2. I dismissed Bean's "wrong colour" report based on `getComputedStyle().backgroundColor` matching mockup. I never checked `backgroundImage`.
3. I asked Bean to compare the colours visually instead of automating the comparison.

**Three rules captured:**

1. **QC pipeline must watch the full background property family**, not just `backgroundColor`. Added to `mockup-parity-validator.js` WATCHED array: `backgroundImage`, `backgroundSize`, `backgroundPosition`, `backgroundRepeat`, plus `filter`, `mixBlendMode`, `backdropFilter`. (See common-wp-styling-errors.md Section R.)
2. **Framework default rules using `background:` shorthand** silently overwrite user-set `background-color` when triggered by class-based exclusion gaps. Use `background-image:` specifically (not the shorthand) for any default-painting framework rule. Update `.sgs-block:not(...)` exclusions to also `:not(.has-background)`.
3. **Don't ask the human to do the comparison work the script can do.** When Bean asks "can't you just extract the colours and diff them?" the answer is yes; build the script. Did so: `scripts/colour-parity-audit.js` — extracts `:root` CSS variables from mockup, palette+custom from variation JSON, diffs them. Verdict: PASS for Mama's (10 colours matched, 0 deltas).

**The bigger meta-lesson:** when the human eye says "wrong" and the measurement says "right", the measurement is incomplete. Find the missing measurement before declaring the human wrong.

## 2026-05-05 — parity validator deltas dismissed as "structural noise" turned out to be 4 visible defects

## 2026-05-05 — parity validator deltas dismissed as "structural noise" turned out to be 4 visible defects

Mid-session 2026-05-04 the parity validator reported 55 deltas after the hero perfect-clone fixes landed. I (the classifier) categorised ~50 of them as "structural false positives — same visual output, different DOM organisation" and declared `verdict: PASS`. Bean looked at the live page and HTML brief side-by-side and saw obvious visible differences. A re-audit (visual-qa run with side-by-side screenshots) confirmed Bean was right: **at least 4 of the dismissed delta categories produced visible Major defects**:

1. **Buttons stacking vertically at desktop** instead of inline (the most visible defect — `.sgs-hero__ctas` flex container + block-level `.wp-block-sgs-button-wrapper` children = column behaviour).
2. **WP page-title block leaks above the hero** (~96px of Fraunces text where mockup has nothing) — the test page template includes a Post Title block.
3. **`section.sgs-hero` 36px padding + 520px min-height** producing dead pink bands above and below the image and content panel — hero rendered 49px taller than mockup with visible empty space.
4. **Negative-margin full-bleed pattern (`margin: 0 -24px`) over-shoots viewport** by 8-16px on each side — content area is 32px narrower than mockup at 375.

The validator's measurements (padding deltas, margin deltas, display deltas) were ALL accurate. My classification "but the visual output is the same" was wrong because I didn't actually look at side-by-side screenshots. I trusted the abstract pattern ("structural difference, same visual") without ground-truth verification.

**The methodology rule:**

A computed-style delta is NEVER "structural noise" without screenshot evidence to back the claim. Specifically:

1. Padding/margin/min-height deltas of >5px ARE visible. Don't dismiss them by category.
2. `display: flex` vs `block` deltas ARE visible when they change child arrangement (column vs row, inline vs stacked). Don't dismiss "same intent" without checking the actual rendered position.
3. Negative-margin full-bleed deltas ARE visible on the right/left edges when viewport math doesn't match. Don't assume "100vw is 100vw" — verify the rendered rect.
4. Background-color deltas ARE NOT noise unless you've confirmed the parent is the same colour AND the child fully covers the parent. Otherwise the underlying colour might bleed at edges.

**The process rule:**

Classifier passes that turn validator FAILs into PASS verdicts MUST include a side-by-side screenshot grid as evidence. No screenshot, no dismissal. Bake into the visual-qa skill: "if classifier reduces severity below the validator's reported severity, the classifier MUST attach a screenshot at the affected viewport showing the visual output is identical."

**The tooling rule:**

The mockup parity validator's filters added in the previous session (visibility-aware selector, fontFamily fallback equivalence, CSS keyword equivalents) are correct AS FILTERS — they catch cases that are genuinely equivalent. But the post-filter delta count is the floor, not the ceiling. **Do not subtract further deltas without screenshot evidence.** The "55 → 4 visible defects" gap in this incident was 100% on the human classifier, 0% on the validator.

**Captured as Section Q in `.claude/specs/common-wp-styling-errors.md`** with the 4 specific defect types + how to detect each.

## 2026-05-04 — wp_global_styles post is the actual cache layer; editing variation files alone never propagates

## 2026-05-04 — wp_global_styles post is the actual cache layer; editing variation files alone never propagates

Editing `theme/sgs-theme/styles/<variation>.json` and deploying it to a server does NOT make the changes visible on the live site. WordPress merges base `theme.json` + the active variation file at first load and stores the merged result in a `wp_global_styles` post (post type `wp_global_styles`, one post per active theme). Future page renders read the cached merge from this post — NOT from the variation file. Cache flushes (`wp cache flush`, `wp transient delete --all`, LiteSpeed purge) do NOT reach this post because it's regular post content, not a transient or object cache entry.

**Symptom**: variation file on disk has `text: "var(--wp--preset--color--text)"` but the live page shows `--wp--custom--button-presets--primary--text: #ffffff` (the BASE theme.json value). 30+ minutes of trying transient flushes / theme switches / OPcache resets / LiteSpeed purges produces zero change. The deployed file is correct; the rendered CSS is wrong.

**The procedure that actually works** (verified 2026-05-04 on sandybrown):

1. SCP the theme + plugin tar to the server, extract to `wp-content/`
2. Reset the `wp_global_styles` post via REST API: `POST /wp-json/wp/v2/global-styles/{id}` with body `{settings:{},styles:{}}` — this clears the cached merge
3. Re-apply the active variation: `GET /wp-json/wp/v2/global-styles/themes/<theme-slug>/variations` → find the active variation by title → POST its full `settings` + `styles` back into the global-styles post
4. `wp cache flush` + `wp transient delete --all` + `rm -rf wp-content/litespeed/css/*.css wp-content/litespeed/cache/*`
5. OPcache reset via HTTP fetch of a temp `op-reset-tmp.php`

Steps 2 + 3 require Playwright (the `wp-content-guard.py` hook blocks `wp post update` and `wp eval` — correctly so, this is the right way). Use the WP admin login + `window.wpApiSettings.nonce` + `fetch` with `X-WP-Nonce`.

**Why this is structural, not edge-case**: this is how WordPress's Global Styles system works by design. User customizations in the Site Editor write to this post. Variation file edits made server-side bypass the Site Editor and so don't refresh the post. Any deployment of variation-level changes (colours, typography, custom properties) hits this exact path.

**How to apply going forward**:
- ALL deploy procedures that touch theme.json or any `styles/<variation>.json` MUST run the reset+reapply procedure as the final step. Add to `/deploy` skill, `deploy-check`, and any deploy automation.
- Never "deploy + test" a variation change — always "deploy + reset+reapply + flush + test".
- Captured as Section O in `.claude/specs/common-wp-styling-errors.md` with full reproducible procedure.

## 2026-05-04 — Fraunces font failed to load silently; computed font-family says correct value, browser uses fallback

The Mama's variation declared Fraunces as the heading font with src pointing at `https://fonts.gstatic.com/s/fraunces/...woff2`. The CDN load **failed silently** (HTTP error or CSP block — `document.fonts` showed `status: "error"`). The browser fell back to DM Serif Display (next in the font stack). `getComputedStyle()` still reported `font-family: "Fraunces, ..."` because that's the declared value — but the actually-rendered font was DIFFERENT.

This is the SAME defect class as M1 (computed style says X, rendered output is Y). No `getComputedStyle` check would catch it because the cascade resolved correctly — the resource load is what failed.

**The detection rule**:
- Use `document.fonts` to enumerate loaded fonts and check `status === 'loaded'` (not `'error'` / `'loading'` / `'unloaded'`) for every font declared in `theme.json` `settings.typography.fontFamilies`.
- Add this check to `tools/multi-frame-qa/capture.js` AND the new `scripts/mockup-parity-validator.js` so it can never ship silently again.

**The architectural rule**:
- Per the SGS framework: NO external CDN for fonts. Self-host all fonts in `theme/sgs-theme/assets/fonts/<family>/`. The Mama's variation pointing at `gstatic.com` violated this; the violation produced a real visual defect.
- Variation `settings.typography.fontFamilies[].fontFace[].src` MUST resolve to a local file path (e.g. `file:./assets/fonts/fraunces/Fraunces[opsz,wght].woff2`).
- Add a static-analysis check (`scripts/font-source-audit.js` or extend `css-pattern-audit.js`) that flags `https://` in any `theme.json` font src.

## 2026-05-04 — single-frame post-load screenshots miss first-paint defects (the invisible hero image bug)

The hero PoC shipped with a CSS entrance animation (`animation: sgs-hero-enter ... both; animation-delay: 360ms`) that made the hero image **invisible during the first 0-960ms of every page load**. Two QC passes (measured + Gemini Pro Vision) both gave clean reports because both sampled screenshots after the animation completed. Bean caught the bug live in his own browser.

**Why both QCs missed it:** they treated `getComputedStyle().opacity = 1` and a single post-load screenshot as redundant confirmation. They're not redundant — they answer different questions, and they can disagree. The disagreement IS the bug signature for paint-state defects.

**The methodology rule:**

1. Take screenshots at MULTIPLE times after navigation (0ms, 200ms, 500ms, 1000ms, 3000ms), not one. Diff frames against each other to find any element whose visibility shifts.
2. Run DOM measurement at the SAME EARLY moment (≤300ms after nav). If `getComputedStyle()` says visible AND screenshot says invisible → paint-state defect → flag.
3. NEVER trust "all measurements pass + screenshot passes" if both were sampled late. Late samples both confirm the end-state, neither tests first-paint.

**The architectural rule:**

CSS entrance animations are a per-instance choice. Hardcoding `animation: ... both; animation-delay: 360ms` on a structural element (like `.sgs-hero__split-image`) makes invisibility the default first-paint state for every visitor on every page load. This violates the no-hardcoding rule. Animations belong as opt-in block attributes (`enableEntranceAnimation: boolean default false`), not as global CSS rules in `style.css`.

**The process rule:**

The `sgs-wp-engine` Phase 3 STOP GATE (design-reviewer + zero criticals before deploy) is non-negotiable. Bypassing it because "the structure looks complete" produces this exact class of bug. Make it a git hook that refuses commits without a passing visual-diff report.

**Fix:**
1. Remove the broken animation OR rebuild as opt-in attribute (planned next session)
2. Add multi-frame capture script (`tools/multi-frame-qa/capture.js`)
3. Add static-analysis grep to L8 visual-qa for `animation-fill-mode: both` + `animation-delay > 0ms`
4. Add commit hook enforcing the STOP GATE

Captured as M1, M2, M3, M4 in `.claude/specs/common-wp-styling-errors.md` and N1-N5 (visual-qa blind spots).

## 2026-05-04 — dynamic blocks with InnerBlocks slots MUST `save: () => <InnerBlocks.Content />`, never null

Three SGS blocks (`sgs/product-card`, `sgs/cta-section`, `sgs/info-box`) had `save: () => null` while declaring `<InnerBlocks>` slots in their edit components. The editor showed the migrated InnerBlocks structure correctly in memory after a deprecated.js migrate() ran, but **a save round-trip emitted only the parent block** with no inner blocks in `post_content`. Hero already had the correct pattern (returns `<InnerBlocks.Content />`), which is why hero's CTAs persisted to DB but product-card / cta-section / info-box did not — until the next editor reload silently re-ran migrate() in memory only, masking the bug across sessions.

**Why null-save drops InnerBlocks:** `save: () => null` tells WordPress "this block produces no markup". The serializer reads that literally and drops the InnerBlocks tree entirely. Render.php drives the frontend output, but the serializer to `post_content` still needs the marker that says "include the InnerBlocks here." Without it, only the parent block comment + attributes survive a save.

**The fix:** for any dynamic block with an InnerBlocks slot, `save()` MUST return `<InnerBlocks.Content />`. Render.php still owns 100% of frontend output; save's only job here is to emit the InnerBlocks marker that round-trips through `post_content`.

```js
import { InnerBlocks } from '@wordpress/block-editor';
export default function Save() {
    return <InnerBlocks.Content />;
}
```

**How to apply:** any new SGS dynamic block declaring an InnerBlocks slot in `edit.js` must have a matching `<InnerBlocks.Content />` save. Add a sniff to the SGS uniformity audit that flags `save: () => null` whenever the matching edit.js has `<InnerBlocks>` or `useInnerBlocksProps`. Documented as B4 in `.claude/specs/common-wp-styling-errors.md` and as a Gotcha in `plugins/sgs-blocks/CLAUDE.md`.

## 2026-05-03 — extension-via-binding is the wrong shape for shared block features (composition wins)

I proposed a "Match Style" dropdown extension that would attach to every CTA-rendering block (sgs/hero, sgs/cta-section, sgs/product-card, etc.) and bind their internal CTAs to global Primary/Secondary presets. Bean called this "dumb" and was right.

**Why it was wrong:** the extension shape forced every parent block to render CTAs internally, then needed JS+PHP to inject the binding control into each, then needed the parent block's render to consume the bound preset. Maintenance: every time preset behaviour changes, every parent block needs touching.

**The right shape:** composition. The CTA on a hero is literally an `sgs/button` block placed inside (via InnerBlocks). The preset binding lives once — on `sgs/button` itself. Every instance everywhere inherits it free. Mirrors how core/buttons + core/button compose. Bean named the second piece `sgs/multi-button` (the container).

**Why this matters generally:** when "feature X needs to be available on N different blocks", the temptation is to write a block extension that injects controls into all of them. But if X is itself a block-shaped concept (button, image, link, icon), the right move is to make X its own block and have other blocks accept it via InnerBlocks. Extensions are right for cross-cutting concerns (animation, visibility) where the feature has no natural block representation.

**How to apply:** before reaching for a block extension, ask "is this feature a block?" If yes, build the block, use InnerBlocks composition. Extensions only when the feature is NOT a block.

## 2026-05-03 — fingerprints must be auto-derived from block.json, never hand-written

The recogniser shipped with hand-written fingerprints. sgs/hero declares 48 attributes in block.json but the fingerprint only extracted 6 (12% coverage). The missing 42 included `splitImage` (the right-side hero image) and every responsive variant — the silent bug Bean spotted earlier where the live hero rendered with no image.

**Why hand-written is wrong:** the schema is already the source of truth. Hand-writing a subset is duplicate work that drifts immediately. New attributes added to block.json don't flow through unless someone remembers.

**The fix:** every fingerprint must be auto-generated from the block's block.json. For each declared attribute, an extractor entry exists by default — even if the extractor body is `TODO`, the slot is present so the extractor cannot silently skip it. Coverage is enforced by code, not by remembering.

**How to apply:** any new SGS block automatically gets a recogniser fingerprint scaffold from its block.json. Heuristics fill in the deterministic extractors (text, link, image, colour-from-CSS-rule, etc.). Anything not deterministic flags as TODO and surfaces in the extractor's coverage report.

## 2026-05-03 — pull all CSS every time during extraction, classify after

I started selective in the v2 extractor — only pulling CSS rules whose attributes I knew how to map. Bean's directive: pull all CSS every time, then categorise into block-attribute / universal / custom. Selective pulling means quietly losing design intent.

**Why this matters:** the universe of CSS in a mockup is bounded; the universe of "design intent we'll think to look for" is open. Pulling everything and classifying after is the only way to guarantee no silent gaps.

**How to apply:** v2 extractor harvests every CSS rule whose selector matches an element in the section (BS4 native selector engine). For each rule's declarations, classify: maps-to-block-attribute (go to block) / universal-already-handled (ignore) / one-time-custom-CSS (emit as scoped style). 0% silent loss.

## 2026-05-01 — auto-clone is structurally sound but visually insufficient

The recogniser pipeline produced valid block markup for the Mama's Munches homepage and the page rendered without errors. Activating the `mamas-munches` style variation lifted fidelity from ~12/100 to ~65/100. Bean's verdict: still not close enough to be an "exact likeness" of the draft.

**Lesson:** programmatic translation captures structure + tokens but misses the design choices that live in the gap between block defaults and mockup-specific styling — section banding, card containers, decorative frames, exact spacing rhythm, custom hover states. For client-facing visual clones the auto-pipeline gets to ~65/100; the last 35 points need a deliberate top-to-bottom rebuild section by section.

**How to apply:** for site clones, run the recogniser to get the structural skeleton + token mapping, then walk the design top-to-bottom matching the mockup section by section. Do not declare done from a one-shot auto-output.

Lessons that have fired repeatedly enough to be worth surfacing here. Living source: CC auto-memory at `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_*.md` — this file is a curated index. Click through for full detail per lesson.

## Recurring patterns

| Lesson | One-line summary | Detail |
|--------|-----------------|--------|
| `always-screenshot-verify` | MUST take a frontend screenshot and visually inspect it before saying any fix is complete — no excep | [feedback_always_screenshot_verify.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_always_screenshot_verify.md) |
| `block-name-search-blindspot` | When a block name contains a parenthetical qualifier (e.g. "Icon Block (single icon)"), Claude's grep instinct breaks. Even when the name is the literal heading, Claude can fail to locate the file. Fix: search the heading verbatim including parens, then search core noun without qualifier as fallback. Capture as a TODO for the eventual ledger-tag system | _captured 2026-04-29 mid-Phase-1c session_ |
| `verify-rendered-output-not-internal-metrics` | Internal metrics (function return value, DB row count, JSON shape, "tests passed", file-content read-back) never prove user-visible visual outcomes. Visual claims require live-DOM assertion: `getComputedStyle`, `getBoundingClientRect`, `element.style.cssText`, or screenshot AT a specific selector. /qc scoring 95/100 while user-visible bugs are everywhere is the failure signature | [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md) (blub.db row 194) |
| `block-validation-recovery` | When block attribute changes don't render on the frontend, check for block validation errors in the  | [feedback_block_validation_recovery.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_block_validation_recovery.md) |
| `defaults-need-deliberate-judgement` | When setting defaults across a class of components (blocks, templates, fields, palette assignments), | [feedback_defaults_need_deliberate_judgement.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_defaults_need_deliberate_judgement.md) |
| `design-session-2026-03-28` | Extensive design review and fixes session — user's specific dislikes, what was fixed, and what still | [feedback_design_session_2026_03_28.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_design_session_2026_03_28.md) |
| `ingest-dont-generate-reference-data` | For any reference-DB skill, populate via deterministic ingest-*.py from authoritative open-source re | [feedback_ingest_dont_generate_reference_data.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_ingest_dont_generate_reference_data.md) |
| `litespeed-gotchas` | LiteSpeed UCSS strips CSS rules it considers unused, and its JS combiner serves stale cached files e | [feedback_litespeed_gotchas.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_litespeed_gotchas.md) |
| `no-hardcoding-mobile-nav` | Never build hardcoded HTML components in template parts. Always flag existing hardcoding when encoun | [feedback_no_hardcoding_mobile_nav.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_no_hardcoding_mobile_nav.md) |
| `palette-defaults-for-blocks` | When setting any default colour value on an SGS block, use a palette token (var(--wp--preset--color- | [feedback_palette_defaults_for_blocks.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_palette_defaults_for_blocks.md) |
| `parallel-dispatch-shared-files` | When dispatching parallel agents that may touch the same file (extension files, theme.json, shared C | [feedback_parallel_dispatch_shared_files.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_parallel_dispatch_shared_files.md) |
| `playground-not-useful` | WordPress Playground is unsuitable for SGS dev/design work because it cannot serve production media  | [feedback_playground_not_useful.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_playground_not_useful.md) |
| `prefer-diagnostics-over-cli-linters` | After any code edit, read the VS Code Problems panel via mcp__ide__getDiagnostics instead of running | [feedback_prefer_diagnostics_over_cli_linters.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_prefer_diagnostics_over_cli_linters.md) |
| `sgs-monorepo-separation` | Framework code lives in plugins/ + theme/sgs-theme/; client code lives in sites/<client-slug>/. Run  | [feedback_sgs_monorepo_separation.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_sgs_monorepo_separation.md) |
| `sgs-workflow` | Always invoke /sgs-wp-expert before SGS WordPress work and /sgs-update after all changes | [feedback_sgs_workflow.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_sgs_workflow.md) |
| `ship-skill-and-slash-command` | When a skill wraps a single canonical CLI invocation, ship BOTH the skill AND a slash command in ~/. | [feedback_ship_skill_and_slash_command.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_ship_skill_and_slash_command.md) |
| `stage-files-via-tmp-not-bash-heredoc` | When writing Python scripts, markdown, regex content to a file via Bash, use the file-staged pattern | [feedback_stage_files_via_tmp_not_bash_heredoc.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_stage_files_via_tmp_not_bash_heredoc.md) |
| `use-devtools-first` | When a CSS property isn't applying correctly, use Chrome DevTools or Playwright to check the Compute | [feedback_use_devtools_first.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_use_devtools_first.md) |
| `verify-rendered-output-not-internal-metrics` | Before claiming any visual / CSS / layout / default-rendering work is done, capture a Playwright assertion on the live rendered DOM showing the user-visible value. Internal metrics (commits, builds, validations, contrast values, OPcache reset) prove inputs, never user-visible outcomes. blub.db row 194. | [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md) |

## Reference catalogues

- **Common WordPress styling errors** — 21 specific failure patterns from the 2026-04-29 polish session, each with cause + proven fix: [`specs/common-wp-styling-errors.md`](specs/common-wp-styling-errors.md)

## How to add a lesson

When a lesson fires that you want to remember:
1. Add a `feedback_<slug>.md` file to the auto-memory dir
2. Add a row to this table
3. The CC auto-memory system reloads it automatically next session
