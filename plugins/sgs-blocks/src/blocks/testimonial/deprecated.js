/**
 * Deprecations for sgs/testimonial.
 *
 * v1 — original save output before hover/transition attributes were added.
 *      Attributes: quote, name, role, avatar, rating, style, quoteColour,
 *      nameColour, nameFontSize, roleColour, ratingColour, reviewSource,
 *      reviewDate.
 *      Changed in: Phase 1.3 hover/transition wiring.
 */

import { useBlockProps, RichText } from '@wordpress/block-editor';
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

export default [ v1 ];
