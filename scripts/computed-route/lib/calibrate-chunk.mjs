// How calibration builds a block's page in pieces (FR-47-2): the child process that saves a calibration page, the size of
// each piece, and halving a piece whose build timed out. Pure: no browser, no site.

// wp-build-page.js holds the whole calibration tree and the editor's reply in memory; on the default heap it was killed
// at the 300-second limit for a block with several hundred instances (sgs/business-info plans 343).
export const NODE_HEAP_FLAG = '--max-old-space-size=8192';
export const MIN_CHUNK = 1;

// The run itself holds every chunk's reads until the block's file is written: sgs/nav-bar-menu (744 blocks a page)
// exhausted the default 4 GB heap after 46 minutes on 2026-10-07. A run started below this limit restarts itself with
// NODE_HEAP_FLAG (calibrate.mjs).
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
