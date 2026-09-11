/**
 * FlowingGradientRowControls — shared "flowing gradient" (`wave-gradient`) controls
 * for blocks that reach the effect via a BLOCK-PRIVATE escape hatch rather than the
 * shared fx ToolsPanel.
 *
 * WHY THIS EXISTS RATHER THAN REUSING `fx.js`'s IMPLEMENTATION VERBATIM.
 * `fx.js` already ships the wave-gradient effect (Spec 38 FR-38-31) for the ~32-block
 * fx-qualifying roster via the shared fx `ToolsPanel` — but `sgs/site-header-row`,
 * `sgs/site-footer-row` and `sgs/mega-panel` are deliberately NOT on that roster and
 * must never be added to it (the roster is enforced by
 * `generated-fx-qualifying-blocks.json` + `scripts/check-fx-list-drift.py`). This
 * mirrors the precedent already established for `loopCarousel`, `sgs/timeline`'s
 * progress connector, and `draggable`: a block declares its OWN attribute(s) and
 * emits the SAME `data-sgs-fx*` markup the shared runtime/CSS already reads, without
 * touching `fx.js`'s ToolsPanel/allowlist mechanism at all. The DATA CONTRACT is
 * identical — the same attribute names (`fxWaveVariant`/`fxWaveBase`/`fxWave1`/
 * `fxWave2`/`fxWave3`/`fxWaveSpeed`/`fxWaveAmplitude`), the same
 * `data-sgs-fx="wave-gradient"` + `data-sgs-fx-wave-*` markup (`FX_ATTR_MAP` in
 * `includes/fx-attributes.php`), and the same render-time normalisation
 * (`sgs_fx_normalise()`) — so a block using this component gets the identical
 * stylesheet/runtime/reduced-motion behaviour with zero PHP changes of its own
 * beyond emitting `fx`/the `fxWave*` attributes and calling the existing fx
 * data-attribute injector. Only the EDITOR PRESENTATION differs, matching
 * `SurfaceTreatmentPanel.js`'s precedent for the same reason.
 *
 * ⛔ AURORA AND INK ARE DELIBERATELY EXCLUDED — NOT MERELY HIDDEN.
 * `fx.js`'s own variant picker lists six values (`pastel`, `aurora`, `ink`,
 * `horizon`, `ribbon`, `veil`). Two of them — `aurora` and `ink` — boot a WebGL
 * context (`src/shared/effects/fx-wave-gradient.js::attach()` returns early,
 * doing nothing, for every variant EXCEPT `aurora`/`ink`; only those two reach
 * `createAurora()` from `webgl/aurora.js`). Bean rejected that WebGL look outright
 * as "B-movie 3D VFX", and it is currently mid-rework elsewhere in the codebase.
 * The remaining four (`pastel`, `horizon`, `ribbon`, `veil`) are painted entirely
 * by static CSS rules keyed on the root's variant class — confirmed by reading
 * `attach()` itself, which never creates a canvas or probes WebGL for those four.
 * Because these three blocks are being wired up FRESH (not migrating an existing
 * fx-panel mount), the WebGL variants are excluded from the options array outright
 * — not filtered at runtime from `fx.js`'s six-value list, not hidden by CSS, not
 * disabled-and-greyed-out. There is no code path in this file that can ever
 * produce `fxWaveVariant: 'aurora'` or `fxWaveVariant: 'ink'`.
 *
 * NOT WIRED INTO ANY BLOCK BY THIS CHANGE. This component is built standalone;
 * mounting it into `site-header-row`/`site-footer-row`/`mega-panel`'s `edit.js`
 * (plus the matching `block.json` attribute declarations and the render.php-side
 * `data-sgs-fx*` emission) is separate follow-up work.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { RangeControl } from '@wordpress/components';
import DesignTokenPicker from './DesignTokenPicker';
import { ToggleGroupControl, ToggleGroupControlOption, ToggleGroupControlOptionIcon } from './primitives';

const RouteOption = ToggleGroupControlOptionIcon || ToggleGroupControlOption;

/**
 * The four CSS-only wave-gradient variants. `aurora` and `ink` are WebGL-backed
 * and are NEVER added to this array — see the top-of-file docblock.
 */
const FLOWING_GRADIENT_VARIANTS = [
	{ value: 'pastel', label: __( 'Pastel — soft daylight wash', 'sgs-blocks' ) },
	{ value: 'horizon', label: __( 'Horizon — glow along the base', 'sgs-blocks' ) },
	{ value: 'ribbon', label: __( 'Ribbon — one band crossing', 'sgs-blocks' ) },
	{ value: 'veil', label: __( 'Veil — broad drifting sheets', 'sgs-blocks' ) },
];

/**
 * Whether a variant value is one of the four CSS-only options this control
 * offers. Exported so a caller (e.g. a migration or a defensive render check)
 * can validate a stored value without duplicating the literal list.
 *
 * @param {string} value Candidate `fxWaveVariant` value.
 * @return {boolean} True when `value` is a permitted CSS-only variant.
 */
export function isCssOnlyFlowingGradientVariant( value ) {
	return FLOWING_GRADIENT_VARIANTS.some( ( option ) => option.value === value );
}

/**
 * The flowing-gradient (wave-gradient) controls — style picker (CSS-only variants
 * only) + the three wave colours + base colour + speed + amplitude. Writes the
 * SAME attribute names `fx.js` uses (`fxWaveVariant`/`fxWaveBase`/`fxWave1`/
 * `fxWave2`/`fxWave3`/`fxWaveSpeed`/`fxWaveAmplitude`) so the render-layer
 * `FX_ATTR_MAP` mapping and the shared runtime work unmodified.
 *
 * Caller is responsible for also setting `fx: 'wave-gradient'` on the host
 * block (this component does not toggle the effect on/off — that is a
 * block-level decision, e.g. a "Background effect" picker that includes a
 * "None" option) and for emitting the resulting attributes as
 * `data-sgs-fx*` markup at render time via the existing
 * `sgs_fx_data_attr_string()` / `sgs_inject_fx_attributes()` mechanism in
 * `includes/fx-attributes.php` — no new PHP is required for that step.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Object} The controls.
 */
export function FlowingGradientRowControls( { attributes, setAttributes } ) {
	const {
		fxWaveVariant = 'pastel',
		fxWaveBase = '',
		fxWave1 = '',
		fxWave2 = '',
		fxWave3 = '',
		fxWaveSpeed,
		fxWaveAmplitude,
	} = attributes;

	// Guard against a stale/imported 'aurora' or 'ink' value reaching this
	// control (e.g. hand-authored post content, or a value written before this
	// restriction existed) — fall back to the first CSS-only option rather than
	// rendering a ToggleGroupControl with no option matching its own value.
	const safeVariant = isCssOnlyFlowingGradientVariant( fxWaveVariant )
		? fxWaveVariant
		: 'pastel';

	return (
		<>
			<ToggleGroupControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				isBlock
				label={ __( 'Style', 'sgs-blocks' ) }
				value={ safeVariant }
				onChange={ ( value ) => setAttributes( { fxWaveVariant: value } ) }
				help={ __(
					'Each style ships with colours chosen to suit it — change any of them below to match your brand.',
					'sgs-blocks'
				) }
			>
				{ FLOWING_GRADIENT_VARIANTS.map( ( option ) => (
					<RouteOption key={ option.value } value={ option.value } label={ option.label } />
				) ) }
			</ToggleGroupControl>

			<DesignTokenPicker
				label={ __( 'Base colour', 'sgs-blocks' ) }
				help={ __(
					'The colour underneath everything. The other three blend on top of it.',
					'sgs-blocks'
				) }
				states={ [
					{
						key: 'normal',
						label: __( 'Normal', 'sgs-blocks' ),
						value: fxWaveBase,
						onChange: ( val ) => setAttributes( { fxWaveBase: val ?? '' } ),
						linked: true,
					},
				] }
			/>

			<DesignTokenPicker
				label={ __( 'Wave colour 1', 'sgs-blocks' ) }
				help={ __(
					'One of three colours that flow across the base. Each moves independently.',
					'sgs-blocks'
				) }
				states={ [
					{
						key: 'normal',
						label: __( 'Normal', 'sgs-blocks' ),
						value: fxWave1,
						onChange: ( val ) => setAttributes( { fxWave1: val ?? '' } ),
						linked: true,
					},
				] }
			/>

			<DesignTokenPicker
				label={ __( 'Wave colour 2', 'sgs-blocks' ) }
				help={ __( 'The second flowing colour.', 'sgs-blocks' ) }
				states={ [
					{
						key: 'normal',
						label: __( 'Normal', 'sgs-blocks' ),
						value: fxWave2,
						onChange: ( val ) => setAttributes( { fxWave2: val ?? '' } ),
						linked: true,
					},
				] }
			/>

			<DesignTokenPicker
				label={ __( 'Wave colour 3', 'sgs-blocks' ) }
				help={ __( 'The third flowing colour.', 'sgs-blocks' ) }
				states={ [
					{
						key: 'normal',
						label: __( 'Normal', 'sgs-blocks' ),
						value: fxWave3,
						onChange: ( val ) => setAttributes( { fxWave3: val ?? '' } ),
						linked: true,
					},
				] }
			/>

			<RangeControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Speed', 'sgs-blocks' ) }
				value={ fxWaveSpeed }
				onChange={ ( value ) => setAttributes( { fxWaveSpeed: value } ) }
				min={ 0 }
				max={ 100 }
				allowReset
				help={ __( 'How quickly the gradient moves.', 'sgs-blocks' ) }
			/>

			<RangeControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Amplitude', 'sgs-blocks' ) }
				value={ fxWaveAmplitude }
				onChange={ ( value ) => setAttributes( { fxWaveAmplitude: value } ) }
				min={ 0 }
				max={ 100 }
				allowReset
				help={ __( 'How far the waves swell.', 'sgs-blocks' ) }
			/>
		</>
	);
}
