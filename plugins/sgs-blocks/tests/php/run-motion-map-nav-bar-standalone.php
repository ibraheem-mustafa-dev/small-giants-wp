<?php
/**
 * Standalone test for the `nav-bar` migration mapper (Spec 38A FR-38A-51, FR-38A-31, FR-38A-32; build unit M4.6).
 *
 * Loads the REAL mapper, its value builder, the real runner, `Sgs_Motion_Stagger` and the shipped
 * `schemas/motion.schema.json`. WordPress is not loaded; `parse_blocks` and `serialize_block_attributes` are minimal
 * stand-ins (as in run-motion-map-nav-drawer-standalone.php).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-map-nav-bar-standalone.php
 *
 * What it proves:
 * - the U-5 measured mega panel (`fade-lift`, 340ms, no exit, the `drafts` curve, a 26ms step capped at 320ms, 460ms
 *   items; `.claude/reports/2026-09-24-u5-motion-design.md`) becomes a panel `open` entrance (opacity 0, -8px, scale
 *   0.99) with a 0ms close, item entrances on `subitem` and `mega-item` and stagger settings whose server-written delays
 *   are 0, 26 ... 312, 320, 320 in each panel, the old ladder's min(i x step, max);
 * - `rows` moves the mega item entrance to `mega-row`; a bar storing only a step still gets the default 180ms fade with
 *   its 150ms close; the item distance (default 8px, 0 for none, negative falls) and the item's own time;
 * - `grow` is the bottom-edge clip wipe (clip 100% on the bottom edge, no fade, the panel's times and easing, closing back
 *   to the same clip), with the items and stagger alongside; an easing with no exact value, a non-number and an
 *   unknown scope leave the whole bar unmapped and reported; `none` with no step keeps `submenuAnimation` (reported) and consumes the inert timings;
 * - every fragment is schema-valid, the runner migrates a whole post with no flag, and a second run changes nothing.
 *
 * Planted faults (each must turn the run red; the run then exits 1). The fault is written into a TEMPORARY COPY of the
 * code under test and the test runs against the copy, so nothing in the repository changes.
 *   SGS_MOTION_NAV_BAR_PLANT=cap    the stagger cap is never stored
 *   SGS_MOTION_NAV_BAR_PLANT=step   the step ceiling 1000 becomes 20
 *   SGS_MOTION_NAV_BAR_PLANT=lift   fade-lift scales from 0.95 instead of 0.99
 *   SGS_MOTION_NAV_BAR_PLANT=rows   the rows scope is ignored (mega items stay on the columns)
 *   SGS_MOTION_NAV_BAR_PLANT=edge   grow clips the top edge instead of the bottom
 *   SGS_MOTION_NAV_BAR_PLANT=fade   grow also fades from 0, which the old grow did not
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {

	$plant = (string) getenv( 'SGS_MOTION_NAV_BAR_PLANT' );
	if ( '' !== $plant ) {
		exit( sgs_nav_bar_run_planted( $plant ) );
	}

	/**
	 * Copy the code under test into a temp tree, plant the fault there and run this test against the copy.
	 */
	function sgs_nav_bar_run_planted( string $plant ): int {
		$plugin = dirname( __DIR__, 2 );
		$tmp    = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-nav-bar-plant-' . bin2hex( random_bytes( 4 ) );
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
		foreach ( array( 'nav-bar-menu', 'mega-panel' ) as $slug ) {
			$copy( $plugin . '/src/blocks/' . $slug . '/block.json', $tmp . '/src/blocks/' . $slug . '/block.json' );
		}
		$copy( __FILE__, $tmp . '/tests/php/run-motion-map-nav-bar-standalone.php' );
		$faults = array(
			'cap'  => array( '/includes/motion/migrate/class-sgs-motion-legacy-nav-bar.php', "if ( \$read['cap'] > 0 ) {", "if ( \$read['cap'] > 100000 ) {" ),
			'step' => array( '/includes/motion/migrate/class-sgs-motion-legacy-nav-bar.php', "array( 'submenuItemStagger', 0, 1000 )", "array( 'submenuItemStagger', 0, 20 )" ),
			'lift' => array( '/includes/motion/migrate/class-sgs-motion-legacy-nav-bar.php', "'scale'      => array( 0.99, 1 ),", "'scale'      => array( 0.95, 1 )," ),
			'rows' => array( '/includes/motion/migrate/mappers/class-sgs-motion-map-nav-bar.php', "'rows' === \$read['scope'] ? 'mega-row' : 'mega-item'", "'mega-item'" ),
			'edge' => array( '/includes/motion/migrate/class-sgs-motion-legacy-nav-bar.php', "'clipEdge' => array( 'bottom', null ),", "'clipEdge' => array( 'top', null )," ),
			'fade' => array( '/includes/motion/migrate/class-sgs-motion-legacy-nav-bar.php', "case 'grow':
				return array(
					'clip'", "case 'grow':
				return array(
					'opacity'  => array( 0, 1 ),
					'clip'" ),
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
		putenv( 'SGS_MOTION_NAV_BAR_PLANT' );
		$out = array();
		exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $tmp . '/tests/php/run-motion-map-nav-bar-standalone.php' ) . ' 2>&1', $out, $code );
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
	require_once $root . '/includes/motion/migrate/mappers/class-sgs-motion-map-nav-bar.php';
	require_once $root . '/includes/motion/class-sgs-motion-stagger.php';

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

	$mapper = new Sgs_Motion_Map_Nav_Bar();
	$runner = new Sgs_Motion_Migrate_Runner( array( $mapper ) );
	$drafts = 'cubic-bezier(0.16, 0.84, 0.32, 1)';

	// 0. The family is listed and loadable; the bar declares the parts the Panel opens trigger needs.
	ok( in_array( 'nav-bar', Sgs_Motion_Migrate_Runner::families(), true ) && in_array( 'nav-bar', Sgs_Motion_Migrate_Runner::loadable_families(), true ), 'the nav-bar family is listed and loadable from includes/motion/migrate/mappers/' );
	ok( 'nav-bar' === $mapper->family() && $mapper->handles( 'sgs/nav-bar-menu', array( 'submenuItemStagger' => 26 ) ) && ! $mapper->handles( 'sgs/nav-bar-menu', array( 'submenuCaret' => true ) ) && ! $mapper->handles( 'sgs/nav-drawer-menu', array( 'submenuAnimation' => 'fade' ) ), 'handles() answers for a bar holding an old panel motion attribute only (the drawer menu\'s section motion is not this family)' );
	$nbm_json = json_decode( (string) file_get_contents( $root . '/src/blocks/nav-bar-menu/block.json' ), true );
	$mp_json  = json_decode( (string) file_get_contents( $root . '/src/blocks/mega-panel/block.json' ), true );
	ok( array( 'panel', 'subitem', 'mega-item', 'mega-row' ) === ( $nbm_json['supports']['sgs']['motion']['opens'] ?? null ) && array( 'root' ) === ( $mp_json['supports']['sgs']['motion']['opens'] ?? null ), 'supports.sgs.motion.opens: the bar panel and its three item parts, the mega panel root' );
	$elements = $nbm_json['supports']['sgs']['elements'] ?? array();
	ok( isset( $elements['panel'], $elements['subitem'], $elements['mega-item'], $elements['mega-row'] ) && '.sgs-nav-bar-menu__panel-motion' === ( $elements['panel']['selector'] ?? '' ) && ! isset( $elements['subitem']['selector'] ), 'the opened parts are declared elements: the panel by its motion wrap, the items by their BEM classes' );

	// 1. The U-5 measured mega panel: fade-lift 340ms, no exit, drafts curve, 26ms step capped at 320ms, 460ms items.
	$measured = array(
		'submenuAnimation'           => 'fade-lift',
		'submenuAnimationDuration'   => 340,
		'submenuExitDuration'        => 0,
		'submenuAnimationEasing'     => 'drafts',
		'submenuItemStagger'         => 26,
		'submenuItemStaggerMax'      => 320,
		'submenuItemStaggerDuration' => 460,
		'ref'                        => 12,
	);
	$p     = $mapper->map( 'sgs/nav-bar-menu', $measured );
	$panel = base_of( $p, 'panel' );
	ok( array( 'trigger' => 'open', 'values' => array( 'from' => array( 'opacity' => 0, 'translateY' => -8, 'scale' => 0.99 ), 'to' => array( 'opacity' => 1, 'translateY' => 0, 'scale' => 1 ), 'duration' => 340, 'easing' => $drafts ), 'close' => array( 'closeDuration' => 0, 'closeEasing' => $drafts ) ) === $panel, 'the panel fades, lifts 8px and scales from 0.99 over 340ms on the drafts curve, and closes in 0ms', json_encode( $panel ) );
	$item = base_of( $p, 'subitem' );
	ok( array( 'trigger' => 'open', 'values' => array( 'from' => array( 'opacity' => 0, 'translateY' => 8 ), 'to' => array( 'opacity' => 1, 'translateY' => 0 ), 'duration' => 460, 'easing' => $drafts ), 'close' => array( 'to' => array( 'opacity' => 1, 'translateY' => 0 ), 'closeDuration' => 0 ) ) === $item, 'each item rises 8px over its own 460ms on the panel curve and holds still while the panel closes', json_encode( $item ) );
	ok( $item === base_of( $p, 'mega-item' ) && null === base_of( $p, 'mega-row' ), 'the mega panel columns take the same item entrance (scope columns); the rows take none' );
	ok( array( 'offset' => 0, 'step' => 26, 'order' => 'row-first', 'perRow' => false, 'cap' => 320, 'closeOrder' => 'together' ) === ( $p['motion']['stagger'] ?? null ), 'the bar stores the stagger settings: step 26, cap 320, no apply flag (server-rendered items), items closing all at once as the old panels did', json_encode( $p['motion']['stagger'] ?? null ) );
	$served = Sgs_Motion_Stagger::compute_delays( array_merge( $p['motion']['stagger'] ?? array(), array( 'count' => 15, 'columns' => 1 ) ) );
	ok( array( 0, 26, 52, 78, 104, 130, 156, 182, 208, 234, 260, 286, 312, 320, 320 ) === $served, 'fifteen items get 0, 26 ... 312, then 320 (the U-5 measured 26ms step capped at 320ms)', json_encode( $served ) );
	$old = array();
	for ( $i = 0; $i < 15; $i++ ) {
		$old[] = min( $i * 26, 320 );
	}
	ok( $old === $served, 'the stored delays equal the old ladder\'s min(i x step, max) for every index' );
	$consumed = $p['consumed'];
	sort( $consumed );
	ok( array( 'submenuAnimation', 'submenuAnimationDuration', 'submenuAnimationEasing', 'submenuExitDuration', 'submenuItemStagger', 'submenuItemStaggerDuration', 'submenuItemStaggerMax' ) === $consumed && array() === $p['reported'] && patches_valid( array( $p ) ), 'every old attribute is consumed, nothing is reported, the fragment is schema-valid; `ref` is not touched', json_encode( $consumed ) );

	// 2. Rows scope, defaults, distance and the item's own time.
	$rows = $mapper->map( 'sgs/nav-bar-menu', array( 'submenuItemStagger' => 28, 'submenuItemStaggerScope' => 'rows' ) );
	ok( null !== base_of( $rows, 'mega-row' ) && null === base_of( $rows, 'mega-item' ) && null !== base_of( $rows, 'subitem' ), 'rows: the mega rows and the dropdown items take the entrance, the mega columns none (as the old ladder suppressed them)' );
	$def = base_of( $rows, 'panel' );
	ok( array( 'from' => array( 'opacity' => 0 ), 'to' => array( 'opacity' => 1 ), 'duration' => 180, 'easing' => 'ease-out' ) === ( $def['values'] ?? null ) && array( 'closeDuration' => 150, 'closeEasing' => 'ease-out' ) === ( $def['close'] ?? null ), 'a bar storing only the step keeps the default panel: fade over 180ms, closing over 150ms, ease-out', json_encode( $def ) );
	ok( 180 === ( base_of( $rows, 'subitem' )['values']['duration'] ?? null ) && ! isset( $rows['motion']['stagger']['cap'] ) && patches_valid( array( $rows ) ), 'no item time uses the panel opening time; no maximum stores no cap' );
	$flat = base_of( $mapper->map( 'sgs/nav-bar-menu', array( 'submenuItemStagger' => 30, 'submenuItemStaggerDistance' => 0 ) ), 'subitem' );
	ok( array( 'opacity' => 0 ) === ( $flat['values']['from'] ?? null ) && array( 'opacity' => 1 ) === ( $flat['close']['to'] ?? null ), 'distance 0: the items only fade' );
	$fall = base_of( $mapper->map( 'sgs/nav-bar-menu', array( 'submenuItemStagger' => 30, 'submenuItemStaggerDistance' => -12 ) ), 'subitem' );
	ok( -12 === ( $fall['values']['from']['translateY'] ?? null ), 'a negative distance falls from above' );
	$slide_p = $mapper->map( 'sgs/nav-bar-menu', array( 'submenuAnimation' => 'slide-down', 'submenuAnimationEasing' => 'ease-out' ) );
	$slide   = base_of( $slide_p, 'panel' );
	ok( array( 'opacity' => 0, 'translateY' => -8 ) === ( $slide['values']['from'] ?? null ) && 'token:easing.emphasised' === ( $slide['values']['easing'] ?? null ) && ! isset( $slide_p['motion']['stagger'] ) && patches_valid( array( $slide_p ) ), 'slide-down fades and drops 8px; a token easing name stays a token; no step stores no stagger' );

	// 3. Values with no exact destination leave the whole bar unmapped.
	foreach ( array(
		'easing' => array( 'submenuAnimationEasing' => 'custom', 'submenuAnimationEasingCustom' => 'bouncy', 'submenuItemStagger' => 26 ),
		'number' => array( 'submenuAnimationDuration' => 'fast', 'submenuItemStagger' => 26 ),
		'scope'  => array( 'submenuItemStaggerScope' => 'cards', 'submenuItemStagger' => 26 ),
	) as $case => $attrs ) {
		$bad = $mapper->map( 'sgs/nav-bar-menu', $attrs );
		$row_attrs = array_unique( array_column( $bad['reported'], 'attr' ) );
		ok( array() === $bad['motion'] && array() === $bad['consumed'] && 0 === count( array_diff( array_keys( $attrs ), $row_attrs ) ) && ! in_array( true, array_column( $bad['reported'], 'consumed' ), true ), "unmapped ($case): no fragment, nothing consumed, every present attribute reported", reasons( $bad ) );
	}
	// 3b. grow: the old stylesheet held opacity 1 and clipped inset(0 0 100% 0) to inset(0) with the panel's times and easing.
	$grow_p = $mapper->map( 'sgs/nav-bar-menu', array( 'submenuAnimation' => 'grow', 'submenuAnimationDuration' => 220, 'submenuExitDuration' => 160, 'submenuItemStagger' => 26 ) );
	ok( array( 'trigger' => 'open', 'values' => array( 'from' => array( 'clip' => 100, 'clipEdge' => 'bottom' ), 'duration' => 220, 'easing' => 'ease-out' ), 'close' => array( 'closeDuration' => 160, 'closeEasing' => 'ease-out' ) ) === base_of( $grow_p, 'panel' ), 'grow: a bottom-edge clip from 100% with no fade and no to-value, the stored 220ms in and 160ms out (it closes back to the clip, as the old transition did)', json_encode( base_of( $grow_p, 'panel' ) ) );
	ok( null !== base_of( $grow_p, 'subitem' ) && 26 === ( $grow_p['motion']['stagger']['step'] ?? null ) && in_array( 'submenuAnimation', $grow_p['consumed'], true ) && array() === $grow_p['reported'] && patches_valid( array( $grow_p ) ), 'grow: the item stagger sits alongside, every old attribute is consumed, nothing is reported and the fragment is schema-valid', reasons( $grow_p ) );
	$grow_only = $mapper->map( 'sgs/nav-bar-menu', array( 'submenuAnimation' => 'grow' ) );
	ok( array( 'clip' => 100, 'clipEdge' => 'bottom' ) === ( base_of( $grow_only, 'panel' )['values']['from'] ?? null ) && 180 === base_of( $grow_only, 'panel' )['values']['duration'] && array( 'submenuAnimation' ) === $grow_only['consumed'], 'grow alone takes the default 180ms and 150ms and is consumed' );

	// 4. Panels that play nothing.
	$none = $mapper->map( 'sgs/nav-bar-menu', array( 'submenuAnimation' => 'none', 'submenuAnimationDuration' => 200, 'submenuItemStaggerMax' => 300 ) );
	ok( array() === $none['motion'] && array( 'submenuAnimationDuration', 'submenuItemStaggerMax' ) === $none['consumed'] && false !== strpos( reasons( $none ), 'submenuAnimation: left in place' ), 'none with no step: no fragment, submenuAnimation kept (the old path reads it as no motion), the inert timings consumed and reported', reasons( $none ) );
	$odd = $mapper->map( 'sgs/nav-bar-menu', array( 'submenuAnimation' => 'slide' ) );
	ok( array() === $odd['motion'] && array() === $odd['consumed'], 'a shape the old renderer did not accept played nothing: kept like none' );
	$items_only = $mapper->map( 'sgs/nav-bar-menu', array( 'submenuAnimation' => 'none', 'submenuItemStagger' => 26 ) );
	ok( null === base_of( $items_only, 'panel' ) && null !== base_of( $items_only, 'subitem' ) && in_array( 'submenuAnimation', $items_only['consumed'], true ) && patches_valid( array( $items_only ) ), 'none with a step: the items only, the panel plays nothing, all consumed' );

	$neg = array( 'v' => 1, 'elements' => array( 'panel' => array( 'entrance' => array( 'base' => array( 'trigger' => 'open', 'values' => array( 'from' => array( 'translateY' => 'sideways' ) ) ) ) ) ) );
	ok( ! patches_valid( array( array( 'motion' => $neg ) ) ), 'NEGATIVE CONTROL: the schema check refuses an invalid from-value, so the validity assertions are not vacuous' );

	// 5. A whole post through the real runner, then a second run.
	$post   = render_tree( array( blk( 'sgs/site-header', array(), array( blk( 'sgs/nav-bar-menu', $measured ), blk( 'sgs/nav-drawer-menu', array( 'submenuAnimation' => 'fade' ) ) ) ) ) );
	$first  = $runner->migrate_content( $post );
	$blocks = parse_blocks( $first['content'] );
	$bar    = $blocks[0]['innerBlocks'][0]['attrs'] ?? array();
	ok( $first['changed'] && array() === $first['flags'] && ! isset( $bar['submenuItemStagger'] ) && 12 === ( $bar['ref'] ?? null ), 'the runner migrates the post with no flag; `ref` stays', json_encode( $first['flags'] ) );
	ok( 26 === ( $bar['sgsMotion']['stagger']['step'] ?? null ) && 'open' === ( $bar['sgsMotion']['elements']['panel']['entrance']['base']['trigger'] ?? null ) && 'fade' === ( $blocks[0]['innerBlocks'][1]['attrs']['submenuAnimation'] ?? null ), 'the stored bar carries its stagger and open panel entrance; the drawer menu\'s section motion is untouched' );
	$second = $runner->migrate_content( $first['content'] );
	ok( ! $second['changed'] && $second['content'] === $first['content'], 'idempotent: a second run changes nothing' );

	echo "\nRESULT  $pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
