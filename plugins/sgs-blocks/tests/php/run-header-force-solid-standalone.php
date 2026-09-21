<?php
/**
 * Standalone runner for the force-solid header background (Wave 3C U-1).
 *
 * Exercises includes/sgs-header-force-solid.php against the real
 * `sgs_merge_tri_state_declarations()` with plain PHP, no PHPUnit. Exits non-zero
 * on any failure.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-header-force-solid-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code): global accumulators and direct echo are
// the established run-*-standalone.php idiom.
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $data ) {
		return json_encode( $data ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- CLI stub.
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-breakpoints.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 2 ) . '/includes/sgs-header-force-solid.php';

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

/**
 * Mirror of site-header/render.php's transparent resolution: a force-solid tier
 * resolves Transparent off.
 */
function effective_transparent( array $transparent, array $contrast ): array {
	$out = array();
	foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
		$t            = sgs_resolve_tier( $transparent, $tier, 'off' );
		$c            = sgs_resolve_tier( $contrast, $tier, 'none' );
		$out[ $tier ] = ( 'force-solid' === $c['value'] ) ? 'off' : $t['value'];
	}
	return $out;
}

$transparent_props = array(
	'position'   => 'absolute',
	'top'        => '0',
	'left'       => '0',
	'right'      => '0',
	'background' => 'transparent',
	'z-index'    => '100',
);

/**
 * Render the merge the way render.php does, with or without the force-solid entry.
 */
function render_merge( array $attributes, bool $with_force_solid ): string {
	global $transparent_props;
	$transparent = $attributes['headerTransparent'] ?? array();
	$contrast    = $attributes['contrastSafe'] ?? array();
	$behaviours  = array();
	if ( $with_force_solid ) {
		$behaviours[] = sgs_header_force_solid_entry( $attributes );
	}
	$behaviours[] = array(
		'raw'   => effective_transparent( $transparent, $contrast ),
		'props' => $transparent_props,
	);
	return sgs_merge_tri_state_declarations( '.hdr', $behaviours, 'off' );
}

// Desktop transparent, mobile force-solid.
$attrs = array(
	'headerTransparent' => array( 'desktop' => 'on' ),
	'contrastSafe'      => array( 'mobile' => 'force-solid' ),
);

$fixed = render_merge( $attrs, true );
$old   = render_merge( $attrs, false );

ok( false !== strpos( $fixed, 'background:var(--wp--preset--color--surface,#ffffff) !important;' ), 'force-solid tier paints the surface token when the header has no colour' );
ok( false === strpos( $fixed, 'background:revert' ), 'force-solid tier does not revert the background away' );
ok( false !== strpos( $fixed, 'background:transparent !important;' ), 'desktop transparent is unchanged' );

// Negative control: the previous behaviour (no force-solid entry) reverts the background at the mobile tier.
ok( false !== strpos( $old, 'background:revert !important;' ), 'NEGATIVE CONTROL: without the entry the mobile tier reverts the background' );
ok( false === strpos( $old, '--wp--preset--color--surface' ), 'NEGATIVE CONTROL: without the entry no solid colour is painted' );

// The header's own colour wins over the surface token.
$coloured = render_merge( $attrs + array( 'backgroundColour' => 'primary' ), true );
ok( false !== strpos( $coloured, 'background:var(--wp--preset--color--primary, currentColor) !important;' ), "force-solid paints the header's own colour" );
ok( false === strpos( $coloured, '--wp--preset--color--surface' ), 'own colour replaces the surface token' );

// A gradient is layered over the colour.
$gradient = render_merge(
	$attrs + array(
		'backgroundColour'         => 'primary',
		'backgroundColourGradient' => 'linear-gradient(90deg,#000,#fff)',
	),
	true
);
ok( false !== strpos( $gradient, 'linear-gradient(90deg,#000,#fff),var(--wp--preset--color--primary, currentColor)' ), 'gradient is layered over the colour' );

// Force-solid off everywhere adds nothing.
$none = render_merge( array( 'headerTransparent' => array( 'desktop' => 'on' ) ), true );
ok( false === strpos( $none, '--wp--preset--color--surface' ), 'no force-solid tier: no solid colour emitted' );

// Force-solid alone (no transparency anywhere) still paints its tier.
$solo = render_merge( array( 'contrastSafe' => array( 'mobile' => 'force-solid' ) ), true );
ok( false !== strpos( $solo, '@media (max-width:767px){.hdr{background:var(--wp--preset--color--surface,#ffffff) !important;}}' ), 'force-solid alone paints only its tier' );

// Tier helper.
$tiers = sgs_header_force_solid_tiers( array( 'desktop' => 'none', 'mobile' => 'force-solid' ) );
ok( array( 'desktop' => 'off', 'tablet' => 'off', 'mobile' => 'on' ) === $tiers, 'tier helper resolves the cascade' );

echo "\n$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
