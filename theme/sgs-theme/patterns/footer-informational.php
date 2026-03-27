<?php
/**
 * Title: Footer — Informational (3-Column)
 * Slug: sgs/footer-informational
 * Categories: sgs-footers
 * Block Types: core/template-part/footer
 * Description: Three-column footer with business description, quick links, contact, hours, map, and address. Content auto-populates from Settings > Business Details.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|60","bottom":"0","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"footer-bg","layout":{"type":"constrained","wideSize":"1200px"},"metadata":{"name":"Site Footer"}} -->
<div class="wp-block-group has-footer-bg-background-color has-background" style="padding-top:var(--wp--preset--spacing--60);padding-right:var(--wp--preset--spacing--40);padding-bottom:0;padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:columns {"align":"wide","style":{"spacing":{"blockGap":{"left":"var:preset|spacing|50"}}}} -->
	<div class="wp-block-columns alignwide">

		<!-- Column 1: Logo, Description, Social Icons -->
		<!-- wp:column {"width":"35%"} -->
		<div class="wp-block-column" style="flex-basis:35%">
			<!-- wp:site-logo {"width":200,"shouldSyncIcon":true,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} /-->

			<!-- wp:sgs/business-info {"type":"description"} /-->

			<!-- wp:sgs/business-info {"type":"socials"} /-->
		</div>
		<!-- /wp:column -->

		<!-- Column 2: Quick Links, Contact, Opening Hours -->
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:heading {"level":2,"textColor":"surface","fontSize":"medium","className":"sgs-footer-label","style":{"typography":{"fontWeight":"700"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
			<h2 class="wp-block-heading has-surface-color has-text-color has-medium-font-size sgs-footer-label" style="font-weight:700;margin-bottom:var(--wp--preset--spacing--20)">Quick Links</h2>
			<!-- /wp:heading -->

			<!-- wp:navigation {"textColor":"text-inverse","layout":{"type":"flex","orientation":"vertical"},"style":{"spacing":{"blockGap":"var:preset|spacing|10"},"typography":{"lineHeight":"2.2"}},"fontSize":"small","className":"sgs-footer-nav"} /-->

			<!-- wp:heading {"level":3,"textColor":"surface","fontSize":"medium","className":"sgs-footer-label","style":{"typography":{"fontWeight":"700"},"spacing":{"margin":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|20"}}}} -->
			<h3 class="wp-block-heading has-surface-color has-text-color has-medium-font-size sgs-footer-label" style="font-weight:700;margin-top:var(--wp--preset--spacing--40);margin-bottom:var(--wp--preset--spacing--20)">Contact</h3>
			<!-- /wp:heading -->

			<!-- wp:sgs/business-info {"type":"phone","textColor":"text-inverse","fontSize":"small"} /-->
			<!-- wp:sgs/business-info {"type":"email","textColor":"text-inverse","fontSize":"small"} /-->

			<!-- wp:heading {"level":3,"textColor":"surface","fontSize":"medium","className":"sgs-footer-label","style":{"typography":{"fontWeight":"700"},"spacing":{"margin":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|20"}}}} -->
			<h3 class="wp-block-heading has-surface-color has-text-color has-medium-font-size sgs-footer-label" style="font-weight:700;margin-top:var(--wp--preset--spacing--40);margin-bottom:var(--wp--preset--spacing--20)">Opening Hours</h3>
			<!-- /wp:heading -->

			<!-- wp:sgs/business-info {"type":"hours","textColor":"text-inverse","fontSize":"small"} /-->
		</div>
		<!-- /wp:column -->

		<!-- Column 3: Map, Address, Directions -->
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:sgs/business-info {"type":"map"} /-->

			<!-- wp:heading {"level":3,"textColor":"surface","fontSize":"medium","className":"sgs-footer-label","style":{"typography":{"fontWeight":"700"},"spacing":{"margin":{"top":"var:preset|spacing|30","bottom":"var:preset|spacing|20"}}}} -->
			<h3 class="wp-block-heading has-surface-color has-text-color has-medium-font-size sgs-footer-label" style="font-weight:700;margin-top:var(--wp--preset--spacing--30);margin-bottom:var(--wp--preset--spacing--20)">Address</h3>
			<!-- /wp:heading -->

			<!-- wp:sgs/business-info {"type":"address","textColor":"text-inverse","fontSize":"small"} /-->

			<!-- wp:buttons {"style":{"spacing":{"margin":{"top":"var:preset|spacing|30"}}}} -->
			<div class="wp-block-buttons" style="margin-top:var(--wp--preset--spacing--30)"><!-- wp:button {"textColor":"text","backgroundColor":"accent","style":{"border":{"radius":"8px"}}} -->
			<div class="wp-block-button"><a class="wp-block-button__link has-text-color has-background has-accent-background-color has-text-color wp-element-button" style="border-radius:8px">Get Directions &#8594;</a></div>
			<!-- /wp:button --></div>
			<!-- /wp:buttons -->
		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

	<!-- Copyright Bar -->
	<!-- wp:group {"align":"wide","layout":{"type":"flex","justifyContent":"center"},"style":{"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40"},"margin":{"top":"var:preset|spacing|50"}},"border":{"top":{"color":"var:preset|color|accent","width":"1px"}}}} -->
	<div class="wp-block-group alignwide" style="border-top-color:var(--wp--preset--color--accent);border-top-width:1px;margin-top:var(--wp--preset--spacing--50);padding-top:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40)">

		<!-- wp:sgs/business-info {"type":"copyright","fontSize":"small"} /-->

	</div>
	<!-- /wp:group -->

</div>
<!-- /wp:group -->
