import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
} from '@wordpress/components';
import { SgsColourPanel, textRow, ResponsiveBoxControl, TypographyControls, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl, SgsBorderControl, SgsLengthControl } from '../../components';
import { colourVar, resolveTextColourPreviewStyle, typographyPreviewStyle, usePreviewTier, tierBoxShorthand, sgsLengthPreview, sgsBorderPreview } from '../../utils';

const SEPARATOR_OPTIONS = [
	{ label: '/', value: '/' },
	{ label: '›', value: '›' },
	{ label: '»', value: '»' },
	{ label: '→', value: '→' },
	{ label: '|', value: '|' },
];

// Product-page extra-crumbs options. 'none' keeps today's behaviour
// (Home / Shop archive / Product title) — off by default so existing sites
// render unchanged (any-client rule).
const PRODUCT_PAGE_CRUMBS_OPTIONS = [
	{ label: __( 'Nothing extra', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Primary category', 'sgs-blocks' ), value: 'category' },
	{ label: __( 'Brand', 'sgs-blocks' ), value: 'brand' },
	{ label: __( 'Both', 'sgs-blocks' ), value: 'both' },
];

/** Build the root's inline preview style for the editor canvas (mirrors render.php's scoped root declarations). */
function buildRootStyle( attributes, tier ) {
	const { padding, margin, linkColour, separatorColour, currentColour, borderStyle, borderWidth, borderColour, borderColourGradient, borderRadius } = attributes;
	const rootStyle = {
		'--sgs-breadcrumbs-link-colour': colourVar( linkColour ) || undefined,
		'--sgs-breadcrumbs-separator-colour': colourVar( separatorColour ) || undefined,
		'--sgs-breadcrumbs-current-colour': colourVar( currentColour ) || undefined,
	};

	// Base padding/margin preview — padding/margin are owned tier-object
	// attrs { desktop, tablet, mobile }; the desktop tier is a box (box-model
	// order top/right/bottom/left).
	const paddingPreview = tierBoxShorthand( padding, tier );
	if ( paddingPreview ) {
		rootStyle.padding = paddingPreview;
	}
	const marginPreview = tierBoxShorthand( margin, tier );
	if ( marginPreview ) {
		rootStyle.margin = marginPreview;
	}

	Object.assign( rootStyle, sgsBorderPreview( { widthValues: borderWidth, styleValue: borderStyle, colourValue: borderColour, colourGradientValue: borderColourGradient, radiusValues: borderRadius }, tier, undefined, { wholeTier: true } ) );

	return Object.fromEntries(
		Object.entries( rootStyle ).filter( ( [ , v ] ) => v !== undefined )
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		separator,
		showHome,
		homeLabel,
		productPageCrumbs,
		showArchiveCrumb,
		showCurrentCrumb,
		currentColour,
		currentColourGradient,
		borderColour,
		borderColourGradient,
		borderColourHover,
		borderColourHoverGradient,
		borderStyle,
		borderWidth,
	} = attributes;

	// Contract §B3: NO wrapper <div> — the <nav> IS the block root (matches
	// render.php). The editor-canvas preview style carries the same custom
	// colour properties + base spacing box preview the frontend emits scoped.
	const tier = usePreviewTier();
	const blockProps = useBlockProps( {
		className: 'sgs-breadcrumbs',
		style: {
			...buildRootStyle( attributes, tier ),
			...typographyPreviewStyle( attributes, '', tier ),
		},
	} );

	// render.php's itemGap: the space either side of each separator, on the list
	// and each item; style.css keeps its spacing-10 gap when it is unset.
	const itemGap = sgsLengthPreview( attributes.itemGap );
	const gapStyle = itemGap ? { gap: itemGap } : undefined;
	// Link and separator paint: a flat colour reaches them through the root's
	// custom properties; a gradient is painted on the element itself, as render.php does.
	const linkPaint = attributes.linkColourGradient
		? resolveTextColourPreviewStyle( attributes.linkColour, attributes.linkColourGradient, colourVar )
		: undefined;
	const separatorPaint = attributes.separatorColourGradient
		? resolveTextColourPreviewStyle( attributes.separatorColour, attributes.separatorColourGradient, colourVar )
		: undefined;

	return (
		<>
			{ /* D618/D609 — ONE grouped, SGS-OWNED colour panel (own PanelBody,
			   default InspectorControls group), rendered FIRST so it sits at
			   the top of the inspector. Replaces the old inline "Colour"
			   PanelBody below; `supports.color` sub-flags are now false so
			   WordPress generates no native colour UI to overlap with this
			   panel. */ }
			<SgsColourPanel
				rows={ [
					textRow( {
						key: 'link',
						label: __( 'Link colour', 'sgs-blocks' ),
						attrs: {
							base: 'linkColour',
							hover: 'linkColourHover',
							gradient: 'linkColourGradient',
							hoverGradient: 'linkColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'separator',
						label: __( 'Separator colour', 'sgs-blocks' ),
						attrs: {
							base: 'separatorColour',
							hover: 'separatorColourHover',
							gradient: 'separatorColourGradient',
							hoverGradient: 'separatorColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'current',
						label: __( 'Current page colour', 'sgs-blocks' ),
						attrs: {
							base: 'currentColour',
							hover: 'currentColourHover',
							gradient: 'currentColourGradient',
							hoverGradient: 'currentColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Breadcrumbs Settings', 'sgs-blocks' ) }>
					<ToggleControl
						label={ __( 'Show home link', 'sgs-blocks' ) }
						checked={ showHome }
						onChange={ ( val ) => setAttributes( { showHome: val } ) }
						__nextHasNoMarginBottom
					/>
					{ showHome && (
						<TextControl
							label={ __( 'Home label', 'sgs-blocks' ) }
							value={ homeLabel }
							onChange={ ( val ) => setAttributes( { homeLabel: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
					<SelectControl
						label={ __( 'Separator', 'sgs-blocks' ) }
						value={ separator }
						options={ SEPARATOR_OPTIONS }
						onChange={ ( val ) => setAttributes( { separator: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SgsLengthControl
						label={ __( 'Space around the separator', 'sgs-blocks' ) }
						help={ __( 'The gap on each side of every separator. Empty keeps the theme’s small gap.', 'sgs-blocks' ) }
						value={ attributes.itemGap || '' }
						onChange={ ( val ) => setAttributes( { itemGap: val || '' } ) }
						presets={ false }
					/>
					<SelectControl
						label={ __( 'On product pages, include', 'sgs-blocks' ) }
						help={ __( 'Adds the product’s primary category and/or brand to the trail, between the shop link and the product title. Brand needs a "Product brand" taxonomy term set on the product.', 'sgs-blocks' ) }
						value={ productPageCrumbs }
						options={ PRODUCT_PAGE_CRUMBS_OPTIONS }
						onChange={ ( val ) => setAttributes( { productPageCrumbs: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Show the archive crumb', 'sgs-blocks' ) }
						help={ __( 'On a single post or product, the link to its archive (e.g. the shop page).', 'sgs-blocks' ) }
						checked={ showArchiveCrumb !== false }
						onChange={ ( val ) => setAttributes( { showArchiveCrumb: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show the current page', 'sgs-blocks' ) }
						help={ __( 'End the trail with this page’s own title.', 'sgs-blocks' ) }
						checked={ showCurrentCrumb !== false }
						onChange={ ( val ) => setAttributes( { showCurrentCrumb: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ── Spacing panel ── padding/margin are each a single block-owned
				   tier-object attr { desktop, tablet, mobile }, written via
				   ResponsiveOverride + SgsBoxControl; read directly by this
				   block's render.php. ── */ }
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveOverride
						value={ attributes.padding }
						onChange={ ( obj ) => setAttributes( { padding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						value={ attributes.margin }
						onChange={ ( obj ) => setAttributes( { margin: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Margin', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourStates={ [
							{ key: 'normal', label: __( 'Normal', 'sgs-blocks' ), value: borderColour,
							  onChange: ( val ) => setAttributes( { borderColour: val ?? '' } ),
							  gradientValue: borderColourGradient,
							  onGradientChange: ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) },
							{ key: 'hover', label: __( 'Hover', 'sgs-blocks' ), value: borderColourHover,
							  onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
							  gradientValue: borderColourHoverGradient,
							  onGradientChange: ( val ) => setAttributes( { borderColourHoverGradient: val ?? '' } ) },
						] }
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
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				{ /* Typography — replaces the old WP-native supports.typography
				   (fontSize only) with the shared TypographyControls component +
				   sgs_typography_css_rule() render.php helper (D971/D972
				   full-replacement track). Root prefix "" since this is a
				   single-target block; defaults also expose weight/style/line-
				   height, which native typography never offered here. */ }
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls fontSizePresets showFontFamily showDecoration showTransform showLetterSpacing showTextAlign showTextWrap showTextColumns showWritingMode
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
					/>
				</PanelBody>
			</InspectorControls>

			<nav { ...blockProps } aria-label={ __( 'Breadcrumbs', 'sgs-blocks' ) }>
				<ol className="sgs-breadcrumbs__list" style={ gapStyle }>
					{ showHome && (
						<li className="sgs-breadcrumbs__item" style={ gapStyle }>
							<a href="#" style={ linkPaint }>{ homeLabel }</a>
							<span className="sgs-breadcrumbs__separator" aria-hidden="true" style={ separatorPaint }>{ separator }</span>
						</li>
					) }
					{ showArchiveCrumb !== false && (
						<li className="sgs-breadcrumbs__item" style={ gapStyle }>
							<a href="#" style={ linkPaint }>{ __( 'Parent Page', 'sgs-blocks' ) }</a>
							<span className="sgs-breadcrumbs__separator" aria-hidden="true" style={ separatorPaint }>{ separator }</span>
						</li>
					) }
					{ ( productPageCrumbs === 'category' || productPageCrumbs === 'both' ) && (
						<li className="sgs-breadcrumbs__item" style={ gapStyle }>
							<a href="#" style={ linkPaint }>{ __( 'Category', 'sgs-blocks' ) }</a>
							<span className="sgs-breadcrumbs__separator" aria-hidden="true" style={ separatorPaint }>{ separator }</span>
						</li>
					) }
					{ ( productPageCrumbs === 'brand' || productPageCrumbs === 'both' ) && (
						<li className="sgs-breadcrumbs__item" style={ gapStyle }>
							<a href="#" style={ linkPaint }>{ __( 'Brand', 'sgs-blocks' ) }</a>
							<span className="sgs-breadcrumbs__separator" aria-hidden="true" style={ separatorPaint }>{ separator }</span>
						</li>
					) }
					{ showCurrentCrumb !== false && ( <li
						className="sgs-breadcrumbs__item sgs-breadcrumbs__item--current"
						aria-current="page"
						style={ { ...gapStyle, ...resolveTextColourPreviewStyle( currentColour, currentColourGradient, colourVar ) } }
					>
						{ __( 'Current Page', 'sgs-blocks' ) }
					</li> ) }
				</ol>
			</nav>
		</>
	);
}
