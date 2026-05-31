import { createBlock } from '@wordpress/blocks';
import { useBlockProps } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

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

/**
 * V1 deprecation: static save with full HTML output.
 *
 * Migrates to dynamic render (save returns null) — render.php
 * now handles all frontend output.
 */
const v1 = {
	attributes: {
		testimonials: { type: 'array', default: [] },
		autoplay: { type: 'boolean', default: false },
		autoplaySpeed: { type: 'number', default: 5000 },
		showDots: { type: 'boolean', default: true },
		showArrows: { type: 'boolean', default: true },
		slidesVisible: { type: 'number', default: 1 },
		cardStyle: { type: 'string', default: 'card' },
		quoteColour: { type: 'string' },
		nameColour: { type: 'string' },
		nameFontSize: { type: 'string' },
		roleColour: { type: 'string' },
		ratingColour: { type: 'string', default: 'accent' },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: true },
		typography: { fontSize: true, lineHeight: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width: true,
			color: true,
			style: true,
		},
	},
	save( { attributes } ) {
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
	},
	migrate( attributes ) {
		return attributes;
	},
};

/**
 * v2 — FR-22-6 InnerBlocks migration (2026-05-30).
 *
 * Previous shape: dynamic block, save returned null, render.php looped the
 * scalar `testimonials` attribute array to build slides. The block is now
 * InnerBlocks-driven: each sgs/testimonial child is a real block in
 * post_content, and render.php iterates $block->inner_blocks.
 *
 * The migrate() converts each item in the testimonials array into a
 * sgs/testimonial block so existing posts auto-migrate when opened in the
 * editor. Attributes on the parent that drove per-slide rendering
 * (quoteColour, nameColour, roleColour, ratingColour) are carried forward on
 * the parent block — they are still used for CSS vars. The scalar testimonials
 * array attribute is deliberately NOT included in the new attributes returned
 * by migrate() so WP does not store it again.
 *
 * NOTE: WP-CLI batch migration should run after deploy to convert all
 * existing posts. Until then, the render.php sees 0 inner_blocks and emits
 * an empty carousel shell (no slides, no dots, no arrows) for old posts
 * that haven't round-tripped through the editor yet.
 */
const v2 = {
	attributes: {
		layout: { type: 'string', default: 'full' },
		sideImage: { type: 'object' },
		testimonials: { type: 'array', default: [] },
		autoplay: { type: 'boolean', default: true },
		autoplaySpeed: { type: 'number', default: 5000 },
		showDots: { type: 'boolean', default: true },
		showArrows: { type: 'boolean', default: true },
		slidesVisible: { type: 'number', default: 1 },
		cardStyle: { type: 'string', default: 'card' },
		quoteColour: { type: 'string', default: 'text' },
		nameColour: { type: 'string', default: 'primary' },
		nameFontSize: { type: 'string' },
		roleColour: { type: 'string', default: 'text-muted' },
		ratingColour: { type: 'string', default: 'accent' },
		hoverBackgroundColour: { type: 'string', default: '' },
		hoverTextColour: { type: 'string', default: '' },
		hoverBorderColour: { type: 'string', default: '' },
		hoverEffect: { type: 'string', default: 'none' },
		transitionDuration: { type: 'string', default: '300' },
		transitionEasing: { type: 'string', default: 'ease-in-out' },
	},

	// save: () => null — the previous shape emitted no static HTML; render.php drove everything.
	save: () => null,

	migrate( attributes ) {
		const innerBlocks = [];

		if ( Array.isArray( attributes.testimonials ) ) {
			attributes.testimonials.forEach( ( t ) => {
				// Each array item becomes a sgs/testimonial inner block.
				// The scalar content attrs (quote, name, role, rating, avatar)
				// are mapped to the child block's attribute schema.
				// Avatar is mapped to both avatar + authorMedia so the MediaPicker
				// in the child block's inspector shows the photo correctly.
				const childAttrs = {
					quote: t.quote || '',
					name: t.name || '',
					role: t.role || '',
					rating: t.rating || 0,
				};
				if ( t.avatar && t.avatar.url ) {
					childAttrs.avatar = t.avatar;
					childAttrs.authorMedia = {
						url: t.avatar.url,
						type: 'image',
						id: t.avatar.id || 0,
						alt: t.avatar.alt || '',
						mime: 'image/jpeg',
					};
				}
				innerBlocks.push( createBlock( 'sgs/testimonial', childAttrs ) );
			} );
		}

		// Return updated parent attributes (testimonials array dropped) + innerBlocks.
		// eslint-disable-next-line no-unused-vars
		const { testimonials: _dropped, ...nextAttrs } = attributes;
		return [ nextAttrs, innerBlocks ];
	},
};

export default [ v2, v1 ];
