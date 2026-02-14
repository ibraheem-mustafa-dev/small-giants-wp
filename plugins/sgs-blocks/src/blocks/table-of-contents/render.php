<?php
/**
 * Table of Contents — server-side render.
 *
 * Parses the current post content to detect headings
 * and renders a navigable nested list.
 *
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

// ─── Parse headings from post content ───
$post = get_post();
if ( ! $post ) {
	return;
}

$post_content = $post->post_content;
if ( empty( $post_content ) ) {
	return;
}

// Build regex for the selected heading levels.
$levels_pattern = implode( '|', array_map( 'intval', $heading_levels ) );
$pattern        = '/<h(' . $levels_pattern . ')([^>]*)>(.*?)<\/h\1>/si';

if ( ! preg_match_all( $pattern, $post_content, $matches, PREG_SET_ORDER ) ) {
	return; // No headings found — render nothing.
}

$headings   = [];
$used_slugs = [];

foreach ( $matches as $match ) {
	$level     = (int) $match[1];
	$attrs_str = $match[2];
	$text      = wp_strip_all_tags( $match[3] );

	if ( empty( $text ) ) {
		continue;
	}

	// Skip headings with sgs-toc-ignore class.
	if ( str_contains( $attrs_str, 'sgs-toc-ignore' ) ) {
		continue;
	}

	// Extract existing id or generate one.
	if ( preg_match( '/\bid=["\']([^"\']+)["\']/', $attrs_str, $id_match ) ) {
		$slug = $id_match[1];
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

if ( empty( $headings ) ) {
	return;
}

// ─── Build output ───
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
