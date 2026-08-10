import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	TextControl,
} from '@wordpress/components';
import {
	ResponsiveOverride,
	SpacingControl,
	ResponsiveBoxControls,
	RowQuickInsertAppender,
	RowScrollBehaviourControls,
} from '../../components';

// Promoted common header elements (Spec 37 §3.5 / FR-37-34). Steering, not
// gating: the row still accepts ANY block via the normal inserter — this list
// only fast-paths the elements a header typically needs, as placeholder
// quick-insert buttons AND a prioritised position in the block inserter.
// Slugs verified against plugins/sgs-blocks/src/blocks/*/block.json.
const HEADER_PROMOTED = [
	{ slug: 'sgs/responsive-logo', label: __( 'Logo', 'sgs-blocks' ) },
	{ slug: 'sgs/nav-menu', label: __( 'Navigation', 'sgs-blocks' ) },
	{ slug: 'sgs/product-search', label: __( 'Search', 'sgs-blocks' ) },
	{ slug: 'sgs/cart', label: __( 'Cart', 'sgs-blocks' ) },
	{
		slug: 'sgs/button',
		variant: 'account',
		label: __( 'Account link', 'sgs-blocks' ),
		attributes: {
			label: __( 'My Account', 'sgs-blocks' ),
			url: '/my-account/',
			inheritStyle: 'outline',
		},
	},
	{
		slug: 'sgs/button',
		variant: 'cta',
		label: __( 'Call to action', 'sgs-blocks' ),
		attributes: {
			label: __( 'Get In Touch', 'sgs-blocks' ),
			inheritStyle: 'primary',
		},
	},
	{
		slug: 'sgs/business-info',
		variant: 'phone',
		label: __( 'Contact details', 'sgs-blocks' ),
		attributes: { displayType: 'phone' },
	},
];
const HEADER_PROMOTED_SLUGS = [
	...new Set( HEADER_PROMOTED.map( ( item ) => item.slug ) ),
];

// No allowedBlocks restriction: site-header-row is a container-equivalent (like
// sgs/container in free mode) — it accepts ANY block, not a curated palette. The
// row's job is layout, not gatekeeping content.

// Row layout maps to the shared wrapper's `layout` attr. Cluster = a wrapping
// flex row (unlike items: logo + nav + cart); Columns = an equal-width grid of
// N per device that stacks to 1 on mobile (same engine as the footer columns
// row). Every row chooses independently — its own block instance, own attrs.
const LAYOUT_OPTIONS = [
	{ label: __( 'Cluster (one line)', 'sgs-blocks' ), value: 'flex' },
	{ label: __( 'Columns (grid)', 'sgs-blocks' ), value: 'grid' },
];

// Distribution maps to the shared wrapper's justifyContent attr (cluster only).
const DISTRIBUTION_OPTIONS = [
	{ label: __( '— default (left) —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Spread apart', 'sgs-blocks' ), value: 'space-between' },
];

const ROW_LABELS = {
	top: __(
		'Top row — utility strip (contact, search, social)',
		'sgs-blocks'
	),
	middle: __( 'Middle row — logo, navigation, cart', 'sgs-blocks' ),
	bottom: __( 'Bottom row — message / business info', 'sgs-blocks' ),
};

// Bridge the three flat count attrs to the {desktop,tablet,mobile} object shape
// the ResponsiveOverride switcher expects — identical to site-footer-row.
const COUNT_ATTR = {
	desktop: 'columns',
	tablet: 'columnsTablet',
	mobile: 'columnsMobile',
};

// Cross-axis alignment of this row's children (align-items on the wrapper's
// grid/flex track) — read directly by SGS_Container_Wrapper as `verticalAlign`
// (class-sgs-container-wrapper.php:247, 668-669/681-682). Mirrors sgs/container's
// ALIGN_OPTIONS (ContainerWrapperControls.js) exactly for a consistent operator
// vocabulary across the framework. No block.json enum on this attr, so any of
// the four values is always a valid explicit choice — there is no separate
// "unset" state to protect.
const VERTICAL_ALIGN_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Bottom', 'sgs-blocks' ), value: 'end' },
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
];

// Cluster (flex) axis direction — block.json enum is ['', row, row-reverse,
// column, column-reverse] (site-header-row/block.json:187-197); the blank
// option is a real enum member (not a coerced-away value) so it is the correct
// reset path. Mirrors sgs/container's inline flexDirection options exactly.
const FLEX_DIRECTION_OPTIONS = [
	{ label: __( '— default (row) —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Row', 'sgs-blocks' ), value: 'row' },
	{ label: __( 'Row reverse', 'sgs-blocks' ), value: 'row-reverse' },
	{ label: __( 'Column', 'sgs-blocks' ), value: 'column' },
	{ label: __( 'Column reverse', 'sgs-blocks' ), value: 'column-reverse' },
];

// Grid-only: justify-items / align-content. block.json enums both include
// 'stretch' as their default member (site-header-row/block.json:234-243,
// 174-186) — 'stretch' IS the reset value, so no separate blank option exists
// or is needed.
const JUSTIFY_ITEMS_OPTIONS = [
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
	{ label: __( 'Start', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'end' },
];

const ALIGN_CONTENT_OPTIONS = [
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
	{ label: __( 'Start', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'end' },
	{ label: __( 'Space between', 'sgs-blocks' ), value: 'space-between' },
	{ label: __( 'Space around', 'sgs-blocks' ), value: 'space-around' },
	{ label: __( 'Space evenly', 'sgs-blocks' ), value: 'space-evenly' },
];

// Bridge the three flat gridTemplateColumns* string attrs (block.json:210-221 —
// all plain strings on THIS block, unlike site-footer-row where the desktop
// tier is an object) to the {desktop,tablet,mobile} shape ResponsiveOverride
// expects. Consumed unconditionally by the wrapper's legacy responsive-grid
// path (class-sgs-container-wrapper.php:1485-1500) — not gated behind the
// object-model flag, so this bridge is safe either way.
const GRID_TEMPLATE_COLUMNS_ATTR = {
	desktop: 'gridTemplateColumns',
	tablet: 'gridTemplateColumnsTablet',
	mobile: 'gridTemplateColumnsMobile',
};

// Same bridge for gridTemplateRows* — plain strings on both row blocks
// (block.json:222-233), read at class-sgs-container-wrapper.php:426-428 and
// emitted at :751-753 (base) / :1492-1493, 1542-1547 (responsive tiers).
const GRID_TEMPLATE_ROWS_ATTR = {
	desktop: 'gridTemplateRows',
	tablet: 'gridTemplateRowsTablet',
	mobile: 'gridTemplateRowsMobile',
};

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		rowSlot,
		layout,
		justifyContent,
		gap,
		columns,
		columnsTablet,
		columnsMobile,
		verticalAlign,
		flexDirection,
		justifyItems,
		alignContent,
		gridAutoRows,
		gridTemplateColumns,
		gridTemplateColumnsTablet,
		gridTemplateColumnsMobile,
		gridTemplateRows,
		gridTemplateRowsTablet,
		gridTemplateRowsMobile,
	} = attributes;

	const isGrid = 'grid' === layout;

	// Editor-preview only: "Show me the shrunk size" (Row behaviour panel).
	// Local UI state — never persisted, never rendered on the front end.
	const [ previewShrunk, setPreviewShrunk ] = useState( false );

	// The editor preview previously ignored the row's padding entirely, so an
	// operator could not see their own spacing OR what shrink would do to it.
	// Mirror the desktop tier here (the tier the editor canvas represents), and
	// halve top/bottom while previewing — the same 0.5 ratio render.php emits.
	const previewPad =
		( attributes.padding && attributes.padding.desktop ) || {};
	const halved = ( value ) => ( value ? `calc(${ value } / 2)` : value );
	const paddingPreview = {
		...( previewPad.top
			? {
					paddingTop: previewShrunk
						? halved( previewPad.top )
						: previewPad.top,
			  }
			: {} ),
		...( previewPad.bottom
			? {
					paddingBottom: previewShrunk
						? halved( previewPad.bottom )
						: previewPad.bottom,
			  }
			: {} ),
		...( previewPad.left ? { paddingLeft: previewPad.left } : {} ),
		...( previewPad.right ? { paddingRight: previewPad.right } : {} ),
	};

	// Empty-row detection drives the promoted quick-insert placeholder — once
	// the operator adds any block (promoted or otherwise), this reverts to
	// the normal (unrestricted) appender behaviour.
	const hasInnerBlocks = useSelect(
		( select ) =>
			!! select( blockEditorStore ).getBlock( clientId )?.innerBlocks
				?.length,
		[ clientId ]
	);

	const countValue = {
		...( columns !== undefined ? { desktop: columns } : {} ),
		...( columnsTablet !== undefined ? { tablet: columnsTablet } : {} ),
		...( columnsMobile !== undefined ? { mobile: columnsMobile } : {} ),
	};
	const onCountChange = ( obj ) =>
		setAttributes( {
			[ COUNT_ATTR.desktop ]: obj.desktop,
			[ COUNT_ATTR.tablet ]: obj.tablet,
			[ COUNT_ATTR.mobile ]: obj.mobile,
		} );

	const gridTemplateColumnsValue = {
		...( gridTemplateColumns ? { desktop: gridTemplateColumns } : {} ),
		...( gridTemplateColumnsTablet
			? { tablet: gridTemplateColumnsTablet }
			: {} ),
		...( gridTemplateColumnsMobile
			? { mobile: gridTemplateColumnsMobile }
			: {} ),
	};
	const onGridTemplateColumnsChange = ( obj ) =>
		setAttributes( {
			[ GRID_TEMPLATE_COLUMNS_ATTR.desktop ]: obj.desktop || '',
			[ GRID_TEMPLATE_COLUMNS_ATTR.tablet ]: obj.tablet || '',
			[ GRID_TEMPLATE_COLUMNS_ATTR.mobile ]: obj.mobile || '',
		} );

	const gridTemplateRowsValue = {
		...( gridTemplateRows ? { desktop: gridTemplateRows } : {} ),
		...( gridTemplateRowsTablet ? { tablet: gridTemplateRowsTablet } : {} ),
		...( gridTemplateRowsMobile ? { mobile: gridTemplateRowsMobile } : {} ),
	};
	const onGridTemplateRowsChange = ( obj ) =>
		setAttributes( {
			[ GRID_TEMPLATE_ROWS_ATTR.desktop ]: obj.desktop || '',
			[ GRID_TEMPLATE_ROWS_ATTR.tablet ]: obj.tablet || '',
			[ GRID_TEMPLATE_ROWS_ATTR.mobile ]: obj.mobile || '',
		} );

	// Editor preview mirrors the frontend: grid rows preview as an equal-count
	// column grid at the desktop tier; cluster rows NEVER wrap (D455) — they
	// yield by shrinking their children, mirroring style.css's nowrap lock. The
	// never-overflow guarantee (nowrap + min-width:0 + per-child floors) comes
	// from style.css.
	const previewStyle = isGrid
		? {
				display: 'grid',
				gridTemplateColumns: `repeat(${ columns || 3 }, 1fr)`,
				gap: ( gap && gap.desktop ) || '16px',
		  }
		: {
				display: 'flex',
				// D455 — mirrors the frontend lock. The row never wraps or
				// stacks; it yields by shrinking its children instead.
				flexWrap: 'nowrap',
				alignItems: 'center',
				// Matches block.json's gap default. This previously fell back to
				// `clamp(0.5rem, 2vw, 1.5rem)` while block.json said `16px`, so
				// the editor preview and the front end disagreed by up to 8px.
				gap: ( gap && gap.desktop ) || '16px',
				justifyContent: justifyContent || 'flex-start',
		  };

	const blockProps = useBlockProps( {
		className: `sgs-site-header-row${
			rowSlot ? ` sgs-site-header-row--${ rowSlot }` : ''
		}`,
		style: { ...previewStyle, ...paddingPreview },
	} );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		templateLock: false,
		orientation: 'horizontal',
		renderAppender: hasInnerBlocks
			? undefined
			: () => (
					<RowQuickInsertAppender
						clientId={ clientId }
						promoted={ HEADER_PROMOTED }
						label={ __( 'Add a header element', 'sgs-blocks' ) }
						instructions={ __(
							'Choose a common header element below, or use the block inserter (+) for anything else.',
							'sgs-blocks'
						) }
					/>
			  ),
		prioritizedInserterBlocks: HEADER_PROMOTED_SLUGS,
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Header row', 'sgs-blocks' ) }>
					{ rowSlot && (
						<p className="components-base-control__help">
							{ ROW_LABELS[ rowSlot ] || rowSlot }
						</p>
					) }
					<SelectControl
						label={ __( 'Row layout', 'sgs-blocks' ) }
						value={ layout || 'flex' }
						options={ LAYOUT_OPTIONS }
						onChange={ ( val ) => setAttributes( { layout: val } ) }
						help={ __(
							'Cluster: elements stay on one line at every screen size, shrinking to fit rather than stacking. Columns: an equal grid of N columns that stacks to 1 on mobile.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					{ isGrid && (
						<ResponsiveOverride
							label={ __( 'Columns', 'sgs-blocks' ) }
							value={ countValue }
							onChange={ onCountChange }
						>
							{ ( {
								ownValue,
								effectiveValue,
								inherited,
								setOwnValue,
							} ) => {
								const shown = inherited
									? effectiveValue
									: ownValue;
								return (
									<RangeControl
										value={
											typeof shown === 'number'
												? shown
												: 3
										}
										onChange={ ( val ) =>
											setOwnValue( val )
										}
										min={ 1 }
										max={ 6 }
										help={ __(
											'How many columns at this device. They stack to 1 on mobile automatically — leave a device blank to inherit the one above.',
											'sgs-blocks'
										) }
										__nextHasNoMarginBottom
									/>
								);
							} }
						</ResponsiveOverride>
					) }
					{ ! isGrid && (
						<SelectControl
							label={ __( 'Distribution', 'sgs-blocks' ) }
							value={ justifyContent || '' }
							options={ DISTRIBUTION_OPTIONS }
							onChange={ ( val ) =>
								setAttributes( { justifyContent: val } )
							}
							help={ __(
								'How elements spread across the row. They stay on one line at every screen size and shrink to fit, so nothing ever wraps or runs off the edge.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					) }
					<ResponsiveOverride
						label={ __( 'Gap between elements', 'sgs-blocks' ) }
						value={ gap }
						onChange={ ( obj ) => setAttributes( { gap: obj } ) }
					>
						{ ( {
							ownValue,
							effectiveValue,
							inherited,
							setOwnValue,
						} ) => (
							<SpacingControl
								freeInput
								value={ ownValue }
								placeholder={ inherited ? effectiveValue : '' }
								onChange={ setOwnValue }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>
				<PanelBody
					title={ __( 'Alignment & grid', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Vertical alignment', 'sgs-blocks' ) }
						value={ verticalAlign || 'center' }
						options={ VERTICAL_ALIGN_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { verticalAlign: val } )
						}
						help={ __(
							'How elements of different heights (e.g. a logo next to a shorter nav) line up across the row.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					{ ! isGrid && (
						<SelectControl
							label={ __( 'Flex direction', 'sgs-blocks' ) }
							value={ flexDirection || '' }
							options={ FLEX_DIRECTION_OPTIONS }
							onChange={ ( val ) =>
								setAttributes( { flexDirection: val } )
							}
							help={ __(
								'Reverses or stacks the row’s elements instead of the normal left-to-right order.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					) }
					{ isGrid && (
						<>
							<SelectControl
								label={ __( 'Justify items', 'sgs-blocks' ) }
								value={ justifyItems || 'stretch' }
								options={ JUSTIFY_ITEMS_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( { justifyItems: val } )
								}
								help={ __(
									'How each element sits inside its own column when narrower than the column.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
							<SelectControl
								label={ __( 'Align content', 'sgs-blocks' ) }
								value={ alignContent || 'stretch' }
								options={ ALIGN_CONTENT_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( { alignContent: val } )
								}
								help={ __(
									'Spacing between grid rows when this row has more than one row of elements.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
							<ResponsiveOverride
								label={ __(
									'Custom column template',
									'sgs-blocks'
								) }
								value={ gridTemplateColumnsValue }
								onChange={ onGridTemplateColumnsChange }
							>
								{ ( {
									ownValue,
									effectiveValue,
									inherited,
									setOwnValue,
								} ) => (
									<TextControl
										value={ ownValue }
										onChange={ setOwnValue }
										placeholder={
											inherited ? effectiveValue : ''
										}
										help={ __(
											"Advanced override — CSS grid-template-columns, e.g. '5fr 3fr'. Leave blank to use the Columns count above.",
											'sgs-blocks'
										) }
										__nextHasNoMarginBottom
									/>
								) }
							</ResponsiveOverride>
							<ResponsiveOverride
								label={ __( 'Row template', 'sgs-blocks' ) }
								value={ gridTemplateRowsValue }
								onChange={ onGridTemplateRowsChange }
							>
								{ ( {
									ownValue,
									effectiveValue,
									inherited,
									setOwnValue,
								} ) => (
									<TextControl
										value={ ownValue }
										onChange={ setOwnValue }
										placeholder={
											inherited ? effectiveValue : ''
										}
										help={ __(
											"CSS grid-template-rows, e.g. 'auto 1fr'. Leave blank for the browser default.",
											'sgs-blocks'
										) }
										__nextHasNoMarginBottom
									/>
								) }
							</ResponsiveOverride>
							<TextControl
								label={ __( 'Auto rows', 'sgs-blocks' ) }
								value={ gridAutoRows || '' }
								onChange={ ( val ) =>
									setAttributes( { gridAutoRows: val } )
								}
								help={ __(
									"Sets grid-auto-rows, e.g. '1fr' for equal-height rows or 'minmax(100px,auto)'.",
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
						</>
					) }
				</PanelBody>
				<ResponsiveBoxControls
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
				<RowScrollBehaviourControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					clientId={ clientId }
					previewShrunk={ previewShrunk }
					setPreviewShrunk={ setPreviewShrunk }
				/>
			</InspectorControls>

			<div { ...innerBlocksProps } />
		</>
	);
}
