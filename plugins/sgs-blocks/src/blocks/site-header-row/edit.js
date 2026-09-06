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
import {
	ColumnShapePicker,
	ResponsiveOverride,
	SpacingControl,
	RowQuickInsertAppender,
	RowScrollBehaviourControls,
	fillRow,
	textRow,
	SgsBorderControl,
	resolveColourToken,
	DesignTokenPicker,
	GradientCapableColourControl,
} from '../../components';
import { ToolsPanel, ToolsPanelItem, UnitControl } from '../../components/primitives';
import { resolveResponsiveTier, boxShorthand, resolveContentWidthPreview, contentBandPreview } from '../../utils';

// TIER 2 (THE PLACEMENT RULE, Spec 35 Part O) — `row` is the block's
// isWrapper element with clusters [text, fill, layout], so its controls
// resolve to property-family panels rather than one catch-all. These two
// constants are local, deliberate DUPLICATES of the ones inside the shared
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

// No allowedBlocks restriction: site-header-row is a container-equivalent
// (like sgs/container) — it accepts ANY block, not a curated palette. The
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

// columns is a TIER OBJECT holding {desktop,tablet,mobile} (Spec 35 pass 4,
// 2026-08-11) — wires directly onto ResponsiveOverride, identical to
// site-footer-row and gridTemplateColumns. ⛔ Do NOT reintroduce a bridge to
// three flat attrs — columnsTablet/columnsMobile are no longer declared by
// block.json.

// Cross-axis alignment of this row's children (align-items on the wrapper's
// grid/flex track) — read directly by SGS_Container_Wrapper as `alignItems`
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

// gridTemplateColumns is the {desktop,tablet,mobile} object (Spec 35 pass 3a)
// — ResponsiveOverride reads and writes it directly. ⛔ Do NOT add a bridge to
// three flat attrs: block.json no longer declares them (D563).

// gridTemplateRows — same shape, same reasoning as gridTemplateColumns above.

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		rowSlot,
		layout,
		justifyContent,
		gap,
		columns,
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

	// columns IS the tier object now — pass it straight through, and write it
	// straight back. No per-tier fan-out: those sibling attrs no longer exist.
	const columnsDesktop = resolveResponsiveTier( columns, 'desktop' )?.value || 3;

	// The attr IS the tier object now — pass it straight through, and write it
	// straight back. No per-tier fan-out: those sibling attrs no longer exist.
	const gridTemplateColumnsValue = gridTemplateColumns;
	const onGridTemplateColumnsChange = ( obj ) =>
		setAttributes( { gridTemplateColumns: obj } );

	const gridTemplateRowsValue = gridTemplateRows;
	const onGridTemplateRowsChange = ( obj ) =>
		setAttributes( { gridTemplateRows: obj } );

	// Editor preview mirrors the frontend: grid rows preview as an equal-count
	// column grid at the desktop tier; cluster rows NEVER wrap (D455) — they
	// yield by shrinking their children, mirroring style.css's nowrap lock. The
	// never-overflow guarantee (nowrap + min-width:0 + per-child floors) comes
	// from style.css.
	const previewStyle = isGrid
		? {
				display: 'grid',
				gridTemplateColumns: `repeat(${ columnsDesktop }, 1fr)`,
				...( gridAutoRows ? { gridAutoRows } : {} ),
				// Blank alignItems/justifyItems/alignContent fall to the
				// CSS-initial `stretch` — mirrors SGS_Container_Wrapper::render()'s
				// own defaults (D306 for alignItems), not a hardcoded editor-only
				// fallback.
				alignItems: alignItems || 'stretch',
				justifyItems: justifyItems || 'stretch',
				alignContent: alignContent || 'stretch',
				gap: ( gap && gap.desktop ) || '16px',
		  }
		: {
				display: 'flex',
				// D455 — mirrors the frontend lock. The row never wraps or
				// stacks; it yields by shrinking its children instead.
				flexWrap: 'nowrap',
				// Blank alignItems falls to the CSS-initial `stretch` — mirrors
				// SGS_Container_Wrapper::render()'s own default (D306), not a
				// hardcoded editor-only fallback.
				alignItems: alignItems || 'stretch',
				...( flexDirection ? { flexDirection } : {} ),
				// Matches block.json's gap default.
				gap: ( gap && gap.desktop ) || '16px',
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
	// gridTemplateColumnsValue), none of which track the live device switcher.
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
		className: `sgs-site-header-row${
			rowSlot ? ` sgs-site-header-row--${ rowSlot }` : ''
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
							promoted={ HEADER_PROMOTED }
							label={ __( 'Add a header element', 'sgs-blocks' ) }
							instructions={ __(
								'Choose a common header element below, or use the block inserter (+) for anything else.',
								'sgs-blocks'
							) }
						/>
				  ),
			prioritizedInserterBlocks: HEADER_PROMOTED_SLUGS,
		}
	);

	// Pilot WCAG contrast check on the Text row (D-pending, gap-candidate
	// register task). The row's own `backgroundColour` is the effective
	// background the text sits on when set; when the row leaves it blank the
	// row paints no background of its own, so the parent `sgs/site-header`'s
	// background shows through instead — the real thing the text is read
	// against. Read the nearest `sgs/site-header` ancestor's `backgroundColour`
	// for that fallback rather than assuming the row always has its own.
	const parentHeaderBackgroundColour = useSelect(
		( select ) => {
			const { getBlockParentsByBlockName, getBlockAttributes } =
				select( blockEditorStore );
			const parents = getBlockParentsByBlockName(
				clientId,
				'sgs/site-header'
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
	// Only the parent header's background is a valid comparison target — it is
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
		: parentHeaderBackgroundColour;

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
	const siteHeaderRowContrastAgainst =
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
								alignItems: 'center',
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
							hasValue={ () => alignItems !== 'center' }
							onDeselect={ () => setAttributes( { alignItems: 'center' } ) }
							isShownByDefault
						>
							<SelectControl
								label={ __( 'Align items', 'sgs-blocks' ) }
								value={ alignItems || 'center' }
								options={ VERTICAL_ALIGN_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( { alignItems: val } )
								}
								help={ __(
									'How elements of different heights (e.g. a logo next to a shorter nav) line up across the row.',
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
									hasValue={ () => justifyItems !== 'stretch' }
									onDeselect={ () => setAttributes( { justifyItems: 'stretch' } ) }
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
									hasValue={ () => alignContent !== 'stretch' }
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
								{ /* FR-37-42 — optional SECOND step after the count,
								     same as site-footer-row's mount. Writes the
								     existing `gridTemplateColumns` object attribute;
								     the active shape is DERIVED from the stored
								     value, never separately stored, so a hand-edited
								     value shows no selection rather than lying
								     (FR-37-28). No raw TextControl alongside it —
								     two controls writing the same attr is the
								     silent-data-loss trap LayoutPanel's own
								     `showLayout` docblock warns about, so the
								     picker REPLACES the advanced text override
								     rather than sitting next to it. */ }
								<ToolsPanelItem
									label={ __( 'Column shape', 'sgs-blocks' ) }
									hasValue={ () => !! gridTemplateColumnsValue && Object.keys( gridTemplateColumnsValue ).length > 0 }
									onDeselect={ () => setAttributes( { gridTemplateColumns: {} } ) }
								>
									<ResponsiveOverride
										label={ __(
											'Column shape',
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
											tier,
										} ) => (
											<ColumnShapePicker
												// The shape list depends on how many
												// columns this tier actually shows, so
												// read the count for the SAME tier
												// rather than the desktop one — a
												// 4-column desktop and a 2-column
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
												// No `label` here on purpose: the
												// wrapping <ResponsiveOverride> already
												// renders the visible one, and two
												// copies is a real defect
												// (inspector-scan rule 29). Same
												// reasoning as site-footer-row's mount.
											/>
										) }
									</ResponsiveOverride>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Row template', 'sgs-blocks' ) }
									hasValue={ () => !! gridTemplateRowsValue && Object.keys( gridTemplateRowsValue ).length > 0 }
									onDeselect={ () => setAttributes( { gridTemplateRows: {} } ) }
								>
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
						contrastAgainst={ siteHeaderRowContrastAgainst }
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
						__next40pxDefaultSize
					/>
					{ isGrid && (
						<ResponsiveOverride
							label={ __( 'Columns', 'sgs-blocks' ) }
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
											'How many columns at this device. They stack to 1 on mobile automatically — leave a device blank to inherit the one above.',
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
								'How elements spread across the row. They stay on one line at every screen size and shrink to fit, so nothing ever wraps or runs off the edge.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
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
