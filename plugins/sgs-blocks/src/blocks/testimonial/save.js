import { useBlockProps, RichText } from '@wordpress/block-editor';
import { RawHTML } from '@wordpress/element';
import { colourVar, fontSizeVar } from '../../utils';

/**
 * Generate initials from a name string (plain text).
 *
 * @param {string} fullName The person's name (may contain HTML from RichText).
 * @return {string} Up to two initials.
 */
function getInitials( fullName ) {
	if ( ! fullName ) {
		return '';
	}
	const plain = fullName.replace( /<[^>]+>/g, '' ).trim();
	const parts = plain.split( /\s+/ );
	if ( parts.length === 1 ) {
		return parts[ 0 ].charAt( 0 ).toUpperCase();
	}
	return (
		parts[ 0 ].charAt( 0 ) + parts[ parts.length - 1 ].charAt( 0 )
	).toUpperCase();
}

/**
 * Strip HTML tags from a string for use in JSON-LD text properties.
 *
 * @param {string} html Possibly HTML-containing string.
 * @return {string} Plain text.
 */
function stripHtml( html ) {
	if ( ! html ) {
		return '';
	}
	return html.replace( /<[^>]+>/g, '' ).trim();
}

export default function Save( { attributes } ) {
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
		nameFontSizeTablet,
		nameFontSizeMobile,
		roleColour,
		ratingColour,
		hoverBackgroundColour,
		hoverTextColour,
		hoverBorderColour,
		hoverEffect,
		transitionDuration,
		transitionEasing,
		hoverScale,
		hoverShadow,
		staggerDelay,
		schemaEnabled,
	} = attributes;

	const classNames = [
		'sgs-testimonial',
		`sgs-testimonial--${ cardStyle }`,
		hoverEffect && hoverEffect !== 'none'
			? `sgs-testimonial--hover-${ hoverEffect }`
			: '',
		hoverScale ? 'sgs-has-hover-scale' : '',
		hoverShadow ? 'sgs-has-hover' : '',
		staggerDelay ? 'sgs-has-stagger' : '',
	].filter( Boolean );

	const className = classNames.join( ' ' );

	// Responsive name font-size data-attributes for CSS media query selectors.
	const responsiveDataAttrs = {};
	if ( nameFontSizeTablet ) {
		responsiveDataAttrs[ 'data-name-fs-tablet' ] = nameFontSizeTablet;
	}
	if ( nameFontSizeMobile ) {
		responsiveDataAttrs[ 'data-name-fs-mobile' ] = nameFontSizeMobile;
	}

	const blockProps = useBlockProps.save( {
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
			'--sgs-hover-scale': hoverScale || undefined,
			'--sgs-hover-shadow': hoverShadow
				? `var(--wp--preset--shadow--${ hoverShadow })`
				: undefined,
			'--sgs-stagger': staggerDelay ? `${ staggerDelay }ms` : undefined,
		},
		...responsiveDataAttrs,
	} );

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

	const starsStyle = {
		color: colourVar( ratingColour ) || undefined,
	};

	return (
		<>
		<blockquote { ...blockProps }>
			{ rating > 0 && (
				<div
					className="sgs-testimonial__stars"
					style={ starsStyle }
					role="img"
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

			<RichText.Content
				tagName="p"
				className="sgs-testimonial__quote"
				value={ quote }
				style={ quoteStyle }
			/>

			<footer className="sgs-testimonial__footer">
				<div className="sgs-testimonial__avatar">
					{ avatar?.url ? (
						<img
							src={ avatar.url }
							alt={ avatar.alt || '' }
							className="sgs-testimonial__avatar-img"
							loading="lazy"
							width="48"
							height="48"
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
					<RichText.Content
						tagName="cite"
						className="sgs-testimonial__name"
						value={ name }
						style={ nameStyle }
					/>
					<RichText.Content
						tagName="span"
						className="sgs-testimonial__role"
						value={ role }
						style={ roleStyle }
					/>
				</div>
			</footer>
		</blockquote>
		{ schemaEnabled && name && ( () => {
			const plainName = stripHtml( name );
			const plainQuote = stripHtml( quote );
			const schema = {
				'@context': 'https://schema.org',
				'@type': 'Review',
				reviewBody: plainQuote,
				author: {
					'@type': 'Person',
					name: plainName,
				},
			};
			if ( rating > 0 ) {
				schema.reviewRating = {
					'@type': 'Rating',
					ratingValue: rating,
					bestRating: 5,
				};
			}
			return (
				<RawHTML>{ `<script type="application/ld+json">${ JSON.stringify( schema ) }</script>` }</RawHTML>
			);
		} )() }
		</>
	);
}
