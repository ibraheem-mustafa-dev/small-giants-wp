import { __ } from '@wordpress/i18n';
import { BOX_UNITS, ResponsiveOverride, SgsBoxControl, normaliseResponsiveBox } from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

/**
 * sgs/nav-drawer-menu — Styles tab: "Submenu link padding" ToolsPanel.
 *
 * Spec 36 "Item hover paint" M-21 (2026-09-28): `submenuLinkPadding`, new
 * on both `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` (the two menu blocks
 * were one block; every item-level control belongs on both). Not folded
 * into the shared `src/shared/nav-menu-panels/ListLayoutPanel.js` — that
 * file is owned by the bar-menu work happening in parallel this session;
 * this is a small, block-scoped sibling panel instead, mounted next to it.
 *
 * @param {Object}   root0                       Props.
 * @param {Object}   root0.submenuLinkPadding     The block's `submenuLinkPadding`
 *                                                attribute, a tier object of
 *                                                {top,right,bottom,left} boxes.
 * @param {Function} root0.setAttributes          The block's attribute setter.
 */
export default function SubmenuLinkPaddingPanel( { submenuLinkPadding, setAttributes } ) {
	return (
		<ToolsPanel
			label={ __( 'Submenu link padding', 'sgs-blocks' ) }
			resetAll={ () => setAttributes( { submenuLinkPadding: {} } ) }
		>
			<ToolsPanelItem
				hasValue={ () => Object.keys( submenuLinkPadding ?? {} ).length > 0 }
				label={ __( 'Submenu link padding', 'sgs-blocks' ) }
				onDeselect={ () => setAttributes( { submenuLinkPadding: {} } ) }
				isShownByDefault
			>
				<ResponsiveOverride
					value={ submenuLinkPadding }
					onChange={ ( obj ) => setAttributes( { submenuLinkPadding: obj } ) }
				>
					{ ( { ownValue, setOwnValue } ) => (
						<SgsBoxControl
							label={ __( 'Submenu link padding', 'sgs-blocks' ) }
							hideLabelFromVision
							help={ __(
								'Padding inside each accordion sub-item. Empty keeps the default 0 16px.',
								'sgs-blocks'
							) }
							values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
							units={ BOX_UNITS }
							presets
							onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
						/>
					) }
				</ResponsiveOverride>
			</ToolsPanelItem>
		</ToolsPanel>
	);
}
