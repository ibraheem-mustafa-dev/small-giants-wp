import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';

/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — Settings tab: the
 * "Accessibility" panel (navLabel + itemSmartContrast).
 *
 * SPLIT (not moved), per D1059 ruling 6 / the plan's Step 2 instructions —
 * `navLabel` and `itemSmartContrast` are BOTH-classified (measured: both
 * forks read them), so both `sgs/nav-bar-menu` and this block need a copy of
 * this Accessibility panel. The other two PanelBodies in nav-menu's original
 * `DropdownSettingsPanel.js` do NOT come along:
 *   - "Menu panel" (the `drawerRef` text field, pairing a burger with the
 *     drawer it opens) is BAR-only — this block has no burger of its own.
 *   - "Dropdown menus" (`submenuAlign`/`submenuCaret`/`submenuCloseGrace`)
 *     is BAR-only (measured) — this block's accordion has no floating panel
 *     to align, no caret-disclosure-arrow choice (the `<details>` marker is
 *     the disclosure), and no close-on-pointer-leave grace period.
 *
 * @param {Object}   root0                Props.
 * @param {string}   root0.navLabel       The block's `navLabel` attribute.
 * @param {boolean}  root0.itemSmartContrast The block's `itemSmartContrast` attribute.
 * @param {Function} root0.setAttributes  The block's attribute setter.
 */
export default function DropdownSettingsPanel( {
	navLabel,
	itemSmartContrast,
	setAttributes,
} ) {
	return (
		<PanelBody title={ __( 'Accessibility', 'sgs-blocks' ) } initialOpen={ false }>
			<TextControl
				label={ __( 'Navigation label', 'sgs-blocks' ) }
				value={ navLabel }
				placeholder={ __(
					'Auto — from the menu name',
					'sgs-blocks'
				) }
				onChange={ ( val ) =>
					setAttributes( { navLabel: val } )
				}
				help={ __(
					'Accessible name for this menu landmark. Leave blank to use the chosen menu’s own name, so this drawer’s menu and the header bar are named apart automatically. Set it only to override that (e.g. Primary, Footer).',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>

			<ToggleControl
				label={ __( 'Keep text readable automatically', 'sgs-blocks' ) }
				checked={ itemSmartContrast === true }
				onChange={ ( val ) => setAttributes( { itemSmartContrast: val } ) }
				help={ __(
					'When you set a background, we can check your text colour stays readable against it and swap in a readable one if it doesn’t. Off by default, so your chosen colour always renders exactly as picked — switch this on to have it corrected automatically instead.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
			/>
		</PanelBody>
	);
}
