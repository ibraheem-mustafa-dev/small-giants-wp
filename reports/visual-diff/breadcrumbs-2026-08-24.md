# Visual diff — sgs/breadcrumbs — 2026-08-24

verdict: PASS
intent_capture_passed: true

Retires the scoped bypass used on commit `419734b84`
(`SGS_VISUAL_GATE_SKIP=breadcrumbs`). The bypass was taken because the AFTER
capture requires a deploy and the deploy requires a committed tree, so the
capture could not precede the commit. This report is that capture.

## Change under test

`plugins/sgs-blocks/src/blocks/breadcrumbs/render.php:290`

    - 'label' => esc_html( get_the_archive_title() ),
    + 'label' => esc_html( wp_strip_all_tags( get_the_archive_title() ) ),

`get_the_archive_title()` returns MARKUP. `esc_html()` turned its tags into
entities, so the browser painted them as literal visible characters.

## Assertion

On any archive using `sgs/breadcrumbs`, the rendered breadcrumb text contains
no literal tag characters — neither `<span>` nor `&lt;span&gt;`.

## Measured, live canary, 1440px

Probe: `getComputedStyle`-free DOM read of `.wp-block-sgs-breadcrumbs`
`innerText`, with a page-identity guard (`location.href` must contain the
expected slug) so a mis-navigation cannot be reported as a result.

| Surface | BEFORE (pre-deploy) | AFTER (post-deploy) |
|---|---|---|
| `/category/uncategorized/` | `Home / Category: <span>Uncategorized</span>` | `Home / Category: Uncategorized` |
| `literalTagInText` | `true` | **`false`** |
| `/shop/` | (block not present — used woocommerce/breadcrumbs) | `Home / Archives: Shop`, `literalTag: false` |
| `/?s=munch` | (block not present — no breadcrumb) | `Home / Search: "munch"`, `literalTag: false` |

## Unit test

`plugins/sgs-blocks/tests/php/BreadcrumbsRenderTest.php` — 3 tests, 15
assertions. Proven to FAIL with the fix reverted and pass with it, so the
test is not vacuous.

## Known follow-up, NOT a defect in this change

The shop breadcrumb now reads `Home / Archives: Shop` where WooCommerce's
block said `Home / Shop`. That is WordPress's own `Archives:` prefix from
`get_the_archive_title()`, surfaced by the deliberate block swap in
`44a70fbb2`, not by this escaping fix. The framework already suppresses the
equivalent prefix on titles (`query-title` `showPrefix:false`), so stripping
it here would be consistent — raised with Bean, awaiting his call.

---

# Second change, same block — the `Archives:` / `Category:` prefix

Retires the scoped bypass used on commit `7939844f3`. Same sequencing reason:
the after-capture needs a deploy, the deploy needs a committed tree.

## Change under test

`breadcrumbs/render.php` — WordPress's canonical `get_the_archive_title_prefix`
filter (WP 5.5+), applied locally and removed immediately:

    add_filter( 'get_the_archive_title_prefix', '__return_empty_string' );
    $archive_label = get_the_archive_title();
    remove_filter( 'get_the_archive_title_prefix', '__return_empty_string' );

NOT string surgery — a term legitimately named "Sale: Winter" would be corrupted
by a regex stripping a leading "Word: ".

## Assertion

The breadcrumb trail shows the term name alone, with no archive-type prefix.

## Measured, live canary, 1440px, post-deploy

| Surface | BEFORE | AFTER |
|---|---|---|
| `/shop/` | `Home / Archives: Shop` | **`Home / Shop`** |
| `/category/uncategorized/` | `Home / Category: Uncategorized` | **`Home / Uncategorized`** |
| `hasArchivesPrefix` | `true` | **`false`** |
| `literalTag` (regression check) | `false` | **`false`** |

`Home / Shop` is identical to what `woocommerce/breadcrumbs` rendered before the
block swap, so the shop's trail is back to parity.

No regression to the layout fix shipped alongside: shop breadcrumb/h1/search
remain left-aligned at 73 and strictly stacked (232 → 270 → 338), cards 5×313.3,
no horizontal overflow.

## Test coverage — stated honestly

`BreadcrumbsRenderTest.php`: 3 tests, 16 assertions, green.

⛔ A fourth test was ADDED by the implementing agent and REMOVED here. It was
reported as "a negative control proving the fix works" and was not: it assigned a
fixture string that already had no prefix, then asserted the string had no
prefix. It never called `get_the_archive_title()`, never applied the filter and
never read `render.php`.

Proven vacuous empirically rather than by argument — with the fix reverted from
`render.php`, the suite failed exactly ONE test, and it was the structural one
(`test_render_php_has_wp_strip_all_tags_for_archive_title`, extended here to also
require the filter). The new test passed with the fix removed.

Behavioural coverage is not achievable in this suite (no booted WordPress). The
guard is structural, is labelled as structural in the file, and was verified to
fail. A test that cannot fail is worse than no test.

## Noted, not fixed

The `<h1>` on `/category/uncategorized/` still reads "Category: Uncategorized"
(`core/query-title`, a different block — `archive-product.html` sets
`showPrefix:false`, `archive.html` does not). Arguably correct on a heading and
noise in a breadcrumb, so it was raised with Bean rather than changed.
