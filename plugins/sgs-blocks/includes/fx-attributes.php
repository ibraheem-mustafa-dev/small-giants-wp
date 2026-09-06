<?php
/**
 * Tier G fx attributes — server-side data-attribute injection.
 *
 * Spec 38 FR-38-4 / §11.2. The mirror of `animation-attributes.php` for the
 * motion system: it emits `data-sgs-fx*` onto DYNAMIC blocks' rendered HTML.
 *
 * Two paths exist because block attributes reach the frontend two ways, and
 * covering only one produces an effect that works on some blocks and silently
 * not on others:
 *
 *   · STATIC blocks  — `src/blocks/extensions/fx.js` writes the attributes at
 *                      save time via `blocks.getSaveContent.extraProps`, so
 *                      they are already baked into stored `post_content`.
 *   · DYNAMIC blocks — `save()` returns null, so nothing is stored. THIS FILE
 *                      injects them at render time.
 *
 * Runs at `render_block` priority 10 — BEFORE `SGS_Motion_Registry`'s sniff at
 * priority 99. That ordering is load-bearing: the registry decides whether to
 * enqueue any GSAP by looking for `data-sgs-fx` in the rendered markup, so the
 * attribute has to be present by the time it looks. Injecting at a priority
 * after 99 would leave every dynamic block's effect silently unloaded.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Block attribute name => rendered data-attribute suffix (Spec 38 §11.2).
 */
const FX_ATTR_MAP = array(
	'fx'                   => 'data-sgs-fx',
	'fxTrigger'            => 'data-sgs-fx-trigger',
	'fxStart'              => 'data-sgs-fx-start',
	'fxEnd'                => 'data-sgs-fx-end',
	'fxHold'               => 'data-sgs-fx-hold',
	'fxScrub'              => 'data-sgs-fx-scrub',
	'fxStagger'            => 'data-sgs-fx-stagger',
	'fxDuration'           => 'data-sgs-fx-duration',
	'fxEase'               => 'data-sgs-fx-ease',
	'fxSplit'              => 'data-sgs-fx-split',
	'fxMask'               => 'data-sgs-fx-mask',

	/*
	 * Motion-path route (Spec 38 §11.2, D427). These two are the AUTHORING
	 * surface; `includes/fx-path-routes.php` reads them back off the rendered
	 * markup at p11 and expands them into the hidden route <svg> plus the
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
	'fxPath'               => 'data-sgs-fx-path',
	'fxPathAsset'          => 'data-sgs-fx-path-asset',
	'fxPathRotate'         => 'data-sgs-fx-motion-path-rotate',

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
	'fxPathRest'           => 'data-sgs-fx-motion-path-rest',
	'fxPathRestVh'         => 'data-sgs-fx-motion-path-rest-vh',

	/*
	 * MorphSVG shape pair (Spec 38 §11.2, D427). These are the AUTHORING
	 * surface; `includes/fx-shape-routes.php` reads them back off the
	 * rendered markup at p11 and expands them into the visible FROM `<svg>` +
	 * hidden TO `<svg>` + `data-sgs-fx-morph-target` selector the runtime
	 * resolves. That target attribute is render-layer OUTPUT and
	 * deliberately has no row here, same as the motion-path target above —
	 * nothing authors it.
	 */
	'fxShape'              => 'data-sgs-fx-shape',

	/*
	 * Cursor field (FR-38-25). These three MUST be here, not just in `fx.js`'s
	 * save filter: that filter only bakes attributes into STATIC blocks'
	 * markup, and most qualifying hosts (`sgs/container`, `sgs/hero`,
	 * `sgs/cta-section`, `sgs/trust-bar`) are DYNAMIC. Without these rows a
	 * client's chosen field type and colour never reach the rendered root, and
	 * `fx-cursor-field.php` silently falls back to the default `glow` with no
	 * colour override — an effect that looks configured and renders something
	 * else. Caught by a qc-council code-path trace before deploy.
	 */
	'fxFieldType'          => 'data-sgs-fx-field',
	'fxFieldColour'        => 'data-sgs-fx-field-colour',
	'fxFieldRadius'        => 'data-sgs-fx-field-radius',
	'fxFieldShape'         => 'data-sgs-fx-field-shape',
	'fxFieldBlend'         => 'data-sgs-fx-field-blend',
	'fxWaveBase'           => 'data-sgs-fx-wave-base',
	'fxWave1'              => 'data-sgs-fx-wave-1',
	'fxWave2'              => 'data-sgs-fx-wave-2',
	'fxWave3'              => 'data-sgs-fx-wave-3',
	'fxWaveVariant'        => 'data-sgs-fx-wave-variant',
	'fxWaveSpeed'          => 'data-sgs-fx-wave-speed',
	'fxWaveAmplitude'      => 'data-sgs-fx-wave-amplitude',
	'fxMagnetAxis'         => 'data-sgs-fx-magnet-axis',
	'fxMagnetRadius'       => 'data-sgs-fx-magnet-radius',
	'fxMagnetStrength'     => 'data-sgs-fx-magnet-strength',
	'fxFieldTrail'         => 'data-sgs-fx-field-trail',
	'fxShapeAssetFrom'     => 'data-sgs-fx-shape-asset-from',
	'fxShapeAssetTo'       => 'data-sgs-fx-shape-asset-to',

	/*
	 * Surface treatment (Tier W, Spec 38 §1.2b, D479). Same reasoning as the
	 * cursor-field rows above: most qualifying hosts are DYNAMIC blocks, so
	 * these MUST be injected here, not just baked in by `fx.js`'s save
	 * filter for static blocks — without this row a dynamic block's chosen
	 * treatment/colours never reach the rendered root and
	 * `includes/fx-surface-treatment.php` (which reads these back off the
	 * markup at p11) has nothing to act on.
	 */
	'fxTreatment'          => 'data-sgs-fx-treatment',
	'fxTreatmentIntensity' => 'data-sgs-fx-treatment-intensity',
	'fxTreatmentShadow'    => 'data-sgs-fx-treatment-shadow',
	'fxTreatmentHighlight' => 'data-sgs-fx-treatment-highlight',

	/*
	 * Per-treatment single colour (owner request: every treatment gets
	 * colour control, not only duotone). Same reasoning as the shadow/
	 * highlight rows immediately above — most qualifying hosts are DYNAMIC
	 * blocks, so these MUST be injected here too, not just baked in by
	 * `fx.js`'s save filter for static blocks.
	 */
	'fxTreatmentTint'      => 'data-sgs-fx-treatment-tint',
	'fxTreatmentInk'       => 'data-sgs-fx-treatment-ink',
	'fxTreatmentReveal'    => 'data-sgs-fx-treatment-reveal',

	/*
	 * Particle trail (FR-38-32). Same reasoning as cursor-field/magnet/
	 * wave-gradient above: most qualifying hosts (`sgs/container`,
	 * `sgs/hero`, `sgs/cta-section`, `sgs/button`…) are DYNAMIC blocks, so
	 * these MUST be injected here, not just baked in by `fx.js`'s save
	 * filter for static blocks.
	 */
	'fxParticlePreset'     => 'data-sgs-fx-particle-preset',
	'fxParticleDensity'    => 'data-sgs-fx-particle-density',
	'fxParticleSize'       => 'data-sgs-fx-particle-size',
	'fxParticleColour'     => 'data-sgs-fx-particle-colour',
	// FR-38-33 grid-dot field. Same shape as the particle colour above.
	'fxGridDotColour'      => 'data-sgs-fx-grid-colour',
	'fxGridDotHoverColour' => 'data-sgs-fx-grid-colour-hover',
	'fxGridDotShape'       => 'data-sgs-fx-grid-shape',
	// Geometry. These attribute names are the ones `fx-grid-dots.js`'s
	// readOptions() already reads and clamps; the engine's own DEFAULTS table
	// supplies any value a client leaves unset.
	'fxGridCell'           => 'data-sgs-fx-grid-cell',
	'fxGridDotSize'        => 'data-sgs-fx-grid-dot',
	'fxGridRadius'         => 'data-sgs-fx-grid-radius',
	'fxGridLean'           => 'data-sgs-fx-grid-lean',
	'fxGridEase'           => 'data-sgs-fx-grid-ease',

	/*
	 * Generative background (Spec 38, D874 technique spec — v1 static build
	 * only). Same reasoning as wave-gradient/surface-treatment above: most
	 * qualifying hosts (`sgs/container`, `sgs/hero`, `sgs/cta-section`,
	 * `sgs/trust-bar`) are DYNAMIC blocks, so these MUST be injected here,
	 * not just baked in by `fx.js`'s save filter for static blocks — without
	 * this row a dynamic block's chosen colours/ground never reach the
	 * rendered root and `includes/fx-generative-background.php` (which reads
	 * these back off the markup at p11) has nothing to act on.
	 */
	'fxGenColour1'         => 'data-sgs-fx-gen-colour-1',
	'fxGenColour2'         => 'data-sgs-fx-gen-colour-2',
	'fxGenColour3'         => 'data-sgs-fx-gen-colour-3',
	'fxGenColour4'         => 'data-sgs-fx-gen-colour-4',
	'fxGenGround'          => 'data-sgs-fx-gen-ground',

	/*
	 * Generative background — geometry mechanism (v1.2 rewrite, 2026-08-28).
	 * Ten real params: overall speed + the nine tunables the vertex shader
	 * reads directly (3 rotation frequencies, 3 rotation powers, 2
	 * displacement frequencies, 1 displacement amount). Same reasoning as the
	 * colour/ground rows above — most qualifying hosts are DYNAMIC blocks, so
	 * these MUST be injected here for `sgs_fx_data_attr_string()`'s generic
	 * loop to pick them up, not just baked in by `fx.js`'s save filter.
	 */
	'fxGenSpeed'           => 'data-sgs-fx-gen-speed',
	'fxGenFoldFreq1'       => 'data-sgs-fx-gen-fold-freq-1',
	'fxGenFoldFreq2'       => 'data-sgs-fx-gen-fold-freq-2',
	'fxGenFoldFreq3'       => 'data-sgs-fx-gen-fold-freq-3',
	'fxGenFoldPower1'      => 'data-sgs-fx-gen-fold-power-1',
	'fxGenFoldPower2'      => 'data-sgs-fx-gen-fold-power-2',
	'fxGenFoldPower3'      => 'data-sgs-fx-gen-fold-power-3',
	'fxGenDisplaceFreqX'   => 'data-sgs-fx-gen-disp-freq-x',
	'fxGenDisplaceFreqZ'   => 'data-sgs-fx-gen-disp-freq-z',
	'fxGenDisplaceAmount'  => 'data-sgs-fx-gen-disp-amount',

	/*
	 * Generative background — striation / glow-gate + depth-fade params
	 * (§3, 2026-08-28 build). Same reasoning as the geometry row above —
	 * most qualifying hosts are DYNAMIC blocks, so these MUST be injected
	 * here for `sgs_fx_data_attr_string()`'s generic loop to pick them up.
	 */
	'fxGenGlowAmount'      => 'data-sgs-fx-gen-glow-amount',
	'fxGenGlowPower'       => 'data-sgs-fx-gen-glow-power',
	'fxGenGlowRamp'        => 'data-sgs-fx-gen-glow-ramp',
	'fxGenStriationStrength' => 'data-sgs-fx-gen-striation-strength',
	'fxGenStriationFreq'   => 'data-sgs-fx-gen-striation-freq',
	'fxGenColourAttenuation' => 'data-sgs-fx-gen-colour-attenuation',
	'fxGenParabolaPower'   => 'data-sgs-fx-gen-parabola-power',
);

/**
 * PHP mirror of `fx-presets.json`'s governed effect→level→param table
 * (Spec 38 §7, D446 Task 10).
 *
 * WHY A HAND-KEPT MIRROR, NOT A SHARED FILE: `fx-presets.json` is imported
 * directly into the editor's webpack bundle
 * (`import fxPresets from './fx-presets.json'` in `fx.js`), which INLINES the
 * JSON into the compiled JS — it is never copied to `build/` as a standalone
 * file, and `src/` is excluded from every production deploy (see this
 * plugin's CLAUDE.md deploy sequence, `--exclude='src'`). A
 * `file_get_contents()` against the src path would work in local dev and
 * 404 in production. This follows the exact dual-registration shape
 * `FX_ATTR_MAP` above already documents and accepts for the JS attribute
 * list — keep the two files in step by hand; a divergence here means the
 * preset writes different values at render time than the editor showed when
 * the client picked it, which is precisely the normalisation defect this
 * function exists to prevent.
 *
 * Only the fields the render-time fill-in actually needs are mirrored:
 * which params a level governs, and what value it sets. `null` means "clear
 * to the effect module's own default" — the same semantic `fx.js`'s
 * `fxPresetAttributes()` uses; a null preset value is treated as "nothing to
 * fill in" below, never coerced to a literal `null`/empty string.
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
		'horizontal-panel' => array(
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
 * handler in `fx.js` stamps a level's WHOLE governed set into real
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
 * effects, mirroring the same gates `fx.js`'s inspector panel already
 * applies (`isSplit` / `isPath` / `isMorph` / `fxPins()` /
 * `ownsScroll && !isSplit` in `withFxControls`). A key not listed against
 * any effect here is universal (`fx`, `fxPreset`, `fxTrigger`, `fxStart`,
 * `fxEnd`) and always survives an effect change.
 *
 * Duplicated here rather than shared because `fx.js`'s own gates are
 * hand-written effect-name checks, not DB-derived — the same shape of
 * duplication `FX_ATTR_MAP` above already documents as deliberate. Keep
 * both files in step when either changes.
 *
 * @return array<string, string[]> effect => extra attr keys it may carry.
 */
function sgs_fx_effect_param_scope(): array {
	return array(
		'scrub'             => array( 'fxScrub', 'fxEase' ),
		'pin-scrub'         => array( 'fxHold', 'fxScrub' ),
		'horizontal-panel'  => array( 'fxHold', 'fxScrub' ),
		'split-reveal'      => array( 'fxDuration', 'fxStagger', 'fxEase', 'fxSplit', 'fxMask' ),
		'motion-path'       => array( 'fxPath', 'fxPathAsset', 'fxPathRotate', 'fxPathRest', 'fxPathRestVh', 'fxScrub' ),
		'morph'             => array( 'fxShape', 'fxShapeAssetFrom', 'fxShapeAssetTo' ),

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
		 * (this one, `FX_ATTR_MAP` above, and `fx.js`'s `SHIPPED_EFFECTS`), and
		 * the second of the three to have been missed on this effect. None is
		 * cross-checked by a gate.
		 */
		'cursor-field'      => array( 'fxFieldType', 'fxFieldColour', 'fxFieldRadius', 'fxFieldShape', 'fxFieldTrail', 'fxFieldBlend' ),
		'magnet'            => array( 'fxMagnetAxis', 'fxMagnetRadius', 'fxMagnetStrength' ),

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
		'grid-dots'         => array(
			'fxGridDotColour',
			'fxGridDotHoverColour',
			'fxGridDotShape',
			'fxGridCell',
			'fxGridDotSize',
			'fxGridRadius',
			'fxGridLean',
			'fxGridEase',
		),
		'wave-gradient'     => array( 'fxWaveVariant', 'fxWaveBase', 'fxWave1', 'fxWave2', 'fxWave3', 'fxWaveSpeed', 'fxWaveAmplitude' ),

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
		'surface-treatment' => array(
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
		'particles'         => array( 'fxParticlePreset', 'fxParticleDensity', 'fxParticleSize', 'fxParticleColour' ),

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
		),
	);
}

/**
 * Drop fx param values left behind from a PREVIOUS effect.
 *
 * Spec 38 §7 build task (D446 Task 10). `fx.js`'s own `changeEffect()`
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
 * Advance past any leading `<style>`/`<script>` so a tag processor lands on the
 * block's REAL root element.
 *
 * Spec 32's no-inline contract has composites PREPEND a scoped
 * `<style id="…">…</style>` before their wrapper. `WP_HTML_Tag_Processor::
 * next_tag()` matches ANY tag including `<style>`, so calling it on the raw
 * content writes the data attributes onto the style tag — inert, and later
 * stripped wholesale by the p99 CSS-lift filter, so the effect never fires and
 * nothing anywhere reports an error. This exact bug has shipped on this project
 * before (see the identical guard in `animation-attributes.php`).
 *
 * @param string $block_content Rendered block HTML.
 * @return int Byte offset of the real root tag.
 */
function sgs_fx_root_offset( string $block_content ): int {
	$offset = 0;
	while ( \preg_match( '/^\s*<(style|script)\b[^>]*>/i', \substr( $block_content, $offset ), $m ) ) {
		$close     = '</' . \strtolower( $m[1] ) . '>';
		$close_pos = \stripos( $block_content, $close, $offset );
		if ( false === $close_pos ) {
			break; // Malformed markup — treat the whole string as-is.
		}
		$offset = $close_pos + \strlen( $close );
	}
	return $offset;
}

/**
 * Build the `data-sgs-fx*` attribute string for a block's attributes.
 *
 * The same grammar `sgs_inject_fx_attributes()` writes onto a block ROOT, as a
 * ready-to-echo string, for the case where the effect must land on an element
 * DEEPER than the root and only the code emitting that element knows which one
 * it is. `SGS_Container_Wrapper` uses it for the DrawSVG marker on
 * `.sgs-container__svg-bg`.
 *
 * Sharing FX_ATTR_MAP is the point: a caller that hand-rolled its own
 * `data-sgs-fx-*` list would silently stop honouring any parameter added to the
 * grammar later, and the effect would behave differently depending on which
 * element it was attached to.
 *
 * Emitting this string on a descendant deliberately SUPPRESSES the root
 * injection — `sgs_inject_fx_attributes()` bails as soon as it sees
 * `data-sgs-fx=` anywhere in the rendered block — which is exactly the intent:
 * one effect, one target element, chosen by the code that knows the markup.
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

	// D446 Task 10 — normalise BEFORE building the string, so a descendant
	// emission (this function's caller) gets the same preset-fill-in and
	// stale-param clearing the root injector applies below. One normalisation
	// point serves both consumers of FX_ATTR_MAP.
	$attrs = sgs_fx_normalise( $attrs, $fx );

	$out = '';
	foreach ( FX_ATTR_MAP as $attr => $data_attr ) {
		if ( ! isset( $attrs[ $attr ] ) ) {
			continue;
		}
		$value = $attrs[ $attr ];

		// Same rule as the root injector: skip only genuinely ABSENT values, so
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

/**
 * Inject `data-sgs-fx*` onto a block's rendered root element — and, since
 * D446 Task 10, CORRECT it there too, regardless of how the block reached
 * this render.
 *
 * ⚠ BEHAVIOUR CHANGED 2026-08-01 (Spec 38 §7 build task, D446 Task 10). This
 * function used to bail out entirely the moment it saw `data-sgs-fx=`
 * ANYWHERE in `$block_content`, on the theory that a STATIC block's own
 * save-time path (`fx.js`'s `addFxSaveProps`) had already emitted a correct
 * set and writing again would double it up. That theory only held while the
 * save-time path was the ONLY way fx attributes could reach stored content.
 * It stopped holding the moment content could arrive any other way — a
 * pattern insertion, a converter clone, a direct `wp.data` write — because
 * none of those run the editor's save-time filter, so a static block's
 * ROOT could carry attributes that are ABSENT, STALE (left over from a
 * previous effect), or missing a preset's params entirely, and the old bail
 * left every one of those uncorrected forever.
 *
 * The render layer is now authoritative for the ROOT case: it distinguishes
 * "fx markup already on THIS block's own root" (correct it) from "fx markup
 * emitted on a DESCENDANT by e.g. `SGS_Container_Wrapper`" (still suppress
 * the root injection — that mechanism is unchanged and documented in the
 * "NO TRACK MARKING HERE" comment further down).
 *
 * @param string $block_content The rendered block HTML.
 * @param array  $block         Parsed block data including attrs.
 * @return string Block HTML, with fx data attributes normalised and applied.
 */
function sgs_inject_fx_attributes( string $block_content, array $block ): string {
	if ( '' === $block_content ) {
		return $block_content;
	}

	$attrs = $block['attrs'] ?? array();
	$fx    = $attrs['fx'] ?? '';

	if ( ! \is_string( $fx ) || '' === $fx ) {
		return $block_content;
	}

	$offset = sgs_fx_root_offset( $block_content );
	$head   = \substr( $block_content, 0, $offset );
	$rest   = \substr( $block_content, $offset );

	$processor = new \WP_HTML_Tag_Processor( $rest );
	if ( ! $processor->next_tag() ) {
		return $block_content;
	}

	// Distinguish "already on THIS root" (correct it below) from "emitted on
	// a DESCENDANT by SGS_Container_Wrapper via sgs_fx_data_attr_string()"
	// (still bail — one effect, one target element, unchanged from before).
	$root_already_has_fx = null !== $processor->get_attribute( 'data-sgs-fx' );
	if ( ! $root_already_has_fx && false !== \strpos( $rest, 'data-sgs-fx=' ) ) {
		return $block_content;
	}

	// D446 Task 10 — normalise against the SOURCE attributes (the parsed
	// block comment), never against whatever the root tag currently carries:
	// a stale/partial static-save emission must not be treated as the truth
	// it is being corrected against.
	$attrs = sgs_fx_normalise( $attrs, $fx );

	foreach ( FX_ATTR_MAP as $attr => $data_attr ) {
		if ( ! isset( $attrs[ $attr ] ) ) {
			$processor->remove_attribute( $data_attr );
			continue;
		}
		$value = $attrs[ $attr ];

		/*
		 * Skip only genuinely ABSENT values. An emitted empty string would
		 * override the effect module's considered default with nothing.
		 *
		 * A numeric ZERO is NOT absent and must survive: `fxScrub => 0` means
		 * "no smoothing lag", a legitimate setting. The previous rule dropped
		 * every zero here, which is the same defect the JS save filter had —
		 * the client's choice vanished and the module's default silently took
		 * over. The two paths must agree, or the same block behaves differently
		 * depending on whether it was server-rendered or saved as static markup.
		 */
		if ( '' === $value || null === $value ) {
			$processor->remove_attribute( $data_attr );
			continue;
		}

		$processor->set_attribute( $data_attr, \esc_attr( (string) $value ) );
	}

	// D446 Task 15 — per-breakpoint disable. Explicit set-or-remove (not the
	// generic loop above) because these are booleans: `false` is not `''`/
	// `null`, so the generic "skip only genuinely absent" rule would leave a
	// stray `="""` attribute behind instead of removing it.
	if ( true === ( $attrs['fxDisableTablet'] ?? false ) ) {
		$processor->set_attribute( 'data-sgs-fx-disable-tablet', '1' );
	} else {
		$processor->remove_attribute( 'data-sgs-fx-disable-tablet' );
	}
	if ( true === ( $attrs['fxDisableMobile'] ?? false ) ) {
		$processor->set_attribute( 'data-sgs-fx-disable-mobile', '1' );
	} else {
		$processor->remove_attribute( 'data-sgs-fx-disable-mobile' );
	}

	/*
	 * NO TRACK MARKING HERE — deliberate, and it was tried and removed.
	 *
	 * Spec 38 FR-38-8's horizontal panel needs one child element marked as the
	 * track. That element cannot be hand-authored (`sgs/container` is dynamic, so
	 * render.php regenerates its markup and an authored attribute is discarded —
	 * silently, per D338). The obvious fix from here was to scan this rendered
	 * HTML for the first `.sgs-container__inner` and mark it.
	 *
	 * That shipped, and it marked the WRONG element: with nested containers the
	 * first match belongs to a CHILD, so the effect measured a 96px inner instead
	 * of the 1200px panel row, computed zero travel distance, and never pinned.
	 * "Scan the output for the element I want" is a guess whenever more than one
	 * candidate can exist.
	 *
	 * The mark is now applied by `SGS_Container_Wrapper` at the point it EMITS
	 * the `__inner` element — the only place that knows which one is its own.
	 * Do not reintroduce a scan here as a "fallback": if the wrapper did not emit
	 * an inner element, the only candidates left belong to children, so a
	 * fallback would mark the wrong element by construction. Absent mark → the
	 * effect module bails to the CSS scroll-snap fallback, which is correct.
	 */
	return $head . $processor->get_updated_html();
}
\add_filter( 'render_block', __NAMESPACE__ . '\\sgs_inject_fx_attributes', 10, 2 );
