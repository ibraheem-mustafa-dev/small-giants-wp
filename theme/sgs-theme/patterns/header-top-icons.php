<?php
/**
 * Title: Header — Top Icons (Cart + Account Strip)
 * Slug: sgs/header-top-icons
 * Categories: sgs-headers
 * Block Types: core/post-content
 * Post Types: sgs_header
 * Keywords: header, cart, account, my account, ecommerce, icons, top bar
 * Description: Header with a thin top-strip row carrying only the cart and My Account icons (right-aligned), separate from the main logo + navigation row below. For an ecommerce header that wants those two utility actions out of the main row entirely. Cart lives only in the top strip. My Account links to the WooCommerce My Account page, falling back to /my-account/ when WooCommerce is inactive.
 *
 * @package SGS\Theme
 */

// Resolve WooCommerce's My Account page URL the same way sgs/cart/render.php
// resolves the shop page URL — wc_get_page_permalink() when WooCommerce is
// active, a sane path fallback when it is not. wp_json_encode() produces an
// already-quoted, JSON-safe string for direct interpolation into the block
// comment's attributes object below.
$sgs_my_account_url      = ( function_exists( 'WC' ) && ! is_null( WC() ) && function_exists( 'wc_get_page_permalink' ) )
	? wc_get_page_permalink( 'myaccount' )
	: home_url( '/my-account/' );
$sgs_my_account_url_json = wp_json_encode( esc_url_raw( $sgs_my_account_url ) );

?>

<!-- wp:sgs/site-header {"align":"full","backgroundColour":"surface","headerSticky":{"desktop":"on"}} -->

<!-- wp:sgs/site-header-row {"rowSlot":"top","justifyContent":"flex-end","backgroundColour":"primary","padding":{"desktop":{"top":"8px","bottom":"8px"}},"rowHideOnScroll":{"desktop":"on"}} -->
<!-- wp:sgs/cart {"iconColour":"surface"} /-->
<!-- wp:sgs/icon {"iconName":"user","iconSize":20,"iconColour":"surface","ariaLabel":"My Account","linkUrl":<?php echo $sgs_my_account_url_json; /* phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_json_encode() output, already quoted + escaped via esc_url_raw() above. */ ?>} /-->
<!-- /wp:sgs/site-header-row -->

<!-- wp:sgs/site-header-row {"borderWidth":{"bottom":"1px"},"borderStyle":"solid","borderColour":"surface-alt","rowSlot":"middle","justifyContent":"space-between","padding":{"desktop":{"top":"var(--wp--preset--spacing--30)","bottom":"var(--wp--preset--spacing--30)"}}} -->
<!-- wp:sgs/responsive-logo {"width":300,"linkToHome":true} /-->
<!-- wp:sgs/nav-bar-menu {"ref":0,"itemColour":"text","gap":{"desktop":"28px"}} /-->
<!-- /wp:sgs/site-header-row -->

<!-- /wp:sgs/site-header -->
