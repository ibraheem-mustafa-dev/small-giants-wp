<?php
/**
 * Title: Mega Menu — Split: Info + CTA
 * Slug: sgs/mega-menu-split-info-cta
 * Categories: mega-menu-layouts
 * Block Types: core/template-part/mega-menu
 * Keywords: mega menu, split, contact, info, CTA, call to action, 40 60
 * Viewport Width: 1200
 * Inserter: true
 * Description: 40/60 split — contact or supporting info on the left, a prominent action card (button/CTA box) on the right. Ideal for Contact or Get Started panels.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/container {"tagName":"div","style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50","left":"var:preset|spacing|50","right":"var:preset|spacing|50"}}},"backgroundColor":"primary-dark","textColor":"surface","contentWidth":"1200px"} -->
<div class="wp-block-group has-surface-color has-primary-dark-background-color has-text-color has-background" style="padding-top:var(--wp--preset--spacing--50);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--50)">

	<!-- wp:sgs/container {"layout":"grid","gridTemplateColumns":"40% 60%","gridTemplateColumnsMobile":"1fr","className":"sgs-mega-panel--split-reverse","gap":"var:preset|spacing|60"} -->
	<div class="wp-block-columns sgs-mega-panel--split-reverse">

		<!-- wp:sgs/container -->
		<div class="wp-block-column" style="flex-basis:40%">

			<!-- wp:sgs/text {"text":"Contact details","fontSize":"1rem","fontWeight":"700","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}},"textColour":"surface"} /-->

			<!-- wp:list {"style":{"spacing":{"padding":{"left":"0"}},"typography":{"lineHeight":"2.2","fontSize":"0.9rem"}},"textColor":"surface"} -->
			<ul class="wp-block-list has-surface-color has-text-color" style="padding-left:0;font-size:0.9rem;line-height:2.2">
				<!-- wp:list-item -->
				<li>📞 +44 (0) 000 000 0000</li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li>✉ hello@yourdomain.com</li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li>📍 Your town, Your county</li>
				<!-- /wp:list-item -->
			</ul>
			<!-- /wp:list -->

			<!-- wp:sgs/separator {"width":100,"widthUnit":"%","style":{"spacing":{"margin":{"top":"var:preset|spacing|30","bottom":"var:preset|spacing|30"}}},"colour":"var(--wp--preset--color--border-subtle)"} /-->

			<!-- wp:sgs/text {"text":"Opening hours","fontSize":"1rem","fontWeight":"700","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}},"textColour":"surface"} /-->

			<!-- wp:sgs/text {"text":"<strong>Mon – Fri:</strong> 9 am – 5 pm<br><strong>Sat – Sun:</strong> Closed","fontSize":"0.875rem","lineHeight":2,"lineHeightUnit":"","textColour":"text-inverse"} /-->

		</div>
		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container -->
		<div class="wp-block-column" style="flex-basis:60%">

			<!-- wp:sgs/container {"tagName":"div","className":"sgs-mega-card sgs-mega-card--surface","style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50","left":"var:preset|spacing|50","right":"var:preset|spacing|50"}},"border":{"radius":"12px"}},"backgroundColor":"surface","textColor":"text","contentWidth":"normal"} -->
			<div class="wp-block-group sgs-mega-card sgs-mega-card--surface has-text-color has-surface-background-color has-background" style="border-radius:12px;padding-top:var(--wp--preset--spacing--50);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--50)">

				<!-- wp:sgs/text {"text":"Ready to get started?","fontSize":"1.1rem","fontWeight":"700","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}},"textColour":"primary-dark"} /-->

				<!-- wp:sgs/text {"text":"A short, reassuring sentence about what happens after the visitor clicks the button below.","fontSize":"0.875rem","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}}},"textColour":"text-muted"} /-->

				<!-- wp:sgs/multi-button -->
					<!-- wp:sgs/button {"label":"Get in touch &rarr;","url":"#","colourBackground":"accent","inheritStyle":"custom","colourText":"text","widthType":"custom","customWidth":100,"customWidthUnit":"%","style":{"border":{"radius":"8px"}}} /-->
				<!-- /wp:sgs/multi-button -->

			</div>
			<!-- /wp:sgs/container -->

		</div>
		<!-- /wp:sgs/container -->

	</div>
	<!-- /wp:sgs/container -->

</div>
<!-- /wp:sgs/container -->
