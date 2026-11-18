<?php
/**
 * Standalone runner: which SEO plugin states make SGS step aside for the Organisation and WebSite structured data
 * (`Org_Website_Schema::seo_plugin_owns_schema()`), and that presence alone (`seo_plugin_active()`) is a separate
 * question. Each case runs in its own PHP process, because a plugin is recognised by a constant.
 *
 * Run with: php plugins/sgs-blocks/tests/php/run-seo-plugin-ownership-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

if ( isset( $argv[1] ) ) {
	// Child: one case. argv[1] is JSON {define: [...], options: {...}, filter: bool|null}.
	$case = json_decode( base64_decode( $argv[1] ), true );
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
	foreach ( $case['define'] as $name ) {
		define( $name, '1.0' );
	}
	$GLOBALS['sgs_case'] = $case;
	function get_option( $key, $default = false ) {
		return $GLOBALS['sgs_case']['options'][ $key ] ?? $default;
	}
	function apply_filters( $hook, $value ) {
		if ( 'sgs_seo_plugin_owns_schema' === $hook && null !== $GLOBALS['sgs_case']['filter'] ) {
			return $GLOBALS['sgs_case']['filter'];
		}
		return $value;
	}
	function add_action() {}
	function add_filter() {}
	require dirname( __DIR__, 2 ) . '/includes/class-org-website-schema.php';
	echo json_encode(
		array(
			'active' => \SGS\Blocks\Org_Website_Schema::seo_plugin_active(),
			'owns'   => \SGS\Blocks\Org_Website_Schema::seo_plugin_owns_schema(),
		)
	);
	exit( 0 );
}

$cases = array(
	array( 'no SEO plugin: SGS prints its own', array(), array(), null, false, false ),
	array( 'Yoast active: the plugin owns it', array( 'WPSEO_VERSION' ), array(), null, true, true ),
	array( 'Rank Math active (its helper absent): the plugin owns it', array( 'RANK_MATH_VERSION' ), array(), null, true, true ),
	array( 'Slim SEO with no saved settings (schema on by default): the plugin owns it', array( 'SLIM_SEO_VER' ), array(), null, true, true ),
	array( 'Slim SEO with schema in its features: the plugin owns it', array( 'SLIM_SEO_VER' ), array( 'slim_seo' => array( 'features' => array( 'meta_title', 'schema' ) ) ), null, true, true ),
	array( 'Slim SEO with schema switched off: SGS prints its own', array( 'SLIM_SEO_VER' ), array( 'slim_seo' => array( 'features' => array( 'meta_title', 'meta_description', 'open_graph' ) ) ), null, true, false ),
	array( 'SEOPress active: the plugin owns it', array( 'SEOPRESS_VERSION' ), array(), null, true, true ),
	array( 'All in One SEO active: the plugin owns it', array( 'AIOSEO_VERSION' ), array(), null, true, true ),
	array( 'the filter can hand the data back to SGS', array( 'WPSEO_VERSION' ), array(), false, true, false ),
	array( 'the filter can silence SGS for a plugin it does not know', array(), array(), true, false, true ),
);

$failures = 0;
foreach ( $cases as $case ) {
	list( $label, $define, $options, $filter, $want_active, $want_owns ) = $case;
	$arg = base64_encode( (string) json_encode( array( 'define' => $define, 'options' => $options, 'filter' => $filter ) ) );
	$out = json_decode( (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __FILE__ ) . ' ' . escapeshellarg( $arg ) ), true );
	$ok  = is_array( $out ) && $out['active'] === $want_active && $out['owns'] === $want_owns;
	echo ( $ok ? 'PASS  ' : 'FAIL  ' ) . $label . ( $ok ? '' : ' (got ' . json_encode( $out ) . ')' ) . "\n";
	$failures += $ok ? 0 : 1;
}
echo "\n==== " . ( count( $cases ) - $failures ) . ' passed, ' . $failures . " failed ====\n";
exit( $failures > 0 ? 1 : 0 );
