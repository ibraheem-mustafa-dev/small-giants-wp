/**
 * sgs/account — "Menu" inspector panel.
 *
 * Layout per device tier, icons on/off, per-endpoint icon (Lucide only — the
 * server-side `sgs_account_menu_icon_css()` helper resolves names through
 * `sgs_get_lucide_icon()`, so any other source would be a silently dead
 * control), and which optional endpoints to hide. Dashboard and Log out are
 * never offered here — `sgs_account_never_hide()` (PHP) refuses them anyway,
 * so offering the checkbox would be a control that pretends to work.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, ToggleControl, CheckboxControl } from '@wordpress/components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import { ResponsiveControl, IconPicker } from '../../components';
import { patchTier } from '../../utils';

const DEFAULT_MENU_ICONS = {
	dashboard: 'layout-dashboard',
	orders: 'package',
	'saved-items': 'heart',
	downloads: 'download',
	'edit-address': 'map-pin',
	'payment-methods': 'credit-card',
	'edit-account': 'user',
	'customer-logout': 'log-out',
};

// Endpoints an operator may legitimately hide (e.g. Downloads on a shop with
// nothing downloadable). Dashboard/Log out are deliberately absent — the
// server-side hide list refuses them regardless of what this control sends.
const HIDEABLE_ENDPOINTS = [
	{ key: 'downloads', label: __( 'Downloads', 'sgs-blocks' ) },
	{ key: 'payment-methods', label: __( 'Payment methods', 'sgs-blocks' ) },
	{ key: 'edit-address', label: __( 'Addresses', 'sgs-blocks' ) },
	{ key: 'saved-items', label: __( 'Saved items', 'sgs-blocks' ) },
];

/**
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @return {JSX.Element} Panel.
 */
export default function MenuPanel( { attributes, setAttributes } ) {
	const { navLayout, showMenuIcons, navIcons, hiddenEndpoints } = attributes;
	const icons = { ...DEFAULT_MENU_ICONS, ...( navIcons || {} ) };
	const hidden = Array.isArray( hiddenEndpoints ) ? hiddenEndpoints : [];

	const toggleHidden = ( endpoint, checked ) => {
		const next = checked
			? [ ...hidden, endpoint ]
			: hidden.filter( ( e ) => e !== endpoint );
		setAttributes( { hiddenEndpoints: Array.from( new Set( next ) ) } );
	};

	return (
		<PanelBody title={ __( 'Menu', 'sgs-blocks' ) } initialOpen>
			<ResponsiveControl label={ __( 'Menu layout', 'sgs-blocks' ) }>
				{ ( breakpoint ) => (
					<ToggleGroupControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						isBlock
						label={ __( 'Menu layout', 'sgs-blocks' ) }
						hideLabelFromVision
						value={
							navLayout?.[ breakpoint ] ??
							( 'desktop' === breakpoint ? 'sidebar' : 'tabs' )
						}
						onChange={ ( value ) =>
							patchTier( attributes, setAttributes, 'navLayout', breakpoint, value )
						}
					>
						<ToggleGroupControlOption value="sidebar" label={ __( 'Sidebar', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="tabs" label={ __( 'Scrolling tabs', 'sgs-blocks' ) } />
					</ToggleGroupControl>
				) }
			</ResponsiveControl>

			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Show menu icons', 'sgs-blocks' ) }
				checked={ ! isFalse( showMenuIcons ) }
				onChange={ ( value ) => setAttributes( { showMenuIcons: value } ) }
			/>

			{ showMenuIcons !== false &&
				Object.keys( DEFAULT_MENU_ICONS ).map( ( endpoint ) => (
					<IconPicker
						key={ endpoint }
						label={ menuItemLabel( endpoint ) }
						sources={ [ 'lucide' ] }
						value={ { source: 'lucide', name: icons[ endpoint ] } }
						onChange={ ( { name } ) =>
							setAttributes( { navIcons: { ...icons, [ endpoint ]: name } } )
						}
					/>
				) ) }

			<PanelBody title={ __( 'Hide menu items', 'sgs-blocks' ) } initialOpen={ false }>
				{ HIDEABLE_ENDPOINTS.map( ( { key, label } ) => (
					<CheckboxControl
						key={ key }
						__nextHasNoMarginBottom
						label={ label }
						checked={ hidden.includes( key ) }
						onChange={ ( checked ) => toggleHidden( key, checked ) }
					/>
				) ) }
			</PanelBody>
		</PanelBody>
	);
}

/**
 * @param {*} value Stored value.
 * @return {boolean} True only for an explicit `false`.
 */
function isFalse( value ) {
	return false === value;
}

/**
 * @param {string} endpoint Endpoint key.
 * @return {string} Human label for the icon picker.
 */
function menuItemLabel( endpoint ) {
	const labels = {
		dashboard: __( 'Dashboard icon', 'sgs-blocks' ),
		orders: __( 'Orders icon', 'sgs-blocks' ),
		'saved-items': __( 'Saved items icon', 'sgs-blocks' ),
		downloads: __( 'Downloads icon', 'sgs-blocks' ),
		'edit-address': __( 'Addresses icon', 'sgs-blocks' ),
		'payment-methods': __( 'Payment methods icon', 'sgs-blocks' ),
		'edit-account': __( 'Account details icon', 'sgs-blocks' ),
		'customer-logout': __( 'Log out icon', 'sgs-blocks' ),
	};
	return labels[ endpoint ] || endpoint;
}
