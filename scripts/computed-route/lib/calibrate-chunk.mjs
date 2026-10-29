// How calibration builds a block's page in pieces (FR-47-2): the child process that saves a calibration page, the size of
// each piece, and halving a piece whose build timed out. Pure: no browser, no site.

// wp-build-page.js holds the whole calibration tree and the editor's reply in memory; on the default heap it was killed
// at the 300-second limit for a block with several hundred instances (sgs/business-info plans 343).
export const NODE_HEAP_FLAG = '--max-old-space-size=8192';
export const MIN_CHUNK = 1;

// The run holds each default reading whole and every other instance's difference from it (lib/calibrate.mjs::diffReads),
// and reads one chunk at a time within ELEMENT_BUDGET; a run started below this limit restarts itself with NODE_HEAP_FLAG
// (calibrate.mjs).
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
	return [ NODE_HEAP_FLAG, script, '--env-file', target.envFile, '--env-key', target.envKey, '--tree', treeFile, '--editor-timeout', String( EDITOR_TIMEOUT_MS ), ...extra ];
}

// The most instances one page of this block holds: the fixture's own `chunk` (a block whose page times out on the host
// names a smaller one), else the run's default.
export function chunkSizeFor( fixture, fallback ) {
	const n = Math.floor( Number( fixture?.chunk ) );
	return Number.isFinite( n ) && n > 0 ? n : fallback;
}

export const halveChunk = ( size ) => Math.max( MIN_CHUNK, Math.floor( size / 2 ) );

// Pages of at most `size` non-default instances; every page carries each default and baseline, so a marker is always
// compared with a default read on the same page load.
export function planChunks( defaults, others, size ) {
	const chunks = [];
	for ( let i = 0; i < others.length; i += size ) {
		chunks.push( [ ...defaults, ...others.slice( i, i + size ) ] );
	}
	return chunks.length ? chunks : [ defaults ];
}

// The elements one chunk's reading may hold, counting every instance on the page (its defaults and baselines too): a
// reading is every element of each instance x every read property x 3 widths, and a page of sgs/nav-bar-menu (422
// elements an instance) at 150 instances passed 7 GB while one chunk was read. About 50,000 elements (120 such instances)
// stayed near 5 GB through a whole run.
export const ELEMENT_BUDGET = 50000;

// The non-default instances the next pages may hold once a page's reading shows how many elements each instance draws:
// the page within ELEMENT_BUDGET with its `defaults` (defaults and baselines, which every page carries), never more than
// `size` and never fewer than MIN_CHUNK.
export function sizeForReading( size, perInstance, defaults, budget = ELEMENT_BUDGET ) {
	return Math.max( MIN_CHUNK, Math.min( size, Math.floor( budget / perInstance ) - defaults ) );
}

// The pages still queued, planned again at `size` non-default instances each (the defaults of the first queued page carried
// on every one), in the same order.
export function replanQueue( queue, size ) {
	if ( ! queue.length ) {
		return queue;
	}
	const defaults = queue[ 0 ].filter( ( i ) => i.isDefault || i.isBase );
	const others = queue.flatMap( ( list ) => list.filter( ( i ) => ! i.isDefault && ! i.isBase ) );
	return planChunks( defaults, others, size );
}

// A page whose build timed out, split into smaller pages. Returns { size, chunks } with the halved size, or null when
// the page holds one non-default instance or fewer (nothing left to halve).
export function splitOnTimeout( list, size ) {
	const defaults = list.filter( ( i ) => i.isDefault || i.isBase );
	const others = list.filter( ( i ) => ! i.isDefault && ! i.isBase );
	if ( others.length <= MIN_CHUNK ) {
		return null;
	}
	const next = halveChunk( Math.min( size, others.length ) );
	return { size: next, chunks: planChunks( defaults, others, next ) };
}
