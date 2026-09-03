<?php
/**
 * Standalone render.php executor for CSS-effect assertions
 * (scripts/qa/assert-css-effect.js is the caller; T3 gap: fix.js's own
 * self-test asks "was the edit made correctly?" for all 15 assertions and
 * never "does the resulting PHP emit the correct CSS?" — this harness answers
 * that second question without a live deploy).
 *
 * GROUND-TRUTH: confirmed against the real files this harness drives —
 * plugins/sgs-blocks/src/blocks/{card-grid,form,modal,pricing-table}/render.php
 * (read in full) and plugins/sgs-blocks/includes/helpers-tokens.php (sgs_colour_value,
 * sgs_css_gradient_value, sgs_background_paint_decl, sgs_emit_state_colour_css —
 * read at their real line numbers). Nothing here reimplements that logic; it
 * loads and runs the real files.
 *
 * WHAT IT DOES
 * ------------
 * 1. Defines ABSPATH + loads scripts/qa/lib/wp-stubs.php (WP core function/
 *    class stubs — NOT SGS logic, which is always the real files).
 * 2. Builds a stub $block (WP_Block-shaped) + reads $attributes from the
 *    caller.
 * 3. require()s the target render.php with output buffering on.
 * 4. Extracts every <style>...</style> block from the captured HTML and
 *    concatenates their contents into one CSS string.
 * 5. Prints a single JSON object to stdout: {ok, html, css, error}.
 *
 * SCOPE / HONESTY
 * ----------------
 * Only the manual/default `source` render path is exercised faithfully —
 * WP_Query / render_block()-delegating branches (query, wc-product,
 * cpt-collection) are stubbed thinly (see wp-stubs.php) and a caller MUST
 * keep `source` unset or 'manual' to stay on the faithfully-covered path.
 * If render.php fatals or throws, {ok:false, error:"..."} is printed and the
 * caller must treat that as NOT RUN, never as a pass or a fail of the CSS
 * assertion — a crash proves nothing about the CSS the block would emit on a
 * real site with the same attributes.
 *
 * USAGE
 * -----
 *   php render-css-harness.php --slug sgs/card-grid --attrs '{"titleColourHover":"#f00"}'
 *   php render-css-harness.php --slug sgs/card-grid --attrs-file attrs.json
 *   php render-css-harness.php --slug sgs/card-grid --render-file /path/to/render.php --attrs '{...}'
 *       (--render-file overrides the slug->real-path resolution — the
 *       integration point a codemod uses to check ITS OWN proposed edit,
 *       written to a temp file, before ever touching the real tree.)
 *
 * @package SGS\Blocks\QA
 */

declare(strict_types=1);

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// (CLI harness, not shipped plugin code — matches the established
// run-*-standalone.php idiom in plugins/sgs-blocks/tests/php/.)

$sgs_blocks_dir = dirname( __DIR__, 3 ); // plugins/sgs-blocks

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', $sgs_blocks_dir . '/' );
}

// Real value — mirrors `define( 'SGS_BLOCKS_PATH', plugin_dir_path( __FILE__ ) )`
// in plugins/sgs-blocks/sgs-blocks.php:28. A few render.php files (e.g.
// google-reviews) build an asset URL from this constant.
if ( ! defined( 'SGS_BLOCKS_PATH' ) ) {
	define( 'SGS_BLOCKS_PATH', $sgs_blocks_dir . '/' );
}

// Real values — mirrors plugins/sgs-blocks/sgs-blocks.php:45-46. business-info's
// 'attribution' displayType reads these directly (never client-configurable —
// see that render.php branch's own doc comment).
if ( ! defined( 'SGS_ATTRIBUTION_URL' ) ) {
	define( 'SGS_ATTRIBUTION_URL', 'https://smallgiantsstudio.co.uk/' );
}
if ( ! defined( 'SGS_ATTRIBUTION_TEXT' ) ) {
	define( 'SGS_ATTRIBUTION_TEXT', 'Website by Small Giants Studio' );
}

require_once __DIR__ . '/wp-stubs.php';

// Real SGS code, not a stub — every form-field-* render.php calls
// SGS\Blocks\Forms\field_id()/field_open()/etc. via `use function` imports,
// but (per plugins/sgs-blocks/sgs-blocks.php:73) those functions are loaded
// once by the plugin bootstrap, never by the individual render.php files
// themselves. The harness has no bootstrap, so it must load this file the
// same way the bootstrap does — require_once'ing the real implementation,
// never reimplementing field_id()/field_open()/etc. as stubs here.
require_once $sgs_blocks_dir . '/includes/forms/field-render-helpers.php';

/**
 * Parse --flag value / --flag=value style CLI args.
 *
 * @param array $argv Raw argv (without script name).
 * @return array<string,string>
 */
function harness_parse_args( array $argv ): array {
	$out = array();
	$i   = 0;
	$n   = count( $argv );
	while ( $i < $n ) {
		$arg = $argv[ $i ];
		if ( 0 === strpos( $arg, '--' ) ) {
			$key = substr( $arg, 2 );
			if ( strpos( $key, '=' ) !== false ) {
				list( $key, $val ) = explode( '=', $key, 2 );
				$out[ $key ]        = $val;
			} elseif ( $i + 1 < $n && 0 !== strpos( $argv[ $i + 1 ], '--' ) ) {
				$out[ $key ] = $argv[ $i + 1 ];
				++$i;
			} else {
				$out[ $key ] = '1';
			}
		}
		++$i;
	}
	return $out;
}

/**
 * Resolve a block slug (sgs/card-grid) to its real render.php path.
 *
 * @param string $slug Block slug e.g. "sgs/card-grid".
 * @param string $blocks_dir plugins/sgs-blocks absolute path.
 * @return string Absolute path.
 */
function harness_resolve_render_path( string $slug, string $blocks_dir ): string {
	$name = str_starts_with( $slug, 'sgs/' ) ? substr( $slug, 4 ) : $slug;
	return $blocks_dir . '/src/blocks/' . $name . '/render.php';
}

function harness_fail( string $message ): void {
	echo json_encode(
		array(
			'ok'    => false,
			'error' => $message,
		)
	);
	exit( 1 );
}

$args = harness_parse_args( array_slice( $argv, 1 ) );

$slug = $args['slug'] ?? '';
if ( '' === $slug ) {
	harness_fail( 'missing --slug' );
}

if ( isset( $args['render-file'] ) ) {
	$render_path = $args['render-file'];
} else {
	$render_path = harness_resolve_render_path( $slug, $sgs_blocks_dir );
}

if ( ! is_file( $render_path ) ) {
	harness_fail( 'render.php not found: ' . $render_path );
}

if ( isset( $args['attrs-file'] ) ) {
	if ( ! is_file( $args['attrs-file'] ) ) {
		harness_fail( 'attrs-file not found: ' . $args['attrs-file'] );
	}
	$attrs_json = file_get_contents( $args['attrs-file'] );
} elseif ( isset( $args['attrs'] ) ) {
	$attrs_json = $args['attrs'];
} else {
	$attrs_json = '{}';
}

$attributes = json_decode( $attrs_json, true );
if ( ! is_array( $attributes ) ) {
	harness_fail( 'invalid JSON for attrs: ' . json_last_error_msg() );
}

// Force the faithfully-covered render path unless the caller explicitly
// opted into something else (never silently — the caller sees the value it
// passed).
if ( ! isset( $attributes['source'] ) ) {
	$attributes['source'] = 'manual';
}

// Minimal WP_Block-shaped stub. parsed_block.attrs.anchor is the only field
// SGS render.php files read off $block directly (uid derivation).
class SGS_QA_Stub_Block {
	public array $parsed_block;
	public array $inner_blocks = array();
	public array $attributes;
	public function __construct( array $attributes ) {
		$this->attributes   = $attributes;
		$this->parsed_block = array(
			'attrs' => array( 'anchor' => '' ),
		);
	}
}

$block   = new SGS_QA_Stub_Block( $attributes );
$content = '';

$html   = '';
$error  = null;
ob_start();
try {
	// $attributes / $content / $block are the three variables every SGS
	// render.php declares via its @var docblock and reads directly — this is
	// the same calling convention WordPress's own block renderer uses.
	require $render_path;
} catch ( \Throwable $e ) {
	$error = $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine();
}
$html = ob_get_clean();

if ( null !== $error ) {
	harness_fail( $error );
}

// Extract every <style ...>...</style> block's inner CSS.
$css = '';
if ( preg_match_all( '#<style\b[^>]*>(.*?)</style>#s', $html, $matches ) ) {
	$css = implode( "\n", $matches[1] );
}

echo json_encode(
	array(
		'ok'   => true,
		'html' => $html,
		'css'  => $css,
	)
);
