<?php
/**
 * Title: SGS Framework Footer — Informational
 * Slug: sgs/framework-footer-informational
 * Block Types: core/template-part/footer
 * Categories: sgs-footers
 * Keywords: footer, sgs, framework, informational, three-column, links, hours, map, address
 * Viewport Width: 1440
 * Inserter: true
 * Description: Three-column footer — business description and socials, quick links and contact hours, map and address with directions. Content auto-populates from Settings > Business Details. Starter template for the sgs_footer CPT (Spec 37 FR-37-8) — built on sgs/site-footer with a 3-column "columns" row.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-footer {"align":"full","backgroundColor":"footer-bg","contentWidth":"normal"} -->

<!-- wp:sgs/site-footer-row {"rowSlot":"columns","layout":"grid","columns":3,"padding":{"desktop":{"top":"var(--wp--preset--spacing--60)"}}} -->

<!-- wp:sgs/container {"tagName":"div","metadata":{"name":"Brand"}} -->
<!-- wp:sgs/responsive-logo {"width":200,"linkToHome":true} /-->

<!-- wp:sgs/business-info {"displayType":"description","textColour":"text-inverse","fontSize":"small"} /-->

<!-- wp:sgs/business-info {"displayType":"socials"} /-->
<!-- /wp:sgs/container -->

<!-- wp:sgs/container {"tagName":"div","metadata":{"name":"Links and Contact"}} -->
<!-- wp:sgs/heading {"content":"Quick Links","level":"h2","textColour":"surface","fontWeight":"700","fontSize":"medium"} /-->

<!-- wp:list {"style":{"typography":{"lineHeight":"2.2"},"spacing":{"padding":{"left":"0"}}},"textColor":"text-inverse","fontSize":"small"} -->
<ul style="padding-left:0;line-height:2.2" class="has-text-inverse-color has-text-color has-small-font-size"><!-- wp:list-item -->
<li><a href="#">Home</a></li>
<!-- /wp:list-item --><!-- wp:list-item -->
<li><a href="#">About</a></li>
<!-- /wp:list-item --><!-- wp:list-item -->
<li><a href="#">Services</a></li>
<!-- /wp:list-item --><!-- wp:list-item -->
<li><a href="#">Contact</a></li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->

<!-- wp:sgs/heading {"content":"Contact","level":"h3","textColour":"surface","fontWeight":"700","fontSize":"medium"} /-->

<!-- wp:sgs/business-info {"displayType":"phone","textColour":"text-inverse","fontSize":"small"} /-->

<!-- wp:sgs/business-info {"displayType":"email","textColour":"text-inverse","fontSize":"small"} /-->

<!-- wp:sgs/heading {"content":"Opening Hours","level":"h3","textColour":"surface","fontWeight":"700","fontSize":"medium"} /-->

<!-- wp:sgs/business-info {"displayType":"hours","textColour":"text-inverse","fontSize":"small"} /-->
<!-- /wp:sgs/container -->

<!-- wp:sgs/container {"tagName":"div","metadata":{"name":"Map and Address"}} -->
<!-- wp:sgs/business-info {"displayType":"map"} /-->

<!-- wp:sgs/heading {"content":"Address","level":"h3","textColour":"surface","fontWeight":"700","fontSize":"medium"} /-->

<!-- wp:sgs/business-info {"displayType":"address","textColour":"text-inverse","fontSize":"small"} /-->

<!-- wp:sgs/multi-button {"justifyContent":"flex-start"} -->
<!-- wp:sgs/button {"label":"Get Directions","url":"#","inheritStyle":"custom","colourBackground":"accent","colourText":"text","fontSize":14,"style":{"border":{"radius":"8px"}}} /-->
<!-- /wp:sgs/multi-button -->
<!-- /wp:sgs/container -->

<!-- /wp:sgs/site-footer-row -->

<!-- wp:sgs/site-footer-row {"rowSlot":"bottom","layout":"flex","justifyContent":"center","padding":{"desktop":{"top":"var(--wp--preset--spacing--40)","bottom":"var(--wp--preset--spacing--40)"}},"margin":{"desktop":{"top":"var(--wp--preset--spacing--50)"}},"style":{"border":{"top":{"color":"var:preset|color|accent","width":"1px"}}}} -->

<!-- wp:sgs/business-info {"displayType":"copyright","textColour":"text-inverse","fontSize":"small"} /-->

<!-- /wp:sgs/site-footer-row -->

<!-- /wp:sgs/site-footer -->
