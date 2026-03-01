<?php
/**
 * Table of Contents — server-side render.
 *
 * Parses the current post content to detect headings
 * and renders a navigable nested list.
 *
 * Uses WordPress's block parser for reliable heading extraction
 * rather than raw regex on post_content.
 *
 * @since 1.0.0
 * @var array    $attributes Block attributes.
 * @var string   $content    (unused — no inner blocks).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$heading_levels    = $attributes['headingLevels'] ?? [ 2, 3, 4 ];
$toc_title         = $attributes['title'] ?? __( 'Table of Contents', 'sgs-blocks' );
$collapsible       = ! empty( $attributes['collapsible'] );
$default_collapsed = ! empty( $attributes['defaultCollapsed'] );
$smooth_scroll     = ! empty( $attributes['smoothScroll'] );
$scroll_offset     = (int) ( $attributes['scrollOffset'] ?? 0 );
$scroll_spy        = ! empty( $attributes['scrollSpy'] );
$list_style        = $attributes['listStyle'] ?? 'numbered';
$toc_style         = $attributes['style'] ?? 'card';
$title_colour      = $attributes['titleColour'] ?? '';
$link_colour       = $attributes['linkColour'] ?? '';
$active_colour     = $attributes['activeLinkColour'] ?? 'primary';

// ——— Parse headings from post content ———
$post = get_post();
if ( ! $post ) {
	return;
}

$post_content = $post->post_content;
if ( empty( $post_content ) ) {
	return;
}

// Use WordPress block parser for reliable heading extraction.
$blocks   = parse_blocks( $post_content );
$headings = [];
$used_slugs = [];

/**
 * Recursively extract headings from parsed blocks.
 *
 * @since 1.0.0
 * @param array $blocks      Parsed block array.
 * @param array &$headings   Collected headings.
 * @param array &$used_slugs Slugs already used (for deduplication).
 * @param array $levels      Heading levels to include.
 */
function sgs_toc_extract_headings( array $blocks, array &$headings, array &$used_slugs, array $levels ): void {
	foreach ( $blocks as $block ) {
		if ( 'core/heading' === ( $block['blockName'] ?? '' ) ) {
			$level = (int) ( $block['attrs']['level'] ?? 2 );

			if ( ! in_array( $level, $levels, true ) ) {
				continue;
			}

			// Extract text from the innerHTML.
			$text = wp_strip_all_tags( $block['innerHTML'] ?? '' );
			$text = trim( $text );

			if ( empty( $text ) ) {
				continue;
			}

			// Check for sgs-toc-ignore class.
			if ( isset( $block['attrs']['className'] ) && str_contains( $block['attrs']['className'], 'sgs-toc-ignore' ) ) {
				continue;
			}

			// Use explicit anchor if set, otherwise generate from text.
			if ( ! empty( $block['attrs']['anchor'] ) ) {
				$slug = $block['attrs']['anchor'];
			} else {
				$slug = sanitize_title( $text );
			}

			if ( empty( $slug ) ) {
				continue;
			}

			// Deduplicate slugs.
			$original = $slug;
			$counter  = 2;
			while ( in_array( $slug, $used_slugs, true ) ) {
				$slug = $original . '-' . $counter;
				$counter++;
			}
			$used_slugs[] = $slug;

			$headings[] = [
				'level' => $level,
				'text'  => $text,
				'id'    => $slug,
			];
		}

		// Recurse into inner blocks (headings inside groups, columns, etc.).
		if ( ! empty( $block['innerBlocks'] ) ) {
			sgs_toc_extract_headings( $block['innerBlocks'], $headings, $used_slugs, $levels );
		}
	}
}

sgs_toc_extract_headings( $blocks, $headings, $used_slugs, $heading_levels );

if ( empty( $headings ) ) {
	return;
}

// ——— Build output ———
$classes = [
	'sgs-toc',
	'sgs-toc--' . esc_attr( $toc_style ),
	'sgs-toc--' . esc_attr( $list_style ),
];

$wrapper = get_block_wrapper_attributes( [
	'class'              => implode( ' ', $classes ),
	'data-smooth-scroll' => $smooth_scroll ? 'true' : 'false',
	'data-scroll-offset' => (string) $scroll_offset,
	'data-scroll-spy'    => $scroll_spy ? 'true' : 'false',
	'aria-label'         => esc_attr( $toc_title ),
] );

// Colour helpers.
$title_style = '';
if ( $title_colour ) {
	$title_style = ' style="color:var(--wp--preset--color--' . esc_attr( $title_colour ) . ')"';
}

$link_style = '';
if ( $link_colour ) {
	$link_style = ' style="color:var(--wp--preset--color--' . esc_attr( $link_colour ) . ')"';
}

$active_data = '';
if ( $active_colour ) {
	$active_data = ' data-active-colour="var(--wp--preset--color--' . esc_attr( $active_colour ) . ')"';
}

$list_tag = 'numbered' === $list_style ? 'ol' : 'ul';

// Use <details>/<summary> for collapsible (progressive enhancement).
$open_attr = $default_collapsed ? '' : ' open';

ob_start();

if ( $collapsible ) {
	printf( '<nav %s%s>', $wrapper, $active_data );
	printf( '<details%s>', $open_attr );
	printf(
		'<summary class="sgs-toc__title"%s>%s</summary>',
		$title_style,
		esc_html( $toc_title )
	);
} else {
	printf( '<nav %s%s>', $wrapper, $active_data );
	if ( $toc_title ) {
		printf(
			'<p class="sgs-toc__title"%s>%s</p>',
			$title_style,
			esc_html( $toc_title )
		);
	}
}

printf( '<%s class="sgs-toc__list"%s>', $list_tag, $link_style );

foreach ( $headings as $heading ) {
	printf(
		'<li class="sgs-toc__item sgs-toc__item--h%d"><a class="sgs-toc__link" href="#%s">%s</a></li>',
		$heading['level'],
		esc_attr( $heading['id'] ),
		esc_html( $heading['text'] )
	);
}

printf( '</%s>', $list_tag );

if ( $collapsible ) {
	echo '</details>';
}

echo '</nav>';

echo ob_get_clean();
