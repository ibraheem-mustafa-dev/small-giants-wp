<?php
/**
 * Server-side render for the SGS WhatsApp CTA block.
 *
 * NO-INLINE (LOCKED per-block no-inline migration contract, 2026-07-10):
 * the rendered subtree carries ZERO inline CSS property declarations. Button
 * colour/background and every wrapper box/border declaration are emitted
 * into the block's own scoped `.{uid}` <style> tag. WP styling supports
 * (spacing / __experimentalBorder) declare `__experimentalSkipSerialization`
 * in block.json so get_block_wrapper_attributes() never auto-inlines them.
 * (`color` support is declared false/false — inert; skip-serialised too for
 * forward-compat, but no native colour is ever emitted by it.)
 *
 * BOX-GROUP (contract §B): padding / margin / border-radius are box objects.
 * Base padding/margin/border-radius = WP-native style.spacing.* /
 * style.border.radius objects (emitted scoped via wp_style_engine_get_styles);
 * tiers = paddingTablet/paddingMobile/marginTablet/marginMobile/
 * borderRadiusTablet/borderRadiusMobile object attrs (scoped @media 1023/767).
 *
 * Contract §B3 (single-semantic-element blocks): the <a> IS the block root —
 * NO wrapper <div> (mirrors sgs/button, D288). It carries the BEM block class,
 * the BEM element class (__btn), the variant/visibility classes, the scoped
 * uid CLASS, and the anchor `id`.
 *
 * @since 2026-07-10  no-inline + single-root migration.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused - no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$phone_number    = $attributes['phoneNumber'] ?? '';
$message         = $attributes['message'] ?? '';
$variant         = $attributes['variant'] ?? 'floating';
$label           = $attributes['label'] ?? '';
$show_on_mobile  = $attributes['showOnMobile'] ?? true;
$show_on_desktop = $attributes['showOnDesktop'] ?? true;
$label_colour    = sgs_colour_value( $attributes['labelColour'] ?? '' );
$bg_colour       = sgs_colour_value( $attributes['backgroundColour'] ?? 'whatsapp' );
$anchor          = isset( $attributes['anchor'] ) ? sanitize_html_class( $attributes['anchor'] ) : '';

// Do not render if no phone number is set.
if ( ! $phone_number ) {
	return;
}

// Build WhatsApp URL — phone number contains only digits, rawurlencode the message.
$clean_phone     = preg_replace( '/[^0-9]/', '', $phone_number );
$encoded_message = $message ? rawurlencode( $message ) : '';
$wa_url          = 'https://wa.me/' . $clean_phone;
if ( $encoded_message ) {
	$wa_url .= '?text=' . $encoded_message;
}

// ---------------------------------------------------------------------------
// Box-object interface contract §1 + security §D sanitisers, plus shorthand
// builders (mirrors sgs/heading + sgs/button).
// ---------------------------------------------------------------------------

// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so an object-attr side/corner value can never break out of its
// declaration.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// Box-model shorthand: top right bottom left.
$sgs_box_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$top    = $sgs_css_length( $box['top'] ?? '' );
	$right  = $sgs_css_length( $box['right'] ?? '' );
	$bottom = $sgs_css_length( $box['bottom'] ?? '' );
	$left   = $sgs_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

// CSS border-radius shorthand order is top-left top-right bottom-right bottom-left.
$sgs_corner_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$tl = $sgs_css_length( $box['topLeft'] ?? '' );
	$tr = $sgs_css_length( $box['topRight'] ?? '' );
	$br = $sgs_css_length( $box['bottomRight'] ?? '' );
	$bl = $sgs_css_length( $box['bottomLeft'] ?? '' );
	if ( '' === $tl && '' === $tr && '' === $br && '' === $bl ) {
		return null;
	}
	return ( '' !== $tl ? $tl : '0' ) . ' ' . ( '' !== $tr ? $tr : '0' ) . ' ' . ( '' !== $br ? $br : '0' ) . ' ' . ( '' !== $bl ? $bl : '0' );
};

// Base padding/margin — WP-native style.spacing.* objects (skip-serialised in
// block.json), passed straight to the style engine which formats + sanitises.
$base_padding_obj = array();
if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
	foreach ( $attributes['style']['spacing']['padding'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_padding_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_margin_obj[ $spacing_side ] = $spacing_value;
		}
	}
}

// Base border-radius — WP-native style.border.radius (string = uniform, or an
// object with topLeft/topRight/bottomLeft/bottomRight keys), skip-serialised.
$base_border_radius = null;
if ( isset( $attributes['style']['border']['radius'] ) ) {
	$radius_raw = $attributes['style']['border']['radius'];
	if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
		$base_border_radius = $radius_raw;
	} elseif ( is_array( $radius_raw ) ) {
		$radius_clean   = array();
		$has_any_corner = false;
		foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
			$radius_clean[ $corner ] = isset( $radius_raw[ $corner ] ) ? $sgs_css_length( $radius_raw[ $corner ] ) : '';
			if ( '' !== $radius_clean[ $corner ] ) {
				$has_any_corner = true;
			}
		}
		if ( $has_any_corner ) {
			$base_border_radius = $radius_clean;
		}
	}
}

// Responsive tiers — SGS custom object attrs.
$padding_tablet_obj       = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj       = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj        = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj        = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();

// Visibility classes.
$visibility_classes = array();
if ( ! $show_on_mobile ) {
	$visibility_classes[] = 'sgs-whatsapp-cta--hide-mobile';
}
if ( ! $show_on_desktop ) {
	$visibility_classes[] = 'sgs-whatsapp-cta--hide-desktop';
}

// ---------------------------------------------------------------------------
// Scoped CSS assembly. uid is content-addressed (mirrors sgs/heading) and
// used as a CLASS (never an id) — the anchor id, when set, is free to occupy
// the element's single `id`.
// ---------------------------------------------------------------------------

$uid      = 'sgs-wac-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-whatsapp-cta';

$scoped_css = array();

// --- Button colour/background (scoped — previously an inline style attr). ---
$btn_decls = array();
if ( $label_colour ) {
	$btn_decls[] = 'color:' . $label_colour;
}
if ( $bg_colour ) {
	$btn_decls[] = 'background-color:' . $bg_colour;
}
if ( $btn_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $btn_decls ) . ';}';
}

// --- Base spacing + border-radius via the stable core style engine (skip-
// serialised in block.json — exactly how WP core outputs `layout` support). ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$base_style_engine_args = array();

	$base_spacing = array();
	if ( ! empty( $base_padding_obj ) ) {
		$base_spacing['padding'] = $base_padding_obj;
	}
	if ( ! empty( $base_margin_obj ) ) {
		$base_spacing['margin'] = $base_margin_obj;
	}
	if ( ! empty( $base_spacing ) ) {
		$base_style_engine_args['spacing'] = $base_spacing;
	}

	if ( null !== $base_border_radius ) {
		$base_style_engine_args['border'] = array( 'radius' => $base_border_radius );
	}

	if ( ! empty( $base_style_engine_args ) ) {
		$base_scoped_styles = wp_style_engine_get_styles(
			$base_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $base_scoped_styles['css'] ) ) {
			$scoped_css[] = $base_scoped_styles['css'];
		}
	}
}

// --- Responsive padding/margin/border-radius tiers — hand-built shorthand,
// scoped @media on the SAME root selector (tablet ≤1023px, mobile ≤767px). ---
$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );
$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );
$radius_tab_val  = $sgs_corner_shorthand( $border_radius_tablet_obj );
$radius_mob_val  = $sgs_corner_shorthand( $border_radius_mobile_obj );

$tablet_box_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_box_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_box_decls[] = "margin:{$margin_tab_val}";
}
if ( null !== $radius_tab_val ) {
	$tablet_box_decls[] = "border-radius:{$radius_tab_val}";
}
if ( $tablet_box_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_box_decls ) . ';}}';
}

$mobile_box_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_box_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_box_decls[] = "margin:{$margin_mob_val}";
}
if ( null !== $radius_mob_val ) {
	$mobile_box_decls[] = "border-radius:{$radius_mob_val}";
}
if ( $mobile_box_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_box_decls ) . ';}}';
}

// --- Scoped typography for the label element (unchanged mechanism — the
// label span is still a nested child of the root). ---
$label_selector = '.' . $uid . ' .sgs-whatsapp-cta__label';
$typo_css       = sgs_typography_css_rule( $attributes, 'label', $label_selector );
if ( '' !== $typo_css ) {
	$scoped_css[] = $typo_css;
}

// ---------------------------------------------------------------------------
// Root element classes + attributes. Contract §B3: the <a> IS the block root
// (no wrapper <div>) — it carries the block class, the BEM element class
// (__btn — this element also plays the role of the "button"), the variant +
// visibility classes, and the scoped uid class.
// ---------------------------------------------------------------------------

$root_classes = array_merge(
	array(
		'wp-block-sgs-whatsapp-cta',
		'sgs-whatsapp-cta',
		'sgs-whatsapp-cta--' . sanitize_html_class( $variant ),
		'sgs-whatsapp-cta__btn',
		$uid,
	),
	$visibility_classes
);

$root_attr_args = array( 'class' => implode( ' ', $root_classes ) );
if ( $anchor ) {
	$root_attr_args['id'] = $anchor;
}
$wrapper_attributes = get_block_wrapper_attributes( $root_attr_args );

// Accessible label: use custom label, fall back to generic.
$accessible_label = $label ? $label : __( 'Chat on WhatsApp', 'sgs-blocks' );

// aria-label only needed when there is no visible text label (floating variant).
$aria_label_attr = ( 'floating' === $variant )
	? ' aria-label="' . esc_attr( $accessible_label ) . '"'
	: '';

/*
 * WhatsApp logo SVG — official brand path.
 * Uses fill="currentColor" so CSS controls the colour.
 * Split across variables to stay within the 120-character line limit.
 */
$svg_path_1  = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15';
$svg_path_1 .= '-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15';
$svg_path_1 .= '-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297';
$svg_path_1 .= '-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497';
$svg_path_1 .= '.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207';
$svg_path_1 .= '-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01';
$svg_path_1 .= '-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479';
$svg_path_1 .= ' 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487';
$svg_path_1 .= '.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118';
$svg_path_1 .= '.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413';
$svg_path_1 .= '-.074-.124-.272-.198-.57-.347';

$svg_path_2  = 'm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214';
$svg_path_2 .= '-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26';
$svg_path_2 .= 'c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898';
$svg_path_2 .= 'a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884';

$svg_path_3  = 'm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892';
$svg_path_3 .= 'c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654';
$svg_path_3 .= 'a11.882 11.882 0 0 0 5.683 1.448h.005';
$svg_path_3 .= 'c6.554 0 11.89-5.335 11.893-11.893';
$svg_path_3 .= 'a11.821 11.821 0 0 0-3.48-8.413';

$whatsapp_svg  = '<svg class="sgs-whatsapp-cta__icon" xmlns="http://www.w3.org/2000/svg"';
$whatsapp_svg .= ' viewBox="0 0 24 24" width="24" height="24"';
$whatsapp_svg .= ' fill="currentColor" aria-hidden="true" focusable="false">';
$whatsapp_svg .= '<path d="' . $svg_path_1 . $svg_path_2 . $svg_path_3 . '"/>';
$whatsapp_svg .= '</svg>';

if ( $scoped_css ) {
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (matches sgs/heading + SGS_Container_Wrapper).
	// Every value reaching $scoped_css is pre-sanitised ($sgs_css_length,
	// allowlists/enums, sgs_colour_value(), wp_style_engine_get_styles(),
	// sgs_typography_css_rule()), so no un-sanitised value survives here.
	echo '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style>
}

?>
<a
	href="<?php echo esc_url( $wa_url ); ?>"
	<?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-escaped markup. ?>
	target="_blank"
	rel="noopener noreferrer"
	<?php echo $aria_label_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- value is built from esc_attr()-wrapped output. ?>
>
	<?php echo $whatsapp_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG is a hardcoded constant with no user input. ?>
	<?php if ( 'floating' !== $variant && $label ) : ?>
		<span class="sgs-whatsapp-cta__label"><?php echo esc_html( $label ); ?></span>
	<?php elseif ( 'floating' === $variant ) : ?>
		<span class="sgs-sr-only"><?php echo esc_html( $accessible_label ); ?></span>
	<?php endif; ?>
</a>
