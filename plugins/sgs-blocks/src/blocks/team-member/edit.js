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
	TextControl,
	Button,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { DesignTokenPicker, ResponsiveBoxControl, ShadowControl } from '../../components';
import MediaPicker from '../../components/MediaPicker';
import { colourVar } from '../../utils';

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
			/>
			<TextControl
				label={ __( 'URL', 'sgs-blocks' ) }
				value={ item.url || '' }
				onChange={ ( val ) => update( 'url', val ) }
				type={ item.platform === 'email' ? 'email' : 'url' }
				placeholder={ item.platform === 'email' ? 'hello@example.com' : 'https://' }
				__nextHasNoMarginBottom
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
	const { style, textColor, backgroundColor, contentWidth, maxWidth } = attributes;
	const wrapperStyle = {};

	const textPreview = style?.color?.text || ( textColor ? colourVar( textColor ) : '' );
	if ( textPreview ) {
		wrapperStyle.color = textPreview;
	}
	const bgPreview = style?.color?.background || ( backgroundColor ? colourVar( backgroundColor ) : '' );
	if ( bgPreview ) {
		wrapperStyle.backgroundColor = bgPreview;
	}
	if ( style?.color?.gradient ) {
		wrapperStyle.backgroundImage = style.color.gradient;
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
	if ( contentWidth ) {
		wrapperStyle.width = contentWidth;
	}

	return wrapperStyle;
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		style,
		memberMedia,
		photo,
		name,
		role,
		bio,
		nameColour,
		roleColour,
		cardStyle,
		photoShape,
		overlayHover,
		cardShadow,
		displayMode,
		socialLinks,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		contentWidth,
		maxWidth,
	} = attributes;

	const isCompact = 'compact' === displayMode;

	// Hydrate from new memberMedia first, fall back to legacy photo.
	const activeMedia = ( memberMedia && memberMedia.url )
		? memberMedia
		: ( photo && photo.url
			? {
				url: photo.url,
				type: 'image',
				id: photo.id || 0,
				alt: photo.alt || '',
				mime: 'image/jpeg',
			}
			: null
		);

	const handleMediaChange = ( media ) => {
		if ( ! media ) {
			setAttributes( { memberMedia: null, photo: undefined } );
			return;
		}
		setAttributes( {
			memberMedia: media,
			// Mirror to legacy attr so older render paths / schema markup keep working.
			photo: { id: media.id, url: media.url, alt: media.alt },
		} );
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
		setAttributes( { socialLinks: [ ...socialLinks, { platform: 'website', url: '' } ] } );
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
			<InspectorControls>
				<PanelBody title={ __( 'Card Settings', 'sgs-blocks' ) }>
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
					/>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ CARD_STYLES }
						onChange={ ( val ) => setAttributes( { cardStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Photo shape', 'sgs-blocks' ) }
						value={ photoShape }
						options={ PHOTO_SHAPES }
						onChange={ ( val ) => setAttributes( { photoShape: val } ) }
						__nextHasNoMarginBottom
					/>
					{ ! isCompact && (
						<ToggleControl
							label={ __( 'Hover overlay (bio)', 'sgs-blocks' ) }
							help={ __( 'Reveals the bio as a slide-up overlay on the photo when hovered or focused. On touch devices, tap the photo to toggle.', 'sgs-blocks' ) }
							checked={ overlayHover }
							onChange={ ( val ) => setAttributes( { overlayHover: val } ) }
							__nextHasNoMarginBottom
						/>
					) }
					{ /* FR-35-5 Task 4c (2026-07-21) — resting-state shadow, pairs with
					   the existing hover-only shadowHover. Empty = inherit the theme
					   token exactly as before (Bean's Option A, same shape as
					   card-grid's cardShadow). */ }
					<ShadowControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						value={ cardShadow }
						onChange={ ( val ) => setAttributes( { cardShadow: val } ) }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Colours', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Name colour', 'sgs-blocks' ) }
						value={ nameColour }
						onChange={ ( val ) => setAttributes( { nameColour: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Role colour', 'sgs-blocks' ) }
						value={ roleColour }
						onChange={ ( val ) => setAttributes( { roleColour: val } ) }
					/>
				</PanelBody>

				{ /* Box-object interface contract §B/§E: padding/margin base routes
				   to WP-native style.spacing.* (skip-serialised → scoped, not
				   inline); tiers are the paddingTablet/paddingMobile +
				   marginTablet/marginMobile object attrs. Border width/colour/
				   style/radius stay on WP's native automatic Styles panels. */ }
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
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

				{ /* Width — outer maxWidth + content band width (kept-scalar,
				   base only — matches the pre-existing contract for this block). */ }
				<PanelBody title={ __( 'Width', 'sgs-blocks' ) } initialOpen={ false }>
					<UnitControl
						label={ __( 'Max-width', 'sgs-blocks' ) }
						value={ maxWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { maxWidth: val ?? '' } ) }
						help={ __( 'Leave blank for no cap.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<UnitControl
						label={ __( 'Content width', 'sgs-blocks' ) }
						value={ contentWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { contentWidth: val ?? '' } ) }
						help={ __( 'Exact CSS length, e.g. 300px. Leave blank for auto.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
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

			<div { ...blockProps }>
				<div className={ `sgs-team-member__photo sgs-team-member__photo--${ photoShape }` }>
					<MediaPicker
						value={ activeMedia }
						onChange={ handleMediaChange }
						onRemove={ () => setAttributes( { memberMedia: null, photo: undefined } ) }
						allowedTypes={ [ 'image' ] }
						label={ __( 'Select photo', 'sgs-blocks' ) }
						instructionsImage={ __( 'Choose a headshot photo for this team member', 'sgs-blocks' ) }
					/>
				</div>
				<RichText
					tagName="h3"
					className="sgs-team-member__name"
					value={ name }
					onChange={ ( val ) => setAttributes( { name: val } ) }
					placeholder={ __( 'Name', 'sgs-blocks' ) }
					style={ { color: colourVar( nameColour ) || undefined } }
				/>
				<RichText
					tagName="p"
					className="sgs-team-member__role"
					value={ role }
					onChange={ ( val ) => setAttributes( { role: val } ) }
					placeholder={ __( 'Role / Title', 'sgs-blocks' ) }
					style={ { color: colourVar( roleColour ) || undefined } }
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
