# Bug report: small-giants-wp @ 8a2f7a6d19e20506ac1463c6d0a6f80f90ed7cd4

**Scope:** the 12 listed files (2,863 lines), in 2 slices:
- **A:** inspector-scan rules 30, 33, 35, 36 and 38 (1,427 lines)
- **B:** computed-route lib (1,436 lines)

**Agents:** 12 readers and 12 reviewers (one of each per file). All of them finished and none failed. Every candidate rated 3 or higher went to its own prover: there were 21, and 0 were cut by the cap.

**Result:** all 21 survived. 19 were demonstrated with a failing test. 2 were confirmed by reading only, because `@babel/parser` isn't installed in the sandbox. No prover rejected anything, so no retries were needed.

The test files are under `/tmp/hunt/prover-N-1/` in the sandbox. They were not copied to outputs.

**Severity:** this is lint and analysis tooling, so most bugs are a silently missed finding or a silently wrong output. Labels follow the rubric, and where a bug sat between two labels I chose the lower one.

## High

**1. read-readme.mjs `readReadme` (~l.179–216): items from nested headings are counted twice**
- **Input:** `## Judgement calls\n- a\n### Open items\n- b`
- **Expected:** `openItems` contains `b` once.
- **Actual:** `b` appears twice.
- **Same cause:** this also happens in `platformIntent` (`## Platform` / `### WordPress plugins`: `p, q, q`) and in `blockHints` (`## SGS blocks` / `### Block mapping`: `x` twice).
- **Why:** a parent section collects items from all deeper headings, and then each sub-heading pushes its own items again.
- **Fix:** when a parent collects items, skip sub-sections that will be processed on their own: template sub-headings, platform sub-headings, and block-hint sub-headings that have a block-hint ancestor.
- **Tests:** `prover-2-1/t.mjs`, `prover-3-1/t.mjs`, `prover-13-1/t.mjs`. Fixes were verified, and the diffs are in each folder.

**2. read-readme.mjs `readReadme` l.192: table rows become items in every section**
- **Input:** `## Business details\n| Field | Value |\n|---|---|\n| Phone | 123 |`
- **Expected:** `businessDetails` contains no table rows. The docstring says these lists hold only bullets and numbered items.
- **Actual:** both the header row and the data row end up in `businessDetails`.
- **Fix:** accept table rows only in block-hint sections, and skip the header row (the row just before a separator).
- **Test:** `prover-18-1/t.mjs`. Fix verified.

**3. 35-pinned-panel-position.js `TITLE_RE` l.64: an arrow function before `title=` hides the panel**
- **Input:** `<PanelBody onToggle={()=>x} title="Advanced">`
- **Expected:** 1 finding.
- **Actual:** 0 findings. The `[^>]*` stops at the `>` in `=>`.
- **Fix:** `\b(?:[^>{]|\{[^}]*\})*?\btitle`
- **Test:** `prover-1-1/t.js`. Fix verified.

**4. 35-pinned-panel-position.js `TITLE_RE` l.64: ToolsPanel is never matched**
- **Input:** `<ToolsPanel label={__('Advanced')}>`
- **Expected:** 1 finding.
- **Actual:** 0 findings. ToolsPanel takes its heading from `label`, but the regex requires `title=`.
- **Fix:** `\b(?:title|label)\s*=`
- **Test:** `prover-4-1/t.js`. Fix verified.

## Medium

**5. 36-box-control-presets-missing.js `presetsAttrIsTruthy` l.77: falsy literals count as truthy**
- **Input:** `presets={null}`, `{0}`, `{1}`, `{''}`, or an empty `{}`
- **Expected:** a finding. The runtime gate is `Array.isArray(presets) || presets === true`.
- **Actual:** no finding.
- **Fix:** return false for Null, Numeric, String and BigInt literals, and for `JSXEmptyExpression`.
- **Test:** `prover-5-1/t.js`. Fix verified.

**6. 38-media-attr-parity.js `loadResolution` l.285: the module cache ignores `ctx.blocksDir`**
- **Input:** a second `run()` in the same process with a different blocks directory.
- **Expected:** that run reports `unknown-atom-id`.
- **Actual:** it reuses the first run's stale result and reports nothing.
- **Fix:** key the cache on `blocksDir` (reset it when `blocksDir` changes).
- **Test:** `prover-10-1/test-orig.js`. Fix verified.

**7. 33-ineffective-typography-selector.js `hasDomEmission` l.302 and `domClassAttrRe` l.285: `\b` matches inside hyphenated class names**
- **Input:** token `sgs-x__title` on the line `$c[]='sgs-x__title-wrap';`
- **Expected:** no emission.
- **Actual:** counted as an emission, so a dead selector is passed as fine. The `i` flag also matches a class with different case.
- **Fix:** use `(?<![\w-])TOKEN(?![\w-])` and drop the `i` flag.
- **Tests:** `prover-0-1/t.js`, `prover-6-1/t.js`. Fixes verified.

**8. 33-… `lastClassToken` l.171: the wrong class is checked in selector lists and `:not()`**
- **Input:** `'.foo:not(.bar)'`
- **Expected:** `foo`.
- **Actual:** `bar`. With a comma-separated list, only the last part is checked.
- **Fix:** split on commas and strip `:not(...)` before matching. Ideally, check each comma part.
- **Test:** `prover-7-1/t.js`. Fix verified.

**9. 33-… `stripPhpLineComments` l.261: escaped quotes break comment stripping, and `#` comments are never stripped**
- **Input:** `$s='it\'s'; // .sgs-hero__headline`, or `# uses .sgs-hero__headline`
- **Expected:** the comment is stripped.
- **Actual:** the line is kept, and the token in the comment counts as an emission.
- **Fix:** skip the character after a backslash inside strings, and treat `#` (when not followed by `[`) as the start of a comment.
- **Test:** `prover-8-1/test.js`. Fix verified.

**10. 33-… `findTemplateOwnedRanges` l.214: a child with several classes is not recognised** (confirmed by reading)
- **Input:** a TEMPLATE child with `className: 'sgs-hero__headline extra'`
- **Expected:** a child-owned finding.
- **Actual:** none, because the code uses `===` on the whole className.
- **Fix:** `.split(/\s+/).includes(token)`
- **Not verified:** this needs Babel, which isn't in the sandbox.

**11. read-logic-statics.mjs `ASSET_PATH` l.13: commas are not handled**
- **Input:** `'assets/a.png,assets/b.png'`, and `srcset="assets/a.png 1x,assets/b.png 2x"`
- **Expected:** `[assets/a.png, assets/b.png]` for both.
- **Actual:** the first gives one bogus joined path. The second drops `b.png`.
- **Fix:** add `,` to both character classes.
- **Test:** `prover-11-1/t.mjs`. Fix verified.

**12. read-logic.mjs `topOperator` l.65: chained comparisons are grouped right to left**
- **Input:** `'a' === 'a' === true`
- **Expected:** `true`, as in JS.
- **Actual:** `false`.
- **Fix:** return the last top-level operator instead of the first, and step past the matched operator.
- **Test:** `prover-12-1/t.mjs`. Fix verified.

**13. references.mjs `referenceOf` l.61: `null` is not treated as an empty ref**
- **Input:** `{name:'sgs/modal', attributes:{contentRef:null}}`
- **Expected:** `null` (no reference).
- **Actual:** a frame reference with value `null`, which lint then reports as "prints contentRef null".
- **Fix:** add `null === value` (and `'0' === value`) to the empty check.
- **Test:** `prover-14-1/t.mjs`. Fix verified.

**14. site-build-labels.mjs `routeOf` l.25–26: query strings, fragments, whitespace and protocol-relative hrefs**
- **Input:** `'#/contact?x=1'` and `'/about#team'`
  - Expected: routes `contact` and `about`.
  - Actual: no route, so the labels are dropped.
- **Input:** `' /x'`
  - Expected: route `x`.
  - Actual: route `' /x'`.
- **Input:** `'//cdn.example.com/docs'`
  - Expected: no route (it is an external link).
  - Actual: route `/cdn.example.com/docs`.
- **Fixes:** use `/^#?\/?([^?#]*)(?:[?#].*)?$/` on the trimmed href. Reject hrefs that start with `//`, and strip all leading slashes.
- **Tests:** `prover-15-1/t0.mjs`, `prover-20-1/t.mjs`. Fixes verified.

**15. resolve-declared.mjs `clean` l.13: `!important` survives trailing whitespace**
- **Input:** `declaredTiers({d:'2rem !important '}, …)`
- **Expected:** `2rem`.
- **Actual:** `2rem !important`.
- **Fix:** trim before the anchored replace.
- **Test:** `prover-19-1/t.mjs`. Fix verified.

**16. 30-raw-box-control.js `runFile` l.209: the baseline key is the line number** (confirmed by reading)
- **Input:** a baselined finding, then a new line added above it.
- **Expected:** the finding stays baselined.
- **Actual:** its key changes, so it comes back as a new finding.
- **Fix:** use `keyParts: ['raw-box-control', bound || String(line)]`. Existing baseline entries would need re-keying.
- **Not verified:** this fix wasn't tested.

## Low

**17. 35-pinned-panel-position.js l.95/107: the message makes a false claim about the panel's group**
- **Input:** `<InspectorControls group="styles">` containing an "Advanced" panel.
- **Expected:** the finding text does not claim the panel is in the default group.
- **Actual:** it says the panel is "inside the default Settings group".
- **Fix:** reword the message, or work out the panel's group and skip or reword the finding.
- **Test:** `prover-9-1/t.js`.

## Rejected
None.

## Not checked
The readers and reviewers rated 35 suspicions at 2, so none went to a prover. They include:
- **30:** a computed `attributes[k]` binding.
- **33:** template-literal classNames.
- **35:** `_x()` titles, and duplicate keys for two "Advanced" panels.
- **36:** same-line dedup, `<Foo.ResponsiveBoxControl>`, and `presets={[]}`.
- **38:** reads exemptions, a base whose own name ends in Tablet/Mobile, attrs with no type, a `null` mediaElements entry, numeric prefixes, duplicate mismatches, and the fallback to type string.
- **read-assets:** JPEG SOF at the end of the buffer, lowercase `viewbox`, `URL(`, commas in srcset, a non-string placeholder crash, and single-play GIFs.
- **read-logic-statics:** `<b>` values treated as placeholders, a snapshot throw outside the try block, and the 300-character truncation.
- **read-logic:** backslash escapes, and prototype names in scope.
- **read-readme:** a `C#` heading, and duplicate synonym matches.
- **references:** a template-part with no slug, the IsLinked check, and `core/block` postIds.
- **resolve-declared:** exponent notation, and uppercase units.
- **site-build-labels:** a `__proto__` route, and ambiguous labels that are never reported.

Several of these were reproduced in node by their own agents, but no second agent proved them.
