<?php
/**
 * Standalone test for the `tilt` migration mapper (Spec 38A FR-38A-31, FR-38A-41; build unit M5.6).
 *
 * Loads the REAL mapper, the real runner and the shipped `schemas/motion.schema.json`. WordPress is not loaded;
 * `parse_blocks` and `serialize_block_attributes` are minimal stand-ins (copied from run-motion-map-entrance-standalone.php).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-map-tilt-standalone.php
 *
 * What it proves: `sgsHoverTilt3D: true` becomes the root hover state's Follow pointer at the legacy 6deg, 100ms
 * ease-out; the fragment survives the schema untouched; the attribute is consumed so a migrated block no longer gets
 * `.sgs-has-tilt-3d`; `false` is consumed alone; a non-boolean stays on the block and is reported; a stored value that
 * differs is flagged, not overwritten; a second run changes nothing.
 *
 * Planted faults (each must turn the run red; the run then exits 1). The fault is written into a TEMPORARY COPY of the
 * code under test and the test is run against the copy, so nothing in the repository changes.
 *   SGS_MOTION_TILT_PLANT=max-angle   the legacy maximum 6 becomes 8
 *   SGS_MOTION_TILT_PLANT=no-consume  the attribute is no longer consumed
 *   SGS_MOTION_TILT_PLANT=truthy      any non-empty value counts as on
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {

	$plant = (string) getenv( 'SGS_MOTION_TILT_PLANT' );
	if ( '' !== $plant ) {
		exit( sgs_tilt_run_planted( $plant ) );
	}

	/**
	 * Copy the code under test into a temp tree, plant the fault there and run this test against the copy.
	 */
	function sgs_tilt_run_planted( string $plant ): int {
		$plugin = dirname( __DIR__, 2 );
		$tmp    = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-tilt-plant-' . bin2hex( random_bytes( 4 ) );
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
		$copy( __FILE__, $tmp . '/tests/php/run-motion-map-tilt-standalone.php' );
		$faults = array(
			'max-angle'  => array( 'const MAX_ANGLE      = 6;', 'const MAX_ANGLE      = 8;' ),
			'no-consume' => array( "'consumed' => array( self::ATTR ),\n\t\t);\n\t}\n}", "'consumed' => array(),\n\t\t);\n\t}\n}" ),
			'truthy'     => array( 'if ( true !== $on ) {', 'if ( ! $on ) {' ),
		);
		if ( ! isset( $faults[ $plant ] ) ) {
			echo "Unknown plant '$plant'\n";
			return 2;
		}
		list( $from, $to ) = $faults[ $plant ];
		$path              = $tmp . '/includes/motion/migrate/mappers/class-sgs-motion-map-tilt.php';
		$source            = str_replace( "\r\n", "\n", (string) file_get_contents( $path ) );
		if ( false === strpos( $source, $from ) ) {
			echo "Plant '$plant' did not apply: '$from' not found\n";
			return 2;
		}
		file_put_contents( $path, str_replace( $from, $to, $source ) );
		echo "PLANTED  $plant: '" . trim( $from ) . "' -> '" . trim( $to ) . "' in a temporary copy\n";
		putenv( 'SGS_MOTION_TILT_PLANT' );
		$out = array();
		exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $tmp . '/tests/php/run-motion-map-tilt-standalone.php' ) . ' 2>&1', $out, $code );
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
	require_once $root . '/includes/motion/migrate/mappers/class-sgs-motion-map-tilt.php';

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

	$mapper = new Sgs_Motion_Map_Tilt();
	$runner = new Sgs_Motion_Migrate_Runner( array( $mapper ) );

	/** The first block's attributes in migrated content. */
	function first_attrs( string $content ): array {
		$blocks = parse_blocks( $content );
		return $blocks[0]['attrs'] ?? array();
	}

	// 0. The family is listed and loadable from the real mappers folder; handles() is exact.
	ok( in_array( 'tilt', Sgs_Motion_Migrate_Runner::families(), true ) && in_array( 'tilt', Sgs_Motion_Migrate_Runner::loadable_families(), true ), 'the tilt family is listed and loadable from includes/motion/migrate/mappers/' );
	ok( 'tilt' === $mapper->family() && true === $mapper->handles( 'sgs/info-box', array( 'sgsHoverTilt3D' => true ) ), 'handles() answers for a block that holds the attribute' );
	ok( false === $mapper->handles( 'sgs/info-box', array( 'align' => 'wide' ) ), 'negative control: a block without the attribute is not handled' );

	// 1. true becomes the root hover state's Follow pointer at the legacy values.
	$map    = $mapper->map( 'sgs/info-box', array( 'sgsHoverTilt3D' => true ) );
	$values = $map['motion']['elements']['root']['hover']['state']['values'] ?? array();
	ok( array( 'followPointer' => true, 'maxAngle' => 6, 'resetDuration' => 100, 'resetEasing' => 'ease-out' ) === $values, 'true maps to followPointer on, 6deg, 100ms ease-out', json_encode( $values ) );
	ok( array( 'sgsHoverTilt3D' ) === $map['consumed'], 'the legacy attribute is consumed' );
	ok( array() === Sgs_Motion_Migrate_Merge::differences( $map['motion'], Sgs_Motion_Document::sanitise( $map['motion'] ) ), 'the fragment survives the shipped schema untouched' );

	// 2. Through the real runner: the attribute is gone, so the render no longer adds .sgs-has-tilt-3d.
	$content = '<!-- wp:sgs/info-box {"align":"wide","sgsHoverTilt3D":true} /-->';
	$first   = $runner->migrate_content( $content );
	$attrs   = first_attrs( $first['content'] );
	ok( $first['changed'] && ! array_key_exists( 'sgsHoverTilt3D', $attrs ) && 'wide' === ( $attrs['align'] ?? '' ), 'the migrated block keeps its other attributes and loses sgsHoverTilt3D, so it never gets both the legacy script and Follow pointer' );
	ok( true === ( $attrs['sgsMotion']['elements']['root']['hover']['state']['values']['followPointer'] ?? null ) && array() === $first['flags'] && array() === $first['reported'], 'sgsMotion carries Follow pointer; no flag and no reported row', json_encode( array( $first['flags'], $first['reported'] ) ) );
	$second = $runner->migrate_content( $first['content'] );
	ok( ! $second['changed'] && $second['content'] === $first['content'], 'idempotent: a second run changes nothing' );

	// 3. false carries nothing and is consumed alone.
	$off  = $runner->migrate_content( '<!-- wp:sgs/media {"sgsHoverTilt3D":false} /-->' );
	$oatt = first_attrs( $off['content'] );
	ok( $off['changed'] && ! array_key_exists( 'sgsHoverTilt3D', $oatt ) && ! isset( $oatt['sgsMotion'] ), 'false is consumed and adds no sgsMotion' );

	// 4. A non-boolean stays on the block and is reported.
	$odd  = $runner->migrate_content( '<!-- wp:sgs/media {"sgsHoverTilt3D":"yes"} /-->' );
	$patt = first_attrs( $odd['content'] );
	ok( 'yes' === ( $patt['sgsHoverTilt3D'] ?? null ) && ! isset( $patt['sgsMotion'] ), 'a non-boolean value is not consumed and maps to nothing' );
	$rows = array_values( array_filter( $odd['reported'], static fn( $r ) => 'tilt' === $r['family'] && 'sgsHoverTilt3D' === $r['attr'] && false === $r['consumed'] ) );
	ok( 1 === count( $rows ), 'a non-boolean value is reported with its value and a reason', json_encode( $odd['reported'] ) );

	// 5. A stored Follow pointer value that differs is flagged, not overwritten.
	$stored = '<!-- wp:sgs/info-box {"sgsHoverTilt3D":true,"sgsMotion":{"v":1,"elements":{"root":{"hover":{"state":{"values":{"followPointer":true,"maxAngle":12}}}}}}} /-->';
	$mixed  = $runner->migrate_content( $stored );
	$matt   = first_attrs( $mixed['content'] );
	ok( 12 === ( $matt['sgsMotion']['elements']['root']['hover']['state']['values']['maxAngle'] ?? null ) && array() !== $mixed['flags'] && ! array_key_exists( 'sgsHoverTilt3D', $matt ), 'a stored maxAngle of 12 wins over the legacy 6 and the difference is flagged', json_encode( $mixed['flags'] ) );

	echo "\nRESULT  $pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
