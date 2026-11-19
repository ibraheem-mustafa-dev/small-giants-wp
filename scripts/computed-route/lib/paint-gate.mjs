// A run stops before it writes when a block its tree uses has no default paint on the run's site. Without one, the block's
// calibration (lib/cache.mjs::loadCalibration) carries `paintMissing` and `elements: {}`, and every reader downstream would
// judge the block against nothing and write wrong settings without a word. Fill (fill.mjs::fillSurface), Solve
// (solve.mjs), the applier (apply.mjs) and the skeleton proposal (skeleton.mjs::proposeSurface,
// lib/skeleton-rerun.mjs::rerunSkeletons) call assertPaints once the tree's blocks are known. A block the tree does not use
// never stops a run, and a block with no slot map at all (a core block, an uncalibrated one) is not a paint gap.
import { walk } from './tree.mjs';

// Every block name a tree ({ name, innerBlocks } nodes) uses, each once, in first-seen order.
export function treeBlocks( tree ) {
	const out = new Set();
	walk( Array.isArray( tree ) ? tree : [], ( n ) => n?.name && out.add( n.name ) );
	return [ ...out ];
}

// The blocks of `blocks` whose calibration (`calFor( block )`) carries `paintMissing`, each once, sorted.
export const paintGaps = ( blocks, calFor ) => [ ...new Set( blocks ) ].filter( ( b ) => calFor( b )?.paintMissing ).sort();

// The stop message: the blocks and the one command that measures their paint on `site`.
export const paintGapMessage = ( { gaps, site, client = null, what = 'this run' } ) =>
	`${ what } stops before writing: ${ gaps.length } block${ 1 === gaps.length ? '' : 's' } in its tree ha${ 1 === gaps.length ? 's' : 've' } no default paint for ${ site } (${ gaps.join( ', ' ) }), so every setting written for ${ 1 === gaps.length ? 'it' : 'them' } would be judged against nothing. Measure ${ 1 === gaps.length ? 'it' : 'them' } first: node scripts/computed-route/calibrate.mjs --site ${ site } --client ${ client || '<client slug>' } --blocks ${ gaps.join( ',' ) }`;

// Throws paintGapMessage when any block of `blocks` has no default paint on `site`. A run with no site reads no paint by
// design (loadCalibration( dir, block, null ), the census tools), so it is never stopped here.
export function assertPaints( { blocks, calFor, site, client = null, what } ) {
	if ( ! site ) {
		return;
	}
	const gaps = paintGaps( blocks, calFor );
	if ( gaps.length ) {
		throw new Error( paintGapMessage( { gaps, site, client, what } ) );
	}
}
