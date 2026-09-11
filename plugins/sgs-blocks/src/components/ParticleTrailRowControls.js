/**
 * ParticleTrailRowControls — shared particle-trail (FR-38-32) controls for
 * blocks that reach the effect via a block-private escape hatch rather than
 * the shared fx `ToolsPanel`.
 *
 * WHY THIS EXISTS RATHER THAN REUSING `fx.js`'s IMPLEMENTATION VERBATIM.
 * `fx.js` already ships this exact effect for its curated roster of
 * fx-qualifying blocks via `ToolsPanel`/`ToolsPanelItem` — but `sgs/site-header-row`,
 * `sgs/site-footer-row` and `sgs/mega-panel` are DELIBERATELY NOT on that roster
 * (see `generated-fx-qualifying-blocks.json` + `check-fx-list-drift.py`) and must
 * never be added to it. Precedent for this "block-private escape hatch" pattern
 * already exists (`loopCarousel`, the `sgs/timeline` progress connector,
 * `draggable`, and `SurfaceTreatmentPanel.js` for the surface-treatment effect):
 * a block declares its own attribute(s) and emits the SAME `data-sgs-fx*`
 * markup the shared runtime/render layer already reads, without ever touching
 * `fx.js`'s roster or its ToolsPanel/allowlist mechanism.
 *
 * The DATA CONTRACT is identical and deliberately unchanged: the same attribute
 * names (`fxParticlePreset`/`fxParticleDensity`/`fxParticleSize`/
 * `fxParticleColour`), the same `data-sgs-fx="particles"` +
 * `data-sgs-fx-particle-*` markup (`includes/fx-attributes.php`'s `FX_ATTR_MAP`
 * + its `'particles'` row in `sgs_fx_effect_param_scope()`), and the same
 * render-layer/runtime behaviour (`fx-particles.js`) — so a block using this
 * component gets the identical trail behaviour with zero PHP changes of its
 * own, provided the calling block sets `fx: 'particles'` and mounts this panel
 * only when that effect is the one it offers.
 *
 * A calling block must declare its OWN `fx`, `fxParticlePreset`,
 * `fxParticleDensity`, `fxParticleSize` and `fxParticleColour` attributes in
 * its own `block.json` (mirroring the shapes documented in `fx.js`) — this
 * component only renders the controls, it does not register attributes.
 *
 * `fx.js` itself is NOT touched by this file — the working fx-qualifying-block
 * system stays exactly as shipped. This is additive, for blocks that were
 * never in that roster and never will be.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelRow, RangeControl, SelectControl } from '@wordpress/components';
import DesignTokenPicker from './DesignTokenPicker';

/**
 * The three shipped particle presets (FR-38-32), copied verbatim from
 * `fx.js`'s `FX_PARTICLE_PRESET_OPTIONS` — kept as a deliberate, small,
 * purely presentational duplicate rather than an import from `fx.js`
 * (importing from there would pull that file's whole registration/filter
 * graph into every block that mounts this panel, none of which are on the
 * fx roster). `''` maps to `'sparks'` at the boot module (`fx-particles.js`'s
 * `readOptions()`), matching `fx.js`'s own default-selection behaviour.
 *
 * @type {Array<{label: string, value: string}>}
 */
const FX_PARTICLE_PRESET_OPTIONS = [
	{ label: __( 'Sparks — a fading trail', 'sgs-blocks' ), value: 'sparks' },
	{
		label: __( 'Gravity dots — drift down and settle', 'sgs-blocks' ),
		value: 'gravity-dots',
	},
	{ label: __( 'Ripple — expanding rings', 'sgs-blocks' ), value: 'ripple' },
];

/**
 * The particle-trail controls. Caller is responsible for gating on whichever
 * effect-selector attribute the calling block uses (e.g. only mounting this
 * when its own effect picker is set to the particle-trail option) — this
 * component renders the parameter controls only, it does not render an
 * effect on/off toggle.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Object} The controls.
 */
export function ParticleTrailRowControls( { attributes, setAttributes } ) {
	const {
		fxParticlePreset = '',
		fxParticleDensity,
		fxParticleSize,
		fxParticleColour = '',
	} = attributes;

	return (
		<>
			<SelectControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Style', 'sgs-blocks' ) }
				value={ fxParticlePreset || 'sparks' }
				options={ FX_PARTICLE_PRESET_OPTIONS }
				onChange={ ( value ) =>
					setAttributes( { fxParticlePreset: value } )
				}
				help={ __(
					'What trails the cursor across this row on the live site.',
					'sgs-blocks'
				) }
			/>

			<RangeControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Density', 'sgs-blocks' ) }
				value={ fxParticleDensity }
				onChange={ ( value ) =>
					setAttributes( { fxParticleDensity: value } )
				}
				min={ 0.25 }
				max={ 3 }
				step={ 0.25 }
				allowReset
				help={ __(
					'How many particles spawn per pointer movement. Higher reads as busier, not faster.',
					'sgs-blocks'
				) }
			/>

			<RangeControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Size', 'sgs-blocks' ) }
				value={ fxParticleSize }
				onChange={ ( value ) =>
					setAttributes( { fxParticleSize: value } )
				}
				min={ 0.25 }
				max={ 3 }
				step={ 0.25 }
				allowReset
				help={ __(
					"A ceiling derived from this block's own size still caps how large any single particle can get, so this never overwhelms a small row.",
					'sgs-blocks'
				) }
			/>

			<PanelRow>
				<div style={ { width: '100%' } }>
					<DesignTokenPicker
						label={ __( 'Trail colour', 'sgs-blocks' ) }
						value={ fxParticleColour }
						onChange={ ( value ) =>
							setAttributes( { fxParticleColour: value } )
						}
						help={ __(
							'Leave empty to inherit the trail’s own considered default.',
							'sgs-blocks'
						) }
					/>
				</div>
			</PanelRow>
		</>
	);
}
