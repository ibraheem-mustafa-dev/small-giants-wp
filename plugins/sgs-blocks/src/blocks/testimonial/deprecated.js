/**
 * Deprecations for sgs/testimonial.
 *
 * v1 — original save output before hover/transition attributes were added.
 *      Attributes: quote, name, role, avatar, rating, style, quoteColour,
 *      nameColour, nameFontSize, roleColour, ratingColour, reviewSource,
 *      reviewDate.
 *      Changed in: Phase 1.3 hover/transition wiring.
 *
 * v2 — catch-all null save for block recovery.
 *
 * v3 — unicode star characters (★/☆) replaced with inline SVG for proper
 *      rendering quality. All other attributes unchanged.
 *      Changed in: Visual audit remediation (SGS Gemini F-grade fix).
 */

import { useBlockProps, RichText } from '@wordpress/block-editor';
import { RawHTML } from '@wordpress/element';
import { colourVar, fontSizeVar } from '../../utils';

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

const v1 = {
	attributes: {
		quote: {
			type: 'string',
			source: 'html',
			selector: '.sgs-testimonial__quote',
		},
		name: {
			type: 'string',
			source: 'html',
			selector: '.sgs-testimonial__name',
		},
		role: {
			type: 'string',
			source: 'html',
			selector: '.sgs-testimonial__role',
		},
		avatar: {
			type: 'object',
		},
		rating: {
			type: 'number',
			default: 0,
		},
		style: {
			type: 'string',
			default: 'card',
		},
		quoteColour: {
			type: 'string',
		},
		nameColour: {
			type: 'string',
		},
		nameFontSize: {
			type: 'string',
		},
		roleColour: {
			type: 'string',
		},
		ratingColour: {
			type: 'string',
			default: 'accent',
		},
		reviewSource: {
			type: 'string',
			default: '',
		},
		reviewDate: {
			type: 'string',
			default: '',
		},
	},

	save( { attributes } ) {
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
		} = attributes;

		const className = [
			'sgs-testimonial',
			`sgs-testimonial--${ cardStyle }`,
		].join( ' ' );

		const blockProps = useBlockProps.save( { className } );

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
		);
	},
};

/**
 * v2 — catch-all for empty innerHTML (WP-CLI, block recovery).
 *      save: () => null matches any stored innerHTML.
 */
const v2 = {
	attributes: {
		quote: { type: 'string', source: 'html', selector: '.sgs-testimonial__quote' },
		name: { type: 'string', source: 'html', selector: '.sgs-testimonial__name' },
		role: { type: 'string', source: 'html', selector: '.sgs-testimonial__role' },
		avatar: { type: 'object' },
		rating: { type: 'number', default: 0 },
		style: { type: 'string', default: 'card' },
		quoteColour: { type: 'string' },
		nameColour: { type: 'string' },
		nameFontSize: { type: 'string' },
		roleColour: { type: 'string' },
		ratingColour: { type: 'string', default: 'accent' },
		reviewSource: { type: 'string', default: '' },
		reviewDate: { type: 'string', default: '' },
		hoverBackgroundColour: { type: 'string' },
		hoverTextColour: { type: 'string' },
		hoverBorderColour: { type: 'string' },
		transitionDuration: { type: 'string', default: '300ms' },
	},
	save: () => null,
	migrate: ( attributes ) => attributes,
};

/**
 * v3 — full attribute set matching current save.js before SVG star upgrade.
 *      Stars rendered as unicode span characters (★/☆).
 *      Schema output included via RawHTML.
 */
function stripHtmlV3( html ) {
	if ( ! html ) return '';
	return html.replace( /<[^>]+>/g, '' ).trim();
}

const v3 = {
	attributes: {
		quote: { type: 'string', source: 'html', selector: '.sgs-testimonial__quote' },
		name: { type: 'string', source: 'html', selector: '.sgs-testimonial__name' },
		role: { type: 'string', source: 'html', selector: '.sgs-testimonial__role' },
		avatar: { type: 'object' },
		rating: { type: 'number', default: 0 },
		style: { type: 'string', default: 'card' },
		quoteColour: { type: 'string' },
		nameColour: { type: 'string' },
		nameFontSize: { type: 'string' },
		nameFontSizeTablet: { type: 'string', default: '' },
		nameFontSizeMobile: { type: 'string', default: '' },
		roleColour: { type: 'string' },
		ratingColour: { type: 'string', default: 'accent' },
		reviewSource: { type: 'string', default: '' },
		reviewDate: { type: 'string', default: '' },
		hoverBackgroundColour: { type: 'string', default: '' },
		hoverTextColour: { type: 'string', default: '' },
		hoverBorderColour: { type: 'string', default: '' },
		hoverEffect: { type: 'string', default: 'none' },
		transitionDuration: { type: 'string', default: '300' },
		transitionEasing: { type: 'string', default: 'ease-in-out' },
		hoverScale: { type: 'string', default: '' },
		hoverShadow: { type: 'string', default: '' },
		staggerDelay: { type: 'number', default: 0 },
		schemaEnabled: { type: 'boolean', default: false },
	},

	save( { attributes } ) {
		const {
			quote, name, role, avatar, rating,
			style: cardStyle,
			quoteColour, nameColour, nameFontSize,
			nameFontSizeTablet, nameFontSizeMobile,
			roleColour, ratingColour,
			hoverBackgroundColour, hoverTextColour, hoverBorderColour,
			hoverEffect, transitionDuration, transitionEasing,
			hoverScale, hoverShadow, staggerDelay, schemaEnabled,
		} = attributes;

		const classNames = [
			'sgs-testimonial',
			`sgs-testimonial--${ cardStyle }`,
			hoverEffect && hoverEffect !== 'none' ? `sgs-testimonial--hover-${ hoverEffect }` : '',
			hoverScale ? 'sgs-has-hover-scale' : '',
			hoverShadow ? 'sgs-has-hover' : '',
			staggerDelay ? 'sgs-has-stagger' : '',
		].filter( Boolean );

		const responsiveDataAttrs = {};
		if ( nameFontSizeTablet ) responsiveDataAttrs[ 'data-name-fs-tablet' ] = nameFontSizeTablet;
		if ( nameFontSizeMobile ) responsiveDataAttrs[ 'data-name-fs-mobile' ] = nameFontSizeMobile;

		const blockProps = useBlockProps.save( {
			className: classNames.join( ' ' ),
			style: {
				'--sgs-hover-bg': hoverBackgroundColour ? colourVar( hoverBackgroundColour ) : undefined,
				'--sgs-hover-text': hoverTextColour ? colourVar( hoverTextColour ) : undefined,
				'--sgs-hover-border': hoverBorderColour ? colourVar( hoverBorderColour ) : undefined,
				'--sgs-transition-duration': transitionDuration ? `${ transitionDuration }ms` : undefined,
				'--sgs-transition-easing': transitionEasing || undefined,
				'--sgs-hover-scale': hoverScale || undefined,
				'--sgs-hover-shadow': hoverShadow ? `var(--wp--preset--shadow--${ hoverShadow })` : undefined,
				'--sgs-stagger': staggerDelay ? `${ staggerDelay }ms` : undefined,
			},
			...responsiveDataAttrs,
		} );

		const plainName = stripHtmlV3( name );
		const plainQuote = stripHtmlV3( quote );

		return (
			<>
			<blockquote { ...blockProps }>
				{ rating > 0 && (
					<div className="sgs-testimonial__stars" style={ { color: colourVar( ratingColour ) || undefined } } role="img" aria-label={ `${ rating } out of 5 stars` }>
						{ Array.from( { length: 5 }, ( _, i ) => (
							<span key={ i } className={ `sgs-testimonial__star ${ i < rating ? 'sgs-testimonial__star--filled' : 'sgs-testimonial__star--empty' }` } aria-hidden="true">
								{ i < rating ? '★' : '☆' }
							</span>
						) ) }
					</div>
				) }
				<RichText.Content tagName="p" className="sgs-testimonial__quote" value={ quote } style={ { color: colourVar( quoteColour ) || undefined } } />
				<footer className="sgs-testimonial__footer">
					<div className="sgs-testimonial__avatar">
						{ avatar?.url ? (
							<img src={ avatar.url } alt={ avatar.alt || '' } className="sgs-testimonial__avatar-img" loading="lazy" width="48" height="48" />
						) : (
							<span className="sgs-testimonial__avatar-initials" aria-hidden="true">{ getInitials( name ) || '?' }</span>
						) }
					</div>
					<div className="sgs-testimonial__meta">
						<RichText.Content tagName="cite" className="sgs-testimonial__name" value={ name } style={ { color: colourVar( nameColour ) || undefined, fontSize: fontSizeVar( nameFontSize ) || undefined } } />
						<RichText.Content tagName="span" className="sgs-testimonial__role" value={ role } style={ { color: colourVar( roleColour ) || undefined } } />
					</div>
				</footer>
			</blockquote>
			{ schemaEnabled && name && ( () => {
				const schema = {
					'@context': 'https://schema.org',
					'@type': 'Review',
					reviewBody: plainQuote,
					author: { '@type': 'Person', name: plainName },
				};
				if ( rating > 0 ) {
					schema.reviewRating = { '@type': 'Rating', ratingValue: rating, bestRating: 5 };
				}
				return ( <RawHTML>{ `<script type="application/ld+json">${ JSON.stringify( schema ) }</script>` }</RawHTML> );
			} )() }
			</>
		);
	},
};

/**
 * v4 — save output before quote/name/role were changed from source:html to
 * plain JSON attributes stored in the block comment.
 *
 * sgs/testimonial is a static block (save.js returns JSX), so source:html
 * DOES read from the serialised HTML — but the attribute value is then not
 * stored in the block delimiter comment, which means the dynamic block
 * pattern (render.php) cannot access it. Removing source:html moves the
 * values into the block comment JSON so render.php can read them.
 *
 * The save output for v4 is identical to current save.js (SVG stars).
 * We need this entry so WordPress can match existing saved posts and migrate
 * quote/name/role from sourced-HTML to JSON-stored strings.
 */

function stripHtmlV4( html ) {
	if ( ! html ) return '';
	return html.replace( /<[^>]+>/g, '' ).trim();
}

const v4 = {
	attributes: {
		quote: { type: 'string', source: 'html', selector: '.sgs-testimonial__quote' },
		name: { type: 'string', source: 'html', selector: '.sgs-testimonial__name' },
		role: { type: 'string', source: 'html', selector: '.sgs-testimonial__role' },
		avatar: { type: 'object' },
		rating: { type: 'number', default: 0 },
		style: { type: 'string', default: 'card' },
		quoteColour: { type: 'string', default: 'text' },
		nameColour: { type: 'string', default: 'primary' },
		nameFontSize: { type: 'string' },
		nameFontSizeTablet: { type: 'string', default: '' },
		nameFontSizeMobile: { type: 'string', default: '' },
		roleColour: { type: 'string', default: 'text-muted' },
		ratingColour: { type: 'string', default: 'accent' },
		reviewSource: { type: 'string', default: '' },
		reviewDate: { type: 'string', default: '' },
		hoverBackgroundColour: { type: 'string', default: '' },
		hoverTextColour: { type: 'string', default: '' },
		hoverBorderColour: { type: 'string', default: '' },
		hoverEffect: { type: 'string', default: 'none' },
		transitionDuration: { type: 'string', default: '300' },
		transitionEasing: { type: 'string', default: 'ease-in-out' },
		hoverScale: { type: 'string', default: '' },
		hoverShadow: { type: 'string', default: '' },
		staggerDelay: { type: 'number', default: 0 },
		sgsAnimation: { type: 'string', default: 'fade-up' },
		sgsAnimationDuration: { type: 'string', default: 'medium' },
		sgsAnimationEasing: { type: 'string', default: 'default' },
		schemaEnabled: { type: 'boolean', default: false },
	},

	save( { attributes } ) {
		const {
			quote, name, role, avatar, rating,
			style: cardStyle,
			quoteColour, nameColour, nameFontSize,
			nameFontSizeTablet, nameFontSizeMobile,
			roleColour, ratingColour,
			hoverBackgroundColour, hoverTextColour, hoverBorderColour,
			hoverEffect, transitionDuration, transitionEasing,
			hoverScale, hoverShadow, staggerDelay, schemaEnabled,
		} = attributes;

		const classNames = [
			'sgs-testimonial',
			`sgs-testimonial--${ cardStyle }`,
			hoverEffect && hoverEffect !== 'none' ? `sgs-testimonial--hover-${ hoverEffect }` : '',
			hoverScale ? 'sgs-has-hover-scale' : '',
			hoverShadow ? 'sgs-has-hover' : '',
			staggerDelay ? 'sgs-has-stagger' : '',
		].filter( Boolean );

		const responsiveDataAttrs = {};
		if ( nameFontSizeTablet ) responsiveDataAttrs[ 'data-name-fs-tablet' ] = nameFontSizeTablet;
		if ( nameFontSizeMobile ) responsiveDataAttrs[ 'data-name-fs-mobile' ] = nameFontSizeMobile;

		const blockProps = useBlockProps.save( {
			className: classNames.join( ' ' ),
			style: {
				'--sgs-hover-bg': hoverBackgroundColour ? colourVar( hoverBackgroundColour ) : undefined,
				'--sgs-hover-text': hoverTextColour ? colourVar( hoverTextColour ) : undefined,
				'--sgs-hover-border': hoverBorderColour ? colourVar( hoverBorderColour ) : undefined,
				'--sgs-transition-duration': transitionDuration ? `${ transitionDuration }ms` : undefined,
				'--sgs-transition-easing': transitionEasing || undefined,
				'--sgs-hover-scale': hoverScale || undefined,
				'--sgs-hover-shadow': hoverShadow ? `var(--wp--preset--shadow--${ hoverShadow })` : undefined,
				'--sgs-stagger': staggerDelay ? `${ staggerDelay }ms` : undefined,
			},
			...responsiveDataAttrs,
		} );

		const plainName = stripHtmlV4( name );
		const plainQuote = stripHtmlV4( quote );

		return (
			<>
			<blockquote { ...blockProps }>
				{ rating > 0 && (
					<div className="sgs-testimonial__stars" style={ { color: colourVar( ratingColour ) || undefined } } role="img" aria-label={ `${ rating } out of 5 stars` }>
						{ Array.from( { length: 5 }, ( _, i ) => {
							const filled = i < Math.floor( rating );
							const half = ! filled && i < rating && ( rating % 1 ) >= 0.5;
							const starClass = `sgs-testimonial__star ${ filled ? 'sgs-testimonial__star--filled' : half ? 'sgs-testimonial__star--half' : 'sgs-testimonial__star--empty' }`;
							if ( half ) {
								const gradId = `sgs-th-${ i }`;
								return (
									<span key={ i } className={ starClass } aria-hidden="true">
										<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
											<defs>
												<linearGradient id={ gradId }>
													<stop offset="50%" stopColor="currentColor" />
													<stop offset="50%" stopColor="currentColor" stopOpacity="0.2" />
												</linearGradient>
											</defs>
											<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill={ `url(#${ gradId })` } />
										</svg>
									</span>
								);
							}
							return (
								<span key={ i } className={ starClass } aria-hidden="true">
									<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
										<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill={ filled ? 'currentColor' : 'none' } stroke="currentColor" strokeWidth={ filled ? '0' : '1.5' } strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</span>
							);
						} ) }
					</div>
				) }
				<RichText.Content tagName="p" className="sgs-testimonial__quote" value={ quote } style={ { color: colourVar( quoteColour ) || undefined } } />
				<footer className="sgs-testimonial__footer">
					<div className="sgs-testimonial__avatar">
						{ avatar?.url ? (
							<img src={ avatar.url } alt={ avatar.alt || '' } className="sgs-testimonial__avatar-img" loading="lazy" width="48" height="48" />
						) : (
							<span className="sgs-testimonial__avatar-initials" aria-hidden="true">{ getInitials( name ) || '?' }</span>
						) }
					</div>
					<div className="sgs-testimonial__meta">
						<RichText.Content tagName="cite" className="sgs-testimonial__name" value={ name } style={ { color: colourVar( nameColour ) || undefined, fontSize: fontSizeVar( nameFontSize ) || undefined } } />
						<RichText.Content tagName="span" className="sgs-testimonial__role" value={ role } style={ { color: colourVar( roleColour ) || undefined } } />
					</div>
				</footer>
			</blockquote>
			{ schemaEnabled && name && ( () => {
				const schema = {
					'@context': 'https://schema.org',
					'@type': 'Review',
					reviewBody: plainQuote,
					author: { '@type': 'Person', name: plainName },
				};
				if ( rating > 0 ) {
					schema.reviewRating = { '@type': 'Rating', ratingValue: rating, bestRating: 5 };
				}
				return ( <RawHTML>{ `<script type="application/ld+json">${ JSON.stringify( schema ) }</script>` }</RawHTML> );
			} )() }
			</>
		);
	},

	migrate( attributes ) {
		// quote/name/role may be undefined when source:html found nothing
		// (e.g. the block was used dynamically). Normalise to empty strings.
		return {
			...attributes,
			quote: attributes.quote ?? '',
			name: attributes.name ?? '',
			role: attributes.role ?? '',
		};
	},
};

export default [ v4, v3, v2, v1 ];
