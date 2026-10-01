import { __ } from '@wordpress/i18n';
import { RangeControl } from '@wordpress/components';
import {
	ResponsiveControl,
	ResponsiveOverride,
	ResponsiveLengthControl,
	SgsBoxControl,
	BOX_UNITS,
	normaliseResponsiveBox,
} from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import LinkExtrasItems from './LinkExtrasItems';

/**
 * SGS Nav Bar/Drawer Menu (shared, sgs/nav-bar-menu + sgs/nav-drawer-menu) —
 * Styles tab: "List layout" ToolsPanel (item gap, panel columns, padding).
 *
 * Mounts on both blocks. `gap`/`padding` always render. `showColumnsControl`
 * (drawer `true`, bar `false`) gates the "Columns" control: `listColumns` is
 * drawer-only, because a horizontal bar always stays one row. The bar's
 * link extras come from LinkExtrasItems.js.
 *
 * @param {Object}   root0                     Props.
 * @param {Object}   root0.gap                 The block's `gap` attribute, a tier object
 *                                             ({ desktop, tablet, mobile }; unset tiers inherit upward).
 * @param {boolean}  root0.showColumnsControl  True on `sgs/nav-drawer-menu`, false on
 *                                             `sgs/nav-bar-menu`.
 * @param {Object}   [root0.listColumns]       The block's `listColumns` attribute — drawer only.
 * @param {Object}   root0.padding             The block's `padding` attribute.
 * @param {boolean}  [root0.showItemPadding]   True on `sgs/nav-bar-menu` only: shows
 *                                             "Link padding" (`itemPadding`) and the
 *                                             LinkExtrasItems rows.
 * @param {Object}   [root0.itemPadding]       The bar's `itemPadding` attribute, a tier
 *                                             object of {top,right,bottom,left} boxes.
 * @param {boolean}  [root0.showSubmenuLinkPadding] Shows "Dropdown link padding"
 *                                             (`submenuLinkPadding`) — Spec 36 "Item hover
 *                                             paint": the same per-device box control as
 *                                             `itemPadding`, for the submenu/dropdown/mega/
 *                                             accordion link instead of the top-level one.
 * @param {Object}   [root0.submenuLinkPadding] The block's `submenuLinkPadding` attribute, a
 *                                             tier object of {top,right,bottom,left} boxes.
 * @param {Function} root0.setAttributes       The block's attribute setter.
 */
export default function ListLayoutPanel( {
	gap,
	showColumnsControl,
	listColumns,
	padding,
	showItemPadding = false,
	itemPadding,
	itemMinHeight,
	itemBadgePadding,
	itemBadgeBorderRadius,
	itemBadgeGap,
	showSubmenuLinkPadding = false,
	submenuLinkPadding,
	setAttributes,
} ) {
	return (
		<ToolsPanel
			label={ __( 'List layout', 'sgs-blocks' ) }
			resetAll={ () =>
				setAttributes( {
					gap: { desktop: '8px' },
					padding: {},
					...( showItemPadding ? { itemPadding: {}, itemMinHeight: {}, itemBadgePadding: {}, itemBadgeBorderRadius: '', itemBadgeGap: '' } : {} ),
					...( showSubmenuLinkPadding ? { submenuLinkPadding: {} } : {} ),
				} )
			}
		>
			<ToolsPanelItem
				hasValue={ () =>
					!! gap &&
					typeof gap === 'object' &&
					Object.entries( gap ).some(
						( [ tier, value ] ) => !! value && ! ( tier === 'desktop' && value === '8px' )
					)
				}
				label={ __( 'Item gap', 'sgs-blocks' ) }
				onDeselect={ () => setAttributes( { gap: { desktop: '8px' } } ) }
				isShownByDefault
			>
				<ResponsiveLengthControl
					label={ __( 'Item gap', 'sgs-blocks' ) }
					help={ __(
						'Space between menu items at this device. Tablet and mobile follow desktop until set.',
						'sgs-blocks'
					) }
					value={ gap }
					onChange={ ( obj ) => setAttributes( { gap: obj } ) }
				/>
			</ToolsPanelItem>

			{ showColumnsControl && (
				<ResponsiveControl label={ __( 'Columns', 'sgs-blocks' ) }>
					{ ( breakpoint ) => (
						<RangeControl
							label={ __( 'Columns', 'sgs-blocks' ) }
							hideLabelFromVision
							help={ __(
								'How many columns this list uses inside the menu panel. 1 is the default.',
								'sgs-blocks'
							) }
							min={ 1 }
							max={ 4 }
							value={ listColumns?.[ breakpoint ] || 1 }
							onChange={ ( value ) =>
								setAttributes( {
									listColumns: { ...listColumns, [ breakpoint ]: value || undefined },
								} )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</ResponsiveControl>
			) }

			{ /*
			 * No Max width control here, deliberately (D540, Bean).
			 * These blocks are ALWAYS a child — of a site-header-row or of
			 * sgs/nav-drawer — and the parent owns width. Their own width is
			 * intrinsic to their items, and collapsed to a burger the bar
			 * wraps its content. A max-width here was a second, competing
			 * place to control the same thing, and the row's own width
			 * controls were wired at D539. Evidence at removal: no theme
			 * pattern set it and the live canary computed `max-width: none`.
			 */ }
			<ToolsPanelItem
				hasValue={ () =>
					Object.keys( padding ?? {} ).length > 0
				}
				label={ __( 'Padding', 'sgs-blocks' ) }
				onDeselect={ () =>
					setAttributes( { padding: {} } )
				}
				isShownByDefault
			>
				<ResponsiveOverride
					value={ padding }
					onChange={ ( obj ) => setAttributes( { padding: obj } ) }
				>
					{ ( { ownValue, setOwnValue } ) => (
						<SgsBoxControl
							label={ __( 'Padding', 'sgs-blocks' ) }
							values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
							units={ BOX_UNITS }
							presets
							onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
						/>
					) }
				</ResponsiveOverride>
			</ToolsPanelItem>

			{ showItemPadding && (
				<ToolsPanelItem
					hasValue={ () => Object.keys( itemPadding ?? {} ).length > 0 }
					label={ __( 'Link padding', 'sgs-blocks' ) }
					onDeselect={ () => setAttributes( { itemPadding: {} } ) }
					isShownByDefault
				>
					<ResponsiveOverride
						value={ itemPadding }
						onChange={ ( obj ) => setAttributes( { itemPadding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Link padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
				</ToolsPanelItem>
			) }

			{ showItemPadding && (
				<LinkExtrasItems
					itemMinHeight={ itemMinHeight }
					itemBadgePadding={ itemBadgePadding }
					itemBadgeBorderRadius={ itemBadgeBorderRadius }
					itemBadgeGap={ itemBadgeGap }
					setAttributes={ setAttributes }
				/>
			) }

			{ showSubmenuLinkPadding && (
				<ToolsPanelItem
					hasValue={ () => Object.keys( submenuLinkPadding ?? {} ).length > 0 }
					label={ __( 'Dropdown link padding', 'sgs-blocks' ) }
					onDeselect={ () => setAttributes( { submenuLinkPadding: {} } ) }
					isShownByDefault
				>
					<ResponsiveOverride
						value={ submenuLinkPadding }
						onChange={ ( obj ) => setAttributes( { submenuLinkPadding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Dropdown link padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
				</ToolsPanelItem>
			) }
		</ToolsPanel>
	);
}
