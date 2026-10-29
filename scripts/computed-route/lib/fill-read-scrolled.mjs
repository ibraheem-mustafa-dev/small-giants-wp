// The draft header after the page has scrolled (Spec 48 FR-48-77, register row C3): the box the header takes at rest and once
// scrolled (its height, backdrop blur and background) and the scroll distance at which it changes, read by scrolling the
// draft's own window as a visitor would. lib/fill-read.mjs::readDraft runs `scrolledProbe` per read width for the header
// roots; lib/fill-header-behaviour.mjs writes the header block's shrink, blur and threshold settings from it.

// How far the window is scrolled for the scrolled read: the same distance the walker uses for a scroll-reached state
// (lib/walker-states.mjs), capped at what the page allows.
export const SCROLL_TO = 600;

// In-page. For each job (the header roots) scrolls the window and reads the element's look. Transitions and animations are
// switched off for the read so each reading is the settled state, never a frame between two. Returns { [job id]: null | {
// rest, scrolled, at } } where rest and scrolled are { height, backdropFilter, backgroundColor } and `at` is the largest
// scroll distance that still reads as rest (the setting's `scrolledOffset`: the state holds once the window is past it);
// null when the page cannot scroll or the element is not found. rest/scrolled are equal when the scroll changes nothing.
export async function scrolledProbe( [ jobs, resolveSrc, to ] ) {
	// eslint-disable-next-line no-new-func
	const find = new Function( `return (${ resolveSrc });` )();
	const style = document.createElement( 'style' );
	style.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
	document.head.appendChild( style );
	const frames = () => new Promise( ( done ) => requestAnimationFrame( () => requestAnimationFrame( () => setTimeout( done, 20 ) ) ) );
	const max = Math.max( 0, Math.min( to, document.documentElement.scrollHeight - innerHeight ) );
	const out = {};
	try {
		for ( const job of jobs ) {
			const el = find( job.finder );
			if ( ! el || max < 1 ) {
				out[ job.id ] = null;
				continue;
			}
			const look = () => {
				const cs = getComputedStyle( el );
				return { height: Math.round( el.getBoundingClientRect().height * 100 ) / 100, backdropFilter: cs.getPropertyValue( 'backdrop-filter' ).trim() || 'none', backgroundColor: cs.getPropertyValue( 'background-color' ).trim() };
			};
			const at = async ( y ) => {
				scrollTo( 0, y );
				await frames();
				return look();
			};
			const rest = await at( 0 );
			const scrolled = await at( max );
			const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );
			let offset = null;
			if ( ! same( rest, scrolled ) ) {
				// The first distance that reads as scrolled is found by halving between rest (lo) and the full scroll (hi).
				let lo = 0;
				let hi = max;
				while ( hi - lo > 1 ) {
					const mid = Math.floor( ( lo + hi ) / 2 );
					same( await at( mid ), rest ) ? lo = mid : hi = mid;
				}
				offset = lo;
			}
			scrollTo( 0, 0 );
			await frames();
			out[ job.id ] = { rest, scrolled, at: offset };
		}
	} finally {
		style.remove();
	}
	return out;
}
