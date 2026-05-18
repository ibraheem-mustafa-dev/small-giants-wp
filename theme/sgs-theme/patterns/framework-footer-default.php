<?php
/**
 * Title: SGS Framework Footer — Default
 * Slug: sgs/framework-footer-default
 * Block Types: core/template-part/footer
 * Categories: sgs-footers
 * Keywords: footer, sgs, framework, default, contact, socials, links
 * Viewport Width: 1440
 * Inserter: true
 * Description: Default SGS footer — three-column layout with site info bindings. No hardcoded client data.
 *
 * Column 1: brand logo + tagline + social links
 * Column 2: quick navigation links
 * Column 3: contact details — address, phone, opening hours
 *
 * All business-data slots are bound to the sgs/site-info source.
 * Empty fields display a friendly admin hint (Wave 1C behaviour).
 *
 * @package SGS\Theme
 */

?>

<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|60","bottom":"0","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"footer-bg","layout":{"type":"constrained","wideSize":"1200px"},"metadata":{"name":"Site Footer"}} -->
<div class="wp-block-group has-footer-bg-background-color has-background" style="padding-top:var(--wp--preset--spacing--60);padding-right:var(--wp--preset--spacing--40);padding-bottom:0;padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:columns {"align":"wide","style":{"spacing":{"blockGap":{"left":"var:preset|spacing|50"}}}} -->
	<div class="wp-block-columns alignwide">

		<!-- Column 1: Logo, Tagline, Socials -->
		<!-- wp:column {"width":"35%"} -->
		<div class="wp-block-column" style="flex-basis:35%">

			<!-- wp:site-logo {"width":200,"shouldSyncIcon":true,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} /-->

			<!-- wp:paragraph {"textColor":"surface","fontSize":"small","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"tagline"}}}},"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} -->
			<p class="has-surface-color has-text-color has-small-font-size" style="margin-bottom:var(--wp--preset--spacing--30)">placeholder</p>
			<!-- /wp:paragraph -->

			<!-- Social links row -->
			<!-- wp:group {"layout":{"type":"flex","flexWrap":"wrap","justifyContent":"left"},"style":{"spacing":{"blockGap":"var:preset|spacing|20","margin":{"top":"var:preset|spacing|30"}}}} -->
			<div class="wp-block-group" style="margin-top:var(--wp--preset--spacing--30)">

				<!-- Facebook -->
				<!-- wp:paragraph {"textColor":"surface","fontSize":"small","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"socials.facebook"}}}}} -->
				<p class="has-surface-color has-text-color has-small-font-size">placeholder</p>
				<!-- /wp:paragraph -->

				<!-- Instagram -->
				<!-- wp:paragraph {"textColor":"surface","fontSize":"small","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"socials.instagram"}}}}} -->
				<p class="has-surface-color has-text-color has-small-font-size">placeholder</p>
				<!-- /wp:paragraph -->

				<!-- LinkedIn -->
				<!-- wp:paragraph {"textColor":"surface","fontSize":"small","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"socials.linkedin"}}}}} -->
				<p class="has-surface-color has-text-color has-small-font-size">placeholder</p>
				<!-- /wp:paragraph -->

				<!-- Twitter / X -->
				<!-- wp:paragraph {"textColor":"surface","fontSize":"small","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"socials.twitter"}}}}} -->
				<p class="has-surface-color has-text-color has-small-font-size">placeholder</p>
				<!-- /wp:paragraph -->

			</div>
			<!-- /wp:group -->

		</div>
		<!-- /wp:column -->

		<!-- Column 2: Navigation links -->
		<!-- wp:column -->
		<div class="wp-block-column">

			<!-- wp:heading {"level":2,"textColor":"surface","fontSize":"medium","className":"sgs-link-list__heading","style":{"typography":{"fontWeight":"700"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
			<h2 class="wp-block-heading has-surface-color has-text-color has-medium-font-size sgs-link-list__heading" style="font-weight:700;margin-bottom:var(--wp--preset--spacing--20)">Quick Links</h2>
			<!-- /wp:heading -->

			<!-- wp:list {"style":{"spacing":{"padding":{"left":"0"}},"typography":{"lineHeight":"2.2"}},"className":"is-style-no-bullets","fontSize":"small"} -->
			<ul class="is-style-no-bullets has-small-font-size sgs-link-list" style="padding-left:0;line-height:2.2">
				<!-- wp:list-item {"className":"sgs-link-list__item"} -->
				<li class="sgs-link-list__item"><a href="/">Home</a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item {"className":"sgs-link-list__item"} -->
				<li class="sgs-link-list__item"><a href="/about/">About</a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item {"className":"sgs-link-list__item"} -->
				<li class="sgs-link-list__item"><a href="/services/">Services</a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item {"className":"sgs-link-list__item"} -->
				<li class="sgs-link-list__item"><a href="/blog/">Blog</a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item {"className":"sgs-link-list__item"} -->
				<li class="sgs-link-list__item"><a href="/contact/">Contact</a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item {"className":"sgs-link-list__item"} -->
				<li class="sgs-link-list__item"><a href="/privacy-policy/">Privacy Policy</a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item {"className":"sgs-link-list__item"} -->
				<li class="sgs-link-list__item"><a href="/terms/">Terms &amp; Conditions</a></li>
				<!-- /wp:list-item -->
			</ul>
			<!-- /wp:list -->

		</div>
		<!-- /wp:column -->

		<!-- Column 3: Contact — address, phone, opening hours -->
		<!-- wp:column -->
		<div class="wp-block-column">

			<!-- wp:heading {"level":2,"textColor":"surface","fontSize":"medium","className":"sgs-link-list__heading","style":{"typography":{"fontWeight":"700"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
			<h2 class="wp-block-heading has-surface-color has-text-color has-medium-font-size sgs-link-list__heading" style="font-weight:700;margin-bottom:var(--wp--preset--spacing--20)">Contact</h2>
			<!-- /wp:heading -->

			<!-- Address -->
			<!-- wp:paragraph {"textColor":"surface","fontSize":"small","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"address"}}}},"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
			<p class="has-surface-color has-text-color has-small-font-size" style="margin-bottom:var(--wp--preset--spacing--20)">placeholder</p>
			<!-- /wp:paragraph -->

			<!-- Phone -->
			<!-- wp:paragraph {"textColor":"surface","fontSize":"small","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"phone"}}}},"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|10"}}}} -->
			<p class="has-surface-color has-text-color has-small-font-size" style="margin-bottom:var(--wp--preset--spacing--10)">placeholder</p>
			<!-- /wp:paragraph -->

			<!-- Email -->
			<!-- wp:paragraph {"textColor":"surface","fontSize":"small","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"email"}}}},"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} -->
			<p class="has-surface-color has-text-color has-small-font-size" style="margin-bottom:var(--wp--preset--spacing--30)">placeholder</p>
			<!-- /wp:paragraph -->

			<!-- wp:heading {"level":3,"textColor":"surface","fontSize":"medium","className":"sgs-link-list__heading","style":{"typography":{"fontWeight":"700"},"spacing":{"margin":{"top":"var:preset|spacing|10","bottom":"var:preset|spacing|20"}}}} -->
			<h3 class="wp-block-heading has-surface-color has-text-color has-medium-font-size sgs-link-list__heading" style="font-weight:700;margin-top:var(--wp--preset--spacing--10);margin-bottom:var(--wp--preset--spacing--20)">Opening Hours</h3>
			<!-- /wp:heading -->

			<!-- Opening hours — individual day bindings for granular control -->
			<!-- wp:paragraph {"textColor":"surface","fontSize":"small","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"opening_hours.mon"}}}}} -->
			<p class="has-surface-color has-text-color has-small-font-size">placeholder</p>
			<!-- /wp:paragraph -->

			<!-- wp:paragraph {"textColor":"surface","fontSize":"small","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"opening_hours.tue"}}}}} -->
			<p class="has-surface-color has-text-color has-small-font-size">placeholder</p>
			<!-- /wp:paragraph -->

			<!-- wp:paragraph {"textColor":"surface","fontSize":"small","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"opening_hours.wed"}}}}} -->
			<p class="has-surface-color has-text-color has-small-font-size">placeholder</p>
			<!-- /wp:paragraph -->

			<!-- wp:paragraph {"textColor":"surface","fontSize":"small","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"opening_hours.thu"}}}}} -->
			<p class="has-surface-color has-text-color has-small-font-size">placeholder</p>
			<!-- /wp:paragraph -->

			<!-- wp:paragraph {"textColor":"surface","fontSize":"small","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"opening_hours.fri"}}}}} -->
			<p class="has-surface-color has-text-color has-small-font-size">placeholder</p>
			<!-- /wp:paragraph -->

			<!-- wp:paragraph {"textColor":"surface","fontSize":"small","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"opening_hours.sat"}}}}} -->
			<p class="has-surface-color has-text-color has-small-font-size">placeholder</p>
			<!-- /wp:paragraph -->

			<!-- wp:paragraph {"textColor":"surface","fontSize":"small","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"opening_hours.sun"}}}}} -->
			<p class="has-surface-color has-text-color has-small-font-size">placeholder</p>
			<!-- /wp:paragraph -->

		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

	<!-- Copyright bar -->
	<!-- wp:group {"align":"wide","layout":{"type":"flex","justifyContent":"center"},"style":{"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40"},"margin":{"top":"var:preset|spacing|50"}},"border":{"top":{"color":"var:preset|color|accent","width":"1px"}}}} -->
	<div class="wp-block-group alignwide" style="border-top-color:var(--wp--preset--color--accent);border-top-width:1px;margin-top:var(--wp--preset--spacing--50);padding-top:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40)">

		<!-- wp:group {"layout":{"type":"flex","justifyContent":"center","flexWrap":"nowrap"},"style":{"spacing":{"blockGap":"8px"}}} -->
		<div class="wp-block-group">

			<!-- wp:paragraph {"textColor":"accent","fontSize":"small","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"copyright"}}}}} -->
			<p class="has-accent-color has-text-color has-small-font-size">placeholder</p>
			<!-- /wp:paragraph -->

			<!-- wp:paragraph {"textColor":"accent","fontSize":"small"} -->
			<p class="has-accent-color has-text-color has-small-font-size">| <a href="https://smallgiantsstudio.co.uk/">Website by Small Giants Studio</a></p>
			<!-- /wp:paragraph -->

		</div>
		<!-- /wp:group -->

	</div>
	<!-- /wp:group -->

</div>
<!-- /wp:group -->
