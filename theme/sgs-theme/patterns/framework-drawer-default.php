<?php
/**
 * Title: SGS Framework Menu Drawer — Default
 * Slug: sgs/framework-drawer-default
 * Categories: sgs-drawers
 * Block Types: core/post-content
 * Post Types: sgs_drawer
 * Keywords: drawer, menu, mobile, panel, sgs, framework, default
 * Viewport Width: 480
 * Inserter: true
 * Description: The standard SGS slide-out menu panel — the site navigation with the logo beneath it. This is the panel the burger button opens, and it matches the drawer that ships inside the default SGS header.
 *
 * @package SGS\Theme
 */

?>

<?php
/*
 * W2-a. Byte-for-byte the drawer that framework-header-default.php embeds as a
 * sibling of sgs/site-header (its lines 42-45). That equality is deliberate and
 * load-bearing, not decorative:
 *
 *  - It is the GATE 2 parity subject. Gate 2 asks one question — does the drawer
 *    rendered from its own CPT post paint identically to the pre-CPT
 *    pattern-embedded default? — and that question is only answerable if the two
 *    sides carry IDENTICAL attributes. A "close enough" starter would make any
 *    difference unattributable: mechanism, or content?
 *  - It is what `wp sgs drawer seed-starter sgs/framework-drawer-default` creates,
 *    so the migration W2-d performs next session starts from a known-equal state.
 *
 * If the header pattern's drawer changes, change this in the same commit or Gate 2
 * silently stops comparing like with like.
 *
 * `{"ref":0}` = resolve the menu by LOCATION at render time. Never bake a menu id
 * (D338 silent-coercion class).
 */
?>
<!-- wp:sgs/nav-drawer -->
<!-- wp:sgs/nav-menu {"ref":0} /-->
<!-- wp:sgs/responsive-logo {"width":140,"linkToHome":true} /-->
<!-- /wp:sgs/nav-drawer -->
