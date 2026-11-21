import path from 'node:path';

// How calibration builds a block's page in pieces (FR-47-2): the child process that saves a calibration page, the size of
// each piece, and halving a piece whose build timed out. Pure: no browser, no site.

// wp-build-page.js holds the whole calibration tree and the editor's reply in memory; on the default heap it was killed
// at the 300-second limit for a block with several hundred instances (sgs/business-info plans 343).
export const NODE_HEAP_FLAG = '--max-old-space-size=8192';
export const MIN_CHUNK = 1;

// The run reads one chunk at a time within ELEMENT_BUDGET and holds one chunk's reads at a time (each marked instance keeps
// only its result once its page is read, lib/calibrate-block.mjs::settleInstance); a run started below this limit restarts
// itself with NODE_HEAP_FLAG (calibrate.mjs).
export const RUN_HEAP_BYTES = 7 * 1024 ** 3;
export const needsBiggerHeap = ( heapLimitBytes ) => heapLimitBytes < RUN_HEAP_BYTES;
// How long each page load (the login, the editor, the save, and the front-end reads in calibrate-read.mjs and
// calibrate-content.mjs), editor boot and save of a calibration page may take, and the whole child's limit (login,
// the editor load, the save and the reload that reads the save back). A chunk is a large page by design: on the local
// mirror a 744-block page took 150 s to return its edit screen, then 1.3 s to boot (2026-10-07), against
// wp-build-page.js's 60 s default.
export const EDITOR_TIMEOUT_MS = 240000;
export const CHILD_TIMEOUT_MS = 3 * EDITOR_TIMEOUT_MS;

// The argument list for `node` running wp-build-page.js against one calibration tree.
export function buildSpawnArgs( script, target, treeFile, extra = [] ) {
	return [ NODE_HEAP_FLAG, script, '--env-file', process.env.SGS_SECRETS_ROOT ? path.resolve( process.env.SGS_SECRETS_ROOT, target.envFile ) : target.envFile, '--env-key', target.envKey, '--tree', treeFile, '--editor-timeout', String( EDITOR_TIMEOUT_MS ), ...extra ];
}

// The most instances one page of this block holds: the fixture's own `chunk` (a block whose page times out on the host
// names a smaller one), else the run's default.
export function chunkSizeFor( fixture, fallback ) {
	const n = Math.floor( Number( fixture?.chunk ) );
	return Number.isFinite( n ) && n > 0 ? n : fallback;
}

export const halveChunk = ( size ) => Math.max( MIN_CHUNK, Math.floor( size / 2 ) );

// The defaults and baselines (`held`) a page of `list` is read against: the baseline each of its instances names
// (baseKey), and the default of each variant an instance with no baseline is compared with; with `allDefaults` every
// default (the block's first page, where its default paint is read). In `held`'s order.
export function heldFor( held, list, allDefaults ) {
	const bases = new Set( list.map( ( i ) => i.baseKey ).filter( Boolean ) );
	const variants = new Set( list.filter( ( i ) => ! i.baseKey ).map( ( i ) => i.variant ) );
	return held.filter( ( h ) => ( h.isDefault && ( allDefaults || variants.has( h.variant ) ) ) || ( h.isBase && bases.has( h.baseKey ) ) );
}

// Pages of at most `size` non-default instances and at most `cap` instances in all, in order. A page carries only the
// defaults and baselines its own instances are compared with (heldFor), so a marker is still compared with a default or
// baseline read on the same page load; a baseline no instance on the page names is not rendered. The first page
// (`firstPage`) carries every default. A page always holds at least one non-default instance.
export function planChunks( held, others, size, { cap = Infinity, firstPage = true } = {} ) {
	const chunks = [];
	let page = [];
	const allDefaults = () => firstPage && ! chunks.length;
	const close = () => {
		chunks.push( [ ...heldFor( held, page, allDefaults() ), ...page ] );
		page = [];
	};
	for ( const inst of others ) {
		const next = [ ...page, inst ];
		if ( page.length && ( next.length > size || heldFor( held, next, allDefaults() ).length + next.length > cap ) ) {
			close();
		}
		page.push( inst );
	}
	if ( page.length || ! chunks.length ) {
		close();
	}
	return chunks;
}

// The elements one chunk's reading may hold, counting every instance on the page (its defaults and baselines too): a
// reading is every element of each instance x every read property x 3 widths, and a page of sgs/nav-bar-menu (422
// elements an instance) at 150 instances passed 7 GB while one chunk was read. About 50,000 elements (120 such instances)
// stayed near 5 GB through a whole run.
export const ELEMENT_BUDGET = 50000;

// The most instances (its defaults and baselines counted) the next pages may hold once a page's reading shows how many
// elements each instance draws: the page within ELEMENT_BUDGET. An empty reading (0 elements) sets no limit (Infinity).
export function pageCapFor( perInstance, budget = ELEMENT_BUDGET ) {
	return Math.floor( budget / perInstance );
}

const isHeld = ( i ) => i.isDefault || i.isBase;

// The pages still queued, planned again (planChunks) at `size` non-default instances and `cap` instances a page, each
// carrying from `held` (every default and baseline of the block) what its own instances need, in the same order. No queued
// page is the block's first.
export function replanQueue( queue, size, held, cap = Infinity ) {
	if ( ! queue.length ) {
		return queue;
	}
	return planChunks( held, queue.flatMap( ( list ) => list.filter( ( i ) => ! isHeld( i ) ) ), size, { cap, firstPage: false } );
}

// A page whose build timed out, split into smaller pages (planChunks over the page's own defaults and baselines; the first
// piece of the block's first page keeps every default). Returns { size, chunks } with the halved size, or null when the
// page holds one non-default instance or fewer (nothing left to halve).
export function splitOnTimeout( list, size, { cap = Infinity, firstPage = false } = {} ) {
	const others = list.filter( ( i ) => ! isHeld( i ) );
	if ( others.length <= MIN_CHUNK ) {
		return null;
	}
	const next = halveChunk( Math.min( size, others.length ) );
	return { size: next, chunks: planChunks( list.filter( isHeld ), others, next, { cap, firstPage } ) };
}
