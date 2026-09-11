import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';
import { SGS_FONT_WEIGHT_OPTIONS } from '../../components';

/**
 * SGS Nav Menu (sgs/nav-menu) — Styles tab: the "Typography" panel (Spec 41 §9.10 /
 * FR-41-22 / FR-41-29). RESTORED in step 14; it was fully specified in prose and
 * entirely absent from the built inspector.
 *
 * It sits directly under the Colour panel, as the second panel in the Styles tab.
 *
 * ⛔ THE ONE MISTAKE THAT SILENTLY DELETES NINE WORKING CONTROLS. In `targets` mode
 * (`targets.length > 1`) `TypographyControls` renders `<TypographyTargetSwitcher>`
 * and DISCARDS `singleProps` entirely; the switcher then destructures
 * `{ key, label, prefix, ...fieldProps }` from the SELECTED target and forwards only
 * `fieldProps`. So every per-field flag — all nine `show*` flags AND `showHover` —
 * lives on EACH TARGET ENTRY, never on the outer element. A flag left outside does
 * nothing, silently, with every gate green: six declared-and-rendered attributes with
 * no control is the INVERSE shape `check-dead-controls.js` looks for. The mount below
 * is FR-41-22's verbatim one.
 *
 * ⚠ THE `<TypographyControls>` MOUNT ITSELF LIVES IN `edit.js` AND IS PASSED IN AS
 * `children`, deliberately. `inspector-scan` rule 21 builds its control corpus from
 * the block's own `edit.js` plus the source of the components THAT FILE's JSX
 * renders. Measured 2026-09-11: with the mount inside this sibling module, seven
 * genuinely-controlled typography attributes (`itemFontWeight`, the item hover trio,
 * the submenu hover trio) reported as rendered-with-no-control — the control worked
 * and the gate went blind, which is the D738 shape. Keeping the mount in `edit.js`
 * puts `TypographyControls.js`'s own prefix machinery back in the corpus. This panel
 * still owns the layout, the two verbatim help strings, the ⓘ twin note and the
 * block-private Current-page weight field.
 *
 * @param {Object}   root0                       Props.
 * @param {Object}   root0.children              The `<TypographyControls>` mount, from
 *                                               `edit.js` — see the note above.
 * @param {string}   root0.itemFontWeightCurrent `itemFontWeightCurrent`.
 * @param {Function} root0.setAttributes         The block's attribute setter.
 */
export default function TypographyPanel( {
	children,
	itemFontWeightCurrent,
	setAttributes,
} ) {
	return (
		<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
			{ children }

			{ /* ⛔ The hover trio above is an OPTIONAL SECONDARY DECORATION. It is not
			   this block's non-colour hover signal — that is the item border's own
			   treatment selector in the Colour panel — and it is not another way of
			   authoring a divider. A hover underline here paints a baseline-hugging
			   glyph-width decoration; the border paints a full-width edge. Never
			   present them as the same control in different clothes (FR-41-6).
			   ⛔ This ⓘ note is the TWIN of the one under the item border row in the
			   Colour panel. Neither ships without the other, or one control points at
			   a partner that never points back. */ }
			<p className="components-base-control__help sgs-nav-menu__colour-note">
				{ __(
					'These change how the menu word itself looks on hover. For a line across the whole item, use the item border’s hover setting in the Colour panel instead.',
					'sgs-blocks'
				) }
			</p>
			<p className="components-base-control__help">
				{ __(
					'Underlines the menu word itself on hover — not a full-width line. For a line under the whole item, use the border’s hover setting in the Colour panel instead.',
					'sgs-blocks'
				) }
			</p>
			<p className="components-base-control__help">
				{ __(
					'Makes the word bolder when you point at it. Bolder text is a little wider, so the items to its right will shift across slightly as you move along the menu.',
					'sgs-blocks'
				) }
			</p>

			{ /* Block-private, Menu target only (FR-41-29). ⛔ Fed
			   `SGS_FONT_WEIGHT_OPTIONS` from the shared barrel — NOT a number input and
			   NOT a hand-typed weight array. The anti-pattern is on this same block:
			   `featuredFontWeight` is number-typed with its own four-option array. Do
			   not reproduce it. It is the ONLY Current-state typography field —
			   `itemTextDecorationCurrent` is deliberately not declared (FR-41-6
			   consequence 2): Current gets ONE signal, and that signal is weight. */ }
			<SelectControl
				label={ __( 'Current-page weight', 'sgs-blocks' ) }
				value={ itemFontWeightCurrent ?? '600' }
				options={ SGS_FONT_WEIGHT_OPTIONS }
				onChange={ ( val ) => setAttributes( { itemFontWeightCurrent: val } ) }
				help={ __(
					'Makes the link for the page someone is on heavier than the rest, so they can tell where they are without relying on colour. Its hover counterpart is the item border’s own hover setting in the Colour panel.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</PanelBody>
	);
}
