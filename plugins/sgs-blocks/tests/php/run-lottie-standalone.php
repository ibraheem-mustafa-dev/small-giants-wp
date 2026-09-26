<?php
/**
 * Standalone tests for U-17, the Lottie player
 * (`.claude/reports/2026-09-26-u17-lottie-design.md`).
 *
 * Exercises the REAL shipped code — `includes/lottie-upload.php`'s
 * validator (`sgs_lottie_validate_document()` / `sgs_lottie_read_and_validate()`)
 * and `includes/lottie-render.php`'s `sgs_render_lottie()` — against a set of
 * WordPress function stubs, so a change to either file is a change to what
 * this test exercises (same technique as
 * `run-media-atom-shadow-hover-standalone.php`).
 *
 * Coverage: every validator-rejection case §3.4/§6 names (null/empty are the
 * negative-control pair — AM LottiePlayer's own `is_lottie_valid()` accepts
 * them, which this test proves the SGS validator does not), the render
 * function's poster/aria/no-inline-style/separated-pause-control contract,
 * and a NEGATIVE CONTROL that swaps in the AM-style defective guard and
 * shows the null case going red.
 *
 *   php plugins/sgs-blocks/tests/php/run-lottie-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

// ---------------------------------------------------------------------------
// Minimal WordPress function stubs — just enough for the two real files
// under test to load and run their own logic unmodified.
// ---------------------------------------------------------------------------

if ( ! function_exists( 'current_user_can' ) ) {
	function current_user_can( string $cap ): bool { // phpcs:ignore
		return true;
	}
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $url ): string {
		return htmlspecialchars( (string) $url, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'esc_attr__' ) ) {
	function esc_attr__( string $text, string $domain = 'default' ): string {
		return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( '__' ) ) {
	function __( string $text, string $domain = 'default' ): string {
		return $text;
	}
}
if ( ! function_exists( 'wp_parse_args' ) ) {
	function wp_parse_args( $args, array $defaults = array() ): array {
		return array_merge( $defaults, (array) $args );
	}
}
if ( ! function_exists( 'add_filter' ) ) {
	function add_filter( ...$args ): bool { // phpcs:ignore
		return true;
	}
}
if ( ! function_exists( 'add_action' ) ) {
	function add_action( ...$args ): bool { // phpcs:ignore
		return true;
	}
}

/** In-memory attachment fixtures the get_post_meta / wp_get_attachment_url stubs read. */
$GLOBALS['sgs_test_attachments'] = array();

if ( ! function_exists( 'get_post_mime_type' ) ) {
	function get_post_mime_type( int $id ) {
		return $GLOBALS['sgs_test_attachments'][ $id ]['mime'] ?? false;
	}
}
if ( ! function_exists( 'get_post_meta' ) ) {
	function get_post_meta( int $id, string $key, bool $single = false ) {
		return $GLOBALS['sgs_test_attachments'][ $id ]['meta'][ $key ] ?? '';
	}
}
if ( ! function_exists( 'update_post_meta' ) ) {
	function update_post_meta( int $id, string $key, $value ): bool {
		$GLOBALS['sgs_test_attachments'][ $id ]['meta'][ $key ] = $value;
		return true;
	}
}
if ( ! function_exists( 'wp_get_attachment_url' ) ) {
	function wp_get_attachment_url( int $id ) {
		return $GLOBALS['sgs_test_attachments'][ $id ]['url'] ?? false;
	}
}
if ( ! function_exists( 'get_attached_file' ) ) {
	function get_attached_file( int $id ) {
		return $GLOBALS['sgs_test_attachments'][ $id ]['path'] ?? false;
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/lottie-upload.php';
require_once dirname( __DIR__, 2 ) . '/includes/lottie-render.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-media-element.php';
require_once dirname( __DIR__, 2 ) . '/includes/media/atoms/video-behaviour.php';
require_once dirname( __DIR__, 2 ) . '/includes/media/atoms/source.php';

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

// ---------------------------------------------------------------------------
// Fixture builders.
// ---------------------------------------------------------------------------

/**
 * A minimal, valid Lottie/Bodymovin document.
 */
function sgs_test_minimal_lottie(): array {
	return array(
		'v'      => '5.5.2',
		'fr'     => 30,
		'ip'     => 0,
		'op'     => 60,
		'w'      => 512,
		'h'      => 512,
		'nm'     => 'Test',
		'layers' => array(
			array(
				'ty' => 4,
				'nm' => 'Shape Layer 1',
			),
		),
	);
}

/**
 * Write a fixture array to a temp file and return the path. Caller unlinks.
 */
function sgs_test_write_temp( string $contents ): string {
	$path = tempnam( sys_get_temp_dir(), 'sgs-lottie-test-' );
	file_put_contents( $path, $contents );
	return $path;
}

// ---------------------------------------------------------------------------
// A — sgs_lottie_validate_document() (in-memory decoded documents).
// ---------------------------------------------------------------------------

ok(
	true === sgs_lottie_validate_document( sgs_test_minimal_lottie() ),
	'validator: a valid minimal Lottie document passes'
);

// NEGATIVE CONTROL PAIR — the specific defect this validator avoids (AM
// LottiePlayer's own is_lottie_valid() accepts null/[] because its `&&`
// short-circuits before any key check runs).
ok( false === sgs_lottie_validate_document( null ), 'validator: null is REJECTED (negative control)' );
ok( false === sgs_lottie_validate_document( array() ), 'validator: [] is REJECTED (negative control)' );

$missing_key = sgs_test_minimal_lottie();
unset( $missing_key['fr'] );
ok( false === sgs_lottie_validate_document( $missing_key ), 'validator: missing required key (fr) is rejected' );

$missing_layers = sgs_test_minimal_lottie();
unset( $missing_layers['layers'] );
ok( false === sgs_lottie_validate_document( $missing_layers ), 'validator: missing layers key is rejected' );

$empty_layers           = sgs_test_minimal_lottie();
$empty_layers['layers'] = array();
ok( false === sgs_lottie_validate_document( $empty_layers ), 'validator: empty layers array is rejected' );

$non_lottie_json = array(
	'foo' => 'bar',
	'baz' => 42,
);
ok( false === sgs_lottie_validate_document( $non_lottie_json ), 'validator: a non-Lottie JSON object is rejected' );

$external_asset           = sgs_test_minimal_lottie();
$external_asset['assets'] = array(
	array(
		'p' => 'img_0.png',
		'u' => 'https://evil.example/',
	),
);
ok( false === sgs_lottie_validate_document( $external_asset ), 'validator: assets[].u pointing at an external URL is rejected' );

$traversal_asset           = sgs_test_minimal_lottie();
$traversal_asset['assets'] = array(
	array(
		'p' => '../../etc/passwd',
		'u' => '',
	),
);
ok( false === sgs_lottie_validate_document( $traversal_asset ), 'validator: assets[].p with a leading ".." is rejected' );

$slash_asset           = sgs_test_minimal_lottie();
$slash_asset['assets'] = array(
	array(
		'p' => 'sub/dir/img.png',
		'u' => '',
	),
);
ok( false === sgs_lottie_validate_document( $slash_asset ), 'validator: assets[].p containing "/" is rejected' );

$colon_asset           = sgs_test_minimal_lottie();
$colon_asset['assets'] = array(
	array(
		'p' => 'file:img.png',
		'u' => '',
	),
);
ok( false === sgs_lottie_validate_document( $colon_asset ), 'validator: assets[].p containing ":" is rejected' );

$bad_data_uri           = sgs_test_minimal_lottie();
$bad_data_uri['assets'] = array(
	array(
		'p' => 'data:application/octet-stream;base64,AAAA',
		'u' => '',
	),
);
ok( false === sgs_lottie_validate_document( $bad_data_uri ), 'validator: a non-image data URI in assets[].p is rejected' );

$good_data_uri           = sgs_test_minimal_lottie();
$good_data_uri['assets'] = array(
	array(
		'p' => 'data:image/png;base64,iVBORw0KGgo=',
		'u' => '',
	),
);
ok( true === sgs_lottie_validate_document( $good_data_uri ), 'validator: a valid image data URI in assets[].p passes' );

$good_bare_asset           = sgs_test_minimal_lottie();
$good_bare_asset['assets'] = array(
	array(
		'p' => 'img_0.png',
		'u' => '',
	),
);
ok( true === sgs_lottie_validate_document( $good_bare_asset ), 'validator: a bare, safe assets[].p filename passes' );

// ---------------------------------------------------------------------------
// B — sgs_lottie_read_and_validate() (file-on-disk path: size + decode gates).
// ---------------------------------------------------------------------------

$valid_path = sgs_test_write_temp( wp_json_encode_stub( sgs_test_minimal_lottie() ) );
ok( null !== sgs_lottie_read_and_validate( $valid_path ), 'read_and_validate: a real valid file on disk passes' );
unlink( $valid_path );

$non_json_path = sgs_test_write_temp( 'this is not { json at all' );
ok( null === sgs_lottie_read_and_validate( $non_json_path ), 'read_and_validate: non-JSON content is rejected' );
unlink( $non_json_path );

$oversize_doc            = sgs_test_minimal_lottie();
$oversize_doc['padding'] = str_repeat( 'x', SGS_LOTTIE_MAX_BYTES + 1024 );
$oversize_path           = sgs_test_write_temp( wp_json_encode_stub( $oversize_doc ) );
ok( null === sgs_lottie_read_and_validate( $oversize_path ), 'read_and_validate: a file over 512 KB is rejected' );
unlink( $oversize_path );

// Deep nesting — 80 levels, past json_decode()'s own depth argument (64).
$deep = '0';
for ( $i = 0; $i < 80; $i++ ) {
	$deep = '[' . $deep . ']';
}
$deep_json = '{"v":"5.5.2","fr":30,"ip":0,"op":60,"w":512,"h":512,"layers":[{"ty":4}],"deep":' . $deep . '}';
$deep_path = sgs_test_write_temp( $deep_json );
ok( null === sgs_lottie_read_and_validate( $deep_path ), 'read_and_validate: deeply nested (depth > 64) JSON is rejected' );
unlink( $deep_path );

$empty_path = sgs_test_write_temp( '' );
ok( null === sgs_lottie_read_and_validate( $empty_path ), 'read_and_validate: an empty file is rejected' );
unlink( $empty_path );

/**
 * A tiny wp_json_encode() stand-in — this harness never loads WP core.
 */
function wp_json_encode_stub( array $data ): string {
	return (string) json_encode( $data ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode
}

// ---------------------------------------------------------------------------
// C — sgs_render_lottie().
// ---------------------------------------------------------------------------

$GLOBALS['sgs_test_attachments'][501] = array(
	'mime' => 'application/json',
	'url'  => 'https://example.test/wp-content/uploads/2026/09/buck-logo.json',
	'meta' => array(
		'_sgs_lottie_meta' => array(
			'w'        => 400,
			'h'        => 200,
			'fr'       => 30,
			'ip'       => 0,
			'op'       => 90,
			'duration' => 3.0,
		),
	),
);

$result = sgs_render_lottie(
	501,
	array(
		'poster_html' => '<img src="poster.jpg" alt="" />',
		'alt'         => 'buck logo animation',
		'trigger'     => 'visible',
		'loop'        => false,
		'speed'       => 1,
	)
);

ok( false !== strpos( $result['wrapper'], 'data-sgs-fx="lottie"' ), 'render: wrapper carries data-sgs-fx="lottie"' );
ok( false !== strpos( $result['wrapper'], '<img src="poster.jpg" alt="" />' ), 'render: poster markup is present inside the wrapper' );
ok( false !== strpos( $result['wrapper'], 'aria-label="buck logo animation"' ), 'render: a real alt produces role="img" + aria-label' );
ok( false === strpos( $result['wrapper'], 'style=' ), 'render: no inline style="…" attribute (Spec 32)' );

$decorative = sgs_render_lottie( 501, array( 'poster_html' => '<img src="p.jpg" alt="" />' ) );
ok( false !== strpos( $decorative['wrapper'], 'aria-hidden="true"' ), 'render: empty alt renders aria-hidden="true"' );
ok( false === strpos( $decorative['wrapper'], 'role="img"' ), 'render: decorative instance carries no role="img"' );

// duration 3.0s, loop off -> under the 5s WCAG 2.2.2 threshold -> no pause control.
ok( '' === $decorative['pause'], 'render: a short, non-looping animation needs no pause control' );

$looping = sgs_render_lottie(
	501,
	array(
		'poster_html' => '<img src="p.jpg" alt="" />',
		'loop'        => true,
	)
);
ok( '' !== $looping['pause'], 'render: a looping animation carries a separate pause control' );
ok( false !== strpos( $looping['pause'], '<button' ), 'render: the pause control is a real <button>' );
ok( false === strpos( $looping['wrapper'], '<button' ), 'render: the pause control is NOT nested inside the wrapper (council fix 4)' );
ok( false === strpos( $looping['pause'], 'style=' ), 'render: the pause control carries no inline style either' );

// No valid meta -> poster only, fail closed.
$GLOBALS['sgs_test_attachments'][502] = array(
	'mime' => 'application/json',
	'url'  => 'https://example.test/wp-content/uploads/2026/09/no-meta.json',
	'meta' => array(),
);
$no_meta                              = sgs_render_lottie( 502, array( 'poster_html' => '<img src="fallback.jpg" alt="" />' ) );
ok(
	'<img src="fallback.jpg" alt="" />' === $no_meta['wrapper'],
	'render: an attachment with no valid meta renders the poster ONLY (fail closed)'
);
ok( '' === $no_meta['pause'], 'render: no-meta attachment carries no pause control' );

// Non-attachment / wrong mime -> poster only.
$GLOBALS['sgs_test_attachments'][503] = array( 'mime' => 'image/jpeg' );
$wrong_mime                           = sgs_render_lottie( 503, array( 'poster_html' => '<img src="wrong.jpg" alt="" />' ) );
ok(
	'<img src="wrong.jpg" alt="" />' === $wrong_mime['wrapper'],
	'render: a non-Lottie attachment id renders the poster only'
);

$aspect_css = sgs_lottie_aspect_ratio_css( 501 );
ok( in_array( '--sgs-lottie-aspect-ratio:400 / 200', $aspect_css, true ), 'render: aspect-ratio custom property derived from stored w/h' );
ok( ! preg_grep( '/;\s*$/', $aspect_css ), 'render: css() declarations carry no trailing semicolon' );

// ---------------------------------------------------------------------------
// E — sgs_media_atom_video_behaviour_resolve_lottie() (U-17, design §3.1)
// reject-to-default guard for LottieTrigger/LottieSpeed, and the negative
// control proving that guard is load-bearing.
// ---------------------------------------------------------------------------

$valid_lottie_attrs = array(
	'lottieTrigger' => 'hover',
	'lottieSpeed'   => 2.5,
	'videoLoop'     => true,
);
$valid_resolved     = sgs_media_atom_video_behaviour_resolve_lottie( $valid_lottie_attrs, '', 'sgs/media' );
ok( 'hover' === $valid_resolved['trigger'], 'resolve_lottie: an in-vocabulary trigger passes through' );
ok( 2.5 === $valid_resolved['speed'], 'resolve_lottie: an in-range speed passes through' );
ok( true === $valid_resolved['loop'], 'resolve_lottie: VideoLoop is reused (not a separate Lottie-only attribute)' );

$bad_trigger_attrs = array(
	'lottieTrigger' => 'autoplay-immediately', // not in the enum.
	'lottieSpeed'   => 1,
);
$bad_trigger_resolved = sgs_media_atom_video_behaviour_resolve_lottie( $bad_trigger_attrs, '', 'sgs/media' );
ok( 'visible' === $bad_trigger_resolved['trigger'], 'resolve_lottie: an out-of-vocabulary trigger REJECTS to the default (visible)' );

$bad_speed_attrs_low  = array(
	'lottieTrigger' => 'load',
	'lottieSpeed'   => 0.1, // below the 0.25 floor.
);
$bad_speed_attrs_high = array(
	'lottieTrigger' => 'load',
	'lottieSpeed'   => 5, // above the 3 ceiling.
);
ok(
	1.0 === sgs_media_atom_video_behaviour_resolve_lottie( $bad_speed_attrs_low, '', 'sgs/media' )['speed'],
	'resolve_lottie: a below-range speed REJECTS to the default (1.0)'
);
ok(
	1.0 === sgs_media_atom_video_behaviour_resolve_lottie( $bad_speed_attrs_high, '', 'sgs/media' )['speed'],
	'resolve_lottie: an above-range speed REJECTS to the default (1.0)'
);

// NEGATIVE CONTROL — reproduce the shape this guard exists to avoid: no
// reject-to-default at all, an out-of-vocabulary/out-of-range value simply
// passes straight through to the renderer, which is exactly the "wrong
// keyword painted no CSS at all, silently" failure class this population's
// other atoms (box-shape/svg-presentation/etc.) already guard against.
function sgs_test_naive_resolve_lottie( array $attrs ): array {
	return array(
		'trigger' => $attrs['lottieTrigger'] ?? 'visible',
		'loop'    => ! empty( $attrs['videoLoop'] ),
		'speed'   => isset( $attrs['lottieSpeed'] ) ? (float) $attrs['lottieSpeed'] : 1.0,
	);
}
$naive_bad_trigger = sgs_test_naive_resolve_lottie( $bad_trigger_attrs );
$naive_bad_speed   = sgs_test_naive_resolve_lottie( $bad_speed_attrs_high );

echo "\n-- negative control: an unguarded resolver reproduced on this test's own data --\n";
ok(
	'autoplay-immediately' === $naive_bad_trigger['trigger'],
	'negative control: the unguarded resolver WRONGLY lets an out-of-vocabulary trigger through (defect reproduced)'
);
ok(
	5.0 === $naive_bad_speed['speed'],
	'negative control: the unguarded resolver WRONGLY lets an out-of-range speed through (defect reproduced)'
);
echo "-- if a future edit made the REAL resolver use this shape, the two PASS asserts\n";
echo "   above would become the real resolver's own answer, and this run's earlier\n";
echo "   'rejects to visible'/'rejects to 1.0' PASSES would flip to FAIL. --\n\n";

// Prove those two are, TODAY, exercising the REAL guarded function and not
// this unguarded stand-in, by asserting they disagree.
ok(
	sgs_media_atom_video_behaviour_resolve_lottie( $bad_trigger_attrs, '', 'sgs/media' )['trigger'] !== $naive_bad_trigger['trigger'],
	'negative control: the REAL resolver disagrees with the unguarded one on a bad trigger (real guard wins)'
);
ok(
	sgs_media_atom_video_behaviour_resolve_lottie( $bad_speed_attrs_high, '', 'sgs/media' )['speed'] !== $naive_bad_speed['speed'],
	'negative control: the REAL resolver disagrees with the unguarded one on a bad speed (real guard wins)'
);

// ---------------------------------------------------------------------------
// F — sgs_media_atom_source_resolve_type() (U-17, design §3.1) now accepts
// 'lottie' in its vocabulary, and still rejects everything outside the
// 4-member enum to the 'image' default (negative control: a 5th bogus type).
// ---------------------------------------------------------------------------

ok(
	'lottie' === sgs_media_atom_source_resolve_type( array( 'mediaType' => 'lottie' ), '', 'sgs/media' ),
	'source atom: mediaType "lottie" resolves to "lottie" (not rejected)'
);
ok(
	'image' === sgs_media_atom_source_resolve_type( array( 'mediaType' => 'gif-sprite' ), '', 'sgs/media' ),
	'source atom: an out-of-vocabulary mediaType still REJECTS to "image" (negative control — the vocab widening did not open the gate)'
);

// ---------------------------------------------------------------------------
// D — NEGATIVE CONTROL: the AM LottiePlayer defect, reproduced and shown red.
// ---------------------------------------------------------------------------
//
// AM LottiePlayer's own `is_lottie_valid()` has the shape:
// if ( $data && missing_required_key( $data ) ) { return false; }
// return true;
// The `&&` short-circuits on a falsy `$data` (null, [], 0, '') BEFORE the key
// check ever runs, so every falsy input silently "passes". This is the exact
// defect `sgs_lottie_validate_document()` exists to avoid (its own guard is
// `if ( ! is_array( $data ) || empty( $data ) ) { return false; }`, checked
// FIRST, unconditionally).

function sgs_test_am_style_validate_document( $data ): bool {
	// Deliberately reproduces the defective shape — DO NOT use this pattern
	// anywhere real.
	if ( $data && ! isset( $data['fr'] ) ) {
		return false;
	}
	return true;
}

$am_null_result  = sgs_test_am_style_validate_document( null );
$am_empty_result = sgs_test_am_style_validate_document( array() );

echo "\n-- negative control: AM-style guard reproduced on this test's own data --\n";
ok(
	true === $am_null_result,
	'negative control: the AM-style guard WRONGLY accepts null (defect reproduced)'
);
ok(
	true === $am_empty_result,
	'negative control: the AM-style guard WRONGLY accepts [] (defect reproduced)'
);
echo "-- if a future edit made the REAL validator use this shape, the two PASS asserts\n";
echo "   above would become the real validator's own answer, and this run's earlier\n";
echo "   'validator: null is REJECTED' / 'validator: [] is REJECTED' PASSES would flip to FAIL. --\n\n";

// Prove those two are, TODAY, exercising the REAL function and not this
// broken stand-in, by asserting they disagree.
ok(
	sgs_lottie_validate_document( null ) !== $am_null_result,
	'negative control: the REAL validator disagrees with the AM-style guard on null (real guard wins)'
);
ok(
	sgs_lottie_validate_document( array() ) !== $am_empty_result,
	'negative control: the REAL validator disagrees with the AM-style guard on [] (real guard wins)'
);

echo "\n$pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );
