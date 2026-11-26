import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { IconPicker } from '../../components';
import SubmenuLinkPaddingRow from './SubmenuLinkPaddingRow';

/**
 * SGS Nav Bar/Drawer Menu (shared, sgs/nav-bar-menu + sgs/nav-drawer-menu) — Styles tab: the "Submenu — Items" panel (Spec 36 §14
 * §9.8 / FR-41-30b). NEW in step 14: everything specific to the LINKS inside a
 * dropdown or drawer panel, as distinct from the panel container itself (§9.9).
 *
 * ⛔ It CROSS-REFERENCES rather than duplicates. Colour rows live in the shared
 * Colour panel per the framework's placement rule, and submenu typography lives on
 * the Typography panel's own "Submenu" target — a second live control writing either
 * would be a duplicate writer, which `check-duplicate-controls.js` bans.
 *
 * @param {Object}   root0                    Props.
 * @param {Object}   root0.sublinkMarkerIcon  `sublinkMarkerIcon` — `{ source, name }`.
 * @param {Object}   root0.submenuLinkPadding `submenuLinkPadding` — a tier object of {top,right,bottom,left} boxes.
 * @param {Function} root0.setAttributes      The block's attribute setter.
 */
export default function SubmenuItemsPanel( {
	sublinkMarkerIcon,
	submenuLinkPadding,
	setAttributes,
} ) {
	return (
		<PanelBody
			title={ __( 'Submenu — Items', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<IconPicker
				label={ __( 'Marker icon', 'sgs-blocks' ) }
				value={
					sublinkMarkerIcon || {
						source: 'lucide',
						name: 'chevron-right',
					}
				}
				onChange={ ( next ) =>
					setAttributes( { sublinkMarkerIcon: next } )
				}
			/>
			<p className="components-base-control__help">
				{ __(
					'The small mark beside each link inside an open menu panel. It is decoration only, so screen readers skip it.',
					'sgs-blocks'
				) }
			</p>

			<p className="components-base-control__help">
				{ __(
					'Colour — link text, link background, their hover settings, and this marker’s colour — is in the Colour panel above, under Submenu.',
					'sgs-blocks'
				) }
			</p>
			<p className="components-base-control__help">
				{ __(
					'Font, size, weight and spacing for these links are in the Typography panel above, on its Submenu tab.',
					'sgs-blocks'
				) }
			</p>

			<SubmenuLinkPaddingRow
				label={ __( 'Submenu link padding', 'sgs-blocks' ) }
				help={ __(
					'Padding inside each accordion sub-item. Empty keeps the default 0 16px.',
					'sgs-blocks'
				) }
				value={ submenuLinkPadding }
				setAttributes={ setAttributes }
			/>
		</PanelBody>
	);
}
