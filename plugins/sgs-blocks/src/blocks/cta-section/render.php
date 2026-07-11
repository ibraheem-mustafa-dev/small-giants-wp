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
 *   backgroundImageOpacity, stats, background/text/border colourHover,
 *   transitionDuration, transitionEasing,
 *   textAlignMobile/Tablet/Desktop (responsive CSS targeting children).
 *
 * BOX-GROUP (contract §B, 2026-07-09): paddingTablet/paddingMobile,
 * marginTablet/marginMobile, contentBandPadding/Tablet/Mobile are box OBJECTS
 * ({top,right,bottom,left}) — no more flat per-side attrs. These are read +
 * emitted entirely by SGS_Container_Wrapper (mirrors sgs/container); this
 * file does not touch them directly.
 *
 * NO-INLINE (contract §A, 2026-07-09): the rendered subtree (section root,
 * overlay, content column) carries ZERO inline CSS property declarations.
 * color/typography/spacing/shadow/__experimentalBorder all declare
 * __experimentalSkipSerialization in block.json; every value is emitted into
 * CTA-SECTION'S OWN scoped `.{uid}` <style> instead (composite caveat — these
 * do NOT ride through the shared wrapper's `extra_styles`, which would inline
 * them). Section-level WP-native padding/margin remains the wrapper's own
 * scoped mechanism (unchanged). The background-image/size/position trio and
 * the legacy string `shadow` token attr are ALSO moved out of the wrapper's
 * `extra_styles` into this file's own scoped rule (they used to inline via
 * extra_styles before this migration).
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

// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style / shadow token) — letters + hyphen only.
// Mirrors sgs/hero's proven sanitiser.
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// CSS length/unit sanitiser — for free-text attrs (border width/radius)
// concatenated into raw CSS declarations. Mirrors sgs/hero's sanitiser.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// FR-22-6: scalar content attrs (headline, body) are intentionally NOT read here.
// They are retained in block.json for deprecated.js back-compat only. R-22-14.
$ribbon                   = isset( $attributes['ribbon'] ) ? sanitize_text_field( $attributes['ribbon'] ) : '';
// WS-4: `layout` renamed to `contentLayout` (the container owns `layout` = grid/flex).
// Read the new name; fall back to the legacy `layout` for un-migrated posts (belt-and-braces alongside deprecated.js).
$content_layout           = $attributes['contentLayout'] ?? ( $attributes['layout'] ?? 'centred' );
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

$hover_background_colour = $attributes['backgroundColourHover'] ?? '';
$hover_text_colour       = $attributes['textColourHover'] ?? '';
$hover_border_colour     = $attributes['borderColourHover'] ?? '';
$transition_duration     = $attributes['transitionDuration'] ?? '300';
$transition_easing       = $attributes['transitionEasing'] ?? 'ease-in-out';

$allowed_gradient_presets = array( '', 'primary-fade', 'accent-glow', 'dark-radial', 'mesh-soft' );
$gradient_preset          = in_array( $attributes['gradientPreset'] ?? '', $allowed_gradient_presets, true )
	? sanitize_key( $attributes['gradientPreset'] ?? '' )
	: '';

// Legacy string `shadow` token attr (sm/md/lg/glow) — duplicates the native
// `shadow` support. This attr is the one that actually drove the visible
// shadow (via the shared wrapper's extra_styles, which inlines); the native
// support was a phantom no-op until this migration. No-inline contract (§A):
// route the resolved box-shadow into cta-section's OWN scoped <style> instead
// of the wrapper's extra_styles. $cta_helper_attrs nulls `shadow` below (C3
// double-emit guard) so the wrapper never re-emits it.
$shadow_token = $sgs_css_keyword( $attributes['shadow'] ?? '' );

// Generate a unique ID for responsive CSS scoping. This is a CLASS (contract
// §B3-style scoping — matches the container/hero/quote convention).
$uid      = 'sgs-cta-section-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-cta-section';

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

// ── Responsive CSS builder ──────────────────────────────────────────────────
// No-inline contract (§A): background-image/size/position (a real property
// declaration trio) is deferred to the scoped .uid rule below — was
// previously pushed inline via $wrapper_styles → wrapper extra_styles.
$responsive_css = '';

if ( $has_image_bg ) {
	// Image backgrounds keep using a CSS background-image so the existing
	// overlay + text layering continues to work without layout changes.
	$responsive_css .= $root_sel . '{background-image:url(' . esc_url( $resolved_media['url'] ) . ');background-size:cover;background-position:center}';
}

// Class marker replaces the old [style*="background"] attribute sniff
// (style.css's `.sgs-cta-section:not(.sgs-cta-section--has-bg-image)` fallback)
// now that background-image no longer rides on the inline style attribute.
$has_bg_image_class = $has_image_bg;

if ( $shadow_token ) {
	$responsive_css .= $root_sel . '{box-shadow:var(--wp--preset--shadow--' . esc_attr( $shadow_token ) . ')}';
}

// Build wrapper classes.
$classes = array(
	'sgs-cta-section',
	'sgs-cta-section--' . esc_attr( $content_layout ),
	$uid,
);

if ( $gradient_preset ) {
	$classes[] = 'sgs-cta-section--gradient-' . esc_attr( $gradient_preset );
}

if ( $has_bg_image_class ) {
	$classes[] = 'sgs-cta-section--has-bg-image';
}

// ── WP-native color / border / typography / shadow supports — no-inline
// contract (§A). block.json declares color/typography/spacing/shadow/
// __experimentalBorder ALL with __experimentalSkipSerialization:true, so
// get_block_wrapper_attributes() (called inside SGS_Container_Wrapper::render()
// below) never auto-inlines them. Read the resolved values from
// $attributes['style'] here and emit them into CTA-SECTION'S OWN scoped
// <style> (composite caveat, per the migration contract: do NOT pass these as
// wrapper `extra_styles` — that path inlines). Base spacing (padding/margin)
// is a SEPARATE mechanism the wrapper already handles scoped internally.
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$cta_style_engine_args = array();

	$color_args = array();
	if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
		$color_args['text'] = (string) $attributes['style']['color']['text'];
	}
	if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
		$color_args['background'] = (string) $attributes['style']['color']['background'];
	}
	if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
		$color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
	}
	if ( ! empty( $color_args ) ) {
		$cta_style_engine_args['color'] = $color_args;
	}

	$border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		$border_args['color'] = (string) $attributes['style']['border']['color'];
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$border_args['style'] = $sgs_css_keyword( $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$border_args['width'] = $sgs_css_length( $attributes['style']['border']['width'] );
	}
	if ( isset( $attributes['style']['border']['radius'] ) ) {
		$radius_raw = $attributes['style']['border']['radius'];
		if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
			$border_args['radius'] = $sgs_css_length( $radius_raw );
		} elseif ( is_array( $radius_raw ) ) {
			$radius_clean = array();
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
				if ( ! empty( $radius_raw[ $corner ] ) ) {
					$radius_clean[ $corner ] = $sgs_css_length( $radius_raw[ $corner ] );
				}
			}
			if ( ! empty( $radius_clean ) ) {
				$border_args['radius'] = $radius_clean;
			}
		}
	}
	if ( ! empty( $border_args ) ) {
		$cta_style_engine_args['border'] = $border_args;
	}

	if ( isset( $attributes['style']['shadow'] ) && '' !== $attributes['style']['shadow'] ) {
		$cta_style_engine_args['shadow'] = $attributes['style']['shadow'];
	}

	if ( ! empty( $cta_style_engine_args ) ) {
		$cta_scoped_styles = wp_style_engine_get_styles(
			$cta_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $cta_scoped_styles['css'] ) ) {
			$responsive_css .= $cta_scoped_styles['css'];
		}
	}

	// Typography — declared selector (block.json selectors.typography.root)
	// targets .sgs-cta-section__headline.
	$typography_args = array();
	if ( isset( $attributes['style']['typography']['fontSize'] ) && '' !== $attributes['style']['typography']['fontSize'] ) {
		$typography_args['fontSize'] = (string) $attributes['style']['typography']['fontSize'];
	}
	if ( isset( $attributes['style']['typography']['lineHeight'] ) && '' !== $attributes['style']['typography']['lineHeight'] ) {
		$typography_args['lineHeight'] = (string) $attributes['style']['typography']['lineHeight'];
	}
	if ( isset( $attributes['style']['typography']['letterSpacing'] ) && '' !== $attributes['style']['typography']['letterSpacing'] ) {
		$typography_args['letterSpacing'] = $sgs_css_length( $attributes['style']['typography']['letterSpacing'] );
	}
	if ( isset( $attributes['style']['typography']['textTransform'] ) && '' !== $attributes['style']['typography']['textTransform'] ) {
		$typography_args['textTransform'] = $sgs_css_keyword( $attributes['style']['typography']['textTransform'] );
	}
	if ( isset( $attributes['style']['typography']['fontWeight'] ) && '' !== $attributes['style']['typography']['fontWeight'] ) {
		$typography_args['fontWeight'] = $sgs_css_keyword( (string) $attributes['style']['typography']['fontWeight'] );
	}
	if ( isset( $attributes['style']['typography']['fontStyle'] ) && '' !== $attributes['style']['typography']['fontStyle'] ) {
		$typography_args['fontStyle'] = $sgs_css_keyword( $attributes['style']['typography']['fontStyle'] );
	}
	if ( ! empty( $typography_args ) ) {
		$typography_scoped = wp_style_engine_get_styles(
			array( 'typography' => $typography_args ),
			array( 'selector' => $root_sel . ' .sgs-cta-section__headline' )
		);
		if ( ! empty( $typography_scoped['css'] ) ) {
			$responsive_css .= $typography_scoped['css'];
		}
	}
	if ( isset( $attributes['textAlign'] ) && in_array( $attributes['textAlign'], array( 'left', 'center', 'right' ), true ) ) {
		$responsive_css .= $root_sel . ' .sgs-cta-section__headline{text-align:' . $attributes['textAlign'] . '}';
	}
}

// Skip-serialised `color` support also stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add them
// manually (mirrors sgs/hero / sgs/quote) so preset palette colours still
// resolve visually.
$cta_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$cta_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $cta_preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $cta_preset_text_slug . '-color';
}
if ( '' !== $cta_preset_bg_slug ) {
	$classes[] = 'has-background';
	$classes[] = 'has-' . $cta_preset_bg_slug . '-background-color';
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

// No-inline contract (§A): `opacity` is a real CSS property, so it is NOT set
// via inline style="opacity:…" any more. Only the CUSTOM PROPERTY VALUE
// (--sgs-cta-overlay-opacity) rides inline (permitted — custom-prop values are
// not property declarations); style.css reads it via var(...,1).
$overlay_html = '';
if ( $resolved_media ) {
	$overlay_html = sprintf(
		'<span class="sgs-cta-section__overlay" style="--sgs-cta-overlay-opacity:%s" aria-hidden="true"></span>',
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

// Output responsive CSS if needed. wp_strip_all_tags (NOT esc_html) blocks a
// </style> breakout while leaving CSS combinators like `>` intact (contract
// §D — matches SGS_Container_Wrapper + sgs/hero + sgs/quote). Every value
// reaching $responsive_css is pre-sanitised ($sgs_css_length / $sgs_css_keyword
// / esc_url / esc_attr / wp_style_engine_get_styles), so no un-sanitised value
// survives to here.
if ( $responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below; $responsive_css built from pre-sanitised values only.
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), wp_strip_all_tags( $responsive_css ) );
}

// cta-section keeps its bespoke cover-image background ($wrapper_styles -> extra_styles)
// and its opacity overlay (in the interior). Null the helper's backgroundImage so it does
// NOT also emit a CSS background, and pass no_overlay so it does NOT emit a second overlay
// (C3 double-emit guard). `shadow` is ALSO nulled — cta-section now emits box-shadow itself
// (scoped, above) so the wrapper must not re-emit it via extra_styles (which would inline
// it). The full container attr surface is still mirrored for editor controls.
$cta_helper_attrs                    = $attributes;
$cta_helper_attrs['backgroundImage'] = null;
$cta_helper_attrs['shadow']          = null;

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
