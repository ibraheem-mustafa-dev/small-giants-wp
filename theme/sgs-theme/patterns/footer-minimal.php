<?php
/**
 * Title: Footer — Minimal
 * Slug: sgs/footer-minimal
 * Categories: sgs-footers
 * Block Types: core/template-part/footer
 * Description: Single-row minimal footer with copyright and social icons. Content auto-populates from Settings > Business Details. Starter template for the sgs_footer CPT (Spec 37 FR-37-8) — built on sgs/site-footer with a single bottom row.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-footer {"align":"full","backgroundColor":"footer-bg","contentWidth":"normal"} -->

<!-- wp:sgs/site-footer-row {"rowSlot":"bottom","layout":"flex","justifyContent":"space-between","padding":{"desktop":{"top":"var(--wp--preset--spacing--40)","bottom":"var(--wp--preset--spacing--40)"}}} -->

<!-- wp:sgs/business-info {"displayType":"copyright","textColour":"text-inverse","fontSize":"small"} /-->

<!-- wp:sgs/business-info {"displayType":"socials"} /-->

<!-- /wp:sgs/site-footer-row -->

<!-- /wp:sgs/site-footer -->
