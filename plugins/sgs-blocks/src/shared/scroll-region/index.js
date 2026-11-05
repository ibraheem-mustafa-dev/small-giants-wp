/**
 * Scroll regions: a row that scrolls sideways is a focusable, named region exactly while its content overflows.
 *
 * A swipe row is a scrollable region only while it scrolls, and the markup is the same at every width, so the server marks
 * the row with `data-sgs-scroll-region` and this makes it keyboard reachable (tabindex, so the arrow keys scroll it, and
 * axe's scrollable-region-focusable passes), a region with an accessible name, and a plain element again when it does not
 * overflow. Without script the row still scrolls by touch and pointer, and its own links stay focusable.
 *
 * The name is the attribute's value. When the value is empty the nearest heading that comes before the row names it (the
 * section heading), then `data-sgs-scroll-region-default`.
 *
 * Used by sgs/gallery (its swipe grid) and sgs/container ("Scroll sideways").
 *
 * @package SGS\Blocks
 */

const HEADING_SELECTOR = 'h1,h2,h3,h4,h5,h6';

/**
 * The text of the heading that leads the nearest block before the row: the first heading inside the nearest previous
 * sibling of the row, or of the closest ancestor, that has one (a section's heading comes first, a rating figure after it). A heading inside the row itself is an item's own title, so it never counts.
 *
 * @param {HTMLElement} row The scrolling row.
 * @return {string} The heading text, or ''.
 */
function precedingHeadingText( row ) {
	for ( let node = row; node && node !== document.body; node = node.parentElement ) {
		for ( let sib = node.previousElementSibling; sib; sib = sib.previousElementSibling ) {
			const heading = sib.matches( HEADING_SELECTOR ) ? sib : sib.querySelector( HEADING_SELECTOR );
			const text = heading ? heading.textContent.trim().replace( /\s+/g, ' ' ) : '';
			if ( text ) {
				return text;
			}
		}
		if ( node.matches( 'main,[role="main"]' ) ) {
			break;
		}
	}
	return '';
}

/**
 * Make one row a focusable, named region while it overflows.
 *
 * @param {HTMLElement} row An element carrying `data-sgs-scroll-region`.
 */
export function initScrollRegion( row ) {
	const name =
		row.getAttribute( 'data-sgs-scroll-region' ) ||
		precedingHeadingText( row ) ||
		row.getAttribute( 'data-sgs-scroll-region-default' ) ||
		'';
	const sync = () => {
		const scrolls = row.scrollWidth > row.clientWidth + 1;
		if ( scrolls ) {
			row.setAttribute( 'tabindex', '0' );
			row.setAttribute( 'role', 'region' );
			row.setAttribute( 'aria-label', name );
		} else {
			row.removeAttribute( 'tabindex' );
			row.removeAttribute( 'role' );
			row.removeAttribute( 'aria-label' );
		}
	};
	sync();
	if ( 'function' === typeof ResizeObserver ) {
		new ResizeObserver( sync ).observe( row );
	} else {
		window.addEventListener( 'resize', sync );
	}
}

/**
 * Initialise the rows of one block on the page. Each block's view script passes its own row selector, so a row is only
 * ever set up by the script of the block that printed it.
 *
 * @param {string} selector Selector of that block's rows, each carrying `data-sgs-scroll-region`.
 */
export function initScrollRegions( selector ) {
	document.querySelectorAll( selector ).forEach( initScrollRegion );
}
