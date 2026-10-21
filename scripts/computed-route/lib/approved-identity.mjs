// Which proposed row a Bean approval (sites/<client>/build/intake/approved-decisions.json) still names. An approval's
// `rowId` is `skeleton:<surface>:<instance key>`; a re-export that renumbers the template points the same key at another
// element. An approval that carries a `fingerprint` is checked against the element the key names now: when it agrees the
// approval holds; when the key names no row or a different element, the approval is realigned to the element whose
// fingerprint agrees, or refused. An approval is never matched to a row it disagrees with.
import { withCopy, copylessKey } from './fact-key.mjs';
import { fingerprintDiff } from './identity.mjs';

const ROW = /^(skeleton:([^:]+):)(.+)$/;

// rows: { [rowId]: row }; fingerprints: { [surface]: { [instance key]: fingerprint } }.
// Returns { row, copies, how: 'exact' | 'realigned' | 'unchecked' } or { refused: why } or { row: null } when no row is named
// and the approval has no fingerprint to realign by. `copies` is every row of the same template element as `row` (each
// copy of a loop's item, `row` among them), because an approval names the template element, not one copy. `how` is
// 'exact' only when the approval carries a fingerprint and the named element has a current one that agrees; with either
// missing (or a row id that is not a skeleton row) nothing was compared and `how` is 'unchecked'.
export function resolveApproval( { rowId, fingerprint = null }, { rows, fingerprints = {} } ) {
	const m = ROW.exec( rowId );
	const [ prefix, surface, key ] = m ? [ m[ 1 ], m[ 2 ], m[ 3 ] ] : [ '', '', rowId ];
	const named = [ rowId, `${ prefix }${ withCopy( key, 0 ) }`, `${ rowId }#0` ].find( ( id ) => rows[ id ] );
	const now = fingerprints[ surface ] || {};
	const copiesOf = ( id ) => {
		const base = copylessKey( id.slice( prefix.length ) );
		return base ? Object.keys( rows ).filter( ( other ) => other.startsWith( prefix ) && copylessKey( other.slice( prefix.length ) ) === base ).map( ( other ) => rows[ other ] ) : [ rows[ id ] ];
	};
	const current = named ? now[ named.slice( prefix.length ) ] : null;
	if ( named && ( ! fingerprint || ! current ) ) {
		return { row: rows[ named ], copies: copiesOf( named ), how: 'unchecked' };
	}
	if ( named ) {
		const bad = fingerprintDiff( fingerprint, current, [ 'line' ] );
		if ( ! bad.length ) {
			return { row: rows[ named ], copies: copiesOf( named ), how: 'exact' };
		}
	}
	if ( ! fingerprint ) {
		return { row: null };
	}
	// One approval is not a whole previous export, so it is realigned only to the single element every carried field
	// (the source line apart) agrees with; none or several refuse it.
	const agreeing = Object.keys( now ).filter( ( k ) => rows[ `${ prefix }${ k }` ] && ! fingerprintDiff( fingerprint, now[ k ], [ 'line' ] ).length );
	if ( 1 === agreeing.length ) {
		return { row: rows[ `${ prefix }${ agreeing[ 0 ] }` ], copies: copiesOf( `${ prefix }${ agreeing[ 0 ] }` ), how: 'realigned', to: agreeing[ 0 ] };
	}
	return { refused: agreeing.length ? `${ agreeing.length } elements of the new export agree with it (${ agreeing.slice( 0, 3 ).join( ', ' ) })` : `no element of the new export agrees with it (key ${ key })` };
}
