<?php
/**
 * Standalone runner for the effect-layer emitter (Spec 38A FR-38A-22, M5.1): the schema's per-field grammar, the
 * runtime-vocabulary twins, and the emission through the real renderer.
 *
 * Renders fixture blocks through the shipped renderer with the WordPress stand-ins in `stubs/motion-render-stubs.php`
 * (block types from the real block.json files, the real `schemas/motion.schema.json`), sniffs the output with the
 * real `SGS_Motion_Registry`, and resolves tokens from the real `theme/sgs-theme/theme.json` through a
 * `wp_get_global_settings` stand-in. The mapper has its own runner, `run-motion-fx-mapper-standalone.php`.
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-fx-emitter-standalone.php
 *
 * Planted faults (each must turn the run red; set in the environment, applied to the decoded schema only):
 *   SGS_FX_PLANT=no-data-attr   scrub `smoothing` loses its dataAttr: the dataAttr coverage check fails.
 *   SGS_FX_PLANT=no-data-unit   scrub `smoothing` loses its dataUnit: the dataUnit coverage check fails.
 *   SGS_FX_PLANT=widen-range    scrub `smoothing` and `startViewport` lose their maximum: the emitter's own sanitise
 *                               now passes 9000 and 150, so the out-of-range checks fail (the negative control that
 *                               they can see an unsanitised value).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

namespace {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
	define( 'SGS_BLOCKS_PATH', dirname( __DIR__, 2 ) . '/' );
	define( 'SGS_BLOCKS_URL', 'https://example.test/wp-content/plugins/sgs-blocks/' );
	define( 'SGS_BLOCKS_VERSION', 'test' );

	/** The theme's `settings.custom`, as WordPress merges it (the real theme.json; no client snapshot here). */
	function wp_get_global_settings( $path = array() ) {
		$theme  = json_decode( (string) file_get_contents( dirname( __DIR__, 4 ) . '/theme/sgs-theme/theme.json' ), true );
		$custom = $theme['settings']['custom'] ?? array();
		return array( 'custom' ) === $path ? $custom : array( 'custom' => $custom );
	}

	require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-motion-registry.php';
	require_once __DIR__ . '/stubs/motion-render-stubs.php';
	require_once dirname( __DIR__, 2 ) . '/includes/helpers-global-settings.php';

	use SGS\Blocks\Motion\Sgs_Motion_Field_Types as Types;
	use SGS\Blocks\Motion\Sgs_Motion_Fx_Emitter as Emitter;
	use SGS\Blocks\Motion\Sgs_Motion_Fx_Grammar as Grammar;

	$GLOBALS['fx_fail']  = 0;
	$GLOBALS['fx_count'] = 0;

	function fx_check( bool $ok, string $label ): void {
		++$GLOBALS['fx_count'];
		$GLOBALS['fx_fail'] += $ok ? 0 : 1;
		echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . PHP_EOL;
	}

	function fx_tag( string $html, string $class ): string {
		return preg_match( '/<[a-z][a-z0-9]*\b[^>]*\bclass="[^"]*\b' . preg_quote( $class, '/' ) . '\b[^"]*"[^>]*>/', $html, $m ) ? $m[0] : '';
	}

	function fx_attrs( string $tag ): array {
		preg_match_all( '/\s(data-sgs-fx[a-z0-9-]*)="([^"]*)"/', $tag, $m, PREG_SET_ORDER );
		$out = array();
		foreach ( $m as $hit ) {
			$out[ $hit[1] ] = html_entity_decode( $hit[2], ENT_QUOTES );
		}
		ksort( $out );
		return $out;
	}

	function fx_render( string $block, array $motion, string $html ): string {
		\SGS\Blocks\Motion\Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_collected_css'] = array();
		$GLOBALS['sgs_test_actions']  = array();
		return sgs_test_render_motion_block( array( 'blockName' => $block, 'attrs' => array( 'sgsMotion' => $motion ) ), $html );
	}

	function fx_drops(): array {
		return array_values( array_map( static fn( $a ) => $a[1][2]['id'] ?? '', array_filter( $GLOBALS['sgs_test_actions'], static fn( $a ) => 'sgs_motion_layer_dropped' === $a[0] ) ) );
	}

	function fx_doc( string $target, array $element ): array {
		return array( 'v' => 1, 'elements' => array( $target => $element ) );
	}

	// The planted faults: edits to the decoded schema only (the file is untouched), before anything reads it.
	$plant = (string) getenv( 'SGS_FX_PLANT' );
	if ( '' !== $plant ) {
		$schema = Types::schema();
		$smooth = &$schema['$defs']['ScrubValues']['properties']['smoothing'];
		if ( 'no-data-attr' === $plant ) {
			unset( $smooth['x-sgs-field']['dataAttr'] );
		} elseif ( 'no-data-unit' === $plant ) {
			unset( $smooth['x-sgs-field']['dataUnit'] );
		} elseif ( 'widen-range' === $plant ) {
			unset( $smooth['maximum'], $smooth['x-sgs-range'], $schema['$defs']['ScrubValues']['properties']['startViewport']['maximum'] );
		}
		unset( $smooth );
		( new \ReflectionProperty( Types::class, 'schema' ) )->setValue( null, $schema );
	}

	// 1. The schema carries the grammar: every effect value field names its attribute, every duration, length and angle
	// field its unit, and only a position's edge and line share an attribute.
	$effects = array_keys( Types::schema()['x-sgs-effects'] ?? array() );
	$total   = 0;
	$missing = array();
	$no_unit = array();
	$shared  = array();
	foreach ( $effects as $effect ) {
		$by_attr = array();
		foreach ( Grammar::fields( $effect ) as $field ) {
			++$total;
			$where = $effect . '.' . implode( '.', $field['path'] );
			if ( 1 !== preg_match( '/^data-sgs-fx-[a-z0-9-]+$/', $field['attr'] ) ) {
				$missing[] = $where;
				continue;
			}
			if ( in_array( $field['type'], array( 'duration', 'distance', 'angle' ), true ) && '' === $field['unit'] && '' === $field['form'] ) {
				$no_unit[] = $where;
			}
			$by_attr[ $field['attr'] ][] = $field;
		}
		foreach ( $by_attr as $attr => $group ) {
			$forms = array_unique( array_column( $group, 'form' ) );
			if ( count( $group ) > 1 && ! ( 2 === count( $group ) && array( 'position' ) === $forms ) ) {
				$shared[] = $effect . ' ' . $attr;
			}
		}
	}
	fx_check( $total > 200 && array() === $missing, "every effect value field ($total) carries x-sgs-field.dataAttr; missing: " . json_encode( $missing ) );
	fx_check( array() === $no_unit, 'every duration, length and angle field carries a dataUnit or a dataForm; missing: ' . json_encode( $no_unit ) );
	fx_check( array() === $shared, 'only a position edge and line share an attribute: ' . json_encode( $shared ) );

	// 2. The runtime vocabularies kept in code match their JavaScript twins.
	$src = dirname( __DIR__, 2 ) . '/src/';
	preg_match( '/const HOLD_FRACTIONS = \{([^}]*)\}/', (string) file_get_contents( $src . 'shared/effects/gsap/pin-scrub-params.js' ), $m );
	preg_match_all( '/(\w+):\s*([\d.]+)/', $m[1] ?? '', $pairs, PREG_SET_ORDER );
	$js_hold = array();
	foreach ( $pairs as $pair ) {
		$js_hold[ $pair[1] ] = 0 + $pair[2];
	}
	fx_check( array() !== $js_hold && \SGS\Blocks\Motion\Sgs_Motion_Legacy_Fx_Value::LEGACY_HOLD == $js_hold, 'the migration LEGACY_HOLD equals pin-scrub-params.js HOLD_FRACTIONS: ' . json_encode( $js_hold ) );
	preg_match( '/export function resolveTrigger\b.*?\n\}/s', (string) file_get_contents( $src . 'shared/effects/gsap/provider.js' ), $m );
	preg_match_all( "/'(load|scroll|hover|[a-z]+)'/", $m[0] ?? '', $words );
	fx_check( array() === array_diff( Grammar::RUNTIME_TRIGGERS, $words[1] ) && array() === array_diff( array_unique( $words[1] ), Grammar::RUNTIME_TRIGGERS ), 'RUNTIME_TRIGGERS equals the words provider.js resolveTrigger reads: ' . json_encode( array_values( array_unique( $words[1] ) ) ) );
	preg_match( '/export function triggerOf\b.*?\n\}/s', (string) file_get_contents( $src . 'shared/effects/fx-ripple.js' ), $m );
	preg_match_all( "/'(pointerdown|click|[a-z]+)'/", $m[0] ?? '', $words );
	fx_check( array() !== $words[1] && array() === array_diff( Grammar::POINTER_TRIGGERS, $words[1] ) && array() === array_diff( array_unique( $words[1] ), Grammar::POINTER_TRIGGERS ), 'POINTER_TRIGGERS equals the words fx-ripple.js triggerOf reads: ' . json_encode( array_values( array_unique( $words[1] ) ) ) );
	$ripple = \SGS\Blocks\Motion\Sgs_Motion_Fx_Emitter::layer_attrs( array( 'id' => 'r1', 'effect' => 'ripple', 'trigger' => 'click', 'values' => array() ), 'sgs/button', 'root' );
	fx_check( 'click' === ( $ripple['data-sgs-fx-trigger'] ?? null ), 'a click-trigger ripple layer writes data-sgs-fx-trigger="click": ' . json_encode( $ripple ) );
	preg_match_all( "/values: \{ gsap: '([^']+)' \}/", (string) file_get_contents( $src . 'components/motion/easing-master-list.js' ), $m );
	$gsap = array_keys( Grammar::gsap_curves() );
	fx_check( count( $m[1] ) > 4 && array() === array_diff( $m[1], $gsap ) && array() === array_diff( $gsap, $m[1] ), 'gsap_curves() names every non-empty gsap ease of easing-master-list.js: ' . json_encode( $m[1] ) );
	foreach ( array( 'mega-panel' => 'allowed_fx_effects', 'site-header-row' => 'shr_allowed_fx_effects', 'site-footer-row' => 'sfr_allowed_fx_effects' ) as $slug => $var ) {
		preg_match( '/\$' . $var . '\s*=\s*array\(([^)]*)\)/', (string) file_get_contents( $src . 'blocks/' . $slug . '/render.php' ), $m );
		preg_match_all( "/'([a-z-]+)'/", $m[1] ?? '', $list );
		fx_check( \SGS\Blocks\Motion\Sgs_Motion_Map_Fx::PRIVATE_SELECTOR_EFFECTS === $list[1], "PRIVATE_SELECTOR_EFFECTS equals $slug render.php's allow-list: " . json_encode( $list[1] ) );
	}

	$card = '<div class="wp-block-sgs-team-member sgs-team-member"><img class="sgs-team-member__photo" src="a.jpg" alt=""><h3 class="sgs-team-member__name">Name</h3></div>';

	// 3. A scrub layer on the image part lands on the <img>, in the runtime's units, with a GSAP ease name.
	$scrub = array(
		'id'      => 'scrub',
		'effect'  => 'scrub',
		'trigger' => 'scroll',
		'off'     => array( 'mobile' ),
		'values'  => array( 'smoothing' => 800, 'startElement' => 'top', 'startViewport' => 85, 'endElement' => 'top', 'endViewport' => 50, 'easing' => 'cubic-bezier(0.165, 0.84, 0.44, 1)' ),
	);
	$out   = fx_render( 'sgs/team-member', fx_doc( 'image', array( 'effects' => array( $scrub ) ) ), $card );
	$img   = fx_attrs( fx_tag( $out, 'sgs-team-member__photo' ) );
	fx_check(
		array( 'data-sgs-fx' => 'scrub', 'data-sgs-fx-disable-mobile' => '1', 'data-sgs-fx-ease' => 'power3.out', 'data-sgs-fx-end' => 'top center', 'data-sgs-fx-scrub' => '0.8', 'data-sgs-fx-start' => 'top 85%', 'data-sgs-fx-trigger' => 'scroll' ) === $img,
		'scrub on the image part: the grammar on the <img>, the power3.out curve as its GSAP name, off mobile as the disable flag: ' . json_encode( $img )
	);
	fx_check( array() === fx_attrs( fx_tag( $out, 'wp-block-sgs-team-member' ) ), 'the root carries no data-sgs-fx for an image-part layer' );

	// 4. Out of range: dropped through the renderer, and by the emitter on an unsanitised layer.
	$bad = array( 'effect' => 'scrub', 'values' => array( 'smoothing' => 9000, 'startElement' => 'top', 'startViewport' => 150 ) );
	$out = fx_render( 'sgs/team-member', fx_doc( 'image', array( 'effects' => array( array( 'id' => 'scrub' ) + $bad ) ) ), $card );
	$img = fx_attrs( fx_tag( $out, 'sgs-team-member__photo' ) );
	fx_check( array( 'data-sgs-fx' => 'scrub' ) === $img, 'renderer: smoothing 9000ms (max 5000) and viewport 150 (max 100) are dropped, the effect stays: ' . json_encode( $img ) );
	$direct = Emitter::layer_attrs( $bad );
	fx_check( array( 'data-sgs-fx' => 'scrub' ) === $direct, 'emitter on an unsanitised layer drops the same values itself: ' . json_encode( $direct ) );
	fx_check( '5' === ( Emitter::layer_attrs( array( 'effect' => 'scrub', 'values' => array( 'smoothing' => 5000 ) ) )['data-sgs-fx-scrub'] ?? null ), 'the in-range boundary 5000ms is written as 5 seconds' );
	fx_check( '0' === ( Emitter::layer_attrs( array( 'effect' => 'scrub', 'values' => array( 'smoothing' => 0 ) ) )['data-sgs-fx-scrub'] ?? null ), 'a zero smoothing (no lag) is written, never treated as absent' );

	// 5. A root-target layer emits on the root; the default shape is left out.
	$out  = fx_render( 'sgs/team-member', fx_doc( 'root', array( 'effects' => array( array( 'id' => 'cursor-field', 'effect' => 'cursor-field', 'values' => array( 'field' => 'hue-shift', 'colour' => 'primary', 'radius' => '32px', 'shape' => 'circle' ) ) ) ) ), $card );
	$root = fx_attrs( fx_tag( $out, 'wp-block-sgs-team-member' ) );
	fx_check( array( 'data-sgs-fx' => 'cursor-field', 'data-sgs-fx-field' => 'hue-shift', 'data-sgs-fx-field-colour' => 'primary', 'data-sgs-fx-field-radius' => '32' ) === $root, 'cursor-field on the root (a 32px radius as the number 32, circle left out): ' . json_encode( $root ) );

	fx_check( 32.0 === Grammar::plain_number( '2rem', 'px' ) && null === Grammar::plain_number( '2em', 'px' ) && 360.0 === Grammar::plain_number( '1turn', 'deg' ), 'a rem length converts at the 16px root; em has no pixel value outside the page' );

	// 6. The root and its wrapper part join one list; the registry loads every listed effect, whatever the whitespace.
	$out  = fx_render( 'sgs/team-member', array( 'v' => 1, 'elements' => array( 'root' => array( 'effects' => array( array( 'id' => 'particles', 'effect' => 'particles', 'values' => array( 'density' => 2 ) ) ) ), 'card' => array( 'effects' => array( array( 'id' => 'grid-dots', 'effect' => 'grid-dots', 'values' => array( 'cell' => 24 ) ) ) ) ) ), $card );
	$root = fx_attrs( fx_tag( $out, 'wp-block-sgs-team-member' ) );
	fx_check( 'particles grid-dots' === ( $root['data-sgs-fx'] ?? '' ), 'root and its isWrapper part join one data-sgs-fx list: ' . json_encode( $root ) );
	$GLOBALS['sgs_test_enqueued'] = array();
	\SGS\Blocks\SGS_Motion_Registry::sniff_block( '<div data-sgs-fx="particles	 grid-dots"></div>', array( 'blockName' => 'sgs/x', 'attrs' => array() ) );
	$enqueued = array_keys( $GLOBALS['sgs_test_enqueued'] ?? array() );
	fx_check( in_array( 'module:@sgs/fx-particles', $enqueued, true ) && in_array( 'module:@sgs/fx-grid-dots', $enqueued, true ), 'the registry splits a data-sgs-fx list on any whitespace: ' . json_encode( $enqueued ) );

	// 7. Data-sgs-fx already on the element (a block's own render) joins rather than being overwritten (Track I's
	// Sgs_Motion_Markup::write change; red until it lands).
	$out = fx_render( 'sgs/image-sequence', fx_doc( 'canvas', array( 'effects' => array( array( 'id' => 'scrub', 'effect' => 'scrub' ) ) ) ), '<div class="wp-block-sgs-image-sequence sgs-image-sequence"><canvas class="sgs-image-sequence__canvas" data-sgs-fx="image-sequence" data-sgs-fx-start="top top"></canvas></div>' );
	$cv  = fx_attrs( fx_tag( $out, 'sgs-image-sequence__canvas' ) );
	fx_check( 'image-sequence scrub' === ( $cv['data-sgs-fx'] ?? '' ) && 'top top' === ( $cv['data-sgs-fx-start'] ?? '' ), 'a canvas already marked image-sequence keeps it and gains scrub: ' . json_encode( $cv ) );

	// 8. Two scroll-driven Tier G layers on one element: the later is refused, not merged into the earlier's settings.
	$out  = fx_render( 'sgs/team-member', fx_doc( 'image', array( 'effects' => array( array( 'id' => 'scrub', 'effect' => 'scrub', 'values' => array( 'smoothing' => 500 ) ), array( 'id' => 'image-sequence', 'effect' => 'image-sequence', 'values' => array( 'startElement' => 'bottom', 'startViewport' => 20 ) ) ) ) ), $card );
	$img  = fx_attrs( fx_tag( $out, 'sgs-team-member__photo' ) );
	fx_check( 'scrub' === ( $img['data-sgs-fx'] ?? '' ) && ! isset( $img['data-sgs-fx-start'] ) && in_array( 'tier-g-shared-scroll-settings', fx_drops(), true ), 'a second Tier G layer on one element is refused through the refusal table: ' . json_encode( $img ) . ' drops ' . json_encode( fx_drops() ) );

	// 9. The container's background SVG part takes a draw layer.
	$out = fx_render( 'sgs/container', fx_doc( 'svg-bg', array( 'entrance' => array( 'text' => array( array( 'id' => 'draw', 'effect' => 'draw', 'trigger' => 'scroll', 'values' => array( 'duration' => 1200 ) ) ) ) ) ), '<div class="wp-block-sgs-container sgs-container"><div class="sgs-container__svg-bg" aria-hidden="true"><svg><path d="M0 0"/></svg></div><div class="sgs-container__inner"></div></div>' );
	$svg = fx_attrs( fx_tag( $out, 'sgs-container__svg-bg' ) );
	fx_check( array( 'data-sgs-fx' => 'draw', 'data-sgs-fx-duration' => '1.2', 'data-sgs-fx-trigger' => 'scroll' ) === $svg && array() === fx_attrs( fx_tag( $out, 'wp-block-sgs-container' ) ), 'draw on the container svg-bg part lands on .sgs-container__svg-bg: ' . json_encode( $svg ) );

	// 10. Tokens resolve to the theme's value; a curve no runtime reads is written and reported; an unknown slug writes
	// nothing.
	$GLOBALS['sgs_test_actions'] = array();
	$tok = Emitter::layer_attrs( array( 'effect' => 'scrub', 'values' => array( 'smoothing' => 'token:duration.slow', 'easing' => 'token:easing.default' ) ), 'sgs/x', 'root' );
	fx_check( '0.45' === ( $tok['data-sgs-fx-scrub'] ?? null ) && 'cubic-bezier(0.4, 0, 0.2, 1)' === ( $tok['data-sgs-fx-ease'] ?? null ) && in_array( 'fx-ease-unread', fx_drops(), true ), 'token:duration.slow is 0.45s; token:easing.default is written as its curve and reported unread: ' . json_encode( $tok ) );
	$tok = Emitter::layer_attrs( array( 'effect' => 'scrub', 'values' => array( 'easing' => 'linear' ) ) );
	fx_check( 'none' === ( $tok['data-sgs-fx-ease'] ?? null ), 'linear is GSAP none' );
	$tok = Emitter::layer_attrs( array( 'effect' => 'horizontal-panel', 'values' => array( 'pinLength' => '150vh' ) ) );
	fx_check( '+=150%' === ( $tok['data-sgs-fx-end'] ?? null ), 'a pin length of 150vh is +=150%' );
	$tok = Emitter::layer_attrs( array( 'effect' => 'ambient-float', 'values' => array( 'travel' => '-token:distance.lg' ) ) );
	fx_check( '-18px' === ( $tok['data-sgs-fx-ambient-float-travel'] ?? null ), 'a negated distance token resolves to -18px: ' . json_encode( $tok ) );
	fx_check( array() === Emitter::layer_attrs( array( 'effect' => 'tilt' ) ) && array() === Emitter::layer_attrs( array( 'effect' => 'Bad"slug' ) ), 'an effect slug outside x-sgs-effects writes nothing' );
	$glare = Emitter::layer_attrs( array( 'effect' => 'glare', 'values' => array( 'glareColour' => 'accent' ) ) );
	fx_check( 'accent' === ( $glare['data-sgs-fx-glare-colour'] ?? null ), 'glare writes data-sgs-fx-glare-colour (no doubled name)' );

	// 11. Effect custom properties: per-device scoped rules, including a choice and an easing value.
	$float = array( 'id' => 'ambient-float', 'effect' => 'ambient-float', 'values' => array( 'travel' => 12, 'period' => 4000, 'direction' => 'alternate', 'easing' => 'ease-in-out' ), 'devices' => array( 'tablet' => array( 'travel' => 8 ), 'mobile' => array( 'period' => 'token:duration.slow' ) ) );
	fx_render( 'sgs/team-member', fx_doc( 'image', array( 'effects' => array( $float ) ) ), $card );
	$css = implode( '', $GLOBALS['sgs_collected_css'] );
	fx_check( 1 === preg_match( '/\.sgs-m-[0-9a-f]{10} \.sgs-team-member__photo\{--sgs-float-travel:12px;--sgs-float-period:4000ms;--sgs-float-direction:alternate;--sgs-float-easing:ease-in-out;\}/', $css ), 'desktop rule writes travel, period, direction (a choice) and easing: ' . $css );
	fx_check( 1 === preg_match( '/@media \(max-width:1023px\)\{\.sgs-m-[0-9a-f]{10} \.sgs-team-member__photo\{--sgs-float-travel:8px;\}\}/', $css ) && 1 === preg_match( '/@media \(max-width:767px\)\{[^}]*\{--sgs-float-period:var\(--wp--custom--duration--slow\);\}\}/', $css ), 'tablet and mobile overrides sit in their @media rules' );
	fx_render( 'sgs/team-member', fx_doc( 'root', array( 'effects' => array( array( 'id' => 'ken-burns', 'effect' => 'ken-burns', 'values' => array( 'zoomStart' => 104, 'zoomEnd' => 110 ) ) ) ) ), $card );
	fx_check( false === strpos( implode( '', $GLOBALS['sgs_collected_css'] ), '--sgs-kb-s' ), 'a property two fields share (ken-burns --sgs-kb-s, a state pair) is not written here' );

	// 12. Parallax: the effect token and its parameters (a flag as true), and its ratio and clamp as custom properties.
	$out = fx_render( 'sgs/team-member', fx_doc( 'image', array( 'effects' => array( array( 'id' => 'parallax', 'effect' => 'parallax', 'values' => array( 'speedRatio' => 0.2, 'clamp' => 40, 'background' => true ) ) ) ) ), $card );
	$img = fx_attrs( fx_tag( $out, 'sgs-team-member__photo' ) );
	$css = implode( '', $GLOBALS['sgs_collected_css'] );
	fx_check( array( 'data-sgs-fx' => 'parallax', 'data-sgs-fx-parallax-background' => 'true', 'data-sgs-fx-parallax-clamp' => '40px', 'data-sgs-fx-parallax-speed-ratio' => '0.2' ) === $img && false !== strpos( $css, '--sgs-fx-parallax-ratio:0.2;--sgs-fx-parallax-clamp:40px;' ), 'parallax writes its token, parameters and custom properties: ' . json_encode( $img ) . ' ' . $css );

	// 13. Follow pointer adds its token to the element that carries the hover state's transform channel.
	$out = fx_render( 'sgs/team-member', fx_doc( 'image', array( 'hover' => array( 'state' => array( 'values' => array( 'followPointer' => true, 'maxAngle' => 8 ) ) ) ) ), $card );
	$tag = fx_tag( $out, 'sgs-team-member__photo' );
	fx_check( 1 === preg_match( '/data-sgs-fx="follow-pointer"/', $tag ) && 1 === preg_match( '/data-sgs-mc="(?:[^"]* )?transform(?: [^"]*)?"/', $tag ), 'followPointer on adds follow-pointer beside data-sgs-mc transform: ' . $tag );

	// 14. Glare and scrub custom properties, per tier.
	fx_render( 'sgs/team-member', fx_doc( 'image', array( 'hover' => array( 'effects' => array( array( 'id' => 'glare', 'effect' => 'glare', 'values' => array( 'glareColour' => 'accent', 'glareOpacity' => 0.4, 'glareSize' => 60 ) ) ) ) ) ), $card );
	$css = implode( '', $GLOBALS['sgs_collected_css'] );
	fx_check( false !== strpos( $css, '--sgs-glare-colour:var(--wp--preset--color--accent, currentColor);--sgs-glare-opacity:0.4;--sgs-glare-size:60%;' ), 'glare writes its colour (resolved to the palette variable), opacity and size: ' . $css );
	fx_render( 'sgs/team-member', fx_doc( 'image', array( 'effects' => array( array( 'id' => 'scrub', 'effect' => 'scrub', 'values' => array( 'startElement' => 'top', 'startViewport' => 85, 'smoothing' => 800 ), 'devices' => array( 'mobile' => array( 'startViewport' => 95 ) ) ) ) ) ), $card );
	$css = implode( '', $GLOBALS['sgs_collected_css'] );
	fx_check( false !== strpos( $css, '--sgs-scrub-start:top 85%;--sgs-scrub-smoothing:800ms;' ) && 1 === preg_match( '/@media \(max-width:767px\)\{[^}]*\{--sgs-scrub-start:top 95%;\}\}/', $css ), 'scrub start as a whole position with the desktop edge, smoothing, and the mobile start in its @media: ' . $css );
	fx_render( 'sgs/container', fx_doc( 'root', array( 'effects' => array( array( 'id' => 'pin-scrub', 'effect' => 'pin-scrub', 'values' => array( 'pinLength' => '150vh', 'hold' => 0.2, 'startElement' => 'top', 'startViewport' => 0 ), 'devices' => array( 'tablet' => array( 'pinLength' => '200vh' ) ) ) ) ) ), '<div class="wp-block-sgs-container sgs-container"><div class="sgs-container__inner"></div></div>' );
	$css = implode( '', $GLOBALS['sgs_collected_css'] );
	$pin = Emitter::layer_attrs( array( 'effect' => 'pin-scrub', 'values' => array( 'hold' => 0.2, 'startElement' => 'top', 'startViewport' => 0 ) ) );
	fx_check( false !== strpos( $css, '--sgs-pin-scrub-end:+=150%;--sgs-pin-scrub-hold:0.2;--sgs-pin-scrub-start:top top;' ) && false !== strpos( $css, '{--sgs-pin-scrub-end:+=200%;}' ) && '0.2' === ( $pin['data-sgs-fx-hold'] ?? null ) && 'top top' === ( $pin['data-sgs-fx-start'] ?? null ), 'pin-scrub: pin length as +=N% per tier, hold as a number, start as a position: ' . $css . ' ' . json_encode( $pin ) );

	echo PHP_EOL . ( $GLOBALS['fx_count'] - $GLOBALS['fx_fail'] ) . ' of ' . $GLOBALS['fx_count'] . ' checks passed' . PHP_EOL;
	exit( $GLOBALS['fx_fail'] > 0 ? 1 : 0 );
}
