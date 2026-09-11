import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { IconPicker } from '../../components';

/**
 * SGS Nav Menu (sgs/nav-menu) — Styles tab: the "Submenu — Items" panel (Spec 41
 * §9.8 / FR-41-30b). NEW in step 14: everything specific to the LINKS inside a
 * dropdown or drawer panel, as distinct from the panel container itself (§9.9).
 *
 * ⛔ It CROSS-REFERENCES rather than duplicates. Colour rows live in the shared
 * Colour panel per the framework's placement rule, and submenu typography lives on
 * the Typography panel's own "Submenu" target — a second live control writing either
 * would be a duplicate writer, which `check-duplicate-controls.js` bans.
 *
 * @param {Object}   root0                   Props.
 * @param {Object}   root0.sublinkMarkerIcon `sublinkMarkerIcon` — `{ source, name }`.
 * @param {Function} root0.setAttributes     The block's attribute setter.
 */
export default function SubmenuItemsPanel( { sublinkMarkerIcon, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Submenu — Items', 'sgs-blocks' ) } initialOpen={ false }>
			<IconPicker
				label={ __( 'Marker icon', 'sgs-blocks' ) }
				value={ sublinkMarkerIcon || { source: 'lucide', name: 'chevron-right' } }
				onChange={ ( next ) => setAttributes( { sublinkMarkerIcon: next } ) }
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

			{ /* ⛔ A NAMED GAP, not a fabricated control (§9.8, §12). There is no
			   submenu-LINK padding attribute on this block — `submenuPadding` belongs
			   to the PANEL and lives in "Submenu — Container". Inventing one here would
			   be a control writing to an attribute nothing declares or renders. The
			   slot is named so the absence reads as a decision rather than an
			   oversight. */ }
			<p className="components-base-control__help">
				{ __(
					'Spacing: there is no separate spacing setting for an individual link yet — the panel’s own inner spacing, under Submenu — Container, is what sets the room around them.',
					'sgs-blocks'
				) }
			</p>
		</PanelBody>
	);
}
