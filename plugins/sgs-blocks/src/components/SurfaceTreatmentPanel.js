/**
 * SurfaceTreatmentPanel — shared surface-treatment (grain/halftone/duotone) controls
 * for blocks that reach the effect via `BackgroundPanel` rather than the shared fx
 * ToolsPanel.
 *
 * WHY THIS EXISTS RATHER THAN REUSING `fx.js`'s IMPLEMENTATION VERBATIM.
 * `fx.js` already ships this exact effect (Spec 38 §1.2b, D479) for 15 image-bearing
 * blocks via the shared fx ToolsPanel — but that panel is a `ToolsPanel`/`ToolsPanelItem`
 * surface, and `BackgroundPanel` is a plain `PanelBody`. The two component families are
 * not interchangeable (`ToolsPanelItem` requires a `ToolsPanel` ancestor), so the
 * CONTROLS are re-presented here in `BackgroundPanel`'s plain style. The DATA CONTRACT
 * is identical and deliberately unchanged: the same attribute names
 * (`fxTreatment`/`fxTreatmentShadow`/`fxTreatmentHighlight`/`fxTreatmentTint`/
 * `fxTreatmentInk`/`fxTreatmentIntensity`/`fxTreatmentReveal`), the same
 * `data-sgs-fx="surface-treatment"` + `data-sgs-fx-treatment*` markup, and the same
 * render-layer filter (`includes/fx-surface-treatment.php`, a global `render_block`
 * filter keyed on the rendered markup, not on the fx-panel roster) — so a block using
 * this component gets the identical shader/registry/reduced-motion/budget behaviour
 * with zero PHP changes of its own. Only the EDITOR PRESENTATION differs.
 *
 * `fx.js` itself is NOT touched by this file — the working 32-block system stays
 * exactly as shipped. This is additive, for blocks that were never in that roster
 * (`sgs/site-header`, `sgs/site-footer`, `sgs/container`, `sgs/modal`,
 * `sgs/multi-button` at the time of writing — Spec 38 addendum, 2026-09-11).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelRow, RangeControl, ToggleControl } from '@wordpress/components';
import DesignTokenPicker from './DesignTokenPicker';
import { ToggleGroupControl, ToggleGroupControlOption, ToggleGroupControlOptionIcon } from './primitives';

const RouteOption = ToggleGroupControlOptionIcon || ToggleGroupControlOption;

const FX_TREATMENT_OPTIONS = [
	{ value: 'grain', label: __( 'Grain', 'sgs-blocks' ) },
	{ value: 'halftone', label: __( 'Halftone', 'sgs-blocks' ) },
	{ value: 'duotone', label: __( 'Duotone', 'sgs-blocks' ) },
];

/**
 * A surface-treatment thumbnail — a small glyph suggesting the finish. Mirrors
 * `fx.js`'s `treatmentThumbnail()` exactly (kept as a deliberate, small, purely
 * presentational duplicate rather than an import from `fx.js` — importing from
 * there would pull that file's whole registration/filter graph into every block
 * that mounts `BackgroundPanel`, most of which never touch fx at all).
 *
 * @param {string} id Preset id — `grain` | `halftone` | `duotone`.
 * @return {Object} An SVG element.
 */
function treatmentThumbnail( id ) {
	if ( 'halftone' === id ) {
		return (
			<svg viewBox="0 0 100 100" width="24" height="24" aria-hidden="true" focusable="false">
				<circle cx="22" cy="22" r="13" fill="currentColor" />
				<circle cx="58" cy="22" r="9" fill="currentColor" />
				<circle cx="86" cy="24" r="5" fill="currentColor" />
				<circle cx="22" cy="58" r="9" fill="currentColor" />
				<circle cx="58" cy="58" r="6" fill="currentColor" />
				<circle cx="86" cy="60" r="3" fill="currentColor" />
				<circle cx="22" cy="86" r="5" fill="currentColor" />
				<circle cx="58" cy="86" r="3" fill="currentColor" />
			</svg>
		);
	}

	if ( 'duotone' === id ) {
		return (
			<svg viewBox="0 0 100 100" width="24" height="24" aria-hidden="true" focusable="false">
				<rect x="12" y="12" width="76" height="76" fill="currentColor" />
				<path d="M 12 12 H 88 V 88 Z" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="10" />
				<rect x="12" y="12" width="38" height="76" fill="currentColor" fillOpacity="0.4" />
			</svg>
		);
	}

	// `grain` — scattered flecks, the default/fallback glyph.
	return (
		<svg viewBox="0 0 100 100" width="24" height="24" aria-hidden="true" focusable="false">
			<rect x="10" y="10" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="3 5" />
			<circle cx="30" cy="35" r="2.5" fill="currentColor" />
			<circle cx="55" cy="22" r="2" fill="currentColor" />
			<circle cx="72" cy="48" r="3" fill="currentColor" />
			<circle cx="40" cy="65" r="2" fill="currentColor" />
			<circle cx="65" cy="75" r="2.5" fill="currentColor" />
			<circle cx="20" cy="80" r="2" fill="currentColor" />
		</svg>
	);
}

/**
 * Whether the block's current background-image configuration is one the PHP
 * wrapper's `<img>` fast path can express — mirrors
 * `class-sgs-container-wrapper.php`'s `$sgs_bg_img_is_simple` gate exactly (kept in
 * step deliberately; the runtime NEEDS a real nested `<img>` to repaint, per
 * `fx-surface-treatment.js`'s own docblock — a CSS `background-image` on a `::before`
 * has no pixel source for the shader to read).
 *
 * @param {Object} attributes Block attributes.
 * @return {boolean} True when the wrapper will render a real `<img>` for this config.
 */
export function isSimpleBackgroundImage( attributes ) {
	const {
		backgroundSize = 'cover',
		backgroundRepeat = 'no-repeat',
		backgroundAttachment = 'scroll',
		bgParallax = false,
		backgroundImageTablet,
		backgroundImageMobile,
	} = attributes;

	return (
		'no-repeat' === backgroundRepeat &&
		[ 'cover', 'contain' ].includes( backgroundSize ) &&
		! bgParallax &&
		'fixed' !== backgroundAttachment &&
		! backgroundImageTablet?.url &&
		! backgroundImageMobile?.url
	);
}

/**
 * The surface-treatment controls. Caller is responsible for gating on
 * `hasBgImage` (a background image must be SET) and `isSimpleBackgroundImage()`
 * (the image config must be one the `<img>` fast path can express) — both are
 * checked by `BackgroundPanel.js` before mounting this, so it renders only when
 * the effect can genuinely reach the rendered page.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Object} The controls.
 */
export function SurfaceTreatmentPanel( { attributes, setAttributes } ) {
	const {
		fxTreatment = '',
		fxTreatmentReveal = '',
		fxTreatmentTint = '',
		fxTreatmentInk = '',
		fxTreatmentShadow = '',
		fxTreatmentHighlight = '',
		fxTreatmentIntensity,
	} = attributes;

	return (
		<>
			<hr style={ { margin: '16px 0' } } />
			<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '4px' } }>
				{ __( 'Surface treatment', 'sgs-blocks' ) }
			</p>
			<p className="components-base-control__help">
				{ __( 'Grain, halftone or duotone, painted over the image on the live site.', 'sgs-blocks' ) }
			</p>
			<ToggleGroupControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				isBlock
				label={ __( 'Treatment', 'sgs-blocks' ) }
				hideLabelFromVision
				value={ fxTreatment }
				onChange={ ( value ) =>
					setAttributes( {
						fxTreatment: value || '',
						fxTreatmentShadow: 'duotone' === value ? fxTreatmentShadow : '',
						fxTreatmentHighlight: 'duotone' === value ? fxTreatmentHighlight : '',
						fxTreatmentTint: 'grain' === value ? fxTreatmentTint : '',
						fxTreatmentInk: 'halftone' === value ? fxTreatmentInk : '',
					} )
				}
			>
				<RouteOption value="" label={ __( 'None', 'sgs-blocks' ) } />
				{ FX_TREATMENT_OPTIONS.map( ( option ) => (
					<RouteOption
						key={ option.value }
						value={ option.value }
						label={ option.label }
						icon={ treatmentThumbnail( option.value ) }
					/>
				) ) }
			</ToggleGroupControl>

			{ fxTreatment && (
				<>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Reveal on scroll', 'sgs-blocks' ) }
						checked={ 'off' !== fxTreatmentReveal }
						onChange={ ( checked ) =>
							setAttributes( { fxTreatmentReveal: checked ? '' : 'off' } )
						}
						help={ __(
							'The treatment fades in as the image scrolls into view. Turn off to apply it immediately.',
							'sgs-blocks'
						) }
					/>

					{ 'grain' === fxTreatment && (
						<PanelRow>
							<div style={ { width: '100%' } }>
								<DesignTokenPicker
									label={ __( 'Grain tint', 'sgs-blocks' ) }
									value={ fxTreatmentTint }
									onChange={ ( value ) => setAttributes( { fxTreatmentTint: value } ) }
								/>
								<p className="components-base-control__help">
									{ __( 'Defaults to your brand colour. Change it to anything in your palette.', 'sgs-blocks' ) }
								</p>
							</div>
						</PanelRow>
					) }

					{ 'halftone' === fxTreatment && (
						<PanelRow>
							<div style={ { width: '100%' } }>
								<DesignTokenPicker
									label={ __( 'Ink colour', 'sgs-blocks' ) }
									value={ fxTreatmentInk }
									onChange={ ( value ) => setAttributes( { fxTreatmentInk: value } ) }
								/>
								<p className="components-base-control__help">
									{ __( 'Defaults to your brand colour. Change it to anything in your palette.', 'sgs-blocks' ) }
								</p>
							</div>
						</PanelRow>
					) }

					{ 'duotone' === fxTreatment && (
						<>
							<PanelRow>
								<div style={ { width: '100%' } }>
									<DesignTokenPicker
										label={ __( 'Shadow colour', 'sgs-blocks' ) }
										value={ fxTreatmentShadow }
										onChange={ ( value ) => setAttributes( { fxTreatmentShadow: value } ) }
									/>
									<p className="components-base-control__help">
										{ __( 'Defaults to your brand colour. Change it to anything in your palette.', 'sgs-blocks' ) }
									</p>
								</div>
							</PanelRow>
							<PanelRow>
								<div style={ { width: '100%' } }>
									<DesignTokenPicker
										label={ __( 'Highlight colour', 'sgs-blocks' ) }
										value={ fxTreatmentHighlight }
										onChange={ ( value ) => setAttributes( { fxTreatmentHighlight: value } ) }
									/>
									<p className="components-base-control__help">
										{ __( 'Defaults to your brand colour. Change it to anything in your palette.', 'sgs-blocks' ) }
									</p>
								</div>
							</PanelRow>
						</>
					) }

					<RangeControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Intensity', 'sgs-blocks' ) }
						value={ fxTreatmentIntensity }
						onChange={ ( value ) => setAttributes( { fxTreatmentIntensity: value } ) }
						min={ 0 }
						max={ 1 }
						step={ 0.05 }
						allowReset
						help={ __(
							'How strong the treatment looks. Leave this alone to use the treatment’s own considered default.',
							'sgs-blocks'
						) }
					/>
				</>
			) }
		</>
	);
}
