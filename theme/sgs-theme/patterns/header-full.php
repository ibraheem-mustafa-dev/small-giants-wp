<?php
/**
 * Title: Header — Full (Top Bar + Navigation)
 * Slug: sgs/header-full
 * Categories: sgs-headers
 * Block Types: core/template-part/header
 * Description: Full header with contact top bar (phone, email, socials), logo, navigation, and mobile drawer. Contact info auto-populates from Settings > Business Details. Starter template for the sgs_header CPT (Spec 37 FR-37-8) — built on sgs/site-header with the standard nav-menu + nav-drawer pair (Spec 36).
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-header {"align":"full","backgroundColor":"surface"} -->

<!-- wp:sgs/site-header-row {"rowSlot":"top","justifyContent":"space-between","backgroundColor":"primary","padding":{"desktop":{"top":"8px","bottom":"8px"}}} -->
<!-- wp:sgs/business-info {"displayType":"phone","textColour":"surface","fontSize":"medium"} /-->
<!-- wp:sgs/business-info {"displayType":"email","textColour":"surface","fontSize":"medium"} /-->
<!-- wp:sgs/business-info {"displayType":"socials","iconColour":"surface"} /-->
<!-- /wp:sgs/site-header-row -->

<!-- wp:sgs/site-header-row {"rowSlot":"middle","justifyContent":"space-between","padding":{"desktop":{"top":"var(--wp--preset--spacing--30)","bottom":"var(--wp--preset--spacing--30)"}},"style":{"border":{"bottom":{"color":"var:preset|color|surface-alt","width":"1px"}}}} -->
<!-- wp:sgs/responsive-logo {"width":300,"linkToHome":true} /-->
<!-- wp:sgs/nav-menu {"ref":0,"itemColour":"text","gap":"28px"} /-->
<!-- /wp:sgs/site-header-row -->

<!-- /wp:sgs/site-header -->

<!-- wp:sgs/nav-drawer -->
<!-- wp:sgs/nav-menu {"ref":0} /-->
<!-- wp:sgs/responsive-logo {"width":140,"linkToHome":true} /-->
<!-- wp:sgs/business-info {"displayType":"phone"} /-->
<!-- wp:sgs/business-info {"displayType":"email"} /-->
<!-- wp:sgs/business-info {"displayType":"socials"} /-->
<!-- /wp:sgs/nav-drawer -->
