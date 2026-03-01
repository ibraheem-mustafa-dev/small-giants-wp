<?php
/**
 * Server-side render for the SGS Certification Bar block.
 *
 * @since 1.0.0
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$title          = $attributes['title'] ?? '';
$items          = $attributes['items'] ?? array();
$badge_style    = $attributes['badgeStyle'] ?? 'text-only';
$badge_size     = $attributes['badgeSize'] ?? 'medium';
$title_colour   = $attributes['titleColour'] ?? '';
$title_fontsize = $attributes['titleFontSize'] ?? '';
$label_colour   = $attributes['labelColour'] ?? '';
$label_fontsize = $attributes['labelFontSize'] ?? '';

$classes = array(
	'sgs-certification-bar',
	'sgs-certification-bar--' . esc_attr( $badge_style ),
	'sgs-certification-bar--' . esc_attr( $badge_size ),
);

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
	)
);

// Build inline style strings for title and badge labels.
$title_styles = array();
if ( $title_colour ) {
	$title_styles[] = 'color:' . sgs_colour_value( $title_colour );
}
if ( $title_fontsize ) {
	$title_styles[] = 'font-size:' . sgs_font_size_value( $title_fontsize );
}
$title_style_attr = $title_styles ? ' style="' . implode( ';', $title_styles ) . '"' : '';

$label_styles = array();
if ( $label_colour ) {
	$label_styles[] = 'color:' . sgs_colour_value( $label_colour );
}
if ( $label_fontsize ) {
	$label_styles[] = 'font-size:' . sgs_font_size_value( $label_fontsize );
}
$label_style_attr = $label_styles ? ' style="' . implode( ';', $label_styles ) . '"' : '';

// Build badges HTML.
$badges_html = '';
foreach ( $items as $item ) {
	// Badge inner content: optional image and/or label.
	$badge_inner = '';

	if ( 'text-only' !== $badge_style && ! empty( $item['image']['url'] ) ) {
		$img_id  = isset( $item['image']['id'] ) ? absint( $item['image']['id'] ) : 0;
		$img_alt = $item['label'] ?? ''; // Use label as alt text for certification images.

		$badge_inner .= sgs_responsive_image(
			$img_id,
			$item['image']['url'],
			$img_alt,
			'medium',
			array(
				'class'   => 'sgs-certification-bar__badge-img',
				'loading' => 'lazy',
			)
		);
	}

	if ( 'image-only' !== $badge_style && ! empty( $item['label'] ) ) {
		$badge_inner .= sprintf(
			'<span class="sgs-certification-bar__badge-label"%s>%s</span>',
			$label_style_attr,
			esc_html( $item['label'] )
		);
	}

	// Wrap in link if a URL is provided, otherwise use a plain div.
	if ( ! empty( $item['url'] ) ) {
		$badges_html .= sprintf(
			'<a href="%s" class="sgs-certification-bar__badge" target="_blank" rel="noopener noreferrer">%s</a>',
			esc_url( $item['url'] ),
			$badge_inner
		);
	} else {
		$badges_html .= '<div class="sgs-certification-bar__badge">' . $badge_inner . '</div>';
	}
}

// Assemble final output.
$output = '<div ' . $wrapper_attributes . '>';

if ( $title ) {
	$output .= sprintf(
		'<p class="sgs-certification-bar__title"%s>%s</p>',
		$title_style_attr,
		wp_kses_post( $title )
	);
}

if ( $badges_html ) {
	$output .= '<div class="sgs-certification-bar__badges">' . $badges_html . '</div>';
}

$output .= '</div>';

echo $output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — all inner content is escaped above.
