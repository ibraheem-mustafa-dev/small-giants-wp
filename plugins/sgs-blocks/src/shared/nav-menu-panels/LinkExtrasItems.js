import { __ } from '@wordpress/i18n';
import {
	SgsLengthControl,
	ResponsiveOverride,
	SgsBoxControl,
	BOX_UNITS,
	normaliseResponsiveBox,
} from '../../components';
import { ToolsPanelItem } from '../../components/primitives';

/**
 * SGS Nav Bar Menu — the "List layout" panel's top-level link extras, shown
 * on sgs/nav-bar-menu only: link minimum height, badge padding, badge corner
 * radius and the space before a badge. Rendered inside ListLayoutPanel's
 * ToolsPanel, which these items register with through context.
 *
 * @param {Object}   root0                       Props.
 * @param {Object}   root0.itemMinHeight         Tier object of lengths.
 * @param {Object}   root0.itemBadgePadding      Tier object of {top,right,bottom,left} boxes.
 * @param {string}   root0.itemBadgeBorderRadius A CSS length.
 * @param {string}   root0.itemBadgeGap          A CSS length.
 * @param {Function} root0.setAttributes         The block's attribute setter.
 */
export default function LinkExtrasItems( {
	itemMinHeight,
	itemBadgePadding,
	itemBadgeBorderRadius,
	itemBadgeGap,
	setAttributes,
} ) {
	return (
		<>
			<ToolsPanelItem
				hasValue={ () => Object.keys( itemMinHeight ?? {} ).length > 0 }
				label={ __( 'Link minimum height', 'sgs-blocks' ) }
				onDeselect={ () => setAttributes( { itemMinHeight: {} } ) }
			>
				<ResponsiveOverride
					value={ itemMinHeight }
					onChange={ ( obj ) => setAttributes( { itemMinHeight: obj } ) }
				>
					{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
						<SgsLengthControl
							presets={ false }
							label={ __( 'Link minimum height', 'sgs-blocks' ) }
							help={ __( 'Empty keeps the 44px touch-target height.', 'sgs-blocks' ) }
							value={ ownValue || '' }
							placeholder={ inherited ? effectiveValue : '44px' }
							onChange={ ( val ) => setOwnValue( val || '' ) }
						/>
					) }
				</ResponsiveOverride>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={ () => Object.keys( itemBadgePadding ?? {} ).length > 0 }
				label={ __( 'Badge padding', 'sgs-blocks' ) }
				onDeselect={ () => setAttributes( { itemBadgePadding: {} } ) }
			>
				<ResponsiveOverride
					value={ itemBadgePadding }
					onChange={ ( obj ) => setAttributes( { itemBadgePadding: obj } ) }
				>
					{ ( { ownValue, setOwnValue } ) => (
						<SgsBoxControl
							label={ __( 'Badge padding', 'sgs-blocks' ) }
							values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
							units={ BOX_UNITS }
							presets
							onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
						/>
					) }
				</ResponsiveOverride>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={ () => !! itemBadgeBorderRadius }
				label={ __( 'Badge corner radius', 'sgs-blocks' ) }
				onDeselect={ () => setAttributes( { itemBadgeBorderRadius: '' } ) }
			>
				<SgsLengthControl
					presets={ false }
					label={ __( 'Badge corner radius', 'sgs-blocks' ) }
					value={ itemBadgeBorderRadius || '' }
					onChange={ ( val ) => setAttributes( { itemBadgeBorderRadius: val || '' } ) }
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={ () => !! itemBadgeGap }
				label={ __( 'Space before badge', 'sgs-blocks' ) }
				onDeselect={ () => setAttributes( { itemBadgeGap: '' } ) }
			>
				<SgsLengthControl
					presets={ false }
					label={ __( 'Space before badge', 'sgs-blocks' ) }
					help={ __( 'The gap between a menu word and its badge (e.g. SOON).', 'sgs-blocks' ) }
					value={ itemBadgeGap || '' }
					onChange={ ( val ) => setAttributes( { itemBadgeGap: val || '' } ) }
				/>
			</ToolsPanelItem>
		</>
	);
}
