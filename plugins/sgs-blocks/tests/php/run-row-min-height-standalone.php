<?php
/**
 * Standalone runner for the header and footer rows' per-device minimum height.
 *
 * The rows are layout blocks rendered through SGS_Container_Wrapper, which opens its
 * min-height emission for a layout block only when the block's block.json declares
 * `minHeight`. Renders the real render.php files in the QA harness (child process,
 * --motion-targets so the block is a WP_Block carrying its registered attribute schema).
 * Exits non-zero on any failure.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-row-min-height-standalone.php
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
 * Render a real block through the QA harness.
 *
 * @param string               $slug  Block slug.
 * @param array<string, mixed> $attrs Block attributes.
 * @return array{html: string, css: string}
 */
function render_row_block( string $slug, array $attrs ): array {
	$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
	$file    = tempnam( sys_get_temp_dir(), 'sgsrmh' );
	file_put_contents( $file, json_encode( (object) $attrs ) );
	$cmd = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness )
		. ' --slug ' . escapeshellarg( $slug )
		. ' --motion-targets --content ' . escapeshellarg( '<p>x</p>' )
		. ' --attrs-file ' . escapeshellarg( $file ) . ' 2>&1';
	$out = (string) shell_exec( $cmd );
	unlink( $file );
	$decoded = json_decode( $out, true );
	if ( ! is_array( $decoded ) || ! ( $decoded['ok'] ?? false ) ) {
		echo "FAIL  harness error for $slug: $out\n";
		exit( 1 );
	}
	return array(
		'html' => (string) $decoded['html'],
		'css'  => (string) $decoded['css'],
	);
}

$tiers = array(
	'desktop' => '84px',
	'tablet'  => '72px',
	'mobile'  => '72px',
);

// A row that declares minHeight emits it at each breakpoint, as a stylesheet rule and never inline.
foreach ( array( 'sgs/site-header-row', 'sgs/site-footer-row' ) as $slug ) {
	$out = render_row_block( $slug, array( 'minHeight' => $tiers ) );
	ok( 1 === preg_match( '/\.sgs-container-[a-z0-9]+\{min-height:84px\}/', $out['css'] ), "$slug: desktop min-height 84px" );
	ok( 1 === preg_match( '/@media \(max-width:1023px\)\{\.sgs-container-[a-z0-9]+\{min-height:72px\}\}/', $out['css'] ), "$slug: tablet min-height 72px" );
	ok( 1 === preg_match( '/@media \(max-width:767px\)\{\.sgs-container-[a-z0-9]+\{min-height:72px\}\}/', $out['css'] ), "$slug: mobile min-height 72px" );
	ok( 1 === preg_match( '/\.sgs-container-[a-z0-9]+\{display:flex;flex-direction:column\}/', $out['css'] ), "$slug: the row becomes a flex column so its band fills the taller box" );
	ok( 1 === preg_match( '/__inner\{[^}]*flex:1\}/', $out['css'] ), "$slug: the content band grows to fill the box (content stays aligned inside it)" );
	ok( false === strpos( $out['html'], ' style="' ), "$slug: no inline style attribute" );

	$none = render_row_block( $slug, array() );
	ok( false === strpos( $none['css'], 'min-height:84px' ) && 1 !== preg_match( '/\{min-height:\d/', $none['css'] ), "$slug: an empty minHeight emits no minimum" );
	ok( 1 !== preg_match( '/\.sgs-container-[a-z0-9]+\{display:flex;flex-direction:column\}/', $none['css'] ), "$slug: an empty minHeight adds no flex column" );
}

// The header row centres its content inside the taller box (alignItems default 'center').
$header = render_row_block( 'sgs/site-header-row', array( 'minHeight' => $tiers ) );
ok( 1 === preg_match( '/__inner\{[^}]*align-items:center[^}]*flex:1\}/', $header['css'] ), 'sgs/site-header-row: content centred vertically in the min-height box' );

// A layout block WITHOUT the attribute emits nothing new: the gate is the declared attribute, not the layout kind.
$grid = render_row_block( 'sgs/feature-grid', array( 'minHeight' => $tiers ) );
ok( false === strpos( $grid['css'], 'min-height:84px' ) && false === strpos( $grid['css'], 'min-height:72px' ), 'layout block without a minHeight attribute emits no min-height' );
ok( 1 !== preg_match( '/\.sgs-container-[a-z0-9]+\{display:flex;flex-direction:column\}/', $grid['css'] ), 'layout block without a minHeight attribute gets no flex-fill column' );

// A section block's output is unchanged: base, tablet and mobile rules on the outer, no flex fill without a band.
$section = render_row_block( 'sgs/container', array( 'minHeight' => $tiers ) );
$section_min = preg_replace( '/\.sgs-container-[a-z0-9]+/', '.U', $section['css'] );
ok( 1 === preg_match( '/\.U\{min-height:84px\}@media \(max-width:1023px\)\{\.U\{min-height:72px\}\}@media \(max-width:767px\)\{\.U\{min-height:72px\}\}/', $section_min ), 'section block: min-height rules unchanged (base, tablet, mobile on the outer)' );
ok( 1 !== preg_match( '/display:flex;flex-direction:column/', $section['css'] ), 'section block: no flex-fill column without a content band' );

// The declared attribute is a tier object with an empty default (saved headers stay valid) and carries no preset list.
foreach ( array( 'site-header-row', 'site-footer-row' ) as $dir ) {
	$meta = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . "/src/blocks/$dir/block.json" ), true );
	$attr = $meta['attributes']['minHeight'] ?? null;
	ok( is_array( $attr ) && 'object' === ( $attr['type'] ?? '' ) && array() === ( $attr['default'] ?? null ), "$dir: minHeight is an object attribute defaulting to {}" );
	ok( 'minHeight' === ( $meta['supports']['sgs']['elements']['row']['attrMap']['css:min-height'] ?? '' ), "$dir: css:min-height maps to minHeight on the row element" );
}

echo "\n$pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );
