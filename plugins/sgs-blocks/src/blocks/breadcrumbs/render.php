<?php
/**
 * Server-side render for the SGS Breadcrumbs block.
 *
 * Auto-generates breadcrumbs from the current page hierarchy.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$separator  = $attributes['separator'] ?? '/';
$show_home  = $attributes['showHome'] ?? true;
$home_label = $attributes['homeLabel'] ?? 'Home';

$wrapper_attributes = get_block_wrapper_attributes( array(
	'class' => 'sgs-breadcrumbs',
) );

$crumbs = array();

// Home.
if ( $show_home ) {
	$crumbs[] = array(
		'label' => esc_html( $home_label ),
		'url'   => esc_url( home_url( '/' ) ),
	);
}

// Build hierarchy based on context.
if ( is_singular() ) {
	$post = get_queried_object();

	if ( $post ) {
		// Post type archive link.
		$post_type = get_post_type_object( $post->post_type );
		if ( $post_type && $post_type->has_archive ) {
			$crumbs[] = array(
				'label' => esc_html( $post_type->labels->name ),
				'url'   => esc_url( get_post_type_archive_link( $post->post_type ) ),
			);
		}

		// Categories for posts.
		if ( 'post' === $post->post_type ) {
			$categories = get_the_category( $post->ID );
			if ( ! empty( $categories ) ) {
				$cat = $categories[0];
				$crumbs[] = array(
					'label' => esc_html( $cat->name ),
					'url'   => esc_url( get_category_link( $cat->term_id ) ),
				);
			}
		}

		// Page ancestors.
		if ( $post->post_parent ) {
			$ancestors = array_reverse( get_post_ancestors( $post->ID ) );
			foreach ( $ancestors as $ancestor_id ) {
				$crumbs[] = array(
					'label' => esc_html( get_the_title( $ancestor_id ) ),
					'url'   => esc_url( get_permalink( $ancestor_id ) ),
				);
			}
		}

		// Current page (no link).
		$crumbs[] = array(
			'label' => esc_html( get_the_title( $post->ID ) ),
			'url'   => '',
		);
	}
} elseif ( is_archive() ) {
	$crumbs[] = array(
		'label' => esc_html( get_the_archive_title() ),
		'url'   => '',
	);
} elseif ( is_search() ) {
	$crumbs[] = array(
		'label' => sprintf(
			/* translators: %s: search query */
			__( 'Search: "%s"', 'sgs-blocks' ),
			get_search_query()
		),
		'url'   => '',
	);
} elseif ( is_404() ) {
	$crumbs[] = array(
		'label' => __( 'Page not found', 'sgs-blocks' ),
		'url'   => '',
	);
}

if ( empty( $crumbs ) ) {
	return;
}

$sep_html = sprintf( '<span class="sgs-breadcrumbs__separator" aria-hidden="true">%s</span>', esc_html( $separator ) );

$items_html = '';
$last_index = count( $crumbs ) - 1;

foreach ( $crumbs as $i => $crumb ) {
	$is_last = ( $i === $last_index );

	if ( $is_last ) {
		$items_html .= sprintf(
			'<li class="sgs-breadcrumbs__item sgs-breadcrumbs__item--current" aria-current="page">%s</li>',
			$crumb['label']
		);
	} else {
		$items_html .= sprintf(
			'<li class="sgs-breadcrumbs__item"><a href="%s">%s</a>%s</li>',
			$crumb['url'],
			$crumb['label'],
			$sep_html
		);
	}
}

// Schema.org BreadcrumbList.
$schema_items = array();
foreach ( $crumbs as $i => $crumb ) {
	$schema_items[] = array(
		'@type'    => 'ListItem',
		'position' => $i + 1,
		'name'     => wp_strip_all_tags( $crumb['label'] ),
		'item'     => $crumb['url'] ?: null,
	);
}

$schema = array(
	'@context'        => 'https://schema.org',
	'@type'           => 'BreadcrumbList',
	'itemListElement' => $schema_items,
);

printf(
	'<nav %s aria-label="%s"><ol class="sgs-breadcrumbs__list">%s</ol><script type="application/ld+json">%s</script></nav>',
	$wrapper_attributes,
	esc_attr__( 'Breadcrumbs', 'sgs-blocks' ),
	$items_html,
	wp_json_encode( $schema, JSON_UNESCAPED_SLASHES )
);
