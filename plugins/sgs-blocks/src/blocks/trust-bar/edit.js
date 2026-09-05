import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, RichText, useSettings } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { useEffect, useMemo } from '@wordpress/element';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	Button,
	RangeControl,
	Notice,
	BoxControl,
} from '@wordpress/components';
import { DesignTokenPicker, IconPicker, IconPreview, TypographyControls, ResponsiveBoxControl, ResponsiveOverride, ShadowControl, SgsColourPanel, LinkPopoverField, BOX_UNITS, normaliseResponsiveBox, SgsLengthControl, fillRow, textRow,
	SgsBorderControl,
	resolveColourToken,
} from '../../components';
import MediaPicker from '../../components/MediaPicker';
import { colourVar, resolveShadowPreview, resolveShadowPreviewComposed, resolveResponsiveTier, backgroundPreview, backgroundPaintPreview, textPaintPreview, spacingPreview, svgBackgroundPreview, generateItemKey, withStableItemKeys, resolveTextColourPreviewStyle } from '../../utils';
// trust-bar does not use the default <ContainerWrapperControls> aggregator —
// its "Content band" / "Responsive spacing" panels write to flat attrs
// (contentBandPaddingTop, paddingTopTablet, …) this block does not declare;
// its padding/margin/content-band values are box-object attrs
// (paddingTablet/paddingMobile/marginTablet/marginMobile/contentBandPadding+
// Tablet+Mobile). The individual panels needed are imported instead (mirrors
// sgs/container's + sgs/hero's own edit.js), and trust-bar rolls its own
// "Padding & margin" / "Content band" panels below using ResponsiveBoxControl
// bound to the object attrs.
import {
	WidthPanel,
	LayoutPanel,
	BackgroundPanel,
	ShapeDividersPanel,
	MIN_HEIGHT_OPTIONS,
} from '../container/components/ContainerWrapperControls';
// GridItemDefaultsPanel deliberately NOT imported — see the withdrawal note
// beside its former mount point below (D-pending, 2026-08-30). This block
// never renders a direct-child `.sgs-container` element, so the panel's
// `--sgs-gi-*` custom properties have no CSS consumer here.

/**
 * Resolve a gap attribute value to a valid CSS string for editor preview.
 *
 * Mirrors PHP sgs_container_gap_value() and container/edit.js gapCssValue():
 *  - Bare digit slug (e.g. "40") → var(--wp--preset--spacing--40)
 *  - Raw CSS length (e.g. "16px", "1.5rem") → pass through as-is
 *  - Empty / nullish → undefined (style key omitted)
 *
 * gap is a TIER OBJECT (Spec 35) — this resolves the desktop tier (what the
 * editor canvas shows) before formatting it, the same pattern feature-grid
 * and gallery use. String() on the raw object would yield "[object Object]".
 *
 * @param {Object|null|undefined} gap Gap attribute value ({desktop,tablet,mobile}).
 * @returns {string|undefined}
 */
function gapCssValue( gap ) {
	const gapDesktop = resolveResponsiveTier( gap, 'desktop' )?.value;
	if ( ! gapDesktop ) {
		return undefined;
	}
	if ( /^\d+$/.test( String( gapDesktop ) ) ) {
		return `var(--wp--preset--spacing--${ gapDesktop })`;
	}
	return String( gapDesktop );
}

/**
 * Resolve the desktop-tier `grid-template-columns` preview value.
 *
 * Mirrors the REAL winning mechanism in class-sgs-container-wrapper.php: an
 * object-shaped `gridTemplateColumns` attr is ALWAYS emitted (the unconditional
 * `isset() && is_array()` check at ~:2150, which lands in the responsive CSS
 * string after — and so overrides in the cascade — the legacy `columns`-based
 * base rule at ~:865). `columns` only drives the rendered grid when
 * `gridTemplateColumns`'s own tier is empty (render.php's `$gtc_base` fallback,
 * ~:854-858) — this is the ONLY case genuinely covered by `columns` any more,
 * since trust-bar declares `gridTemplateColumns` with a real, always-populated
 * default ({desktop:"repeat(4, 1fr)", …}), so that fallback rarely fires on a
 * fresh instance. Preserved anyway for a legacy/edge instance whose
 * `gridTemplateColumns` tier really is unset.
 *
 * @param {Object|null|undefined} gtc     gridTemplateColumns attribute ({desktop,tablet,mobile}).
 * @param {Object|null|undefined} cols    columns attribute ({desktop,tablet,mobile}).
 * @returns {string|undefined}
 */
function gridTemplateColumnsPreview( gtc, cols ) {
	const gtcDesktop = resolveResponsiveTier( gtc, 'desktop' )?.value;
	if ( gtcDesktop ) {
		return String( gtcDesktop );
	}
	const colsDesktop = resolveResponsiveTier( cols, 'desktop' )?.value;
	const count = colsDesktop ? parseInt( colsDesktop, 10 ) : 4;
	if ( ! count || count < 1 ) {
		return undefined;
	}
	return `repeat(${ count },1fr)`;
}

const BADGE_STYLE_OPTIONS = [
	{ label: __( 'Icon circle (default)', 'sgs-blocks' ), value: 'icon-circle' },
	{ label: __( 'Text only (pill badge)', 'sgs-blocks' ), value: 'text-only' },
	{ label: __( 'Image badge (logo / cert)', 'sgs-blocks' ), value: 'image-badge' },
];

const BADGE_SIZE_OPTIONS = [
	{ label: __( 'Small', 'sgs-blocks' ),  value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ),  value: 'large' },
];

const AUTO_SCROLL_SPEED_OPTIONS = [
	{ label: __( 'Slow (40s)', 'sgs-blocks' ),   value: 'slow' },
	{ label: __( 'Medium (25s)', 'sgs-blocks' ),  value: 'medium' },
	{ label: __( 'Fast (15s)', 'sgs-blocks' ),    value: 'fast' },
];

// ─── Editor sub-components ────────────────────────────────────────────────────

/** Circle wrapper with the actual selected icon for editor preview. */
function EditorIconCircle( { size, circleBg, iconColour, iconGradient, iconSlug, borderRadius, boxShadow, filled, fillColour } ) {
	// The filled class picks up the fill exemption from style.css (loaded in the
	// editor iframe), so the preview matches the frontend. fillColour drives the
	// same custom-fill var render.php sets.
	const style = {
		width: size,
		height: size,
		borderRadius: borderRadius || '50%',
		backgroundColor: circleBg || '#ffffff',
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
		boxShadow: boxShadow || '0 1px 2px rgba(0,0,0,0.06)',
		color: iconColour || 'currentColor',
	};
	if ( filled && fillColour ) {
		style[ '--sgs-trust-badge-icon-fill' ] = colourVar( fillColour );
	}
	return (
		<span
			className={ 'sgs-trust-bar__circle' + ( filled ? ' sgs-trust-bar__circle--filled' : '' ) }
			aria-hidden="true"
			style={ style }
		>
			<IconPreview
				source="lucide"
				name={ iconSlug || 'check' }
				size={ Math.round( size * 0.45 ) }
				gradient={ iconGradient }
			/>
		</span>
	);
}

/** Inspector item editor for icon-circle variant. */
function IconCircleItemEditor( { item, onChange, onRemove } ) {
	const update = ( key, value ) => onChange( { ...item, [ key ]: value } );
	return (
		<div
			style={ {
				padding: '12px',
				marginBottom: '12px',
				background: 'rgba(0,0,0,0.02)',
				borderRadius: '4px',
				border: '1px solid transparent',
			} }
		>
			<IconPicker
				label={ __( 'Icon', 'sgs-blocks' ) }
				value={ { source: 'lucide', name: item.icon || 'check' } }
				onChange={ ( { name } ) => update( 'icon', name ) }
				sources={ [ 'lucide' ] }
			/>
			<TextControl
				label={ __( 'Label', 'sgs-blocks' ) }
				value={ item.label || '' }
				onChange={ ( val ) => update( 'label', val ) }
				placeholder={ __( 'Badge label…', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<ToggleControl
				label={ __( 'Filled icon', 'sgs-blocks' ) }
				help={ __( 'Render the icon as a solid filled shape (e.g. a filled star) instead of a line outline.', 'sgs-blocks' ) }
				checked={ item.fillStyle === 'filled' }
				onChange={ ( val ) => update( 'fillStyle', val ? 'filled' : 'outline' ) }
				__nextHasNoMarginBottom
			/>
			{ item.fillStyle === 'filled' && (
				<DesignTokenPicker
					label={ __( 'Fill colour', 'sgs-blocks' ) }
					value={ item.fillColour || '' }
					onChange={ ( val ) => update( 'fillColour', val ) }
				/>
			) }
			<Button variant="secondary" isDestructive onClick={ onRemove } size="small" style={ { marginTop: '8px' } }>
				{ __( 'Remove badge', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

/** Inspector item editor for text-only and image-badge variants. */
function GenericBadgeItemEditor( { item, index, badgeStyle, onChange, onRemove } ) {
	const update = ( key, value ) => onChange( { ...item, [ key ]: value } );
	return (
		<div style={ { borderBottom: '1px solid #ddd', paddingBottom: '12px', marginBottom: '12px' } }>
			<p style={ { fontWeight: 600, margin: '0 0 8px' } }>
				{ `#${ index + 1 }` }{ item.label ? ` — ${ item.label }` : '' }
			</p>

			{ 'image-badge' === badgeStyle && (
				<>
					<MediaPicker
						value={ item.media || null }
						onChange={ ( media ) => {
							const next = { ...item, media };
							if ( next.image ) {
								next.image = undefined;
							}
							onChange( next );
						} }
						onRemove={ () => onChange( { ...item, media: null, image: undefined } ) }
						allowedTypes={ [ 'image' ] }
						label={ __( 'Badge image', 'sgs-blocks' ) }
						instructionsImage={ __( 'Choose a certification badge or logo image', 'sgs-blocks' ) }
					/>
					<ToggleControl
						label={ __( 'Decorative — hide from screen readers', 'sgs-blocks' ) }
						help={ __(
							'Turn on for a purely decorative badge image — screen readers will skip it entirely instead of reading its alt text.',
							'sgs-blocks'
						) }
						checked={ !! item.decorative }
						onChange={ ( val ) => update( 'decorative', val ) }
						__nextHasNoMarginBottom
					/>
					{ /* Spec 35 Part 4 — per-item object-fit only (no focal-point/
					   crosshair control: badges are logos/certification marks,
					   not photographs — same convention as sgs/testimonial's
					   orgLogo and sgs/brand-strip's logoFit). Gated on media
					   existing, mirroring the disclosure pattern above. */ }
					{ !! item.media?.url && (
						<SelectControl
							label={ __( 'Image fit', 'sgs-blocks' ) }
							value={ item.objectFit || 'cover' }
							options={ [
								{ label: __( 'Cover (crop to fill)', 'sgs-blocks' ), value: 'cover' },
								{ label: __( 'Contain (fit within, no crop)', 'sgs-blocks' ), value: 'contain' },
							] }
							onChange={ ( val ) => update( 'objectFit', val ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</>
			) }

			<TextControl
				label={ __( 'Label', 'sgs-blocks' ) }
				value={ item.label || '' }
				onChange={ ( val ) => update( 'label', val ) }
				placeholder={ __( 'BRC Certified', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ /* Spec 35 §2 LINK standard — replaces the superseded inline
			   `SgsLinkControl` mount. `item.linkTarget` is a boolean-shaped
			   enum ('_self'/'_blank' only per block.json) that defaults to
			   "opens in new tab" when unset — preserved here by defaulting
			   the passed-in linkTarget to '_blank' rather than falling
			   through to targetMode="boolean"'s own '_self' fallback. */ }
			<LinkPopoverField
				label={ __( 'Link (optional)', 'sgs-blocks' ) }
				help={ __( 'Search your site or paste a URL to make this badge clickable.', 'sgs-blocks' ) }
				value={ {
					url: item.url || '',
					linkTarget: item.linkTarget || '_blank',
					rel: item.linkRel || '',
				} }
				targetMode="boolean"
				onChange={ ( next ) => {
					const patch = { ...item };
					if ( undefined !== next.url ) patch.url = next.url;
					if ( undefined !== next.linkTarget ) patch.linkTarget = next.linkTarget;
					if ( undefined !== next.rel ) patch.linkRel = next.rel;
					onChange( patch );
				} }
			/>
			<Button variant="secondary" isDestructive onClick={ onRemove } size="small" style={ { marginTop: '8px' } }>
				{ __( 'Remove badge', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

// ─── Main Edit component ──────────────────────────────────────────────────────
export default function Edit( { attributes, setAttributes, name } ) {
	const {
		badgeStyle,
		items: rawItems,
		title,
		titleColour,
		titleColourGradient,
		labelColour,
		labelColourGradient,
		badgeSize,
		iconCircleSize,
		iconCircleBackground,
		iconCircleBackgroundGradient,
		iconColour,
		iconColourHover,
		iconColourGradient,
		iconCircleBorderRadius,
		iconCircleShadow,
		iconCircleShadowColour,
		badgeImageBorderRadius,
		badgeImageSize,
		badgeImageShadow,
		badgeImageShadowColour,
		badgeImageObjectFit,
		textColour,
		textColourGradient,
		textColourHover,
		textColourHoverGradient,
		backgroundColour,
		backgroundColourGradient,
		backgroundColourHover,
		backgroundColourHoverGradient,
		columns,
		gap,
		layout,
		gridTemplateColumns,
		justifyItems,
		alignContent,
		alignItems,
		gridAutoRows,
		autoScroll,
		autoScrollSpeed,
		autoScrollPauseOnHover,
		shadow,
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

	const circleBgValue  = colourVar( iconCircleBackground ) || '#ffffff';
	// iconCircleBackgroundGradient (2026-09-06) — mirrors render.php's
	// --sgs-trust-badge-circle-bg-gradient sibling; style.css's matching
	// background-image line makes this win over circleBgValue when set.
	const circleBgGradientValue = iconCircleBackgroundGradient || undefined;
	const iconColourValue = colourVar( iconColour ) || 'currentColor';
	const textColourValue = colourVar( textColour ) || undefined;
	// D636 — sibling gradient attribute preview (mirrors sgs/counter's
	// numberStyle/labelStyle wiring).
	const titleStyle = resolveTextColourPreviewStyle( titleColour, titleColourGradient, colourVar );
	const labelStyle = resolveTextColourPreviewStyle( labelColour, labelColourGradient, colourVar );

	// D717/background-preview: BackgroundPanel (mounted below) writes image/
	// video/overlay/ken-burns/parallax attrs this block never previewed on
	// canvas — the shared mirror (src/utils/background-preview.js, 2026-08-26)
	// fixes that the same way sgs/container already did.
	const [ colourPalette ] = useSettings( 'color.palette' );
	// Root wrapper background/text paint — mirrors render.php's
	// `sgs_background_paint_decl( $root_background_colour, $root_background_colour_gradient )`
	// (backgroundColour/backgroundColourGradient → root `.sgs-trust-bar` background)
	// and `sgs_resolve_text_colour_or_gradient( $text_colour, $root_text_colour_gradient )`
	// + `sgs_text_colour_decl()` (textColour/textColourGradient → root `color`).
	// Distinct from the icon-circle badge's own `--sgs-trust-badge-text-colour`
	// (flat-only, applied inline on `.sgs-trust-bar__label` below) — an inline
	// style there always wins over this inherited root colour, so both mechanisms
	// coexist exactly as they do on the frontend.
	const rootBgPaint = backgroundPaintPreview( backgroundColour, backgroundColourGradient, colourPalette );
	const rootTextPaint = textPaintPreview( textColour, textColourGradient, colourPalette );
	// Decorative SVG background layer — editor mirror (2026-09-05). Sibling of
	// backgroundPreview() below, deliberately NOT folded into it: that helper
	// paints via `--sgs-ed-bg-*` custom properties on a ::before, whereas the
	// SVG layer is a real element whose painting rules already ship in the
	// block's style.css (loaded in the canvas via block.json `style`). See
	// svgBackgroundPreview()'s own docblock. Attributes are enumerated
	// EXPLICITLY — check-editor-render-parity.js (CHECK A) resolves an
	// attribute as canvas-reflected only when its NAME appears outside the
	// Inspector panels, so a whole-object hand-off would render correctly but
	// still read as a desync.
	const svgPreview = svgBackgroundPreview( {
		bgSvgContent: attributes.bgSvgContent,
		bgSvgPosition: attributes.bgSvgPosition,
		bgSvgAnimation: attributes.bgSvgAnimation,
		bgSvgAnimationSpeed: attributes.bgSvgAnimationSpeed,
		bgSvgOpacity: attributes.bgSvgOpacity,
		bgSvgMinHeight: attributes.bgSvgMinHeight,
		bgSvgTextShadow: attributes.bgSvgTextShadow,
	} );

	const bgPreview = backgroundPreview( {
		backgroundImage: attributes.backgroundImage,
		bgVideo: attributes.bgVideo,
		backgroundSize: attributes.backgroundSize,
		backgroundPosition: attributes.backgroundPosition,
		backgroundRepeat: attributes.backgroundRepeat,
		backgroundAttachment: attributes.backgroundAttachment,
		bgKenBurns: attributes.bgKenBurns,
		bgAnimationDuration: attributes.bgAnimationDuration,
		bgParallax: attributes.bgParallax,
		backgroundOverlayColour: attributes.backgroundOverlayColour,
		overlayGradient: attributes.overlayGradient,
		backgroundOverlayOpacity: attributes.backgroundOverlayOpacity,
		backgroundOverlayBlendMode: attributes.backgroundOverlayBlendMode,
	}, colourPalette );

	// Active device tier for the padding/margin preview below — this block had
	// no previewTier mechanism of its own, so this follows sgs/container's
	// getDeviceType read exactly (same source its own Layout panel writes).
	const previewTier = useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		const device =
			ed && typeof ed.getDeviceType === 'function' ? ed.getDeviceType() : null;
		return { Tablet: 'tablet', Mobile: 'mobile' }[ device ] || 'desktop';
	}, [] );

	// Padding/margin canvas preview — the pair MEASURED live 2026-08-26 as the
	// concrete regression evidence for this build (120px/80px on the real
	// page, 0px on canvas). Base padding + margin are now the block-OWNED
	// `padding`/`margin` object attrs (D555 gutter-default migration — no
	// `supports.spacing`); tablet/mobile overrides are the block-private
	// paddingTablet/paddingMobile/marginTablet/marginMobile object attrs
	// (this block declares all four — verified in block.json).
	const spacePreview = spacingPreview( {
		basePadding: attributes.padding,
		paddingTablet: attributes.paddingTablet,
		paddingMobile: attributes.paddingMobile,
		baseMargin: attributes.margin,
		marginTablet: attributes.marginTablet,
		marginMobile: attributes.marginMobile,
	}, previewTier );

	// Build className based on active variant.
	const blockClassName = [
		'sgs-trust-bar',
		`sgs-trust-bar--${ badgeStyle }`,
		`sgs-trust-bar--${ badgeSize }`,
		bgPreview.className,
		...svgPreview.className,
	]
		.filter( Boolean )
		.join( ' ' );

	const circleRadiusValue = ( iconCircleBorderRadius && iconCircleBorderRadius !== '50%' )
		? iconCircleBorderRadius
		: undefined;
	const circleShadowValue = resolveShadowPreviewComposed( iconCircleShadow, iconCircleShadowColour );

	// Grid preview (icon-circle only — text-only/image-badge always render
	// `.sgs-trust-bar--text-only`/`--image-badge`'s own hardcoded flex-wrap,
	// style.css:111-117/155-158, regardless of layout/columns/gridTemplateColumns;
	// the "Badges" panel's Columns control is gated to icon-circle only for the
	// same reason). Ungated on `layout` presence matches render.php: layout
	// defaults to 'grid' (block.json), and only an explicit 'flex' would fall
	// back to the natural inline-flex wrap this block already renders without
	// any style here.
	const showBadgeGrid = badgeStyle === 'icon-circle' && 'flex' !== layout;
	const badgeGridTemplateColumns = showBadgeGrid
		? gridTemplateColumnsPreview( gridTemplateColumns, columns )
		: undefined;

	const blockProps = useBlockProps( {
		className: blockClassName,
		style: {
			...rootBgPaint,
			...rootTextPaint,
			...bgPreview.style,
			...svgPreview.style,
			...spacePreview,
			...( shadow && { boxShadow: resolveShadowPreview( shadow ) } ),
			...( badgeStyle === 'icon-circle' ? {
				'--sgs-trust-bar-gap': gapCssValue( gap ),
				'--sgs-trust-badge-circle-size': iconCircleSize !== 44 ? `${ iconCircleSize }px` : undefined,
				'--sgs-trust-badge-circle-bg': circleBgValue,
				'--sgs-trust-badge-circle-bg-gradient': circleBgGradientValue,
				'--sgs-trust-badge-icon-colour': iconColourValue,
				'--sgs-trust-badge-text-colour': textColourValue,
				'--sgs-trust-badge-circle-radius': circleRadiusValue,
				'--sgs-trust-badge-circle-shadow': circleShadowValue,
			} : {} ),
			...( badgeGridTemplateColumns ? {
				display: 'grid',
				gridTemplateColumns: badgeGridTemplateColumns,
				gap: gapCssValue( gap ),
				// CHECK A (2026-09-05) — justifyItems/alignContent/alignItems/
				// gridAutoRows are declared in block.json (css:grid-auto-rows,
				// css:justify-items, css:align-content, + the alignItems attr)
				// and render correctly on the frontend via
				// class-sgs-container-wrapper.php's grid branch, but were never
				// mirrored on this canvas. Hand-adapted (not routed through the
				// shared applyGridLayoutPreview()) because that helper resolves
				// gridTemplateColumns/columns itself via resolveResponsiveTier() —
				// this block has ALREADY resolved its own tier via
				// gridTemplateColumnsPreview() into a plain string above, and
				// handing that resolved string back into the shared helper's
				// tier-object resolver would silently return '' (resolveResponsiveTier
				// indexes a plain string by tier key, which is always undefined).
				// The 4-line body below is copied verbatim from
				// applyGridLayoutPreview()'s grid branch (src/utils/grid-layout-preview.js)
				// so behaviour still matches class-sgs-container-wrapper.php exactly.
				...( gridAutoRows ? { gridAutoRows } : {} ),
				alignItems,
				...( justifyItems && justifyItems !== 'stretch' ? { justifyItems } : {} ),
				...( alignContent && alignContent !== 'stretch' ? { alignContent } : {} ),
			} : {} ),
		},
	} );

	// Mirrors class-sgs-container-wrapper.php:2794-2798. `aria-hidden` matches
	// the server; `pointer-events:none` is editor-only insurance so the
	// decorative layer can never swallow a click meant for the block or its
	// children. Rendered as a direct child of the block ROOT — never inside a
	// badge item, which the repeater below owns.
	const svgLayer = svgPreview.hasSvg ? (
		<div
			className="sgs-container__svg-bg"
			aria-hidden="true"
			style={ { pointerEvents: 'none' } }
			dangerouslySetInnerHTML={ { __html: svgPreview.markup } }
		/>
	) : null;

	const updateItem = ( index, updated ) => {
		const next = [ ...items ];
		next[ index ] = updated;
		setAttributes( { items: next } );
	};

	const removeItem = ( index ) => {
		setAttributes( { items: items.filter( ( _, i ) => i !== index ) } );
	};

	const addItem = () => {
		const newItem = badgeStyle === 'icon-circle'
			? { icon: 'check', label: '', _key: generateItemKey() }
			: badgeStyle === 'image-badge'
				? { label: '', url: '', _key: generateItemKey(), objectFit: 'cover' }
				: { label: '', url: '', _key: generateItemKey() };
		setAttributes( { items: [ ...items, newItem ] } );
	};

	return (
		<>
			{ /* D621/D622 — shadow colour rows, mounted first so they render at
				the top of the Styles tab. Every colour control on this block
				now lives here — the icon-circle appearance colours
				(iconCircleBackground, iconColour+gradient) and the text-only/
				image-badge title + label colours were consolidated in from
				scattered bespoke DesignTokenPicker mounts in the Styles tab
				(2026-08-30, duplicate-control fix): textColour previously had
				TWO independent writers (this panel's "Root text colour" row
				AND a "Label colour" picker in the Appearance panel below) —
				the duplicate picker is deleted, this panel's row is now the
				only writer. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'root-background',
						label: __( 'Background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: backgroundColour,
								onChange: ( val ) => setAttributes( { backgroundColour: val ?? '' } ),
								linked: true,
								gradientValue: backgroundColourGradient,
								onGradientChange: ( val ) => setAttributes( { backgroundColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: backgroundColourHover,
								onChange: ( val ) => setAttributes( { backgroundColourHover: val ?? '' } ),
								linked: true,
								gradientValue: backgroundColourHoverGradient,
								onGradientChange: ( val ) => setAttributes( { backgroundColourHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'root-text',
						label: __( 'Root text colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) => setAttributes( { textColour: val ?? '' } ),
								linked: true,
								gradientValue: textColourGradient,
								onGradientChange: ( val ) => setAttributes( { textColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: textColourHover,
								onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
								linked: true,
								gradientValue: textColourHoverGradient,
								onGradientChange: ( val ) => setAttributes( { textColourHoverGradient: val ?? '' } ),
							},
						],
					},
					badgeStyle === 'icon-circle' && iconCircleShadow && {
						key: 'icon-circle-shadow',
						label: __( 'Icon circle shadow colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: iconCircleShadowColour,
								onChange: ( val ) => setAttributes( { iconCircleShadowColour: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: attributes.iconCircleShadowColourHover,
								onChange: ( val ) => setAttributes( { iconCircleShadowColourHover: val ?? '' } ),
								linked: true,
							},
						],
					},
					badgeStyle === 'image-badge' && badgeImageShadow && {
						key: 'badge-image-shadow',
						label: __( 'Badge image shadow colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: badgeImageShadowColour,
								onChange: ( val ) => setAttributes( { badgeImageShadowColour: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: attributes.badgeImageShadowColourHover,
								onChange: ( val ) => setAttributes( { badgeImageShadowColourHover: val ?? '' } ),
								linked: true,
							},
						],
					},
					// ── Consolidated in 2026-08-30 (duplicate-control fix) ──
					// Was a bespoke DesignTokenPicker in Styles > Appearance
					// (icon-circle variant). Genuine BACKGROUND paint ->
					// fillRow (sgs_background_paint_decl() on the PHP side).
					// No hover/gradient siblings existed on the original
					// control, so fillRow renders a single 'normal' state —
					// byte-identical capability, now with linked:true (the
					// canonical helper always links; the original bespoke
					// picker never set it, so this is a deliberate upgrade,
					// not a regression).
					badgeStyle === 'icon-circle' && fillRow( {
						key: 'icon-circle-background',
						label: __( 'Icon circle background', 'sgs-blocks' ),
						// iconCircleBackgroundGradient (2026-09-06) — gradient
						// sibling, resolved via helpers-tokens.php
						// sgs_custom_property_gradient_decls() on the PHP side.
						attrs: { base: 'iconCircleBackground', gradient: 'iconCircleBackgroundGradient' },
						attributes,
						setAttributes,
					} ),
					// ── Icon colour deliberately NOT expressed through
					// fillRow/textRow. This paints via CSS `color` (consumed
					// as currentColor by the SVG icon's stroke), which is
					// neither fillRow's background-paint mechanism nor
					// textRow's plain-text mechanism — Rule 31's own
					// documented exemption (SgsColourPanel.js history)
					// resolves icon colour via its gradient sibling's
					// css_property:'stroke', a third mechanism belonging to
					// neither helper. sgs/icon-list's own "Icon colour" row
					// (edit.js:355-368) is the established precedent for this
					// exact case and hand-builds the row the same way — this
					// mirrors that, not an invented shape. Moved verbatim
					// from the deleted Appearance-panel picker; unchanged.
					badgeStyle === 'icon-circle' && {
						key: 'icon-colour',
						label: __( 'Icon colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: iconColour,
								onChange: ( val ) => setAttributes( { iconColour: val } ),
								gradientValue: iconColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { iconColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: iconColourHover,
								onChange: ( val ) => setAttributes( { iconColourHover: val } ),
								},
						],
					},
					// ── Consolidated in 2026-08-30 — was the "Title colour"
					// picker in the Title panel (text-only/image-badge).
					// Paints the RichText title's `color` -> textRow.
					( badgeStyle === 'text-only' || badgeStyle === 'image-badge' ) && textRow( {
						key: 'title-colour',
						label: __( 'Title colour', 'sgs-blocks' ),
						attrs: { base: 'titleColour', gradient: 'titleColourGradient' },
						attributes,
						setAttributes,
					} ),
					// ── Consolidated in 2026-08-30 — was the "Label colour"
					// picker in the Label styling panel (text-only/image-badge).
					// Distinct attribute from textColour's "Label colour" row
					// above (that one is icon-circle-mode only) — labelColour
					// governs the text-only/image-badge badge label text ->
					// textRow.
					( badgeStyle === 'text-only' || badgeStyle === 'image-badge' ) && textRow( {
						key: 'label-colour',
						label: __( 'Label colour', 'sgs-blocks' ),
						attrs: { base: 'labelColour', gradient: 'labelColourGradient' },
						attributes,
						setAttributes,
					} ),
				] }
			/>
			<InspectorControls>

				{ /* ── Variant (behaviour: which badge mode renders) ─────────── */ }
				<PanelBody title={ __( 'Style', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Badge style', 'sgs-blocks' ) }
						value={ badgeStyle }
						options={ BADGE_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { badgeStyle: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ [ 'nav', 'aside' ].includes( attributes.tagName ) && (
						<TextControl
							label={ __( 'Landmark label', 'sgs-blocks' ) }
							value={ attributes.ariaLabel || '' }
							onChange={ ( val ) => setAttributes( { ariaLabel: val } ) }
							help={ __( 'Required when a page has more than one Nav or Aside — lets screen readers tell them apart (e.g. "Primary", "Footer links", "Related articles"). Leave blank to keep the default "Trust signals" label.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>

				{ /* ── Auto-scroll (behaviour) ───────────────────────────────── */ }
				<PanelBody title={ __( 'Auto-scroll', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Enable auto-scroll', 'sgs-blocks' ) }
						help={ __( 'When the number of badges exceeds what fits on screen, the row scrolls automatically like a marquee.', 'sgs-blocks' ) }
						checked={ !! autoScroll }
						onChange={ ( val ) => setAttributes( { autoScroll: val } ) }
						__nextHasNoMarginBottom
					/>
					{ autoScroll && (
						<>
							<SelectControl
								label={ __( 'Scroll speed', 'sgs-blocks' ) }
								value={ autoScrollSpeed }
								options={ AUTO_SCROLL_SPEED_OPTIONS }
								onChange={ ( val ) => setAttributes( { autoScrollSpeed: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<ToggleControl
								label={ __( 'Pause on hover', 'sgs-blocks' ) }
								checked={ !! autoScrollPauseOnHover }
								onChange={ ( val ) => setAttributes( { autoScrollPauseOnHover: val } ) }
								__nextHasNoMarginBottom
							/>
						</>
					) }
				</PanelBody>

				{ /* ── Badge items repeater (content) ─────────────────────────── */ }
				<PanelBody title={ __( 'Badges', 'sgs-blocks' ) }>
					{ items.map( ( item, index ) => (
						badgeStyle === 'icon-circle' ? (
							<IconCircleItemEditor
								key={ item._key || index }
								item={ item }
								onChange={ ( updated ) => updateItem( index, updated ) }
								onRemove={ () => removeItem( index ) }
							/>
						) : (
							<GenericBadgeItemEditor
								key={ item._key || index }
								item={ item }
								index={ index }
								badgeStyle={ badgeStyle }
								onChange={ ( updated ) => updateItem( index, updated ) }
								onRemove={ () => removeItem( index ) }
							/>
						)
					) ) }
					<Button
						variant="secondary"
						onClick={ addItem }
						style={ { width: '100%', justifyContent: 'center' } }
					>
						{ __( 'Add badge', 'sgs-blocks' ) }
					</Button>
				</PanelBody>

				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					{ (() => {
						const trustBarContrastAgainst =
							backgroundColour && ! backgroundColourGradient
								? backgroundColour
								: '';
						return (
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
								contrastAgainst={ trustBarContrastAgainst }
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
						);
					} )() }
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="styles">

				{ /* Background (image/video/svg tabs + ken-burns/parallax) — root-level
					appearance, kept first in the Styles tab (mirrors sgs/container). */ }
				<BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } name={ name } />

				{ /* ── Section (outer): width + min-height ──────────────────── */ }
				<PanelBody title={ __( 'Section (outer)', 'sgs-blocks' ) }>
					<WidthPanel attributes={ attributes } setAttributes={ setAttributes } />
					{ /*
						  `minHeight` is a TIER OBJECT — ONE attr holding
						  {desktop,tablet,mobile} (Spec 35 pass), same shape as
						  `gridTemplateColumns` in ContainerWrapperControls.
						  `minHeightTablet`/`…Mobile` are no longer declared in
						  block.json.
					*/ }
					<ResponsiveOverride
						label={ __( 'Min height', 'sgs-blocks' ) }
						value={ attributes.minHeight }
						onChange={ ( obj ) => setAttributes( { minHeight: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={ MIN_HEIGHT_OPTIONS }
								onChange={ ( val ) => setOwnValue( val ) }
								help={ tier === 'desktop'
									? __( 'Desktop / base. Tablet and mobile override it at narrower widths.', 'sgs-blocks' )
									: undefined }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				{ /* ── Padding & margin (box-object tiers) ───────────────────── */ }
				{ /* Box-object interface contract (.claude/plans/2026-07-09-box-object-interface-contract.md
				     §5): base tier writes to the block-OWNED `padding`/`margin` attrs
				     (also visible in the Styles > Dimensions panel); tablet/mobile write
				     to the paddingTablet/paddingMobile + marginTablet/marginMobile object
				     attrs read by the shared wrapper's @media tiers. Mirrors sgs/container's edit.js. */ }
				<PanelBody title={ __( 'Padding & margin', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						presets
						values={ {
							base: attributes.padding ?? {},
							tablet: attributes.paddingTablet ?? {},
							mobile: attributes.paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							// Breakpoint -> attr map, not a computed ternary key. This is
							// the canonical idiom (mirrors sgs/container's edit.js) that
							// check-control-ux.js recognises as delegated-to-shared-
							// component; a ternary inside a computed property key reads
							// to the gate as an unwrapped direct write.
							const attrFor = { base: 'padding', tablet: 'paddingTablet', mobile: 'paddingMobile' };
							setAttributes( { [ attrFor[ tier ] ]: next } );
						} }
					/>
					<hr style={ { margin: '16px 0' } } />
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						presets
						values={ {
							base: attributes.margin ?? {},
							tablet: attributes.marginTablet ?? {},
							mobile: attributes.marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							// Same canonical breakpoint -> attr map as Padding above.
							const attrFor = { base: 'margin', tablet: 'marginTablet', mobile: 'marginMobile' };
							setAttributes( { [ attrFor[ tier ] ]: next } );
						} }
					/>
				</PanelBody>

				{ /* ── Content band (Layer 2 __inner) — object attrs ─────────── */ }
				<PanelBody title={ __( 'Content band', 'sgs-blocks' ) } initialOpen={ false }>
					<p className="components-base-control__help">
						{ __( 'Styles the inner content band (the max-width wrapper set by Content width). Only active when Content width is set.', 'sgs-blocks' ) }
					</p>
					{ /* ⛔ "Band background colour" (contentBandBackground) REMOVED
						2026-08-12, attribute retired framework-wide — a background
						fills its CONTAINER's max-width and is never clipped to the
						inner content layer (Bean-ruled). Use BackgroundPanel on the
						block itself. Do NOT re-add a band-scoped background. */ }
					{ /* contentBandPadding is a TIER OBJECT — ONE attr holding
						{desktop,tablet,mobile}, each tier itself a
						{top,right,bottom,left} box (Spec 35 box-shaped pass,
						2026-08-11). Uses ResponsiveOverride, not the flat-sibling
						ResponsiveBoxControl — contentBandPaddingTablet/Mobile are
						no longer declared by block.json, so writing through the
						old attrMap would silently discard both tiers (D338).
						Mirrors sgs/container's own edit.js. */ }
					{ /* ⛔ NO `label` on the wrapper, and NO `hideLabelFromVision` on the
					     BoxControl — core's BoxControl ignores that prop and always renders its
					     own label, so both painted (sentence case + WP's uppercase). Keep
					     BoxControl's; BaseControl associates it with the inputs. Full reasoning
					     at components/ResponsiveBoxControls.js. */ }
					<ResponsiveOverride
						value={ attributes.contentBandPadding }
						onChange={ ( obj ) => setAttributes( { contentBandPadding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<BoxControl
								label={ __( 'Band padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								splitOnAxis={ false }
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				{ /* ── Layout (grid/flex, columns, gap) ──────────────────────── */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<LayoutPanel attributes={ attributes } setAttributes={ setAttributes } />
				</PanelBody>

				{ /* ── Grid item defaults — WITHDRAWN (2026-08-30) ────────────────
				     Verified defect: the ONLY CSS consumer of --sgs-gi-* is
				     `.sgs-container--grid > .sgs-container`
				     (container/style.css:8-15), a DIRECT-CHILD selector requiring
				     the child to itself carry class `.sgs-container`. This block's
				     typed items[] repeater renders `<div class="sgs-trust-bar__badge">`
				     (render.php), never `.sgs-container`, so the selector can never
				     match here. The panel rendered ~15 client-facing controls that
				     painted nothing. The 15 gridItem* attrs stay DECLARED in
				     block.json (removing them is a stored-content migration risk,
				     out of scope for this fix) — this only withdraws the dead UI.
				     See sibling withdrawal in cta-section/edit.js for the same
				     defect + fix shape. ─────────────────────────────────────── */ }

				{ /* ── Shadow — legacy string token attr (sm/md/lg/glow OR a raw
					box-shadow CSS string built by ShadowControl), resolved by
					sgs_shadow_value() (Spec 35 T2.2b). ────────────────────────── */ }
				<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
					<ShadowControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ {
							base: 'shadow',
							colour: 'shadowColour',
							hoverColour: 'shadowColourHover',
						} }
					/>
				</PanelBody>

				{ /* ── Shape dividers ─────────────────────────────────────────── */ }
				<ShapeDividersPanel attributes={ attributes } setAttributes={ setAttributes } />

				{ /* ── Badge size + label typography (appearance; badgeStyle mode
				     itself moved to the Settings tab's "Style" panel above) ──── */ }
				{ badgeStyle !== 'icon-circle' && (
					<PanelBody title={ __( 'Badge size & typography', 'sgs-blocks' ) } initialOpen={ false }>
						{ /* Badge size only applies to text-only and image-badge variants.
						     In icon-circle mode, sizing is controlled by the Icon circle size
						     range control in the Appearance panel — showing this control there
						     would create a dead second size control with no visible effect. */ }
						<SelectControl
							label={ __( 'Badge size', 'sgs-blocks' ) }
							value={ badgeSize }
							options={ BADGE_SIZE_OPTIONS }
							onChange={ ( val ) => setAttributes( { badgeSize: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<p style={ { fontSize: '12px', fontWeight: 600, marginBottom: '4px' } }>
							{ __( 'Label typography', 'sgs-blocks' ) }
						</p>
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix="label"
							showLineHeight={ false }
						/>
					</PanelBody>
				) }

				{ /* ── Optional title (text-only + image-badge) ─────────────── */ }
				{ ( badgeStyle === 'text-only' || badgeStyle === 'image-badge' ) && (
					<PanelBody title={ __( 'Title', 'sgs-blocks' ) } initialOpen={ false }>
						<p style={ { fontSize: '12px', color: '#757575', marginTop: 0 } }>
							{ __( 'Optional heading above the badge row.', 'sgs-blocks' ) }
						</p>
						{ /* Title colour moved to the Colour panel (2026-08-30). */ }
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix="title"
						/>
					</PanelBody>
				) }

				{ /* ── icon-circle appearance controls ──────────────────────── */ }
				{ badgeStyle === 'icon-circle' && (
					<PanelBody title={ __( 'Appearance', 'sgs-blocks' ) } initialOpen={ false }>
						<RangeControl
							label={ __( 'Icon circle size (px)', 'sgs-blocks' ) }
							value={ iconCircleSize }
							onChange={ ( val ) => setAttributes( { iconCircleSize: val } ) }
							min={ 36 }
							max={ 64 }
							step={ 2 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						{ /* Icon circle background moved to the Colour panel (2026-08-30). */ }
						{ /* §14.3 raw-TextControl violation fixed (D561). '%' is
						     load-bearing here — the attribute DEFAULTS to '50%' to
						     make the circle, so a px-only units array would silently
						     remove the block's own default shape. */ }
						<SgsLengthControl
							presets={ false }
							label={ __( 'Icon circle border radius', 'sgs-blocks' ) }
							value={ iconCircleBorderRadius }
							onChange={ ( val ) => setAttributes( { iconCircleBorderRadius: val || '' } ) }
							units={ [
								{ value: '%', label: '%', default: 50 },
								{ value: 'px', label: 'px', default: 8 },
								{ value: 'rem', label: 'rem', default: 0.5 },
								{ value: 'em', label: 'em', default: 0.5 },
							] }
							help={ __( "50% makes a circle; a px value makes a rounded square.", 'sgs-blocks' ) }
						/>
						<ShadowControl
							label={ __( 'Icon circle shadow', 'sgs-blocks' ) }
							attributes={ attributes }
							setAttributes={ setAttributes }
							attrNames={ {
								base: 'iconCircleShadow',
								colour: 'iconCircleShadowColour',
								hoverColour: 'iconCircleShadowColourHover',
							} }
						/>
						{ /* Icon colour + Label colour (textColour) moved to the
							Colour panel (2026-08-30) — textColour previously
							had TWO writers (this picker + the Colour panel's
							own "Root text colour" row); this duplicate is
							deleted, the Colour panel row is now the only
							writer. */ }
					</PanelBody>
				) }

				{ /* ── image-badge appearance controls ──────────────────────── */ }
				{ badgeStyle === 'image-badge' && (
					<PanelBody title={ __( 'Appearance', 'sgs-blocks' ) } initialOpen={ false }>
						<RangeControl
							label={ __( 'Badge image size (px)', 'sgs-blocks' ) }
							value={ badgeImageSize }
							onChange={ ( val ) => setAttributes( { badgeImageSize: val } ) }
							min={ 24 }
							max={ 160 }
							step={ 4 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<SelectControl
							label={ __( 'Image fit', 'sgs-blocks' ) }
							value={ badgeImageObjectFit }
							options={ [
								{ label: __( 'Contain (show whole logo)', 'sgs-blocks' ), value: 'contain' },
								{ label: __( 'Cover (fill the box)', 'sgs-blocks' ), value: 'cover' },
							] }
							onChange={ ( val ) => setAttributes( { badgeImageObjectFit: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						{ /* §14.3 raw-TextControl violation fixed (D561). Same units
						     array as the icon circle above — '%' reaches the circle
						     case the old help text advertised. */ }
						<SgsLengthControl
							presets={ false }
							label={ __( 'Badge image border radius', 'sgs-blocks' ) }
							value={ badgeImageBorderRadius }
							onChange={ ( val ) => setAttributes( { badgeImageBorderRadius: val || '' } ) }
							units={ [
								{ value: 'px', label: 'px', default: 8 },
								{ value: '%', label: '%', default: 50 },
								{ value: 'rem', label: 'rem', default: 0.5 },
								{ value: 'em', label: 'em', default: 0.5 },
							] }
							help={ __( 'Leave blank for square corners; 50% makes a circle.', 'sgs-blocks' ) }
						/>
						<ShadowControl
							label={ __( 'Badge image shadow', 'sgs-blocks' ) }
							attributes={ attributes }
							setAttributes={ setAttributes }
							attrNames={ {
								base: 'badgeImageShadow',
								colour: 'badgeImageShadowColour',
								hoverColour: 'badgeImageShadowColourHover',
							} }
						/>
					</PanelBody>
				) }

				{ /* ── text-only / image-badge label styling ──────────────────
					"Label styling" panel WITHDRAWN (2026-08-30) — its only
					control was the Label colour picker, now moved to the
					Colour panel. An empty PanelBody is a dead control
					(check-empty-inspector-containers.js). */ }

				{ /* ── Badges (icon-circle only) ──────────────────────────────
				     Named for the ELEMENT it controls, not the property cluster
				     (CO-2, element-first panel naming). It was "Layout" until
				     2026-08-08, which collided verbatim with the SECTION's own
				     "Layout" panel higher up the same tab: two panels, same word,
				     different scopes. A cluster name is only correct when the
				     controls apply to no single element — this one is badge-scoped
				     (`columns` drives the badge grid), so it takes the element's
				     name, exactly as sgs/button names its icon panel "Icon". */ }
				{ badgeStyle === 'icon-circle' && (
					<PanelBody title={ __( 'Badges', 'sgs-blocks' ) } initialOpen={ false }>
						{ /*
							  columns is a TIER OBJECT — ONE attr holding
							  {desktop,tablet,mobile} (Spec 35 pass 4). It must
							  therefore use ResponsiveOverride, which reads and
							  writes the object, NOT a bare RangeControl writing
							  a raw number — that would coerce the object-typed
							  attr to its default and drop the whole setting
							  (D563 bug class). `columnsTablet`/`columnsMobile`
							  are no longer declared by block.json; the tier
							  object's tablet/mobile keys carry the "at 600px+"
							  stacking behaviour that used to be an implicit
							  default (4/4/2).
						*/ }
						<ResponsiveOverride
							label={ __( 'Columns', 'sgs-blocks' ) }
							value={ columns }
							onChange={ ( obj ) => setAttributes( { columns: obj } ) }
						>
							{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => (
								<RangeControl
									value={
										ownValue !== ''
											? ownValue
											: ( effectiveValue !== '' ? effectiveValue : ( tier === 'mobile' ? 2 : 4 ) )
									}
									onChange={ setOwnValue }
									min={ 2 }
									max={ 6 }
									step={ 1 }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							) }
						</ResponsiveOverride>
						{ /* Gap between badges is provided by the shared ContainerWrapperControls
						     "Gap" responsive control (writes the same `gap` attr via the wrapper
						     helper). Removed here to eliminate UI duplication. */ }
					</PanelBody>
				) }

			</InspectorControls>

			{ /* ── Editor canvas ───────────────────────────────────────────── */ }
			<div { ...blockProps }>
				{ svgLayer }

				{ /* Optional title (text-only + image-badge variants) */ }
				{ ( badgeStyle === 'text-only' || badgeStyle === 'image-badge' ) && (
					<RichText
						tagName="p"
						className="sgs-trust-bar__title"
						value={ title }
						onChange={ ( val ) => setAttributes( { title: val } ) }
						placeholder={ __( 'Trusted certifications & memberships', 'sgs-blocks' ) }
						style={ titleStyle }
					/>
				) }

				{ /* ── Curated items preview ───────────────────────────────── */ }
				{ items.length === 0 ? (
						<p style={ { color: '#757575', fontStyle: 'italic' } }>
							{ __( 'Add badges in the sidebar panel.', 'sgs-blocks' ) }
						</p>
					) : (
						items.map( ( item, index ) => {
							if ( badgeStyle === 'icon-circle' ) {
								return (
									<div
										key={ item._key || index }
										className="sgs-trust-bar__badge"
									>
										<EditorIconCircle
											size={ iconCircleSize }
											circleBg={ circleBgValue }
											iconColour={ iconColourValue }
											iconGradient={ iconColourGradient }
											iconSlug={ item.icon || 'check' }
											borderRadius={ iconCircleBorderRadius !== '50%' ? iconCircleBorderRadius : undefined }
											boxShadow={ circleShadowValue }
											filled={ item.fillStyle === 'filled' }
											fillColour={ item.fillColour }
										/>
										<span className="sgs-trust-bar__label" style={ { color: textColourValue } }>
											{ item.label || <em>{ __( '(no label)', 'sgs-blocks' ) }</em> }
										</span>
									</div>
								);
							}

							if ( badgeStyle === 'text-only' ) {
								return (
									<div key={ item._key || index } className="sgs-trust-bar__badge">
										<span
											className="sgs-trust-bar__badge-label"
											style={ labelStyle }
										>
											{ item.label || <em>{ __( '(no label)', 'sgs-blocks' ) }</em> }
										</span>
									</div>
								);
							}

							// image-badge
							const mediaUrl = item.media?.url || item.image?.url || '';
							const mediaAlt = item.media?.alt || item.label || '';
							return (
								<div key={ item._key || index } className="sgs-trust-bar__badge">
									{ mediaUrl && (
										<img
											src={ mediaUrl }
											alt={ mediaAlt }
											className="sgs-trust-bar__badge-img"
											style={ {
												width: `${ badgeImageSize }px`,
												height: `${ badgeImageSize }px`,
												objectFit: item.objectFit || badgeImageObjectFit,
												borderRadius: badgeImageBorderRadius || undefined,
												boxShadow: resolveShadowPreviewComposed( badgeImageShadow, badgeImageShadowColour ),
											} }
										/>
									) }
									{ item.label && (
										<span
											className="sgs-trust-bar__badge-label"
											style={ labelStyle }
										>
											{ item.label }
										</span>
									) }
								</div>
							);
						} )
					)
				}
			</div>
		</>
	);
}
