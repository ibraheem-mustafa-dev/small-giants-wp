<?php
/**
 * Server-side render for sgs/heading.
 *
 * Converts the block from static to dynamic so the converter pipeline's
 * self-closing block comments (`<!-- wp:sgs/heading {attrs} /-->`) produce
 * the expected DOM. Without this file the static save.js HTML never gets
 * rendered for cv2-emitted instances, so the `sgs-heading` root class
 * never reaches the deployed page — breaking pixel-diff selectors.
 *
 * Render is a faithful PHP port of save.js. Existing static instances on
 * already-published posts continue to round-trip via their stored save
 * HTML; only new (cv2-emitted) instances flow through this renderer.
 *
 * @since 2026-05-16  P-PHASE8-2 render.php audit
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// Extract all attributes with defaults.
$label                     = isset( $attributes['label'] ) ? (string) $attributes['label'] : '';
$label_enabled             = ! empty( $attributes['labelEnabled'] );
$label_tag                 = $attributes['labelTag'] ?? 'span';
$label_font_family         = $attributes['labelFontFamily'] ?? '';
$label_font_size           = $attributes['labelFontSize'] ?? 12;
$label_font_size_unit      = $attributes['labelFontSizeUnit'] ?? 'px';
$label_font_weight         = $attributes['labelFontWeight'] ?? '600';
$label_line_height         = $attributes['labelLineHeight'] ?? 1.2;
$label_line_height_unit    = $attributes['labelLineHeightUnit'] ?? 'em';
$label_letter_spacing      = $attributes['labelLetterSpacing'] ?? 0.08;
$label_letter_spacing_unit = $attributes['labelLetterSpacingUnit'] ?? 'em';
$label_text_transform      = $attributes['labelTextTransform'] ?? 'uppercase';
$label_colour              = $attributes['labelColour'] ?? 'primary';

$headline                     = isset( $attributes['headline'] ) ? (string) $attributes['headline'] : '';
$headline_level               = $attributes['headlineLevel'] ?? 'h2';
$headline_id                  = $attributes['headlineId'] ?? '';
$headline_font_family         = $attributes['headlineFontFamily'] ?? '';
$headline_font_size           = $attributes['headlineFontSize'] ?? 28;
$headline_font_size_unit      = $attributes['headlineFontSizeUnit'] ?? 'px';
$headline_font_weight         = $attributes['headlineFontWeight'] ?? '700';
$headline_line_height         = $attributes['headlineLineHeight'] ?? 1.2;
$headline_line_height_unit    = $attributes['headlineLineHeightUnit'] ?? 'em';
$headline_letter_spacing      = $attributes['headlineLetterSpacing'] ?? -0.01;
$headline_letter_spacing_unit = $attributes['headlineLetterSpacingUnit'] ?? 'em';
$headline_text_transform      = $attributes['headlineTextTransform'] ?? 'none';
$headline_colour              = $attributes['headlineColour'] ?? 'text';

$sub                     = isset( $attributes['sub'] ) ? (string) $attributes['sub'] : '';
$sub_enabled             = ! empty( $attributes['subEnabled'] );
$sub_tag                 = $attributes['subTag'] ?? 'p';
$sub_font_family         = $attributes['subFontFamily'] ?? '';
$sub_font_size           = $attributes['subFontSize'] ?? 16;
$sub_font_size_unit      = $attributes['subFontSizeUnit'] ?? 'px';
$sub_font_weight         = $attributes['subFontWeight'] ?? '400';
$sub_line_height         = $attributes['subLineHeight'] ?? 1.5;
$sub_line_height_unit    = $attributes['subLineHeightUnit'] ?? 'em';
$sub_letter_spacing      = $attributes['subLetterSpacing'] ?? 0;
$sub_letter_spacing_unit = $attributes['subLetterSpacingUnit'] ?? 'em';
$sub_text_transform      = $attributes['subTextTransform'] ?? 'none';
$sub_colour              = $attributes['subColour'] ?? 'text-muted';

$icon          = $attributes['icon'] ?? '';
$icon_position = $attributes['iconPosition'] ?? 'none';
$emoji         = $attributes['emoji'] ?? '';

// Validate headline level.
if ( ! in_array( $headline_level, array( 'h1', 'h2', 'h3', 'h4' ), true ) ) {
	$headline_level = 'h2';
}

// Validate label tag.
if ( ! in_array( $label_tag, array( 'span', 'p', 'div' ), true ) ) {
	$label_tag = 'span';
}

// Validate sub tag.
if ( ! in_array( $sub_tag, array( 'p', 'div' ), true ) ) {
	$sub_tag = 'p';
}

/**
 * Build inline style string for a single slot.
 * Mirrors save.js buildSlotStyle().
 *
 * @param array $args Array of style properties (colour, fontSize, fontWeight, etc.).
 * @return string     Inline style attribute string (empty if no styles).
 */
if ( ! function_exists( 'sgs_heading_build_slot_style' ) ) {
function sgs_heading_build_slot_style( $args ) {
	$style_parts = array();

	if ( isset( $args['colour'] ) && $args['colour'] ) {
		$style_parts[] = 'color:' . sgs_colour_value( $args['colour'] );
	}

	if ( isset( $args['fontSize'] ) && $args['fontSize'] ) {
		$style_parts[] = 'font-size:' . intval( $args['fontSize'] ) . ( $args['fontSizeUnit'] ?? 'px' );
	}

	if ( isset( $args['fontWeight'] ) && $args['fontWeight'] ) {
		$style_parts[] = 'font-weight:' . esc_attr( $args['fontWeight'] );
	}

	if ( isset( $args['lineHeight'] ) && null !== $args['lineHeight'] ) {
		$style_parts[] = 'line-height:' . floatval( $args['lineHeight'] ) . ( $args['lineHeightUnit'] ?? 'em' );
	}

	if ( isset( $args['letterSpacing'] ) && null !== $args['letterSpacing'] ) {
		$style_parts[] = 'letter-spacing:' . floatval( $args['letterSpacing'] ) . ( $args['letterSpacingUnit'] ?? 'em' );
	}

	if ( isset( $args['textTransform'] ) && $args['textTransform'] ) {
		$style_parts[] = 'text-transform:' . esc_attr( $args['textTransform'] );
	}

	if ( isset( $args['fontFamily'] ) && $args['fontFamily'] ) {
		$style_parts[] = 'font-family:' . esc_attr( $args['fontFamily'] );
	}

	return $style_parts ? ' style="' . esc_attr( implode( ';', $style_parts ) ) . '"' : '';
}
}

// Build per-slot styles.
$label_style = sgs_heading_build_slot_style(
	array(
		'colour'            => $label_colour,
		'fontFamily'        => $label_font_family,
		'fontSize'          => $label_font_size,
		'fontSizeUnit'      => $label_font_size_unit,
		'fontWeight'        => $label_font_weight,
		'lineHeight'        => $label_line_height,
		'lineHeightUnit'    => $label_line_height_unit,
		'letterSpacing'     => $label_letter_spacing,
		'letterSpacingUnit' => $label_letter_spacing_unit,
		'textTransform'     => $label_text_transform,
	)
);

$headline_style = sgs_heading_build_slot_style(
	array(
		'colour'            => $headline_colour,
		'fontFamily'        => $headline_font_family,
		'fontSize'          => $headline_font_size,
		'fontSizeUnit'      => $headline_font_size_unit,
		'fontWeight'        => $headline_font_weight,
		'lineHeight'        => $headline_line_height,
		'lineHeightUnit'    => $headline_line_height_unit,
		'letterSpacing'     => $headline_letter_spacing,
		'letterSpacingUnit' => $headline_letter_spacing_unit,
		'textTransform'     => $headline_text_transform,
	)
);

$sub_style = sgs_heading_build_slot_style(
	array(
		'colour'            => $sub_colour,
		'fontFamily'        => $sub_font_family,
		'fontSize'          => $sub_font_size,
		'fontSizeUnit'      => $sub_font_size_unit,
		'fontWeight'        => $sub_font_weight,
		'lineHeight'        => $sub_line_height,
		'lineHeightUnit'    => $sub_line_height_unit,
		'letterSpacing'     => $sub_letter_spacing,
		'letterSpacingUnit' => $sub_letter_spacing_unit,
		'textTransform'     => $sub_text_transform,
	)
);

$wrapper_attrs = get_block_wrapper_attributes( array( 'class' => 'wp-block-sgs-heading' ) );

?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php
	// Icon / emoji before label.
	if ( 'before-label' === $icon_position && ( $icon || $emoji ) ) :
		?>
		<span class="wp-block-sgs-heading__icon" aria-hidden="true"><?php echo esc_html( $emoji ? $emoji : $icon ); ?></span>
		<?php
	endif;

	// Label — only rendered when enabled.
	if ( $label_enabled ) :
		$label_tag_escaped = tag_escape( $label_tag );
		?>
		<<?php echo $label_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> class="wp-block-sgs-heading__label"<?php echo $label_style; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
			<?php echo wp_kses_post( $label ); ?>
		</<?php echo $label_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
		<?php
	endif;

	// Icon / emoji before headline.
	if ( 'before-headline' === $icon_position && ( $icon || $emoji ) ) :
		?>
		<span class="wp-block-sgs-heading__icon" aria-hidden="true"><?php echo esc_html( $emoji ? $emoji : $icon ); ?></span>
		<?php
	endif;

	// Headline — always present.
	$headline_tag_escaped = tag_escape( $headline_level );
	$headline_id_attr     = $headline_id ? ' id="' . esc_attr( $headline_id ) . '"' : '';
	?>
	<<?php echo $headline_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> class="wp-block-sgs-heading__headline"<?php echo $headline_id_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><?php echo $headline_style; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
		<?php echo wp_kses_post( $headline ); ?>
	</<?php echo $headline_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php

	// Sub — only rendered when enabled.
	if ( $sub_enabled ) :
		$sub_tag_escaped = tag_escape( $sub_tag );
		?>
		<<?php echo $sub_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> class="wp-block-sgs-heading__sub"<?php echo $sub_style; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
			<?php echo wp_kses_post( $sub ); ?>
		</<?php echo $sub_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
		<?php
	endif;
	?>
</div>
