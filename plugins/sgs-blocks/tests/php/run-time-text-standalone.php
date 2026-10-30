<?php
/**
 * Standalone runner: "Text by time of day" on sgs/heading, sgs/text and sgs/label (Spec 02 FR-2-14,
 * `includes/time-text.php::time_text_fallback_words` and `time_text_mark_words`).
 *
 * Each block's REAL render.php runs through the plugin's render harness (scripts/qa/lib/render-css-harness.php, a
 * child process), in the order WordPress runs it: the render_block_data filter on the parsed block, the render, then
 * the render_block filter on its HTML. The block types are registered from their real block.json, so the opt-in
 * (`supports.sgs.enabledExtensions` + `timeTextWords`) is what decides.
 *
 * MUST FAIL without the extension: the words element carries the ranges and zone, a block with no words prints the
 * first range's words, the swap module is enqueued. Negative controls: a block with no ranges and a block that has
 * not opted in are left exactly as rendered, and nothing prints an inline style or a live region.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-time-text-standalone.php
 *
 * @package SGS\Blocks
 */

// phpcs:disable

define( 'ABSPATH', __DIR__ );
$plugin = dirname( __DIR__, 2 );

$GLOBALS['sgs_tt_enqueued'] = array();
function wp_enqueue_script_module( string $id, string $src = '', array $deps = array(), $version = false ): void {
	$GLOBALS['sgs_tt_enqueued'][] = $id;
}
function wp_timezone_string(): string {
	return 'Europe/London';
}
function add_action( ...$args ) {
	return true;
}
function add_filter( ...$args ) {
	return true;
}
require_once $plugin . '/scripts/qa/lib/wp-stubs.php';
require_once $plugin . '/scripts/qa/lib/tag-processor-stub.php';

// The block registry, read from each block's real block.json.
class WP_Block_Type_Registry {
	private static $instance;
	public static function get_instance() {
		return self::$instance ??= new self();
	}
	public function get_registered( $name ) {
		$file = dirname( __DIR__, 2 ) . '/src/blocks/' . substr( (string) $name, 4 ) . '/block.json';
		if ( ! is_file( $file ) ) {
			return null;
		}
		$json = json_decode( (string) file_get_contents( $file ), true );
		return (object) array( 'supports' => $json['supports'] ?? array() );
	}
}

require_once $plugin . '/includes/time-text.php';

use function SGS\Blocks\time_text_fallback_words;
use function SGS\Blocks\time_text_mark_words;
use function SGS\Blocks\time_text_zone;

/**
 * Render a parsed block the way WordPress does: render_block_data, the real render.php (harness), render_block.
 */
function render_parsed( string $plugin, array $parsed ): string {
	$parsed = time_text_fallback_words( $parsed );
	$attrs_f = tempnam( sys_get_temp_dir(), 'sgstt' );
	$ctx_f   = tempnam( sys_get_temp_dir(), 'sgstc' );
	$gs_f    = tempnam( sys_get_temp_dir(), 'sgstg' );
	file_put_contents( $attrs_f, json_encode( (object) $parsed['attrs'] ) );
	file_put_contents( $ctx_f, '{}' );
	file_put_contents( $gs_f, '{}' );
	$cmd = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $plugin . '/scripts/qa/lib/render-css-harness.php' )
		. ' --slug ' . escapeshellarg( $parsed['blockName'] ) . ' --attrs-file ' . escapeshellarg( $attrs_f )
		. ' --context-file ' . escapeshellarg( $ctx_f ) . ' --global-settings-file ' . escapeshellarg( $gs_f ) . ' 2>&1';
	$out = json_decode( (string) shell_exec( $cmd ), true );
	@unlink( $attrs_f );
	@unlink( $ctx_f );
	@unlink( $gs_f );
	if ( ! is_array( $out ) || empty( $out['ok'] ) ) {
		fwrite( STDERR, 'harness failed for ' . $parsed['blockName'] . ': ' . json_encode( $out ) . "\n" );
		exit( 2 );
	}
	return (string) time_text_mark_words( (string) $out['html'], $parsed );
}

/** The opening tag of the first element after any scoped <style> (the words element). */
function words_tag( string $html ): string {
	$body = preg_replace( '#<style\b[^>]*>.*?</style>#s', '', $html );
	return preg_match( '/<[a-z][a-z0-9]*\b[^>]*>/i', (string) $body, $m ) ? $m[0] : '';
}
function attr_of( string $tag, string $name ): ?string {
	return preg_match( '/\s' . preg_quote( $name, '/' ) . '="([^"]*)"/', $tag, $m ) ? html_entity_decode( $m[1], ENT_QUOTES ) : null;
}

$pass  = 0;
$fail  = 0;
$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
	$ok ? $pass++ : $fail++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
};

$ranges = array(
	array( 'start' => 0, 'end' => 5, 'text' => 'up late, mama' ),
	array( 'start' => 5, 'end' => 12, 'text' => 'good morning' ),
	array( 'start' => 21, 'end' => 5, 'text' => 'night owl' ),
	array( 'start' => 30, 'end' => 2, 'text' => 'dropped: hour out of bounds' ),
);
$kept = array_slice( $ranges, 0, 3 );

foreach ( array( 'sgs/heading' => 'content', 'sgs/text' => 'text', 'sgs/label' => 'text' ) as $block => $words ) {
	$GLOBALS['sgs_tt_enqueued'] = array();
	$html = render_parsed( $plugin, array( 'blockName' => $block, 'attrs' => array( $words => 'Hello there', 'sgsTimeText' => $ranges, 'sgsTimeTextZone' => 'site' ) ) );
	$tag  = words_tag( $html );
	$check( json_decode( (string) attr_of( $tag, 'data-sgs-time-text' ), true ) === $kept, "MUST FAIL WITHOUT THE EXTENSION: $block's words element carries the usable ranges in order (tag: $tag)" );
	$check( 'Europe/London' === attr_of( $tag, 'data-sgs-time-zone' ), "MUST FAIL WITHOUT THE EXTENSION: $block's 'site' zone resolves to the site's time zone" );
	$check( false !== strpos( $html, 'Hello there' ), "$block keeps its own words as the server fallback" );
	$check( array( '@sgs/time-text' ) === $GLOBALS['sgs_tt_enqueued'], "$block enqueues the swap module once" );
	$check( null === attr_of( $tag, 'style' ) && false === strpos( $html, 'aria-live' ), "$block prints no inline style and no live region" );

	$GLOBALS['sgs_tt_enqueued'] = array();
	$empty = render_parsed( $plugin, array( 'blockName' => $block, 'attrs' => array( $words => '', 'sgsTimeText' => $ranges ) ) );
	$check( 1 === preg_match( '#>\s*up late, mama\s*<#', $empty ), "MUST FAIL WITHOUT THE FALLBACK: $block with no words of its own prints the first range's words (got: " . words_tag( $empty ) . ')' );
	$check( null === attr_of( words_tag( $empty ), 'data-sgs-time-zone' ), "$block with no zone set reads the visitor's own time (no zone attribute)" );

	$GLOBALS['sgs_tt_enqueued'] = array();
	$plain_attrs = array( $words => 'Hello there' );
	$plain       = render_parsed( $plugin, array( 'blockName' => $block, 'attrs' => $plain_attrs ) );
	$check( false === strpos( $plain, 'data-sgs-time' ) && array() === $GLOBALS['sgs_tt_enqueued'], "negative control: $block with no ranges is left as rendered and loads nothing" );
}

$GLOBALS['sgs_tt_enqueued'] = array();
$other = '<div class="wp-block-sgs-container">x</div>';
$check( $other === time_text_mark_words( $other, array( 'blockName' => 'sgs/container', 'attrs' => array( 'sgsTimeText' => $kept ) ) ) && array() === $GLOBALS['sgs_tt_enqueued'], 'negative control: a block that has not opted in is untouched' );
$check( 'Asia/Karachi' === time_text_zone( 'Asia/Karachi' ) && '' === time_text_zone( 'Mars/Olympus' ) && '' === time_text_zone( '' ), 'a known zone name passes, an unknown one is the visitor\'s own time' );
$xss = render_parsed( $plugin, array( 'blockName' => 'sgs/text', 'attrs' => array( 'text' => '', 'sgsTimeText' => array( array( 'start' => 0, 'end' => 24, 'text' => '<img src=x onerror=alert(1)>hi' ) ) ) ) );
$check( false === strpos( $xss, '<img' ), 'range words are plain text: markup in them never reaches the page' );

echo "RESULT $pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );
