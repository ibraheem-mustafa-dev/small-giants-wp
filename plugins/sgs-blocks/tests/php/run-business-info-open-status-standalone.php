<?php
/**
 * Standalone runner for sgs/business-info's `open-status` display type and the `map` source setting.
 *
 * Renders the REAL render.php through the QA harness (scripts/qa/lib/render-css-harness.php) in a child
 * process, with Site Info supplied through SGS_QA_OPTIONS, and asserts:
 *  - open-status: the neutral server fallback (the stored hours as text, the pill hidden), the data-config
 *    the view module reads (time zone, hours, wording), the colour custom properties, no inline style, and
 *    nothing rendered when Site Info holds no hours;
 *  - map: `address` (and an unset mapSource) builds the same iframe as before, `business` searches the
 *    business name plus the address and falls back to the address with no name;
 *  - negative control: every pre-existing display type renders byte-identically to the golden output
 *    captured from the previous render.php (tests/php/fixtures/business-info-before.json).
 *
 * Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-business-info-open-status-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
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
 * Render the block in a child process.
 *
 * @param array<string,mixed> $attrs Block attributes.
 * @param array<string,mixed> $site  Site Info store.
 * @return array{html:string,css:string}
 */
function render( array $attrs, array $site ): array {
	$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
	$file    = tempnam( sys_get_temp_dir(), 'sgsbi' );
	file_put_contents( $file, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
	putenv( 'SGS_QA_OPTIONS=' . json_encode( array( 'sgs_site_info' => $site ) ) );
	$cmd = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug sgs/business-info --attrs-file ' . escapeshellarg( $file );
	// --write-golden captures the previous render.php, copied beside the current one as render-before.php.
	if ( false !== getenv( 'SGS_BI_RENDER_FILE' ) ) {
		$cmd .= ' --render-file ' . escapeshellarg( (string) getenv( 'SGS_BI_RENDER_FILE' ) );
	}
	$cmd .= ' 2>&1';
	$out = (string) shell_exec( $cmd );
	unlink( $file );
	putenv( 'SGS_QA_OPTIONS' );
	$decoded = json_decode( $out, true );
	if ( ! is_array( $decoded ) || empty( $decoded['ok'] ) ) {
		echo "HARNESS ERROR: $out\n";
		return array( 'html' => '', 'css' => '' );
	}
	return array( 'html' => (string) $decoded['html'], 'css' => (string) $decoded['css'] );
}

$site = array(
	'phone'         => '0121 000 0000',
	'email'         => 'hello@example.test',
	'address'       => '644 Washwood Heath Rd<br>Birmingham B8 2HQ',
	'business_name' => 'Eye Care Test',
	'tagline'       => 'Looking after your eyes',
	'copyright'     => 'Eye Care Test Ltd',
	'maps_cid'      => '1234567890',
	'socials'       => array( 'facebook' => 'https://facebook.com/example' ),
	'opening_hours' => array(
		'mon' => '9:30am-5pm',
		'tue' => '9:30am-5pm',
		'wed' => '9:30am-5pm',
		'thu' => '9:30am-5pm',
		'fri' => '09:30-12:00, 14:30-17:00',
		'sat' => '10-14',
		'sun' => 'Closed',
	),
);

// ---------------------------------------------------------------------------
// open-status
// ---------------------------------------------------------------------------

$os = render( array( 'displayType' => 'open-status' ), $site );
ok( str_contains( $os['html'], 'data-sgs-open-status' ), 'open-status: the root carries the view-module hook' );
ok( str_contains( $os['html'], '<p class="sgs-open-status__pill" hidden>' ), 'open-status: the pill is hidden until the view module has worked out the status' );
ok( str_contains( $os['html'], '<p class="sgs-open-status__line">Mon' ), 'open-status: the fallback line is the stored hours as plain text' );
ok( ! str_contains( $os['html'], ' style="' ), 'open-status: no inline style attribute' );
ok( ! str_contains( $os['html'], 'aria-live' ) && ! str_contains( $os['html'], 'role="status"' ), 'open-status: no live region, so nothing is announced repeatedly' );

preg_match( '/data-config="([^"]*)"/', $os['html'], $m );
$config = json_decode( html_entity_decode( $m[1] ?? '' ), true );
ok( is_array( $config ), 'open-status: data-config is valid JSON' );
ok( 'UTC' === ( $config['timezone'] ?? null ), 'open-status: the time zone is wp_timezone_string() (UTC where the harness has no WordPress)' );
ok( '9:30am-5pm' === ( $config['hours']['mon'] ?? null ) && 'Closed' === ( $config['hours']['sun'] ?? null ), 'open-status: all seven stored days travel in the config' );
ok( 'Open now' === ( $config['labels']['open'] ?? null ) && 'Closed' === ( $config['labels']['closed'] ?? null ), 'open-status: default pill wording' );
ok( 'Closes at' === ( $config['labels']['closes'] ?? null ) && 'Opens at' === ( $config['labels']['opens'] ?? null ) && 'Closed until' === ( $config['labels']['reopens'] ?? null ), 'open-status: default time wording' );
ok( 7 === count( $config['labels']['days'] ?? array() ), 'open-status: seven localised weekday names' );
ok( true === ( $config['showLine'] ?? null ), 'open-status: the line shows by default' );

$custom = render(
	array(
		'displayType'                => 'open-status',
		'openStatusOpenLabel'        => 'We are open',
		'openStatusClosesLabel'      => 'Shutting at',
		'openStatusShowLine'         => false,
		'openStatusOpenDot'          => '#00ff00',
		'openStatusClosedDot'        => '#ff0000',
		'openStatusOpenBackground'   => '#112233',
		'openStatusClosedText'       => '#445566',
	),
	$site
);
preg_match( '/data-config="([^"]*)"/', $custom['html'], $m );
$custom_config = json_decode( html_entity_decode( $m[1] ?? '' ), true );
ok( 'We are open' === ( $custom_config['labels']['open'] ?? null ) && 'Shutting at' === ( $custom_config['labels']['closes'] ?? null ), 'open-status: custom wording reaches the config' );
ok( false === ( $custom_config['showLine'] ?? null ), 'open-status: showLine off reaches the config' );
ok( str_contains( $custom['css'], '--sgs-os-open-dot:#00ff00' ) && str_contains( $custom['css'], '--sgs-os-closed-dot:#ff0000' ), 'open-status: dot colours become custom properties' );
ok( str_contains( $custom['css'], '--sgs-os-open-bg:#112233' ) && str_contains( $custom['css'], '--sgs-os-closed-text:#445566' ), 'open-status: pill colours become custom properties' );
ok( ! str_contains( $os['css'], '--sgs-os-' ), 'open-status: with no colour set no custom property is emitted' );

$empty = render( array( 'displayType' => 'open-status' ), array_merge( $site, array( 'opening_hours' => array() ) ) );
ok( '' === trim( $empty['html'] ), 'open-status: an empty hours setting renders nothing on the frontend' );

// ---------------------------------------------------------------------------
// map
// ---------------------------------------------------------------------------

function map_src( string $html ): string {
	preg_match( '/<iframe src="([^"]*)"/', $html, $m );
	return html_entity_decode( $m[1] ?? '' );
}

$default_map = render( array( 'displayType' => 'map' ), $site );
$address_map = render( array( 'displayType' => 'map', 'mapSource' => 'address' ), $site );
$expected    = 'https://maps.google.com/maps?q=' . rawurlencode( '644 Washwood Heath Rd, Birmingham B8 2HQ' ) . '&z=15&hl=en&t=m&output=embed&iwloc=near';
ok( $expected === map_src( $default_map['html'] ), 'map: the default source embeds the address search exactly as before' );
// The instance class hashes the attributes, so compare with it stripped.
$strip_uid = static fn( string $html ): string => (string) preg_replace( '/sgs-biz-[0-9a-f]{8}/', 'sgs-biz-x', $html );
ok( $strip_uid( $default_map['html'] ) === $strip_uid( $address_map['html'] ), 'map: an explicit address source renders the same markup as the default' );
ok( str_contains( $default_map['html'], 'loading="lazy"' ) && str_contains( $default_map['html'], 'title="Business location map"' ), 'map: lazy loading and the title attribute are kept' );

$business_map = render( array( 'displayType' => 'map', 'mapSource' => 'business' ), $site );
$expected_biz = 'https://maps.google.com/maps?q=' . rawurlencode( 'Eye Care Test, 644 Washwood Heath Rd, Birmingham B8 2HQ' ) . '&z=15&hl=en&t=m&output=embed&iwloc=near';
ok( $expected_biz === map_src( $business_map['html'] ), 'map: the business source searches business name plus address' );
ok( ! str_contains( map_src( $business_map['html'] ), 'goo.gl' ) && ! str_contains( map_src( $business_map['html'] ), 'share.google' ), 'map: no short link is embedded' );

$no_name = array_diff_key( $site, array( 'business_name' => 1 ) );
$fallback_map = render( array( 'displayType' => 'map', 'mapSource' => 'business' ), $no_name );
ok( str_contains( map_src( $fallback_map['html'] ), rawurlencode( '644 Washwood Heath Rd, Birmingham B8 2HQ' ) ), 'map: the business source still embeds the address when no business name resolves' );

$no_address = array_diff_key( $site, array( 'address' => 1 ) );
ok( '' === trim( render( array( 'displayType' => 'map' ), $no_address )['html'] ), 'map: the address source with no address renders nothing' );

// ---------------------------------------------------------------------------
// Negative control: the previous display types are byte-identical.
// ---------------------------------------------------------------------------

$golden_file = __DIR__ . '/fixtures/business-info-before.json';
$samples     = array(
	'phone'                  => array( 'displayType' => 'phone' ),
	'email'                  => array( 'displayType' => 'email', 'textColour' => '#123456' ),
	'address'                => array( 'displayType' => 'address', 'addressLink' => true ),
	'hours'                  => array( 'displayType' => 'hours' ),
	'hours-condensed'        => array( 'displayType' => 'hours', 'hoursLayout' => 'condensed', 'hoursShowClosed' => true ),
	'socials'                => array( 'displayType' => 'socials' ),
	'copyright'              => array( 'displayType' => 'copyright' ),
	'description'            => array( 'displayType' => 'description' ),
	'map'                    => array( 'displayType' => 'map' ),
	'attribution'            => array( 'displayType' => 'attribution' ),
);
if ( '--write-golden' === ( $argv[1] ?? '' ) ) {
	putenv( 'SGS_BI_RENDER_FILE=' . dirname( __DIR__, 2 ) . '/src/blocks/business-info/render-before.php' );
	$out = array();
	foreach ( $samples as $name => $attrs ) {
		$out[ $name ] = render( $attrs, $site );
	}
	file_put_contents( $golden_file, json_encode( $out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . "\n" );
	echo 'golden written: ' . count( $out ) . " samples\n";
	exit( 0 );
}
$golden = json_decode( (string) file_get_contents( $golden_file ), true );
ok( is_array( $golden ) && count( $golden ) === count( $samples ), 'golden fixture lists every sampled display type' );
foreach ( $samples as $name => $attrs ) {
	$now = render( $attrs, $site );
	ok( '' !== $now['html'] && isset( $golden[ $name ] ) && $golden[ $name ] === $now, "unchanged: displayType sample '$name' renders byte-identically (html and css)" );
}

echo "\n$pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );
