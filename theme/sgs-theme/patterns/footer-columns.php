<?php
/**
 * Title: Footer — Multi-Column
 * Slug: sgs/footer-columns
 * Categories: sgs
 * Description: Four-column footer with company info, links, and newsletter.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|70","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"primary-dark","layout":{"type":"constrained","wideSize":"1200px"}} -->
<div class="wp-block-group alignfull has-primary-dark-background-color has-background" style="padding-top:var(--wp--preset--spacing--70);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:columns {"align":"wide","style":{"spacing":{"blockGap":{"left":"var:preset|spacing|50"}}}} -->
	<div class="wp-block-columns alignwide">

		<!-- wp:column {"width":"35%"} -->
		<div class="wp-block-column" style="flex-basis:35%">
			<!-- wp:heading {"level":3,"textColor":"surface","fontSize":"large"} -->
			<h3 class="wp-block-heading has-surface-color has-text-color has-large-font-size">Your Company</h3>
			<!-- /wp:heading -->
			<!-- wp:paragraph {"textColor":"text-inverse","fontSize":"small"} -->
			<p class="has-text-inverse-color has-text-color has-small-font-size">We help businesses build beautiful, high-performance websites that drive real results.</p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:heading {"level":4,"textColor":"surface","fontSize":"medium"} -->
			<h4 class="wp-block-heading has-surface-color has-text-color has-medium-font-size">Company</h4>
			<!-- /wp:heading -->
			<!-- wp:list {"style":{"typography":{"lineHeight":"2"},"spacing":{"padding":{"left":"0"}}},"textColor":"text-inverse","fontSize":"small"} -->
			<ul style="padding-left:0;line-height:2" class="has-text-inverse-color has-text-color has-small-font-size"><!-- wp:list-item -->
			<li><a href="#">About Us</a></li>
			<!-- /wp:list-item --><!-- wp:list-item -->
			<li><a href="#">Our Team</a></li>
			<!-- /wp:list-item --><!-- wp:list-item -->
			<li><a href="#">Careers</a></li>
			<!-- /wp:list-item --><!-- wp:list-item -->
			<li><a href="#">Contact</a></li>
			<!-- /wp:list-item --></ul>
			<!-- /wp:list -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:heading {"level":4,"textColor":"surface","fontSize":"medium"} -->
			<h4 class="wp-block-heading has-surface-color has-text-color has-medium-font-size">Services</h4>
			<!-- /wp:heading -->
			<!-- wp:list {"style":{"typography":{"lineHeight":"2"},"spacing":{"padding":{"left":"0"}}},"textColor":"text-inverse","fontSize":"small"} -->
			<ul style="padding-left:0;line-height:2" class="has-text-inverse-color has-text-color has-small-font-size"><!-- wp:list-item -->
			<li><a href="#">Web Design</a></li>
			<!-- /wp:list-item --><!-- wp:list-item -->
			<li><a href="#">Development</a></li>
			<!-- /wp:list-item --><!-- wp:list-item -->
			<li><a href="#">SEO</a></li>
			<!-- /wp:list-item --><!-- wp:list-item -->
			<li><a href="#">Branding</a></li>
			<!-- /wp:list-item --></ul>
			<!-- /wp:list -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:heading {"level":4,"textColor":"surface","fontSize":"medium"} -->
			<h4 class="wp-block-heading has-surface-color has-text-color has-medium-font-size">Stay Updated</h4>
			<!-- /wp:heading -->
			<!-- wp:paragraph {"textColor":"text-inverse","fontSize":"small"} -->
			<p class="has-text-inverse-color has-text-color has-small-font-size">Subscribe to our newsletter for the latest updates, tips, and insights.</p>
			<!-- /wp:paragraph -->
			<!-- wp:buttons -->
			<div class="wp-block-buttons">
				<!-- wp:button {"backgroundColor":"accent","textColor":"text","fontSize":"small","style":{"border":{"radius":"8px"}}} -->
				<div class="wp-block-button has-custom-font-size has-small-font-size"><a class="wp-block-button__link has-text-color has-accent-background-color has-background wp-element-button" style="border-radius:8px">Subscribe</a></div>
				<!-- /wp:button -->
			</div>
			<!-- /wp:buttons -->
		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

	<!-- wp:separator {"style":{"spacing":{"margin":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|30"}}},"backgroundColor":"border-subtle"} -->
	<hr class="wp-block-separator has-text-color has-border-subtle-color has-alpha-channel-opacity has-border-subtle-background-color has-background" style="margin-top:var(--wp--preset--spacing--50);margin-bottom:var(--wp--preset--spacing--30)"/>
	<!-- /wp:separator -->

	<!-- wp:paragraph {"align":"center","textColor":"text-inverse","fontSize":"small"} -->
	<p class="has-text-align-center has-text-inverse-color has-text-color has-small-font-size">© 2026 Your Company. All rights reserved.</p>
	<!-- /wp:paragraph -->

</div>
<!-- /wp:group -->
