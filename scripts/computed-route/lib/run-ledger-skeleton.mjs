// The skeleton stage's run ledger rows (lib/run-ledger.mjs): what the proposal did with each painted draft element that no node
// carries on to Fill, one row per property the inventory records the element painting, and the element kind a node's block
// prints where it is not the draft's. Read from the proposal's own decisions (each row's action, `into`, `parts`, `conserve`
// and `rule`) after skeleton.mjs::proposeSurface has written the proposal and the skeleton. Pure.
//   absorbed into a block whose part pairing refused the element (lib/skeleton-part-pairing.mjs::unpairedRecords, a
//     `conserve` record of kind `unpaired`): outcome absorbed, into the host block, reason naming the candidates;
//   absorbed by a rule (marquee, slider, heroBackdrop, navigation, blockPartOpener ...) or drawn as a part of a row's block
//     (`parts`) with no slot naming it: outcome absorbed, into the host block, reason the rule and that no part reads it;
//   unwrapped, removed, unresolved or kept with no node naming it: outcome dropped, reason the action and rule;
//   no proposal row at all: outcome dropped, reason that the proposal holds no row for it;
//   a node's draft element (its draftRef or a draftSlots finder) whose tag is not the tag the block prints at that part
//     (its calibrated default paint's `_tag`): property `tag`, outcome passed-on with the block's tag.
import { namedElements, paintedProperties, runRow } from './run-ledger.mjs';

const record = ( surface, section, match ) => ( { file: `skeleton/${ surface }.proposal.json`, section, match } );
const widthsOf = ( e ) => Object.entries( e?.resolved || {} ).filter( ( [ , v ] ) => v && 'object' === typeof v ).map( ( [ w ] ) => Number( w ) );
const valueOf = ( e, p ) => {
	const at = Object.entries( e?.resolved || {} ).filter( ( [ , v ] ) => v && undefined !== v[ p ] );
	const vals = [ ...new Set( at.map( ( [ , v ] ) => v[ p ] ) ) ];
	return 1 === vals.length ? vals[ 0 ] : Object.fromEntries( at.map( ( [ w, v ] ) => [ w, v[ p ] ] ) );
};

// The outcome of one element the skeleton does not carry: { section, outcome }.
export function dropOutcome( row, rows, partOwner ) {
	const host = ( key ) => rows.get( key )?.block ?? null;
	if ( ! row ) {
		return partOwner
			? { section: 'parts', outcome: { kind: 'absorbed', into: partOwner.block ?? null, reason: `drawn as a part of ${ partOwner.block ?? 'its row' } (${ partOwner.key }'s parts) and no slot of that block names it, so Fill never reads its look` } }
			: { section: 'rows', outcome: { kind: 'dropped', reason: 'the proposal holds no row for this element and no node names it' } };
	}
	const unpaired = [].concat( row.conserve || [] ).find( ( c ) => 'unpaired' === c?.kind );
	if ( unpaired ) {
		return { section: 'conserve', outcome: { kind: 'absorbed', into: unpaired.block, reason: `the part pairing refused it: ${ unpaired.why || `several parts of ${ unpaired.block } fit it (${ ( unpaired.candidates || [] ).join( ' | ' ) })` }, so no slot reads its look` } };
	}
	if ( 'absorbed' === row.action ) {
		const rec = [].concat( row.conserve || [] )[ 0 ];
		return { section: 'rows', outcome: { kind: 'absorbed', into: host( row.into ) ?? row.into ?? null, reason: `${ row.rule ? `rule ${ row.rule }` : 'absorbed' }: ${ rec ? `recorded ${ rec.kind }` : 'no part of the block names it' }, so Fill never reads its look` } };
	}
	const why = { unwrap: 'unwrapped', remove: 'removed', unresolved: 'no block fits it' }[ row.action ] ?? 'kept, but no node names it';
	return { section: 'rows', outcome: { kind: 'dropped', reason: `${ why }${ row.rule ? ` (rule ${ row.rule })` : '' }${ row.reason ? `: ${ String( row.reason ).slice( 0, 160 ) }` : '' }` } };
}

// The skeleton rows of one surface. inventory, proposal, skeleton: the stage's records; calTags( block ) -> { slot: tag }
// (lib/skeleton-context.mjs::calTagsFor), or null to write no tag rows.
export function skeletonRunRows( { surface, inventory, proposal, skeleton, calTags = null } ) {
	const out = [];
	const rows = new Map( ( proposal?.rows || [] ).map( ( r ) => [ r.key, r ] ) );
	const partOwner = new Map( ( proposal?.rows || [] ).flatMap( ( r ) => ( r.parts || [] ).map( ( k ) => [ k, r ] ) ) );
	const carried = namedElements( skeleton, null );
	for ( const e of inventory?.elements || [] ) {
		if ( carried.has( e.key ) ) {
			continue;
		}
		const props = paintedProperties( e );
		const { section, outcome } = dropOutcome( rows.get( e.key ), rows, partOwner.get( e.key ) );
		props.forEach( ( p ) => out.push( runRow( { draftKey: e.key, property: p, widths: widthsOf( e ), draft: valueOf( e, p ), stage: 'skeleton', outcome, record: record( surface, section, { key: e.key } ) } ) ) );
	}
	if ( calTags ) {
		const byKey = new Map( ( inventory?.elements || [] ).map( ( e ) => [ e.key, e ] ) );
		const walk = ( list ) => ( list || [] ).forEach( ( n ) => {
			const tags = calTags( n.name ) || {};
			for ( const [ part, f ] of [ [ '', n.draftRef ], ...Object.entries( n.draftSlots || {} ) ] ) {
				const e = byKey.get( f?.tpl );
				const printed = tags[ part ];
				if ( e && printed && String( printed ).toLowerCase() !== String( e.tag ).toLowerCase() ) {
					out.push( runRow( { draftKey: e.key, part, property: 'tag', widths: widthsOf( e ), draft: e.tag, stage: 'skeleton', outcome: { kind: 'passed-on', value: printed, reason: `${ n.name } prints ${ printed } at ${ part || 'its root' } (its calibrated default paint)` }, record: record( surface, 'skeleton', { key: e.key, block: n.name, part } ) } ) );
				}
			}
			walk( n.innerBlocks );
		} );
		walk( Array.isArray( skeleton ) ? skeleton : [ skeleton ] );
	}
	return out;
}
