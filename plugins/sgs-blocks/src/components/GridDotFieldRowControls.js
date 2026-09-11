/**
 * GridDotFieldRowControls — shared grid-dot field (FR-38-33) controls for
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
 * names (`fxGridDotColour`/`fxGridDotHoverColour`/`fxGridDotShape`/
 * `fxGridCell`/`fxGridDotSize`/`fxGridRadius`/`fxGridLean`/`fxGridEase`), the
 * same `data-sgs-fx="grid-dots"` + `data-sgs-fx-grid-*` markup
 * (`includes/fx-attributes.php`'s `FX_ATTR_MAP` + its `'grid-dots'` row in
 * `sgs_fx_effect_param_scope()`), and the same render-layer/runtime behaviour
 * (`fx-grid-dots.js`) — so a block using this component gets the identical
 * lattice behaviour with zero PHP changes of its own, provided the calling
 * block sets `fx: 'grid-dots'` and mounts this panel only when that effect is
 * the one it offers.
 *
 * ⛔ EVERY DEFAULT for the five geometry controls (`fxGridCell`/
 * `fxGridDotSize`/`fxGridRadius`/`fxGridLean`/`fxGridEase`) is `undefined`,
 * NOT a number — mirroring `fx.js`'s own doc comment on this exact point.
 * `fx-grid-dots.js`'s own DEFAULTS table is the single source of the Preset B
 * values (40/2/150/12/260); repeating those numbers here would create a
 * second source that silently drifts, and passing an explicit value over a
 * default via a stray spread is the exact bug that shipped once already
 * (`fx.js`'s own docblock on `fxGridCell` records it).
 *
 * A calling block must declare its OWN `fx`, `fxGridDotColour`,
 * `fxGridDotHoverColour`, `fxGridDotShape`, `fxGridCell`, `fxGridDotSize`,
 * `fxGridRadius`, `fxGridLean` and `fxGridEase` attributes in its own
 * `block.json` (mirroring the shapes documented in `fx.js`) — this component
 * only renders the controls, it does not register attributes.
 *
 * `fx.js` itself is NOT touched by this file — the working fx-qualifying-block
 * system stays exactly as shipped. This is additive, for blocks that were
 * never in that roster and never will be.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { RangeControl, SelectControl } from '@wordpress/components';
import DesignTokenPicker from './DesignTokenPicker';

/**
 * Marker shape options, copied verbatim from `fx.js`'s inline options array
 * — kept as a deliberate, small, purely presentational duplicate rather than
 * an import from `fx.js` (importing from there would pull that file's whole
 * registration/filter graph into every block that mounts this panel, none of
 * which are on the fx roster). `line` and `triangle` rotate to point at the
 * pointer — the "magnetic filings" pattern, and the only way the
 * `fxGridLean` value becomes visible while a dot is at rest, since a circle
 * is radially symmetric.
 *
 * @type {Array<{label: string, value: string}>}
 */
const FX_GRID_DOT_SHAPE_OPTIONS = [
	{ label: __( 'Circle', 'sgs-blocks' ), value: 'circle' },
	{ label: __( 'Line — points at the cursor', 'sgs-blocks' ), value: 'line' },
	{ label: __( 'Square', 'sgs-blocks' ), value: 'square' },
	{
		label: __( 'Triangle — points at the cursor', 'sgs-blocks' ),
		value: 'triangle',
	},
	{ label: __( 'Cross', 'sgs-blocks' ), value: 'cross' },
];

/**
 * The grid-dot field controls. Caller is responsible for gating on whichever
 * effect-selector attribute the calling block uses (e.g. only mounting this
 * when its own effect picker is set to the grid-dot option) — this component
 * renders the parameter controls only, it does not render an effect on/off
 * toggle.
 *
 * All eight params `fx.js` exposes an editor control for are reproduced here
 * — `fxGridCell`/`fxGridRadius`/`fxGridLean`/`fxGridEase` are genuinely
 * operator-facing (each has a `RangeControl` in `fx.js`, confirmed at the
 * time of writing), not render-only/derived values, so none is skipped.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Object} The controls.
 */
export function GridDotFieldRowControls( { attributes, setAttributes } ) {
	const {
		fxGridDotColour = '',
		fxGridDotHoverColour = '',
		fxGridDotShape = '',
		fxGridCell,
		fxGridDotSize,
		fxGridRadius,
		fxGridLean,
		fxGridEase,
	} = attributes;

	return (
		<>
			{ /*
			 * D609 SHAPE: one thin control, states as TABS inside its popover
			 * — never a second sibling row. Passing `states` is what selects
			 * that shape; called without it, `DesignTokenPicker` silently
			 * falls back to the legacy single-swatch rendering, which is how
			 * `fx.js`'s own control shipped looking wrong while using the
			 * right component. `enableAlpha` is the whole opacity story:
			 * the runtime does not force a rest alpha, so a translucent
			 * lattice is a translucent colour the client picks here, per
			 * state.
			 */ }
			<DesignTokenPicker
				label={ __( 'Dot colour', 'sgs-blocks' ) }
				linked
				enableAlpha
				states={ [
					{
						key: 'normal',
						label: __( 'Normal', 'sgs-blocks' ),
						value: fxGridDotColour,
						onChange: ( value ) =>
							setAttributes( { fxGridDotColour: value } ),
					},
					{
						key: 'hover',
						label: __( 'Pointer', 'sgs-blocks' ),
						value: fxGridDotHoverColour,
						onChange: ( value ) =>
							setAttributes( { fxGridDotHoverColour: value } ),
					},
				] }
				help={ __(
					'Normal is the resting lattice; Pointer is the colour dots reach nearest the cursor. Pick something that reads against this row’s background — a brand accent is usually too close to it. Use the opacity slider for a subtler field.',
					'sgs-blocks'
				) }
			/>

			<SelectControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Dot shape', 'sgs-blocks' ) }
				value={ fxGridDotShape || 'circle' }
				options={ FX_GRID_DOT_SHAPE_OPTIONS }
				onChange={ ( value ) =>
					setAttributes( { fxGridDotShape: value } )
				}
				help={ __(
					'Line and Triangle rotate to point at the cursor, which makes the Lean setting visible even before a marker moves. Circle, Square and Cross stay upright.',
					'sgs-blocks'
				) }
			/>

			<RangeControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Spacing', 'sgs-blocks' ) }
				value={ fxGridCell }
				onChange={ ( value ) => setAttributes( { fxGridCell: value } ) }
				min={ 12 }
				max={ 200 }
				step={ 2 }
				allowReset
				help={ __(
					'Gap between dots, in pixels. Smaller reads as texture; larger reads as a pattern.',
					'sgs-blocks'
				) }
			/>

			<RangeControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Dot size', 'sgs-blocks' ) }
				value={ fxGridDotSize }
				onChange={ ( value ) =>
					setAttributes( { fxGridDotSize: value } )
				}
				min={ 0.5 }
				max={ 12 }
				step={ 0.5 }
				allowReset
				help={ __( 'Radius of each dot, in pixels.', 'sgs-blocks' ) }
			/>

			<RangeControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Reach', 'sgs-blocks' ) }
				value={ fxGridRadius }
				onChange={ ( value ) =>
					setAttributes( { fxGridRadius: value } )
				}
				min={ 20 }
				max={ 600 }
				step={ 10 }
				allowReset
				help={ __(
					'How far from the pointer dots start to react, in pixels.',
					'sgs-blocks'
				) }
			/>

			<RangeControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Lean', 'sgs-blocks' ) }
				value={ fxGridLean }
				onChange={ ( value ) => setAttributes( { fxGridLean: value } ) }
				min={ 1 }
				max={ 60 }
				step={ 1 }
				allowReset
				help={ __(
					'How far a dot leans toward the pointer. Each dot stays locked inside its own cell, so very large values stop having an effect.',
					'sgs-blocks'
				) }
			/>

			<RangeControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Settle', 'sgs-blocks' ) }
				value={ fxGridEase }
				onChange={ ( value ) => setAttributes( { fxGridEase: value } ) }
				min={ 60 }
				max={ 1200 }
				step={ 20 }
				allowReset
				help={ __(
					'How long dots take to drift back to centre after the pointer leaves, in milliseconds.',
					'sgs-blocks'
				) }
			/>
		</>
	);
}
