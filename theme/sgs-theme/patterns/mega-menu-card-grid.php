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

<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50","left":"var:preset|spacing|50","right":"var:preset|spacing|50"}}},"backgroundColor":"surface","layout":{"type":"constrained","contentSize":"1200px"}} -->
<div class="wp-block-group has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--50);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--50)">

	<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}},"typography":{"textTransform":"uppercase","letterSpacing":"0.08em","fontWeight":"600"}},"textColor":"text-muted","fontSize":"small"} -->
	<p class="has-text-muted-color has-text-color has-small-font-size" style="margin-bottom:var(--wp--preset--spacing--40);text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Browse by category</p>
	<!-- /wp:paragraph -->

	<!-- wp:columns {"className":"sgs-mega-panel--cards","style":{"spacing":{"blockGap":{"top":"var:preset|spacing|30","left":"var:preset|spacing|30"}}}} -->
	<div class="wp-block-columns sgs-mega-panel--cards">

		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:group {"className":"sgs-mega-card sgs-mega-card--gradient","style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"layout":{"type":"flex","orientation":"vertical","justifyContent":"space-between"}} -->
			<div class="wp-block-group sgs-mega-card sgs-mega-card--gradient has-background" style="border-radius:12px;padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
				<!-- wp:paragraph {"style":{"typography":{"fontSize":"1rem","fontWeight":"700"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
				<p style="font-size:1rem;font-weight:700;margin-bottom:var(--wp--preset--spacing--20)">Category one</p>
				<!-- /wp:paragraph -->
				<!-- wp:paragraph {"style":{"typography":{"fontSize":"0.8rem"},"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} -->
				<p style="font-size:0.8rem;margin-bottom:var(--wp--preset--spacing--30)">Short description of what this category includes.</p>
				<!-- /wp:paragraph -->
				<!-- wp:paragraph {"style":{"typography":{"fontSize":"0.85rem","fontWeight":"600"}}} -->
				<p style="font-size:0.85rem;font-weight:600"><a href="#" style="color:inherit;text-decoration:none">Browse &rarr;</a></p>
				<!-- /wp:paragraph -->
			</div>
			<!-- /wp:group -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:group {"className":"sgs-mega-card sgs-mega-card--gradient","style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"layout":{"type":"flex","orientation":"vertical","justifyContent":"space-between"}} -->
			<div class="wp-block-group sgs-mega-card sgs-mega-card--gradient has-background" style="border-radius:12px;padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
				<!-- wp:paragraph {"style":{"typography":{"fontSize":"1rem","fontWeight":"700"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
				<p style="font-size:1rem;font-weight:700;margin-bottom:var(--wp--preset--spacing--20)">Category two</p>
				<!-- /wp:paragraph -->
				<!-- wp:paragraph {"style":{"typography":{"fontSize":"0.8rem"},"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} -->
				<p style="font-size:0.8rem;margin-bottom:var(--wp--preset--spacing--30)">Short description of what this category includes.</p>
				<!-- /wp:paragraph -->
				<!-- wp:paragraph {"style":{"typography":{"fontSize":"0.85rem","fontWeight":"600"}}} -->
				<p style="font-size:0.85rem;font-weight:600"><a href="#" style="color:inherit;text-decoration:none">Browse &rarr;</a></p>
				<!-- /wp:paragraph -->
			</div>
			<!-- /wp:group -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:group {"className":"sgs-mega-card sgs-mega-card--gradient","style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"layout":{"type":"flex","orientation":"vertical","justifyContent":"space-between"}} -->
			<div class="wp-block-group sgs-mega-card sgs-mega-card--gradient has-background" style="border-radius:12px;padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
				<!-- wp:paragraph {"style":{"typography":{"fontSize":"1rem","fontWeight":"700"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
				<p style="font-size:1rem;font-weight:700;margin-bottom:var(--wp--preset--spacing--20)">Category three</p>
				<!-- /wp:paragraph -->
				<!-- wp:paragraph {"style":{"typography":{"fontSize":"0.8rem"},"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} -->
				<p style="font-size:0.8rem;margin-bottom:var(--wp--preset--spacing--30)">Short description of what this category includes.</p>
				<!-- /wp:paragraph -->
				<!-- wp:paragraph {"style":{"typography":{"fontSize":"0.85rem","fontWeight":"600"}}} -->
				<p style="font-size:0.85rem;font-weight:600"><a href="#" style="color:inherit;text-decoration:none">Browse &rarr;</a></p>
				<!-- /wp:paragraph -->
			</div>
			<!-- /wp:group -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:group {"className":"sgs-mega-card sgs-mega-card--gradient","style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"layout":{"type":"flex","orientation":"vertical","justifyContent":"space-between"}} -->
			<div class="wp-block-group sgs-mega-card sgs-mega-card--gradient has-background" style="border-radius:12px;padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
				<!-- wp:paragraph {"style":{"typography":{"fontSize":"1rem","fontWeight":"700"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
				<p style="font-size:1rem;font-weight:700;margin-bottom:var(--wp--preset--spacing--20)">Category four</p>
				<!-- /wp:paragraph -->
				<!-- wp:paragraph {"style":{"typography":{"fontSize":"0.8rem"},"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} -->
				<p style="font-size:0.8rem;margin-bottom:var(--wp--preset--spacing--30)">Short description of what this category includes.</p>
				<!-- /wp:paragraph -->
				<!-- wp:paragraph {"style":{"typography":{"fontSize":"0.85rem","fontWeight":"600"}}} -->
				<p style="font-size:0.85rem;font-weight:600"><a href="#" style="color:inherit;text-decoration:none">Browse &rarr;</a></p>
				<!-- /wp:paragraph -->
			</div>
			<!-- /wp:group -->
		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

</div>
<!-- /wp:group -->
