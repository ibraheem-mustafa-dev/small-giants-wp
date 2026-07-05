<?php
/**
 * Server-side render for sgs/heading (v0.4.0 - single-element refactor).
 *
 * HeadingRole=heading    - emits the HTML tag from the level attr (h1-h6).
 * HeadingRole=subheading - emits the HTML tag from the subTag attr (p or div).
 *
 * Typography, spacing, colour and wrapper-level controls apply identically
 * for both roles. The subheading role applies CSS-fallback defaults via a
 * BEM modifier class for fontWeight (400) and textColour (text-muted) when
 * the attrs are still at their schema defaults - user customisations always
 * win via inline style.
 *
 * Migration note: existing posts saved with the composite-block schema (v0.3.0)
 * are handled by deprecated.js v2 which routes to this renderer via migrated
 * attributes.
 *
 * @since 2026-05-26  v0.4.0 - single-element refactor (headingRole + content).
 * @since 2026-06-01  v0.5.0 - variantStyle replaced by WP block-styles (is-style-*).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused - dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Allowed units whitelist.
// ---------------------------------------------------------------------------

/**
 * Sanitise a CSS length unit - falls back to px if the value is not allowed.
 *
 * @param string $unit     User-supplied unit.
 * @param string $fallback Fallback unit (default 'px').
 * @return string          Sanitised unit.
 */
if ( ! function_exists( 'sgs_heading_safe_unit' ) ) {
	/**
	 * Inner implementation - guarded by function_exists to allow multiple
	 * includes in the same request (e.g. widget areas with multiple headings).
	 *
	 * @param string $unit     User-supplied unit.
	 * @param string $fallback Fallback unit.
	 * @return string          Sanitised unit.
	 */
	function sgs_heading_safe_unit( $unit, $fallback = 'px' ) {
		static $allowed = array( 'px', 'em', 'rem', '%', 'vh', 'vw' );
		$unit           = sanitize_text_field( (string) $unit );
		return in_array( $unit, $allowed, true ) ? $unit : $fallback;
	}
}

/**
 * Convert a raw spacing value + unit string to a CSS length.
 *
 * Returns empty string for blank or non-numeric input.
 *
 * @param string $value Raw attribute value (may be numeric string or empty).
 * @param string $unit  Validated CSS unit.
 * @return string       e.g. "20px" or "".
 */
if ( ! function_exists( 'sgs_heading_spacing_val' ) ) {
	/**
	 * Inner implementation - guarded by function_exists.
	 *
	 * @param string $value Raw attribute value.
	 * @param string $unit  Validated CSS unit.
	 * @return string       CSS length string or empty string.
	 */
	function sgs_heading_spacing_val( $value, $unit ) {
		$trimmed = trim( (string) $value );
		if ( '' === $trimmed ) {
			return '';
		}
		if ( ! preg_match( '/^-?\d+(\.\d+)?$/', $trimmed ) ) {
			return '';
		}
		return $trimmed . $unit;
	}
}

// ---------------------------------------------------------------------------
// 2. Extract attributes with defaults.
// ---------------------------------------------------------------------------

$heading_role = $attributes['headingRole'] ?? 'heading';
$content      = isset( $attributes['content'] ) ? (string) $attributes['content'] : '';
$level        = $attributes['level'] ?? 'h2';
$sub_tag      = $attributes['subTag'] ?? 'p';
$anchor       = $attributes['anchor'] ?? '';

// Validate enums.
if ( ! in_array( $heading_role, array( 'heading', 'subheading' ), true ) ) {
	$heading_role = 'heading';
}
// Coerce a numeric level (e.g. "3" stored by the editor) to the "hN" string form
// so the in_array allowlist below matches, matching what edit.js already does.
if ( is_numeric( $level ) ) {
	$level = 'h' . absint( $level );
}
if ( ! in_array( $level, array( 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ), true ) ) {
	$level = 'h2';
}
if ( ! in_array( $sub_tag, array( 'p', 'div' ), true ) ) {
	$sub_tag = 'p';
}

// Determine the rendered HTML tag based on role.
$is_subheading = ( 'subheading' === $heading_role );
$rendered_tag  = $is_subheading ? $sub_tag : $level;

// Typography attrs.
$font_family         = $attributes['fontFamily'] ?? '';
$font_size           = $attributes['fontSize'] ?? 28;
$font_size_unit      = $attributes['fontSizeUnit'] ?? 'px';
$font_size_tablet    = $attributes['fontSizeTablet'] ?? null;
$font_size_mobile    = $attributes['fontSizeMobile'] ?? null;
$font_weight         = $attributes['fontWeight'] ?? '700';
$line_height         = isset( $attributes['lineHeight'] ) ? $attributes['lineHeight'] : null;
$line_height_unit    = $attributes['lineHeightUnit'] ?? 'em';
$letter_spacing      = isset( $attributes['letterSpacing'] ) ? $attributes['letterSpacing'] : null;
$letter_spacing_unit = $attributes['letterSpacingUnit'] ?? 'em';
$text_transform      = isset( $attributes['textTransform'] ) ? $attributes['textTransform'] : '';
$text_colour         = $attributes['textColour'] ?? 'text';
$font_style          = isset( $attributes['fontStyle'] ) ? sanitize_text_field( $attributes['fontStyle'] ) : '';
$text_decoration     = isset( $attributes['textDecoration'] ) ? sanitize_text_field( $attributes['textDecoration'] ) : '';

// Wrapper-level attrs.
$margin_unit       = sgs_heading_safe_unit( $attributes['marginUnit'] ?? 'px' );
$margin_top        = $attributes['marginTop'] ?? '';
$margin_right      = $attributes['marginRight'] ?? '';
$margin_bottom     = $attributes['marginBottom'] ?? '';
$margin_left       = $attributes['marginLeft'] ?? '';
$margin_top_tab    = $attributes['marginTopTablet'] ?? '';
$margin_right_tab  = $attributes['marginRightTablet'] ?? '';
$margin_bottom_tab = $attributes['marginBottomTablet'] ?? '';
$margin_left_tab   = $attributes['marginLeftTablet'] ?? '';
$margin_top_mob    = $attributes['marginTopMobile'] ?? '';
$margin_right_mob  = $attributes['marginRightMobile'] ?? '';
$margin_bottom_mob = $attributes['marginBottomMobile'] ?? '';
$margin_left_mob   = $attributes['marginLeftMobile'] ?? '';

$padding_unit       = sgs_heading_safe_unit( $attributes['paddingUnit'] ?? 'px' );
$padding_top        = $attributes['paddingTop'] ?? '';
$padding_right      = $attributes['paddingRight'] ?? '';
$padding_bottom     = $attributes['paddingBottom'] ?? '';
$padding_left       = $attributes['paddingLeft'] ?? '';
$padding_top_tab    = $attributes['paddingTopTablet'] ?? '';
$padding_right_tab  = $attributes['paddingRightTablet'] ?? '';
$padding_bottom_tab = $attributes['paddingBottomTablet'] ?? '';
$padding_left_tab   = $attributes['paddingLeftTablet'] ?? '';
$padding_top_mob    = $attributes['paddingTopMobile'] ?? '';
$padding_right_mob  = $attributes['paddingRightMobile'] ?? '';
$padding_bottom_mob = $attributes['paddingBottomMobile'] ?? '';
$padding_left_mob   = $attributes['paddingLeftMobile'] ?? '';

$background_colour   = $attributes['backgroundColour'] ?? '';
$border_radius       = $attributes['borderRadius'] ?? '';
$border_radius_unit  = sgs_heading_safe_unit( $attributes['borderRadiusUnit'] ?? 'px' );
$border_radius_tl    = $attributes['borderRadiusTL'] ?? '';
$border_radius_tr    = $attributes['borderRadiusTR'] ?? '';
$border_radius_bl    = $attributes['borderRadiusBL'] ?? '';
$border_radius_br    = $attributes['borderRadiusBR'] ?? '';
$border_width_top    = $attributes['borderWidthTop'] ?? '';
$border_width_right  = $attributes['borderWidthRight'] ?? '';
$border_width_bottom = $attributes['borderWidthBottom'] ?? '';
$border_width_left   = $attributes['borderWidthLeft'] ?? '';
$border_width_unit   = sgs_heading_safe_unit( $attributes['borderWidthUnit'] ?? 'px' );
$border_colour       = $attributes['borderColour'] ?? '';
$box_shadow          = $attributes['boxShadow'] ?? '';
$box_shadow_hover    = $attributes['boxShadowHover'] ?? '';

$transition_duration_raw = isset( $attributes['transitionDuration'] ) ? absint( $attributes['transitionDuration'] ) : 300;
$transition_duration     = $transition_duration_raw > 0 ? $transition_duration_raw : 300;
$transition_easing_raw   = $attributes['transitionEasing'] ?? 'ease';
$allowed_easings         = array( 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' );
$transition_easing       = in_array( $transition_easing_raw, $allowed_easings, true ) ? $transition_easing_raw : 'ease';

$hover_scale      = isset( $attributes['hoverScale'] ) && null !== $attributes['hoverScale'] ? (float) $attributes['hoverScale'] : null;
$hover_colour     = $attributes['hoverColour'] ?? '';
$hover_background = $attributes['hoverBackground'] ?? '';

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

$custom_width      = $attributes['customWidth'] ?? '';
$custom_width_unit = sgs_heading_safe_unit( $attributes['customWidthUnit'] ?? 'px' );
$inherit_style     = ! empty( $attributes['inheritStyle'] );

// Text alignment — validated against allowlist; emitted on the wrapper.
$text_align_raw      = isset( $attributes['textAlign'] ) ? sanitize_text_field( $attributes['textAlign'] ) : '';
$allowed_text_aligns = array( 'left', 'center', 'right', 'justify', 'start', 'end' );
$text_align          = in_array( $text_align_raw, $allowed_text_aligns, true ) ? $text_align_raw : '';

// ---------------------------------------------------------------------------
// 3. Build inline text element style.
// ---------------------------------------------------------------------------

$text_style_parts = array();

if ( $text_colour ) {
	$text_style_parts[] = 'color:' . sgs_colour_value( $text_colour );
}
// font-size is NOT inline (Pattern A, D-migration): it has tablet/mobile
// tiers, so base+tablet+mobile are emitted together on the SAME selector
// in the scoped <style> block below (step 5) — inline would always beat
// the id-scoped @media overrides regardless of viewport.
if ( $font_weight ) {
	$text_style_parts[] = 'font-weight:' . esc_attr( $font_weight );
}
if ( null !== $line_height && '' !== $line_height ) {
	// When the converter lifted a unitless line-height (e.g. 1.15 from
	// the draft CSS), it stores lineHeightUnit="unitless" so the value
	// survives block serialisation (empty strings are stripped).
	// Treat "unitless" as no-unit — emit the bare number ratio.
	$lh_unit            = ( 'unitless' === $line_height_unit ) ? '' : $line_height_unit;
	$text_style_parts[] = 'line-height:' . floatval( $line_height ) . $lh_unit;
}
if ( null !== $letter_spacing && '' !== $letter_spacing ) {
	$text_style_parts[] = 'letter-spacing:' . floatval( $letter_spacing ) . $letter_spacing_unit;
}
if ( '' !== $text_transform ) {
	$text_style_parts[] = 'text-transform:' . esc_attr( $text_transform );
}
if ( $font_family ) {
	$text_style_parts[] = 'font-family:' . esc_attr( $font_family );
}

$allowed_font_styles = array( 'normal', 'italic' );
if ( '' !== $font_style && in_array( $font_style, $allowed_font_styles, true ) ) {
	$text_style_parts[] = 'font-style:' . $font_style;
}

$allowed_decorations = array( 'none', 'underline', 'line-through' );
if ( '' !== $text_decoration && in_array( $text_decoration, $allowed_decorations, true ) ) {
	$text_style_parts[] = 'text-decoration:' . $text_decoration;
}

$text_style_attr = $text_style_parts ? ' style="' . esc_attr( implode( ';', $text_style_parts ) ) . '"' : '';

// ---------------------------------------------------------------------------
// 4. Build wrapper-level inline styles.
// ---------------------------------------------------------------------------

$wrapper_inline = array();

if ( ! $inherit_style ) {
	// margin/padding are NOT inline (Pattern A, D-migration): both have
	// tablet/mobile tiers, so base+tablet+mobile are emitted together on the
	// SAME wrapper selector in the scoped <style> block below (step 5), via
	// sgs_responsive_box_shorthand_rule(). Inline would always beat the
	// id-scoped @media overrides regardless of viewport.

	if ( $background_colour ) {
		$wrapper_inline[] = 'background-color:' . sgs_colour_value( $background_colour );
	}

	$br_tl = sgs_heading_spacing_val( $border_radius_tl, $border_radius_unit );
	$br_tr = sgs_heading_spacing_val( $border_radius_tr, $border_radius_unit );
	$br_br = sgs_heading_spacing_val( $border_radius_br, $border_radius_unit );
	$br_bl = sgs_heading_spacing_val( $border_radius_bl, $border_radius_unit );
	if ( $br_tl || $br_tr || $br_br || $br_bl ) {
		$wrapper_inline[] = 'border-radius:'
			. ( $br_tl ? $br_tl : '0' ) . ' '
			. ( $br_tr ? $br_tr : '0' ) . ' '
			. ( $br_br ? $br_br : '0' ) . ' '
			. ( $br_bl ? $br_bl : '0' );
	} elseif ( '' !== $border_radius ) {
		$br_val = sgs_heading_spacing_val( $border_radius, $border_radius_unit );
		if ( $br_val ) {
			$wrapper_inline[] = 'border-radius:' . $br_val;
		}
	}

	$bwt = sgs_heading_spacing_val( $border_width_top, $border_width_unit );
	$bwr = sgs_heading_spacing_val( $border_width_right, $border_width_unit );
	$bwb = sgs_heading_spacing_val( $border_width_bottom, $border_width_unit );
	$bwl = sgs_heading_spacing_val( $border_width_left, $border_width_unit );
	if ( $bwt || $bwr || $bwb || $bwl ) {
		$wrapper_inline[] = 'border-width:'
			. ( $bwt ? $bwt : '0' ) . ' '
			. ( $bwr ? $bwr : '0' ) . ' '
			. ( $bwb ? $bwb : '0' ) . ' '
			. ( $bwl ? $bwl : '0' );
	}

	if ( $border_style && 'none' !== $border_style ) {
		$wrapper_inline[] = 'border-style:' . $border_style;
	}
	if ( $border_colour ) {
		$wrapper_inline[] = 'border-color:' . sgs_colour_value( $border_colour );
	}
	if ( $box_shadow ) {
		$wrapper_inline[] = 'box-shadow:' . sgs_shadow_value( $box_shadow );
	}
	if ( '' !== $custom_width ) {
		$cw_val = sgs_heading_spacing_val( $custom_width, $custom_width_unit );
		if ( $cw_val ) {
			$wrapper_inline[] = 'width:' . $cw_val;
		}
	}

	// Text alignment — explicit value overrides the CSS default (center) with
	// zero-specificity :where() guard in style.css so this inline wins reliably.
	if ( '' !== $text_align ) {
		$wrapper_inline[] = 'text-align:' . esc_attr( $text_align );
	}
}

// ---------------------------------------------------------------------------
// 5. Unique ID + scoped CSS for hover, responsive, and font-size rules.
// ---------------------------------------------------------------------------

$uid = 'sgs-hdg-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );

$scoped_css = array();

// Hover states.
$hover_rules = array();
if ( $hover_colour ) {
	$hover_rules[] = 'color:' . sgs_colour_value( $hover_colour );
}
if ( $hover_background ) {
	$hover_rules[] = 'background-color:' . sgs_colour_value( $hover_background );
}
if ( $box_shadow_hover ) {
	$hover_rules[] = 'box-shadow:' . sgs_shadow_value( $box_shadow_hover );
}
$has_scale = null !== $hover_scale && abs( $hover_scale - 1.0 ) > 0.001;
if ( $has_scale ) {
	$hover_rules[] = 'transform:scale(' . round( $hover_scale, 3 ) . ')';
}

if ( $hover_rules || $has_scale ) {
	$scoped_css[] = "#{$uid}.wp-block-sgs-heading{transition:all {$transition_duration}ms {$transition_easing};}";
	$scoped_css[] = "@media(prefers-reduced-motion:reduce){#{$uid}.wp-block-sgs-heading{transition:none !important;transform:none !important;}}";
	if ( $hover_rules ) {
		$scoped_css[] = "#{$uid}.wp-block-sgs-heading:hover,#{$uid}.wp-block-sgs-heading:focus-within{" . implode( ';', $hover_rules ) . ';}';
	}
}

// Text-element font-size — base + tablet + mobile on the SAME selector
// (Pattern A). Replaces the old inline-base + id-scoped-tablet/mobile-only
// emission, which the inline value always defeated regardless of viewport.
$scoped_css[] = sgs_responsive_css_rule(
	$attributes,
	array(
		array(
			'attr'         => 'fontSize',
			'css'          => 'font-size',
			'unit_default' => $font_size_unit,
			'tablet_attr'  => 'fontSizeTablet',
			'mobile_attr'  => 'fontSizeMobile',
			'cast'         => 'int',
		),
	),
	"#{$uid} .wp-block-sgs-heading__text"
);

// Wrapper margin + padding — base + tablet + mobile shorthand on the SAME
// wrapper selector (Pattern A). Same zero-fill-per-tier contract as before.
if ( ! $inherit_style ) {
	$scoped_css[] = sgs_responsive_box_shorthand_rule(
		$attributes,
		'margin',
		array(
			'top'    => array(
				'base'   => 'marginTop',
				'tablet' => 'marginTopTablet',
				'mobile' => 'marginTopMobile',
			),
			'right'  => array(
				'base'   => 'marginRight',
				'tablet' => 'marginRightTablet',
				'mobile' => 'marginRightMobile',
			),
			'bottom' => array(
				'base'   => 'marginBottom',
				'tablet' => 'marginBottomTablet',
				'mobile' => 'marginBottomMobile',
			),
			'left'   => array(
				'base'   => 'marginLeft',
				'tablet' => 'marginLeftTablet',
				'mobile' => 'marginLeftMobile',
			),
		),
		'marginUnit',
		"#{$uid}.wp-block-sgs-heading"
	);

	$scoped_css[] = sgs_responsive_box_shorthand_rule(
		$attributes,
		'padding',
		array(
			'top'    => array(
				'base'   => 'paddingTop',
				'tablet' => 'paddingTopTablet',
				'mobile' => 'paddingTopMobile',
			),
			'right'  => array(
				'base'   => 'paddingRight',
				'tablet' => 'paddingRightTablet',
				'mobile' => 'paddingRightMobile',
			),
			'bottom' => array(
				'base'   => 'paddingBottom',
				'tablet' => 'paddingBottomTablet',
				'mobile' => 'paddingBottomMobile',
			),
			'left'   => array(
				'base'   => 'paddingLeft',
				'tablet' => 'paddingLeftTablet',
				'mobile' => 'paddingLeftMobile',
			),
		),
		'paddingUnit',
		"#{$uid}.wp-block-sgs-heading"
	);
}

// ---------------------------------------------------------------------------
// 6. Build wrapper CSS classes.
// ---------------------------------------------------------------------------

$wrapper_classes = array( 'wp-block-sgs-heading' );

if ( $is_subheading ) {
	$wrapper_classes[] = 'wp-block-sgs-heading--subheading';
}

// Note: variantStyle (v0.4.0) has been replaced by WP block-styles (is-style-*).
// The active style class (e.g. is-style-hero) is merged in automatically by
// get_block_wrapper_attributes() via the block's className attribute.

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'id'    => $uid,
		'class' => implode( ' ', $wrapper_classes ),
		'style' => $wrapper_inline ? implode( ';', $wrapper_inline ) . ';' : '',
	)
);

// Anchor attribute for the text element.
$anchor_attr = $anchor ? ' id="' . esc_attr( $anchor ) . '"' : '';

$rendered_tag_escaped = tag_escape( $rendered_tag );
?>
<?php if ( $scoped_css ) : ?>
<style><?php echo esc_html( implode( '', $scoped_css ) ); ?></style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<<?php echo $rendered_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> class="wp-block-sgs-heading__text"<?php echo $anchor_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><?php echo $text_style_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
		<?php echo wp_kses_post( $content ); ?>
	</<?php echo $rendered_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
</div>
