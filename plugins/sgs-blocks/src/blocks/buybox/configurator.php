<?php
/**
 * sgs/buybox "Pick a set" mode: the pick-several groups, the live preview, the summary and the no-JS fallback.
 *
 * The groups are real checkbox inputs inside a container the view module (configurator-view.js) enhances, so the same
 * markup works without JavaScript: the inputs are tied to the add-to-cart form with the `form` attribute, and the
 * standard add-to-cart POST carries `sgs_picks[attrKey][]` through Configurator_Picks::add_cart_item_data(). Groups come
 * from Configurator_Groups::for_product(), the same resolver the server validation uses.
 *
 * Variation pickers (the pack size, base, chips) stay the standard sgs/option-picker blocks that render.php prints; this
 * file only adds what is new. Colours reach the page as scoped CSS rules on data attributes, never inline styles.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_buybox_configurator_styles' ) ) {
	/**
	 * The picker looks a group may wear, mapped onto the option picker's own `pickerStyle` enum.
	 *
	 * @return string[]
	 */
	function sgs_buybox_configurator_styles(): array {
		return array( 'filled', 'outlined', 'ghost', 'tile' );
	}
}

if ( ! function_exists( 'sgs_buybox_configurator_state' ) ) {
	/**
	 * Resolve everything the Pick a set markup needs for a product.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param int                 $product_id Product ID.
	 * @return array{groups:array,pack:array,all:array} Active pick groups (key => group), the pack read and every group.
	 */
	function sgs_buybox_configurator_state( array $attributes, int $product_id ): array {
		unset( $attributes );
		$all    = \SGS\Blocks\Configurator_Groups::for_product( $product_id );
		$active = \SGS\Blocks\sgs_picks_active_groups( $all );
		$pack   = \SGS\Blocks\Configurator_Groups::pack( $product_id, $all );
		foreach ( $active as $key => $group ) {
			$mode = \SGS\Blocks\sgs_picks_share_mode( $group['flags']['share'] ?? 'none' );
			// No readable pack number: a share mode cannot run, so the group is a plain list.
			if ( 'none' !== $mode && ( '' === $pack['key'] || array() === $pack['units'] || array() !== $pack['unparseable'] ) ) {
				$mode = 'none';
			}
			$active[ $key ]['flags']['share'] = $mode;
			if ( 'none' !== $mode ) {
				$active[ $key ]['flags']['most'] = min( (int) $group['flags']['most'], max( $pack['units'] ) );
			}
		}
		return array(
			'groups' => $active,
			'pack'   => $pack,
			'all'    => $all,
		);
	}
}

if ( ! function_exists( 'sgs_buybox_configurator_css' ) ) {
	/**
	 * Scoped CSS: each option's colour dot or image (attribute selectors, so no inline style), the preview base and the picker box.
	 *
	 * @param array<string,mixed> $state      From sgs_buybox_configurator_state().
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $root_sel   The block's scoped root selector.
	 * @return string[] CSS rules.
	 */
	function sgs_buybox_configurator_css( array $state, array $attributes, string $root_sel ): array {
		$css = array();
		foreach ( $state['all'] as $group ) {
			foreach ( $group['terms'] as $term ) {
				$sel = $root_sel . ' [data-sgs-swatch="' . esc_attr( $group['key'] . ':' . $term['slug'] ) . '"]';
				if ( '' !== $term['colour'] ) {
					$css[] = $sel . '{background-color:' . $term['colour'] . ';}';
				}
				if ( $term['image'] > 0 ) {
					$url = wp_get_attachment_image_url( (int) $term['image'], 'thumbnail' );
					if ( $url ) {
						$css[] = $sel . '{background-image:url("' . esc_url_raw( $url ) . '");background-size:cover;}';
					}
				}
			}
		}
		$box = array();
		$box_fill   = sgs_colour_value( (string) ( $attributes['pickerBoxBackgroundColour'] ?? '' ) );
		$box_border = sgs_colour_value( (string) ( $attributes['pickerBoxBorderColour'] ?? '' ) );
		if ( '' !== $box_fill ) {
			$box[] = 'background-color:' . $box_fill;
		}
		if ( '' !== $box_border ) {
			$box[] = 'border-color:' . $box_border;
		}
		$width  = sgs_css_length_value( (string) ( $attributes['pickerBoxBorderWidth'] ?? '' ) );
		$radius = sgs_css_length_value( (string) ( $attributes['pickerBoxRadius'] ?? '' ) );
		if ( '' !== $width ) {
			$box[] = 'border-width:' . $width;
			$box[] = 'border-style:solid';
		}
		if ( '' !== $radius ) {
			$box[] = 'border-radius:' . $radius;
		}
		$css = array_merge( $css, sgs_buybox_configurator_look_css( $attributes, $root_sel ) );
		if ( $box ) {
			$css[] = $root_sel . ' .sgs-buybox__pick-box{' . implode( ';', $box ) . ';padding:var(--wp--preset--spacing--30,1rem);}';
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_buybox_configurator_tier_css' ) ) {
	/**
	 * A per-device box setting (`{desktop, tablet, mobile}` of top/right/bottom/left) as scoped padding rules.
	 *
	 * @param mixed  $value    The attribute value.
	 * @param string $selector Scoped selector.
	 * @return string[] CSS rules (desktop, then the tablet and mobile media rules).
	 */
	function sgs_buybox_configurator_tier_css( $value, string $selector ): array {
		$tiers = sgs_responsive_normalise_object( $value, true );
		$wrap  = array(
			'desktop' => '%s',
			'tablet'  => '@media(max-width:1023px){%s}',
			'mobile'  => '@media(max-width:767px){%s}',
		);
		$out   = array();
		foreach ( $wrap as $tier => $media ) {
			$decls = array();
			foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
				$length = isset( $tiers[ $tier ][ $side ] ) && is_string( $tiers[ $tier ][ $side ] ) ? sgs_css_length_value( $tiers[ $tier ][ $side ] ) : '';
				if ( '' !== $length ) {
					$decls[] = 'padding-' . $side . ':' . $length;
				}
			}
			if ( $decls ) {
				$out[] = sprintf( $media, $selector . '{' . implode( ';', $decls ) . ';}' );
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_buybox_configurator_look_css' ) ) {
	/**
	 * The Pick a set look settings as scoped rules: the preview box, the selected colours (every group), the pick-several
	 * pills and the priced tiles. Each attribute is read by name so the wiring check sees it reach a declaration.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $root_sel   The block's scoped root selector.
	 * @return string[] CSS rules.
	 */
	function sgs_buybox_configurator_look_css( array $attributes, string $root_sel ): array {
		$css     = array();
		$preview = array();
		$fill    = sgs_colour_value( (string) ( $attributes['previewBackgroundColour'] ?? '' ) );
		$border  = sgs_colour_value( (string) ( $attributes['previewBorderColour'] ?? '' ) );
		$width   = sgs_css_length_value( (string) ( $attributes['previewBorderWidth'] ?? '' ) );
		$radius  = sgs_css_length_value( (string) ( $attributes['previewRadius'] ?? '' ) );
		if ( '' !== $fill ) {
			$preview[] = 'background:' . $fill;
		}
		if ( '' !== $border ) {
			$preview[] = 'border-color:' . $border;
		}
		if ( '' !== $width ) {
			$preview[] = 'border-width:' . $width;
		}
		if ( '' !== $radius ) {
			$preview[] = 'border-radius:' . $radius;
		}
		if ( $preview ) {
			$css[] = $root_sel . ' .sgs-buybox__pick-preview{' . implode( ';', $preview ) . ';}';
		}
		$css = array_merge( $css, sgs_buybox_configurator_tier_css( $attributes['previewPadding'] ?? null, $root_sel . ' .sgs-buybox__pick-preview' ) );

		// Selected options: one pair of custom properties read by the pick-several pills and by every option picker.
		$sel_fill   = sgs_colour_value( (string) ( $attributes['pickSelectedBackgroundColour'] ?? '' ) );
		$sel_border = sgs_colour_value( (string) ( $attributes['pickSelectedBorderColour'] ?? '' ) );
		$vars       = array();
		if ( '' !== $sel_fill ) {
			$vars[] = '--sgs-pick-sel-bg:' . $sel_fill;
			$vars[] = '--sgs-op-sel-bg:' . $sel_fill;
		}
		if ( '' !== $sel_border ) {
			$vars[] = '--sgs-pick-sel-border:' . $sel_border;
			$vars[] = '--sgs-op-sel-border:' . $sel_border;
		}
		if ( $vars ) {
			$css[] = $root_sel . '{' . implode( ';', $vars ) . ';}';
		}

		$option = array();
		$o_rad  = sgs_css_length_value( (string) ( $attributes['pickOptionRadius'] ?? '' ) );
		if ( '' !== $o_rad ) {
			$option[] = 'border-radius:' . $o_rad;
		}
		if ( $option ) {
			$css[] = $root_sel . ' .sgs-buybox__pick-option{' . implode( ';', $option ) . ';}';
		}
		$css    = array_merge( $css, sgs_buybox_configurator_tier_css( $attributes['pickOptionPadding'] ?? null, $root_sel . ' .sgs-buybox__pick-option' ) );
		$o_gap  = sgs_css_length_value( (string) ( $attributes['pickOptionGap'] ?? '' ) );
		if ( '' !== $o_gap ) {
			$css[] = $root_sel . ' .sgs-buybox-pick__options{gap:' . $o_gap . ';}';
		}

		$css   = array_merge( $css, sgs_buybox_configurator_tier_css( $attributes['pickTilePadding'] ?? null, $root_sel . ' .sgs-buybox__pick-box .sgs-option-picker__pill' ) );
		$t_gap = sgs_css_length_value( (string) ( $attributes['pickTileGap'] ?? '' ) );
		if ( '' !== $t_gap ) {
			$css[] = $root_sel . ' .sgs-buybox__pick-box .sgs-option-picker__options{gap:' . $t_gap . ';}';
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_buybox_configurator_group_html' ) ) {
	/**
	 * One pick-several group: a heading with its limit, then one real checkbox per option.
	 *
	 * @param array<string,mixed> $group      Group from the resolver.
	 * @param string              $style      filled|outlined|ghost|tile.
	 * @param string              $form_id    The add-to-cart form's id (inputs are tied to it with `form`).
	 * @param string              $uid        Block uid (makes the heading id unique per box).
	 * @param int                 $pack_max   Largest pack, for the counts steppers (0 when none).
	 * @return string Escaped markup.
	 */
	function sgs_buybox_configurator_group_html( array $group, string $style, string $form_id, string $uid, int $pack_max ): string {
		$flags   = $group['flags'];
		$key     = (string) $group['key'];
		$label   = (string) $group['label'];
		$least   = (int) $flags['least'];
		$most    = (int) $flags['most'];
		$mode    = (string) $flags['share'];
		$title   = $least === $most
			/* translators: 1: option group name, 2: number to choose. */
			? sprintf( __( '%1$s, choose %2$d', 'sgs-blocks' ), $label, $most )
			/* translators: 1: option group name, 2: most that can be chosen. */
			: sprintf( __( '%1$s, choose up to %2$d', 'sgs-blocks' ), $label, $most );
		$head_id = $uid . '-' . sanitize_html_class( $key ) . '-title';
		$err_id  = $uid . '-' . sanitize_html_class( $key ) . '-err';

		$out  = '<div class="sgs-buybox-pick__group" role="group" aria-labelledby="' . esc_attr( $head_id ) . '"';
		$out .= ' data-sgs-pick-group="' . esc_attr( $key ) . '"';
		$out .= ' data-least="' . esc_attr( (string) $least ) . '" data-most="' . esc_attr( (string) $most ) . '"';
		$out .= ' data-overflow="' . esc_attr( (string) $flags['overflow'] ) . '" data-share="' . esc_attr( $mode ) . '"';
		$out .= ' data-label="' . esc_attr( $label ) . '"';
		/* translators: %1$d: most picks, %2$s: option group name. */
		$out .= ' data-limit-message="' . esc_attr( sprintf( __( 'You can choose up to %1$d for %2$s. Remove one to add another.', 'sgs-blocks' ), $most, $label ) ) . '"';
		/* translators: %1$d: fewest picks, %2$s: option group name. */
		$out .= ' data-least-message="' . esc_attr( sprintf( __( 'Please choose at least %1$d for %2$s.', 'sgs-blocks' ), $least, $label ) ) . '"';
		$out .= ' data-err-id="' . esc_attr( $err_id ) . '">';
		$out .= '<p class="sgs-buybox-pick__group-title" id="' . esc_attr( $head_id ) . '">' . esc_html( $title ) . '</p>';
		$out .= '<div class="sgs-buybox-pick__options sgs-buybox-pick__options--' . esc_attr( $style ) . '">';
		foreach ( $group['terms'] as $term ) {
			$slug    = (string) $term['slug'];
			$checked = $slug === (string) $flags['startWith'];
			$has_dot = '' !== $term['colour'] || $term['image'] > 0;
			$out    .= '<label class="sgs-buybox-pick__option sgs-buybox__pick-option">';
			$out    .= '<input class="sgs-buybox-pick__input" type="checkbox" form="' . esc_attr( $form_id ) . '" name="sgs_picks[' . esc_attr( $key ) . '][]" value="' . esc_attr( $slug ) . '" data-label="' . esc_attr( (string) $term['label'] ) . '" data-colour="' . esc_attr( (string) $term['colour'] ) . '"' . ( $term['image'] > 0 ? ' data-has-image="1"' : '' ) . ( $checked ? ' checked' : '' ) . ' />';
			$out    .= '<span class="sgs-buybox-pick__option-body">';
			if ( $has_dot || 'tile' === $style ) {
				$out .= '<span class="sgs-buybox-pick__swatch' . ( '' !== $term['colour'] && '#ffffff' === strtolower( $term['colour'] ) ? ' sgs-buybox-pick__swatch--light' : '' ) . '" data-sgs-swatch="' . esc_attr( $key . ':' . $slug ) . '" aria-hidden="true"></span>';
			}
			$out .= '<span class="sgs-buybox-pick__option-name">' . esc_html( (string) $term['label'] ) . '</span>';
			if ( '' !== $term['description'] && 'tile' === $style ) {
				$out .= '<span class="sgs-buybox-pick__option-desc">' . esc_html( $term['description'] ) . '</span>';
			}
			if ( '' !== $term['badge'] ) {
				$out .= '<span class="sgs-buybox-pick__option-badge">' . esc_html( $term['badge'] ) . '</span>';
			}
			$out .= '</span>';
			if ( 'counts' === $mode ) {
				$out .= '<span class="sgs-buybox-pick__stepper" data-sgs-stepper hidden>';
				/* translators: %s: option name. */
				$out .= '<button type="button" class="sgs-buybox-pick__step" data-step="-1" aria-label="' . esc_attr( sprintf( __( 'Fewer %s', 'sgs-blocks' ), $term['label'] ) ) . '">&minus;</button>';
				$out .= '<output class="sgs-buybox-pick__count" aria-live="off">0</output>';
				/* translators: %s: option name. */
				$out .= '<button type="button" class="sgs-buybox-pick__step" data-step="1" aria-label="' . esc_attr( sprintf( __( 'More %s', 'sgs-blocks' ), $term['label'] ) ) . '">+</button>';
				$out .= '<input type="hidden" form="' . esc_attr( $form_id ) . '" name="sgs_pick_counts[' . esc_attr( $key ) . '][' . esc_attr( $slug ) . ']" value="0" data-sgs-count disabled />';
				$out .= '</span>';
			}
			$out .= '</label>';
		}
		$out .= '</div>';
		$out .= '<p class="sgs-buybox-pick__group-error" id="' . esc_attr( $err_id ) . '" role="alert" hidden></p>';
		$out .= '</div>';
		return $out;
	}
}

if ( ! function_exists( 'sgs_buybox_configurator_open' ) ) {
	/**
	 * Opening markup of the Pick a set shell: the root with its data and the first column that holds every picker.
	 *
	 * @param array<string,mixed> $state      From sgs_buybox_configurator_state().
	 * @param array<string,mixed> $attributes Block attributes.
	 * @return string Escaped markup.
	 */
	function sgs_buybox_configurator_open( array $state, array $attributes ): string {
		$template = trim( (string) ( $attributes['summaryText'] ?? '' ) );
		$template = '' !== $template ? $template : 'Your {pack}: {split}';
		$pack     = $state['pack'];
		$layer    = sanitize_key( (string) ( $attributes['previewLayerAxis'] ?? '' ) );
		$layer_c  = array();
		$pack_l   = array();
		foreach ( $state['all'] as $group ) {
			foreach ( $group['terms'] as $term ) {
				if ( '' !== $layer && $group['key'] === $layer && '' !== $term['colour'] ) {
					$layer_c[ $term['slug'] ] = $term['colour'];
				}
				if ( '' !== $pack['key'] && $group['key'] === $pack['key'] ) {
					$pack_l[ $term['slug'] ] = $term['label'];
				}
			}
		}
		$out  = '<div class="sgs-buybox-pick" data-sgs-pick';
		$out .= ' data-summary="' . esc_attr( $template ) . '"';
		$out .= ' data-pack-axis="' . esc_attr( $pack['key'] ) . '"';
		$out .= ' data-pack-units="' . esc_attr( (string) wp_json_encode( (object) $pack['units'] ) ) . '"';
		$out .= ' data-pack-labels="' . esc_attr( (string) wp_json_encode( (object) $pack_l ) ) . '"';
		$out .= ' data-layer-axis="' . esc_attr( $layer ) . '"';
		$out .= ' data-layer-colours="' . esc_attr( (string) wp_json_encode( (object) $layer_c ) ) . '">';
		$out .= '<div class="sgs-buybox-pick__groups sgs-buybox__pick-box">';
		return $out;
	}
}

if ( ! function_exists( 'sgs_buybox_configurator_close' ) ) {
	/**
	 * Everything after the pickers: the pick groups, then the side column (preview, caption) and the shared messages.
	 *
	 * @param array<string,mixed> $state      From sgs_buybox_configurator_state().
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $form_id    The add-to-cart form's id.
	 * @param string              $uid        Block uid.
	 * @return string Escaped markup.
	 */
	function sgs_buybox_configurator_close( array $state, array $attributes, string $form_id, string $uid ): string {
		$styles    = sgs_buybox_configurator_styles();
		$by_key    = is_array( $attributes['groupStyles'] ?? null ) ? $attributes['groupStyles'] : array();
		$fallback  = sanitize_key( (string) ( $attributes['pickerStyle'] ?? '' ) );
		$pack_max  = array() !== $state['pack']['units'] ? max( $state['pack']['units'] ) : 0;
		$out       = '';
		foreach ( $state['groups'] as $key => $group ) {
			$style = sanitize_key( (string) ( $by_key[ $key ] ?? '' ) );
			$style = in_array( $style, $styles, true ) ? $style : ( in_array( $fallback, $styles, true ) ? $fallback : 'outlined' );
			$out  .= sgs_buybox_configurator_group_html( $group, $style, $form_id, $uid, $pack_max );
		}
		$out .= '</div>'; // End .sgs-buybox-pick__groups.

		$image_id = absint( $attributes['previewImageId'] ?? 0 );
		$image    = $image_id > 0 ? wp_get_attachment_image( $image_id, 'large', false, array( 'class' => 'sgs-buybox-pick__preview-image', 'alt' => '', 'loading' => 'lazy' ) ) : '';
		$out     .= '<div class="sgs-buybox-pick__side">';
		$out     .= '<figure class="sgs-buybox-pick__preview">';
		$out     .= '<div class="sgs-buybox-pick__preview-box sgs-buybox__pick-preview' . ( '' === $image ? ' sgs-buybox-pick__preview-box--plain' : '' ) . '" role="img" aria-label="" data-sgs-preview>' . $image . '<span class="sgs-buybox-pick__dots" data-sgs-dots aria-hidden="true"></span></div>';
		$out     .= '<figcaption class="sgs-buybox-pick__caption sgs-buybox__pick-summary" data-sgs-caption></figcaption>';
		$out     .= '</figure>';
		$out     .= '<p class="sgs-buybox-pick__per-unit" data-sgs-per-unit hidden></p>';
		$out     .= '</div>';
		$out     .= '<p class="sgs-buybox-pick__live sgs-sr-only" role="status" aria-live="polite" data-sgs-live></p>';
		$out     .= '<p class="sgs-buybox-pick__undo-row" data-sgs-undo-row hidden><button type="button" class="sgs-buybox-pick__undo" data-sgs-undo>' . esc_html__( 'Undo', 'sgs-blocks' ) . '</button></p>';
		$out     .= '</div>'; // End .sgs-buybox-pick.
		return $out;
	}
}

if ( ! function_exists( 'sgs_buybox_configurator_hidden_inputs' ) ) {
	/**
	 * Hidden inputs that turn the add-to-cart form into WooCommerce's standard add-to-cart POST, for a shopper without
	 * JavaScript: the product, the default variation and its attribute values. With JavaScript the store handles the add.
	 *
	 * @param int                 $product_id   Parent product ID.
	 * @param int                 $variation_id Default variation ID.
	 * @param array<string,mixed> $axes         Default axes: attribute => term slug.
	 * @return string Escaped markup.
	 */
	function sgs_buybox_configurator_hidden_inputs( int $product_id, int $variation_id, array $axes ): string {
		$out = '<input type="hidden" name="add-to-cart" value="' . esc_attr( (string) $product_id ) . '" />'
			. '<input type="hidden" name="product_id" value="' . esc_attr( (string) $product_id ) . '" />'
			. '<input type="hidden" name="variation_id" value="' . esc_attr( (string) $variation_id ) . '" />';
		foreach ( $axes as $taxonomy => $slug ) {
			$out .= '<input type="hidden" name="attribute_' . esc_attr( (string) $taxonomy ) . '" value="' . esc_attr( (string) $slug ) . '" />';
		}
		return $out;
	}
}
