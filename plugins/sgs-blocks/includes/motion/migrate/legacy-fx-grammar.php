<?php
/**
 * The retired flat `fx` attribute grammar, kept for the migration mappers only.
 *
 * `Sgs_Motion_Map_Fx` maps a stored flat `fx` block to an effect layer after normalising it exactly as the retired render
 * layer did: the preset fill-in, the stale-parameter clearing and the attribute-to-`data-sgs-fx-*` map below. Nothing
 * here hooks `render_block`; no block renders through it. Names stay in the `SGS\Blocks` namespace so the mapper and its
 * test call them unchanged.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Block attribute name => rendered data-attribute suffix (Spec 38 §11.2).
 */
const FX_ATTR_MAP = array(
	'fx'                     => 'data-sgs-fx',
	'fxTrigger'              => 'data-sgs-fx-trigger',
	'fxStart'                => 'data-sgs-fx-start',
	'fxEnd'                  => 'data-sgs-fx-end',
	'fxHold'                 => 'data-sgs-fx-hold',
	'fxScrub'                => 'data-sgs-fx-scrub',
	'fxStagger'              => 'data-sgs-fx-stagger',
	'fxDuration'             => 'data-sgs-fx-duration',
	'fxEase'                 => 'data-sgs-fx-ease',
	'fxSplit'                => 'data-sgs-fx-split',
	'fxMask'                 => 'data-sgs-fx-mask',

	/*
	 * Motion-path route (Spec 38 §11.2, D427). These two are the AUTHORING
	 * surface; `includes/fx-path-routes.php` reads them back off the rendered
	 * markup at p22 and expands them into the hidden route <svg> plus the
	 * `data-sgs-fx-motion-path-target` selector the runtime resolves. That
	 * target attribute is render-layer OUTPUT and deliberately has no row here
	 * — nothing authors it.
	 *
	 * `fxPathRotate` maps to the runtime's own attribute name rather than a
	 * name derived from the block attribute, because `fx-motion-path.js` reads
	 * `data-sgs-fx-motion-path-rotate` and is untouched by this work.
	 *
	 * `fxPreset` is ABSENT on purpose: a preset writes its values into the
	 * params above, so emitting the label too would ship a data attribute no
	 * runtime reads.
	 */
	'fxPath'                 => 'data-sgs-fx-path',
	'fxPathAsset'            => 'data-sgs-fx-path-asset',
	'fxPathRotate'           => 'data-sgs-fx-motion-path-rotate',

	/*
	 * Resting position (Spec 38 §11.2, D441, 2026-08-01). Where the traveller
	 * settles once its scrub completes — a client-facing preset picker plus a
	 * 5vh-stepped fine-tune slider for `custom`. Both map to plain data
	 * attributes (not inline custom-property values) so `assets/css/
	 * fx-motion-path.css`'s declarative `calc()`/`max()` rules — not this
	 * file, not the runtime — resolve the actual target position. See that
	 * file's docblock for the full mechanism and why a runtime clamp was
	 * rejected in favour of it.
	 */
	'fxPathRest'             => 'data-sgs-fx-motion-path-rest',
	'fxPathRestVh'           => 'data-sgs-fx-motion-path-rest-vh',

	/*
	 * MorphSVG shape pair (Spec 38 §11.2, D427). These are the AUTHORING
	 * surface; `includes/fx-shape-routes.php` reads them back off the
	 * rendered markup at p22 and expands them into the visible FROM `<svg>` +
	 * hidden TO `<svg>` + `data-sgs-fx-morph-target` selector the runtime
	 * resolves. That target attribute is render-layer OUTPUT and
	 * deliberately has no row here, same as the motion-path target above —
	 * nothing authors it.
	 */
	'fxShape'                => 'data-sgs-fx-shape',

	/*
	 * Cursor field (FR-38-25). These three MUST be here, not just in the retired editor extension's
	 * save filter: that filter only bakes attributes into STATIC blocks'
	 * markup, and most qualifying hosts (`sgs/container`, `sgs/hero`,
	 * `sgs/trust-bar`) are DYNAMIC. Without these rows a
	 * client's chosen field type and colour never reach the rendered root, and
	 * `fx-cursor-field.php` silently falls back to the default `glow` with no
	 * colour override — an effect that looks configured and renders something
	 * else. Caught by a qc-council code-path trace before deploy.
	 */
	'fxFieldType'            => 'data-sgs-fx-field',
	'fxFieldColour'          => 'data-sgs-fx-field-colour',
	'fxFieldRadius'          => 'data-sgs-fx-field-radius',
	'fxFieldShape'           => 'data-sgs-fx-field-shape',
	'fxFieldBlend'           => 'data-sgs-fx-field-blend',
	'fxWaveBase'             => 'data-sgs-fx-wave-base',
	'fxWave1'                => 'data-sgs-fx-wave-1',
	'fxWave2'                => 'data-sgs-fx-wave-2',
	'fxWave3'                => 'data-sgs-fx-wave-3',
	'fxWaveVariant'          => 'data-sgs-fx-wave-variant',
	'fxWaveSpeed'            => 'data-sgs-fx-wave-speed',
	'fxWaveAmplitude'        => 'data-sgs-fx-wave-amplitude',
	'fxMagnetAxis'           => 'data-sgs-fx-magnet-axis',
	'fxMagnetRadius'         => 'data-sgs-fx-magnet-radius',
	'fxMagnetStrength'       => 'data-sgs-fx-magnet-strength',
	'fxFieldTrail'           => 'data-sgs-fx-field-trail',
	'fxShapeAssetFrom'       => 'data-sgs-fx-shape-asset-from',
	'fxShapeAssetTo'         => 'data-sgs-fx-shape-asset-to',

	/*
	 * Surface treatment (Tier W, Spec 38 §1.2b, D479). Same reasoning as the
	 * cursor-field rows above: most qualifying hosts are DYNAMIC blocks, so
	 * these MUST be injected here, not just baked in by the retired editor extension's save
	 * filter for static blocks — without this row a dynamic block's chosen
	 * treatment/colours never reach the rendered root and
	 * `includes/fx-surface-treatment.php` (which reads these back off the
	 * markup at p22) has nothing to act on.
	 */
	'fxTreatment'            => 'data-sgs-fx-treatment',
	'fxTreatmentIntensity'   => 'data-sgs-fx-treatment-intensity',
	'fxTreatmentShadow'      => 'data-sgs-fx-treatment-shadow',
	'fxTreatmentHighlight'   => 'data-sgs-fx-treatment-highlight',

	/*
	 * Per-treatment single colour (owner request: every treatment gets
	 * colour control, not only duotone). Same reasoning as the shadow/
	 * highlight rows immediately above — most qualifying hosts are DYNAMIC
	 * blocks, so these MUST be injected here too, not just baked in by
	 * the retired editor extension's save filter for static blocks.
	 */
	'fxTreatmentTint'        => 'data-sgs-fx-treatment-tint',
	'fxTreatmentInk'         => 'data-sgs-fx-treatment-ink',
	'fxTreatmentReveal'      => 'data-sgs-fx-treatment-reveal',

	/*
	 * Particle trail (FR-38-32). Same reasoning as cursor-field/magnet/
	 * wave-gradient above: most qualifying hosts (`sgs/container`,
	 * `sgs/hero`, `sgs/button`…) are DYNAMIC blocks, so
	 * these MUST be injected here, not just baked in by the retired editor extension's save
	 * filter for static blocks.
	 */
	'fxParticlePreset'       => 'data-sgs-fx-particle-preset',
	'fxParticleDensity'      => 'data-sgs-fx-particle-density',
	'fxParticleSize'         => 'data-sgs-fx-particle-size',
	'fxParticleColour'       => 'data-sgs-fx-particle-colour',
	// FR-38-33 grid-dot field. Same shape as the particle colour above.
	'fxGridDotColour'        => 'data-sgs-fx-grid-colour',
	'fxGridDotHoverColour'   => 'data-sgs-fx-grid-colour-hover',
	'fxGridDotShape'         => 'data-sgs-fx-grid-shape',
	// Geometry. These attribute names are the ones `fx-grid-dots.js`'s
	// readOptions() already reads and clamps; the engine's own DEFAULTS table
	// supplies any value a client leaves unset.
	'fxGridCell'             => 'data-sgs-fx-grid-cell',
	'fxGridDotSize'          => 'data-sgs-fx-grid-dot',
	'fxGridRadius'           => 'data-sgs-fx-grid-radius',
	'fxGridLean'             => 'data-sgs-fx-grid-lean',
	'fxGridEase'             => 'data-sgs-fx-grid-ease',

	/*
	 * Generative background (Spec 38, D874 technique spec — v1 static build
	 * only). Same reasoning as wave-gradient/surface-treatment above: most
	 * qualifying hosts (`sgs/container`, `sgs/hero`,
	 * `sgs/trust-bar`) are DYNAMIC blocks, so these MUST be injected here,
	 * not just baked in by the retired editor extension's save filter for static blocks — without
	 * this row a dynamic block's chosen colours/ground never reach the
	 * rendered root and `includes/fx-generative-background.php` (which reads
	 * these back off the markup at p22) has nothing to act on.
	 */
	'fxGenColour1'           => 'data-sgs-fx-gen-colour-1',
	'fxGenColour2'           => 'data-sgs-fx-gen-colour-2',
	'fxGenColour3'           => 'data-sgs-fx-gen-colour-3',
	'fxGenColour4'           => 'data-sgs-fx-gen-colour-4',
	'fxGenGround'            => 'data-sgs-fx-gen-ground',

	/*
	 * Colour-field backdrop mode (owner-requested, live canary testing, page
	 * 3371). '' / 'ground' is today's shipped behaviour — the layer-2
	 * colour-field canvas fades out once the WebGL layer starts drawing;
	 * 'field' keeps it visible behind the shape. Same reasoning as the row
	 * above — must be injected here for dynamic-block hosts.
	 */
	'fxGenBackdrop'          => 'data-sgs-fx-gen-backdrop',

	/*
	 * Generative background — geometry mechanism (v1.2 rewrite, 2026-08-28).
	 * Ten real params: overall speed + the nine tunables the vertex shader
	 * reads directly (3 rotation frequencies, 3 rotation powers, 2
	 * displacement frequencies, 1 displacement amount). Same reasoning as the
	 * colour/ground rows above — most qualifying hosts are DYNAMIC blocks, so
	 * these MUST be injected here for `sgs_fx_data_attr_string()`'s generic
	 * loop to pick them up, not just baked in by the retired editor extension's save filter.
	 */
	'fxGenSpeed'             => 'data-sgs-fx-gen-speed',
	'fxGenFoldFreq1'         => 'data-sgs-fx-gen-fold-freq-1',
	'fxGenFoldFreq2'         => 'data-sgs-fx-gen-fold-freq-2',
	'fxGenFoldFreq3'         => 'data-sgs-fx-gen-fold-freq-3',
	'fxGenFoldPower1'        => 'data-sgs-fx-gen-fold-power-1',
	'fxGenFoldPower2'        => 'data-sgs-fx-gen-fold-power-2',
	'fxGenFoldPower3'        => 'data-sgs-fx-gen-fold-power-3',
	'fxGenDisplaceFreqX'     => 'data-sgs-fx-gen-disp-freq-x',
	'fxGenDisplaceFreqZ'     => 'data-sgs-fx-gen-disp-freq-z',
	'fxGenDisplaceAmount'    => 'data-sgs-fx-gen-disp-amount',

	/*
	 * Generative background — striation / glow-gate + depth-fade params
	 * (§3, 2026-08-28 build). Same reasoning as the geometry row above —
	 * most qualifying hosts are DYNAMIC blocks, so these MUST be injected
	 * here for `sgs_fx_data_attr_string()`'s generic loop to pick them up.
	 */
	'fxGenGlowAmount'        => 'data-sgs-fx-gen-glow-amount',
	'fxGenGlowPower'         => 'data-sgs-fx-gen-glow-power',
	'fxGenGlowRamp'          => 'data-sgs-fx-gen-glow-ramp',
	'fxGenStriationStrength' => 'data-sgs-fx-gen-striation-strength',
	'fxGenStriationFreq'     => 'data-sgs-fx-gen-striation-freq',
	'fxGenColourAttenuation' => 'data-sgs-fx-gen-colour-attenuation',
	'fxGenParabolaPower'     => 'data-sgs-fx-gen-parabola-power',

	/*
	 * Generative background — rotation/scale/2D framing offset (sibling work
	 * in flight). Same reasoning as the geometry/striation rows above — these
	 * are currently hardcoded and are being made client-controllable; most
	 * qualifying hosts are DYNAMIC blocks, so these MUST be injected here for
	 * `sgs_fx_data_attr_string()`'s generic loop to pick them up.
	 */
	'fxGenRotateX'           => 'data-sgs-fx-gen-rotate-x',
	'fxGenRotateY'           => 'data-sgs-fx-gen-rotate-y',
	'fxGenRotateZ'           => 'data-sgs-fx-gen-rotate-z',
	'fxGenScaleX'            => 'data-sgs-fx-gen-scale-x',
	'fxGenScaleY'            => 'data-sgs-fx-gen-scale-y',
	'fxGenScaleZ'            => 'data-sgs-fx-gen-scale-z',
	'fxGenOffsetX'           => 'data-sgs-fx-gen-offset-x',
	'fxGenOffsetY'           => 'data-sgs-fx-gen-offset-y',
);

/**
 * The retired preset table: the governed effect to level to param values.
 *
 * Only the fields the fill-in needs are held: which params a level governs, and what value it sets. `null` means
 * "clear to the effect module's own default"; a null preset value is treated as "nothing to fill in" below, never
 * coerced to a literal `null` or empty string.
 *
 * @return array<string, array<string, array<string, mixed>>>
 */
function sgs_fx_presets(): array {
	return array(
		'scrub'            => array(
			'subtle'   => array(
				'fxStart' => 'top 85%',
				'fxEnd'   => 'top center',
				'fxScrub' => 0.3,
				'fxEase'  => 'power1.out',
			),
			'standard' => array(
				'fxStart' => 'top 70%',
				'fxEnd'   => 'top center',
				'fxScrub' => 0.8,
				'fxEase'  => null,
			),
			'dramatic' => array(
				'fxStart' => 'top bottom',
				'fxEnd'   => 'top top',
				'fxScrub' => 1.5,
				'fxEase'  => 'power3.out',
			),
		),
		'pin-scrub'        => array(
			'subtle'   => array(
				'fxStart' => null,
				'fxEnd'   => '+=50%',
				'fxHold'  => 'short',
				'fxScrub' => 0.3,
			),
			'standard' => array(
				'fxStart' => null,
				'fxEnd'   => '+=100%',
				'fxHold'  => null,
				'fxScrub' => 0.8,
			),
			'dramatic' => array(
				'fxStart' => null,
				'fxEnd'   => '+=200%',
				'fxHold'  => 'long',
				'fxScrub' => 1.5,
			),
		),
		/*
		 * The horizontal panel reads `fxEnd` as the pin length PER PANEL (the pin spans panels x length, plus any tail),
		 * `fxScrub` as its smoothing in seconds (0 is none, locked to the scrollbar) and `fxHold` as the share of the pin
		 * spent at rest after the travel. Standard is the reference Heritage track: 70vh per panel, linear, no smoothing,
		 * no hold.
		 */
		'horizontal-panel' => array(
			'subtle'   => array(
				'fxStart' => null,
				'fxEnd'   => '+=50%',
				'fxHold'  => null,
				'fxScrub' => 0,
			),
			'standard' => array(
				'fxStart' => null,
				'fxEnd'   => '+=70%',
				'fxHold'  => null,
				'fxScrub' => 0,
			),
			'dramatic' => array(
				'fxStart' => null,
				'fxEnd'   => '+=100%',
				'fxHold'  => 'short',
				'fxScrub' => 0.8,
			),
		),
		'split-reveal'     => array(
			'subtle'   => array(
				'fxStart'    => 'top 85%',
				'fxEnd'      => null,
				'fxDuration' => 0.5,
				'fxStagger'  => 0.02,
				'fxEase'     => 'power1.out',
				'fxSplit'    => 'words',
				'fxMask'     => null,
			),
			'standard' => array(
				'fxStart'    => 'top 70%',
				'fxEnd'      => null,
				'fxDuration' => 0.8,
				'fxStagger'  => 0.05,
				'fxEase'     => null,
				'fxSplit'    => 'words',
				'fxMask'     => null,
			),
			'dramatic' => array(
				'fxStart'    => 'top 85%',
				'fxEnd'      => null,
				'fxDuration' => 1.2,
				'fxStagger'  => 0.03,
				'fxEase'     => 'back.out',
				'fxSplit'    => 'chars',
				'fxMask'     => 'chars',
			),
		),
		'scramble'         => array(
			'subtle'   => array(
				'fxStart' => 'top 85%',
				'fxEnd'   => 'top center',
			),
			'standard' => array(
				'fxStart' => 'top 70%',
				'fxEnd'   => 'top center',
			),
			'dramatic' => array(
				'fxStart' => 'top center',
				'fxEnd'   => 'top top',
			),
		),
		'draw'             => array(
			'subtle'   => array(
				'fxStart' => 'top 85%',
				'fxEnd'   => 'top center',
			),
			'standard' => array(
				'fxStart' => 'top 70%',
				'fxEnd'   => 'top center',
			),
			'dramatic' => array(
				'fxStart' => 'top bottom',
				'fxEnd'   => 'top top',
			),
		),
		'motion-path'      => array(
			'subtle'   => array(
				'fxStart' => 'top 85%',
				'fxEnd'   => 'top center',
				'fxScrub' => 0.3,
			),
			'standard' => array(
				'fxStart' => 'top bottom',
				'fxEnd'   => 'bottom top',
				'fxScrub' => 0.8,
			),
			'dramatic' => array(
				'fxStart' => 'top bottom',
				'fxEnd'   => 'bottom top',
				'fxScrub' => 1.5,
			),
		),
	);
}

/**
 * Fill in a preset's governed params that were never actually written.
 *
 * Spec 38 §7 build task (D446 Task 10). The editor's own `applyPreset()`
 * handler in the retired editor extension stamps a level's WHOLE governed set into real
 * attributes the instant a client picks it, so ordinarily `fxPreset` is
 * only ever a truthful label for values already present in the stored
 * attributes. This function exists for every path that bypasses that
 * handler: `fxPreset` arriving via a direct `wp.data` dispatch, a pattern,
 * or a converter clone carries no governed params at all, because nothing
 * ever ran the code that writes them — measured live: setting `fxPreset`
 * via the data store wrote the label with zero motion parameters, so the
 * effect ran with none of the chosen intensity's settings.
 *
 * Only fills a key that is genuinely UNSET (`null` or `''`) — it never
 * overwrites a value already present, which is the same "hand-editing wins"
 * precedence the editor's own preset writer protects, applied in the
 * direction that matters here: there is no "Custom" label to fall back to
 * at render time, so filling gaps is always the safe direction, overwriting
 * a deliberate value never is.
 *
 * @param array  $attrs  Parsed block attributes.
 * @param string $effect Current `fx` value.
 * @return array Attributes with any missing preset-governed values filled in.
 */
function sgs_fx_apply_preset( array $attrs, string $effect ): array {
	$preset = $attrs['fxPreset'] ?? '';
	if ( ! \is_string( $preset ) || '' === $preset ) {
		return $attrs;
	}

	$values = sgs_fx_presets()[ $effect ][ $preset ] ?? null;
	if ( null === $values ) {
		// Not a governed effect/level pair — a stale fxPreset left over from a
		// different effect (sgs_fx_clear_stale_params handles that case for
		// fxPreset itself; nothing to fill in here).
		return $attrs;
	}

	foreach ( $values as $key => $value ) {
		$current = $attrs[ $key ] ?? null;
		$unset   = null === $current || '' === $current;
		if ( ! $unset ) {
			continue; // A real value is already present — never overwrite it.
		}
		if ( null === $value ) {
			continue; // The preset itself says "clear to module default".
		}
		$attrs[ $key ] = $value;
	}

	return $attrs;
}

/**
 * Attribute keys FX_ATTR_MAP carries that are meaningful only for SPECIFIC
 * effects, mirroring the same gates the retired editor extension's inspector panel already
 * applies (`isSplit` / `isPath` / `isMorph` / `fxPins()` /
 * `ownsScroll && !isSplit` in `withFxControls`). A key not listed against
 * any effect here is universal (`fx`, `fxPreset`, `fxTrigger`, `fxStart`,
 * `fxEnd`) and always survives an effect change.
 *
 * Duplicated here rather than shared because the retired editor extension's own gates are
 * hand-written effect-name checks, not DB-derived — the same shape of
 * duplication `FX_ATTR_MAP` above already documents as deliberate. Keep
 * both files in step when either changes.
 *
 * @return array<string, string[]> effect => extra attr keys it may carry.
 */
function sgs_fx_effect_param_scope(): array {
	return array(
		'scrub'                 => array( 'fxScrub', 'fxEase' ),
		'pin-scrub'             => array( 'fxHold', 'fxScrub' ),
		'horizontal-panel'      => array( 'fxHold', 'fxScrub' ),
		'split-reveal'          => array( 'fxDuration', 'fxStagger', 'fxEase', 'fxSplit', 'fxMask' ),
		'motion-path'           => array( 'fxPath', 'fxPathAsset', 'fxPathRotate', 'fxPathRest', 'fxPathRestVh', 'fxScrub' ),
		'morph'                 => array( 'fxShape', 'fxShapeAssetFrom', 'fxShapeAssetTo' ),

		/*
		 * FR-38-25. Found by LIVE verification, not by review: with the row
		 * absent, `data-sgs-cursor-field="glow"` reached the page correctly and
		 * the stylesheet and module were both enqueued — everything looked
		 * right — while the client's chosen colour and radius were silently
		 * scoped out here and never injected, so the per-instance override
		 * <style> was never emitted and every field rendered in the default
		 * accent at the default size.
		 *
		 * That is the THIRD hand-maintained list an effect must join to work
		 * (this one, `FX_ATTR_MAP` above, and the retired editor extension's `SHIPPED_EFFECTS`), and
		 * the second of the three to have been missed on this effect. None is
		 * cross-checked by a gate.
		 */
		'cursor-field'          => array( 'fxFieldType', 'fxFieldColour', 'fxFieldRadius', 'fxFieldShape', 'fxFieldTrail', 'fxFieldBlend' ),
		'magnet'                => array( 'fxMagnetAxis', 'fxMagnetRadius', 'fxMagnetStrength' ),

		/*
		 * FR-38-33 grid-dot field. This row was OMITTED at first ship because the
		 * effect had no params, and `check-fx-list-drift.py` correctly refuses an
		 * EMPTY row as a vacuous parse (it cannot tell empty-by-design from a
		 * failed parse). It is legitimate now that there is a real param to scope.
		 *
		 * ⛔ LOAD-BEARING, not bookkeeping — the same trap the cursor-field and
		 * surface-treatment comments above record: `sgs_fx_clear_stale_params()`
		 * NULLs every scoped key not in `$allowed`, so omitting this row now would
		 * wipe the client's chosen colour on EVERY render while the editor still
		 * showed it set.
		 */
		'grid-dots'             => array(
			'fxGridDotColour',
			'fxGridDotHoverColour',
			'fxGridDotShape',
			'fxGridCell',
			'fxGridDotSize',
			'fxGridRadius',
			'fxGridLean',
			'fxGridEase',
		),
		'wave-gradient'         => array( 'fxWaveVariant', 'fxWaveBase', 'fxWave1', 'fxWave2', 'fxWave3', 'fxWaveSpeed', 'fxWaveAmplitude' ),

		/*
		 * Surface treatment (Tier W, Spec 38 §1.2b, D479). THIS ROW IS
		 * LOAD-BEARING, NOT BOOKKEEPING — the exact `cursor-field` trap
		 * documented immediately above, repeated for a different effect:
		 * `sgs_fx_clear_stale_params()` below does `$allowed = $scope[
		 * $effect ] ?? array()` and then NULLS every scoped key not in
		 * `$allowed`. Omitting this row would make `fxTreatment` — a key
		 * scoped to no effect at all — read as belonging to a DIFFERENT
		 * effect, so it gets wiped on every single render regardless of
		 * which effect is selected. The client's chosen treatment would
		 * silently vanish at render time with no error anywhere: the panel
		 * would still show it selected in the editor (that side reads the
		 * stored attribute, not this scope), but the live page would never
		 * receive `data-sgs-fx-treatment`, `-shadow`, `-highlight` or
		 * `-intensity` — a feature that looks configured and renders
		 * nothing.
		 */
		'surface-treatment'     => array(
			'fxTreatment',
			'fxTreatmentIntensity',
			'fxTreatmentShadow',
			'fxTreatmentHighlight',
			'fxTreatmentTint',
			'fxTreatmentInk',
			'fxTreatmentReveal',
		),

		/*
		 * Particle trail (FR-38-32). LOAD-BEARING, not bookkeeping — the
		 * same `cursor-field`/`surface-treatment` trap documented above,
		 * repeated for a third effect: `sgs_fx_clear_stale_params()` below
		 * nulls every scoped key not in this effect's own allowlist, so
		 * omitting this row would wipe the client's chosen preset/density/
		 * size on every render regardless of which effect is selected.
		 */
		'particles'             => array( 'fxParticlePreset', 'fxParticleDensity', 'fxParticleSize', 'fxParticleColour' ),

		/*
		 * Generative background (Spec 38, D874 technique spec — v1 static
		 * build only). LOAD-BEARING, not bookkeeping — the same
		 * cursor-field/surface-treatment/particles trap documented above,
		 * repeated for this effect: `sgs_fx_clear_stale_params()` below nulls
		 * every scoped key not in this effect's own allowlist, so omitting
		 * this row would wipe the client's chosen colours/ground on every
		 * render regardless of which effect is selected.
		 */
		'generative-background' => array(
			'fxGenColour1',
			'fxGenColour2',
			'fxGenColour3',
			'fxGenColour4',
			'fxGenGround',
			// 2026-09-07: was MISSING, and check-fx-list-drift's I4 caught it.
			// An FX_ATTR_MAP key no effect claims is stripped by
			// sgs_fx_clear_stale_params() below, so the client's chosen backdrop
			// was silently dropped on the way to the page -- the same trap this
			// row's own docblock describes for colours/ground. Pairs with
			// fxGenGround (the retired editor extension defaulted it to 'ground').
			'fxGenBackdrop',
			'fxGenSpeed',
			'fxGenFoldFreq1',
			'fxGenFoldFreq2',
			'fxGenFoldFreq3',
			'fxGenFoldPower1',
			'fxGenFoldPower2',
			'fxGenFoldPower3',
			'fxGenDisplaceFreqX',
			'fxGenDisplaceFreqZ',
			'fxGenDisplaceAmount',
			'fxGenGlowAmount',
			'fxGenGlowPower',
			'fxGenGlowRamp',
			'fxGenStriationStrength',
			'fxGenStriationFreq',
			'fxGenColourAttenuation',
			'fxGenParabolaPower',
			'fxGenRotateX',
			'fxGenRotateY',
			'fxGenRotateZ',
			'fxGenScaleX',
			'fxGenScaleY',
			'fxGenScaleZ',
			'fxGenOffsetX',
			'fxGenOffsetY',
		),
	);
}

/**
 * Drop fx param values left behind from a PREVIOUS effect.
 *
 * Spec 38 §7 build task (D446 Task 10). The retired editor extension's own `changeEffect()`
 * clears these in the editor the moment a client switches effects; this is
 * the render-time equivalent for attributes that reached the page any other
 * way. Measured live: `fxSplit: "chars"` (a split-reveal-only param)
 * survived a switch to `scrub` because nothing outside the editor's own
 * click handler ever cleared it, and the stale value sat in stored
 * attributes with no control showing it and no way to tell it apart from a
 * genuine (if meaningless) setting.
 *
 * @param array  $attrs  Parsed block attributes.
 * @param string $effect Current `fx` value.
 * @return array Attributes with off-effect params blanked (set to null).
 */
function sgs_fx_clear_stale_params( array $attrs, string $effect ): array {
	$scope   = sgs_fx_effect_param_scope();
	$allowed = $scope[ $effect ] ?? array();

	// The union of every effect's scoped params — a key that belongs to no
	// effect at all is cleared unconditionally, same as one that belongs to
	// a DIFFERENT effect than the current one.
	$all_scoped = array();
	foreach ( $scope as $keys ) {
		$all_scoped = \array_merge( $all_scoped, $keys );
	}
	$all_scoped = \array_unique( $all_scoped );

	foreach ( $all_scoped as $key ) {
		if ( \in_array( $key, $allowed, true ) ) {
			continue;
		}
		if ( isset( $attrs[ $key ] ) && '' !== $attrs[ $key ] && null !== $attrs[ $key ] ) {
			$attrs[ $key ] = null; // Absent, per the same rule the injector already uses.
		}
	}

	return $attrs;
}

/**
 * Normalise fx attributes at the point of use — Spec 38 §7 build task
 * (D446 Task 10, the dependency for Tasks 15/19).
 *
 * Runs BOTH normalisations ($this file's `sgs_fx_apply_preset()` then
 * `sgs_fx_clear_stale_params()`) against whatever `$block['attrs']` the
 * parser handed this render, regardless of how that content reached the
 * page — a normal editor save, a pattern insertion, a converter clone, or a
 * direct `wp.data` write all arrive here as the same parsed attributes, so
 * normalising HERE (render time) rather than in an editor click handler
 * covers every origin, not just the one the editor's own UI produces.
 *
 * Deliberately does NOT write anything back to the database or to
 * `post_content` — it only affects what gets emitted into THIS request's
 * rendered markup. That is what keeps it out of `/sgs-update`'s way: the
 * attribute extraction pipeline reads block.json + stored post content, and
 * this function touches neither.
 *
 * @param array  $attrs  Parsed block attributes.
 * @param string $effect Current `fx` value.
 * @return array Normalised attributes.
 */
function sgs_fx_normalise( array $attrs, string $effect ): array {
	$attrs = sgs_fx_apply_preset( $attrs, $effect );
	$attrs = sgs_fx_clear_stale_params( $attrs, $effect );
	return $attrs;
}

/**
 * Build the `data-sgs-fx*` attribute string for a block's attributes, as the retired render layer wrote it.
 *
 * Sharing FX_ATTR_MAP is the point: the mapper's expectation and the grammar it maps stay one list.
 *
 * A colour slug (`primary`) is printed bare, exactly as old content stored it: this reproduces the retired output, and the mapper's `Sgs_Motion_Fx_Emitter::palette_colour` resolving the slug to a palette value is the deliberate change.
 *
 * @param array $attrs Parsed block attributes.
 * @return string Leading-space-prefixed attribute string, or '' when no effect
 *                is set. Every value is passed through `esc_attr()`.
 */
function sgs_fx_data_attr_string( array $attrs ): string {
	$fx = $attrs['fx'] ?? '';
	if ( ! \is_string( $fx ) || '' === $fx ) {
		return '';
	}

	// Normalise BEFORE building the string: the preset fill-in and the stale-param clearing.
	$attrs = sgs_fx_normalise( $attrs, $fx );

	$out = '';
	foreach ( FX_ATTR_MAP as $attr => $data_attr ) {
		if ( ! isset( $attrs[ $attr ] ) ) {
			continue;
		}
		$value = $attrs[ $attr ];

		// Skip only genuinely ABSENT values, so
		// a legitimate numeric zero (`fxScrub => 0` means "no smoothing lag")
		// survives instead of being replaced by the module's default.
		if ( '' === $value || null === $value ) {
			continue;
		}

		$out .= ' ' . $data_attr . '="' . \esc_attr( (string) $value ) . '"';
	}

	// D446 Task 15 — per-breakpoint disable (§ own docblock on FX_ATTR_MAP's
	// sibling function below has the full rationale). Booleans, not part of
	// FX_ATTR_MAP's generic value-or-absent loop above because `false` is not
	// `''`/`null` and would otherwise emit an empty-but-present attribute.
	if ( true === ( $attrs['fxDisableTablet'] ?? false ) ) {
		$out .= ' data-sgs-fx-disable-tablet="1"';
	}
	if ( true === ( $attrs['fxDisableMobile'] ?? false ) ) {
		$out .= ' data-sgs-fx-disable-mobile="1"';
	}

	return $out;
}

