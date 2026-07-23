<?php
/**
 * Title: SGS Framework Footer — Compact
 * Slug: sgs/framework-footer-compact
 * Block Types: core/post-content
 * Post Types: sgs_footer
 * Categories: sgs-footers
 * Keywords: footer, sgs, framework, compact, two-column, contact, socials
 * Viewport Width: 1440
 * Inserter: true
 * Description: Two-column footer — logo and tagline left, contact details and social icons right. Content auto-populates from Settings > Business Details. Starter template for the sgs_footer CPT (Spec 37 FR-37-8) — built on sgs/site-footer with a 2-column "columns" row.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-footer {"align":"full","backgroundColor":"footer-bg","contentWidth":"normal"} -->

<!-- wp:sgs/site-footer-row {"rowSlot":"columns","layout":"grid","columns":2,"padding":{"desktop":{"top":"var(--wp--preset--spacing--60)"}}} -->

<!-- wp:sgs/container {"tagName":"div","metadata":{"name":"Brand"}} -->
<!-- wp:sgs/responsive-logo {"width":200,"linkToHome":true} /-->

<!-- wp:sgs/business-info {"displayType":"description","textColour":"text-inverse","fontSize":"small"} /-->
<!-- /wp:sgs/container -->

<!-- wp:sgs/container {"tagName":"div","metadata":{"name":"Contact"}} -->
<!-- wp:sgs/heading {"content":"Get In Touch","level":"h3","textColour":"surface","fontWeight":"700","fontSize":"medium"} /-->

<!-- wp:sgs/business-info {"displayType":"phone","textColour":"text-inverse","fontSize":"small"} /-->

<!-- wp:sgs/business-info {"displayType":"email","textColour":"text-inverse","fontSize":"small"} /-->

<!-- wp:sgs/business-info {"displayType":"address","textColour":"text-inverse","fontSize":"small"} /-->

<!-- wp:sgs/business-info {"displayType":"socials"} /-->
<!-- /wp:sgs/container -->

<!-- /wp:sgs/site-footer-row -->

<!-- wp:sgs/site-footer-row {"rowSlot":"bottom","layout":"flex","justifyContent":"center","padding":{"desktop":{"top":"var(--wp--preset--spacing--40)","bottom":"var(--wp--preset--spacing--40)"}},"margin":{"desktop":{"top":"var(--wp--preset--spacing--50)"}},"style":{"border":{"top":{"color":"var:preset|color|border-subtle","width":"1px"}}}} -->

<!-- wp:sgs/business-info {"displayType":"copyright","textColour":"text-inverse","fontSize":"small"} /-->

<!-- /wp:sgs/site-footer-row -->

<!-- /wp:sgs/site-footer -->
