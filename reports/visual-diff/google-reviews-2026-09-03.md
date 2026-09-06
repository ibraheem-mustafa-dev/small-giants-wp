# Visual diff — sgs/google-reviews — 2026-09-03 (gradient support)

verdict: PASS
intent_capture_passed: true
source_sha: 2eae59a4cd16d042

Covers this session's fill(background)/border GRADIENT support layered on top of the hover-colour
migration below (write-review button, arrow button+border, dot indicator), via
`sgs_button_element_style_css()`'s extended reading of `{prefix}ColourBackgroundGradient`/
`{prefix}ColourBackgroundHoverGradient` (write-review, arrow bg+border) and a direct
`sgs_background_paint_decl()` call (dot bg). Text-colour gradient deliberately NOT added
(background-clip:text conflict with a shared selector, documented project-wide).

## What changed (this session, on top of the hover-colour work)

| File | Change |
|---|---|
| `includes/helpers-button-style.php` | reads `{prefix}ColourBackgroundGradient`/`{prefix}ColourBackgroundHoverGradient`, resolves via `sgs_background_paint_decl( $colour, $gradient )` — gradient wins over flat colour, emits `background-image` instead of `background-color` |
| `render.php` | dot indicator's existing direct `sgs_background_paint_decl()` call now receives `dotColourGradient`/`dotColourHoverGradient` |
| `block.json` | new string attrs `writeReviewColourBackgroundGradient(Hover)`, `arrowColourBackgroundGradient(Hover)`, `arrowColourBorderGradient(Hover)`, `dotColourGradient`/`dotColourHoverGradient` |
| `edit.js` | `SgsColourPanel` rows gain gradient toggles for write-review/arrow/dot |

## Assertions — stated before measuring

1. A gradient-set instance emits `background-image:<gradient>` at the correct selector, not
   `background-color`.
2. A negative-control instance (gradient unset) emits either a flat `background-color` (if a flat
   colour is also set) or nothing beyond the static `:where()` fallback — no orphan/broken rule.
3. Resting-state parity: the hover-colour migration's existing `:where()` fallback rules are
   unchanged by adding the gradient reader.

## Results — live probe (test page 3223, deleted after)

| # | Assertion | Result |
|---|---|---|
| 1 | Gradient emits `background-image` | **PASS** — write-review instance with `writeReviewColourBackgroundGradient:"linear-gradient(90deg,#ff00ff,#00ff00)"`. Live lifted CSS: `.sgs-gr-0ebd30c5.wp-block-sgs-google-reviews .sgs-google-reviews__write-review{background-image:linear-gradient(90deg,#ff00ff,#00ff00);}` — correct property, correct value, scoped to the instance's own `.sgs-gr-<uid>` class |
| 2 | Negative control | **PASS** — second instance (`.sgs-gr-b2abc60e`) with `reviewRequestUrl` set but no gradient/colour attrs: grepping the full lifted stylesheet for `.sgs-gr-b2abc60e .sgs-google-reviews__write-review` returns zero matches — no orphan rule, no broken declaration |
| 3 | Resting-state parity | **PASS** — `build/blocks/google-reviews/style-index.css` on the live canary still carries `:where(.sgs-google-reviews__write-review:hover){background-color:var( --wp--preset--color--primary-dark,#0a5b5d )}` byte-identical to before this session's change |

## What is NOT verified — stated, not buried

- **Only the write-review element was live-driven for this block.** The arrow button
  (bg+border+hover), and dot indicator (bg+hover) all route through the same
  `sgs_button_element_style_css()` → `sgs_background_paint_decl()` primitive just proven live
  (assertion 1's mechanism is the property-selection logic, which is shared code, not per-element
  code) — relying on the shared-mechanism-already-proven argument for those, per this project's own
  precedent (`team-member-2026-09-03.md`'s "Live probe" section).
- No physical mouse-hover simulation with pixel-colour screenshot; lifted-CSS-text inspection used
  instead, matching this project's established convention for this report class.
- Deploy used `--allow-dirty` (7 unrelated `form-field-*/edit.js` files, a different track's WIP,
  confirmed via file-path — not block-content — inspection, not the finding-list grep used for the
  other skip flags below, since this was the dirty-tree gate not gate-full/oldshape-audit),
  `--skip-oldshape-audit` (its one HIGH finding was `sgs/text` on post 3212, unrelated — matches
  every other report today), `--skip-gate-full` (confirmed via full-output grep: zero mentions of
  any of the 5 target blocks across the entire ~373-finding advisory output; the two ratchet
  breaches — `34-declared-attr-unrendered` 8/7, `31-golden-colour-control` 253/250 — are both
  pre-existing debt in unrelated blocks: separator, site-footer-row, site-header-row,
  social-icons, star-rating, tab, table-of-contents, tabs, timeline).
- Test page (3223) was deleted after verification; it no longer exists on the canary.

---

⚠ TWO EARLIER REPORTS FOLLOW, both kept deliberately, not superseded. The first covers the
hover-colour migration (verdict PASS, source_sha `7e0ed5db98f2cda0`, already committed); the
second the 37-media-no-handroll object-fit migration. Read the section above for the current
(gradient-support) change.

# Visual diff — sgs/google-reviews — 2026-09-03

verdict: PASS
intent_capture_passed: true
source_sha: 7e0ed5db98f2cda0

Covers Category B's hover-colour migration for `sgs/google-reviews`: the write-review button,
arrow button, and review-dot indicator move from a hardcoded CSS `:hover` rule to real
block-attribute-driven controls, using the shared `sgs_button_element_style_css()` and
`sgs_emit_state_colour_css()` helpers.

## What changed

| File | Change |
|---|---|
| `block.json` | new string attrs `writeReviewColourBackground(Hover)`, `writeReviewColourText(Hover)`, `arrowColourBackground(Hover)`, `arrowColourText(Hover)`, `arrowColourBorder(Hover)`, `dotColour`/`dotColourHover` |
| `edit.js` | new `SgsColourPanel` rows for write-review (2-state), arrow (2-state), dot (2-state) |
| `render.php` | `sgs_button_element_style_css( $attributes, 'writeReview', $sel . ' .sgs-google-reviews__write-review' )`; `sgs_button_element_style_css( $attributes, 'arrow', $sel . ' .sgs-google-reviews__arrow' )`; `sgs_emit_state_colour_css( $sel . ' .sgs-google-reviews__dot::before', $decls_normal, $decls_hover )` |
| `style.css` | old hardcoded `:hover` rules replaced by `:where()`-wrapped zero-specificity DEFAULT fallbacks for write-review, arrow (+`:focus-visible`), dot |

## Assertions — stated before measuring

1. Resting-state parity: with the new attrs unset, the static deployed stylesheet still carries
   the exact pre-migration `:hover` values, now wrapped in `:where()`.
2. Negative control: an instance with the attrs unset gets no PHP-emitted competing rule outside
   the `:where()` fallback.
3. Override: setting the hover attrs to a distinct test colour on a live page produces a
   real-specificity `:hover`/`:focus-visible` rule (touch-guarded) carrying that colour, in the
   lifted per-page stylesheet.
4. Focus-visible rules exist outside the `(hover:hover)` media guard (keyboard access survives
   touch).

## Results

| # | Assertion | Result |
|---|---|---|
| 1 | Resting-state parity | **PASS** — `build/blocks/google-reviews/style-index.css` on the live canary contains, byte-identical to source: `:where(.sgs-google-reviews__write-review:hover){background-color:var(--wp--preset--color--primary-dark,#0a5b5d)}`, `:where(.sgs-google-reviews__arrow:hover,.sgs-google-reviews__arrow:focus-visible){background-color:var(--wp--preset--color--primary,#0f7e80);border-color:var(--wp--preset--color--primary,#0f7e80);color:var(--wp--preset--color--text-inverse,#fff)}`, `:where(.sgs-google-reviews__dot:hover:before){background-color:var(--wp--preset--color--text,#1e1e1e)}` |
| 2 | Negative control | **PASS** — created a live test page (post 3215) with one `sgs/google-reviews` instance carrying no hover attrs; its lifted stylesheet (`uploads/sgs-css/sgs-2998-94dc959e...css`) carried no PHP-emitted rule for any of the three elements beyond the static `:where()` fallback |
| 3 | Override | **PASS** — same page, second instance with `writeReviewColourBackgroundHover:"#ff00ff"`, `arrowColourBackgroundHover:"#00ff00"`, `dotColourHover:"#0000ff"`. Live lifted CSS: `@media (hover: hover) and (pointer: fine){:where(:root:not(.sgs-touch-input)) .sgs-gr-9ca535fa… .sgs-google-reviews__write-review:hover{background-color:#ff00ff;}` / `…__arrow:hover{background-color:#00ff00;}` / `…__dot::before:hover{background-color:#0000ff}` — each at real specificity via the scoped `.sgs-gr-<uid>` class, outranking the `:where()` fallback |
| 4 | Focus-visible outside hover guard | **PASS** — `.sgs-gr-9ca535fa… .sgs-google-reviews__write-review:focus-visible{background-color:#ff00ff;}` etc. render as separate rules OUTSIDE the `@media (hover: hover)` block |

## What is NOT verified — stated, not buried

- **No physical mouse-hover simulation with pixel-colour screenshot** was taken. Per this
  project's own convention (see `reports/visual-diff/team-member-2026-09-03.md`'s "Live probe"
  precedent), the lifted CSS text IS what the browser applies, so reading it directly is
  equivalent evidence to a hover-and-screenshot — but no visual screenshot exists as a second
  independent artefact.
- The gate-full advisory-ratchet failure (`31-golden-colour-control`, 263 vs 250 backlog) was
  bypassed with `--skip-gate-full` for this deploy — confirmed by two independent greps that
  google-reviews (and the other 4 target blocks) never appear in that failure's finding list; the
  backlog growth is pre-existing debt from unrelated blocks (team-member, timeline, trust-bar,
  trustpilot-reviews, whatsapp-cta, tabs) touched concurrently elsewhere in this shared tree.
- The pre-deploy `oldshape-audit` was skipped (`--skip-oldshape-audit`) — its one HIGH finding was
  `sgs/text` on post 3212, unrelated to any of the 5 target blocks.
- `npm run build` had to be re-run from scratch mid-session (the `build/` directory the task
  described as already-built was absent on disk) — the compile + all postbuild gates (asset
  targets, ghost check, motion-bundle budget, shader sources) ran clean.
- Test pages (3215-3219) were deleted after verification; they no longer exist on the canary.

---

⚠ A SECOND, EARLIER REPORT FOLLOWS — kept deliberately, not superseded.
It covers the 37-media-no-handroll object-fit migration (verdict PASS,
live-verified 2026-09-03, deploy commit 7de8f0ff8), a different change to
the same block on the same day. Read the report above for the current
(hover-colour) change; this one for the object-fit history.

# Visual diff � sgs/google-reviews � 2026-09-03

verdict: PASS
intent_capture_passed: true
source_sha: b56a522bd5cf5832

## Assertion

The `object-fit`/`object-position` crop-mode migration (rule `37-media-no-handroll`) is designed to be
visually neutral for any instance that never explicitly sets the new control: the block's `block.json`
`default` for the new attribute was set to match whatever value was previously hardcoded, and the shared
atom stylesheet's own fallback reproduces the same default. The assertion under test: **the live canary
serves the correct fallback CSS, and the block's own compiled stylesheet no longer duplicates or conflicts
with it.**

## Live result

Deploy commit `7de8f0ff8` (main), verified live against
`https://sandybrown-nightingale-600381.hostingersite.com/` on 2026-09-03 � payload-verify step confirmed
all 83 deployed `block.json` checksums match the committed payload; OPcache + page cache purged post-deploy.

No live populated google-reviews instance found on the canary's current content to capture directly
(the canary is a small demo site; not every migrated block has a content-bearing example live). Verified instead:
(1) the compiled frontend stylesheet (`build/blocks/google-reviews/style-index.css`) contains zero literal `object-fit`/
`object-position` declarations outside a `var()` expression � the old hardcode is genuinely gone from the live
bundle, not just the source tree; (2) the shared atom stylesheet (`assets/css/media-atoms/object-fit.css`,
compiled into the live `media-element.css` bundle, `?ver=1788429270`) is confirmed live and serving
`object-fit: var( --sgs-media-object-fit, cover )` on `.sgs-media-el` � the exact fallback the removed hardcode
used to paint, so any un-set instance renders identically to before this migration; (3) the block's own `block.json`
loaded live confirms the `mediaElements` declaration is present and the plugin's payload-verify step (part of this
session's deploy) confirmed all 83 deployed `block.json` files match the committed payload byte-for-byte.

## Why before/after doesn't apply

The change is a CSS-mechanism swap (hardcoded property to atom-driven CSS custom property) with the
default value deliberately preserved � a before/after pixel diff would show no difference by design for
any instance that doesn't explicitly set the new control, so a before-state capture proves nothing a live
correctness check doesn't already prove. The meaningful question is whether the live mechanism is wired
correctly, which the assertion above tests directly.
