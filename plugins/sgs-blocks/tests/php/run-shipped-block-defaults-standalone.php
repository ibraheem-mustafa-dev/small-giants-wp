<?php
/**
 * Standalone test: the shipped inserter-default layer (includes/motion/data/inserter-default-motion.json).
 *
 *   (a) window.sgsBlockDefaults carries the shipped entrance for a block with no saved defaults;
 *   (b) a site-saved `sgsMotion` wins over the shipped one;
 *   (c) a site-saved other attribute keeps the shipped `sgsMotion`;
 *   (d) every shipped value survives the motion schema unchanged;
 *   (e) none of the twelve blocks declares an `sgsMotion` default in block.json, and the reset route still only
 *       clears the site's own entry (the shipped layer is never written to the option).
 *
 *   php plugins/sgs-blocks/tests/php/run-shipped-block-defaults-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );

	$GLOBALS['t_option']  = array();
	$GLOBALS['t_inline']  = array();
	$GLOBALS['t_updates'] = 0;

	function wp_script_is( $handle, $list = '' ) { return true; }
	function get_option( $key, $default = false ) { return $GLOBALS['t_option'][ $key ] ?? $default; }
	function update_option( $key, $value, $autoload = null ) { $GLOBALS['t_option'][ $key ] = $value; ++$GLOBALS['t_updates']; return true; }
	function wp_json_encode( $value, $flags = 0 ) { return json_encode( $value, $flags ); }
	function wp_add_inline_script( $handle, $code, $pos = 'after' ) { $GLOBALS['t_inline'][] = $code; return true; }
	function add_action( ...$args ) {}
	function add_filter( ...$args ) {}

	class WP_Block_Type_Registry {
		public static function get_instance() { return new self(); }
		public function get_registered( $name ) { return null; }
	}
	class WP_REST_Request {
		private $p;
		public function __construct( array $p ) { $this->p = $p; }
		public function get_param( $k ) { return $this->p[ $k ] ?? null; }
	}
	class WP_REST_Response {
		public function __construct( public $data = null, public $status = 200 ) {}
	}
}

namespace {
	require_once dirname( __DIR__, 2 ) . '/includes/class-shipped-block-defaults.php';
	require_once dirname( __DIR__, 2 ) . '/includes/class-block-defaults.php';
	require_once dirname( __DIR__, 2 ) . '/includes/motion/class-sgs-motion-assets.php';
	require_once dirname( __DIR__, 2 ) . '/includes/motion/field-types/class-sgs-motion-document.php';

	use SGS\Blocks\Block_Defaults;
	use SGS\Blocks\Motion\Sgs_Motion_Document;

	$fail = 0;
	$check = static function ( string $label, bool $ok ) use ( &$fail ): void {
		echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
		if ( ! $ok ) {
			++$fail;
		}
	};
	$injected = static function (): array {
		$GLOBALS['t_inline'] = array();
		Block_Defaults::inject_defaults_script();
		$code = $GLOBALS['t_inline'][0] ?? '';
		$json = substr( $code, strlen( 'window.sgsBlockDefaults = ' ), -1 );
		$out  = json_decode( $json, true );
		return is_array( $out ) ? $out : array();
	};

	$blocks = array( 'card-grid', 'gallery', 'google-reviews', 'icon', 'info-box', 'post-grid', 'pricing-table', 'process-steps', 'product-card', 'responsive-logo', 'team-member', 'testimonial', 'timeline', 'trustpilot-reviews' );
	$shipped = SGS\Blocks\Shipped_Block_Defaults::all();
	$check( 'data file names exactly the fourteen blocks', array_keys( $shipped ) === array_map( static fn( $b ) => 'sgs/' . $b, $blocks ) );

	// (a) no saved defaults.
	$GLOBALS['t_option'] = array();
	$out = $injected();
	$check( '(a) card-grid carries the shipped entrance on its item part', 'entrance-fade-up' === ( $out['sgs/card-grid']['sgsMotion']['elements']['item']['entrance']['base']['preset'] ?? null ) );
	$check( '(a) pricing-table carries slide-up', 'entrance-slide-up' === ( $out['sgs/pricing-table']['sgsMotion']['elements']['root']['entrance']['base']['preset'] ?? null ) );
	$check( '(a) info-box keeps its lift and gains the 1.02 scale and the media zoom', -1 !== ( $out['sgs/info-box']['sgsMotion']['elements']['root']['hover']['state']['values']['scale'] <=> 1.0 ) && 'hover-lift' === ( $out['sgs/info-box']['sgsMotion']['elements']['root']['hover']['state']['preset'] ?? null ) && 1.1 === ( $out['sgs/info-box']['sgsMotion']['elements']['media']['hover']['state']['values']['scale'] ?? null ) );
	$check( '(a) team-member carries the 1.02 scale and the image zoom', 1.02 === ( $out['sgs/team-member']['sgsMotion']['elements']['root']['hover']['state']['values']['scale'] ?? null ) && 1.1 === ( $out['sgs/team-member']['sgsMotion']['elements']['image']['hover']['state']['values']['scale'] ?? null ) );
	$check( '(a) pricing-table carries the 1.02 scale beside its entrance', 1.02 === ( $out['sgs/pricing-table']['sgsMotion']['elements']['root']['hover']['state']['values']['scale'] ?? null ) && isset( $out['sgs/pricing-table']['sgsMotion']['elements']['root']['entrance'] ) );
	$check( '(a) product-card lifts 4px', -4 === ( $out['sgs/product-card']['sgsMotion']['elements']['root']['hover']['state']['values']['translateY'] ?? null ) );
	$check( '(a) every shipped block is injected', count( array_intersect_key( $out, $shipped ) ) === count( $shipped ) );

	// (b) a saved sgsMotion wins.
	$mine = array( 'v' => 1, 'elements' => array( 'root' => array( 'entrance' => array( 'base' => array( 'preset' => 'entrance-fade-in', 'trigger' => 'scroll' ) ) ) ) );
	$GLOBALS['t_option'] = array( Block_Defaults::OPTION_KEY => array( 'sgs/card-grid' => array( 'sgsMotion' => $mine, 'columns' => 4 ) ) );
	$out = $injected();
	$check( '(b) the saved sgsMotion replaces the shipped one wholesale', ( $out['sgs/card-grid']['sgsMotion'] ?? null ) === $mine );

	// (c) a saved other attribute keeps the shipped sgsMotion.
	$GLOBALS['t_option'] = array( Block_Defaults::OPTION_KEY => array( 'sgs/info-box' => array( 'headingLevel' => 'h2' ), 'sgs/button' => array( 'size' => 'lg' ) ) );
	$out = $injected();
	$check( '(c) the saved attribute is injected', 'h2' === ( $out['sgs/info-box']['headingLevel'] ?? null ) );
	$check( '(c) the shipped sgsMotion stays beside it', $shipped['sgs/info-box']['sgsMotion'] === ( $out['sgs/info-box']['sgsMotion'] ?? null ) );
	$check( '(c) a block with only saved defaults passes through', array( 'size' => 'lg' ) === ( $out['sgs/button'] ?? null ) );

	// Reset only clears the site's own entry; the shipped layer is never saved.
	$GLOBALS['t_updates'] = 0;
	Block_Defaults::reset_block_defaults( new WP_REST_Request( array( 'block' => 'sgs/info-box' ) ) );
	$check( 'reset clears the site entry only', ! isset( $GLOBALS['t_option'][ Block_Defaults::OPTION_KEY ]['sgs/info-box'] ) && isset( $GLOBALS['t_option'][ Block_Defaults::OPTION_KEY ]['sgs/button'] ) );
	$GLOBALS['t_option'] = array();
	$GLOBALS['t_updates'] = 0;
	Block_Defaults::get_all_defaults( new WP_REST_Request( array() ) );
	$check( 'reading never writes the option', 0 === $GLOBALS['t_updates'] && array() === $GLOBALS['t_option'] );
	$out = $injected();
	$check( 'after a reset the shipped entrance is back', isset( $out['sgs/info-box']['sgsMotion'] ) );

	// (d) schema validity.
	foreach ( $shipped as $name => $attrs ) {
		$check( "(d) {$name} sgsMotion survives the schema unchanged", Sgs_Motion_Document::sanitise( $attrs['sgsMotion'] ) == $attrs['sgsMotion'] );
	}

	// (e) block.json defaults stay empty and the block supports motion.
	foreach ( $blocks as $b ) {
		$json = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . "/src/blocks/{$b}/block.json" ), true );
		$check( "(e) {$b} block.json has no sgsMotion default and supports.sgs.motion", ! isset( $json['attributes']['sgsMotion']['default'] ) && ! empty( $json['supports']['sgs']['motion'] ) );
	}

	echo $fail ? "\n{$fail} FAILED\n" : "\nAll passed\n";
	exit( $fail ? 1 : 0 );
}
