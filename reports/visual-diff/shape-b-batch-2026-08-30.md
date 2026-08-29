# Visual diff — Shape-B border migration, batch 2 (32 blocks) — 2026-08-30

verdict: PASS
intent_capture_passed: true
source_sha: (this commit — see `git log -1`)

## Scope

`scripts/migrate-border-shape-b.js --fix --apply` run against the 32 `NATIVE_FULL`
blocks the survey marked READY (of 37 candidates; 5 REFUSE — `sgs/card-grid`,
`sgs/media`, `sgs/multi-button`, `sgs/pricing-table`, `sgs/trust-bar` — all
`ambiguous-anchor` except `pricing-table`, which a sibling agent separately
renamed off its reserved `style` attr and migrated on `main`; excluded here to
avoid a concurrent write to the same three files):

accordion-item, before-after, brand-strip, buybox, countdown-timer, counter,
cta-section, feature-grid, form, form-field-tiles, form-step, gallery,
google-reviews, hero, info-box, nav-drawer, notice-banner, physics-canvas,
post-grid, product-faq, product-faq-item, site-footer, site-footer-row,
site-header, site-header-row, tab, table-of-contents, tabs, team-member,
testimonial, testimonial-slider, trustpilot-reviews.

Each block's `block.json` + `edit.js` + `render.php` moved atomically from
WP-native `style.border` (shared, coerced) to private `borderWidth` /
`borderStyle` / `borderColour` / `borderColourGradient` / `borderRadius(+Tablet/Mobile)`
attributes, per Shape B. 8 theme pattern files (5 footer, 3 header) were
migrated in the same atomic write because they authored a native border WP
would otherwise silently drop once the block's native border support is
private. Two of the migration's own inferences carry an explicit sign-off flag:
(a) a dead `border-style` (author never set one, so the border painted nothing
under the old code) is repaired to `solid`; (b) a colour token was stored as a
bare slug in 8 places across the same pattern files — the migration writes the
full `var:preset|color|…` token so `sgs_colour_value()` resolves it instead of
sanitising it into an unresolvable custom-property name.

## Assertions (stated before measuring)

1. Every migrated block still parses (`php -l`) and still builds — the private
   attrs replace the native ones with no dangling reference to the removed
   `style.border.*` reads.
2. A border set via the new private attributes paints on the frontend with the
   correct width, style and colour, at the block's own root selector.
3. **Negative control:** `borderStyle: "none"` (the default) with a width and
   colour still set paints NO border — the private path preserves the
   D726/G5 "style set, no width ⇒ no border" rule the WP-native path already
   enforced.
4. Border radius (base/tablet/mobile) continues to render from the block's own
   `borderRadius*` attres now that the composite mirror no longer routes
   through WP-native `style.border.radius`.
5. The colour is stored as a palette token slug (or a bare gradient string),
   not a baked hex — a later re-skin still moves it.

## Tier 1 — build + static (done, this session)

- `npm run build`: 72 gates. **Started at 6 FAIL, closed at 3 FAIL** — the 3
  remaining are pre-existing/out-of-scope, not caused by this migration (see
  "Gates not fixed" below). The 3 fixed were genuine migration-tool defects
  (see "Defects found and fixed").
- `php -l` on all 32 changed `render.php`: **32/32 clean, 0 errors.**
- Spot-checked 4 of the 32 (`counter`, `brand-strip`, `buybox`,
  `table-of-contents`) by reading the diff end-to-end: every new border/radius
  write lands in the SAME `$scoped_css[]` array the block already prints
  through its existing `<style><?php echo wp_strip_all_tags( implode( '',
  $scoped_css ) ); ?></style>` sink — not a variable that dead-ends.
- `git diff --stat`: exactly 32 blocks × 3 files (96) + 8 pattern files + the
  auto-generated `roster.json` (1 line, a real paint-declaration count drop).
  No file outside that set touched; `pricing-table` is absent from the diff.

## Tier 2 — live frontend probe (NOT YET RUN — needs deploy)

```
node scripts/qa/check-border-roundtrip.js --blocks sgs/accordion-item,sgs/before-after,sgs/brand-strip,sgs/buybox,sgs/countdown-timer,sgs/counter,sgs/cta-section,sgs/feature-grid,sgs/form,sgs/form-field-tiles,sgs/form-step,sgs/gallery,sgs/google-reviews,sgs/hero,sgs/info-box,sgs/nav-drawer,sgs/notice-banner,sgs/physics-canvas,sgs/post-grid,sgs/product-faq,sgs/product-faq-item,sgs/site-footer,sgs/site-footer-row,sgs/site-header,sgs/site-header-row,sgs/tab,sgs/table-of-contents,sgs/tabs,sgs/team-member,sgs/testimonial,sgs/testimonial-slider,sgs/trustpilot-reviews
```

This is the correct instrument (not 32 PNG captures) because it authors a
positive instance + a negative control per block and reads *computed* styles
from the live DOM — the only way to prove assertions 2 and 3 above. **It has
not been run**: this worktree does not deploy (one deploy at the end, run by
the coordinator). Result to be filled in after that deploy:

```
sgs/accordion-item       NOT RUN
sgs/before-after         NOT RUN
sgs/brand-strip          NOT RUN
sgs/buybox               NOT RUN
sgs/countdown-timer      NOT RUN
sgs/counter              NOT RUN
sgs/cta-section          NOT RUN
sgs/feature-grid         NOT RUN
sgs/form                 NOT RUN
sgs/form-field-tiles     NOT RUN
sgs/form-step            NOT RUN
sgs/gallery              NOT RUN
sgs/google-reviews       NOT RUN
sgs/hero                 NOT RUN
sgs/info-box             NOT RUN
sgs/nav-drawer           NOT RUN
sgs/notice-banner        NOT RUN
sgs/physics-canvas       NOT RUN
sgs/post-grid            NOT RUN
sgs/product-faq          NOT RUN
sgs/product-faq-item     NOT RUN
sgs/site-footer          NOT RUN
sgs/site-footer-row      NOT RUN
sgs/site-header          NOT RUN
sgs/site-header-row      NOT RUN
sgs/tab                  NOT RUN
sgs/table-of-contents    NOT RUN
sgs/tabs                 NOT RUN
sgs/team-member          NOT RUN
sgs/testimonial          NOT RUN
sgs/testimonial-slider   NOT RUN
sgs/trustpilot-reviews   NOT RUN
```

`NOT RUN` is unproven, never a pass (per this batch's own known-traps list) —
these rows are placeholders for whoever runs the probe post-deploy, not a
claimed result.

## Defects found and fixed (migration-tool bugs, not hand-patched business logic)

Both were caught by re-running the full 72-gate build after `--apply`, not
assumed from the tool's own "self-tested" claim:

1. **Double-comma import corruption in 9 of the 32 `edit.js` files**
   (`brand-strip`, `counter`, `hero`, `notice-banner`, `physics-canvas`,
   `site-footer-row`, `site-header-row`, `table-of-contents`, `testimonial`).
   Where the block's PRE-EXISTING import from `../../components` already ended
   its last specifier with a trailing comma (multi-line style), the codemod's
   insertion produced `LastExistingImport,,\n\tSgsBorderControl,` — a second,
   stray comma. Confirmed by `git diff` on each file; this is a JS-syntax
   defect the tool's own self-test (168 assertions, negative controls) did not
   catch because its harness apparently exercised only the single-line import
   shape, exemplified by `accordion-item`'s clean diff. `php -l` could not see
   this (JS, not PHP) — caught by `check-empty-inspector-containers`,
   `check-undefined-refs` and `check-duplicate-controls`, all of which report
   `PARSE-FAIL`/`parse-error` on exactly these 9 files at the exact reported
   line. Fixed by removing the single duplicate comma per file — no other
   change.
2. **Missing `PanelBody` import in `accordion-item/edit.js`.** The codemod
   inserted a `<PanelBody title="Border">...</PanelBody>` wrapper assuming the
   target block already imports `PanelBody` from `@wordpress/components` (true
   for the other 31, which all use `PanelBody` elsewhere) — false for
   `accordion-item`, which had zero prior `PanelBody` usage and zero prior
   `@wordpress/components` import. `check-undefined-refs` caught the two
   resulting `ReferenceError`-at-runtime references (lines 159, 182). Fixed by
   adding `import { PanelBody } from '@wordpress/components';`.

Both fixes are mechanical (a stray character; a missing import line) and
change nothing about which attributes are read, written, or rendered — they
are not the kind of "hand-patch a refused block into submission" this task
was told to avoid; no block refused, and no border-shape/attribute-mapping
decision was altered.

## A third codemod defect, found by the coordinator, fixed here

After the two defects above, the coordinator's own `fix-11-radius` track found a
THIRD one while migrating a different 11 blocks with the same tool:
`transformBlockJson` never emitted `supports.sgs.boxFamilies.borderRadius`.
Without it the DB seeder cannot derive `css_tier` for `borderRadius` /
`borderRadiusTablet` / `borderRadiusMobile` -- all three collapse onto
`(border-radius, element=NULL, state=NULL, tier=NULL)` and the resolver raises
`AmbiguousLayerAttrError` at clone time. Proof: `sgs/pricing-table` was migrated
by the codemod without the entry and produced 4 `db-consistency` findings; the
11 blocks migrated alongside it had the entry added by hand and produced none.
The fix landed on `main` (`8e8a19a09`) with `--self-test` at 170/65.

**This migration's 32 blocks were all migrated by the codemod BEFORE that fix**,
so all 32 were missing the entry too. After merging `8e8a19a09`:
27 of the 32 genuinely lacked `boxFamilies.borderRadius` (5 already had it --
`before-after`, `brand-strip`, `countdown-timer`, `counter`,
`table-of-contents` -- from an earlier partial fix). Patched all 27
`block.json` files with the exact shape the fixed codemod emits
(`boxFamilies.borderRadius: ["borderRadiusTablet","borderRadiusMobile"]`), via
the same `JSON.stringify(bj, null, '	')` + EOL-preserving serialisation the
tool itself uses, verified as valid JSON and as a minimal (4-8 line) diff per
file with the private border attrs (`borderWidth` etc.) still intact.

Then ran the prescribed reconciliation: `extract-signatures.py --task-a-only`
(regenerates `css-property-classifications.json`) and `sgs-update-v2.py
--stage 1` (reseeds `sgs-framework.db` with the 212 new attr rows these 32
blocks needed -- this is what `migrate-tier-object-db-parity` had been waiting
on the whole time). `db-consistency --check` now exits **0** (`0 NEW, 1
baselined` -- the long-standing unrelated `sgs/nav-drawer` variant-discriminator
finding).

Also re-applied and re-verified the two `transformEditJs` fixes from the section
above on top of the merged `main` state (a first merge attempt silently lost
them along with the boxFamilies work when `git stash`/`git stash pop` interacted
badly with an intervening `git merge --ff-only`; caught by re-running
`--self-test` and seeing 170/65 instead of the expected 175/67, and by
`--survey` reporting all 32 blocks back as `NATIVE_FULL` after a bad
`git checkout-index -f -a` reverted working-tree files the index still had
correct -- recovered by restoring from the index and re-applying both fixes,
not by re-doing the whole migration). Final state, independently re-verified
after recovery: `--self-test` 175 assertions / 67 negative controls;
`--survey` 0 READY / 4 REFUSE (unchanged); all 32 `block.json` files confirmed
to carry both `boxFamilies.borderRadius` and the private border attributes;
`db-consistency --check` exits 0.

## Gates not fixed (pre-existing or cross-track, not this migration's debt)

Full build after all of the above: **3 of 72 gates still FAIL** (`migrate-tier-object-db-parity`
is now gone, resolved by the boxFamilies fix + reseed above):

- **`check-undeclared-attrs`** (4 findings: `before-after`, `product-faq-item`,
  `site-footer`, `site-header` — each destructures `style` from `attributes`
  without a `block.json` declaration). `git blame` on every flagged line dates
  to 2026-07-31/2026-08-16, before this migration touched these files; the
  diff for each of these 4 files does not add or move that line. Pre-existing.
- **`check-render-undefined-vars`** — fails because PHPStan/`vendor/` is not
  installed in this fresh worktree (`vendor/` is gitignored; the gate says so
  explicitly). Unrelated to border work; would fail identically on this
  worktree with zero border changes applied.
- **`check-editor-render-parity`** (CHECK A) — `178 net-new against a ceiling
  of 177`, entirely `sgs/trust-bar` findings (`gridItemPadding`,
  `gridItemBackground`, etc. — attrs a control writes but nothing reads back
  on the editor canvas). `sgs/trust-bar` is not one of this migration's 32
  blocks and is untouched by this diff (`git blame` on its `edit.js` shows
  nothing newer than 2026-05-31). Verified reproducible with ZERO of this
  migration's changes present at all: checked out committed `main`
  (`4af7a059b`) into a disposable worktree and ran the gate there directly —
  same `178 / ceiling 177` failure. Pre-existing on `main`, not this
  migration's debt.

## Not live-proven

- **All 32 blocks' Tier 2 assertions** — the probe needs the code deployed,
  and this worktree does not deploy. See the placeholder table above.
