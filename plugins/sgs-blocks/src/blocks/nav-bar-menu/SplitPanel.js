/**
 * SGS Nav Bar Menu (sgs/nav-bar-menu) — Settings tab panel: split-nav layout.
 *
 * Step 6 of the nav-menu-split plan (D1059) — BAR-ONLY, net-new this step.
 * Lets an operator run the SAME menu as two block instances either side of a
 * centred logo (e.g. `sgs/site-header-row` with a `1fr auto 1fr`
 * `ColumnShapePicker` shape): one instance renders everything up to a chosen
 * item, the other renders everything after it, and only one of the two shows
 * a burger.
 *
 * `splitAfterItemId` is keyed to the SAME item identifier scheme
 * `featuredItemIds` already uses (`useNavMenuSource`'s `resolvedItems`), not
 * an index — an index would silently drop items the client adds later.
 * Top-level items only: splitting mid-submenu has no coherent bar/drawer
 * meaning.
 *
 * `justifyContent` is a plain restore — `style.css`'s `:where(.sgs-nav-bar-menu)
 * { justify-content: space-between; }` was ALREADY written to yield to an
 * attribute-driven rule (D539); this control is the first thing to set one.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	Notice,
} from '@wordpress/components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

const JUSTIFY_CONTENT_OPTIONS = [
	{ label: __( '— default (space between) —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Start', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Space between', 'sgs-blocks' ), value: 'space-between' },
	{ label: __( 'Space around', 'sgs-blocks' ), value: 'space-around' },
];

/**
 * @param {Object}   root0
 * @param {string}   root0.justifyContent   Block attribute.
 * @param {string}   root0.splitAfterItemId Block attribute — an item identifier
 *                                          from `resolvedItems`, or ''.
 * @param {string}   root0.splitSide        Block attribute — '' | 'before' | 'after'.
 * @param {boolean}  root0.showBurger       Block attribute.
 * @param {Array}    root0.resolvedItems    From `useNavMenuSource()` — used to
 *                                          build the split-point choices and to
 *                                          detect an unresolvable stored id.
 * @param {Function} root0.setAttributes
 */
export default function SplitPanel( {
	justifyContent,
	splitAfterItemId,
	splitSide,
	showBurger,
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
				label={ __( 'Justify items', 'sgs-blocks' ) }
				value={ justifyContent || '' }
				options={ JUSTIFY_CONTENT_OPTIONS }
				onChange={ ( val ) => setAttributes( { justifyContent: val } ) }
				help={ __(
					'How the menu items are spaced along the bar when they do not fill it.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>

			<ToggleGroupControl
				label={ __( 'Split this menu', 'sgs-blocks' ) }
				help={ __(
					'Render only part of the menu — use a second copy of this block for the other part, e.g. either side of a centred logo.',
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

			<ToggleControl
				label={ __( 'Show the burger menu button', 'sgs-blocks' ) }
				checked={ false !== showBurger }
				onChange={ ( val ) => setAttributes( { showBurger: val } ) }
				help={ __(
					'Turn off on a split instance that should never show its own burger — e.g. the right-hand half of a split menu.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
			/>
		</PanelBody>
	);
}
