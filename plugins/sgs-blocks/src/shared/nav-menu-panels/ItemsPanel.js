import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl } from '@wordpress/components';
import { SgsBorderControl, SgsLengthControl } from '../../components';

/**
 * SGS Nav Bar/Drawer Menu (shared, sgs/nav-bar-menu + sgs/nav-drawer-menu) — Styles tab: the "Menu item" panel (Spec 41 §9.7).
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
 * @param {Object}   root0                     Props.
 * @param {Object}   root0.itemBorderWidth     `itemBorderWidth`  — box object, base only.
 * @param {string}   root0.itemBorderStyle     `itemBorderStyle`  — solid | dashed | dotted | ''.
 * @param {Object}   root0.itemBorderRadius    `itemBorderRadius`.
 * @param {number}   [root0.itemOpacity]       `itemOpacity` — resting opacity, 0 to 1, no default.
 * @param {number}   [root0.itemOpacityHover]  `itemOpacityHover` — hover/focus-visible opacity, 0 to 1, no default.
 * @param {string}   [root0.itemPaddingShiftHover] `itemPaddingShiftHover` — hover-only inline-start padding growth, no default.
 * @param {number}   [root0.submenuOpacity]       `submenuOpacity` — the SUBLINK's own resting opacity, 0 to 1, no default. Genuinely separate from itemOpacity (fantasy needs opposite directions on the two elements).
 * @param {number}   [root0.submenuOpacityHover]  `submenuOpacityHover` — the sublink's own hover/focus-visible opacity, 0 to 1, no default.
 * @param {Function} root0.setAttributes       The block's attribute setter.
 */
export default function ItemsPanel( {
	itemBorderWidth,
	itemBorderStyle,
	itemBorderRadius,
	itemOpacity,
	itemOpacityHover,
	itemPaddingShiftHover,
	submenuOpacity,
	submenuOpacityHover,
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
			{ /* M-21 — item hover paint. No default in block.json for either
			   opacity attribute, so `undefined` is passed through as-is (an
			   untouched RangeControl shows no thumb offset / "Reset" state);
			   `allowReset` clears back to that same undefined, matching
			   "no default = no rule". */ }
			<RangeControl
				label={ __( 'Opacity', 'sgs-blocks' ) }
				value={ itemOpacity }
				onChange={ ( val ) => setAttributes( { itemOpacity: val } ) }
				min={ 0 }
				max={ 1 }
				step={ 0.05 }
				allowReset
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<RangeControl
				label={ __( 'Opacity on hover', 'sgs-blocks' ) }
				value={ itemOpacityHover }
				onChange={ ( val ) => setAttributes( { itemOpacityHover: val } ) }
				min={ 0 }
				max={ 1 }
				step={ 0.05 }
				allowReset
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<SgsLengthControl
				label={ __( 'Padding shift on hover', 'sgs-blocks' ) }
				help={ __(
					'Grows the item’s inline-start padding by this much on hover/focus, on top of whatever padding it already has at rest. Also applies to the dropdown/mega submenu link.',
					'sgs-blocks'
				) }
				value={ itemPaddingShiftHover || '' }
				onChange={ ( val ) => setAttributes( { itemPaddingShiftHover: val || '' } ) }
				presets={ false }
			/>
			{ /* M-21 — the SUBMENU link's own opacity pair, genuinely separate
			   from the item pair above (fantasy needs the two elements to move
			   in OPPOSITE directions: item 1 to 0.5, submenu 0.6 to 1). Same
			   "no default = no rule" shape as the item pair. */ }
			<RangeControl
				label={ __( 'Submenu opacity', 'sgs-blocks' ) }
				value={ submenuOpacity }
				onChange={ ( val ) => setAttributes( { submenuOpacity: val } ) }
				min={ 0 }
				max={ 1 }
				step={ 0.05 }
				allowReset
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<RangeControl
				label={ __( 'Submenu opacity on hover', 'sgs-blocks' ) }
				value={ submenuOpacityHover }
				onChange={ ( val ) => setAttributes( { submenuOpacityHover: val } ) }
				min={ 0 }
				max={ 1 }
				step={ 0.05 }
				allowReset
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</PanelBody>
	);
}
