<?php
/**
 * Title: Team — Grid
 * Slug: sgs/team-section
 * Categories: sgs
 * Description: Team section with heading and three-column member grid.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:sgs/container {"tagName":"div","align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"surface","contentWidth":"normal"} -->
<div class="wp-block-group alignfull has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--80);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--80);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:sgs/heading {"content":"Meet Our Team","textAlign":"center","fontSize":"xx-large","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} /-->

	<!-- wp:sgs/text {"text":"The talented people behind our success.","textAlign":"center","textColour":"text-muted","fontSize":"medium","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|60"}}}} /-->

	<!-- wp:sgs/container {"layout":"grid","gridTemplateColumns":"1fr 1fr 1fr","gridTemplateColumnsMobile":"1fr","align":"wide","gap":"var:preset|spacing|40"} -->
	<div class="wp-block-columns alignwide">

		<!-- wp:sgs/container -->
		<div class="wp-block-column">
			<!-- wp:sgs/container {"tagName":"div","style":{"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}},"border":{"radius":"12px"}},"backgroundColor":"surface-alt"} -->
			<div class="wp-block-group has-surface-alt-background-color has-background" style="border-radius:12px;padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
				<!-- wp:sgs/media {"imageUrl":"https://placehold.co/120x120/0F7E80/FFFFFF?text=AJ","imageAlt":"Alex Johnson","alignment":"center","maxWidth":"120px","height":"120px","style":{"border":{"radius":"100%"}}} /-->
				<!-- wp:sgs/heading {"content":"Alex Johnson","textAlign":"center","level":"h3","fontSize":"large","style":{"spacing":{"margin":{"top":"var:preset|spacing|20"}}}} /-->
				<!-- wp:sgs/text {"text":"Creative Director","textAlign":"center","textColour":"primary","fontSize":"small","textTransform":"uppercase","letterSpacing":0.05,"letterSpacingUnit":"em","fontWeight":"600","style":{"spacing":{"margin":{"top":"0"}}}} /-->
				<!-- wp:sgs/text {"text":"Over 15 years of experience crafting digital experiences for leading brands.","textAlign":"center","textColour":"text-muted","fontSize":"small"} /-->
			</div>
			<!-- /wp:sgs/container -->
		</div>
		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container -->
		<div class="wp-block-column">
			<!-- wp:sgs/container {"tagName":"div","style":{"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}},"border":{"radius":"12px"}},"backgroundColor":"surface-alt"} -->
			<div class="wp-block-group has-surface-alt-background-color has-background" style="border-radius:12px;padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
				<!-- wp:sgs/media {"imageUrl":"https://placehold.co/120x120/F87A1F/FFFFFF?text=SP","imageAlt":"Sarah Patel","alignment":"center","maxWidth":"120px","height":"120px","style":{"border":{"radius":"100%"}}} /-->
				<!-- wp:sgs/heading {"content":"Sarah Patel","textAlign":"center","level":"h3","fontSize":"large","style":{"spacing":{"margin":{"top":"var:preset|spacing|20"}}}} /-->
				<!-- wp:sgs/text {"text":"Lead Developer","textAlign":"center","textColour":"primary","fontSize":"small","textTransform":"uppercase","letterSpacing":0.05,"letterSpacingUnit":"em","fontWeight":"600","style":{"spacing":{"margin":{"top":"0"}}}} /-->
				<!-- wp:sgs/text {"text":"Full-stack developer passionate about performance and accessibility.","textAlign":"center","textColour":"text-muted","fontSize":"small"} /-->
			</div>
			<!-- /wp:sgs/container -->
		</div>
		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container -->
		<div class="wp-block-column">
			<!-- wp:sgs/container {"tagName":"div","style":{"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}},"border":{"radius":"12px"}},"backgroundColor":"surface-alt"} -->
			<div class="wp-block-group has-surface-alt-background-color has-background" style="border-radius:12px;padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
				<!-- wp:sgs/media {"imageUrl":"https://placehold.co/120x120/2E7D4F/FFFFFF?text=ML","imageAlt":"Marcus Lee","alignment":"center","maxWidth":"120px","height":"120px","style":{"border":{"radius":"100%"}}} /-->
				<!-- wp:sgs/heading {"content":"Marcus Lee","textAlign":"center","level":"h3","fontSize":"large","style":{"spacing":{"margin":{"top":"var:preset|spacing|20"}}}} /-->
				<!-- wp:sgs/text {"text":"Strategy Lead","textAlign":"center","textColour":"primary","fontSize":"small","textTransform":"uppercase","letterSpacing":0.05,"letterSpacingUnit":"em","fontWeight":"600","style":{"spacing":{"margin":{"top":"0"}}}} /-->
				<!-- wp:sgs/text {"text":"Turning business goals into actionable digital strategies since 2012.","textAlign":"center","textColour":"text-muted","fontSize":"small"} /-->
			</div>
			<!-- /wp:sgs/container -->
		</div>
		<!-- /wp:sgs/container -->

	</div>
	<!-- /wp:sgs/container -->

</div>
<!-- /wp:sgs/container -->
