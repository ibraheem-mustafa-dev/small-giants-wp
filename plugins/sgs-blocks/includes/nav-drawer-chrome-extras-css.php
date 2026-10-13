<?php
/**
 * Scoped CSS for three opt-in nav drawer top-row settings (Spec 36 FR-36-6):
 *
 * - `chromeSticky`: the top row stays put while the body scrolls. The dialog
 *   stops scrolling and the body becomes the scrolling area (it takes the
 *   space the row leaves and scrolls its own content), so the drawer's own
 *   fill stays fixed behind the row and a container pinned to the bottom of
 *   the body (`sgs/container` `pinEdge`) sticks to the drawer's bottom edge.
 *   The body's children keep their content height (`flex-shrink:0`).
 * - The logo box (`chromeLogoBox*`): a fill, corner radius, padding and
 *   shadow around the top-row logo.
 * - The close button fill (`closeBg*`): resting and hover background through
 *   the shared fill helper.
 *
 * Every rule is keyed to the drawer's own `.{uid}` selector and every unset
 * attribute emits nothing (Spec 32: never an inline declaration).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-colour-variants.php';
require_once __DIR__ . '/helpers-box.php';
require_once __DIR__ . '/helpers-css-safety.php';

if ( ! function_exists( 'sgs_nav_drawer_chrome_extras_css' ) ) {
	/**
	 * Build the sticky-row, logo-box and close-fill CSS.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   The drawer's scoped root selector.
	 * @param bool   $has_logo   Whether a logo rendered.
	 * @return string CSS text (no `<style>` wrapper).
	 */
	function sgs_nav_drawer_chrome_extras_css( array $attributes, string $root_sel, bool $has_logo ): string {
		$css = '';

		if ( ! empty( $attributes['chromeSticky'] ) ) {
			$body = $root_sel . ' > .sgs-nav-drawer__body';
			$css .= $root_sel . '[open]{overflow:hidden;}'
				. $body . '{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;}'
				. $body . ' > *{flex-shrink:0;}';
		}

		if ( $has_logo ) {
			$logo  = $root_sel . ' .sgs-nav-drawer__chrome-logo';
			$decls = array();
			$fill  = sgs_fill_decls(
				$attributes,
				array(
					'base'     => 'chromeLogoBoxBg',
					'gradient' => 'chromeLogoBoxBgGradient',
				)
			);
			$decls = array_merge( $decls, $fill['normal'] );
			$radius = sgs_css_length_value( (string) ( $attributes['chromeLogoBoxRadius'] ?? '' ) );
			if ( '' !== $radius ) {
				$decls[] = 'border-radius:' . $radius;
			}
			$padding = is_array( $attributes['chromeLogoBoxPadding'] ?? null ) ? sgs_box_object_longhands( $attributes['chromeLogoBoxPadding'], 'padding' ) : null;
			if ( null !== $padding && '' !== $padding ) {
				$decls[] = rtrim( $padding, ';' );
			}
			$shadow = sgs_shadow_decls( $attributes, array( 'base' => 'chromeLogoBoxShadow', 'colour' => 'chromeLogoBoxShadowColour' ), 'sgs/nav-drawer' );
			$decls  = array_merge( $decls, $shadow['normal'] );
			if ( $decls ) {
				$css .= $logo . '{' . implode( ';', $decls ) . ';}';
			}
		}

		$css .= sgs_fill_states_css(
			$root_sel . ' .sgs-nav-drawer__close',
			$attributes,
			array(
				'base'           => 'closeBg',
				'gradient'       => 'closeBgGradient',
				'hover'          => 'closeBgHover',
				'hover_gradient' => 'closeBgHoverGradient',
			)
		);

		return $css;
	}
}
