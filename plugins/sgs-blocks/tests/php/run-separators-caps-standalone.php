<?php
/**
 * Standalone test: what a block offers for its separators comes from block.json.
 *
 * `includes/helpers-separators.php::sgs_separators_caps` reads
 * `supports.sgs.separators.<attribute>`, the entry the editor's SeparatorsPanel reads, so
 * the hard-coded copies in PHP are gone. A stub block registry is filled from the real
 * block.json files, so the test fails if a block's entry changes shape or a caller drifts.
 *
 * Also proves the flow path loads the runtime fallback module and the line path does not.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-separators-caps-standalone.php
 *
 * @package SGS\Blocks
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

$plugin = dirname( __DIR__, 2 );

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', $plugin . '/' );
}
define( 'SGS_BLOCKS_PATH', $plugin . '/' );
define( 'SGS_BLOCKS_URL', 'https://example.test/plugin/' );

if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ) {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

$enqueued = array();
function wp_enqueue_script_module( $id, $src = '', $deps = array(), $version = false ) {
	global $enqueued;
	$enqueued[] = $id;
}

class WP_Block_Type_Registry {
	private static $instance;
	public $types = array();
	public static function get_instance() {
		if ( ! self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}
	public function get_registered( $name ) {
		return $this->types[ $name ] ?? null;
	}
}

foreach ( glob( $plugin . '/src/blocks/*/block.json' ) as $file ) {
	$data = json_decode( (string) file_get_contents( $file ), true );
	if ( is_array( $data ) && isset( $data['name'] ) ) {
		WP_Block_Type_Registry::get_instance()->types[ $data['name'] ] = (object) array( 'supports' => $data['supports'] ?? array() );
	}
}

require_once $plugin . '/includes/helpers-tokens.php';
require_once $plugin . '/includes/class-sgs-breakpoints.php';
require_once $plugin . '/includes/helpers-responsive.php';
require_once $plugin . '/includes/helpers-css-safety.php';
require_once $plugin . '/includes/helpers-hover-state.php';
require_once $plugin . '/includes/helpers-separators-css.php';

$pass = 0;
$fail = 0;

function ok( bool $cond, string $label ): void {
	global $pass, $fail;
	if ( $cond ) {
		++$pass;
		echo "PASS  $label\n";
	} else {
		++$fail;
		echo "FAIL  $label\n";
	}
}

// Every declared entry comes back as declared.
$declared = 0;
foreach ( WP_Block_Type_Registry::get_instance()->types as $name => $type ) {
	foreach ( (array) ( $type->supports['sgs']['separators'] ?? array() ) as $attribute => $entry ) {
		++$declared;
		$caps = sgs_separators_caps( $name, $attribute );
		$same = array_values( $entry['axes'] ) === $caps['axes']
			&& (bool) $entry['edges'] === $caps['edges']
			&& (bool) $entry['hover'] === $caps['hover']
			&& (bool) $entry['sweep'] === $caps['sweep'];
		ok( $same, "$name::$attribute offers what block.json declares" );
	}
}
ok( $declared >= 15, "the survey found every declaring block ($declared entries)" );

// The two nav lists differ by block, and the submenu list from the top-level one.
ok( array( 'column' ) === sgs_nav_menu_separators_caps_probe( 'sgs-nav-bar-menu', 'separators' )['axes'], 'the bar draws vertical lines between its items' );
ok( array( 'row' ) === sgs_nav_menu_separators_caps_probe( 'sgs-nav-drawer-menu', 'separators' )['axes'], 'the drawer draws horizontal lines between its rows' );
function sgs_nav_menu_separators_caps_probe( string $bem_root, string $attribute ): array {
	require_once ABSPATH . 'includes/nav-menu-separators.php';
	return sgs_nav_menu_separators_caps( $bem_root, $attribute );
}
ok( sgs_separators_caps( 'sgs/nav-drawer-menu' )['edges'] && ! sgs_separators_caps( 'sgs/nav-bar-menu' )['edges'], 'outer lines are offered by the drawer only' );

// A block that declares nothing offers nothing, so nothing draws.
$none = sgs_separators_caps( 'sgs/heading' );
ok( array() === $none['axes'] && ! $none['edges'] && ! $none['hover'] && ! $none['sweep'], 'an undeclaring block offers no axes' );
ok( array() === sgs_separators_caps( 'sgs/not-registered' )['axes'], 'an unregistered block offers no axes' );
$tiers = array( 'desktop' => '1px' );
$raw   = array(
	'row' => array(
		'style' => 'solid',
		'width' => $tiers,
	),
);
ok( ! sgs_separators_active( sgs_separators_normalise( $raw, sgs_separators_caps( 'sgs/heading' ) ) ), 'an undeclaring block draws no line even when the attribute holds one' );
ok( sgs_separators_active( sgs_separators_normalise( $raw, sgs_separators_caps( 'sgs/gallery' ) ) ), 'a declaring block draws it' );

// The override narrows or widens for one render.
$strip = sgs_separators_caps(
	'sgs/brand-strip',
	'separators',
	array(
		'axes'  => array( 'column' ),
		'edges' => true,
	)
);
ok( array( 'column' ) === $strip['axes'] && true === $strip['edges'], 'a render-time override replaces the declared keys' );
ok( false === sgs_separators_caps( 'sgs/brand-strip' )['edges'], 'the override does not leak into the declared entry' );

// The flow path loads the runtime fallback module; the line path does not.
if ( ! is_dir( $plugin . '/build/shared' ) ) {
	mkdir( $plugin . '/build/shared', 0777, true );
}
$built = $plugin . '/build/shared/separators.js';
$made  = ! is_file( $built );
if ( $made ) {
	file_put_contents( $built, '// test stand-in' );
}
$col      = array(
	'column' => array(
		'style' => 'solid',
		'width' => $tiers,
	),
);
$enqueued = array();
sgs_separators_css(
	$col,
	array(
		'list'   => '.g',
		'layout' => 'flow',
	),
	sgs_separators_caps( 'sgs/gallery' )
);
ok( array( '@sgs/separators' ) === $enqueued, 'a flow list enqueues the @sgs/separators module' );
$enqueued = array();
sgs_separators_css(
	$col,
	array(
		'list'      => '.g',
		'layout'    => 'line',
		'item'      => '.g > i',
		'direction' => 'row',
		'gap_expr'  => array( 'column' => '8px' ),
	),
	sgs_separators_caps( 'sgs/gallery' )
);
ok( array() === $enqueued, 'a line list enqueues nothing' );
$enqueued = array();
sgs_separators_css(
	array(),
	array(
		'list'   => '.g',
		'layout' => 'flow',
	),
	sgs_separators_caps( 'sgs/gallery' )
);
ok( array() === $enqueued, 'a flow list with no line set enqueues nothing' );
if ( $made ) {
	unlink( $built );
}

echo "\n$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
