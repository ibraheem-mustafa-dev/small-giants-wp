/**
 * edit.js — Block editor component for sgs/team-member.
 *
 * NO-INLINE + NO-WRAPPER migration (LOCKED per-block no-inline migration
 * contract §A/§B/§B3, 2026-07-09; matches sgs/quote's proven block-private
 * pattern, D294): the root <div> IS the block root — no SGS_Container_Wrapper
 * delegation, no `ContainerWrapperControls` (that component writes the OLD
 * per-side scalar tablet/mobile attrs — paddingTopTablet etc — which are
 * incompatible with the new box-OBJECT contract this block now uses:
 * paddingTablet/paddingMobile/marginTablet/marginMobile).
 *
 * Because color/typography/spacing/__experimentalBorder all declare
 * `__experimentalSkipSerialization` in block.json, WP's automatic style
 * preview in the canvas is suppressed for those supports too — so, exactly
 * like sgs/quote, this file manually rebuilds a desktop-only preview style
 * object (buildWrapperStyle) mirroring render.php's scoped-CSS output and
 * applies it via `style` on the SAME root element. The editor canvas is
 * allowed to use inline style for live preview — only the SAVED/RENDERED
 * frontend output must be inline-free, and this block is dynamic
 * (render.php), so nothing here is persisted to post_content.
 *
 * Padding/margin are edited via ResponsiveBoxControl (box-object interface
 * contract): base routes to WP-native style.spacing.padding/margin, tablet/
 * mobile route to the paddingTablet/paddingMobile/marginTablet/marginMobile
 * object attrs. Border width/colour/style/radius stay on WP's native
 * automatic Styles-tab panels (no custom UI needed — team-member declares
 * FULL native __experimentalBorder support, unlike quote's mixed custom+
 * native border).
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	RangeControl,
	Button,
} from '@wordpress/components';
import { ResponsiveBoxControl, ResponsiveControl, ShadowControl, LinkPopoverField, SgsColourPanel, SgsLengthControl, fillRow, textRow,
	SgsBorderControl,
	resolveColourToken,
} from '../../components';
import MediaPicker from '../../components/MediaPicker';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { colourVar, resolveShadowPreviewComposed, resolveTextColourPreviewStyle } from '../../utils';

const CARD_STYLES = [
	{ label: __( 'Flat', 'sgs-blocks' ), value: 'flat' },
	{ label: __( 'Bordered', 'sgs-blocks' ), value: 'bordered' },
	{ label: __( 'Elevated', 'sgs-blocks' ), value: 'elevated' },
	{ label: __( 'Filled', 'sgs-blocks' ), value: 'filled' },
];

const PHOTO_SHAPES = [
	{ label: __( 'Circle', 'sgs-blocks' ), value: 'circle' },
	{ label: __( 'Rounded', 'sgs-blocks' ), value: 'rounded' },
	{ label: __( 'Square', 'sgs-blocks' ), value: 'square' },
];

const EASING_OPTIONS = [
	{ label: __( 'Ease in-out', 'sgs-blocks' ), value: 'ease-in-out' },
	{ label: __( 'Ease', 'sgs-blocks' ), value: 'ease' },
	{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
	{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
	{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
];

// D649 — no JSON `enum` reliance in the UI list order; mirrors sgs/icon-list's
// allow-list exactly (render.php validates the same set independently).
const HEADING_LEVEL_OPTIONS = [
	{ label: __( 'Heading 2', 'sgs-blocks' ), value: 'h2' },
	{ label: __( 'Heading 3', 'sgs-blocks' ), value: 'h3' },
	{ label: __( 'Heading 4', 'sgs-blocks' ), value: 'h4' },
	{ label: __( 'Heading 5', 'sgs-blocks' ), value: 'h5' },
	{ label: __( 'Heading 6', 'sgs-blocks' ), value: 'h6' },
	{ label: __( 'Paragraph (not a heading)', 'sgs-blocks' ), value: 'p' },
];

const DISPLAY_MODES = [
	{ label: __( 'Full (photo, name, role, bio, socials)', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Compact (photo, name, role)', 'sgs-blocks' ), value: 'compact' },
];

const PLATFORM_OPTIONS = [
	{ label: __( 'Facebook', 'sgs-blocks' ),     value: 'facebook' },
	{ label: __( 'Instagram', 'sgs-blocks' ),    value: 'instagram' },
	{ label: __( 'LinkedIn', 'sgs-blocks' ),     value: 'linkedin' },
	{ label: __( 'X / Twitter', 'sgs-blocks' ),  value: 'twitter' },
	{ label: __( 'YouTube', 'sgs-blocks' ),      value: 'youtube' },
	{ label: __( 'TikTok', 'sgs-blocks' ),       value: 'tiktok' },
	{ label: __( 'GitHub', 'sgs-blocks' ),       value: 'github' },
	{ label: __( 'WhatsApp', 'sgs-blocks' ),     value: 'whatsapp' },
	{ label: __( 'Email', 'sgs-blocks' ),        value: 'email' },
	{ label: __( 'Website', 'sgs-blocks' ),      value: 'website' },
	{ label: __( 'Pinterest', 'sgs-blocks' ),    value: 'pinterest' },
	{ label: __( 'Snapchat', 'sgs-blocks' ),     value: 'snapchat' },
	{ label: __( 'Telegram', 'sgs-blocks' ),     value: 'telegram' },
	{ label: __( 'Discord', 'sgs-blocks' ),      value: 'discord' },
];

const LENGTH_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: '%', label: '%', default: 0 },
];

/**
 * Single social link row editor in the inspector panel.
 * Mirrors the GenericBadgeItemEditor pattern from trust-bar.
 */
function SocialLinkItemEditor( { item, index, onChange, onRemove } ) {
	const update = ( key, value ) => onChange( { ...item, [ key ]: value } );
	return (
		<div style={ { borderBottom: '1px solid #ddd', paddingBottom: '12px', marginBottom: '12px' } }>
			<p style={ { fontWeight: 600, margin: '0 0 8px' } }>
				{ `#${ index + 1 }` }{ item.platform ? ` — ${ item.platform }` : '' }
			</p>
			<SelectControl
				label={ __( 'Platform', 'sgs-blocks' ) }
				value={ item.platform || 'website' }
				options={ PLATFORM_OPTIONS }
				onChange={ ( val ) => update( 'platform', val ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ /* Spec 35 §2 LINK standard — replaces the superseded inline
			   `SgsLinkControl` mount. This item's stored shape is
			   `opensInNewTab` (a plain boolean, not a linkTarget enum
			   string), so it's mapped to/from the shared component's
			   `linkTarget` field here at the edge, matching
			   targetMode="boolean" (mirrors sgs/media's image link field). */ }
			<LinkPopoverField
				label={ __( 'Link', 'sgs-blocks' ) }
				help={
					item.platform === 'email'
						? __( 'Enter an email address, e.g. hello@example.com.', 'sgs-blocks' )
						: __( 'Search your site or paste a URL.', 'sgs-blocks' )
				}
				value={ {
					url: item.url || '',
					linkTarget: item.opensInNewTab !== false ? '_blank' : '_self',
					rel: item.rel || '',
				} }
				targetMode="boolean"
				onChange={ ( next ) => {
					const patch = { ...item };
					if ( undefined !== next.url ) patch.url = next.url;
					if ( undefined !== next.linkTarget ) patch.opensInNewTab = '_blank' === next.linkTarget;
					if ( undefined !== next.rel ) patch.rel = next.rel;
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
				{ __( 'Remove link', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

// Box-object interface contract §1: build an editor-preview shorthand from a
// box object — mirrors render.php's box-shorthand builder so the canvas
// preview matches the frontend (contract §5).
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

// Editor preview style builder — desktop styles only; responsive tiers +
// nameColour/roleColour scoped rules render via PHP.
function buildWrapperStyle( attributes ) {
	const {
		style,
		maxWidth,
		cardShadow,
		cardShadowColour,
		backgroundColour,
		backgroundColourGradient,
		textColour,
		textColourGradient,
	} = attributes;
	const wrapperStyle = {};

	// Resting-state card shadow (FR-35-5 Task 4c) — render.php emits this as a
	// custom-property VALUE (`--sgs-card-shadow`) on the root scoped rule,
	// consumed by style.css's static shadow rule; never a real `box-shadow`
	// declaration here (mirrors render.php step 6/12). Shape (`cardShadow`) +
	// colour (`cardShadowColour`) are separate attrs since D621/D622.
	if ( cardShadow ) {
		wrapperStyle[ '--sgs-card-shadow' ] = resolveShadowPreviewComposed( cardShadow, cardShadowColour );
	}

	// Text + background colour preview (block-private, flat-or-gradient) —
	// replaces the removed native style.color.text/background/gradient read.
	// block.json's supports.color sub-flags are now all false, so WordPress no
	// longer writes textColor/backgroundColor/style.color.gradient at all;
	// the block-private backgroundColour*/textColour* attrs (set via
	// SgsColourPanel's fillRow/textRow) are the single source now. Mirrors
	// sgs/product-card's editor-preview resolver (resting state only — a
	// static preview style object cannot represent a `:hover` pseudo-state).
	const resolveTeamMemberColourPreview = ( value ) => {
		if ( ! value ) {
			return undefined;
		}
		const v = String( value ).trim();
		return /^(var\(|#|rgb|hsl)/i.test( v ) ? v : colourVar( v );
	};
	Object.assign(
		wrapperStyle,
		resolveTextColourPreviewStyle( textColour, textColourGradient, resolveTeamMemberColourPreview )
	);
	if ( backgroundColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( backgroundColourGradient ) ) {
		wrapperStyle.backgroundImage = backgroundColourGradient;
	} else if ( backgroundColour ) {
		wrapperStyle.backgroundColor = resolveTeamMemberColourPreview( backgroundColour );
	}

	if ( style?.typography?.fontSize ) {
		wrapperStyle.fontSize = style.typography.fontSize;
	}

	const radiusPreview = boxShorthand( style?.border?.radius, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	if ( radiusPreview ) {
		wrapperStyle.borderRadius = radiusPreview;
	}
	if ( style?.border?.width ) {
		wrapperStyle.borderWidth = style.border.width;
	}
	if ( style?.border?.style ) {
		wrapperStyle.borderStyle = style.border.style;
	}
	if ( style?.border?.color ) {
		wrapperStyle.borderColor = style.border.color;
	}

	const paddingPreview = boxShorthand( style?.spacing?.padding, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		wrapperStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( style?.spacing?.margin, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) {
		wrapperStyle.margin = marginPreview;
	}

	if ( maxWidth ) {
		wrapperStyle.maxWidth = maxWidth;
		wrapperStyle.marginInline = 'auto';
	}

	return wrapperStyle;
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		style,
		photo,
		// photoTablet / photoMobile are deliberately NOT destructured — the
		// responsive family is read through `photoForTier()` off `attributes`
		// so the tier map stays the single source of truth for which attr
		// belongs to which device.
		name,
		headingLevel,
		role,
		bio,
		nameColour,
		nameColourGradient,
		roleColour,
		roleColourGradient,
		cardStyle,
		photoShape,
		photoDecorative,
		overlayHover,
		cardShadow,
		cardShadowColour,
		shadowHover,
		shadowHoverColour,
		scaleHover,
		imageZoomHover,
		grayscaleHover,
		transitionDuration,
		transitionEasing,
		displayMode,
		socialLinks,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		maxWidth,
		nameColourHover,
		roleColourHover,
	} = attributes;

	const isCompact = 'compact' === displayMode;

	// D649 — heading level is an identity control (document-outline
	// placement), not a style control; mirrors render.php's own fallback.
	const HeadingTag = headingLevel || 'h3';

	const activeMedia = photo && photo.url ? photo : null;

	const handleMediaChange = ( media ) => {
		setAttributes( { photo: media || null } );
	};

	// Responsive photo family — one attr per device tier. The base (unsuffixed)
	// attr IS the desktop value, matching the framework convention.
	const photoTierAttr = {
		desktop: 'photo',
		tablet: 'photoTablet',
		mobile: 'photoMobile',
	};

	const photoForTier = ( breakpoint ) => {
		const value = attributes[ photoTierAttr[ breakpoint ] ];
		return value && value.url ? value : null;
	};

	const setPhotoForTier = ( breakpoint, media ) => {
		setAttributes( { [ photoTierAttr[ breakpoint ] ]: media || null } );
	};

	// Social links repeater helpers — mirror trust-bar pattern.
	const updateSocialLink = ( index, updated ) => {
		const next = [ ...socialLinks ];
		next[ index ] = updated;
		setAttributes( { socialLinks: next } );
	};

	const removeSocialLink = ( index ) => {
		setAttributes( { socialLinks: socialLinks.filter( ( _, i ) => i !== index ) } );
	};

	const addSocialLink = () => {
		setAttributes( { socialLinks: [ ...socialLinks, { platform: 'website', url: '', opensInNewTab: true, rel: '' } ] } );
	};

	const className = [
		'sgs-team-member',
		`sgs-team-member--${ cardStyle }`,
		isCompact && 'sgs-team-member--compact',
	]
		.filter( Boolean )
		.join( ' ' );

	// Contract §B3: NO extra wrapper — this <div> IS the block root (matches
	// render.php). buildWrapperStyle mirrors the scoped frontend CSS since
	// the skip-serialised supports suppress WP's automatic canvas preview.
	const blockProps = useBlockProps( {
		className,
		style: buildWrapperStyle( attributes ),
	} );

	return (
		<>
			{ /* Colour panel FIRST (D618/D619, sgs/button pattern). Both
			   nameColour and roleColour are plain single-state colours. */ }
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
					textRow( {
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						attrs: {
							base: 'textColour',
							hover: 'textColourHover',
							gradient: 'textColourGradient',
							hoverGradient: 'textColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					{
						key: 'nameColour',
						label: __( 'Name colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: nameColour,
								onChange: ( val ) => setAttributes( { nameColour: val ?? '' } ),
								linked: true,
								gradientValue: nameColourGradient,
								onGradientChange: ( val ) => setAttributes( { nameColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: nameColourHover,
								onChange: ( val ) => setAttributes( { nameColourHover: val ?? '' } ),
								linked: true,
								},
						],
					},
					{
						key: 'roleColour',
						label: __( 'Role colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: roleColour,
								onChange: ( val ) => setAttributes( { roleColour: val ?? '' } ),
								linked: true,
								gradientValue: roleColourGradient,
								onGradientChange: ( val ) => setAttributes( { roleColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: roleColourHover,
								onChange: ( val ) => setAttributes( { roleColourHover: val ?? '' } ),
								linked: true,
								},
						],
					},
					cardShadow && {
						key: 'card-shadow',
						label: __( 'Card shadow colour', 'sgs-blocks' ),
						states: [
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
						],
					},
				] }
			/>
			<InspectorControls>
				{ /* S7 pilot (2026-09-02, uniformity sweep): converted from a plain
				   PanelBody to a ToolsPanel — the four SelectControls are core
				   block config and stay always-visible (isShownByDefault); the
				   hover-overlay toggle and the two shadow controls are genuinely
				   optional style embellishments and are hideable/resettable per
				   WP's native ToolsPanel pattern (same shape as brand-strip's
				   Tile panel). One pilot block before scripting the other 14 —
				   Bean reviews this one first. */ }
				<ToolsPanel
					label={ __( 'Card Settings', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							headingLevel: 'h3',
							displayMode: 'full',
							cardStyle: 'elevated',
							photoShape: 'circle',
							overlayHover: false,
							cardShadow: '',
							cardShadowColour: null,
							shadowHover: '',
							shadowHoverColour: null,
							scaleHover: '',
							imageZoomHover: false,
							grayscaleHover: false,
							transitionDuration: '300',
							transitionEasing: 'ease-in-out',
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Heading level', 'sgs-blocks' ) }
						hasValue={ () => ( headingLevel || 'h3' ) !== 'h3' }
						onDeselect={ () => setAttributes( { headingLevel: 'h3' } ) }
						isShownByDefault
					>
						<SelectControl
							label={ __( 'Heading level', 'sgs-blocks' ) }
							value={ headingLevel || 'h3' }
							options={ HEADING_LEVEL_OPTIONS }
							onChange={ ( val ) => setAttributes( { headingLevel: val } ) }
							help={ __(
								'Pick the level that fits your page outline — usually H3 under a page-level H2.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Display mode', 'sgs-blocks' ) }
						hasValue={ () => displayMode !== 'full' }
						onDeselect={ () => setAttributes( { displayMode: 'full' } ) }
						isShownByDefault
					>
						<SelectControl
							label={ __( 'Display mode', 'sgs-blocks' ) }
							help={ __(
								'Compact shows photo, name and role only — ideal for dense team grids.',
								'sgs-blocks'
							) }
							value={ displayMode }
							options={ DISPLAY_MODES }
							onChange={ ( val ) => setAttributes( { displayMode: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Card style', 'sgs-blocks' ) }
						hasValue={ () => cardStyle !== 'elevated' }
						onDeselect={ () => setAttributes( { cardStyle: 'elevated' } ) }
						isShownByDefault
					>
						<SelectControl
							label={ __( 'Card style', 'sgs-blocks' ) }
							value={ cardStyle }
							options={ CARD_STYLES }
							onChange={ ( val ) => setAttributes( { cardStyle: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Photo shape', 'sgs-blocks' ) }
						hasValue={ () => photoShape !== 'circle' }
						onDeselect={ () => setAttributes( { photoShape: 'circle' } ) }
						isShownByDefault
					>
						<SelectControl
							label={ __( 'Photo shape', 'sgs-blocks' ) }
							value={ photoShape }
							options={ PHOTO_SHAPES }
							onChange={ ( val ) => setAttributes( { photoShape: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					{ ! isCompact && (
						<ToolsPanelItem
							label={ __( 'Hover overlay (bio)', 'sgs-blocks' ) }
							hasValue={ () => overlayHover !== false }
							onDeselect={ () => setAttributes( { overlayHover: false } ) }
						>
							<ToggleControl
								label={ __( 'Hover overlay (bio)', 'sgs-blocks' ) }
								help={ __( 'Reveals the bio as a slide-up overlay on the photo when hovered or focused. On touch devices, tap the photo to toggle.', 'sgs-blocks' ) }
								checked={ overlayHover }
								onChange={ ( val ) => setAttributes( { overlayHover: val } ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					) }
					{ /* FR-35-5 Task 4c (2026-07-21) — resting-state shadow, pairs with
					   the existing hover-only shadowHover. Empty = inherit the theme
					   token exactly as before (Bean's Option A, same shape as
					   card-grid's cardShadow). */ }
					<ToolsPanelItem
						label={ __( 'Shadow', 'sgs-blocks' ) }
						hasValue={ () => !! cardShadow || !! cardShadowColour }
						onDeselect={ () => setAttributes( { cardShadow: '', cardShadowColour: null } ) }
					>
						<ShadowControl
							label={ __( 'Shadow', 'sgs-blocks' ) }
							attributes={ attributes }
							setAttributes={ setAttributes }
							attrNames={ {
								base: 'cardShadow',
								colour: 'cardShadowColour',
							} }
						/>
					</ToolsPanelItem>
					{ /* shadowHover — declared + read by render.php but restricted to a
					   fixed subtle/raised/floating/glow preset ALLOWLIST with no editor
					   control at all (same bug class as card-grid's pre-fix shadowHover).
					   Fixed straight onto the target shape (D621/D622). */ }
					<ToolsPanelItem
						label={ __( 'Shadow (hover)', 'sgs-blocks' ) }
						hasValue={ () => !! shadowHover || !! shadowHoverColour }
						onDeselect={ () => setAttributes( { shadowHover: '', shadowHoverColour: null } ) }
					>
						<ShadowControl
							label={ __( 'Shadow (hover)', 'sgs-blocks' ) }
							attributes={ attributes }
							setAttributes={ setAttributes }
							attrNames={ {
								base: 'shadowHover',
								colour: 'shadowHoverColour',
							} }
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Hover scale', 'sgs-blocks' ) }
						hasValue={ () => !! scaleHover }
						onDeselect={ () => setAttributes( { scaleHover: '' } ) }
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
					>
						<ToggleControl
							label={ __( 'Image zoom on hover', 'sgs-blocks' ) }
							help={ __( 'Zooms the photo inside the card on hover.', 'sgs-blocks' ) }
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
							help={ __( 'Desaturates the photo at rest; restores full colour on hover.', 'sgs-blocks' ) }
							checked={ grayscaleHover }
							onChange={ ( val ) => setAttributes( { grayscaleHover: val } ) }
							__nextHasNoMarginBottom
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
							min={ 0 }
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

				<PanelBody title={ __( 'Photo', 'sgs-blocks' ) } initialOpen={ false }>
					<p style={ { fontSize: '12px', color: '#757575', marginTop: 0 } }>
						{ __( 'Optional — set a different photo per device. Leave a tier blank to inherit the one above it.', 'sgs-blocks' ) }
					</p>
					<ResponsiveControl label={ __( 'Photo', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<MediaPicker
								value={ photoForTier( breakpoint ) }
								onChange={ ( media ) => setPhotoForTier( breakpoint, media ) }
								onRemove={ () => setPhotoForTier( breakpoint, null ) }
								allowedTypes={ [ 'image' ] }
								label={ __( 'Select photo', 'sgs-blocks' ) }
								instructionsImage={ __( 'Choose a photo for this device size', 'sgs-blocks' ) }
							/>
						) }
					</ResponsiveControl>
					<ToggleControl
						label={ __( 'Decorative photo', 'sgs-blocks' ) }
						help={ __( 'Only use this for a purely decorative graphic, such as a placeholder silhouette before a real photo is uploaded. Most photos identify the person and should keep their alt text.', 'sgs-blocks' ) }
						checked={ !! photoDecorative }
						onChange={ ( val ) => setAttributes( { photoDecorative: val } ) }
						__nextHasNoMarginBottom
					/>
					{ /* 37-media-no-handroll remediation (2026-09-03, CORRECTED via
					     /qc-council same day): NO new control here. The photo's crop
					     mode is bridged onto the pre-existing 'Object fit' dropdown
					     the legacy image-controls extension already renders (writes
					     sgsObjectFit) — mounting a second MediaElementPanel gave the
					     client two identically-labelled controls. See block.json's
					     _comment_mediaElements for the full correction. */ }
				</PanelBody>

				{ ! isCompact && (
					<PanelBody title={ __( 'Social Links', 'sgs-blocks' ) } initialOpen={ false }>
						<p style={ { fontSize: '12px', color: '#757575', marginTop: 0 } }>
							{ __( 'Social profile links displayed below the bio. Hidden in Compact mode.', 'sgs-blocks' ) }
						</p>
						{ socialLinks.map( ( link, index ) => (
							<SocialLinkItemEditor
								key={ index }
								item={ link }
								index={ index }
								onChange={ ( updated ) => updateSocialLink( index, updated ) }
								onRemove={ () => removeSocialLink( index ) }
							/>
						) ) }
						<Button
							variant="secondary"
							onClick={ addSocialLink }
							style={ { width: '100%', justifyContent: 'center' } }
						>
							{ __( 'Add social link', 'sgs-blocks' ) }
						</Button>
					</PanelBody>
				) }
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">

				{ /* Box-object interface contract §B/§E: padding/margin base routes
				   to WP-native style.spacing.* (skip-serialised → scoped, not
				   inline); tiers are the paddingTablet/paddingMobile +
				   marginTablet/marginMobile object attrs. Border width/colour/
				   style/radius stay on WP's native automatic Styles panels. */ }
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						presets
						values={ {
							base: style?.spacing?.padding ?? {},
							tablet: paddingTablet ?? {},
							mobile: paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, padding: next } } } );
							} else {
								setAttributes( { [ `padding${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						presets
						values={ {
							base: style?.spacing?.margin ?? {},
							tablet: marginTablet ?? {},
							mobile: marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, margin: next } } } );
							} else {
								setAttributes( { [ `margin${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
				</PanelBody>

				{ /* Width — outer maxWidth (kept-scalar, base only — matches the
				   pre-existing contract for this block). */ }
				<PanelBody title={ __( 'Width', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsLengthControl
						presets={ false }
						label={ __( 'Max-width', 'sgs-blocks' ) }
						value={ maxWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { maxWidth: val ?? '' } ) }
						help={ __( 'Leave blank for no cap.', 'sgs-blocks' ) }
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

			<div { ...blockProps }>
				<div className={ `sgs-team-member__photo sgs-team-member__photo--${ photoShape }` }>
					<MediaPicker
						value={ activeMedia }
						onChange={ handleMediaChange }
						onRemove={ () => setAttributes( { photo: null } ) }
						allowedTypes={ [ 'image' ] }
						label={ __( 'Select photo', 'sgs-blocks' ) }
						instructionsImage={ __( 'Choose a headshot photo for this team member', 'sgs-blocks' ) }
					/>
				</div>
				<RichText
					tagName={ HeadingTag }
					className="sgs-team-member__name"
					value={ name }
					onChange={ ( val ) => setAttributes( { name: val } ) }
					placeholder={ __( 'Name', 'sgs-blocks' ) }
					style={ resolveTextColourPreviewStyle( nameColour, nameColourGradient, colourVar ) }
				/>
				<RichText
					tagName="p"
					className="sgs-team-member__role"
					value={ role }
					onChange={ ( val ) => setAttributes( { role: val } ) }
					placeholder={ __( 'Role / Title', 'sgs-blocks' ) }
					style={ resolveTextColourPreviewStyle( roleColour, roleColourGradient, colourVar ) }
				/>
				{ ! isCompact && (
					<RichText
						tagName="p"
						className="sgs-team-member__bio"
						value={ bio }
						onChange={ ( val ) => setAttributes( { bio: val } ) }
						placeholder={ __( 'Short bio…', 'sgs-blocks' ) }
					/>
				) }
				{ /* Social links preview in editor — shown only in full mode. */ }
				{ ! isCompact && socialLinks.length > 0 && (
					<div className="sgs-team-member__social">
						{ socialLinks.map( ( link, i ) => (
							link.url && (
								<span
									key={ i }
									className="sgs-team-member__social-preview"
									title={ link.url }
									aria-hidden="true"
								>
									{ link.platform || 'website' }
								</span>
							)
						) ) }
					</div>
				) }
				{ ! isCompact && socialLinks.length === 0 && (
					<p style={ { color: '#757575', fontStyle: 'italic', fontSize: '12px' } }>
						{ __( 'Add social links in the sidebar panel.', 'sgs-blocks' ) }
					</p>
				) }
			</div>
		</>
	);
}
