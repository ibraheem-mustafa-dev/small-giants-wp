<?php
/**
 * Title: Start from Scratch — Blank Header Shell
 * Slug: sgs/header-scratch
 * Categories: sgs-headers
 * Block Types: core/post-content
 * Post Types: sgs_header
 * Description: An empty sgs/site-header shell — three responsive rows (top, middle, bottom) with no content — for building a header from scratch. Add your logo, navigation and elements to each row. The mobile menu panel is included and ready to edit: whatever you put inside it is what visitors see when they tap the burger on a phone. FR-37-7 "Start from scratch" card (replaces the old registration template seed).
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-header {"align":"full"} -->
<!-- wp:sgs/site-header-row {"rowSlot":"top"} /-->
<!-- wp:sgs/site-header-row {"rowSlot":"middle"} /-->
<!-- wp:sgs/site-header-row {"rowSlot":"bottom"} /-->
<!-- /wp:sgs/site-header -->

<?php
/*
 * The mobile drawer ships with EVERY header, including this blank one.
 *
 * Why it is here and not optional: sgs/nav-menu collapses to a burger below its
 * `collapsePoint` (default 768) and opens sgs/nav-drawer by id. A header built
 * without a drawer therefore renders a burger that opens nothing — a silent
 * failure a non-coder cannot diagnose, and the exact gap the FR-37-26
 * operator-simplicity test hit on a scratch-built header (parking
 * P-HEADER-SIMPLICITY-FINDINGS finding 1).
 *
 * It is a SIBLING of sgs/site-header, never a child: the drawer's root is a
 * <dialog> that promotes to the top layer, and sgs/site-header is templateLock
 * 'all' around exactly three rows. Every other header starter places it here
 * too — keep them consistent.
 */
?>
<!-- wp:sgs/nav-drawer -->
<!-- wp:sgs/nav-menu {"ref":0} /-->
<!-- /wp:sgs/nav-drawer -->
