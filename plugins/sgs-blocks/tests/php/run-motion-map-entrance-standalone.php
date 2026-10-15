<?php
/**
 * Standalone test for the `entrance` migration mapper (Spec 38A FR-38A-31, FR-38A-32; build unit M6.2).
 *
 * Loads the REAL mapper, its two helper classes, the real runner, `Sgs_Motion_Stagger` and the shipped
 * `schemas/motion.schema.json`. WordPress is not loaded; `parse_blocks` and `serialize_block_attributes` are minimal
 * stand-ins (copied from run-motion-migrate-standalone.php).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-map-entrance-standalone.php
 *
 * What it proves:
 * - every row of tests/fixtures/motion/legacy-stagger-offset.json (the frozen output of the old browser formula) is
 *   reproduced by the mapper's formula, and the twelve DOM cases by its position rules over a block tree;
 * - for 1, 7 and 12 children, every step and maximum the fixture holds, the delay the mapper STORES on each child
 *   equals the fixture's delay for that child (container mode and own-step mode);
 * - each `sgsAnimation*` attribute family lands where the mapping table says, every effect equals its seeded preset in
 *   scripts/data/motion-presets.json, every fragment is schema-valid, a value with no destination is reported and
 *   nothing is consumed, and a second run changes nothing.
 *
 * Planted faults (each must turn the run red; the run then exits 1). The fault is written into a TEMPORARY COPY of the
 * code under test and the test is run against the copy, so nothing in the repository changes.
 *   SGS_MOTION_ENTRANCE_PLANT=stagger-cap       the default maximum position 7 becomes 8
 *   SGS_MOTION_ENTRANCE_PLANT=duration-ceiling  the custom duration ceiling 5000 becomes 6000
 *   SGS_MOTION_ENTRANCE_PLANT=step-ceiling      the stagger step ceiling 1000 becomes 2000
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {

	$plant = (string) getenv( 'SGS_MOTION_ENTRANCE_PLANT' );
	if ( '' !== $plant ) {
		exit( sgs_entrance_run_planted( $plant ) );
	}

	/**
	 * Copy the code under test into a temp tree, plant the fault there and run this test against the copy.
	 */
	function sgs_entrance_run_planted( string $plant ): int {
		$plugin = dirname( __DIR__, 2 );
		$tmp    = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-entrance-plant-' . bin2hex( random_bytes( 4 ) );
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
		$copy( $plugin . '/tests/fixtures/motion/legacy-stagger-offset.json', $tmp . '/tests/fixtures/motion/legacy-stagger-offset.json' );
		$copy( __FILE__, $tmp . '/tests/php/run-motion-map-entrance-standalone.php' );
		$faults = array(
			'stagger-cap'      => array( '/migrate/class-sgs-motion-legacy-stagger.php', 'const DEFAULT_MAX = 7;', 'const DEFAULT_MAX = 8;' ),
			'duration-ceiling' => array( '/migrate/class-sgs-motion-legacy-entrance.php', 'const DURATION_CEILING = 5000;', 'const DURATION_CEILING = 6000;' ),
			'step-ceiling'     => array( '/migrate/class-sgs-motion-legacy-stagger.php', 'self::int_attr( $step_raw, 0, 1000 )', 'self::int_attr( $step_raw, 0, 2000 )' ),
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
		putenv( 'SGS_MOTION_ENTRANCE_PLANT' );
		$out = array();
		exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $tmp . '/tests/php/run-motion-map-entrance-standalone.php' ) . ' 2>&1', $out, $code );
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
			$top = &$stack[ count( $stack ) - 1 ];
			$name = false === strpos( $t[2], '/' ) ? 'core/' . $t[2] : $t[2];
			if ( '/' === $t[1] ) {
				$done = array_pop( $stack );
				$par  = &$stack[ count( $stack ) - 1 ];
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
	require_once $root . '/includes/motion/migrate/mappers/class-sgs-motion-map-entrance.php';

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

	/** A parsed-block shape. */
	function blk( string $name, array $attrs = array(), array $children = array() ): array {
		return array( 'blockName' => $name, 'attrs' => $attrs, 'innerBlocks' => $children, 'innerHTML' => '', 'innerContent' => array() );
	}

	/** Serialise a tree of comment-only blocks (no inner HTML). */
	function render_tree( array $blocks ): string {
		$out = '';
		foreach ( $blocks as $b ) {
			$name  = preg_replace( '#^core/#', '', (string) $b['blockName'] );
			$attrs = array() === $b['attrs'] ? '' : ' ' . wp_attrs_json( $b['attrs'] );
			$out  .= array() === $b['innerBlocks'] ? "<!-- wp:$name$attrs /-->\n" : "<!-- wp:$name$attrs -->\n" . render_tree( $b['innerBlocks'] ) . "<!-- /wp:$name -->\n";
		}
		return $out;
	}

	/** Apply group-pass patches to a tree the way the runner will: consume, merge, sanitise. */
	function apply_patches( array &$blocks, array $patches, string $path = '' ): void {
		foreach ( $blocks as $i => &$b ) {
			$here = '' === $path ? (string) $i : $path . '/' . $i;
			if ( isset( $patches[ $here ] ) ) {
				$attrs = $b['attrs'];
				foreach ( $patches[ $here ]['consumed'] as $key ) {
					unset( $attrs[ $key ] );
				}
				$merged = Sgs_Motion_Migrate_Merge::merge( $attrs['sgsMotion'] ?? array(), $patches[ $here ]['motion'] );
				if ( array() !== $merged ) {
					$attrs['sgsMotion'] = Sgs_Motion_Document::sanitise( $merged );
				}
				$b['attrs'] = $attrs;
			}
			apply_patches( $b['innerBlocks'], $patches, $here );
		}
	}

	/** The two-pass migration of one post: group pass, then the real runner. */
	function migrate_post( Sgs_Motion_Map_Entrance $mapper, Sgs_Motion_Migrate_Runner $runner, string $content ): array {
		$blocks  = parse_blocks( $content );
		$patches = $mapper->map_groups( $blocks );
		apply_patches( $blocks, $patches );
		$grouped = array() === $patches ? $content : render_tree( $blocks );
		$result  = $runner->migrate_content( $grouped );
		return array( 'content' => $result['content'], 'patches' => $patches, 'flags' => $result['flags'], 'changed' => array() !== $patches || $result['changed'] );
	}

	/**
	 * The writes the editor's stagger re-run would make to an owner's direct children, modelled on
	 * stagger-write.js::staggerUpdates and ::writeSeries for the row-first, no-restart settings the mapper stores: the
	 * helper's delay for direct child j is min( offset + j * step, cap ) at every tier; a tier listed in the child's
	 * `customised` keeps its stored value, any other tier whose stored (inherited) delay differs is rewritten.
	 *
	 * @return array<string,array<string,int>> Rewritten tiers by child path: tier => the helper's delay.
	 */
	function rerun_rewrites( array $patches, array $tree, string $owner ): array {
		$settings = $patches[ $owner ]['motion']['stagger'] ?? null;
		if ( null === $settings ) {
			return array();
		}
		$node = array( 'innerBlocks' => $tree );
		foreach ( explode( '/', $owner ) as $i ) {
			$node = $node['innerBlocks'][ (int) $i ];
		}
		$kids  = array_keys( $node['innerBlocks'] );
		$paths = array( 'desktop' => 'values.delay', 'tablet' => 'devices.tablet.delay', 'mobile' => 'devices.mobile.delay' );
		$out   = array();
		foreach ( $kids as $j => $i ) {
			$path = $owner . '/' . $i;
			$base = isset( $patches[ $path ] ) ? ( $patches[ $path ]['motion']['elements']['root']['entrance']['base'] ?? null ) : null;
			if ( null === $base ) {
				continue;
			}
			$helper = min( (int) ( $settings['offset'] ?? 0 ) + $j * (int) $settings['step'], $settings['cap'] ?? PHP_INT_MAX );
			$stored = (int) ( $base['values']['delay'] ?? 0 );
			foreach ( $paths as $tier => $key ) {
				$stored = 'desktop' === $tier ? $stored : (int) ( $base['devices'][ $tier ]['delay'] ?? $stored );
				if ( ! in_array( $key, $base['customised'] ?? array(), true ) && $helper !== $stored ) {
					$out[ $path ][ $tier ] = $helper;
				}
			}
		}
		return $out;
	}

	/** Every patch fragment must survive the shipped schema untouched. */
	function patches_valid( array $patches ): bool {
		foreach ( $patches as $patch ) {
			if ( array() !== $patch['motion'] && array() !== Sgs_Motion_Migrate_Merge::differences( $patch['motion'], Sgs_Motion_Document::sanitise( $patch['motion'] ) ) ) {
				return false;
			}
		}
		return true;
	}

	function delay_of( array $patch ): int {
		foreach ( $patch['motion']['elements'] ?? array() as $element ) {
			return (int) ( $element['entrance']['base']['values']['delay'] ?? 0 );
		}
		return 0;
	}

	function base_of( array $motion, string $element = 'root' ): ?array {
		return $motion['elements'][ $element ]['entrance']['base'] ?? null;
	}

	$mapper = new Sgs_Motion_Map_Entrance();
	$runner = new Sgs_Motion_Migrate_Runner( array( $mapper ) );

	// 0. The family is listed and loadable from the real mappers folder; the mapper answers on its own.
	ok( in_array( 'entrance', Sgs_Motion_Migrate_Runner::families(), true ) && in_array( 'entrance', Sgs_Motion_Migrate_Runner::loadable_families(), true ), 'the entrance family is listed and loadable from includes/motion/migrate/mappers/' );
	ok( 'entrance' === $mapper->family() && true === $mapper->handles( 'sgs/hero', array( 'sgsAnimation' => 'fade-up' ) ), 'handles() answers without a group pass having run' );
	ok( array() === $mapper->map_groups( array() ) && true === $mapper->handles( 'sgs/hero', array( 'sgsAnimation' => 'fade-up' ) ), 'running the group pass on an empty tree changes nothing' );
	ok( false === $mapper->handles( 'sgs/hero', array( 'align' => 'wide', 'sgsMotion' => array( 'v' => 1 ) ) ), 'a block with no old attribute is not handled' );

	// 1. The frozen fixture, row by row.
	$fixture = json_decode( (string) file_get_contents( $root . '/tests/fixtures/motion/legacy-stagger-offset.json' ), true );
	ok( is_array( $fixture ) && 408 === count( $fixture['rows'] ), 'legacy-stagger-offset.json loads (408 grid and stored rows)' );
	$check_rows = static function ( string $label, array $rows, callable $actual ): void {
		$bad = array();
		foreach ( $rows as $row ) {
			if ( $actual( $row ) !== $row['delay_ms'] ) {
				$bad[] = json_encode( $row ) . ' got ' . json_encode( $actual( $row ) );
			}
		}
		ok( array() === $bad, count( $rows ) . " $label rows reproduced exactly", implode( ' | ', array_slice( $bad, 0, 3 ) ) );
	};
	$check_rows( 'grid and stored', $fixture['rows'], static fn( $r ) => Sgs_Motion_Legacy_Stagger::offset( $r['index'], (string) $r['step'], (string) $r['max'] ) );
	$check_rows( 'default-cap', $fixture['default_cap_rows'], static fn( $r ) => Sgs_Motion_Legacy_Stagger::offset( $r['index'], (string) $r['step'], null ) );
	$check_rows( 'step-clamp', $fixture['step_clamp_rows'], static fn( $r ) => Sgs_Motion_Legacy_Stagger::offset( $r['index'], $r['raw_step'], (string) $r['max'] ) );
	$check_rows( 'max-clamp', $fixture['max_clamp_rows'], static fn( $r ) => Sgs_Motion_Legacy_Stagger::offset( $r['index'], (string) $r['step'], $r['raw_max'] ) );

	// 1b. The twelve DOM cases through the position rules over a block tree.
	$dom_blocks = static function ( \DOMNode $parent, string $path, ?string &$target ) use ( &$dom_blocks ): array {
		$blocks = array();
		$i      = 0;
		foreach ( $parent->childNodes as $node ) {
			if ( ! $node instanceof \DOMElement ) {
				continue;
			}
			$here  = '' === $path ? (string) $i : $path . '/' . $i;
			$attrs = array();
			foreach ( array( 'data-sgs-animation' => 'sgsAnimation', 'data-sgs-animation-stagger' => 'sgsAnimationStagger', 'data-sgs-animation-stagger-children' => 'sgsAnimationStaggerChildren', 'data-sgs-animation-stagger-max' => 'sgsAnimationStaggerMax' ) as $data => $attr ) {
				if ( $node->hasAttribute( $data ) ) {
					$attrs[ $attr ] = $node->getAttribute( $data );
				}
			}
			if ( $node->hasAttribute( 'data-case-target' ) ) {
				$target = $here;
			}
			$blocks[] = blk( 'x/' . $node->tagName, $attrs, $dom_blocks( $node, $here, $target ) );
			++$i;
		}
		return $blocks;
	};
	$dom_bad = array();
	foreach ( $fixture['dom_rows'] as $row ) {
		$doc = new \DOMDocument();
		$doc->loadHTML( '<html><body>' . $row['html'] . '</body></html>', LIBXML_NOERROR | LIBXML_NOWARNING );
		$target = null;
		$tree   = $dom_blocks( $doc->getElementsByTagName( 'body' )->item( 0 ), '', $target );
		$plan   = Sgs_Motion_Legacy_Stagger::plan( $tree );
		$got    = null === $target ? null : ( $plan['offsets'][ $target ]['offset'] ?? null );
		if ( $got !== $row['delay_ms'] ) {
			$dom_bad[] = $row['case'] . ' want ' . json_encode( $row['delay_ms'] ) . ' got ' . json_encode( $got );
		}
	}
	ok( array() === $dom_bad && 12 === count( $fixture['dom_rows'] ), '12 DOM cases (peers, wrappers, nested owners, own step wins) reproduced', implode( ' | ', $dom_bad ) );

	// 2. Stored per-child delays for 1, 7 and 12 children against the fixture.
	$want = array();
	foreach ( $fixture['rows'] as $row ) {
		$want[ $row['mode'] . '|' . $row['index'] . '|' . $row['step'] . '|' . $row['max'] ] = $row['delay_ms'];
	}
	$bad_children = array();
	$bad_own      = array();
	$cases        = 0;
	foreach ( array( 1, 7, 12 ) as $count ) {
		foreach ( array( 0, 40, 55, 100 ) as $step ) {
			foreach ( array( 0, 3, 7, 8 ) as $max ) {
				$kids  = array();
				$owns  = array();
				for ( $i = 0; $i < $count; $i++ ) {
					$kids[] = blk( 'sgs/info-box', array( 'sgsAnimation' => 'fade-up' ) );
					$owns[] = blk( 'sgs/info-box', array( 'sgsAnimation' => 'fade-up', 'sgsAnimationStagger' => (string) $step, 'sgsAnimationStaggerMax' => (string) $max ) );
				}
				$patches = $mapper->map_groups( array( blk( 'sgs/container', array( 'sgsAnimationStaggerChildren' => (string) $step, 'sgsAnimationStaggerMax' => (string) $max ), $kids ) ) );
				$own_p   = $mapper->map_groups( $owns );
				++$cases;
				if ( ! patches_valid( $patches ) || ! patches_valid( $own_p ) ) {
					$bad_children[] = "invalid fragment n=$count step=$step max=$max";
				}
				for ( $i = 0; $i < $count; $i++ ) {
					$c = delay_of( $patches[ '0/' . $i ] ?? array( 'motion' => array() ) );
					$o = delay_of( $own_p[ (string) $i ] ?? array( 'motion' => array() ) );
					if ( $c !== $want[ "children|$i|$step|$max" ] ) {
						$bad_children[] = "n=$count i=$i step=$step max=$max stored $c want " . $want[ "children|$i|$step|$max" ];
					}
					if ( $o !== $want[ "own|$i|$step|$max" ] ) {
						$bad_own[] = "n=$count i=$i step=$step max=$max stored $o want " . $want[ "own|$i|$step|$max" ];
					}
				}
			}
		}
	}
	ok( array() === $bad_children, "stored child delays equal the fixture for 1, 7 and 12 children ($cases container cases)", implode( ' | ', array_slice( $bad_children, 0, 3 ) ) );
	ok( array() === $bad_own, "stored own-step delays equal the fixture for 1, 7 and 12 siblings ($cases sibling cases)", implode( ' | ', array_slice( $bad_own, 0, 3 ) ) );

	// 2b. The stored stored-source case (step 70, max 7): the 8th and later children share 490.
	$kids    = array();
	for ( $i = 0; $i < 12; $i++ ) {
		$kids[] = blk( 'sgs/info-box', array( 'sgsAnimation' => 'fade-up' ) );
	}
	$patches = $mapper->map_groups( array( blk( 'sgs/container', array( 'sgsAnimationStaggerChildren' => '70', 'sgsAnimationStaggerMax' => '7' ), $kids ) ) );
	ok( array( 0, 70, 140, 210, 280, 350, 420, 490, 490, 490, 490, 490 ) === array_map( static fn( $i ) => delay_of( $patches[ '0/' . $i ] ), range( 0, 11 ) ), 'step 70, maximum 7, 12 children: 0 to 420 then 490 for the 8th and later' );
	$helper = $patches['0']['motion']['stagger'] ?? null;
	ok( array( 'apply' => false, 'offset' => 0, 'step' => 70, 'order' => 'row-first', 'perRow' => false, 'cap' => 490 ) === $helper, 'the container stores the helper settings: step 70, offset 0, row-first, no row restart, cap 490', json_encode( $helper ) );
	ok( array( 'sgsAnimationStaggerChildren', 'sgsAnimationStaggerMax' ) === $patches['0']['consumed'] && patches_valid( $patches ), 'the container consumes sgsAnimationStaggerChildren and Max; every fragment is schema-valid' );
	ok( array( 'sgsAnimation' ) === $patches['0/3']['consumed'] && 'entrance-fade-up' === ( base_of( $patches['0/3']['motion'] )['preset'] ?? null ), 'a child consumes sgsAnimation and stores its entrance as the Fade up preset' );

	// 2b2. No maximum stored: the default cap of 7 applies (default-cap fixture rows), and the helper cap is 7 x step.
	$kids = array();
	for ( $i = 0; $i < 13; $i++ ) {
		$kids[] = blk( 'sgs/info-box', array( 'sgsAnimation' => 'fade-up' ) );
	}
	$patches = $mapper->map_groups( array( blk( 'sgs/container', array( 'sgsAnimationStaggerChildren' => '40' ), $kids ) ) );
	$got     = array_map( static fn( $i ) => delay_of( $patches[ '0/' . $i ] ), range( 0, 12 ) );
	$rows    = array_filter( $fixture['default_cap_rows'], static fn( $r ) => 'children' === $r['mode'] && 40 === $r['step'] );
	$agree   = true;
	foreach ( $rows as $row ) {
		$agree = $agree && $got[ $row['index'] ] === $row['delay_ms'];
	}
	ok( $agree && 280 === $got[12] && 280 === ( $patches['0']['motion']['stagger']['cap'] ?? null ) && array() !== $rows, 'no stored maximum: children stop at position 7 (280ms at step 40) as the default-cap fixture rows say; helper cap 280' );

	// 2c. Own delay adds to the stagger and is marked customised; a cap above the schema ceiling is reported.
	$patches = $mapper->map_groups( array( blk( 'sgs/container', array( 'sgsAnimationStaggerChildren' => '70' ), array( blk( 'a/b', array( 'sgsAnimation' => 'fade-in' ) ), blk( 'a/b', array( 'sgsAnimation' => 'fade-in' ) ), blk( 'a/b', array( 'sgsAnimation' => 'fade-in', 'sgsAnimationDelay' => '200' ) ) ) ) ) );
	$third   = base_of( $patches['0/2']['motion'] );
	ok( 340 === ( $third['values']['delay'] ?? null ) && array( 'values.delay', 'devices.tablet.delay', 'devices.mobile.delay' ) === ( $third['customised'] ?? null ), 'an own delay of 200 plus position 2 x 70 stores 340 and is marked customised on every tier' );
	ok( ! isset( base_of( $patches['0/1']['motion'] )['customised'] ), 'a child with no own delay is not marked customised' );
	$patches = $mapper->map_groups( array( blk( 'sgs/container', array( 'sgsAnimationStaggerChildren' => '1000', 'sgsAnimationStaggerMax' => '50' ), array( blk( 'a/b', array( 'sgsAnimation' => 'fade-in' ) ) ) ) ) );
	ok( ! isset( $patches['0']['motion']['stagger']['cap'] ) && 1000 === $patches['0']['motion']['stagger']['step'] && 'sgsAnimationStaggerMax' === ( $patches['0']['reported'][0]['attr'] ?? '' ), 'a cap above 20000ms is left out of the helper and reported (step 1000, max 50)' );

	// 2d. The editor re-run (use-stagger-rerun.js -> stagger-write.js::staggerUpdates) counts EVERY direct child, while
	// the old stagger counted only the animated ones; a child whose stored delay differs from its direct-child
	// position's helper delay must be marked customised on every tier the re-run would otherwise rewrite.
	$tree    = array( blk( 'sgs/container', array( 'sgsAnimationStaggerChildren' => '100' ), array( blk( 'sgs/heading', array( 'sgsAnimation' => 'fade-in' ) ), blk( 'sgs/spacer' ), blk( 'sgs/card', array( 'sgsAnimation' => 'fade-in' ) ) ) ) );
	$patches = $mapper->map_groups( $tree );
	$card    = base_of( $patches['0/2']['motion'] );
	$redone  = rerun_rewrites( $patches, $tree, '0' );
	ok( 100 === ( $card['values']['delay'] ?? null ) && array() === $redone, 'Heading, Spacer (not animated), Card at step 100: Card stores the old 100ms and a re-run rewrites nothing', json_encode( array( 'card' => $card, 'rewrites' => $redone ) ) );
	ok( ! isset( base_of( $patches['0/0']['motion'] )['customised'] ) && patches_valid( $patches ), 'the Heading at position 0 (0ms either way) is not marked, and every fragment is schema-valid' );
	$patches = $mapper->map_groups( array( blk( 'sgs/container', array( 'sgsAnimationStaggerChildren' => '70' ), array( blk( 'a/b', array( 'sgsAnimation' => 'fade-in' ) ), blk( 'a/b', array( 'sgsAnimation' => 'fade-in' ) ), blk( 'a/b', array( 'sgsAnimation' => 'fade-in', 'sgsAnimationDelay' => '200' ) ) ) ) ) );
	$redone  = rerun_rewrites( $patches, array( blk( 'sgs/container', array(), array( blk( 'a/b' ), blk( 'a/b' ), blk( 'a/b' ) ) ) ), '0' );
	ok( array() === $redone, 'an own delay (340ms against a helper 140ms) survives the re-run on Tablet and Mobile too', json_encode( $redone ) );

	// 3. The attribute families, one by one (each through map(): the group pass has run).
	$map = static fn( array $attrs, string $block = 'sgs/hero' ): array => $mapper->map( $block, $attrs );
	$r   = $map( array( 'sgsAnimation' => 'fade-up' ) );
	ok( array( 'v' => 1, 'elements' => array( 'root' => array( 'entrance' => array( 'base' => array( 'preset' => 'entrance-fade-up', 'trigger' => 'scroll', 'values' => array( 'from' => array( 'opacity' => 0, 'translateY' => 'token:entrance.distance' ), 'to' => array( 'opacity' => 1, 'translateY' => 0 ) ) ) ) ) ) ) === $r['motion'] && array( 'sgsAnimation' ) === $r['consumed'], 'sgsAnimation alone: the preset, a scroll trigger and the preset values; only sgsAnimation consumed', json_encode( $r ) );

	$r = $map( array( 'sgsAnimation' => 'fade-left', 'sgsAnimationDelay' => '300', 'sgsAnimationDuration' => 'slow', 'sgsAnimationEasing' => 'ease-out', 'sgsAnimationDistance' => '50', 'sgsAnimationTrigger' => '20' ) );
	$v = base_of( $r['motion'] )['values'] ?? array();
	ok( 300 === $v['delay'] && 'token:duration.slow' === $v['duration'] && 'token:easing.ease-out' === $v['easing'] && 50 === $v['from']['translateX'] && 20 === $v['start'] && 'scroll' === base_of( $r['motion'] )['trigger'], 'delay, duration token, easing token, distance and start line land on values; trigger scroll', json_encode( $v ) );
	ok( 6 === count( $r['consumed'] ) && array() === $r['reported'], 'all six attributes given are consumed, nothing reported' );

	$r = $map( array( 'sgsAnimation' => 'scale-in', 'sgsAnimationStart' => 'load', 'sgsAnimationTrigger' => '30' ) );
	ok( 'load' === base_of( $r['motion'] )['trigger'] && ! isset( base_of( $r['motion'] )['values']['start'] ) && false === strpos( json_encode( $r['motion'] ), '"start"' ), 'sgsAnimationStart "load" is the load trigger; a start line is inert there' );
	ok( 'inert' === substr( $r['reported'][0]['reason'] ?? '', 0, 5 ) && true === $r['reported'][0]['consumed'] && in_array( 'sgsAnimationTrigger', $r['consumed'], true ), 'the inert start line is reported and consumed' );

	$names = array();
	foreach ( array( 'instant', 'fast', 'medium', 'slow', 'extra-slow' ) as $d ) {
		$names[] = base_of( $map( array( 'sgsAnimation' => 'fade-in', 'sgsAnimationDuration' => $d ) )['motion'] )['values']['duration'] ?? '';
	}
	ok( array( 'token:duration.instant', 'token:duration.fast', 'token:duration.medium', 'token:duration.slow', 'token:duration.extra-slow' ) === $names, 'the five duration names become duration tokens' );
	$names = array();
	foreach ( array( 'default', 'ease-out', 'ease-in', 'spring', 'linear' ) as $e ) {
		$names[] = base_of( $map( array( 'sgsAnimation' => 'fade-in', 'sgsAnimationEasing' => $e ) )['motion'] )['values']['easing'] ?? '';
	}
	ok( array( 'token:easing.default', 'token:easing.ease-out', 'token:easing.ease-in', 'token:easing.spring', 'token:easing.linear' ) === $names, 'the five easing names become easing tokens' );
	$r = $map( array( 'sgsAnimation' => 'fade-in', 'sgsAnimationDuration' => '1200', 'sgsAnimationEasing' => 'cubic-bezier(0.4, 0, 0.2, 1)' ) );
	ok( 1200 === base_of( $r['motion'] )['values']['duration'] && 'cubic-bezier(0.4, 0, 0.2, 1)' === base_of( $r['motion'] )['values']['easing'], 'a custom millisecond duration and a raw cubic-bezier are stored as they were' );
	$r = $map( array( 'sgsAnimation' => 'fade-in', 'sgsAnimationDuration' => '9000' ) );
	ok( 5000 === base_of( $r['motion'] )['values']['duration'] && 'clamped' === substr( $r['reported'][0]['reason'] ?? '', 0, 7 ), 'a custom duration over 5000 is clamped as the old player did and the clamp is reported' );

	$d = static fn( string $effect, string $dist ): mixed => ( base_of( $map( array( 'sgsAnimation' => $effect, 'sgsAnimationDistance' => $dist ) )['motion'] )['values']['from'] ?? array() );
	ok( 30 === $d( 'fade-up', '0' )['translateY'] && 100 === $d( 'slide-up', '0' )['translateY'] && -30 === $d( 'fade-down', '0' )['translateY'] && -50 === $d( 'fade-down', '50' )['translateY'] && 15 === $d( 'slide-left', '15' )['translateX'] * -1 && -100 === $d( 'slide-left', '0' )['translateX'], 'a distance replaces the travel with the effect sign; 0 falls back to the effect fixed distance (30 or 100)' );
	ok( 400 === $d( 'fade-up', '900' )['translateY'], 'a distance over 400 is clamped to 400' );
	$r = $map( array( 'sgsAnimation' => 'scale-in', 'sgsAnimationDistance' => '50' ) );
	ok( true === $r['reported'][0]['consumed'] && in_array( 'sgsAnimationDistance', $r['consumed'], true ) && 0.9 === base_of( $r['motion'] )['values']['from']['scale'], 'a distance on an effect that does not travel is reported as inert and consumed' );
	$r = $map( array( 'sgsAnimation' => 'bounce-in', 'sgsAnimationEasing' => 'linear' ) );
	ok( 'token:easing.spring-bouncy' === base_of( $r['motion'] )['values']['easing'] && true === $r['reported'][0]['consumed'], 'bounce-in keeps its own overshoot curve; a stored easing is reported as inert' );
	$r = $map( array( 'sgsAnimation' => 'flip-in' ) );
	ok( ! isset( base_of( $r['motion'] )['preset'] ) && 30 === base_of( $r['motion'] )['values']['from']['rotateX'] && 600 === base_of( $r['motion'] )['values']['perspective'], 'flip-in has no seeded preset: its values (rotateX 30, perspective 600) are written out' );

	$presets = json_decode( (string) file_get_contents( $root . '/scripts/data/motion-presets.json' ), true )['presets'];
	$by_slug = array_column( $presets, null, 'slug' );
	$drift   = array();
	foreach ( Sgs_Motion_Legacy_Entrance::EFFECTS as $effect => $spec ) {
		if ( null === $spec['preset'] ) {
			continue;
		}
		$seed = $by_slug[ $spec['preset'] ]['values'] ?? null;
		$got  = base_of( $map( array( 'sgsAnimation' => $effect ) )['motion'] )['values'] ?? array();
		$seed_easing = $seed['easing'] ?? null;
		$easing_ok   = 'token:entrance.easing' === $seed_easing ? ! isset( $got['easing'] ) : ( $got['easing'] ?? null ) === $seed_easing;
		if ( null === $seed || $got['from'] !== $seed['from'] || $got['to'] !== $seed['to'] || ! $easing_ok ) {
			$drift[] = $effect;
		}
	}
	ok( array() === $drift && 16 === count( Sgs_Motion_Legacy_Entrance::EFFECTS ), 'all 16 effects match their seeded preset (from, to) in scripts/data/motion-presets.json (15 presets and flip-in)', implode( ',', $drift ) );

	$r = $map( array( 'sgsAnimation' => 'none', 'sgsAnimationDelay' => '300', 'sgsAnimationDuration' => 'slow' ) );
	ok( array() === $r['motion'] && 3 === count( $r['consumed'] ) && 2 === count( $r['reported'] ), 'sgsAnimation "none" carries no entrance: the effect and its inert settings are consumed and the settings reported' );

	// 4. Values with no destination: reported, nothing consumed, nothing coerced.
	foreach ( array(
		'an unknown effect'             => array( array( 'sgsAnimation' => 'zoom-spin', 'sgsAnimationDelay' => '100' ), 'sgsAnimation' ),
		'a duration name outside tokens' => array( array( 'sgsAnimation' => 'fade-up', 'sgsAnimationDuration' => 'glacial' ), 'sgsAnimationDuration' ),
		'an easing the schema refuses'   => array( array( 'sgsAnimation' => 'fade-up', 'sgsAnimationEasing' => 'bounce-ish' ), 'sgsAnimationEasing' ),
		'a distance in em'               => array( array( 'sgsAnimation' => 'fade-up', 'sgsAnimationDistance' => '2em' ), 'sgsAnimationDistance' ),
		'a delay with a unit'            => array( array( 'sgsAnimation' => 'fade-up', 'sgsAnimationDelay' => '3s' ), 'sgsAnimationDelay' ),
		'a start other than load'        => array( array( 'sgsAnimation' => 'fade-up', 'sgsAnimationStart' => 'hover' ), 'sgsAnimationStart' ),
		'a start line that is no number' => array( array( 'sgsAnimation' => 'fade-up', 'sgsAnimationTrigger' => 'high' ), 'sgsAnimationTrigger' ),
	) as $label => $case ) {
		$r    = $map( $case[0] );
		$rows = array_column( $r['reported'], 'consumed', 'attr' );
		ok( array() === $r['motion'] && array() === $r['consumed'] && isset( $rows[ $case[1] ] ) && false === $rows[ $case[1] ], "$label is reported and the whole block's entrance is left unmapped (nothing consumed)", json_encode( $r ) );
	}
	$r = $map( array( 'sgsAnimationDelay' => '300' ) );
	ok( array() === $r['motion'] && array() === $r['consumed'] && 1 === count( $r['reported'] ), 'a setting with no sgsAnimation is reported and left in place (no block-default inference)' );
	$r = $map( array( 'sgsAnimationStagger' => '70', 'sgsAnimationStaggerMax' => '5' ) );
	ok( array( 'sgsAnimationStagger', 'sgsAnimationStaggerMax' ) === $r['consumed'] && 2 === count( $r['reported'] ), 'an own stagger step on a block with no entrance does nothing today: consumed and reported' );
	$r = $map( array( 'sgsAnimationStagger' => 'abc' ) );
	ok( array() === $r['consumed'] && false === $r['reported'][0]['consumed'], 'a non-numeric stagger step is reported and left in place' );

	// 5. A block that animates its items puts the entrance on the declared item part.
	Sgs_Motion_Map_Entrance::set_supports_provider( static fn( string $name ): array => 'sgs/card-grid' === $name ? array( 'animationItems' => '.sgs-card-grid__item, .sgs-product-card', 'elements' => array( 'grid' => array(), 'item' => array() ) ) : ( 'sgs/odd-grid' === $name ? array( 'animationItems' => '.sgs-odd-grid__ghost', 'elements' => array( 'grid' => array() ) ) : array() ) );
	$r = $map( array( 'sgsAnimation' => 'fade-up', 'sgsAnimationDelay' => '100' ), 'sgs/card-grid' );
	ok( array( 'item' ) === array_keys( $r['motion']['elements'] ) && 100 === base_of( $r['motion'], 'item' )['values']['delay'], 'supports.sgs.animationItems: the entrance lands on the declared item part, not the root' );
	$r = $map( array( 'sgsAnimation' => 'fade-up' ), 'sgs/odd-grid' );
	ok( array() === $r['motion'] && array() === $r['consumed'], 'an item selector that names no declared part leaves the entrance unmapped and reported' );
	Sgs_Motion_Map_Entrance::set_supports_provider( null );

	// 6. Two-pass migration of whole posts, then a second run changes nothing.
	$post = render_tree( array(
		blk( 'sgs/container', array( 'sgsAnimation' => 'fade-in', 'sgsAnimationStaggerChildren' => '70', 'sgsAnimationStaggerMax' => '3' ), array(
			blk( 'sgs/info-box', array( 'sgsAnimation' => 'fade-up' ) ),
			blk( 'sgs/info-box', array( 'sgsAnimation' => 'fade-up', 'sgsAnimationDelay' => '50' ) ),
			blk( 'sgs/info-box', array( 'sgsAnimation' => 'slide-left', 'sgsAnimationDuration' => 'fast' ) ),
			blk( 'sgs/info-box', array( 'sgsAnimation' => 'fade-up' ) ),
			blk( 'sgs/info-box', array( 'sgsAnimation' => 'fade-up' ) ),
		) ),
		blk( 'sgs/hero', array( 'sgsAnimation' => 'blur-in', 'sgsAnimationStart' => 'load', 'align' => 'full' ) ),
		blk( 'sgs/cta', array( 'sgsAnimation' => 'none', 'sgsAnimationDelay' => '10' ) ),
	) );
	$first = migrate_post( $mapper, $runner, $post );
	ok( $first['changed'] && false === strpos( $first['content'], 'sgsAnimation' ) && array() === $first['flags'], 'a post with a container, children, a load hero and a "none" block: no sgsAnimation* attribute is left, no flag raised', json_encode( $first['flags'] ) );
	$blocks = parse_blocks( $first['content'] );
	$delays = array_map( static fn( $b ) => $b['attrs']['sgsMotion']['elements']['root']['entrance']['base']['values']['delay'] ?? 0, $blocks[0]['innerBlocks'] );
	ok( array( 0, 120, 140, 210, 210 ) === $delays, 'children store 0, 50 + 70, 2 x 70, then 210 for the 4th and 5th (maximum 3)', json_encode( $delays ) );
	ok( 'entrance-fade-in' === ( $blocks[0]['attrs']['sgsMotion']['elements']['root']['entrance']['base']['preset'] ?? '' ), 'the container keeps its own entrance beside the helper settings' );
	ok( 3 * 70 === ( $blocks[0]['attrs']['sgsMotion']['stagger']['cap'] ?? null ) && 'load' === ( $blocks[1]['attrs']['sgsMotion']['elements']['root']['entrance']['base']['trigger'] ?? '' ) && ! isset( $blocks[2]['attrs']['sgsMotion'] ) && 'full' === $blocks[1]['attrs']['align'], 'helper cap 210; the hero keeps its other attributes and plays on load; the "none" block gets no motion' );
	$second = migrate_post( $mapper, $runner, $first['content'] );
	ok( ! $second['changed'] && $second['content'] === $first['content'] && array() === $second['patches'], 'idempotent: running the mapper on already-migrated content changes nothing' );
	$clean = '<!-- wp:sgs/hero {"align":"full","sgsMotion":{"v":1,"elements":{"root":{"entrance":{"base":{"trigger":"scroll","values":{"from":{"opacity":0},"to":{"opacity":1}}}}}}}} /-->';
	$third = migrate_post( $mapper, $runner, $clean );
	ok( ! $third['changed'] && $third['content'] === $clean, 'content that holds only sgsMotion is untouched' );

	echo "\nRESULT  $pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
