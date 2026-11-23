// The walk stage's command line (site-run.mjs): the walker, a surface's config, its output folder and widths, and the flags that
// let a later run reuse this run's draft walk. The draft side is read once and kept in sites/<client>/build/qa/parity/draft-cache/<surface>.json
// (gitignored with the rest of qa/); the walker keys it by the draft's files, its own code and the config's draft side
// (scripts/parity/lib/draft-cache.mjs), so a changed input walks the draft afresh. `fresh` (--fresh-draft) leaves the cache flags out.
import path from 'path';

// The cache file of one surface's draft walk.
export const draftCacheFile = ( { build, key } ) => path.join( build, 'qa', 'parity', 'draft-cache', `${ key }.json` );

// The arguments of `node` for one surface's walk. `parity`: the build's qa/parity folder; `walkerFull`: the entry's walker config
// path; `draftDir`: the folder the surface's draft is served from; `headless`: the walker's browser flags.
export function walkArgs( { build, key, parity, walkerFull, draftDir, widths, headless = [], fresh = false } ) {
	return [
		'scripts/parity/draft-live-walk.mjs', path.join( parity, path.basename( walkerFull ) ),
		'--out', path.join( parity, 'out', key ), '--widths', widths, ...headless, '--no-review',
		...( fresh ? [] : [ '--draft-cache', draftCacheFile( { build, key } ), '--draft-dir', draftDir ] ),
	];
}
