import {
	BOX_UNITS,
	ResponsiveOverride,
	SgsBoxControl,
	normaliseResponsiveBox,
} from '../../components';

/**
 * SGS nav menus (sgs/nav-bar-menu + sgs/nav-drawer-menu) — the `submenuLinkPadding` row (Spec 36 "Item hover paint"
 * M-21): the padding inside each link of a dropdown, mega panel or accordion section, as distinct from the top-level
 * link's `itemPadding`. One per-device box. The bar draws it in "Submenu — Container" (label "Dropdown link padding"),
 * the drawer in "Submenu — Items" (label "Submenu link padding").
 *
 * @param {Object}   root0               Props.
 * @param {string}   root0.label         Visible label.
 * @param {string}   [root0.help]        Help text under the control.
 * @param {Object}   root0.value         The block's `submenuLinkPadding` attribute, a tier object of {top,right,bottom,left} boxes.
 * @param {Function} root0.setAttributes The block's attribute setter.
 * @return {Element} The row.
 */
export default function SubmenuLinkPaddingRow( {
	label,
	help,
	value,
	setAttributes,
} ) {
	return (
		<ResponsiveOverride
			label={ label }
			value={ value }
			onChange={ ( obj ) => setAttributes( { submenuLinkPadding: obj } ) }
		>
			{ ( { ownValue, setOwnValue } ) => (
				<SgsBoxControl
					label={ label }
					help={ help }
					values={
						ownValue && typeof ownValue === 'object' ? ownValue : {}
					}
					units={ BOX_UNITS }
					presets
					onChange={ ( next ) =>
						setOwnValue( normaliseResponsiveBox( next ) )
					}
				/>
			) }
		</ResponsiveOverride>
	);
}
