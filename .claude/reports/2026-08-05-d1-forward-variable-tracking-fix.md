# D1 forward-variable-tracking fix — 2026-08-05

**Files changed:** `plugins/sgs-blocks/scripts/content-role-detect/detector1_render_escaping.php`,
`plugins/sgs-blocks/scripts/content-role-detect/classify_detector1.py`.
**Not changed:** `fingerprint_content_roles.py` (per constraint — its category→role mapping is
untouched; every finding below is measured by actually running it, read-only, against the live DB).
**New fixture (scratchpad, not committed):**
`C:\Users\Bean\AppData\Local\Temp\claude\c--Users-Bean-Projects-small-giants-wp\72fffc6d-931b-4f6d-9be5-3a81e0565695\scratchpad\negctrl\plant_forward_and_printf.php`
— confirmed on disk (`ls -la`, 2196 bytes) before being trusted.

## 1. Ground truth confirmed before touching code

Read `README.md` + the file's own header (design + blind spots). Read the 8 target render.php files
(`responsive-logo`, `button`, `nav-menu`, `form-field-address`, `form-field-file`, `form-field-hidden`,
`icon`, `media`) directly and traced each attribute's actual escaping call by eye before writing any
fix. Ran the **unmodified** detector against the 8 files first to confirm the baseline the task
describes was real, not assumed — it was (`esc_attr-unresolved`/`esc_attr-unclassified` on all 9,
matching the task's measured-impact list exactly).

## 2. Root cause, precisely (two distinct shapes, not one)

D1's classifier only ever looked at the text **immediately preceding** the escaping call, in the
**same logical statement**, end-anchored. Two different real shapes defeat that:

- **Positional split (printf/sprintf).** `responsive-logo.alt`: `esc_attr( $alt )` is a positional
  argument to `printf()`; the HTML attribute name (`alt="%4$s"`) lives in the *format string*, an
  earlier, unrelated argument — nothing in the "text right before the call" names the attribute at
  all.
- **Assignment/use-site split (forward variable tracking).** `button.ariaLabel` /
  `nav-menu.navLabel`: the value is escaped **into a variable** at assignment time
  (`$aria_label = ... esc_attr( $attributes['ariaLabel'] ) ...;`), and the HTML attribute it becomes
  (`aria-label="..."`) is read from that variable in a **different, later statement** — sometimes
  hundreds of lines away, sometimes through a PHP array literal (`'aria-label' => esc_attr( $x )`,
  the `SGS_Container_Wrapper::render()` `extra_attrs` shape) rather than raw HTML syntax.

A third, smaller factor compounded `nav-menu.navLabel` specifically: the row's `statement` field was
`mb_substr($text, 0, 220)` — the first 220 characters of a >1000-character glued statement (an `if`
header + a bare `}` glue onto the huge `SGS_Container_Wrapper::render()` call) — so even a same-
statement check would never have reached line 1441's `aria-label` text. This wasn't fixed directly;
it's moot because forward variable tracking (below) scans the *full, untruncated* per-statement text
independently of what gets serialised into the output row.

## 3. The mechanism built

**`detector1_render_escaping.php`** (raw-fact stage):

- `printf_placeholder_context()` — finds the nearest enclosing `printf()`/`sprintf()` call (depth-
  balanced paren matching via `PREG_OFFSET_CAPTURE`), resolves the format-string argument **only**
  when it's built from plain string-literal concatenation (`'a' . 'b' . 'c'` — the WPCS pattern used
  throughout this codebase; bails to `null` for anything else, deliberately conservative), maps the
  escaping call's own argument position to its placeholder (`%N$s` preferred, else the Nth plain
  `%s`/`%d`), and returns the format-string text immediately preceding that placeholder.
- `forward_variable_context()` — given a variable name, scans **every statement in the file** (not
  just the assignment's own) for that variable landing inside an HTML-attribute-name context (both
  `attr="..."` and `'attr' => ...` array-literal syntax), tolerating one intervening wrapper-escaping
  call (`esc_attr( $var` → stripped so the tail lands exactly on the marker).
- `classify_call()` now tries the same-statement window first, then `printf_context`, then
  `forward_context`, in that order — first real classification wins.
- Per-match `PREG_OFFSET_CAPTURE` was added so printf resolution knows *which* positional argument a
  given escaping call actually is.
- **Candidate-variable selection is deliberately narrow** — a call's own resolved variable when it
  has one, **or**, only when the call's argument was a *direct* `$attributes[key]` access (no
  variable indirection), the enclosing statement's own assignment target. See §5 for why this
  restriction exists (it fixes a bug I introduced and then caught).

**`classify_detector1.py`** (the field actually consumed downstream via `final_category`):

- Existing rule body factored into `_classify_esc_attr_core(before, after, stmt, key)` unchanged in
  substance, plus:
  - `aria-[a-z]+` narrowed to `aria-label` specifically (most other `aria-*` attributes —
    `aria-describedby`, `aria-controls`, `aria-owns`... — are ID references or boolean state, not
    accessible text; a broader pattern would have mis-filed `form-field-address`'s
    `aria-describedby` reference as `a11y-metadata` once the new fallback made it reachable at all).
  - A companion `aria-(?!label)[a-z]+` → `NOT-content` branch, for the same reason.
  - PHP array-literal (`'aria-label' => `, `'style' => `, `'name' => `...) forms added alongside the
    existing HTML-attribute forms, for both the a11y and NOT-content/style groups.
  - `rel` and `value` added to the technical-attribute NOT-content list (`rel` — a machine-readable
    link-relationship token, never content; `value` — scoped narrowly, see §4).
  - The `style=` same-statement check gained a second pattern tolerating a closing-quote-then-dot
    tail (`style="color:' . esc_attr(...)`) — found by the negative-control fixture, see §6.
  - `classify_esc_attr()` now retries `printf_context` then `forward_context` (in that priority
    order) when the primary window returns `esc_attr-unresolved` — same rule set, no duplicated
    logic to drift out of sync.

## 4. Expected vs actual (declared before running)

**Declared expectation:** all 9 rows resolve — `alt`, `ariaLabel`, `navLabel` → `a11y-metadata`;
`fieldName` (×3 blocks), `defaultValue`, `linkRel` (×2 blocks) → `NOT-content`.

**Actual** (full targeted run, `classify_detector1.py` `final_category`):

| Attribute | Rows | Result | Matches expectation |
|---|---|---|---|
| `sgs/responsive-logo.alt` | 4 | `a11y-metadata` | Yes |
| `sgs/button.ariaLabel` | 1 new (+2 pre-existing correct) | `a11y-metadata` | Yes |
| `sgs/nav-menu.navLabel` | 1 | `a11y-metadata` | Yes |
| `sgs/form-field-address.fieldName` | 3 | `NOT-content` | Yes |
| `sgs/form-field-file.fieldName` | 2 | `NOT-content` | Yes |
| `sgs/form-field-hidden.fieldName` | 2 | `NOT-content` | Yes |
| `sgs/form-field-hidden.defaultValue` | 1 | `NOT-content` | Yes |
| `sgs/icon.linkRel` | 1 | `NOT-content` | Yes |
| `sgs/media.linkRel` | 1 | `NOT-content` | Yes |

**9/9 resolved, exactly as declared.** `defaultValue`'s `NOT-content` call is a judgement I made, not
one the task specified: `value="%s"` on a hidden field is the raw submitted payload, not displayed
text. I checked the blast radius before adding `value` to the technical-attribute list — only two
`render.php` files in the whole plugin feed an escaped value into a `value="` placeholder
(`form-field-hidden` and `option-picker`); `option-picker`'s binds an array element (`$item['key']`)
outside this detector's tracked `$attributes[...]` pool, so the addition only affects the one row it
targets.

## 5. Full before/after diff — every changed row, explained

Ran the **original, unmodified** detector (extracted via `git show HEAD:...` into a temp dir, so the
live working tree — shared with other active agents this session — was never touched) against
`--glob` (379 rows), then the fixed detector against the same `--glob` (379 rows, same count). Rows
are positionally aligned (same file-scan order, same statement-splitting logic, only classification
changed) and cross-checked by `(block_slug, attr_key, line, func)` key — zero misalignments.

**23 of 379 rows changed.** 14 are the 9 required attributes above. The remaining 9:

| Row | Before | After | Verdict |
|---|---|---|---|
| `sgs/button.label` (line 38) | `esc_attr-unresolved` | `esc_attr-unresolved` (no change in final run) | **Bug I introduced, then fixed.** First implementation let *any* escaping call in an assignment statement borrow the assignment target's forward context — so `button.label` (the ternary's *other* branch, a completely different attribute) got `$aria_label`'s forward-found `aria-label="` context and wrongly became `a11y-metadata`. Root cause: the fallback should only apply to the call that actually *produces* the assigned value, identified structurally as "argument was a direct `$attributes[key]` access, not itself another resolved variable." Restricting the candidate-variable selection to that case (§3) fixed it — confirmed by re-running the full diff, `button.label` no longer appears in the changed set. |
| `sgs/form-field-consent.fieldName` (line 30) | `a11y-metadata` | `NOT-content` | **Pre-existing bug fixed as a side effect.** The old blanket `aria-[a-z]+` pattern matched `aria-describedby="' . esc_attr( $fid ) . '-error"'` (an ID reference built from `fieldName`) and mis-filed it as `a11y-metadata`. Narrowing to `aria-label` + the explicit `aria-(?!label)` → `NOT-content` branch fixes it. Directly relevant: `fieldName` must never be a11y per the task brief, and this row was already breaking that before my session touched anything. |
| `sgs/media.imageAlt` (line 512) | `esc_attr-unresolved` | `a11y-metadata` | Genuine improvement via `printf_context` (`<img src="%s" alt="` — clean positional match). `imageAlt` has no other usage site in the file (checked), so this is a clean single-purpose a11y attribute with no aggregation risk. |
| `sgs/media.caption` (line 659) | `esc_attr-unresolved` | `NOT-content` | **No operational effect.** This specific use site (`caption` as a video's aria-label fallback when unset — line 670, inside a `%s`-substituted pre-built fragment) resolves via a pre-existing, non-anchored `class(name)?s?\s*=` check picking up the format string's own `class="sgs-media__video"` text within the printf-context window — a coincidental match, not a wrong one in effect. `caption`'s real content usage (`wp_kses_post`, line 411) appears **earlier** in the file, so it already wins the aggregation regardless of what line 659 resolves to. Confirmed via the live `fingerprint_content_roles.py` run (§7) — `caption` isn't even in the eligible pool (already classified upstream), so this row is inert either way. |
| `sgs/product-card.image` (line 919) | `esc_attr-unresolved` | `a11y-metadata` | No operational effect — `image`'s two `link-href` rows (526, 916) appear earlier in the file and win the aggregation; also not in the eligible pool (confirmed §7). |
| `sgs/product-search.buttonLabel` (line 357) | `esc_attr-unresolved` | `a11y-metadata` | No operational effect — a `visible-text` row (293) appears earlier and wins; not in the eligible pool (§7). |
| `sgs/table-of-contents.title` (line 364) | `esc_attr-unresolved` | `a11y-metadata` | **Individually correct, flagged not hidden.** `$toc_title` is genuinely dual-purpose: it's the visible TOC heading (lines 395/401, `esc_html`) **and** the nav landmark's `aria-label` (line 364, inside `get_block_wrapper_attributes()`'s array literal — real evidence, not a false match). `fingerprint_content_roles.py` picks `content_cats[0]` by file-order, not by category priority, so if this attribute *were* in the eligible pool, the a11y row (earlier in the file) would beat the visible-text rows for the aggregate role — a pre-existing design gap in a file I'm not authorised to touch. **Confirmed moot**: `title` is not in the eligible pool today (§7), so this has zero live effect, but I flag the aggregation-priority gap as a follow-up recommendation (§8) rather than silently suppressing a row whose own evidence is real. |
| `sgs/team-member.name` (line 270) | `esc_attr-unresolved` | `a11y-metadata` | Same shape as `title` — `$name` is genuinely dual-purpose (photo `aria-label`, line 270; visible `<h3>` heading via `wp_kses_post`, line 287, later in the file). Same "individually correct, aggregation-order-sensitive, currently moot" verdict — confirmed not in the eligible pool (§7). |

**No row that was previously correctly classified changed to something else**, except
`form-field-consent.fieldName`, which was previously **incorrectly** `a11y-metadata` and is now
correctly `NOT-content` — a fix, not a regression.

## 6. Negative + positive controls

**Positive control** — confirmed the detector reaches and parses `responsive-logo/render.php`: it
produced exactly 4 `alt` rows at the 4 real call sites (lines 348/374/385/397) both before and after,
proving the file isn't silently skipped.

**Negative control** — built `plant_forward_and_printf.php` (scratchpad, listed at the top of this
report) with 3 positive shapes (printf-split alt, forward-tracked assigned aria-label, array
fat-arrow nav-label) and 2 shapes that must **not** become a11y or content: a value escaped into a
`data-*` attribute, and a value escaped into `style=`. Confirmed the plant existed on disk
(`ls -la`, 2196 bytes) before trusting any result from it. Ran the **fixed** detector against it:

| Attribute | Result | Verdict |
|---|---|---|
| `plantAlt` | `a11y-metadata` | Positive case fires |
| `plantAriaLabel` (×2 rows) | `a11y-metadata` | Positive case fires |
| `plantNavLabel` | `a11y-metadata` | Positive case fires |
| `plantDataValue` | `NOT-content` | **Negative control passes** — not a11y, not content |
| `plantStyleValue` | `esc_attr-unresolved` → fixed to `STYLING-exclude` | **Negative control passes** — see below |

The `style=` control initially landed on `esc_attr-unresolved` rather than the more precise
`STYLING-exclude` — its primary requirement (not becoming a11y) was already satisfied, but I traced
why it fell short: the existing `style=` regex required *no* quote character in its tail, and
`'style="color:' . esc_attr( $x )` has a literal `'` in that position (the same
quote-plus-concatenation-dot shape the `aria-label`/`alt`/`title` branch already tolerated). Added
the same tolerance to `style=`; re-ran the plant, confirmed `STYLING-exclude`; re-ran the full 379-row
diff, confirmed no additional rows changed (the shape doesn't occur in real code today, only in the
plant).

## 7. Live pipeline verification (read-only DB)

Ran `fingerprint_content_roles.py`'s `compute()` directly (its own `sqlite3.connect(..., mode=ro)` —
confirmed read-only, no write path touched) against the fixed detector output:

- **Assigned `a11y-text` role:** `sgs/button.ariaLabel`, `sgs/nav-menu.navLabel`,
  `sgs/responsive-logo.alt` — exactly the 3 required a11y attributes, cleanly assigned.
- **Explicitly vetoed** ("D1 examined every usage site and found none content-bearing"):
  `sgs/form-field-address.fieldName`, `sgs/form-field-consent.fieldName`,
  `sgs/form-field-file.fieldName`, `sgs/form-field-hidden.fieldName`,
  `sgs/form-field-hidden.defaultValue` — an explicit, correct rejection (better than the previous
  silent "unmapped category" report-only fate).
- `sgs/icon.linkRel` / `sgs/media.linkRel` are in the eligible pool but reach **no** bucket
  (assignments/report-only/vetoed/disagreements) at all — a pre-existing quirk: a D1-only veto with
  no D2/D3 corroboration never enters `fingerprint()`'s main loop (which iterates `per_detector`, and
  a pure veto is tracked in `d1_vetoes` but only consulted when *something* surfaces the key via a
  detector dict). Net effect for the task's requirement is still satisfied — neither becomes a11y nor
  content — just via silent omission rather than an explicit veto entry. Flagged as a follow-up, not
  fixed (out of scope, `fingerprint_content_roles.py`).
- `sgs/table-of-contents.title`, `sgs/team-member.name`, `sgs/media.caption`,
  `sgs/product-card.image`, `sgs/product-search.buttonLabel`, `sgs/media.imageAlt` are **not in the
  eligible pool** (`role IS NULL AND ... css_property IS NULL ...` filter excludes them — already
  classified via a different, earlier mechanism), so every "side effect" identified in §5 for these
  attributes is confirmed to have **zero live effect** on the actual pipeline today.

## 8. Blind spots — updated

Old list (still true, narrowed): JS-side rendering (Interactivity API/`viewScriptModule`), text
escaped in a child InnerBlocks composite rather than the parent's own render.php.

**Closed this session:**
- `printf`/`sprintf` positional argument splitting the HTML attribute name (in the format string)
  from the escaped value — closed via `printf_placeholder_context()`, format string must be a plain
  string-literal concatenation (bails conservatively otherwise, e.g. a translation-wrapped or
  variable format string still isn't resolved).
- Attribute escaped into a variable at assignment time, read into an HTML attribute (or PHP
  associative-array literal) in a different, later statement — closed via
  `forward_variable_context()`, order-agnostic (scans the whole file, not just forward).

**New, narrower blind spots introduced by the fix's own conservatism (documented, not silently
absorbed):**
- `printf_placeholder_context()` only resolves format strings built from plain `'a' . 'b' . 'c'`
  string-literal concatenation. A format string built via a variable, a translation function, or any
  non-literal expression returns `null` (falls through to the existing behaviour) rather than being
  resolved.
- `forward_variable_context()`'s window can span back far enough (100 chars) to catch an unrelated
  marker earlier in the *same* format string when the actual placeholder position has no marker of
  its own immediately before it (§5, `media.caption` line 659) — currently inert only because the
  pre-existing, non-anchored `class=` NOT-content check happens to catch it too; a future case
  without that lucky catch could theoretically misclassify. Not tightened this session (no live case
  needed it and the fix is already large); flagged as a follow-up.
- The candidate-variable restriction (§3, §5) means forward tracking only follows the assignment
  target for a *direct* `$attributes[key]` access — a value that is escaped into one variable, then
  reassigned to a second variable, then read from the second variable's use site, is not tracked
  (no case in the codebase needed this; not built to avoid speculative complexity).

**Known, pre-existing, NOT fixed this session (out of scope — `fingerprint_content_roles.py`):**
- `content_cats[0]` selection is file-order-based, not category-priority-based. A genuinely
  dual-purpose attribute (real visible content *and* a secondary a11y usage) will be silently
  assigned `a11y-text` instead of its content role if the a11y usage site happens to appear earlier
  in the file — confirmed live-inert today only because the two attributes it would affect
  (`table-of-contents.title`, `team-member.name`) are outside the current eligible pool for unrelated
  reasons (§7). **Recommendation for whoever owns that file:** rank genuine content categories
  (`visible-text`/`svg-markup`/`wp_kses-other`/`link-href`) above `a11y-metadata` when multiple
  categories are found for the same attribute, the same way D1 is already ranked above D2/D3.
- A pure D1 veto with no D2/D3 corroboration reaches no result bucket at all (§7,
  `icon.linkRel`/`media.linkRel`) — satisfies "not content" but isn't visible as an explicit
  decision.

## 9. `/qc-inline` verdict

See final assistant message.

## 10. What I could not determine

- Whether `sgs/form-field-hidden.defaultValue` "should" ultimately carry a role beyond `NOT-content`
  (e.g. a dedicated "technical form value" role) is a design question for the role taxonomy, not
  something this detector fix can resolve — I made the narrowest defensible call (verified 2-file
  blast radius) and flagged it rather than inventing a new role category.
- Whether `table-of-contents.title` / `team-member.name` will re-enter the eligible pool in future
  (and therefore actually trigger the aggregation-priority gap in `fingerprint_content_roles.py`) —
  depends on why they're currently excluded (already role-assigned, or already carrying
  `css_property`/`enum_values`/etc.), which I did not trace further since it's outside this fix's
  file scope.
