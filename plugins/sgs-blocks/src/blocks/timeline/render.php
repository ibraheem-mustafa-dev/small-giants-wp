<?php
/**
 * Server-side render for sgs/timeline.
 *
 * Renders a date-based timeline as a semantic <ol>/<li>/<time> structure.
 * Vertical and horizontal orientations supported. When revealOnScroll is
 * false, all entries are pre-revealed (is-revealed baked in, no JS dep).
 *
 * NO-INLINE (LOCKED per-block no-inline migration contract §A, 2026-07-10):
 * the block-private LEAF pattern (mirrors sgs/label/sgs/quote). The rendered
 * `<ol>` root AND every descendant carry ZERO inline CSS property
 * declarations — every declaration is emitted into the block's OWN scoped
 * `.{uid}` <style> tag. The `color`/`typography`/`spacing`/`shadow`/
 * `__experimentalBorder` WP supports all declare `__experimentalSkipSerialization`
 * in block.json so get_block_wrapper_attributes() never auto-inlines them.
 * The `--sgs-connector-colour` / `--sgs-date-colour` / `--sgs-reveal-stagger`
 * custom-property VALUES on the wrapper stay — a `--var:value` is not a
 * property declaration (contract §A) and is untouched by this migration.
 *
 * BOX-GROUP (contract §B): `padding`/`margin` are WP-native
 * style.spacing.* objects (base) + SGS object tiers (paddingTablet/Mobile,
 * marginTablet/Mobile). `borderRadius` is WP-native style.border.radius
 * (base, string or 4-corner object) + SGS object tiers (borderRadiusTablet/
 * Mobile). `borderWidth` (custom, no WP per-side width support) is an SGS
 * object attr, base only (matches sgs/quote — no pre-existing tiers).
 * `borderColour`/`borderStyle` are kept-scalar custom attrs (Spec 32 §6.1(c)).
 *
 * Typography is routed to `.sgs-timeline__title` (per the declared
 * `selectors.typography` in block.json) rather than the root — the title is
 * the element the typography controls are meant to style.
 *
 * @since 0.1.0
 * @since 2026-07-10  No-inline migration (skip-serialised supports + box
 *                    objects + scoped output).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Security sanitiser (contract §D) — a CSS-length sanitiser for box/side
// values. (No free-text keyword attr on this block — border-style is
// validated via an `in_array()` allowlist below, so no keyword sanitiser is
// needed.)
// ---------------------------------------------------------------------------

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// ---------------------------------------------------------------------------
// 2. Extract attributes with defaults.
// ---------------------------------------------------------------------------

$entries          = isset( $attributes['entries'] ) && is_array( $attributes['entries'] ) ? $attributes['entries'] : array();
$orientation      = $attributes['orientation'] ?? 'vertical';
$alignment        = $attributes['alignment'] ?? 'alternating';
$connector_style  = $attributes['connectorStyle'] ?? 'line';
$connector_colour = $attributes['connectorColour'] ?? 'border-subtle';
$date_colour      = $attributes['dateColour'] ?? 'accent';
$reveal_on_scroll = isset( $attributes['revealOnScroll'] ) ? (bool) $attributes['revealOnScroll'] : true;
$reveal_stagger   = isset( $attributes['revealStagger'] ) ? absint( $attributes['revealStagger'] ) : 100;

// Sanitise orientation + alignment to avoid arbitrary CSS class injection.
$orientation     = in_array( $orientation, array( 'vertical', 'horizontal' ), true ) ? $orientation : 'vertical';
$alignment       = in_array( $alignment, array( 'left', 'centre', 'alternating' ), true ) ? $alignment : 'alternating';
$connector_style = in_array( $connector_style, array( 'line', 'dashed', 'dotted' ), true ) ? $connector_style : 'line';

// WP `color` support values (skip-serialised in block.json → NOT auto-inlined).
$style_color_text = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg   = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// WP `shadow` support value (skip-serialised).
$style_shadow = isset( $attributes['style']['shadow'] ) ? (string) $attributes['style']['shadow'] : '';

// WP `typography` support values (skip-serialised) — pass the whole filtered
// set to the style engine at once (base only; this block has no responsive
// typography tiers).
$style_typography_raw = isset( $attributes['style']['typography'] ) && is_array( $attributes['style']['typography'] ) ? $attributes['style']['typography'] : array();
$style_typography     = array();
foreach ( array( 'fontSize', 'lineHeight', 'textAlign', 'letterSpacing', 'textTransform', 'fontWeight', 'fontStyle' ) as $typography_key ) {
	if ( isset( $style_typography_raw[ $typography_key ] ) && '' !== $style_typography_raw[ $typography_key ] ) {
		$style_typography[ $typography_key ] = $style_typography_raw[ $typography_key ];
	}
}

// Base padding/margin — WP-native style.spacing.* objects (skip-serialised).
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
$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// Base border-radius — WP-native style.border.radius (string = uniform, or an
// object with topLeft/topRight/bottomLeft/bottomRight keys). Tiers are the
// SGS object attrs borderRadiusTablet/borderRadiusMobile.
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
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();

// Border width/colour/style — SGS custom attrs (no WP-native per-side width
// support; matches sgs/quote + sgs/button). Base only, no tiers.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = $sgs_css_length( $border_width_obj['top'] ?? '' );
$border_width_right  = $sgs_css_length( $border_width_obj['right'] ?? '' );
$border_width_bottom = $sgs_css_length( $border_width_obj['bottom'] ?? '' );
$border_width_left   = $sgs_css_length( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_colour         = $attributes['borderColour'] ?? '';
$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

// ---------------------------------------------------------------------------
// 3. Scoped CSS assembly. uid is a CLASS (this block has anchor support for
// the ToC, so the `id` attribute stays free for the anchor).
// ---------------------------------------------------------------------------

$uid       = 'sgs-tl-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel  = '.' . $uid . '.sgs-timeline';
$title_sel = $root_sel . ' .sgs-timeline__title';

$scoped_css = array();

// --- Box shorthand helpers (contract §B) ---
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

// --- Root box/border declarations (custom borderWidth/Colour/Style — no WP
// native support for per-side width, matches sgs/quote + sgs/button). ---
$root_decls = array();
if ( 'none' !== $border_style ) {
	if ( $has_border_width ) {
		$bwt          = '' !== $border_width_top ? $border_width_top : '0';
		$bwr          = '' !== $border_width_right ? $border_width_right : '0';
		$bwb          = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl          = '' !== $border_width_left ? $border_width_left : '0';
		$root_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
	}
	$root_decls[] = 'border-style:' . $border_style;
	if ( $border_colour ) {
		$root_decls[] = 'border-color:' . sgs_colour_value( $border_colour );
	}
}
if ( $root_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $root_decls ) . ';}';
}

// --- Base spacing (padding/margin), border-radius, WP colour + shadow
// supports — skip-serialised, emitted scoped via the stable core style
// engine (exactly how WP core outputs `layout` support). ---
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

	$color_args = array();
	if ( '' !== $style_color_text ) {
		$color_args['text'] = $style_color_text;
	}
	if ( '' !== $style_color_bg ) {
		$color_args['background'] = $style_color_bg;
	}
	if ( ! empty( $color_args ) ) {
		$base_style_engine_args['color'] = $color_args;
	}

	if ( '' !== $style_shadow ) {
		$base_style_engine_args['shadow'] = $style_shadow;
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

	// --- Typography — routed to `.sgs-timeline__title` (matches the declared
	// selectors.typography in block.json), not the root. ---
	if ( ! empty( $style_typography ) ) {
		$typography_scoped_styles = wp_style_engine_get_styles(
			array( 'typography' => $style_typography ),
			array( 'selector' => $title_sel )
		);
		if ( ! empty( $typography_scoped_styles['css'] ) ) {
			$scoped_css[] = $typography_scoped_styles['css'];
		}
	}
}

// --- Responsive padding/margin/border-radius tiers — box objects, hand-built
// shorthand, scoped @media on the root selector (contract §B2: tablet
// max-width:1023px, mobile max-width:767px). ---
$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );
$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );
$radius_tab_val  = $sgs_corner_shorthand( $border_radius_tablet_obj );
$radius_mob_val  = $sgs_corner_shorthand( $border_radius_mobile_obj );

$tablet_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_decls[] = "margin:{$margin_tab_val}";
}
if ( null !== $radius_tab_val ) {
	$tablet_decls[] = "border-radius:{$radius_tab_val}";
}
if ( $tablet_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_decls ) . ';}}';
}

$mobile_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_decls[] = "margin:{$margin_mob_val}";
}
if ( null !== $radius_mob_val ) {
	$mobile_decls[] = "border-radius:{$radius_mob_val}";
}
if ( $mobile_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_decls ) . ';}}';
}

// ---------------------------------------------------------------------------
// 4. Build the root element's classes + attributes.
//
// uid is a CLASS (contract §B3 note — anchor support keeps the `id` free for
// the ToC target). is-style-*/align* classes are merged in automatically by
// get_block_wrapper_attributes() via the block's className attribute. The
// `style` attr carries ONLY the pre-existing custom-property VALUES
// (--sgs-connector-colour / --sgs-date-colour / --sgs-reveal-stagger) — no
// property declaration (contract §A); every declaration lives in the scoped
// <style> above.
// ---------------------------------------------------------------------------

// Build wrapper class list.
$wrapper_classes   = array( 'sgs-timeline', $uid );
$wrapper_classes[] = 'sgs-timeline--' . $orientation;
if ( 'vertical' === $orientation ) {
	$wrapper_classes[] = 'sgs-timeline--align-' . $alignment;
}
$wrapper_classes[] = 'sgs-timeline--connector-' . $connector_style;

if ( '' !== $preset_text_slug ) {
	$wrapper_classes[] = 'has-text-color';
	$wrapper_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$wrapper_classes[] = 'has-background';
	$wrapper_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

// Wrapper CSS custom properties (VALUES only — contract §A allows `--var:value`).
$wrapper_style_parts = array();
if ( $connector_colour ) {
	$wrapper_style_parts[] = '--sgs-connector-colour:' . sgs_colour_value( $connector_colour );
}
if ( $date_colour ) {
	$wrapper_style_parts[] = '--sgs-date-colour:' . sgs_colour_value( $date_colour );
}
if ( $reveal_stagger > 0 ) {
	$wrapper_style_parts[] = '--sgs-reveal-stagger:' . $reveal_stagger . 'ms';
}
$wrapper_style = $wrapper_style_parts ? implode( ';', $wrapper_style_parts ) : '';

$wrapper_args = array(
	'class' => implode( ' ', $wrapper_classes ),
);
if ( $wrapper_style ) {
	$wrapper_args['style'] = $wrapper_style;
}

// Pass scroll-reveal config to view.js via data attributes.
if ( $reveal_on_scroll ) {
	$wrapper_args['data-reveal-on-scroll'] = 'true';
	$wrapper_args['data-reveal-stagger']   = (string) $reveal_stagger;
}

$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

?>
<?php if ( $scoped_css ) : ?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
<?php endif; ?>
<ol <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php foreach ( $entries as $index => $entry ) : ?>
		<?php
		$entry       = is_array( $entry ) ? $entry : array();
		$date_raw    = isset( $entry['date'] ) ? (string) $entry['date'] : '';
		$entry_title = isset( $entry['title'] ) ? (string) $entry['title'] : '';
		$description = isset( $entry['description'] ) ? (string) $entry['description'] : '';
		$icon        = isset( $entry['icon'] ) ? (string) $entry['icon'] : '';
		$image_id    = isset( $entry['image'] ) ? absint( $entry['image'] ) : 0;

		// Build a safe ISO 8601 datetime attribute from the raw date string.
		// Accept both full dates (YYYY-MM-DD) and year-only values.
		$datetime_attr = '';
		if ( $date_raw ) {
			if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date_raw ) ) {
				// Looks like YYYY-MM-DD — use as-is.
				$datetime_attr = $date_raw;
			} elseif ( preg_match( '/^\d{4}$/', $date_raw ) ) {
				// Year-only format.
				$datetime_attr = $date_raw;
			} else {
				// Attempt conversion via strtotime for human-readable strings.
				$ts = strtotime( $date_raw );
				if ( false !== $ts ) {
					$datetime_attr = gmdate( 'Y-m-d', $ts );
				}
			}
		}

		// Pre-reveal when revealOnScroll is disabled.
		$entry_classes = array( 'sgs-timeline__entry' );
		if ( ! $reveal_on_scroll ) {
			$entry_classes[] = 'is-revealed';
		}
		$entry_class_attr = implode( ' ', $entry_classes );

		$image_url = ( $image_id > 0 ) ? wp_get_attachment_image_url( $image_id, 'medium' ) : '';
		$image_alt = ( $image_id > 0 ) ? (string) get_post_meta( $image_id, '_wp_attachment_image_alt', true ) : '';
		?>
		<li class="<?php echo esc_attr( $entry_class_attr ); ?>">
			<time class="sgs-timeline__date"<?php echo $datetime_attr ? ' datetime="' . esc_attr( $datetime_attr ) . '"' : ''; ?>>
				<?php echo esc_html( $date_raw ); ?>
			</time>
			<div class="sgs-timeline__node" aria-hidden="true">
				<?php if ( $icon ) : ?>
					<span class="sgs-timeline__node-icon" data-icon="<?php echo esc_attr( $icon ); ?>" aria-hidden="true"></span>
				<?php endif; ?>
			</div>
			<div class="sgs-timeline__content">
				<h3 class="sgs-timeline__title"><?php echo esc_html( $entry_title ); ?></h3>
				<?php if ( $description ) : ?>
					<div class="sgs-timeline__description"><?php echo wp_kses_post( $description ); ?></div>
				<?php endif; ?>
				<?php if ( $image_url ) : ?>
					<img class="sgs-timeline__image" src="<?php echo esc_url( $image_url ); ?>" alt="<?php echo esc_attr( $image_alt ); ?>" loading="lazy" />
				<?php endif; ?>
			</div>
		</li>
	<?php endforeach; ?>
</ol>
