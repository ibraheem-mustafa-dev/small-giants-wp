<?php
/**
 * Title: Mega Menu — Simple Links
 * Slug: sgs/mega-menu-simple-links
 * Categories: mega-menu-layouts
 * Block Types: core/template-part/mega-menu
 * Keywords: mega menu, navigation, links, simple, single column
 * Viewport Width: 1200
 * Inserter: true
 * Description: Single column of labelled navigation links with an optional section heading. Suits menus with a modest number of top-level destinations.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50","left":"var:preset|spacing|50","right":"var:preset|spacing|50"}}},"backgroundColor":"surface","layout":{"type":"constrained","contentSize":"1200px"}} -->
<div class="wp-block-group has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--50);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--50)">

	<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}},"typography":{"textTransform":"uppercase","letterSpacing":"0.08em","fontWeight":"600"}},"textColor":"text-muted","fontSize":"small"} -->
	<p class="has-text-muted-color has-text-color has-small-font-size" style="margin-bottom:var(--wp--preset--spacing--30);text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Section heading</p>
	<!-- /wp:paragraph -->

	<!-- wp:list {"className":"sgs-mega-link-list","style":{"spacing":{"padding":{"left":"0"}},"typography":{"lineHeight":"2.4"}}} -->
	<ul class="wp-block-list sgs-mega-link-list" style="padding-left:0;line-height:2.4">
		<!-- wp:list-item -->
		<li><a href="#">Link one</a></li>
		<!-- /wp:list-item -->
		<!-- wp:list-item -->
		<li><a href="#">Link two</a></li>
		<!-- /wp:list-item -->
		<!-- wp:list-item -->
		<li><a href="#">Link three</a></li>
		<!-- /wp:list-item -->
		<!-- wp:list-item -->
		<li><a href="#">Link four</a></li>
		<!-- /wp:list-item -->
		<!-- wp:list-item -->
		<li><a href="#">Link five</a></li>
		<!-- /wp:list-item -->
	</ul>
	<!-- /wp:list -->

</div>
<!-- /wp:group -->
