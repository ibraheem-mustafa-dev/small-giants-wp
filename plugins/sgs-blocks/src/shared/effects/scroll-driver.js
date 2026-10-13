/**
 * Scroll driver (Spec 38A §9, FR-38A-21): the one plain-JS writer of
 * `--sgs-scroll-progress` (a unitless number, 0 to 1, four decimals) on every
 * browser. CSS reads the property; nothing here touches a transform.
 *
 * Registered as the script module `@sgs/scroll-driver` and externalised in
 * webpack, so every bundle shares this one instance, one scroll listener and
 * one rAF queue.
 *
 * Scoped elements carry `data-sgs-scroll="page|view"`:
 *  - `page`: progress of the document scroll, 0 at the top, 1 at the bottom.
 *  - `view`: progress of the element crossing the viewport, 0 when its top
 *    meets the viewport bottom, 1 when its bottom meets the viewport top.
 * A missing or unknown value means `view`. `observe()` registers an element
 * without the attribute.
 *
 * Under `prefers-reduced-motion: reduce` nothing is written and any written
 * value is removed; a mid-session change in either direction is honoured.
 *
 * @package SGS\Blocks
 */

const PROPERTY = '--sgs-scroll-progress';
const SELECTOR = '[data-sgs-scroll]';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** @type {Map<Element, 'page'|'view'>} */
const observed = new Map();
/** @type {WeakMap<Element, string>} */
const lastWritten = new WeakMap();

let frame = 0;
let listening = false;
let reducedQuery = null;

function normaliseBasis( value ) {
	return 'page' === value ? 'page' : 'view';
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
	if ( isReduced() ) {
		return;
	}
	const page = pageProgress();
	observed.forEach( ( basis, el ) => {
		write( el, 'page' === basis ? page : viewProgress( el ) );
	} );
}

function schedule() {
	if ( ! frame && ! isReduced() ) {
		frame = window.requestAnimationFrame( update );
	}
}

function onReducedChange() {
	if ( isReduced() ) {
		if ( frame ) {
			window.cancelAnimationFrame( frame );
			frame = 0;
		}
		observed.forEach( ( basis, el ) => clear( el ) );
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
 * @param {Element}                 el        Element to drive.
 * @param {{basis?: 'page'|'view'}} [options] Optional basis override.
 */
export function observe( el, options = {} ) {
	if ( ! el || 1 !== el.nodeType ) {
		return;
	}
	const basis = normaliseBasis(
		options.basis || el.getAttribute( 'data-sgs-scroll' )
	);
	observed.set( el, basis );
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
