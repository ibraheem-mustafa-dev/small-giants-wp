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
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { DesignTokenPicker, ResponsiveBoxControl } from '../../components';
import { colourVar, fontSizeVar } from '../../utils';

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
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		contentWidth,
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
		quoteFontStyle,
		quoteLineHeight,
		summaryFontSize,
		summaryColour,
		nameColour,
		roleColour,
		orgColour,
		ratingColour,
		ratingSize,
		nameFontWeight,
		hoverEffect,
		hoverBackgroundColour,
		hoverTextColour,
		hoverBorderColour,
		transitionDuration,
		transitionEasing,
		hoverScale,
		hoverShadow,
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
			'--sgs-hover-bg': hoverBackgroundColour
				? colourVar( hoverBackgroundColour )
				: undefined,
			'--sgs-hover-text': hoverTextColour
				? colourVar( hoverTextColour )
				: undefined,
			'--sgs-hover-border': hoverBorderColour
				? colourVar( hoverBorderColour )
				: undefined,
			'--sgs-transition-duration': transitionDuration
				? `${ transitionDuration }ms`
				: undefined,
			'--sgs-transition-easing': transitionEasing || undefined,
		},
	} );

	// Per-element inline style — raw colour value (hex or token), best-effort font size.
	const quoteInlineStyle = {
		color: quoteColour || undefined,
		fontSize: quoteFontSize ? fontSizeVar( quoteFontSize ) : undefined,
		fontStyle: quoteFontStyle || undefined,
		lineHeight: quoteLineHeight || undefined,
		marginBottom: quoteMarginBottom || undefined,
	};
	const summaryStyle = {
		color: summaryColour || undefined,
		fontSize: summaryFontSize ? fontSizeVar( summaryFontSize ) : undefined,
	};
	const nameStyle = { color: nameColour || undefined };
	const roleStyle = { color: roleColour || undefined };
	const orgStyle = { color: orgColour || undefined };
	const ratingStyle = { color: ratingColour || undefined };

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

				{ /* ── Rating (gated by showRating) ── */ }
				{ ( effectiveVariant === 'rating-led' || effectiveVariant === 'classic-card' ) && (
					<PanelBody title={ __( 'Rating', 'sgs-blocks' ) }>
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
						{ showRating && effectiveVariant === 'rating-led' && (
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
							/>
						) }
						{ showRating &&
							showStarsControl &&
							( effectiveVariant === 'classic-card' ||
								ratingType === 'stars' ) && (
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
								/>
							) }
						{ showRating &&
							effectiveVariant === 'rating-led' &&
							ratingType === 'scale' && (
								<>
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
									/>
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
									/>
								</>
							) }
						{ showRating && effectiveVariant === 'rating-led' && (
							<>
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
								/>
								<TextControl
									label={ __( 'Review date', 'sgs-blocks' ) }
									value={ reviewDate }
									onChange={ ( val ) =>
										setAttributes( { reviewDate: val } )
									}
									__nextHasNoMarginBottom
								/>
							</>
						) }
						{ showRating && (
							<DesignTokenPicker
								label={ __( 'Rating colour', 'sgs-blocks' ) }
								value={ ratingColour }
								onChange={ ( val ) =>
									setAttributes( { ratingColour: val } )
								}
							/>
						) }
						{ showRating && (
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
							/>
						) }
					</PanelBody>
				) }

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
					</PanelBody>
				) }

				{ /* ── Typography ── */ }
				<PanelBody
					title={ __( 'Typography', 'sgs-blocks' ) }
					initialOpen={ false }
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
					/>
					<DesignTokenPicker
						label={ __( 'Quote colour', 'sgs-blocks' ) }
						value={ quoteColour }
						onChange={ ( val ) =>
							setAttributes( { quoteColour: val } )
						}
					/>
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
					/>
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
					/>
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
					/>
					{ showSummary && (
						<>
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
							/>
							<DesignTokenPicker
								label={ __( 'Summary colour', 'sgs-blocks' ) }
								value={ summaryColour }
								onChange={ ( val ) =>
									setAttributes( { summaryColour: val } )
								}
							/>
						</>
					) }
					<DesignTokenPicker
						label={ __( 'Name colour', 'sgs-blocks' ) }
						value={ nameColour }
						onChange={ ( val ) =>
							setAttributes( { nameColour: val } )
						}
					/>
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
					/>
					<DesignTokenPicker
						label={ __( 'Role colour', 'sgs-blocks' ) }
						value={ roleColour }
						onChange={ ( val ) =>
							setAttributes( { roleColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Organisation colour', 'sgs-blocks' ) }
						value={ orgColour }
						onChange={ ( val ) =>
							setAttributes( { orgColour: val } )
						}
					/>
				</PanelBody>

				{ /* ── Hover states ── */ }
				<PanelBody
					title={ __( 'Hover states', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ hoverEffect }
						options={ [
							{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
							{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
							{ label: __( 'Scale', 'sgs-blocks' ), value: 'scale' },
							{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
						] }
						onChange={ ( val ) =>
							setAttributes( { hoverEffect: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Hover background', 'sgs-blocks' ) }
						value={ hoverBackgroundColour }
						onChange={ ( val ) =>
							setAttributes( { hoverBackgroundColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Hover text', 'sgs-blocks' ) }
						value={ hoverTextColour }
						onChange={ ( val ) =>
							setAttributes( { hoverTextColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Hover border', 'sgs-blocks' ) }
						value={ hoverBorderColour }
						onChange={ ( val ) =>
							setAttributes( { hoverBorderColour: val } )
						}
					/>
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
					/>
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
					/>
						<SelectControl
							label={ __( 'Hover scale', 'sgs-blocks' ) }
							value={ hoverScale }
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
								setAttributes( { hoverScale: val } )
							}
							help={ __(
								'Grows the card on hover (GPU-composited transform).',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Hover shadow', 'sgs-blocks' ) }
							value={ hoverShadow }
							options={ [
								{ label: __( 'None', 'sgs-blocks' ), value: '' },
								{ label: __( 'Small', 'sgs-blocks' ), value: 'sm' },
								{ label: __( 'Medium', 'sgs-blocks' ), value: 'md' },
								{ label: __( 'Large', 'sgs-blocks' ), value: 'lg' },
								{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
							] }
							onChange={ ( val ) =>
								setAttributes( { hoverShadow: val } )
							}
							help={ __(
								'Shadow elevation applied on hover (theme shadow preset).',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
				</PanelBody>

				{ /* ── Width / spacing (WS-4 container-mirror, content kind).
				     Box-object interface contract §B/§E: padding/margin base
				     routes to WP-native style.spacing.* (skip-serialised →
				     scoped, not inline); tiers are the paddingTablet/
				     paddingMobile + marginTablet/marginMobile object attrs
				     (mirrors sgs/quote's block-private Wrapper panel). ── */ }
				<PanelBody
					title={ __( 'Width & spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ {
							base: style?.spacing?.padding ?? {},
							tablet: paddingTablet ?? {},
							mobile: paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( {
									style: {
										...style,
										spacing: { ...style?.spacing, padding: next },
									},
								} );
							} else {
								setAttributes( {
									[ `padding${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next,
								} );
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
								setAttributes( {
									style: {
										...style,
										spacing: { ...style?.spacing, margin: next },
									},
								} );
							} else {
								setAttributes( {
									[ `margin${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next,
								} );
							}
						} }
					/>
					<UnitControl
						label={ __( 'Outer max-width', 'sgs-blocks' ) }
						value={ maxWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { maxWidth: val ?? '' } ) }
						help={ __( 'Exact CSS length applied as max-width (e.g. 800px). Leave blank for no cap.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<UnitControl
						label={ __( 'Content width', 'sgs-blocks' ) }
						value={ contentWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { contentWidth: val ?? '' } ) }
						help={ __( 'Exact CSS length, e.g. 900px or 60rem. Leave blank for full width.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ── SEO schema ── */ }
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
