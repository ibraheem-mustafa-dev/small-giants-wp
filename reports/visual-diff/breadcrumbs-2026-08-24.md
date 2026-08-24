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
