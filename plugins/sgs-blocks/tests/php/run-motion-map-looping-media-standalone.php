<?php
/**
 * Standalone test for the `looping-media` migration mapper (Spec 38A FR-38A-52, FR-38A-31, FR-38A-32; build unit M5.13).
 *
 * Loads the REAL mapper, the real runner and the real `Sgs_Motion_Document::sanitise` with the shipped
 * `schemas/motion.schema.json`. WordPress is not loaded; `parse_blocks` and `serialize_block_attributes` are minimal
 * stand-ins. One fixture per old attribute runs through `Sgs_Motion_Migrate_Runner::migrate_content`; every mapped
 * fixture must leave the runner with no flag (no conflict, nothing dropped or changed by the schema).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-map-looping-media-standalone.php
 *
 * What it proves:
 * - the mapper owns exactly the attributes the unit names, on the blocks that declare them, and its constants equal the
 *   retired stylesheets' numbers while those stylesheets exist;
 * - each attribute lands where the mapping table says and survives `Sgs_Motion_Document::sanitise()` untouched;
 * - a value with no exact destination is reported and stays on the block;
 * - a second run over migrated content changes nothing.
 *
 * Planted faults (each must turn the run red; the run then exits 1). The fault is written into a TEMPORARY COPY of the
 * code under test and the test is run against the copy, so nothing in the repository changes.
 *   SGS_MOTION_LOOPING_PLANT=float-period   the float keeps the whole retired cycle as its one-way period
 *   SGS_MOTION_LOOPING_PLANT=pulse-speed    the medium pulse becomes 300 ms
 *   SGS_MOTION_LOOPING_PLANT=once-easing    the zoom-out-once easing stops being the entrance token
 *   SGS_MOTION_LOOPING_PLANT=parallax-wins  a Ken Burns under a running parallax is still written
 *   SGS_MOTION_LOOPING_PLANT=zoom-range     a starting zoom outside 100 to 200 is accepted
 *   SGS_MOTION_LOOPING_PLANT=atom-clamp     the media atom's 60 second limit becomes 600
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {

	$plant = (string) getenv( 'SGS_MOTION_LOOPING_PLANT' );
	if ( '' !== $plant ) {
		exit( sgs_looping_run_planted( $plant ) );
	}

	/**
	 * Copy the code under test into a temp tree, plant the fault there and run this test against the copy.
	 */
	function sgs_looping_run_planted( string $plant ): int {
		$plugin = dirname( __DIR__, 2 );
		$tmp    = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-looping-plant-' . bin2hex( random_bytes( 4 ) );
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
		$copy( __FILE__, $tmp . '/tests/php/run-motion-map-looping-media-standalone.php' );
		$mapper = '/migrate/mappers/class-sgs-motion-map-looping-media.php';
		$faults = array(
			'float-period'  => array( $mapper, "'medium' => 2000,", "'medium' => 4000," ),
			'pulse-speed'   => array( $mapper, "'medium' => 3000,
			'fast'   => 1500,", "'medium' => 300,
			'fast'   => 1500," ),
			'once-easing'   => array( $mapper, "const ONCE_EASING = 'token:entrance.easing';", "const ONCE_EASING = 'ease';" ),
			'parallax-wins' => array( $mapper, "'' !== \$parallax && true === ( \$attrs[ \$parallax ] ?? false )", 'false' ),
			'zoom-range'    => array( $mapper, '$start < 100 || $start > 200', 'false' ),
			'atom-clamp'    => array( $mapper, 'const ATOM_MAX_SECONDS  = 60;', 'const ATOM_MAX_SECONDS  = 600;' ),
			'lottie-loop'   => array( $mapper, "\$loop   = \$attrs['bgLottieLoop'] ?? true;", "\$loop   = \$attrs['bgLottieLoop'] ?? false;" ),
			'lottie-kb'     => array( $mapper, "if ( 'ken-burns' === ( \$layer['effect'] ?? '' ) ) {", 'if ( false ) {' ),
		);
		if ( ! isset( $faults[ $plant ] ) ) {
			echo "Unknown plant '$plant'\n";
			return 2;
		}
		list( $file, $from, $to ) = $faults[ $plant ];
		$path                     = $tmp . '/includes/motion' . $file;
		$source                   = str_replace( "\r\n", "\n", (string) file_get_contents( $path ) );
		if ( false === strpos( $source, $from ) ) {
			echo "Plant '$plant' did not apply: '$from' not found in $file\n";
			return 2;
		}
		file_put_contents( $path, str_replace( $from, $to, $source ) );
		echo "PLANTED  $plant: '$from' -> '$to' in a temporary copy\n";
		putenv( 'SGS_MOTION_LOOPING_PLANT' );
		putenv( 'SGS_MOTION_LOOPING_ROOT=' . $plugin );
		$out = array();
		exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $tmp . '/tests/php/run-motion-map-looping-media-standalone.php' ) . ' 2>&1', $out, $code );
		echo implode( "\n", array_filter( $out, static fn( $l ) => str_starts_with( $l, 'FAIL' ) || str_contains( $l, 'passed' ) ) ) . "\n";
		return $code;
	}

	define( 'ABSPATH', __DIR__ . '/' );

	function wp_json_encode( $data, int $flags = 0 ) {
		return json_encode( $data, $flags );
	}

	/** Attribute JSON the way WordPress serialises it (`serialize_block_attributes`). */
	function wp_attrs_json( array $attrs ): string {
		$json = json_encode( $attrs, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		return strtr( (string) $json, array( '--' => '\\u002d\\u002d', '<' => '\\u003c', '>' => '\\u003e', '&' => '\\u0026', '\\"' => '\\u0022' ) );
	}

	/** A minimal `parse_blocks`: comment-delimited blocks, nesting, void blocks, raw HTML between them. */
	function parse_blocks( string $content ): array {
		preg_match_all( '/<!--\s+(\/)?wp:([a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)?)\s*(\{.*?\})?\s*(\/)?-->/s', $content, $m, PREG_SET_ORDER | PREG_OFFSET_CAPTURE );
		$root  = array( 'blockName' => null, 'attrs' => array(), 'innerBlocks' => array(), 'innerHTML' => '', 'innerContent' => array() );
		$stack = array( &$root );
		$pos   = 0;
		$add_text = static function ( array &$frame, string $text ): void {
			if ( '' === $text ) {
				return;
			}
			$frame['innerHTML']     .= $text;
			$frame['innerContent'][] = $text;
		};
		foreach ( $m as $t ) {
			$top  = &$stack[ count( $stack ) - 1 ];
			$text = substr( $content, $pos, $t[0][1] - $pos );
			$pos  = $t[0][1] + strlen( $t[0][0] );
			$add_text( $top, $text );
			$name = false === strpos( $t[2][0], '/' ) ? 'core/' . $t[2][0] : $t[2][0];
			if ( '/' === $t[1][0] ) {
				$done = array_pop( $stack );
				$par  = &$stack[ count( $stack ) - 1 ];
				$par['innerBlocks'][]  = $done;
				$par['innerContent'][] = null;
				continue;
			}
			$block = array( 'blockName' => $name, 'attrs' => isset( $t[3] ) && '' !== $t[3][0] ? json_decode( $t[3][0], true ) : array(), 'innerBlocks' => array(), 'innerHTML' => '', 'innerContent' => array() );
			if ( isset( $t[4] ) && '/' === $t[4][0] ) {
				$top['innerBlocks'][]  = $block;
				$top['innerContent'][] = null;
			} else {
				$stack[] = $block;
			}
		}
		$add_text( $root, substr( $content, $pos ) );
		$out = array();
		$i   = 0;
		foreach ( $root['innerContent'] as $part ) {
			if ( null !== $part ) {
				if ( '' !== trim( $part ) ) {
					$out[] = array( 'blockName' => null, 'attrs' => array(), 'innerBlocks' => array(), 'innerHTML' => $part, 'innerContent' => array( $part ) );
				}
				continue;
			}
			$out[] = $root['innerBlocks'][ $i++ ];
		}
		return $out;
	}

	function serialize_block_attributes( array $attrs ): string {
		return wp_attrs_json( $attrs );
	}
}

namespace SGS\Blocks\Motion {

	$root = dirname( __DIR__, 2 );
	// A planted run executes a copy of the includes; the block files are always read from the repository.
	$real = '' !== (string) getenv( 'SGS_MOTION_LOOPING_ROOT' ) ? (string) getenv( 'SGS_MOTION_LOOPING_ROOT' ) : $root;
	require_once $root . '/includes/motion/migrate/interface-sgs-motion-mapper.php';
	require_once $root . '/includes/motion/migrate/class-sgs-motion-migrate-runner.php';
	require_once $root . '/includes/motion/migrate/mappers/class-sgs-motion-map-looping-media.php';

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

	function js( $value ): string {
		return (string) json_encode( $value, JSON_UNESCAPED_SLASHES );
	}

	/**
	 * Run one block through the real runner with only this mapper.
	 *
	 * @return array{changed:bool,flags:array,reported:array,attrs:array,consumed:array,content:string,source:string}
	 */
	function migrate( string $block, array $attrs ): array {
		$runner  = new Sgs_Motion_Migrate_Runner( array( new Sgs_Motion_Map_Looping_Media() ) );
		$content = '<!-- wp:' . $block . ' ' . js( $attrs ) . ' /-->';
		$diff    = $runner->migrate_content( $content );
		$parsed  = parse_blocks( $diff['content'] );
		return array(
			'changed'  => $diff['changed'],
			'flags'    => $diff['flags'],
			'reported' => array_values( array_map( static fn( $row ) => array_intersect_key( $row, array_flip( array( 'attr', 'consumed' ) ) ), $diff['reported'] ) ),
			'attrs'    => $parsed[0]['attrs'] ?? array(),
			'consumed' => $diff['changes'][0]['consumed'] ?? array(),
			'content'  => $diff['content'],
			'source'   => $content,
		);
	}

	/** One effect layer on a part, or null. */
	function layer( array $result, string $part, string $effect ): ?array {
		foreach ( $result['attrs']['sgsMotion']['elements'][ $part ]['effects'] ?? array() as $item ) {
			if ( $effect === ( $item['effect'] ?? '' ) ) {
				return $item;
			}
		}
		return null;
	}

	/** The reported attribute names. */
	function reported_attrs( array $result ): array {
		return array_column( $result['reported'], 'attr' );
	}

	$mapper = new Sgs_Motion_Map_Looping_Media();

	// 0. Contract, and the mapper's constants against the shipped block files.
	ok( 'looping-media' === $mapper->family(), 'the family slug is the file suffix' );
	ok( 'SGS\\Blocks\\Motion\\Sgs_Motion_Map_Looping_Media' === Sgs_Motion_Migrate_Runner::mapper_class( 'looping-media' ) && $mapper instanceof Sgs_Motion_Mapper_Interface, 'the runner finds the class from the family slug' );
	$read = static function ( string $slug ) use ( $real ): array {
		$json = json_decode( (string) file_get_contents( $real . '/src/blocks/' . $slug . '/block.json' ), true );
		return is_array( $json['attributes'] ?? null ) ? $json['attributes'] : array();
	};
	foreach ( Sgs_Motion_Map_Looping_Media::BACKGROUND_BLOCKS as $block ) {
		$declared = $read( substr( $block, 4 ) );
		$base     = array( 'bgKenBurns', 'bgAnimationDuration', 'bgSvgAnimation', 'bgSvgAnimationSpeed' );
		ok( array() === array_diff( $base, array_keys( $declared ) ), "{$block} declares the four bg looping-media attributes" );
		ok( false === ( $declared['bgKenBurns']['default'] ?? null ) && 20 === ( $declared['bgAnimationDuration']['default'] ?? null ) && 'none' === ( $declared['bgSvgAnimation']['default'] ?? null ), "{$block} defaults: Ken Burns off, 20 seconds, no SVG animation" );
		ok( $mapper->handles( $block, array( 'bgKenBurns' => true ) ), "{$block} is handled for bgKenBurns" );
	}
	$hero = $read( 'hero' );
	ok( 'loop' === ( $hero['bgKenBurnsMode']['default'] ?? null ) && Sgs_Motion_Map_Looping_Media::DEFAULT_ZOOM_START === ( $hero['bgZoomStart']['default'] ?? null ), 'hero bgKenBurnsMode defaults to loop and bgZoomStart to the mapper default' );
	ok( 20 === ( $hero['splitMediaAnimationDuration']['default'] ?? null ) && false === ( $hero['splitMediaKenBurns']['default'] ?? null ), 'hero split media defaults: 20 seconds, Ken Burns off' );
	ok( 'none' === ( $read( 'media' )['svgAnimation']['default'] ?? null ) && 'medium' === ( $read( 'media' )['svgAnimationSpeed']['default'] ?? null ), 'media svgAnimation defaults to none and its speed to medium' );
	ok( array() === Sgs_Motion_Map_Looping_Media::owned( 'sgs/text' ) && false === $mapper->handles( 'sgs/text', array( 'bgKenBurns' => true ) ), 'a block that does not declare the attributes is left alone' );
	foreach ( Sgs_Motion_Map_Looping_Media::BACKGROUND_BLOCKS as $block ) {
		ok( $mapper->handles( $block, array( 'bgLottie' => 4079 ) ) && $mapper->handles( $block, array( 'bgLottieLoop' => false ) ), "{$block} is handled for bgLottie and bgLottieLoop" );
	}
	ok( 0 === ( $read( 'container' )['bgLottie']['default'] ?? null ) && true === ( $read( 'container' )['bgLottieLoop']['default'] ?? null ), 'container bgLottie defaults to 0 (none) and bgLottieLoop to true, as the mapper reads an absent loop' );
	ok( false === $mapper->handles( 'sgs/container', array( 'bgSvgContent' => '<svg/>', 'bgSvgOpacity' => 50 ) ), 'the background SVG content and styling stay block settings' );

	// The retired stylesheets, while they exist: speeds and the float cycle.
	$container_css = (string) @file_get_contents( $real . '/src/blocks/container/style.css' );
	if ( false !== strpos( $container_css, 'sgs-container--svg-anim-pulse' ) ) {
		foreach ( array( 'pulse', 'float', 'wave' ) as $word ) {
			foreach ( array( 'slow', 'medium', 'fast' ) as $speed ) {
				preg_match( '/svg-anim-' . $word . '\.sgs-container--svg-speed-' . $speed . ' [^{]*\{\s*animation-duration:\s*([\d.]+)s/', $container_css, $mm );
				$ms = isset( $mm[1] ) ? (int) round( (float) $mm[1] * 1000 ) : -1;
				$want = 'float' === $word ? Sgs_Motion_Map_Looping_Media::FLOAT_PERIOD_MS[ $speed ] * 2 : Sgs_Motion_Map_Looping_Media::SVG_LOOP_MS[ $word ][ $speed ];
				ok( $ms === $want, "the retired {$word} {$speed} duration is {$want} ms in container/style.css", (string) $ms );
			}
		}
		ok( 1 === preg_match( '/@keyframes sgs-container-svg-float\s*\{[^}]*\}\s*50%\s*\{\s*transform:\s*translateY\(\s*-10px/s', $container_css ), 'the retired float rises 10px' );
	}

	// 1. Background Ken Burns, container family: a loop.
	$r = migrate( 'sgs/container', array( 'bgKenBurns' => true, 'bgAnimationDuration' => 30 ) );
	$l = layer( $r, 'background', 'ken-burns' );
	ok( array() === $r['flags'] && null !== $l && 'loop' === $l['values']['mode'] && 110 === $l['values']['zoomStart'] && 120 === $l['values']['zoomEnd'] && 30000 === $l['values']['duration'] && 'ease-in-out' === $l['values']['easing'], 'a container Ken Burns loop keeps 110 to 120 over its stored 30 seconds on the background part', js( $r['flags'] ) . js( $r['attrs'] ) );
	ok( array( 'bgKenBurns', 'bgAnimationDuration' ) === $r['consumed'] && ! isset( $r['attrs']['bgKenBurns'] ) && ! isset( $r['attrs']['bgAnimationDuration'] ), 'both old attributes are consumed and removed', js( $r['consumed'] ) );
	ok( array( 'bgKenBurns' ) === reported_attrs( $r ) && true === $r['reported'][0]['consumed'], 'the simplified loop shape is reported, and the attribute is consumed' );
	ok( ! isset( $l['values']['pauseControl'] ), 'no pause button is written (the retired animation had none; the default is off)' );
	$r = migrate( 'sgs/container', array( 'bgKenBurns' => true ) );
	ok( 20000 === ( layer( $r, 'background', 'ken-burns' )['values']['duration'] ?? null ), 'a missing duration is the retired default of 20 seconds' );
	$r = migrate( 'sgs/site-header', array( 'bgKenBurns' => true, 'bgAnimationDuration' => 0 ) );
	ok( 20000 === ( layer( $r, 'background', 'ken-burns' )['values']['duration'] ?? null ), 'a duration of 0 was written as 20 seconds by the wrapper and maps to 20 seconds' );
	$r = migrate( 'sgs/container', array( 'bgKenBurns' => false, 'bgAnimationDuration' => 45 ) );
	ok( null === layer( $r, 'background', 'ken-burns' ) && array( 'bgKenBurns', 'bgAnimationDuration' ) === $r['consumed'] && ! isset( $r['attrs']['sgsMotion'] ), 'Ken Burns off: both attributes are consumed and no layer is written' );
	$r = migrate( 'sgs/container', array( 'bgAnimationDuration' => 45 ) );
	ok( array( 'bgAnimationDuration' ) === $r['consumed'] && ! isset( $r['attrs']['sgsMotion'] ), 'a lone duration changed nothing, so it is consumed with no layer' );
	$r = migrate( 'sgs/container', array( 'bgKenBurns' => true, 'bgAnimationDuration' => 500 ) );
	ok( array() === $r['consumed'] && 500 === ( $r['attrs']['bgAnimationDuration'] ?? null ) && ! isset( $r['attrs']['sgsMotion'] ) && array( 'bgAnimationDuration' ) === reported_attrs( $r ), 'a duration over the effect limit stays on the block, reported' );
	$r = migrate( 'sgs/container', array( 'bgKenBurns' => true, 'bgAnimationDuration' => 'long' ) );
	ok( array() === $r['consumed'] && 'long' === ( $r['attrs']['bgAnimationDuration'] ?? null ) && array( 'bgAnimationDuration' ) === reported_attrs( $r ), 'a non-number duration stays on the block, reported' );
	$r = migrate( 'sgs/container', array( 'bgKenBurns' => 'yes' ) );
	ok( array() === $r['consumed'] && 'yes' === ( $r['attrs']['bgKenBurns'] ?? null ) && array( 'bgKenBurns' ) === reported_attrs( $r ), 'a non-boolean switch stays on the block, reported' );

	// 2. Hero: loop and zoom-out-once.
	$r = migrate( 'sgs/hero', array( 'bgKenBurns' => true ) );
	$l = layer( $r, 'background', 'ken-burns' );
	ok( array() === $r['flags'] && 'loop' === $l['values']['mode'] && 100 === $l['values']['zoomStart'] && 106 === $l['values']['zoomEnd'], 'a hero Ken Burns loop maps to 100 to 106', js( $r['flags'] ) . js( $r['attrs'] ) );
	$r = migrate( 'sgs/hero', array( 'bgKenBurns' => true, 'bgKenBurnsMode' => 'zoom-out-once' ) );
	$l = layer( $r, 'background', 'ken-burns' );
	ok( array() === $r['flags'] && 'zoom-out-once' === $l['values']['mode'] && 108 === $l['values']['zoomStart'] && 100 === $l['values']['zoomEnd'] && 20000 === $l['values']['duration'] && 'token:entrance.easing' === $l['values']['easing'], 'a zoom-out-once with no stored zoom is 108 to 100 over 20 seconds on the entrance easing', js( $r['flags'] ) . js( $r['attrs'] ) );
	ok( array() === reported_attrs( $r ) && array( 'bgKenBurns', 'bgKenBurnsMode' ) === $r['consumed'], 'zoom-out-once is exact: nothing reported, mode consumed', js( $r['reported'] ) . js( $r['consumed'] ) );
	$r = migrate( 'sgs/hero', array( 'bgKenBurns' => true, 'bgKenBurnsMode' => 'zoom-out-once', 'bgZoomStart' => 115, 'bgAnimationDuration' => 12 ) );
	$l = layer( $r, 'background', 'ken-burns' );
	ok( 115 === $l['values']['zoomStart'] && 12000 === $l['values']['duration'] && array( 'bgKenBurns', 'bgAnimationDuration', 'bgKenBurnsMode', 'bgZoomStart' ) === $r['consumed'], 'a stored zoom of 115 and 12 seconds are played and all four attributes consumed', js( $r['consumed'] ) );
	$r = migrate( 'sgs/hero', array( 'bgKenBurns' => true, 'bgKenBurnsMode' => 'zoom-out-once', 'bgZoomStart' => 50 ) );
	ok( array() === $r['consumed'] && 50 === ( $r['attrs']['bgZoomStart'] ?? null ) && array( 'bgZoomStart' ) === reported_attrs( $r ) && ! isset( $r['attrs']['sgsMotion'] ), 'a starting zoom below 100 stays on the block, reported' );
	$r = migrate( 'sgs/hero', array( 'bgKenBurns' => true, 'bgKenBurnsMode' => 'zoom-out-once', 'bgZoomStart' => 250 ) );
	ok( array() === $r['consumed'] && array( 'bgZoomStart' ) === reported_attrs( $r ), 'a starting zoom above 200 stays on the block, reported' );
	$r = migrate( 'sgs/hero', array( 'bgKenBurns' => false, 'bgKenBurnsMode' => 'zoom-out-once', 'bgZoomStart' => 120 ) );
	ok( array( 'bgKenBurns', 'bgKenBurnsMode', 'bgZoomStart' ) === $r['consumed'] && ! isset( $r['attrs']['sgsMotion'] ), 'a hero with Ken Burns off consumes the mode and zoom with no layer' );

	// 3. Split media Ken Burns (hero media atom).
	$r = migrate( 'sgs/hero', array( 'splitMediaKenBurns' => true, 'splitMediaAnimationDuration' => 30 ) );
	$l = layer( $r, 'media', 'ken-burns' );
	ok( array() === $r['flags'] && 'loop' === $l['values']['mode'] && 30000 === $l['values']['duration'] && array( 'splitMediaKenBurns', 'splitMediaAnimationDuration' ) === $r['consumed'] && null === layer( $r, 'background', 'ken-burns' ), 'split media Ken Burns lands on the media part over its stored 30 seconds', js( $r['flags'] ) . js( $r['attrs'] ) );
	$r = migrate( 'sgs/hero', array( 'splitMediaKenBurns' => true, 'splitMediaAnimationDuration' => 3 ) );
	ok( 5000 === ( layer( $r, 'media', 'ken-burns' )['values']['duration'] ?? null ), 'the atom clamped a duration below 5 seconds to 5' );
	$r = migrate( 'sgs/hero', array( 'splitMediaKenBurns' => true, 'splitMediaAnimationDuration' => 100 ) );
	ok( 60000 === ( layer( $r, 'media', 'ken-burns' )['values']['duration'] ?? null ), 'the atom clamped a duration above 60 seconds to 60' );
	$r = migrate( 'sgs/hero', array( 'splitMediaKenBurns' => true, 'splitMediaParallax' => true ) );
	ok( null === layer( $r, 'media', 'ken-burns' ) && array( 'splitMediaKenBurns' ) === $r['consumed'] && array( 'splitMediaKenBurns' ) === reported_attrs( $r ) && true === ( $r['attrs']['splitMediaParallax'] ?? null ), 'parallax on the same media won, so the Ken Burns never ran: consumed with no layer, parallax left to its own mapper' );
	$r = migrate( 'sgs/hero', array( 'bgKenBurns' => true, 'splitMediaKenBurns' => true ) );
	ok( null !== layer( $r, 'background', 'ken-burns' ) && null !== layer( $r, 'media', 'ken-burns' ) && array() === $r['flags'], 'the background and the media each keep their own Ken Burns layer' );

	// 4. Media block: the atom's Ken Burns.
	$r = migrate( 'sgs/media', array( 'kenBurns' => true, 'animationDuration' => 25 ) );
	$l = layer( $r, 'media', 'ken-burns' );
	ok( array() === $r['flags'] && 25000 === ( $l['values']['duration'] ?? null ) && array( 'kenBurns', 'animationDuration' ) === $r['consumed'], 'the media block Ken Burns lands on the media part', js( $r['flags'] ) . js( $r['attrs'] ) );
	$r = migrate( 'sgs/media', array( 'kenBurns' => true, 'parallax' => true ) );
	ok( null === layer( $r, 'media', 'ken-burns' ) && array( 'kenBurns' ) === $r['consumed'], 'the media block parallax won, so its Ken Burns is consumed with no layer' );

	// 5. SVG animation: pulse and wave.
	foreach ( array( 'pulse' => array( 'slow' => 5000, 'medium' => 3000, 'fast' => 1500 ), 'wave' => array( 'slow' => 8000, 'medium' => 5000, 'fast' => 3000 ) ) as $word => $speeds ) {
		foreach ( $speeds as $speed => $ms ) {
			$r = migrate( 'sgs/container', array( 'bgSvgAnimation' => $word, 'bgSvgAnimationSpeed' => $speed ) );
			$l = layer( $r, 'svg-bg', 'svg-loop' );
			ok( array() === $r['flags'] && $word === ( $l['values']['motion'] ?? null ) && $ms === ( $l['values']['duration'] ?? null ) && 1 === ( $l['values']['amplitude'] ?? null ) && array( 'bgSvgAnimation', 'bgSvgAnimationSpeed' ) === $r['consumed'], "bgSvgAnimation {$word} at {$speed} is an svg-loop {$word} of {$ms} ms at amplitude 1", js( $r['flags'] ) . js( $r['attrs'] ) );
		}
	}
	$r = migrate( 'sgs/hero', array( 'bgSvgAnimation' => 'pulse' ) );
	ok( 3000 === ( layer( $r, 'svg-bg', 'svg-loop' )['values']['duration'] ?? null ), 'a missing speed is medium' );
	$r = migrate( 'sgs/hero', array( 'bgSvgAnimation' => 'wave', 'bgSvgAnimationSpeed' => 'warp' ) );
	ok( 5000 === ( layer( $r, 'svg-bg', 'svg-loop' )['values']['duration'] ?? null ) && array( 'bgSvgAnimation', 'bgSvgAnimationSpeed' ) === $r['consumed'], 'an unreadable speed is medium, as the retired render read it' );

	// 6. SVG animation: float becomes ambient-float (FR-38A-37).
	foreach ( array( 'slow' => 3000, 'medium' => 2000, 'fast' => 1000 ) as $speed => $ms ) {
		$r = migrate( 'sgs/trust-bar', array( 'bgSvgAnimation' => 'float', 'bgSvgAnimationSpeed' => $speed ) );
		$l = layer( $r, 'svg-bg', 'ambient-float' );
		ok( array() === $r['flags'] && -10 === ( $l['values']['travel'] ?? null ) && 'y' === ( $l['values']['axis'] ?? null ) && $ms === ( $l['values']['period'] ?? null ) && 'alternate' === ( $l['values']['direction'] ?? null ) && 'ease-in-out' === ( $l['values']['easing'] ?? null ) && null === layer( $r, 'svg-bg', 'svg-loop' ), "float at {$speed} is an ambient-float of {$ms} ms one way (the retired cycle was twice that)", js( $r['flags'] ) . js( $r['attrs'] ) );
	}
	$r = migrate( 'sgs/container', array( 'bgSvgAnimation' => 'none', 'bgSvgAnimationSpeed' => 'fast' ) );
	ok( array( 'bgSvgAnimation', 'bgSvgAnimationSpeed' ) === $r['consumed'] && ! isset( $r['attrs']['sgsMotion'] ), 'none consumes the word and the speed with no layer' );
	$r = migrate( 'sgs/container', array( 'bgSvgAnimationSpeed' => 'fast' ) );
	ok( array( 'bgSvgAnimationSpeed' ) === $r['consumed'] && ! isset( $r['attrs']['sgsMotion'] ), 'a lone speed changed nothing, so it is consumed' );
	$r = migrate( 'sgs/container', array( 'bgSvgAnimation' => 'spin', 'bgSvgAnimationSpeed' => 'fast' ) );
	ok( array() === $r['consumed'] && 'spin' === ( $r['attrs']['bgSvgAnimation'] ?? null ) && 'fast' === ( $r['attrs']['bgSvgAnimationSpeed'] ?? null ) && array( 'bgSvgAnimation' ) === reported_attrs( $r ) && ! isset( $r['attrs']['sgsMotion'] ), 'an unknown animation word stays on the block with its speed, reported' );

	// 7. The media block's SVG animation.
	$r = migrate( 'sgs/media', array( 'svgAnimation' => 'pulse', 'svgAnimationSpeed' => 'fast' ) );
	$l = layer( $r, 'media', 'svg-loop' );
	ok( array() === $r['flags'] && 'pulse' === ( $l['values']['motion'] ?? null ) && 1500 === ( $l['values']['duration'] ?? null ) && array( 'svgAnimation', 'svgAnimationSpeed' ) === $r['consumed'], 'the media block SVG pulse lands on the media part', js( $r['flags'] ) . js( $r['attrs'] ) );
	ok( array( 'svgAnimation' ) === reported_attrs( $r ), 'the two stylesheets the media block draws it from are reported' );
	$r = migrate( 'sgs/media', array( 'svgAnimation' => 'float' ) );
	ok( null !== layer( $r, 'media', 'ambient-float' ) && array() === reported_attrs( $r ), 'the media block float is an ambient-float layer with nothing to report', js( $r['reported'] ) );
	$r = migrate( 'sgs/media', array( 'kenBurns' => true, 'svgAnimation' => 'wave' ) );
	ok( null !== layer( $r, 'media', 'ken-burns' ) && null !== layer( $r, 'media', 'svg-loop' ) && array() === $r['flags'], 'a media part holds a Ken Burns layer and an SVG loop layer together' );

	// 7b. Background Lottie: a lottie layer on the background part, as the old wrapper played it.
	$r  = migrate( 'sgs/container', array( 'bgLottie' => 4079 ) );
	$lt = layer( $r, 'background', 'lottie' );
	ok( array( 'id' => 'lottie', 'effect' => 'lottie', 'trigger' => 'visible', 'values' => array( 'file' => 4079, 'loop' => true, 'pauseControl' => true ) ) === $lt && array() === $r['flags'] && ! isset( $r['attrs']['bgLottie'] ) && array() === reported_attrs( $r ), 'bgLottie with no stored loop: a visible, looping lottie layer with the pause control on background, schema-clean, consumed, nothing reported', js( $lt ) );
	$r  = migrate( 'sgs/hero', array( 'bgLottie' => '4079', 'bgLottieLoop' => false ) );
	$lt = layer( $r, 'background', 'lottie' );
	ok( array( 'file' => 4079 ) === ( $lt['values'] ?? null ) && array() === $r['flags'] && array( 'bgLottie', 'bgLottieLoop' ) === array_values( array_intersect( array( 'bgLottie', 'bgLottieLoop' ), $r['consumed'] ) ), 'bgLottieLoop false: plays once, no loop and no pause control (a short file), both attributes consumed', js( $lt ) );
	$r = migrate( 'sgs/container', array( 'bgLottie' => 0, 'bgLottieLoop' => false ) );
	ok( null === layer( $r, 'background', 'lottie' ) && ! isset( $r['attrs']['bgLottie'] ) && ! isset( $r['attrs']['bgLottieLoop'] ) && array() === reported_attrs( $r ), 'bgLottie 0 played nothing: no layer, both consumed' );
	$r = migrate( 'sgs/container', array( 'bgLottie' => 'x' ) );
	ok( null === layer( $r, 'background', 'lottie' ) && 'x' === ( $r['attrs']['bgLottie'] ?? null ) && in_array( 'bgLottie', reported_attrs( $r ), true ), 'a bgLottie that is not an attachment ID stays on the block, reported' );
	$r = migrate( 'sgs/container', array( 'bgLottie' => 4079, 'bgLottieLoop' => 'yes' ) );
	ok( null === layer( $r, 'background', 'lottie' ) && 4079 === ( $r['attrs']['bgLottie'] ?? null ) && in_array( 'bgLottieLoop', reported_attrs( $r ), true ), 'a bgLottieLoop that is not a boolean keeps both attributes, reported' );
	$r = migrate( 'sgs/container', array( 'bgLottie' => 4079, 'bgKenBurns' => true, 'bgAnimationDuration' => 30 ) );
	ok( null !== layer( $r, 'background', 'lottie' ) && null === layer( $r, 'background', 'ken-burns' ) && in_array( 'bgKenBurns', reported_attrs( $r ), true ) && ! isset( $r['attrs']['bgKenBurns'] ) && array() === $r['flags'], 'a Ken Burns beside a background Lottie never ran (the image was the poster): no ken-burns layer, reported and consumed', js( $r['reported'] ) );

	// 8. Absent values and idempotency.
	ok( false === $mapper->handles( 'sgs/container', array( 'columns' => 3 ) ) && false === $mapper->handles( 'sgs/media', array() ), 'a block with none of the attributes is not handled' );
	$r = migrate( 'sgs/container', array( 'columns' => 3 ) );
	ok( false === $r['changed'] && $r['content'] === $r['source'], 'absent attributes leave the content byte-identical' );
	foreach ( array(
		array( 'sgs/container', array( 'bgKenBurns' => true, 'bgAnimationDuration' => 30 ) ),
		array( 'sgs/hero', array( 'bgKenBurns' => true, 'bgKenBurnsMode' => 'zoom-out-once', 'bgZoomStart' => 112 ) ),
		array( 'sgs/hero', array( 'splitMediaKenBurns' => true, 'bgSvgAnimation' => 'float' ) ),
		array( 'sgs/media', array( 'kenBurns' => true, 'svgAnimation' => 'wave', 'svgAnimationSpeed' => 'slow' ) ),
		array( 'sgs/site-footer', array( 'bgSvgAnimation' => 'pulse' ) ),
		array( 'sgs/container', array( 'bgLottie' => 4079, 'bgLottieLoop' => false ) ),
		array( 'sgs/hero', array( 'bgLottie' => 4079, 'bgKenBurns' => true ) ),
	) as $case ) {
		$first  = migrate( $case[0], $case[1] );
		$runner = new Sgs_Motion_Migrate_Runner( array( new Sgs_Motion_Map_Looping_Media() ) );
		$again  = $runner->migrate_content( $first['content'] );
		$label  = $case[0] . ' ' . js( $case[1] );
		ok( $first['changed'] && array() === $first['flags'] && $again['content'] === $first['content'], "migrating already-migrated {$label} again changes nothing", $again['content'] );
	}

	echo "\n$pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
