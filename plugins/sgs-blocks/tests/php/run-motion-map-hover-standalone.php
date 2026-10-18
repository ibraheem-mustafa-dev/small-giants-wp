<?php
/**
 * Standalone test for the `hover` migration mapper (Spec 38A FR-38A-31, FR-38A-32; build unit M6.3).
 *
 * Loads the REAL mapper, the real runner and the shipped `schemas/motion.schema.json`. WordPress is not loaded;
 * `parse_blocks` and `serialize_block_attributes` are minimal stand-ins and the block registry is a provider
 * (`Sgs_Motion_Map_Hover::set_block_info_provider()`) holding the defaults and `supports.sgs` the cases need.
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-map-hover-standalone.php
 *
 * What it proves:
 * - the family is listed and loadable, and the mapper owns exactly the attributes its scope table names (the icon
 *   blocks and the blocks where `transitionDuration` times unrelated transitions are not handled);
 * - each attribute lands where the mapping table says, every fragment survives `Sgs_Motion_Document::sanitise()`
 *   untouched, a value with no destination is reported and stays on the block, and the `hover-lift` values equal the
 *   seeded preset in scripts/data/motion-presets.json;
 * - values already stored in `sgsMotion` win, and a second run over migrated content changes nothing.
 *
 * Planted faults (each must turn the run red; the run then exits 1). The fault is written into a TEMPORARY COPY of the
 * code under test and the test is run against the copy, so nothing in the repository changes.
 *   SGS_MOTION_HOVER_PLANT=scale-percent    the percent divisor 100 becomes 1000
 *   SGS_MOTION_HOVER_PLANT=lift-sign        a lift stops being negative
 *   SGS_MOTION_HOVER_PLANT=shadow-consumed  a reported hover shadow is consumed
 *   SGS_MOTION_HOVER_PLANT=media-part       a media part that is excluded from motion is accepted
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {

	$plant = (string) getenv( 'SGS_MOTION_HOVER_PLANT' );
	if ( '' !== $plant ) {
		exit( sgs_hover_run_planted( $plant ) );
	}

	/**
	 * Copy the code under test into a temp tree, plant the fault there and run this test against the copy.
	 */
	function sgs_hover_run_planted( string $plant ): int {
		$plugin = dirname( __DIR__, 2 );
		$tmp    = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-hover-plant-' . bin2hex( random_bytes( 4 ) );
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
		$copy( __FILE__, $tmp . '/tests/php/run-motion-map-hover-standalone.php' );
		$mapper = '/migrate/mappers/class-sgs-motion-map-hover.php';
		$shadow = "'hover shadow stays in its shadow control; box-shadow on hover is the M3.4 hover ring', false );";
		$faults = array(
			'scale-percent'   => array( $mapper, '(int) $percent / 100', '(int) $percent / 1000' ),
			'lift-sign'       => array( $mapper, "\$o['values']['translateY'] = -\$px;", "\$o['values']['translateY'] = \$px;" ),
			'shadow-consumed' => array( $mapper, $shadow, str_replace( 'false );', 'true );', $shadow ) . "\n\t\t\t\t\$o['consumed'][] = \$key;" ),
			'media-part'      => array( $mapper, "false !== ( \$elements[ \$part ]['motion'] ?? true )", 'true' ),
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
		putenv( 'SGS_MOTION_HOVER_PLANT' );
		$out = array();
		exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $tmp . '/tests/php/run-motion-map-hover-standalone.php' ) . ' 2>&1', $out, $code );
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
	require_once $root . '/includes/motion/migrate/mappers/class-sgs-motion-map-hover.php';

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

	/** A fragment must survive the shipped schema untouched. */
	function valid( array $motion ): bool {
		return array() === $motion || array() === Sgs_Motion_Migrate_Merge::differences( $motion, Sgs_Motion_Document::sanitise( $motion ) );
	}

	function ksort_copy( array $list ): array {
		sort( $list );
		return $list;
	}

	function sorted_copy( array $list ): array {
		sort( $list );
		return $list;
	}

	function reported_attrs( array $result ): array {
		return array_column( $result['reported'], 'attr' );
	}

	function state( array $result, string $part = 'root' ): ?array {
		return $result['motion']['elements'][ $part ]['hover']['state'] ?? null;
	}

	Sgs_Motion_Map_Hover::set_block_info_provider(
		static function ( string $name ): array {
			$info = array(
				'sgs/media'        => array( 'attributes' => array( 'shadowLiftOnHover' => true ), 'sgs' => array( 'elements' => array( 'media' => array(), 'caption' => array() ) ) ),
				'sgs/info-box'     => array(
					'attributes' => array( 'shadowLiftOnHover' => true, 'effectHover' => 'lift', 'scaleHover' => '' ),
					'sgs'        => array( 'hoverDefaults' => array( 'scalePreset' => '1.02', 'imageZoom' => true ), 'elements' => array( 'box' => array(), 'media' => array( 'motion' => false ) ) ),
				),
				'sgs/team-member'  => array(
					'attributes' => array( 'shadowLiftOnHover' => true, 'imageZoomHover' => false, 'scaleHover' => '' ),
					'sgs'        => array( 'elements' => array( 'card' => array(), 'image' => array( 'selector' => '.sgs-team-member__photo' ) ) ),
				),
				'sgs/card-grid'    => array(
					'attributes' => array( 'effectHover' => 'zoom', 'imageZoomHover' => false, 'scaleHover' => '', 'transitionDuration' => '300', 'transitionEasing' => 'ease-in-out' ),
					'sgs'        => array( 'elements' => array( 'item' => array(), 'image' => array() ) ),
				),
				'sgs/brand-strip'  => array( 'attributes' => array( 'transitionDuration' => '300', 'transitionEasing' => 'ease-in-out' ), 'sgs' => array( 'elements' => array( 'root' => array(), 'item' => array() ) ) ),
				'sgs/responsive-logo' => array( 'attributes' => array( 'opacityHover' => 0.85 ), 'sgs' => array( 'elements' => array( 'wrapper' => array(), 'image' => array(), 'link' => array( 'selector' => '.sgs-responsive-logo__link' ) ) ) ),
				'sgs/container'    => array( 'attributes' => array( 'shadowLiftOnHover' => true, 'bgHoverZoom' => false ), 'sgs' => array( 'elements' => array( 'wrapper' => array(), 'inner' => array() ) ) ),
				'sgs/lifty'        => array( 'attributes' => array( 'shadowLiftOnHover' => false ), 'sgs' => array( 'elements' => array( 'box' => array() ) ) ),
				'sgs/product-card' => array( 'attributes' => array(), 'sgs' => array( 'hoverDefaults' => array( 'lift' => 4 ), 'elements' => array( 'box' => array(), 'image' => array() ) ) ),
				'sgs/heading'      => array( 'attributes' => array( 'transitionDuration' => 0, 'transitionEasing' => 'ease' ), 'sgs' => array( 'elements' => array( 'heading' => array() ) ) ),
				'sgs/text'         => array( 'attributes' => array( 'transitionDuration' => 300, 'transitionEasing' => 'ease' ), 'sgs' => array( 'elements' => array( 'text' => array() ) ) ),
				'sgs/button'       => array( 'attributes' => array( 'scaleHover' => 1, 'opacityHover' => 0, 'transitionDuration' => 0, 'transitionEasing' => 'ease', 'shadowLiftOnHover' => true ), 'sgs' => array( 'elements' => array( 'button' => array() ) ) ),
			);
			return $info[ $name ] ?? array();
		}
	);

	$mapper = new Sgs_Motion_Map_Hover();
	$runner = new Sgs_Motion_Migrate_Runner( array( $mapper ) );

	// 0. Loadable from the real folder; the scope table.
	ok( in_array( 'hover', Sgs_Motion_Migrate_Runner::loadable_families(), true ) && 'hover' === $mapper->family(), 'the hover family is listed and loadable from includes/motion/migrate/mappers/' );
	ok( $mapper->handles( 'sgs/hero', array( 'sgsHoverLift' => 4 ) ) && ! $mapper->handles( 'sgs/hero', array( 'align' => 'full' ) ), 'handles() answers on an owned attribute and not on others' );
	ok( ! $mapper->handles( 'sgs/hero', array( 'transitionDuration' => '300', 'transitionEasing' => 'ease', 'scaleHover' => '1.05' ) ), 'transitionDuration, transitionEasing and scaleHover on a block where they time unrelated transitions are not handled' );
	ok( ! $mapper->handles( 'sgs/icon', array( 'scaleHover' => 1.2, 'shadowLiftOnHover' => false ) ) && ! $mapper->handles( 'sgs/social-icons', array( 'childIconScaleHover' => 1.2 ) ), 'the icon blocks belong to the icon family' );
	ok( $mapper->handles( 'sgs/heading', array( 'transitionDuration' => 400 ) ) && $mapper->handles( 'sgs/team-member', array( 'imageZoomHover' => true ) ) && ! $mapper->handles( 'sgs/hero', array( 'imageZoomHover' => true ) ), 'block-scoped attributes are handled on their blocks only' );

	// 1. The hover-lift preset values equal the seeded preset.
	$presets = json_decode( (string) file_get_contents( $root . '/scripts/data/motion-presets.json' ), true );
	$seeded  = null;
	foreach ( $presets['presets'] as $p ) {
		if ( 'hover-lift' === $p['slug'] ) {
			$seeded = $p['values'];
		}
	}
	ok( Sgs_Motion_Map_Hover::LIFT_PRESET === $seeded, 'LIFT_PRESET equals the hover-lift row of scripts/data/motion-presets.json', js( $seeded ) );

	// 2. The main fixture: percent scale, lift, custom easing, image zoom on a block with a media part, a reported shadow.
	$main = $mapper->map(
		'sgs/media',
		array(
			'sgsHoverScale'        => 105,
			'sgsHoverLift'         => 4,
			'sgsHoverDuration'     => 'fast',
			'sgsHoverEasing'       => 'custom',
			'sgsHoverEasingCustom' => 'cubic-bezier(0.2, 0.8, 0.2, 1)',
			'sgsHoverImageZoom'    => true,
			'sgsHoverZoom'         => 120,
			'sgsHoverShadow'       => 'soft',
			'sgsHoverGrayscale'    => true,
			'sgsHoverOpacity'      => 0.8,
			'sgsHoverIndent'       => '12px',
		)
	);
	$root_state = state( $main );
	ok( array(
		'scale'      => 1.05,
		'translateY' => -4,
		'opacity'    => 0.8,
		'indent'     => '12px',
		'duration'   => 'token:duration.fast',
		'easing'     => 'cubic-bezier(0.2, 0.8, 0.2, 1)',
	) === ( $root_state['values'] ?? null ), 'sgsHoverScale 105, lift 4, opacity, indent, duration slug and a custom curve land in the root hover state', js( $root_state ) );
	$media_state = state( $main, 'media' );
	ok( 'root' === ( $media_state['source'] ?? '' ) && array( 'scale' => 1.2, 'easing' => 'cubic-bezier(0.2, 0.8, 0.2, 1)' ) === ( $media_state['values'] ?? null ), 'sgsHoverImageZoom on a block with a media part is a root-sourced state on that part (zoom 120 is 1.2, with the panel easing)', js( $media_state ) );
	ok( array( 'sgsHoverShadow', 'sgsHoverGrayscale' ) === reported_attrs( $main ) && array() === array_intersect( array( 'sgsHoverShadow', 'sgsHoverGrayscale' ), $main['consumed'] ), 'the hover shadow and grayscale are reported and not consumed', js( $main['reported'] ) );
	ok( valid( $main['motion'] ), 'the fragment is schema-valid' );
	ok( 'hover shadow stays in its shadow control; box-shadow on hover is the M3.4 hover ring' === $main['reported'][0]['reason'], 'the shadow reason is the one the plan states' );

	// 3. Defaults.
	$preset_off = $mapper->map( 'sgs/info-box', array( 'sgsHoverScalePreset' => '' ) );
	ok( 1 === ( state( $preset_off )['values']['scale'] ?? null ), 'an empty scale preset over the info-box default 1.02 is written as scale 1' );
	$preset_set = $mapper->map( 'sgs/info-box', array( 'sgsHoverScalePreset' => '1.05' ) );
	ok( 1.05 === ( state( $preset_set )['values']['scale'] ?? null ) && in_array( 'sgsHoverScalePreset', $preset_set['consumed'], true ), 'a scale preset becomes the scale' );
	$both = $mapper->map( 'sgs/info-box', array( 'sgsHoverScale' => 110, 'sgsHoverScalePreset' => '1.05' ) );
	ok( 1.1 === ( state( $both )['values']['scale'] ?? null ) && array() === array_diff( array( 'sgsHoverScale', 'sgsHoverScalePreset' ), $both['consumed'] ), 'the percent scale wins over the preset and both are consumed' );
	$lift_off = $mapper->map( 'sgs/product-card', array( 'sgsHoverLift' => 0 ) );
	ok( 0 === ( state( $lift_off )['values']['translateY'] ?? null ) && in_array( 'sgsHoverLift', $lift_off['consumed'], true ), 'lift 0 over the product-card default 4 is written as translateY 0' );
	$lift_none = $mapper->map( 'sgs/hero', array( 'sgsHoverLift' => 0, 'sgsHoverScale' => 0, 'sgsHoverOpacity' => 0, 'sgsHoverDuration' => 'medium', 'sgsHoverEasing' => 'default' ) );
	ok( array() === $lift_none['motion'] && 5 === count( $lift_none['consumed'] ), 'values equal to defaults that change nothing are consumed without a hover state', js( $lift_none ) );
	$sll_default = $mapper->map( 'sgs/info-box', array( 'shadowLiftOnHover' => true ) );
	ok( array() === $sll_default['motion'] && array( 'shadowLiftOnHover' ) === $sll_default['consumed'], 'shadowLiftOnHover true over its default true creates no state and is consumed' );
	$sll_off = $mapper->map( 'sgs/info-box', array( 'shadowLiftOnHover' => false ) );
	ok( array() === $sll_off['consumed'] && array( 'shadowLiftOnHover' ) === reported_attrs( $sll_off ), 'shadowLiftOnHover false over its default true is reported and stays' );
	$sll_preset = $mapper->map( 'sgs/lifty', array( 'shadowLiftOnHover' => true ) );
	ok( 'hover-lift' === ( state( $sll_preset )['preset'] ?? '' ) && Sgs_Motion_Map_Hover::LIFT_PRESET === ( state( $sll_preset )['values'] ?? null ) && valid( $sll_preset['motion'] ), 'shadowLiftOnHover true where the block default is off stamps the hover-lift preset with its values', js( $sll_preset ) );
	$sll_lift = $mapper->map( 'sgs/lifty', array( 'shadowLiftOnHover' => true, 'sgsHoverLift' => 6 ) );
	ok( ! isset( state( $sll_lift )['preset'] ) && -6 === ( state( $sll_lift )['values']['translateY'] ?? null ), 'an explicit lift wins over the preset lift' );

	// 4. Durations and easing.
	$ms = $mapper->map( 'sgs/hero', array( 'sgsHoverDurationMs' => 450, 'sgsHoverDuration' => 'slow', 'sgsHoverEasing' => 'spring', 'sgsHoverScale' => 103 ) );
	ok( 450 === ( state( $ms )['values']['duration'] ?? null ) && 'token:easing.spring' === ( state( $ms )['values']['easing'] ?? null ), 'sgsHoverDurationMs wins over the slug; spring is the spring token' );
	$bad = $mapper->map( 'sgs/hero', array( 'sgsHoverEasing' => 'custom', 'sgsHoverEasingCustom' => 'steps(4)', 'sgsHoverScale' => 103 ) );
	ok( array( 'sgsHoverEasingCustom' ) === reported_attrs( $bad ) && ! in_array( 'sgsHoverEasing', $bad['consumed'], true ) && 1.03 === ( state( $bad )['values']['scale'] ?? null ), 'an invalid custom curve is reported and not consumed while the rest still maps' );
	$lin = $mapper->map( 'sgs/hero', array( 'sgsHoverEasing' => 'custom', 'sgsHoverEasingCustom' => 'linear(0, 0.5 50%, 1)', 'sgsHoverOpacity' => 0.5 ) );
	ok( 'linear(0, 0.5 50%, 1)' === ( state( $lin )['values']['easing'] ?? null ) && valid( $lin['motion'] ), 'a valid linear() custom curve is accepted' );
	$badnum = $mapper->map( 'sgs/hero', array( 'sgsHoverLift' => true ) );
	ok( array() === $badnum['consumed'] && array( 'sgsHoverLift' ) === reported_attrs( $badnum ), 'a non-number lift is reported and stays' );

	// 5. Image zoom and the background zoom.
	$info_zoom = $mapper->map( 'sgs/info-box', array( 'sgsHoverImageZoom' => true ) );
	ok( array() === $info_zoom['motion'] && array( 'sgsHoverImageZoom' ) === reported_attrs( $info_zoom ) && false !== strpos( $info_zoom['reported'][0]['reason'], 'no media part' ), 'image zoom on a block whose media part is excluded from motion reports "no media part"' );
	$zoom_off = $mapper->map( 'sgs/info-box', array( 'sgsHoverImageZoom' => false ) );
	ok( array() === $zoom_off['consumed'] && array( 'sgsHoverImageZoom' ) === reported_attrs( $zoom_off ), 'zoom switched off over an on default, with no media part to write scale 1 on, is reported' );
	$team = $mapper->map( 'sgs/team-member', array( 'imageZoomHover' => true ) );
	ok( 1.1 === ( state( $team, 'image' )['values']['scale'] ?? null ) && 'root' === ( state( $team, 'image' )['source'] ?? '' ) && array( 'imageZoomHover' ) === $team['consumed'], 'imageZoomHover on sgs/team-member is a root-sourced scale 1.1 on its image part (the 110 percent default)' );
	$grid = $mapper->map( 'sgs/card-grid', array( 'imageZoomHover' => true, 'effectHover' => 'lift', 'scaleHover' => '1.05' ) );
	ok( array() === $grid['motion'] && array() === $grid['consumed'] && array( 'effectHover', 'imageZoomHover', 'scaleHover' ) === array_values( (array) ksort_copy( reported_attrs( $grid ) ) ), 'the per-item image zoom, effectHover and string scaleHover of a card block are reported and stay', js( $grid['reported'] ) );
	$grid_default = $mapper->map( 'sgs/card-grid', array( 'effectHover' => 'zoom', 'scaleHover' => '' ) );
	ok( array() === $grid_default['reported'] && 2 === count( $grid_default['consumed'] ), 'effectHover and scaleHover equal to their defaults are consumed' );
	$zoom_extra = $mapper->map( 'sgs/media', array( 'sgsHoverImageZoom' => true, 'sgsHoverZoomDuration' => 800, 'sgsHoverZoomStyle' => 'spill' ) );
	ok( array( 'sgsHoverZoomDuration', 'sgsHoverZoomStyle' ) === reported_attrs( $zoom_extra ) && 1.1 === ( state( $zoom_extra, 'media' )['values']['scale'] ?? null ), 'the zoom duration and the spill style are reported and stay while the zoom maps' );
	$bg = $mapper->map( 'sgs/container', array( 'bgHoverZoom' => true, 'bgHoverZoomScale' => 110, 'bgHoverZoomDuration' => 600 ) );
	ok( array() === $bg['motion'] && array() === $bg['consumed'] && 3 === count( $bg['reported'] ), 'the background zoom is reported whole and stays', js( $bg['reported'] ) );
	$bg_off = $mapper->map( 'sgs/container', array( 'bgHoverZoomScale' => 110 ) );
	ok( array() === $bg_off['reported'] && array( 'bgHoverZoomScale' ) === $bg_off['consumed'], 'a background zoom value with the zoom off is inert and consumed' );

	// 6. Block-owned attributes.
	$heading = $mapper->map( 'sgs/heading', array( 'scaleHover' => 1.05, 'transitionDuration' => 400, 'transitionEasing' => 'ease-out' ) );
	ok( array( 'scale' => 1.05, 'duration' => 400, 'easing' => 'ease-out' ) === ( state( $heading )['values'] ?? null ) && 3 === count( $heading['consumed'] ) && valid( $heading['motion'] ), 'sgs/heading scaleHover, transitionDuration and transitionEasing are the root state', js( $heading ) );
	$text = $mapper->map( 'sgs/text', array( 'transitionDuration' => 300, 'transitionEasing' => 'ease' ) );
	ok( array() === $text['motion'] && 2 === count( $text['consumed'] ), 'sgs/text transition values equal to its defaults create no state and are consumed' );
	$button = $mapper->map( 'sgs/button', array( 'scaleHover' => 1.08, 'scaleHoverTarget' => 'whole', 'opacityHover' => 0.9, 'transitionDuration' => 250, 'transitionEasing' => 'quart-out' ) );
	ok( array( 'scale' => 1.08, 'opacity' => 0.9, 'duration' => 250, 'easing' => 'cubic-bezier(0.165, 0.84, 0.44, 1)' ) === ( state( $button )['values'] ?? null ) && 5 === count( $button['consumed'] ) && valid( $button['motion'] ), 'sgs/button maps scale, opacity, duration and a named easing from the shared list', js( $button ) );
	// 6b. Item timing (brand-strip, card-grid) and the logo link's hover opacity.
	ok( $mapper->handles( 'sgs/brand-strip', array( 'transitionDuration' => '500' ) ) && $mapper->handles( 'sgs/card-grid', array( 'transitionEasing' => 'linear' ) ) && $mapper->handles( 'sgs/responsive-logo', array( 'opacityHover' => 0.5 ) ) && ! $mapper->handles( 'sgs/responsive-logo', array( 'transitionDuration' => '500' ) ), 'the new owners are handled on their blocks only' );
	$strip = $mapper->map( 'sgs/brand-strip', array( 'transitionDuration' => '500', 'transitionEasing' => 'linear' ) );
	ok( array( 'duration' => 500, 'easing' => 'linear' ) === ( state( $strip, 'item' )['values'] ?? null ) && array() === ( $strip['motion']['elements']['root'] ?? array() ) && array( 'transitionDuration', 'transitionEasing' ) === $strip['consumed'] && valid( $strip['motion'] ), 'sgs/brand-strip timing is the item part hover timing', js( $strip ) );
	$grid_t = $mapper->map( 'sgs/card-grid', array( 'transitionDuration' => '300', 'transitionEasing' => 'ease-in-out', 'scaleHover' => '' ) );
	ok( array() === $grid_t['motion'] && array( 'scaleHover', 'transitionDuration', 'transitionEasing' ) === (array) ksort_copy( $grid_t['consumed'] ), 'sgs/card-grid timing equal to its default maps to nothing and is consumed', js( $grid_t ) );
	$grid_d = $mapper->map( 'sgs/card-grid', array( 'transitionDuration' => '600' ) );
	ok( array( 'duration' => 600 ) === ( state( $grid_d, 'item' )['values'] ?? null ) && valid( $grid_d['motion'] ), 'sgs/card-grid duration is the item part hover duration', js( $grid_d ) );
	$strip_bad = $mapper->map( 'sgs/brand-strip', array( 'transitionDuration' => '0.5s' ) );
	ok( array() === $strip_bad['consumed'] && array( 'transitionDuration' ) === reported_attrs( $strip_bad ), 'a duration that is not whole milliseconds is reported and stays' );
	$logo = $mapper->map( 'sgs/responsive-logo', array( 'opacityHover' => 0.7 ) );
	ok( array( 'opacity' => 0.7 ) === ( state( $logo, 'link' )['values'] ?? null ) && array( 'opacityHover' ) === $logo['consumed'] && valid( $logo['motion'] ), 'sgs/responsive-logo opacityHover is the link part hover opacity', js( $logo ) );
	foreach ( array( 0.85, 0, 1 ) as $same ) {
		$logo_same = $mapper->map( 'sgs/responsive-logo', array( 'opacityHover' => $same ) );
		ok( array() === $logo_same['motion'] && array( 'opacityHover' ) === $logo_same['consumed'], 'sgs/responsive-logo opacityHover ' . $same . ' (the default, off, or no change) maps to nothing and is consumed' );
	}
	$face = $mapper->map( 'sgs/button', array( 'scaleHover' => 1.08, 'scaleHoverTarget' => 'face' ) );
	ok( array() === $face['motion'] && array() === $face['consumed'] && array( 'scaleHover' ) === reported_attrs( $face ), 'a button scaling its face only is reported' );

	$btn_lift = $mapper->map( 'sgs/button', array( 'liftHover' => 4, 'scaleHover' => 1.05 ) );
	ok( -4 === ( state( $btn_lift )['values']['translateY'] ?? null ) && 1.05 === ( state( $btn_lift )['values']['scale'] ?? null ) && array( 'liftHover', 'scaleHover' ) === sorted_copy( $btn_lift['consumed'] ) && valid( $btn_lift['motion'] ), 'sgs/button liftHover is a negative translateY like sgsHoverLift', js( $btn_lift ) );
	$btn_clamp = $mapper->map( 'sgs/button', array( 'liftHover' => 30 ) );
	ok( -24 === ( state( $btn_clamp )['values']['translateY'] ?? null ) && array( 'liftHover' ) === reported_attrs( $btn_clamp ) && true === $btn_clamp['reported'][0]['consumed'], 'a liftHover past the render clamp of 24px is stored as rendered and reported' );
	ok( ! $mapper->handles( 'sgs/heading', array( 'liftHover' => 4 ) ), 'liftHover belongs to the button only' );

	// 7. Rename, stored sgsMotion wins, end to end through the runner.
	$rename = $mapper->map( 'sgs/info-box', array( 'shadowHoverColour' => 'accent' ) );
	ok( array( 'shadowColourHover' => 'accent' ) === $rename['attrs'] && array( 'shadowHoverColour' ) === $rename['consumed'], 'shadowHoverColour is renamed to shadowColourHover through attrs' );
	$post  = render_tree( array(
		blk( 'sgs/media', array( 'sgsHoverScale' => 105, 'sgsHoverLift' => 4, 'sgsHoverImageZoom' => true, 'sgsHoverShadow' => 'soft', 'align' => 'wide' ) ),
		blk( 'sgs/info-box', array( 'shadowHoverColour' => 'accent', 'sgsHoverScale' => 105, 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'root' => array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.3 ) ) ) ) ) ) ) ),
		blk( 'sgs/heading', array( 'scaleHover' => 1.04, 'transitionDuration' => 350 ) ),
		blk( 'sgs/hero', array( 'transitionDuration' => '500' ) ),
	) );
	$first = $runner->migrate_content( $post );
	$out   = parse_blocks( $first['content'] );
	ok( $first['changed'] && -4 === ( $out[0]['attrs']['sgsMotion']['elements']['root']['hover']['state']['values']['translateY'] ?? null ) && 1.1 === ( $out[0]['attrs']['sgsMotion']['elements']['media']['hover']['state']['values']['scale'] ?? null ), 'the runner writes the root lift and the media zoom state', js( $out[0]['attrs'] ?? null ) );
	ok( array( 'align', 'sgsHoverShadow', 'sgsMotion' ) === ksort_copy( array_values( array_intersect( array_keys( $out[0]['attrs'] ), array( 'align', 'sgsHoverShadow', 'sgsMotion', 'sgsHoverScale', 'sgsHoverLift', 'sgsHoverImageZoom' ) ) ) ), 'the runner removes the consumed attributes and keeps the reported shadow and the others', js( array_keys( $out[0]['attrs'] ) ) );
	ok( 1.3 === ( $out[1]['attrs']['sgsMotion']['elements']['root']['hover']['state']['values']['scale'] ?? null ) && isset( $out[1]['attrs']['shadowColourHover'] ) && ! isset( $out[1]['attrs']['sgsHoverScale'] ), 'a value already stored in sgsMotion wins, the clash is flagged and the old attribute is consumed' );
	ok( 1 === count( array_filter( $first['flags'], static fn( $f ) => false !== strpos( (string) $f['key'], 'conflict' ) ) ), 'exactly one conflict is flagged', js( $first['flags'] ) );
	ok( '500' === ( $out[3]['attrs']['transitionDuration'] ?? null ) && array( 'sgsHoverShadow' ) === array_column( $first['reported'], 'attr' ), 'a hero keeps its transitionDuration and only the shadow is reported', js( $first['reported'] ) );
	$second = $runner->migrate_content( $first['content'] );
	ok( $second['content'] === $first['content'] && array( 'sgsHoverShadow' ) === array_column( $second['reported'], 'attr' ), 'idempotent: a second run leaves the content byte-identical and reports the same stuck attribute' );
	$clean = '<!-- wp:sgs/hero {"align":"full","sgsMotion":{"v":1,"elements":{"root":{"hover":{"state":{"values":{"scale":1.05}}}}}}} /-->';
	$third = $runner->migrate_content( $clean );
	ok( ! $third['changed'] && $third['content'] === $clean, 'content that holds only sgsMotion is untouched' );

	echo "\nRESULT  $pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
