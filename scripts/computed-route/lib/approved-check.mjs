// One Bean approval measured against the rows the skeleton rules propose now (Spec 48 FR-48-6, FR-48-7;
// check-approved.mjs prints the totals). An approval names a template element, so it is checked against every copy of that
// element (each copy of a loop's item): a copy that disagrees is reported with its own key.
import { resolveApproval } from './approved-identity.mjs';

const NOT_BUILT = [ 'remove', 'absorbed', 'unwrap' ];

// What an approved outcome asks for: { kind: 'removed' }, { kind: 'setting' } or { kind: 'block', block, notLinked, source }.
export function wanted( text ) {
	const t = String( text || '' );
	if ( /^(remove|absorbed)/i.test( t ) ) {
		return { kind: 'removed' };
	}
	const block = /sgs\/[a-z0-9-]+/.exec( t )?.[ 0 ];
	// "link source 'back to top'" is the source `top`; "link source directions = …" is `directions`.
	const phrase = /link source (?:'|")?([a-z][a-z ]*?)(?:'|"|\s=|\s\(|,|\)|$)/i.exec( t )?.[ 1 ]?.toLowerCase().trim() || null;
	const source = { 'back to top': 'top' }[ phrase ] || phrase;
	return block ? { kind: 'block', block, notLinked: /\bnot linked\b/i.test( t ), source } : { kind: 'setting' };
}

const linkOf = ( a = {} ) => a.sgsBlockLink || a.sgsBlockLinkSource || a.url || a.linkSource || null;

// null when the row agrees with `want`, otherwise the mismatch line (without the batch).
function disagreement( r, want, rows ) {
	const intoBlock = 'absorbed' === r.action && r.into ? rows[ `skeleton:${ r.surface }:${ r.into }` ]?.block : null;
	const got = NOT_BUILT.includes( r.action ) ? 'removed' : r.block;
	let ok = 'removed' === want.kind ? 'removed' === got : got === want.block || intoBlock === want.block;
	let why = '';
	if ( ok && 'block' === want.kind && want.notLinked && linkOf( r.attributes ) ) {
		ok = false;
		why = ` (approved "not linked", proposed link ${ linkOf( r.attributes ) })`;
	}
	if ( ok && 'block' === want.kind && want.source && ! [ r.attributes?.linkSource, r.attributes?.sgsBlockLinkSource ].includes( want.source ) ) {
		ok = false;
		why = ` (approved link source ${ want.source })`;
	}
	return ok ? null : `${ r.surface }:${ r.key } <${ r.tag }> want ${ 'removed' === want.kind ? 'removed' : want.block } got ${ got } [${ r.rule || 'score' }]${ why }`;
}

// ctx: { rows: { [rowId]: row (with surface and built) }, fingerprints }. Returns one of
//   { refused: why }, { noRow: true }, { settled: true } (a client-built post settles it), { setting: true },
//   { match: true } (every copy agrees) or { mismatches: [ line ] } (each copy that disagrees);
// each also carries `how` / `to` from resolveApproval.
export function checkApproval( approval, ctx ) {
	const found = resolveApproval( approval, ctx );
	if ( found.refused ) {
		return { refused: found.refused };
	}
	const meta = { how: found.how, to: found.to };
	if ( ! found.row ) {
		return { ...meta, noRow: true };
	}
	const r = found.row;
	if ( r.built && 'clientBuiltSurface' === r.rule ) {
		return { ...meta, settled: true };
	}
	const want = wanted( approval.approvedBlock );
	if ( 'setting' === want.kind ) {
		return { ...meta, setting: true };
	}
	const mismatches = ( found.copies?.length ? found.copies : [ r ] ).filter( ( c ) => ! ( c.built && 'clientBuiltSurface' === c.rule ) ).map( ( c ) => disagreement( c, want, ctx.rows ) ).filter( Boolean );
	return mismatches.length ? { ...meta, mismatches } : { ...meta, match: true };
}
