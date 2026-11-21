// The verify stage's judge from the run ledger file (lib/run-ledger.mjs): for one live difference, the stage that lost the look
// is read from the rows the stages wrote for it, instead of re-derived from their records (lib/ledger-stage.mjs::stageOf).
// A look is matched by its node, part, property and state (Fill and later rows), else by its draft element, property and
// state (skeleton rows); a row of a shorthand matches its longhands and the other way round. Box keys (x, y, w, h) are passed
// on by Fill and judged by the comparison, so the run file gives no stage for them. Pure.
import { longhandsOf } from './css-families.mjs';

const BOX = [ 'x', 'y', 'w', 'h' ];
const ORDER = [ 'skeleton', 'fill', 'build', 'apply' ];
const bare = ( p ) => String( p ?? '' ).replace( /^::?[a-z-]+ /, '' );
const family = ( p ) => new Set( [ bare( p ), ...longhandsOf( bare( p ) ) ] );

// An index of the run rows: { byNode: Map( `${ node }|${ part }|${ state }` -> rows ), byKey: Map( `${ draftKey }|${ state }` -> rows ) }.
export function runIndex( rows ) {
	const byNode = new Map();
	const byKey = new Map();
	const push = ( m, k, r ) => ( m.get( k ) || m.set( k, [] ).get( k ) ).push( r );
	for ( const r of rows || [] ) {
		r.node && push( byNode, `${ r.node }|${ r.part || '' }|${ r.state || 'rest' }`, r );
		r.draftKey && push( byKey, `${ r.draftKey }|${ r.state || 'rest' }`, r );
	}
	return { byNode, byKey };
}

// The run rows of one difference: { ref, slot, draftKey, key (the property), state }.
export function rowsForDiff( index, d ) {
	const want = family( d.key );
	const hit = ( r ) => [ ...family( r.property ) ].some( ( p ) => want.has( p ) );
	const state = d.state || 'rest';
	const own = ( index.byNode.get( `${ d.ref }|${ d.slot || '' }|${ state }` ) || [] ).filter( hit );
	const skel = ( index.byKey.get( `${ d.draftKey }|${ state }` ) || [] ).filter( ( r ) => 'skeleton' === r.stage && hit( r ) );
	return [ ...skel, ...own ].sort( ( a, b ) => ORDER.indexOf( a.stage ) - ORDER.indexOf( b.stage ) );
}

// The ledger stage (lib/ledger-stage.mjs::STAGES) the run rows of a difference name, with the deciding row; null when the run
// file holds no row that decides it (a box key, or no row at all).
export function stageFromRun( rows, key ) {
	if ( BOX.includes( key ) || ! rows.length ) {
		return null;
	}
	const of = ( stage, kinds ) => rows.find( ( r ) => r.stage === stage && kinds.includes( r.outcome?.kind ) );
	const skel = of( 'skeleton', [ 'dropped', 'absorbed' ] );
	if ( skel ) {
		return { stage: 'absorbed' === skel.outcome.kind ? 'other-block' : 'no-node', row: skel };
	}
	const written = of( 'fill', [ 'written' ] );
	const css = of( 'fill', [ 'custom-css' ] );
	if ( written || css ) {
		const lost = of( 'build', [ 'dropped' ] );
		if ( lost ) {
			return { stage: 'written-not-built', row: lost };
		}
		const failed = of( 'apply', [ 'dropped' ] );
		if ( failed ) {
			return { stage: 'apply-failed', row: failed };
		}
		return written ? { stage: 'block-render', row: written } : { stage: 'custom-css', row: css };
	}
	for ( const [ kind, stage ] of [ [ 'judged-equal', 'judged-equal' ], [ 'dropped', 'unmapped' ], [ 'unread', 'not-read-by-fill' ], [ 'passed-on', 'content' ] ] ) {
		const r = of( 'fill', [ kind ] );
		if ( r ) {
			return { stage, row: r };
		}
	}
	return null;
}

// The comparison of the run file's stage with the re-derived one over a ledger's raw rows ({ stage, runStage }):
// { judged, fromRun, agree, differ: { `${ derived } -> ${ run }`: count }, noRow }.
export function compareStages( raw ) {
	const out = { judged: raw.length, fromRun: 0, agree: 0, differ: {}, noRow: 0 };
	for ( const r of raw ) {
		if ( ! r.runStage ) {
			out.noRow++;
			continue;
		}
		out.fromRun++;
		if ( r.runStage === r.derivedStage ) {
			out.agree++;
		} else {
			const k = `${ r.derivedStage } -> ${ r.runStage }`;
			out.differ[ k ] = ( out.differ[ k ] || 0 ) + 1;
		}
	}
	return out;
}
