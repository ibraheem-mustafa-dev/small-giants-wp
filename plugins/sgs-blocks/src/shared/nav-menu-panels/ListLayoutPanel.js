import { __ } from '@wordpress/i18n';
import { RangeControl } from '@wordpress/components';
import {
	SgsLengthControl,
	ResponsiveControl,
	ResponsiveOverride,
	SgsBoxControl,
	BOX_UNITS,
	normaliseResponsiveBox,
} from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

/**
 * SGS Nav Bar/Drawer Menu (shared, sgs/nav-bar-menu + sgs/nav-drawer-menu) —
 * Styles tab: "List layout" ToolsPanel (item gap, panel columns, padding).
 *
 * Reconciled from nav-menu/BarPanel.js (the bar's original name/panel) and
 * the drawer's own `ListLayoutPanel.js` (adapted independently from the same
 * source, D1059 split, 2026-09-14). Named `ListLayoutPanel` — chosen over
 * "BarPanel" because it now mounts on both blocks and "Bar" reads wrong on
 * the drawer. `gap`/`padding` are BOTH-classified and always render.
 *
 * `showColumnsControl` (drawer `true`, bar `false`) gates the "Columns"
 * `RangeControl` — `listColumns` is DRAWER-only (measured, classification
 * report): "a horizontal bar always stays one row" per the control's own
 * original help text, so rendering it on the bar wrote to an attribute the
 * bar's block.json never declares — the minor dead-control bug the plan's
 * Step 4 flagged, fixed here as part of this consolidation rather than as a
 * separate task.
 *
 * @param {Object}   root0                     Props.
 * @param {Object}   root0.gap                 The block's `gap` attribute, a tier object
 *                                             ({ desktop, tablet, mobile }; unset tiers inherit upward).
 * @param {boolean}  root0.showColumnsControl  True on `sgs/nav-drawer-menu`, false on
 *                                             `sgs/nav-bar-menu`.
 * @param {Object}   [root0.listColumns]       The block's `listColumns` attribute — drawer only.
 * @param {Object}   root0.padding             The block's `padding` attribute.
 * @param {Function} root0.setAttributes       The block's attribute setter.
 */
export default function ListLayoutPanel( {
	gap,
	showColumnsControl,
	listColumns,
	padding,
	setAttributes,
} ) {
	return (
		<ToolsPanel
			label={ __( 'List layout', 'sgs-blocks' ) }
			resetAll={ () =>
				setAttributes( {
					gap: { desktop: '8px' },
					padding: {},
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
				<ResponsiveOverride
					label={ __( 'Item gap', 'sgs-blocks' ) }
					value={ gap && typeof gap === 'object' ? gap : {} }
					onChange={ ( obj ) => setAttributes( { gap: obj } ) }
				>
					{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
						<SgsLengthControl
							label={ __( 'Item gap', 'sgs-blocks' ) }
							hideLabelFromVision
							help={ __(
								'Space between menu items at this device. Tablet and mobile follow desktop until set.',
								'sgs-blocks'
							) }
							value={ ownValue || '' }
							placeholder={ inherited ? effectiveValue : '' }
							onChange={ ( val ) => setOwnValue( val || undefined ) }
							presets={ false }
						/>
					) }
				</ResponsiveOverride>
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
		</ToolsPanel>
	);
}
