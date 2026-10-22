# Bug report: small-giants-wp cloning-pipeline tooling

**Commit:** 7a11d155cda66c7436a5269c3bb8e529f8e79c9f

**Scope:** the 119 files you listed (19,515 lines), split into 15 slices.

## Summary

All 20 candidates (suspicions rated 3 or higher) were confirmed and none were rejected:

- **15 were demonstrated** with a failing test.
- **5 were confirmed by reading only.** Many modules import `@babel/parser`, which is not installed in the sandbox, so those tests could not run.

Several provers got around the missing package by stubbing `@babel/parser`. That only works for functions that never call the parser, so each of those tests ran without it.

The tests and the fixed copies are under `/tmp/hunt/prover-N/` in the sandbox. The repository itself was not modified.

Severity rules:
- **High:** ordinary input gives a wrong result with no error, or loses data.
- **Medium:** a crash on ordinary input, or a wrong result only on unusual input.
- **Low:** everything else.

## Confirmed bugs, worst first

### High

**1. A hero CTA's stored button style is silently dropped**
- **Where:** `scripts/lib/oldshape-mappings.js`, the `sgs/hero` builder (~L240).
- **Input:** `<!-- wp:sgs/hero {"headline":"H","ctaPrimaryText":"Go","ctaPrimaryStyle":"outline"} /-->`
- **Expected:** the new button has `inheritStyle:'outline'`.
- **Actual:** the button comes out as `'primary'`. `ctaPrimaryStyle` and `ctaSecondaryStyle` are listed as consumed, but they are never used and never tokenised, so `verify()` can't notice the loss either.
- **Test:** `/tmp/hunt/prover-20/t.js`
- **Fix:** pass `tok(tokens,'hero.ctaPrimary.style',attrs.ctaPrimaryStyle) || 'primary'` as the preset, and do the same for secondary. Verified.

**2. A self-closing hero with `splitImage` skips the InnerBlocks rebuild**
- **Where:** `oldshape-mappings.js`, `buildPlan` (~L397).
- **Input:** `<!-- wp:sgs/hero {"headline":"Hi","splitImage":{"url":"u"}} /-->`
- **Expected:** a rebuild entry with a heading child, or an error.
- **Actual:** only a `rename` entry is produced, with `children:null` and `errors:[]`. The headline stays a scalar attribute.
- **Test:** `/tmp/hunt/prover-13/t.js`
- **Fix:** when the rename/decompose branch is taken, also run the builder if the block qualifies for a rebuild, then merge the two sets of new attributes. Verified.

**3. The `id:0` default from `decompose` is still demanded as a content token**
- **Where:** `oldshape-mappings.js`, `buildPlan` (L418).
- **Input:** `{"splitImage":{"url":"u"}}`
- **Expected:** only the url becomes a token.
- **Actual:** `{source:'sgs/hero.splitImage.id', value:0}` is pushed as well. This goes against the code's own comment.
- **Test:** `/tmp/hunt/prover-4/t.js`
- **Fix:** skip `tok` when the field is an id and the value is 0. Verified.

**4. `cssDecls` invents properties from declarations that have no colon**
- **Where:** `lib/intake-census-logic.mjs`, `cssDecls` (L64).
- **Input:** `'color: red; transitions'`
- **Expected:** `[["color","red"]]`
- **Actual:** a `["transition","transitions"]` pair is added, and it is then counted as motion. `indexOf(':')` returns -1, so `slice(0,-1)` keeps the text minus its last character.
- **Test:** `/tmp/hunt/prover-2/test.mjs`
- **Fix:** add `.filter(d => d.includes(':'))` before mapping. Verified.

**5. The camelCase-attribute encoder rewrites text content too**
- **Where:** `data/runtimes/c60c49083997.support.js`, `encodeCamelAttrs` (L365).
- **Input:** `<p>set myVar = 3</p>`
- **Expected:** unchanged.
- **Actual:** `<p>set sc-camel-my-var = 3</p>`. The decode step only restores attribute names, so the mangled text stays.
- **Test:** `/tmp/hunt/prover-7/test.js`
- **Fix:** only match inside a tag, using the lookbehind `(?<=<[^<>]*)`. Verified, but the fix is approximate if a quoted attribute value contains `>`.

### Medium

**6. `matchSelector` splits inside `[...]` and `(...)`**
- **Where:** `lib/intake-inventory-css.mjs` (L169).
- **Input:** `[class~="a"]`, `[data-x="p q"]` and `:nth-child(2n+1)`
- **Expected:** these match their elements.
- **Actual:** they match nothing.
- **Test:** `/tmp/hunt/prover-5/t.mjs`
- **Fix:** protect combinator characters inside brackets and parentheses before splitting. Verified.

**7. The universal selector `*` matches nothing**
- **Where:** `intake-inventory-css.mjs`, `compound` (L158).
- **Input:** `*` or `*::before`
- **Actual:** no branch handles `m[7]`, so no test is added and `compound` returns null.
- **Test:** `/tmp/hunt/prover-17/t.mjs`
- **Fix:** add `else if (m[7]) tests.push(() => true)`. Verified.

**8. A choice-flow kind written with capitals is never normalised**
- **Where:** `lib/intake-pagemap-surfaces.mjs`, `crossCheck` (L298).
- **Input:** a hint with kind `'Choice Flow'` or `'Quiz'`.
- **Expected:** it is normalised to `'choice-flow'` and matched.
- **Actual:** two false surfaces-disagree gaps and a duplicate surface. The code compares the kind before lowercasing it.
- **Test:** `/tmp/hunt/prover-18/t.mjs`
- **Fix:** lowercase before the `includes` check. Verified.

**9. Opening hours like `9-5pm` are parsed as 21:00–17:00**
- **Where:** `lib/intake-siteinfo-shape.mjs`, `parseHoursText`/`toMin` (~L142).
- **Input:** `parseHoursText('Mon-Fri 9-5pm')`
- **Expected:** `[[540,1020]]`, i.e. 09:00–17:00.
- **Actual:** `[[1260,1020]]`, and `validate` refuses it as a range that doesn't run forwards.
- **Test:** `/tmp/hunt/prover-19/t.mjs`
- **Fix:** if the start has no am/pm marker and the range would run backwards, subtract 720 from the start. Verified.

**10. `split-cache` lets an undated paint file beat a dated one**
- **Where:** `split-cache.mjs`, `placeMirrorPaint` (L54).
- **Input:** a mirror paint file with no `measured` field, and a test-site paint file that is dated.
- **Expected:** the undated mirror file is dropped.
- **Actual:** the mirror file overwrites the newer test-site file. `String(undefined)` is `'undefined'`, which sorts after any ISO date.
- **Test:** `/tmp/hunt/prover-12/test.mjs`
- **Fix:** compare `String(x.measured ?? '')`. Verified.

**11. `assertSecondUnit` reports a refused first add as a lost line**
- **Where:** `parity/flows/lib/bag.mjs` (~L172–298).
- **Input:** the first add returns HTTP 429.
- **Expected:** signal `add-rejected (HTTP 429)`.
- **Actual:** signal `bag-lost-line`.
- **Test:** `/tmp/hunt/prover-6/t.mjs`
- **Fix:** run `rejectedAdd(first)` first, the way `assertTwoProducts` already does. Verified.

**12. `trace-check` matches unanchored events to any record with no template id**
- **Where:** `trace-check.mjs` (L72/366).
- **Input:** an event whose `near` is null.
- **Expected:** it matches no record.
- **Actual:** the key contains the string `'null'`, which matches any record whose `template_tpl_id` is null.
- **Test:** `/tmp/hunt/prover-14/t.mjs`, which uses a verbatim copy of the matching code.
- **Fix:** build the key with `${c.near || '-'}`. Verified.

**13. Numeric object keys never resolve**
- **Where:** `lib/intake-ast-eval.mjs`, `propRefs` (L152).
- **Input:** `const o={0:'z'}; o[0]`
- **Expected:** `["z"]`
- **Actual:** `[]`. The key is the number 0 and the name is the string `'0'`, and they are compared with `===`.
- **Test:** `/tmp/hunt/prover-8/t.mjs`
- **Fix:** compare `String(keyName(x)) === name`. Verified.

**14. A later spread does not override an earlier property**
- **Where:** `intake-ast-eval.mjs`, `propRefs` (L152).
- **Input:** `{a:'x',...{a:'y'}}.a`
- **Expected:** `'y'`
- **Actual:** `'x'`
- **Test:** `/tmp/hunt/prover-9/t.test.mjs`
- **Fix:** scan the properties from last to first. Verified.

**15. Array indexing uses a flattened element list** (confirmed by reading)
- **Where:** `intake-ast-eval.mjs`, `propRefs` (~L167–178).
- **Input:** `const a=[c?'p':'q','r']; a[1]`
- **Expected:** `'r'`
- **Actual:** `'q'`. Holes, spreads, conditionals and tracked writes all shift the indexes.
- **Fix:** index `node.elements[i]` directly when no spread comes before it. Written but not run.

**16. A function under a computed key binds arguments from every plain call** (confirmed by reading)
- **Where:** `lib/intake-ast.mjs`, `fnBinding`/`callsOf` (L238/250).
- **Input:** `{[k]: x => ...}` alongside an unrelated `foo('hello')` call.
- **Actual:** `x` resolves to `'hello'`. The member name is null, and `propName(callee) === null` is true for every plain call.
- **Fix:** require `binding.member != null` in that branch.

**17. `readBinding` throws on a value holding two bindings** (confirmed by reading)
- **Where:** `intake-ast.mjs`, `readBinding` (L341).
- **Input:** `'{{ a }} {{ b }}'`
- **Actual:** it calls `parseExpression('a }} {{ b')`, which throws.
- **Fix:** also return plain text when `value.indexOf('{{', 2) >= 0`.

**18. Loose `==`/`!=` is modelled as string equality** (confirmed by reading)
- **Where:** `lib/intake-defects-static.mjs`, `constValue` (L44).
- **Input:** `null=='null'` and `0==false`
- **Actual:** the first is treated as true and the second as false, which is the opposite of JS in both cases. Live code gets reported as dead, and dead code is missed.
- **Fix:** use real `a == b`.

**19. Inner redeclarations don't hide an outer constant** (confirmed by reading)
- **Where:** `intake-defects-static.mjs`, `deadIn` (~L58–77).
- **Input:** `const off=true; { let off=...; if(off) return; this.live(); }`
- **Actual:** `this.live()` is reported as dead code.
- **Fix:** delete each declared name from the scope before re-adding literal consts. The claim's exact input does not trigger it; the variant above does.

### Low

**20. A bare `on` attribute crashes `collectProps`**
- **Where:** `c60c49083997.support.js`, `collectProps` (L438).
- **Input:** `<div on="1">`
- **Actual:** `TypeError` on `key[2].toUpperCase()`.
- **Test:** `/tmp/hunt/prover-1/test.mjs`
- **Fix:** check `key.length > 2 && key.startsWith("on")`. Verified.
- The second half of the original claim, that `<details open>` breaks, was wrong.

## Coverage gaps

- **Six readers failed:** slices 3, 5, 7, 8, 9 and 10. I wasn't told why. Their reviewers still read those slices in full.
  - Slice 3: the fill-handover through fixture-refs files.
  - Slice 5: intake-census-* and intake-defects-binding.
  - Slice 7: intake-pagemap through intake-record.
  - Slice 8: intake-registry through intake-run-worker.
  - Slice 9: intake-siteinfo* through intake-state.
  - Slice 10: motion-* through read-surfaces.
- **One reviewer failed:** slice 14 (state-map.mjs through the parity flow files, including oldshape-mappings.js). Its reader did finish.
- Those seven slices therefore got one pass instead of two.
- Only 50 of the 100 allowed agents were used, and no candidates were cut.

## Rejected
None.

## Not checked (rated 2 out of 5, below the threshold)
These 55 low-confidence suspicions were not sent to a prover. They are unverified, so treat them as leads only. Examples:

- `intake-pool.mjs:82`: a NaN pool size crashes.
- `intake-run-collapse.mjs:43/47/125`: the single-row check, a key collision, and border styles of none counted as painted.
- `intake-run-finalise.mjs:128`: the missing-feature count gets inflated.
- `intake-siteinfo.mjs:40`: `decodeURIComponent` throws on a malformed `%`.
- `motion-set.mjs:22`: a negative SMIL begin offset is rejected.
- `state-vocab.mjs:10`: the cache ignores the `db` argument.
- `trial.mjs:127`: rejected writes are matched across rounds.
- `skeleton-finalise.mjs:53/82`: a crash, and a NaN confidence.
- `intake-prose.mjs:288`: fence length is not checked.
- `intake-pagemap.mjs:225`: the slug suffix is wrong when the base is empty.
- `chrome-compare.mjs:77/151`
- `run-all.mjs:164`: an ERROR is shown as fail.
- `toast-added-to-bag.mjs:236`
- `bag.mjs:222`
- `trace-check.mjs:319`

