# T5 — Static hover-guard build transform + checker

**Scope:** `plugins/sgs-blocks/scripts/hover-guard/` only. No edits to `package.json`, no block
`style.css`/`render.php`/`block.json`/`src/`, no `includes/helpers-hover-state.php`. No git
commands run. No deploy. No shared-database writes.

## 1. Baseline (measured, not assumed)

Method: copied every `src/blocks/*/style.css` containing `:hover` into
`scripts/hover-guard/test-fixtures/pre-transform-baseline/blocks/` (mirrors the `build/blocks/*/style.css`
shape the real transform runs against, since `build/` doesn't exist in this working tree and the
brief says not to run `npm run build`), then ran the checker's pure audit against it.

```
node scripts/hover-guard/check.js scripts/hover-guard/test-fixtures/pre-transform-baseline/blocks
```

**40 block `style.css` files contain `:hover`** (Bean's brief said 25 — my count is higher because
I include every file with any `:hover` occurrence, not just motion-only ones, as the scan surface).

Of the 210 total `:hover` selector-list members found:
- **104 unguarded-motion** members (my primary number — see methodology note below)
- **86 colour-family** members (deliberately out of scope, untouched)
- **4 unclassified-declarations** (genuine edge cases, see §6)
- **1 ambiguous-selector** (a `:where(A:hover, A:focus-visible)` grouping, see §6)
- **0 already guarded**

Per-block unguarded-motion breakdown (top 10 of 26 affected blocks):

| Block | Count | Block | Count |
|---|---|---|---|
| gallery | 14 | testimonial-slider | 5 |
| info-box | 10 | process-steps | 5 |
| card-grid | 10 | post-grid | 5 |
| team-member | 7 | cta-section | 5 |
| testimonial | 6 | product-search | 3 |
| brand-strip | 6 | | |

**Why my 104 differs from the brief's hypothesis of 78 across 25 blocks (both are legitimate
counts of different things, not a disagreement about the underlying CSS):**
1. I count **selector-list members**, not rules — a rule like `.a:hover, .b:hover, .c:hover:hover
   { transform: none }` (card-grid's reduced-motion neutraliser, line 384-388) is 4 members, 1 rule.
2. I count the `@media (prefers-reduced-motion: reduce)` **reset** rules too (e.g. gallery's
   `.sgs-gallery__item:hover { transform: none; }` at line 684) — these are also motion-only
   `:hover` rules by the mechanical classification rule the brief gave me, and guarding them is
   harmless (a reduced-motion user gets `transform: none` either way; the guard just means a touch
   tap doesn't leave anything stuck, which for `none` is moot, but treating them identically to
   every other motion hover rule is the universal, no-carve-out behaviour this project's culture
   expects, not a judgement call I should be making per-rule).
3. `brand-strip` appearing in my list at all may be new information — worth a human glance.

I did **not** try to reverse-engineer which counting convention produced 78, so I'm reporting the
discrepancy rather than papering over it, per this task's own instruction.

## 2. What was built

### `transform.js` — the build-time transform
Runs over `build/blocks/*/style.css` (or any directory passed as an argument). For every rule
containing `:hover`:
1. Splits the comma-separated selector list into hover / focus (`:focus-visible`,
   `:focus-within`, `:focus`) / other / **ambiguous** members using `selector-split.js`
   (`postcss-selector-parser`-based, walks into `:where()`/`:is()`/`:not()` arguments too — this
   is what caught the one real ambiguous case in §6).
2. A member combining `:hover` and a focus pseudo in the same compound chain is **ambiguous** —
   reported, rule left untouched.
3. Classifies the rule's declarations via `classify.js`: `motion` / `colour` / `unknown`.
   - `colour` → rule left completely untouched (deliberately out of scope, see §7).
   - `unknown` → rule left completely untouched, reported as a finding for the checker.
   - `motion` → the fresh (not-already-guarded) hover members are extracted into a **new sibling
     rule**, each prefixed with the exact `:where(:root:not(.sgs-touch-input))` string (byte-identical
     to `SGS_HOVER_NOT_TOUCH` in `helpers-hover-state.php`), and the whole thing is wrapped in
     `@media (hover: hover) and (pointer: fine)` (byte-identical params to `SGS_HOVER_MEDIA`).
     Focus/other/already-guarded members are left in the original rule, untouched, unmoved.
4. **Nesting**: if the rule already lives inside another at-rule (e.g.
   `@media (prefers-reduced-motion: reduce)`), that ancestor chain is cloned (empty shells) and
   the guarded rule is nested inside them, with the hover-media as the outermost wrapper — valid
   per CSS Conditional Rules Level 3 (same rationale `helpers-hover-state.php` already documents
   for nesting `@supports` inside `@media`).
5. **Idempotence**: a hover member whose text already starts with the exact guard prefix is left
   alone entirely — never re-wrapped, never touched.

### `check.js` — the build-failing checker
Two jobs:
- **(a) CSS**: re-audits the same directory (via `audit.js`, sharing `selector-split.js` +
  `classify.js` with the transform so the two can never silently diverge) and fails if any
  unguarded-motion, ambiguous, or unclassified `:hover` rule remains.
- **(b) PHP**: shells out to `php-hover-scan.php`, which tokenizes every `includes/*.php` file
  (except `helpers-hover-state.php`, the definer) with PHP's own `token_get_all()` and, per
  top-level function, fails if that function's body contains a `:hover` string literal but never
  calls `sgs_hover_guarded_rule()`, `sgs_hover_state_rules()`, or `sgs_hover_media_wrap()`
  anywhere in the same body (closures nested via `array_map()` etc. count as part of the
  enclosing function). See that file's own docblock for the **documented limitation**: this is a
  function-body co-occurrence check, not cross-function data-flow tracing — §8 names a real
  pre-existing case it cannot see, for exactly that reason.

Never fabricates a pass: a missing target directory, zero matching files, or a PHP scan that
can't complete all print `NOT RUN` / a reason and exit non-zero (verified in §5's run with no
`build/` directory present — exit 1, explicit "NOT RUN" message, not a silent 0).

### `audit.js` / `selector-split.js` / `classify.js`
Shared pure (non-mutating) building blocks — `audit.js` is the read-only twin of `transform.js`'s
classification logic, used both for baseline measurement and by the checker.

## 3. Exact run commands

```bash
# Transform (writes build/blocks/*/style.css in place)
node plugins/sgs-blocks/scripts/hover-guard/run-transform.js

# Checker (build-failing; scans build/blocks/*/style.css + includes/*.php)
node plugins/sgs-blocks/scripts/hover-guard/check.js
```

Both accept an optional directory argument (used throughout this report to run against the
test-fixture copies instead of the real `build/`, which doesn't exist in this working tree).

## 4. The `package.json` line to add (I did not edit this file — Bean's instruction)

Current `postbuild` script already runs `node scripts/copy-built-styles.js`. Add immediately after
it, in the plugin's `package.json` `scripts.postbuild`:

```
node scripts/hover-guard/run-transform.js && node scripts/hover-guard/check.js
```

`run-transform.js` exits non-zero (without writing anything further) if it finds any
`ambiguous-selector`/`unclassified-declarations` rule, so a broken build fails fast even before
`check.js` runs a second pass; `check.js` is still worth chaining afterwards because it is the
tool that also re-scans the PHP surface (job b), which the transform never touches.

## 5. Verification — verbatim

### 5a. Positive control (transform → checker → 0 unguarded-motion)

Before (baseline, §1):
```
[hover-guard check] CSS: scanned 40 files, 210 hover members total, 0 already guarded, 86 colour (out of scope), 109 findings.
```
(109 = 104 unguarded-motion + 4 unclassified + 1 ambiguous)

After `node scripts/hover-guard/run-transform.js <dir>`:
```
[hover-guard] TOTAL: guarded 120, already-guarded 0, findings 5
```
(120 = individual hover **members** newly guarded — see §1's counting-convention note; the 5
findings are the same 4 unclassified + 1 ambiguous from baseline, correctly left untouched)

Re-running `check.js` on the transformed tree:
```
[hover-guard check] CSS: scanned 40 files, 210 hover members total, 120 already guarded, 86 colour (out of scope), 5 findings.
```

**unguarded-motion: 104 → 0.** The remaining 5 findings are the pre-existing edge cases from
§6, unchanged — not new failures introduced by the transform.

### 5b. Negative control, confirmed it landed

Injected a fresh, deliberately unguarded motion rule into an isolated fixture:
```css
.sgs-fake-block__item {
	transition: transform 0.2s ease;
}
.sgs-fake-block__item:hover {
	transform: translateY(-6px);
}
```
Ran the checker against it (before removing it):
```
[hover-guard check] CSS: scanned 1 files, 1 hover members total, 0 already guarded, 0 colour (out of scope), 1 findings.
  [css] ...fake-block\style.css:4 [unguarded-motion] .sgs-fake-block__item:hover
[hover-guard check] FAIL
exit code: 1
```
The checker named the exact injected rule — confirms the break actually existed and was actually
caught, not a coincidental fail. Fixture then deleted.

### 5c. Idempotence

Ran `run-transform.js` a second time over the already-guarded tree, then byte-compared the
directory against a snapshot taken right after the first run:
```
diff -rq build-copy-after-run1 build-copy
diff exit: 0        (zero output — byte-identical)
```
The second run's own log also reported `guarded 0` for every file with `already-guarded` matching
the first run's totals exactly.

### 5d. Anti-vacuity

Wrote a throwaway proof script (`test-fixtures/anti-vacuity-dead-detector.js`, not part of the
shipped tool) that monkey-patches `selector-split.js` to always report zero hover members —
simulating a detector that has silently stopped detecting anything — and ran it against the
**untransformed** (dirty) fixture tree:
```
[anti-vacuity] DEAD detector run over 40 DIRTY (untransformed) files: 0 findings reported.
[anti-vacuity] CONFIRMED: a dead detector silently passes a dirty tree — 0 findings does NOT
by itself mean "clean". Only a non-zero result on this same tree proves the detector is alive.
```
The REAL checker run against the identical dirty tree (§1) reported 109 findings, not 0 — proving
the live detector's non-zero signal on a dirty tree is real, not a fluke of a stubbed-out check.

### 5e. Rendering proof — before/after CSS text

**card-grid, `--hover-lift` variant** (motion-only: `transform` + `box-shadow`).

Before (`src/blocks/card-grid/style.css:192-195`):
```css
.sgs-card-grid--hover-lift .sgs-card-grid__item:hover {
	transform: translateY(-4px);
	box-shadow: var(--wp--preset--shadow--floating);
}
```

After (transformed output, `build-copy/blocks/card-grid/style.css:515-520`):
```css
@media (hover: hover) and (pointer: fine) {
	:where(:root:not(.sgs-touch-input)) .sgs-card-grid--hover-lift .sgs-card-grid__item:hover {
		transform: translateY(-4px);
		box-shadow: var(--wp--preset--shadow--floating);
	}
}
```

**Why this still applies under a mouse:** a mouse-equipped device satisfies
`(hover: hover) and (pointer: fine)` (layer 1 passes), and `<html>` never gains
`.sgs-touch-input` because no `pointerdown` with `pointerType !== 'mouse'` has fired, so
`:root:not(.sgs-touch-input)` matches (layer 2 passes). `:where()` contributes zero specificity,
so `.sgs-card-grid--hover-lift .sgs-card-grid__item:hover` keeps exactly the specificity it had
before (0,2,0-plus-pseudo) — it still beats the resting-state rule by the `:hover` pseudo-class
alone, unchanged. On a touchscreen laptop, a tap sets `.sgs-touch-input` on `<html>` (layer 2's
JS side, already shipped in `motion-utils.js` per the PHP helper's docblock), so the guarded
selector stops matching and the lift never sticks.

**gallery, `sgs-has-hover-scale` reset inside `@media (prefers-reduced-motion: reduce)`**
(demonstrates ancestor-at-rule nesting).

Before (`src/blocks/gallery/style.css:679-693`, inside the existing
`@media (prefers-reduced-motion: reduce) { ... }` block):
```css
.sgs-gallery--hover-lift .sgs-gallery__item:hover {
	transform: none;
}
```

After:
```css
@media (prefers-reduced-motion: reduce) {
	:where(:root:not(.sgs-touch-input)) .sgs-gallery--hover-lift .sgs-gallery__item:hover {
		transform: none;
	}
}
```
Both conditions (`prefers-reduced-motion: reduce` AND the two hover-safety layers) are ANDed by
nesting — a mouse user who also has reduced-motion enabled still gets `transform: none` on hover,
exactly as before; a touch user gets no hover rule to reset in the first place, since the guarded
version never matches them.

## 6. Left untouched by design (unclassified/ambiguous — 5 total)

These are pre-existing edge cases the transform deliberately refuses to auto-guess on, reported by
the checker as build failures until a human makes the call:

1. `business-info/style.css:107` — `.sgs-business-attribution .sgs-business-info__link:hover,
   :focus-visible { background-position: 0 0; opacity: 1; ... }` — `background-position` isn't in
   my motion or colour vocabulary; mixed with `opacity` (motion) I refuse to guess.
2. `buybox/style.css:430`, `notice-banner/style.css:96`, `product-card/style.css:722` — all three
   are `a:hover { text-decoration: none/underline; }` — a real third category (text-decoration
   only), neither motion nor colour per the brief's own definition. These need a human decision on
   whether they belong in this transform's scope at all (a decoration toggle has no "stuck on
   touch" bug the way transform/opacity do — arguably fine unguarded — but I won't decide that
   silently).
3. `google-reviews/style.css:519` — `:where( .sgs-google-reviews__arrow:hover,
   .sgs-google-reviews__arrow:focus-visible )` — hover and focus grouped inside one `:where()`
   argument list rather than as separate comma-top-level selectors. The selector parser correctly
   detects both pseudos on the same compound and refuses to guess which one the author meant to
   gate.

## 7. Deliberately not touched — colour-family hover rules (86 members, out of scope)

Every `:hover` rule carrying a colour-family declaration (`color`, `background`,
`background-color`, `background-image`, any `border-*-color`, `outline-color`, `fill`, `stroke`,
etc.) is left completely untouched by the transform. This matches the brief's own "motion-only"
scope, and matches this framework's existing architecture: colour hovers are already handled by
the PHP-side track (`sgs_hover_state_rules()`, `sgs_emit_state_colour_css()`,
`sgs_border_gradient_css()`) for dynamically-painted colour, and the static `style.css`
colour-hover rules that remain (theme-preset button colours, link underlines, etc.) were out of
this task's stated scope. Guarding them was not requested and I did not do it.

## 8. A gap the PHP checker cannot see (found, not fixed — outside my write scope)

`includes/helpers-tokens.php`'s `sgs_border_gradient_css()`, when called with `$hover_paint ===
null` (the `elseif` branch in `includes/helpers-button-style.php:254-270`), emits its BASE rule
using whatever `$selector` string it was given — and in that one call site, the caller
(`helpers-button-style.php:261-269`) constructs `$selector` as
`"{$part}:hover,{$part}:focus-visible"` before passing it in. `sgs_border_gradient_css()`'s base-rule
emission (`helpers-tokens.php:1227-1228`) never calls a guard function, so the resulting
`.x:hover,.x:focus-visible{border-color:transparent;...}` rule ships **unguarded**. This is a
genuine cross-function data-flow case: the `:hover` string literal lives in
`helpers-button-style.php`, but the actual unguarded CSS emission happens two function calls away
in `helpers-tokens.php`, where no `:hover` literal exists at all — invisible to a function-body
co-occurrence scan (or any single-file static scan short of full taint tracking). I have not
touched either file (out of my write scope for this task) — flagging it here for a human decision.

## 9. Anything else deliberately not touched

- **`@media (prefers-reduced-motion: reduce)` reset rules are guarded identically to their live
  counterparts** (§1, point 2) — not a carve-out, a consequence of the mechanical, per-rule
  classification rule as given. If that's not wanted, it's a one-line change to `classify.js`
  (skip rules whose only declaration value is `none`/`0` inside a `prefers-reduced-motion`
  ancestor) — I left it as specified rather than making that call myself.
- **The transform does not coalesce multiple guarded rules that share the identical ancestor
  at-rule chain into one `@media` block** — each guarded rule gets its own wrapper, so a block
  with 5 reduced-motion resets ends up with 5 small `@media (prefers-reduced-motion: reduce) { }`
  blocks instead of 1. Valid CSS, slightly larger output; not a correctness issue, flagged for
  awareness given the project's CSS budget.

---

## 10. Update 2026-09-03 — Rulings 1 and 2 implemented

Bean approved two rulings on the 5 refused cases in §6. Both implemented as general
classification/split rules in the existing code — no per-file exceptions. Re-verified against
copies of **all 62** `plugins/sgs-blocks/src/blocks/*/style.css` files (not just the 40 containing
`:hover` — the other 22 contribute 0 hover members, confirmed by direct grep, so scanning all 62 vs
just the 40 produces identical results; matches the coordinator's own reproduction scope).

### RULING 1 — `text-decoration`-only hover is out of scope

**Implementation, `classify.js`:** `text-decoration`/`text-decoration-line` moved out of
`NEUTRAL_PROPERTIES` into a new `TEXT_DECORATION_PROPERTIES` set. `classifyDeclarations()` now
returns a 4th verdict, `'text-decoration-only'`, when the only non-neutral declaration(s) present
are from that set and no `MOTION_PROPERTY`/`COLOUR_PROPERTIES` member is present. **Motion always
wins**: the `hasMotion` check is evaluated before the text-decoration check, so a rule combining
both still returns `'motion'` and still gets guarded (§10 negative control below proves this).
`transform.js` and `audit.js` both treat `'text-decoration-only'` exactly like `'colour'` — same
`return`/skip branch in the transform, same "leave completely untouched" behaviour.

**Is `text-decoration` in the same out-of-scope list as colour, or a separate one?** Same
**behavioural** bucket, separate **labelled reason**. `classifyDeclarations()` returns two distinct
strings (`'colour'` / `'text-decoration-only'`) so the checker's stats and report can say WHY a
rule was skipped, but every caller collapses both into the identical "leave untouched" action —
there is one `if ('colour' === verdict || 'text-decoration-only' === verdict) return;` line in
`transform.js`, not two parallel code paths. One coherent "out of scope" scheme, two reasons.

**Verified against the actual CSS — 3 of the 4 named cases qualify, 1 does not (flagged, not
silently forced):**

| File:line (post-transform position) | Declarations | Qualifies for Ruling 1? |
|---|---|---|
| `buybox/style.css:426` | `text-decoration: none;` only | ✅ Yes — cleared |
| `notice-banner/style.css:96` | `text-decoration: none;` only | ✅ Yes — cleared |
| `product-card/style.css:716` | `text-decoration: underline;` only | ✅ Yes — cleared |
| `business-info/style.css:102` (post-transform; `:107` pre-transform) | `background-position: 0 0; opacity: 1;` — **no `text-decoration` at all** | ❌ No — remains a finding |

**Flagging this back rather than silently complying:** the coordinator's message names
`.sgs-business-attribution .sgs-business-info__link:hover` (the exact selector I flagged in §6) as
one of the four Ruling 1 should clear, but I read the live file and its declarations are
`background-position: 0 0; opacity: 1;` — `opacity` is a genuine `MOTION_PROPERTY` (the sweep
effect this rule paints could visibly stick after a tap on a touch device), and there is no
`text-decoration` property anywhere in this rule. This is the same rule in both cases — I checked
the line-number pattern (102 vs my original 107, matching a 5-line shift consistent with the
transform having already run once on the copy the coordinator measured, exactly like
`buybox:430→426` and `product-card:722→716` shift the same way) — so there's no ambiguity about
which rule is meant, only about whether it should be exempted. Implementing Ruling 1 as a strict
`text-decoration`-only rule (as its own stated rationale requires — "must be a general
classification rule, NOT four per-file exceptions") correctly does **not** clear it, because
forcing it in would require either a per-file carve-out (explicitly ruled out) or a rule change
that would also exempt a rule containing `opacity` — the exact touch-stuck hazard this whole task
exists to fix. **I have left it as an open finding rather than guessing which way to resolve the
conflict.** If the intent was genuinely to exempt this specific rule despite the `opacity`, that
needs a separate, explicit ruling with its own rationale (e.g. "the sweep reset is cosmetic, not a
stuck control") — I won't infer that silently.

### RULING 2 — split a `:where()`-grouped hover+focus selector

**Implementation, `selector-split.js`:** added `tryWhereRescue()`. When a top-level selector member
trips the existing hover+focus ambiguity check AND that member is nothing but a single `:where(...)`
pseudo (no selector text outside it) whose inner comma-list cleanly partitions into hover-only and
focus-only items (no inner item mixes both, none is neither, both buckets non-empty), the rescue
splits it into two selectors instead of flagging ambiguous: `:where(<hover items>)` and
`:where(<focus items>)` — each RE-WRAPPED in its own `:where()`, not emitted bare, specifically to
preserve the original's zero specificity (the source `:where()` zeroed the `:hover`/`:focus-visible`
pseudo-classes themselves, not just an ancestor prefix — emitting `A:hover` bare would hand it real
specificity it never had). Scoped to `:where()` only, not `:is()` — `:is()` takes the specificity of
its most specific argument rather than zeroing it, so splitting an `:is()`-grouped rule could
silently change its specificity; that shape still falls through to `'ambiguous'`, unguessed.

The rescued hover/focus selectors then flow through the SAME declaration classification as every
other split (motion → guard, colour/text-decoration-only → skip untouched, unknown → report). The
one real instance in the codebase (`google-reviews__arrow`) is colour-only, so its outcome is
"skip, leave completely untouched" — see the negative control below for a synthetic motion case
that actually exercises the guard path.

### Verification 1 — full-tree run, all 62 blocks

Pre-transform (`test-fixtures/pre-transform-baseline/blocks`, all 62 block `style.css` copies):
```
[hover-guard check] CSS: scanned 62 files, 211 hover members total, 0 already guarded,
87 colour (out of scope), 3 text-decoration-only (out of scope), 105 findings.
```
(105 = 104 unguarded-motion + 1 unclassified [business-info, see above] + 0 ambiguous)

**Note on the 210→211 / 86→87 shift from my original §1 baseline:** both real, both explained by
Ruling 2. The `google-reviews__arrow` rule was previously counted only in the `ambiguous` bucket
(1 member, never entering `hover`). After `tryWhereRescue()`, it splits into one new counted hover
member (colour verdict → added to the colour-skip count). +1 total, +1 colour, ambiguous 1→0. Not a
measurement error — reconfirmed by running the checker against the ORIGINAL 40-file fixture with
the new code and getting the identical 211/87/3/105, isolating the change to the code, not the file
set.

After `run-transform.js` on the full 62-block copy:
```
[hover-guard] TOTAL: guarded 120, already-guarded 0, findings 1
```
Re-running the checker on the transformed tree:
```
[hover-guard check] CSS: scanned 62 files, 211 hover members total, 120 already guarded,
87 colour (out of scope), 3 text-decoration-only (out of scope), 1 findings.
  [css] .../business-info/style.css:102 [unclassified-declarations]
        .sgs-business-attribution .sgs-business-info__link:hover
```
**Findings: 105 → 1.** The 1 remaining is the business-info case flagged above (genuinely does not
qualify for either ruling), not a defect in the implementation. `check.js` still exits 1 because of
it — that is correct behaviour, not a bug: an unresolved edge case should keep failing the build
until a human decides it, exactly as designed in §2.

### Verification 2 — Ruling 1 negative control, confirmed it landed

Injected `.sgs-fake-decor__link:hover { text-decoration: underline; transform: scale(1.02); }`
(text-decoration AND a motion property together):
```
[hover-guard check] CSS: scanned 1 files, 1 hover members total, 0 already guarded,
0 colour (out of scope), 0 text-decoration-only (out of scope), 1 findings.
  [css] .../fake-decor-motion/style.css:1 [unguarded-motion] .sgs-fake-decor__link:hover
[hover-guard check] FAIL
exit code: 1
```
The break existed and was caught — the exemption did **not** overmatch. Then ran the transform on
the same fixture and confirmed it guards the rule correctly (both declarations intact):
```css
@media (hover: hover) and (pointer: fine) {
	:where(:root:not(.sgs-touch-input)) .sgs-fake-decor__link:hover {
		text-decoration: underline;
		transform: scale(1.02)
	}
}
```
Checker on the transformed fixture: `0 findings`, `PASS`. Fixture then deleted.

### Verification 3 — Ruling 2 negative control: focus half stays outside both guards

**The real instance** (`google-reviews/style.css`), quoted in full from the transformed output —
**byte-identical to the source, untouched**, because its declarations are colour-only (out of
scope by design, same as every other colour hover rule in this project):
```css
:where( .sgs-google-reviews__arrow:hover, .sgs-google-reviews__arrow:focus-visible ) {
	background-color: var( --wp--preset--color--primary, #0f7e80 );
	border-color: var( --wp--preset--color--primary, #0f7e80 );
	color: var( --wp--preset--color--text-inverse, #fff );
}
```
Neither half is wrapped in either guard — trivially true here since NOTHING was rewritten (colour
verdict). This does confirm the ambiguous-selector finding cleared (§ Verification 1), but doesn't
exercise the actual split-and-guard mechanism, since this one real case never needed guarding.

**Synthetic proof that the split-and-guard mechanism itself works**, using a motion-classified
`:where()`-grouped rule (`.sgs-fake-where__arrow`):

Before:
```css
:where( .sgs-fake-where__arrow:hover, .sgs-fake-where__arrow:focus-visible ) {
	transform: scale(1.1);
}
```
After:
```css
:where(.sgs-fake-where__arrow:focus-visible) {
	transform: scale(1.1);
}
@media (hover: hover) and (pointer: fine) {
	:where(:root:not(.sgs-touch-input)) :where(.sgs-fake-where__arrow:hover) {
		transform: scale(1.1);
	}
}
```
The focus half is a plain top-level rule, outside `@media (hover...)` and outside
`:root:not(.sgs-touch-input)` — confirmed not wrapped in either guard, exactly per the docblock's
rule that focus pseudo-classes stay reachable for keyboard users regardless of touch state.
Specificity check: original combined selector was `:where(A:hover, A:focus-visible)` — 0
specificity throughout (that's what the author's own `:where()` was for). Focus half
`:where(.sgs-fake-where__arrow:focus-visible)` — still 0 (still one `:where()`, nothing added).
Hover half `:where(:root:not(.sgs-touch-input)) :where(.sgs-fake-where__arrow:hover)` — still 0
(two `:where()` compounds, zero each, descendant combinator adds nothing). Neither half gained or
lost specificity relative to the original or relative to each other — they still tie exactly as
before. Checker on the transformed fixture: `0 findings`, `PASS`. Fixture then deleted.

### Verification 4 — idempotence, both rulings

Snapshotted the transformed 62-block tree, ran `run-transform.js` again, byte-compared:
```
[hover-guard] TOTAL: guarded 0, already-guarded 120, findings 1
diff -rq build-copy-run1-snapshot build-copy
diff exit: 0        (zero output — byte-identical)
```
Second run reports `guarded 0` everywhere (nothing re-wrapped) with `already-guarded 120` matching
the first run's guarded total exactly — no-op confirmed.

### Verification 5 — anti-vacuity, re-run post-ruling

Same monkey-patched dead-detector proof as §5d, re-run against the (now 62-file) pre-transform
baseline:
```
[anti-vacuity] DEAD detector run over 62 DIRTY (untransformed) files: 0 findings reported.
[anti-vacuity] Compare to the REAL detector over the same dirty tree: 104 unguarded-motion +
1 unclassified + 0 ambiguous = 105 findings.
[anti-vacuity] CONFIRMED: a dead detector silently passes a dirty tree — 0 findings does NOT
by itself mean "clean". Only a non-zero result on this same tree proves the detector is alive.
```
The real checker's 105-finding pre-transform result (Verification 1) is the same tree the dead
detector reported 0 findings on — confirms the real detector's signal is live, not stubbed, under
the updated classification rules too.

### Files touched for this update (still only inside `scripts/hover-guard/`)

- `classify.js` — `TEXT_DECORATION_PROPERTIES` set + 4th verdict + docblock rewrite.
- `transform.js` — skip branch extended to the new verdict.
- `audit.js` — new `textDecorationSkippedCount`, threaded through the returned stats.
- `check.js` — summary line now reports the text-decoration-only count separately.
- `selector-split.js` — `tryWhereRescue()` + `classifyNode()` helper, docblock rewrite.
- `test-fixtures/pre-transform-baseline/` and `test-fixtures/build-copy/` — rebuilt to cover all 62
  block `style.css` files (previously only the 40 containing `:hover`), matching the coordinator's
  reproduction scope.
- No changes outside `scripts/hover-guard/`. No git commands run. No `package.json`/`src/`/
  `includes/` edits.

---

## 11. Update 2026-09-03 — cross-file PHP resolution (closes the flagged blind spot)

**Prerequisite note.** Between my last update and this one, `plugins/sgs-blocks/scripts/hover-guard/`
was committed and pushed by another process (commit `2a9cf59e7`), and a third ruling — approved by
the repo owner — landed in `classify.js` on disk: `background-position` moved into
`MOTION_PROPERTIES`, because `business-info`'s attribution link is a matched pair (a generic
`:hover` dims to `opacity: 0.8`; a more specific `:hover` cancels it via `background-position` +
`opacity: 1`), and guarding only one half would leave the link visibly dimmed on touch with nothing
to undo it. I re-read `classify.js` fresh before touching anything (files shared with another
session cannot be assumed unchanged) and confirmed it on disk exactly as described. All fixtures
were rebuilt from the current `src/` before any of this section's verification ran.

### Verified before building (per this repo's prove-the-cause rule)

Read both files named in the brief directly:
- `includes/helpers-button-style.php:261-270` — in the `elseif` branch (only
  `$colour_border_hover_gradient` set), builds `$hover_only_selector` via `array_map()` appending
  `':hover,' . $part . ':focus-visible'` to each selector part, then calls
  `sgs_border_gradient_css( $hover_only_selector, $colour_border_hover_gradient, null, $gradient_width )`
  — **the third argument, `$hover_paint`, is the literal PHP keyword `null`.**
- `includes/helpers-tokens.php:1217-1241`, `sgs_border_gradient_css()` — the guard-emitting branch
  (`sgs_hover_state_rules()` × 2) is gated on `null !== $hover_paint && ...`; with a literal `null`
  passed, that branch never runs, and the function's UNCONDITIONAL base-rule emission
  (`"{$selector}{border-color:transparent;...}"` / `"{$selector}::before{...}"`, no guard call
  anywhere) is all that fires — for a `$selector` that already carries `:hover`.

Confirmed: a real, unguarded hover rule reaches production, and it's invisible to Job A because
neither file's own function body contains a `:hover` literal AND lacks a guard call simultaneously
— `helpers-button-style.php`'s enclosing function DOES build a `:hover` literal (in the `array_map`
closure) but never calls a guard function directly (it calls `sgs_border_gradient_css()` instead),
so the OLD per-function-body scan actually already fails this function under Job A's own rule —
verified: `sgs_button_element_style_css()` shows `has_hover_literal: true, calls_guard: false` in
Job A's own output, i.e. **Job A independently flags this same function for an unrelated reason**
(it hand-builds `:hover` and calls a non-guard-named helper). That's a real, pre-existing Job A
finding too, separate from the specific cross-file mechanism this update targets — the brief's
"blind spot" is specifically about a function whose OWN body has NO `:hover` literal at all (so Job
A has nothing to trigger on), which is the general case Job B needs to cover; this particular
example happens to also trip Job A, which is not a contradiction, just two different detectors both
correctly finding something.

**Also enumerated every real call site of `sgs_border_gradient_css()`** (`grep -rn` across
`includes/*.php`) before writing the registry, to know exactly what the detector would need to get
right without false-positiving:

| Call site | Selector argument | Selector carries `:hover`? | Gate argument | Expected outcome |
|---|---|---|---|---|
| `class-sgs-container-wrapper.php:2151` | `'.' . $uid . '.sgs-container--grid > .sgs-container'` | No (plain concatenation, no `:hover` token) | ternary | clean |
| `helpers-button-style.php:248` | `$selector` (function parameter, never locally reassigned) | No | ternary | clean |
| `helpers-button-style.php:270` | `$hover_only_selector` (locally built, carries `:hover`) | **Yes** | literal `null` | **the real bug** |
| `helpers-colour-variants.php:286` | `$selector` (function parameter, never locally reassigned) | No | `'' !== $hover_paint ? $hover_paint : null` | clean |

### What was built

**`php-emitter-registry.json`** (new file) — declared data, not control flow. Two entries:
`sgs_border_gradient_css` (the proven case above: `selector_param_index: 0`,
`guard_gate_param_index: 2`, `guard_skip_literals: ["null"]`) and `sgs_block_background_layer_css`
(same shape, `guard_skip_literals: ["''", "\"\""]` since its default/skip value is an empty string
rather than `null` — included specifically to prove the registry is genuinely reusable across more
than one function's shape, not a single case dressed as data; it currently has **zero real call
sites**, grep-confirmed, so it contributes nothing to any count below and will only start mattering
if a future caller is added).

**`php-hover-scan.php`** — extended with JOB B (cross-file registry resolution), documented in full
in its own docblock (method, the exact one-hop resolution rule, and the limitations). In brief, for
every call to a registered function found in a scanned function's body:
1. Classify the `selector_param_index` argument as **carries hover** (`yes`/`no`/`unresolved`) via
   exactly one hop: a direct literal containing `:hover` → `yes`; a bare `$variable` locally
   assigned (`=`/`.=`, same function only) a value whose right-hand side contains `:hover` anywhere
   → `yes`; a bare `$variable` with NO local assignment in this function (a pass-through parameter)
   → `no` (a genuinely confident statement about THIS function, not a guess about its caller); a
   plain concatenation of literals/traced-variables with none of them hover-carrying → `no`;
   anything more complex (a function call, a ternary, an unrecognised token) → `unresolved`.
2. Only when step 1 is `yes`: classify the `guard_gate_param_index` argument as **skip / fires /
   unresolved** against the registry's `guard_skip_literals` — a single-token exact match (e.g. the
   bare keyword `null`) → `skip` (FLAG); a single non-skip-listed string literal → `fires` (clean,
   the guarded branch runs); anything else (a variable, a ternary, a nested call) → `unresolved`.

**`check.js`** — extended `runPhpCheck()` to also surface `cross_file_calls` /
`cross_file_flags` / `cross_file_unresolved`, and the overall exit code now also fails on any
cross-file flag or unresolved case, not just Job A failures.

**No fix applied to the button-style/border-gradient defect itself** — detection only, per the
brief.

### Verification 1 — positive control

```
[hover-guard check] PHP cross-file: 4 calls to registered shared emitters, 3 resolve clean,
1 flagged unguarded, 0 unresolved.
  [php-cross-file] .../includes/helpers-button-style.php:270 sgs_button_element_style_css()
    passes a hover-carrying selector into sgs_border_gradient_css() on a call path where
    its guard is proven skipped
```
Raw JSON from `php-hover-scan.php`:
```json
"cross_file_flags": [
    {
        "caller_function": "sgs_button_element_style_css",
        "file": "includes/helpers-button-style.php",
        "line": 270,
        "callee": "sgs_border_gradient_css",
        "resolution": "flagged-unguarded"
    }
]
```
The checker now flags exactly the case the brief described, at the exact line.

### Verification 2 — negative control, confirmed it landed

The REAL ordinary-path call site (`helpers-button-style.php:248`, `$hover_paint` non-null, the
guarded branch runs) already resolves clean in the full scan — `resolution: "clean-no-hover"` (its
selector is the untainted `$selector` parameter, so it never even reaches the gate check). To prove
I actually exercised the GATE-FIRES branch of the detector (not just the selector-is-clean
short-circuit, which the real call site happens to take), I wrote an isolated synthetic fixture
where the selector genuinely DOES carry `:hover` (built the same way as the real bug) but the gate
argument is a real, non-empty, non-null literal — the shape of the TRUE "ordinary path where
`$hover_paint` is non-null":
```php
function sgs_fake_caller_guarded_path( string $selector ): string {
	$hover_only_selector = implode( ',', array_map(
		static function ( $part ) { return $part . ':hover,' . $part . ':focus-visible'; },
		array_map( 'trim', explode( ',', $selector ) )
	) );
	sgs_hover_media_wrap( '' ); // satisfies job A only, isolates job B under test
	return sgs_border_gradient_css( $hover_only_selector, '#000', 'linear-gradient(#fff,#000)', '2px' );
}
```
Scanner output: `"resolution": "clean-guard-fires"`, `cross_file_flags: []`, exit code **0**. This
proves the break existed to be caught (the selector genuinely resolves `yes`, exercising the same
taint-tracing path as the real bug) and that the detector correctly does NOT flag it once the gate
argument proves the guard fires. Fixture then deleted.

### Verification 3 — anti-vacuity: the registry drives the result

Same target file (`includes/helpers-button-style.php`), same scanner code, only the registry
content changed:
```
== with REAL registry (should FLAG) ==
exit: 1
"cross_file_flags": [ { ...line 270, "resolution": "flagged-unguarded" } ]

== with an EMPTY {} registry (must NOT flag) ==
exit: 0
"cross_file_calls": [], "cross_file_flags": [], "cross_file_unresolved": []
```
The finding disappears with an empty-but-valid registry — proving the registry's declared content,
not a hardcoded shortcut, is what drives the result. A future "0 findings" is a real 0, not a dead
lookup silently matching nothing.

**Distinguished from a BROKEN registry, which must never silently pass either** — pointed
`--registry=` at a nonexistent path:
```
SCAN ERROR: could not load emitter registry at .../does/not/exist.json — cross-file job (B) cannot run.
"had_error": true
exit: 2
```
An empty valid registry (`{}`) means "nothing registered, 0 real findings, honestly." An unreadable
registry means "job B cannot run at all" and fails loudly (exit 2) — never fabricated as a silent 0.

### Verification 4 — full run

CSS surface (unchanged mechanism, all 3 CSS rulings applied):
```
[hover-guard check] CSS: scanned 62 files, 211 hover members total, 121 already guarded,
87 colour (out of scope), 3 text-decoration-only (out of scope), 0 findings.
```
Matches the coordinator's own accounting exactly: 121 guarded + 87 colour + 3 text-decoration = 211.

PHP surface:
```
[hover-guard check] PHP: scanned 977 functions, 0 within-function findings.
[hover-guard check] PHP cross-file: 4 calls to registered shared emitters, 3 resolve clean,
1 flagged unguarded, 0 unresolved.
```
**How many PHP hover emitters exist, how many resolve, how many are UNRESOLVED** — stated plainly:
- **2 functions** carry a `:hover` string literal directly in their own body (Job A candidates) —
  both correctly call a guard function somewhere in that same body (0 Job A failures).
- **4 call sites** exist anywhere in the scanned files to a registered shared emitter (Job B) — **3
  resolve confidently clean**, **1 resolves confidently unguarded** (the real bug), **0 unresolved**.
- Overall `check.js` exit code: **1 (FAIL)** — correct and intended. The whole point of this task
  was proving the bug exists before anyone changes the code that has it; a green run at this point
  would mean the detector isn't working.

### Verification 5 — honest limitations (accurate, not reassuring)

What this still cannot see, stated plainly for the docs to carry forward:
- **Two-hop flows.** If the hover-carrying value were assembled in a function TWO calls away from
  the registered emitter (e.g. function A builds a `:hover` selector, passes it as a plain
  parameter to function B, which passes that same parameter straight through to the registered
  emitter), this scan resolves function B's own call as `no` (correctly, at that one hop — B's
  local body never assigns the tainted value) and never looks further up to A. This is a genuine,
  deliberate boundary, not an oversight — the brief explicitly ruled out general taint analysis.
- **Dynamic function calls.** `$fn(...)`, `call_user_func( 'sgs_border_gradient_css', ... )`, or any
  call where the callee name isn't a literal `T_STRING` token immediately followed by `(` is
  invisible — the scan only recognises direct, statically-named calls.
- **Selectors built in a caller's caller**, i.e. exactly the pass-through-parameter case above,
  restated: a parameter that is clean *within* the function that calls the registered emitter, but
  was itself built from a `:hover`-carrying expression somewhere further up the call chain, resolves
  `no` here. This is the SAME boundary as two-hop flows, named separately because it's the shape
  most likely to recur in this codebase (parameters are passed through several helper layers
  routinely).
- **Any emitter not yet in `php-emitter-registry.json`.** The scan only inspects calls to the two
  function names currently registered. A third shared CSS emitter with the same
  guard-skipped-on-null shape, if one exists elsewhere in the tree, will not be found until it is
  added as a new declared row — this was NOT re-audited beyond the two functions named/found in
  this task; only `sgs_border_gradient_css()` and `sgs_block_background_layer_css()` were checked.
- **Equality-based guard skipping is untouched.** `sgs_border_gradient_css()`'s guard is ALSO
  skipped when `$hover_paint === $normal_paint` (both non-null) — a runtime value comparison this
  scan cannot evaluate statically in general, so it is not attempted. Only the literal-`null`/
  literal-empty-string shortcut is detected, because that is the ONLY case provable from source text
  alone without evaluating expressions.

### Files touched for this update (still only inside `scripts/hover-guard/`)

- `php-emitter-registry.json` — new, declared data.
- `php-hover-scan.php` — Job B added (cross-file resolution), docblock rewritten to cover both jobs
  and the limitations above; CLI now accepts `--registry=<path>`, defaulting to the co-located
  `php-emitter-registry.json`.
- `check.js` — `runPhpCheck()` surfaces the three new fields; exit logic extended to fail on a
  cross-file flag or an unresolved cross-file case, not just Job A failures.
- `test-fixtures/pre-transform-baseline/` and `test-fixtures/build-copy/` rebuilt fresh from current
  `src/` (Ruling 3 landing externally meant the previous copies were stale).
- No changes outside `scripts/hover-guard/`. No git commands run. No `includes/`/`src/`/
  `package.json` edits — the button-style/border-gradient defect itself is untouched, exactly as
  instructed.
