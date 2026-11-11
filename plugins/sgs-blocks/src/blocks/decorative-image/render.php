<?php
/**
 * Server-side render for the SGS Floating layer (sgs/decorative-image).
 *
 * A layer is a picture alone, or a box holding inner blocks (text, a label, a badge) with an optional picture
 * behind them, or an empty box that draws a ring, a disc or a tinted panel. The picture always prints through
 * `SGS_Media_Element::render()` (Spec 49 C2) for the `layer` slot, kinds image and svg.
 *
 * - Picture only: the renderer's outermost element is the layer root, so a bare image is a naked `<img>`. The media
 *   atoms paint width, height, ratio, opacity, corners, border and shadow on it. The helper prints only for a mask
 *   shape or an effect that paints a layer (surface treatment, parallax).
 * - Inner blocks, or no picture: the layer root is a `<div>` or `<span>` and paints its own box (width, height,
 *   opacity, fill, border, corners, shadow) from the shared assemblers. The picture inside fills it, so those
 *   settings are withheld from the renderer.
 *
 * Position, rotation, flip, stacking and overflow belong to the layer root in both shapes. They print in the block's own
 * scoped `<style>`, keyed on `.{uid}.sgs-decorative-image`. No inline style declarations (Spec 32); the scope token is a CLASS
 * (`.sgs-di-XXXXXXXX`) because the block declares `supports.anchor` (FR-32-4); `view.js` only writes `--sgs-di-op`.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-layer-edges.php';

// Every value that reaches the scoped CSS is cast through this or is a literal.
$sgs_css_num = static function ( $value, int $decimals = 4 ): float {
	return is_numeric( $value ) ? round( (float) $value, $decimals ) : 0.0;
};

$position_x_obj = sgs_responsive_normalise_object( $attributes['positionX'] ?? null );
$position_y_obj = sgs_responsive_normalise_object( $attributes['positionY'] ?? null );
$rotation_obj   = sgs_responsive_normalise_object( $attributes['rotation'] ?? null );
$z_index        = $attributes['zIndex'] ?? 1;
$flip_x         = $attributes['flipX'] ?? false;
$fade_on_scroll = (bool) ( $attributes['fadeOnScroll'] ?? false );
$overflow_raw   = $attributes['overflow'] ?? 'visible';
$overflow       = in_array( $overflow_raw, array( 'visible', 'hidden', 'clip', 'scroll', 'auto' ), true ) ? $overflow_raw : 'visible';
$decorative     = (bool) ( $attributes['layerDecorative'] ?? true );
$has_content    = '' !== trim( (string) $content );

// The slot comes from the block's own `supports.sgs.mediaElements` entry for the `layer` prefix.
$sgs_di_slot = array(
	'prefix'  => 'layer',
	'kinds'   => array( 'image', 'svg' ),
	'context' => 'element',
);
foreach ( (array) ( $block->block_type->supports['sgs']['mediaElements'] ?? array() ) as $sgs_di_entry ) {
	if ( 'layer' === ( $sgs_di_entry['prefix'] ?? '' ) && ! empty( $sgs_di_entry['kinds'] ) ) {
		$sgs_di_slot = array(
			'prefix'  => 'layer',
			'kinds'   => (array) $sgs_di_entry['kinds'],
			'context' => (string) ( $sgs_di_entry['context'] ?? 'element' ),
		);
	}
}

$uid      = 'sgs-di-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.sgs-decorative-image';

// The layer's box settings: what the layer root paints when it is a box, and what the renderer paints on a bare picture.
$sgs_di_is_box_key = static function ( string $name ): bool {
	return 1 === preg_match( '/^layer((Min|Max)?(Width|Height)|Opacity|Radius|Border(Width|Style|Colour|ColourHover)|BoxShadow.*)$/', $name );
};
// The layer root paints the fill itself, with its gradient, so the renderer never writes a second one.
$sgs_di_unrendered = array( 'layerBackground', 'layerPadding' );

// Effects stored on the layer (any element of the motion document), so the renderer prints the helper an effect that paints a layer needs (§7.3).
$sgs_di_effects = array();
foreach ( (array) ( $attributes['sgsMotion']['elements'] ?? array() ) as $sgs_di_element ) {
	foreach ( (array) ( $sgs_di_element['effects'] ?? array() ) as $sgs_di_layer ) {
		if ( is_array( $sgs_di_layer ) && isset( $sgs_di_layer['effect'] ) ) {
			$sgs_di_effects[] = (string) $sgs_di_layer['effect'];
		}
	}
}

$sgs_di_render = static function ( array $attrs, string $media_uid ) use ( $sgs_di_slot, $sgs_di_effects, $block ): array {
	if ( ! class_exists( 'SGS_Media_Element' ) ) {
		return array(
			'html' => '',
			'css'  => '',
		);
	}
	return SGS_Media_Element::render(
		$sgs_di_slot,
		$attrs,
		array(
			'uid'       => $media_uid,
			'block'     => $block->name ?? 'sgs/decorative-image',
			'role'      => 'layer',
			'effects'   => $sgs_di_effects,
			'in_editor' => defined( 'REST_REQUEST' ) && REST_REQUEST,
		)
	);
};

// A layer that holds blocks is a box. A layer that is only a picture is the renderer's element.
$sgs_di_as_box = $has_content;
$media         = array(
	'html' => '',
	'css'  => '',
);
if ( $sgs_di_as_box ) {
	$sgs_di_media_attrs = array_diff_key( array_filter( $attributes, static fn( $key ): bool => ! $sgs_di_is_box_key( (string) $key ), ARRAY_FILTER_USE_KEY ), array_flip( $sgs_di_unrendered ) );
	// A radius-drawn shape is the box's corners; only a mask shape reaches the picture.
	if ( ! sgs_media_has_mask( 'layer', $sgs_di_media_attrs ) ) {
		unset( $sgs_di_media_attrs['layerShape'] );
	}
	$media = $sgs_di_render( $sgs_di_media_attrs, $uid . '-m' );
} else {
	$media = $sgs_di_render( array_diff_key( $attributes, array_flip( $sgs_di_unrendered ) ), $uid );
	if ( '' === $media['html'] ) {
		$sgs_di_as_box = true;
	}
}
$has_media = '' !== $media['html'];

// The shape a layer root takes when it is a box: a radius-drawn shape becomes border-radius on the root, a mask shape clips the picture.
$sgs_di_shape_radius = array(
	'circle'  => '50%',
	'ellipse' => '50%',
	'pill'    => '9999px',
);
$sgs_di_shape_at     = static function ( string $tier ) use ( $attributes ): string {
	$shape = sgs_responsive_normalise_object( $attributes['layerShape'] ?? null );
	$order = array( 'desktop', 'tablet', 'mobile' );
	$seen  = '';
	foreach ( array_slice( $order, 0, array_search( $tier, $order, true ) + 1 ) as $step ) {
		$value = $shape[ $step ] ?? null;
		if ( is_array( $value ) ) {
			$value = $value['shape'] ?? '';
		}
		if ( is_string( $value ) && '' !== $value ) {
			$seen = $value;
		}
	}
	return $seen;
};

$sgs_di_border = array(
	'base'   => array(),
	'tablet' => array(),
	'mobile' => array(),
	'hover'  => array(),
	'rules'  => array(),
	'facts'  => array(
		'style'     => 'none',
		'has_width' => false,
		'has_ring'  => false,
	),
);
$sgs_di_shadow = array(
	'normal' => array(),
	'hover'  => array(),
);
if ( $sgs_di_as_box ) {
	$sgs_di_border = sgs_border_element_decls(
		$attributes,
		'layer',
		$root_sel,
		array(
			'colour' => array(
				'base'     => 'layerBorderColour',
				'hover'    => 'layerBorderColourHover',
				'gradient' => 'layerBorderColourGradient',
			),
			'radius' => 'layerRadius',
			'facts'  => true,
		)
	);
	$sgs_di_shadow = sgs_shadow_decls(
		$attributes,
		array(
			'base'         => 'layerBoxShadow',
			'colour'       => 'layerBoxShadowColour',
			'hover_colour' => 'layerBoxShadowColourHover',
		),
		$block->name ?? ''
	);
}
$sgs_di_fill = sgs_background_paint_decl(
	isset( $attributes['layerBackground'] ) ? (string) $attributes['layerBackground'] : '',
	isset( $attributes['backgroundColourGradient'] ) ? (string) $attributes['backgroundColourGradient'] : ''
);

// A box with no picture and no blocks renders only when it has something to draw: a border width at any tier, a gradient ring, a
// resting shadow or a fill. A height, a radius, a shape or a hover shadow alone draws nothing, and a border style of none draws no
// border or ring. `layer-preview.js::layerPaintsBox` is the canvas twin; tests/fixtures/decorative-image-paints-box.json is the table
// both are tested against.
$sgs_di_has_width  = ! empty( $sgs_di_border['facts']['has_width'] );
$sgs_di_has_ring   = ! empty( $sgs_di_border['facts']['has_ring'] );
$sgs_di_paints_box = ( 'none' !== $sgs_di_border['facts']['style'] && ( $sgs_di_has_width || $sgs_di_has_ring ) )
	|| array() !== $sgs_di_shadow['normal']
	|| '' !== $sgs_di_fill;
if ( ! $has_media && ! $has_content && ! $sgs_di_paints_box ) {
	return;
}

// ---------------------------------------------------------------------------
// The layer's own scoped CSS: position, size (box only), opacity, stacking, transform, overflow.
// ---------------------------------------------------------------------------

$pos_x_css   = $sgs_css_num( $position_x_obj['desktop'] ?? 50, 2 );
$pos_y_css   = $sgs_css_num( $position_y_obj['desktop'] ?? 50, 2 );
$z_index_css = (int) $sgs_css_num( $z_index, 0 );

$layer_opacity = sgs_responsive_normalise_object( $attributes['layerOpacity'] ?? null );
$opacity_css   = static function ( $value ) use ( $sgs_css_num ): float {
	return $sgs_css_num( max( 0, min( 100, (float) $value ) ) / 100, 4 );
};
$base_opacity  = is_numeric( $layer_opacity['desktop'] ?? null ) ? $opacity_css( $layer_opacity['desktop'] ) : 1.0;

// Edge offsets (includes/helpers-layer-edges.php): an axis anchored to its edges prints them and drops its centre percentage and its
// half of the centring translate.
$sgs_di_edges = sgs_layer_edges( $attributes );
if ( ! $sgs_di_edges['x'] && ! $sgs_di_edges['y'] ) {
	$sgs_di_centring = 'translate(-50%, -50%)';
} elseif ( ! $sgs_di_edges['x'] ) {
	$sgs_di_centring = 'translateX(-50%)';
} elseif ( ! $sgs_di_edges['y'] ) {
	$sgs_di_centring = 'translateY(-50%)';
} else {
	$sgs_di_centring = '';
}

// The whole transform is rebuilt per tier: rotation shares the one `transform` property with the centring translate and the flip.
$sgs_di_transform = function ( $rotation_deg ) use ( $sgs_css_num, $flip_x, $sgs_di_centring ) {
	$parts   = '' !== $sgs_di_centring ? array( $sgs_di_centring ) : array();
	$deg_css = $sgs_css_num( $rotation_deg, 2 );
	if ( 0.0 !== $deg_css ) {
		$parts[] = 'rotate(' . $deg_css . 'deg)';
	}
	if ( $flip_x ) {
		$parts[] = 'scaleX(-1)';
	}
	return $parts ? implode( ' ', $parts ) : 'none';
};

// A box's width and max width per device, each a length (a narrower device inherits the wider one's value). A device whose width fits
// the content (`max-content`) is capped at the parent unless a max width is set for it; a fixed width has no cap unless one is set.
// A picture-only layer leaves width, max width and height to the media atoms.
$sgs_di_size = array(
	'desktop' => array(),
	'tablet'  => array(),
	'mobile'  => array(),
);
$sgs_di_hgt  = sgs_responsive_normalise_object( $attributes['layerHeight'] ?? null );
if ( $sgs_di_as_box ) {
	$width_obj      = sgs_responsive_normalise_object( $attributes['layerWidth'] ?? null );
	$max_width_obj  = sgs_responsive_normalise_object( $attributes['layerMaxWidth'] ?? null );
	$sgs_di_w_eff   = '200px';
	$sgs_di_mw_set  = '';
	$sgs_di_cap_was = 'none';
	foreach ( array( 'desktop', 'tablet', 'mobile' ) as $sgs_di_tier ) {
		$sgs_di_decls = array();
		// Auto is Fit the content for a box: it sizes to what it holds.
		$sgs_di_w = 'auto' === ( $width_obj[ $sgs_di_tier ] ?? '' ) ? 'max-content' : sgs_css_length_value( $width_obj[ $sgs_di_tier ] ?? '' );
		if ( '' !== $sgs_di_w ) {
			$sgs_di_w_eff = $sgs_di_w;
		}
		if ( '' !== $sgs_di_w || 'desktop' === $sgs_di_tier ) {
			$sgs_di_decls[] = 'width:' . $sgs_di_w_eff;
		}
		$sgs_di_mw = sgs_css_length_value( $max_width_obj[ $sgs_di_tier ] ?? '' );
		if ( '' !== $sgs_di_mw ) {
			$sgs_di_mw_set = $sgs_di_mw;
		}
		$sgs_di_cap = '' !== $sgs_di_mw_set ? $sgs_di_mw_set : ( 'max-content' === $sgs_di_w_eff ? '100%' : 'none' );
		if ( $sgs_di_cap !== $sgs_di_cap_was ) {
			$sgs_di_decls[] = 'max-width:' . $sgs_di_cap;
		}
		$sgs_di_cap_was = $sgs_di_cap;
		$sgs_di_h       = sgs_css_length_value( $sgs_di_hgt[ $sgs_di_tier ] ?? '' );
		if ( '' !== $sgs_di_h ) {
			$sgs_di_decls[] = 'height:' . $sgs_di_h;
		}
		if ( 'desktop' !== $sgs_di_tier && is_numeric( $layer_opacity[ $sgs_di_tier ] ?? null ) ) {
			$sgs_di_decls[] = 'opacity:var(--sgs-di-op, ' . $opacity_css( $layer_opacity[ $sgs_di_tier ] ) . ')';
		}
		$sgs_di_size[ $sgs_di_tier ] = $sgs_di_decls;
	}
}

// Corner shape of a box root, per device: a radius-drawn shape replaces the corners.
$sgs_di_shape_decl = array();
if ( $sgs_di_as_box ) {
	$sgs_di_shape_was = '';
	foreach ( array( 'desktop', 'tablet', 'mobile' ) as $sgs_di_tier ) {
		$sgs_di_radius = $sgs_di_shape_radius[ $sgs_di_shape_at( $sgs_di_tier ) ] ?? '';
		if ( $sgs_di_radius !== $sgs_di_shape_was && ( '' !== $sgs_di_radius || '' !== $sgs_di_shape_was ) ) {
			$sgs_di_shape_decl[ $sgs_di_tier ] = 'border-radius:' . ( '' !== $sgs_di_radius ? $sgs_di_radius : '0' );
		}
		$sgs_di_shape_was = $sgs_di_radius;
	}
}

$root_decls = array_merge(
	array( 'position:absolute' ),
	$sgs_di_edges['x'] ? array() : array( 'left:' . $pos_x_css . '%' ),
	$sgs_di_edges['y'] ? array() : array( 'top:' . $pos_y_css . '%' ),
	$sgs_di_edges['tiers']['desktop'],
	$sgs_di_size['desktop'],
	$sgs_di_as_box ? array( 'opacity:var(--sgs-di-op, ' . $base_opacity . ')' ) : array(),
	! $sgs_di_as_box && $fade_on_scroll ? array( 'opacity:var(--sgs-di-op, ' . $base_opacity . ')' ) : array(),
	array(
		'z-index:' . $z_index_css,
		'transform:' . $sgs_di_transform( $rotation_obj['desktop'] ?? 0 ),
	),
	$sgs_di_as_box || 'visible' !== $overflow ? array( 'overflow:' . $overflow ) : array(),
	$sgs_di_border['base'],
	isset( $sgs_di_shape_decl['desktop'] ) ? array( $sgs_di_shape_decl['desktop'] ) : array(),
	$sgs_di_shadow['normal'],
	'' !== $sgs_di_fill ? array( $sgs_di_fill ) : array()
);

$scoped_css   = array();
$scoped_css[] = "{$root_sel}{" . implode( ';', $root_decls ) . ';}';
// A fixed width holds at every device unless the client sets a max width: the media base would cap a bare picture at its container.
if ( ! $sgs_di_as_box && ! array_filter( sgs_responsive_normalise_object( $attributes['layerMaxWidth'] ?? null ) ) ) {
	$scoped_css[] = '.' . $uid . '{max-width:none}';
}

// Tablet and mobile: position and rotation through the shared emitter (desktop values are in the base rule), then the box's own
// tier declarations. Tier rules print after the base rule, so a device value wins inside its query.
$sgs_di_tier_css = sgs_responsive_css_rule(
	array(
		'positionXTablet' => $sgs_di_edges['x'] ? null : ( $position_x_obj['tablet'] ?? null ),
		'positionXMobile' => $sgs_di_edges['x'] ? null : ( $position_x_obj['mobile'] ?? null ),
		'positionYTablet' => $sgs_di_edges['y'] ? null : ( $position_y_obj['tablet'] ?? null ),
		'positionYMobile' => $sgs_di_edges['y'] ? null : ( $position_y_obj['mobile'] ?? null ),
		'rotationTablet'  => $rotation_obj['tablet'] ?? null,
		'rotationMobile'  => $rotation_obj['mobile'] ?? null,
	),
	array(
		array(
			'attr'         => 'positionXDesktop',
			'css'          => 'left',
			'unit_default' => '%',
			'tablet_attr'  => 'positionXTablet',
			'mobile_attr'  => 'positionXMobile',
		),
		array(
			'attr'         => 'positionYDesktop',
			'css'          => 'top',
			'unit_default' => '%',
			'tablet_attr'  => 'positionYTablet',
			'mobile_attr'  => 'positionYMobile',
		),
		array(
			'attr'        => 'rotationDesktop',
			'css'         => 'transform',
			'tablet_attr' => 'rotationTablet',
			'mobile_attr' => 'rotationMobile',
			'transform'   => function ( $deg ) use ( $sgs_di_transform ) {
				return is_numeric( $deg ) ? $sgs_di_transform( $deg ) : $sgs_di_transform( 0 );
			},
		),
	),
	$root_sel
);
if ( '' !== $sgs_di_tier_css ) {
	$scoped_css[] = $sgs_di_tier_css;
}
foreach ( array( 'tablet', 'mobile' ) as $sgs_di_tier ) {
	$sgs_di_tier_decls = array_merge(
		$sgs_di_edges['tiers'][ $sgs_di_tier ],
		$sgs_di_size[ $sgs_di_tier ],
		$sgs_di_border[ $sgs_di_tier ],
		isset( $sgs_di_shape_decl[ $sgs_di_tier ] ) ? array( $sgs_di_shape_decl[ $sgs_di_tier ] ) : array()
	);
	if ( $sgs_di_tier_decls ) {
		$scoped_css[] = SGS_Breakpoints::media_width( 'max', SGS_Breakpoints::max_for_tier( $sgs_di_tier ) ) . '{' . $root_sel . '{' . implode( ';', $sgs_di_tier_decls ) . ';}}';
	}
}
if ( $sgs_di_border['hover'] ) {
	$scoped_css[] = sgs_hover_state_rules( $root_sel, implode( ';', $sgs_di_border['hover'] ) );
}
if ( $sgs_di_shadow['hover'] ) {
	$scoped_css[] = sgs_hover_state_rules( $root_sel, implode( ';', $sgs_di_shadow['hover'] ), ':focus-within' );
}
$scoped_css = array_merge( $scoped_css, $sgs_di_border['rules'] );

// The picture inside a box fills it.
if ( $sgs_di_as_box && $has_media ) {
	$scoped_css[] = '.' . $uid . ' .sgs-media-el{display:block;width:100%;height:auto}';
}

// wp_strip_all_tags (not esc_html) blocks a </style> breakout and leaves CSS combinators such as `>` intact.
$style_tag_html = '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) . $media['css'] ) . '</style>';

// "Additional CSS class(es)" and the anchor reach the layer root, whichever element that is, through the block wrapper attributes.
$sgs_di_wrapper_attrs = get_block_wrapper_attributes();
preg_match( '/class="([^"]*)"/', $sgs_di_wrapper_attrs, $sgs_di_class_match );
preg_match( '/id="([^"]*)"/', $sgs_di_wrapper_attrs, $sgs_di_id_match );
$sgs_di_extra_class = trim( wp_specialchars_decode( $sgs_di_class_match[1] ?? '', ENT_QUOTES ) );
$sgs_di_anchor      = wp_specialchars_decode( $sgs_di_id_match[1] ?? '', ENT_QUOTES );

/**
 * Put the layer's identity on the first element of printed markup: its class, anchor and fade marker.
 *
 * @param string $html     Markup whose first element is the layer root.
 * @param string $classes  Classes to add.
 * @param string $anchor   Anchor id, or ''.
 * @param bool   $fade     Whether the layer fades on scroll.
 * @return string The markup.
 */
$sgs_di_mark_root = static function ( string $html, string $classes, string $anchor, bool $fade ): string {
	$tags = new WP_HTML_Tag_Processor( $html );
	if ( ! $tags->next_tag() ) {
		return $html;
	}
	foreach ( preg_split( '/\s+/', $classes, -1, PREG_SPLIT_NO_EMPTY ) as $class ) {
		$tags->add_class( $class );
	}
	if ( '' !== $anchor ) {
		$tags->set_attribute( 'id', $anchor );
	}
	if ( $fade ) {
		$tags->set_attribute( 'data-fade-on-scroll', 'true' );
	}
	return $tags->get_updated_html();
};

// A decorative picture is hidden from assistive technology; the layer's text and blocks never are.
$sgs_di_hide_picture = static function ( string $html ): string {
	$tags = new WP_HTML_Tag_Processor( $html );
	while ( $tags->next_tag( 'img' ) ) {
		$tags->set_attribute( 'aria-hidden', 'true' );
	}
	return $tags->get_updated_html();
};
if ( $has_media && $decorative ) {
	$media['html'] = $sgs_di_hide_picture( $media['html'] );
}

if ( ! $sgs_di_as_box ) {
	$classes = trim( 'sgs-decorative-image ' . ( 'section' === ( $attributes['anchorTo'] ?? 'parent' ) ? 'sgs-decorative-image--anchor-section ' : '' ) . $sgs_di_extra_class );
	$out     = $sgs_di_mark_root( $media['html'], $classes, $sgs_di_anchor, $fade_on_scroll );
	if ( $decorative ) {
		$root = new WP_HTML_Tag_Processor( $out );
		if ( $root->next_tag() ) {
			$root->set_attribute( 'role', 'presentation' );
			$out = $root->get_updated_html();
		}
	}
	echo $style_tag_html . $out; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS stripped of tags; the markup is built by the media renderer with per-attribute escaping.
	return;
}

// A box: a `<div>` when it holds blocks, otherwise a `<span>`.
$sgs_di_classes = array( 'sgs-decorative-image' );
if ( 'section' === ( $attributes['anchorTo'] ?? 'parent' ) ) {
	$sgs_di_classes[] = 'sgs-decorative-image--anchor-section';
}
if ( $has_content ) {
	$sgs_di_classes[] = 'sgs-decorative-image--layer';
	if ( $has_media ) {
		$sgs_di_classes[] = 'sgs-decorative-image--over-image';
	}
}
if ( ! $has_media && ! $has_content ) {
	$sgs_di_classes[] = 'sgs-decorative-image--shape';
}
$sgs_di_classes[] = $uid;
$sgs_di_classes[] = $sgs_di_extra_class;

$sgs_di_box_attrs = array( 'class' => trim( implode( ' ', $sgs_di_classes ) ) );
if ( '' !== $sgs_di_anchor ) {
	$sgs_di_box_attrs['id'] = $sgs_di_anchor;
}
if ( ! $has_content ) {
	$sgs_di_box_attrs['aria-hidden'] = 'true';
	$sgs_di_box_attrs['role']        = 'presentation';
}
if ( $fade_on_scroll ) {
	$sgs_di_box_attrs['data-fade-on-scroll'] = 'true';
}
$sgs_di_box_strs = array();
foreach ( $sgs_di_box_attrs as $sgs_di_key => $sgs_di_val ) {
	$sgs_di_box_strs[] = sprintf( '%s="%s"', esc_attr( $sgs_di_key ), esc_attr( $sgs_di_val ) );
}
$sgs_di_content_html = $has_content ? '<div class="sgs-decorative-image__content">' . $content . '</div>' : '';

printf(
	'%1$s<%2$s %3$s>%4$s%5$s</%2$s>',
	$style_tag_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS stripped of tags.
	$has_content ? 'div' : 'span', // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal div or span.
	implode( ' ', $sgs_di_box_strs ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- each attribute escaped above.
	$media['html'], // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by the media renderer with per-attribute escaping.
	$sgs_di_content_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered inner blocks, escaped by their own renders.
);
