# Session C2 fact-check brief — shared by every lane

You are fact-checking candidate framework gaps for the SGS WordPress block framework. **You are
read-only. You do not fix anything.** Your output is a verdict per row with a quoted citation.

## Five things that will mislead you if you do not absorb them first

1. **Raw F = 192 is a RAW machine classification.** An earlier figure of 163 is an AUDITED figure from a
   different session, which hand-audited 338 raw rows down to 163. Never compare 192 to 163. Raw to raw
   only.
2. **The count was measured at block code `7f375f765`; eye-care-test runs `94122e326`.** Register rows
   fixed between those commits still read OPEN in this triage. **Do not report them as findings.** The
   ones already proven fixed and deployed are S1, S3, S4, S5, S11, 15, 38, N46, 52, N17b, 68. Register
   87 (breadcrumb weight) already reads `clean on the walker`. Register **75/82/158 is fixed but NOT
   deployed** (`b68db67c9`, `06b22220f`), so its rows will not clear and are not gaps.
3. **A `canvas-settable` citation is a CLAIM TO TEST, never a closure.** If you meet one, say so; the
   main thread tests it live. Do not treat it as proof the row is closed.
4. **45 content rows is wrong — there are 50** (38 presence, 12 text), classed `W/content`. They are not
   framework gaps and not your rows.
5. **The canvas-settable citations number 193, not 161.** 161 was an earlier subset.

## Your verdict vocabulary — exactly one per row

| Verdict | Means |
|---|---|
| `real` | No setting on the block, its canvas, its ancestors by context, its extensions or the utilities can produce the draft value; or a hardcode beats one that can |
| `not a gap (already settable)` | A setting exists and can hold it. Name the block, the attribute, and where it already works |
| `wrong block` | The value belongs on a different block, usually a parent emitting the custom property the child consumes |
| `measuring artefact` | The walker or the route produced it, not the site |
| `decided` | Bean already decided this difference. Name the register item |

## THE CITATION GATE — non-negotiable

**Every verdict names an exact DB row with its values, or a `file::symbol`, and quotes it.** A verdict
with neither is rejected and re-run. No exceptions, including for `real`.

Query the framework DB read-only:

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT block_slug, attr_name, css_property, css_element, css_state FROM block_attributes WHERE block_slug='sgs/<block>'"
```

Open it read-only in your own scripts: `sqlite3.connect(f'file:{db}?mode=ro', uri=True)`. **Never import
`scripts/converter/db/db_lookup.py`** — it runs schema migrations on import.

## What you must check for every row, every time

1. **A control that "doesn't work" already works somewhere — find it and diff.** Query the DB for the
   same `css_property` on other blocks, then compare that block's `render.php` and `style.css` with
   yours. This single step resolves most rows.
2. **Parent settings by block context.** `providesContext` / `usesContext`.
   `accordion-item/render.php` reads `$block->context['sgs/accordionHeaderPadding']`; `sgs/container`
   carries 13 typography attributes that inherit into every descendant declaring none.
3. **Existing controls and utilities that earlier passes got wrong:**
   `sgs/button::textDecorationHover`, `sgs/nav-drawer-menu`, `.sgs-hover-underline-slide` and `-fade` in
   the theme's `utilities.css`, `.sgs-underline-slide` in the plugin's `extensions.css`,
   `sgs/button::minHeight`, `sgs/nav-drawer::chromeRowHeight`, `sgs/card-grid::imageFallbackColour`,
   `includes/helpers-shadow-hover.php`, `includes/helpers-border-style.php`, `includes/image-controls.php`,
   `includes/helpers-box.php::sgs_label_box_css_rule`.
4. **Decided register items are not gaps:** 39-43, S1, S2, S5, S12, N45, N45b, 77, 94, 68, 73, 38, 48,
   N20, and everything in the register's "Decisions" section.
5. **The four known edit-target shifts** — where the fix edits a different block from the one the row is
   filed under. Report the row under the block that would actually be edited:

| Rows filed under | The fix actually edits | Why |
|---|---|---|
| `sgs/accordion-item` gap, justify-content | **`sgs/accordion`** | `headerGap` goes on the parent, emitted as `--sgs-accordion-header-gap` |
| `sgs/buybox` border, margin, layout on the picker | **`sgs/option-picker`** | the pill is option-picker's own element |
| `sgs/mega-group` padding, transition | **`sgs/mega-panel`** | `mega-group/block.json` states it carries no styling attributes by design |
| `sgs/form-field-textarea` label gap | **`sgs/form`** | `fieldLabelGap` belongs to the Field style group on the parent |

## Rows that are NOT findings — exclude them, do not re-diagnose

- **`sgs/google-reviews` rows (14).** A parallel track owns them. Its colours and 40px sizes follow
  Google's own UI, an accepted difference from the theme and the 44px target (Bean, 2026-10-05).
- **`transition,*` rows.** `lib/calibrate-markers.mjs::markersFor` has no branch for `transition,*` and
  falls through to `return []`, so no such row calibrates anywhere. This is a known route defect in Spec
  47 §5 Residual. Register **S1** also already decided transition behaviour (`c1c660428` set
  `transitionDuration` default 300 to 0 on `sgs/button` and `sgs/heading`). Verdict these `decided` or
  `measuring artefact` with the citation, and move on.
- **The ten route defects in `.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md` §5 Residual.** None is
  your finding.

## Hard rules

- **Never commit, deploy, reseed, or touch a host.** No `build-deploy.py`, no `sgs-update`, no SSH, no
  `wp` commands, no browser against the live site. Read code, read the DB, read the triage files.
- **Never add or edit a `divergences.json` entry.**
- **Never edit the fix register.** It is correct.
- **Cite by symbol, never by line number:** `path/file.php::function_name`,
  `block.json::supports.sgs.imageControls`, `style.css::.sgs-hero__wrapper`.
- Do not reason from what a canary currently renders. The framework is pre-production.
- UK English.

## Your inputs

- Your rows: listed in your dispatch prompt, and in
  `sites/eye-care-ward-end/build/qa/triage/<surface>.json` (`class: "F"` rows only).
- The register, source of truth: `.claude/plans/2026-10-02-eye-care-fix-register.md`.
- Block source: `plugins/sgs-blocks/src/blocks/<block>/`, shared helpers in
  `plugins/sgs-blocks/includes/`, theme CSS in `theme/sgs-theme/assets/css/`.
- The DB: `~/.claude/skills/sgs-wp-engine/sgs-framework.db`.

## Your output

A Markdown table, one row per F row, plus a short prose section for anything that needs it:

| key | block | property | verdict | citation (quoted) | if `real`, what control would hold it |
|---|---|---|---|---|---|

Then: **the families you found.** Group your rows by shared cause and say how many distinct fixes your
lane really needs. A lane of 40 rows is rarely 40 fixes, and the count of distinct causes is the single
most useful thing you can tell the main thread.

Finish with: what you could NOT settle from the source alone, and exactly what live reading would settle
it.
