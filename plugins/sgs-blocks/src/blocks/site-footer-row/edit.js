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
	BoxControl,
} from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem, UnitControl } from '../../components/primitives';
import {
	ResponsiveOverride,
	SpacingControl,
	RowQuickInsertAppender,
	RowScrollBehaviourControls,
	ColumnShapePicker,
	fillRow,
	textRow,
	SgsBorderControl,
	resolveColourToken,
	DesignTokenPicker,
	GradientCapableColourControl,
} from '../../components';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import { resolveResponsiveTier, boxShorthand, resolveContentWidthPreview, contentBandPreview } from '../../utils';

// TIER 2 (THE PLACEMENT RULE, Spec 35 Part O) — `row` is the block's
// isWrapper element with clusters [text, fill, layout], so its controls
// resolve to property-family panels rather than one catch-all. These local
// constants deliberately DUPLICATE the ones inside the shared
// `ResponsiveBoxControls` component: that component is mounted by 6 OTHER
// blocks (gallery/cta-section/trust-bar/hero/container/physics-canvas) and
// editing it would change their inspector layout as a side effect of this
// fix, which is out of scope. Padding/margin/max-width move into `row`'s own
// Layout panel here; `contentWidth` moves into `content-band`'s own TIER 1
// panel below — both inline, not through the shared component.
const LENGTH_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: '%', label: '%', default: 0 },
	{ value: 'vw', label: 'vw', default: 0 },
];

const CONTENT_WIDTH_OPTIONS = [
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Normal (content width)', 'sgs-blocks' ), value: 'normal' },
	{ label: __( 'Wide', 'sgs-blocks' ), value: 'wide' },
];

/**
 * Collapse an all-empty BoxControl object to '' so the tier is cleared
 * (-> inherit) rather than storing an empty `{}` that would still count as
 * an override. Mirrors ResponsiveBoxControls.js's own `normaliseBox()`.
 *
 * @param {Object|undefined} box BoxControl value.
 * @return {Object|string} The box object, or '' when every side is empty.
 */
const normaliseBox = ( box ) => {
	if ( ! box || typeof box !== 'object' ) {
		return '';
	}
	const hasAny = Object.values( box ).some(
		( v ) => v !== undefined && v !== null && v !== ''
	);
	return hasAny ? box : '';
};

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

// No allowedBlocks restriction: site-footer-row is a container-equivalent
// (like sgs/container) — it accepts ANY block, not a curated palette.

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
		textColour,
		textColourGradient,
		padding,
		margin,
		maxWidth,
		contentWidth,
	} = attributes;

	const isGrid = 'grid' === layout;

	// Editor-preview only: "Show me the shrunk size" (Row behaviour panel).
	// Local UI state — never persisted, never rendered on the front end.
	const [ previewShrunk, setPreviewShrunk ] = useState( false );

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
	// columns than the front end renders at the same width. Do not
	// "simplify" this back to repeat().
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

	// Margin (CHECK A) — a TIER OBJECT (Spec 37 FR-37-16), each tier itself a
	// {top,right,bottom,left} box — UNLIKE sgs/container's `margin`, which is a
	// flat box with separate marginTablet/marginMobile sibling attrs. This
	// block declares no such siblings (block.json boxFamilies.margin: ['margin']
	// only), so it resolves via resolveResponsiveTier() + boxShorthand()
	// directly, not resolveBoxTierPreview() (that helper expects 3 separate
	// attrs). Fixed to the 'desktop' tier — the same convention every other
	// resolveResponsiveTier() call in this file already uses (columnsDesktop,
	// gridTemplateColumnsDesktop, gridTemplateRowsDesktop), none of which track
	// the live device switcher.
	const marginPreview = boxShorthand( resolveResponsiveTier( margin, 'desktop' )?.value );

	// Max width (CHECK A) — a TIER OBJECT holding a plain CSS length per tier
	// (not a box), same shape as `gap`/`columns` above.
	const maxWidthPreview = resolveResponsiveTier( maxWidth, 'desktop' )?.value;

	const style = { ...previewStyle, ...paddingPreview };
	if ( marginPreview ) style.margin = marginPreview;
	if ( maxWidthPreview ) style.maxWidth = maxWidthPreview;

	// Content band (CHECK A) — mirrors sgs/container's Layer 2 mirror exactly
	// via the shared contentBandPreview()/resolveContentWidthPreview() utils.
	// This block has NO `contentBandPadding` attribute (block.json declares
	// none), so band padding is always {} — only `contentWidth` can open a
	// band. Default contentWidth is {desktop:'full'}, which resolves to '' (no
	// cap) via resolveContentWidthPreview(), so hasBandProps stays false and
	// the canvas renders a single layer exactly as today until the operator
	// explicitly sets Content width away from Full — matches
	// class-sgs-container-wrapper.php's documented default-full-no-band
	// behaviour for this block.
	const bandMaxWidth = resolveContentWidthPreview(
		resolveResponsiveTier( contentWidth, 'desktop' )?.value
	);
	const { hasBandProps, bandStyle } = contentBandPreview( {
		contentWidth: bandMaxWidth,
		bandPadding: {},
		style,
		layout,
	} );

	const blockProps = useBlockProps( {
		className: `sgs-site-footer-row${
			rowSlot ? ` sgs-site-footer-row--${ rowSlot }` : ''
		}`,
		style,
	} );

	// The children belong to the BAND when one renders, and to the root when
	// one does not — useInnerBlocksProps is called exactly once either way,
	// branching the ARGUMENT (mirrors sgs/container/edit.js).
	const innerBlocksProps = useInnerBlocksProps(
		hasBandProps ? { className: 'sgs-container__inner', style: bandStyle } : blockProps,
		{
			templateLock: false,
			orientation: 'horizontal',
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
		}
	);

	// Pilot WCAG contrast check on the Text row (D-pending, gap-candidate
	// register task). The row's own `backgroundColour` is the effective
	// background the text sits on when set; when the row leaves it blank the
	// row paints no background of its own, so the parent `sgs/site-footer`'s
	// background shows through instead — the real thing the text is read
	// against. Read the nearest `sgs/site-footer` ancestor's `backgroundColour`
	// for that fallback rather than assuming the row always has its own.
	const parentFooterBackgroundColour = useSelect(
		( select ) => {
			const { getBlockParentsByBlockName, getBlockAttributes } =
				select( blockEditorStore );
			const parents = getBlockParentsByBlockName(
				clientId,
				'sgs/site-footer'
			);
			if ( ! parents.length ) {
				return '';
			}
			return (
				getBlockAttributes( parents[ 0 ] )?.backgroundColour || ''
			);
		},
		[ clientId ]
	);
	// Only the parent footer's background is a valid comparison target — it is
	// only actually visible behind this row's text when the row paints no
	// background of its own. When the row DOES have its own background/
	// gradient, that (not the parent's) is what's behind the text, and this
	// pilot doesn't check the row's own pairing — skip the check rather than
	// comparing against a colour that isn't what's actually rendered (Bean,
	// 2026-09-04).
	const rowHasOwnBackground = Boolean(
		attributes.backgroundColour || attributes.backgroundColourGradient
	);
	const textContrastAgainst = rowHasOwnBackground
		? ''
		: parentFooterBackgroundColour;

	// TIER 2 property-family rows for `row` (isWrapper) — Text / Fill, each in
	// its own panel (THE PLACEMENT RULE, Spec 35 Part O). Built via the same
	// row-descriptor helpers SgsColourPanel itself consumes, so the row SHAPE
	// (D609: swatch + popover + in-popover state tabs) is identical — only the
	// panel TITLE differs (Text / Fill, not a shared "Colour" catch-all).
	const textRowDescriptor = textRow( {
		key: 'text',
		label: __( 'Row text colour', 'sgs-blocks' ),
		attrs: {
			base: 'textColour',
			gradient: 'textColourGradient',
		},
		attributes,
		setAttributes,
	} );
	const TextRowControl = textRowDescriptor.gradientCapable
		? GradientCapableColourControl
		: DesignTokenPicker;

	const fillRowDescriptor = fillRow( {
		key: 'background',
		label: __( 'Row background', 'sgs-blocks' ),
		attrs: {
			base: 'backgroundColour',
			hover: 'backgroundColourHover',
			gradient: 'backgroundColourGradient',
			hoverGradient: 'backgroundColourHoverGradient',
		},
		attributes,
		setAttributes,
	} );

	// Contrast check for border colour — warn if border fails WCAG 3:1 contrast
	// against the block's own background. When the background is a gradient,
	// the flat backgroundColour is not rendered, so skip the check in that case.
	const siteFooterRowContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';

	return (
		<>
			<InspectorControls group="styles">
				<PanelBody
					title={ __( 'Text', 'sgs-blocks' ) }
					initialOpen
					className="sgs-colour-panel"
				>
					<TextRowControl
						label={ textRowDescriptor.label }
						states={ textRowDescriptor.states }
						{ ...( TextRowControl === GradientCapableColourControl
							? { contrastAgainst: textContrastAgainst }
							: {} ) }
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Fill', 'sgs-blocks' ) }
					initialOpen
					className="sgs-colour-panel"
				>
					<DesignTokenPicker
						label={ fillRowDescriptor.label }
						states={ fillRowDescriptor.states }
					/>
				</PanelBody>

				{ /* Layout — merges the former "Alignment & grid" ToolsPanel, the
				   unpanelled ResponsiveBoxControls mount (padding/margin/max-width —
				   `row`'s OWN box attrs; `contentWidth` belongs to `content-band` and
				   moves to that element's own panel below), and the "Border"
				   PanelBody into ONE `row` Layout panel (Spec 35 Part O, D537). */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<ToolsPanel
						label={ __( 'Alignment & grid', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								alignItems: 'start',
								flexDirection: '',
								justifyItems: 'stretch',
								alignContent: 'stretch',
								gridTemplateColumns: {},
								gridTemplateRows: {},
								gridAutoRows: '',
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Align items', 'sgs-blocks' ) }
							hasValue={ () => ( alignItems || 'start' ) !== 'start' }
							onDeselect={ () => setAttributes( { alignItems: 'start' } ) }
							isShownByDefault
						>
							<SelectControl
								label={ __( 'Align items', 'sgs-blocks' ) }
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
						</ToolsPanelItem>
						{ ! isGrid && (
							<ToolsPanelItem
								label={ __( 'Flex direction', 'sgs-blocks' ) }
								hasValue={ () => flexDirection !== '' }
								onDeselect={ () => setAttributes( { flexDirection: '' } ) }
								isShownByDefault
							>
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
							</ToolsPanelItem>
						) }
						{ isGrid && (
							<>
								<ToolsPanelItem
									label={ __( 'Justify items', 'sgs-blocks' ) }
									hasValue={ () => ( justifyItems || 'stretch' ) !== 'stretch' }
									onDeselect={ () => setAttributes( { justifyItems: 'stretch' } ) }
									isShownByDefault
								>
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
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Align content', 'sgs-blocks' ) }
									hasValue={ () => ( alignContent || 'stretch' ) !== 'stretch' }
									onDeselect={ () => setAttributes( { alignContent: 'stretch' } ) }
								>
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
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Custom column template', 'sgs-blocks' ) }
									hasValue={ () => !! gridTemplateColumns?.desktop || !! gridTemplateColumns?.tablet || !! gridTemplateColumns?.mobile }
									onDeselect={ () => setAttributes( { gridTemplateColumns: {} } ) }
								>
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
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Row template', 'sgs-blocks' ) }
									hasValue={ () => !! gridTemplateRows?.desktop || !! gridTemplateRows?.tablet || !! gridTemplateRows?.mobile }
									onDeselect={ () => setAttributes( { gridTemplateRows: {} } ) }
								>
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
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Auto rows', 'sgs-blocks' ) }
									hasValue={ () => gridAutoRows !== '' }
									onDeselect={ () => setAttributes( { gridAutoRows: '' } ) }
								>
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
								</ToolsPanelItem>
							</>
						) }
					</ToolsPanel>

					{ /* Padding/margin/max-width — `row`'s own box attrs (Spec 37
					   FR-37-16 object model). Inlined here rather than through the
					   shared `ResponsiveBoxControls` component so this Layout-panel
					   merge stays scoped to this block only. */ }
					<ResponsiveOverride
						value={ padding }
						onChange={ ( obj ) => setAttributes( { padding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<BoxControl
								label={ __( 'Padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ LENGTH_UNITS }
								onChange={ ( next ) => setOwnValue( normaliseBox( next ) ) }
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>

					<ResponsiveOverride
						value={ margin }
						onChange={ ( obj ) => setAttributes( { margin: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<BoxControl
								label={ __( 'Margin', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ LENGTH_UNITS }
								onChange={ ( next ) => setOwnValue( normaliseBox( next ) ) }
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>

					<ResponsiveOverride
						label={ __( 'Max width', 'sgs-blocks' ) }
						value={ maxWidth }
						onChange={ ( obj ) => setAttributes( { maxWidth: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<UnitControl
								label={ __( 'Max width', 'sgs-blocks' ) }
								hideLabelFromVision
								units={ LENGTH_UNITS }
								value={ ownValue || '' }
								placeholder={ inherited ? effectiveValue : '' }
								onChange={ ( v ) => setOwnValue( v || '' ) }
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>

					<SgsBorderControl
						widthValues={ attributes.borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes.borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ attributes.borderColourGradient }
						onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
						colourLinked={ true }
						contrastAgainst={ siteFooterRowContrastAgainst }
						radiusValues={ {
								base: attributes.borderRadius?.desktop ?? {},
								tablet: attributes.borderRadius?.tablet ?? {},
								mobile: attributes.borderRadius?.mobile ?? {},
							} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>

				{ /* TIER 1 — the `content-band` element's own panel (Spec 35 Part
				   O). `contentWidth` used to live inside the shared
				   ResponsiveBoxControls mount alongside `row`'s own padding/
				   margin/max-width, which put a content-band control inside a
				   row-scoped panel. It gets its own small panel here instead. */ }
				<PanelBody title={ __( 'Content band', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveOverride
						label={ __( 'Content width', 'sgs-blocks' ) }
						value={ contentWidth }
						onChange={ ( obj ) => setAttributes( { contentWidth: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								label={ __( 'Content width', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ ownValue || '' }
								options={
									tier === 'desktop'
										? CONTENT_WIDTH_OPTIONS
										: [
												{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
												...CONTENT_WIDTH_OPTIONS,
										  ]
								}
								onChange={ ( v ) => setOwnValue( v ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>
			</InspectorControls>

			<InspectorControls>
				{ /* showLayout={false}: this block owns its own 'Row layout' control
				   below. Rendering LayoutPanel's selector too is silent DATA LOSS —
				   it offers Stack, but this block.json's layout enum is [flex, grid],
				   so WordPress coerces the write back to the default and the operator
				   sees a control that does nothing. Same fix as post-grid and
				   testimonial-slider (2026-08-12); this block was missed. */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="layout"
					showLayout={ false }
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

					{ /* FR-37-42 — optional SECOND step after the count. A client
					     who just wants "4 columns" never meets it. Writes the
					     existing gridTemplateColumns object; the active shape is
					     DERIVED from the stored value, never separately stored,
					     so a hand-edited value shows no selection rather than
					     lying (FR-37-28). Still stacks to 1 on mobile via the
					     wrapper, so an asymmetric desktop shape never reaches a
					     phone. */ }
					{ isGrid && (
						<ResponsiveOverride
							label={ __( 'Column shape', 'sgs-blocks' ) }
							value={ gridTemplateColumns }
							onChange={ ( obj ) =>
								setAttributes( { gridTemplateColumns: obj } )
							}
						>
							{ ( {
								ownValue,
								effectiveValue,
								inherited,
								setOwnValue,
								tier,
							} ) => (
								<ColumnShapePicker
									// The shape list depends on how many columns
									// this tier actually shows, so read the count
									// for the SAME tier rather than the desktop
									// one — a 4-column desktop and a 2-column
									// tablet offer different shapes.
									count={
										( columns && columns[ tier ] ) ||
										( columns && columns.desktop ) ||
										3
									}
									value={
										( inherited
											? effectiveValue
											: ownValue ) || ''
									}
									onChange={ ( track ) =>
										setOwnValue( track || undefined )
									}
									// No `label` here on purpose: the wrapping
									// <ResponsiveOverride> already renders the
									// visible one, and two copies is a real
									// defect (inspector-scan rule 29). The
									// picker keeps its own label internally for
									// assistive tech, hidden from vision.
								/>
							) }
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

				{ /* Alignment & grid, padding/margin/max-width, and Border now live
				   in the merged `row` Layout panel (group="styles") above. */ }
				<RowScrollBehaviourControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					clientId={ clientId }
					previewShrunk={ previewShrunk }
					setPreviewShrunk={ setPreviewShrunk }
				/>
			</InspectorControls>

			{ hasBandProps ? (
				<div { ...blockProps }>
					<div { ...innerBlocksProps } />
				</div>
			) : (
				<div { ...innerBlocksProps } />
			) }
		</>
	);
}
