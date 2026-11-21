# Checkout findings: fact-check verdict (2026-11-21 night)

Checked by an independent read-only checker against main `4a95a195e` and the lab (whose `0049a1680` is the same change as main's `109aa6d53` for these files); saved by the main session (the checker could not write). Lightly shortened.

Counts: 9 confirmed, 5 corrected, 0 wrong, 5 partly checked (cited files hold, live measurements not re-run).

- checkout-1: confirmed. Both proposal problems present; the frame row has no `run`; `template-piece-frame.mjs::place` takes `tree[0].innerBlocks` and drops the `#FBF3DC` wrapper. `109aa6d53` says the frame piece replaces no draft element, so half (1) is open on main and this stream's (`template-piece-frame.mjs`); half (2), the lock icon rule, is the general session's. Cite `109aa6d53`, not `0049a1680`.
- checkout-2: confirmed. Eye Care report: 42 of 112 parts paired, 40 unpaired, 27 with no locator, 18 conflicts; verify compared 644, matched 585, differs 59; none of the unpaired parts is compared, so 585 of 644 tests none of them. Mama's pairs 74 of 112. The `line-item-name` conflict is 10 against 11, not 14px.
- checkout-3: corrected (the fix, not the claim). No route file writes `placeOrderButtonLabel`, `sgsCheckoutStrings`, `showFormStepNumbers` or the checkout options. But (a) `placeOrderButtonLabel` and the step titles live on WooCommerce's inner blocks (`woocommerce/checkout` holds only `align`, `showFormStepNumbers`); (b) `data/part-look-modes.json` already has `from.text` with `label:true` and `hasAmount` (used for `addToCartLabel`, `addToCartShowPrice`, product-card `ctaText`), reusable for the button words (whether it can write inner blocks is unchecked); `template-piece-account.mjs` is the page-words pattern; (c) the terms block has a `text` attribute. Size L may be too large.
- checkout-4: corrected (layer, site, size). 36 uses confirmed; error text 9.5px. Not a theme fault: a per-client value in `sites/eye-care-ward-end/theme-snapshot.json`, made by `plugins/sgs-blocks/scripts/theme-extractor/token_families.py::pick_font_scale` ("small is the smallest token in use below body", picking the draft's `--size-9-5`). Affects `eye-care-clone-test` and its lab copies only (`eye-care-test` has its own snapshot; Mama's small is 13px). Owner not this stream; the extractor is not assigned in BRIEF to the general session either. Size above M: the extractor rule changes every client's snapshot on re-extract, and a floor in the commerce look changes every site's checkout; both need render-scope. No error-text setting confirmed (DB, plugin, theme, Customizer).
- checkout-5: corrected (cause 2 wrong). `sgsSidebarWidth` is a DB row part-look evaluates on both clients; status `not-written`, reason `initial value`, code `undeclared`: `fill-part-look.mjs` writes a size only where the draft states it, and the draft's summary width is a `1fr` grid track. Fix: part-look's size rule reads a grid track as the sidebar width. WooCommerce's sidebar is a fixed 360px (`commerce-look/summary.php`). Cause 1 holds (the woo-layout piece writes no width).
- checkout-6: confirmed (`option` conflicts on `sgsOptionBackground` #FCEBBE vs #FFFFFF and `sgsOptionShadow`; `sgsOptionPadding` written 10/16/10/16).
- checkout-7: confirmed (`sgsFieldLabelPosition` has no `css_element`; nothing writes it; the overlap is a labelled hypothesis).
- checkout-8: corrected: no plugin item needed. `woocommerce/checkout-actions-block` has `priceSeparator` (default "·"), editable and printed via `::after`; an empty separator removes the dot (content work, with checkout-3). The framework DB does not list WooCommerce's native inner-block attributes. Height part confirmed: `sgsButtonMinHeight` undeclared because the draft declares `height:66px`, not `min-height`.
- checkout-9: confirmed, minor (no `level`; template apply skipped).
- checkout-10: partly checked.
- checkout-11: confirmed, minor (no placement setting anywhere; Mama's hand-finished mirror shows the same order).
- checkout-12: confirmed, minor (`giftLabelFont*` styles the field label, not the tile lines).
- checkout-13: confirmed, minor (the terms block's `text` exists, so the conditional plugin item does not apply).
- checkout-14, 15, 16, 18: partly checked (16's lock is checkout-1 half 2).
- checkout-17: confirmed (known, general session).
- checkout-19: confirmed, minor (no WooCommerce motion targets).

## Shared causes

checkout-1 (2) and 16's lock: one rule. checkout-5 (2) and 8's height: one function (`fill-part-look.mjs`'s stated-size rule: sidebar width only when declared; reads `min-height`, not `height`). checkout-8's separator, 3, 10's words and 14's note: one content step. checkout-2, 6's chosen tile and 13's notice: one fix to the `wc` locators. checkout-4 and 18: already linked.

## New, unchecked

Eye Care's report lists cover 109 of 112 parts (3 in no list). The hand-finished table names `sgsFocusRests`, but no "Focus" attribute exists on `woocommerce/checkout` in the DB.
