<?php
/**
 * Scoped CSS for the nav drawer chrome row (Spec 36 FR-36-6): the row's
 * height, padding, gap and fill; the logo's size and per-device visibility;
 * the free slot's type, colour and (for a button) the shared built-in button
 * look; and the × box's border and glyph size. Every rule is keyed to the
 * drawer's own `.{uid}` selector and returned as a string for the drawer's
 * scoped `<style>` (Spec 32: never an inline declaration). The static layout
 * (flex row, the × at the end, the 44px hit area) lives in
 * `nav-drawer/style.css`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-typography.php';
require_once __DIR__ . '/helpers-colour-variants.php';
require_once __DIR__ . '/helpers-button-style.php';
require_once __DIR__ . '/helpers-box.php';
require_once __DIR__ . '/class-sgs-breakpoints.php';

if ( ! function_exists( 'sgs_nav_drawer_chrome_display' ) ) {
	/**
	 * One tier's visibility flag as a `display` value (the emitter's
	 * transform): false hides, true shows, anything else is "not set".
	 *
	 * @param mixed $raw Raw tier value.
	 * @return string|null
	 */
	function sgs_nav_drawer_chrome_display( $raw ) {
		if ( false === $raw || 'false' === $raw || 0 === $raw ) {
			return 'none';
		}
		if ( true === $raw || 'true' === $raw || 1 === $raw ) {
			return 'flex';
		}
		return null;
	}
}

if ( ! function_exists( 'sgs_nav_drawer_chrome_auto_height' ) ) {
	/**
	 * The logo image's height wherever a width is set (the emitter's
	 * transform): `auto`, so the image keeps its own ratio.
	 *
	 * @param mixed $raw Raw tier width.
	 * @return string|null
	 */
	function sgs_nav_drawer_chrome_auto_height( $raw ) {
		return ( null === $raw || '' === $raw || 'inherit' === $raw ) ? null : 'auto';
	}
}

if ( ! function_exists( 'sgs_nav_drawer_chrome_show_tiers' ) ) {
	/**
	 * The resolved show flag per tier: the operator's per-device switch AND,
	 * for the logo, whether that tier has an image at all. Returns an empty
	 * array when every tier shows (nothing to emit).
	 *
	 * @param mixed      $raw  The `…Show` tier object.
	 * @param array|null $urls Logo URLs per tier, or null for the slot.
	 * @return array<string,bool>
	 */
	function sgs_nav_drawer_chrome_show_tiers( $raw, ?array $urls ): array {
		$raw  = is_array( $raw ) ? $raw : array();
		$out  = array();
		$hide = false;
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$show         = false !== sgs_resolve_tier( $raw, $tier, true )['value'];
			$show         = $show && ( null === $urls || '' !== $urls[ $tier ] );
			$out[ $tier ] = $show;
			$hide         = $hide || ! $show;
		}
		return $hide ? $out : array();
	}
}

if ( ! function_exists( 'sgs_nav_drawer_chrome_css' ) ) {
	/**
	 * Build the chrome row's scoped CSS.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   The drawer's scoped root selector.
	 * @param array  $urls       Logo URLs per tier (sgs_nav_drawer_chrome_logo_urls()).
	 * @param bool   $has_logo   Whether a logo rendered.
	 * @param bool   $has_slot   Whether the free slot rendered.
	 * @return string CSS text (no `<style>` wrapper).
	 */
	function sgs_nav_drawer_chrome_css( array $attributes, string $root_sel, array $urls, bool $has_logo, bool $has_slot ): string {
		$row_sel   = $root_sel . ' .sgs-nav-drawer__chrome';
		$close_sel = $root_sel . ' .sgs-nav-drawer__close';

		// The row: height (the band the old 64px body padding reserved), gap, padding.
		$css  = sgs_emit_responsive_css(
			$row_sel,
			array(
				array(
					'value'        => $attributes['chromeRowHeight'] ?? array(),
					'css'          => 'min-height',
					'unit_default' => 'px',
				),
				array(
					'value'        => $attributes['chromeRowGap'] ?? array(),
					'css'          => 'gap',
					'unit_default' => 'px',
				),
				array(
					'value'        => $attributes['chromeRowPadding'] ?? array(),
					'css'          => 'padding',
					'box'          => true,
					'unit_default' => 'px',
				),
			)
		);
		$css .= sgs_fill_states_css(
			$row_sel,
			$attributes,
			array(
				'base'     => 'chromeRowBg',
				'gradient' => 'chromeRowBgGradient',
			)
		);

		// The × box border (closeBorderWidth box / closeBorderStyle / closeBorderColour,
		// the SgsBorderControl family: width is one box for every device). A style
		// is only ever emitted with a real width, the G5 rule every SGS border
		// emitter follows.
		$border_width = is_array( $attributes['closeBorderWidth'] ?? null ) ? sgs_box_object_shorthand( $attributes['closeBorderWidth'] ) : null;
		if ( null !== $border_width && '' !== $border_width ) {
			$style  = (string) ( $attributes['closeBorderStyle'] ?? 'solid' );
			$style  = in_array( $style, array( 'solid', 'dashed', 'dotted', 'double', 'none' ), true ) ? $style : 'solid';
			$colour = sgs_colour_value( (string) ( $attributes['closeBorderColour'] ?? '' ) );
			$css   .= $close_sel . '{border-style:' . $style . ';border-width:' . esc_attr( $border_width ) . ';'
				. ( '' !== $colour ? 'border-color:' . $colour . ';' : '' ) . '}';
		}

		// The × glyph size (closeIconSize), per device.
		$css .= sgs_emit_responsive_css(
			$root_sel . ' .sgs-nav-drawer__close svg',
			array(
				array(
					'value'        => $attributes['closeIconSize'] ?? array(),
					'css'          => 'width',
					'unit_default' => 'px',
				),
				array(
					'value'        => $attributes['closeIconSize'] ?? array(),
					'css'          => 'height',
					'unit_default' => 'px',
				),
			)
		);

		if ( $has_logo ) {
			$logo_sel = $row_sel . ' .sgs-nav-drawer__chrome-logo';
			$css     .= sgs_emit_responsive_css(
				$logo_sel . ' img',
				array(
					array(
						'value'        => $attributes['chromeLogoWidth'] ?? array(),
						'css'          => 'width',
						'unit_default' => 'px',
					),
					array(
						'value'     => $attributes['chromeLogoWidth'] ?? array(),
						'css'       => 'height',
						'transform' => 'sgs_nav_drawer_chrome_auto_height',
					),
				)
			);
			$show     = sgs_nav_drawer_chrome_show_tiers( $attributes['chromeLogoShow'] ?? array(), $urls );
			if ( $show ) {
				$css .= sgs_emit_responsive_css(
					$logo_sel,
					array(
						array(
							'value'     => $show,
							'css'       => 'display',
							'transform' => 'sgs_nav_drawer_chrome_display',
						),
					)
				);
			}
		}

		if ( $has_slot ) {
			$slot_sel = $row_sel . ' .sgs-nav-drawer__chrome-slot';
			$css     .= sgs_typography_css_rule( $attributes, 'chromeSlot', $slot_sel );
			if ( 'button' === ( $attributes['chromeSlotType'] ?? '' ) ) {
				$css .= sgs_button_element_style_css( $attributes, 'chromeButton', $slot_sel );
			} else {
				$text = sgs_resolve_text_colour_or_gradient(
					(string) ( $attributes['chromeSlotColour'] ?? '' ),
					(string) ( $attributes['chromeSlotColourGradient'] ?? '' )
				);
				if ( '' !== $text ) {
					$css .= $slot_sel . '{' . sgs_text_colour_decl( $text ) . '}';
					$css .= sgs_text_colour_gradient_fallback_rule( $slot_sel, $text );
				}
			}
			$show = sgs_nav_drawer_chrome_show_tiers( $attributes['chromeSlotShow'] ?? array(), null );
			if ( $show ) {
				$css .= sgs_emit_responsive_css(
					$slot_sel,
					array(
						array(
							'value'     => $show,
							'css'       => 'display',
							'transform' => 'sgs_nav_drawer_chrome_display',
						),
					)
				);
			}
		}

		return $css;
	}
}
