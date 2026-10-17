<?php
/**
 * Standalone runner for the `fx` migration mapper (Spec 38A FR-38A-22, FR-38A-31, M5.1).
 *
 * Runs the real `Sgs_Motion_Map_Fx` over flat attribute sets and emits its layers through the real
 * `Sgs_Motion_Fx_Emitter`, comparing that with what the flat attributes rendered
 * (`includes/fx-attributes.php::sgs_fx_data_attr_string`). Every mapped document must pass the shipped schema
 * unchanged. A difference is allowed only where the runtime reads both forms the same; each such equivalence is
 * listed in `fx_runtime_same()` with the runtime line that makes it so.
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-fx-mapper-standalone.php
 *
 * Planted fault: SGS_FX_PLANT=drop-start removes the `startViewport` field from the decoded scrub schema; the scrub
 * presets then cannot be expressed, so the preset sweep turns red (the sweep can see a mapper that loses a value).
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

	require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-motion-registry.php';
	require_once __DIR__ . '/stubs/motion-render-stubs.php';
	require_once dirname( __DIR__, 2 ) . '/includes/fx-attributes.php';

	use SGS\Blocks\Motion\Sgs_Motion_Document as Document;
	use SGS\Blocks\Motion\Sgs_Motion_Fx_Emitter as Emitter;
	use SGS\Blocks\Motion\Sgs_Motion_Map_Fx as Mapper;

	$GLOBALS['fx_fail']  = 0;
	$GLOBALS['fx_count'] = 0;

	function fx_check( bool $ok, string $label ): void {
		++$GLOBALS['fx_count'];
		$GLOBALS['fx_fail'] += $ok ? 0 : 1;
		echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . PHP_EOL;
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

	/**
	 * Both sides in the form the runtime reads, so only a real behaviour difference remains.
	 * - motion-path rotate: `fx-motion-path.js` turns rotation off only for the text `false`; '' and `true` are on.
	 * - treatment reveal: `fx-surface-treatment.js` runs the reveal unless the value is `off`; absent is on.
	 * - field shape: `fx-cursor-field.css` paints a circle when the shape is absent; `circle` names that default.
	 * - mask: `fx-split-reveal.js` masks only when the value equals the split unit (default `words`).
	 * - magnet max-pull-y: no shipped runtime reads it (`fx-magnet.js` reads one strength for both axes).
	 * - hold: `fx-pin-scrub.js::resolveHoldFraction` reads a named step and its fraction alike.
	 */
	function fx_runtime_same( array $attrs ): array {
		if ( isset( $attrs['data-sgs-fx-motion-path-rotate'] ) && 'false' !== $attrs['data-sgs-fx-motion-path-rotate'] ) {
			$attrs['data-sgs-fx-motion-path-rotate'] = 'true';
		}
		if ( isset( $attrs['data-sgs-fx-treatment-reveal'] ) && 'off' !== $attrs['data-sgs-fx-treatment-reveal'] ) {
			unset( $attrs['data-sgs-fx-treatment-reveal'] );
		}
		if ( 'circle' === ( $attrs['data-sgs-fx-field-shape'] ?? null ) ) {
			unset( $attrs['data-sgs-fx-field-shape'] );
		}
		if ( isset( $attrs['data-sgs-fx-mask'] ) && $attrs['data-sgs-fx-mask'] !== ( $attrs['data-sgs-fx-split'] ?? 'words' ) ) {
			unset( $attrs['data-sgs-fx-mask'] );
		}
		unset( $attrs['data-sgs-fx-magnet-max-pull-y'] );
		if ( isset( $attrs['data-sgs-fx-hold'], \SGS\Blocks\Motion\Sgs_Motion_Legacy_Fx_Value::LEGACY_HOLD[ $attrs['data-sgs-fx-hold'] ] ) ) {
			$attrs['data-sgs-fx-hold'] = \SGS\Blocks\Motion\Sgs_Motion_Field_Css::number( \SGS\Blocks\Motion\Sgs_Motion_Legacy_Fx_Value::LEGACY_HOLD[ $attrs['data-sgs-fx-hold'] ] );
		}
		ksort( $attrs );
		return $attrs;
	}

	/**
	 * Map one flat set and compare. Returns `same`, `flat` (not migrated, with reported rows) or a difference.
	 */
	function fx_compare( string $block, array $attrs ): array {
		$mapper = new Mapper();
		$result = $mapper->map( $block, $attrs );
		$flat   = isset( $attrs['fx'] ) ? $attrs : array( 'fx' => $attrs['fxEffect'] ?? '' ) + $attrs;
		$legacy = fx_runtime_same( fx_attrs( \SGS\Blocks\sgs_fx_data_attr_string( $flat ) ) );
		$out    = array();
		foreach ( $result['motion']['elements'] ?? array() as $target => $element ) {
			$out = Emitter::merge( $out, Emitter::attrs( $element ) );
		}
		$out     = fx_runtime_same( $out );
		$schema  = array() === $result['motion'] || $result['motion'] === Document::sanitise( $result['motion'] );
		$failed  = array_filter( $result['reported'], static fn( $r ) => empty( $r['consumed'] ) );
		$verdict = array() !== $failed ? 'flat' : ( $legacy === $out ? 'same' : 'diff' );
		return array(
			'verdict' => $verdict,
			'schema'  => $schema,
			'legacy'  => $legacy,
			'layer'   => $out,
			'result'  => $result,
		);
	}

	$plant = (string) getenv( 'SGS_FX_PLANT' );
	if ( 'drop-start' === $plant ) {
		$schema = \SGS\Blocks\Motion\Sgs_Motion_Field_Types::schema();
		unset( $schema['$defs']['ScrubValues']['properties']['startViewport'] );
		( new \ReflectionProperty( \SGS\Blocks\Motion\Sgs_Motion_Field_Types::class, 'schema' ) )->setValue( null, $schema );
	}

	// 1. Parity sweep: every effect in the render layer's parameter scope and every preset effect, bare and at each
	// intensity. Each must migrate (no value lost) and emit what the flat attributes rendered.
	$effects = array_unique( array_merge( array_keys( \SGS\Blocks\sgs_fx_effect_param_scope() ), array_keys( \SGS\Blocks\sgs_fx_presets() ) ) );
	$bad     = array();
	$cases   = 0;
	foreach ( $effects as $effect ) {
		foreach ( array( '', 'subtle', 'standard', 'dramatic' ) as $level ) {
			if ( '' !== $level && ! isset( \SGS\Blocks\sgs_fx_presets()[ $effect ][ $level ] ) ) {
				continue;
			}
			++$cases;
			$attrs = array( 'fx' => $effect ) + ( '' === $level ? array() : array( 'fxPreset' => $level ) );
			$c     = fx_compare( 'draw' === $effect ? 'sgs/heading' : 'sgs/hero', $attrs );
			if ( 'same' !== $c['verdict'] || ! $c['schema'] ) {
				$bad[] = $effect . '/' . ( '' === $level ? 'bare' : $level ) . ' ' . $c['verdict'] . ' legacy ' . json_encode( $c['legacy'] ) . ' layer ' . json_encode( $c['layer'] ) . ' reported ' . json_encode( $c['result']['reported'] );
			}
		}
	}
	fx_check( $cases > 30 && array() === $bad, "preset sweep: $cases effect and intensity pairs migrate and emit what they rendered" . ( array() === $bad ? '' : ': ' . implode( ' | ', $bad ) ) );

	// 2. The reviewer's flat sets: each migrates and emits the same, or stays flat with a reported row per lost value.
	$sets = array(
		'pin-scrub preset' => array( 'sgs/container', array( 'fx' => 'pin-scrub', 'fxPreset' => 'dramatic' ), 'same' ),
		'pin-scrub end' => array( 'sgs/container', array( 'fx' => 'pin-scrub', 'fxEnd' => '+=150%', 'fxScrub' => 1 ), 'same' ),
		'hpanel preset' => array( 'sgs/container', array( 'fx' => 'horizontal-panel', 'fxPreset' => 'subtle' ), 'same' ),
		'split preset' => array( 'sgs/heading', array( 'fx' => 'split-reveal', 'fxPreset' => 'standard' ), 'same' ),
		'split dramatic' => array( 'sgs/heading', array( 'fx' => 'split-reveal', 'fxPreset' => 'dramatic' ), 'same' ),
		'scramble preset' => array( 'sgs/heading', array( 'fx' => 'scramble', 'fxPreset' => 'subtle' ), 'same' ),
		'draw preset' => array( 'sgs/heading', array( 'fx' => 'draw', 'fxPreset' => 'standard' ), 'same' ),
		'mpath preset' => array( 'sgs/container', array( 'fx' => 'motion-path', 'fxPreset' => 'standard', 'fxPath' => 'arc', 'fxPathRotate' => false ), 'same' ),
		'mpath rotate str' => array( 'sgs/container', array( 'fx' => 'motion-path', 'fxPath' => 'arc', 'fxPathRotate' => 'false' ), 'same' ),
		'scrub ease bounce' => array( 'sgs/hero', array( 'fx' => 'scrub', 'fxEase' => 'bounce.out' ), 'same' ),
		'scrub ease std preset' => array( 'sgs/hero', array( 'fx' => 'scrub', 'fxPreset' => 'standard' ), 'same' ),
		'scrub ease unknown' => array( 'sgs/hero', array( 'fx' => 'scrub', 'fxEase' => 'expo.out', 'fxScrub' => 'true' ), 'flat' ),
		'scrub scrub true' => array( 'sgs/hero', array( 'fx' => 'scrub', 'fxScrub' => true ), 'same' ),
		'scrub string scrub' => array( 'sgs/hero', array( 'fx' => 'scrub', 'fxScrub' => '0.5' ), 'same' ),
		'grid' => array( 'sgs/container', array( 'fx' => 'grid-dots', 'fxGridCell' => 24, 'fxGridDotSize' => 2, 'fxGridRadius' => 120, 'fxGridLean' => 8, 'fxGridEase' => 240, 'fxGridDotShape' => 'circle' ), 'same' ),
		'grid str' => array( 'sgs/container', array( 'fx' => 'grid-dots', 'fxGridCell' => '24', 'fxGridEase' => '0.24' ), 'flat' ),
		'treat' => array( 'sgs/container', array( 'fx' => 'surface-treatment', 'fxTreatment' => 'grain', 'fxTreatmentIntensity' => 0.4, 'fxTreatmentReveal' => 'off' ), 'same' ),
		'treat reveal on' => array( 'sgs/container', array( 'fx' => 'surface-treatment', 'fxTreatment' => 'duotone', 'fxTreatmentReveal' => 'on' ), 'same' ),
		'wave' => array( 'sgs/container', array( 'fx' => 'wave-gradient', 'fxWaveVariant' => 'pastel', 'fxWaveSpeed' => 40, 'fxWaveAmplitude' => 30, 'fxWaveBase' => 'primary' ), 'same' ),
		'particles' => array( 'sgs/container', array( 'fx' => 'particles', 'fxParticlePreset' => 'sparks', 'fxParticleDensity' => 1.5, 'fxParticleColour' => 'accent' ), 'same' ),
		'gen' => array( 'sgs/container', array( 'fx' => 'generative-background', 'fxGenRotateX' => 30, 'fxGenOffsetX' => -100, 'fxGenScaleX' => 1.2, 'fxGenSpeed' => 50, 'fxGenGround' => 'dark' ), 'same' ),
		'magnet' => array( 'sgs/button', array( 'fx' => 'magnet', 'fxMagnetStrength' => 20, 'fxMagnetRadius' => 120 ), 'same' ),
		'cursor circle' => array( 'sgs/hero', array( 'fx' => 'cursor-field', 'fxFieldType' => 'glow', 'fxFieldShape' => 'circle', 'fxFieldTrail' => 40 ), 'same' ),
		'morph' => array( 'sgs/container', array( 'fx' => 'morph', 'fxShape' => 'plus-cross' ), 'same' ),
		'draggable' => array( 'sgs/container', array( 'fx' => 'draggable' ), 'same' ),
		'trigger load scrub' => array( 'sgs/hero', array( 'fx' => 'scrub', 'fxTrigger' => 'load' ), 'same' ),
		'split mask chars no split' => array( 'sgs/heading', array( 'fx' => 'split-reveal', 'fxMask' => 'chars' ), 'same' ),
		'split mask words' => array( 'sgs/heading', array( 'fx' => 'split-reveal', 'fxMask' => 'words', 'fxSplit' => 'words' ), 'same' ),
		'mega fxEffect off-list' => array( 'sgs/mega-panel', array( 'fxEffect' => 'split-reveal', 'fxStagger' => 0.04 ), 'flat' ),
	);
	$wrong = array();
	foreach ( $sets as $label => $set ) {
		$c = fx_compare( $set[0], $set[1] );
		if ( $set[2] !== $c['verdict'] || ! $c['schema'] ) {
			$wrong[] = $label . ' expected ' . $set[2] . ' got ' . $c['verdict'] . ' legacy ' . json_encode( $c['legacy'] ) . ' layer ' . json_encode( $c['layer'] ) . ' reported ' . json_encode( $c['result']['reported'] );
		}
	}
	fx_check( array() === $wrong, count( $sets ) . ' flat sets: each emits what it rendered, or stays flat with its lost values reported' . ( array() === $wrong ? '' : ': ' . implode( ' | ', $wrong ) ) );

	$m = new Mapper();
	fx_check( 'fx' === $m->family() && in_array( 'fx', \SGS\Blocks\Motion\Sgs_Motion_Migrate_Runner::loadable_families(), true ), 'the runner loads the fx mapper from the mappers folder' );

	// 3. A migrated fxDisableMobile still disables on mobile; the preset's values are in the layer.
	$r     = $m->map( 'sgs/hero', array( 'fx' => 'scrub', 'fxPreset' => 'dramatic', 'fxStart' => 'top 70%', 'fxDisableMobile' => true ) );
	$layer = $r['motion']['elements']['root']['effects'][0] ?? array();
	$vals  = $layer['values'] ?? array();
	ksort( $vals );
	fx_check( 'bold' === ( $layer['intensity'] ?? '' ) && array( 'mobile' ) === ( $layer['off'] ?? null ) && array( 'easing' => 'cubic-bezier(0.165, 0.84, 0.44, 1)', 'endElement' => 'top', 'endViewport' => 0, 'smoothing' => 1500, 'startElement' => 'top', 'startViewport' => 70 ) === $vals, 'roster scrub: dramatic is bold, the preset values are in the layer, fxDisableMobile is off mobile: ' . json_encode( $layer ) );
	fx_check( 'scrub' === ( Emitter::layer_attrs( $layer )['data-sgs-fx-off-mobile'] ?? null ) && in_array( 'fxDisableMobile', $r['consumed'], true ), 'the migrated layer switches its scrub off on mobile: data-sgs-fx-off-mobile="scrub"' );

	// 4. All or nothing: a value the layer cannot hold leaves the whole effect flat, reported.
	$r = $m->map( 'sgs/hero', array( 'fx' => 'scrub', 'fxStart' => 'top top+=93', 'fxScrub' => 1 ) );
	fx_check( array() === $r['motion'] && array() === $r['consumed'] && array( 'fxStart' ) === array_column( $r['reported'], 'attr' ), 'an offset start leaves scrub flat, nothing consumed, fxStart reported: ' . json_encode( $r['reported'] ) );

	// 5. Placement: split-reveal on scroll in entrance.text, scramble on hover in effects, magnet in hover.effects,
	// draw on the container's svg-bg part, image-sequence on its canvas.
	$r = $m->map( 'sgs/heading', array( 'fx' => 'split-reveal', 'fxTrigger' => 'scroll', 'fxSplit' => 'lines' ) );
	fx_check( 'scroll' === ( $r['motion']['elements']['root']['entrance']['text'][0]['trigger'] ?? '' ), 'split-reveal on scroll maps into entrance.text' );
	$r = $m->map( 'sgs/heading', array( 'fx' => 'scramble', 'fxTrigger' => 'hover' ) );
	fx_check( 'hover' === ( $r['motion']['elements']['root']['effects'][0]['trigger'] ?? '' ), 'scramble on hover maps into effects' );
	$r = $m->map( 'sgs/button', array( 'fx' => 'magnet', 'fxMagnetStrength' => 12 ) );
	fx_check( array( 'maxPullX' => 12, 'maxPullY' => 12 ) === ( $r['motion']['elements']['root']['hover']['effects'][0]['values'] ?? null ), 'magnet maps into hover.effects, its strength on both axes' );
	$r = $m->map( 'sgs/container', array( 'fx' => 'draw', 'fxPreset' => 'subtle' ) );
	fx_check( isset( $r['motion']['elements']['svg-bg']['entrance']['text'][0] ) && ! isset( $r['motion']['elements']['root'] ), 'container draw maps onto the svg-bg part: ' . json_encode( array_keys( $r['motion']['elements'] ?? array() ) ) );
	$r = $m->map( 'sgs/heading', array( 'fx' => 'draw' ) );
	fx_check( isset( $r['motion']['elements']['root'] ), 'draw on a block with no svg-bg part stays on the root' );
	$r = $m->map( 'sgs/image-sequence', array( 'fxStart' => 'top 80%', 'fxPin' => true ) );
	fx_check( array( 'startElement' => 'top', 'startViewport' => 80, 'pin' => true ) === ( $r['motion']['elements']['canvas']['effects'][0]['values'] ?? null ), 'image-sequence maps onto its canvas part' );

	// 6. The block-private selector: only blocks that declare it, only effects their render accepts.
	fx_check( ! $m->handles( 'sgs/hero', array( 'fxEffect' => 'particles' ) ), 'fxEffect is read only on a block that declares it' );
	$r = $m->map( 'sgs/mega-panel', array( 'fxEffect' => 'split-reveal' ) );
	fx_check( array() === $r['motion'] && array( 'fxEffect' ) === array_column( $r['reported'], 'attr' ), 'an fxEffect off the block\'s allow-list is reported, not mapped' );

	// 7. A parameter the render cleared for this effect is removed and reported as inert.
	$r = $m->map( 'sgs/hero', array( 'fx' => 'scrub', 'fxSplit' => 'words' ) );
	fx_check( in_array( 'fxSplit', $r['consumed'], true ) && 'fxSplit' === ( $r['reported'][0]['attr'] ?? '' ) && true === ( $r['reported'][0]['consumed'] ?? null ), 'a stale fxSplit on a scrub block is consumed and reported inert' );

	echo PHP_EOL . ( $GLOBALS['fx_count'] - $GLOBALS['fx_fail'] ) . ' of ' . $GLOBALS['fx_count'] . ' checks passed' . PHP_EOL;
	exit( $GLOBALS['fx_fail'] > 0 ? 1 : 0 );
}
