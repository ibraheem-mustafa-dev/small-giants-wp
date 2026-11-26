import { __ } from '@wordpress/i18n';
import {
	SgsLengthControl,
	SgsGapControl,
	ResponsiveOverride,
	SgsBoxControl,
	BOX_UNITS,
	normaliseResponsiveBox,
} from '../../components';

/**
 * One per-device four-sided box row (a link or badge padding).
 *
 * @param {Object}   root0          Props.
 * @param {string}   root0.label    Visible label.
 * @param {Object}   root0.value    Tier object of {top,right,bottom,left} boxes.
 * @param {Function} root0.onChange Receives the whole next tier object.
 * @param {string}   [root0.help]   Help text under the control.
 * @return {Element} The row.
 */
function PaddingRow( { label, value, onChange, help } ) {
	return (
		<ResponsiveOverride
			label={ label }
			value={ value }
			onChange={ onChange }
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

/**
 * SGS nav menus (sgs/nav-bar-menu + sgs/nav-drawer-menu) — the top-level link's spacing rows, drawn inside the
 * "Menu item" panel (`ItemsPanel` `children`): link padding, link minimum height and, with `showItemGap`
 * (sgs/nav-drawer-menu only), the space between a link's own parts.
 *
 * @param {Object}   root0               Props.
 * @param {Object}   root0.itemPadding   Tier object of {top,right,bottom,left} boxes.
 * @param {Object}   root0.itemMinHeight Tier object of lengths.
 * @param {boolean}  [root0.showItemGap] True on `sgs/nav-drawer-menu` only: shows "Space between a link's parts".
 * @param {Object}   [root0.itemGap]     Tier object of gap values (one length, or `row column`).
 * @param {Function} root0.setAttributes The block's attribute setter.
 * @return {Element} The rows.
 */
export function LinkSpacingRows( {
	itemPadding,
	itemMinHeight,
	showItemGap = false,
	itemGap,
	setAttributes,
} ) {
	return (
		<>
			<PaddingRow
				label={ __( 'Link padding', 'sgs-blocks' ) }
				value={ itemPadding }
				onChange={ ( obj ) => setAttributes( { itemPadding: obj } ) }
			/>

			<ResponsiveOverride
				label={ __( 'Link minimum height', 'sgs-blocks' ) }
				value={ itemMinHeight }
				onChange={ ( obj ) => setAttributes( { itemMinHeight: obj } ) }
			>
				{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
					<SgsLengthControl
						presets={ false }
						label={ __( 'Link minimum height', 'sgs-blocks' ) }
						help={ __(
							'Empty keeps the 44px touch-target height.',
							'sgs-blocks'
						) }
						value={ ownValue || '' }
						placeholder={ inherited ? effectiveValue : '44px' }
						onChange={ ( val ) => setOwnValue( val || '' ) }
					/>
				) }
			</ResponsiveOverride>

			{ showItemGap && (
				<ResponsiveOverride
					label={ __( 'Space between a link’s parts', 'sgs-blocks' ) }
					value={ itemGap }
					onChange={ ( obj ) => setAttributes( { itemGap: obj } ) }
				>
					{ ( {
						ownValue,
						effectiveValue,
						inherited,
						setOwnValue,
					} ) => (
						<SgsGapControl
							label={ __(
								'Space between a link’s parts',
								'sgs-blocks'
							) }
							help={ __(
								'The space between a row’s parts: its label and a trailing icon or arrow, an ornament, a badge. Empty keeps the row as it is.',
								'sgs-blocks'
							) }
							value={ ownValue || '' }
							placeholder={ inherited ? effectiveValue : '' }
							onChange={ ( val ) => setOwnValue( val || '' ) }
						/>
					) }
				</ResponsiveOverride>
			) }
		</>
	);
}

/**
 * SGS nav menus — the badge's spacing rows: badge padding, badge corner radius and the space before a badge. Drawn
 * inside the drawer menu's "Badge" panel and the bar menu's "Menu item" panel (the bar has no Badge panel).
 *
 * @param {Object}   root0                       Props.
 * @param {Object}   root0.itemBadgePadding      Tier object of {top,right,bottom,left} boxes.
 * @param {string}   root0.itemBadgeBorderRadius A CSS length.
 * @param {string}   root0.itemBadgeGap          A CSS length.
 * @param {Function} root0.setAttributes         The block's attribute setter.
 * @return {Element} The rows.
 */
export function BadgeSpacingRows( {
	itemBadgePadding,
	itemBadgeBorderRadius,
	itemBadgeGap,
	setAttributes,
} ) {
	return (
		<>
			<PaddingRow
				label={ __( 'Badge padding', 'sgs-blocks' ) }
				value={ itemBadgePadding }
				onChange={ ( obj ) =>
					setAttributes( { itemBadgePadding: obj } )
				}
			/>

			<SgsLengthControl
				presets={ false }
				label={ __( 'Badge corner radius', 'sgs-blocks' ) }
				value={ itemBadgeBorderRadius || '' }
				onChange={ ( val ) =>
					setAttributes( { itemBadgeBorderRadius: val || '' } )
				}
			/>

			<SgsLengthControl
				presets={ false }
				label={ __( 'Space before badge', 'sgs-blocks' ) }
				help={ __(
					'The gap between a menu word and its badge (e.g. SOON).',
					'sgs-blocks'
				) }
				value={ itemBadgeGap || '' }
				onChange={ ( val ) =>
					setAttributes( { itemBadgeGap: val || '' } )
				}
			/>
		</>
	);
}
