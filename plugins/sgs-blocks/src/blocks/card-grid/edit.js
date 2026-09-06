import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { useEffect, useMemo } from '@wordpress/element';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	Button,
	TextControl,
	ToggleControl,
	Spinner,
	FocalPointPicker,
} from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import {
	ProductTaxonomyChecklist,
	ProductHandpickPanel,
} from './components/product-panels';
import { ShadowControl, TypographyControls, ResponsiveBoxControl, LinkPopoverField, SgsLengthControl, MEDIA_SIZING_RATIO_OPTIONS,
	SgsBorderControl,
	resolveColourToken,
	DesignTokenPicker,
	GradientCapableColourControl,
} from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import MediaPicker from '../../components/MediaPicker';
import CollectionPanel from './components/collection-panel';
import { colourVar, spacingVar, resolveResponsiveTier, resolveTextColourPreviewStyle, generateItemKey, withStableItemKeys, focalPointToObjectPosition } from '../../utils';

const VARIANT_OPTIONS = [
	{ label: __( 'Card', 'sgs-blocks' ), value: 'card' },
	{ label: __( 'Overlay', 'sgs-blocks' ), value: 'overlay' },
];

// D649 — no JSON `enum` reliance in the UI list order matters less than the
// allow-list itself matching render.php's exactly (mirrors sgs/icon-list).
const HEADING_LEVEL_OPTIONS = [
	{ label: __( 'Heading 2', 'sgs-blocks' ), value: 'h2' },
	{ label: __( 'Heading 3', 'sgs-blocks' ), value: 'h3' },
	{ label: __( 'Heading 4', 'sgs-blocks' ), value: 'h4' },
	{ label: __( 'Heading 5', 'sgs-blocks' ), value: 'h5' },
	{ label: __( 'Heading 6', 'sgs-blocks' ), value: 'h6' },
	{ label: __( 'Paragraph (not a heading)', 'sgs-blocks' ), value: 'p' },
];

// C19 ratio-mode adoption (2026-08-27) — reuses MediaSizingPanel's shared
// six-value ratio list (spaced format, "16 / 9" etc.) rather than this
// block's own hand-rolled set (which included a non-CSS "auto" value and
// unspaced ratios not shared with any other block). render.php now
// whitelists against this exact six-value set, falling back to this
// block's own existing default ('16/10') for anything outside it — so an
// existing '16/10'/'auto'/'3/2' stored value keeps rendering exactly as
// before rather than breaking.
const ASPECT_RATIO_OPTIONS = MEDIA_SIZING_RATIO_OPTIONS;

const HOVER_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Zoom', 'sgs-blocks' ), value: 'zoom' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Overlay Slide', 'sgs-blocks' ), value: 'overlay-slide' },
];

const EASING_OPTIONS = [
	{ label: __( 'Ease in-out', 'sgs-blocks' ), value: 'ease-in-out' },
	{ label: __( 'Ease', 'sgs-blocks' ), value: 'ease' },
	{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
	{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
	{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
];

const PRODUCT_COLLECTION_OPTIONS = [
	{ label: __( 'Latest', 'sgs-blocks' ), value: 'latest' },
	{ label: __( 'Best selling', 'sgs-blocks' ), value: 'best-selling' },
	{ label: __( 'Highest price', 'sgs-blocks' ), value: 'price-high' },
	{ label: __( 'Lowest price', 'sgs-blocks' ), value: 'price-low' },
	{ label: __( 'Top rated', 'sgs-blocks' ), value: 'top-rated' },
];

const BADGE_VARIANT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Success', 'sgs-blocks' ), value: 'success' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
];

// Card style presets — a CONVENIENCE picker, not stored state. Selecting one
// writes straight into the same 5 attrs the manual controls below read/write
// (cardBackground/cardBorderColour/cardBorderWidth/cardRadius/cardShadow), so
// there is only ever ONE CSS rule per property (no competing
// register_block_style() variation any more — retired 2026-08-11, it always
// lost the specificity fight against these attrs' own scoped rule). Values
// mirror the 4 card-grid inserter variations in
// includes/variations/sgs-card-grid-variations.php — keep both in sync.
const CARD_STYLE_PRESETS = {
	default: {
		cardBackground: '',
		cardBorderColour: '',
		cardBorderWidth: {},
		cardRadius: '',
		cardShadow: '',
		cardShadowColour: '',
	},
	elevated: {
		cardBackground: 'surface',
		cardBorderColour: '',
		cardBorderWidth: {},
		cardRadius: '8px',
		// Bare preset slug — self-contained (colour baked in by theme.json), so
		// cardShadowColour stays empty; sgs_shadow_value_composed() ignores it
		// for a preset slug.
		cardShadow: 'raised',
		cardShadowColour: '',
	},
	boxed: {
		cardBackground: 'surface',
		cardBorderColour: 'border',
		cardBorderWidth: { top: '1px', right: '1px', bottom: '1px', left: '1px' },
		cardRadius: '8px',
		// Zero-size shape (D621/D622 colour split) — explicitly resets any
		// inherited shadow to none; colour is moot at zero offset/blur/spread.
		cardShadow: '0px 0px 0px 0px',
		cardShadowColour: '',
	},
	borderless: {
		cardBackground: 'transparent',
		cardBorderColour: '',
		cardBorderWidth: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
		cardRadius: '0px',
		cardShadow: '0px 0px 0px 0px',
		cardShadowColour: '',
	},
};

const CARD_STYLE_PRESET_OPTIONS = [
	{ label: __( 'Choose a preset…', 'sgs-blocks' ), value: '' },
	{ label: __( 'Default', 'sgs-blocks' ), value: 'default' },
	{ label: __( 'Elevated', 'sgs-blocks' ), value: 'elevated' },
	{ label: __( 'Boxed', 'sgs-blocks' ), value: 'boxed' },
	{ label: __( 'Borderless', 'sgs-blocks' ), value: 'borderless' },
];

function ItemEditor( { item, index, onChange, onRemove } ) {
	const update = ( key, value ) => {
		onChange( { ...item, [ key ]: value } );
	};

	return (
		<div
			style={ {
				padding: '12px',
				border: '1px solid #ddd',
				borderRadius: '4px',
				marginBottom: '12px',
			} }
		>
			<p style={ { margin: '0 0 8px', fontWeight: 600 } }>
				{ __( 'Item', 'sgs-blocks' ) } { index + 1 }
			</p>
			<div style={ { marginBottom: '8px' } }>
				<MediaPicker
					value={ item.media || null }
					onChange={ ( media ) => onChange( { ...item, media } ) }
					onRemove={ () => onChange( { ...item, media: null } ) }
					label={ __( 'Select card media', 'sgs-blocks' ) }
					instructionsImage={ __(
						'Choose an image or video for this card',
						'sgs-blocks'
					) }
				/>
			</div>
			{ /* Gated on media existing — an unavailable image shows no crop
			     control, matching the avatar/work disclosure pattern on
			     sgs/testimonial. Spec 35 Part 4: per-item, keyed by item._key
			     in render.php, never by array index. */ }
			{ !! item.media?.url && (
				<>
					<SelectControl
						label={ __( 'Image fit', 'sgs-blocks' ) }
						value={ item.objectFit || 'cover' }
						options={ [
							{ label: __( 'Cover (crop to fill)', 'sgs-blocks' ), value: 'cover' },
							{ label: __( 'Contain (fit within, no crop)', 'sgs-blocks' ), value: 'contain' },
							{ label: __( 'Fill (stretch)', 'sgs-blocks' ), value: 'fill' },
						] }
						onChange={ ( val ) => update( 'objectFit', val ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ 'cover' === ( item.objectFit || 'cover' ) && (
						<FocalPointPicker
							label={ __( 'Focal point', 'sgs-blocks' ) }
							url={ item.media.url }
							value={ item.focalPoint || { x: 0.5, y: 0.5 } }
							onChange={ ( val ) => update( 'focalPoint', val ) }
						/>
					) }
				</>
			) }
			<ToggleControl
				label={ __( 'Decorative — hide from screen readers', 'sgs-blocks' ) }
				checked={ !! item.decorative }
				onChange={ ( val ) => update( 'decorative', val ) }
				help={ __(
					'Turn on for a purely decorative card image with no informational content — screen readers will skip it entirely (WCAG 1.1.1).',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Title', 'sgs-blocks' ) }
				value={ item.title || '' }
				onChange={ ( val ) => update( 'title', val ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TextControl
				label={ __( 'Subtitle', 'sgs-blocks' ) }
				value={ item.subtitle || '' }
				onChange={ ( val ) => update( 'subtitle', val ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TextControl
				label={ __( 'Badge text', 'sgs-blocks' ) }
				value={ item.badge || '' }
				onChange={ ( val ) => update( 'badge', val ) }
				placeholder={ __(
					'e.g. Trade prices from £3.50/kg',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<SelectControl
				label={ __( 'Badge style', 'sgs-blocks' ) }
				value={ item.badgeVariant || '' }
				options={ BADGE_VARIANT_OPTIONS }
				onChange={ ( val ) => update( 'badgeVariant', val ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ /* Spec 35 §2 LINK standard — replaces the superseded inline
			   `SgsLinkControl` mount. `item.linkTarget` is a boolean-shaped
			   enum ('_self'/'_blank' only per block.json), so
			   targetMode="boolean" matches the declared schema exactly. */ }
			<LinkPopoverField
				label={ __( 'Link', 'sgs-blocks' ) }
				help={ __(
					'Search your site or paste a URL to make this card clickable.',
					'sgs-blocks'
				) }
				value={ {
					url: item.link || '',
					linkTarget: item.linkTarget || '_self',
					rel: item.linkRel || '',
				} }
				targetMode="boolean"
				onChange={ ( next ) => {
					const patch = { ...item };
					if ( undefined !== next.url ) patch.link = next.url;
					if ( undefined !== next.linkTarget ) patch.linkTarget = next.linkTarget;
					if ( undefined !== next.rel ) patch.linkRel = next.rel;
					onChange( patch );
				} }
			/>
			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
				style={ { marginTop: '8px' } }
			>
				{ __( 'Remove item', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		variant,
		headingLevel,
		items: rawItems,
		columns,
		gap,
		aspectRatio,
		effectHover,
		titleColour,
		titleColourHover,
		titleColourGradient,
		subtitleColour,
		subtitleColourHover,
		subtitleColourGradient,
		cardBackground,
		cardBackgroundGradient,
		cardBorderColour,
		cardBorderColourGradient,
		cardBorderWidth,
		cardRadius,
		cardShadow,
		cardShadowColour,
		backgroundColourHover,
		backgroundColourHoverGradient,
		borderColourHover,
		borderColourHoverGradient,
		textColourHover,
		shadowHover,
		shadowHoverColour,
		transitionDuration,
		transitionEasing,
		scaleHover,
		imageZoomHover,
		grayscaleHover,
		staggerDelay,
		source,
		queryPostType,
		queryPostsPerPage,
		queryCategory,
		productSource,
		productCollection,
		productLimit,
		productCategories,
		productTags,
		productFeatured,
		productOnSale,
		productInStock,
		productIds,
		productShowLadder,
		productEmptyMessage,
	} = attributes;

	// Stable per-item `_key` for CSS scoping (Spec 35 Part 4) — backfilled
	// silently for items authored before this field existed. useMemo keeps
	// the generated keys stable within a render even before the effect
	// below persists them; the effect fires at most once per real backfill
	// (withStableItemKeys returns the SAME reference when nothing changed).
	const items = useMemo( () => withStableItemKeys( rawItems ), [ rawItems ] );
	useEffect( () => {
		if ( items !== rawItems ) {
			setAttributes( { items } );
		}
	}, [ items, rawItems, setAttributes ] );

	const isQueryMode = source === 'query';
	const isWcProductMode = source === 'wc-product';
	const isCptCollectionMode = source === 'cpt-collection';

	// Contrast check for card text (title/subtitle) against the card's
	// background. `contrastAgainst` only accepts a FLAT colour/token, so this
	// only fires when a flat `cardBackground` is set AND no
	// `cardBackgroundGradient` overrides it — when a gradient is set, the
	// gradient (not the flat colour) is what actually paints, so comparing
	// against the flat colour would compare against a surface that isn't
	// rendered. Otherwise the check is skipped (ambiguous/inherited/gradient
	// background). Mirrors site-header-row's rowHasOwnBackground pattern.
	const cardBackgroundForContrast =
		cardBackground && ! cardBackgroundGradient ? cardBackground : '';

	// Flat help-text resolution (no nested ternary — S3358).
	let sourceHelp = __( 'Add and arrange cards manually below.', 'sgs-blocks' );
	if ( isWcProductMode ) {
		sourceHelp = __( 'Products are pulled from your WooCommerce catalogue.', 'sgs-blocks' );
	} else if ( isCptCollectionMode ) {
		sourceHelp = __(
			'Products are pulled from your SGS product library. This works whether or not WooCommerce is installed.',
			'sgs-blocks'
		);
	} else if ( isQueryMode ) {
		sourceHelp = __( 'Cards are pulled automatically from your posts.', 'sgs-blocks' );
	}

	const className = [
		'sgs-card-grid',
		`sgs-card-grid--${ variant }`,
		`sgs-card-grid--hover-${ effectHover }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	// D649 — heading level is an identity control (document-outline placement),
	// not a style control; the tag mirrors render.php's own allowlist fallback.
	const HeadingTag = headingLevel || 'h3';

	// columns is a TIER OBJECT (Spec 35 pass 4) — resolve each tier explicitly,
	// or the editor preview would emit "--sgs-card-grid-columns: [object
	// Object]" and CSS custom properties silently fail to apply (same D567
	// class as the container/gridTemplateColumns fix).
	const columnsDesktop = resolveResponsiveTier( columns, 'desktop' )?.value || 3;
	const columnsTabletTier = resolveResponsiveTier( columns, 'tablet' )?.value || 2;
	const columnsMobileTier = resolveResponsiveTier( columns, 'mobile' )?.value || 1;

	const gridStyle = {
		'--sgs-card-grid-columns': columnsDesktop,
		'--sgs-card-grid-columns-tablet': columnsTabletTier,
		'--sgs-card-grid-columns-mobile': columnsMobileTier,
		'--sgs-card-grid-gap': spacingVar( gap ),
		'--sgs-card-grid-aspect': aspectRatio,
	};

	const titleStyle = resolveTextColourPreviewStyle( titleColour, titleColourGradient, colourVar );

	const subtitleStyle = resolveTextColourPreviewStyle( subtitleColour, subtitleColourGradient, colourVar );

	const updateItem = ( index, updatedItem ) => {
		const updated = [ ...items ];
		updated[ index ] = updatedItem;
		setAttributes( { items: updated } );
	};

	const removeItem = ( index ) => {
		setAttributes( {
			items: items.filter( ( _, i ) => i !== index ),
		} );
	};

	const addItem = () => {
		setAttributes( {
			items: [
				...items,
				{
					media: null,
					title: '',
					subtitle: '',
					badge: '',
					badgeVariant: '',
					link: '',
					decorative: false,
					_key: generateItemKey(),
					objectFit: 'cover',
					focalPoint: { x: 0.5, y: 0.5 },
				},
			],
		} );
	};

	return (
		<>
			{ /* Spec 35 THE PLACEMENT RULE (D537) — TIER 1: one panel per declared
			   element (supports.sgs.elements), holding that element's content,
			   style and hover TOGETHER. Replaces the old single grouped
			   "Colour" panel that mixed title/subtitle/card colours across 3
			   different elements. Each element's colour rows are mounted the
			   same way SgsColourPanel mounts its own rows internally
			   (InspectorControls group="styles" + PanelBody + DesignTokenPicker/
			   GradientCapableColourControl) — SgsColourPanel itself has no
			   per-caller title override, so these are built directly rather
			   than forcing a shared-component change for 3 blocks (Rule 7 —
			   shared-mechanism changes need a design gate). */ }

			{ /* TITLE element — content (heading level) in Settings, colour+hover
			   in Styles. Both panels share the "Title" name so they read as
			   one conceptual element panel split across WP's native tabs
			   (the interim state ahead of SGS's own 3-tab bar, Spec 35 PART O). */ }
			<InspectorControls>
				<PanelBody title={ __( 'Title', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Heading level', 'sgs-blocks' ) }
						value={ headingLevel || 'h3' }
						options={ HEADING_LEVEL_OPTIONS }
						onChange={ ( val ) => setAttributes( { headingLevel: val } ) }
						help={ __(
							'Pick the level that fits your page outline — usually H2 or H3 depending on what comes before this grid.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Title', 'sgs-blocks' ) } className="sgs-colour-panel">
					<GradientCapableColourControl
						label={ __( 'Title colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: titleColour,
								onChange: ( val ) => setAttributes( { titleColour: val ?? '' } ),
								linked: true,
								gradientValue: titleColourGradient,
								onGradientChange: ( val ) => setAttributes( { titleColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: titleColourHover,
								onChange: ( val ) => setAttributes( { titleColourHover: val ?? '' } ),
								linked: true,
							},
						] }
						{ ...( cardBackgroundForContrast ? { contrastAgainst: cardBackgroundForContrast } : {} ) }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* SUBTITLE element — colour+hover only, no content control of its
			   own (the subtitle text itself is authored per-item, not a
			   block-level setting). */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Subtitle', 'sgs-blocks' ) } className="sgs-colour-panel">
					<GradientCapableColourControl
						label={ __( 'Subtitle colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: subtitleColour,
								onChange: ( val ) => setAttributes( { subtitleColour: val ?? '' } ),
								linked: true,
								gradientValue: subtitleColourGradient,
								onGradientChange: ( val ) => setAttributes( { subtitleColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: subtitleColourHover,
								onChange: ( val ) => setAttributes( { subtitleColourHover: val ?? '' } ),
								linked: true,
							},
						] }
						{ ...( cardBackgroundForContrast ? { contrastAgainst: cardBackgroundForContrast } : {} ) }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* CARD element (block.json's "item") — background/border/shadow
			   colour+hover plus the item's hover-only text colour, all in ONE
			   panel per THE PLACEMENT RULE. cardBackground pairs with
			   backgroundColourHover and cardBorderColour pairs with
			   borderColourHover — both target `.sgs-card-grid__item`
			   (render.php item element, confirmed via block.json's element
			   manifest + render.php:74-78/211-234/266-272/411-419). Text
			   colour on the card item is HOVER-ONLY — render.php has no
			   resting textColour attribute for the item, only
			   textColourHover (render.php:68,414) — so that row carries a
			   single Hover state, no Normal state. The shadow builder
			   (cardShadow/shadowHover, shape + colour) lives here too — see
			   the "Card Styling (resting state)" panel below for the rest of
			   the item's non-colour box styling (border width, radius). */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Card', 'sgs-blocks' ) } className="sgs-colour-panel">
					<DesignTokenPicker
						label={ __( 'Card background colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: cardBackground,
								onChange: ( val ) => setAttributes( { cardBackground: val ?? '' } ),
								linked: true,
								gradientValue: cardBackgroundGradient,
								onGradientChange: ( val ) =>
									setAttributes( { cardBackgroundGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: backgroundColourHover,
								onChange: ( val ) => setAttributes( { backgroundColourHover: val ?? '' } ),
								linked: true,
								gradientValue: backgroundColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { backgroundColourHoverGradient: val ?? '' } ),
							},
						] }
					/>
					<DesignTokenPicker
						label={ __( 'Card border colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: cardBorderColour,
								onChange: ( val ) => setAttributes( { cardBorderColour: val ?? '' } ),
								linked: true,
								gradientValue: cardBorderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { cardBorderColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: borderColourHover,
								onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
								linked: true,
								gradientValue: borderColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { borderColourHoverGradient: val ?? '' } ),
							},
						] }
					/>
					<DesignTokenPicker
						label={ __( 'Card text colour (hover)', 'sgs-blocks' ) }
						states={ [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: textColourHover,
								onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
								linked: true,
							},
						] }
					/>
					<DesignTokenPicker
						label={ __( 'Card shadow colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: cardShadowColour,
								onChange: ( val ) => setAttributes( { cardShadowColour: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: shadowHoverColour,
								onChange: ( val ) => setAttributes( { shadowHoverColour: val ?? '' } ),
								linked: true,
							},
						] }
					/>
					<ShadowControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ {
							base: 'cardShadow',
							colour: 'cardShadowColour',
						} }
					/>
					{ /* shadowHover — declared + read by render.php (--sgs-hover-shadow)
						but had NO editor control at all until this fix (Stage 0 orphan
						attr, D621/D622). Landed straight on the target shape (shape +
						colour), matching cardShadow above. */ }
					<ShadowControl
						label={ __( 'Shadow (hover)', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ {
							base: 'shadowHover',
							colour: 'shadowHoverColour',
						} }
					/>
					{ /* Moved in from the Settings-tab "Card Styling (resting
					     state)" panel (D622 — an element-scoped control
					     belongs in its own element's TIER 1 panel;
					     cardBorderWidth/cardRadius are owned by "Card"). */ }
					<ResponsiveBoxControl
						label={ __( 'Border width', 'sgs-blocks' ) }
						showResponsive={ false }
						presets={ [ '10', '20', '30' ] }
						values={ { base: cardBorderWidth || {} } }
						onChange={ ( _tier, next ) =>
							setAttributes( { cardBorderWidth: next } )
						}
					/>
					<SgsLengthControl
						label={ __( 'Corner radius', 'sgs-blocks' ) }
						value={ cardRadius || '' }
						onChange={ ( val ) =>
							setAttributes( { cardRadius: val || '' } )
						}
						units={ [
							{ value: 'px', label: 'px', default: 8 },
							{ value: '%', label: '%', default: 50 },
							{ value: 'rem', label: 'rem', default: 0.5 },
							{ value: 'em', label: 'em', default: 0.5 },
						] }
						help={ __(
							'Leave empty to use the theme default.',
							'sgs-blocks'
						) }
						presets={ false }
					/>
				</PanelBody>
			</InspectorControls>

			<InspectorControls>
				<ContainerWrapperControls attributes={ attributes } setAttributes={ setAttributes } kind="layout" />
				<PanelBody title={ __( 'Content Source', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Source', 'sgs-blocks' ) }
						value={ source || 'manual' }
						options={ [
							{ label: __( 'Manual (custom items)', 'sgs-blocks' ), value: 'manual' },
							{ label: __( 'Query (from posts)', 'sgs-blocks' ), value: 'query' },
							{ label: __( 'WooCommerce products', 'sgs-blocks' ), value: 'wc-product' },
							{ label: __( 'Product collection (no WooCommerce needed)', 'sgs-blocks' ), value: 'cpt-collection' },
						] }
						onChange={ ( val ) => setAttributes( { source: val } ) }
						help={ sourceHelp }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ isQueryMode && (
						<>
							<SelectControl
								label={ __( 'Post type', 'sgs-blocks' ) }
								value={ queryPostType || 'post' }
								options={ [
									{ label: __( 'Posts', 'sgs-blocks' ), value: 'post' },
									{ label: __( 'Pages', 'sgs-blocks' ), value: 'page' },
								] }
								onChange={ ( val ) => setAttributes( { queryPostType: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<RangeControl
								label={ __( 'Number of cards', 'sgs-blocks' ) }
								value={ queryPostsPerPage || 6 }
								onChange={ ( val ) => setAttributes( { queryPostsPerPage: val } ) }
								min={ 1 }
								max={ 24 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<TextControl
								label={ __( 'Category ID (optional)', 'sgs-blocks' ) }
								value={ queryCategory ? String( queryCategory ) : '' }
								onChange={ ( val ) => setAttributes( { queryCategory: Number.parseInt( val, 10 ) || 0 } ) }
								type="number"
								help={ __( 'Filter by category ID. Leave 0 for all categories.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</>
					) }
				</PanelBody>

				{ /* ── Collection panel: visible only in cpt-collection mode ── */ }
				{ isCptCollectionMode && (
					<CollectionPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
				) }

				{ /* ── Products panel: visible only in wc-product mode.
					   S7 pilot (2026-09-02, uniformity sweep): converted from a flat
					   PanelBody to a ToolsPanel. Selection mode is core config
					   (isShownByDefault); collection/handpick controls and filters
					   are optional and resettable. */ }
				{ isWcProductMode && (
					<ToolsPanel
						label={ __( 'Products', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								productSource: 'collection',
								productCollection: 'latest',
								productLimit: 6,
								productCategories: [],
								productTags: [],
								productInStock: true,
								productOnSale: false,
								productFeatured: false,
								productShowLadder: false,
								productEmptyMessage: '',
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Selection mode', 'sgs-blocks' ) }
							hasValue={ () => ( productSource || 'collection' ) !== 'collection' }
							onDeselect={ () => setAttributes( { productSource: 'collection' } ) }
							isShownByDefault
						>
							<SelectControl
								label={ __( 'Selection mode', 'sgs-blocks' ) }
								value={ productSource || 'collection' }
								options={ [
									{ label: __( 'Smart collection', 'sgs-blocks' ), value: 'collection' },
									{ label: __( 'Hand-pick specific products', 'sgs-blocks' ), value: 'handpick' },
								] }
								onChange={ ( val ) => setAttributes( { productSource: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>

						{ ( productSource || 'collection' ) === 'collection' && (
							<>
								<ToolsPanelItem
									label={ __( 'Smart collection', 'sgs-blocks' ) }
									hasValue={ () => ( productCollection || 'latest' ) !== 'latest' }
									onDeselect={ () => setAttributes( { productCollection: 'latest' } ) }
									isShownByDefault
								>
									<SelectControl
										label={ __( 'Smart collection', 'sgs-blocks' ) }
										value={ productCollection || 'latest' }
										options={ PRODUCT_COLLECTION_OPTIONS }
										onChange={ ( val ) => setAttributes( { productCollection: val } ) }
										help={ __( 'One-click preset ordering for your product grid.', 'sgs-blocks' ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Number of products', 'sgs-blocks' ) }
									hasValue={ () => ( productLimit || 6 ) !== 6 }
									onDeselect={ () => setAttributes( { productLimit: 6 } ) }
									isShownByDefault
								>
									<RangeControl
										label={ __( 'Number of products', 'sgs-blocks' ) }
										value={ productLimit || 6 }
										onChange={ ( val ) => setAttributes( { productLimit: val } ) }
										min={ 1 }
										max={ 24 }
										help={ __( 'Maximum 24 products.', 'sgs-blocks' ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Categories', 'sgs-blocks' ) }
									hasValue={ () => ( productCategories || [] ).length > 0 }
									onDeselect={ () => setAttributes( { productCategories: [] } ) }
								>
									<p style={ { margin: '12px 0 4px', fontWeight: 600, fontSize: 12 } }>
										{ __( 'Filters', 'sgs-blocks' ) }
									</p>
									<ProductTaxonomyChecklist
										taxonomy="product_cat"
										label={ __( 'Categories', 'sgs-blocks' ) }
										attributeKey="productCategories"
										selectedIds={ productCategories || [] }
										setAttributes={ setAttributes }
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Tags', 'sgs-blocks' ) }
									hasValue={ () => ( productTags || [] ).length > 0 }
									onDeselect={ () => setAttributes( { productTags: [] } ) }
								>
									<ProductTaxonomyChecklist
										taxonomy="product_tag"
										label={ __( 'Tags', 'sgs-blocks' ) }
										attributeKey="productTags"
										selectedIds={ productTags || [] }
										setAttributes={ setAttributes }
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'In stock only', 'sgs-blocks' ) }
									hasValue={ () => productInStock !== true }
									onDeselect={ () => setAttributes( { productInStock: true } ) }
								>
									<SelectControl
										label={ __( 'In stock only', 'sgs-blocks' ) }
										value={ productInStock === false ? 'no' : 'yes' }
										options={ [
											{ label: __( 'Yes (recommended)', 'sgs-blocks' ), value: 'yes' },
											{ label: __( 'No — include out-of-stock', 'sgs-blocks' ), value: 'no' },
										] }
										onChange={ ( val ) => setAttributes( { productInStock: val === 'yes' } ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'On sale only', 'sgs-blocks' ) }
									hasValue={ () => productOnSale !== false }
									onDeselect={ () => setAttributes( { productOnSale: false } ) }
								>
									<SelectControl
										label={ __( 'On sale only', 'sgs-blocks' ) }
										value={ productOnSale ? 'yes' : 'no' }
										options={ [
											{ label: __( 'No', 'sgs-blocks' ), value: 'no' },
											{ label: __( 'Yes — sale items only', 'sgs-blocks' ), value: 'yes' },
										] }
										onChange={ ( val ) => setAttributes( { productOnSale: val === 'yes' } ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Featured only', 'sgs-blocks' ) }
									hasValue={ () => productFeatured !== false }
									onDeselect={ () => setAttributes( { productFeatured: false } ) }
								>
									<SelectControl
										label={ __( 'Featured only', 'sgs-blocks' ) }
										value={ productFeatured ? 'yes' : 'no' }
										options={ [
											{ label: __( 'No', 'sgs-blocks' ), value: 'no' },
											{ label: __( 'Yes — featured items only', 'sgs-blocks' ), value: 'yes' },
										] }
										onChange={ ( val ) => setAttributes( { productFeatured: val === 'yes' } ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
							</>
						) }

						{ ( productSource || 'collection' ) === 'handpick' && (
							<ProductHandpickPanel
								productIds={ productIds || [] }
								setAttributes={ setAttributes }
							/>
						) }

						<ToolsPanelItem
							label={ __( 'Show price breakdown on cards', 'sgs-blocks' ) }
							hasValue={ () => !! productShowLadder }
							onDeselect={ () => setAttributes( { productShowLadder: false } ) }
						>
							<ToggleControl
								label={ __( 'Show price breakdown on cards', 'sgs-blocks' ) }
								checked={ !! productShowLadder }
								onChange={ ( val ) => setAttributes( { productShowLadder: val } ) }
								help={ __( 'Off by default — grids are a browsing context; the ladder does its upsell work on the product page.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Empty state message', 'sgs-blocks' ) }
							hasValue={ () => productEmptyMessage !== '' }
							onDeselect={ () => setAttributes( { productEmptyMessage: '' } ) }
						>
							<TextControl
								label={ __( 'Empty state message', 'sgs-blocks' ) }
								value={ productEmptyMessage || '' }
								onChange={ ( val ) => setAttributes( { productEmptyMessage: val } ) }
								help={ __( 'Shown when no products match — never a blank region (FR-24-6).', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				) }

				{ ! isQueryMode && ! isWcProductMode && ! isCptCollectionMode && (
				<PanelBody title={ __( 'Items', 'sgs-blocks' ) }>
					{ items.map( ( item, index ) => (
						<ItemEditor
							key={ index }
							item={ item }
							index={ index }
							onChange={ ( updated ) =>
								updateItem( index, updated )
							}
							onRemove={ () => removeItem( index ) }
						/>
					) ) }
					<Button variant="secondary" onClick={ addItem }>
						{ __( 'Add item', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
				) }

				<PanelBody
					title={ __( 'Grid Settings', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Variant', 'sgs-blocks' ) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { variant: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ /* Responsive columns (desktop/tablet/mobile) are provided by the
					     ContainerWrapperControls LayoutPanel above when layout=grid.
					     Duplicate direct controls removed (Rule 3, Step 7b). */ }
					<SelectControl
						label={ __( 'Aspect ratio', 'sgs-blocks' ) }
						value={ aspectRatio }
						options={ ASPECT_RATIO_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { aspectRatio: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ effectHover }
						options={ HOVER_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { effectHover: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Hover Effects', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToolsPanel
						className="sgs-nested-tools-panel"
						label={ __( 'Hover Effects', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								scaleHover: '',
								imageZoomHover: false,
								grayscaleHover: false,
								staggerDelay: 80,
								transitionDuration: '300',
								transitionEasing: 'ease-in-out',
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Hover scale', 'sgs-blocks' ) }
							hasValue={ () => !! scaleHover }
							onDeselect={ () => setAttributes( { scaleHover: '' } ) }
							isShownByDefault
						>
							<RangeControl
								label={ __( 'Hover scale', 'sgs-blocks' ) }
								value={ parseFloat( scaleHover ) || 1 }
								onChange={ ( val ) => setAttributes( { scaleHover: String( val ) } ) }
								min={ 1 }
								max={ 1.1 }
								step={ 0.01 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Image zoom on hover', 'sgs-blocks' ) }
							hasValue={ () => imageZoomHover !== false }
							onDeselect={ () => setAttributes( { imageZoomHover: false } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Image zoom on hover', 'sgs-blocks' ) }
								help={ __( 'Zooms the card image on hover.', 'sgs-blocks' ) }
								checked={ imageZoomHover }
								onChange={ ( val ) => setAttributes( { imageZoomHover: val } ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Grayscale to colour', 'sgs-blocks' ) }
							hasValue={ () => grayscaleHover !== false }
							onDeselect={ () => setAttributes( { grayscaleHover: false } ) }
						>
							<ToggleControl
								label={ __( 'Grayscale to colour', 'sgs-blocks' ) }
								help={ __( 'Desaturates the card image at rest; restores full colour on hover.', 'sgs-blocks' ) }
								checked={ grayscaleHover }
								onChange={ ( val ) => setAttributes( { grayscaleHover: val } ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Stagger delay (ms)', 'sgs-blocks' ) }
							hasValue={ () => staggerDelay !== 80 }
							onDeselect={ () => setAttributes( { staggerDelay: 80 } ) }
						>
							<RangeControl
								label={ __( 'Stagger delay (ms)', 'sgs-blocks' ) }
								help={ __( 'Each card is delayed by a multiple of this value on entrance.', 'sgs-blocks' ) }
								value={ staggerDelay }
								onChange={ ( val ) => setAttributes( { staggerDelay: val } ) }
								min={ 0 }
								max={ 500 }
								step={ 25 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
							hasValue={ () => transitionDuration !== '300' }
							onDeselect={ () => setAttributes( { transitionDuration: '300' } ) }
						>
							<RangeControl
								label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
								value={ parseInt( transitionDuration, 10 ) || 300 }
								onChange={ ( val ) => setAttributes( { transitionDuration: String( val ) } ) }
								min={ 100 }
								max={ 1000 }
								step={ 50 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Transition easing', 'sgs-blocks' ) }
							hasValue={ () => transitionEasing !== 'ease-in-out' }
							onDeselect={ () => setAttributes( { transitionEasing: 'ease-in-out' } ) }
						>
							<SelectControl
								label={ __( 'Transition easing', 'sgs-blocks' ) }
								value={ transitionEasing }
								options={ EASING_OPTIONS }
								onChange={ ( val ) => setAttributes( { transitionEasing: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				</PanelBody>

				<PanelBody
					title={ __( 'Text Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /*
					 * Multi-target switcher (2026-09-05) — title + subtitle share
					 * ONE full control set at a time instead of stacking two,
					 * proving the shared TypographyControls `targets` API against
					 * a real 2-target block. `card-grid` was picked over
					 * `sgs/testimonial` because testimonial's quote/summary are
					 * NOT actually on this shared component yet (flat legacy
					 * string attrs + hand-rolled controls) — migrating them was
					 * out of scope for this task; title/subtitle here are
					 * genuinely object-typed + already rendered via
					 * sgs_typography_css_rule(), so this is a real, clean case.
					 */ }
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						targets={ [
							{
								key: 'title',
								label: __( 'Title', 'sgs-blocks' ),
								prefix: 'title',
								showWeight: false,
								showStyle: false,
								showLineHeight: false,
							},
							{
								key: 'subtitle',
								label: __( 'Subtitle', 'sgs-blocks' ),
								prefix: 'subtitle',
								showWeight: false,
								showStyle: false,
								showLineHeight: false,
							},
						] }
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Card Styling (resting state)', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<p style={ { margin: '0 0 12px', fontSize: 12, color: '#757575' } }>
						{ __(
							'Leave any field empty to keep the theme default — these only override the card at rest (see also Hover effect above for the hover styling).',
							'sgs-blocks'
						) }
					</p>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value=""
						options={ CARD_STYLE_PRESET_OPTIONS }
						onChange={ ( preset ) => {
							if ( ! preset || ! CARD_STYLE_PRESETS[ preset ] ) {
								return;
							}
							setAttributes( CARD_STYLE_PRESETS[ preset ] );
						} }
						help={ __(
							'Sets background, border, radius and shadow together as a starting point — fine-tune any field below afterwards.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ /* Border width + corner radius moved to the "Card" (item
					     element) colour panel above, Styles tab — D622. */ }
					{ /* cardShadow/shadowHover moved to the "Card" (item element)
					   colour panel above, Styles tab — Spec 35 THE PLACEMENT RULE
					   groups the shadow builder (shape + colour) with the rest of
					   the item's colour states rather than in this box-styling
					   panel. */ }
				</PanelBody>
				{ /* GRID element (wrapper) — border/radius resolve to the same
				   TIER-2 "Layout" property family as ContainerWrapperControls'
				   grid/gap/width controls above (block.json attrMap:
				   css:border-* → borderWidth/Style/Colour/Radius, all declared
				   on the `grid` element's `layout` cluster). Titled "Layout" so
				   it reads as the grid wrapper's Layout family rather than a
				   generic catch-all "Border" panel. */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
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

			{ /* Card-delegating modes (WooCommerce products / CPT collection): live
			     server-side preview, so the operator sees the real query result —
			     the same pattern sgs/content-collection used before the fold. */ }
			{ isWcProductMode || isCptCollectionMode ? (
				<div { ...blockProps }>
					<ServerSideRender
						block="sgs/card-grid"
						attributes={ attributes }
						LoadingResponsePlaceholder={ () => (
							<div style={ { padding: '2rem', textAlign: 'center' } }>
								<Spinner />
								<p style={ { marginTop: 8, color: '#6b7280' } }>
									{ __( 'Loading products…', 'sgs-blocks' ) }
								</p>
							</div>
						) }
					/>
				</div>
			) : (
				<div { ...blockProps } style={ { ...blockProps.style, ...gridStyle } }>
					{ items.length === 0 && (
						<p className="sgs-card-grid__placeholder">
							{ __(
								'Add items in the sidebar to build your grid.',
								'sgs-blocks'
							) }
						</p>
					) }
					{ items.map( ( item ) => {
						const itemMediaStyle = {
							objectFit: item.objectFit || 'cover',
							objectPosition:
								'cover' === ( item.objectFit || 'cover' )
									? focalPointToObjectPosition( item.focalPoint || { x: 0.5, y: 0.5 } )
									: undefined,
						};
						return (
						<div key={ item._key } className="sgs-card-grid__item">
							<div className="sgs-card-grid__image-wrap">
								{ item.media?.url ? (
									item.media.type === 'video' ? (
										// eslint-disable-next-line jsx-a11y/media-has-caption
										<video
											src={ item.media.url }
											className="sgs-card-grid__image"
											style={ itemMediaStyle }
											muted
											loop
											playsInline
										/>
									) : (
										<img
											src={ item.media.url }
											alt={ item.media.alt || '' }
											className="sgs-card-grid__image"
											style={ itemMediaStyle }
										/>
									)
								) : (
									<span className="sgs-card-grid__image-placeholder" />
								) }
								{ variant === 'overlay' && (
									<div className="sgs-card-grid__overlay">
										{ item.title && (
											<span
												className="sgs-card-grid__title"
												style={ titleStyle }
											>
												{ item.title }
											</span>
										) }
										{ item.subtitle && (
											<span
												className="sgs-card-grid__subtitle"
												style={ subtitleStyle }
											>
												{ item.subtitle }
											</span>
										) }
									</div>
								) }
							</div>
							{ variant === 'card' && (
								<div className="sgs-card-grid__body">
									{ item.title && (
										<HeadingTag
											className="sgs-card-grid__title"
											style={ titleStyle }
										>
											{ item.title }
										</HeadingTag>
									) }
									{ item.subtitle && (
										<p
											className="sgs-card-grid__subtitle"
											style={ subtitleStyle }
										>
											{ item.subtitle }
										</p>
									) }
									{ item.badge && item.badgeVariant && (
										<span
											className={ `sgs-card-grid__badge sgs-card-grid__badge--${ item.badgeVariant }` }
										>
											{ item.badge }
										</span>
									) }
								</div>
							) }
						</div>
					);
				} ) }
				</div>
			) }
		</>
	);
}
