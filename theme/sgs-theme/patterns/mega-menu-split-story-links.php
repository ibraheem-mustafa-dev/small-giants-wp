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

<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50","left":"var:preset|spacing|50","right":"var:preset|spacing|50"}}},"backgroundColor":"accent-light","layout":{"type":"constrained","contentSize":"1200px"}} -->
<div class="wp-block-group has-accent-light-background-color has-background" style="padding-top:var(--wp--preset--spacing--50);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--50)">

	<!-- wp:columns {"className":"sgs-mega-panel--split","style":{"spacing":{"blockGap":{"top":"0","left":"var:preset|spacing|60"}}}} -->
	<div class="wp-block-columns sgs-mega-panel--split">

		<!-- wp:column {"width":"60%"} -->
		<div class="wp-block-column" style="flex-basis:60%">

			<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}},"typography":{"textTransform":"uppercase","letterSpacing":"0.08em","fontWeight":"600"}},"textColor":"text-muted","fontSize":"small"} -->
			<p class="has-text-muted-color has-text-color has-small-font-size" style="margin-bottom:var(--wp--preset--spacing--20);text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Section label</p>
			<!-- /wp:paragraph -->

			<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}},"typography":{"fontSize":"1.25rem","fontWeight":"700"}},"textColor":"primary-dark"} -->
			<p class="has-primary-dark-color has-text-color" style="font-size:1.25rem;font-weight:700;margin-bottom:var(--wp--preset--spacing--30)">Section heading</p>
			<!-- /wp:paragraph -->

			<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}},"typography":{"fontSize":"0.9rem"}},"textColor":"text-muted"} -->
			<p class="has-text-muted-color has-text-color" style="font-size:0.9rem;margin-bottom:var(--wp--preset--spacing--30)">A short description of what this section is about. Two or three sentences that give visitors enough context to know whether they're in the right place.</p>
			<!-- /wp:paragraph -->

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

			<!-- wp:buttons {"style":{"spacing":{"margin":{"top":"var:preset|spacing|40"}}}} -->
			<div class="wp-block-buttons" style="margin-top:var(--wp--preset--spacing--40)">
				<!-- wp:button {"backgroundColor":"primary","textColor":"surface","style":{"border":{"radius":"8px"}}} -->
				<div class="wp-block-button"><a class="wp-block-button__link has-surface-color has-primary-background-color has-text-color has-background wp-element-button" href="#" style="border-radius:8px">Learn more &rarr;</a></div>
				<!-- /wp:button -->
			</div>
			<!-- /wp:buttons -->

		</div>
		<!-- /wp:column -->

		<!-- wp:column {"width":"40%","style":{"border":{"left":{"color":"var:preset|color|border-subtle","width":"1px"}},"spacing":{"padding":{"left":"var:preset|spacing|50"}}}} -->
		<div class="wp-block-column" style="flex-basis:40%;border-left-color:var(--wp--preset--color--border-subtle);border-left-width:1px;padding-left:var(--wp--preset--spacing--50)">

			<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}},"typography":{"textTransform":"uppercase","letterSpacing":"0.08em","fontWeight":"600"}},"textColor":"text-muted","fontSize":"small"} -->
			<p class="has-text-muted-color has-text-color has-small-font-size" style="margin-bottom:var(--wp--preset--spacing--30);text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Quick links</p>
			<!-- /wp:paragraph -->

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
<!-- /wp:group -->
