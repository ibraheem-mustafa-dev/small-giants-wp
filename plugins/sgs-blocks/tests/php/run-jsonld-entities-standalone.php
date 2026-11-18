<?php
/**
 * Standalone runner: structured data prints characters, never HTML entities.
 *
 * WordPress returns the site name, titles and term names with entities (an
 * apostrophe is `&#039;`); JSON-LD is not HTML, so `Sgs_Schema::encode_jsonld()` decodes
 * every string before encoding. The second half is the detector: every file that prints a
 * `application/ld+json` script must encode through `Sgs_Schema`, never `wp_json_encode`
 * directly, so no emitter can bypass the decoding.
 *
 * Run with: php plugins/sgs-blocks/tests/php/run-jsonld-entities-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
function wp_json_encode( $data, $flags = 0 ) {
	return json_encode( $data, $flags );
}
require dirname( __DIR__, 2 ) . '/includes/class-sgs-schema.php';

$failures = 0;
$total    = 0;
$check    = static function ( string $label, bool $ok, string $detail = '' ) use ( &$failures, &$total ): void {
	++$total;
	echo ( $ok ? 'PASS  ' : 'FAIL  ' ) . $label . ( $ok || '' === $detail ? '' : ' (' . $detail . ')' ) . "\n";
	$failures += $ok ? 0 : 1;
};

// 1. The site name, as WordPress returns it.
$json = \SGS\Blocks\Sgs_Schema::encode_jsonld( array( '@type' => 'Organization', 'name' => 'Mama&#039;s Munches' ) );
$check( 'an apostrophe entity in the name prints as an apostrophe', "Mama's Munches" === ( json_decode( (string) $json, true )['name'] ?? '' ) && false === strpos( (string) $json, '#039' ), (string) $json );

// 2. Nested values, ampersand and quote entities, a breadcrumb label that was escaped for HTML.
$json = \SGS\Blocks\Sgs_Schema::encode_jsonld(
	array(
		'itemListElement' => array(
			array( 'name' => 'Tea &amp; Cake' ),
			array( 'name' => 'The &quot;best&quot; &lt;box&gt;' ),
		),
	)
);
$back = json_decode( (string) $json, true );
$check( 'nested ampersand entity decodes', 'Tea & Cake' === ( $back['itemListElement'][0]['name'] ?? '' ) );
$check( 'quote and angle entities decode and the tag stays escaped', 'The "best" <box>' === ( $back['itemListElement'][1]['name'] ?? '' ) && false === strpos( (string) $json, '<' ) );

// 3. A value that was never encoded is untouched, and non-strings keep their type.
$back = json_decode( (string) \SGS\Blocks\Sgs_Schema::encode_jsonld( array( 'name' => 'Plain £5', 'price' => 5, 'ok' => true ) ), true );
$check( 'plain text, numbers and booleans are unchanged', 'Plain £5' === $back['name'] && 5 === $back['price'] && true === $back['ok'] );

// 4. Detector: every ld+json printer encodes through Sgs_Schema.
$root  = dirname( __DIR__, 2 );
$bad   = array();
$count = 0;
$iter  = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $root, FilesystemIterator::SKIP_DOTS ) );
foreach ( $iter as $file ) {
	$path = str_replace( '\\', '/', $file->getPathname() );
	if ( 'php' !== $file->getExtension() || preg_match( '#/(node_modules|build|vendor|tests|scripts)/#', $path ) ) {
		continue;
	}
	$src = (string) file_get_contents( $path );
	if ( false === strpos( $src, 'application/ld+json' ) || str_ends_with( $path, 'class-sgs-schema.php' ) ) {
		continue;
	}
	++$count;
	$uses_shared = false !== strpos( $src, 'Sgs_Schema::' );
	$direct      = (bool) preg_match( '/json_encode\(\s*\$(schema|faq|json_ld|data|graph)\w*\s*[,)]/', $src );
	if ( ! $uses_shared || $direct ) {
		$bad[] = substr( $path, strlen( $root ) + 1 );
	}
}
$check( 'every file that prints ld+json encodes through Sgs_Schema (' . $count . ' files)', array() === $bad && $count > 8, implode( ', ', $bad ) );

echo "\n==== " . ( $total - $failures ) . ' of ' . $total . ' checks passed (' . $failures . " failed) ====\n";
exit( $failures > 0 ? 1 : 0 );
