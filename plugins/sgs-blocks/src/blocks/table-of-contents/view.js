/**
 * Table of Contents — frontend interactivity.
 *
 * Handles smooth scroll with offset, scroll spy (highlights active
 * heading), and collapse animation enhancement.
 *
 * @package SGS\Blocks
 */

/**
 * Generate a slug from heading text (matches PHP sanitize_title behaviour).
 */
function generateSlug( text ) {
	return text
		.toLowerCase()
		.trim()
		.replace( /[^\w\s-]/g, '' )
		.replace( /[\s_]+/g, '-' )
		.replace( /^-+|-+$/g, '' );
}

/**
 * Ensure headings have IDs that match the ToC links.
 * This is a fallback in case the PHP filter doesn't run.
 */
function ensureHeadingIds( toc ) {
	const links = toc.querySelectorAll( '.sgs-toc__link' );
	const usedSlugs = [];

	links.forEach( ( link ) => {
		const targetId = link.getAttribute( 'href' )?.slice( 1 );
		if ( ! targetId ) {
			return;
		}

		// Check if heading already exists with this ID
		let heading = document.getElementById( targetId );
		if ( heading ) {
			return; // Already has correct ID
		}

		// Find heading by text content
		const headingText = link.textContent.trim();
		const allHeadings = document.querySelectorAll(
			'h1, h2, h3, h4, h5, h6'
		);

		for ( const h of allHeadings ) {
			if ( h.textContent.trim() === headingText && ! h.id ) {
				// Generate slug with deduplication
				let slug = targetId;
				let counter = 2;
				while ( usedSlugs.includes( slug ) ) {
					slug = targetId.replace( /-\d+$/, '' ) + '-' + counter;
					counter++;
				}
				usedSlugs.push( slug );

				h.id = slug;
				break;
			}
		}
	} );
}

function initTableOfContents() {
	const tocBlocks = document.querySelectorAll( '.sgs-toc' );
	const prefersReduced = window.matchMedia(
		'(prefers-reduced-motion: reduce)'
	).matches;

	tocBlocks.forEach( ( toc ) => {
		// Ensure headings have IDs before initializing interactions
		ensureHeadingIds( toc );
		const smoothScroll = toc.dataset.smoothScroll === 'true';
		const scrollOffset = parseInt(
			toc.dataset.scrollOffset || '0',
			10
		);
		const enableScrollSpy = toc.dataset.scrollSpy === 'true';
		const activeColour = toc.dataset.activeColour || '';

		const links = toc.querySelectorAll( '.sgs-toc__link' );

		// ─── Smooth scroll with offset ───
		if ( smoothScroll && ! prefersReduced ) {
			links.forEach( ( link ) => {
				link.addEventListener( 'click', ( e ) => {
					const targetId = link
						.getAttribute( 'href' )
						?.slice( 1 );
					if ( ! targetId ) {
						return;
					}
					const target =
						document.getElementById( targetId );
					if ( ! target ) {
						return;
					}

					e.preventDefault();

					const top =
						target.getBoundingClientRect().top +
						window.scrollY -
						scrollOffset;

					window.scrollTo( {
						top,
						behavior: 'smooth',
					} );

					// Update hash after scroll completes.
					setTimeout( () => {
						history.replaceState(
							null,
							'',
							'#' + targetId
						);
					}, 500 );
				} );
			} );
		}

		// ─── Scroll spy ───
		if ( enableScrollSpy && links.length > 0 ) {
			const headingIds = Array.from( links )
				.map( ( link ) =>
					link.getAttribute( 'href' )?.slice( 1 )
				)
				.filter( Boolean );

			const headingElements = headingIds
				.map( ( id ) => document.getElementById( id ) )
				.filter( Boolean );

			if ( headingElements.length === 0 ) {
				return;
			}

			const setActive = ( activeId ) => {
				links.forEach( ( link ) => {
					const linkId = link
						.getAttribute( 'href' )
						?.slice( 1 );
					const isActive = linkId === activeId;

					link.classList.toggle(
						'sgs-toc__link--active',
						isActive
					);

					if ( activeColour ) {
						link.style.color = isActive
							? activeColour
							: '';
					}
				} );
			};

			// Use IntersectionObserver to detect which heading is visible.
			const observerMargin = `-${ scrollOffset + 1 }px 0px -66% 0px`;

			const observer = new IntersectionObserver(
				( entries ) => {
					// Find the topmost intersecting heading.
					let topEntry = null;
					for ( const entry of entries ) {
						if ( entry.isIntersecting ) {
							if (
								! topEntry ||
								entry.boundingClientRect.top <
									topEntry.boundingClientRect.top
							) {
								topEntry = entry;
							}
						}
					}

					if ( topEntry ) {
						setActive( topEntry.target.id );
					}
				},
				{
					rootMargin: observerMargin,
					threshold: 0,
				}
			);

			headingElements.forEach( ( el ) => observer.observe( el ) );
		}
	} );
}

// Initialise on DOM ready.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initTableOfContents );
} else {
	initTableOfContents();
}
