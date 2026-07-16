<?php
/**
 * Title: Mega Menu — Split: Story + Links
 * Slug: sgs/mega-menu-split-story-links
 * Categories: mega-menu-layouts
 * Block Types: core/template-part/mega-menu
 * Keywords: mega menu, split, story, about, links, 60 40, content
 * Viewport Width: 1200
 * Inserter: true
 * Description: 60/40 split — rich content (heading, text, icon list, CTA) on the left, a navigation link list on the right. Good for About or Services panels where the brand story matters.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/container {"tagName":"div","style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50","left":"var:preset|spacing|50","right":"var:preset|spacing|50"}}},"backgroundColor":"accent-light","contentWidth":"1200px"} -->
<div class="wp-block-group has-accent-light-background-color has-background" style="padding-top:var(--wp--preset--spacing--50);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--50)">

	<!-- wp:columns {"className":"sgs-mega-panel--split","style":{"spacing":{"blockGap":{"top":"0","left":"var:preset|spacing|60"}}}} -->
	<div class="wp-block-columns sgs-mega-panel--split">

		<!-- wp:column {"width":"60%"} -->
		<div class="wp-block-column" style="flex-basis:60%">

			<!-- wp:sgs/text {"text":"Section label","textTransform":"uppercase","letterSpacing":0.08,"letterSpacingUnit":"em","fontWeight":"600","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}},"textColour":"text-muted","fontSize":"small"} /-->

			<!-- wp:sgs/text {"text":"Section heading","fontSize":"1.25rem","fontWeight":"700","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}},"textColour":"primary-dark"} /-->

			<!-- wp:sgs/text {"text":"A short description of what this section is about. Two or three sentences that give visitors enough context to know whether they're in the right place.","fontSize":"0.9rem","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}},"textColour":"text-muted"} /-->

			<!-- wp:list {"className":"sgs-mega-link-list","style":{"spacing":{"padding":{"left":"0"}},"typography":{"lineHeight":"2.2"}}} -->
			<ul class="wp-block-list sgs-mega-link-list" style="padding-left:0;line-height:2.2">
				<!-- wp:list-item -->
				<li>✓ Feature or benefit one</li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li>✓ Feature or benefit two</li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li>✓ Feature or benefit three</li>
				<!-- /wp:list-item -->
			</ul>
			<!-- /wp:list -->

			<!-- wp:sgs/multi-button {"style":{"spacing":{"margin":{"top":"var:preset|spacing|40"}}}} -->
				<!-- wp:sgs/button {"label":"Learn more &rarr;","url":"#","inheritStyle":"primary","style":{"border":{"radius":"8px"}}} /-->
			<!-- /wp:sgs/multi-button -->

		</div>
		<!-- /wp:column -->

		<!-- wp:column {"width":"40%","style":{"border":{"left":{"color":"var:preset|color|border-subtle","width":"1px"}},"spacing":{"padding":{"left":"var:preset|spacing|50"}}}} -->
		<div class="wp-block-column" style="flex-basis:40%;border-left-color:var(--wp--preset--color--border-subtle);border-left-width:1px;padding-left:var(--wp--preset--spacing--50)">

			<!-- wp:sgs/text {"text":"Quick links","textTransform":"uppercase","letterSpacing":0.08,"letterSpacingUnit":"em","fontWeight":"600","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}},"textColour":"text-muted","fontSize":"small"} /-->

			<!-- wp:list {"className":"sgs-mega-link-list","style":{"spacing":{"padding":{"left":"0"}},"typography":{"lineHeight":"2.4"}}} -->
			<ul class="wp-block-list sgs-mega-link-list" style="padding-left:0;line-height:2.4">
				<!-- wp:list-item -->
				<li><a href="#">Link one</a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li><a href="#">Link two</a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li><a href="#">Link three</a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li><a href="#">Link four</a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li><a href="#">Link five</a></li>
				<!-- /wp:list-item -->
			</ul>
			<!-- /wp:list -->

		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

</div>
<!-- /wp:sgs/container -->
