# T3 — CSS-effect assertion layer for the colour codemod

**Date:** 2026-09-03
**Scope:** `plugins/sgs-blocks/scripts/qa/` only. No edits to `scripts/colour-codemod/` (owned by a concurrent agent) or `scripts/toolindex/`. No git write commands run. No deploy performed.

## 1. Premise verification

Claim to verify: all 15 self-test assertions in `fix.js` (`function check(...)` calls, found via `grep -n "check( '"`) test edit-correctness only, never "does the resulting PHP emit the correct CSS".

**Confirmed. Read all 15 assertion bodies in full (lines 1379–2098 of `fix.js`).** Every one of them either:

- inspects the **shape of the plan** returned by `planRow()` (`plan.fixable`, `plan.reason`, `plan.hoverAttr`, `plan.kind`, `plan.gradientPlan.mode`), or
- inspects **whether/how a file byte-changed** (`before === after` for refusal controls, `countLiteralStatesElements()`, regex counts of `key: 'hover'` / `:hover` occurrences, `babelParser.parse()` re-parsing to prove no corruption), or
- checks for a **specific substring's presence/absence** in the post-edit text (e.g. `editSrc.includes('borderColourHoverGradient')`, `php.includes(':hover')`, `phpAfter.includes('sgs_background_paint_decl(...)')`).

The closest any assertion comes to a CSS-effect check is `'gradient round-trip control: fill-direct fix lands all three legs'` (line 451). Its own inline comment says exactly what it does NOT do:

> "Verify the render leg with a DIRECT check on the actual paint call — not `wireOnlyGradientCheck()`, which only tests for the attribute name appearing ANYWHERE in the file ... reusing it here would make this control trivially always pass."

Even this "direct check" (`paintsGradient()`, line 491) is `php.includes('sgs_background_paint_decl( $panel_bg, $panel_bg_gradient )')` — a **substring match on the render.php source text**, not an execution of that PHP or an inspection of the CSS it produces. It proves the right function is *called with the right variable names*; it does not prove that function, given real attribute values, emits a rule with the right selector, property, and value on the right element. That is exactly the gap all three 2026-09-03 defects fell through: card-grid's bug was a *correct-looking* `sgs_emit_state_colour_css()` call, textually present, just aimed at the wrong array/selector; pricing-table's bug was a *correct-looking* call, textually present, just inside the wrong `if` block.

**Verdict: the original claim stands as written, with no correction needed.**

## 2. What's achievable without a deploy (and what genuinely needs one)

**Achievable, and built:** running each block's real `render.php` standalone under plain CLI PHP, with only WordPress *core* functions/classes stubbed (never SGS logic — `sgs_colour_value()`, `sgs_emit_state_colour_css()`, `sgs_background_paint_decl()`, `sgs_css_gradient_value()`, `SGS_Container_Wrapper::render()` etc. are the real files, `require_once`'d exactly as render.php does it), then reading the actual `<style>` CSS the real code emitted. This is the same technique already established in the repo — `plugins/sgs-blocks/tests/php/run-container-wrapper-standalone.php` + `tests/php/stubs/wp-functions.php` already do this for `SGS_Container_Wrapper` alone. This task extends the same idiom to whole `render.php` files, generically, for any block on its manual/default `source` path.

This catches **2 of the 3 real defect classes outright** (proven in §4): a shared-array selector mix-up (card-grid) and a wrong-gate/wrong-block insertion (pricing-table) both change the CSS text a real render produces, which this harness reads directly. The gradient-gate defect (form/modal) is also caught this way — no deploy needed for any of the three, contrary to my working assumption going in.

**Honestly out of scope for this harness (would still need a deploy or a browser):**
- **Real repaint under a pointer.** This harness proves the CSS *rule* exists with the right selector/property/value; it does not fire a `:hover` and read `getComputedStyle()` on a live element. That gap is already covered by `check-colour-editor-roundtrip.js`'s Playwright layer — genuinely complementary, not overlapping.
- **`query` / `wc-product` / `cpt-collection` source-mode branches.** These call `WP_Query`, `render_block()`, WooCommerce/CPT collection classes. The harness stubs these thinly (empty results) specifically so a caller who forgets to set `source` gets an empty-but-not-crashing render rather than a fatal — but a real assertion against those branches would need either the full WP test suite or a live/staging site. Documented as an explicit non-goal in both the harness header and `wp-stubs.php`'s own doc-comment, not a silent gap.
- **theme.json / `wp_global_styles` cascade interaction** (e.g. whether a `var(--wp--preset--color--accent)` token resolves to the *client's* actual accent, not the framework default) — this harness never loads a real WordPress option store, so a value like `var(--wp--preset--color--accent)` is asserted as literal text, not resolved. `check-colour-editor-roundtrip.js`'s live-canary layer is required for that.

## 3. What was built

```
plugins/sgs-blocks/scripts/qa/
├── lib/
│   ├── wp-stubs.php              WordPress CORE function/class stubs only
│   │                              (absint, esc_attr, wp_style_engine_get_styles,
│   │                              get_block_wrapper_attributes, wp_interactivity_state,
│   │                              rest_url, etc.) — never SGS colour/CSS logic
│   └── render-css-harness.php    CLI: `php render-css-harness.php --slug sgs/<block>
│                                  --attrs '<json>' [--render-file <path>]`
│                                  Runs render.php standalone, captures output,
│                                  extracts every <style>…</style> block's inner CSS,
│                                  prints one JSON line: {ok, html, css} or
│                                  {ok:false, error}.
├── assert-css-effect.js          Node CLI + library (`assertCssEffect()` exported):
│                                  given {slug, attrs, expect:[{selectorContains,
│                                  property, value?, mustNotExist?}]}, shells to the
│                                  PHP harness, parses the returned CSS with postcss
│                                  (already a dependency of plugins/sgs-blocks),
│                                  and reports PASS/FAIL per expectation.
│                                  --self-test runs the load-bearing proof (§4).
└── fixtures/broken/
    ├── card-grid-render.php      Hand-reconstructed pre-fix defect 1
    ├── form-render.php           Hand-reconstructed pre-fix defect 2a
    ├── modal-render.php          Hand-reconstructed pre-fix defect 2b
    └── pricing-table-render.php  Hand-reconstructed pre-fix defect 3
```

### Run commands

```bash
# Single assertion against a real in-tree block:
node plugins/sgs-blocks/scripts/qa/assert-css-effect.js \
  --slug sgs/card-grid \
  --attrs '{"items":[{"title":"A"}],"titleColourHover":"#ff0000"}' \
  --expect '[{"selectorContains":".sgs-card-grid__title:hover","property":"color","value":"#ff0000"}]'

# Against a codemod's PROPOSED (not-yet-written) edit:
node plugins/sgs-blocks/scripts/qa/assert-css-effect.js \
  --slug sgs/card-grid --render-file /tmp/proposed-render.php \
  --attrs '{...}' --expect '[{...}]'

# The load-bearing proof (all six defect reconstructions + 4 negative controls):
node plugins/sgs-blocks/scripts/qa/assert-css-effect.js --self-test
```

Verified live: `php -v` → PHP 8.5.5 (cli) on this machine; `postcss` 8.5.26 already present in `plugins/sgs-blocks/node_modules`.

### A note on why `fixtures/broken/*.php` are hand-reconstructed, not `git show 2ad141986^`

I initially tried extracting the pre-commit state via `git show 2ad141986^:plugins/sgs-blocks/src/blocks/card-grid/render.php`. That file has **no `titleColourHover`/`subtitleColourHover` handling at all** — the feature (block.json attrs + edit.js UI + render.php CSS) was added, broken, and fixed within the same uncommitted working session (the commit's diff only shows the SECOND, corrective patch — the block.json/edit.js diffs in that commit add the attributes for the first time). No git revision holds the genuinely-broken intermediate state; it never reached `git add`. I therefore hand-reconstructed each broken fixture by taking the CURRENT (fixed) `render.php` and inverting exactly the lines shown as added in `git show 2ad141986`'s diff — the same "diff tells you the precise defect shape" technique `fix.js`'s own self-test fixtures use (e.g. its `FIXTURE_RENDER_PHP_GRADIENT` reproducing "the exact shape found live in sgs/quote's borderColour row"). This is disclosed here rather than silently substituted.

### Directory-junction trick (why fixtures render standalone at all)

Every SGS `render.php` resolves its `require_once`s via `dirname(__DIR__,3).'/includes/...'` — a path computed from the file's OWN location, 3 levels above `src/blocks/<name>/`. A broken fixture living under `scripts/qa/fixtures/broken/` is at the wrong depth for that math. Rather than writing the fixture into the real `src/blocks/` tree (outside this task's write scope) or hand-patching every `require_once` (risks changing what's under test), `assert-css-effect.js`'s `materialiseFixture()` builds an OS temp directory shaped as `<tmp>/src/blocks/<name>/render.php`, with a directory **junction** `<tmp>/includes -> plugins/sgs-blocks/includes` (Node `fs.symlinkSync(..., 'junction')`, no admin rights needed on Windows). The fixture's `require_once` calls then resolve to the real, unmodified helper files exactly as they would in the real tree. Nothing is written outside the OS temp directory and `scripts/qa/`.

## 4. Load-bearing proof — `--self-test` output (verbatim, this run)

```
  PASS  negative-control landing check: card-grid-render.php broken fixture actually differs from the real fixed file
  PASS  negative-control landing check: form-render.php broken fixture actually differs from the real fixed file
  PASS  negative-control landing check: modal-render.php broken fixture actually differs from the real fixed file
  PASS  negative-control landing check: pricing-table-render.php broken fixture actually differs from the real fixed file
  PASS  defect 1 (card-grid title/subtitle hover) — FAILS on the broken fixture
  PASS  defect 1 (card-grid title/subtitle hover) — PASSES on the current in-tree (fixed) file
  PASS  defect 2a (form gradient-only submit background) — FAILS on the broken fixture
  PASS  defect 2a (form gradient-only submit background) — PASSES on the current in-tree (fixed) file
  PASS  defect 2b (modal gradient-only trigger background) — FAILS on the broken fixture
  PASS  defect 2b (modal gradient-only trigger background) — PASSES on the current in-tree (fixed) file
  PASS  defect 3 (pricing-table priceColourHover independent of toggle label) — FAILS on the broken fixture
  PASS  defect 3 (pricing-table priceColourHover independent of toggle label) — PASSES on the current in-tree (fixed) file

ALL SELF-TESTS PASSED
```

The 4 "negative-control landing check" lines are the mandatory proof that each broken fixture genuinely diverges from the real fixed file (not vacuously identical to it) — added after this same self-test caught its own bug: the first version of the card-grid landing-check marker (`".sgs-card-grid__title"`) was too loose and matched an unrelated, still-present typography rule, producing a false FAIL. Tightened to the exact `sgs_emit_state_colour_css(...)` call signature; re-run above is clean.

The six defect-reconstruction lines are the six results the task asked for, in the requested fail-before/pass-after shape:

| Defect | Attributes | Expected CSS | Broken fixture | Fixed (in-tree) file |
|---|---|---|---|---|
| 1. card-grid title/subtitle hover | `titleColourHover:#ff0000`, `subtitleColourHover:#00ff00` | `.sgs-card-grid__title:hover{color:#ff0000}` AND `.sgs-card-grid__subtitle:hover{color:#00ff00}` | **FAIL** (no such selectors emitted; both values land on `.sgs-card-grid__item:hover` instead) | **PASS** |
| 2a. form gradient-only | `submitBackgroundGradient` set, no flat colour | `.sgs-form__button--submit{background-image:linear-gradient(...)}` | **FAIL** (gate required the flat var; zero CSS emitted) | **PASS** |
| 2b. modal gradient-only | `triggerBackgroundGradient` set, no flat colour | `.sgs-modal__trigger{background-image:linear-gradient(...)}` | **FAIL** (same gate defect) | **PASS** |
| 3. pricing-table priceColourHover | `priceColourHover` set, `toggleLabelHoverColour` UNSET | `.sgs-pricing-table__price:hover{color:#123456}` | **FAIL** (mis-inserted inside the toggle-label block, gated on an unrelated attribute) | **PASS** |

**Negative-control discipline applied per the repo's own rule** ("confirm the break you introduced actually landed, or 'it failed' proves nothing"): the 4 landing checks above prove the FAIL results are not vacuous — the broken fixtures genuinely differ from the fixed file at the exact defect location, not by accident or a stale copy.

Also verified: `NOT RUN` discipline (never fabricate a PASS). `node assert-css-effect.js --slug sgs/does-not-exist --attrs '{}' --expect '[...]'` → `NOT RUN — render.php not found: ...`, exit code 1 (not folded into a pass).

## 5. `fix.js` integration specification

**Signature to call** (no edit made to `fix.js` — this is a spec for the owning agent):

```js
// In fix.js, after applyPlan(plan, true) succeeds (i.e. result.ok === true),
// before returning success to the caller / before the file is considered
// "fixed":
const { assertCssEffect } = require( '../qa/assert-css-effect.js' );

const effectResult = assertCssEffect( {
	slug: slug,                          // e.g. 'sgs/card-grid' — already known to fix.js
	renderFile: plan.renderFile,         // the JUST-WRITTEN render.php path — or,
	                                      // to check BEFORE writing to disk, write the
	                                      // proposed content to a temp file first and
	                                      // pass that path instead (renderFile accepts
	                                      // any path; slug is only used for the
	                                      // fallback resolution when renderFile is
	                                      // omitted)
	attrs: {
		// Minimal attribute set that exercises the row just fixed. fix.js
		// already knows the attribute NAME (plan.hoverAttr / plan.baseIdent) —
		// it does not know a *sample value*, so the caller must supply one
		// (any non-empty string works, e.g. '#ff0000' for a colour, a real
		// gradient string like 'linear-gradient(#fff,#000)' for a gradient row).
		[ plan.hoverAttr || plan.baseIdent ]: '#ff0000',
	},
	expect: [
		{
			// The selector fragment the row's OWN block.json-declared element
			// should carry. fix.js already resolves this via
			// resolveDirectSelector() (see check 'resolveDirectSelector finds
			// the fixture selector+property' in its own self-test, line 1390) —
			// the same selectorTemplate value (with the literal '{$uid}' prefix
			// stripped) is the value to pass here.
			selectorContains: selectorFragmentFromResolveDirectSelector,
			property: propTextFromResolveDirectSelector, // e.g. 'color'
			value: '#ff0000', // must match the sample value supplied above
		},
	],
} );

if ( effectResult.notRun ) {
	// Treat exactly like any other NOT RUN in this codebase: never a pass,
	// never silently skipped. Surface effectResult.harnessReason to the
	// operator and stop — do not report the row as fixed.
	console.log( '  CSS-EFFECT NOT RUN: ' + effectResult.harnessReason );
} else if ( ! effectResult.ok ) {
	// The edit was structurally valid (fix.js's own checks passed) but the
	// resulting PHP does not emit the CSS it should — exactly the defect
	// class this tool exists to catch BEFORE a live deploy is needed to find
	// it. Fail the row here; do not let --apply report success.
	console.log( '  CSS-EFFECT FAILED: ' + JSON.stringify( effectResult.results.filter( r => !r.pass ) ) );
}
```

**Why this shape:** `assertCssEffect()` is exported as a plain function from `assert-css-effect.js` (`module.exports = { assertCssEffect, runHarness, parseRules }`), so it can be `require()`'d directly — no subprocess-of-a-subprocess needed for the in-process case (the CLI wrapper shells to `php` itself; `fix.js` calling the exported function pays that one PHP-process cost per row, the same order of cost `php -l` already pays per row in the existing pipeline).

**What this does NOT change about fix.js's existing contract:** it adds a fourth gate, run strictly after `applyPlan()` reports `ok:true`. It never replaces the 15 edit-correctness checks — those still catch corruption, non-idempotence, and stripped-sibling defects that a CSS-effect check does not look at (e.g. a corrupted `edit.js` AST would still be caught by `babelParser.parse()` in fix.js's own checks, not by this tool, which only reads `render.php` output).

## Files touched

- `plugins/sgs-blocks/scripts/qa/lib/wp-stubs.php` (new)
- `plugins/sgs-blocks/scripts/qa/lib/render-css-harness.php` (new)
- `plugins/sgs-blocks/scripts/qa/assert-css-effect.js` (new)
- `plugins/sgs-blocks/scripts/qa/fixtures/broken/card-grid-render.php` (new)
- `plugins/sgs-blocks/scripts/qa/fixtures/broken/form-render.php` (new)
- `plugins/sgs-blocks/scripts/qa/fixtures/broken/modal-render.php` (new)
- `plugins/sgs-blocks/scripts/qa/fixtures/broken/pricing-table-render.php` (new)
- `.claude/reports/2026-09-03-T3-effect-assertions.md` (this report)

No files outside `plugins/sgs-blocks/scripts/qa/` and this report were written. No git commands run.
