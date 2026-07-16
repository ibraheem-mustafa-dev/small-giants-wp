<?php
/**
 * Title: Mega Menu — Featured Promo
 * Slug: sgs/mega-menu-featured-promo
 * Categories: mega-menu-layouts
 * Block Types: core/template-part/mega-menu
 * Keywords: mega menu, featured, promo, promotion, links, 2/3 1/3
 * Viewport Width: 1200
 * Inserter: true
 * Description: Two-thirds content column (links + description) plus a one-third featured promotional card. Good for highlighting a product range, seasonal offer, or key call to action alongside navigation links.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50","left":"var:preset|spacing|50","right":"var:preset|spacing|50"}}},"backgroundColor":"surface","layout":{"type":"constrained","contentSize":"1200px"}} -->
<div class="wp-block-group has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--50);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--50)">

	<!-- wp:columns {"className":"sgs-mega-panel--promo","style":{"spacing":{"blockGap":{"top":"0","left":"var:preset|spacing|60"}}}} -->
	<div class="wp-block-columns sgs-mega-panel--promo">

		<!-- wp:column {"width":"66.66%"} -->
		<div class="wp-block-column" style="flex-basis:66.66%">

			<!-- wp:sgs/text {"text":"Section heading","textTransform":"uppercase","letterSpacing":0.08,"letterSpacingUnit":"em","fontWeight":"600","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}},"textColour":"text-muted","fontSize":"small"} /-->

			<!-- wp:columns {"style":{"spacing":{"blockGap":{"top":"0","left":"var:preset|spacing|50"}}}} -->
			<div class="wp-block-columns">

				<!-- wp:column -->
				<div class="wp-block-column">
					<!-- wp:sgs/text {"text":"Column A","fontSize":"0.875rem","fontWeight":"700","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}},"textColour":"primary-dark"} /-->
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
					</ul>
					<!-- /wp:list -->
				</div>
				<!-- /wp:column -->

				<!-- wp:column -->
				<div class="wp-block-column">
					<!-- wp:sgs/text {"text":"Column B","fontSize":"0.875rem","fontWeight":"700","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}},"textColour":"primary-dark"} /-->
					<!-- wp:list {"className":"sgs-mega-link-list","style":{"spacing":{"padding":{"left":"0"}},"typography":{"lineHeight":"2.4"}}} -->
					<ul class="wp-block-list sgs-mega-link-list" style="padding-left:0;line-height:2.4">
						<!-- wp:list-item -->
						<li><a href="#">Link four</a></li>
						<!-- /wp:list-item -->
						<!-- wp:list-item -->
						<li><a href="#">Link five</a></li>
						<!-- /wp:list-item -->
						<!-- wp:list-item -->
						<li><a href="#">Link six</a></li>
						<!-- /wp:list-item -->
					</ul>
					<!-- /wp:list -->
				</div>
				<!-- /wp:column -->

			</div>
			<!-- /wp:columns -->

		</div>
		<!-- /wp:column -->

		<!-- wp:column {"width":"33.33%"} -->
		<div class="wp-block-column" style="flex-basis:33.33%">

			<!-- wp:group {"className":"sgs-mega-featured","style":{"border":{"radius":"16px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"layout":{"type":"flex","orientation":"vertical","justifyContent":"space-between"}} -->
			<div class="wp-block-group sgs-mega-featured has-background" style="border-radius:16px;padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">

				<!-- wp:sgs/text {"text":"Featured","textTransform":"uppercase","letterSpacing":0.06,"letterSpacingUnit":"em","fontWeight":"600","fontSize":"0.75rem","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} /-->

				<!-- wp:sgs/text {"text":"Promo heading","fontSize":"1.1rem","fontWeight":"700","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} /-->

				<!-- wp:sgs/text {"text":"A compelling one-liner about this offer or featured page.","fontSize":"0.875rem","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}}}} /-->

				<!-- wp:sgs/text {"text":"<a href=\"#\" style=\"text-decoration:none\">See more &rarr;</a>","fontSize":"0.875rem","fontWeight":"600"} /-->

			</div>
			<!-- /wp:group -->

		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

</div>
<!-- /wp:group -->
