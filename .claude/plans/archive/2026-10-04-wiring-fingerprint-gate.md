---
title: Wiring-fingerprint gate
project: small-giants-wp
created: 2026-10-04
status: done
parent: .claude/plans/2026-10-04-eye-care-sweep-audit-fix.md (Session 0)
---

# Wiring-fingerprint gate

**Goal:** a fast-tier gate that proves every painting SGS setting is wired end to end (declared, control, editor
canvas, front end, CSS reader, editor/front-end channel parity), blocks any NEW gap, and records today's gaps as a
ratchet baseline. Built from the read-only prototype in `.claude/reports/2026-10-04-route-data-audit/fingerprint/`
(`fingerprint_scan.py`, `editor-facts.js`; design in that folder's `../README.md` §1).

**Why:** every existing attribute gate proves an attribute is read, never that it paints; container's grid-item
settings passed them all while broken in the editor and on most grid cells (Bean, 2026-10-04).

## Global Constraints

- Gate inputs: block source files, `block.json`, the extension roster, the check-dead-controls dump
  (`node scripts/check-dead-controls.js --dump-json`) and the framework DB opened read-only
  (`sqlite3.connect('file:<db>?mode=ro', uri=True)`, path `~/.claude/skills/sgs-wp-engine/sgs-framework.db`). Never the
  calibration cache (`scripts/computed-route/cache/` is gitignored and absent in the deploy worktree); it may only
  annotate a report when present. Never import `scripts/converter/db/db_lookup.py`.
- No hard-coded machine paths: resolve the repo from the script's own location.
- Bean's decision D2 (2026-10-04): the gate BLOCKS NEW gaps only. Every gap present at build time goes into
  `plugins/sgs-blocks/scripts/wiring-fingerprint-baseline.json`; `--check` exits 1 only for a gap not in the baseline,
  and reports (exit 0) gaps that disappeared so the baseline can be tightened. `--update-baseline` rewrites it.
- Bean's decision D1 (2026-10-04): grid-item defaults are a uniform style for every cell of a grid, whatever block the
  cell is; only text colour is inherited by the cell's children. A CSS reader that only reaches a cell when the cell
  is one specific block (`… > .sgs-<block>`) is a gap (link C1), never a valid pattern.
- Registered in `plugins/sgs-blocks/scripts/gates.json` as tier `fast` with a `budget_ms` measured on this machine,
  next to `check-dead-controls` / `check-editor-render-parity`.
- Python files one responsibility each (split collectors, classifier, baseline/CLI); JS files ≤400 lines.
- Every behaviour has a test that fails without it (fixtures under the gate's own test folder, run by
  `python -m pytest` or the repo's existing Python test convention — check `plugins/sgs-blocks/scripts/tests/`).
- UK English in comments and messages. Code comments describe current behaviour only.
- Commit straight to `main` with an explicit `-- <paths>` pathspec; never stage `.claude/reports/*` modifications from
  other sessions or "Eye Care Fix Register- Bean Points.md".

## Task 1: CHECK A's block-context exemption requires a real consumer

`plugins/sgs-blocks/scripts/check-editor-render-parity.js::checkEditorCanvasDesync` exempts any attribute that
sources a `providesContext` key (`providesContextAttrs`, built from `meta.providesContext` alone). Change the exemption
to apply only when at least one block's `block.json` `usesContext` lists that context key AND that consumer block's
editor or render code reads it (`context['<key>']` / `context[ '<key>' ]` in its edit JS or PHP). An orphan context key
(no consumer) no longer exempts. MUST FAIL test: a fixture block providing a context key no block uses is flagged; the
same fixture with a consumer block that reads the key is not. Today's real effect: container's `sgs/gridItem*` keys
are orphans (the only 6 in the framework), so its grid-item canvas findings surface; if CHECK A is advisory, they are
reported, and the existing `editor-render-parity-baseline.json` mechanism decides blocking (add them to the baseline
with the reason "Session 0 grid-item repair" so the gate stays green until that repair lands).

## Task 2: `check-wiring-fingerprint.py`, the fast-tier gate, with every council-proven blind spot fixed

Port the prototype into `plugins/sgs-blocks/scripts/wiring-fingerprint/` (a package split by job: inputs, paint
classification, editor facts, front-end channel, CSS consumers, links, baseline/CLI) with a thin entry
`plugins/sgs-blocks/scripts/check-wiring-fingerprint.py` (`--check`, `--update-baseline`, `--json <file>`). Gap identity:
`<block>::<attr>::<link>`. Links: L2 control, L3 editor canvas, L4 front-end read, L5 channel, L6 consumer, L7
editor/front-end channel parity, C1 child-conditional reader, S1 `editor.css` specificity shadowing, plus the bug-class
rules below. The editor-facts collector (`editor-facts.js` in the prototype) moves in as a JS file ≤400 lines.

**Blind spots to fix (QC council 2026-10-04: four raters, sampled and census verdicts in
`.claude/reports/2026-10-04-route-data-audit/council/`):**

Population (what counts as "paints"):
1. Paint is decided from the source and the DB role, never from the calibration cache: `css_property` set; role in an
   explicit paint list (typography, color, colour-gradient, layout, styling, visual, number-css-px, position —
   `roles.classification` cannot do it); the name ends in a CSS-bearing suffix after stripping Mobile/Tablet/Desktop/
   Hover/Unit (add TextIndent, Saturate, Blur, WritingMode, TextWrap); read by an `includes/*.php` emitter; a class
   modifier with a matching style rule. Three categories: css, js (a data attribute read by view.js, `anim:`/`fx:`
   pseudo-properties), content/not-paint. Unit companions are not paint. Rater B's census: ~1,310 of 2,212 "not-paint"
   rows paint (`rater-b-notpaint-reclassified.csv`).
2. Every run prints the population sizes and the not-paint reasons; an unclassified attribute fails loudly.

Front-end channel (L5, prototype precision 2.5%):
3. Follow variables to the end of the function (no 2-hop cap) and through helper return values; treat
   `wp_style_engine_get_styles` and known emitter helpers as declarations (`sgs_border_radius_tiers` alone is ~55 rows).
4. Custom properties anywhere in a string (`--sgs-[a-z0-9-]+\s*:`), including `{--x:` and `;--x:`.
5. Class modifiers with `__` in them and array appends (`$classes[] = …`); each class must have a matching rule in the
   block's css/scss (nested `&--x` parsed) or `includes/`/theme CSS, else L6.
6. Data-attribute channels (`data-sgs-*`, `sgsAnimation*`) as their own js channel.
7. Forwarded values (nested `render_block` attrs, function arguments, loop keys, dynamic keys `$attributes[$k . 'X']`);
   a value used only as a gate condition counts as a read.
8. Block context: search the consumer's PHP, not the parent's.
9. Exclude the attribute's own anchor literal from the declaration test (60 false passes: `margin`, `padding`, `gap`);
   delete the prototype's `or True` in `helper_channel` (18 false passes).
10. Hook-registered emitters in `includes/` (`shadowLiftOnHover`, `fillOnDark`, `megaAlign`, `triggerSurface`,
    `*HoverTreatment`, `animation-stagger.php`): index every `includes/*.php` file's `$attributes['x']` literals.

Controls (L2, prototype precision ~10%):
11. Computed `setAttributes` keys: `shadowAttrKeys`, media-atom `mediaStoredAttrName`, descriptor-row tables written
    through `[attr]` (`cart/panelColourRows.js`), `const next = {…}; setAttributes(next)`, `typoTarget('', …)`; accept a
    quoted attribute literal in any block editor file that calls `setAttributes`; do not reject files by name.
12. Extension and variation controls (`extensions/animation.js` block-edit filter, block.json variations).

Editor canvas (L3, prototype precision 95%, count understated and overstated):
13. Control-panel props are not canvas reads: widen `CONTROL_CONTAINERS` to the `Sgs*Panel/Picker/Control/Override`
    and `*Controls?/Panel/Toggle/Select` families (≥111 false credits).
14. ServerSideRender credits a block only when unconditional; a conditional SSR (`product-card` `isBound`,
    `card-grid` WooCommerce/CPT modes, `brand-strip` empty logos) credits only the attributes that branch renders
    (163 false credits).
15. Follow barrel re-exports (`export *`, `export {}`, `utils/index.js`) and resolve the media-atom canvas helper
    (`components/media/canvasStyle.js::elementCustomProperties`).
16. Hover, focus, active, scrolled and motion attributes report as their own advisory class (`L3-state`), never as a
    blocking canvas gap and never as a pass.
17. Tier parity: an editor preview reading only one device tier (`counter/edit.js` `padding?.desktop`) is L3-tier.

Parity, consumers and bug classes:
18. L7 implements its documented exemption (the editor reads the attribute straight into a real property) and resolves
    dynamic names (`'--sgs-sep-g-' . $axis`) by prefix; unrelated custom properties sharing a statement do not count.
19. L6 is real: no `not decl` exemption; index `build/`-time injected CSS from the postbuild injectors; strip `//` in
    `.scss`; keep declarations that precede a nested rule.
20. Bug-class rules: a scoped uid hash that omits `$block->context` while the block reads context
    (`accordion-item`); a root-prefix helper call (`''`) with no root control (`team-member`, `google-reviews`); a
    `> .sgs-<block>` reader without its `__inner` depth (container); C1 per Spec 32 FR-32-12 (2026-10-04 scope).

Engineering:
21. No absolute paths (resolve from `__file__`; DB path from the same resolver other gates use); deterministic output
    (sorted sets/keys); input freshness (regenerate the dead-controls dump and editor facts in-process or hash them
    against their sources); runtime measured and set as `budget_ms`.

**Acceptance (measured, not asserted):**
- On Rater A's labelled rows (`rater-a-verdicts.csv`), precision per link ≥90% for L2, L5, L7, and L3 stays ≥95%.
- Every setting calibration proved paints (`scripts/computed-route/cache/*.json` `settings{}`, used as a test oracle
  when present, never at gate runtime) has no L5 or L7 finding, or the finding names a proven render bug.
- Rater B's reclassified painting rows are inside the paint population; its 902 true not-paint rows are outside it
  (≥95% agreement either way; list the disagreements in the report).
- The three known framework bugs each produce a finding under its bug-class rule.
- One fixture per link and per bug-class rule turns red without that rule; a baseline test (new gap fails `--check`,
  baselined passes, fixed one reported as removable).
- Report the new totals (population, full, partial by link) beside the prototype's, and register the gate in
  `gates.json` (tier fast) with the baseline generated from the real repo; `python plugins/sgs-blocks/scripts/run-gates.py
  --tier fast` passes for this gate.

## Minor findings carried

Triaged by the final whole-branch review (2026-10-04): `readsContextKey`'s left boundary is fixed in this plan's
review fixes; the shared context-consumed helper, the split of `check-editor-render-parity.js` and the three further
orphan context keys are Session 0 group S0-7 of `plans/2026-10-04-eye-care-sweep-audit-fix.md`; the
`getConsumedContextKeys` full scan is speed only (the check runs in 3.7 s) and stays as is.
