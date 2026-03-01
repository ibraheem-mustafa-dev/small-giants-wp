<?php
/**
 * Title: Footer — 4 Column
 * Slug: sgs-theme/footer-4-column
 * Categories: sgs-content
 * Keywords: footer, 4 column, logo, links, social, newsletter, navigation
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|70","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"footer-bg","layout":{"type":"constrained","wideSize":"1200px"}} -->
<div class="wp-block-group alignfull has-footer-bg-background-color has-background" style="padding-top:var(--wp--preset--spacing--70);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:columns {"align":"wide","isStackedOnMobile":true,"style":{"spacing":{"blockGap":{"left":"var:preset|spacing|60"},"margin":{"bottom":"var:preset|spacing|60"}}}} -->
	<div class="wp-block-columns alignwide" style="margin-bottom:var(--wp--preset--spacing--60)">

		<!-- Column 1: Logo & About -->
		<!-- wp:column {"width":"30%"} -->
		<div class="wp-block-column" style="flex-basis:30%">
			<!-- wp:site-logo {"width":140,"className":"footer-logo"} /-->
			<!-- wp:spacer {"height":"var:preset|spacing|30"} -->
			<div style="height:var(--wp--preset--spacing--30)" aria-hidden="true" class="wp-block-spacer"></div>
			<!-- /wp:spacer -->
			<!-- wp:paragraph {"textColor":"text-inverse","fontSize":"small","style":{"typography":{"opacity":"0.8"}}} -->
			<p class="has-text-inverse-color has-text-color has-small-font-size" style="opacity:0.8">We help ambitious businesses build powerful digital presences that drive real, measurable growth. Based in London, working with clients across the UK and beyond.</p>
			<!-- /wp:paragraph -->
			<!-- wp:spacer {"height":"var:preset|spacing|30"} -->
			<div style="height:var(--wp--preset--spacing--30)" aria-hidden="true" class="wp-block-spacer"></div>
			<!-- /wp:spacer -->
			<!-- wp:paragraph {"fontSize":"large"} -->
			<p class="has-large-font-size"><a href="#" style="color:var(--wp--preset--color--text-inverse);opacity:0.7;text-decoration:none;margin-right:12px" aria-label="LinkedIn profile">💼</a><a href="#" style="color:var(--wp--preset--color--text-inverse);opacity:0.7;text-decoration:none;margin-right:12px" aria-label="Twitter / X profile">𝕏</a><a href="#" style="color:var(--wp--preset--color--text-inverse);opacity:0.7;text-decoration:none;margin-right:12px" aria-label="Instagram profile">📸</a><a href="#" style="color:var(--wp--preset--color--text-inverse);opacity:0.7;text-decoration:none" aria-label="Facebook page">📘</a></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->

		<!-- Column 2: Company Links -->
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:heading {"level":4,"textColor":"accent","fontSize":"small","style":{"typography":{"textTransform":"uppercase","letterSpacing":"0.1em","fontWeight":"700"},"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} -->
			<h4 class="wp-block-heading has-accent-color has-text-color has-small-font-size" style="font-weight:700;letter-spacing:0.1em;margin-bottom:var(--wp--preset--spacing--30);text-transform:uppercase">Company</h4>
			<!-- /wp:heading -->
			<!-- wp:list {"style":{"typography":{"lineHeight":"2.2"},"spacing":{"padding":{"left":"0"}}},"textColor":"text-inverse","fontSize":"small"} -->
			<ul class="has-text-inverse-color has-text-color has-small-font-size" style="line-height:2.2;padding-left:0;list-style:none;opacity:0.8">
				<!-- wp:list-item --><li><a href="#" style="color:inherit;text-decoration:none">About Us</a></li><!-- /wp:list-item -->
				<!-- wp:list-item --><li><a href="#" style="color:inherit;text-decoration:none">Our Team</a></li><!-- /wp:list-item -->
				<!-- wp:list-item --><li><a href="#" style="color:inherit;text-decoration:none">Careers</a></li><!-- /wp:list-item -->
				<!-- wp:list-item --><li><a href="#" style="color:inherit;text-decoration:none">Press &amp; Media</a></li><!-- /wp:list-item -->
				<!-- wp:list-item --><li><a href="#" style="color:inherit;text-decoration:none">Contact</a></li><!-- /wp:list-item -->
			</ul>
			<!-- /wp:list -->
		</div>
		<!-- /wp:column -->

		<!-- Column 3: Services Links -->
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:heading {"level":4,"textColor":"accent","fontSize":"small","style":{"typography":{"textTransform":"uppercase","letterSpacing":"0.1em","fontWeight":"700"},"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} -->
			<h4 class="wp-block-heading has-accent-color has-text-color has-small-font-size" style="font-weight:700;letter-spacing:0.1em;margin-bottom:var(--wp--preset--spacing--30);text-transform:uppercase">Services</h4>
			<!-- /wp:heading -->
			<!-- wp:list {"style":{"typography":{"lineHeight":"2.2"},"spacing":{"padding":{"left":"0"}}},"textColor":"text-inverse","fontSize":"small"} -->
			<ul class="has-text-inverse-color has-text-color has-small-font-size" style="line-height:2.2;padding-left:0;list-style:none;opacity:0.8">
				<!-- wp:list-item --><li><a href="#" style="color:inherit;text-decoration:none">Web Design</a></li><!-- /wp:list-item -->
				<!-- wp:list-item --><li><a href="#" style="color:inherit;text-decoration:none">Web Development</a></li><!-- /wp:list-item -->
				<!-- wp:list-item --><li><a href="#" style="color:inherit;text-decoration:none">SEO &amp; Content</a></li><!-- /wp:list-item -->
				<!-- wp:list-item --><li><a href="#" style="color:inherit;text-decoration:none">Brand Identity</a></li><!-- /wp:list-item -->
				<!-- wp:list-item --><li><a href="#" style="color:inherit;text-decoration:none">Digital Strategy</a></li><!-- /wp:list-item -->
			</ul>
			<!-- /wp:list -->
		</div>
		<!-- /wp:column -->

		<!-- Column 4: Newsletter -->
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:heading {"level":4,"textColor":"accent","fontSize":"small","style":{"typography":{"textTransform":"uppercase","letterSpacing":"0.1em","fontWeight":"700"},"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} -->
			<h4 class="wp-block-heading has-accent-color has-text-color has-small-font-size" style="font-weight:700;letter-spacing:0.1em;margin-bottom:var(--wp--preset--spacing--30);text-transform:uppercase">Stay Connected</h4>
			<!-- /wp:heading -->
			<!-- wp:paragraph {"textColor":"text-inverse","fontSize":"small","style":{"typography":{"opacity":"0.8"},"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} -->
			<p class="has-text-inverse-color has-text-color has-small-font-size" style="opacity:0.8;margin-bottom:var(--wp--preset--spacing--30)">Subscribe to our newsletter for insights, tips, and industry news delivered fortnightly.</p>
			<!-- /wp:paragraph -->
			<!-- wp:html -->
			<form style="display:flex;gap:8px;flex-wrap:wrap" action="#" method="post">
				<input type="email" name="email" placeholder="Your email address" required
					style="flex:1;min-width:0;padding:12px 16px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:rgba(255,255,255,0.1);color:var(--wp--preset--color--text-inverse);font-size:var(--wp--preset--font-size--small);outline:none"
					aria-label="Email address for newsletter subscription">
				<button type="submit"
					style="padding:12px 20px;background:var(--wp--preset--color--accent);color:var(--wp--preset--color--text);border:none;border-radius:8px;font-weight:700;font-size:var(--wp--preset--font-size--small);cursor:pointer;white-space:nowrap">
					Subscribe
				</button>
			</form>
			<!-- /wp:html -->
			<!-- wp:paragraph {"textColor":"text-inverse","fontSize":"x-small","style":{"typography":{"opacity":"0.5"},"spacing":{"margin":{"top":"var:preset|spacing|20"}}}} -->
			<p class="has-text-inverse-color has-text-color has-x-small-font-size" style="opacity:0.5;margin-top:var(--wp--preset--spacing--20)">No spam, ever. Unsubscribe any time. We respect your privacy.</p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

	<!-- Divider -->
	<!-- wp:separator {"style":{"color":{"background":"rgba(255,255,255,0.1)"},"spacing":{"margin":{"top":"0","bottom":"var:preset|spacing|40"}}}} -->
	<hr class="wp-block-separator has-text-color has-alpha-channel-opacity" style="background:rgba(255,255,255,0.1);margin-top:0;margin-bottom:var(--wp--preset--spacing--40)"/>
	<!-- /wp:separator -->

	<!-- Bottom Bar -->
	<!-- wp:columns {"align":"wide","isStackedOnMobile":true,"style":{"spacing":{"blockGap":{"left":"var:preset|spacing|40"}}}} -->
	<div class="wp-block-columns alignwide">
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:paragraph {"textColor":"text-inverse","fontSize":"x-small","style":{"typography":{"opacity":"0.5"},"spacing":{"margin":{"top":"0","bottom":"0"}}}} -->
			<p class="has-text-inverse-color has-text-color has-x-small-font-size" style="opacity:0.5;margin:0">© 2026 Your Company Ltd. All rights reserved. Registered in England &amp; Wales No. 12345678.</p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->
		<!-- wp:column {"width":"auto"} -->
		<div class="wp-block-column">
			<!-- wp:paragraph {"align":"right","textColor":"text-inverse","fontSize":"x-small","style":{"typography":{"opacity":"0.5"},"spacing":{"margin":{"top":"0","bottom":"0"}}}} -->
			<p class="has-text-align-right has-text-inverse-color has-text-color has-x-small-font-size" style="opacity:0.5;margin:0"><a href="#" style="color:inherit;text-decoration:none">Privacy Policy</a> &nbsp;·&nbsp; <a href="#" style="color:inherit;text-decoration:none">Cookie Policy</a> &nbsp;·&nbsp; <a href="#" style="color:inherit;text-decoration:none">Terms of Service</a></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->
	</div>
	<!-- /wp:columns -->

</div>
<!-- /wp:group -->
