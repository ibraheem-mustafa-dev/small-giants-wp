/**
 * CursorFieldRowControls — shared cursor-reactive-field (FR-38-25) controls for
 * blocks that are NOT on the shared fx ToolsPanel roster.
 *
 * WHY THIS EXISTS RATHER THAN REUSING `fx.js`'s IMPLEMENTATION VERBATIM.
 * `fx.js` already ships this exact effect for its ~32-block roster via the shared
 * `ToolsPanel`/`ToolsPanelItem` surface (Spec 38 §7/FR-38-25) — but `ToolsPanelItem`
 * requires a `ToolsPanel` ancestor, and this component's callers are block-private
 * "escape hatch" blocks (`sgs/site-header-row`, `sgs/site-footer-row`,
 * `sgs/mega-panel`) that must NEVER join that roster (they each declare their own
 * attribute + emit the shared `data-sgs-fx*` markup directly, the same escape-hatch
 * pattern already established by `loopCarousel`, the `sgs/timeline` progress
 * connector, and `draggable`). Presenting the controls in `fx.js`'s own
 * `ToolsPanelItem` shape here would require mounting a `ToolsPanel` these blocks
 * have no other reason to carry, so the CONTROLS are re-presented in plain
 * `PanelBody`-style components instead — the same choice `SurfaceTreatmentPanel.js`
 * made for the same reason.
 *
 * THE DATA CONTRACT IS IDENTICAL AND DELIBERATELY UNCHANGED: the same attribute
 * names (`fxFieldType`/`fxFieldColour`/`fxFieldRadius`/`fxFieldShape`/
 * `fxFieldBlend`/`fxFieldTrail`), the same `data-sgs-fx-field*` markup contract
 * (`includes/fx-attributes.php`'s `FX_ATTR_MAP`), and the same render-layer runtime
 * (`includes/fx-cursor-field.php` + the cursor-field JS module) — so a block using
 * this component gets the identical field/tracking/reduced-motion behaviour with
 * zero new PHP of its own, PROVIDED the caller also sets `fx: 'cursor-field'` (this
 * component does not manage that attribute — see the "Wave 2 wiring" note below).
 *
 * `fx.js` itself is NOT touched by this file and does NOT import it — the working
 * roster stays exactly as shipped. This is additive, for three named blocks that
 * were deliberately never on that roster (Spec 38 addendum, 2026-09-11).
 *
 * WAVE 2 WIRING NOTE (for whoever wires this into a block's edit.js next):
 * this component only renders the `fxField*` sub-controls — it does not set or
 * read the block's `fx` attribute, and it does not declare `fxField*` in any
 * block.json (that is each caller's own responsibility, matching the
 * `loopCarousel`/`draggable` escape-hatch precedent of a block declaring its own
 * attributes rather than touching `fx.js`'s allowlist). Before mounting this,
 * confirm the host block's `render.php` sets `fx` to `'cursor-field'` (directly,
 * not via `fx.js`) when emitting `data-sgs-fx*`, since `sgs_fx_data_attr_string()`
 * / `sgs_inject_fx_attributes()` both gate their entire attribute loop on
 * `$attrs['fx']` being a non-empty string. A synthetic attrs array with `fxField*`
 * values but no `fx` key emits nothing.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { Notice, RangeControl, SelectControl } from '@wordpress/components';
import DesignTokenPicker from './DesignTokenPicker';

/**
 * Field-type options — mirrors `fx.js`'s `FX_FIELD_TYPE_OPTIONS` exactly (kept as
 * a deliberate, small, purely presentational duplicate rather than an import from
 * there — importing from `fx.js` would pull that file's whole ToolsPanel
 * registration/filter graph into every block that mounts this component, none of
 * which are on the fx roster). The empty value is not a type: it means "whatever
 * the stylesheet defaults to" (`glow`), matching `fx.js`'s own contract.
 *
 * @type {Array<{label: string, value: string}>}
 */
const FX_FIELD_TYPE_OPTIONS = [
	{ label: __( 'Glow — a soft pool of light', 'sgs-blocks' ), value: '' },
	{
		label: __( 'Torch — reveals a pattern beneath', 'sgs-blocks' ),
		value: 'spotlight-mask',
	},
	{
		label: __( 'Aurora — colours shift as you move', 'sgs-blocks' ),
		value: 'hue-shift',
	},
	{
		label: __( 'Drift — a pattern that moves with depth', 'sgs-blocks' ),
		value: 'parallax-pattern',
	},
	{
		label: __( 'Brickwork — reveals brick tiling beneath', 'sgs-blocks' ),
		value: 'brick-reveal',
	},
];

/**
 * Pool-shape options — mirrors `fx.js`'s `FX_FIELD_SHAPE_OPTIONS` exactly, same
 * duplication rationale as above. Empty means the stylesheet's own circle.
 *
 * @type {Array<{label: string, value: string}>}
 */
const FX_FIELD_SHAPE_OPTIONS = [
	{ label: __( 'Circle', 'sgs-blocks' ), value: '' },
	{ label: __( 'Wide ellipse', 'sgs-blocks' ), value: 'wide' },
	{ label: __( 'Tall ellipse', 'sgs-blocks' ), value: 'tall' },
];

/**
 * The cursor-reactive-field controls. Caller is responsible for declaring
 * `fxFieldType`/`fxFieldColour`/`fxFieldRadius`/`fxFieldShape`/`fxFieldBlend`/
 * `fxFieldTrail` on its own `block.json` (byte-identical attribute names/types to
 * `fx.js`'s declarations — see this file's own docblock) and for ensuring its
 * `render.php` emits `fx="cursor-field"` on the rendered root alongside these
 * values so the shared `data-sgs-fx-field*` render-layer contract fires.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Object} The controls.
 */
export function CursorFieldRowControls( { attributes, setAttributes } ) {
	const {
		fxFieldType = '',
		fxFieldColour = '',
		fxFieldRadius,
		fxFieldShape = '',
		fxFieldBlend,
		fxFieldTrail,
	} = attributes;

	return (
		<>
			{ /*
			 * MEASURED IN THE EDITOR, matching `fx.js`'s own cursor-field Notice
			 * (Spec 38 §9): the editor canvas cannot follow a pointer, so a client
			 * picking a field type here sees no change in the canvas at all. Without
			 * this Notice that reads as a broken control.
			 */ }
			<Notice status="info" isDismissible={ false }>
				{ __(
					'Cursor effects preview on the live site only — the editor canvas cannot follow a pointer. Use View Page to see this look in motion.',
					'sgs-blocks'
				) }
			</Notice>

			<SelectControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Field style', 'sgs-blocks' ) }
				value={ fxFieldType }
				options={ FX_FIELD_TYPE_OPTIONS }
				onChange={ ( value ) =>
					setAttributes( { fxFieldType: value } )
				}
				help={ __(
					'What follows the cursor across this row.',
					'sgs-blocks'
				) }
			/>

			<DesignTokenPicker
				label={ __( 'Field colour', 'sgs-blocks' ) }
				value={ fxFieldColour }
				onChange={ ( value ) =>
					setAttributes( { fxFieldColour: value } )
				}
			/>

			<RangeControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Field size (pixels)', 'sgs-blocks' ) }
				value={ fxFieldRadius }
				onChange={ ( value ) =>
					setAttributes( { fxFieldRadius: value } )
				}
				min={ 40 }
				max={ 1200 }
				step={ 10 }
				allowReset
				help={ __(
					'How wide the effect spreads around the cursor.',
					'sgs-blocks'
				) }
			/>

			<SelectControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Field shape', 'sgs-blocks' ) }
				value={ fxFieldShape }
				options={ FX_FIELD_SHAPE_OPTIONS }
				onChange={ ( value ) =>
					setAttributes( { fxFieldShape: value } )
				}
				help={ __(
					'A circle, or an ellipse stretched across or down the block.',
					'sgs-blocks'
				) }
			/>

			{ 'hue-shift' === fxFieldType && (
				<RangeControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Colour blend', 'sgs-blocks' ) }
					value={ fxFieldBlend }
					onChange={ ( value ) =>
						setAttributes( { fxFieldBlend: value } )
					}
					min={ 0 }
					max={ 100 }
					step={ 5 }
					allowReset
					help={ __(
						'How far the colours travel from your brand colour. 0 keeps a single hue; higher lets the other colours show through.',
						'sgs-blocks'
					) }
				/>
			) }

			<RangeControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Drag weight', 'sgs-blocks' ) }
				value={ fxFieldTrail }
				onChange={ ( value ) =>
					setAttributes( { fxFieldTrail: value } )
				}
				min={ 0 }
				max={ 100 }
				step={ 5 }
				allowReset
				help={ __(
					'How heavily the effect lags behind the cursor. 0 follows exactly; higher feels weightier.',
					'sgs-blocks'
				) }
			/>
		</>
	);
}
