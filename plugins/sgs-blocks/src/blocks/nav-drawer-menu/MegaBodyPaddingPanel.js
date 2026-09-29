import { __ } from '@wordpress/i18n';
import { BOX_UNITS, ResponsiveOverride, SgsBoxControl, normaliseResponsiveBox } from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

/**
 * sgs/nav-drawer-menu — Styles tab: "Mega panel padding" ToolsPanel.
 *
 * `megaBodyPadding`: the padding around a mega item's own panel inside its
 * drawer accordion (`.sgs-nav-drawer-menu__mega-body`, megaDrawerMode
 * 'panel', Spec 36 FR-36-6). Empty keeps style.css's 0 12px 12px.
 *
 * @param {Object}   root0                  Props.
 * @param {Object}   root0.megaBodyPadding  The block's `megaBodyPadding`
 *                                          attribute, a tier object of
 *                                          {top,right,bottom,left} boxes.
 * @param {Function} root0.setAttributes    The block's attribute setter.
 */
export default function MegaBodyPaddingPanel( { megaBodyPadding, setAttributes } ) {
	return (
		<ToolsPanel
			label={ __( 'Mega panel padding', 'sgs-blocks' ) }
			resetAll={ () => setAttributes( { megaBodyPadding: {} } ) }
		>
			<ToolsPanelItem
				hasValue={ () => Object.keys( megaBodyPadding ?? {} ).length > 0 }
				label={ __( 'Mega panel padding', 'sgs-blocks' ) }
				onDeselect={ () => setAttributes( { megaBodyPadding: {} } ) }
				isShownByDefault
			>
				<ResponsiveOverride
					value={ megaBodyPadding }
					onChange={ ( obj ) => setAttributes( { megaBodyPadding: obj } ) }
				>
					{ ( { ownValue, setOwnValue } ) => (
						<SgsBoxControl
							label={ __( 'Mega panel padding', 'sgs-blocks' ) }
							hideLabelFromVision
							help={ __(
								'Space around a mega item’s panel when it opens in the drawer. Empty keeps the default 0 12px 12px.',
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
