<?php
/**
 * Title: Footer — Multi-Column
 * Slug: sgs/footer-columns
 * Categories: sgs-footers
 * Block Types: core/post-content
 * Post Types: sgs_footer
 * Description: Four-column footer with company info, links, and newsletter. Content auto-populates from Settings > Business Details. Starter template for the sgs_footer CPT, built on sgs/site-footer with a 4-column "columns" row (an operator-set count, not a fixed ratio) that stacks to 1 column on mobile automatically.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-footer {"align":"full","backgroundColour":"primary-dark","contentWidth":{"desktop":"normal"}} -->

<!-- wp:sgs/site-footer-row {"rowSlot":"columns","layout":"grid","columns":{"desktop":4,"tablet":2},"padding":{"desktop":{"top":"var(--wp--preset--spacing--70)","bottom":"var(--wp--preset--spacing--40)"}}} -->

<!-- wp:sgs/container {"tagName":"div","metadata":{"name":"Brand"},"flexWrap":"wrap"} -->
<!-- wp:sgs/responsive-logo {"width":160,"linkToHome":true} /-->

<!-- wp:sgs/business-info {"displayType":"description","textColour":"text-inverse","fontSize":{"desktop":"regular"}} /-->
<!-- /wp:sgs/container -->

<!-- wp:sgs/container {"tagName":"div","metadata":{"name":"Company Links"},"flexWrap":"wrap"} -->
<!-- wp:sgs/heading {"content":"Company","level":"h4","textColour":"surface","fontWeight":"700","fontSize":{"desktop":"large"}} /-->

<!-- wp:sgs/icon-list {"markerType":"none","items":[{"text":"About Us","url":"#"},{"text":"Our Team","url":"#"},{"text":"Careers","url":"#"},{"text":"Contact","url":"#"}],"gap":"0","itemLineHeight":2,"itemLineHeightUnit":"","padding":{"desktop":{"left":"0"}},"textColour":"text-inverse","itemFontSize":{"desktop":"small"}} /-->
<!-- /wp:sgs/container -->

<!-- wp:sgs/container {"tagName":"div","metadata":{"name":"Services Links"},"flexWrap":"wrap"} -->
<!-- wp:sgs/heading {"content":"Services","level":"h4","textColour":"surface","fontWeight":"700","fontSize":{"desktop":"large"}} /-->

<!-- wp:sgs/icon-list {"markerType":"none","items":[{"text":"Web Design","url":"#"},{"text":"Development","url":"#"},{"text":"SEO","url":"#"},{"text":"Branding","url":"#"}],"gap":"0","itemLineHeight":2,"itemLineHeightUnit":"","padding":{"desktop":{"left":"0"}},"textColour":"text-inverse","itemFontSize":{"desktop":"small"}} /-->
<!-- /wp:sgs/container -->

<!-- wp:sgs/container {"tagName":"div","metadata":{"name":"Newsletter"},"flexWrap":"wrap"} -->
<!-- wp:sgs/heading {"content":"Stay Updated","level":"h4","textColour":"surface","fontWeight":"700","fontSize":{"desktop":"large"}} /-->

<!-- wp:sgs/text {"text":"Subscribe to our newsletter for the latest updates, tips, and insights.","textColour":"text-inverse","fontSize":{"desktop":"small"}} /-->

<!-- wp:sgs/multi-button {"justifyContent":{"desktop":"flex-start"}} -->
<!-- wp:sgs/button {"label":"Subscribe","url":"#","inheritStyle":"custom","colourBackground":"accent","colourText":"text","fontSize":{"desktop":14},"borderRadius":{"desktop":"8px"}} /-->
<!-- /wp:sgs/multi-button -->
<!-- /wp:sgs/container -->

<!-- /wp:sgs/site-footer-row -->

<!-- wp:sgs/site-footer-row {"borderWidth":{"top":"1px"},"borderStyle":"solid","borderColour":"border","rowSlot":"bottom","layout":"flex","justifyContent":"center","padding":{"desktop":{"top":"var(--wp--preset--spacing--20)","bottom":"var(--wp--preset--spacing--20)"}}} -->

<!-- wp:sgs/business-info {"displayType":"copyright","textColour":"text-inverse","fontSize":{"desktop":"small"}} /-->

<!-- /wp:sgs/site-footer-row -->

<!-- /wp:sgs/site-footer -->
