<?php
/**
 * Late start for the payment plugin's wallet-button scripts on a product page (Spec 27 FR-27-EXPRESS-DEFER).
 *
 * "Payment Plugins for Stripe WooCommerce" enqueues about fifteen front-end scripts on a product page, which load
 * Stripe.js, Stripe's fraud check and Google Pay: about 3.5 MB and two seconds of phone CPU before the shopper can use a
 * wallet button. The buy box's `expressLoad` setting set to `interaction` prints those scripts, and the inline data that
 * belongs to them, as inert `type="text/plain"` tags in their normal places; `assets/js/express-defer.js` runs them in
 * order on the shopper's first scroll, press, key or touch (or when the buttons come within a screen of the viewport).
 *
 * Which scripts are held is worked out from `$wp_scripts` and never from a list of handles: every registered script whose
 * source sits under the payment plugin's folder or on js.stripe.com, plus every script that depends on one of those. A
 * script that is not in that set prints exactly as before. Nothing is held unless the buy box has armed it on this
 * request (a product page whose buy box prints the express buttons) and the loader file exists, so cart, checkout and
 * every other page are untouched.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Handle of the loader script. */
const SGS_EXPRESS_DEFER_HANDLE = 'sgs-express-defer';

add_filter( 'script_loader_tag', __NAMESPACE__ . '\sgs_express_defer_hold_tag', 99, 3 );
add_filter( 'wp_inline_script_attributes', __NAMESPACE__ . '\sgs_express_defer_hold_inline', 99, 2 );

/**
 * Arm or read the per-request switch. Armed by the buy box when its express buttons print with `expressLoad` set to
 * `interaction`; arming also enqueues the loader. Returns whether scripts are being held on this request.
 *
 * @param bool|null $set True to arm; false to disarm (tests); null to read only.
 * @return bool
 */
function sgs_express_defer_armed( ?bool $set = null ): bool {
	static $armed = false;
	if ( false === $set ) {
		$armed = false;
	}
	if ( true === $set && ! $armed && ! is_admin() && ! ( function_exists( 'is_cart' ) && ( is_cart() || is_checkout() ) ) ) {
		$file = defined( 'SGS_BLOCKS_PATH' ) ? SGS_BLOCKS_PATH . 'assets/js/express-defer.js' : '';
		if ( '' !== $file && is_file( $file ) && defined( 'SGS_BLOCKS_URL' ) ) {
			if ( ! wp_script_is( SGS_EXPRESS_DEFER_HANDLE, 'registered' ) ) {
				wp_register_script(
					SGS_EXPRESS_DEFER_HANDLE,
					SGS_BLOCKS_URL . 'assets/js/express-defer.js',
					array(),
					(string) filemtime( $file ),
					array(
						'in_footer' => true,
						'strategy'  => 'defer',
					)
				);
			}
			wp_enqueue_script( SGS_EXPRESS_DEFER_HANDLE );
			$armed = true;
		}
	}
	return $armed;
}

/**
 * True when a script source belongs to the payment plugin: under its folder, or on Stripe's script host.
 *
 * @param string $src A registered script's source.
 * @return bool
 */
function sgs_express_defer_is_payment_src( string $src ): bool {
	if ( '' === $src ) {
		return false;
	}
	if ( false !== strpos( $src, '/plugins/woo-stripe-payment/' ) ) {
		return true;
	}
	return 'js.stripe.com' === wp_parse_url( $src, PHP_URL_HOST );
}

/**
 * The handles to hold: the payment plugin's scripts and, through `$wp_scripts` dependencies, everything that depends on
 * one of them. Worked out once per request, on the first script printed after the buy box armed the switch.
 *
 * @param bool $fresh Work the set out again (tests).
 * @return array<string, true> Handle => true.
 */
function sgs_express_defer_held_handles( bool $fresh = false ): array {
	static $held = null;
	if ( null !== $held && ! $fresh ) {
		return $held;
	}
	$held    = array();
	$scripts = wp_scripts();
	if ( ! $scripts instanceof \WP_Scripts ) {
		return $held;
	}
	foreach ( $scripts->registered as $handle => $item ) {
		if ( is_string( $item->src ) && sgs_express_defer_is_payment_src( $item->src ) ) {
			$held[ (string) $handle ] = true;
		}
	}
	do {
		$grew = false;
		foreach ( $scripts->registered as $handle => $item ) {
			if ( isset( $held[ (string) $handle ] ) ) {
				continue;
			}
			foreach ( (array) $item->deps as $dep ) {
				if ( isset( $held[ (string) $dep ] ) ) {
					$held[ (string) $handle ] = true;
					$grew                     = true;
					break;
				}
			}
		}
	} while ( $grew );
	unset( $held[ SGS_EXPRESS_DEFER_HANDLE ] );
	return $held;
}

/**
 * `script_loader_tag`: print a held handle's external script inert, with its real type kept in `data-sgs-defer`.
 * A tag that is not a plain classic script (a module, a JSON island) is left alone.
 *
 * @param mixed $tag    The script tag.
 * @param mixed $handle The script's handle.
 * @return mixed
 */
function sgs_express_defer_hold_tag( $tag, $handle ) {
	if ( ! is_string( $tag ) || ! is_string( $handle ) || ! sgs_express_defer_armed() || ! isset( sgs_express_defer_held_handles()[ $handle ] ) ) {
		return $tag;
	}
	if ( 0 !== strpos( ltrim( $tag ), '<script' ) || ! preg_match( '/^\s*<script\b([^>]*)>/i', $tag, $open ) ) {
		return $tag;
	}
	$type = 'text/javascript';
	if ( preg_match( '/\stype\s*=\s*(["\'])(.*?)\1/i', $open[1], $found ) ) {
		$type = strtolower( trim( $found[2] ) );
		if ( 'text/javascript' !== $type && 'application/javascript' !== $type ) {
			return $tag;
		}
	}
	$attrs = preg_replace( '/\stype\s*=\s*(["\']).*?\1/i', '', $open[1] );
	return preg_replace( '/^\s*<script\b[^>]*>/i', '<script type="text/plain" data-sgs-defer="' . esc_attr( $type ) . '"' . $attrs . '>', $tag, 1 );
}

/**
 * `wp_inline_script_attributes`: hold the inline data of a held handle (`<handle>-js-extra`, `-before`, `-after`,
 * `-translations`) in the same way, so it runs in its original place between the held files.
 *
 * @param mixed $attributes The inline script's attributes.
 * @return mixed
 */
function sgs_express_defer_hold_inline( $attributes ) {
	if ( ! is_array( $attributes ) || ! sgs_express_defer_armed() || empty( $attributes['id'] ) || ! is_string( $attributes['id'] ) ) {
		return $attributes;
	}
	if ( ! preg_match( '/^(.+)-js-(?:extra|before|after|translations)$/', $attributes['id'], $parts ) || ! isset( sgs_express_defer_held_handles()[ $parts[1] ] ) ) {
		return $attributes;
	}
	$type = isset( $attributes['type'] ) && is_string( $attributes['type'] ) ? strtolower( $attributes['type'] ) : 'text/javascript';
	if ( 'text/javascript' !== $type && 'application/javascript' !== $type ) {
		return $attributes;
	}
	$attributes['type']            = 'text/plain';
	$attributes['data-sgs-defer'] = $type;
	return $attributes;
}
