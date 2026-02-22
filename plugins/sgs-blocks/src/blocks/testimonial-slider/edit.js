import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ToggleControl,
	TextControl,
	TextareaControl,
	Button,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar, fontSizeVar } from '../../utils';

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ), value: 'xx-large' },
];

const STYLE_OPTIONS = [
	{ label: __( 'Card', 'sgs-blocks' ), value: 'card' },
	{ label: __( 'Minimal', 'sgs-blocks' ), value: 'minimal' },
	{ label: __( 'Featured', 'sgs-blocks' ), value: 'featured' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
];

const SLIDES_VISIBLE_OPTIONS = [
	{ label: __( '1 slide', 'sgs-blocks' ), value: 1 },
	{ label: __( '2 slides', 'sgs-blocks' ), value: 2 },
	{ label: __( '3 slides', 'sgs-blocks' ), value: 3 },
];

/**
 * Generate initials from a name string.
 *
 * @param {string} fullName The person's name.
 * @return {string} Up to two initials.
 */
function getInitials( fullName ) {
	if ( ! fullName ) {
		return '?';
	}
	const parts = fullName.trim().split( /\s+/ );
	if ( parts.length === 1 ) {
		return parts[ 0 ].charAt( 0 ).toUpperCase();
	}
	return (
		parts[ 0 ].charAt( 0 ) + parts[ parts.length - 1 ].charAt( 0 )
	).toUpperCase();
}

function TestimonialEditor( { testimonial, index, onChange, onRemove } ) {
	const update = ( key, value ) => {
		onChange( { ...testimonial, [ key ]: value } );
	};

	return (
		<div
			className="sgs-testimonial-slider-editor__item"
			style={ {
				borderBottom: '1px solid #ddd',
				paddingBottom: '12px',
				marginBottom: '12px',
			} }
		>
			<p style={ { fontWeight: 600, margin: '0 0 8px' } }>
				{ `#${ index + 1 }` }
				{ testimonial.name ? ` — ${ testimonial.name }` : '' }
			</p>

			<TextareaControl
				label={ __( 'Quote', 'sgs-blocks' ) }
				value={ testimonial.quote || '' }
				onChange={ ( val ) => update( 'quote', val ) }
				rows={ 3 }
				__nextHasNoMarginBottom
			/>

			<TextControl
				label={ __( 'Name', 'sgs-blocks' ) }
				value={ testimonial.name || '' }
				onChange={ ( val ) => update( 'name', val ) }
				__nextHasNoMarginBottom
			/>

			<TextControl
				label={ __( 'Role', 'sgs-blocks' ) }
				value={ testimonial.role || '' }
				onChange={ ( val ) => update( 'role', val ) }
				placeholder={ __( 'Owner \u2014 Company', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
			/>

			<RangeControl
				label={ __( 'Rating', 'sgs-blocks' ) }
				value={ testimonial.rating || 0 }
				onChange={ ( val ) => update( 'rating', val ) }
				min={ 0 }
				max={ 5 }
				step={ 1 }
				__nextHasNoMarginBottom
			/>

			<MediaUploadCheck>
				<MediaUpload
					onSelect={ ( media ) =>
						update( 'avatar', {
							id: media.id,
							url: media.url,
							alt: media.alt,
						} )
					}
					allowedTypes={ [ 'image' ] }
					value={ testimonial.avatar?.id }
					render={ ( { open } ) => (
						<div style={ { marginTop: '8px' } }>
							{ testimonial.avatar?.url ? (
								<>
									<img
										src={ testimonial.avatar.url }
										alt=""
										style={ {
											maxWidth: '48px',
											borderRadius: '50%',
											marginBottom: '4px',
											display: 'block',
										} }
									/>
									<Button
										variant="link"
										isDestructive
										onClick={ () =>
											update( 'avatar', undefined )
										}
										size="small"
									>
										{ __( 'Remove', 'sgs-blocks' ) }
									</Button>
								</>
							) : (
								<Button
									variant="link"
									onClick={ open }
									size="small"
								>
									{ __( 'Add avatar', 'sgs-blocks' ) }
								</Button>
							) }
						</div>
					) }
				/>
			</MediaUploadCheck>

			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
				style={ { marginTop: '8px' } }
			>
				{ __( 'Remove testimonial', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		testimonials,
		autoplay,
		autoplaySpeed,
		showDots,
		showArrows,
		slidesVisible,
		cardStyle,
		quoteColour,
		nameColour,
		nameFontSize,
		roleColour,
		ratingColour,
	} = attributes;

	const updateTestimonial = ( index, updated ) => {
		const next = [ ...testimonials ];
		next[ index ] = updated;
		setAttributes( { testimonials: next } );
	};

	const removeTestimonial = ( index ) => {
		setAttributes( {
			testimonials: testimonials.filter( ( _, i ) => i !== index ),
		} );
	};

	const addTestimonial = () => {
		setAttributes( {
			testimonials: [
				...testimonials,
				{
					quote: '',
					name: '',
					role: '',
					rating: 5,
					avatar: undefined,
				},
			],
		} );
	};

	const className = [
		'sgs-testimonial-slider',
		`sgs-testimonial-slider--${ cardStyle }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	const trackStyle = {
		'--sgs-slides-visible': slidesVisible,
	};

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Slider Settings', 'sgs-blocks' ) }
				>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { cardStyle: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __(
							'Slides visible (desktop)',
							'sgs-blocks'
						) }
						value={ slidesVisible }
						options={ SLIDES_VISIBLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( {
								slidesVisible: parseInt( val, 10 ),
							} )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show arrows', 'sgs-blocks' ) }
						checked={ showArrows }
						onChange={ ( val ) =>
							setAttributes( { showArrows: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show dots', 'sgs-blocks' ) }
						checked={ showDots }
						onChange={ ( val ) =>
							setAttributes( { showDots: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Autoplay', 'sgs-blocks' ) }
						checked={ autoplay }
						onChange={ ( val ) =>
							setAttributes( { autoplay: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ autoplay && (
						<RangeControl
							label={ __(
								'Autoplay speed (ms)',
								'sgs-blocks'
							) }
							value={ autoplaySpeed }
							onChange={ ( val ) =>
								setAttributes( { autoplaySpeed: val } )
							}
							min={ 2000 }
							max={ 10000 }
							step={ 500 }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Text Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Quote colour', 'sgs-blocks' ) }
						value={ quoteColour }
						onChange={ ( val ) =>
							setAttributes( { quoteColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Name colour', 'sgs-blocks' ) }
						value={ nameColour }
						onChange={ ( val ) =>
							setAttributes( { nameColour: val } )
						}
					/>
					<SelectControl
						label={ __( 'Name font size', 'sgs-blocks' ) }
						value={ nameFontSize || '' }
						options={ FONT_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { nameFontSize: val } )
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
						label={ __( 'Star colour', 'sgs-blocks' ) }
						value={ ratingColour }
						onChange={ ( val ) =>
							setAttributes( { ratingColour: val } )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Testimonials', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					{ testimonials.map( ( testimonial, index ) => (
						<TestimonialEditor
							key={ index }
							testimonial={ testimonial }
							index={ index }
							onChange={ ( updated ) =>
								updateTestimonial( index, updated )
							}
							onRemove={ () => removeTestimonial( index ) }
						/>
					) ) }
					<Button variant="secondary" onClick={ addTestimonial }>
						{ __( 'Add testimonial', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ testimonials.length === 0 ? (
					<p className="sgs-testimonial-slider__empty">
						{ __(
							'Add testimonials in the sidebar panel.',
							'sgs-blocks'
						) }
					</p>
				) : (
					<div
						className="sgs-testimonial-slider__track"
						style={ trackStyle }
					>
						{ testimonials.map( ( t, i ) => (
							<blockquote
								key={ i }
								className={ `sgs-testimonial-slider__slide sgs-testimonial-slider__slide--${ cardStyle }` }
							>
								{ t.rating > 0 && (
									<div
										className="sgs-testimonial-slider__stars"
										style={ {
											color:
												colourVar( ratingColour ) ||
												undefined,
										} }
										aria-label={ `${ t.rating } out of 5 stars` }
									>
										{ Array.from(
											{ length: 5 },
											( _, si ) => (
												<span
													key={ si }
													className={ `sgs-testimonial-slider__star ${
														si < t.rating
															? 'sgs-testimonial-slider__star--filled'
															: 'sgs-testimonial-slider__star--empty'
													}` }
													aria-hidden="true"
												>
													{ si < t.rating
														? '\u2605'
														: '\u2606' }
												</span>
											)
										) }
									</div>
								) }

								<p
									className="sgs-testimonial-slider__quote"
									style={ {
										color:
											colourVar( quoteColour ) ||
											undefined,
									} }
								>
									{ t.quote ||
										__( 'Quote text\u2026', 'sgs-blocks' ) }
								</p>

								<footer className="sgs-testimonial-slider__footer">
									<div className="sgs-testimonial-slider__avatar">
										{ t.avatar?.url ? (
											<img
												src={ t.avatar.url }
												alt={ t.avatar.alt || '' }
												className="sgs-testimonial-slider__avatar-img"
											/>
										) : (
											<span
												className="sgs-testimonial-slider__avatar-initials"
												aria-hidden="true"
											>
												{ getInitials( t.name ) }
											</span>
										) }
									</div>
									<div className="sgs-testimonial-slider__meta">
										<cite
											className="sgs-testimonial-slider__name"
											style={ {
												color:
													colourVar( nameColour ) ||
													undefined,
												fontSize:
													fontSizeVar( nameFontSize ) ||
													undefined,
											} }
										>
											{ t.name ||
												__( 'Name', 'sgs-blocks' ) }
										</cite>
										{ t.role && (
											<span
												className="sgs-testimonial-slider__role"
												style={ {
													color:
														colourVar(
															roleColour
														) || undefined,
												} }
											>
												{ t.role }
											</span>
										) }
									</div>
								</footer>
							</blockquote>
						) ) }
					</div>
				) }
			</div>
		</>
	);
}
