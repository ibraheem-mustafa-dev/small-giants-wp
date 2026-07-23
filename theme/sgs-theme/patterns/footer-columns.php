<?php
/**
 * Title: Footer — Multi-Column
 * Slug: sgs/footer-columns
 * Categories: sgs-footers
 * Block Types: core/template-part/footer
 * Description: Four-column footer with company info, links, and newsletter. Content auto-populates from Settings > Business Details. Starter template for the sgs_footer CPT (Spec 37 FR-37-8) — built on sgs/site-footer with a 4-column "columns" row (an operator-set count, per §3.3 — not a fixed ratio) that stacks to 1 column on mobile automatically.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-footer {"align":"full","backgroundColor":"primary-dark","contentWidth":"normal"} -->

<!-- wp:sgs/site-footer-row {"rowSlot":"columns","layout":"grid","columns":4,"columnsTablet":2,"padding":{"desktop":{"top":"var(--wp--preset--spacing--70)","bottom":"var(--wp--preset--spacing--40)"}}} -->

<!-- wp:sgs/container {"tagName":"div","metadata":{"name":"Brand"}} -->
<!-- wp:sgs/responsive-logo {"width":160,"linkToHome":true} /-->

<!-- wp:sgs/business-info {"displayType":"description","textColour":"text-inverse","fontSize":"small"} /-->
<!-- /wp:sgs/container -->

<!-- wp:sgs/container {"tagName":"div","metadata":{"name":"Company Links"}} -->
<!-- wp:sgs/heading {"content":"Company","level":"h4","textColour":"surface","fontWeight":"700","fontSize":"medium"} /-->

<!-- wp:list {"style":{"typography":{"lineHeight":"2"},"spacing":{"padding":{"left":"0"}}},"textColor":"text-inverse","fontSize":"small"} -->
<ul style="padding-left:0;line-height:2" class="has-text-inverse-color has-text-color has-small-font-size"><!-- wp:list-item -->
<li><a href="#">About Us</a></li>
<!-- /wp:list-item --><!-- wp:list-item -->
<li><a href="#">Our Team</a></li>
<!-- /wp:list-item --><!-- wp:list-item -->
<li><a href="#">Careers</a></li>
<!-- /wp:list-item --><!-- wp:list-item -->
<li><a href="#">Contact</a></li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->
<!-- /wp:sgs/container -->

<!-- wp:sgs/container {"tagName":"div","metadata":{"name":"Services Links"}} -->
<!-- wp:sgs/heading {"content":"Services","level":"h4","textColour":"surface","fontWeight":"700","fontSize":"medium"} /-->

<!-- wp:list {"style":{"typography":{"lineHeight":"2"},"spacing":{"padding":{"left":"0"}}},"textColor":"text-inverse","fontSize":"small"} -->
<ul style="padding-left:0;line-height:2" class="has-text-inverse-color has-text-color has-small-font-size"><!-- wp:list-item -->
<li><a href="#">Web Design</a></li>
<!-- /wp:list-item --><!-- wp:list-item -->
<li><a href="#">Development</a></li>
<!-- /wp:list-item --><!-- wp:list-item -->
<li><a href="#">SEO</a></li>
<!-- /wp:list-item --><!-- wp:list-item -->
<li><a href="#">Branding</a></li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->
<!-- /wp:sgs/container -->

<!-- wp:sgs/container {"tagName":"div","metadata":{"name":"Newsletter"}} -->
<!-- wp:sgs/heading {"content":"Stay Updated","level":"h4","textColour":"surface","fontWeight":"700","fontSize":"medium"} /-->

<!-- wp:sgs/text {"text":"Subscribe to our newsletter for the latest updates, tips, and insights.","textColour":"text-inverse","fontSize":"small"} /-->

<!-- wp:sgs/multi-button {"justifyContent":"flex-start"} -->
<!-- wp:sgs/button {"label":"Subscribe","url":"#","inheritStyle":"custom","colourBackground":"accent","colourText":"text","fontSize":14,"style":{"border":{"radius":"8px"}}} /-->
<!-- /wp:sgs/multi-button -->
<!-- /wp:sgs/container -->

<!-- /wp:sgs/site-footer-row -->

<!-- wp:sgs/site-footer-row {"rowSlot":"bottom","layout":"flex","justifyContent":"center","padding":{"desktop":{"top":"var(--wp--preset--spacing--40)","bottom":"var(--wp--preset--spacing--40)"}},"style":{"border":{"top":{"color":"var:preset|color|border-subtle","width":"1px"}}}} -->

<!-- wp:sgs/business-info {"displayType":"copyright","textColour":"text-inverse","fontSize":"small"} /-->

<!-- /wp:sgs/site-footer-row -->

<!-- /wp:sgs/site-footer -->
