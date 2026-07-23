<?php
/**
 * Title: Footer — Simple
 * Slug: sgs/footer-simple
 * Categories: sgs-footers
 * Block Types: core/template-part/footer
 * Description: Minimal footer with copyright text and policy links. Content auto-populates from Settings > Business Details. Starter template for the sgs_footer CPT (Spec 37 FR-37-8) — built on sgs/site-footer with a single bottom row.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-footer {"align":"full","backgroundColor":"primary-dark","contentWidth":"normal"} -->

<!-- wp:sgs/site-footer-row {"rowSlot":"bottom","layout":"flex","justifyContent":"space-between","padding":{"desktop":{"top":"var(--wp--preset--spacing--50)","bottom":"var(--wp--preset--spacing--50)"}}} -->

<!-- wp:sgs/business-info {"displayType":"copyright","textColour":"text-inverse","fontSize":"small"} /-->

<!-- wp:sgs/multi-button {"gap":"12px","wrap":"wrap"} -->
<!-- wp:sgs/button {"label":"Privacy Policy","url":"#","inheritStyle":"custom","colourText":"text-inverse","fontSize":14} /-->

<!-- wp:sgs/button {"label":"Terms of Service","url":"#","inheritStyle":"custom","colourText":"text-inverse","fontSize":14} /-->
<!-- /wp:sgs/multi-button -->

<!-- /wp:sgs/site-footer-row -->

<!-- /wp:sgs/site-footer -->
