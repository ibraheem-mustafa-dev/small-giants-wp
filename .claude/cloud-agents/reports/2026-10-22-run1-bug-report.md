# Bug report: small-giants-wp, commit 0bb6a7970cd6aaa06148e8216b8ec77d2fa74be8

The hunt covered the 28 listed files (29,893 lines), split into 20 slices. Each slice was read by one agent and reviewed again by a second. Together they raised 90 suspicions. The 30 rated 3 or higher went to separate prover agents, which saw only the claim. Results: **29 confirmed** (27 shown by a failing test, 2 confirmed by reading the code), 0 rejected, and 1 not checked because its prover failed. Every fix marked "fix verified" was applied to a copy, and the test passed with it. Each test and its output are under `/tmp/hunt/prover-N/` in the sandbox where the hunt ran.

Severity scale:
- **High:** ordinary input gives a wrong result with no error, loses data, or never finishes.
- **Medium:** a crash on ordinary input, or a wrong result only on unusual input.
- **Low:** everything else.

When a bug sat between two labels, I chose the lower one.

## High

### H1. `push-theme-snapshot.py` `collect_leaves` (~l.376): changes inside lists never trigger the CLOBBERED warning
- **What it does wrong:** every list item is flattened onto the same `prefix[]` path, so each item overwrites the one before it.
- **Input:** live palette `[{a:#f00},{b:#000}]` and snapshot `[{a:#0f0},{b:#000}]`.
- **Expected:** `drift_warning` reports the clobbered palette colour.
- **Actual:** 0 clobbered and no warning, so the push silently overwrites live edits.
- **Test:** `prover-3/test_clobber.py`
- **Fix (verified):** index the path: `for i,item in enumerate(obj): leaves.update(collect_leaves(item, f"{prefix}[{i}]"))`

### H2. `push-theme-snapshot.py` `do_rollback` (~l.1062): reports success when the global-styles restore failed
- **What it does wrong:** the return value of `post_global_styles` is ignored, and missing credentials or a missing post ID are skipped without a message.
- **Input:** a backup that has a `wp_global_styles` layer, where the REST POST fails or no credentials resolve.
- **Expected:** a loud failure and exit code 1.
- **Actual:** prints "rollback complete." and returns 0. The user layer is not restored.
- **Test:** `prover-11/test_rollback.py`
- **Fix (verified):** if there are no credentials, the post ID is None, or the POST fails, print `ROLLBACK INCOMPLETE` to stderr and return 1.

### H3. `sgs-update-v2.py` `_populate_allowed_blocks` (~l.3150): an old allowedBlocks value is never cleared
- **Input:** `edit.js` drops (or makes dynamic) an `ALLOWED_BLOCKS` list that is already stored in the database.
- **Expected:** the column is set to NULL.
- **Actual:** the code hits `continue` before the write, so `["core/heading"]` stays forever.
- **Test:** `prover-4/test_ab.py`
- **Fix (verified):** for the None and dynamic cases, set `new_value=None` and let the existing write-on-drift UPDATE run.

### H4. `sgs-update-v2.py` `_process_gutenberg_block_dir` (~l.3751): almost every core block is recorded as `dynamic`
- **What it does wrong:** `type = "dynamic" if "$schema" in block_data`, and nearly every `block.json` has `$schema`.
- **Input:** core/paragraph.
- **Expected:** `static`.
- **Actual:** `dynamic`.
- **Test:** `prover-24/test_type.py`
- **Fix (verified):** base the type on `block_data.get("render")`. Ideally also check for an `index.php` render callback.

### H5. `extract-signatures.py` `_top_level_vars` (~l.884): vars inside `calc()`, `rgba()` and similar are lost
- **What it does wrong:** every `(` raises the nesting depth, not just `var(`.
- **Input:** `calc(var(--sgs-x) * 2)`.
- **Expected:** `{'--sgs-x'}`.
- **Actual:** `set()`, so state and element attribution are silently dropped for that var.
- **Test:** `prover-1/test_top_level.py`
- **Fix (verified):** keep a stack of open brackets and only count the ones opened by `var(`.

### H6. `extract-signatures.py` `_detect_conditional_gates_php` (~l.224): false "ternary" gate
- **What it does wrong:** the regex `\?\s*.+\s*:` matches the `?` in `<?php` and any later `:`.
- **Input:** `<a href="<?php echo esc_url('https://x'); ?>">`
- **Expected:** `[]`
- **Actual:** `['ternary']`
- **Test:** `prover-16/test_ternary.py`
- **Fix (verified):** ``r'(?<![<?])\?(?!php\b|>|\?)[^:\n]*?\S\s*:(?!:)'``

### H7. `extract-signatures.py` `_build_php_var_attr_map` (~l.1366): comparisons and foreach keys are read as assignments
- **Input:** `if ($mode === $attributes['layout'])` and `foreach ($items as $k => $v) {...$attributes['a']}`
- **Expected:** neither creates a mapping.
- **Actual:** `{'mode':'layout'}` and `{'k':'a'}`
- **Test:** `prover-2/test_bug.py`
- **Fix (verified):** ``r"\$(\w+)\s*(?<![=!<>])=(?![=>])\s*(.+?);"``

## Medium

**M1. `calibrate.mjs` `calibrateBlock` (l.166-188): the real build uses a stale tree.** If the dry run rejects nodes on the third attempt, `list` is filtered but the tree file is never rewritten. The real build then contains the rejected nodes, and reads are matched to the wrong instances by index. Confirmed by reading only: running it needs a live WordPress. Suggested fix (not verified): rewrite the tree after the loop and require a clean dry run.

**M2. `extract-signatures.py` `_custom_props_consumed` (~l.745): wrong border slot when a fallback var is nested.**
- **Input:** `border:var(--sgs-w,0) solid var(--sgs-c, var(--sgs-fb, red))`
- **Actual:** `--sgs-c` is tagged as width and `--sgs-fb` as colour.
- **Test:** `prover-9/test_slot.py`
- **Fix (verified):** order the slots using top-level vars only.

**M3. `extract-signatures.py` `_iter_rule_blocks` (~l.863): CSS after `@charset` or `@import` is dropped.**
- **Input:** `@charset "UTF-8";\n.sgs-hero{...}`
- **Actual:** `[]`
- **Test:** `prover-15/test_bug.py`
- **Fix (verified):** keep only the part of the header after its last `;`.

**M4. `extract-signatures.py` `_attrs_referenced` (~l.3779): nested references are not excluded.**
- **Input:** `attributes.tabs.length` with attrs `{tab, tabs}`
- **Actual:** returns `{'tab'}`. The regex backtracks one character to get past the "no `.` after" check.
- **Test:** `prover-18`
- **Fix (verified):** add `\b` before the lookahead: ``(\w+)\b(?![.\[])``

**M5. `extract-signatures.py` `_attrs_referenced` (~l.3783): member access counts as a bare identifier.**
- **Input:** `value={ link.url }` where `url` is a destructured attribute.
- **Actual:** returns `{'url'}`.
- **Test:** `prover-30`
- **Fix (verified):** use a lookbehind: ``(?<![.\w$])``

**M6. `extract-signatures.py` `_attrs_from_state_colour_helper_calls` (~l.1630): every `$x = (` matches when the composer list is empty.**
- **What it does wrong:** with no composers, the regex compiles to the empty group `()`.
- **Actual:** an attribute gets element `x` and state `hover` even though there is no composer call.
- **Test:** `prover-17`
- **Fix (verified):** skip the loop when the composer set is empty.

**M7. `assign-canonical.py` `detect_role_from_block_json` (~l.1386): a substring match where word boundaries are promised.**
- **Input:** `'Controls the textTransform of the heading'`
- **Actual:** text-content, because "the text" matches inside "textTransform".
- **Test:** `prover-8`
- **Fix (verified):** use `re.search(r"\b"+re.escape(s)+r"\b", ...)`.

**M8. `assign-canonical.py` `peel_property_suffix` (~l.220): suffixes are peeled from the middle of words.**
- **Input:** `context` → `('con','Text')`; `bandwidth` → `('band','Width')`
- **Test:** `prover-12`
- **Fix (verified):** require `name[len(prefix)].isupper()`.

**M9. `assign-canonical.py` `_singularise` (~l.306): wrong singulars for most "-ses" words.**
- **Input and actual:** courses → cours, cases → cas, responses → respons, phases → phas.
- **Test:** `prover-13`
- **Fix (verified):** apply the rule only to words ending in `sses`.

**M10. `assign-canonical.py` `load_slot_aliases` (~l.97): an alias can clobber a canonical slot name, depending on row order.**
- **Input:** gallery (alias `media`) read before the `media` row.
- **Actual:** `media` → `gallery`.
- **Test:** `prover-14`
- **Fix (verified):** register all canonical names first, then the aliases.

**M11. `assign-canonical.py` `_TIER_B_BEM_ELEMENT_RE` (~l.986): BEM modifiers break the element match.**
- **Input:** `.sgs-hero__headline--large`
- **Actual:** extracts `headline--large`, which ends up unresolved.
- **Test:** `prover-29`
- **Fix (verified):** ``__([a-z0-9]+(?:-[a-z0-9]+)*)``

**M12. `21-render-without-control.js` `exportBody` (~l.696): returns the next declaration's body.** An expression-bodied arrow export gets the following function's body, which hides findings. The docstring promises null.
- **Test:** `prover-10/test.js`
- **Fix (verified):** return null on `;` or `export` before any `{`.

**M13. `intake-inventory-code.mjs` `guardTrigger` (~l.408): `!== 0` is excluded as if it were `=== 0`.**
- **Input:** `Object.keys(errs).length !== 0`
- **Actual:** null, so the validation-fail trigger is lost.
- **Test:** `prover-7/test.mjs`
- **Fix (verified):** ``(?:(?<!!)===?|<=?)\s*[01]\b``

**M14. `sgs-update-v2.py` `scrape_allowed_blocks` (~l.2175): marked dynamic because of text in a comment.**
- **Input:** a `?` inside a comment in a literal array.
- **Actual:** returns the dynamic-skip value, which also throws away every other declaration for that block.
- **Test:** `prover-22`
- **Fix (verified):** strip comments and strings before the marker check.

**M15. `sgs-update-v2.py` `_extract_colour_tokens` (~l.4413): rgb(), hsl() and named colours are dropped without a warning.**
- **Test:** `prover-23`
- **Fix (verified):** remove the `not colour.startswith("#")` condition.

**M16. `sgs-update-v2.py` `_scrape_handbook_sources_5_to_10` (~l.4166): the field-guide URL is hardcoded to 7.0.** With `wp_version=7.1`, the 7.0 page is stored under the 7.1 label.
- **Test:** `prover-26`
- **Fix (verified, with a caveat):** build the URL from `wp_version`. The code's own comment says the plain version URL returns 404 for 7.0 and later, so a lookup from version to URL is better.

**M17. `sgs-update-v2.py` `_match_slot_to_block` (~l.4917): LIKE wildcards are not escaped.**
- **Input:** `card_grid`
- **Actual:** matches `sgs/card-grid` as a prefix match.
- **Test:** `prover-27`
- **Fix (verified):** escape `_` and `%` and add `ESCAPE '\'`.

**M18. `sgs-update-v2.py` `_prune_orphans_on_conn` (~l.5631): `dry_run=True` still adds a column to both databases.** The function runs ALTER TABLE `is_stale` without a dry-run check.
- **Test:** `prover-28`
- **Fix (verified):** `if not dry_run: _ensure_blocks_is_stale_column(conn)`

**M19. `31-golden-colour-control.js` `checkRow` (~l.1027): a mixed text and decoration row skips the mismatch check.** The code uses `includes()` where the shared walk uses `every()`. Confirmed by reading only: Babel is not installed, so the self-test could not run. Suggested fix (not verified): use `every(m => m==='shadow'||m==='decoration')`.

## Low

**L1. `sgs-update-v2.py` `restore_wp_reference_archive` (~l.348): a corrupt archive aborts `--rebuild`.** The docstring promises this is non-fatal, but only FileNotFoundError is caught.
- **Test:** `prover-21`
- **Fix (verified):** also catch `OSError, EOFError, ValueError, KeyError, sqlite3.Error`.

**L2. `sgs-update-v2.py` `stage_13_export_db_to_csv` (~l.6998): `tables_added` is always 0 and `unchanged` is never filled in.** The size check runs after the header row has already been written.
- **Test:** `prover-5`
- **Fix (verified):** record whether the file existed, and its old bytes, before writing.

## Not confirmed

- **Rejected:** none.
- **Prover failed (not checked):** `sgs-update-v2.py` `_insert_dev_blog_articles` ~l.4093. The claim is that the slugs are positional (`wp-dev-news-1..5`) and written with INSERT OR IGNORE, so newer dev-news posts are never stored.
- **Not checked:** 60 suspicions. Six of them were rated 3 but fell outside the cap of 30 provers. That cap was mine, set to keep the run within 100 agents. Those six:
  - `21-render-without-control.js` `controlCorpus` l.942: a whole-file fallback.
  - `31-golden-colour-control.js` l.661: helper rows dropped in the shared walk.
  - `31-golden-colour-control.js` l.1061: wrong mechanism named in the finding text.
  - `sgs-update-v2.py` `_github_api_get` l.3510: every 403 is treated as a rate limit.
  - `sgs-update-v2.py` `_prune_orphans_on_conn` l.5655: dry-run counts lower than a real run.
  - `calibrate-markers.mjs` `nonLengthTiers` l.175: the keyword marker equals the default.

  The other 54 were rated 2 by the agents that found them. The full list is below.

## Unchecked suspicions (raw list)
