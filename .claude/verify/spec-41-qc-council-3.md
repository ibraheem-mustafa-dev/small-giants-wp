# Spec 41 — QA-7 / qc-council #3 verdict (Step 16a)

**Scope:** commits `070fbc9a8` (step 15, CSS-emission rewrite), `61a141fbf` (step 16, FR-41-15
census execution: 6 DELETE / 3 CONVERT / 2 KEEP), `14b807364` (follow-up: `submenuBorderRadius`
rewiring). Gates Step 17, Lane 6 only.

**Method disclosure:** Council dispatch was not available in this environment (no `/qc-council`
sub-rater spawn path from this agent). Performed the equivalent independent empirical
investigation myself: read all three diffs in full, re-derived and re-ran the FR-41-15
statement-aware census against the live code, ran `check-ungated-paint-rules.py`, traced the
`submenuBorderRadius` fix by hand through the actual helper function, and cross-checked every
DELETE/CONVERT/KEEP claim against the real files rather than trusting the commit messages.

---

## 1. Two-surface DELETE proofs (the council's core mandate)

For each of the 6 DELETEs, named below is the OTHER surface and proof nothing equivalent
survives there.

| # | What was deleted | Other surface checked | Result |
|---|---|---|---|
| #3 | `render.php`'s drawer item-separator `border-top` | `style.css`'s static twin (#10, `.sgs-nav-menu__item--drawer + .sgs-nav-menu__item--drawer`) | **Both gone.** `grep -nE 'background\|border' style.css` (below) shows no such rule; only a comment at line ~251 explains the deletion. Statement-aware PHP census returns 0 hits for this shape. |
| #4 | drawer hover `background:` 12% tint (`sgs_hover_guarded_rule`) | the bar-scoped twin is #6, a separate row, checked next | Fully absent from all 6 PHP files (census scan, 0 hits). |
| #6 | bar-scoped sublink hover `background:` surface tint | same mechanism, checked against #4 above — different selector scope (`$uid_sel` vs `.sgs-nav-drawer $uid_sel`), both independently absent | Absent. |
| #5 | drawer current-page `border-left`+`background` tint | superseded by the item border's Current state (nav-menu-css.php line 288: `[aria-current="page"]::before{...}` via `$item_bg_current_decl`) and `submenuLinkBgCurrent`/current-colour row in nav-menu-submenu-css.php:650 | Both replacement mechanisms verified present and live; old hardcode absent. |
| #8 | featured sub-item hover `background:` (dead-vars `--sgs-nm-featured-bg-hover`/`--sgs-nm-featured-colour-hover`) | grepped whole tree for both custom-property names | **Zero hits anywhere** (`grep -rn "sgs-nm-featured-bg-hover\|sgs-nm-featured-colour-hover" plugins/sgs-blocks/src/ plugins/sgs-blocks/includes/` → no results) — the dead writer-less vars are gone completely, not just their consuming rule. |
| #10 | `style.css` static twin of #3 | `render.php`'s #3, checked above | Both gone — confirmed via direct diff of `070fbc9a8`/`61a141fbf`'s `style.css` hunk: the rule is replaced with a `⛔ DELETED (Spec 41 FR-41-15 census #10)` comment. |

**Verdict on the council's named scenario** ("census #3 deleted in PHP while #10 survives in
style.css leaves the double-line bug fully intact"): **did not happen.** Both #3 and #10 are
confirmed deleted, in the same commit (`61a141fbf`), with the commit message itself naming the
two-surface reasoning explicitly.

Also independently verified: **FR-41-4 item 7** (`{featured_sel}::after{content:none;}`, deleted
because the bar it suppressed no longer exists) — absent from all `includes/nav-menu-*.php`
files; only a comment remains explaining the deletion.

## 2. CONVERTs — attribute-driven half kept, ungated fallback removed

- **#1** (`border:0` panel suppression) — now conditional: `nav-menu-submenu-css.php` line ~760
  emits `border:0` only when `! $sgs_nm_submenu_border_box` (i.e. only when
  `submenuBorderWidth` is unset). The `background:` half was already attribute-driven and is
  untouched. Confirmed live in the file.
- **#7** (featured sub-item resting paint) — confirmed at `nav-menu-submenu-css.php` line 673:
  `background-color:var(--sgs-nm-featured-bg);` — no `var(..., primary-transparent)` fallback
  left; `background-color:` not `background:`, so it can no longer reset a sweep's
  `background-image`. The writer that produces `--sgs-nm-featured-bg` is conditional
  (empty-guarded), matching the CONVERT's stated gate.
- **#9** (bar submenu panel, 5-declaration table) — confirmed all 5 fates:
  `background-color`/`background-image`/`min-width` NO CHANGE (still attribute-driven, still
  present verbatim); `border-width`/`border-style`/`border-color` now read
  `submenuBorderWidth`/`submenuBorderStyle` via custom properties + `sgs_border_states_css()`
  (Normal-only, per FR-41-9); `box-shadow` reads `submenuShadow`/`submenuShadowColour` via
  `sgs_shadow_value_composed()`. `border-radius` — see the follow-up fix below.
- **The two bar `[aria-current="page"]` rules** — `font-weight:600` hardcode confirmed replaced
  by `itemFontWeightCurrent` (nav-menu-css.php:229-232); `--sgs-nm-submenu-current-colour`
  confirmed to now have a real writer (`nav-menu-submenu-css.php:562`, from
  `submenuColourCurrent`) where before it was dead-but-firing (0 writers, 1 consumer).

## 3. KEEPs — verified for the stated reason, not omission

- **#2** (drawer sub-item `border-left` indent, `nav-menu-submenu-css.php` line 768) — still
  present, unconverted, exactly as before. This matches its stated reason (structural indent
  measurement, not stateful) — it was correctly left alone rather than accidentally surviving.
- **#11** (`.sgs-nav-menu__drill-back-btn` border-bottom) — still present in `style.css` line
  401-403, unchanged. Matches its stated reason (JS-injected chrome, not an `.sgs-nav-menu__link`
  or `<li>`, so FR-41-7's item-border mechanism cannot reach it).

## 4. Re-run census #1 — statement-aware Python over the 6-file PHP module set

Reproduced FR-41-15's exact statement-aware scan (joins `$css .=`/helper-call statements to
their terminating `;` before testing for `background`/`border` declarations) and ran it over
all 6 files that now make up the nav-menu PHP surface (verified via `ls` — render.php +
nav-menu-markup.php + nav-menu-css.php + nav-menu-treatments.php + nav-menu-trigger-css.php +
nav-menu-submenu-css.php):

```
=== render.php (0 hits) ===
=== nav-menu-markup.php (0 hits) ===
=== nav-menu-css.php (9 hits) ===
139  border-radius (itemBorderRadius, attribute-driven)
284  ::before item-background fill layer (FR-41-23, gated)
314,317  border-width/style (attribute-driven)
378  position:relative;border-bottom-color:transparent (sweep band)
386  sweep ::after gradient band
391  sweep hover-position via sgs_hover_state_rules
461  featured pill resting paint (gated on $featured_bg_active)
561  featured hover radius via sgs_hover_state_rules
=== nav-menu-treatments.php (1 hit) ===
206  sgs_hover_state_rules — sweep glyph hover reset (gated)
=== nav-menu-trigger-css.php (1 hit) ===
95  burger hover fill via sgs_hover_state_rules (gated on burger_hover_slug)
=== nav-menu-submenu-css.php (6 hits) ===
91   mega-trigger button reset (background:none — DISMISSED shape)
376  bar submenu panel (census #9, all attribute-driven)
673  featured sub-item resting paint (census #7, CONVERTED — gated)
698  subtoggle button reset (DISMISSED shape)
760  drawer submenu panel border:0 (census #1, CONVERTED — conditional)
768  drawer sublink border-left (census #2, KEEP)

TOTAL: 17 statements across 6 files
```

**Zero of the six DELETE rows (#3, #4, #5, #6, #8, #10) appear.** Every remaining hit is either
a step-15 attribute-gated emission or one of the spec's own GATED/DISMISSED/KEEP/CONVERT rows.
This matches the commit's own disclosed proof (17 statements, "every one either a step-15
attribute-gated rule or an FR-41-15 GATED/DISMISSED row").

## 5. Re-run census #2 — `grep -nE 'background|border'` over `style.css`

```
64:	background-color: var(--wp--preset--color--accent, currentColor);    [indicator, DISMISSED]
65:	border-radius: var(--wp--custom--border-radius--medium, 8px);        [indicator, DISMISSED]
110:	box-sizing: border-box;                                              [not a paint decl]
116:	transition: background-color ...                                    [not a paint decl]
181:	background: none;                                                    [burger reset, DISMISSED]
182:	border: none;                                                        [burger reset, DISMISSED]
183:	border-radius: var(--wp--custom--border-radius--medium, 8px);        [burger shape, DISMISSED]
192:	transition: background-color ...                                    [not a paint decl]
204:@supports not (...) {                                                 [a11y rescue, DISMISSED]
207:		background-color: rgba(128, 128, 128, 0.12);                     [a11y rescue, DISMISSED]
224:		border: 1px solid ButtonText;                                     [forced-colors, DISMISSED]
380:	background: var(--sgs-nm-submenu-bg, inherit);                       [drill panel, DISMISSED]
401:	background: none;                                                    [drill-back-btn reset, KEEP #11]
402:	border: 0;                                                           [drill-back-btn reset, KEEP #11]
403:	border-bottom: 1px solid color-mix(...);                             [drill-back-btn, KEEP #11]
```

**Census #10 (the drawer item-separator static twin) does NOT appear** — confirmed deleted.
Only comment-prose at lines 251-253 references it, explaining the deletion, not a live rule.

Every live declaration remaining maps to a pre-existing GATED/DISMISSED/KEEP row from FR-41-15's
own tables — none is new, none is the deleted #10.

## 6. `check-ungated-paint-rules.py --survey --block sgs/nav-menu`

```
CENSUSED — real hardcoded/ungated paint  (5)
  .sgs-nav-menu__indicator :: background-color: var(--wp--preset--color--accent, currentColor)
  .sgs-nav-menu__indicator :: border-radius: var(--wp--custom--border-radius--medium, 8px)
  .sgs-nav-menu__burger :: border-radius: var(--wp--custom--border-radius--medium, 8px)
  .sgs-nav-menu__bar--drawer[data-drill-enhanced] ... .sgs-nav-menu__submenu :: background: var(--sgs-nm-submenu-bg, inherit)
  .sgs-nav-menu__drill-back-btn :: border-bottom: 1px solid color-mix(...)

TOTAL: 5 CENSUSED / 11 scanned declaration(s)
```

**This does NOT literally read zero, contradicting the plan's stated pass bar.** I traced why
and confirm this is a **known tool-heuristic gap, not a new or live defect, and not something
introduced by steps 15/16**:

1. **None of these 5 selectors were touched by either commit** — verified via
   `git show 070fbc9a8 -- style.css | grep -iE "indicator|burger|drill-back-btn|drill-enhanced"`
   (zero output) and the same against `61a141fbf`'s style.css hunk (only the #10 deletion
   touches that file). These lines pre-date the phase entirely.
2. **All 5 are already written up in FR-41-15's own GATED/DISMISSED/KEEP tables** with named,
   falsifiable reasons the detector's heuristic doesn't yet implement: `.indicator`'s
   background-color has a real cross-file writer with a longhand property (detector's
   var()-with-writer exemption doesn't correlate a static-CSS `var()` against a PHP-side
   writer in a different file); both `.burger` and `.indicator` border-radius are
   token-defaulted SHAPE, not state PAINT (no exemption category for this distinction yet);
   the drill-enhanced panel background is attribute-driven with a structurally load-bearing
   `inherit` fallback (same cross-file-writer gap); `.drill-back-btn`'s border-bottom is
   JS-injected chrome outside the item-border mechanism's reach (a semantic exemption the
   detector has no way to know).
3. **The commit that executed the census (`61a141fbf`) already disclosed this exact finding
   verbatim** in its own message: *"`check-ungated-paint-rules.py --survey --block sgs/nav-menu`
   reports 0 PHP-side findings and 5 in `style.css`, all five of which FR-41-15 itself
   classifies as DISMISSED ... or KEEP (#11)."* This is not something the diff tried to hide —
   it was surfaced at commit time and independently reproduced here with the identical count
   and the identical 5 selectors.

**Conclusion:** the tool's own disclosed limits (printed in its `--survey` output, items 1-4)
already state it is heuristic and incomplete on exactly this shape (cross-file writer
correlation, shape-vs-paint distinction, semantic reachability exemptions). Treating this as a
live defect blocking Step 17 would be treating a documented, pre-existing tool limitation as if
it were new work product — it is neither new, nor a paint defect, nor unaddressed; it is named,
reasoned, and matches the FR-41-15 table exactly.

## 7. `submenuBorderRadius` follow-up fix (`14b807364`) — traced, not trusted

Read the actual code rather than the commit message:

- `block.json:782-785` — `submenuBorderRadius` is `"type":"object"`, `"default":{}`, a FLAT
  corner object (topLeft/topRight/bottomRight/bottomLeft), matching `itemBorderRadius`'s shape.
- `helpers-box.php:207-222` — `sgs_corner_object_shorthand( $box )`: if `$box` is not an array,
  returns `null`. For `$box = []` (the declared default), all four `$box[key] ?? ''` reads are
  `''`, all four `sgs_css_length_value('')` calls return `''`, so the "all four empty" branch
  fires and the function **returns `null`**.
- `nav-menu-submenu-css.php` (post-fix): `$sgs_nm_submenu_radius_shorthand =
  sgs_corner_object_shorthand( $attributes['submenuBorderRadius'] ?? null );` then
  `if ( null !== $sgs_nm_submenu_radius_shorthand && '' !== $sgs_nm_submenu_radius_shorthand )`
  gates the `--sgs-nm-submenu-radius:...;` write.
- For an **untouched nav** (attribute at its declared default `{}`): the helper returns `null`
  → the `if` guard is false → **no property is written at all** → the consuming rule's own
  fallback chain, `border-radius:var(--sgs-nm-submenu-radius, var(--wp--custom--border-radius--medium, 8px))`,
  resolves to `var(--wp--custom--border-radius--medium, 8px)` — **identical to pre-fix
  behaviour**, where the property was also never written (old dead-but-firing
  `submenuRadius` attribute had no writer path either, since it was deleted at step 9/10).

**Confirmed genuinely byte-identical for an untouched nav, by tracing the mechanism, not by
trusting the commit message.**

Also confirmed: `submenuRadius` (the old attribute name) no longer appears anywhere in
`block.json` or any `includes/*.php` file except inside the explanatory comment in
`nav-menu-submenu-css.php` describing its own deletion.

## 8. Supporting checks

- **`php -l`**: clean on all 6 files (render.php, nav-menu-markup.php, nav-menu-css.php,
  nav-menu-treatments.php, nav-menu-trigger-css.php, nav-menu-submenu-css.php).
- **`node scripts/hover-guard/check.js`**: PHP surface — 2,112 functions scanned, 0 within-
  function findings; 100 cross-file calls to registered shared emitters, 100 resolve clean, 0
  flagged unguarded. CSS surface: NOT RUN (`build/` absent on this machine — matches the
  commit's own disclosed `[gates-ok:...]` note; this is an environment gap, not a code defect).
- **`grep -rnE "hoverStyle|underlineColour|underlineThickness|underlineOffset"`** over the block
  dir + nav-menu includes: **zero matches** — the FR-41-4 underline mechanism is fully removed.
- **`check-dead-controls.js`**: `OK — 0 net-new dead controls across 83 blocks` (matches the
  commit's claim of 0 net-new after step 16). Two nav-menu attrs (`submenuAnimation`,
  `sublinkMarkerColour`) appear only in CHECK 4, an ADVISORY-only, pre-existing, non-build-
  failing bucket — not new, not gating.

---

## Verdict: **GO**

Every DELETE has a written, independently-verified two-surface proof (§1). Every CONVERT kept
its attribute-driven half and dropped only the ungated fallback (§2). Both KEEPs are confirmed
kept for their stated reason (§3). Both re-run census commands (§4, §5) show zero of the six
DELETE rows surviving anywhere. `php -l`, hover-guard's reachable half, and the dead-controls
gate all pass or match their disclosed state. The `submenuBorderRadius` follow-up fix is
confirmed byte-identical for an untouched nav by tracing the actual helper function, not by
trusting its commit message.

**One documented deviation from the plan's literal pass bar:** Check 3
(`check-ungated-paint-rules.py --survey`) reports **5 CENSUSED**, not zero. Investigated and
confirmed this is a **pre-existing tool-heuristic gap** (cross-file `var()`-writer correlation,
shape-vs-paint distinction, JS-chrome semantic exemption — none of which the detector implements
yet), touching **5 selectors none of which steps 15/16 modified**, all 5 of which are already
named with falsifiable reasons in FR-41-15's own GATED/DISMISSED/KEEP tables, and all 5 of which
were already disclosed verbatim in commit `61a141fbf`'s own message before this review started.
This is not a live or half-fixed defect in the census execution — it is the detector's own
disclosed limit, unrelated to this diff's scope. `[gates-ok:pre-existing check-ungated-paint-
rules.py heuristic gap — 5 findings are all named FR-41-15 DISMISSED/KEEP rows on selectors
neither step 15 nor step 16 touched, cross-verified against git diff]`.

Step 17 (Lane 6) may proceed.
