<?php
/**
 * Title: SGS Framework Footer — Default
 * Slug: sgs/framework-footer-default
 * Block Types: core/post-content
 * Post Types: sgs_footer
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

		<!-- wp:sgs/container {"tagName":"div","metadata":{"name":"Brand"}} -->

			<!-- wp:sgs/responsive-logo {"width":180,"linkToHome":true,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} /-->

			<!-- wp:sgs/business-info {"displayType":"description","textColour":"surface","fontSize":"small","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} /-->

			<!-- wp:sgs/business-info {"displayType":"socials","iconColour":"surface","style":{"spacing":{"margin":{"top":"var:preset|spacing|30"}}}} /-->

		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container {"tagName":"div","metadata":{"name":"Quick Links"}} -->

			<!-- wp:sgs/heading {"content":"Quick Links","level":"h2","textColour":"surface","fontSize":"medium","fontWeight":"700","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} /-->

			<!-- wp:list {"style":{"spacing":{"padding":{"left":"0"}},"typography":{"lineHeight":"2.2"}},"className":"is-style-no-bullets","fontSize":"small"} -->
			<ul class="is-style-no-bullets has-small-font-size sgs-link-list" style="padding-left:0;line-height:2.2">
			</ul>
			<!-- /wp:list -->

		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container {"tagName":"div","metadata":{"name":"Contact"}} -->

			<!-- wp:sgs/heading {"content":"Contact","level":"h2","textColour":"surface","fontSize":"medium","fontWeight":"700","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} /-->

			<!-- wp:sgs/business-info {"displayType":"address","textColour":"surface","iconColour":"surface","fontSize":"small","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} /-->

			<!-- wp:sgs/business-info {"displayType":"phone","textColour":"surface","iconColour":"surface","fontSize":"small","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|10"}}}} /-->

			<!-- wp:sgs/business-info {"displayType":"email","textColour":"surface","iconColour":"surface","fontSize":"small","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} /-->

			<!-- wp:sgs/heading {"content":"Opening Hours","level":"h3","textColour":"surface","fontSize":"medium","fontWeight":"700","style":{"spacing":{"margin":{"top":"var:preset|spacing|10","bottom":"var:preset|spacing|20"}}}} /-->

			<!-- wp:sgs/business-info {"displayType":"hours","textColour":"surface","labelColour":"surface","fontSize":"small"} /-->

		<!-- /wp:sgs/container -->

	<!-- /wp:sgs/site-footer-row -->

	<!-- wp:sgs/site-footer-row {"rowSlot":"bottom","layout":"flex","justifyContent":"center","gap":{"desktop":"8px"},"padding":{"desktop":{"top":"var(--wp--preset--spacing--40)","bottom":"var(--wp--preset--spacing--40)"}},"margin":{"desktop":{"top":"var(--wp--preset--spacing--50)"}},"style":{"border":{"top":{"color":"var:preset|color|accent","width":"1px"}}}} -->

		<!-- wp:sgs/business-info {"displayType":"copyright","textColour":"accent","fontSize":"small"} /-->

		<!-- wp:sgs/business-info {"displayType":"attribution","textColour":"accent","fontSize":"small"} /-->

	<!-- /wp:sgs/site-footer-row -->

<!-- /wp:sgs/site-footer -->
