# Bug report: small-giants-wp @ 7a11d155cda66c7436a5269c3bb8e529f8e79c9f

Every bug below was checked by a separate prover agent. Each one has a failing test under `/tmp/hunt/prover-N/` and a fix that was tested on a copy of the code, except where noted. The prover's verdict is "demonstrated" (a test failed as claimed) unless marked "confirmed by reading". Line numbers are approximate.

## High: wrong result with no error, or data loss, on ordinary input

1. **retire_table.py `retire()` drops tables whose BLOB data didn't survive archiving.** Line ~178–191.
   - **Input:** a table with a BLOB column holding `b'\x00\x01'`.
   - **Expected:** the round-trip check fails and the table is kept.
   - **Actual:** `json.dumps(default=str)` stores the string `"b'\\x00\\x01'"`. The check compares the archive with itself, not with the live rows, so it prints VERIFIED and the table is dropped.
   - **Test:** prover-1/test_blob.py
   - **Fix:** `if check_rows != rows: return 3` before the DROP. Better still, encode BLOBs (for example as base64).
2. **wp_reference_archive.py `restore()` duplicates every row on each restore.** Line ~190.
   - **Input:** run `--restore` twice.
   - **Expected:** 5494 hooks rows.
   - **Actual:** 10988 rows, because `id` is left out and INSERT OR REPLACE never meets a conflict.
   - **Test:** prover-27/test_restore_twice.py
   - **Fix:** `DELETE FROM {table}` before the inserts, then a plain INSERT.
3. **typography.py `_ratio` divides a unitless line-height by the font size.** Line ~46.
   - **Input:** `_ratio('1.5','16px',16)`.
   - **Expected:** 1.5.
   - **Actual:** 0.094, because `_px` accepts a bare number as px.
   - **Test:** prover-17/test_ratio.py
   - **Fix:** return a bare number unchanged before calling `_px`.
4. **token_map.py `build_draft_root_token_map` treats any selector containing `:root` as `:root`.** Line ~58. Confirmed by reading.
   - **Input:** `:root{--bg:#fff} :root[data-theme=dark]{--bg:#000}`.
   - **Expected:** bg = `#fff`.
   - **Actual:** bg = `#000`; the dark theme value overwrites the base token.
   - **Test:** prover-30/test_t.py. It couldn't run because tinycss2 isn't installed, so the fix is also untested.
   - **Fix:** `any(s.strip()==":root" for s in selector.split(","))`.
5. **motion-sample.mjs `framesOf` treats a literal value as computed if its text appears anywhere in the formula.** Line ~124.
   - **Input:** opacity 0→1 with formula `x*10`.
   - **Expected:** opacity 0.5 at the halfway frame.
   - **Actual:** opacity is dropped, because `'x*10'.includes('0')` and `.includes('1')` are both true.
   - **Test:** prover-23/t.mjs
   - **Fix:** match whole tokens instead of substrings.
6. **fill-page.mjs `pageBaseline` scales rem letter-spacing by the element's font size.** Line ~82.
   - **Input:** `0.1rem` at a 32px font size.
   - **Expected:** `1.6px` or `0.1rem`.
   - **Actual:** `3.2px`, because `/em$/` also matches rem.
   - **Test:** prover-11/t.mjs
   - **Fix:** `/(?<!r)em$/`.

## Medium

7. **php_preprocess.py `composite_transition_props` never handles animation.** Line ~421.
   - **Input:** an `animation:` statement.
   - **Expected:** `{'d': {'animation-duration'}}`.
   - **Actual:** `{}`, because statements without the word "transition" are skipped first.
   - **Test:** prover-8/t.py
   - **Fix:** also let statements containing "animation" through.
8. **php_preprocess.py `inline_array_variables` garbles source when calls are nested.** Line ~308.
   - **Input:** `f(g($m), $m)`.
   - **Actual:** the output text is duplicated, giving `f(g($m), array('a'=>1)  array('a'=>1) ), $m);`.
   - **Test:** prover-9/test_nested.py
   - **Fix:** `if m.start() < pos: continue`.
9. **Rule 20 (`20-pattern-template-lock.js`): an empty `Post Types:` header swallows the next line.** Line 43.
   - **Effect:** unlocked client patterns are never flagged.
   - **Test:** prover-3/t.js
   - **Fix:** `/Post Types:[ \t]*([^\r\n]*)/`.
10. **Rule 39 (`39-media-control-coverage.js`) Part B checks each atom on its own, not the union of all atoms.** Line ~581.
    - **Effect:** false type-coverage-gap findings when the atoms together cover every offered type.
    - **Test:** prover-10/test.js
    - **Fix:** subtract the types covered by any declared atom.
11. **Rule 45 (`45-typography-full-replacement.js`) misses WordPress's `__experimental*` typography keys.** Line ~128.
    - **Effect:** native typography declared through those keys is never flagged.
    - **Test:** prover-13/t.js
    - **Fix:** add the six keys to `REAL_TYPOGRAPHY_SUBFLAGS`.
12. **wf_editor.py `EditorModel.block` walks depth-first with a global `seen` set.** Line ~432.
    - **Effect:** a file first reached by a long path is never expanded, so canvas credits are lost and false L3 gaps are reported.
    - **Test:** prover-5/test_wf.py
    - **Fix:** walk breadth-first with `queue.pop(0)`.
13. **palette.py `_measured_token_values` treats any selector containing "primary" as the primary button.** Line ~94.
    - **Input:** `.primary-nav{background:var(--navy)}`.
    - **Actual:** the navy token gets the button's coral colour.
    - **Test:** prover-16/test_p.py
    - **Fix:** require a button/btn selector.
14. **declared_sources.py `_layout_fact`: `1,200px` is read as `200px`.** Line ~182.
    - **Test:** prover-29/test_it.py
    - **Fix:** allow thousands groups, add a left boundary to the regex, and strip the commas.
15. **tree.mjs `FORBIDDEN_POSTS` is missing motion-QA fixtures 5223, 5226, 5229 and 5395.** Line 10.
    - **Effect:** writes to those posts are allowed, though the comment and CLAUDE.md say they must never be written.
    - **Test:** prover-22/t.mjs
    - **Fix:** add the four IDs.
16. **fill-entrance.mjs `atRest` ignores scale and rotation inside the transform matrix, and ignores rotate, filter and clip-path.** Line ~227.
    - **Effect:** the wrong "from" pose is used.
    - **Test:** prover-19/t1.mjs (run on a copy with its imports stubbed)
    - **Fix:** check `scaleOf`/`rotateOf`, filter and clip-path.
17. **fill-state-tokens.mjs `createPatch.set` crashes on a path under an existing leaf.** Line ~78.
    - **Input:** `set(['a','b'],'x'); set(['a','b','c'],'y')`.
    - **Expected:** a recorded conflict.
    - **Actual:** TypeError.
    - **Test:** prover-20/t.mjs
    - **Fix:** if the node isn't an object, record a conflict and return.

## Low

18. **intake-head.mjs `fontUrlFamilies` crashes on a short css2 tuple.** Input: `family=Inter:ital,wght@1` gives a TypeError. Test: prover-21. Fix: `(at('wght')||'')`.
19. **fill-media.mjs `draftPath` throws URIError on a malformed `%` escape.** Input: `assets/a%E0.png`. Test: prover-18. Fix: try/catch around `decodeURI`.
20. **Rule 39: a PHP failure (for example php not installed) throws out of `run()` and drops all of the rule's findings.** Expected: an error finding, as other producer failures get. Test: prover-14. Fix: try/catch around `resolveStoredNames`.
21. **baseline.js `updateBaseline` writes a key twice when it appears twice in one batch.** Test: prover-12. Fix: add each key to `seenKeys` inside the filter.
22. **state-map.mjs `vocabStateFor`: the stem regex accepts `:`/`::` pseudo tokens,** against its own docstring. The prover notes this is probably reachable only through rows with a wrong or missing kind. Test: prover-7. Fix: drop `::?` from the regex.

## Coverage

- **Read:** 167 of the 168 listed files, 27,933 lines, in 20 slices. I skipped `data/runtimes/8fe7df74405f.support.js` (1,911 lines) because it says it was generated from `dc-runtime/src`.
- **Agent failures:** I'm not told why agents fail.
  - Readers failed on slices 1, 5, 7, 12, 18 and 19.
  - Reviewers failed on slices 3, 5, 9 and 18.
  - **Slice 5 (rules 30, 33, 35, 36, 38) and slice 18 (read-assets, read-logic-statics, read-logic, read-readme, references, resolve-declared, site-build-labels) were never read.**
- **Suspicions:** 121 in total. 36 were rated 3 or higher; the 30 rated highest went to provers.
- **Rejected (1):** site_info_intake.py `read_intake` with numeric rowIds. Real rowIds are always strings like `siteinfo:<key>`, so the lookup can't fail in practice.
- **Not checked because the prover failed (7):**
  1. retire_table: the round-trip check compares the archive with itself. This is the same root cause as bug 1.
  2. palette.py: two palette entries can get the same slug.
  3. fill-page.mjs `lineHeightPx` returns `'NaNpx'` for em, rem or `normal`.
  4. declared_sources: bold `**Label:**` bullets are ignored.
  5. motion-sample: keyframes with no offset give NaN offsets.
  6. read-animations: records without an id are merged.
  7. media-upload.mjs and site-build.mjs: the client argument is missed when it comes right after `--apply`.
- **Not checked because of the 30-candidate cap (6):**
  1. typography.py: `int()` truncates the base font size instead of rounding.
  2. check-refs.mjs: a slot whose parent doesn't resolve is resolved page-wide.
  3. intake-construct-readers: a `//host` link is classed as a draft page.
  4. motion-channels: `translate:none` and `scale:none` are reported as unsupported.
  5. skeleton-panel-rules: the grid track index doesn't wrap.
  6. parity score.mjs: rows aren't filtered by the case's states.
- **Not checked, rated 2 (85):** listed in the run result. They include font_weights.py operator precedence, `fill-state-reason.mjs` crashing when `find` returns undefined, and lint.mjs only skipping the top-level `IGNORED` folders.
