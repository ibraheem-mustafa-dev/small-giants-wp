<?php
/**
 * Standalone test for the `lottie-logo` migration mapper (Spec 38A FR-38A-31, FR-38A-52; build unit M5.14).
 *
 * Loads the REAL mapper, the real runner and the shipped `schemas/motion.schema.json`. WordPress is not loaded;
 * `parse_blocks`, `serialize_block_attributes` and `get_post_meta` are minimal stand-ins.
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-map-lottie-logo-standalone.php
 *
 * What it proves: the logo's Lottie substrate becomes a `lottie` layer in `effects` on the wrapper part with the stored
 * file, trigger, loop, speed and the pause control the old render printed; each `animationStyle` becomes a `draw` layer
 * (`entrance.text` for load and scroll, `effects` for hover) carrying the SVG as `asset`; the other substrate's
 * attributes are consumed and reported inert; invalid triggers and out-of-range speeds fall back as the old render did;
 * `sgs/media` gets a `lottie` layer on its media part plus `mediaType: lottie`, and keeps the shared `videoLoop`; every
 * fragment survives the shipped schema untouched; a second run changes nothing.
 *
 * Planted faults (each must turn the run red; the run then exits 1). The fault is written into a TEMPORARY COPY of the
 * code under test and the test is run against the copy, so nothing in the repository changes.
 *   SGS_MOTION_LOTTIE_LOGO_PLANT=trigger-default  the logo's fallback trigger becomes visible
 *   SGS_MOTION_LOTTIE_LOGO_PLANT=no-consume       no attribute is consumed
 *   SGS_MOTION_LOTTIE_LOGO_PLANT=hover-list       a hover draw goes in entrance.text
 *   SGS_MOTION_LOTTIE_LOGO_PLANT=loop-pause       a loop no longer gets the pause control
 *   SGS_MOTION_LOTTIE_LOGO_PLANT=speed-range      any speed is stored
 *   SGS_MOTION_LOTTIE_LOGO_PLANT=media-type       media no longer gets mediaType lottie
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {

	$plant = (string) getenv( 'SGS_MOTION_LOTTIE_LOGO_PLANT' );
	if ( '' !== $plant ) {
		exit( sgs_lottie_logo_run_planted( $plant ) );
	}

	/**
	 * Copy the code under test into a temp tree, plant the fault there and run this test against the copy.
	 */
	function sgs_lottie_logo_run_planted( string $plant ): int {
		$plugin = dirname( __DIR__, 2 );
		$tmp    = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-lottie-logo-plant-' . bin2hex( random_bytes( 4 ) );
		$copy   = static function ( string $from, string $to ) use ( &$copy ): void {
			if ( is_dir( $from ) ) {
				mkdir( $to, 0777, true );
				foreach ( array_diff( scandir( $from ), array( '.', '..' ) ) as $entry ) {
					$copy( $from . '/' . $entry, $to . '/' . $entry );
				}
				return;
			}
			if ( ! is_dir( dirname( $to ) ) ) {
				mkdir( dirname( $to ), 0777, true );
			}
			copy( $from, $to );
		};
		$copy( $plugin . '/includes/motion', $tmp . '/includes/motion' );
		$copy( $plugin . '/schemas/motion.schema.json', $tmp . '/schemas/motion.schema.json' );
		$copy( __FILE__, $tmp . '/tests/php/run-motion-map-lottie-logo-standalone.php' );
		$faults = array(
			'trigger-default' => array( "self::LOGO  => 'load',\n\t\tself::MEDIA => 'visible',\n\t);\n\n\tconst TRIGGERS", "self::LOGO  => 'visible',\n\t\tself::MEDIA => 'visible',\n\t);\n\n\tconst TRIGGERS" ),
			'no-consume'      => array( "'consumed' => \$present,", "'consumed' => array()," ),
			'hover-list'      => array( "'hover' === \$layer['trigger'] ? 'effects' : 'entrance.text'", "'entrance.text'" ),
			'loop-pause'      => array( '( $loop || $this->runs_long( $file ) )', '( $this->runs_long( $file ) )' ),
			'speed-range'     => array( '$speed >= 0.25 && $speed <= 3 ? $speed : 1.0', '$speed >= 0.0 && $speed <= 99 ? $speed : 1.0' ),
			'media-type'      => array( "\$set['mediaType']     = 'lottie';", '' ),
		);
		if ( ! isset( $faults[ $plant ] ) ) {
			echo "Unknown plant '$plant'\n";
			return 2;
		}
		list( $from, $to ) = $faults[ $plant ];
		$path              = $tmp . '/includes/motion/migrate/mappers/class-sgs-motion-map-lottie-logo.php';
		$source            = str_replace( "\r\n", "\n", (string) file_get_contents( $path ) );
		if ( false === strpos( $source, $from ) ) {
			echo "Plant '$plant' did not apply: '$from' not found\n";
			return 2;
		}
		file_put_contents( $path, str_replace( $from, $to, $source ) );
		echo "PLANTED  $plant: '" . trim( $from ) . "' -> '" . trim( $to ) . "' in a temporary copy\n";
		putenv( 'SGS_MOTION_LOTTIE_LOGO_PLANT' );
		$out = array();
		exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $tmp . '/tests/php/run-motion-map-lottie-logo-standalone.php' ) . ' 2>&1', $out, $code );
		echo implode( "\n", array_filter( $out, static fn( $l ) => str_starts_with( $l, 'FAIL' ) || str_starts_with( $l, 'RESULT' ) ) ) . "\n";
		return $code;
	}

	define( 'ABSPATH', sys_get_temp_dir() . DIRECTORY_SEPARATOR );

	function wp_json_encode( $data, int $flags = 0 ) {
		return json_encode( $data, $flags );
	}

	function wp_attrs_json( array $attrs ): string {
		$json = json_encode( $attrs, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		return strtr( (string) $json, array( '--' => '\\u002d\\u002d', '<' => '\\u003c', '>' => '\\u003e', '&' => '\\u0026', '\\"' => '\\u0022' ) );
	}

	function serialize_block_attributes( array $attrs ): string {
		return wp_attrs_json( $attrs );
	}

	/** The stored Lottie meta, by attachment ID: 71 runs 8 seconds, 72 runs 2 seconds. */
	function get_post_meta( int $id, string $key, bool $single = false ) {
		$durations = array( 71 => 8.0, 72 => 2.0 );
		return isset( $durations[ $id ] ) ? array( 'w' => 512, 'h' => 512, 'duration' => $durations[ $id ] ) : '';
	}

	/** A minimal `parse_blocks`: comment-delimited blocks, nesting and void blocks. */
	function parse_blocks( string $content ): array {
		preg_match_all( '/<!--\s+(\/)?wp:([a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)?)\s*(\{.*?\})?\s*(\/)?-->/s', $content, $m, PREG_SET_ORDER );
		$root  = array( 'blockName' => null, 'attrs' => array(), 'innerBlocks' => array(), 'innerHTML' => '', 'innerContent' => array() );
		$stack = array( &$root );
		foreach ( $m as $t ) {
			$top  = &$stack[ count( $stack ) - 1 ];
			$name = false === strpos( $t[2], '/' ) ? 'core/' . $t[2] : $t[2];
			if ( '/' === $t[1] ) {
				$done                 = array_pop( $stack );
				$par                  = &$stack[ count( $stack ) - 1 ];
				$par['innerBlocks'][] = $done;
				continue;
			}
			$block = array( 'blockName' => $name, 'attrs' => isset( $t[3] ) && '' !== $t[3] ? json_decode( $t[3], true ) : array(), 'innerBlocks' => array(), 'innerHTML' => '', 'innerContent' => array() );
			if ( isset( $t[4] ) && '/' === $t[4] ) {
				$top['innerBlocks'][] = $block;
			} else {
				$stack[] = $block;
			}
		}
		return $root['innerBlocks'];
	}
}

namespace SGS\Blocks\Motion {

	$root = dirname( __DIR__, 2 );
	require_once $root . '/includes/motion/migrate/class-sgs-motion-migrate-runner.php';
	require_once $root . '/includes/motion/migrate/mappers/class-sgs-motion-map-lottie-logo.php';

	$pass = 0;
	$fail = 0;

	function ok( bool $cond, string $label, string $detail = '' ): void {
		global $pass, $fail;
		if ( $cond ) {
			++$pass;
			echo "PASS  $label\n";
		} else {
			++$fail;
			echo "FAIL  $label" . ( '' !== $detail ? "  => $detail" : '' ) . "\n";
		}
	}

	$mapper = new Sgs_Motion_Map_Lottie_Logo();
	$runner = new Sgs_Motion_Migrate_Runner( array( $mapper ) );
	$logo   = 'sgs/responsive-logo';
	$media  = 'sgs/media';

	/** The first block's attributes in migrated content. */
	function first_attrs( string $content ): array {
		$blocks = parse_blocks( $content );
		return $blocks[0]['attrs'] ?? array();
	}

	/** Whether the fragment survives the shipped schema untouched. */
	function survives( array $motion ): bool {
		return array() === Sgs_Motion_Migrate_Merge::differences( $motion, Sgs_Motion_Document::sanitise( $motion ) );
	}

	// 0. The family is listed and loadable; handles() is exact.
	ok( in_array( 'lottie-logo', Sgs_Motion_Migrate_Runner::families(), true ) && in_array( 'lottie-logo', Sgs_Motion_Migrate_Runner::loadable_families(), true ), 'the lottie-logo family is listed and loadable from includes/motion/migrate/mappers/' );
	ok( 'lottie-logo' === $mapper->family() && $mapper->handles( $logo, array( 'lottieId' => 5 ) ) && $mapper->handles( $media, array( 'lottieSpeed' => 2 ) ), 'handles() answers for the logo and media when they hold a family attribute' );
	ok( ! $mapper->handles( $logo, array( 'align' => 'wide' ) ), 'negative control: a logo without a family attribute is not handled' );
	ok( ! $mapper->handles( 'sgs/hero', array( 'lottieId' => 5 ) ) && ! $mapper->handles( $media, array( 'animationStyle' => 'draw-on-load' ) ), 'negative control: another block, or the logo-only attributes on media, are not handled' );

	// 1. The logo's Lottie substrate becomes a lottie layer on the wrapper.
	$map   = $mapper->map( $logo, array( 'animationSubstrate' => 'lottie', 'lottieId' => 44, 'lottieLoop' => true, 'lottieSpeed' => 1.5, 'lottieTrigger' => 'hover', 'animationStyle' => 'draw-on-load', 'svgAnimationSource' => 9 ) );
	$layer = $map['motion']['elements']['wrapper']['effects'][0] ?? array();
	ok( 'lottie' === ( $layer['effect'] ?? '' ) && 'hover' === ( $layer['trigger'] ?? '' ), 'a Lottie substrate writes a lottie layer in effects on the wrapper with the stored trigger', json_encode( $layer ) );
	ok( array( 'file' => 44, 'loop' => true, 'speed' => 1.5, 'pauseControl' => true ) === ( $layer['values'] ?? null ), 'its values are the file, loop, speed and the pause control the old render printed for a loop', json_encode( $layer['values'] ?? null ) );
	ok( 7 === count( $map['consumed'] ), 'all seven logo attributes are consumed', json_encode( $map['consumed'] ) );
	$inert = array_column( $map['reported'], 'attr' );
	sort( $inert );
	ok( array( 'animationStyle', 'svgAnimationSource' ) === $inert && ! isset( $map['motion']['elements']['wrapper']['entrance'] ), 'the SVG draw settings the Lottie substrate ignored are reported inert and make no draw layer', json_encode( $map['reported'] ) );
	ok( survives( $map['motion'] ), 'the lottie fragment survives the shipped schema untouched' );

	// 2. Each animationStyle becomes a draw layer; hover goes in effects, load and scroll in entrance.text.
	$expect = array(
		'draw-on-load'   => array( 'entrance.text', 'load' ),
		'scroll-trigger' => array( 'entrance.text', 'scroll' ),
		'hover-redraw'   => array( 'effects', 'hover' ),
	);
	foreach ( $expect as $style => list( $list, $trigger ) ) {
		$map     = $mapper->map( $logo, array( 'animationStyle' => $style, 'svgAnimationSource' => 12, 'lottieSpeed' => 2 ) );
		$wrapper = $map['motion']['elements']['wrapper'] ?? array();
		$found   = 'effects' === $list ? ( $wrapper['effects'][0] ?? array() ) : ( $wrapper['entrance']['text'][0] ?? array() );
		ok( 'draw' === ( $found['effect'] ?? '' ) && $trigger === ( $found['trigger'] ?? '' ) && array( 'asset' => 12 ) === ( $found['values'] ?? null ), "$style writes a draw layer with trigger $trigger in $list carrying asset 12", json_encode( $wrapper ) );
		ok( ( 'effects' === $list ) === ! isset( $wrapper['entrance'] ) && survives( $map['motion'] ), "$style uses only the $list list and survives the schema" );
		ok( in_array( 'lottieSpeed', array_column( $map['reported'], 'attr' ), true ) && in_array( 'lottieSpeed', $map['consumed'], true ), "$style: the Lottie settings the SVG substrate never read are consumed and reported inert" );
	}

	// 3. A style of none, an unknown style or a missing file draws nothing; the attributes are consumed alone.
	foreach ( array( array( 'animationStyle' => 'none', 'svgAnimationSource' => 12 ), array( 'animationStyle' => 'spin', 'svgAnimationSource' => 12 ), array( 'animationStyle' => 'draw-on-load' ) ) as $attrs ) {
		$map = $mapper->map( $logo, $attrs );
		ok( array() === $map['motion'] && count( $attrs ) === count( $map['consumed'] ), 'no draw is written for ' . json_encode( $attrs ), json_encode( $map ) );
	}

	// 4. Defaults and fallbacks follow the old render.
	$logo_default = $mapper->map( $logo, array( 'animationSubstrate' => 'lottie', 'lottieId' => 5, 'lottieTrigger' => 'sideways', 'lottieSpeed' => 9 ) )['motion']['elements']['wrapper']['effects'][0];
	ok( 'load' === $logo_default['trigger'] && array( 'file' => 5 ) === $logo_default['values'], 'an invalid logo trigger falls back to load and an out-of-range speed is not stored', json_encode( $logo_default ) );
	$logo_slow = $mapper->map( $logo, array( 'animationSubstrate' => 'lottie', 'lottieId' => 5, 'lottieSpeed' => 0.5 ) )['motion']['elements']['wrapper']['effects'][0];
	ok( 0.5 === $logo_slow['values']['speed'], 'a speed inside 0.25 to 3 is stored' );
	$long  = $mapper->map( $logo, array( 'animationSubstrate' => 'lottie', 'lottieId' => 71 ) )['motion']['elements']['wrapper']['effects'][0];
	$short = $mapper->map( $logo, array( 'animationSubstrate' => 'lottie', 'lottieId' => 72 ) )['motion']['elements']['wrapper']['effects'][0];
	ok( true === ( $long['values']['pauseControl'] ?? null ) && ! isset( $short['values']['pauseControl'] ), 'a non-looping file over five seconds gets the pause control, one under five does not' );
	$scroll = $mapper->map( $logo, array( 'animationSubstrate' => 'lottie', 'lottieId' => 5, 'lottieTrigger' => 'scroll', 'lottieLoop' => true ) )['motion']['elements']['wrapper']['effects'][0];
	ok( true === $scroll['values']['loop'] && ! isset( $scroll['values']['pauseControl'] ), 'a scroll-driven Lottie keeps its loop value but gets no pause control' );
	$no_file = $mapper->map( $logo, array( 'animationSubstrate' => 'lottie', 'lottieId' => 0, 'lottieLoop' => true ) );
	ok( array() === $no_file['motion'] && 3 === count( $no_file['consumed'] ), 'a Lottie substrate with no file makes no layer and the attributes are consumed' );

	// 5. sgs/media: a lottie layer on the media part, mediaType lottie, videoLoop stays.
	$map   = $mapper->map( $media, array( 'lottieId' => 7, 'lottieTrigger' => 'scroll', 'videoLoop' => true, 'lottieSpeed' => 2 ) );
	$layer = $map['motion']['elements']['media']['effects'][0] ?? array();
	ok( 'lottie' === ( $layer['effect'] ?? '' ) && 'scroll' === $layer['trigger'] && array( 'file' => 7, 'loop' => true, 'speed' => 2.0 ) === $layer['values'], 'media: lottieId, trigger, speed and the shared videoLoop become a lottie layer on the media part', json_encode( $layer ) );
	ok( array( 'mediaType' => 'lottie' ) === ( $map['attrs'] ?? null ) && ! in_array( 'videoLoop', $map['consumed'], true ), 'media: mediaType is set to lottie and videoLoop (shared with video) is not consumed' );
	$media_default = $mapper->map( $media, array( 'lottieId' => 7, 'lottieTrigger' => 'sideways' ) )['motion']['elements']['media']['effects'][0];
	ok( 'visible' === $media_default['trigger'], 'media: an invalid trigger falls back to visible' );
	$media_idle = $mapper->map( $media, array( 'lottieSpeed' => 2 ) );
	ok( array() === $media_idle['motion'] && ! isset( $media_idle['attrs'] ) && array( 'lottieSpeed' ) === $media_idle['consumed'], 'media: settings with no file make no layer and do not set mediaType' );
	ok( survives( $map['motion'] ), 'media: the fragment survives the shipped schema untouched' );

	// 6. Through the real runner, with a second run and a string attachment ID.
	$content = '<!-- wp:sgs/responsive-logo {"align":"wide","animationSubstrate":"lottie","lottieId":"44","lottieTrigger":"visible"} /-->';
	$first   = $runner->migrate_content( $content );
	$attrs   = first_attrs( $first['content'] );
	ok( $first['changed'] && 'wide' === ( $attrs['align'] ?? '' ) && ! array_key_exists( 'lottieId', $attrs ) && ! array_key_exists( 'animationSubstrate', $attrs ), 'the migrated logo keeps its other attributes and loses the family attributes' );
	ok( 44 === ( $attrs['sgsMotion']['elements']['wrapper']['effects'][0]['values']['file'] ?? null ) && array() === $first['flags'], 'a string attachment ID is stored as an integer and nothing is flagged', json_encode( $first['flags'] ) );
	$second = $runner->migrate_content( $first['content'] );
	ok( ! $second['changed'] && $second['content'] === $first['content'], 'idempotent: a second run changes nothing' );

	$media_run = $runner->migrate_content( '<!-- wp:sgs/media {"lottieId":7} /-->' );
	$matt      = first_attrs( $media_run['content'] );
	ok( 'lottie' === ( $matt['mediaType'] ?? null ) && ! array_key_exists( 'lottieId', $matt ) && 7 === ( $matt['sgsMotion']['elements']['media']['effects'][0]['values']['file'] ?? null ), 'a media block gains mediaType lottie and the layer, and loses lottieId' );
	$media_again = $runner->migrate_content( $media_run['content'] );
	ok( ! $media_again['changed'], 'idempotent: a migrated media block changes nothing on a second run' );

	// 7. A stored draw layer that differs is flagged, not overwritten.
	$stored = '<!-- wp:sgs/responsive-logo {"animationStyle":"draw-on-load","svgAnimationSource":12,"sgsMotion":{"v":1,"elements":{"wrapper":{"entrance":{"text":[{"id":"draw","effect":"draw","trigger":"load","values":{"asset":99}}]}}}}} /-->';
	$mixed  = $runner->migrate_content( $stored );
	$latt   = first_attrs( $mixed['content'] );
	ok( 99 === ( $latt['sgsMotion']['elements']['wrapper']['entrance']['text'][0]['values']['asset'] ?? null ) && array() !== $mixed['flags'], 'a stored draw asset wins over the old one and the difference is flagged', json_encode( $mixed['flags'] ) );

	echo "\nRESULT  $pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
