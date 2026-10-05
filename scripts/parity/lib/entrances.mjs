// The load-entrance check for draft-live-walk.mjs (GAP-CHECKLIST.md section 15). What moves or fades in
// as a page loads, judged by what paints, not by how: a draft that reveals with a script (inline styles
// set from a timer) and a copy that reveals with a CSS animation compare on the same terms. Every block in
// the first screen (an element with its own words, or a picture) is sampled from DOMContentLoaded for
// `entranceWindow` ms (default 1600): its effective opacity and the transforms on it and its ancestors.
// A block's entrance is the time its pose first changed and the time it last changed.
import { AUTO_EXCLUDE } from './auto-walk.mjs';
import { traceRef, elementPath } from './ref-trace.mjs';

// The live side's ref arguments for sampleIn: [ refPrefix, traceSrc, pathSrc ], or null (the draft, or a walk with no refPrefix).
const traceArgs = ( side, cfg ) => ( 'live' === side && cfg.refPrefix ? [ cfg.refPrefix, traceRef.toString(), elementPath.toString() ] : null );
const excludeFor = ( side, cfg ) => [ ...AUTO_EXCLUDE, ...( cfg.auto?.exclude?.[ side ] || [] ).filter( ( e ) => 'string' === typeof e ) ];

async function sampleIn( [ rootSel, exclude, windowMs, trace, waitMs ] ) {
	const findRoot = () => ( rootSel ? [ ...document.querySelectorAll( rootSel ) ].find( ( e ) => e.getClientRects().length ) : document.body );
	// A region that opens with the action (a drawer, a panel) is waited for: its root shows a moment after the click.
	let root = findRoot();
	for ( let waited = 0; ! root && waited < waitMs; waited += 20 ) {
		await new Promise( ( r ) => setTimeout( r, 20 ) );
		root = findRoot();
	}
	if ( ! root ) {
		return { loops: [], blocks: {}, refs: {} };
	}
	// A config rooted at one element (a footer) samples only it, exclusions aside.
	const ex = rootSel ? [] : exclude.flatMap( ( s ) => [ ...document.querySelectorAll( s ) ] );
	const blocks = new Map();
	for ( const el of root.querySelectorAll( '*' ) ) {
		if ( blocks.size >= 150 || ex.some( ( x ) => x.contains( el ) ) || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test( el.tagName ) ) {
			continue;
		}
		const media = /^(IMG|PICTURE|VIDEO|SVG|CANVAS)$/i.test( el.tagName ) && ! el.parentElement.closest( 'picture, svg' );
		const words = [ ...el.childNodes ].some( ( n ) => 3 === n.nodeType && n.textContent.trim() );
		const r = el.getBoundingClientRect();
		if ( ( ! media && ! words ) || r.width < 2 || r.bottom <= 0 || r.top >= innerHeight ) {
			continue;
		}
		const key = media ? `media:${ ( el.getAttribute( 'alt' ) || el.getAttribute( 'aria-label' ) || el.currentSrc || el.tagName ).toLowerCase().split( '/' ).pop().slice( 0, 40 ) }`
			: el.innerText.replace( /\s+/g, ' ' ).trim().toLowerCase().slice( 0, 40 );
		if ( key && ! blocks.has( key ) ) {
			blocks.set( key, el );
		}
	}
	const pose = ( el ) => {
		let op = 1;
		const tf = [];
		for ( let a = el; a && a !== document.documentElement; a = a.parentElement ) {
			const s = getComputedStyle( a );
			op *= parseFloat( s.opacity );
			tf.push( `${ s.transform }${ s.translate }${ s.scale }${ s.rotate }` );
		}
		return `${ Math.round( op * 20 ) / 20 }|${ tf.join( ',' ) }`;
	};
	// A page load counts from DOMContentLoaded; a region sampled during a state action (waitMs set) from now.
	const dcl = waitMs ? performance.now() : performance.getEntriesByType( 'navigation' )[ 0 ]?.domContentLoadedEventStart || 0;
	// The live side's blocks name their ref and path (ref-trace.mjs::traceRef), so a row maps back to one block. `trace`
	// is [ refPrefix, traceSrc, pathSrc ] on the live side, null otherwise.
	const refs = {};
	if ( trace ) {
		// eslint-disable-next-line no-new-func
		const tracer = new Function( `return (${ trace[ 1 ] });` )();
		for ( const [ key, el ] of blocks ) {
			const t = tracer( el, null, trace[ 0 ], trace[ 2 ] );
			if ( t ) {
				refs[ key ] = { ref: t.ref, block: t.block, path: t.path };
			}
		}
	}
	const track = [ ...blocks ].map( ( [ key, el ] ) => ( { key, el, last: pose( el ), start: null, end: null } ) );
	const t0 = performance.now();
	return new Promise( ( done ) => {
		const tick = () => {
			const t = Math.round( performance.now() - dcl );
			for ( const b of track ) {
				const p = pose( b.el );
				if ( p !== b.last ) {
					b.start ??= t;
					b.end = t;
					b.last = p;
				}
			}
			if ( performance.now() - t0 < windowMs ) {
				setTimeout( tick, 40 );
			} else {
				// A block still changing in the last 120ms is a loop (a ticker, a marquee, Ken Burns), not an
				// entrance: whether its next turn lands inside the window is chance. Loops are left out.
				const loops = track.filter( ( b ) => null !== b.end && t - b.end < 120 ).map( ( b ) => b.key );
				done( { loops, blocks: Object.fromEntries( track.map( ( b ) => [ b.key, null === b.start ? null : [ b.start, b.end ] ] ) ), refs } );
			}
		};
		tick();
	} );
}

// Reloads the page and samples its entrances. The host's "Checking your browser" page is waited out
// first (a sample of it would read nothing), then the reload runs on the real page.
export async function sampleEntrances( page, side, cfg ) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	for ( let t = 0; t < 50 && /checking your browser/i.test( await page.title().catch( () => '' ) ); t++ ) {
		await page.waitForTimeout( 300 );
	}
	const out = await page.evaluate( sampleIn, [ cfg.auto?.root?.[ side ] || null, excludeFor( side, cfg ), cfg.entranceWindow ?? 1600, traceArgs( side, cfg ), 0 ] ).catch( () => null );
	await page.waitForLoadState( 'networkidle' ).catch( () => {} );
	return out;
}

// Samples what moves or fades in inside `rootSel` (a drawer or panel the state's action opens) from the moment it is called,
// during the action, not at page load (GAP-CHECKLIST.md section 26). Call it as the action fires: it waits up to
// `cfg.regionWait` ms (default 400) for the region to show, then samples for `cfg.regionWindow` ms (default 1200). Returns the
// same { loops, blocks, refs } as sampleEntrances, with times counted from the call, or null when the page was lost mid-sample.
export function sampleRegion( page, side, cfg, rootSel ) {
	return page.evaluate( sampleIn, [ rootSel, excludeFor( side, cfg ), cfg.regionWindow ?? 1200, traceArgs( side, cfg ), cfg.regionWait ?? 400 ] ).catch( () => null );
}

// Times from the side's own first entrance: a draft that renders its page by script after
// DOMContentLoaded starts everything later than a server-rendered copy, which is not a difference.
function fromFirst( side, loops ) {
	const starts = Object.entries( side ).filter( ( [ k, v ] ) => v && ! loops.has( k ) ).map( ( [ , v ] ) => v[ 0 ] );
	const t0 = starts.length ? Math.min( ...starts ) : 0;
	return Object.fromEntries( Object.entries( side ).map( ( [ k, v ] ) => [ k, v ? [ v[ 0 ] - t0, v[ 1 ] - t0 ] : null ] ) );
}

// One row per block whose entrance differs: animated on one side only, or a start or end more than
// `tol` ms apart (default 150). Blocks on one side only are the word check's business.
export function compareEntrances( draft, live, tol = 150 ) {
	if ( ! draft?.blocks || ! live?.blocks ) {
		return [];
	}
	const loops = new Set( [ ...draft.loops, ...live.loops ] );
	const d = fromFirst( draft.blocks, loops );
	const l = fromFirst( live.blocks, loops );
	const fmt = ( v ) => ( v ? `${ v[ 0 ] }-${ v[ 1 ] }ms` : 'static' );
	return Object.keys( d ).filter( ( k ) => k in l && ! loops.has( k ) ).flatMap( ( k ) => {
		const a = d[ k ];
		const b = l[ k ];
		const differs = !! a !== !! b || ( a && ( Math.abs( a[ 0 ] - b[ 0 ] ) > tol || Math.abs( a[ 1 ] - b[ 1 ] ) > tol ) );
		// The live block's ref and path (ref-traced walks), so the row maps back to one block as a style row does.
		return differs ? [ { kind: 'entrance', key: `entrance "${ k }"`, draft: fmt( a ), live: fmt( b ), ...( live.refs?.[ k ] || {} ) } ] : [];
	} );
}
