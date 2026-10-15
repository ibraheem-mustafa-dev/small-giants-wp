<?php
/**
 * Standalone test for the `marquee` migration mapper (Spec 38A FR-38A-31, FR-38A-44; build unit M5.15).
 *
 * Loads the REAL mapper, the real runner and the schema. WordPress is not loaded; `parse_blocks` and
 * `serialize_block_attributes` are minimal stand-ins.
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-map-marquee-standalone.php
 *
 * What it proves:
 * - the family is listed and loadable, and the mapper owns exactly the two blocks' scroll attributes;
 * - a stored duration (a custom one, or the slow, medium or fast preset) is the layer's `duration`, in seconds, never
 *   `speed`; the three acceptance fixtures (a 24 second loop that pauses on hover and touch, a 64 second desktop loop,
 *   a 30 second ticker below 768px) map to the expected layer; every fragment survives `Sgs_Motion_Document::sanitise()`
 *   untouched;
 * - a switched-off marquee consumes its inert attributes and writes no layer; a pixel fade width and a clamped
 *   duration are reported; a non-boolean is reported and left on the block;
 * - the runner removes the consumed attributes, and a second run over migrated content changes nothing.
 *
 * Planted faults (each must turn the run red; the run then exits 1). The fault is written into a TEMPORARY COPY of the
 * code under test and the test is run against the copy, so nothing in the repository changes.
 *   SGS_MOTION_MARQUEE_PLANT=duration-as-speed   a stored duration is written as a px/s speed
 *   SGS_MOTION_MARQUEE_PLANT=below-swap          the 768 breakpoint becomes tablet instead of mobile
 *   SGS_MOTION_MARQUEE_PLANT=hover-rate          pause on hover writes a hover rate of 1 instead of 0
 *   SGS_MOTION_MARQUEE_PLANT=clamp-lost          the 2 to 300 second clamp is dropped
 *   SGS_MOTION_MARQUEE_PLANT=invalid-value       pause on touch is written as a string
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {

	$plant   = (string) getenv( 'SGS_MOTION_MARQUEE_PLANT' );
	$in_copy = '' !== (string) getenv( 'SGS_MOTION_MARQUEE_COPY' );
	if ( ! $in_copy ) {
		if ( '' !== $plant ) {
			exit( sgs_marquee_run_copy( $plant ) );
		}
	}

	/**
	 * Copy the code under test into a temp tree,
	 * it, plant the fault and run this test against the copy.
	 */
	function sgs_marquee_run_copy( string $plant ): int {
		$plugin = dirname( __DIR__, 2 );
		$tmp    = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-marquee-copy-' . bin2hex( random_bytes( 4 ) );
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
		$copy( __FILE__, $tmp . '/tests/php/run-motion-map-marquee-standalone.php' );
		$mapper = '/migrate/mappers/class-sgs-motion-map-marquee.php';
		$faults = array(
			'duration-as-speed' => array( $mapper, "'duration' => \$this->duration(", "'speed' => \$this->duration(" ),
			'below-swap'        => array( $mapper, "768  => 'mobile',", "768  => 'tablet'," ),
			'hover-rate'        => array( $mapper, "\$values['hoverRate']    = 0;", "\$values['hoverRate']    = 1;" ),
			'clamp-lost'        => array( $mapper, 'max( (float) self::MIN_SECONDS, min( (float) self::MAX_SECONDS, (float) $custom ) )', '(float) $custom' ),
			'invalid-value'     => array( $mapper, "\$values['pauseOnTouch'] = true;", "\$values['pauseOnTouch'] = 'yes';" ),
		);
		if ( '' !== $plant ) {
			if ( ! isset( $faults[ $plant ] ) ) {
				echo "Unknown plant '$plant'\n";
				return 2;
			}
			list( $file, $from, $to ) = $faults[ $plant ];
			$target                   = $tmp . '/includes/motion' . $file;
			$source                   = (string) file_get_contents( $target );
			if ( false === strpos( $source, $from ) ) {
				echo "Plant '$plant' did not apply: '$from' not found in $file\n";
				return 2;
			}
			file_put_contents( $target, str_replace( $from, $to, $source ) );
			echo "PLANTED  $plant: '$from' -> '$to' in a temporary copy\n";
		}
		putenv( 'SGS_MOTION_MARQUEE_PLANT' );
		putenv( 'SGS_MOTION_MARQUEE_COPY=1' );
		$out = array();
		exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $tmp . '/tests/php/run-motion-map-marquee-standalone.php' ) . ' 2>&1', $out, $code );
		$show = '' === $plant ? $out : array_filter( $out, static fn( $l ) => str_starts_with( $l, 'FAIL' ) || str_starts_with( $l, 'RESULT' ) );
		echo implode( "\n", $show ) . "\n";
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
	require_once $root . '/includes/motion/migrate/mappers/class-sgs-motion-map-marquee.php';

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

	function blk( string $name, array $attrs = array() ): array {
		return array( 'blockName' => $name, 'attrs' => $attrs, 'innerBlocks' => array(), 'innerHTML' => '', 'innerContent' => array() );
	}

	function render_tree( array $blocks ): string {
		$out = '';
		foreach ( $blocks as $b ) {
			$name  = preg_replace( '#^core/#', '', (string) $b['blockName'] );
			$attrs = array() === $b['attrs'] ? '' : ' ' . wp_attrs_json( $b['attrs'] );
			$out  .= "<!-- wp:$name$attrs /-->\n";
		}
		return $out;
	}

	/** A fragment must survive the schema untouched. */
	function valid( array $motion ): bool {
		return array() === $motion || array() === Sgs_Motion_Migrate_Merge::differences( $motion, Sgs_Motion_Document::sanitise( $motion ) );
	}

	function values_of( array $result ): ?array {
		return $result['motion']['elements']['root']['effects'][0]['values'] ?? null;
	}

	function reported_attrs( array $result ): array {
		return array_column( $result['reported'] ?? array(), 'attr' );
	}

	function sorted_copy( array $list ): array {
		sort( $list );
		return $list;
	}

	$mapper = new Sgs_Motion_Map_Marquee();
	$runner = new Sgs_Motion_Migrate_Runner( array( $mapper ) );

	// 0. Loadable from the real folder; the scope table.
	ok( in_array( 'marquee', Sgs_Motion_Migrate_Runner::loadable_families(), true ) && 'marquee' === $mapper->family(), 'the marquee family is listed and loadable from includes/motion/migrate/mappers/' );
	ok( $mapper->handles( 'sgs/brand-strip', array( 'scrolling' => true ) ) && $mapper->handles( 'sgs/trust-bar', array( 'autoScrollBelow' => 768 ) ), 'handles() answers on each block own attributes' );
	ok( ! $mapper->handles( 'sgs/brand-strip', array( 'autoScroll' => true ) ) && ! $mapper->handles( 'sgs/trust-bar', array( 'scrolling' => true ) ) && ! $mapper->handles( 'sgs/hero', array( 'scrolling' => true, 'autoScroll' => true ) ) && ! $mapper->handles( 'sgs/brand-strip', array( 'align' => 'full' ) ), 'the other block attributes, other blocks and unrelated attributes are not handled' );

	// 1. A 24 second loop that pauses on hover and on touch.
	$mama = $mapper->map( 'sgs/brand-strip', array( 'scrolling' => true, 'scrollSpeed' => 'medium', 'scrollDuration' => 24, 'pauseOnHover' => true ) );
	ok( array( 'duration' => 24000, 'hoverRate' => 0, 'pauseOnTouch' => true ) === values_of( $mama ), 'a 24 second brand strip is duration 24 with hover rate 0 and pause on touch (never a speed)', js( $mama ) );
	ok( ! isset( values_of( $mama )['speed'] ) && valid( $mama['motion'] ) && sorted_copy( array( 'pauseOnHover', 'scrollDuration', 'scrollSpeed', 'scrolling' ) ) === sorted_copy( $mama['consumed'] ), 'no speed is written, the fragment is schema-valid and every attribute is consumed', js( $mama ) );

	// 2. A 64 second desktop loop pausing on hover; a 30 second ticker only below 768.
	$eye_desktop = $mapper->map( 'sgs/trust-bar', array( 'autoScroll' => true, 'autoScrollDuration' => 64, 'autoScrollPauseOnHover' => true ) );
	ok( array( 'duration' => 64000, 'hoverRate' => 0, 'pauseOnTouch' => true ) === values_of( $eye_desktop ) && valid( $eye_desktop['motion'] ), 'a 64 second trust bar is duration 64 pausing on hover', js( $eye_desktop ) );
	$eye_ticker = $mapper->map( 'sgs/trust-bar', array( 'autoScroll' => true, 'autoScrollDuration' => 30, 'autoScrollBelow' => 768, 'autoScrollPauseOnHover' => false, 'autoScrollPauseButton' => true ) );
	ok( array( 'duration' => 30000, 'pauseControl' => true, 'belowBreakpoint' => 'mobile' ) === values_of( $eye_ticker ) && valid( $eye_ticker['motion'] ), 'a 30 second ticker below 768 is duration 30, mobile only, with the pause button and no hover pause', js( $eye_ticker ) );
	$tablet = $mapper->map( 'sgs/trust-bar', array( 'autoScroll' => true, 'autoScrollBelow' => 1024 ) );
	ok( 'tablet' === ( values_of( $tablet )['belowBreakpoint'] ?? '' ) && 25000 === ( values_of( $tablet )['duration'] ?? 0 ), 'autoScrollBelow 1024 is tablet; the medium trust-bar preset is 25 seconds', js( $tablet ) );
	$always = $mapper->map( 'sgs/trust-bar', array( 'autoScroll' => true, 'autoScrollBelow' => 0, 'autoScrollSpeed' => 'slow' ) );
	ok( ! isset( values_of( $always )['belowBreakpoint'] ) && 40000 === ( values_of( $always )['duration'] ?? 0 ), 'autoScrollBelow 0 writes no breakpoint; the slow trust-bar preset is 40 seconds' );

	// 3. Presets, direction, fade.
	$fast = $mapper->map( 'sgs/brand-strip', array( 'scrolling' => true, 'scrollSpeed' => 'fast', 'scrollDirection' => 'right', 'fadeEdges' => true, 'fadeWidth' => 80, 'pauseOnHover' => false ) );
	ok( array( 'duration' => 15000, 'direction' => 'right', 'edgeFade' => true ) === values_of( $fast ) && valid( $fast['motion'] ), 'a fast strip running right is 15 seconds, direction right, edge fade on, no hover pause', js( $fast ) );
	ok( array( 'fadeWidth' ) === reported_attrs( $fast ) && true === $fast['reported'][0]['consumed'] && in_array( 'fadeWidth', $fast['consumed'], true ), 'the pixel fade width is reported (it cannot become a percentage) and consumed' );
	$defaults = $mapper->map( 'sgs/brand-strip', array( 'scrolling' => true ) );
	ok( array( 'duration' => 30000, 'hoverRate' => 0, 'pauseOnTouch' => true ) === values_of( $defaults ), 'a bare scrolling strip keeps the medium preset (30 seconds) and the default hover and touch pause', js( $defaults ) );
	$unknown = $mapper->map( 'sgs/brand-strip', array( 'scrolling' => true, 'scrollSpeed' => 'warp', 'pauseOnHover' => false ) );
	ok( 25000 === ( values_of( $unknown )['duration'] ?? 0 ), 'an unknown preset ran 25 seconds' );

	// 4. Duration clamp and decimals.
	$low = $mapper->map( 'sgs/brand-strip', array( 'scrolling' => true, 'scrollDuration' => 0.5, 'pauseOnHover' => false ) );
	ok( 2000 === ( values_of( $low )['duration'] ?? 0 ) && array( 'scrollDuration' ) === reported_attrs( $low ) && valid( $low['motion'] ), 'a custom duration of 0.5 is stored as the rendered 2 and reported', js( $low ) );
	$high = $mapper->map( 'sgs/trust-bar', array( 'autoScroll' => true, 'autoScrollDuration' => 9999, 'autoScrollPauseOnHover' => false ) );
	ok( 300000 === ( values_of( $high )['duration'] ?? 0 ) && array( 'autoScrollDuration' ) === reported_attrs( $high ) && true === $high['reported'][0]['consumed'], 'a duration of 9999 is stored as the rendered 300 and reported', js( $high ) );
	$decimal = $mapper->map( 'sgs/trust-bar', array( 'autoScroll' => true, 'autoScrollDuration' => 12.5, 'autoScrollPauseOnHover' => false ) );
	ok( 12500 === ( values_of( $decimal )['duration'] ?? 0 ) && valid( $decimal['motion'] ), 'a fractional duration is kept' );

	// 5. Switched off, and a non-boolean.
	$off = $mapper->map( 'sgs/trust-bar', array( 'autoScroll' => false, 'autoScrollBelow' => 768, 'autoScrollDuration' => 30, 'autoScrollSpeed' => 'fast' ) );
	ok( array() === $off['motion'] && 4 === count( $off['consumed'] ) && array() === ( $off['reported'] ?? array() ), 'with the scroll switch off the other attributes are inert: consumed, no layer' );
	$off_default = $mapper->map( 'sgs/brand-strip', array( 'scrollSpeed' => 'fast' ) );
	ok( array() === $off_default['motion'] && array( 'scrollSpeed' ) === $off_default['consumed'], 'a stored speed with no scrolling switch (default off) is inert and consumed' );
	$string_on = $mapper->map( 'sgs/brand-strip', array( 'scrolling' => 'yes', 'scrollSpeed' => 'fast' ) );
	ok( array() === $string_on['motion'] && array() === $string_on['consumed'] && array( 'scrolling' ) === reported_attrs( $string_on ), 'a non-boolean scroll switch is reported and nothing is consumed' );
	$string_hover = $mapper->map( 'sgs/brand-strip', array( 'scrolling' => true, 'pauseOnHover' => 'no' ) );
	ok( ! in_array( 'pauseOnHover', $string_hover['consumed'], true ) && array( 'pauseOnHover' ) === reported_attrs( $string_hover ) && ! isset( values_of( $string_hover )['hoverRate'] ), 'a non-boolean pause switch is reported and left on the block' );

	// 6. End to end through the runner: attributes removed, idempotent, stored layer wins.
	$post  = render_tree( array(
		blk( 'sgs/brand-strip', array( 'scrolling' => true, 'scrollDuration' => 24, 'pauseOnHover' => true, 'align' => 'full' ) ),
		blk( 'sgs/trust-bar', array( 'autoScroll' => true, 'autoScrollDuration' => 30, 'autoScrollBelow' => 768, 'autoScrollPauseOnHover' => false, 'overflowMode' => 'drop' ) ),
		blk( 'sgs/hero', array( 'scrolling' => true ) ),
	) );
	$first = $runner->migrate_content( $post );
	$out   = parse_blocks( $first['content'] );
	ok( $first['changed'] && 24000 === ( $out[0]['attrs']['sgsMotion']['elements']['root']['effects'][0]['values']['duration'] ?? null ) && 'mobile' === ( $out[1]['attrs']['sgsMotion']['elements']['root']['effects'][0]['values']['belowBreakpoint'] ?? null ), 'the runner writes both blocks marquee layers', js( array_column( $out, 'attrs' ) ) );
	ok( array( 'align', 'sgsMotion' ) === sorted_copy( array_keys( $out[0]['attrs'] ) ) && array( 'overflowMode', 'sgsMotion' ) === sorted_copy( array_keys( $out[1]['attrs'] ) ), 'the consumed attributes are removed and the unrelated ones kept', js( array_column( $out, 'attrs' ) ) );
	ok( array( 'scrolling' => true ) === $out[2]['attrs'], 'a hero scrolling attribute is untouched' );
	$second = $runner->migrate_content( $first['content'] );
	ok( $second['content'] === $first['content'], 'idempotent: a second run leaves the content byte-identical' );
	$stored = '<!-- wp:sgs/brand-strip {"scrolling":true,"scrollDuration":24,"sgsMotion":{"v":1,"elements":{"root":{"effects":[{"id":"marquee","effect":"marquee","values":{"duration":90000}}]}}}} /-->';
	$third  = $runner->migrate_content( $stored );
	$kept   = parse_blocks( $third['content'] );
	ok( 90000 === ( $kept[0]['attrs']['sgsMotion']['elements']['root']['effects'][0]['values']['duration'] ?? null ) && ! isset( $kept[0]['attrs']['scrollDuration'] ), 'a marquee layer already stored wins over the old duration, and the old attribute is consumed', js( $kept[0]['attrs'] ?? null ) );

	echo "\nRESULT  $pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
