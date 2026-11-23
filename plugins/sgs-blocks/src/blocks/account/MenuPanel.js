/**
 * sgs/account — "Menu" inspector panel.
 *
 * Layout per device tier, icons on/off, per-endpoint icon (Lucide only — the
 * server-side `sgs_account_menu_icon_css()` helper resolves names through
 * `sgs_get_lucide_icon()`, so any other source would be a silently dead
 * control), and which optional endpoints to hide. Log out is never offered here:
 * `sgs_account_never_hide()` (PHP) refuses it, so a checkbox would pretend to work.
 */
import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	ToggleControl,
	CheckboxControl,
	TextControl,
} from '@wordpress/components';
import {
	ToggleGroupControl,
	ToggleGroupControlOption,
	ToolsPanel,
	ToolsPanelItem,
} from '../../components/primitives';
import {
	ResponsiveControl,
	ResponsiveOverride,
	IconPicker,
	SgsLengthControl,
	SgsBorderControl,
	ShadowControl,
} from '../../components';
import { Toggle, Choice, TextField } from './extraControls';
import { patchTier } from '../../utils';
import ScrollbarStyleControl from '../../components/ScrollbarStyleControl';

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
// nothing downloadable). Log out is deliberately absent: the server-side hide
// list refuses it regardless of what this control sends. With the Dashboard
// hidden, the account root shows the first visible tab.
const HIDEABLE_ENDPOINTS = [
	{ key: 'dashboard', label: __( 'Dashboard', 'sgs-blocks' ) },
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
		<>
			<ToolsPanel
				label={ __( 'Menu', 'sgs-blocks' ) }
				resetAll={ () =>
					setAttributes( {
						navLayout: undefined,
						scrollbarStyle: undefined,
						showMenuIcons: undefined,
						navIcons: undefined,
						menuActiveIndicatorWidth: undefined,
						menuActiveIndicatorStyle: undefined,
						menuOrdersCount: undefined,
						menuOrder: undefined,
						hideUnofferedTabs: undefined,
						tabHeadings: undefined,
						headingMarginBottom: undefined,
						menuItemBorderWidth: undefined,
						menuItemBorderStyle: undefined,
						menuItemBorderColour: undefined,
						menuItemShadow: undefined,
						menuItemShadowColour: undefined,
					} )
				}
			>
				<ToolsPanelItem
					label={ __( 'Menu layout', 'sgs-blocks' ) }
					hasValue={ () =>
						!! navLayout && Object.keys( navLayout ).length > 0
					}
					onDeselect={ () =>
						setAttributes( { navLayout: undefined } )
					}
					isShownByDefault
				>
					<ResponsiveControl
						label={ __( 'Menu layout', 'sgs-blocks' ) }
					>
						{ ( breakpoint ) => (
							<ToggleGroupControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								isBlock
								label={ __( 'Menu layout', 'sgs-blocks' ) }
								hideLabelFromVision
								value={
									navLayout?.[ breakpoint ] ??
									( 'desktop' === breakpoint
										? 'sidebar'
										: 'tabs' )
								}
								onChange={ ( value ) =>
									patchTier(
										attributes,
										setAttributes,
										'navLayout',
										breakpoint,
										value
									)
								}
							>
								<ToggleGroupControlOption
									value="sidebar"
									label={ __( 'Sidebar', 'sgs-blocks' ) }
								/>
								<ToggleGroupControlOption
									value="tabs"
									label={ __(
										'Scrolling tabs',
										'sgs-blocks'
									) }
								/>
							</ToggleGroupControl>
						) }
					</ResponsiveControl>
				</ToolsPanelItem>

				<ToolsPanelItem
					label={ __( 'Active item marker', 'sgs-blocks' ) }
					hasValue={ () => !! attributes.menuActiveIndicatorStyle }
					onDeselect={ () =>
						setAttributes( { menuActiveIndicatorStyle: undefined } )
					}
				>
					<Choice
						attributes={ attributes }
						setAttributes={ setAttributes }
						name="menuActiveIndicatorStyle"
						label={ __( 'Active item marker', 'sgs-blocks' ) }
						help={ __(
							'A line on the item’s edge keeps showing while the item has keyboard focus.',
							'sgs-blocks'
						) }
						options={ [
							{
								label: __(
									'Bar inside the item',
									'sgs-blocks'
								),
								value: '',
							},
							{
								label: __( 'Line on the edge', 'sgs-blocks' ),
								value: 'line',
							},
						] }
					/>
				</ToolsPanelItem>

				<ToolsPanelItem
					label={ __( 'Menu item border and shadow', 'sgs-blocks' ) }
					hasValue={ () =>
						!! attributes.menuItemBorderStyle ||
						!! attributes.menuItemBorderColour ||
						!! attributes.menuItemShadow ||
						( !! attributes.menuItemBorderWidth &&
							Object.keys( attributes.menuItemBorderWidth )
								.length > 0 )
					}
					onDeselect={ () =>
						setAttributes( {
							menuItemBorderWidth: undefined,
							menuItemBorderStyle: undefined,
							menuItemBorderColour: undefined,
							menuItemShadow: undefined,
							menuItemShadowColour: undefined,
						} )
					}
				>
					<SgsBorderControl
						widthValues={ attributes.menuItemBorderWidth ?? {} }
						onWidthChange={ ( next ) =>
							setAttributes( { menuItemBorderWidth: next } )
						}
						styleValue={ attributes.menuItemBorderStyle }
						onStyleChange={ ( val ) =>
							setAttributes( {
								menuItemBorderStyle: val || undefined,
							} )
						}
						colourLabel={ __(
							'Menu item border colour',
							'sgs-blocks'
						) }
						colourValue={ attributes.menuItemBorderColour }
						onColourChange={ ( val ) =>
							setAttributes( {
								menuItemBorderColour: val || undefined,
							} )
						}
						colourLinked
					/>
					<ShadowControl
						label={ __( 'Menu item shadow', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ {
							base: 'menuItemShadow',
							colour: 'menuItemShadowColour',
						} }
					/>
				</ToolsPanelItem>

				<ToolsPanelItem
					label={ __( 'Tab row scrollbar', 'sgs-blocks' ) }
					hasValue={ () => undefined !== attributes.scrollbarStyle }
					onDeselect={ () =>
						setAttributes( { scrollbarStyle: undefined } )
					}
				>
					<ScrollbarStyleControl
						label={ __( 'Tab row scrollbar', 'sgs-blocks' ) }
						help={ __(
							'Where the menu is a row of tabs (tablets and phones), the row scrolls sideways.',
							'sgs-blocks'
						) }
						value={ attributes.scrollbarStyle }
						start="hidden"
						onChange={ ( value ) =>
							setAttributes( { scrollbarStyle: value } )
						}
					/>
				</ToolsPanelItem>
				<ToolsPanelItem
					label={ __( 'Active item bar width', 'sgs-blocks' ) }
					hasValue={ () =>
						!! attributes.menuActiveIndicatorWidth &&
						Object.keys( attributes.menuActiveIndicatorWidth )
							.length > 0
					}
					onDeselect={ () =>
						setAttributes( { menuActiveIndicatorWidth: undefined } )
					}
				>
					<ResponsiveOverride
						label={ __( 'Active item bar width', 'sgs-blocks' ) }
						value={ attributes.menuActiveIndicatorWidth }
						onChange={ ( obj ) =>
							setAttributes( { menuActiveIndicatorWidth: obj } )
						}
					>
						{ ( {
							ownValue,
							effectiveValue,
							inherited,
							setOwnValue,
						} ) => (
							<SgsLengthControl
								presets
								label={ __(
									'Active item bar width',
									'sgs-blocks'
								) }
								hideLabelFromVision
								help={ __( 'Empty keeps 3px.', 'sgs-blocks' ) }
								value={ ownValue ?? '' }
								placeholder={ inherited ? effectiveValue : '' }
								onChange={ ( val ) =>
									setOwnValue( val || undefined )
								}
							/>
						) }
					</ResponsiveOverride>
				</ToolsPanelItem>
				<ToolsPanelItem
					label={ __(
						'Show the counts after Orders and Wishlist',
						'sgs-blocks'
					) }
					hasValue={ () => !! attributes.menuOrdersCount }
					onDeselect={ () =>
						setAttributes( { menuOrdersCount: undefined } )
					}
				>
					<Toggle
						attributes={ attributes }
						setAttributes={ setAttributes }
						name="menuOrdersCount"
						label={ __(
							'Show the counts after Orders and Wishlist',
							'sgs-blocks'
						) }
					/>
				</ToolsPanelItem>

				<ToolsPanelItem
					label={ __( 'Count on the Addresses tab', 'sgs-blocks' ) }
					hasValue={ () => !! attributes.menuAddressesCount }
					onDeselect={ () =>
						setAttributes( { menuAddressesCount: undefined } )
					}
				>
					<Toggle
						attributes={ attributes }
						setAttributes={ setAttributes }
						name="menuAddressesCount"
						label={ __(
							'Count on the Addresses tab',
							'sgs-blocks'
						) }
						help={ __(
							'How many of the customer’s delivery and billing addresses are filled in.',
							'sgs-blocks'
						) }
					/>
				</ToolsPanelItem>
				<ToolsPanelItem
					label={ __(
						'Tick on the Account details tab',
						'sgs-blocks'
					) }
					hasValue={ () => !! attributes.menuAccountTick }
					onDeselect={ () =>
						setAttributes( {
							menuAccountTick: undefined,
							menuAccountTickLabel: undefined,
						} )
					}
				>
					<Toggle
						attributes={ attributes }
						setAttributes={ setAttributes }
						name="menuAccountTick"
						label={ __(
							'Tick on the Account details tab',
							'sgs-blocks'
						) }
						help={ __(
							'Shows once the customer has a first name, a last name and an email address.',
							'sgs-blocks'
						) }
					/>
					{ attributes.menuAccountTick && (
						<TextField
							attributes={ attributes }
							setAttributes={ setAttributes }
							name="menuAccountTickLabel"
							label={ __(
								'Tick screen-reader text',
								'sgs-blocks'
							) }
							help={ __(
								'Empty uses “Details complete”.',
								'sgs-blocks'
							) }
						/>
					) }
				</ToolsPanelItem>
				<ToolsPanelItem
					label={ __(
						'Hide tabs the shop does not offer',
						'sgs-blocks'
					) }
					hasValue={ () => !! attributes.hideUnofferedTabs }
					onDeselect={ () =>
						setAttributes( { hideUnofferedTabs: undefined } )
					}
				>
					<Toggle
						attributes={ attributes }
						setAttributes={ setAttributes }
						name="hideUnofferedTabs"
						label={ __(
							'Hide tabs the shop does not offer',
							'sgs-blocks'
						) }
						help={ __(
							'Leaves out Downloads while no product sells a download, unless the customer already has one. Payment methods already shows only when a payment gateway can save cards.',
							'sgs-blocks'
						) }
					/>
				</ToolsPanelItem>
				<ToolsPanelItem
					label={ __( 'Menu order', 'sgs-blocks' ) }
					hasValue={ () =>
						Array.isArray( attributes.menuOrder ) &&
						attributes.menuOrder.length > 0
					}
					onDeselect={ () =>
						setAttributes( { menuOrder: undefined } )
					}
				>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Menu order', 'sgs-blocks' ) }
						help={ __(
							'Endpoint keys separated by commas, for example orders, edit-address, saved-items, edit-account. Unlisted items follow; Log out stays last. Empty keeps the default order.',
							'sgs-blocks'
						) }
						value={
							Array.isArray( attributes.menuOrder )
								? attributes.menuOrder.join( ', ' )
								: ''
						}
						onChange={ ( value ) => {
							const keys = String( value )
								.split( ',' )
								.map( ( key ) => key.trim() )
								.filter( Boolean );
							setAttributes( {
								menuOrder: keys.length ? keys : undefined,
							} );
						} }
					/>
				</ToolsPanelItem>

				<ToolsPanelItem
					label={ __( 'Heading on each tab', 'sgs-blocks' ) }
					hasValue={ () => !! attributes.tabHeadings }
					onDeselect={ () =>
						setAttributes( { tabHeadings: undefined } )
					}
				>
					<Toggle
						attributes={ attributes }
						setAttributes={ setAttributes }
						name="tabHeadings"
						label={ __( 'Heading on each tab', 'sgs-blocks' ) }
					/>
				</ToolsPanelItem>

				{ attributes.tabHeadings && (
					<ToolsPanelItem
						label={ __( 'Tab heading wording', 'sgs-blocks' ) }
						hasValue={ () =>
							!! (
								attributes.ordersTabHeading ||
								attributes.addressesTabHeading ||
								attributes.accountDetailsTabHeading ||
								attributes.savedItemsTabHeading
							)
						}
						onDeselect={ () =>
							setAttributes( {
								ordersTabHeading: undefined,
								addressesTabHeading: undefined,
								accountDetailsTabHeading: undefined,
								savedItemsTabHeading: undefined,
							} )
						}
					>
						<TextField
							attributes={ attributes }
							setAttributes={ setAttributes }
							name="ordersTabHeading"
							label={ __( 'Orders tab heading', 'sgs-blocks' ) }
							help={ __(
								'Empty uses the tab label.',
								'sgs-blocks'
							) }
						/>
						<TextField
							attributes={ attributes }
							setAttributes={ setAttributes }
							name="addressesTabHeading"
							label={ __(
								'Addresses tab heading',
								'sgs-blocks'
							) }
						/>
						<TextField
							attributes={ attributes }
							setAttributes={ setAttributes }
							name="accountDetailsTabHeading"
							label={ __(
								'Account details tab heading',
								'sgs-blocks'
							) }
						/>
						<TextField
							attributes={ attributes }
							setAttributes={ setAttributes }
							name="savedItemsTabHeading"
							label={ __(
								'Saved items tab heading',
								'sgs-blocks'
							) }
						/>
					</ToolsPanelItem>
				) }

				<ToolsPanelItem
					label={ __( 'Space under headings', 'sgs-blocks' ) }
					hasValue={ () =>
						!! attributes.headingMarginBottom &&
						Object.keys( attributes.headingMarginBottom ).length > 0
					}
					onDeselect={ () =>
						setAttributes( { headingMarginBottom: undefined } )
					}
				>
					<ResponsiveControl
						label={ __( 'Space under headings', 'sgs-blocks' ) }
					>
						{ ( breakpoint ) => (
							<SgsLengthControl
								presets
								hideLabelFromVision
								label={ __(
									'Space under headings',
									'sgs-blocks'
								) }
								help={ __(
									'Empty keeps 0.5rem.',
									'sgs-blocks'
								) }
								value={
									attributes.headingMarginBottom?.[
										breakpoint
									] ?? ''
								}
								onChange={ ( value ) =>
									patchTier(
										attributes,
										setAttributes,
										'headingMarginBottom',
										breakpoint,
										value
									)
								}
							/>
						) }
					</ResponsiveControl>
				</ToolsPanelItem>

				<ToolsPanelItem
					label={ __( 'Show menu icons', 'sgs-blocks' ) }
					hasValue={ () => undefined !== showMenuIcons }
					onDeselect={ () =>
						setAttributes( { showMenuIcons: undefined } )
					}
					isShownByDefault
				>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Show menu icons', 'sgs-blocks' ) }
						checked={ ! isFalse( showMenuIcons ) }
						onChange={ ( value ) =>
							setAttributes( { showMenuIcons: value } )
						}
					/>
				</ToolsPanelItem>

				<ToolsPanelItem
					label={ __( 'Menu icons', 'sgs-blocks' ) }
					hasValue={ () =>
						!! navIcons && Object.keys( navIcons ).length > 0
					}
					onDeselect={ () =>
						setAttributes( { navIcons: undefined } )
					}
				>
					{ showMenuIcons !== false &&
						Object.keys( DEFAULT_MENU_ICONS ).map( ( endpoint ) => (
							<IconPicker
								key={ endpoint }
								label={ menuItemLabel( endpoint ) }
								sources={ [ 'lucide' ] }
								value={ {
									source: 'lucide',
									name: icons[ endpoint ],
								} }
								onChange={ ( { name } ) =>
									setAttributes( {
										navIcons: {
											...icons,
											[ endpoint ]: name,
										},
									} )
								}
							/>
						) ) }
				</ToolsPanelItem>
			</ToolsPanel>

			<PanelBody
				title={ __( 'Hide menu items', 'sgs-blocks' ) }
				initialOpen={ false }
			>
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
		</>
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
