/**
 * Scroll driver (Spec 38A §9, FR-38A-21): the one plain-JS writer of
 * `--sgs-scroll-progress` (a unitless number, 0 to 1, four decimals) on every
 * browser. CSS reads the property; nothing here touches a transform.
 *
 * Registered as the script module `@sgs/scroll-driver` and externalised in
 * webpack, so every bundle shares this one instance, one scroll listener and
 * one rAF queue.
 *
 * Scoped elements carry `data-sgs-scroll="page|view|section"`:
 *  - `page`: progress of the document scroll, 0 at the top, 1 at the bottom.
 *  - `view`: progress of the element crossing the viewport, 0 when its top
 *    meets the viewport bottom, 1 when its bottom meets the viewport top.
 *  - `section`: the `view` formula measured on the element's section, written
 *    on the element itself. The section is the element's closest `<section>`;
 *    failing that, its outermost `.wp-block-sgs-container` ancestor that sits
 *    directly in the page content (`.entry-content`, `.wp-block-post-content`,
 *    `main` or the editor root); failing that, the element itself.
 * A missing or unknown value means `view`. `observe()` registers an element
 * without the attribute.
 *
 * Under `prefers-reduced-motion: reduce` nothing is written and any written
 * value is removed, except on information elements (`information: true` or
 * `data-sgs-scroll-information`): a progress indicator reports position rather
 * than decorating, so it keeps tracking. A mid-session change in either
 * direction is honoured, and the scroll listener keeps running while any
 * information element is observed.
 *
 * `observe()` also takes `onUpdate( el, progress )`, called after each
 * computation so a consumer can render text from the same number without a
 * second rAF; the driver stays the only writer of the property.
 *
 * @package
 */

const PROPERTY = '--sgs-scroll-progress';
const SELECTOR = '[data-sgs-scroll]';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

const SECTION_PARENTS =
	'.entry-content, .wp-block-post-content, main, .is-root-container';

/** @type {Map<Element, {basis: 'page'|'view'|'section', measureEl: Element, information: boolean, onUpdate: (Function|null)}>} */
const observed = new Map();
/** @type {WeakMap<Element, string>} */
const lastWritten = new WeakMap();

let frame = 0;
let listening = false;
let reducedQuery = null;

function normaliseBasis( value ) {
	return 'page' === value || 'section' === value ? value : 'view';
}

function resolveSection( el ) {
	const section = el.closest( 'section' );
	if ( section ) {
		return section;
	}
	let outer = null;
	let node = el.closest( '.wp-block-sgs-container' );
	while ( node ) {
		const parent = node.parentElement;
		if ( parent && parent.matches( SECTION_PARENTS ) ) {
			outer = node;
		}
		node = parent ? parent.closest( '.wp-block-sgs-container' ) : null;
	}
	return outer || el;
}

function hasInformation() {
	for ( const entry of observed.values() ) {
		if ( entry.information ) {
			return true;
		}
	}
	return false;
}

function isReduced() {
	return !! ( reducedQuery && reducedQuery.matches );
}

function clamp( value ) {
	if ( ! Number.isFinite( value ) ) {
		return 0;
	}
	return Math.min( 1, Math.max( 0, value ) );
}

function pageProgress() {
	const root = document.documentElement;
	const range = root.scrollHeight - window.innerHeight;
	if ( range <= 0 ) {
		return 0;
	}
	const top = window.scrollY || root.scrollTop || 0;
	return clamp( top / range );
}

function viewProgress( el ) {
	const rect = el.getBoundingClientRect();
	const span = window.innerHeight + rect.height;
	if ( span <= 0 ) {
		return 0;
	}
	return clamp( ( window.innerHeight - rect.top ) / span );
}

function write( el, progress ) {
	const text = String( Number( clamp( progress ).toFixed( 4 ) ) );
	if ( lastWritten.get( el ) === text ) {
		return;
	}
	lastWritten.set( el, text );
	el.style.setProperty( PROPERTY, text );
}

function clear( el ) {
	lastWritten.delete( el );
	el.style.removeProperty( PROPERTY );
}

/**
 * Recompute and write every observed element now (synchronously).
 */
export function update() {
	frame = 0;
	const reduced = isReduced();
	const page = pageProgress();
	observed.forEach( ( entry, el ) => {
		if ( reduced && ! entry.information ) {
			return;
		}
		const progress =
			'page' === entry.basis ? page : viewProgress( entry.measureEl );
		write( el, progress );
		if ( entry.onUpdate ) {
			entry.onUpdate( el, clamp( progress ) );
		}
	} );
}

function schedule() {
	if ( ! frame && ( ! isReduced() || hasInformation() ) ) {
		frame = window.requestAnimationFrame( update );
	}
}

function onReducedChange() {
	if ( isReduced() ) {
		observed.forEach( ( entry, el ) => {
			if ( ! entry.information ) {
				clear( el );
			}
		} );
		if ( frame && ! hasInformation() ) {
			window.cancelAnimationFrame( frame );
			frame = 0;
		}
		return;
	}
	schedule();
}

function listen() {
	if ( listening ) {
		return;
	}
	listening = true;
	window.addEventListener( 'scroll', schedule, { passive: true } );
	window.addEventListener( 'resize', schedule, { passive: true } );
	if ( reducedQuery && 'function' === typeof reducedQuery.addEventListener ) {
		reducedQuery.addEventListener( 'change', onReducedChange );
	}
}

function unlisten() {
	if ( ! listening ) {
		return;
	}
	listening = false;
	window.removeEventListener( 'scroll', schedule );
	window.removeEventListener( 'resize', schedule );
	if (
		reducedQuery &&
		'function' === typeof reducedQuery.removeEventListener
	) {
		reducedQuery.removeEventListener( 'change', onReducedChange );
	}
	if ( frame ) {
		window.cancelAnimationFrame( frame );
		frame = 0;
	}
}

/**
 * Register an element. Without `basis` the element's `data-sgs-scroll`
 * value decides, and an unknown value means `view`.
 *
 * @param {Element}  el                    Element to drive.
 * @param {Object}   [options]             Optional settings.
 * @param {string}   [options.basis]       `page`, `view` or `section`.
 * @param {boolean}  [options.information] Keep writing under reduced motion.
 * @param {Function} [options.onUpdate]    Called with (el, progress) after each computation.
 */
export function observe( el, options = {} ) {
	if ( ! el || 1 !== el.nodeType ) {
		return;
	}
	const basis = normaliseBasis(
		options.basis || el.getAttribute( 'data-sgs-scroll' )
	);
	const information =
		true === options.information ||
		null !== el.getAttribute( 'data-sgs-scroll-information' );
	observed.set( el, {
		basis,
		measureEl: 'section' === basis ? resolveSection( el ) : el,
		information,
		onUpdate:
			'function' === typeof options.onUpdate ? options.onUpdate : null,
	} );
	listen();
	schedule();
}

/**
 * Stop driving an element and remove the value written on it.
 *
 * @param {Element} el Element to release.
 */
export function unobserve( el ) {
	if ( ! observed.delete( el ) ) {
		return;
	}
	clear( el );
	if ( 0 === observed.size ) {
		unlisten();
	}
}

/**
 * Register every `[data-sgs-scroll]` element under a root.
 *
 * @param {ParentNode} [root] Search root, the document by default.
 */
export function scan( root = document ) {
	root.querySelectorAll( SELECTOR ).forEach( ( el ) => observe( el ) );
}

if ( 'undefined' !== typeof window && 'undefined' !== typeof document ) {
	reducedQuery =
		'function' === typeof window.matchMedia
			? window.matchMedia( REDUCED_QUERY )
			: null;
	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', () => scan(), {
			once: true,
		} );
	} else {
		scan();
	}
}
