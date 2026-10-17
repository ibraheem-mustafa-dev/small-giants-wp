<?php
/**
 * Standalone runner: the cursor-field `image-reveal` image reaches the page's `<style>` rule as a real CSS `url("...")`
 * (Spec 38A FR-38A-34).
 *
 * The uid-scoped rule sits in a `<style>` element, where HTML entities are not decoded. The root declarations once went
 * through `esc_html`, which wrote the quotes around the image URL as `&quot;`; the browser then read a relative path,
 * the request 404ed and the card painted no picture while every computed radius and clip value still read correctly.
 * This runner renders a layer-authored reveal with an image and asserts the rule carries the URL with literal quotes,
 * with no entity, and that nothing can close the `<style>` element early.
 *
 *   php plugins/sgs-blocks/tests/php/run-fx-cursor-field-image-style-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

namespace {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
	define( 'SGS_BLOCKS_PATH', dirname( __DIR__, 2 ) . '/' );
	define( 'SGS_BLOCKS_URL', 'https://example.test/wp-content/plugins/sgs-blocks/' );
	define( 'SGS_BLOCKS_VERSION', 'test' );

	function wp_get_global_settings( $path = array() ) {
		$theme  = json_decode( (string) file_get_contents( dirname( __DIR__, 4 ) . '/theme/sgs-theme/theme.json' ), true );
		$custom = $theme['settings']['custom'] ?? array();
		return array( 'custom' ) === $path ? $custom : array( 'custom' => $custom );
	}

	/** The attachment's URL: a plain upload, and one carrying every character the helper must encode. */
	function wp_get_attachment_image_url( int $id, string $size = 'large' ) {
		if ( 7 === $id ) {
			return 'https://example.test/wp-content/uploads/a"b\'c(d)e<f>g.jpg';
		}
		return 3457 === $id ? 'https://example.test/wp-content/uploads/2026/09/photo-576x1024.jpeg' : false;
	}

	require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-motion-registry.php';
	require_once __DIR__ . '/stubs/motion-render-stubs.php';
	require_once dirname( __DIR__, 2 ) . '/includes/helpers-global-settings.php';

	if ( ! function_exists( 'esc_html' ) ) {
		function esc_html( $value ): string {
			return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' );
		}
	}
	if ( ! function_exists( 'esc_url_raw' ) ) {
		function esc_url_raw( $value ): string {
			return str_replace( ' ', '%20', (string) $value );
		}
	}

	$GLOBALS['ci_fail']  = 0;
	$GLOBALS['ci_count'] = 0;
	function ci_check( bool $ok, string $label ): void {
		++$GLOBALS['ci_count'];
		$GLOBALS['ci_fail'] += $ok ? 0 : 1;
		echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . PHP_EOL;
	}

	\SGS\Blocks\Motion\Sgs_Motion_Renderer::register();
	foreach ( array( 'fx-token-match', 'fx-root-offset', 'fx-cursor-field' ) as $file ) {
		require_once dirname( __DIR__, 2 ) . "/includes/$file.php";
	}

	function ci_render( int $image ): string {
		\SGS\Blocks\Motion\Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_collected_css'] = array();
		$layer = array(
			'id'     => 'cf1',
			'effect' => 'cursor-field',
			'values' => array( 'field' => 'image-reveal', 'radius' => 0, 'hoverRadius' => 90, 'image' => $image ),
		);
		$block = array( 'blockName' => 'sgs/container', 'attrs' => array( 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'root' => array( 'effects' => array( $layer ) ) ) ) ) );
		$block = \SGS\Blocks\Motion\Sgs_Motion_Renderer::open_frame( $block, $block, null );
		return (string) apply_filters( 'render_block', '<div class="wp-block-sgs-container sgs-container"><div class="sgs-container__inner">Card</div></div>', $block );
	}

	/** The block's CSS text: the collector's rules (the collector hoists the block's `<style>`), else the `<style>` still in the markup. */
	function ci_style( string $html ): string {
		$collected = implode( '', array_map( 'strval', $GLOBALS['sgs_collected_css'] ?? array() ) );
		if ( '' !== $collected ) {
			return $collected;
		}
		return 1 === preg_match( '#<style>(.*?)</style>#s', $html, $hit ) ? $hit[1] : '';
	}

	$style = ci_style( ci_render( 3457 ) );
	ci_check( '' !== $style, 'the reveal rendered a <style> rule: ' . substr( $style, 0, 120 ) );
	ci_check( false !== strpos( $style, '--sgs-cursor-field-image:url("https://example.test/wp-content/uploads/2026/09/photo-576x1024.jpeg")' ), 'the rule carries the image as url("...") with literal quotes: ' . substr( $style, 0, 260 ) );
	ci_check( false === strpos( $style, '&quot;' ) && false === strpos( $style, '&#' ), 'the rule holds no HTML entity for a quote' );

	// Negative control: an attachment with no URL writes no image declaration.
	$none = ci_style( ci_render( 999 ) );
	ci_check( false === strpos( $none, '--sgs-cursor-field-image' ), 'an attachment without a URL writes no --sgs-cursor-field-image' );

	// A URL with quote, bracket and angle characters is encoded inside the string and cannot end it, the rule or the <style>.
	$hostile = ci_style( ci_render( 7 ) );
	ci_check( 1 === preg_match( '/--sgs-cursor-field-image:url\("[^"]*"\)/', $hostile ), 'a hostile URL stays one quoted string: ' . substr( $hostile, 0, 260 ) );
	ci_check( false === strpos( $hostile, '<' ) && false === strpos( $hostile, '>' ), 'no raw angle bracket reaches the <style> text' );

	echo PHP_EOL . ( $GLOBALS['ci_fail'] ? 'FAILED' : 'OK' ) . ': ' . ( $GLOBALS['ci_count'] - $GLOBALS['ci_fail'] ) . ' of ' . $GLOBALS['ci_count'] . ' checks' . PHP_EOL;
	exit( $GLOBALS['ci_fail'] ? 1 : 0 );
}
