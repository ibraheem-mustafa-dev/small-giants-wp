import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { SgsBorderControl } from '../../components';

/**
 * SGS Nav Menu (sgs/nav-menu) — Styles tab: the "Menu item" panel (Spec 41 §9.7).
 *
 * ⚠ WHAT LEFT THIS PANEL IN STEP 14, each to a NAMED new home — nothing was
 * dropped:
 *   · the three hover-treatment selectors  -> the Colour panel, each directly
 *     beneath its own row's Hover swatch (§9.6 / FR-41-23). Keeping a second copy
 *     here would be a duplicate live writer per attribute, which
 *     `check-duplicate-controls.js` bans.
 *   · `TypographyControls`                 -> the restored "Typography" panel with
 *     its Menu/Submenu target switcher (§9.10 / FR-41-22).
 *   · the magnetic-hover toggle            -> the "Effects" panel (§9.11).
 *
 * ⛔ BORDER SHAPE ONLY. `showColour={ false }` suppresses `SgsBorderControl`'s own
 * swatch because border COLOUR is a three-state row in the Colour panel now
 * (FR-41-33). The split is EXCLUSIVE — exactly one live control writes each
 * attribute — so the swatch is NOT left here "for convenience".
 *
 * ⚠ `showColour={ false }` makes ten of the control's props inert (its own docblock
 * carries the list), the contrast trio among them. This mount passes none of them:
 * the contrast check lives on the Colour-panel row, where the control that performs
 * it is actually rendered.
 *
 * ⚠ `showRadiusResponsive={ false }` — the item radius is base-only on this block.
 *
 * @param {Object}   root0                  Props.
 * @param {Object}   root0.itemBorderWidth  `itemBorderWidth`  — box object, base only.
 * @param {string}   root0.itemBorderStyle  `itemBorderStyle`  — solid | dashed | dotted | ''.
 * @param {Object}   root0.itemBorderRadius `itemBorderRadius`.
 * @param {Function} root0.setAttributes    The block's attribute setter.
 */
export default function ItemsPanel( {
	itemBorderWidth,
	itemBorderStyle,
	itemBorderRadius,
	setAttributes,
} ) {
	return (
		<PanelBody title={ __( 'Menu item', 'sgs-blocks' ) } initialOpen={ false }>
			<SgsBorderControl
				label={ __( 'Border', 'sgs-blocks' ) }
				showColour={ false }
				showRadiusResponsive={ false }
				widthValues={ itemBorderWidth || {} }
				onWidthChange={ ( next ) => setAttributes( { itemBorderWidth: next || {} } ) }
				styleValue={ itemBorderStyle }
				onStyleChange={ ( next ) => setAttributes( { itemBorderStyle: next || '' } ) }
				radiusValues={ itemBorderRadius || {} }
				onRadiusChange={ ( next ) => setAttributes( { itemBorderRadius: next || {} } ) }
			/>
			<p className="components-base-control__help">
				{ __(
					'The colour of this border — resting, on hover and on the current page — is in the Colour panel above, so you can match it against the item’s text and background.',
					'sgs-blocks'
				) }
			</p>
		</PanelBody>
	);
}
