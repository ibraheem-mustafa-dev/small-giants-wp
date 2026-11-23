# Bug report: small-giants-wp cloning-pipeline tooling

- **Repository:** github.com/ibraheem-mustafa-dev/small-giants-wp
- **Commit:** `7a11d155cda66c7436a5269c3bb8e529f8e79c9f`
- **Scope:** the 116 listed files, 29,943 lines.

Every bug below was checked by a separate prover agent that saw only the claim, not the reasoning behind it.

- **Demonstrated:** a failing test reproduces the bug, and a fix applied to a copy makes the test pass.
- **Confirmed by reading:** the code clearly has the bug, but the test could not run because an npm package (`html-tag-names`, `ajv`, `@babel/parser`) is not installed, and installing was not allowed.

The prover test files were written under `/tmp/hunt/prover-N/` in the sandbox. They are not copied to the outputs folder.

## Confirmed bugs, worst first

### High

**1. `scripts/parity/lib/auto-collect.mjs`, `collectAuto`, line ~210: the clip background walk never runs.** Demonstrated.
- **Input:** a control inside an `overflow:hidden` box that has a white ancestor.
- **Should happen:** `clip.bg` is `rgb(255, 255, 255)`, the background of the nearest painted ancestor.
- **What happens:** `clip.bg` is always `rgba(0,0,0,0)`. `bg` starts as `'rgba(0,0,0,0)'` (no spaces), but the loop test `/rgba\(0, 0, 0, 0\)|transparent/` expects spaces, so it is false on the first check.
- **Test:** prover-13/t.mjs.
- **Fix:** `let bg = 'rgba(0, 0, 0, 0)';`

**2. `plugins/sgs-blocks/scripts/wiring-fingerprint/wf_resolve.py`, `Resolver.signals`, line ~81: `data_consumed` is computed from the wrong field.** Demonstrated.
- **Input:** a channel with `data={'data-foo'}`, a CSS rule that reads `[data-foo]`, and an empty `fx_data`.
- **Should happen:** `data_consumed` is True.
- **What happens:** False. The call is `data_consumed(ch.fx_data, …)`, so it just repeats `fx_data_consumed`. The sibling file `wf_extensions.py` uses `ch.data`.
- **Test:** prover-26/test_sig.py.
- **Fix:** pass `ch.data` instead of `ch.fx_data`.

**3. `scripts/computed-route/lib/fill-confirm.mjs`, `RUNTIME` regex (line 15) used by `compareDR`: any `%` makes a value count as "runtime", which skips the comparison.** Demonstrated.
- **Input:** `compareDR('color', 'hsl(0 100% 50%)', 'rgb(0,0,255)')`.
- **Should happen:** a colour comparison, which would not confirm red against blue.
- **What happens:** `dr: 'runtime'`, so the verdict is "confirmed" for red against blue.
- **Test:** prover-25/t.mjs.
- **Fix:** treat a `%` as runtime only when it is outside a colour function.

**4. `plugins/sgs-blocks/scripts/inspector-scan/core/sources.js`, `SourceCache.strippedText`, line ~183 (the JS branch at ~144 has the same problem): blanking comments removes their newlines.** Demonstrated.
- **Input:** `'<?php\n/* a\nb */\n$x = 1;\n'`
- **Should happen:** the stripped text keeps 4 lines, with `$x` on line 4.
- **What happens:** 3 lines, with `$x` on line 3. Every line number after a multi-line comment is wrong, which breaks the documented promise that line math stays valid.
- **Test:** prover-12/test.js.
- **Fix:** replace with `raw.slice(s, e).replace(/[^\n]/g, ' ')` instead of `' '.repeat(len)`, in both branches.

### Medium

**5. `scripts/computed-route/lib/intake-harness.mjs`, `harnessOptions`: `stepMs: 0` gets through validation and the harness then loops forever.** Demonstrated.
- **What happens:** virtual time never advances, so `drainTimeouts` and `settlePhase` never reach their limits and never throw.
- **Test:** prover-28/t.mjs.
- **Fix:** reject `stepMs === 0`.

**6. `plugins/sgs-blocks/scripts/business_info/shapes.py`, `hours_fields`: a day range that wraps the week is silently dropped.** Demonstrated.
- **Input:** `'Sat-Mon 9.30-17.30'`
- **What happens:** returns `{}`.
- **Test:** prover-16/t.py.
- **Fix:** when start > end, use `DAYS[start:] + DAYS[:end+1]`.

**7. `plugins/sgs-blocks/scripts/wiring-fingerprint/wf_css.py`, `css_rules`, line ~89: an escaped quote breaks parsing.** Demonstrated.
- **Input:** `.a{content:"\""}.b{color:red}`
- **What happens:** returns `[]`, so every rule after the string is lost.
- **Test:** prover-7/test_esc.py.
- **Fix:** track backslash escapes inside strings.

**8. `plugins/sgs-blocks/scripts/wiring-fingerprint/wf_php.py`, `FUNC_RE`, line 19: a parenthesised default value cuts the parameter list short.** Demonstrated.
- **Input:** `function f($a = array(), $b) {}`
- **What happens:** params come out as `['a']`, so later arguments are mapped to the wrong params.
- **Test:** prover-5/t.py.
- **Fix:** allow one level of nested parentheses in the params group.

**9. `scripts/computed-route/lib/fill-state-read.mjs`, `negated()`, line ~163: a state nested deeper inside `:not(…)` is entered as a state.** Demonstrated.
- **Input:** `.btn:not(:is(:hover, :focus))`
- **What happens:** `:hover` and `:focus` are returned as states to enter.
- **Test:** prover-11/t.mjs.
- **Fix:** keep walking outward past a non-`:not` paren.

**10. Same file, `alternatives()`, line ~97: an `:is()` list inside `:not()` is split into alternatives.** Demonstrated.
- **Input:** `.card:not(:is(.x, .y)):hover`
- **What happens:** `.card.x` is credited with the hover look, although the selector excludes it.
- **Test:** prover-29/t.mjs.
- **Fix:** don't split an `:is()`/`:where()` that is nested inside `:not()` or `:has()`.

**11. `plugins/sgs-blocks/scripts/inspector-scan/rules/43-colour-only-state-indicator.js`, `isNonZeroWidthShorthand`, line ~206: only the first token is checked for a width.** Demonstrated.
- **Input:** `border-bottom: solid 2px transparent`
- **What happens:** a false warn. The width-first spelling gives 0 findings.
- **Test:** prover-4/t.js.
- **Fix:** scan every token for a width.

**12. Same file, `parseBlock`, line ~400: a statement at-rule swallows the rule after it.** Demonstrated.
- **Input:** `@charset "UTF-8"; .t.is-active{color:red}`
- **What happens:** 0 findings instead of 1.
- **Test:** prover-17/test.js.
- **Fix:** end an `@…;` statement at the `;`.

**13. `plugins/sgs-blocks/scripts/dbschema/seed_reference_data.py`, `_seed_property_equivalents`, line ~432: one missing column ends the whole seed run.** Demonstrated.
- **Input:** a row without the `note` key.
- **What happens:** an uncaught `KeyError` ends `seed_all`, and the seeders after it never run.
- **Test:** prover-22/t.py.
- **Fix:** use `r.get(c)`, as `_seed_states` does.

**14. `plugins/sgs-blocks/scripts/dbschema/migrate.py`, `_record` / `cmd_mark_applied`: a re-run overwrites `applied_at` for migrations already recorded.** Demonstrated.
- **What happens:** the original timestamp is replaced, even though the output says "already recorded". The applied/pending status stays correct; only the history is lost.
- **Test:** prover-19/test.py.
- **Fix:** `INSERT OR IGNORE`.

**15. `scripts/computed-route/lib/intake-usage.mjs`, `markupUsage`, line ~305: nested `<svg>` (or nested `<foreignObject>`) marks the outer element as closed.** Confirmed by reading.
- **Input:** `<svg><svg></svg><a/></svg>`
- **What happens:** the `<a>` is recorded as `html:a` instead of `svg:a`.
- **Fix:** count open tags against close tags.

**16. `scripts/computed-route/skeleton.mjs`, `main`, lines 138, 151, 154, 173: the `repo` option is ignored.** Confirmed by reading.
- **What happens:** `proposeSurface` and `loadFacts` are called without `repo`, so with a non-default repo they read from the default REPO and may write proposal files there.
- **Fix:** pass `repo` to all four calls.

**17. `scripts/computed-route/lib/intake-defects-deadfield.mjs`, `deadFieldVerdict`, line 150: `0` and `''` initialisers are not treated as falsy literals.** Confirmed by reading.
- **Input:** `class A { _el = 0; … }`
- **What happens:** the field is treated as written, so a dead field is missed. The header promises that any falsy literal counts.
- **Fix:** also accept falsy `NumericLiteral` and `StringLiteral` values.

### Low

**18. `scripts/computed-route/lib/ledger.mjs`, `holdsValue`, line ~167: the live value's unit is never checked.** Demonstrated.
- **Input:** `holdsValue('10px', '11%')`
- **What happens:** returns true, so real drift is accepted.
- **Test:** prover-18/t.mjs.
- **Fix:** test `live` against the same pixel regex as `expected`.

**19. `wf_css.py`, `css_rules`, line ~94: an apostrophe inside an unquoted `url()` drops the rest of the file.** Demonstrated.
- **Input:** `url(it's.png)`
- **Test:** prover-24/t.py.
- **Why low:** the CSS spec does not allow an unescaped `'` in an unquoted `url()`, so this input is unusual.

## What was read
- **Read the code:** all 20 slices (about 1,450–1,530 lines each) went to readers. **reader-13 failed.** Its slice:
  - `seeder_shapes.py`
  - `wf_scan.py`
  - `intake-process.mjs`
  - `pairs-page.mjs`
  - `solve-rows.mjs`
  - `lib/sweep.mjs`
- **Second look:** **reviewers 2, 5, 7, 9 and 20 failed**, so those slices got only the first read. Slice 13 did get its second look.
- **Totals:** 100 suspicions, of which 30 went to provers.

## Rejected
- **`motion-layers.mjs` `delayOf`:** rejected by two provers. Snapping upward follows the documented rule of up to three quarters of a step of lag.

## Candidates whose provers failed (not checked)
Each of these had both prover attempts fail. The reasons were not recorded. Readers rated them 3–5, and some readers' own experiments supported them, but they are **not confirmed**:
- **`business_info/extract.py` `extract_literal`:** social domains are matched as substrings, so `netflix.com` is filed as Twitter (because it contains `x.com`). The reader's experiment showed this. Rated 5.
- **`svg-screen.mjs` `svgProblem`:** an entity-encoded `@import` inside `<style>` gets past the check.
- **Rule 43 `hasReservedBorderWidth`:** a base `border:` shorthand is not counted as reserving a width.
- **`parity/lib/chrome.mjs` line 93:** the clip-path regex treats any value containing `100%` as clipped to nothing.
- **`wf_css.py` `specificity_zero`:** greedy `:where\(.*\)` accepts `:where(.a) .b:not(.c)`.
- **Rule 40:** the fixed 400-character window lets the next mount's `sanitiseSvg` clear an earlier unsanitised mount.
- **`used_fonts.py` `_FONT_DECL`:** a double-quoted family name is not found.
- **Rule 37:** only the first match on each line is checked.
- **`intake-defects-chain.mjs` `chainPass`:** `exhausted` is not set when the budget runs out on the last attempt.
- **Rule 42:** `() => undefined` is not flagged.

## Suspicions not checked
Seventy suspicions were never sent to a prover: 8 rated 3 that fell past the 30-candidate cap, and the rest rated 2 or below. The 8 rated 3:
- `ledger.mjs` `migrateAccepts` drops the accept's kind.
- `ledger.mjs` `entryFromRow` leaves out the pseudo and the hover state.
- `helper_maps.py` `css_vocabulary` throws away the declared props.
- `sandbox.py`: the hardlink probe counts a no-op as PASS.
- `pairs-page.mjs` `handElements` uses only the prefix to find a ref.
- `solve-rows.mjs` `classify` does not apply `effectiveState`.
- `intake-inventory-anim.mjs`: smoothing ignores `transition: all`.
- `guard.mjs` `guardRound` blocks writes on ancestors.

The low-rated ones are in the run result.
