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

<!-- wp:sgs/site-footer {"align":"full","backgroundColor":"primary-dark","contentWidth":"normal"} -->

<!-- wp:sgs/site-footer-row {"rowSlot":"columns","layout":"grid","columns":1,"justifyContent":"center","padding":{"desktop":{"top":"var(--wp--preset--spacing--70)","bottom":"var(--wp--preset--spacing--30)"}}} -->

<!-- wp:sgs/responsive-logo {"width":180,"align":"center","linkToHome":true} /-->

<!-- wp:sgs/business-info {"displayType":"description","textColour":"text-inverse","fontSize":"small"} /-->

<!-- wp:sgs/multi-button {"justifyContent":"center","wrap":"wrap"} -->
<!-- wp:sgs/button {"label":"Home","url":"#","inheritStyle":"custom","colourText":"text-inverse","fontSize":14} /-->

<!-- wp:sgs/button {"label":"About","url":"#","inheritStyle":"custom","colourText":"text-inverse","fontSize":14} /-->

<!-- wp:sgs/button {"label":"Services","url":"#","inheritStyle":"custom","colourText":"text-inverse","fontSize":14} /-->

<!-- wp:sgs/button {"label":"Blog","url":"#","inheritStyle":"custom","colourText":"text-inverse","fontSize":14} /-->

<!-- wp:sgs/button {"label":"Contact","url":"#","inheritStyle":"custom","colourText":"text-inverse","fontSize":14} /-->
<!-- /wp:sgs/multi-button -->

<!-- /wp:sgs/site-footer-row -->

<!-- wp:sgs/site-footer-row {"rowSlot":"bottom","layout":"flex","justifyContent":"center","padding":{"desktop":{"top":"var(--wp--preset--spacing--40)","bottom":"var(--wp--preset--spacing--40)"}},"style":{"border":{"top":{"color":"var:preset|color|border-subtle","width":"1px"}}}} -->

<!-- wp:sgs/business-info {"displayType":"copyright","textColour":"text-inverse","fontSize":"small"} /-->

<!-- /wp:sgs/site-footer-row -->

<!-- /wp:sgs/site-footer -->
