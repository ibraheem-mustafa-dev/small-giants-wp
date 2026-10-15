<?php
/**
 * Standalone test for the `state` migration mapper (Spec 38A FR-38A-53, FR-38A-31, FR-38A-32; build unit M5.17).
 *
 * Loads the REAL mapper, its value reader, the real runner and the shipped `schemas/motion.schema.json`. WordPress is
 * not loaded; `parse_blocks` and `serialize_block_attributes` are minimal stand-ins (as in
 * run-motion-map-nav-bar-standalone.php).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-map-state-standalone.php
 *
 * What it proves:
 * - the cart's `countPopAnimation` (`change`, `load-and-change`, the legacy booleans) becomes a `state` layer on the
 *   `badge` part carrying the old pop's three keyframes over 500ms `ease`; `off` has no layer and is consumed; a value
 *   the renderer read as off is reported and kept;
 * - the burger's `burgerMorphDuration`, `burgerMorphEasing` and `burgerMorphEasingCustom` become one timing-only `state`
 *   layer on the `burger` part (a token name stays a token, a custom curve is kept, the duration is clamped as
 *   rendered); a `none` pose consumes them as inert; a non-number is reported and kept; the pose attribute is untouched;
 * - the accordion's `iconRotation` becomes a `to` rotation on the `turning-icon` part over the medium duration and
 *   default easing tokens the old transition read; `0` is consumed with no layer;
 * - every fragment is schema-valid, the runner migrates a whole post with no flag, and a second run changes nothing.
 *
 * Planted faults (each must turn the run red; the run then exits 1). The fault is written into a TEMPORARY COPY of the
 * code under test and the test runs against the copy, so nothing in the repository changes.
 *   SGS_MOTION_STATE_PLANT=pop     the pop overshoots to 1 instead of 1.15
 *   SGS_MOTION_STATE_PLANT=load    load-and-change maps to the add-only state
 *   SGS_MOTION_STATE_PLANT=clamp   the burger duration is not clamped to 1200ms
 *   SGS_MOTION_STATE_PLANT=turn    the icon turns one degree too far
 *   SGS_MOTION_STATE_PLANT=token   the icon turn stores a literal ease instead of the default easing token
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {

	$plant = (string) getenv( 'SGS_MOTION_STATE_PLANT' );
	if ( '' !== $plant ) {
		exit( sgs_state_run_planted( $plant ) );
	}

	/**
	 * Copy the code under test into a temp tree, plant the fault there and run this test against the copy.
	 */
	function sgs_state_run_planted( string $plant ): int {
		$plugin = dirname( __DIR__, 2 );
		$tmp    = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-state-plant-' . bin2hex( random_bytes( 4 ) );
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
		$copy( $plugin . '/includes', $tmp . '/includes' );
		$copy( $plugin . '/schemas/motion.schema.json', $tmp . '/schemas/motion.schema.json' );
		$copy( $plugin . '/scripts/data/motion-presets.json', $tmp . '/scripts/data/motion-presets.json' );
		foreach ( array( 'cart', 'nav-bar-menu', 'accordion' ) as $slug ) {
			$copy( $plugin . '/src/blocks/' . $slug . '/block.json', $tmp . '/src/blocks/' . $slug . '/block.json' );
		}
		$copy( __FILE__, $tmp . '/tests/php/run-motion-map-state-standalone.php' );
		$mapper = '/includes/motion/migrate/mappers/class-sgs-motion-map-state.php';
		$faults = array(
			'pop'   => array( $mapper, "'scale'   => 1.15,", "'scale'   => 1," ),
			'load'  => array( $mapper, "'change' === \$raw ? 'count-changed' : 'count-loaded'", "'count-changed'" ),
			'clamp' => array( $mapper, 'const MORPH_MAX     = 1200;', 'const MORPH_MAX     = 12000;' ),
			'turn'  => array( $mapper, "'rotate' => Sgs_Motion_Legacy_Hover_Value::tidy( \$degrees )", "'rotate' => Sgs_Motion_Legacy_Hover_Value::tidy( \$degrees ) + 1" ),
			'token' => array( $mapper, "'easing'   => 'token:easing.default',", "'easing'   => 'ease'," ),
		);
		if ( ! isset( $faults[ $plant ] ) ) {
			echo "Unknown plant '$plant'\n";
			return 2;
		}
		list( $file, $from, $to ) = $faults[ $plant ];
		$path                     = $tmp . $file;
		$source                   = str_replace( "\r\n", "\n", (string) file_get_contents( $path ) );
		if ( false === strpos( $source, $from ) ) {
			echo "Plant '$plant' did not apply: '$from' not found in $file\n";
			return 2;
		}
		file_put_contents( $path, str_replace( $from, $to, $source ) );
		echo "PLANTED  $plant in a temporary copy of $file\n";
		putenv( 'SGS_MOTION_STATE_PLANT' );
		$out = array();
		exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $tmp . '/tests/php/run-motion-map-state-standalone.php' ) . ' 2>&1', $out, $code );
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
	require_once $root . '/includes/motion/migrate/mappers/class-sgs-motion-map-state.php';

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

	function patches_valid( array $patches ): bool {
		foreach ( $patches as $patch ) {
			if ( array() !== $patch['motion'] && array() !== Sgs_Motion_Migrate_Merge::differences( $patch['motion'], Sgs_Motion_Document::sanitise( $patch['motion'] ) ) ) {
				return false;
			}
		}
		return true;
	}

	function base_of( array $patch, string $element ): ?array {
		return $patch['motion']['elements'][ $element ]['entrance']['base'] ?? null;
	}

	function reasons( array $patch ): string {
		return implode( ' | ', array_map( static fn( $r ) => $r['attr'] . ': ' . $r['reason'], $patch['reported'] ) );
	}

	$mapper = new Sgs_Motion_Map_State();
	$runner = new Sgs_Motion_Migrate_Runner( array( $mapper ) );

	// 0. The family is listed and loadable; handles() answers per block; the blocks declare the states and the part.
	ok( in_array( 'state', Sgs_Motion_Migrate_Runner::families(), true ) && in_array( 'state', Sgs_Motion_Migrate_Runner::loadable_families(), true ), 'the state family is listed and loadable from includes/motion/migrate/mappers/' );
	ok( 'state' === $mapper->family()
		&& $mapper->handles( 'sgs/cart', array( 'countPopAnimation' => 'change' ) )
		&& $mapper->handles( 'sgs/nav-bar-menu', array( 'burgerMorphEasing' => 'ease' ) )
		&& $mapper->handles( 'sgs/accordion', array( 'iconRotation' => 45 ) )
		&& ! $mapper->handles( 'sgs/cart', array( 'iconName' => 'bag' ) )
		&& ! $mapper->handles( 'sgs/nav-bar-menu', array( 'burgerMorph' => 'x' ) )
		&& ! $mapper->handles( 'sgs/accordion-item', array( 'iconRotation' => 45 ) ),
		'handles() answers for the three blocks holding an old attribute only (the burger pose and the item block are not this family)' );
	$cart_json = json_decode( (string) file_get_contents( $root . '/src/blocks/cart/block.json' ), true );
	$bar_json  = json_decode( (string) file_get_contents( $root . '/src/blocks/nav-bar-menu/block.json' ), true );
	$acc_json  = json_decode( (string) file_get_contents( $root . '/src/blocks/accordion/block.json' ), true );
	ok( array( 'count-changed', 'count-loaded' ) === ( $cart_json['supports']['sgs']['motion']['states'] ?? null ) && in_array( 'menu-open', $bar_json['supports']['sgs']['motion']['states'] ?? array(), true ) && array( 'expanded' ) === ( $acc_json['supports']['sgs']['motion']['states'] ?? null ), 'the three blocks declare count-changed and count-loaded, menu-open and expanded in supports.sgs.motion.states' );
	ok( isset( $cart_json['supports']['sgs']['elements']['badge'] ) && ! array_key_exists( 'motion', $cart_json['supports']['sgs']['elements']['badge'] ) && isset( $bar_json['supports']['sgs']['elements']['burger'] ) && '.sgs-accordion-item__icon-open--rotates' === ( $acc_json['supports']['sgs']['elements']['turning-icon']['selector'] ?? '' ), 'the layers have parts to land on: cart badge, burger toggle, accordion turning-icon' );

	// 1. Cart.
	$pop_keyframes = array(
		array( 'offset' => 0, 'opacity' => 0, 'scale' => 0.6 ),
		array( 'offset' => 60, 'opacity' => 1, 'scale' => 1.15 ),
		array( 'offset' => 100, 'opacity' => 1, 'scale' => 1 ),
	);
	$change = $mapper->map( 'sgs/cart', array( 'countPopAnimation' => 'change', 'iconName' => 'bag' ) );
	ok( array( 'trigger' => 'state', 'state' => 'count-changed', 'values' => array( 'keyframes' => $pop_keyframes, 'duration' => 500, 'easing' => 'ease' ) ) === base_of( $change, 'badge' ), 'change: a count-changed state layer on the badge with the old pop keyframes over 500ms ease', json_encode( base_of( $change, 'badge' ) ) );
	ok( array( 'countPopAnimation' ) === $change['consumed'] && patches_valid( array( $change ) ) && false !== strpos( reasons( $change ), 'whole pop' ), 'change: the attribute is consumed, the fragment is schema-valid, the whole-pop easing difference is reported', reasons( $change ) );
	$load = $mapper->map( 'sgs/cart', array( 'countPopAnimation' => 'load-and-change' ) );
	ok( 'count-loaded' === ( base_of( $load, 'badge' )['state'] ?? null ) && $pop_keyframes === ( base_of( $load, 'badge' )['values']['keyframes'] ?? null ), 'load-and-change: the count-loaded state (also pops at load), the same keyframes' );
	ok( 'count-loaded' === ( base_of( $mapper->map( 'sgs/cart', array( 'countPopAnimation' => true ) ), 'badge' )['state'] ?? null ) && array() === $mapper->map( 'sgs/cart', array( 'countPopAnimation' => false ) )['motion'], 'the legacy booleans read as the renderer reads them: true is load-and-change, false is off' );
	$off = $mapper->map( 'sgs/cart', array( 'countPopAnimation' => 'off' ) );
	ok( array() === $off['motion'] && array( 'countPopAnimation' ) === $off['consumed'] && array() === $off['reported'], 'off: no layer, the attribute is consumed, nothing is reported' );
	$odd = $mapper->map( 'sgs/cart', array( 'countPopAnimation' => 'always' ) );
	ok( array() === $odd['motion'] && array() === $odd['consumed'] && false !== strpos( reasons( $odd ), 'left in place' ), 'an unknown mode is reported and kept', reasons( $odd ) );

	// 2. Burger.
	$morph = $mapper->map( 'sgs/nav-bar-menu', array( 'burgerMorphDuration' => 320, 'burgerMorphEasing' => 'default', 'burgerMorph' => 'x-rotate' ) );
	ok( array( 'trigger' => 'state', 'state' => 'menu-open', 'values' => array( 'duration' => 320, 'easing' => 'token:easing.default' ) ) === base_of( $morph, 'burger' ) && array( 'burgerMorphDuration', 'burgerMorphEasing' ) === $morph['consumed'] && patches_valid( array( $morph ) ), 'a timing-only menu-open layer on the burger: 320ms, the default easing stays a token; the pose attribute is not consumed', json_encode( base_of( $morph, 'burger' ) ) );
	$only_easing = base_of( $mapper->map( 'sgs/nav-bar-menu', array( 'burgerMorphEasing' => 'drafts' ) ), 'burger' );
	ok( 200 === ( $only_easing['values']['duration'] ?? null ) && 'cubic-bezier(0.16, 0.84, 0.32, 1)' === ( $only_easing['values']['easing'] ?? null ), 'a bar storing only the easing keeps the old 200ms; the drafts curve is its literal curve' );
	$custom = base_of( $mapper->map( 'sgs/nav-bar-menu', array( 'burgerMorphEasing' => 'custom', 'burgerMorphEasingCustom' => 'cubic-bezier(0.1, 0.7, 0.3, 1)' ) ), 'burger' );
	ok( 'cubic-bezier(0.1, 0.7, 0.3, 1)' === ( $custom['values']['easing'] ?? null ), 'a valid custom curve is kept' );
	$bad_curve = $mapper->map( 'sgs/nav-bar-menu', array( 'burgerMorphEasing' => 'custom', 'burgerMorphEasingCustom' => 'bouncy' ) );
	ok( 'ease' === ( base_of( $bad_curve, 'burger' )['values']['easing'] ?? null ) && false !== strpos( reasons( $bad_curve ), 'rendered as ease' ) && in_array( 'burgerMorphEasingCustom', $bad_curve['consumed'], true ), 'an invalid custom curve rendered as ease: stored as ease, reported', reasons( $bad_curve ) );
	$clamped = $mapper->map( 'sgs/nav-bar-menu', array( 'burgerMorphDuration' => 5000 ) );
	ok( 1200 === ( base_of( $clamped, 'burger' )['values']['duration'] ?? null ) && false !== strpos( reasons( $clamped ), 'clamped' ), 'a duration over 1200ms is stored as rendered (1200) and reported', reasons( $clamped ) );
	$nan = $mapper->map( 'sgs/nav-bar-menu', array( 'burgerMorphDuration' => 'fast', 'burgerMorphEasing' => 'default' ) );
	ok( array() === $nan['motion'] && array() === $nan['consumed'] && false !== strpos( reasons( $nan ), 'not a number' ), 'a non-number leaves the bar unmapped and reported', reasons( $nan ) );
	$static = $mapper->map( 'sgs/nav-bar-menu', array( 'burgerMorph' => 'none', 'burgerMorphDuration' => 400 ) );
	ok( array() === $static['motion'] && array( 'burgerMorphDuration' ) === $static['consumed'] && false !== strpos( reasons( $static ), 'inert' ), 'pose none: the timing played nothing, so it is consumed and reported inert, with no layer', reasons( $static ) );

	// 3. Accordion.
	$turn = $mapper->map( 'sgs/accordion', array( 'iconRotation' => 45 ) );
	ok( array( 'trigger' => 'state', 'state' => 'expanded', 'values' => array( 'to' => array( 'rotate' => 45 ), 'duration' => 'token:duration.medium', 'easing' => 'token:easing.default' ) ) === base_of( $turn, 'turning-icon' ) && array( 'iconRotation' ) === $turn['consumed'] && patches_valid( array( $turn ) ), 'iconRotation 45: an expanded layer turning the icon 45 degrees over the medium duration and default easing tokens', json_encode( base_of( $turn, 'turning-icon' ) ) );
	$half = base_of( $mapper->map( 'sgs/accordion', array( 'iconRotation' => 90.5 ) ), 'turning-icon' );
	ok( 90.5 === ( $half['values']['to']['rotate'] ?? null ), 'a fractional angle is kept' );
	$zero = $mapper->map( 'sgs/accordion', array( 'iconRotation' => 0 ) );
	ok( array() === $zero['motion'] && array( 'iconRotation' ) === $zero['consumed'], 'iconRotation 0 (cross-fade) has no layer and is consumed' );
	$over = $mapper->map( 'sgs/accordion', array( 'iconRotation' => 720 ) );
	ok( 360 === ( base_of( $over, 'turning-icon' )['values']['to']['rotate'] ?? null ) && false !== strpos( reasons( $over ), 'clamped' ), 'an angle over 360 is stored as rendered (360) and reported', reasons( $over ) );
	$word = $mapper->map( 'sgs/accordion', array( 'iconRotation' => 'quarter' ) );
	ok( array() === $word['motion'] && array() === $word['consumed'] && false !== strpos( reasons( $word ), 'not a number' ), 'a non-number is reported and kept', reasons( $word ) );

	// 4. NEGATIVE CONTROL: the schema check refuses a bad value, so the validity assertions are not vacuous.
	$neg = array( 'v' => 1, 'elements' => array( 'badge' => array( 'entrance' => array( 'base' => array( 'trigger' => 'state', 'state' => 'count-changed', 'values' => array( 'keyframes' => array( array( 'offset' => 0, 'scale' => 'huge' ) ) ) ) ) ) ) );
	ok( ! patches_valid( array( array( 'motion' => $neg ) ) ), 'NEGATIVE CONTROL: the schema check refuses an invalid keyframe value' );

	// 5. A whole post through the real runner, then a second run.
	$post   = render_tree( array( blk( 'sgs/cart', array( 'countPopAnimation' => 'change', 'iconName' => 'bag' ) ), blk( 'sgs/nav-bar-menu', array( 'burgerMorphDuration' => 320, 'burgerMorph' => 'x', 'ref' => 12 ) ), blk( 'sgs/accordion', array( 'iconRotation' => 45 ) ) ) );
	$first  = $runner->migrate_content( $post );
	$blocks = parse_blocks( $first['content'] );
	ok( $first['changed'] && array() === $first['flags'], 'the runner migrates the post with no flag', json_encode( $first['flags'] ) );
	ok( ! isset( $blocks[0]['attrs']['countPopAnimation'] ) && 'bag' === ( $blocks[0]['attrs']['iconName'] ?? null ) && 'count-changed' === ( $blocks[0]['attrs']['sgsMotion']['elements']['badge']['entrance']['base']['state'] ?? null ), 'the cart keeps its icon and carries the badge layer' );
	ok( ! isset( $blocks[1]['attrs']['burgerMorphDuration'] ) && 'x' === ( $blocks[1]['attrs']['burgerMorph'] ?? null ) && 12 === ( $blocks[1]['attrs']['ref'] ?? null ) && 320 === ( $blocks[1]['attrs']['sgsMotion']['elements']['burger']['entrance']['base']['values']['duration'] ?? null ), 'the bar keeps its pose and menu ref and carries the burger layer' );
	ok( ! isset( $blocks[2]['attrs']['iconRotation'] ) && 45 === ( $blocks[2]['attrs']['sgsMotion']['elements']['turning-icon']['entrance']['base']['values']['to']['rotate'] ?? null ), 'the accordion carries the turning-icon layer' );
	$second = $runner->migrate_content( $first['content'] );
	ok( ! $second['changed'] && $second['content'] === $first['content'], 'idempotent: a second run changes nothing' );

	echo "\nRESULT  $pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
