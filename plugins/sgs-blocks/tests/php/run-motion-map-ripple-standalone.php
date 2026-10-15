<?php
/**
 * Standalone test for the `ripple` migration mapper (Spec 38A FR-38A-31, FR-38A-45; build unit M5.9).
 *
 * Loads the REAL mapper, the real runner and the shipped `schemas/motion.schema.json`. WordPress is not loaded;
 * `parse_blocks` and `serialize_block_attributes` are minimal stand-ins (copied from run-motion-map-tilt-standalone.php).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-map-ripple-standalone.php
 *
 * What it proves: `sgsClickEffect: 'ripple'` with a colour and a duration becomes a root Ripple layer with the click
 * trigger, the stored colour at peak opacity 1 and the stored duration; an unset colour takes the 30% peak and is
 * reported; the fragment survives the schema untouched; the three attributes are consumed; `none` and an unread colour
 * and duration are consumed alone; an unknown effect value or an unmappable colour or duration stays on the block and
 * is reported; a stored layer value that differs is flagged, not overwritten; a second run changes nothing.
 *
 * Planted faults (each must turn the run red; the run then exits 1). The fault is written into a TEMPORARY COPY of the
 * code under test and the test is run against the copy, so nothing in the repository changes.
 *   SGS_MOTION_RIPPLE_PLANT=trigger     the layer takes the pointerdown trigger instead of click
 *   SGS_MOTION_RIPPLE_PLANT=no-consume  the effect attribute is no longer consumed
 *   SGS_MOTION_RIPPLE_PLANT=peak        a stored colour is written at the 30% peak instead of 1
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {

	$plant = (string) getenv( 'SGS_MOTION_RIPPLE_PLANT' );
	if ( '' !== $plant ) {
		exit( sgs_ripple_run_planted( $plant ) );
	}

	/**
	 * Copy the code under test into a temp tree, plant the fault there and run this test against the copy.
	 */
	function sgs_ripple_run_planted( string $plant ): int {
		$plugin = dirname( __DIR__, 2 );
		$tmp    = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-ripple-plant-' . bin2hex( random_bytes( 4 ) );
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
		$copy( __FILE__, $tmp . '/tests/php/run-motion-map-ripple-standalone.php' );
		$faults = array(
			'trigger'    => array( "'trigger' => 'click',", "'trigger' => 'pointerdown'," ),
			'no-consume' => array( '$consumed = array( self::EFFECT_ATTR );', '$consumed = array();' ),
			'peak'       => array( "\$values['peakOpacity'] = 1;", "\$values['peakOpacity'] = 0.3;" ),
		);
		if ( ! isset( $faults[ $plant ] ) ) {
			echo "Unknown plant '$plant'\n";
			return 2;
		}
		list( $from, $to ) = $faults[ $plant ];
		$path              = $tmp . '/includes/motion/migrate/mappers/class-sgs-motion-map-ripple.php';
		$source            = str_replace( "\r\n", "\n", (string) file_get_contents( $path ) );
		if ( false === strpos( $source, $from ) ) {
			echo "Plant '$plant' did not apply: '$from' not found\n";
			return 2;
		}
		file_put_contents( $path, str_replace( $from, $to, $source ) );
		echo "PLANTED  $plant: '" . trim( $from ) . "' -> '" . trim( $to ) . "' in a temporary copy\n";
		putenv( 'SGS_MOTION_RIPPLE_PLANT' );
		$out = array();
		exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $tmp . '/tests/php/run-motion-map-ripple-standalone.php' ) . ' 2>&1', $out, $code );
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
	require_once $root . '/includes/motion/migrate/mappers/class-sgs-motion-map-ripple.php';

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

	$mapper = new Sgs_Motion_Map_Ripple();
	$runner = new Sgs_Motion_Migrate_Runner( array( $mapper ) );

	/** The first block's attributes in migrated content. */
	function first_attrs( string $content ): array {
		$blocks = parse_blocks( $content );
		return $blocks[0]['attrs'] ?? array();
	}

	/** The first root effect layer. */
	function layer( array $motion ): array {
		return $motion['elements']['root']['effects'][0] ?? array();
	}

	// 0. The family is listed and loadable; handles() is exact.
	ok( in_array( 'ripple', Sgs_Motion_Migrate_Runner::families(), true ) && in_array( 'ripple', Sgs_Motion_Migrate_Runner::loadable_families(), true ), 'the ripple family is listed and loadable from includes/motion/migrate/mappers/' );
	ok( 'ripple' === $mapper->family() && true === $mapper->handles( 'sgs/button', array( 'sgsClickEffect' => 'ripple' ) ), 'handles() answers for a block that holds the effect attribute' );
	ok( false === $mapper->handles( 'sgs/button', array( 'align' => 'wide' ) ), 'negative control: a block without a ripple attribute is not handled' );

	// 1. Ripple with a colour and a duration.
	$attrs = array( 'sgsClickEffect' => 'ripple', 'sgsClickRippleColour' => 'accent', 'sgsClickRippleDuration' => 800 );
	$map   = $mapper->map( 'sgs/button', $attrs );
	$l     = layer( $map['motion'] );
	ok( 'ripple' === ( $l['effect'] ?? '' ) && 'click' === ( $l['trigger'] ?? '' ), 'the layer is a ripple with the click trigger the legacy script used', json_encode( $l ) );
	ok( 'accent' === ( $l['values']['colour'] ?? '' ) && 1 === ( $l['values']['peakOpacity'] ?? null ) && 800 === ( $l['values']['duration'] ?? null ) && 'ease-out' === ( $l['values']['easing'] ?? '' ), 'colour, full peak opacity, duration and ease-out are carried', json_encode( $l['values'] ?? array() ) );
	ok( 2.8 === ( $l['values']['sizeFactor'] ?? null ), 'the size factor reaches the furthest corner from any point' );
	$cons = $map['consumed'];
	sort( $cons );
	ok( array( 'sgsClickEffect', 'sgsClickRippleColour', 'sgsClickRippleDuration' ) === $cons && array() === $map['reported'], 'all three attributes are consumed and nothing is reported', json_encode( array( $map['consumed'], $map['reported'] ) ) );
	ok( array() === Sgs_Motion_Migrate_Merge::differences( $map['motion'], Sgs_Motion_Document::sanitise( $map['motion'] ) ), 'the fragment survives the shipped schema untouched' );

	// 2. Through the real runner; idempotent.
	$content = '<!-- wp:sgs/button {"align":"wide","sgsClickEffect":"ripple","sgsClickRippleColour":"#ffffff","sgsClickRippleDuration":650} /-->';
	$first   = $runner->migrate_content( $content );
	$fa      = first_attrs( $first['content'] );
	ok( $first['changed'] && 'wide' === ( $fa['align'] ?? '' ) && ! array_key_exists( 'sgsClickEffect', $fa ) && ! array_key_exists( 'sgsClickRippleColour', $fa ) && ! array_key_exists( 'sgsClickRippleDuration', $fa ), 'the migrated block keeps its other attributes and loses the three ripple attributes' );
	ok( '#ffffff' === ( layer( $fa['sgsMotion'] ?? array() )['values']['colour'] ?? '' ) && array() === $first['flags'], 'a hex colour is carried and no flag is raised', json_encode( $first['flags'] ) );
	$second = $runner->migrate_content( $first['content'] );
	ok( ! $second['changed'] && $second['content'] === $first['content'], 'idempotent: a second run changes nothing' );

	// 3. An unset colour and duration: the legacy defaults, the colour loss reported.
	$bare = $mapper->map( 'sgs/button', array( 'sgsClickEffect' => 'ripple' ) );
	$bl   = layer( $bare['motion'] );
	ok( 600 === ( $bl['values']['duration'] ?? null ) && 0.3 === ( $bl['values']['peakOpacity'] ?? null ) && ! isset( $bl['values']['colour'] ), 'an unset duration takes the legacy 600 and an unset colour the 30% peak with no colour', json_encode( $bl['values'] ?? array() ) );
	ok( 1 === count( $bare['reported'] ) && true === $bare['reported'][0]['consumed'] && 'sgsClickRippleColour' === $bare['reported'][0]['attr'], 'the lost currentColour default is reported', json_encode( $bare['reported'] ) );

	// 4. none and unread values are consumed alone.
	$none = $mapper->map( 'sgs/button', array( 'sgsClickEffect' => 'none', 'sgsClickRippleColour' => 'accent' ) );
	ok( array() === $none['motion'] && array( 'sgsClickEffect', 'sgsClickRippleColour' ) === $none['consumed'], 'none consumes the effect and the unread colour and writes no layer', json_encode( $none ) );
	$unread = $mapper->map( 'sgs/button', array( 'sgsClickRippleDuration' => 900 ) );
	ok( array() === $unread['motion'] && array( 'sgsClickRippleDuration' ) === $unread['consumed'], 'a duration with no ripple effect was never read and is consumed alone' );

	// 5. Unknown effect, bad colour, bad duration.
	$odd = $mapper->map( 'sgs/button', array( 'sgsClickEffect' => 'glow' ) );
	ok( array() === $odd['motion'] && array() === $odd['consumed'] && 1 === count( $odd['reported'] ) && false === $odd['reported'][0]['consumed'], 'an unknown effect stays on the block and is reported', json_encode( $odd ) );
	$bad = $mapper->map( 'sgs/button', array( 'sgsClickEffect' => 'ripple', 'sgsClickRippleColour' => 'rgb(1,2,3)', 'sgsClickRippleDuration' => 'slow' ) );
	$bv  = layer( $bad['motion'] )['values'] ?? array();
	ok( array( 'sgsClickEffect' ) === $bad['consumed'] && 2 === count( $bad['reported'] ) && 600 === ( $bv['duration'] ?? null ) && ! isset( $bv['colour'] ), 'an unmappable colour and duration stay on the block, are reported, and the layer takes the defaults', json_encode( $bad ) );

	// 6. A stored layer value that differs is flagged, not overwritten.
	$stored = '<!-- wp:sgs/button {"sgsClickEffect":"ripple","sgsMotion":{"v":1,"elements":{"root":{"effects":[{"id":"ripple","effect":"ripple","trigger":"click","values":{"duration":300}}]}}}} /-->';
	$mixed  = $runner->migrate_content( $stored );
	$ma     = first_attrs( $mixed['content'] );
	ok( 300 === ( layer( $ma['sgsMotion'] ?? array() )['values']['duration'] ?? null ) && array() !== $mixed['flags'], 'a stored duration of 300 wins over the legacy 600 and the difference is flagged', json_encode( $mixed['flags'] ) );

	echo "\nRESULT  $pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
