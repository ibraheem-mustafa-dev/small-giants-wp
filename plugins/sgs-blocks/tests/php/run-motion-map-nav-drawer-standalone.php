<?php
/**
 * Standalone test for the `nav-drawer` migration mapper (Spec 38A FR-38A-51, FR-38A-31, FR-38A-32; build unit M4.5).
 *
 * Loads the REAL mapper, its value builder, the real runner, `Sgs_Motion_Stagger`, the drawer motion helpers and the
 * shipped `schemas/motion.schema.json`. WordPress is not loaded; `parse_blocks` and `serialize_block_attributes` are
 * minimal stand-ins (as in run-motion-map-entrance-standalone.php). Block supports come from the real block.json files.
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-map-nav-drawer-standalone.php
 *
 * What it proves:
 * - the measured 55ms-step drawer (stored on the canary: slide-start 300/300, no fade, step 55, maximum 320) becomes a
 *   panel slide with the `open` trigger, the menu's item entrance and stagger settings whose server-written delays are
 *   0, 55, ... 275, 320, 320, and a logo beside the menu at the 320ms maximum (customised, reported);
 * - the grouped 50ms drawer (staggerInsideGroups, no menu) stores 0, 50, 100, 150 on a container's four children, the
 *   container keeps the helper settings, and the panel takes the anchor's `auto` nudge;
 * - per-tier shapes become device overrides; `none` everywhere stores no panel; reversed closes store
 *   `min((count - 1 - i) x step, cap)`; every shape and the clip reveal with no destination are reported and left in
 *   place, never approximated; a child with no motion support or the drift class is not given an entrance;
 * - every fragment is schema-valid, the runner migrates a whole post with no flag, and a second run changes nothing.
 *
 * Planted faults (each must turn the run red; the run then exits 1). The fault is written into a TEMPORARY COPY of the
 * code under test and the test runs against the copy, so nothing in the repository changes.
 *   SGS_MOTION_NAV_DRAWER_PLANT=cap    the helper cap is never stored
 *   SGS_MOTION_NAV_DRAWER_PLANT=step   the step ceiling 1000 becomes 50
 *   SGS_MOTION_NAV_DRAWER_PLANT=slide  slide-start travels -50% instead of -100%
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {

	$plant = (string) getenv( 'SGS_MOTION_NAV_DRAWER_PLANT' );
	if ( '' !== $plant ) {
		exit( sgs_nav_drawer_run_planted( $plant ) );
	}

	/**
	 * Copy the code under test into a temp tree, plant the fault there and run this test against the copy.
	 */
	function sgs_nav_drawer_run_planted( string $plant ): int {
		$plugin = dirname( __DIR__, 2 );
		$tmp    = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-nav-drawer-plant-' . bin2hex( random_bytes( 4 ) );
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
		foreach ( array( 'nav-drawer', 'nav-drawer-menu', 'container', 'button', 'responsive-logo', 'icon-list', 'social-icons', 'google-rating-badge' ) as $slug ) {
			$copy( $plugin . '/src/blocks/' . $slug . '/block.json', $tmp . '/src/blocks/' . $slug . '/block.json' );
		}
		$copy( __FILE__, $tmp . '/tests/php/run-motion-map-nav-drawer-standalone.php' );
		$faults = array(
			'cap'   => array( '/includes/motion/migrate/mappers/class-sgs-motion-map-nav-drawer.php', "if ( \$items['cap'] > 0 ) {\n\t\t\t\$settings['cap']", "if ( \$items['cap'] > 100000 ) {\n\t\t\t\$settings['cap']" ),
			'step'  => array( '/includes/motion/migrate/class-sgs-motion-legacy-nav-drawer.php', "self::ms( \$attrs, 'itemStagger', 0, 1000 )", "self::ms( \$attrs, 'itemStagger', 0, 50 )" ),
			'slide' => array( '/includes/motion/migrate/class-sgs-motion-legacy-nav-drawer.php', "array( 'translateX' => array( '-100%', 0 ) )", "array( 'translateX' => array( '-50%', 0 ) )" ),
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
		putenv( 'SGS_MOTION_NAV_DRAWER_PLANT' );
		$out = array();
		exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $tmp . '/tests/php/run-motion-map-nav-drawer-standalone.php' ) . ' 2>&1', $out, $code );
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
	require_once $root . '/includes/motion/migrate/mappers/class-sgs-motion-map-nav-drawer.php';

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

	function base_of( array $patch, string $element = 'root' ): ?array {
		return $patch['motion']['elements'][ $element ]['entrance']['base'] ?? null;
	}

	function reasons( array $patch ): string {
		return implode( ' | ', array_map( static fn( $r ) => $r['attr'] . ': ' . $r['reason'], $patch['reported'] ) );
	}

	// Block supports from the shipped block.json files; `core/paragraph` stands in for a block with no motion support.
	Sgs_Motion_Map_Nav_Drawer::set_supports_provider(
		static function ( string $name ) use ( $root ): array {
			$file = $root . '/src/blocks/' . preg_replace( '#^sgs/#', '', $name ) . '/block.json';
			if ( 0 !== strpos( $name, 'sgs/' ) || ! is_file( $file ) ) {
				return array();
			}
			$json = json_decode( (string) file_get_contents( $file ), true );
			return is_array( $json['supports']['sgs'] ?? null ) ? $json['supports']['sgs'] : array();
		}
	);

	$mapper = new Sgs_Motion_Map_Nav_Drawer();
	$runner = new Sgs_Motion_Migrate_Runner( array( $mapper ) );

	// 0. The family is listed and loadable; the drawer and the menu declare the parts the Panel opens trigger needs.
	ok( in_array( 'nav-drawer', Sgs_Motion_Migrate_Runner::families(), true ) && in_array( 'nav-drawer', Sgs_Motion_Migrate_Runner::loadable_families(), true ), 'the nav-drawer family is listed and loadable from includes/motion/migrate/mappers/' );
	ok( 'nav-drawer' === $mapper->family() && $mapper->handles( 'sgs/nav-drawer', array( 'itemStagger' => 55 ) ) && ! $mapper->handles( 'sgs/nav-drawer', array( 'drawerBg' => 'x' ) ) && ! $mapper->handles( 'sgs/hero', array( 'itemStagger' => 55 ) ), 'handles() answers for a drawer holding an old motion attribute only' );
	$nd_json  = json_decode( (string) file_get_contents( $root . '/src/blocks/nav-drawer/block.json' ), true );
	$ndm_json = json_decode( (string) file_get_contents( $root . '/src/blocks/nav-drawer-menu/block.json' ), true );
	ok( array( 'root', 'body' ) === ( $nd_json['supports']['sgs']['motion']['opens'] ?? null ) && array( 'root', 'item' ) === ( $ndm_json['supports']['sgs']['motion']['opens'] ?? null ), 'supports.sgs.motion.opens: the drawer root and body, the menu root and item part' );
	ok( isset( $ndm_json['supports']['sgs']['elements']['item'] ) && isset( $nd_json['supports']['sgs']['elements']['body'] ), 'the opened parts are declared elements' );

	// 1. The measured 55ms drawer: slide from the start edge, menu items on a 55ms step capped at 320ms.
	$measured = array(
		'entryAnimation' => array( 'desktop' => 'slide-start' ),
		'entryDuration'  => 300,
		'exitDuration'   => 300,
		'entryEasing'    => 'ease-out-css',
		'entryFade'      => false,
		'itemStagger'    => 55,
		'itemStaggerMax' => 320,
		'anchor'         => array( 'desktop' => 'trigger' ),
	);
	$p     = $mapper->map_groups( array( blk( 'sgs/nav-drawer', $measured, array( blk( 'sgs/nav-drawer-menu', array( 'ref' => 0 ) ), blk( 'sgs/responsive-logo', array( 'width' => 140 ) ) ) ) ) );
	$panel = base_of( $p['0'] );
	ok( array( 'trigger' => 'open', 'values' => array( 'from' => array( 'translateX' => '-100%' ), 'to' => array( 'translateX' => 0 ), 'duration' => 300, 'easing' => 'ease-out' ), 'close' => array( 'closeDuration' => 300, 'closeEasing' => 'ease-out' ) ) === $panel, 'the panel slides in from -100% over 300ms with no fade and closes over its stored 300ms', json_encode( $panel ) );
	ok( array( 'apply' => false, 'offset' => 0, 'step' => 55, 'order' => 'row-first', 'perRow' => false, 'cap' => 320 ) === ( $p['0']['motion']['stagger'] ?? null ), 'the drawer stores the helper settings: step 55, cap 320, no row restart' );
	$menu = base_of( $p['0/0'], 'item' );
	ok( array( 'trigger' => 'open', 'values' => array( 'from' => array( 'opacity' => 0, 'translateY' => 'token:entrance.distance' ), 'to' => array( 'opacity' => 1, 'translateY' => 0 ), 'duration' => 300, 'easing' => 'token:entrance.easing' ), 'close' => array( 'to' => array( 'opacity' => 1, 'translateY' => 0 ), 'closeDuration' => 0 ) ) === $menu, 'the menu items rise with the entrance distance and easing tokens, take the panel duration and hold still while the panel closes', json_encode( $menu ) );
	$menu_stagger = $p['0/0']['motion']['stagger'] ?? array();
	$served       = Sgs_Motion_Stagger::compute_delays( array_merge( $menu_stagger, array( 'count' => 8, 'columns' => 1 ) ) );
	ok( array( 0, 55, 110, 165, 220, 275, 320, 320 ) === $served, 'the menu stagger gives eight items 0, 55 ... 275, then 320 (the U-5 measured 55ms step capped at 320ms)', json_encode( $served ) );
	$logo = base_of( $p['0/1'] );
	ok( 320 === ( $logo['values']['delay'] ?? null ) && array( 'values.delay' ) === ( $logo['customised'] ?? null ), 'the logo beside the menu stores the 320ms maximum, marked customised so the helper re-run skips it' );
	ok( false !== strpos( reasons( $p['0'] ), 'changed: 1 block(s) beside the menu' ) && false !== strpos( reasons( $p['0'] ), 'no longer mirror in right-to-left' ), 'the beside-the-menu delay and the lost right-to-left mirror are reported', reasons( $p['0'] ) );
	$consumed = $p['0']['consumed'];
	sort( $consumed );
	ok( array( 'entryAnimation', 'entryDuration', 'entryEasing', 'entryFade', 'exitDuration', 'itemStagger', 'itemStaggerMax' ) === $consumed && patches_valid( $p ), 'every old attribute is consumed and every fragment is schema-valid', json_encode( $consumed ) );

	// 2. The grouped 50ms drawer with no menu: the container's children step 0, 50, 100, 150.
	$grouped = array(
		'itemStagger'         => 50,
		'itemStaggerDistance' => array( 'desktop' => 18 ),
		'itemStaggerDuration' => 500,
		'staggerInsideGroups' => true,
	);
	$tree    = array(
		blk(
			'sgs/nav-drawer',
			$grouped,
			array(
				blk( 'sgs/container', array(), array( blk( 'sgs/button' ), blk( 'sgs/button' ), blk( 'sgs/button' ), blk( 'sgs/container' ) ) ),
				blk( 'sgs/container', array(), array( blk( 'sgs/icon-list' ) ) ),
				blk( 'sgs/container', array(), array( blk( 'sgs/google-rating-badge' ), blk( 'sgs/button' ), blk( 'sgs/social-icons' ) ) ),
			)
		),
	);
	$g       = $mapper->map_groups( $tree );
	ok( array( 0, 50, 100, 150 ) === array_map( static fn( $i ) => base_of( $g[ '0/0/' . $i ] )['values']['delay'] ?? null, range( 0, 3 ) ), 'four children of the first group store 0, 50, 100, 150' );
	ok( array( 'from' => array( 'opacity' => 0, 'translateY' => 18 ), 'to' => array( 'opacity' => 1, 'translateY' => 0 ) ) === array_intersect_key( base_of( $g['0/0/0'] )['values'], array_flip( array( 'from', 'to' ) ) ) && 500 === base_of( $g['0/0/0'] )['values']['duration'] && ! isset( base_of( $g['0/0/0'] )['customised'] ), 'each rises 18px over its own 500ms, not customised (the helper on the container would write the same)' );
	ok( ! isset( $g['0/0']['motion']['elements'] ) && 50 === ( $g['0/0']['motion']['stagger']['step'] ?? null ), 'the group container takes no entrance of its own and stores the helper settings' );
	ok( array( 'trigger' => 'open', 'values' => array( 'from' => array( 'opacity' => 0, 'translateY' => -8 ), 'to' => array( 'opacity' => 1, 'translateY' => 0 ), 'duration' => 250, 'easing' => 'ease-out' ), 'close' => array( 'closeDuration' => 200, 'closeEasing' => 'ease-out' ) ) === base_of( $g['0'] ), 'an unset shape on a full-screen drawer is the auto nudge: -8px and a fade, 250ms in, 200ms out', json_encode( base_of( $g['0'] ) ) );
	ok( 0 === ( base_of( $g['0/1/0'] )['values']['delay'] ?? null ) && array( 0, 50, 100 ) === array_map( static fn( $i ) => base_of( $g[ '0/2/' . $i ] )['values']['delay'] ?? null, range( 0, 2 ) ), 'each group counts from 0: the second group 0, the third 0, 50, 100' );
	ok( patches_valid( $g ), 'every grouped fragment is schema-valid' );

	// 3. Reversed closes in a group: min((count - 1 - i) x step, cap).
	$r = $mapper->map_groups( array( blk( 'sgs/nav-drawer', array( 'itemStagger' => 50, 'itemStaggerMax' => 120, 'itemStaggerOnClose' => true, 'staggerInsideGroups' => true ), array( blk( 'sgs/container', array(), array( blk( 'sgs/button' ), blk( 'sgs/button' ), blk( 'sgs/button' ), blk( 'sgs/button' ) ) ) ) ) ) );
	ok( array( 120, 100, 50, 0 ) === array_map( static fn( $i ) => base_of( $r[ '0/0/' . $i ] )['close']['closeDelay'] ?? null, range( 0, 3 ) ) && array( 0, 50, 100, 120 ) === array_map( static fn( $i ) => base_of( $r[ '0/0/' . $i ] )['values']['delay'] ?? null, range( 0, 3 ) ), 'reverse-on-close: open 0, 50, 100, 120 and close 120, 100, 50, 0 (cap 120)' );
	ok( ! isset( base_of( $r['0/0/0'] )['close']['to'] ) && 250 === base_of( $r['0/0/0'] )['close']['closeDuration'], 'a reversed close plays back to the from-values over the item duration' );
	ok( 'reversed' === ( $r['0/0']['motion']['stagger']['closeOrder'] ?? null ) && array( 'close.closeDelay' ) === ( base_of( $r['0/0/1'] )['customised'] ?? null ) && ! isset( base_of( $r['0/0/0'] )['customised'] ) && patches_valid( $r ), 'the group stores closeOrder reversed; a close delay the helper mirror would change (100 vs 70) is marked customised, an equal one (120) is not' );

	// 4. Per-tier shapes become device overrides.
	$t     = $mapper->map_groups( array( blk( 'sgs/nav-drawer', array( 'entryAnimation' => array( 'desktop' => 'slide-start', 'mobile' => 'fade' ), 'entryFade' => false ) ) ) );
	$tbase = base_of( $t['0'] );
	ok( array( 'opacity' => 1, 'translateX' => '-100%' ) === $tbase['values']['from'] && array( 'mobile' => array( 'from' => array( 'opacity' => 0, 'translateX' => 0 ) ) ) === ( $tbase['devices'] ?? null ), 'desktop slide-start and mobile fade: Desktop from-values plus one Mobile override', json_encode( $tbase ) );
	$n = $mapper->map_groups( array( blk( 'sgs/nav-drawer', array( 'entryAnimation' => array( 'desktop' => 'none', 'tablet' => 'none', 'mobile' => 'none' ), 'scrimFadeDuration' => 300 ) ) ) );
	ok( array() === $n['0']['motion'] && array( 'entryAnimation' ) === $n['0']['consumed'], '`none` at every tier stores no panel and consumes the attribute' );
	$mixed = base_of( $mapper->map_groups( array( blk( 'sgs/nav-drawer', array( 'entryAnimation' => array( 'desktop' => 'fade', 'mobile' => 'none' ) ) ) ) )['0'] );
	ok( array( 'mobile' => array( 'from' => array( 'opacity' => 1 ) ) ) === ( $mixed['devices'] ?? null ), 'a `none` tier holds the identity values', json_encode( $mixed ) );

	// 5. No destination: reported and left in place, never approximated.
	foreach ( array( 'wipe-down', 'wipe-down-skew', 'reveal-from-bar', 'grow-from-anchor' ) as $shape ) {
		$u = $mapper->map_groups( array( blk( 'sgs/nav-drawer', array( 'entryAnimation' => array( 'desktop' => $shape ), 'entryDuration' => 450 ) ) ) )['0'];
		ok( array() === $u['motion'] && array() === $u['consumed'] && 2 === count( $u['reported'] ) && false === $u['reported'][0]['consumed'], "$shape: no panel stored, entryAnimation and entryDuration left in place and reported", reasons( $u ) );
	}
	$c = $mapper->map_groups( array( blk( 'sgs/nav-drawer', array( 'entryAnimation' => array( 'desktop' => 'curtain' ), 'curtainColour' => '#131419' ) ) ) )['0'];
	ok( array() === $c['consumed'] && false !== strpos( reasons( $c ), 'curtainColour: left in place' ), 'curtain: the shape and its colour are left in place and reported' );
	$h = $mapper->map_groups( array( blk( 'sgs/nav-drawer', array( 'anchor' => array( 'desktop' => 'header' ), 'itemStagger' => 40 ) ) ) )['0'];
	ok( ! isset( $h['motion']['elements'] ) && false !== strpos( reasons( $h ), 'expand-down' ), 'auto on a header anchor is the vertical expand, reported with no panel stored' );
	$clip = $mapper->map_groups( array( blk( 'sgs/nav-drawer', array( 'itemStagger' => 50, 'itemStaggerReveal' => 'clip', 'itemStaggerDistance' => array( 'desktop' => 18 ) ), array( blk( 'sgs/button' ) ) ) ) );
	ok( ! in_array( 'itemStaggerReveal', $clip['0']['consumed'], true ) && array( 'translateY' => 18 ) === base_of( $clip['0/0'] )['values']['from'], 'the clip reveal is reported and left in place; the items keep their travel without a fade' );
	$inert = $mapper->map_groups( array( blk( 'sgs/nav-drawer', array( 'entryAnimation' => array( 'desktop' => 'fade' ), 'curtainColour' => '#000', 'itemStaggerDistance' => array( 'desktop' => 9 ) ) ) ) )['0'];
	ok( in_array( 'curtainColour', $inert['consumed'], true ) && in_array( 'itemStaggerDistance', $inert['consumed'], true ) && false !== strpos( reasons( $inert ), 'inert' ), 'a curtain colour with no curtain and an item distance with no step are inert: consumed and reported' );
	$bad = $mapper->map_groups( array( blk( 'sgs/nav-drawer', array( 'entryAnimation' => array( 'desktop' => 'fade' ), 'entryEasing' => 'custom', 'entryEasingCustom' => 'nope' ) ) ) )['0'];
	ok( array() === $bad['motion'] && ! in_array( 'entryEasing', $bad['consumed'], true ), 'an easing with no exact value leaves the panel unmapped and reported' );

	// 6. Axis and the beside-the-menu rules.
	$ax = base_of( $mapper->map_groups( array( blk( 'sgs/nav-drawer', array( 'itemStagger' => 55, 'itemStaggerAxis' => array( 'desktop' => 'end' ), 'itemStaggerDistance' => array( 'desktop' => 24 ) ), array( blk( 'sgs/button' ) ) ) ) )['0/0'] );
	ok( array( 'opacity' => 0, 'translateX' => 24 ) === $ax['values']['from'], 'an end axis travels +24px across' );
	$st = base_of( $mapper->map_groups( array( blk( 'sgs/nav-drawer', array( 'itemStagger' => 55, 'itemStaggerAxis' => array( 'desktop' => 'start' ) ), array( blk( 'sgs/button' ) ) ) ) )['0/0'] );
	$stp = $mapper->map_groups( array( blk( 'sgs/nav-drawer', array( 'itemStagger' => 55, 'itemStaggerAxis' => array( 'desktop' => 'start' ) ), array( blk( 'sgs/button' ) ) ) ) );
	ok( '-token:entrance.distance' === ( $st['values']['from']['translateX'] ?? null ) && patches_valid( $stp ), 'a start axis with no stored distance travels the negated entrance distance token (schema-valid)' );
	$neg = array( 'v' => 1, 'elements' => array( 'root' => array( 'entrance' => array( 'base' => array( 'trigger' => 'open', 'values' => array( 'from' => array( 'translateX' => 'sideways' ) ) ) ) ) ) );
	ok( ! patches_valid( array( array( 'motion' => $neg ) ) ), 'NEGATIVE CONTROL: the schema check refuses an invalid from-value, so the validity assertions are not vacuous' );
	$nm = $mapper->map_groups( array( blk( 'sgs/nav-drawer', array( 'itemStagger' => 55 ), array( blk( 'sgs/nav-drawer-menu' ), blk( 'sgs/button' ), blk( 'core/paragraph' ), blk( 'sgs/button', array( 'className' => 'x sgs-drift' ) ) ) ) ) );
	ok( ! isset( $nm['0/1'] ) && ! isset( $nm['0/2'] ) && ! isset( $nm['0/3'] ) && false !== strpos( reasons( $nm['0'] ), 'no maximum is set' ) && false !== strpos( reasons( $nm['0'] ), 'core/paragraph' ), 'beside a menu with no maximum, no motion support, and the drift class: no entrance given, the first two reported' );
	$oc = $mapper->map_groups( array( blk( 'sgs/nav-drawer', array( 'itemStagger' => 55, 'itemStaggerOnClose' => true ), array( blk( 'sgs/nav-drawer-menu' ) ) ) ) );
	$oc_stagger = $oc['0/0']['motion']['stagger'] ?? array();
	$oc_open    = Sgs_Motion_Stagger::compute_delays( array_merge( $oc_stagger, array( 'count' => 4, 'columns' => 1 ) ) );
	ok( 'reversed' === ( $oc_stagger['closeOrder'] ?? null ) && ! isset( base_of( $oc['0/0'], 'item' )['close']['closeDelay'] ) && array( 165, 110, 55, 0 ) === Sgs_Motion_Stagger::compute_close_delays( $oc_open, $oc_stagger['closeOrder'] ) && false === strpos( reasons( $oc['0'] ), 'close together' ) && patches_valid( $oc ), 'reverse-on-close on a menu: the menu stores closeOrder reversed (its render writes 165, 110, 55, 0 for four items), schema-valid, nothing reported' );

	// 7. map() without the group pass: the panel only.
	$solo = $mapper->map( 'sgs/nav-drawer', $measured );
	ok( isset( $solo['motion']['elements']['root'] ) && ! in_array( 'itemStagger', $solo['consumed'], true ) && false !== strpos( implode( ' ', array_column( $solo['reported'], 'reason' ) ), 'group pass' ), 'map() alone stores the panel and leaves the item attributes in place, reported' );

	// 8. A whole post through the real runner, then a second run.
	$post  = render_tree( array( blk( 'sgs/nav-drawer', $measured, array( blk( 'sgs/nav-drawer-menu', array( 'ref' => 0 ) ), blk( 'sgs/responsive-logo', array( 'width' => 140, 'linkToHome' => true ) ) ) ) ) );
	$first = $runner->migrate_content( $post );
	ok( $first['changed'] && array() === $first['flags'] && false === strpos( $first['content'], '"itemStagger"' ) && false !== strpos( $first['content'], '"anchor"' ), 'the runner migrates the post with no flag; the anchor (not a motion attribute) stays', json_encode( $first['flags'] ) );
	$blocks = parse_blocks( $first['content'] );
	ok( 55 === ( $blocks[0]['innerBlocks'][0]['attrs']['sgsMotion']['stagger']['step'] ?? null ) && 'open' === ( $blocks[0]['innerBlocks'][0]['attrs']['sgsMotion']['elements']['item']['entrance']['base']['trigger'] ?? null ) && 140 === $blocks[0]['innerBlocks'][1]['attrs']['width'], 'the stored menu carries its stagger and open item entrance; the logo keeps its width' );
	$second = $runner->migrate_content( $first['content'] );
	ok( ! $second['changed'] && $second['content'] === $first['content'], 'idempotent: a second run changes nothing' );

	Sgs_Motion_Map_Nav_Drawer::set_supports_provider( null );
	echo "\nRESULT  $pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
