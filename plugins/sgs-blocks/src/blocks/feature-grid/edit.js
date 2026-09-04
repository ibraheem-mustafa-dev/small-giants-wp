import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import {
	PanelBody,
	SelectControl,
	RangeControl,
} from '@wordpress/components';
import { ResponsiveOverride, SgsColourPanel, fillRow, SgsLengthControl,
	SgsBorderControl,
	resolveColourToken,
} from '../../components';
import { resolveResponsiveTier } from '../../utils';

const LAYOUT_MODE_OPTIONS = [
	{
		label: __( 'Auto-flex (responsive wrap)', 'sgs-blocks' ),
		value: 'auto-flex',
	},
	{
		label: __( 'Fixed columns', 'sgs-blocks' ),
		value: 'fixed-columns',
	},
];

// Units for the "Min item width" control (NOT the gap — gap is now the shared
// ContainerWrapperControls control). Restored after the gap-unit removal over-deleted it.
const UNIT_OPTIONS = [
	{ label: 'px', value: 'px' },
	{ label: 'em', value: 'em' },
	{ label: 'rem', value: 'rem' },
];

const ALIGN_OPTIONS = [
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
	{ label: __( 'Start', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'end' },
];

const TEMPLATE = [
	[ 'sgs/info-box', { showMedia: true, showTitle: true, showText: true } ],
	[ 'sgs/info-box', { showMedia: true, showTitle: true, showText: true } ],
	[ 'sgs/info-box', { showMedia: true, showTitle: true, showText: true } ],
	[ 'sgs/info-box', { showMedia: true, showTitle: true, showText: true } ],
];

/**
 * Build the live grid CSS for the editor preview.
 *
 * Mirrors the logic in render.php so what you see in the editor
 * matches the frontend output.
 *
 * gap is now a full CSS value string (e.g. "24px", "40" for preset slug).
 * Preset slugs (bare digits) are wrapped in a spacing-preset var on the
 * frontend; the editor preview passes the value through directly which is
 * good enough for layout preview purposes.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} React inline style object.
 */
function buildGridStyle( attributes ) {
	const {
		layoutMode,
		columns,
		minItemWidth,
		minItemWidthUnit,
		gap,
		alignItems,
		justifyItems,
		gridTemplateColumns,
	} = attributes;

	// gap is a TIER OBJECT — resolve the desktop tier (what the canvas shows)
	// before testing it, for the same reason gridTemplateColumns is resolved
	// below: String() on the raw object would yield "[object Object]".
	const gapDesktop = resolveResponsiveTier( gap, 'desktop' )?.value;
	// For editor preview: if gap looks like a bare slug (digits only), render
	// it as a spacing-preset CSS var; otherwise pass through as-is.
	const gapCss = gapDesktop && /^\d+$/.test( String( gapDesktop ) )
		? `var(--wp--preset--spacing--${ gapDesktop })`
		: ( gapDesktop || '24px' );

	if ( 'auto-flex' === layoutMode ) {
		return {
			display: 'grid',
			gridTemplateColumns: `repeat(auto-fill, minmax(${ minItemWidth }${ minItemWidthUnit }, 1fr))`,
			gap: gapCss,
			alignItems,
			justifyItems,
		};
	}

	// Fixed / grid mode: mirror the frontend. An explicit gridTemplateColumns
	// (e.g. a faithful clone transfer, including asymmetric ratios like '1fr 2fr')
	// is delegated verbatim to the shared grid engine on the frontend, so preview
	// it here too; otherwise fall back to the desktop column count.
	// gridTemplateColumns is a TIER OBJECT (Spec 35 pass 3a). String() on the
	// object yields "[object Object]", which is a NON-EMPTY string — so the
	// preview would have set a bogus track list instead of falling back to the
	// column count. Resolve the DESKTOP tier, which is what the canvas shows.
	const gtcDesktop = resolveResponsiveTier( gridTemplateColumns, 'desktop' )?.value;
	const columnsDesktop = resolveResponsiveTier( columns, 'desktop' )?.value ?? 4;
	const templateCols = String( gtcDesktop ?? '' ).trim()
		? String( gtcDesktop ).trim()
		: `repeat(${ columnsDesktop }, 1fr)`;

	return {
		display: 'grid',
		gridTemplateColumns: templateCols,
		gap: gapCss,
		alignItems,
		justifyItems,
	};
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		layoutMode,
		minItemWidth,
		minItemWidthUnit,
		gap,
		alignItems,
		justifyItems,
		backgroundColour,
		backgroundColourGradient,
		textColour,
		textColourGradient,
	} = attributes;

	// Contrast check for border — warn if border fails WCAG contrast against
	// the block's own background. When there's no background set or a gradient
	// is active, skip the check entirely.
	const featureGridContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';


	const blockProps = useBlockProps( {
		className: `sgs-feature-grid sgs-feature-grid--${ layoutMode }`,
		style: buildGridStyle( attributes ),
	} );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: [ 'sgs/info-box' ],
		template: TEMPLATE,
		templateLock: false,
		orientation: 'horizontal',
	} );

	return (
		<>
			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						attrs: {
							base: 'backgroundColour',
							hover: 'backgroundColourHover',
							gradient: 'backgroundColourGradient',
							hoverGradient: 'backgroundColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					{
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) =>
									setAttributes( { textColour: val ?? '' } ),
								linked: true,
								gradientValue: textColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { textColourGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				{ /* showLayout={false}: this block owns its OWN layout selector
				     (layoutMode, below) — every one of its three render.php branches
				     (auto-flex / fixed-columns / explicit-grid-template) always emits
				     display:grid, so the generic Stack/Flex/Grid dropdown never
				     offered a real choice. render.php:156 force-sets attributes.layout
				     to 'grid' whenever an explicit template is present, silently
				     discarding whatever this dropdown showed — root-caused via
				     /systematic-debugging 2026-08-20; card-grid, the sibling using
				     the same kind="layout" pattern, never exposes this dropdown
				     conflict because it has no competing bespoke selector. */ }
				<ContainerWrapperControls attributes={ attributes } setAttributes={ setAttributes } kind="layout" showLayout={ false } />
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Layout mode', 'sgs-blocks' ) }
						value={ layoutMode }
						options={ LAYOUT_MODE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { layoutMode: val } )
						}
						help={
							'auto-flex' === layoutMode
								? __(
										'Items wrap automatically when there is not enough space for another at the minimum width.',
										'sgs-blocks'
								  )
								: __(
										'Items fill an exact number of columns per breakpoint.',
										'sgs-blocks'
								  )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>

					{ /* SgsLengthControl adoption (Gate B, presets={false}) — split-scalar
					   case: minItemWidth (number) + minItemWidthUnit (string) are two
					   separate stored attrs composed into one display string, same
					   shape as label/edit.js's composeUnit pattern. Safe: SgsLengthControl's
					   presets=false branch forwards the raw UnitControl string unchanged
					   to onChange, so the split-and-setAttributes logic below is
					   untouched — see Branch 2 report. */ }
					{ 'auto-flex' === layoutMode && (
						<SgsLengthControl
							label={ __( 'Min item width', 'sgs-blocks' ) }
							value={ `${ minItemWidth }${ minItemWidthUnit || 'px' }` }
							units={ [
								{ value: 'px',  label: 'px',  default: 200 },
								{ value: 'em',  label: 'em',  default: 10 },
								{ value: 'rem', label: 'rem', default: 10 },
							] }
							onChange={ ( val ) => {
								const unit = val?.replace( /[\d.]+/, '' ) || 'px';
								const num  = parseFloat( val ) || 120;
								setAttributes( { minItemWidth: num, minItemWidthUnit: unit } );
							} }
							presets={ false }
						/>
					) }

					{ /*
						  `columns` is a TIER OBJECT — ONE attr holding
						  {desktop,tablet,mobile} (see block.json). Uses
						  ResponsiveOverride, which reads and writes the object,
						  NOT ResponsiveControl, which writes one flat attr per
						  tier. The old `columnsTablet`/`columnsMobile` siblings
						  are no longer declared by this block.json — writing
						  them through ResponsiveControl would save nothing
						  (WordPress silently discards an undeclared attribute),
						  while the desktop branch would write a number into an
						  object-typed attr and destroy the setting. Mirrors
						  LayoutPanel's own Columns control in
						  ContainerWrapperControls.js.
					*/ }
					{ 'fixed-columns' === layoutMode && (
						<ResponsiveOverride
							label={ __( 'Columns', 'sgs-blocks' ) }
							value={ attributes.columns }
							onChange={ ( obj ) => setAttributes( { columns: obj } ) }
						>
							{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => {
								const maxMap = { desktop: 6, tablet: 4, mobile: 2 };
								return (
									<RangeControl
										value={
											ownValue !== ''
												? ownValue
												: ( effectiveValue !== ''
													? effectiveValue
													: ( tier === 'mobile' ? 1 : 2 ) )
										}
										onChange={ setOwnValue }
										min={ 1 }
										max={ maxMap[ tier ] }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								);
							} }
						</ResponsiveOverride>
					) }
				</PanelBody>

			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<PanelBody
					title={ __( 'Alignment', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Align items (cross-axis)', 'sgs-blocks' ) }
						value={ alignItems }
						options={ ALIGN_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { alignItems: val } )
						}
						help={ __(
							'Controls vertical alignment of items within each row.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __(
							'Justify items (inline-axis)',
							'sgs-blocks'
						) }
						value={ justifyItems }
						options={ ALIGN_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { justifyItems: val } )
						}
						help={ __(
							'Controls horizontal alignment of items within their grid cell.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
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
						contrastAgainst={ featureGridContrastAgainst }
						radiusValues={ {
							base: attributes.borderRadius ?? {},
							tablet: attributes.borderRadiusTablet ?? {},
							mobile: attributes.borderRadiusMobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const radiusKey = tier === 'base' ? 'borderRadius' : tier === 'tablet' ? 'borderRadiusTablet' : 'borderRadiusMobile';
							setAttributes( { [ radiusKey ]: next } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...innerBlocksProps } />
		</>
	);
}
