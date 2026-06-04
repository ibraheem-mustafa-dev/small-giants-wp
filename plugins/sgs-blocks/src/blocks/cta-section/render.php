<?php
/**
 * Server-side render for the SGS CTA Section block.
 *
 * FR-22-6 migration: the content column (headline, body text, and buttons) is
 * now rendered via InnerBlocks ($content). Scalar content attrs (headline, body)
 * are NO LONGER read here — they are retained in block.json for deprecated.js
 * back-compat only. R-22-14: NO legacy scalar fallback.
 *
 * Scalar STYLING/LAYOUT attributes still consumed here (wrapper/shell level):
 *   ribbon, layout, gradientPreset, backgroundImage, backgroundMedia,
 *   backgroundImageOpacity, stats, hoverBackground/Text/Border colour,
 *   transitionDuration, transitionEasing, bodyFontSize* (responsive CSS),
 *   textAlignMobile/Tablet/Desktop (responsive CSS targeting children).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    InnerBlocks HTML (headline, body, buttons).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// FR-22-6: scalar content attrs (headline, body) are intentionally NOT read here.
// They are retained in block.json for deprecated.js back-compat only. R-22-14.
$ribbon                   = isset( $attributes['ribbon'] ) ? sanitize_text_field( $attributes['ribbon'] ) : '';
// WS-4: `layout` renamed to `contentLayout` (the container owns `layout` = grid/flex).
// Read the new name; fall back to the legacy `layout` for un-migrated posts (belt-and-braces alongside deprecated.js).
$content_layout           = $attributes['contentLayout'] ?? ( $attributes['layout'] ?? 'centred' );
$body_font_size_tablet    = $attributes['bodyFontSizeTablet'] ?? '';
$body_font_size_mobile    = $attributes['bodyFontSizeMobile'] ?? '';
$background_image         = $attributes['backgroundImage'] ?? null;
$background_media         = $attributes['backgroundMedia'] ?? null;
$background_image_opacity = $attributes['backgroundImageOpacity'] ?? 30;

// Resolve the active media: prefer the unified backgroundMedia slot, otherwise
// synthesise from the legacy backgroundImage object so existing posts that have
// not yet round-tripped through the editor still render the same asset.
$resolved_media = null;
if ( ! empty( $background_media ) && is_array( $background_media ) && ! empty( $background_media['url'] ) ) {
	$resolved_media = $background_media;
} elseif ( ! empty( $background_image ) && is_array( $background_image ) && ! empty( $background_image['url'] ) ) {
	$resolved_media = array(
		'url'  => $background_image['url'],
		'type' => 'image',
		'id'   => $background_image['id'] ?? 0,
		'alt'  => $background_image['alt'] ?? '',
		'mime' => 'image/jpeg',
	);
}

$has_image_bg = $resolved_media && ( $resolved_media['type'] ?? 'image' ) === 'image';
$has_video_bg = $resolved_media && ( $resolved_media['type'] ?? 'image' ) === 'video';
$stats        = $attributes['stats'] ?? array();

$hover_background_colour = $attributes['hoverBackgroundColour'] ?? '';
$hover_text_colour       = $attributes['hoverTextColour'] ?? '';
$hover_border_colour     = $attributes['hoverBorderColour'] ?? '';
$transition_duration     = $attributes['transitionDuration'] ?? '300';
$transition_easing       = $attributes['transitionEasing'] ?? 'ease-in-out';

$allowed_gradient_presets = array( '', 'primary-fade', 'accent-glow', 'dark-radial', 'mesh-soft' );
$gradient_preset          = in_array( $attributes['gradientPreset'] ?? '', $allowed_gradient_presets, true )
	? sanitize_key( $attributes['gradientPreset'] ?? '' )
	: '';

// Build wrapper styles.
$wrapper_styles = array();

// Transition custom properties — consumed by CSS vars on the block and its children.
$wrapper_styles = array_merge( $wrapper_styles, sgs_transition_vars( $attributes ) );

if ( $hover_background_colour ) {
	$wrapper_styles[] = '--sgs-hover-bg:' . sgs_colour_value( $hover_background_colour );
}
if ( $hover_text_colour ) {
	$wrapper_styles[] = '--sgs-hover-text:' . sgs_colour_value( $hover_text_colour );
}
if ( $hover_border_colour ) {
	$wrapper_styles[] = '--sgs-hover-border:' . sgs_colour_value( $hover_border_colour );
}

if ( $has_image_bg ) {
	// Image backgrounds keep using a CSS background-image so the existing
	// overlay + text layering continues to work without layout changes.
	$wrapper_styles[] = 'background-image:url(' . esc_url( $resolved_media['url'] ) . ')';
	$wrapper_styles[] = 'background-size:cover';
	$wrapper_styles[] = 'background-position:center';
}

// Build wrapper classes.
$classes = array(
	'sgs-cta-section',
	'sgs-cta-section--' . esc_attr( $content_layout ),
);

if ( $gradient_preset ) {
	$classes[] = 'sgs-cta-section--gradient-' . esc_attr( $gradient_preset );
}

// Build responsive body font-size CSS.
// Targets .sgs-cta-section__body inside InnerBlocks children (sgs/text child
// may carry this class via its className attr set during migration).
$responsive_css = '';
if ( $body_font_size_tablet || $body_font_size_mobile ) {
	$uid       = 'sgs-cta-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
	$classes[] = $uid;

	if ( $body_font_size_tablet ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-cta-section__body{font-size:' . sgs_font_size_value( $body_font_size_tablet ) . '}}';
	}
	if ( $body_font_size_mobile ) {
		$responsive_css .= '@media (max-width:599px){.' . $uid . ' .sgs-cta-section__body{font-size:' . sgs_font_size_value( $body_font_size_mobile ) . '}}';
	}
}

// WS-4: the OUTER wrapper is now the shared sgs/container element (rendered by
// SGS_Container_Wrapper::render() at the foot of this file). cta-section's own
// classes + CSS vars + bespoke cover-image background ride through via opts; its
// overlay stays in the interior (no_overlay) so there is no double-emit.

// Build background media (video) + overlay.
$media_html = '';
if ( $has_video_bg ) {
	$video_attrs = array_merge(
		$resolved_media,
		array(
			'video_options' => array(
				'autoplay'    => true,
				'loop'        => true,
				'muted'       => true,
				'playsinline' => true,
				'controls'    => false,
			),
		)
	);
	// sgs_render_media() emits a <video class="sgs-media sgs-media--video sgs-media--sgs-cta-section">.
	// Wrap so the video sits behind the content + overlay without affecting layout.
	$rendered_video = sgs_render_media( $video_attrs, 'sgs/cta-section' );
	if ( '' !== $rendered_video ) {
		$media_html = '<div class="sgs-cta-section__bg-media" aria-hidden="true">' . $rendered_video . '</div>';
	}
}

$overlay_html = '';
if ( $resolved_media ) {
	$overlay_html = sprintf(
		'<span class="sgs-cta-section__overlay" style="opacity:%s" aria-hidden="true"></span>',
		esc_attr( $background_image_opacity / 100 )
	);
}

// Build stats HTML.
$stats_html = '';
if ( ! empty( $stats ) ) {
	$stats_html .= '<div class="sgs-cta-section__stats">';
	foreach ( $stats as $stat ) {
		$stat_text = $stat['text'] ?? '';
		if ( ! $stat_text ) {
			continue;
		}
		$stats_html .= sprintf(
			'<span class="sgs-cta-section__stat">%s</span>',
			esc_html( $stat_text )
		);
	}
	$stats_html .= '</div>';
}

// FR-22-6: $content is the full InnerBlocks output (sgs/heading + sgs/text +
// sgs/multi-button children). Wrap in __content to preserve CSS layout.
// Stats remain scalar — they are a shell-level data primitive (not plain text
// that a child block replicates), kept per FR-22-19 discriminator.
// R-22-14: no scalar headline/body fallback.

// Output responsive CSS if needed.
if ( $responsive_css ) {
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), wp_strip_all_tags( $responsive_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS generated from sanitised block attributes.
}

// Build ribbon HTML — content escaped with esc_html() at construction time.
$ribbon_html = '';
if ( $ribbon ) {
	$ribbon_html = '<span class="sgs-cta-section__ribbon" aria-hidden="true">' . esc_html( $ribbon ) . '</span>';
}

// WS-4: build cta-section's unique interior (bg-video + overlay + ribbon + the
// __content column with its InnerBlocks + stats), then wrap it in the shared
// sgs/container element. $content is WP core InnerBlocks output (trusted); all
// other parts are pre-escaped at construction time.
$cta_inner_html = $media_html . $overlay_html . $ribbon_html
	. '<div class="sgs-cta-section__content">' . $content . $stats_html . '</div>';

// cta-section keeps its bespoke cover-image background ($wrapper_styles -> extra_styles)
// and its opacity overlay (in the interior). Null the helper's backgroundImage so it does
// NOT also emit a CSS background, and pass no_overlay so it does NOT emit a second overlay
// (C3 double-emit guard). The full container attr surface is still mirrored for editor controls.
$cta_helper_attrs                    = $attributes;
$cta_helper_attrs['backgroundImage'] = null;

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
echo SGS_Container_Wrapper::render(
	$cta_helper_attrs,
	$block,
	$cta_inner_html,
	'section',
	array(
		'tag'           => 'section',
		'extra_classes' => $classes,
		'extra_styles'  => $wrapper_styles,
		'no_overlay'    => true,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
