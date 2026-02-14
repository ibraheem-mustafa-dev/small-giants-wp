import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	Button,
	TextControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar, fontSizeVar } from '../../utils';

const STYLE_OPTIONS = [
	{ label: __( 'Card', 'sgs-blocks' ), value: 'card' },
	{ label: __( 'Minimal', 'sgs-blocks' ), value: 'minimal' },
	{ label: __( 'Featured', 'sgs-blocks' ), value: 'featured' },
];

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ), value: 'xx-large' },
];

/**
 * Generate initials from a name string.
 *
 * @param {string} fullName The person's name.
 * @return {string} Up to two initials.
 */
function getInitials( fullName ) {
	if ( ! fullName ) {
		return '';
	}
	const parts = fullName.replace( /<[^>]+>/g, '' ).trim().split( /\s+/ );
	if ( parts.length === 1 ) {
		return parts[ 0 ].charAt( 0 ).toUpperCase();
	}
	return (
		parts[ 0 ].charAt( 0 ) + parts[ parts.length - 1 ].charAt( 0 )
	).toUpperCase();
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		quote,
		name,
		role,
		avatar,
		rating,
		style: cardStyle,
		quoteColour,
		nameColour,
		nameFontSize,
		roleColour,
		ratingColour,
		reviewSource,
		reviewDate,
	} = attributes;

	const className = [
		'sgs-testimonial',
		`sgs-testimonial--${ cardStyle }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Testimonial Style', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { style: val } )
						}
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Star rating', 'sgs-blocks' ) }
						value={ rating }
						onChange={ ( val ) =>
							setAttributes( { rating: val } )
						}
						min={ 0 }
						max={ 5 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Avatar', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) =>
								setAttributes( {
									avatar: {
										id: media.id,
										url: media.url,
										alt: media.alt,
									},
								} )
							}
							allowedTypes={ [ 'image' ] }
							value={ avatar?.id }
							render={ ( { open } ) => (
								<div>
									{ avatar?.url ? (
										<>
											<img
												src={ avatar.url }
												alt=""
												style={ {
													maxWidth: '80px',
													borderRadius: '50%',
													marginBottom: '8px',
												} }
											/>
											<Button
												variant="secondary"
												onClick={ () =>
													setAttributes( {
														avatar: undefined,
													} )
												}
												isDestructive
											>
												{ __(
													'Remove avatar',
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
												'Select avatar',
												'sgs-blocks'
											) }
										</Button>
									) }
								</div>
							) }
						/>
					</MediaUploadCheck>
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
					title={ __( 'Review Source', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Source platform', 'sgs-blocks' ) }
						help={ __(
							'e.g. Google Reviews, LinkedIn, Trustpilot. Leave empty for hand-written testimonials (no schema output).',
							'sgs-blocks'
						) }
						value={ reviewSource }
						onChange={ ( val ) =>
							setAttributes( { reviewSource: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ reviewSource && (
						<TextControl
							label={ __( 'Review date', 'sgs-blocks' ) }
							help={ __(
								'Date of the original review (YYYY-MM-DD).',
								'sgs-blocks'
							) }
							value={ reviewDate }
							onChange={ ( val ) =>
								setAttributes( { reviewDate: val } )
							}
							type="date"
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>
			</InspectorControls>

			<blockquote { ...blockProps }>
				{ rating > 0 && (
					<div
						className="sgs-testimonial__stars"
						style={ {
							color: colourVar( ratingColour ) || undefined,
						} }
						aria-label={ `${ rating } out of 5 stars` }
					>
						{ Array.from( { length: 5 }, ( _, i ) => (
							<span
								key={ i }
								className={ `sgs-testimonial__star ${
									i < rating
										? 'sgs-testimonial__star--filled'
										: 'sgs-testimonial__star--empty'
								}` }
								aria-hidden="true"
							>
								{ i < rating ? '\u2605' : '\u2606' }
							</span>
						) ) }
					</div>
				) }

				<RichText
					tagName="p"
					className="sgs-testimonial__quote"
					value={ quote }
					onChange={ ( val ) =>
						setAttributes( { quote: val } )
					}
					placeholder={ __(
						'Write the testimonial quote\u2026',
						'sgs-blocks'
					) }
					style={ {
						color: colourVar( quoteColour ) || undefined,
					} }
				/>

				<footer className="sgs-testimonial__footer">
					<div className="sgs-testimonial__avatar">
						{ avatar?.url ? (
							<img
								src={ avatar.url }
								alt={ avatar.alt || '' }
								className="sgs-testimonial__avatar-img"
							/>
						) : (
							<span
								className="sgs-testimonial__avatar-initials"
								aria-hidden="true"
							>
								{ getInitials( name ) || '?' }
							</span>
						) }
					</div>
					<div className="sgs-testimonial__meta">
						<RichText
							tagName="cite"
							className="sgs-testimonial__name"
							value={ name }
							onChange={ ( val ) =>
								setAttributes( { name: val } )
							}
							placeholder={ __(
								'Name',
								'sgs-blocks'
							) }
							style={ {
								color:
									colourVar( nameColour ) || undefined,
								fontSize:
									fontSizeVar( nameFontSize ) || undefined,
							} }
						/>
						<RichText
							tagName="span"
							className="sgs-testimonial__role"
							value={ role }
							onChange={ ( val ) =>
								setAttributes( { role: val } )
							}
							placeholder={ __(
								'Role \u2014 Company',
								'sgs-blocks'
							) }
							style={ {
								color:
									colourVar( roleColour ) || undefined,
							} }
						/>
					</div>
				</footer>
			</blockquote>
		</>
	);
}
