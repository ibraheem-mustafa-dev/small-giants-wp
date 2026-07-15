<?php
/**
 * Title: SGS Framework Footer — Default
 * Slug: sgs/framework-footer-default
 * Block Types: core/template-part/footer
 * Categories: sgs-footers
 * Keywords: footer, sgs, framework, default, contact, socials, links
 * Viewport Width: 1440
 * Inserter: true
 * Description: Default SGS footer — the sgs/site-footer block with a columns row (brand + links + contact) and a bottom bar. All business-data slots use the sgs/business-info block (per-type variants) reading live from Business Details. No hardcoded client data.
 *
 * Built on the specialised sgs/site-footer container block (FR-S9-3): a
 * full-bleed section band whose content centres at the theme content width, a
 * columns row that collapses from 3 columns to 1 below the mobile tier, and a
 * centred bottom bar. The <footer role="contentinfo"> landmark is supplied by
 * the footer template part this pattern renders inside.
 *
 * Column 1: brand logo + tagline + social links
 * Column 2: quick navigation links
 * Column 3: contact details — address, phone, email, opening hours
 * Bottom bar: copyright + SGS studio attribution.
 *
 * Every business-data field uses the sgs/business-info block set to the matching
 * displayType variant (tagline/socials/address/phone/email/hours/copyright),
 * which reads live from the central Site Info store — no hardcoded client data,
 * no per-field bindings. Generic link labels are not personal data (FR-S4-5
 * linter stays green).
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-footer {"align":"full","backgroundColor":"footer-bg","contentWidth":"normal","style":{"spacing":{"padding":{"top":"var:preset|spacing|70","right":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40"}}}} -->

	<!-- wp:sgs/site-footer-row {"rowSlot":"columns","layout":"grid","gridTemplateColumns":{"desktop":"2fr 1fr 1fr","mobile":"1fr"},"gap":{"desktop":"48px","mobile":"32px"},"verticalAlign":"top"} -->

		<!-- wp:group {"className":"sgs-site-footer__brand","layout":{"type":"constrained"}} -->
		<div class="wp-block-group sgs-site-footer__brand">

			<!-- wp:site-logo {"width":180,"shouldSyncIcon":true,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} /-->

			<!-- wp:sgs/business-info {"displayType":"description","textColour":"surface","fontSize":"small","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} /-->

			<!-- wp:sgs/business-info {"displayType":"socials","iconColour":"surface","style":{"spacing":{"margin":{"top":"var:preset|spacing|30"}}}} /-->

		</div>
		<!-- /wp:group -->

		<!-- wp:group {"className":"sgs-site-footer__links","layout":{"type":"constrained"}} -->
		<div class="wp-block-group sgs-site-footer__links">

			<!-- wp:heading {"level":2,"textColor":"surface","fontSize":"medium","className":"sgs-link-list__heading","style":{"typography":{"fontWeight":"700"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
			<h2 class="wp-block-heading has-surface-color has-text-color has-medium-font-size sgs-link-list__heading" style="font-weight:700;margin-bottom:var(--wp--preset--spacing--20)">Quick Links</h2>
			<!-- /wp:heading -->

			<!-- wp:list {"style":{"spacing":{"padding":{"left":"0"}},"typography":{"lineHeight":"2.2"}},"className":"is-style-no-bullets","fontSize":"small"} -->
			<ul class="is-style-no-bullets has-small-font-size sgs-link-list" style="padding-left:0;line-height:2.2">
			</ul>
			<!-- /wp:list -->

		</div>
		<!-- /wp:group -->

		<!-- wp:group {"className":"sgs-site-footer__links","layout":{"type":"constrained"}} -->
		<div class="wp-block-group sgs-site-footer__links">

			<!-- wp:heading {"level":2,"textColor":"surface","fontSize":"medium","className":"sgs-link-list__heading","style":{"typography":{"fontWeight":"700"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
			<h2 class="wp-block-heading has-surface-color has-text-color has-medium-font-size sgs-link-list__heading" style="font-weight:700;margin-bottom:var(--wp--preset--spacing--20)">Contact</h2>
			<!-- /wp:heading -->

			<!-- wp:sgs/business-info {"displayType":"address","textColour":"surface","iconColour":"surface","fontSize":"small","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} /-->

			<!-- wp:sgs/business-info {"displayType":"phone","textColour":"surface","iconColour":"surface","fontSize":"small","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|10"}}}} /-->

			<!-- wp:sgs/business-info {"displayType":"email","textColour":"surface","iconColour":"surface","fontSize":"small","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} /-->

			<!-- wp:heading {"level":3,"textColor":"surface","fontSize":"medium","className":"sgs-link-list__heading","style":{"typography":{"fontWeight":"700"},"spacing":{"margin":{"top":"var:preset|spacing|10","bottom":"var:preset|spacing|20"}}}} -->
			<h3 class="wp-block-heading has-surface-color has-text-color has-medium-font-size sgs-link-list__heading" style="font-weight:700;margin-top:var(--wp--preset--spacing--10);margin-bottom:var(--wp--preset--spacing--20)">Opening Hours</h3>
			<!-- /wp:heading -->

			<!-- wp:sgs/business-info {"displayType":"hours","textColour":"surface","labelColour":"surface","fontSize":"small"} /-->

		</div>
		<!-- /wp:group -->

	<!-- /wp:sgs/site-footer-row -->

	<!-- wp:sgs/site-footer-row {"rowSlot":"bottom","layout":"flex","justifyContent":"center","gap":{"desktop":"8px"},"padding":{"desktop":{"top":"var(--wp--preset--spacing--40)","bottom":"var(--wp--preset--spacing--40)"}},"margin":{"desktop":{"top":"var(--wp--preset--spacing--50)"}},"style":{"border":{"top":{"color":"var:preset|color|accent","width":"1px"}}}} -->

		<!-- wp:sgs/business-info {"displayType":"copyright","textColour":"accent","fontSize":"small"} /-->

		<!-- wp:sgs/business-info {"displayType":"attribution","textColour":"accent","fontSize":"small"} /-->

	<!-- /wp:sgs/site-footer-row -->

<!-- /wp:sgs/site-footer -->
