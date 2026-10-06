// The handover list (§3.3, shared with Solve): content a draft shows that no block setting could hold, because it lives
// outside the tree. Each entry names its owner, so a follow-up agent knows where to act.

// The five owners come from lib/issue-classes.mjs, the one definition Solve and Fill share.
export { HANDOVER_OWNERS } from './issue-classes.mjs';
import { HANDOVER_OWNERS } from './issue-classes.mjs';

// The row kinds a handover entry can stand for.
export const HANDOVER_KINDS = [ 'text', 'presence', 'link', 'behaviour' ];

// One handover entry: { owner, kind, node, block, slot, evidence, reason }. `evidence` is a walker-style row
// ({ kind, key, draft, width?, ref, path }) holding what the draft shows; `reason` says why no setting can hold it.
// Throws on an owner or kind outside the lists: a handover nobody owns is the failure this list exists to prevent.
export function handoverEntry( { owner, kind, node = null, block = null, slot = '', evidence, reason } ) {
	if ( ! HANDOVER_OWNERS.includes( owner ) ) {
		throw new Error( `handover owner "${ owner }" is not one of ${ HANDOVER_OWNERS.join( ', ' ) }` );
	}
	if ( ! HANDOVER_KINDS.includes( kind ) ) {
		throw new Error( `handover kind "${ kind }" is not one of ${ HANDOVER_KINDS.join( ', ' ) }` );
	}
	if ( ! evidence || 'object' !== typeof evidence ) {
		throw new Error( 'a handover entry carries its evidence row' );
	}
	return { owner, kind, node, block, slot, evidence: { ...evidence, kind: evidence.kind || kind, ref: evidence.ref ?? node, path: evidence.path ?? slot }, reason: String( reason || '' ) };
}

// A skeleton node's declared handover ({ owner, kind, slot?, detail }) checked: the problems, empty when valid.
export function handoverProblems( list, label ) {
	if ( undefined === list ) {
		return [];
	}
	if ( ! Array.isArray( list ) ) {
		return [ `${ label } handover must be a list` ];
	}
	return list.flatMap( ( h, i ) => [
		...( HANDOVER_OWNERS.includes( h?.owner ) ? [] : [ `${ label } handover owner "${ h?.owner }" is not one of ${ HANDOVER_OWNERS.join( ', ' ) }` ] ),
		...( HANDOVER_KINDS.includes( h?.kind ) ? [] : [ `${ label } handover #${ i } kind "${ h?.kind }" is not one of ${ HANDOVER_KINDS.join( ', ' ) }` ] ),
		...( h?.detail && 'string' === typeof h.detail ? [] : [ `${ label } handover #${ i } needs a detail saying what lives outside the tree` ] ),
	] );
}

// Counts per owner, every owner present (zero included), for the report header.
export function handoverCounts( entries ) {
	return Object.fromEntries( HANDOVER_OWNERS.map( ( o ) => [ o, entries.filter( ( e ) => e.owner === o ).length ] ) );
}
