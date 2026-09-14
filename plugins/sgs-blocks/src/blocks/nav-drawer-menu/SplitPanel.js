/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — Settings tab panel: two-tier split.
 *
 * Step 8 of the nav-menu-split plan (D1059) — trimmed from
 * `nav-bar-menu/SplitPanel.js` (Step 6): only `splitAfterItemId` + `splitSide`
 * apply here — no `justifyContent` (the drawer has no flex-row layout to
 * justify) and no `showBurger` (this block never has one). Lets two
 * instances of this block share one menu as two visually distinct tiers
 * (e.g. a Playfair 34px "primary" list, then an Outfit 15px "secondary"
 * list), each instance keeping its own typography attrs, rather than the
 * old workaround of a second block with a hardcoded `itemFontSize`.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, Notice } from '@wordpress/components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

/**
 * @param {Object}   root0
 * @param {string}   root0.splitAfterItemId Block attribute — an item identifier
 *                                          from `resolvedItems`, or ''.
 * @param {string}   root0.splitSide        Block attribute — '' | 'before' | 'after'.
 * @param {Array}    root0.resolvedItems    From `useNavMenuSource()`.
 * @param {Function} root0.setAttributes
 */
export default function SplitPanel( {
	splitAfterItemId,
	splitSide,
	resolvedItems,
	setAttributes,
} ) {
	// Top-level only (depth 0) — splitting inside a submenu has no meaning.
	const topLevelItems = ( resolvedItems || [] ).filter(
		( item ) => 0 === item.depth
	);

	const splitPointOptions = [
		{ label: __( '— choose an item —', 'sgs-blocks' ), value: '' },
		...topLevelItems.map( ( item ) => ( {
			label: item.label,
			value: item.identifier,
		} ) ),
	];

	const isSplitting = 'before' === splitSide || 'after' === splitSide;
	const splitIdUnresolved =
		isSplitting &&
		!! splitAfterItemId &&
		! topLevelItems.some( ( item ) => item.identifier === splitAfterItemId );

	return (
		<PanelBody title={ __( 'Two-tier split', 'sgs-blocks' ) } initialOpen={ false }>
			<ToggleGroupControl
				label={ __( 'Split this menu', 'sgs-blocks' ) }
				help={ __(
					'Render only part of the menu — use a second copy of this block for the other part, e.g. a primary list then a secondary list.',
					'sgs-blocks'
				) }
				value={ splitSide || '' }
				isBlock
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				onChange={ ( value ) => {
					setAttributes( {
						splitSide: value || '',
						...( ! value ? { splitAfterItemId: '' } : {} ),
					} );
				} }
			>
				<ToggleGroupControlOption
					value=""
					label={ __( 'Whole menu', 'sgs-blocks' ) }
				/>
				<ToggleGroupControlOption
					value="before"
					label={ __( 'Before item', 'sgs-blocks' ) }
				/>
				<ToggleGroupControlOption
					value="after"
					label={ __( 'After item', 'sgs-blocks' ) }
				/>
			</ToggleGroupControl>

			{ isSplitting && (
				<SelectControl
					label={ __( 'Split point', 'sgs-blocks' ) }
					value={ splitAfterItemId || '' }
					options={ splitPointOptions }
					onChange={ ( val ) =>
						setAttributes( { splitAfterItemId: val } )
					}
					help={
						'before' === splitSide
							? __(
									'This instance renders every item up to and including the one chosen here.',
									'sgs-blocks'
							  )
							: __(
									'This instance renders every item after the one chosen here.',
									'sgs-blocks'
							  )
					}
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }

			{ splitIdUnresolved && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'The chosen split item no longer exists in this menu — rendering the FULL menu until you pick a new split point.',
						'sgs-blocks'
					) }
				</Notice>
			) }
		</PanelBody>
	);
}
