<?php
/**
 * Standalone runner: the basket drawer's titles are not headings, and they keep the theme's heading look.
 *
 * - Detector: the cart panel's markup (the PHP builders, the editor preview and the view script) carries no
 *   `h1` to `h6` element, so the drawer cannot put an `h2` or `h3` ahead of the page's `h1`.
 * - {@see Heading_Look}: the declarations come from the site's global styles for `heading` and the level, the text
 *   colour follows the dark-surface tone variable, a level-specific value beats the shared one, and nothing is printed
 *   for an invalid level.
 *
 * Run with: php plugins/sgs-blocks/tests/php/run-heading-look-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
	$GLOBALS['styles'] = array();
	function add_action( $h, $cb ) { $GLOBALS['actions'][ $h ][] = $cb; }
	function add_filter() {}
	function apply_filters( $hook, $value ) { return $value; }
	function wp_get_global_styles( $path ) {
		++$GLOBALS['computed'];
		$node = $GLOBALS['styles'];
		foreach ( $path as $key ) {
			$node = $node[ $key ] ?? array();
		}
		return $node;
	}
	function wp_style_engine_get_styles( $styles ) {
		$map = array( 'fontFamily' => 'font-family', 'fontWeight' => 'font-weight', 'lineHeight' => 'line-height', 'letterSpacing' => 'letter-spacing', 'fontSize' => 'font-size' );
		$out = array();
		foreach ( $styles['typography'] ?? array() as $k => $v ) {
			$out[ $map[ $k ] ] = preg_replace( '/^var:preset\|([a-z\-]+)\|(.+)$/', 'var(--wp--preset--$1--$2)', $v );
		}
		if ( isset( $styles['color']['text'] ) ) {
			$out['color'] = preg_replace( '/^var:preset\|([a-z\-]+)\|(.+)$/', 'var(--wp--preset--$1--$2)', $styles['color']['text'] );
		}
		return array( 'declarations' => $out );
	}
	function wp_style_is() { return true; }
	function wp_add_inline_style( $h, $css ) { $GLOBALS['inline'][] = $css; }
	function did_action( $h ) { return $GLOBALS['did'][ $h ] ?? 0; }
	$GLOBALS['did']     = array();
	$GLOBALS['actions'] = array();
	function wp_strip_all_tags( $s ) { return strip_tags( $s ); }
	function wp_json_encode( $v ) { return json_encode( $v ); }
	function get_template_directory() { return sys_get_temp_dir(); }
	function get_stylesheet_directory() { return sys_get_temp_dir(); }
	function get_post( $id ) { return null; }
	function get_transient( $k ) { return $GLOBALS['transients'][ $k ] ?? false; }
	function set_transient( $k, $v ) { $GLOBALS['transients'][ $k ] = $v; return true; }
	define( 'DAY_IN_SECONDS', 86400 );
	$GLOBALS['transients'] = array();
	$GLOBALS['inline']     = array();
	$GLOBALS['computed']   = 0;
	require dirname( __DIR__, 2 ) . '/includes/class-heading-look.php';

	use SGS\Blocks\Heading_Look;

	$failures = 0;
	$total    = 0;
	$check    = static function ( string $label, bool $ok, string $detail = '' ) use ( &$failures, &$total ): void {
		++$total;
		echo ( $ok ? 'PASS  ' : 'FAIL  ' ) . $label . ( $ok || '' === $detail ? '' : ' (' . $detail . ')' ) . "\n";
		$failures += $ok ? 0 : 1;
	};

	// Detector.
	$root  = dirname( __DIR__, 2 );
	$files = array(
		'includes/helpers-cart-panel.php',
		'includes/helpers-cart-panel-extras.php',
		'src/blocks/cart/PanelPreview.js',
		'src/blocks/cart/panel-render.js',
		'src/blocks/cart/render.php',
	);
	$bad = array();
	foreach ( $files as $file ) {
		if ( preg_match( '/<h[1-6][\s>]/', (string) file_get_contents( $root . '/' . $file ) ) ) {
			$bad[] = $file;
		}
	}
	$check( 'the basket drawer markup carries no h1 to h6 element', array() === $bad, implode( ', ', $bad ) );

	// Heading look.
	$GLOBALS['styles'] = array(
		'elements' => array(
			'heading' => array(
				'typography' => array( 'fontFamily' => 'var:preset|font-family|heading', 'fontWeight' => '400', 'lineHeight' => '1.05' ),
				'color'      => array( 'text' => 'var:preset|color|heading' ),
			),
			'h2'      => array( 'typography' => array( 'letterSpacing' => '-0.015em', 'fontWeight' => '600' ) ),
		),
	);
	$css = Heading_Look::declarations( 'h2' );
	$check( 'font family and line height come from the shared heading element', false !== strpos( $css, 'font-family:var(--wp--preset--font-family--heading);' ) && false !== strpos( $css, 'line-height:1.05;' ) );
	$check( 'a level-specific value (letter spacing) is added and beats the shared weight', false !== strpos( $css, 'letter-spacing:-0.015em;' ) && false !== strpos( $css, 'font-weight:600;' ) && false === strpos( $css, 'font-weight:400;' ) );
	$check( 'the text colour follows the dark-surface tone variable', false !== strpos( $css, 'color:var(--sgs-tone-heading, var(--wp--preset--color--heading));' ) );
	$check( 'h3 with no own entry takes the shared look only', false === strpos( Heading_Look::declarations( 'h3' ), 'letter-spacing' ) && false !== strpos( Heading_Look::declarations( 'h3' ), 'font-weight:400;' ) );
	$check( 'an invalid level prints nothing', '' === Heading_Look::declarations( 'div' ) );
	$all = Heading_Look::css();
	$check( 'both drawer titles get a zero-specificity rule', 0 === strpos( $all, ':where(.sgs-cart__panel-heading){' ) && false !== strpos( $all, ':where(.sgs-cart__panel-empty--rich .sgs-cart__panel-empty-message){' ) );
	$GLOBALS['styles'] = array();
	$GLOBALS['transients'] = array();
	$check( 'a site with no heading styles prints no rules', '' === Heading_Look::css() );

	// Cost: nothing without a drawer, one computation with it, none while the global styles are unchanged.
	$GLOBALS['styles'] = array( 'elements' => array( 'heading' => array( 'typography' => array( 'fontWeight' => '400' ) ) ) );
	$GLOBALS['transients'] = array();
	$GLOBALS['computed']   = 0;
	$check( 'a request that renders no drawer computes nothing (the front end no longer hooks the heading look)', 0 === $GLOBALS['computed'] );
	Heading_Look::enqueue();
	$first = $GLOBALS['computed'];
	$check( 'the drawer renders before wp_enqueue_scripts: the rules wait for that hook, nothing is added yet', $first > 0 && 0 === count( $GLOBALS['inline'] ) && 1 === count( $GLOBALS['actions']['wp_enqueue_scripts'] ?? array() ) );
	foreach ( $GLOBALS['actions']['wp_enqueue_scripts'] as $cb ) {
		$cb();
	}
	$check( 'on that hook the rules join the global styles', 1 === count( $GLOBALS['inline'] ) && false !== strpos( $GLOBALS['inline'][0], 'font-weight:400;' ) );
	Heading_Look::enqueue();
	$check( 'a second drawer on the same request adds nothing', 1 === count( $GLOBALS['actions']['wp_enqueue_scripts'] ) && 1 === count( $GLOBALS['inline'] ) );
	$GLOBALS['computed'] = 0;
	$cached = Heading_Look::css();
	$check( 'the next request reads the rules from the transient and computes nothing', 0 === $GLOBALS['computed'] && false !== strpos( $cached, 'font-weight:400;' ) );
	$GLOBALS['transients'] = array();
	$check( 'with the transient gone the rules are rebuilt', '' !== Heading_Look::css() && $GLOBALS['computed'] > 0 );

	echo "\n==== " . ( $total - $failures ) . ' of ' . $total . ' checks passed (' . $failures . " failed) ====\n";
	exit( $failures > 0 ? 1 : 0 );
}
