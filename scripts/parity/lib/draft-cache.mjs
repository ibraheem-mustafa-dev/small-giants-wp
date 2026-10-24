// The key a draft walk is cached under (draft-live-walk.mjs `--draft-cache`): the config, width, states walked, lean and
// self flags, and the snapshot schema. Bump SNAPSHOT_VERSION whenever collect.mjs or a state pass adds or changes a
// snapshot field: a rule reading a field an older cached draft lacks (`textless`, `bare`, a state's `icon`) would read
// its absence as "nothing there", so a cache written by an older walker must miss and the draft be walked afresh.
export const SNAPSHOT_VERSION = 2;
export const draftCacheKey = ( { config, width, states = null, lean = false, self = false } ) => JSON.stringify( { config, width, states, lean, self, snapshot: SNAPSHOT_VERSION } );
// The entries of a loaded cache file written under the current schema: an older entry is never read, and is not
// written back either (a reader that takes a file's first entry, computed-route lib/trial-run.mjs::draftBoxes, then
// reads the fresh walk).
export const currentEntries = ( cache ) => Object.fromEntries( Object.entries( cache || {} ).filter( ( [ k ] ) => {
	try {
		return SNAPSHOT_VERSION === JSON.parse( k ).snapshot;
	} catch {
		return false;
	}
} ) );
