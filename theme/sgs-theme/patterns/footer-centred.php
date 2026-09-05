<?php
/**
 * Title: Footer — Centred
 * Slug: sgs/footer-centred
 * Categories: sgs-footers
 * Block Types: core/post-content
 * Post Types: sgs_footer
 * Description: Centred footer with logo area, navigation links, and copyright. Content auto-populates from Settings > Business Details. Starter template for the sgs_footer CPT (Spec 37 FR-37-8) — built on sgs/site-footer with a single-column "columns" row.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-footer {"align":"full","backgroundColour":"primary-dark","contentWidth":{"desktop":"normal"}} -->

<!-- wp:sgs/site-footer-row {"rowSlot":"columns","layout":"grid","columns":{"desktop":1},"justifyContent":"center","padding":{"desktop":{"top":"var(--wp--preset--spacing--70)","bottom":"var(--wp--preset--spacing--30)"}}} -->

<!-- wp:sgs/responsive-logo {"width":180,"align":"center","linkToHome":true} /-->

<!-- wp:sgs/business-info {"displayType":"description","textColour":"text-inverse","fontSize":{"desktop":"small"}} /-->

<!-- wp:sgs/multi-button {"justifyContent":{"desktop":"center"},"flexWrap":{"desktop":"wrap"}} -->
<!-- wp:sgs/button {"label":"Home","url":"#","inheritStyle":"custom","colourText":"text-inverse","fontSize":{"desktop":14}} /-->

<!-- wp:sgs/button {"label":"About","url":"#","inheritStyle":"custom","colourText":"text-inverse","fontSize":{"desktop":14}} /-->

<!-- wp:sgs/button {"label":"Services","url":"#","inheritStyle":"custom","colourText":"text-inverse","fontSize":{"desktop":14}} /-->

<!-- wp:sgs/button {"label":"Blog","url":"#","inheritStyle":"custom","colourText":"text-inverse","fontSize":{"desktop":14}} /-->

<!-- wp:sgs/button {"label":"Contact","url":"#","inheritStyle":"custom","colourText":"text-inverse","fontSize":{"desktop":14}} /-->
<!-- /wp:sgs/multi-button -->

<!-- /wp:sgs/site-footer-row -->

<!-- wp:sgs/site-footer-row {"borderWidth":{"top":"1px"},"borderStyle":"solid","borderColour":"border","rowSlot":"bottom","layout":"flex","justifyContent":"center","padding":{"desktop":{"top":"var(--wp--preset--spacing--40)","bottom":"var(--wp--preset--spacing--40)"}}} -->

<!-- wp:sgs/business-info {"displayType":"copyright","textColour":"text-inverse","fontSize":{"desktop":"small"}} /-->

<!-- /wp:sgs/site-footer-row -->

<!-- /wp:sgs/site-footer -->
