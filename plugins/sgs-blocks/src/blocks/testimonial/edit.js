/**
 * Editor for sgs/testimonial — D8 typed-attr, variant-driven rebuild.
 *
 * Visual thumbnail picker selects one of 7 layout variants. Each field is a
 * typed attribute rendered by the block itself (NOT child blocks), so per-element
 * RichText + typography controls are legitimate (D192 carve-in). All fields are
 * optional + gated — an empty field renders no node on the frontend.
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	PanelRow,
	Button,
	SelectControl,
	RangeControl,
	TextControl,
	ToggleControl,
	BaseControl,
} from '@wordpress/components';
import { ResponsiveBoxControl, ResponsiveControl, ShadowControl, SgsColourPanel, DesignTokenPicker, TypographyControls, fillRow, textRow, SgsLengthControl, SgsBorderControl, resolveColourToken, MediaElementPanel, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl } from '../../components';
import { colourVar, fontSizeVar, resolveTextColourPreviewStyle } from '../../utils';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

// No-inline migration contract §B3 (D294): testimonial is a content-KIND
// composite using only box+width, so it migrates BLOCK-PRIVATE — dropped
// SGS_Container_Wrapper (render.php) and, correspondingly, the shared
// ContainerWrapperControls import here (its 'content' kind panel writes to
// the LEGACY flat paddingTopTablet/… attrs, not the box-object
// paddingTablet/paddingMobile/marginTablet/marginMobile this block now uses —
// same reasoning as sgs/quote's edit.js, which also builds its own
// ResponsiveBoxControl-driven Width panel instead of using the shared one).

const LENGTH_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: '%', label: '%', default: 0 },
];

/**
 * The 7 variants, each with a tiny inline SVG thumbnail so clients pick by eye.
 * `defaults` are seeded onto the block when the operator switches INTO that
 * variant and the discriminating field is still empty — gives a sensible
 * starting point without overwriting existing content.
 */
const VARIANTS = [
	{
		value: '',
		label: __( 'Inherit from slider', 'sgs-blocks' ),
		thumb: (
			<svg viewBox="0 0 48 32" aria-hidden="true">
				<rect x="2" y="2" width="44" height="28" rx="3" fill="#fff" stroke="#cbd5d5" strokeDasharray="3 2" />
				<text x="24" y="20" fontSize="9" textAnchor="middle" fill="#778">↑</text>
			</svg>
		),
	},
	{
		value: 'classic-card',
		label: __( 'Classic card', 'sgs-blocks' ),
		thumb: (
			<svg viewBox="0 0 48 32" aria-hidden="true">
				<rect x="2" y="2" width="44" height="28" rx="3" fill="#fff" stroke="#cbd5d5" />
				<rect x="8" y="7" width="16" height="3" rx="1.5" fill="#F87A1F" />
				<rect x="8" y="13" width="32" height="2" rx="1" fill="#9aa" />
				<rect x="8" y="17" width="28" height="2" rx="1" fill="#9aa" />
				<circle cx="11" cy="25" r="3" fill="#0F7E80" />
				<rect x="17" y="24" width="14" height="2" rx="1" fill="#445" />
			</svg>
		),
	},
	{
		value: 'pull-quote-editorial',
		label: __( 'Pull quote', 'sgs-blocks' ),
		thumb: (
			<svg viewBox="0 0 48 32" aria-hidden="true">
				<rect x="2" y="2" width="44" height="28" rx="3" fill="#f2f5f5" />
				<rect x="7" y="8" width="34" height="4" rx="2" fill="#1E1E1E" />
				<rect x="7" y="15" width="26" height="4" rx="2" fill="#1E1E1E" />
				<rect x="7" y="24" width="16" height="2" rx="1" fill="#778" />
			</svg>
		),
	},
	{
		value: 'rating-led',
		label: __( 'Rating led', 'sgs-blocks' ),
		thumb: (
			<svg viewBox="0 0 48 32" aria-hidden="true">
				<rect x="2" y="2" width="44" height="28" rx="3" fill="#fff" stroke="#cbd5d5" />
				<text x="8" y="14" fontSize="9" fontWeight="700" fill="#F87A1F">9.2</text>
				<rect x="22" y="9" width="18" height="2" rx="1" fill="#9aa" />
				<rect x="8" y="20" width="32" height="2" rx="1" fill="#9aa" />
				<rect x="8" y="24" width="22" height="2" rx="1" fill="#9aa" />
			</svg>
		),
	},
	{
		value: 'avatar-spotlight',
		label: __( 'Avatar spotlight', 'sgs-blocks' ),
		thumb: (
			<svg viewBox="0 0 48 32" aria-hidden="true">
				<rect x="2" y="2" width="44" height="28" rx="3" fill="#fff" stroke="#cbd5d5" />
				<circle cx="13" cy="16" r="8" fill="#0F7E80" />
				<rect x="25" y="11" width="16" height="3" rx="1.5" fill="#445" />
				<rect x="25" y="17" width="14" height="2" rx="1" fill="#9aa" />
				<rect x="25" y="21" width="10" height="2" rx="1" fill="#9aa" />
			</svg>
		),
	},
	{
		value: 'corporate-logo',
		label: __( 'Corporate logo', 'sgs-blocks' ),
		thumb: (
			<svg viewBox="0 0 48 32" aria-hidden="true">
				<rect x="2" y="2" width="44" height="28" rx="3" fill="#fff" stroke="#cbd5d5" />
				<rect x="8" y="6" width="20" height="6" rx="1" fill="#0F7E80" />
				<rect x="8" y="16" width="32" height="2" rx="1" fill="#9aa" />
				<rect x="8" y="20" width="28" height="2" rx="1" fill="#9aa" />
				<rect x="8" y="26" width="14" height="2" rx="1" fill="#445" />
			</svg>
		),
	},
	{
		value: 'case-study-media',
		label: __( 'Case study', 'sgs-blocks' ),
		thumb: (
			<svg viewBox="0 0 48 32" aria-hidden="true">
				<rect x="2" y="2" width="44" height="28" rx="3" fill="#fff" stroke="#cbd5d5" />
				<rect x="4" y="4" width="20" height="24" rx="2" fill="#0F7E80" />
				<rect x="28" y="9" width="14" height="2" rx="1" fill="#9aa" />
				<rect x="28" y="14" width="14" height="2" rx="1" fill="#9aa" />
				<rect x="28" y="22" width="10" height="2" rx="1" fill="#445" />
			</svg>
		),
	},
	{
		value: 'minimal-quote',
		label: __( 'Minimal', 'sgs-blocks' ),
		thumb: (
			<svg viewBox="0 0 48 32" aria-hidden="true">
				<rect x="6" y="6" width="3" height="20" rx="1.5" fill="#F87A1F" />
				<rect x="14" y="9" width="28" height="2" rx="1" fill="#9aa" />
				<rect x="14" y="14" width="24" height="2" rx="1" fill="#9aa" />
				<rect x="14" y="22" width="14" height="2" rx="1" fill="#445" />
			</svg>
		),
	},
];

export default function Edit( { attributes, setAttributes, context } ) {
	const {
		style,
		maxWidth,
		variant,
		quote,
		summaryPhrase,
		reviewerName,
		reviewerRole,
		orgName,
		avatarMedia,
		orgLogo,
		workMedia,
		avatarDecorative,
		orgLogoDecorative,
		workMediaDecorative,
		showRating,
		ratingType,
		ratingStars,
		ratingScale,
		ratingScaleMax,
		reviewDate,
		verified,
		sourcePlatform,
		schemaEnabled,
		quoteFontSize,
		quoteMarginBottom,
		quoteColour,
		quoteColourHover,
		quoteColourGradient,
		quoteFontStyle,
		quoteLineHeight,
		summaryFontSize,
		summaryColour,
		summaryColourGradient,
		nameColour,
		nameColourGradient,
		roleColour,
		roleColourGradient,
		orgColour,
		orgColourGradient,
		ratingColour,
		ratingColourGradient,
		ratingSize,
		nameFontWeight,
		nameFontSize,
		effectHover,
		backgroundColour,
		backgroundColourGradient,
		backgroundColourHover,
		textColourHover,
		borderColourHover,
		borderColourHoverGradient,
		transitionDuration,
		transitionEasing,
		scaleHover,
		shadowHover,
		shadowHoverColour,
		staggerDelay,
		summaryColourHover,
		nameColourHover,
		roleColourHover,
		orgColourHover,
		ratingColourHover,
	} = attributes;

	// Effective variant = this card's own explicit choice, else the parent
	// slider's default (received via block context), else the historical
	// fallback. Mirrors the resolution logic in render.php exactly so the
	// editor preview matches the frontend. The raw `variant` attribute (which
	// may be '' = "Inherit from slider") is used only for the picker's
	// selected-radio state — everything that affects LAYOUT uses the
	// resolved effective value.
	const inheritedVariant = context?.[ 'sgs/testimonialVariant' ] || '';
	const effectiveVariant = variant || inheritedVariant || 'classic-card';

	// Switching variant: seed a sensible default for that variant's discriminating
	// field only when it is still empty. Never clobber existing operator content.
	const switchVariant = ( next ) => {
		const patch = { variant: next };
		if ( next === 'rating-led' ) {
			if ( ! showRating ) {
				patch.showRating = true;
			}
			if ( ratingType !== 'scale' && ! ratingStars ) {
				patch.ratingType = 'scale';
			}
		}
		if ( next === 'classic-card' && ! showRating && ratingStars ) {
			patch.showRating = true;
		}
		setAttributes( patch );
	};

	const className = [ 'sgs-testimonial', `sgs-testimonial--${ effectiveVariant }` ]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( {
		className,
		style: {
			'--sgs-transition-duration': transitionDuration
				? `${ transitionDuration }ms`
				: undefined,
			'--sgs-transition-easing': transitionEasing || undefined,
			// Outer width (kept-scalar family, contract §C — no tiers on this
			// block). Mirrors render.php's `max-width` + `margin-inline:auto`
			// pair emitted together on the root scoped rule.
			...( maxWidth && { maxWidth, marginInline: 'auto' } ),
		},
	} );

	// Per-element inline style — raw colour value (hex or token), best-effort font size.
	// D636 Task 1b — the sibling quoteColourGradient attribute wins when set.
	const quoteInlineStyle = {
		...resolveTextColourPreviewStyle( quoteColour, quoteColourGradient ),
		fontSize: quoteFontSize ? fontSizeVar( quoteFontSize ) : undefined,
		fontStyle: quoteFontStyle || undefined,
		lineHeight: quoteLineHeight || undefined,
		marginBottom: quoteMarginBottom || undefined,
	};
	// summary/name/role/org/rating colours (2026-09-03) — the sibling
	// {attr}ColourGradient wins when set+valid, same recipe as quoteColour/
	// quoteColourGradient above.
	const summaryStyle = {
		...resolveTextColourPreviewStyle( summaryColour, summaryColourGradient ),
		fontSize: summaryFontSize ? fontSizeVar( summaryFontSize ) : undefined,
	};
	const nameStyle = resolveTextColourPreviewStyle( nameColour, nameColourGradient );
	const roleStyle = resolveTextColourPreviewStyle( roleColour, roleColourGradient );
	const orgStyle = resolveTextColourPreviewStyle( orgColour, orgColourGradient );
	// ratingSize mirrors render.php:487/499, which sets the same pixel value as
	// the frontend SVG stars' width/height. The canvas renders the rating as a
	// text glyph ('★'.repeat(...)) rather than SVG, so the equivalent visual
	// control is font-size — matches block.json's own attrMap
	// ("css:font-size": "ratingSize", block.json:134).
	const ratingStyle = {
		...resolveTextColourPreviewStyle( ratingColour, ratingColourGradient ),
		fontSize: ratingSize ? ratingSize + 'px' : undefined,
	};

	const showSummary =
		effectiveVariant === 'pull-quote-editorial' || effectiveVariant === 'case-study-media';
	const showAvatar =
		effectiveVariant === 'classic-card' ||
		effectiveVariant === 'avatar-spotlight' ||
		effectiveVariant === 'corporate-logo';
	const showLogo =
		effectiveVariant === 'corporate-logo' || effectiveVariant === 'case-study-media';
	const showWork = effectiveVariant === 'case-study-media';
	const showStarsControl =
		effectiveVariant === 'classic-card' || effectiveVariant === 'rating-led';

	return (
		<>
			{ /* D618/D619 — ONE grouped, SGS-OWNED colour panel, mounted FIRST
			   so it sits at the top of the inspector Styles tab. Replaces the
			   scattered DesignTokenPicker rows that used to sit in "Rating
			   appearance" (ratingColour), "Typography" (quoteColour/
			   summaryColour/nameColour/roleColour/orgColour) and "Hover
			   states" (backgroundColourHover/textColourHover/
			   borderColourHover) below.
			   Background + text are WP-NATIVE colours (block.json
			   `supports.color.background/text`, read from
			   `style.color.background`/`style.color.text` by render.php's
			   `wp_style_engine_get_styles()` call, root_sel = `.sgs-
			   testimonial`) — now that the native sub-flags are turned off
			   (block.json), this panel's Normal state is the ONLY way to set
			   them, paired with the existing backgroundColourHover/
			   textColourHover custom attrs (render.php:419-424, scoped
			   `:hover{}` rule). Border colour's Normal state stays on WP's
			   native Border ToolsPanel (`__experimentalBorder.color` was
			   NOT turned off — width/style/radius have no SGS-custom
			   equivalent on this block, so removing color alone would just
			   split one native control family across two UIs); this panel
			   only carries borderColourHover, which has no native
			   equivalent (WP has no hover-state border colour). quote/
			   summary/name/role/org colours are single-state (no hover
			   attribute exists for any of them in block.json) — confirmed
			   via block.json's attributes list + render.php:135-251. Rating
			   colour is gated exactly like the pre-existing "Rating
			   appearance" panel it replaces (variant + showRating); Summary
			   colour is gated by `showSummary`, the same condition that
			   already scoped it inside the old Typography panel. */ }
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
					/* Link colour. supports.color.link was `true`, so CORE rendered its
					   own link-colour control — but this block never READ
					   style.elements.link.color.text, so that control wrote an attribute
					   nothing painted. It was a DEAD control, not a working feature, and
					   the flip therefore removes nothing. A link genuinely can appear
					   here: `quote` and `summary` are RichText fields output through
					   wp_kses_post(), which permits <a>. So the capability is added
					   properly rather than dropped. Same `text` paint mechanism as the
					   row above (css_property `color`), hence textRow, not fillRow. */
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
					{
						key: 'border',
						label: __( 'Border colour (hover)', 'sgs-blocks' ),
						states: [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: borderColourHover,
								onChange: ( val ) =>
									setAttributes( { borderColourHover: val ?? '' } ),
								linked: true,
								gradientValue: borderColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { borderColourHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'role',
						label: __( 'Role colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: roleColour,
								onChange: ( val ) =>
									setAttributes( { roleColour: val ?? '' } ),
								linked: true,
								gradientValue: roleColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { roleColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: roleColourHover,
								onChange: ( val ) =>
									setAttributes( { roleColourHover: val ?? '' } ),
								linked: true,
								},
						],
					},
					shadowHover && {
						key: 'shadowHover',
						label: __( 'Hover shadow colour', 'sgs-blocks' ),
						states: [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: shadowHoverColour,
								onChange: ( val ) =>
									setAttributes( { shadowHoverColour: val ?? '' } ),
								linked: true,
							},
						],
					},
				] }
			/>
			{ /* ── Settings tab (behaviour, content, structural choices) ── */ }
			<InspectorControls>
				{ /* ── Variant picker (visual thumbnail grid) ── */ }
				<PanelBody title={ __( 'Layout variant', 'sgs-blocks' ) }>
					<BaseControl
						__nextHasNoMarginBottom
						help={ __(
							'Pick the testimonial layout. Each shows different fields.',
							'sgs-blocks'
						) }
					>
						<div
							className="sgs-variant-grid"
							role="radiogroup"
							aria-label={ __(
								'Testimonial layout variant',
								'sgs-blocks'
							) }
							style={ {
								display: 'grid',
								gridTemplateColumns: 'repeat(2, 1fr)',
								gap: '8px',
								marginTop: '8px',
							} }
						>
							{ VARIANTS.map( ( v ) => {
								const selected = variant === v.value;
								return (
									<button
										type="button"
										key={ v.value }
										role="radio"
										aria-checked={ selected }
										aria-label={ v.label }
										onClick={ () =>
											switchVariant( v.value )
										}
										style={ {
											display: 'flex',
											flexDirection: 'column',
											alignItems: 'center',
											gap: '4px',
											padding: '6px',
											minHeight: '44px',
											cursor: 'pointer',
											borderRadius: '6px',
											border: selected
												? '2px solid var(--wp-admin-theme-color, #3858e9)'
												: '1px solid #ccc',
											background: selected
												? 'rgba(56,88,233,0.06)'
												: '#fff',
										} }
									>
										<span
											style={ {
												width: '100%',
												display: 'block',
											} }
										>
											{ v.thumb }
										</span>
										<span
											style={ {
												fontSize: '11px',
												lineHeight: 1.2,
												textAlign: 'center',
											} }
										>
											{ v.label }
										</span>
									</button>
								);
							} ) }
						</div>
					</BaseControl>
				</PanelBody>

				{ /* ── Media (gated per variant) ── */ }
				{ ( showAvatar || showLogo || showWork ) && (
					<PanelBody
						title={ __( 'Media', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						{ showAvatar && (
							<MediaPanel
								label={ __( 'Author photo', 'sgs-blocks' ) }
								value={ avatarMedia }
								allowedTypes={ [ 'image' ] }
								onChange={ ( media ) =>
									setAttributes( { avatarMedia: media } )
								}
							/>
						) }
						{ /* Item 18 (WCAG 1.1.1) — a person's headshot is normally
						     informative (it identifies who gave the testimonial), so
						     this stays OFF by default; only an operator who knows this
						     particular photo carries no information (e.g. a stock/
						     placeholder image) should switch it on. When on, the photo
						     renders with an empty alt + aria-hidden instead of the
						     media library's stored alt text. */ }
						{ showAvatar && avatarMedia?.url && (
							<ToggleControl
								label={ __(
									'Author photo is decorative',
									'sgs-blocks'
								) }
								help={ __(
									'Hides this photo from screen readers. Leave off unless the photo carries no information of its own.',
									'sgs-blocks'
								) }
								checked={ !! avatarDecorative }
								onChange={ ( val ) =>
									setAttributes( { avatarDecorative: val } )
								}
								__nextHasNoMarginBottom
							/>
						) }
						{ /* Art direction (2026-08-07). Same device-switched shape as
						     sgs/media and sgs/hero. Gated on an author photo existing —
						     a per-device override for a photo that is not there would
						     be a dead control. */ }
						{ showAvatar && avatarMedia?.url && (
							<ResponsiveControl
								label={ __(
									'Author photo for this screen size',
									'sgs-blocks'
								) }
							>
								{ ( bp ) => {
									if ( 'desktop' === bp ) {
										return (
											<p
												style={ {
													margin: 0,
													fontStyle: 'italic',
												} }
											>
												{ __(
													'The photo above is used on desktop. Switch to tablet or mobile to set a different crop.',
													'sgs-blocks'
												) }
											</p>
										);
									}
									const key =
										'tablet' === bp
											? 'avatarMediaTablet'
											: 'avatarMediaMobile';
									return (
										<MediaPanel
											label={ __(
												'Optional — leave empty to reuse the desktop photo here',
												'sgs-blocks'
											) }
											value={ attributes[ key ] }
											allowedTypes={ [ 'image' ] }
											onChange={ ( media ) =>
												setAttributes( { [ key ]: media } )
											}
										/>
									);
								} }
							</ResponsiveControl>
						) }
						{ /* 37-media-no-handroll remediation (2026-09-03) — the author
						     photo's crop mode is a genuine per-instance client control
						     now (style.css no longer hardcodes object-fit:cover; the
						     shared media-atoms stylesheet paints the same default).
						     Gated on an author photo existing, same as the art-direction
						     control above — a crop control for a photo that is not
						     there would be a dead control. */ }
						{ showAvatar && avatarMedia?.url && (
							<MediaElementPanel
								attributes={ attributes }
								setAttributes={ setAttributes }
								prefix="avatar"
								blockSlug="sgs/testimonial"
								insertion="element"
								atoms={ [ 'object-fit' ] }
								mediaType="image"
								scope="element"
							/>
						) }
						{ showLogo && (
							<MediaPanel
								label={ __( 'Organisation logo', 'sgs-blocks' ) }
								value={ orgLogo }
								allowedTypes={ [ 'image' ] }
								onChange={ ( media ) =>
									setAttributes( { orgLogo: media } )
								}
							/>
						) }
						{ /* Item 18 (WCAG 1.1.1) — a logo is normally informative (it
						     identifies which company), so OFF by default. */ }
						{ showLogo && orgLogo?.url && (
							<ToggleControl
								label={ __(
									'Organisation logo is decorative',
									'sgs-blocks'
								) }
								help={ __(
									'Hides this logo from screen readers. Leave off unless the logo carries no information of its own.',
									'sgs-blocks'
								) }
								checked={ !! orgLogoDecorative }
								onChange={ ( val ) =>
									setAttributes( { orgLogoDecorative: val } )
								}
								__nextHasNoMarginBottom
							/>
						) }
						{ /* Moved in from the shared SgsColourPanel (D622 — an
						     element-scoped colour belongs in its own element's
						     TIER 1 panel; "organisation name" is a declared
						     element whose attrMap claims orgColour). */ }
						{ showLogo && (
							<DesignTokenPicker
								label={ __( 'Organisation colour', 'sgs-blocks' ) }
								states={ [
									{
										key: 'normal',
										label: __( 'Normal', 'sgs-blocks' ),
										value: orgColour,
										onChange: ( val ) =>
											setAttributes( { orgColour: val ?? '' } ),
										linked: true,
										gradientValue: orgColourGradient,
										onGradientChange: ( val ) =>
											setAttributes( { orgColourGradient: val ?? '' } ),
									},
									{
										key: 'hover',
										label: __( 'Hover', 'sgs-blocks' ),
										value: orgColourHover,
										onChange: ( val ) =>
											setAttributes( { orgColourHover: val ?? '' } ),
										linked: true,
									},
								] }
							/>
						) }
						{ showWork && (
							<MediaPanel
								label={ __( 'Work image or video', 'sgs-blocks' ) }
								value={ workMedia }
								allowedTypes={ [ 'image', 'video' ] }
								onChange={ ( media ) =>
									setAttributes( { workMedia: media } )
								}
							/>
						) }
						{ /* Item 18 (WCAG 1.1.1) — case-study media is more plausibly
						     decorative (a background/hero shot for the story) than the
						     avatar/logo above, but still OFF by default: the operator
						     makes the call per instance. */ }
						{ showWork && workMedia?.url && (
							<ToggleControl
								label={ __(
									'Work media is decorative',
									'sgs-blocks'
								) }
								help={ __(
									'Hides this image or video from screen readers. Leave off unless it carries no information of its own.',
									'sgs-blocks'
								) }
								checked={ !! workMediaDecorative }
								onChange={ ( val ) =>
									setAttributes( { workMediaDecorative: val } )
								}
								__nextHasNoMarginBottom
							/>
						) }
						{ /* 37-media-no-handroll remediation (2026-09-03) — replaces the
						     old block-level imageControls/imageControlsExplicit
						     "Image Controls" panel (a single shared sgsObjectFit/
						     sgsObjectPosition pair) with an independently-scoped
						     object-fit + focal-point control for THIS slot only,
						     matching sgs/before-after's Wave 5b precedent. Case-study
						     photos/videos vary wildly in composition, so both the crop
						     mode and crop focus are genuine per-instance needs here. */ }
						{ showWork && workMedia?.url && (
							<MediaElementPanel
								attributes={ attributes }
								setAttributes={ setAttributes }
								prefix="work"
								blockSlug="sgs/testimonial"
								insertion="element"
								atoms={ [ 'object-fit', 'focal-point' ] }
								mediaType={ workMedia?.type === 'video' ? 'video' : 'image' }
								scope="element"
								previewUrl={ workMedia?.type === 'video' ? '' : workMedia?.url || '' }
							/>
						) }
					</PanelBody>
				) }

				{ /* ── Rating — visibility + content (behaviour). Appearance
				     [colour, size] moved to the Styles tab below. ── */ }
				{ ( effectiveVariant === 'rating-led' || effectiveVariant === 'classic-card' ) && (
					<ToolsPanel
						label={ __( 'Rating', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								showRating: false,
								ratingType: 'stars',
								ratingStars: 0,
								ratingScale: 0,
								ratingScaleMax: '10',
								verified: false,
								sourcePlatform: '',
								reviewDate: '',
								ratingSize: 16,
								ratingColour: '',
								ratingColourGradient: '',
								ratingColourHover: '',
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Show a rating', 'sgs-blocks' ) }
							hasValue={ () => showRating !== false }
							onDeselect={ () => setAttributes( { showRating: false } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Show a rating', 'sgs-blocks' ) }
								help={ __(
									'Ratings are optional. Leave off for testimonials with no score.',
									'sgs-blocks'
								) }
								checked={ showRating }
								onChange={ ( val ) =>
									setAttributes( { showRating: val } )
								}
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						{ showRating && effectiveVariant === 'rating-led' && (
							<ToolsPanelItem
								label={ __( 'Rating type', 'sgs-blocks' ) }
								hasValue={ () => ratingType !== 'stars' }
								onDeselect={ () => setAttributes( { ratingType: 'stars' } ) }
							>
								<SelectControl
									label={ __( 'Rating type', 'sgs-blocks' ) }
									value={ ratingType }
									options={ [
										{
											label: __( 'Stars (out of 5)', 'sgs-blocks' ),
											value: 'stars',
										},
										{
											label: __( 'Numeric score', 'sgs-blocks' ),
											value: 'scale',
										},
									] }
									onChange={ ( val ) =>
										setAttributes( { ratingType: val } )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						) }
						{ showRating &&
							showStarsControl &&
							( effectiveVariant === 'classic-card' ||
								ratingType === 'stars' ) && (
								<ToolsPanelItem
									label={ __( 'Stars', 'sgs-blocks' ) }
									hasValue={ () => ratingStars !== 0 }
									onDeselect={ () => setAttributes( { ratingStars: 0 } ) }
								>
									<RangeControl
										label={ __( 'Stars', 'sgs-blocks' ) }
										value={ ratingStars }
										onChange={ ( val ) =>
											setAttributes( { ratingStars: val } )
										}
										min={ 0 }
										max={ 5 }
										step={ 0.5 }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
							) }
						{ showRating &&
							effectiveVariant === 'rating-led' &&
							ratingType === 'scale' && (
								<>
									<ToolsPanelItem
										label={ __( 'Score', 'sgs-blocks' ) }
										hasValue={ () => ratingScale !== 0 }
										onDeselect={ () => setAttributes( { ratingScale: 0 } ) }
									>
										<RangeControl
											label={ __( 'Score', 'sgs-blocks' ) }
											value={ ratingScale }
											onChange={ ( val ) =>
												setAttributes( {
													ratingScale: val,
												} )
											}
											min={ 0 }
											max={ 10 }
											step={ 0.1 }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
									</ToolsPanelItem>
									<ToolsPanelItem
										label={ __( 'Out of (max)', 'sgs-blocks' ) }
										hasValue={ () => ratingScaleMax !== '10' }
										onDeselect={ () => setAttributes( { ratingScaleMax: '10' } ) }
									>
										<TextControl
											label={ __(
												'Out of (max)',
												'sgs-blocks'
											) }
											value={ ratingScaleMax }
											onChange={ ( val ) =>
												setAttributes( {
													ratingScaleMax: val,
												} )
											}
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
									</ToolsPanelItem>
								</>
							) }
						{ showRating && effectiveVariant === 'rating-led' && (
							<>
								<ToolsPanelItem
									label={ __( 'Verified badge', 'sgs-blocks' ) }
									hasValue={ () => verified !== false }
									onDeselect={ () => setAttributes( { verified: false } ) }
								>
									<ToggleControl
										label={ __(
											'Verified badge',
											'sgs-blocks'
										) }
										checked={ verified }
										onChange={ ( val ) =>
											setAttributes( { verified: val } )
										}
										__nextHasNoMarginBottom
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Source platform', 'sgs-blocks' ) }
									hasValue={ () => sourcePlatform !== '' }
									onDeselect={ () => setAttributes( { sourcePlatform: '' } ) }
								>
									<TextControl
										label={ __(
											'Source platform',
											'sgs-blocks'
										) }
										help={ __(
											'e.g. Trustpilot, Google',
											'sgs-blocks'
										) }
										value={ sourcePlatform }
										onChange={ ( val ) =>
											setAttributes( {
												sourcePlatform: val,
											} )
										}
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Review date', 'sgs-blocks' ) }
									hasValue={ () => reviewDate !== '' }
									onDeselect={ () => setAttributes( { reviewDate: '' } ) }
								>
									<TextControl
										label={ __( 'Review date', 'sgs-blocks' ) }
										value={ reviewDate }
										onChange={ ( val ) =>
											setAttributes( { reviewDate: val } )
										}
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
							</>
						) }
						{ /* ── Rating appearance (colour + star size), consolidated
						     in from the Styles-tab "Rating appearance" panel —
						     CO-2 / THE PLACEMENT RULE TIER 1 requires "Rating"'s
						     content, styling and hover to live in one panel. ── */ }
						{ showRating && (
							<ToolsPanelItem
								label={ __( 'Star size (px)', 'sgs-blocks' ) }
								hasValue={ () => ratingSize !== 16 }
								onDeselect={ () => setAttributes( { ratingSize: 16 } ) }
							>
								<RangeControl
									label={ __( 'Star size (px)', 'sgs-blocks' ) }
									value={ ratingSize }
									onChange={ ( val ) =>
										setAttributes( { ratingSize: val } )
									}
									min={ 10 }
									max={ 32 }
									step={ 1 }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						) }
						{ /* Moved in from the shared SgsColourPanel (D622 — an
						     element-scoped colour belongs in its own element's
						     TIER 1 panel; "rating" is a declared element whose
						     attrMap claims ratingColour). */ }
						{ showRating && (
							<DesignTokenPicker
								label={ __( 'Rating colour', 'sgs-blocks' ) }
								states={ [
									{
										key: 'normal',
										label: __( 'Normal', 'sgs-blocks' ),
										value: ratingColour,
										onChange: ( val ) =>
											setAttributes( { ratingColour: val ?? '' } ),
										linked: true,
										gradientValue: ratingColourGradient,
										onGradientChange: ( val ) =>
											setAttributes( { ratingColourGradient: val ?? '' } ),
									},
									{
										key: 'hover',
										label: __( 'Hover', 'sgs-blocks' ),
										value: ratingColourHover,
										onChange: ( val ) =>
											setAttributes( { ratingColourHover: val ?? '' } ),
										linked: true,
									},
								] }
							/>
						) }
					</ToolsPanel>
				) }

				{ /* ── SEO schema (behaviour — enables/disables structured-data
				     output; moved here from after Width & spacing so all
				     Settings panels sit together before the Styles group). ── */ }
				<PanelBody
					title={ __( 'SEO schema markup', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __(
							'Output schema.org/Review JSON-LD',
							'sgs-blocks'
						) }
						help={ __(
							'Adds structured data. Enable only when the reviewer has consented to their name appearing in search results.',
							'sgs-blocks'
						) }
						checked={ schemaEnabled }
						onChange={ ( val ) =>
							setAttributes( { schemaEnabled: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					{ (() => {
						const testimonialContrastAgainst =
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
								contrastAgainst={ testimonialContrastAgainst }
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
						);
					} )() }
				</PanelBody>
			</InspectorControls>

			{ /* ── Styles tab (appearance — colour, typography, hover
			     appearance, layout geometry) ── */ }
			<InspectorControls group="styles">
				{ /* ── Typography ── */ }
				<PanelBody
					title={ __( 'Typography', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToolsPanel
						className="sgs-nested-tools-panel"
						label={ __( 'Typography', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								quoteFontSize: '',
								quoteFontStyle: '',
								quoteLineHeight: '',
								quoteMarginBottom: '',
								summaryFontSize: '',
								nameFontWeight: '700',
								nameFontSize: {},
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Quote font size', 'sgs-blocks' ) }
							hasValue={ () => !! quoteFontSize }
							onDeselect={ () =>
								setAttributes( { quoteFontSize: '' } )
							}
							isShownByDefault
						>
							<TextControl
								label={ __( 'Quote font size', 'sgs-blocks' ) }
								help={ __(
									'A token slug (e.g. medium) or a CSS value (e.g. 1.25rem). Leave empty for the variant default.',
									'sgs-blocks'
								) }
								value={ quoteFontSize }
								onChange={ ( val ) =>
									setAttributes( { quoteFontSize: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Quote font style', 'sgs-blocks' ) }
							hasValue={ () => !! quoteFontStyle }
							onDeselect={ () =>
								setAttributes( { quoteFontStyle: '' } )
							}
						>
							<SelectControl
								label={ __( 'Quote font style', 'sgs-blocks' ) }
								value={ quoteFontStyle }
								options={ [
									{ label: __( 'Normal', 'sgs-blocks' ), value: 'normal' },
									{ label: __( 'Italic', 'sgs-blocks' ), value: 'italic' },
								] }
								onChange={ ( val ) =>
									setAttributes( { quoteFontStyle: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Quote line height', 'sgs-blocks' ) }
							hasValue={ () => !! quoteLineHeight }
							onDeselect={ () =>
								setAttributes( { quoteLineHeight: '' } )
							}
						>
							<TextControl
								label={ __( 'Quote line height', 'sgs-blocks' ) }
								help={ __(
									'CSS value (e.g. 1.6, 2em). Leave empty for the variant default.',
									'sgs-blocks'
								) }
								value={ quoteLineHeight }
								onChange={ ( val ) =>
									setAttributes( { quoteLineHeight: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Quote spacing below', 'sgs-blocks' ) }
							hasValue={ () => !! quoteMarginBottom }
							onDeselect={ () =>
								setAttributes( { quoteMarginBottom: '' } )
							}
						>
							<TextControl
								label={ __( 'Quote spacing below', 'sgs-blocks' ) }
								help={ __(
									'A spacing slug (e.g. 30) or a CSS value (e.g. 16px, 1.5rem). Leave empty for the theme default.',
									'sgs-blocks'
								) }
								value={ quoteMarginBottom }
								onChange={ ( val ) =>
									setAttributes( { quoteMarginBottom: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						{ /* Moved in from the shared SgsColourPanel (D622 — an
						     element-scoped colour belongs in its own element's
						     TIER 1 panel; "quote text" is a declared element
						     whose attrMap claims quoteColour). Same row shape,
						     same attributes, just relocated. */ }
						<DesignTokenPicker
							label={ __( 'Quote colour', 'sgs-blocks' ) }
							states={ [
								{
									key: 'normal',
									label: __( 'Normal', 'sgs-blocks' ),
									value: quoteColour,
									onChange: ( val ) =>
										setAttributes( { quoteColour: val ?? '' } ),
									linked: true,
									gradientValue: quoteColourGradient,
									onGradientChange: ( val ) =>
										setAttributes( { quoteColourGradient: val ?? '' } ),
								},
								{
									key: 'hover',
									label: __( 'Hover', 'sgs-blocks' ),
									value: quoteColourHover,
									onChange: ( val ) =>
										setAttributes( { quoteColourHover: val ?? '' } ),
									linked: true,
								},
							] }
						/>
						{ showSummary && (
							<>
								<ToolsPanelItem
									label={ __( 'Summary font size', 'sgs-blocks' ) }
									hasValue={ () => !! summaryFontSize }
									onDeselect={ () =>
										setAttributes( { summaryFontSize: '' } )
									}
								>
									<TextControl
										label={ __(
											'Summary font size',
											'sgs-blocks'
										) }
										value={ summaryFontSize }
										onChange={ ( val ) =>
											setAttributes( { summaryFontSize: val } )
										}
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
								{ /* Moved in from the shared SgsColourPanel (D622). */ }
								<DesignTokenPicker
									label={ __( 'Summary colour', 'sgs-blocks' ) }
									states={ [
										{
											key: 'normal',
											label: __( 'Normal', 'sgs-blocks' ),
											value: summaryColour,
											onChange: ( val ) =>
												setAttributes( { summaryColour: val ?? '' } ),
											linked: true,
											gradientValue: summaryColourGradient,
											onGradientChange: ( val ) =>
												setAttributes( { summaryColourGradient: val ?? '' } ),
										},
										{
											key: 'hover',
											label: __( 'Hover', 'sgs-blocks' ),
											value: summaryColourHover,
											onChange: ( val ) =>
												setAttributes( { summaryColourHover: val ?? '' } ),
											linked: true,
										},
									] }
								/>
							</>
						) }
						{ /*
						 * Reviewer-name font size (responsive: desktop/tablet/mobile)
						 * via the shared TypographyControls component (Bean R-22-13).
						 * showWeight=false because the existing Name font weight
						 * SelectControl below already owns nameFontWeight with its
						 * own restricted option set.
						 */ }
						<ToolsPanelItem
							label={ __( 'Name font size', 'sgs-blocks' ) }
							hasValue={ () => {
								const fsObj = nameFontSize && 'object' === typeof nameFontSize ? nameFontSize : {};
								return !! fsObj.desktop || !! fsObj.tablet || !! fsObj.mobile;
							} }
							onDeselect={ () =>
								setAttributes( { nameFontSize: {} } )
							}
							isShownByDefault
						>
							<TypographyControls
								attributes={ attributes }
								setAttributes={ setAttributes }
								prefix="name"
								showSize={ true }
								showWeight={ false }
								showStyle={ false }
								showLineHeight={ false }
								showResponsive={ true }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Name font weight', 'sgs-blocks' ) }
							hasValue={ () => nameFontWeight !== '700' }
							onDeselect={ () =>
								setAttributes( { nameFontWeight: '700' } )
							}
						>
							<SelectControl
								label={ __( 'Name font weight', 'sgs-blocks' ) }
								value={ nameFontWeight }
								options={ [
									{ label: __( 'Regular (400)', 'sgs-blocks' ), value: '400' },
									{ label: __( 'Medium (500)', 'sgs-blocks' ), value: '500' },
									{ label: __( 'Semi-bold (600)', 'sgs-blocks' ), value: '600' },
									{ label: __( 'Bold (700)', 'sgs-blocks' ), value: '700' },
									{ label: __( 'Extra bold (800)', 'sgs-blocks' ), value: '800' },
								] }
								onChange={ ( val ) =>
									setAttributes( { nameFontWeight: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						{ /* Moved in from the shared SgsColourPanel (D622). */ }
						<DesignTokenPicker
							label={ __( 'Name colour', 'sgs-blocks' ) }
							states={ [
								{
									key: 'normal',
									label: __( 'Normal', 'sgs-blocks' ),
									value: nameColour,
									onChange: ( val ) =>
										setAttributes( { nameColour: val ?? '' } ),
									linked: true,
									gradientValue: nameColourGradient,
									onGradientChange: ( val ) =>
										setAttributes( { nameColourGradient: val ?? '' } ),
								},
								{
									key: 'hover',
									label: __( 'Hover', 'sgs-blocks' ),
									value: nameColourHover,
									onChange: ( val ) =>
										setAttributes( { nameColourHover: val ?? '' } ),
									linked: true,
								},
							] }
						/>
					</ToolsPanel>
				</PanelBody>

				{ /* ── Hover states ── */ }
				<PanelBody
					title={ __( 'Hover states', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToolsPanel
						className="sgs-nested-tools-panel"
						label={ __( 'Hover states', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								effectHover: 'none',
								transitionDuration: '300',
								transitionEasing: 'ease-in-out',
								scaleHover: '',
								shadowHover: '',
								staggerDelay: 0,
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Hover effect', 'sgs-blocks' ) }
							hasValue={ () => effectHover !== 'none' }
							onDeselect={ () =>
								setAttributes( { effectHover: 'none' } )
							}
							isShownByDefault
						>
							<SelectControl
								label={ __( 'Hover effect', 'sgs-blocks' ) }
								value={ effectHover }
								options={ [
									{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
									{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
									{ label: __( 'Scale', 'sgs-blocks' ), value: 'scale' },
									{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
								] }
								onChange={ ( val ) =>
									setAttributes( { effectHover: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
							hasValue={ () => transitionDuration !== '300' }
							onDeselect={ () =>
								setAttributes( { transitionDuration: '300' } )
							}
						>
							<TextControl
								label={ __(
									'Transition duration (ms)',
									'sgs-blocks'
								) }
								value={ transitionDuration }
								onChange={ ( val ) =>
									setAttributes( { transitionDuration: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Transition easing', 'sgs-blocks' ) }
							hasValue={ () => transitionEasing !== 'ease-in-out' }
							onDeselect={ () =>
								setAttributes( { transitionEasing: 'ease-in-out' } )
							}
						>
							<SelectControl
								label={ __( 'Transition easing', 'sgs-blocks' ) }
								value={ transitionEasing }
								options={ [
									{ label: __( 'Ease', 'sgs-blocks' ), value: 'ease' },
									{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
									{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
									{
										label: __( 'Ease in–out', 'sgs-blocks' ),
										value: 'ease-in-out',
									},
									{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
								] }
								onChange={ ( val ) =>
									setAttributes( { transitionEasing: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Hover scale', 'sgs-blocks' ) }
							hasValue={ () => !! scaleHover }
							onDeselect={ () => setAttributes( { scaleHover: '' } ) }
							isShownByDefault
						>
							<SelectControl
								label={ __( 'Hover scale', 'sgs-blocks' ) }
								value={ scaleHover }
								options={ [
									{ label: __( 'None', 'sgs-blocks' ), value: '' },
									{
										label: __( 'Subtle (1.02)', 'sgs-blocks' ),
										value: '1.02',
									},
									{
										label: __( 'Small (1.03)', 'sgs-blocks' ),
										value: '1.03',
									},
									{
										label: __( 'Medium (1.05)', 'sgs-blocks' ),
										value: '1.05',
									},
									{
										label: __( 'Large (1.08)', 'sgs-blocks' ),
										value: '1.08',
									},
								] }
								onChange={ ( val ) =>
									setAttributes( { scaleHover: val } )
								}
								help={ __(
									'Grows the card on hover (GPU-composited transform).',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Hover shadow', 'sgs-blocks' ) }
							hasValue={ () => !! shadowHover }
							onDeselect={ () => setAttributes( { shadowHover: '' } ) }
						>
							<ShadowControl
								label={ __( 'Hover shadow', 'sgs-blocks' ) }
								attributes={ attributes }
								setAttributes={ setAttributes }
								attrNames={ {
									base: 'shadowHover',
									colour: 'shadowHoverColour',
								} }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Stagger delay (ms)', 'sgs-blocks' ) }
							hasValue={ () => !! staggerDelay }
							onDeselect={ () => setAttributes( { staggerDelay: 0 } ) }
						>
							<RangeControl
								label={ __( 'Stagger delay (ms)', 'sgs-blocks' ) }
								help={ __( 'When several testimonial cards sit side by side, each is delayed by a multiple of this value on entrance.', 'sgs-blocks' ) }
								value={ staggerDelay }
								onChange={ ( val ) => setAttributes( { staggerDelay: val } ) }
								min={ 0 }
								max={ 500 }
								step={ 25 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				</PanelBody>

				{ /* ── Width / spacing (WS-4 container-mirror, content kind).
				     padding/margin are each a single block-owned tier-object
				     attr { desktop, tablet, mobile }, written via
				     ResponsiveOverride + SgsBoxControl; read directly by this
				     block's render.php (mirrors sgs/quote's block-private
				     Wrapper panel). ── */ }
				<PanelBody
					title={ __( 'Width & spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
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
					<SgsLengthControl
						label={ __( 'Outer max-width', 'sgs-blocks' ) }
						value={ maxWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { maxWidth: val ?? '' } ) }
						help={ __( 'Exact CSS length applied as max-width (e.g. 800px). Leave blank for no cap.', 'sgs-blocks' ) }
						presets={ false }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Editor canvas — mirrors the variant layout. Empty fields stay
			      editable but render no node on the frontend (placeholder only
			      shows in the editor). ── */ }
			<div { ...blockProps }>
				{ showWork && (
					<figure className="sgs-testimonial__work">
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ ( media ) =>
									setAttributes( {
										workMedia: normalise( media ),
									} )
								}
								allowedTypes={ [ 'image', 'video' ] }
								value={ workMedia?.id }
								render={ ( { open } ) =>
									workMedia?.url ? (
										workMedia.type === 'video' ? (
											// eslint-disable-next-line jsx-a11y/media-has-caption
											<video
												src={ workMedia.url }
												onClick={ open }
												muted
											/>
										) : (
											<img
												src={ workMedia.url }
												alt={ workMedia.alt || '' }
												onClick={ open }
											/>
										)
									) : (
										<Button
											variant="secondary"
											onClick={ open }
										>
											{ __( 'Add work media', 'sgs-blocks' ) }
										</Button>
									)
								}
							/>
						</MediaUploadCheck>
					</figure>
				) }

				{ showLogo && orgLogo?.url && (
					<div className="sgs-testimonial__logo">
						<img src={ orgLogo.url } alt={ orgLogo.alt || '' } />
					</div>
				) }

				{ showRating && (
					<div
						className="sgs-testimonial__rating"
						style={ ratingStyle }
					>
						{ effectiveVariant === 'rating-led' && ratingType === 'scale'
							? `${ ratingScale || 0 } / ${ ratingScaleMax || '10' }`
							: '★'.repeat( Math.floor( ratingStars || 0 ) ) ||
							  __( '(set a rating)', 'sgs-blocks' ) }
					</div>
				) }

				{ effectiveVariant === 'rating-led' &&
					( verified || sourcePlatform || reviewDate ) && (
						<div className="sgs-testimonial__rating-meta">
							{ verified && (
								<span className="sgs-testimonial__verified">
									{ __( 'Verified', 'sgs-blocks' ) }
								</span>
							) }
							{ sourcePlatform && (
								<span className="sgs-testimonial__source">
									{ sourcePlatform }
								</span>
							) }
							{ reviewDate && (
								<span className="sgs-testimonial__date">
									{ reviewDate }
								</span>
							) }
						</div>
					) }

				{ showSummary && (
					<RichText
						tagName="p"
						className="sgs-testimonial__summary"
						style={ summaryStyle }
						value={ summaryPhrase }
						onChange={ ( val ) =>
							setAttributes( { summaryPhrase: val } )
						}
						placeholder={ __(
							'Short summary phrase…',
							'sgs-blocks'
						) }
						allowedFormats={ [ 'core/bold', 'core/italic' ] }
					/>
				) }

				<RichText
					tagName="blockquote"
					className="sgs-testimonial__quote"
					style={ quoteInlineStyle }
					value={ quote }
					onChange={ ( val ) => setAttributes( { quote: val } ) }
					placeholder={ __(
						'Write the testimonial quote…',
						'sgs-blocks'
					) }
					allowedFormats={ [ 'core/bold', 'core/italic', 'core/link' ] }
				/>

				<footer className="sgs-testimonial__footer">
					{ showAvatar && (
						<div className="sgs-testimonial__avatar">
							<MediaUploadCheck>
								<MediaUpload
									onSelect={ ( media ) =>
										setAttributes( {
											avatarMedia: normalise( media ),
										} )
									}
									allowedTypes={ [ 'image' ] }
									value={ avatarMedia?.id }
									render={ ( { open } ) =>
										avatarMedia?.url ? (
											<img
												src={ avatarMedia.url }
												alt={ avatarMedia.alt || '' }
												onClick={ open }
											/>
										) : (
											<Button
												variant="secondary"
												onClick={ open }
											>
												{ __( 'Add photo', 'sgs-blocks' ) }
											</Button>
										)
									}
								/>
							</MediaUploadCheck>
						</div>
					) }
					<div className="sgs-testimonial__meta">
						<RichText
							tagName="cite"
							className="sgs-testimonial__name"
							style={ nameStyle }
							value={ reviewerName }
							onChange={ ( val ) =>
								setAttributes( { reviewerName: val } )
							}
							placeholder={ __( 'Reviewer name', 'sgs-blocks' ) }
							allowedFormats={ [] }
						/>
						<RichText
							tagName="span"
							className="sgs-testimonial__role"
							style={ roleStyle }
							value={ reviewerRole }
							onChange={ ( val ) =>
								setAttributes( { reviewerRole: val } )
							}
							placeholder={ __( 'Role / job title', 'sgs-blocks' ) }
							allowedFormats={ [] }
						/>
						<RichText
							tagName="span"
							className="sgs-testimonial__org"
							style={ orgStyle }
							value={ orgName }
							onChange={ ( val ) =>
								setAttributes( { orgName: val } )
							}
							placeholder={ __( 'Organisation', 'sgs-blocks' ) }
							allowedFormats={ [] }
						/>
					</div>
				</footer>
			</div>
		</>
	);
}

/**
 * Normalise a WP media-library object into the unified SGS media shape.
 *
 * @param {Object} media WordPress media item from MediaUpload onSelect.
 * @return {Object|null} SGS media object or null.
 */
function normalise( media ) {
	if ( ! media || ! media.url ) {
		return null;
	}
	const mime = media.mime || media.mime_type || '';
	const type = mime.indexOf( 'video/' ) === 0 ? 'video' : 'image';
	return {
		url: media.url,
		type,
		id: media.id || 0,
		alt: media.alt || '',
		mime,
		width: media.width,
		height: media.height,
	};
}

/**
 * Small inspector media panel: pick or clear a single media object.
 */
function MediaPanel( { label, value, allowedTypes, onChange } ) {
	return (
		<BaseControl label={ label } __nextHasNoMarginBottom>
			<PanelRow>
				<MediaUploadCheck>
					<MediaUpload
						onSelect={ ( media ) => onChange( normalise( media ) ) }
						allowedTypes={ allowedTypes }
						value={ value?.id }
						render={ ( { open } ) => (
							<div style={ { display: 'flex', gap: '8px', flexWrap: 'wrap' } }>
								<Button variant="secondary" onClick={ open }>
									{ value?.url
										? __( 'Replace', 'sgs-blocks' )
										: __( 'Select', 'sgs-blocks' ) }
								</Button>
								{ value?.url && (
									<Button
										variant="tertiary"
										isDestructive
										onClick={ () => onChange( null ) }
									>
										{ __( 'Remove', 'sgs-blocks' ) }
									</Button>
								) }
							</div>
						) }
					/>
				</MediaUploadCheck>
			</PanelRow>
		</BaseControl>
	);
}
