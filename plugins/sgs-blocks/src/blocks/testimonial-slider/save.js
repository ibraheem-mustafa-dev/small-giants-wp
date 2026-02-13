import { useBlockProps } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

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

export default function Save( { attributes } ) {
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

	if ( ! testimonials.length ) {
		return null;
	}

	const className = [
		'sgs-testimonial-slider',
		`sgs-testimonial-slider--${ cardStyle }`,
	].join( ' ' );

	const blockProps = useBlockProps.save( { className } );

	const trackStyle = {
		'--sgs-slides-visible': slidesVisible,
	};

	const starsStyle = {
		color: colourVar( ratingColour ) || undefined,
	};

	const quoteStyle = {
		color: colourVar( quoteColour ) || undefined,
	};

	const nameStyle = {
		color: colourVar( nameColour ) || undefined,
		fontSize: fontSizeVar( nameFontSize ) || undefined,
	};

	const roleStyle = {
		color: colourVar( roleColour ) || undefined,
	};

	return (
		<div
			{ ...blockProps }
			data-autoplay={ autoplay ? 'true' : undefined }
			data-speed={ autoplay ? autoplaySpeed : undefined }
			data-slides={ slidesVisible }
		>
			<div
				className="sgs-testimonial-slider__track"
				role="region"
				aria-label="Testimonials"
				tabIndex="0"
				style={ trackStyle }
			>
				{ testimonials.map( ( t, i ) => (
					<blockquote
						key={ i }
						className={ `sgs-testimonial-slider__slide sgs-testimonial-slider__slide--${ cardStyle }` }
						role="group"
						aria-label={ `Testimonial ${ i + 1 } of ${ testimonials.length }` }
					>
						{ t.rating > 0 && (
							<div
								className="sgs-testimonial-slider__stars"
								style={ starsStyle }
								role="img"
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
							style={ quoteStyle }
						>
							{ t.quote }
						</p>

						<footer className="sgs-testimonial-slider__footer">
							<div className="sgs-testimonial-slider__avatar">
								{ t.avatar?.url ? (
									<img
										src={ t.avatar.url }
										alt={ t.avatar.alt || '' }
										className="sgs-testimonial-slider__avatar-img"
										loading="lazy"
										width="48"
										height="48"
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
									style={ nameStyle }
								>
									{ t.name }
								</cite>
								{ t.role && (
									<span
										className="sgs-testimonial-slider__role"
										style={ roleStyle }
									>
										{ t.role }
									</span>
								) }
							</div>
						</footer>
					</blockquote>
				) ) }
			</div>

			{ showArrows && testimonials.length > slidesVisible && (
				<div className="sgs-testimonial-slider__arrows">
					<button
						className="sgs-testimonial-slider__arrow sgs-testimonial-slider__arrow--prev"
						aria-label="Previous testimonial"
						type="button"
					>
						<span aria-hidden="true">&lsaquo;</span>
					</button>
					<button
						className="sgs-testimonial-slider__arrow sgs-testimonial-slider__arrow--next"
						aria-label="Next testimonial"
						type="button"
					>
						<span aria-hidden="true">&rsaquo;</span>
					</button>
				</div>
			) }

			{ showDots && testimonials.length > slidesVisible && (
				<div
					className="sgs-testimonial-slider__dots"
					role="tablist"
					aria-label="Testimonial navigation"
				>
					{ testimonials.map( ( _, i ) => (
						<button
							key={ i }
							className={ `sgs-testimonial-slider__dot${
								i === 0
									? ' sgs-testimonial-slider__dot--active'
									: ''
							}` }
							role="tab"
							aria-selected={ i === 0 ? 'true' : 'false' }
							aria-label={ `Go to testimonial ${ i + 1 }` }
							type="button"
						/>
					) ) }
				</div>
			) }
		</div>
	);
}
