<?php
/**
 * Title: Mega Menu — Card Grid
 * Slug: sgs/mega-menu-card-grid
 * Categories: mega-menu-layouts
 * Block Types: core/template-part/mega-menu
 * Keywords: mega menu, cards, grid, categories, products, sectors, auto-fit
 * Viewport Width: 1200
 * Inserter: true
 * Description: Auto-fit grid of equal cards — each with a heading, short description, and a link. Works for 3–6 cards. Ideal for Products, Sectors, or Services menus.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/container {"tagName":"div","style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50","left":"var:preset|spacing|50","right":"var:preset|spacing|50"}}},"backgroundColor":"surface","contentWidth":"1200px"} -->
<div class="wp-block-group has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--50);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--50)">

	<!-- wp:sgs/text {"text":"Browse by category","textTransform":"uppercase","letterSpacing":0.08,"letterSpacingUnit":"em","fontWeight":"600","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}}},"textColour":"text-muted","fontSize":"small"} /-->

	<!-- wp:sgs/container {"layout":"grid","gridTemplateColumns":"1fr 1fr 1fr 1fr","gridTemplateColumnsMobile":"1fr","className":"sgs-mega-panel--cards","gap":"var:preset|spacing|30"} -->
	<div class="wp-block-columns sgs-mega-panel--cards">

		<!-- wp:sgs/container -->
		<div class="wp-block-column">
			<!-- wp:sgs/container {"tagName":"div","className":"sgs-mega-card sgs-mega-card--gradient","style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"layout":"flex","justifyContent":"space-between","flexDirection":"column"} -->
			<div class="wp-block-group sgs-mega-card sgs-mega-card--gradient has-background" style="border-radius:12px;padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
				<!-- wp:sgs/text {"text":"Category one","fontSize":"1rem","fontWeight":"700","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} /-->
				<!-- wp:sgs/text {"text":"Short description of what this category includes.","fontSize":"0.8rem","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} /-->
				<!-- wp:sgs/text {"text":"<a href=\"#\" style=\"color:inherit;text-decoration:none\">Browse &rarr;</a>","fontSize":"0.85rem","fontWeight":"600"} /-->
			</div>
			<!-- /wp:sgs/container -->
		</div>
		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container -->
		<div class="wp-block-column">
			<!-- wp:sgs/container {"tagName":"div","className":"sgs-mega-card sgs-mega-card--gradient","style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"layout":"flex","justifyContent":"space-between","flexDirection":"column"} -->
			<div class="wp-block-group sgs-mega-card sgs-mega-card--gradient has-background" style="border-radius:12px;padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
				<!-- wp:sgs/text {"text":"Category two","fontSize":"1rem","fontWeight":"700","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} /-->
				<!-- wp:sgs/text {"text":"Short description of what this category includes.","fontSize":"0.8rem","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} /-->
				<!-- wp:sgs/text {"text":"<a href=\"#\" style=\"color:inherit;text-decoration:none\">Browse &rarr;</a>","fontSize":"0.85rem","fontWeight":"600"} /-->
			</div>
			<!-- /wp:sgs/container -->
		</div>
		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container -->
		<div class="wp-block-column">
			<!-- wp:sgs/container {"tagName":"div","className":"sgs-mega-card sgs-mega-card--gradient","style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"layout":"flex","justifyContent":"space-between","flexDirection":"column"} -->
			<div class="wp-block-group sgs-mega-card sgs-mega-card--gradient has-background" style="border-radius:12px;padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
				<!-- wp:sgs/text {"text":"Category three","fontSize":"1rem","fontWeight":"700","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} /-->
				<!-- wp:sgs/text {"text":"Short description of what this category includes.","fontSize":"0.8rem","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} /-->
				<!-- wp:sgs/text {"text":"<a href=\"#\" style=\"color:inherit;text-decoration:none\">Browse &rarr;</a>","fontSize":"0.85rem","fontWeight":"600"} /-->
			</div>
			<!-- /wp:sgs/container -->
		</div>
		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container -->
		<div class="wp-block-column">
			<!-- wp:sgs/container {"tagName":"div","className":"sgs-mega-card sgs-mega-card--gradient","style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"layout":"flex","justifyContent":"space-between","flexDirection":"column"} -->
			<div class="wp-block-group sgs-mega-card sgs-mega-card--gradient has-background" style="border-radius:12px;padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
				<!-- wp:sgs/text {"text":"Category four","fontSize":"1rem","fontWeight":"700","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} /-->
				<!-- wp:sgs/text {"text":"Short description of what this category includes.","fontSize":"0.8rem","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} /-->
				<!-- wp:sgs/text {"text":"<a href=\"#\" style=\"color:inherit;text-decoration:none\">Browse &rarr;</a>","fontSize":"0.85rem","fontWeight":"600"} /-->
			</div>
			<!-- /wp:sgs/container -->
		</div>
		<!-- /wp:sgs/container -->

	</div>
	<!-- /wp:sgs/container -->

</div>
<!-- /wp:sgs/container -->
