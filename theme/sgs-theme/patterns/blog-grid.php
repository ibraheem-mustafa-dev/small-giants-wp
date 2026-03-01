<?php
/**
 * Title: Blog — Post Grid
 * Slug: sgs-theme/blog-grid
 * Categories: sgs-content
 * Keywords: blog, posts, grid, articles, news, latest
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"surface","layout":{"type":"constrained","wideSize":"1200px"}} -->
<div class="wp-block-group alignfull has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--80);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--80);padding-left:var(--wp--preset--spacing--40)">

	<!-- Header -->
	<!-- wp:columns {"align":"wide","verticalAlignment":"center","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|60"}}}} -->
	<div class="wp-block-columns alignwide are-vertically-aligned-center" style="margin-bottom:var(--wp--preset--spacing--60)">
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:paragraph {"textColor":"accent","fontSize":"small","style":{"typography":{"fontWeight":"700","textTransform":"uppercase","letterSpacing":"0.1em"},"spacing":{"margin":{"bottom":"var:preset|spacing|10"}}}} -->
			<p class="has-accent-color has-text-color has-small-font-size" style="font-weight:700;letter-spacing:0.1em;margin-bottom:var(--wp--preset--spacing--10);text-transform:uppercase">Insights &amp; Ideas</p>
			<!-- /wp:paragraph -->
			<!-- wp:heading {"level":2,"fontSize":"xx-large","style":{"spacing":{"margin":{"top":"0","bottom":"0"}}}} -->
			<h2 class="wp-block-heading has-xx-large-font-size" style="margin-top:0;margin-bottom:0">Latest from Our Blog</h2>
			<!-- /wp:heading -->
		</div>
		<!-- /wp:column -->
		<!-- wp:column {"verticalAlignment":"center","width":"200px"} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:200px">
			<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"right"}} -->
			<div class="wp-block-buttons">
				<!-- wp:button {"className":"is-style-outline"} -->
				<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" href="/blog">All Articles</a></div>
				<!-- /wp:button -->
			</div>
			<!-- /wp:buttons -->
		</div>
		<!-- /wp:column -->
	</div>
	<!-- /wp:columns -->

	<!-- Dynamic Post Grid using WordPress Query Loop block -->
	<!-- wp:query {"query":{"perPage":3,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"","inherit":false},"align":"wide"} -->
	<div class="wp-block-query alignwide">

		<!-- wp:post-template {"layout":{"type":"grid","columnCount":3}} -->

			<!-- wp:group {"style":{"spacing":{"padding":{"top":"0","bottom":"var:preset|spacing|40","left":"0","right":"0"}},"border":{"radius":"16px"}},"backgroundColor":"surface-alt","layout":{"type":"constrained"}} -->
			<div class="wp-block-group has-surface-alt-background-color has-background" style="border-radius:16px;padding-bottom:var(--wp--preset--spacing--40)">

				<!-- wp:post-featured-image {"isLink":true,"style":{"border":{"radius":{"topLeft":"16px","topRight":"16px"}},"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}},"height":"220px"} /-->

				<!-- wp:group {"style":{"spacing":{"padding":{"left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}}} -->
				<div class="wp-block-group" style="padding-left:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40)">

					<!-- wp:post-terms {"term":"category","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}},"textColor":"accent","fontSize":"x-small"} /-->

					<!-- wp:post-title {"isLink":true,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}},"fontSize":"large","textColor":"text"} /-->

					<!-- wp:post-excerpt {"moreText":"Read more →","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}},"textColor":"text-muted","fontSize":"small"} /-->

					<!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"space-between"},"style":{"spacing":{"blockGap":"var:preset|spacing|20"}}} -->
					<div class="wp-block-group">
						<!-- wp:post-author-name {"isLink":false,"style":{"typography":{"fontWeight":"600"}},"fontSize":"small"} /-->
						<!-- wp:post-date {"style":{"typography":{"fontStyle":"normal"}},"textColor":"text-muted","fontSize":"small"} /-->
					</div>
					<!-- /wp:group -->

				</div>
				<!-- /wp:group -->

			</div>
			<!-- /wp:group -->

		<!-- /wp:post-template -->

		<!-- wp:query-no-results -->
		<!-- wp:paragraph {"textColor":"text-muted","align":"center"} -->
		<p class="has-text-muted-color has-text-color has-text-align-center">No posts found. Check back soon for new articles.</p>
		<!-- /wp:paragraph -->
		<!-- /wp:query-no-results -->

	</div>
	<!-- /wp:query -->

</div>
<!-- /wp:group -->
