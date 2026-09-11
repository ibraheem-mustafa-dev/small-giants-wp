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
 * SGS Nav Menu (sgs/nav-menu) — Styles tab: "Bar" ToolsPanel (item gap, panel
 * columns, padding).
 *
 * Split out of edit.js (Spec 41 step 7, pure refactor) to keep the file under
 * the project's 250-line JS budget. No behaviour change — verbatim JSX.
 *
 * @param {Object}   root0               Props.
 * @param {string}   root0.gap           The block's `gap` attribute.
 * @param {Object}   root0.listColumns   The block's `listColumns` attribute.
 * @param {Object}   root0.padding       The block's `padding` attribute (was
 *                                       read as `attributes.padding` in edit.js).
 * @param {Function} root0.setAttributes The block's attribute setter.
 */
export default function BarPanel( { gap, listColumns, padding, setAttributes } ) {
	return (
		<ToolsPanel
			label={ __( 'Bar', 'sgs-blocks' ) }
			resetAll={ () =>
				setAttributes( {
					gap: '8px',
					padding: {},
				} )
			}
		>
			<ToolsPanelItem
				hasValue={ () => !! gap && gap !== '8px' }
				label={ __( 'Item gap', 'sgs-blocks' ) }
				onDeselect={ () => setAttributes( { gap: '8px' } ) }
				isShownByDefault
			>
				<SgsLengthControl
					label={ __( 'Item gap', 'sgs-blocks' ) }
					value={ gap }
					onChange={ ( val ) =>
						setAttributes( { gap: val || '8px' } )
					}
					presets={ false }
				/>
			</ToolsPanelItem>

			<ResponsiveControl label={ __( 'Panel columns', 'sgs-blocks' ) }>
				{ ( breakpoint ) => (
					<RangeControl
						label={ __( 'Panel columns', 'sgs-blocks' ) }
						hideLabelFromVision
						help={ __(
							'How many columns this list uses when it renders inside a menu panel (a horizontal bar always stays one row). 1 is the default.',
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

			{ /*
			 * No Max width control here, deliberately (D540, Bean).
			 * sgs/nav-menu is ALWAYS a child — of a site-header-row or of
			 * sgs/nav-drawer — and the parent owns width. Its own width is
			 * intrinsic to its items, and collapsed to a burger it wraps its
			 * content. A max-width here was a second, competing place to
			 * control the same thing, and the row's own width controls were
			 * wired at D539. Evidence at removal: no theme pattern set it and
			 * the live canary computed `max-width: none`.
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
