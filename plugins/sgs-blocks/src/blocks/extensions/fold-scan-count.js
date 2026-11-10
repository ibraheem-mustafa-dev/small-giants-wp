/**
 * Fold scan: counting the top-level content sections of a rendered page that start above the fold.
 *
 * The page's content wrapper is `.wp-block-post-content` (the post-content block inside the theme's `main`
 * container, `theme/sgs-theme/templates/page.html`); a page without it falls back to `main`, then `body`. A lone
 * `main` child is a wrapper, not a section, so its own children are the sections (the same rule as
 * `Sgs_Motion_Fold::is_main_wrapper`).
 */

/** Viewports the scan measures, in CSS pixels. */
export const FOLD_SCAN_SIZES = [
	{ width: 375, height: 812 },
	{ width: 768, height: 1024 },
	{ width: 1440, height: 900 },
];

const NON_SECTION_TAGS = [ 'SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'NOSCRIPT' ];

function sectionsOf( wrapper ) {
	return Array.from( wrapper.children ).filter(
		( el ) => ! NON_SECTION_TAGS.includes( el.tagName )
	);
}

/**
 * A box's distance from the document top along its offsetParent chain: layout position only, so a transform (an
 * entrance start state, a hover lift) can never shift it.
 *
 * @param {HTMLElement} el Element to locate.
 * @return {number} Pixels from the document top.
 */
function untransformedTop( el ) {
	let top = 0;
	for ( let node = el; node; node = node.offsetParent ) {
		top += node.offsetTop;
	}
	return top;
}

/**
 * Count the top-level sections that have a rendered height and whose untransformed top edge is above the viewport height.
 *
 * @param {Document} doc            The rendered page document.
 * @param {number}   viewportHeight Viewport height in CSS pixels.
 * @return {number} Sections that start above the fold (rendered boxes only).
 */
export function countSectionsAboveFold( doc, viewportHeight ) {
	const wrapper =
		doc.querySelector( '.wp-block-post-content' ) ||
		doc.querySelector( 'main' ) ||
		doc.body;
	if ( ! wrapper ) {
		return 0;
	}
	let sections = sectionsOf( wrapper );
	if ( sections.length === 1 && sections[ 0 ].tagName === 'MAIN' ) {
		sections = sectionsOf( sections[ 0 ] );
	}
	return sections.filter(
		( el ) => el.offsetHeight > 0 && untransformedTop( el ) < viewportHeight
	).length;
}

/**
 * The scan result: the largest count across the measured sizes, at least 1.
 *
 * @param {number[]} counts One count per viewport size.
 * @return {number} Section count to store.
 */
export function largestCount( counts ) {
	return Math.max( 1, ...counts );
}
