import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	RichText,
	URLInput,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	Button,
	TextControl,
	TextareaControl,
	ToggleControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { DesignTokenPicker, ResponsiveControl } from '../../components';
import { colourVar, fontSizeVar } from '../../utils';

const VARIANT_OPTIONS = [
	{ label: __( 'Standard', 'sgs-blocks' ), value: 'standard' },
	{ label: __( 'Split', 'sgs-blocks' ), value: 'split' },
	{ label: __( 'Video', 'sgs-blocks' ), value: 'video' },
	{ label: __( 'SVG Animated', 'sgs-blocks' ), value: 'svg-animated' },
];

const ALIGN_OPTIONS = [
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'centre' },
];

const CTA_STYLE_OPTIONS = [
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
	{ label: __( 'Outline', 'sgs-blocks' ), value: 'outline' },
];

const BADGE_STYLE_OPTIONS = [
	{ label: __( 'Light', 'sgs-blocks' ), value: 'light' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
	{ label: __( 'Success', 'sgs-blocks' ), value: 'success' },
];

const BADGE_POSITION_OPTIONS = [
	{ label: __( 'Bottom left', 'sgs-blocks' ), value: 'bottom-left' },
	{ label: __( 'Bottom right', 'sgs-blocks' ), value: 'bottom-right' },
	{ label: __( 'Top left', 'sgs-blocks' ), value: 'top-left' },
	{ label: __( 'Top right', 'sgs-blocks' ), value: 'top-right' },
];

function BadgeEditor( { badge, index, onChange, onRemove } ) {
	const update = ( key, value ) => {
		onChange( { ...badge, [ key ]: value } );
	};

	return (
		<div className="sgs-hero-badge-editor">
			<TextControl
				label={ __( 'Number / value', 'sgs-blocks' ) }
				value={ badge.number || '' }
				onChange={ ( val ) => update( 'number', val ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Suffix', 'sgs-blocks' ) }
				value={ badge.suffix || '' }
				onChange={ ( val ) => update( 'suffix', val ) }
				placeholder="+"
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Label', 'sgs-blocks' ) }
				value={ badge.label || '' }
				onChange={ ( val ) => update( 'label', val ) }
				__nextHasNoMarginBottom
			/>
			<SelectControl
				label={ __( 'Position', 'sgs-blocks' ) }
				value={ badge.position || 'bottom-left' }
				options={ BADGE_POSITION_OPTIONS }
				onChange={ ( val ) => update( 'position', val ) }
				__nextHasNoMarginBottom
			/>
			<SelectControl
				label={ __( 'Style', 'sgs-blocks' ) }
				value={ badge.style || 'light' }
				options={ BADGE_STYLE_OPTIONS }
				onChange={ ( val ) => update( 'style', val ) }
				__nextHasNoMarginBottom
			/>
			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
			>
				{ __( 'Remove badge', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ), value: 'xx-large' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		variant,
		headline,
		subHeadline,
		alignment,
		backgroundImage,
		overlayColour,
		overlayOpacity,
		splitImage,
		backgroundVideo,
		svgContent,
		minHeight,
		badges,
		headlineColour,
		subHeadlineFontSize,
		subHeadlineColour,
		ctaPrimaryText,
		ctaPrimaryUrl,
		ctaPrimaryStyle,
		ctaPrimaryColour,
		ctaPrimaryBackground,
		ctaSecondaryText,
		ctaSecondaryUrl,
		ctaSecondaryStyle,
		ctaSecondaryColour,
		ctaSecondaryBackground,
		bgParallax,
		bgKenBurns,
		bgVideo,
		bgVideoMobile,
	} = attributes;

	const isSplit = variant === 'split';
	const isVideo = variant === 'video';
	const isSvgAnimated = variant === 'svg-animated';

	const wrapperStyle = {};
	if ( ! isSplit && ! isVideo && ! isSvgAnimated && backgroundImage?.url ) {
		wrapperStyle.backgroundImage = `url(${ backgroundImage.url })`;
		wrapperStyle.backgroundSize = 'cover';
		wrapperStyle.backgroundPosition = 'center';
	}
	if ( minHeight ) {
		wrapperStyle.minHeight = minHeight;
	}

	const className = [
		'sgs-hero',
		`sgs-hero--${ variant }`,
		`sgs-hero--align-${ alignment }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className, style: wrapperStyle } );

	const updateBadge = ( index, updatedBadge ) => {
		const updated = [ ...badges ];
		updated[ index ] = updatedBadge;
		setAttributes( { badges: updated } );
	};

	const removeBadge = ( index ) => {
		setAttributes( { badges: badges.filter( ( _, i ) => i !== index ) } );
	};

	const addBadge = () => {
		setAttributes( {
			badges: [
				...badges,
				{
					number: '',
					suffix: '',
					label: '',
					position: 'bottom-left',
					style: 'light',
				},
			],
		} );
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Hero Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Variant', 'sgs-blocks' ) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { variant: val } )
						}
						__nextHasNoMarginBottom
					/>

					<ToggleGroupControl
						label={ __( 'Text alignment', 'sgs-blocks' ) }
						value={ alignment }
						onChange={ ( val ) =>
							setAttributes( { alignment: val } )
						}
						isBlock
						__nextHasNoMarginBottom
					>
						{ ALIGN_OPTIONS.map( ( opt ) => (
							<ToggleGroupControlOption
								key={ opt.value }
								value={ opt.value }
								label={ opt.label }
							/>
						) ) }
					</ToggleGroupControl>

					<ResponsiveControl
						label={ __( 'Min height', 'sgs-blocks' ) }
					>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'minHeight',
								tablet: 'minHeightTablet',
								mobile: 'minHeightMobile',
							};
							return (
								<SelectControl
									value={
										attributes[
											attrMap[ breakpoint ]
										]
									}
									options={ [
										{ label: __( 'Auto (fit content)', 'sgs-blocks' ), value: '' },
										{ label: '50vh',  value: '50vh'  },
										{ label: '75vh',  value: '75vh'  },
										{ label: '80vh',  value: '80vh'  },
										{ label: '100vh', value: '100vh' },
										{ label: '360px', value: '360px' },
										{ label: '400px', value: '400px' },
										{ label: '520px', value: '520px' },
										{ label: '600px', value: '600px' },
									] }
									onChange={ ( val ) =>
										setAttributes( {
											[ attrMap[ breakpoint ] ]:
												val,
										} )
									}
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>
				</PanelBody>

				<PanelBody
					title={ __( 'Text Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Headline colour', 'sgs-blocks' ) }
						value={ headlineColour }
						onChange={ ( val ) =>
							setAttributes( { headlineColour: val } )
						}
					/>
					<ResponsiveControl
						label={ __( 'Sub-headline font size', 'sgs-blocks' ) }
					>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'subHeadlineFontSize',
								tablet: 'subHeadlineFontSizeTablet',
								mobile: 'subHeadlineFontSizeMobile',
							};
							return (
								<SelectControl
									value={
										attributes[
											attrMap[ breakpoint ]
										] || ''
									}
									options={
										breakpoint === 'desktop'
											? FONT_SIZE_OPTIONS
											: [
													{
														label: __(
															'Same as desktop',
															'sgs-blocks'
														),
														value: '',
													},
													...FONT_SIZE_OPTIONS.filter(
														( opt ) =>
															opt.value !== ''
													),
												]
									}
									onChange={ ( val ) =>
										setAttributes( {
											[ attrMap[ breakpoint ] ]:
												val,
										} )
									}
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>
					<DesignTokenPicker
						label={ __(
							'Sub-headline colour',
							'sgs-blocks'
						) }
						value={ subHeadlineColour }
						onChange={ ( val ) =>
							setAttributes( { subHeadlineColour: val } )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Background', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) =>
								setAttributes( {
									backgroundImage: {
										id: media.id,
										url: media.url,
										alt: media.alt,
									},
								} )
							}
							allowedTypes={ [ 'image' ] }
							value={ backgroundImage?.id }
							render={ ( { open } ) => (
								<div>
									{ backgroundImage?.url ? (
										<>
											<img
												src={ backgroundImage.url }
												alt=""
												style={ {
													maxWidth: '100%',
													marginBottom: '8px',
												} }
											/>
											<Button
												variant="secondary"
												onClick={ () =>
													setAttributes( {
														backgroundImage:
															undefined,
													} )
												}
												isDestructive
											>
												{ __(
													'Remove image',
													'sgs-blocks'
												) }
											</Button>
										</>
									) : (
										<Button
											variant="secondary"
											onClick={ open }
										>
											{ __(
												'Select background image',
												'sgs-blocks'
											) }
										</Button>
									) }
								</div>
							) }
						/>
					</MediaUploadCheck>

					<DesignTokenPicker
						label={ __( 'Overlay colour', 'sgs-blocks' ) }
						value={ overlayColour }
						onChange={ ( val ) =>
							setAttributes( { overlayColour: val } )
						}
					/>
					<RangeControl
						label={ __( 'Overlay opacity (%)', 'sgs-blocks' ) }
						value={ overlayOpacity }
						onChange={ ( val ) =>
							setAttributes( { overlayOpacity: val } )
						}
						min={ 0 }
						max={ 100 }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Background Effects', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Parallax scroll', 'sgs-blocks' ) }
						help={ __(
							'Background scrolls slower than content. Disabled automatically on touch devices.',
							'sgs-blocks'
						) }
						checked={ !! bgParallax }
						onChange={ ( val ) =>
							setAttributes( { bgParallax: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Ken Burns animation', 'sgs-blocks' ) }
						help={ __(
							'Slow pan and zoom on the background image. Respects reduced-motion preference.',
							'sgs-blocks'
						) }
						checked={ !! bgKenBurns }
						onChange={ ( val ) =>
							setAttributes( { bgKenBurns: val } )
						}
						__nextHasNoMarginBottom
					/>
					<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>
						{ __( 'Background video (desktop)', 'sgs-blocks' ) }
					</p>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) =>
								setAttributes( {
									bgVideo: { id: media.id, url: media.url },
								} )
							}
							allowedTypes={ [ 'video' ] }
							value={ bgVideo?.id }
							render={ ( { open } ) => (
								<div>
									{ bgVideo?.url ? (
										<>
											<p style={ { fontSize: '12px', margin: '0 0 4px' } }>
												{ bgVideo.url.split( '/' ).pop() }
											</p>
											<Button
												variant="secondary"
												isDestructive
												onClick={ () =>
													setAttributes( { bgVideo: undefined } )
												}
											>
												{ __( 'Remove', 'sgs-blocks' ) }
											</Button>
										</>
									) : (
										<Button variant="secondary" onClick={ open }>
											{ __( 'Select video', 'sgs-blocks' ) }
										</Button>
									) }
								</div>
							) }
						/>
					</MediaUploadCheck>
					<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>
						{ __( 'Background video (mobile)', 'sgs-blocks' ) }
					</p>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) =>
								setAttributes( {
									bgVideoMobile: { id: media.id, url: media.url },
								} )
							}
							allowedTypes={ [ 'video' ] }
							value={ bgVideoMobile?.id }
							render={ ( { open } ) => (
								<div>
									{ bgVideoMobile?.url ? (
										<>
											<p style={ { fontSize: '12px', margin: '0 0 4px' } }>
												{ bgVideoMobile.url.split( '/' ).pop() }
											</p>
											<Button
												variant="secondary"
												isDestructive
												onClick={ () =>
													setAttributes( { bgVideoMobile: undefined } )
												}
											>
												{ __( 'Remove', 'sgs-blocks' ) }
											</Button>
										</>
									) : (
										<Button variant="secondary" onClick={ open }>
											{ __( 'Select mobile video', 'sgs-blocks' ) }
										</Button>
									) }
								</div>
							) }
						/>
					</MediaUploadCheck>
				</PanelBody>

				{ isSplit && (
					<PanelBody
						title={ __( 'Split Image', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ ( media ) =>
									setAttributes( {
										splitImage: {
											id: media.id,
											url: media.url,
											alt: media.alt,
										},
									} )
								}
								allowedTypes={ [ 'image' ] }
								value={ splitImage?.id }
								render={ ( { open } ) => (
									<div>
										{ splitImage?.url ? (
											<>
												<img
													src={ splitImage.url }
													alt=""
													style={ {
														maxWidth: '100%',
														marginBottom: '8px',
													} }
												/>
												<Button
													variant="secondary"
													onClick={ () =>
														setAttributes( {
															splitImage:
																undefined,
														} )
													}
													isDestructive
												>
													{ __(
														'Remove image',
														'sgs-blocks'
													) }
												</Button>
											</>
										) : (
											<Button
												variant="secondary"
												onClick={ open }
											>
												{ __(
													'Select split image',
													'sgs-blocks'
												) }
											</Button>
										) }
									</div>
								) }
							/>
						</MediaUploadCheck>
					</PanelBody>
				) }

				{ isVideo && (
					<PanelBody
						title={ __( 'Background Video', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ ( media ) =>
									setAttributes( {
										backgroundVideo: {
											id: media.id,
											url: media.url,
										},
									} )
								}
								allowedTypes={ [ 'video' ] }
								value={ backgroundVideo?.id }
								render={ ( { open } ) => (
									<div>
										{ backgroundVideo?.url ? (
											<>
												<video
													src={ backgroundVideo.url }
													controls
													style={ {
														maxWidth: '100%',
														marginBottom: '8px',
													} }
												/>
												<Button
													variant="secondary"
													onClick={ () =>
														setAttributes( {
															backgroundVideo:
																undefined,
														} )
													}
													isDestructive
												>
													{ __(
														'Remove video',
														'sgs-blocks'
													) }
												</Button>
											</>
										) : (
											<Button
												variant="secondary"
												onClick={ open }
											>
												{ __(
													'Select background video (MP4/WebM)',
													'sgs-blocks'
												) }
											</Button>
										) }
									</div>
								) }
							/>
						</MediaUploadCheck>
					</PanelBody>
				) }

				{ isSvgAnimated && (
					<PanelBody
						title={ __( 'SVG Background', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<TextareaControl
							label={ __( 'SVG markup', 'sgs-blocks' ) }
							value={ svgContent || '' }
							onChange={ ( val ) =>
								setAttributes( { svgContent: val } )
							}
							rows={ 10 }
							help={ __(
								'Paste your SVG code here. Animation will be handled by the SVG itself.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				<PanelBody
					title={ __( 'Primary CTA', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Button text', 'sgs-blocks' ) }
						value={ ctaPrimaryText || '' }
						onChange={ ( val ) =>
							setAttributes( { ctaPrimaryText: val } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Button URL', 'sgs-blocks' ) }
						value={ ctaPrimaryUrl || '' }
						onChange={ ( val ) =>
							setAttributes( { ctaPrimaryUrl: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Button style', 'sgs-blocks' ) }
						value={ ctaPrimaryStyle }
						options={ CTA_STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { ctaPrimaryStyle: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Text colour', 'sgs-blocks' ) }
						value={ ctaPrimaryColour }
						onChange={ ( val ) =>
							setAttributes( { ctaPrimaryColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __(
							'Background colour',
							'sgs-blocks'
						) }
						value={ ctaPrimaryBackground }
						onChange={ ( val ) =>
							setAttributes( {
								ctaPrimaryBackground: val,
							} )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Secondary CTA', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Button text', 'sgs-blocks' ) }
						value={ ctaSecondaryText || '' }
						onChange={ ( val ) =>
							setAttributes( { ctaSecondaryText: val } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Button URL', 'sgs-blocks' ) }
						value={ ctaSecondaryUrl || '' }
						onChange={ ( val ) =>
							setAttributes( { ctaSecondaryUrl: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Button style', 'sgs-blocks' ) }
						value={ ctaSecondaryStyle }
						options={ CTA_STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { ctaSecondaryStyle: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Text colour', 'sgs-blocks' ) }
						value={ ctaSecondaryColour }
						onChange={ ( val ) =>
							setAttributes( {
								ctaSecondaryColour: val,
							} )
						}
					/>
					<DesignTokenPicker
						label={ __(
							'Background colour',
							'sgs-blocks'
						) }
						value={ ctaSecondaryBackground }
						onChange={ ( val ) =>
							setAttributes( {
								ctaSecondaryBackground: val,
							} )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Badges', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ badges.map( ( badge, index ) => (
						<BadgeEditor
							key={ index }
							badge={ badge }
							index={ index }
							onChange={ ( updated ) =>
								updateBadge( index, updated )
							}
							onRemove={ () => removeBadge( index ) }
						/>
					) ) }
					<Button variant="secondary" onClick={ addBadge }>
						{ __( 'Add badge', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ isVideo && backgroundVideo?.url && (
					<video
						className="sgs-hero__video-bg"
						src={ backgroundVideo.url }
						autoPlay
						loop
						muted
						playsInline
						aria-hidden="true"
					/>
				) }

				{ isSvgAnimated && svgContent && (
					<div
						className="sgs-hero__svg-bg"
						dangerouslySetInnerHTML={ { __html: svgContent } }
						aria-hidden="true"
					/>
				) }

				{ ( ! isSplit && ! isVideo && ! isSvgAnimated && backgroundImage?.url ) && (
					<span
						className="sgs-hero__overlay"
						style={ {
							backgroundColor: overlayColour,
							opacity: overlayOpacity / 100,
						} }
						aria-hidden="true"
					/>
				) }

				{ ( isVideo || isSvgAnimated ) && (
					<span
						className="sgs-hero__overlay"
						style={ {
							backgroundColor: overlayColour,
							opacity: overlayOpacity / 100,
						} }
						aria-hidden="true"
					/>
				) }

				<div className="sgs-hero__content">
					<RichText
						tagName="h1"
						className="sgs-hero__headline"
						value={ headline }
						onChange={ ( val ) =>
							setAttributes( { headline: val } )
						}
						placeholder={ __(
							'Write your headline…',
							'sgs-blocks'
						) }
						style={ {
							color: colourVar( headlineColour ) || undefined,
						} }
					/>
					<RichText
						tagName="p"
						className="sgs-hero__subheadline"
						value={ subHeadline }
						onChange={ ( val ) =>
							setAttributes( { subHeadline: val } )
						}
						placeholder={ __(
							'Supporting text…',
							'sgs-blocks'
						) }
						style={ {
							color:
								colourVar( subHeadlineColour ) || undefined,
							fontSize:
								fontSizeVar( subHeadlineFontSize ) ||
								undefined,
						} }
					/>

					<div className="sgs-hero__ctas">
						{ ctaPrimaryText && (
							<span
								className={ `sgs-hero__cta sgs-hero__cta--${ ctaPrimaryStyle }` }
								style={ {
									color:
										colourVar( ctaPrimaryColour ) ||
										undefined,
									backgroundColor:
										colourVar( ctaPrimaryBackground ) ||
										undefined,
								} }
							>
								{ ctaPrimaryText }
							</span>
						) }
						{ ctaSecondaryText && (
							<span
								className={ `sgs-hero__cta sgs-hero__cta--${ ctaSecondaryStyle }` }
								style={ {
									color:
										colourVar( ctaSecondaryColour ) ||
										undefined,
									backgroundColor:
										colourVar(
											ctaSecondaryBackground
										) || undefined,
								} }
							>
								{ ctaSecondaryText }
							</span>
						) }
					</div>
				</div>

				{ isSplit && splitImage?.url && (
					<div className="sgs-hero__media">
						<img
							src={ splitImage.url }
							alt={ splitImage.alt || '' }
							className="sgs-hero__split-image"
						/>
						{ badges.length > 0 &&
							badges.map( ( badge, index ) => (
								<div
									key={ index }
									className={ `sgs-hero__badge sgs-hero__badge--${ badge.position || 'bottom-left' } sgs-hero__badge--${ badge.style || 'light' }` }
								>
									<span className="sgs-hero__badge-number">
										{ badge.number }
										{ badge.suffix }
									</span>
									<span className="sgs-hero__badge-label">
										{ badge.label }
									</span>
								</div>
							) ) }
					</div>
				) }

				{ ! isSplit &&
					badges.length > 0 &&
					badges.map( ( badge, index ) => (
						<div
							key={ index }
							className={ `sgs-hero__badge sgs-hero__badge--${ badge.position || 'bottom-left' } sgs-hero__badge--${ badge.style || 'light' }` }
						>
							<span className="sgs-hero__badge-number">
								{ badge.number }
								{ badge.suffix }
							</span>
							<span className="sgs-hero__badge-label">
								{ badge.label }
							</span>
						</div>
					) ) }
			</div>
		</>
	);
}
