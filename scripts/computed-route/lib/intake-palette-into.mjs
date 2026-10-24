// `intake.mjs --palette-only <client> --into-intake` (Spec 48 FR-48-31): the new palette proposal put where the marking
// path reads it. intake.json's palette block is replaced (a client with no intake.json gets a minimal one holding only
// the palette block, its `paletteOnly` header saying so), and review.md's palette-role section is regenerated (a client
// with no review.md gets one holding only that section). An existing mark is kept only when the slugs it names equal
// the new proposal's for that token (`accept` names the old proposal's roles, `role:a,b` those slugs, `one-off` none),
// or when that token's proposal is unchanged (the same slugs as before), so an override Bean made stands.
// A mark is read from review.md's Mark cell, else its ticked palette Accept all, else intake.json's applied review
// entry. Only an applied mark stays in intake.json's review; a mark written in review.md but not yet applied stays in
// review.md's Mark cell. No mark is ever added.
import { parseReview, renderReview, reviewRows } from './intake-review.mjs';

const SECTION = '## Palette roles (palette-role)';
export const PALETTE_ONLY_NOTE = 'this intake.json holds only the palette block (intake.mjs --palette-only --into-intake); run the full intake for the other stages';

// The slugs a palette row proposes: its roles, else its one role, else none.
export const rowRoles = ( r ) => ( r?.roles?.length ? [ ...r.roles ] : r?.role ? [ r.role ] : [] );

// The slugs a mark names on a row (null when it names none that can be compared: an unknown mark or `accept` on a
// token the old record had no row for).
export function markRoles( mark, oldRow ) {
	if ( 'one-off' === mark ) {
		return [];
	}
	if ( 'accept' === mark ) {
		return oldRow ? rowRoles( oldRow ) : null;
	}
	const m = /^role:(.+)$/.exec( mark || '' );
	return m ? m[ 1 ].split( ',' ).map( ( s ) => s.trim() ) : null;
}

const sameSet = ( a, b ) => !! a && !! b && a.length === b.length && [ ...a ].sort().join( '\u0000' ) === [ ...b ].sort().join( '\u0000' );

// The palette-role section of a review.md text: { start, end } line indexes (end exclusive), or null.
function sectionAt( lines ) {
	const start = lines.findIndex( ( l ) => l.trim() === SECTION );
	if ( start < 0 ) {
		return null;
	}
	let end = lines.findIndex( ( l, i ) => i > start && /^##\s/.test( l ) && ! /^###/.test( l ) );
	end = end < 0 ? lines.length : end;
	while ( end > start + 1 && '' === lines[ end - 1 ].trim() ) {
		end--;
	}
	return { start, end };
}

// { intake, reviewMd, created, kept: [rowId], dropped: [{ rowId, mark, named, proposed }] } from the current intake
// record (or null), the current review.md text (or null) and the new palette block.
export function intoIntake( { intake = null, reviewMd = null, palette, client, takenOn } ) {
	const created = ! intake;
	const parsed = reviewMd ? parseReview( reviewMd ) : null;
	const ticked = !! parsed?.sections[ 'palette-role' ]?.acceptAll;
	const applied = new Map( ( intake?.review || [] ).filter( ( r ) => 'palette-role' === r.rowType ).map( ( r ) => [ r.rowId, r ] ) );
	const oldRows = new Map( ( intake?.palette?.rows || [] ).map( ( r ) => [ r.token, r ] ) );
	const markOf = ( id ) => parsed?.rowMarks[ id ] ?? ( ticked && 'palette-role' === parsed.rowSection[ id ] ? 'accept' : null ) ?? applied.get( id )?.mark ?? null;
	const next = created ? { schemaVersion: '1', client, takenOn, paletteOnly: { note: PALETTE_ONLY_NOTE }, palette, review: [] } : { ...intake, palette };
	const rows = reviewRows( { palette } );
	const kept = [];
	const dropped = [];
	const review = ( next.review || [] ).filter( ( r ) => 'palette-role' !== r.rowType );
	const shown = [ ...review ];
	rows.forEach( ( rr, i ) => {
		const mark = markOf( rr.rowId );
		if ( ! mark ) {
			return;
		}
		const row = palette.rows[ i ];
		const named = markRoles( mark, oldRows.get( row.token ) );
		const unchanged = oldRows.has( row.token ) && sameSet( rowRoles( oldRows.get( row.token ) ), rowRoles( row ) );
		if ( ! unchanged && ! sameSet( named, rowRoles( row ) ) ) {
			dropped.push( { rowId: rr.rowId, mark, named, proposed: rowRoles( row ) } );
			return;
		}
		kept.push( rr.rowId );
		const prior = applied.get( rr.rowId );
		const entry = { rowId: rr.rowId, rowType: 'palette-role', contentHash: rr.contentHash, mark };
		if ( prior?.mark === mark ) {
			review.push( { ...entry, markedOn: prior.markedOn ?? null, carriedFrom: prior.carriedFrom ?? null } );
		}
		shown.push( entry );
	} );
	next.review = review;
	const fresh = renderReview( { ...next, review: shown }, { changed: [] } );
	let md;
	if ( ! reviewMd ) {
		md = fresh;
	} else {
		const freshLines = fresh.split( '\n' );
		const f = sectionAt( freshLines );
		const section = f ? freshLines.slice( f.start, f.end ) : [];
		const lines = reviewMd.split( /\r?\n/ );
		const at = sectionAt( lines );
		if ( at ) {
			lines.splice( at.start, at.end - at.start, ...section );
		} else {
			const after = lines.findIndex( ( l ) => /^## .*\((site-info|flag|draft-defect|not-a-defect|missing-feature|effect|skeleton-block|inventory-diff|notice)\)\s*$/.test( l ) );
			lines.splice( after < 0 ? lines.length : after, 0, ...section, '' );
		}
		md = lines.join( '\n' );
	}
	return { intake: next, reviewMd: md, created, kept, dropped };
}
