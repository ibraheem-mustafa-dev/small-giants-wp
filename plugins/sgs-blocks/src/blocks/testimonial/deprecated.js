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
 *
 * v4 — save output before quote/name/role were changed from source:html to
 *      plain JSON attributes. Inline SVG stars. JSON-LD schema block present.
 *      Changed in: Branch R Wave 2 — source:html → no-source migration.
 *
 * v5 — earliest stored shape: empty <span> stars (no SVG, no unicode), no
 *      inline colour styles on quote/name/role, no JSON-LD script block,
 *      only --sgs-transition-duration in wrapper style (no --sgs-transition-easing),
 *      class is sgs-testimonial--<style> without --undefined suffix.
 *      This shape was produced when quoteColour/nameColour/roleColour had no
 *      defaults (were undefined) so colourVar() returned falsy and styles were
 *      omitted. Migrate sets the current colour defaults explicitly.
 */

import { createBlock } from '@wordpress/blocks';
import { useBlockProps, RichText, InnerBlocks } from '@wordpress/block-editor';
import { RawHTML } from '@wordpress/element';
import { colourVar, fontSizeVar } from '../../utils';

/**
 * v8 — D8 typed-attr variant rebuild (2026-06-11).
 *
 * The block was rebuilt from an FR-22-6 InnerBlocks block into a TYPED,
 * variant-driven dynamic block. save.js now returns null (no static HTML,
 * no InnerBlocks); render.php drives 100% of the frontend output from typed
 * scalar/object attrs. The recognised content fields changed names:
 *   quote (unchanged) · name → reviewerName · role → reviewerRole ·
 *   rating → ratingStars (+ showRating) · avatar/authorMedia → avatarMedia ·
 *   style (enum) → variant (enum).
 *
 * TWO legacy shapes exist in the wild and BOTH must round-trip:
 *
 *   v8inner — the FR-22-6 shape whose save returned <InnerBlocks.Content />
 *             (commit 1761eb35, on main → deployed). Quote/name/role text may
 *             live in CHILD blocks (core/paragraph, sgs/text, sgs/heading,
 *             sgs/label) and a star count in an sgs/star-rating child. migrate()
 *             HOISTS that child text back into the typed attrs and returns
 *             ZERO inner blocks.
 *
 *   v8scalar — every PRE-rebuild shape whose save returned null with the
 *              scalar attribute schema (name/role/rating/avatar|authorMedia/
 *              style). This is the immediate-prior recognised shape for the
 *              vast majority of authored posts. migrate() renames the scalar
 *              attrs to the typed schema and maps style → variant.
 *
 * ORDER matters. v8inner is listed BEFORE v8scalar: both share save: () => null
 * vs save: InnerBlocks, but a post that actually carries inner blocks must be
 * matched by the InnerBlocks save first (an InnerBlocks post would fail the
 * null-save validation, so WP would skip v8scalar and try v8inner — but listing
 * the InnerBlocks entry first makes the match deterministic and lets isEligible
 * gate it). v8scalar then catches the null-save scalar posts. The existing
 * v7…v1 entries remain UNCHANGED below as deeper fallbacks.
 *
 * R-22-14: migration is the ONLY back-compat path. No server-side fallback
 * hack is added to render.php (its one-way avatar.url → avatarMedia read is a
 * synthesise-on-read, not a content fallback branch).
 */

// Shared scalar attribute schema for the pre-rebuild dynamic (null-save) shape.
// This is the full authorMedia-era attribute set (matches the old block.json
// immediately before the D8 rebuild). Declaring it lets WP match the stored
// block-delimiter comment before running migrate().
const V8_LEGACY_SCALAR_ATTRIBUTES = {
	quote: { type: 'string', default: '' },
	name: { type: 'string', default: '' },
	role: { type: 'string', default: '' },
	avatar: { type: 'object' },
	authorMedia: { type: 'object', default: null },
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
};

/**
 * Map the retired `style` enum (card | minimal | featured | …) onto the new
 * `variant` enum. Unknown / empty styles fall back to the default variant.
 *
 * @param {string} style Legacy style value.
 * @return {string} New variant slug.
 */
function v8MapStyleToVariant( style ) {
	switch ( style ) {
		case 'minimal':
			return 'minimal-quote';
		case 'featured':
			return 'pull-quote-editorial';
		case 'card':
		default:
			return 'classic-card';
	}
}

/**
 * Lift a legacy avatar/authorMedia value into the new `avatarMedia` object
 * shape ({ url, type, id, alt, mime }). Returns null when neither is present.
 *
 * @param {Object} attributes Legacy attributes.
 * @return {Object|null} avatarMedia object or null.
 */
function v8ResolveAvatarMedia( attributes ) {
	if ( attributes.authorMedia && attributes.authorMedia.url ) {
		return attributes.authorMedia;
	}
	if ( attributes.avatar && attributes.avatar.url ) {
		return {
			url: attributes.avatar.url,
			type: 'image',
			id: attributes.avatar.id || 0,
			alt: attributes.avatar.alt || '',
			mime: 'image/jpeg',
		};
	}
	return null;
}

/**
 * Strip HTML tags from a value (child blocks may store wrapped HTML).
 *
 * @param {string} html Raw value.
 * @return {string} Plain text (trimmed).
 */
function v8StripHtml( html ) {
	if ( ! html ) {
		return '';
	}
	return String( html ).replace( /<[^>]+>/g, '' ).trim();
}

/**
 * Build the typed attribute set common to BOTH v8 legacy shapes from the
 * resolved scalar values. Centralised so the InnerBlocks and scalar entries
 * cannot drift apart.
 *
 * @param {Object} src               Legacy attributes (shell-level).
 * @param {Object} content           Resolved content: { quote, reviewerName, reviewerRole, ratingStars }.
 * @return {Object} New typed attributes.
 */
function v8BuildTypedAttributes( src, content ) {
	const ratingStars =
		typeof content.ratingStars === 'number' && ! Number.isNaN( content.ratingStars )
			? content.ratingStars
			: 0;

	return {
		// Discriminator.
		variant: v8MapStyleToVariant( src.style ),
		// Content (renamed).
		quote: content.quote || '',
		reviewerName: content.reviewerName || '',
		reviewerRole: content.reviewerRole || '',
		orgName: '',
		summaryPhrase: '',
		// Media (collapsed avatar/authorMedia → avatarMedia).
		avatarMedia: v8ResolveAvatarMedia( src ),
		orgLogo: null,
		workMedia: null,
		// Rating (fully optional; show only when a positive star count survived).
		showRating: ratingStars > 0,
		ratingType: 'stars',
		ratingStars,
		ratingScale: 0,
		ratingScaleMax: '10',
		reviewDate: src.reviewDate || '',
		verified: false,
		sourcePlatform: src.reviewSource || '',
		schemaEnabled: src.schemaEnabled ?? false,
		// Per-element typography — start blank so CSS token defaults win
		// (:not([style*="color"])). Legacy colour attrs used SGS token slugs
		// (e.g. 'text'/'primary'), NOT raw CSS, so they are intentionally NOT
		// carried into the new raw-CSS-or-token controls to avoid a stale value.
		quoteFontSize: '',
		quoteColour: '',
		summaryFontSize: '',
		summaryColour: '',
		nameColour: '',
		roleColour: '',
		ratingColour: '',
		// Shell-level hover / animation — preserved verbatim where present.
		hoverBackgroundColour: src.hoverBackgroundColour ?? '',
		hoverTextColour: src.hoverTextColour ?? '',
		hoverBorderColour: src.hoverBorderColour ?? '',
		hoverEffect: src.hoverEffect ?? 'none',
		transitionDuration: src.transitionDuration ?? '300',
		transitionEasing: src.transitionEasing ?? 'ease-in-out',
		hoverScale: src.hoverScale ?? '',
		hoverShadow: src.hoverShadow ?? '',
		staggerDelay: src.staggerDelay ?? 0,
		sgsAnimation: src.sgsAnimation ?? 'fade-up',
		sgsAnimationDuration: src.sgsAnimationDuration ?? 'medium',
		sgsAnimationEasing: src.sgsAnimationEasing ?? 'default',
		// WS-4 container-mirror CONTENT attrs use their block.json defaults
		// (widthMode 'default' etc.) — legacy posts never set them.
	};
}

/**
 * v8inner — FR-22-6 InnerBlocks shape (save returned <InnerBlocks.Content />).
 *
 * The `save` reproduces that output so WordPress validates posts whose
 * post_content carries persisted child blocks. `isEligible` fires only when
 * inner blocks are actually present (a null-save scalar post has none and must
 * fall through to v8scalar). `migrate( attributes, innerBlocks )` reads the
 * SECOND arg to hoist child text into the typed attrs, then returns
 * `[ newAttributes, [] ]` to drop all children.
 */
const v8inner = {
	attributes: V8_LEGACY_SCALAR_ATTRIBUTES,

	// The deployed FR-22-6 save returned <InnerBlocks.Content /> — reproduce it.
	save() {
		return <InnerBlocks.Content />;
	},

	// Match ONLY posts that actually carry inner blocks. A scalar null-save post
	// has no inner blocks and would wrongly validate against an InnerBlocks save
	// (empty inner content ≈ empty), so this guard routes those to v8scalar.
	isEligible( attributes, innerBlocks ) {
		return Array.isArray( innerBlocks ) && innerBlocks.length > 0;
	},

	migrate( attributes, innerBlocks = [] ) {
		// Hoist child-block text back into the typed attrs.
		// Recognised children: core/paragraph (content), sgs/text (text),
		// sgs/heading (content), sgs/label (text), sgs/star-rating (rating).
		let quote = v8StripHtml( attributes.quote );
		let reviewerName = v8StripHtml( attributes.name );
		let reviewerRole = v8StripHtml( attributes.role );
		let ratingStars =
			typeof attributes.rating === 'number' ? attributes.rating : 0;

		const textOf = ( block ) => {
			const a = block?.attributes || {};
			return v8StripHtml( a.content ?? a.text ?? '' );
		};

		// Walk children. We map by BEM className first (the converter tags the
		// quote child sgs-testimonial__quote / name / role), then fall back to
		// document order (1st text = quote, 2nd = name, 3rd = role) when the
		// className is absent.
		const orderedTexts = [];
		( innerBlocks || [] ).forEach( ( block ) => {
			if ( ! block || ! block.name ) {
				return;
			}
			const cls = String( block.attributes?.className || '' );
			const value = textOf( block );

			if ( block.name === 'sgs/star-rating' ) {
				const r = Number( block.attributes?.rating );
				if ( ! Number.isNaN( r ) && r > 0 ) {
					ratingStars = r;
				}
				return;
			}

			if ( /sgs-testimonial__quote/.test( cls ) ) {
				if ( value ) quote = value;
				return;
			}
			if ( /sgs-testimonial__name/.test( cls ) ) {
				if ( value ) reviewerName = value;
				return;
			}
			if ( /sgs-testimonial__role/.test( cls ) ) {
				if ( value ) reviewerRole = value;
				return;
			}

			if (
				[ 'core/paragraph', 'sgs/text', 'sgs/heading', 'sgs/label' ].includes(
					block.name
				) &&
				value
			) {
				orderedTexts.push( value );
			}
		} );

		// Positional fallback for any text not captured by className.
		if ( ! quote && orderedTexts.length > 0 ) {
			quote = orderedTexts.shift();
		}
		if ( ! reviewerName && orderedTexts.length > 0 ) {
			reviewerName = orderedTexts.shift();
		}
		if ( ! reviewerRole && orderedTexts.length > 0 ) {
			reviewerRole = orderedTexts.shift();
		}

		const next = v8BuildTypedAttributes( attributes, {
			quote,
			reviewerName,
			reviewerRole,
			ratingStars,
		} );

		// Drop ALL inner blocks — the typed block renders its own elements.
		return [ next, [] ];
	},
};

/**
 * v8scalar — pre-rebuild dynamic (null-save) scalar shape.
 *
 * Quote/name/role/rating/avatar|authorMedia/style all lived as scalar attrs;
 * save returned null. migrate() renames them to the typed schema and maps
 * style → variant. Identical `attributes` schema to v8inner but with a
 * null save, so WP matches whichever validates against the stored innerHTML.
 */
const v8scalar = {
	attributes: V8_LEGACY_SCALAR_ATTRIBUTES,

	save: () => null,

	migrate( attributes ) {
		return v8BuildTypedAttributes( attributes, {
			quote: v8StripHtml( attributes.quote ),
			reviewerName: v8StripHtml( attributes.name ),
			reviewerRole: v8StripHtml( attributes.role ),
			ratingStars:
				typeof attributes.rating === 'number' ? attributes.rating : 0,
		} );
	},
};

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

/**
 * v5 — earliest stored shape. See header comment for full description.
 *
 * Discriminating features of this shape:
 * — Stars: empty <span> elements, no child content (no SVG, no unicode)
 * — Colours: NO inline style on quote <p>, name <cite>, or role <span>
 * — Wrapper style: only --sgs-transition-duration (no --sgs-transition-easing,
 *   no hover CSS vars, no stagger)
 * — Wrapper class: sgs-testimonial--<style> only — no --undefined suffix
 * — No <script type="application/ld+json"> after the blockquote
 *
 * The migrate() sets colour defaults that the current block.json requires so
 * the block re-saves correctly after migration.
 */
const v5 = {
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
		// Colour attributes had NO default in this era — undefined → no inline style.
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
		// Transition duration was stored without easing in this era.
		// Value was the raw number string '300' — the save appended 'ms'.
		transitionDuration: {
			type: 'string',
			default: '300',
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
			ratingColour,
			transitionDuration,
		} = attributes;

		// Guard against undefined cardStyle to avoid --undefined class suffix.
		const className = [
			'sgs-testimonial',
			cardStyle ? `sgs-testimonial--${ cardStyle }` : '',
		].filter( Boolean ).join( ' ' );

		const blockProps = useBlockProps.save( {
			className,
			style: {
				// Only --sgs-transition-duration; no easing or hover vars.
				'--sgs-transition-duration': transitionDuration
					? `${ transitionDuration }ms`
					: undefined,
			},
		} );

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
							/>
						) ) }
					</div>
				) }

				{ /* No inline colour style on quote — matches stored HTML */ }
				<RichText.Content
					tagName="p"
					className="sgs-testimonial__quote"
					value={ quote }
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
						{ /* No inline colour styles on name/role — matches stored HTML */ }
						<RichText.Content
							tagName="cite"
							className="sgs-testimonial__name"
							value={ name }
						/>
						<RichText.Content
							tagName="span"
							className="sgs-testimonial__role"
							value={ role }
						/>
					</div>
				</footer>
				{ /* No JSON-LD script — matches stored HTML */ }
			</blockquote>
		);
	},

	migrate( attributes ) {
		// Promote sourced HTML attributes to JSON-stored strings.
		// Set the colour defaults that current block.json requires so the block
		// re-saves with correct inline styles after migration.
		return {
			...attributes,
			quote: attributes.quote ?? '',
			name: attributes.name ?? '',
			role: attributes.role ?? '',
			quoteColour: attributes.quoteColour ?? 'text',
			nameColour: attributes.nameColour ?? 'primary',
			roleColour: attributes.roleColour ?? 'text-muted',
			// Supply defaults for all attributes added after this era.
			nameFontSizeTablet: attributes.nameFontSizeTablet ?? '',
			nameFontSizeMobile: attributes.nameFontSizeMobile ?? '',
			hoverBackgroundColour: attributes.hoverBackgroundColour ?? '',
			hoverTextColour: attributes.hoverTextColour ?? '',
			hoverBorderColour: attributes.hoverBorderColour ?? '',
			hoverEffect: attributes.hoverEffect ?? 'none',
			transitionEasing: attributes.transitionEasing ?? 'ease-in-out',
			hoverScale: attributes.hoverScale ?? '',
			hoverShadow: attributes.hoverShadow ?? '',
			staggerDelay: attributes.staggerDelay ?? 0,
			sgsAnimation: attributes.sgsAnimation ?? 'fade-up',
			sgsAnimationDuration: attributes.sgsAnimationDuration ?? 'medium',
			sgsAnimationEasing: attributes.sgsAnimationEasing ?? 'default',
			schemaEnabled: attributes.schemaEnabled ?? false,
		};
	},
};

/**
 * v6 — final static-save shape immediately before the unified media-slot
 *      migration on 2026-05-05 (Gap H-3). The block was converted from a
 *      static block (save returns JSX) to a dynamic block (save returns
 *      null, render.php emits the HTML) so the testimonial author photo
 *      could be wired through the shared MediaPicker + sgs_render_media
 *      pipeline. v6's save output matches the JSX produced by the static
 *      save.js that shipped just before this migration. The migrate()
 *      lifts the legacy `avatar` object into the new `authorMedia` shape.
 */
function stripHtmlV6( html ) {
	if ( ! html ) return '';
	return html.replace( /<[^>]+>/g, '' ).trim();
}

const v6 = {
	attributes: {
		quote: { type: 'string', default: '' },
		name: { type: 'string', default: '' },
		role: { type: 'string', default: '' },
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

	isEligible( attributes ) {
		// Fire ONLY when the post carries pre-migration legacy avatar content
		// AND has not yet been migrated to authorMedia. This avoids matching:
		//   – posts with no avatar at all (nothing to migrate; the dynamic
		//     save: () => null already handles them correctly)
		//   – posts already round-tripped to authorMedia
		//   – posts where an operator has intentionally cleared authorMedia
		//     without ever having had a legacy avatar.
		return !! (
			attributes &&
			attributes.avatar &&
			attributes.avatar.url &&
			! attributes.authorMedia
		);
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
			cardStyle ? `sgs-testimonial--${ cardStyle }` : '',
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
				'--sgs-transition-duration': transitionDuration
					? ( /ms$|s$/.test( String( transitionDuration ) ) ? String( transitionDuration ) : `${ transitionDuration }ms` )
					: undefined,
				'--sgs-transition-easing': transitionEasing || undefined,
				'--sgs-hover-scale': hoverScale || undefined,
				'--sgs-hover-shadow': hoverShadow ? `var(--wp--preset--shadow--${ hoverShadow })` : undefined,
				'--sgs-stagger': staggerDelay ? `${ staggerDelay }ms` : undefined,
			},
			...responsiveDataAttrs,
		} );

		const plainName = stripHtmlV6( name );
		const plainQuote = stripHtmlV6( quote );

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
		// Lift the legacy avatar object into the unified authorMedia shape so
		// the new dynamic render.php can hand it off to sgs_render_media().
		const next = { ...attributes };
		if ( ! next.authorMedia && attributes.avatar && attributes.avatar.url ) {
			next.authorMedia = {
				url: attributes.avatar.url,
				type: 'image',
				id: attributes.avatar.id || 0,
				alt: attributes.avatar.alt || '',
				mime: 'image/jpeg',
			};
		}
		return next;
	},
};

/**
 * v7 — FR-22-6 InnerBlocks migration (2026-05-30).
 *
 * Previous shape: dynamic block, save returned null, render.php read scalar
 * attrs (quote, name, role, rating, authorMedia) directly. The block was
 * converted to use InnerBlocks so the converter-emitted child blocks
 * (sgs/star-rating, sgs/text, etc.) are persisted in post_content and
 * rendered by render.php via echo $content.
 *
 * This entry matches any post saved with save: () => null and the full
 * authorMedia-era attribute schema. The migrate() converts the scalar
 * content attrs into a core/paragraph inner block (safe placeholder) so
 * the quote text is preserved. The avatar/authorMedia stays as a block attr
 * (it is presentation identity, not inline content).
 *
 * NOTE: WP-CLI batch migration should run after deploy to convert all
 * existing posts via the block editor's block validation + migrate() path.
 * Until then, old posts render as card shells with empty $content (the
 * avatar footer and schema JSON-LD still emit from scalar attrs in render.php).
 */
const v7 = {
	attributes: {
		quote: { type: 'string', default: '' },
		name: { type: 'string', default: '' },
		role: { type: 'string', default: '' },
		avatar: { type: 'object' },
		authorMedia: { type: 'object', default: null },
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

	// save: () => null — the previous shape emitted no static HTML; render.php drove everything.
	save: () => null,

	migrate( attributes ) {
		// Convert scalar content attrs into InnerBlocks.
		// We emit a core/paragraph for the quote text so content is preserved.
		// The avatar/authorMedia stays as a block attr (inspector MediaPicker).
		// name/role/rating remain as attrs so schema JSON-LD and the avatar
		// initials fallback in render.php continue to work until WP-CLI migration.
		const innerBlocks = [];

		// Quote paragraph — maps to sgs/text once that Phase 2 block ships.
		// Until then core/paragraph renders the quote text correctly.
		if ( attributes.quote ) {
			innerBlocks.push(
				createBlock( 'core/paragraph', {
					content: attributes.quote,
					className: 'sgs-testimonial__quote',
				} )
			);
		}

		// Return updated attributes (scalar content attrs are retained so
		// render.php schema + avatar initials keep working) alongside innerBlocks.
		return [ attributes, innerBlocks ];
	},
};

export default [ v8inner, v8scalar, v7, v6, v4, v3, v2, v1, v5 ];
