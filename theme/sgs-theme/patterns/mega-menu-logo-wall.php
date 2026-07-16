<?php
/**
 * Title: Mega Menu — Logo Wall
 * Slug: sgs/mega-menu-logo-wall
 * Categories: mega-menu-layouts
 * Block Types: core/template-part/mega-menu
 * Keywords: mega menu, logos, brands, partners, logo wall, 66 34
 * Viewport Width: 1200
 * Inserter: true
 * Description: Wide logo tile grid (66%) alongside a sidebar description and CTA (34%). Perfect for showcasing partner brands, accreditations, or supplier relationships.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/container {"tagName":"div","style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50","left":"var:preset|spacing|50","right":"var:preset|spacing|50"}}},"backgroundColor":"surface","contentWidth":"1200px"} -->
<div class="wp-block-group has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--50);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--50)">

	<!-- wp:sgs/container {"layout":"grid","gridTemplateColumns":"66% 34%","gridTemplateColumnsMobile":"1fr","className":"sgs-mega-panel--logo-wall","gap":"var:preset|spacing|60"} -->
	<div class="wp-block-columns sgs-mega-panel--logo-wall">

		<!-- wp:sgs/container -->
		<div class="wp-block-column" style="flex-basis:66%">

			<!-- wp:sgs/text {"text":"Our brands &amp; partners","textTransform":"uppercase","letterSpacing":0.08,"letterSpacingUnit":"em","fontWeight":"600","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}}},"textColour":"text-muted","fontSize":"small"} /-->

			<!-- wp:sgs/container {"tagName":"div","style":{"spacing":{"blockGap":"var:preset|spacing|30"}},"layout":"flex","flexWrap":"wrap"} -->
			<div class="wp-block-group is-layout-flex wp-block-group-is-layout-flex">

				<!-- wp:sgs/container {"tagName":"div","className":"sgs-mega-logo-tile","minHeight":"60px","style":{"spacing":{"padding":{"top":"8px","bottom":"8px","left":"12px","right":"12px"}},"border":{"radius":"8px"}},"layout":"flex","justifyContent":"center"} -->
				<div class="wp-block-group sgs-mega-logo-tile" style="border-radius:8px;min-height:60px;padding-top:8px;padding-right:12px;padding-bottom:8px;padding-left:12px">
					<!-- wp:sgs/text {"text":"Brand A","fontSize":"0.75rem","fontWeight":"700","textColour":"text-muted"} /-->
				</div>
				<!-- /wp:sgs/container -->

				<!-- wp:sgs/container {"tagName":"div","className":"sgs-mega-logo-tile","minHeight":"60px","style":{"spacing":{"padding":{"top":"8px","bottom":"8px","left":"12px","right":"12px"}},"border":{"radius":"8px"}},"layout":"flex","justifyContent":"center"} -->
				<div class="wp-block-group sgs-mega-logo-tile" style="border-radius:8px;min-height:60px;padding-top:8px;padding-right:12px;padding-bottom:8px;padding-left:12px">
					<!-- wp:sgs/text {"text":"Brand B","fontSize":"0.75rem","fontWeight":"700","textColour":"text-muted"} /-->
				</div>
				<!-- /wp:sgs/container -->

				<!-- wp:sgs/container {"tagName":"div","className":"sgs-mega-logo-tile","minHeight":"60px","style":{"spacing":{"padding":{"top":"8px","bottom":"8px","left":"12px","right":"12px"}},"border":{"radius":"8px"}},"layout":"flex","justifyContent":"center"} -->
				<div class="wp-block-group sgs-mega-logo-tile" style="border-radius:8px;min-height:60px;padding-top:8px;padding-right:12px;padding-bottom:8px;padding-left:12px">
					<!-- wp:sgs/text {"text":"Brand C","fontSize":"0.75rem","fontWeight":"700","textColour":"text-muted"} /-->
				</div>
				<!-- /wp:sgs/container -->

				<!-- wp:sgs/container {"tagName":"div","className":"sgs-mega-logo-tile","minHeight":"60px","style":{"spacing":{"padding":{"top":"8px","bottom":"8px","left":"12px","right":"12px"}},"border":{"radius":"8px"}},"layout":"flex","justifyContent":"center"} -->
				<div class="wp-block-group sgs-mega-logo-tile" style="border-radius:8px;min-height:60px;padding-top:8px;padding-right:12px;padding-bottom:8px;padding-left:12px">
					<!-- wp:sgs/text {"text":"Brand D","fontSize":"0.75rem","fontWeight":"700","textColour":"text-muted"} /-->
				</div>
				<!-- /wp:sgs/container -->

				<!-- wp:sgs/container {"tagName":"div","className":"sgs-mega-logo-tile","minHeight":"60px","style":{"spacing":{"padding":{"top":"8px","bottom":"8px","left":"12px","right":"12px"}},"border":{"radius":"8px"}},"layout":"flex","justifyContent":"center"} -->
				<div class="wp-block-group sgs-mega-logo-tile" style="border-radius:8px;min-height:60px;padding-top:8px;padding-right:12px;padding-bottom:8px;padding-left:12px">
					<!-- wp:sgs/text {"text":"Brand E","fontSize":"0.75rem","fontWeight":"700","textColour":"text-muted"} /-->
				</div>
				<!-- /wp:sgs/container -->

				<!-- wp:sgs/container {"tagName":"div","className":"sgs-mega-logo-tile","minHeight":"60px","style":{"spacing":{"padding":{"top":"8px","bottom":"8px","left":"12px","right":"12px"}},"border":{"radius":"8px"}},"layout":"flex","justifyContent":"center"} -->
				<div class="wp-block-group sgs-mega-logo-tile" style="border-radius:8px;min-height:60px;padding-top:8px;padding-right:12px;padding-bottom:8px;padding-left:12px">
					<!-- wp:sgs/text {"text":"Brand F","fontSize":"0.75rem","fontWeight":"700","textColour":"text-muted"} /-->
				</div>
				<!-- /wp:sgs/container -->

			</div>
			<!-- /wp:sgs/container -->

		</div>
		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container {"style":{"border":{"left":{"color":"var:preset|color|border-subtle","width":"1px","style":"solid"}},"spacing":{"padding":{"left":"var:preset|spacing|50"}}}} -->
		<div class="wp-block-column" style="flex-basis:34%;border-left-color:var(--wp--preset--color--border-subtle);border-left-style:solid;border-left-width:1px;padding-left:var(--wp--preset--spacing--50)">

			<!-- wp:sgs/text {"text":"About our range","textTransform":"uppercase","letterSpacing":0.08,"letterSpacingUnit":"em","fontWeight":"600","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}},"textColour":"text-muted","fontSize":"small"} /-->

			<!-- wp:sgs/text {"text":"A short description of the brands or partners shown here — who they are and why they matter to your customers.","textColour":"text-muted","fontSize":"0.875rem","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}}}} /-->

			<!-- wp:sgs/multi-button -->
				<!-- wp:sgs/button {"label":"View all brands","url":"#","inheritStyle":"primary","style":{"border":{"radius":"6px"},"spacing":{"padding":{"top":"10px","bottom":"10px","left":"20px","right":"20px"}}}} /-->
			<!-- /wp:sgs/multi-button -->

		</div>
		<!-- /wp:sgs/container -->

	</div>
	<!-- /wp:sgs/container -->

</div>
<!-- /wp:sgs/container -->
