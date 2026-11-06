// The pages of one block's calibration (FR-47-2): builds each page of instances on the calibration page and reads it at
// every width, one page at a time. A block with more instances than one page saves reliably is built in pages (the
// fixture's own `chunk`, else CHUNK); every page carries each variant's default instance, so a marker is always compared
// with a default read on the same page load. A page whose build times out is halved and rebuilt.
import path from 'path';
import { spawn } from 'child_process';
import { writeTree } from './tree.mjs';
import { CHILD_TIMEOUT_MS, buildSpawnArgs, chunkSizeFor, planChunks, splitOnTimeout, sizeForReading, replanQueue } from './calibrate-chunk.mjs';
import { WIDTHS, buildTree, slotFor, stateTarget, readAll } from './calibrate.mjs';
import { readContentAll } from './calibrate-content.mjs';
import { setBasket, pickPass } from './calibrate-basket.mjs';
import { setWishlist } from './calibrate-wishlist.mjs';
import { wpEvalRunner } from './calibration-refs.mjs';
import { closeStrayTabs } from './wp-run-session.mjs';

// Most instances one calibration page holds: google-reviews has about 400, and a save of that page failed with an invalid
// JSON response on 2026-10-03; 157 saved. SGS_CAL_CHUNK overrides it for a run (a block whose page times out on the host
// is read in smaller pages).
export const CHUNK = Number( process.env.SGS_CAL_CHUNK ) > 0 ? Number( process.env.SGS_CAL_CHUNK ) : 150;

// A page that could not be built or read: the block's error, the rest of the run continues.
export class PageError extends Error {}

// Asynchronous on purpose: the run's own Playwright connection must keep answering while the child opens its tab in the
// shared browser (Chrome holds a new tab paused until every attached client lets it run; a blocked event loop never does).
export async function build( repo, target, treeFile, extra = [] ) {
	const r = await new Promise( ( resolve ) => {
		// NODE_HEAP_FLAG: a calibration tree of several hundred instances outgrew the default heap before the limit.
		const child = spawn( 'node', buildSpawnArgs( path.join( repo, 'scripts', 'wp-build-page.js' ), target, treeFile, extra ), { cwd: repo } );
		let stdout = '';
		let stderr = '';
		let timedOut = false;
		child.stdout.on( 'data', ( d ) => ( stdout += d ) );
		child.stderr.on( 'data', ( d ) => ( stderr += d ) );
		const timer = setTimeout( () => {
			timedOut = true;
			child.kill();
		}, CHILD_TIMEOUT_MS );
		child.on( 'close', ( status ) => {
			clearTimeout( timer );
			resolve( { status, stdout, stderr, timedOut } );
		} );
	} );
	const last = ( r.stdout || '' ).trim().split( '\n' ).pop();
	let json = null;
	try {
		json = JSON.parse( last );
	} catch {}
	return { code: r.status, json, timedOut: r.timedOut, err: ( r.stderr || '' ) + ( r.stdout || '' ) };
}

// Builds and reads `instances` page by page. Returns { kept, rejected, pages }: each instance with its reads and its
// page's default reads. Throws PageError when a page cannot be built.
export async function measurePages( block, instances, { fixture, site, target, env, shared, repo, treeFile, needles, clock, extraProps } ) {
	const rejected = [];
	const defaults = instances.filter( ( i ) => i.isDefault || i.isBase );
	const others = instances.filter( ( i ) => ! i.isDefault && ! i.isBase );
	let size = chunkSizeFor( fixture, CHUNK );
	const queue = planChunks( defaults, others, size );
	const kept = [];
	let done = 0;
	// A block's first page is saved, reloaded and checked: a block the editor rejects fails there, and one the editor tidies
	// on load keeps the settling save on every page. A block with neither needs no reload, because the read is the front end.
	let reload = true;
	while ( queue.length ) {
		let list = queue.shift();
		const where = () => ( done + queue.length ? ` (page ${ done + 1 } of ${ done + queue.length + 1 })` : '' );
		// Halves the page in hand and puts its pieces first in the queue; false when it cannot be split further.
		const halve = () => {
			const split = splitOnTimeout( list, size );
			if ( ! split ) {
				return false;
			}
			size = split.size;
			queue.unshift( ...split.chunks );
			return true;
		};
		// The child checks the tree before it touches the post, and names each rejected node by its tree path:
		// "[<i>] sgs/container > ...". Those instances are dropped and the page built again.
		let built = null;
		for ( let attempt = 0; attempt < 4; attempt++ ) {
			writeTree( treeFile, buildTree( block, fixture, list ) );
			built = await clock.time( 'build', () => build( repo, target, treeFile, [ '--post-id', String( target.postId ), ...( reload ? [] : [ '--no-reload' ] ) ] ) );
			if ( built.timedOut || 0 === built.code ) {
				break;
			}
			const bad = new Set( [ ...built.err.matchAll( /^\s*\[(\d+)\] sgs\/container[^:]*: (.*)$/gm ) ].map( ( m ) => {
				rejected.push( { key: list[ Number( m[ 1 ] ) ].key, message: m[ 2 ] } );
				return Number( m[ 1 ] );
			} ) );
			if ( ! bad.size ) {
				throw new PageError( `calibration build failed${ where() }: ${ built.err.slice( -600 ) }` );
			}
			list = list.filter( ( _, i ) => ! bad.has( i ) );
		}
		if ( built?.timedOut ) {
			if ( halve() ) {
				continue;
			}
			throw new PageError( `calibration build timed out on a page of ${ list.length } instance(s) that cannot be split further${ where() }` );
		}
		if ( ! built?.json?.ok ) {
			throw new PageError( `calibration build failed${ where() }: ${ ( built?.err || '' ).slice( -600 ) }` );
		}
		reload = !! built.json.normalisedOnFirstLoad;
		Object.entries( built.json.stages || {} ).forEach( ( [ k, v ] ) => clock.add( `build.${ k.replace( /Ms$/, '' ) }`, v ) );
		await closeStrayTabs( shared );
		const pageUrl = built.json.link || `${ env.url }/?page_id=${ target.postId }`;
		// A fixture's basket line (lib/calibrate-basket.mjs): the page is read again holding it, and each instance keeps the
		// pass in which its marker shows.
		// A fixture's `settleGone` holds every pass until no element matches it (a block its script unhides after load).
		const settleGone = fixture.settleGone || null;
		const owner = { block, site };
		const passes = [ await clock.time( 'read', () => readAll( shared.page, pageUrl, list, { settleGone, owner, extraProps } ) ) ];
		clock.addReads( passes[ 0 ].timing );
		// Once a page shows how many elements each instance draws, the pages still queued hold no more than the element budget
		// (lib/calibrate-chunk.mjs::sizeForReading): a block whose instances draw hundreds of elements reads fewer per page.
		const drawn = Math.max( 0, ...WIDTHS.map( ( w ) => {
			const reads = Object.values( passes[ 0 ][ w ] || {} );
			return reads.length ? reads.reduce( ( a, r ) => a + Object.keys( r || {} ).length, 0 ) / reads.length : 0;
		} ) );
		const fits = sizeForReading( size, drawn, list.filter( ( i ) => i.isDefault || i.isBase ).length );
		if ( fits < size ) {
			size = fits;
			queue.splice( 0, queue.length, ...replanQueue( queue, size ) );
		}
		if ( fixture.basket ) {
			await setBasket( shared.page, env.url, fixture.basket );
			try {
				passes.push( await readAll( shared.page, pageUrl, list, { settleGone, owner, extraProps } ) );
			} finally {
				await setBasket( shared.page, env.url, null );
			}
		}
		// A fixture's wishlist (lib/calibrate-wishlist.mjs): the page is read again with one saved product, and the user's
		// own list is put back.
		if ( fixture.wishlist ) {
			const runPhp = wpEvalRunner( target, site, repo );
			setWishlist( runPhp, env.user, true );
			try {
				passes.push( await readAll( shared.page, pageUrl, list, { settle: fixture.wishlist.settle || null, settleGone, owner, extraProps } ) );
			} finally {
				setWishlist( runPhp, env.user, false );
			}
		}
		// A second pass only when this chunk holds a content instance: the content read records node existence, text and
		// link attributes, which no computed-style read carries.
		const contentReads = list.some( ( i ) => i.content ) ? await clock.time( 'contentRead', () => readContentAll( shared.page, pageUrl, list, needles ) ) : {};
		// Each instance keeps its own reads and its chunk's default reads (rest and scrolled) for its variant.
		const chunkDefault = {};
		const chunkBase = {};
		list.forEach( ( inst, n ) => {
			inst.isDefault && ( chunkDefault[ inst.variant ] = n );
			inst.isBase && ( chunkBase[ inst.baseKey ] = n );
		} );
		const at = ( n, src ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, src[ w ]?.[ n ] ] ) );
		list.forEach( ( inst, n ) => {
			// Baselines are only ever compared against; defaults are kept once.
			if ( inst.isBase || ( inst.isDefault && done > 0 ) ) {
				return;
			}
			if ( inst.baseKey && undefined === chunkBase[ inst.baseKey ] ) {
				rejected.push( { key: inst.key, message: 'its baseline instance was rejected, so there is nothing to compare it with' } );
				return;
			}
			const d = inst.baseKey ? chunkBase[ inst.baseKey ] : chunkDefault[ inst.variant ];
			// A style instance's pass is the one where its setting is reached (lib/calibrate.mjs::slotFor on that pass).
			const reached = inst.row && ! inst.content && inst.marker
				? ( r ) => ! slotFor( inst.row, inst.marker, at( d, r ), at( n, r ), { own: stateTarget( block, inst.row ) } ).dead
				: null;
			const reads = pickPass( passes, n, d, reached );
			kept.push( { ...inst, read: at( n, reads ), readScrolled: at( n, reads.scrolled ), def: at( d, reads ), defScrolled: at( d, reads.scrolled ), hoverMissed: reads.hoverMissed.includes( n ), hoverWhy: reads.hoverWhy?.[ n ], scrollMissed: reads.scrollMissed.includes( n ), ...( inst.content ? { contentRead: at( n, contentReads ), contentDef: at( d, contentReads ) } : {} ) } );
		} );
		done++;
	}
	return { kept, rejected, pages: done };
}
