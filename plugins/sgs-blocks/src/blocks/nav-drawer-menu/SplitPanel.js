/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — Settings tab panel: "Layout".
 * Counterpart of `nav-bar-menu/SplitPanel.js`: `justifyContent` (how a row's
 * content is spread across the row), `itemHoverScope` (which rows take the
 * hover paint) and the two-tier split (`splitAfterItemId` + `splitSide`) apply
 * here — no `showBurger` (this block never has one). The split lets two
 * instances of this block share one menu as two visually distinct tiers
 * (e.g. a Playfair 34px "primary" list, then an Outfit 15px "secondary"
 * list), each instance keeping its own typography attrs.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, Notice } from '@wordpress/components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

const JUSTIFY_CONTENT_OPTIONS = [
	{ label: __( '— default (start) —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Start', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Space between', 'sgs-blocks' ), value: 'space-between' },
	{ label: __( 'Space around', 'sgs-blocks' ), value: 'space-around' },
];

/**
 * @param {Object}   root0
 * @param {string}   root0.justifyContent   Block attribute.
 * @param {string}   root0.itemHoverScope   Block attribute — 'all' | 'with-submenu'.
 * @param {string}   root0.splitAfterItemId Block attribute — an item identifier
 *                                          from `resolvedItems`, or ''.
 * @param {string}   root0.splitSide        Block attribute — '' | 'before' | 'after'.
 * @param {Array}    root0.resolvedItems    From `useNavMenuSource()`.
 * @param {Function} root0.setAttributes
 */
export default function SplitPanel( {
	justifyContent,
	itemHoverScope,
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
		<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
			<SelectControl
				label={ __( 'Justify row content', 'sgs-blocks' ) }
				value={ justifyContent || '' }
				options={ JUSTIFY_CONTENT_OPTIONS }
				onChange={ ( val ) => setAttributes( { justifyContent: val } ) }
				help={ __(
					'How the ornament, label, image and icon of each row are spread across the row. Centre also keeps the label on the row’s true centre.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>

			<SelectControl
				label={ __( 'Hover colour applies to', 'sgs-blocks' ) }
				value={ itemHoverScope || 'all' }
				options={ [
					{
						label: __( 'Every top-level row', 'sgs-blocks' ),
						value: 'all',
					},
					{
						label: __( 'Only rows that open a section', 'sgs-blocks' ),
						value: 'with-submenu',
					},
				] }
				onChange={ ( val ) =>
					setAttributes( { itemHoverScope: val || 'all' } )
				}
				help={ __(
					'A plain link row with nothing to open (e.g. Home) stays visually inert on hover when set to the second option.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>

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
