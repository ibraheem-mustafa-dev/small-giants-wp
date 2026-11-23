// A run stops before it writes when a block its tree uses has no default look in the client's theme snapshot (its site
// look, lib/setting-record.mjs::siteLook). Without one, the block's record (lib/cache.mjs::loadCalibration) carries `paintMissing` and `elements: {}`, and every reader downstream would
// judge the block against nothing and write wrong settings without a word. Fill (fill.mjs::fillSurface), Solve
// (solve.mjs), the applier (apply.mjs) and the skeleton proposal (skeleton.mjs::proposeSurface,
// lib/skeleton-rerun.mjs::rerunSkeletons, lib/intake-skeletons.mjs::proposeSkeletons) call assertPaints once the tree's
// blocks are known. A block the tree does not use never stops a run, and a block with no slot map at all (a core block, an
// uncalibrated one) is not a paint gap.
// The named allowance (`--allow-missing-paint <block,block>`, parsed by allowMissingPaintArg; site-run.mjs passes it to every
// stage): a block named there does not stop the run, and the run says so in one line per block (missingPaintLine), so a
// clone goes through without its default paint and never silently. Only block names are accepted, never a wildcard or `all`.
import { walk } from './tree.mjs';

const FLAG = '--allow-missing-paint';
const BLOCK_NAME = /^[a-z0-9-]+\/[a-z0-9-]+$/;

// Every block name a tree ({ name, innerBlocks } nodes) uses, each once, in first-seen order.
export function treeBlocks( tree ) {
	const out = new Set();
	walk( Array.isArray( tree ) ? tree : [], ( n ) => n?.name && out.add( n.name ) );
	return [ ...out ];
}

// The blocks of `blocks` whose calibration (`calFor( block )`) carries `paintMissing`, each once, sorted.
export const paintGaps = ( blocks, calFor ) => [ ...new Set( blocks ) ].filter( ( b ) => calFor( b )?.paintMissing ).sort();

// The stop message: the blocks and the one command that builds their look for `client`, and the allowance that lets the
// run go on without it.
export const paintGapMessage = ( { gaps, client, what = 'this run' } ) =>
	`${ what } stops before writing: ${ gaps.length } block${ 1 === gaps.length ? '' : 's' } in its tree ha${ 1 === gaps.length ? 's' : 've' } no default look for ${ client } (${ gaps.join( ', ' ) }), so every setting written for ${ 1 === gaps.length ? 'it' : 'them' } would be judged against nothing. Build ${ 1 === gaps.length ? 'its' : 'their' } site look first: python plugins/sgs-blocks/scripts/site-look/site_look.py --snapshot sites/${ client }/theme-snapshot.json --site ${ client } --out scripts/computed-route/site-look --blocks ${ gaps.join( ',' ) }; or, when ${ 1 === gaps.length ? 'it cannot' : 'they cannot' } be calibrated, name ${ 1 === gaps.length ? 'it' : 'them' } in ${ FLAG } ${ gaps.join( ',' ) } to resolve ${ 1 === gaps.length ? 'its' : 'their' } settings without default paint`;

// The one line a run prints for each named block its tree uses without default paint.
export const missingPaintLine = ( { block, client, what = 'this run' } ) =>
	`${ what }: ${ block } has no default look for ${ client }; its settings were resolved without default paint (${ FLAG })`;

// The allowance list from a comma-separated value: block names (namespace/slug), each once. Throws on a wildcard, `all`, an
// empty entry or any other name that is not a block name.
export function parseAllowMissingPaint( value ) {
	const names = String( value ?? '' ).split( ',' ).map( ( s ) => s.trim() );
	const bad = names.filter( ( n ) => ! BLOCK_NAME.test( n ) );
	if ( bad.length ) {
		throw new Error( `${ FLAG } takes block names (sgs/<block>, comma separated), never a wildcard or "all": ${ bad.map( ( n ) => JSON.stringify( n ) ).join( ', ' ) }` );
	}
	return [ ...new Set( names ) ];
}

// The allowance a command's arguments carry: [] without the flag, else parseAllowMissingPaint of the value after it (a flag
// with no value throws).
export function allowMissingPaintArg( argv ) {
	const i = argv.indexOf( FLAG );
	if ( -1 === i ) {
		return [];
	}
	const value = argv[ i + 1 ];
	if ( undefined === value || value.startsWith( '--' ) ) {
		throw new Error( `${ FLAG } needs a comma-separated list of block names` );
	}
	return parseAllowMissingPaint( value );
}

// The arguments that pass an allowance on to a spawned stage: none when the list is empty.
export const allowMissingPaintArgs = ( allow ) => ( allow?.length ? [ FLAG, allow.join( ',' ) ] : [] );

// Throws paintGapMessage when a block of `blocks` has no default look for `client` and is not named in `allow`. Each gap
// that `allow` names is printed with `log` (missingPaintLine) and returned, so the caller can carry it in its report. A
// run with no client reads no look by design (loadCalibration( dir, block, null ), the census tools), so it is never
// stopped here and returns [].
export function assertPaints( { blocks, calFor, client = null, what, allow = [], log = console.log } ) {
	if ( ! client ) {
		return [];
	}
	const gaps = paintGaps( blocks, calFor );
	const stop = gaps.filter( ( b ) => ! allow.includes( b ) );
	if ( stop.length ) {
		throw new Error( paintGapMessage( { gaps: stop, client, what } ) );
	}
	gaps.forEach( ( block ) => log( missingPaintLine( { block, client, what } ) ) );
	return gaps;
}
