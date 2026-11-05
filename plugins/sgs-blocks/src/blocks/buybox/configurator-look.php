<?php
/**
 * The Pick a set look of sgs/buybox: what the box forwards to its option pickers, the group headings, and the scoped rules
 * for the pick area (box padding and gap, the flavour pills' resting fill, border, weight and selected shadow, the
 * colour dots, the heading typography, the pack-tile columns).
 *
 * Every setting is off when unset: nothing is forwarded, no rule prints and no markup changes. Colours go through
 * sgs_colour_value(), the selected shadow through sgs_shadow_decls() (the emitter sgs/option-picker uses), per-device
 * values through sgs_emit_responsive_css() / sgs_emit_tier_decls().
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_buybox_configurator_heading_parts' ) ) {
	/**
	 * The heading a group wears: the author's text (else the WooCommerce attribute name), an optional auto number and an
	 * optional hint. Returns an empty array when no heading setting is on, so the group keeps its default heading.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $key        The attribute key of the group (for example pa_size).
	 * @param string              $label      The attribute's own label.
	 * @param int                 $number     Position of the group, counting from 1.
	 * @return array{text:string,hint:string}|array{} Heading text (number included) and hint.
	 */
	function sgs_buybox_configurator_heading_parts( array $attributes, string $key, string $label, int $number ): array {
		$rows    = is_array( $attributes['pickGroupHeadings'] ?? null ) ? $attributes['pickGroupHeadings'] : array();
		$row     = is_array( $rows[ $key ] ?? null ) ? $rows[ $key ] : array();
		$text    = sanitize_text_field( (string) ( $row['text'] ?? '' ) );
		$hint    = sanitize_text_field( (string) ( $row['hint'] ?? '' ) );
		$numbers = ! empty( $attributes['pickGroupNumbers'] );
		if ( '' === $text && '' === $hint && ! $numbers ) {
			return array();
		}
		$text = '' !== $text ? $text : $label;
		return array(
			'text' => ( $numbers ? $number . ' · ' : '' ) . $text,
			'hint' => $hint,
		);
	}
}

if ( ! function_exists( 'sgs_buybox_configurator_axis_heading' ) ) {
	/**
	 * Apply the group heading settings to one variation axis: its label becomes the heading text (number included) and a
	 * `hint` key carries the hint line.
	 *
	 * @param array<string,mixed> $axis       The manifest axis (label, taxonomy, terms).
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param int                 $number     Position of the group, counting from 1.
	 * @return array<string,mixed> The axis, with `label` and `hint` set when a heading setting is on.
	 */
	function sgs_buybox_configurator_axis_heading( array $axis, array $attributes, int $number ): array {
		$parts = sgs_buybox_configurator_heading_parts( $attributes, (string) ( $axis['taxonomy'] ?? '' ), (string) ( $axis['label'] ?? '' ), $number );
		if ( array() === $parts ) {
			return $axis;
		}
		$axis['label'] = $parts['text'];
		$axis['hint']  = $parts['hint'];
		return $axis;
	}
}

if ( ! function_exists( 'sgs_buybox_configurator_price_lines' ) ) {
	/**
	 * The total price of each option of one axis, other axes at their defaults: the pack tile's price line.
	 *
	 * @param array<string,mixed> $manifest   The product manifest.
	 * @param string              $taxonomy   The axis taxonomy.
	 * @param array<int,mixed>    $terms      The axis terms (each with a slug).
	 * @param string              $tax_mode   Tax display mode.
	 * @param string              $suffix     Price suffix.
	 * @return array<string,string> Term slug => price text.
	 */
	function sgs_buybox_configurator_price_lines( array $manifest, string $taxonomy, array $terms, string $tax_mode, string $suffix ): array {
		$combos   = is_array( $manifest['combos'] ?? null ) ? $manifest['combos'] : array();
		$defaults = is_array( $manifest['defaultAxes'] ?? null ) ? $manifest['defaultAxes'] : array();
		$lines    = array();
		// Combos by the set of axis=term pairs they stand for, so the key's pair order does not matter.
		$by_pairs = array();
		foreach ( $combos as $combo_key => $combo ) {
			$pairs = array();
			foreach ( explode( '|', (string) $combo_key ) as $pair ) {
				$pairs[] = $pair;
			}
			sort( $pairs );
			$by_pairs[ implode( '|', $pairs ) ] = $combo;
		}
		foreach ( $terms as $term ) {
			$slug = (string) ( $term['slug'] ?? '' );
			if ( '' === $slug ) {
				continue;
			}
			$wanted              = $defaults;
			$wanted[ $taxonomy ] = $slug;
			$pairs               = array();
			foreach ( $wanted as $tax => $term_slug ) {
				if ( '' === (string) $term_slug ) {
					continue 2;
				}
				$pairs[] = $tax . ':' . $term_slug;
			}
			sort( $pairs );
			$combo = $by_pairs[ implode( '|', $pairs ) ] ?? null;
			if ( ! is_array( $combo ) ) {
				continue;
			}
			$lines[ $slug ] = sgs_configurator_mode_price( $combo, $tax_mode, (int) $manifest['decimals'], $suffix );
		}
		return $lines;
	}
}

if ( ! function_exists( 'sgs_buybox_configurator_picker_attrs' ) ) {
	/**
	 * The look settings the box forwards to one option picker, merged into the attributes render.php built. A setting
	 * that is unset forwards nothing, so an unset box renders every picker exactly as before.
	 *
	 * @param array<string,mixed>  $picker_attrs The option picker attributes render.php built.
	 * @param array<string,mixed>  $attributes   Block attributes.
	 * @param string               $style        The picker style this axis wears (outlined, filled, ghost, tile).
	 * @param array<string,mixed>  $axis         The manifest axis.
	 * @param array<string,mixed>  $manifest     The product manifest.
	 * @param array<string,string> $price       Tax display mode ('mode'), price suffix ('suffix') and the pack axis ('pack_axis', the only axis that shows the price line).
	 * @return array<string,mixed> The picker attributes.
	 */
	function sgs_buybox_configurator_picker_attrs( array $picker_attrs, array $attributes, string $style, array $axis, array $manifest, array $price ): array {
		$map = array(
			'pickerPillBackgroundColour'     => 'pillBgColour',
			'pickerPillBorderColour'         => 'pillBorderColour',
			'pickerPillFontWeight'           => 'pillFontWeight',
			'pickerPillSelectedShadow'       => 'pillSelectedShadow',
			'pickerPillSelectedShadowColour' => 'pillSelectedShadowColour',
			'pickerPillSelectedOffsetX'      => 'pillSelectedOffsetX',
			'pickerPillSelectedOffsetY'      => 'pillSelectedOffsetY',
			'pickerPillHoverOffsetX'         => 'pillHoverOffsetX',
			'pickerPillHoverOffsetY'         => 'pillHoverOffsetY',
			'pickerDotShape'                 => 'swatchShape',
			'pickerDotSize'                  => 'swatchSize',
			'pickerDotRingThickness'             => 'swatchRingWidth',
			'pickerDotRingColour'            => 'swatchRingColour',
			'pickerDotTickColour'            => 'swatchTickColour',
		);
		foreach ( $map as $from => $to ) {
			$value = trim( (string) ( $attributes[ $from ] ?? '' ) );
			// A tile's number, price and each-line carry their own weights, so the option text weight stays off tiles.
			if ( 'pillFontWeight' === $to && 'tile' === $style ) {
				continue;
			}
			if ( '' !== $value ) {
				$picker_attrs[ $to ] = $value;
			}
		}
		if ( ! empty( $attributes['pickerDotTickInside'] ) ) {
			$picker_attrs['swatchTickInside'] = true;
		}
		if ( ! empty( $attributes['pickerPillHoverStill'] ) ) {
			$picker_attrs['pillHoverStill'] = true;
		}
		// The legend's weight travels with the other label settings render.php forwards (only while the legend is visible).
		$label_weight = trim( (string) ( $attributes['pickerLabelFontWeight'] ?? '' ) );
		if ( '' !== $label_weight && ! empty( $picker_attrs['showLabel'] ) ) {
			$picker_attrs['labelFontWeight'] = $label_weight;
		}
		// The pack tile's price line: each option's total price, in the picker's second caption line.
		if ( 'tile' === $style && ! empty( $attributes['pickTilePriceLine'] ) && '' !== (string) ( $price['pack_axis'] ?? '' ) && (string) ( $price['pack_axis'] ?? '' ) === (string) ( $axis['taxonomy'] ?? '' ) && is_array( $picker_attrs['optionItems'] ?? null ) ) {
			$lines = sgs_buybox_configurator_price_lines( $manifest, (string) ( $axis['taxonomy'] ?? '' ), (array) ( $axis['terms'] ?? array() ), (string) ( $price['mode'] ?? 'auto' ), (string) ( $price['suffix'] ?? '' ) );
			foreach ( $picker_attrs['optionItems'] as $i => $item ) {
				if ( isset( $lines[ $item['key'] ] ) ) {
					$picker_attrs['optionItems'][ $i ]['subLabel'] = $lines[ $item['key'] ];
				}
			}
		}
		return $picker_attrs;
	}
}

if ( ! function_exists( 'sgs_buybox_configurator_dot_decls' ) ) {
	/**
	 * Declarations for a round or square colour dot with a ring.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $size_key   The attribute that holds the size.
	 * @return string[] Declarations.
	 */
	function sgs_buybox_configurator_dot_decls( array $attributes, string $size_key ): array {
		$decls = array();
		$shape = (string) ( $attributes['pickerDotShape'] ?? '' );
		if ( 'round' === $shape ) {
			$decls[] = 'border-radius:50%';
		} elseif ( 'square' === $shape ) {
			$decls[] = 'border-radius:0';
		}
		$size = sgs_css_length_value( (string) ( $attributes[ $size_key ] ?? '' ) );
		if ( '' !== $size ) {
			$decls[] = 'width:' . $size;
			$decls[] = 'height:' . $size;
		}
		$ring = sgs_css_length_value( (string) ( $attributes['pickerDotRingThickness'] ?? '' ) );
		if ( '' !== $ring ) {
			$decls[] = 'border-width:' . $ring;
		}
		$ring_colour = sgs_colour_value( (string) ( $attributes['pickerDotRingColour'] ?? '' ) );
		if ( '' !== $ring_colour ) {
			$decls[] = 'border-color:' . $ring_colour;
		}
		return $decls;
	}
}

if ( ! function_exists( 'sgs_buybox_configurator_extra_css' ) ) {
	/**
	 * Scoped rules for the pick area settings the option pickers do not carry: the box padding and gap, the flavour
	 * pills' look, the flavour dots, the heading and hint type and the pack-tile columns.
	 *
	 * @param array<string,mixed> $attributes  Block attributes.
	 * @param string              $root_sel    The block's scoped root selector.
	 * @param string[]            $tiered_keys Attribute keys declared as per-device objects (sgs_object_attr_keys()).
	 * @return string[] CSS rules.
	 */
	function sgs_buybox_configurator_extra_css( array $attributes, string $root_sel, array $tiered_keys = array() ): array {
		$css = array();
		$box = $root_sel . ' .sgs-buybox__pick-box';
		$css = array_merge( $css, sgs_buybox_configurator_tier_css( $attributes['pickerBoxPadding'] ?? null, $box ) );
		$css = array_merge( $css, sgs_buybox_configurator_tier_css( $attributes['pickerBoxGap'] ?? null, $box, 'gap', false ) );

		// Flavour pills: the resting fill, border and weight travel as custom properties so the hover and selected rules
		// in configurator.css keep working; the selected shadow and offset print on the checked pill.
		$vars = array();
		$fill = sgs_colour_value( (string) ( $attributes['pickerPillBackgroundColour'] ?? '' ) );
		if ( '' !== $fill ) {
			$vars[] = '--sgs-pick-bg:' . $fill;
		}
		$border = sgs_colour_value( (string) ( $attributes['pickerPillBorderColour'] ?? '' ) );
		if ( '' !== $border ) {
			$vars[] = '--sgs-pick-border:' . $border;
		}
		$weight = (string) ( $attributes['pickerPillFontWeight'] ?? '' );
		if ( preg_match( '/^[1-9]00$/', $weight ) ) {
			$vars[] = '--sgs-pick-weight:' . $weight;
		}
		$tick = sgs_colour_value( (string) ( $attributes['pickerDotTickColour'] ?? '' ) );
		if ( '' !== $tick && ! empty( $attributes['pickerDotTickInside'] ) ) {
			$vars[] = '--sgs-pick-dot-tick:' . $tick;
		}
		if ( $vars ) {
			$css[] = $root_sel . '{' . implode( ';', $vars ) . ';}';
		}
		// Hover first, so the selected rule (same specificity) keeps its own shift on a hovered selected option.
		$hover_x = sgs_css_length_value( (string) ( $attributes['pickerPillHoverOffsetX'] ?? '' ) );
		$hover_y = sgs_css_length_value( (string) ( $attributes['pickerPillHoverOffsetY'] ?? '' ) );
		if ( '' !== $hover_x || '' !== $hover_y ) {
			$css[] = $root_sel . ' .sgs-buybox-pick__option:hover{translate:' . ( '' !== $hover_x ? $hover_x : '0' ) . ' ' . ( '' !== $hover_y ? $hover_y : '0' ) . ';}';
		}
		if ( ! empty( $attributes['pickerPillHoverStill'] ) ) {
			$css[] = $root_sel . '{--sgs-pick-bg-hover:var(--sgs-pick-bg,var(--wp--preset--color--surface));--sgs-pick-border-hover:var(--sgs-pick-border,color-mix(in srgb,var(--wp--preset--color--text) 35%,transparent));--sgs-pick-sel-hover-bg:var(--sgs-pick-sel-bg,var(--wp--preset--color--accent));}';
		}
		$sel_decls = sgs_shadow_decls(
			$attributes,
			array(
				'base'   => 'pickerPillSelectedShadow',
				'colour' => 'pickerPillSelectedShadowColour',
			),
			'sgs/buybox'
		)['normal'];
		$offset_x  = sgs_css_length_value( (string) ( $attributes['pickerPillSelectedOffsetX'] ?? '' ) );
		$offset_y  = sgs_css_length_value( (string) ( $attributes['pickerPillSelectedOffsetY'] ?? '' ) );
		if ( '' !== $offset_x || '' !== $offset_y ) {
			$sel_decls[] = 'translate:' . ( '' !== $offset_x ? $offset_x : '0' ) . ' ' . ( '' !== $offset_y ? $offset_y : '0' );
		}
		if ( $sel_decls ) {
			$css[] = $root_sel . ' .sgs-buybox-pick__option:has(.sgs-buybox-pick__input:checked){' . implode( ';', $sel_decls ) . ';}';
		}

		// Flavour dots: shape, size and ring, then the tick drawn inside the dot.
		$dot = sgs_buybox_configurator_dot_decls( $attributes, 'pickerGroupDotSize' );
		if ( $dot ) {
			$css[] = $root_sel . ' .sgs-buybox-pick__swatch{' . implode( ';', $dot ) . ';}';
		}

		// Group heading and hint type: the label typography set also covers the pick-several group title.
		$title = sgs_typography_css_rule( $attributes, 'pickerLabel', $root_sel . ' .sgs-buybox-pick__group-title', '', false, false, $tiered_keys );
		if ( '' !== $title ) {
			$css[] = $title;
		}
		$label_colour = sgs_colour_value( (string) ( $attributes['pickerLabelColour'] ?? '' ) );
		if ( '' !== $label_colour ) {
			$css[] = $root_sel . ' .sgs-buybox-pick__group-title{color:' . $label_colour . ';}';
		}
		$hint_colour = sgs_colour_value( (string) ( $attributes['pickerHintColour'] ?? '' ) );
		if ( '' !== $hint_colour ) {
			$css[] = $root_sel . ' .sgs-buybox-pick__hint,' . $root_sel . ' .sgs-buybox__picker-hint{color:' . $hint_colour . ';}';
		}

		// Pack tiles: the price line's weight and the number of columns per device.
		$price_weight = (string) ( $attributes['pickTilePriceWeight'] ?? '' );
		if ( preg_match( '/^[1-9]00$/', $price_weight ) ) {
			$css[] = $box . ' .sgs-option-picker--tile .sgs-option-picker__sub-label{font-weight:' . $price_weight . ';}';
		}
		$number_weight = (string) ( $attributes['pickTileNumberWeight'] ?? '' );
		if ( preg_match( '/^[1-9]00$/', $number_weight ) ) {
			$css[] = $box . ' .sgs-option-picker--tile .sgs-option-picker__pill-label{font-weight:' . $number_weight . ';}';
		}
		$columns = is_array( $attributes['pickTileColumns'] ?? null ) ? $attributes['pickTileColumns'] : array();
		$tiers   = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$count = isset( $columns[ $tier ] ) ? (int) $columns[ $tier ] : 0;
			if ( $count >= 1 && $count <= 12 ) {
				$tiers[ $tier ] = array( 'grid-template-columns:repeat(' . $count . ',minmax(0,1fr))' );
			}
		}
		if ( $tiers ) {
			$css[] = sgs_emit_tier_decls( $box . ' .sgs-option-picker--tile .sgs-option-picker__options', $tiers );
		}
		return $css;
	}
}
