<?php
/**
 * Standalone test for the `icon` migration mapper (Spec 38A FR-38A-31, FR-38A-32; build unit M6.3, plan decision 2A).
 *
 * Loads the REAL mapper (and the hover mapper it borrows its helpers from), the real runner and the shipped
 * `schemas/motion.schema.json`. WordPress is not loaded; `parse_blocks` and `serialize_block_attributes` are minimal
 * stand-ins and the block registry is the hover mapper's provider.
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-map-icon-standalone.php
 *
 * What it proves:
 * - an icon's hover attributes land on the `shape` part (sourced from the root) and the link opacity on the root, every
 *   fragment survives `Sgs_Motion_Document::sanitise()` untouched, a `paintDuration` that differs from the movement
 *   duration is reported and stays, and clamped values are stored as rendered and reported;
 * - a social-icons row's `childIcon*` defaults reach each child icon through the group pass only for the fields the
 *   child does not set itself, are consumed from the row, and a row with no icon child is left alone;
 * - values stored in `sgsMotion` win, and a second run over migrated content changes nothing.
 *
 * Planted faults (each must turn the run red; the run then exits 1). The fault is written into a TEMPORARY COPY of the
 * code under test and the test is run against the copy, so nothing in the repository changes.
 *   SGS_MOTION_ICON_PLANT=clamp-offset  the 40px hover-move clamp becomes 400px
 *   SGS_MOTION_ICON_PLANT=paint-equal   a paint duration that differs from the movement duration is consumed
 *   SGS_MOTION_ICON_PLANT=group-own     the row's defaults overwrite a field the child sets itself
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {

	$plant = (string) getenv( 'SGS_MOTION_ICON_PLANT' );
	if ( '' !== $plant ) {
		exit( sgs_icon_run_planted( $plant ) );
	}

	/**
	 * Copy the code under test into a temp tree, plant the fault there and run this test against the copy.
	 */
	function sgs_icon_run_planted( string $plant ): int {
		$plugin = dirname( __DIR__, 2 );
		$tmp    = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-icon-plant-' . bin2hex( random_bytes( 4 ) );
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
		$copy( $plugin . '/scripts/data/motion-presets.json', $tmp . '/scripts/data/motion-presets.json' );
		$copy( __FILE__, $tmp . '/tests/php/run-motion-map-icon-standalone.php' );
		$mapper = '/migrate/mappers/class-sgs-motion-map-icon.php';
		$faults = array(
			'clamp-offset' => array( $mapper, 'const MAX_MOVE     = 40.0;', 'const MAX_MOVE     = 400.0;' ),
			'paint-equal'  => array( $mapper, '$paint > 0 && $paint !== $move', '$paint > 0 && $paint === $move' ),
			'group-own'    => array( $mapper, "\$shape  = array_diff_key( \$read['shape'], self::own_fields( \$own ) );", "\$shape  = \$read['shape'];" ),
		);
		if ( ! isset( $faults[ $plant ] ) ) {
			echo "Unknown plant '$plant'\n";
			return 2;
		}
		list( $file, $from, $to ) = $faults[ $plant ];
		$path                     = $tmp . '/includes/motion' . $file;
		$source                   = (string) file_get_contents( $path );
		if ( false === strpos( $source, $from ) ) {
			echo "Plant '$plant' did not apply: '$from' not found in $file\n";
			return 2;
		}
		file_put_contents( $path, str_replace( $from, $to, $source ) );
		echo "PLANTED  $plant: '$from' -> '$to' in a temporary copy\n";
		putenv( 'SGS_MOTION_ICON_PLANT' );
		$out = array();
		exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $tmp . '/tests/php/run-motion-map-icon-standalone.php' ) . ' 2>&1', $out, $code );
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
	require_once $root . '/includes/motion/migrate/mappers/class-sgs-motion-map-icon.php';

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

	function blk( string $name, array $attrs = array(), array $children = array() ): array {
		return array( 'blockName' => $name, 'attrs' => $attrs, 'innerBlocks' => $children, 'innerHTML' => '', 'innerContent' => array() );
	}

	function render_tree( array $blocks ): string {
		$out = '';
		foreach ( $blocks as $b ) {
			$name  = preg_replace( '#^core/#', '', (string) $b['blockName'] );
			$attrs = array() === $b['attrs'] ? '' : ' ' . wp_attrs_json( $b['attrs'] );
			$out  .= array() === $b['innerBlocks'] ? "<!-- wp:$name$attrs /-->\n" : "<!-- wp:$name$attrs -->\n" . render_tree( $b['innerBlocks'] ) . "<!-- /wp:$name -->\n";
		}
		return $out;
	}

	/** A fragment must survive the shipped schema untouched. */
	function valid( array $motion ): bool {
		return array() === $motion || array() === Sgs_Motion_Migrate_Merge::differences( $motion, Sgs_Motion_Document::sanitise( $motion ) );
	}

	function reported_attrs( array $result ): array {
		return array_column( $result['reported'], 'attr' );
	}

	function sorted( array $list ): array {
		sort( $list );
		return $list;
	}

	function state( array $motion, string $part ): ?array {
		return $motion['elements'][ $part ]['hover']['state'] ?? null;
	}

	Sgs_Motion_Map_Hover::set_block_info_provider(
		static function ( string $name ): array {
			$info = array(
				'sgs/icon'         => array( 'attributes' => array( 'scaleHover' => 1.1, 'shadowLiftOnHover' => true ), 'sgs' => array() ),
				'sgs/social-icons' => array( 'attributes' => array( 'childIconShadowLiftOnHover' => true ), 'sgs' => array() ),
			);
			return $info[ $name ] ?? array();
		}
	);

	$mapper = new Sgs_Motion_Map_Icon();
	$runner = new Sgs_Motion_Migrate_Runner( array( $mapper ) );

	// 0. Loadable; handles icons only (the row belongs to the group pass).
	ok( in_array( 'icon', Sgs_Motion_Migrate_Runner::loadable_families(), true ) && 'icon' === $mapper->family(), 'the icon family is listed and loadable from includes/motion/migrate/mappers/' );
	ok( $mapper->handles( 'sgs/icon', array( 'offsetYHover' => 2 ) ) && ! $mapper->handles( 'sgs/icon', array( 'align' => 'left' ) ) && ! $mapper->handles( 'sgs/social-icons', array( 'childIconScaleHover' => 1.2 ) ) && ! $mapper->handles( 'sgs/heading', array( 'scaleHover' => 1.2 ) ), 'handles() answers on an icon\'s hover attributes only' );

	// 1. The main fixture: offsetYHover, scaleHover, paintDuration different from transitionDuration, rotate, opacity.
	$main = $mapper->map(
		'sgs/icon',
		array(
			'offsetYHover'       => -6,
			'scaleHover'         => 1.2,
			'iconRotateHover'    => 15,
			'opacityHover'       => 0.8,
			'transitionDuration' => 200,
			'paintDuration'      => 300,
			'transitionEasing'   => 'ease-out',
			'shadowLiftOnHover'  => true,
		)
	);
	$shape = state( $main['motion'], 'shape' );
	ok( 'root' === ( $shape['source'] ?? '' ) && array( 'scale' => 1.2, 'translateY' => -6, 'rotate' => 15, 'duration' => 200, 'easing' => 'token:easing.ease-out' ) === ( $shape['values'] ?? null ), 'scale, offsetYHover, rotate, the movement duration and a named easing are the shape state, sourced from the root', js( $shape ) );
	ok( array( 'opacity' => 0.8, 'duration' => 200, 'easing' => 'token:easing.ease-out' ) === ( state( $main['motion'], 'root' )['values'] ?? null ), 'opacityHover is the root state, with the same timing' );
	ok( array( 'paintDuration' ) === reported_attrs( $main ) && false !== strpos( $main['reported'][0]['reason'], 'paint and movement timings differ' ) && ! in_array( 'paintDuration', $main['consumed'], true ), 'a paintDuration that differs from transitionDuration is reported and stays' );
	ok( sorted( array( 'offsetYHover', 'scaleHover', 'iconRotateHover', 'opacityHover', 'transitionDuration', 'transitionEasing', 'shadowLiftOnHover' ) ) === sorted( $main['consumed'] ), 'every other attribute is consumed', js( $main['consumed'] ) );
	ok( valid( $main['motion'] ), 'the fragment is schema-valid' );

	// 2. Paint equal to move, defaults, clamps, easing, shadow lift.
	$equal = $mapper->map( 'sgs/icon', array( 'transitionDuration' => 250, 'paintDuration' => 250, 'offsetXHover' => 4 ) );
	ok( array() === $equal['reported'] && in_array( 'paintDuration', $equal['consumed'], true ) && 250 === ( state( $equal['motion'], 'shape' )['values']['duration'] ?? null ), 'a paintDuration equal to the movement duration is consumed' );
	$unset = $mapper->map( 'sgs/icon', array( 'paintDuration' => 0, 'transitionDuration' => 0, 'offsetXHover' => 0, 'offsetYHover' => 0, 'iconRotateHover' => 0, 'opacityHover' => 0, 'transitionEasing' => '' ) );
	ok( array() === $unset['motion'] && array() === $unset['reported'] && 7 === count( $unset['consumed'] ), 'values that print nothing are consumed without a hover state', js( $unset ) );
	$default = $mapper->map( 'sgs/icon', array( 'scaleHover' => 1.1 ) );
	ok( 1.1 === ( state( $default['motion'], 'shape' )['values']['scale'] ?? null ), 'a stored scale equal to the default 1.1 is written (it is a hover change)' );
	$off = $mapper->map( 'sgs/icon', array( 'scaleHover' => 1 ) );
	ok( 1 === ( state( $off['motion'], 'shape' )['values']['scale'] ?? null ), 'a stored scale of 1 over the default 1.1 is written as scale 1' );
	$clamp = $mapper->map( 'sgs/icon', array( 'offsetXHover' => 55, 'iconRotateHover' => -200, 'scaleHover' => 2 ) );
	ok( 40 === ( state( $clamp['motion'], 'shape' )['values']['translateX'] ?? null ) && -180 === ( state( $clamp['motion'], 'shape' )['values']['rotate'] ?? null ) && 1.5 === ( state( $clamp['motion'], 'shape' )['values']['scale'] ?? null ) && 3 === count( $clamp['reported'] ) && array_filter( array_column( $clamp['reported'], 'consumed' ) ) === array_column( $clamp['reported'], 'consumed' ), 'values past the renderer\'s clamps are stored as rendered and reported as consumed', js( $clamp ) );
	$bad = $mapper->map( 'sgs/icon', array( 'transitionEasing' => 'custom', 'transitionEasingCustom' => 'steps(4)', 'offsetXHover' => 3 ) );
	ok( array( 'transitionEasing' ) === reported_attrs( $bad ) && ! in_array( 'transitionEasing', $bad['consumed'], true ) && 3 === ( state( $bad['motion'], 'shape' )['values']['translateX'] ?? null ), 'an invalid custom curve is reported and stays while the rest maps' );
	$curve = $mapper->map( 'sgs/icon', array( 'transitionEasing' => 'custom', 'transitionEasingCustom' => 'cubic-bezier(0.3, 0, 0.1, 1)', 'offsetXHover' => 3 ) );
	ok( 'cubic-bezier(0.3, 0, 0.1, 1)' === ( state( $curve['motion'], 'shape' )['values']['easing'] ?? null ) && in_array( 'transitionEasingCustom', $curve['consumed'], true ) && valid( $curve['motion'] ), 'a valid custom curve is the easing and both attributes are consumed' );
	$lift = $mapper->map( 'sgs/icon', array( 'shadowLiftOnHover' => false ) );
	ok( array() === $lift['consumed'] && array( 'shadowLiftOnHover' ) === reported_attrs( $lift ), 'shadowLiftOnHover switched off over its default true is reported and stays' );

	// 3. The social-icons row: children are inner sgs/icon blocks, so the group pass writes each child.
	$row  = blk( 'sgs/social-icons', array( 'childIconScaleHover' => 1.3, 'childIconOffsetYHover' => -3, 'childIconTransitionDuration' => 250, 'childIconPaintDuration' => 250, 'childIconTransitionEasing' => 'ease', 'childIconShadowLiftOnHover' => true, 'childIconShape' => 'circle' ), array(
		blk( 'sgs/icon', array( 'icon' => 'a' ) ),
		blk( 'sgs/icon', array( 'icon' => 'b', 'offsetYHover' => 8 ) ),
		blk( 'sgs/icon', array( 'icon' => 'c', 'scaleHover' => 1.4 ) ),
	) );
	$patches = $mapper->map_groups( array( blk( 'core/paragraph' ), $row ) );
	ok( array( '1', '1/0', '1/1', '1/2' ) === array_map( 'strval', array_keys( $patches ) ), 'the group pass patches the row and each icon child by runner path', js( array_keys( $patches ) ) );
	ok( sorted( array( 'childIconScaleHover', 'childIconOffsetYHover', 'childIconTransitionDuration', 'childIconPaintDuration', 'childIconTransitionEasing', 'childIconShadowLiftOnHover' ) ) === sorted( $patches['1']['consumed'] ) && array() === $patches['1']['reported'], 'the row\'s hover defaults are consumed; childIconShape (not motion) is untouched', js( $patches['1'] ) );
	ok( array( 'scale' => 1.3, 'translateY' => -3, 'duration' => 250, 'easing' => 'ease' ) === ( state( $patches['1/0']['motion'], 'shape' )['values'] ?? null ), 'a child with no hover value of its own takes all of the row\'s defaults', js( $patches['1/0'] ) );
	ok( array( 'scale' => 1.3, 'duration' => 250, 'easing' => 'ease' ) === ( state( $patches['1/1']['motion'], 'shape' )['values'] ?? null ), 'a child with its own offsetYHover keeps its own and takes the rest', js( $patches['1/1'] ) );
	ok( array( 'translateY' => -3, 'duration' => 250, 'easing' => 'ease' ) === ( state( $patches['1/2']['motion'], 'shape' )['values'] ?? null ), 'a child with its own scaleHover keeps its own and takes the rest', js( $patches['1/2'] ) );
	ok( valid( $patches['1/0']['motion'] ) && valid( $patches['1/1']['motion'] ) && valid( $patches['1/2']['motion'] ), 'the child fragments are schema-valid' );
	$empty = $mapper->map_groups( array( blk( 'sgs/social-icons', array( 'childIconScaleHover' => 1.3 ) ) ) );
	ok( array() === $empty, 'a row with no icon child is left alone' );
	$paint = $mapper->map_groups( array( blk( 'sgs/social-icons', array( 'childIconTransitionDuration' => 200, 'childIconPaintDuration' => 300 ), array( blk( 'sgs/icon' ) ) ) ) );
	ok( array( 'childIconPaintDuration' ) === reported_attrs( $paint['0'] ) && array( 'childIconTransitionDuration' ) === $paint['0']['consumed'], 'the row\'s differing paint duration is reported and stays' );

	// 4. End to end through the runner: both passes, stored sgsMotion wins, second run changes nothing.
	$post   = render_tree( array(
		$row,
		blk( 'sgs/icon', array( 'offsetYHover' => 2, 'scaleHover' => 1.2, 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'shape' => array( 'hover' => array( 'state' => array( 'source' => 'root', 'values' => array( 'translateY' => 9 ) ) ) ) ) ) ) ),
		blk( 'sgs/hero', array( 'scaleHover' => 1.2 ) ),
	) );
	$first  = $runner->migrate_content( $post );
	$blocks = parse_blocks( $first['content'] );
	$kids   = $blocks[0]['innerBlocks'];
	ok( array( 'childIconShape' => 'circle' ) === $blocks[0]['attrs'], 'the row keeps only its non-motion attributes', js( $blocks[0]['attrs'] ) );
	ok( 8 === ( state( $kids[1]['attrs']['sgsMotion'], 'shape' )['values']['translateY'] ?? null ) && 1.3 === ( state( $kids[1]['attrs']['sgsMotion'], 'shape' )['values']['scale'] ?? null ) && ! isset( $kids[1]['attrs']['offsetYHover'] ), 'a child\'s own value and the row\'s default meet in its sgsMotion, and the old attribute is gone' );
	ok( 1.4 === ( state( $kids[2]['attrs']['sgsMotion'], 'shape' )['values']['scale'] ?? null ) && -3 === ( state( $kids[2]['attrs']['sgsMotion'], 'shape' )['values']['translateY'] ?? null ), 'the other child holds its own scale and the row\'s lift' );
	ok( 9 === ( state( $blocks[1]['attrs']['sgsMotion'], 'shape' )['values']['translateY'] ?? null ) && 1.2 === ( state( $blocks[1]['attrs']['sgsMotion'], 'shape' )['values']['scale'] ?? null ) && array() !== $first['flags'], 'a stored sgsMotion value wins over offsetYHover, the clash is flagged and the old attribute is consumed' );
	ok( array( 'scaleHover' => 1.2 ) === $blocks[2]['attrs'], 'a hero\'s scaleHover is not the icon family\'s and stays' );
	$second = $runner->migrate_content( $first['content'] );
	ok( ! $second['changed'] && $second['content'] === $first['content'], 'idempotent: running the mapper on migrated content changes nothing' );

	echo "\nRESULT  $pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
