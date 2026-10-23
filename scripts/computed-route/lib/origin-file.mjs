// The export an origin file belongs to (Spec 48 FR-48-10 item 3). A `<surface>.origin.json` names each block's draft
// element by the runtime's tpl numbers, which a new export renumbers, so every entry carries the draft hash of the export
// it was derived from (`draft`): the hash of every `.dc.html` template the handoff's MANIFEST.json lists. Pairing refuses
// an origin whose entries name another export's hash. An entry written without one (an origin from before the stamp)
// is unstamped: reported, never trusted as current.
import crypto from 'crypto';
import fs from 'fs';

// The draft hash of a handoff manifest: sha256 over every `.dc.html` file's path and sha256, in path order. null when
// the manifest lists no template.
export function draftHashOf( manifest ) {
	const drafts = ( manifest?.files || [] ).filter( ( f ) => /\.dc\.html$/.test( f?.path || '' ) ).map( ( f ) => `${ f.path }\t${ f.sha256 }` ).sort();
	return drafts.length ? crypto.createHash( 'sha256' ).update( drafts.join( '\n' ) ).digest( 'hex' ).slice( 0, 16 ) : null;
}

// The origin with every entry stamped with the draft hash. The input is not changed.
export const stampOrigin = ( origin, hash ) => Object.fromEntries( Object.entries( origin ).map( ( [ ref, o ] ) => [ ref, { ...o, draft: hash } ] ) );

// Whether an origin belongs to the current export. Returns { ok, stamped, why }: ok false when any entry names another
// hash (or the current manifest names none), stamped false when no entry carries a hash (ok then, with why saying so).
export function originVerdict( origin, hash ) {
	const marks = [ ...new Set( Object.values( origin || {} ).map( ( o ) => o?.draft ?? null ) ) ];
	if ( ! hash ) {
		const stamped = marks.some( Boolean );
		return { ok: ! stamped, stamped, why: `the handoff MANIFEST.json lists no .dc.html template, so ${ stamped ? 'a stamped origin cannot be checked against it' : 'the origin\'s export is not checked' }` };
	}
	const stale = marks.filter( ( m ) => m && m !== hash );
	if ( stale.length ) {
		return { ok: false, stamped: true, why: `the origin was derived from another export (draft hash ${ stale.join( ', ' ) }; MANIFEST.json gives ${ hash }): re-derive it (origin.mjs or a Fill run)` };
	}
	if ( marks.includes( null ) ) {
		return { ok: true, stamped: marks.some( Boolean ), why: 'some entries carry no draft hash (written before the stamp): their export is not checked' };
	}
	return { ok: true, stamped: true, why: null };
}

// Reads an origin file and checks it against the handoff's MANIFEST.json. Throws when the origin is from another export
// (originVerdict). Returns { origin, verdict }.
export function readOrigin( originFile, manifestFile ) {
	const origin = JSON.parse( fs.readFileSync( originFile, 'utf8' ) );
	const manifest = fs.existsSync( manifestFile ) ? JSON.parse( fs.readFileSync( manifestFile, 'utf8' ) ) : null;
	const verdict = originVerdict( origin, draftHashOf( manifest ) );
	if ( ! verdict.ok ) {
		throw new Error( `${ originFile }: ${ verdict.why }` );
	}
	return { origin, verdict };
}
