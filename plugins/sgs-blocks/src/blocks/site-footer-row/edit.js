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
	SgsColourPanel,
} from '../../components';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import { resolveResponsiveTier } from '../../utils';

// Promoted common footer elements (Spec 37 §3.5 / FR-37-34). Steering, not
// gating: the row still accepts ANY block via the normal inserter — this list
// only fast-paths the elements a footer typically needs, as placeholder
// quick-insert buttons AND a prioritised position in the block inserter.
// Slugs verified against plugins/sgs-blocks/src/blocks/*/block.json.
const FOOTER_PROMOTED = [
	{
		slug: 'sgs/business-info',
		variant: 'address',
		label: __( 'Business info', 'sgs-blocks' ),
		attributes: { displayType: 'address' },
	},
	{
		slug: 'sgs/business-info',
		variant: 'phone',
		label: __( 'Contact details', 'sgs-blocks' ),
		attributes: { displayType: 'phone' },
	},
	{ slug: 'sgs/social-icons', label: __( 'Social links', 'sgs-blocks' ) },
	{ slug: 'sgs/nav-menu', label: __( 'Footer navigation', 'sgs-blocks' ) },
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
		variant: 'copyright',
		label: __( 'Copyright line', 'sgs-blocks' ),
		attributes: { displayType: 'copyright' },
	},
];
const FOOTER_PROMOTED_SLUGS = [
	...new Set( FOOTER_PROMOTED.map( ( item ) => item.slug ) ),
];

// No allowedBlocks restriction BY DEFAULT: site-footer-row is a
// container-equivalent (like sgs/container in free mode) — it accepts ANY
// block, not a curated palette. `templateMode` (wired below, mirroring
// sgs/container's edit.js exactly) lets an operator OPT INTO a restricted
// roster the same way sgs/container does; "free" (the default) keeps this
// unrestricted behaviour.
const TEMPLATE_MODE_OPTIONS = [
	{ label: __( 'Free (no restrictions)', 'sgs-blocks' ), value: 'free' },
	{ label: __( 'Grid section', 'sgs-blocks' ), value: 'grid-section' },
	{ label: __( 'Card grid', 'sgs-blocks' ), value: 'card-grid' },
];

// Distribution maps to the shared wrapper's justifyContent attr (flex rows only).
const DISTRIBUTION_OPTIONS = [
	{ label: __( '— default (left) —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Spread apart', 'sgs-blocks' ), value: 'space-between' },
];

// Row layout maps to the shared wrapper's `layout` attr — Cluster (wrapping flex)
// or Columns (equal grid of N per device, stacks to 1 on mobile). Every row
// chooses independently. The footer's `columns` row defaults to grid; the CTA and
// copyright strips default to cluster, but any of them can switch.
const LAYOUT_OPTIONS = [
	{ label: __( 'Cluster (wraps)', 'sgs-blocks' ), value: 'flex' },
	{ label: __( 'Columns (grid)', 'sgs-blocks' ), value: 'grid' },
];

const ROW_LABELS = {
	top: __( 'Top row — CTA / newsletter strip', 'sgs-blocks' ),
	columns: __(
		'Columns row — up to 6 columns (collapse to 1 on mobile)',
		'sgs-blocks'
	),
	bottom: __( 'Bottom bar — copyright / legal / attribution', 'sgs-blocks' ),
};

// Columns are an operator-set COUNT per device (Spec 37 §3.3, Bean-locked), NOT
// a CSS grid-template ratio string. `columns` is a TIER OBJECT holding
// {desktop,tablet,mobile} (Spec 35 pass 4, 2026-08-11) — read by the shared
// wrapper via sgs_responsive_normalise_object(), rendered as scoped per-tier
// rules at the grid selector.
//
// D456: for THIS block the count is a CEILING, not a fixed number. block.json
// declares `supports.sgs.intrinsicColumns`, so the wrapper emits a bounded
// auto-fit track list per tier instead of `repeat(N,1fr)` — fewer columns are
// used automatically once content stops fitting, continuously, rather than at a
// pixel cliff. Measured live before the change: all three rows dropped 3 tracks
// to 1 between viewport 768px and 767px while content needed only 496px of the
// 767px available. Hence the inspector says "Maximum columns", not "Columns" —
// a control that promised an exact count would now be lying.
// (Until 2026-07-23 the tiers rode on `sgs-cols-*` classes instead —
// removed because they addressed the wrapper while the grid had moved to
// `.sgs-container__inner`, so mobile never stacked. FR-37-11.)
// ⛔ Do NOT reintroduce a bridge to three flat attrs — `columnsTablet`/
// `columnsMobile` are no longer declared by block.json (Spec 35 pass 4), and
// the object attr wires directly onto ResponsiveOverride, exactly like
// gridTemplateColumns below. A per-device custom template remains available
// as an advanced override by setting gridTemplateColumns directly.

// Cross-axis alignment — read directly by SGS_Container_Wrapper as
// `alignItems` (class-sgs-container-wrapper.php:247, 668-669/681-682).
// Mirrors sgs/container's ALIGN_OPTIONS exactly. No block.json enum on this
// attr, so all four values are always valid explicit choices.
const VERTICAL_ALIGN_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Bottom', 'sgs-blocks' ), value: 'end' },
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
];

// Cluster (flex) axis direction — block.json enum is ['', row, row-reverse,
// column, column-reverse] (site-footer-row/block.json:191-201); the blank
// option is a real enum member, so it is the correct reset path.
const FLEX_DIRECTION_OPTIONS = [
	{ label: __( '— default (row) —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Row', 'sgs-blocks' ), value: 'row' },
	{ label: __( 'Row reverse', 'sgs-blocks' ), value: 'row-reverse' },
	{ label: __( 'Column', 'sgs-blocks' ), value: 'column' },
	{ label: __( 'Column reverse', 'sgs-blocks' ), value: 'column-reverse' },
];

// Grid-only: justify-items / align-content. block.json enums both include
// 'stretch' as their default member (site-footer-row/block.json:234-243,
// 178-190) — 'stretch' IS the reset value.
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

// NOTE — gridTemplateColumns and gridTemplateRows are both declared
// `"type": "object"` with default `{}` (Spec 35 pass 3a / 3b) — the live
// {desktop,tablet,mobile} object-model shape, wired directly below via
// ResponsiveOverride on the object attr itself. No bridging, no flat
// Tablet/Mobile siblings — those were removed from block.json by the same
// migration (they would otherwise become orphaned duplicates, the exact
// same shape as the already-identified gapMobile/gapTablet orphans).

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		rowSlot,
		layout,
		gap,
		columns,
		justifyContent,
		alignItems,
		flexDirection,
		justifyItems,
		alignContent,
		gridAutoRows,
		gridTemplateColumns,
		gridTemplateRows,
		backgroundColour,
		textColour,
		templateMode = 'free',
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

	// columns is a TIER OBJECT — resolve the desktop tier for the editor
	// preview (what the canvas shows), the same pattern as gridTemplateColumns
	// below. String()/arithmetic on the raw object would yield NaN or
	// "[object Object]" in the template-string preview.
	const columnsDesktop = resolveResponsiveTier( columns, 'desktop' )?.value || 3;

	// Editor preview mirrors the frontend. D456: the grid preview uses the SAME
	// bounded auto-fit track list the wrapper emits, not `repeat(N,1fr)` — the
	// count is a CEILING, so a fixed-N preview would show the operator more
	// columns than the front end renders at the same width. The header row's
	// editor surface had exactly this divergence before D455; do not
	// reintroduce it here by "simplifying" this back to repeat().
	// Kept in step with sgs_intrinsic_columns_track() (helpers-container.php).
	// gridTemplateColumns/gridTemplateRows are TIER OBJECTS ({desktop,tablet,mobile}) —
	// resolve the desktop tier, same pattern as `columns`/`gap` above. An explicit
	// custom template always wins over the auto-fit ceiling track, mirroring
	// SGS_Container_Wrapper's own precedence (an explicit gridTemplateColumns always
	// wins over the columns-count-derived track).
	const gridTemplateColumnsDesktop = resolveResponsiveTier(
		gridTemplateColumns,
		'desktop'
	)?.value;
	const gridTemplateRowsDesktop = resolveResponsiveTier(
		gridTemplateRows,
		'desktop'
	)?.value;

	const previewStyle = isGrid
		? {
				display: 'grid',
				gridTemplateColumns:
					gridTemplateColumnsDesktop ||
					`repeat(auto-fit, minmax(min(100%, max(var(--sgs-col-basis, 16rem), calc((100% - (${
						columnsDesktop - 1
					} * ${ ( gap && gap.desktop ) || '48px' })) / ${
						columnsDesktop
					}))), 1fr))`,
				...( gridTemplateRowsDesktop
					? { gridTemplateRows: gridTemplateRowsDesktop }
					: {} ),
				...( gridAutoRows ? { gridAutoRows } : {} ),
				alignItems: alignItems || 'stretch',
				justifyItems: justifyItems || 'stretch',
				alignContent: alignContent || 'stretch',
				gap: ( gap && gap.desktop ) || '48px',
		  }
		: {
				display: 'flex',
				flexWrap: 'wrap',
				// Blank alignItems falls to the CSS-initial `stretch` — mirrors
				// SGS_Container_Wrapper::render()'s own default (D306), not a
				// hardcoded editor-only fallback.
				alignItems: alignItems || 'stretch',
				...( flexDirection ? { flexDirection } : {} ),
				gap: ( gap && gap.desktop ) || 'clamp(0.5rem, 2vw, 1.5rem)',
				justifyContent: justifyContent || 'flex-start',
		  };

	const blockProps = useBlockProps( {
		className: `sgs-site-footer-row${
			rowSlot ? ` sgs-site-footer-row--${ rowSlot }` : ''
		}`,
		style: { ...previewStyle, ...paddingPreview },
	} );

	// Template mode — allowedBlocks per templateMode, mirroring
	// sgs/container's edit.js exactly. Only restrict when the operator
	// explicitly opts into a structured mode; "free" (default) imposes no
	// restrictions, preserving this block's existing container-equivalent
	// behaviour.
	const TEMPLATE_MODE_ALLOWED = {
		'grid-section': [
			'sgs/container',
			'sgs/heading',
			'sgs/text',
			'sgs/button',
			'sgs/business-info',
			'sgs/social-icons',
			'sgs/nav-menu',
		],
		'card-grid': [
			'sgs/info-box',
			'sgs/card-grid',
			'sgs/container',
		],
	};
	const allowedBlocks = templateMode !== 'free'
		? TEMPLATE_MODE_ALLOWED[ templateMode ] ?? undefined
		: undefined;

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		templateLock: false,
		orientation: 'horizontal',
		allowedBlocks,
		renderAppender: hasInnerBlocks
			? undefined
			: () => (
					<RowQuickInsertAppender
						clientId={ clientId }
						promoted={ FOOTER_PROMOTED }
						label={ __( 'Add a footer element', 'sgs-blocks' ) }
						instructions={ __(
							'Choose a common footer element below, or use the block inserter (+) for anything else.',
							'sgs-blocks'
						) }
					/>
			  ),
		prioritizedInserterBlocks: FOOTER_PROMOTED_SLUGS,
	} );

	return (
		<>
			<SgsColourPanel
				rows={ [
					{
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: backgroundColour,
								onChange: ( val ) =>
									setAttributes( { backgroundColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) =>
									setAttributes( { textColour: val ?? '' } ),
								linked: true,
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="layout"
				/>
				<PanelBody title={ __( 'Footer row', 'sgs-blocks' ) }>
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
							'Cluster: elements sit in a row and wrap when cramped. Columns: a grid of up to N equal columns that drops to fewer — and eventually one — as space runs out.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>

					{ isGrid && (
						<ResponsiveOverride
							label={ __( 'Maximum columns', 'sgs-blocks' ) }
							value={ columns }
							onChange={ ( obj ) => setAttributes( { columns: obj } ) }
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
											'The MOST columns to show at this device — fewer are used automatically when there is not enough room, right down to a single column on a narrow phone. Leave a device blank to inherit the one above.',
											'sgs-blocks'
										) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
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
								'How elements spread across the row. Elements always wrap to a new line rather than overflowing.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }

					<ResponsiveOverride
						label={ __( 'Gap', 'sgs-blocks' ) }
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

				{ /* Template mode — allowed children restriction, mirroring
				     sgs/container's own "Template mode" panel. */ }
				<PanelBody
					title={ __( 'Template mode', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Allowed children', 'sgs-blocks' ) }
						value={ templateMode }
						options={ TEMPLATE_MODE_OPTIONS }
						onChange={ ( val ) => setAttributes( { templateMode: val } ) }
						help={ __(
							'Grid section and Card grid restrict which block types can be inserted directly inside this row. Free (default) imposes no restrictions.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Alignment & grid', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Vertical alignment', 'sgs-blocks' ) }
						value={ alignItems || 'start' }
						options={ VERTICAL_ALIGN_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { alignItems: val } )
						}
						help={ __(
							'How elements of different heights line up across the row.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
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
							__next40pxDefaultSize
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
								__next40pxDefaultSize
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
								__next40pxDefaultSize
							/>
							<ResponsiveOverride
								label={ __(
									'Custom column template',
									'sgs-blocks'
								) }
								value={ gridTemplateColumns }
								onChange={ ( obj ) =>
									setAttributes( {
										gridTemplateColumns: obj,
									} )
								}
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
											"Advanced override — CSS grid-template-columns, e.g. '5fr 3fr'. Leave blank to use the Maximum columns count above.",
											'sgs-blocks'
										) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								) }
							</ResponsiveOverride>
							<ResponsiveOverride
								label={ __( 'Row template', 'sgs-blocks' ) }
								value={ gridTemplateRows }
								onChange={ ( obj ) =>
									setAttributes( {
										gridTemplateRows: obj,
									} )
								}
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
										__next40pxDefaultSize
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
								__next40pxDefaultSize
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
