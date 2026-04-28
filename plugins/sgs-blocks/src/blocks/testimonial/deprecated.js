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

export default [ v3, v2, v1 ];
