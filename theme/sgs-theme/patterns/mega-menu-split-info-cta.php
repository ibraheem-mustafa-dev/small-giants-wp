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

<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50","left":"var:preset|spacing|50","right":"var:preset|spacing|50"}}},"backgroundColor":"primary-dark","textColor":"surface","layout":{"type":"constrained","contentSize":"1200px"}} -->
<div class="wp-block-group has-surface-color has-primary-dark-background-color has-text-color has-background" style="padding-top:var(--wp--preset--spacing--50);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--50)">

	<!-- wp:columns {"className":"sgs-mega-panel--split-reverse","style":{"spacing":{"blockGap":{"top":"var:preset|spacing|40","left":"var:preset|spacing|60"}}}} -->
	<div class="wp-block-columns sgs-mega-panel--split-reverse">

		<!-- wp:column {"width":"40%"} -->
		<div class="wp-block-column" style="flex-basis:40%">

			<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}},"typography":{"fontSize":"1rem","fontWeight":"700"}},"textColor":"surface"} -->
			<p class="has-surface-color has-text-color" style="font-size:1rem;font-weight:700;margin-bottom:var(--wp--preset--spacing--30)">Contact details</p>
			<!-- /wp:paragraph -->

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

			<!-- wp:separator {"style":{"spacing":{"margin":{"top":"var:preset|spacing|30","bottom":"var:preset|spacing|30"}}},"backgroundColor":"border-subtle","className":"is-style-wide"} -->
			<hr class="wp-block-separator has-text-color has-border-subtle-color has-alpha-channel-opacity has-border-subtle-background-color has-background is-style-wide" style="margin-top:var(--wp--preset--spacing--30);margin-bottom:var(--wp--preset--spacing--30)"/>
			<!-- /wp:separator -->

			<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}},"typography":{"fontSize":"1rem","fontWeight":"700"}},"textColor":"surface"} -->
			<p class="has-surface-color has-text-color" style="font-size:1rem;font-weight:700;margin-bottom:var(--wp--preset--spacing--20)">Opening hours</p>
			<!-- /wp:paragraph -->

			<!-- wp:paragraph {"style":{"typography":{"fontSize":"0.875rem","lineHeight":"2"}},"textColor":"text-inverse"} -->
			<p class="has-text-inverse-color has-text-color" style="font-size:0.875rem;line-height:2"><strong>Mon – Fri:</strong> 9 am – 5 pm<br><strong>Sat – Sun:</strong> Closed</p>
			<!-- /wp:paragraph -->

		</div>
		<!-- /wp:column -->

		<!-- wp:column {"width":"60%"} -->
		<div class="wp-block-column" style="flex-basis:60%">

			<!-- wp:group {"className":"sgs-mega-card sgs-mega-card--surface","style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50","left":"var:preset|spacing|50","right":"var:preset|spacing|50"}},"border":{"radius":"12px"}},"backgroundColor":"surface","textColor":"text","layout":{"type":"constrained"}} -->
			<div class="wp-block-group sgs-mega-card sgs-mega-card--surface has-text-color has-surface-background-color has-background" style="border-radius:12px;padding-top:var(--wp--preset--spacing--50);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--50)">

				<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}},"typography":{"fontSize":"1.1rem","fontWeight":"700"}},"textColor":"primary-dark"} -->
				<p class="has-primary-dark-color has-text-color" style="font-size:1.1rem;font-weight:700;margin-bottom:var(--wp--preset--spacing--20)">Ready to get started?</p>
				<!-- /wp:paragraph -->

				<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}},"typography":{"fontSize":"0.875rem"}},"textColor":"text-muted"} -->
				<p class="has-text-muted-color has-text-color" style="font-size:0.875rem;margin-bottom:var(--wp--preset--spacing--40)">A short, reassuring sentence about what happens after the visitor clicks the button below.</p>
				<!-- /wp:paragraph -->

				<!-- wp:buttons -->
				<div class="wp-block-buttons">
					<!-- wp:button {"backgroundColor":"accent","textColor":"text","width":100,"style":{"border":{"radius":"8px"}}} -->
					<div class="wp-block-button has-custom-width wp-block-button__width-100"><a class="wp-block-button__link has-text-color has-accent-background-color has-text-color has-background wp-element-button" href="#" style="border-radius:8px">Get in touch &rarr;</a></div>
					<!-- /wp:button -->
				</div>
				<!-- /wp:buttons -->

			</div>
			<!-- /wp:group -->

		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

</div>
<!-- /wp:group -->
