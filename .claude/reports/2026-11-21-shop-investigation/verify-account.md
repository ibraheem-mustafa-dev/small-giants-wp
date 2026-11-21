# Account findings: fact-check verdict (2026-11-21 night)

Checked by an independent read-only checker against main `4a95a195e` and the lab; saved here by the main session (the checker could not write). Lightly shortened. Part-look's account passes had not run at 21:52, so the look findings were checked against the code, the framework database and the draft-only reports (`account\pl-mm-in`, `account\pl-ec-in`). No commit since noon fixes any of these (92a404f90 only adds selectors).

Counts: 11 confirmed, 9 corrected, 0 wrong, 0 unverifiable. Corrections that change what gets built: account-1, 2, 11, 12, 17.

- account-1: corrected. With only `orderDetailLook` on, `helpers-account-order-detail.php::sgs_account_order_detail_html` prints heading, date and status only, as its header and editor help say ("Replaces WooCommerce's order page with the parts in the panels below"); part-look writes `orderDetailLook` for Mama's and none of the three part switches. Root cause: the route writes the look without its parts; the plugin change is optional hardening that changes any look-only site. `od-row` and `od-text` locators already find lines inside the draft's boxes at all three widths, so an `orderDetailBoxes` rule can key on them; only the steps and item locators are missing.
- account-2: corrected. Clearfix cause confirmed (`.sgs-account .col2-set:before{content:none}` loads before WooCommerce's `.woocommerce .col2-set::before`, equal specificity). Wrong that the card rule sets no width: `style.css` has `.sgs-account .woocommerce-Address { float: none; width: auto; }`, which loses to `.woocommerce .col2-set .col-1`; the proposed selector only ties it and still loses (WooCommerce loads later): needs one more class or an id. The 58px title belongs to account-12.
- account-3: confirmed (same clearfix loss on `#customer_login`; not re-testable now because registration is off).
- account-4: corrected. Facts hold (registration `no`, generated passwords `yes`, only `site-build.mjs` calls `runAccountRegistration`, both drafts draw a chosen password). Owner wrong: `lib/site-build-account-registration.mjs` and `clone-surface.mjs` are not this stream's files; the surface-run wiring is the general session's.
- account-5: confirmed (0 of 98 Eye Care parts; `openItemInPage` never treats the card itself as the control; Eye Care's rows are `<button onClick="{{ o.open }}">`).
- account-6: confirmed (8 and 7 menu items; tab names "left to the block"; 5 mode rules only).
- account-7: corrected, minor. No border, fill or shadow setting for `menuItem`/`menuLink` (DB and motion checked); current-state rows never written. The Eye Care half is wrong: `menuActiveIndicatorStyle` is a mode with no part and `menuSidebarBorderWidth` a normal row, neither a current-state row. `menuIndicator` has no live selector.
- account-8: confirmed (orders look paints fill, hover fill, padding and hairline only; no row border, corner or gap setting; `ordersRowTextDecoration` has no part).
- account-9: confirmed.
- account-10: confirmed (no route file writes `sgs/customer` or `sgsConditionLoggedIn`; `Customer_Binding::KEYS` holds `first_name`, `display_name`).
- account-11: corrected. Declaring the save buttons as built-in buttons claims a missing setting that exists: `loginButtonScope: "all-forms"` already gives the sign-in button's preset and look to register, lost-password, account-details save and address save (`helpers-account-look-css.php::sgs_account_login_look_css`); `accountSaveFullWidth` exists. Real gap: a route rule writing `loginButtonScope`. The mode rules (columns, cards, display name) are missing as claimed.
- account-12: corrected. 1,066 settings, 603 with a part, 463 without, 132 unit companions. Look settings with no part: 97 (90 type, 7 border or radius), not 98, PLUS about 47 painted layout spacing and size settings counted as "need no part" (`authPairGap`, `resetFormPadding`, `accountFieldsetPadding`, `navWidth`, painted in `helpers-account-cells-css.php` / `helpers-account-render-css.php`): about 144 in all. Cause not proved: `addressTitle` declares `prefix` and `clusters`, which the seeder's prefix convention (`extract-signatures.py::_load_element_manifest_reverse`) should map without attrMap, and `orderDetailText` has no attrMap yet its font-size row has a part. Why the convention fails is open.
- account-13: confirmed, minor (picture path is `E:\sgs-tmp\template-rework\lab\shots\r5\`).
- account-14: confirmed, minor.
- account-15: confirmed as a hypothesis, minor.
- account-16: confirmed, other owner (604 at 375 with the header, 375 without; 1567 at 1440).
- account-17: corrected, minor. The full-width button is never written, but `width` IS read by `fill-part-look.mjs` (`FAMILY` maps it to length); the draft's submit buttons state no width, so it lands as undeclared. Strings keys and two missing settings confirmed.
- account-18: confirmed (fresh build: 278px of 580px).
- account-19: confirmed (page 628 on `local-mamas` not checked).
- account-20: corrected, minor: `signedOutButtonShadowHover` is current (in `block.json`, set on the hand-finished site); only `loginButtonBackgroundHover` was renamed.
- Hand-finished section: 134 Custom CSS style rules, not about 110; settings counts right.

## Shared causes

account-2 and 3 (clearfix; one edit). account-2's width half with account-18 (WooCommerce's `.col-1` float). account-12 is the database half of account-2's title, account-8's underline and account-3's frame. account-1 and 9 share the order-page locators. account-6, 7, 9 and 11 (Eye Care half) depend on account-5.

## New, unchecked

`loginButtonWidthType` and four siblings are text settings stored with `width` as their property (a draft's pixel width would be shaped into text). About 47 painted spacing and size settings of `sgs/account` have no part. `menuIndicator` (the active link's `::after`) cannot be read live.
