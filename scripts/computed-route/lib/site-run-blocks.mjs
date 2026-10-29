// Every block a surface's proposed skeleton places has a current slot map before Fill (critique council 2026-10-29,
// finding 5): Stage 0 calibrates a guessed set (lib/stage0.mjs::blockSetFor), so a block the skeleton picks later relies on
// a gitignored cache. The site run refuses a surface whose proposal needs a block with no current slot map and names the
// blocks, their state and the calibrate.mjs command that measures them.
import { blockState, calibrateArgs } from './stage0.mjs';

// The distinct sgs/ blocks a proposal places (a removed, absorbed or unwrapped row places none), sorted.
export const proposedBlocks = ( rows ) => [ ...new Set( ( rows || [] ).filter( ( r ) => ! r.action && /^sgs\//.test( r.block || '' ) ).map( ( r ) => r.block ) ) ].sort();

// The slot-map state (lib/stage0.mjs::blockState) of each block that is not current. `hashesOf(block)` is
// { deployed, local } | { error }; `fixtures` is calibration-fixtures.json.
export function uncalibratedBlocks( { blocks, cacheDir, hashesOf, fixtures } ) {
	return blocks.map( ( block ) => blockState( { cacheDir, block, hashes: hashesOf( block ), fixtures } ) ).filter( ( s ) => 'current' !== s.state );
}

// The pre-Fill result for a surface: how many blocks are calibrated, or an Error naming those that are not.
export function calibrationVerdict( { surface, rows, client, site, cacheDir, hashesOf, fixtures } ) {
	const blocks = proposedBlocks( rows );
	const bad = uncalibratedBlocks( { blocks, cacheDir, hashesOf, fixtures } );
	if ( bad.length ) {
		const fixable = bad.filter( ( s ) => [ 'missing', 'stale' ].includes( s.state ) ).map( ( s ) => s.block );
		const cmd = fixable.length ? `node scripts/computed-route/calibrate.mjs ${ calibrateArgs( { site, client, blocks: fixable, recalibrate: true } ).join( ' ' ) }` : null;
		throw new Error( `${ surface } places ${ bad.length } block(s) with no current slot map: ${ bad.map( ( s ) => `${ s.block } (${ s.state }${ s.why ? `: ${ s.why }` : '' })` ).join( '; ' ) }${ cmd ? `. Calibrate them first: ${ cmd }` : '' }` );
	}
	return `${ blocks.length } placed blocks, each with a current slot map`;
}
