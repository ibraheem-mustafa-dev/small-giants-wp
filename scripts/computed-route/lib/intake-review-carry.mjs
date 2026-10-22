// Marks Bean wrote in review.md that were never applied to intake.json (`intake.mjs --apply-review`), kept across a
// re-run (Spec 48 FR-48-17). A re-run carries marks from the previous intake.json's review rows (intake-review.mjs::
// carryOver), so without this step every mark that lives only in review.md is lost when the run rewrites the file.
import fs from 'fs';
import { parseReview, markProblem, isoDay } from './intake-review.mjs';

// The previous intake with each unmarked review row given the mark review.md holds for it (dated `markedOn`, the day
// the file was last written), so carryOver keeps it while the row's content hash holds. Only a mark --apply-review
// would accept is carried: one on a row listed in its own section, of a value its row type takes; a line review.md
// cannot read carries nothing, and every other row's mark still carries. Returns { intake, carried: [rowIds],
// refused: [ 'rowId: why' ], acceptAll: [section row types whose Accept all box is ticked] }; an Accept all tick is
// section-wide and has no row of its own to carry, so the caller reports it, as it does the refused marks.
export function withUnappliedMarks( previous, markdown, { day = isoDay() } = {} ) {
	const out = { intake: previous, carried: [], refused: [], acceptAll: [] };
	if ( ! previous || 'string' !== typeof markdown ) {
		return out;
	}
	const parsed = parseReview( markdown );
	out.acceptAll = Object.entries( parsed.sections ).filter( ( [ , s ] ) => s.acceptAll ).map( ( [ t ] ) => t );
	const review = ( previous.review || [] ).map( ( r ) => {
		const mark = parsed.rowMarks[ r.rowId ];
		if ( null !== r.mark || ! mark ) {
			return r;
		}
		const why = parsed.rowSection[ r.rowId ] !== r.rowType ? `listed in the ${ parsed.rowSection[ r.rowId ] } section, but it is a ${ r.rowType } row` : markProblem( r.rowType, mark );
		if ( why ) {
			out.refused.push( `${ r.rowId }: mark "${ mark }" not carried (${ why })` );
			return r;
		}
		out.carried.push( r.rowId );
		return { ...r, mark, markedOn: day };
	} );
	out.intake = { ...previous, review };
	return out;
}

// The confirmed page map (`--apply-review` writes it, with `confirmedFile` beside it as the record that Bean confirmed
// it; later steps add each page's WordPress ID to it). A plain run writes the proposed map only while no confirmed one
// exists, so it never overwrites a map Bean confirmed. `files`: { pageMap, confirmed }. Returns { written: boolean }.
export function writeProposedPageMap( files, text ) {
	if ( fs.existsSync( files.pageMap ) && fs.existsSync( files.confirmed ) ) {
		return { written: false };
	}
	fs.writeFileSync( files.pageMap, text );
	return { written: true };
}

// Writes the confirmed map and the record that it is confirmed (`--apply-review`, the one step that replaces it).
export function writeConfirmedPageMap( files, text, today = isoDay() ) {
	fs.writeFileSync( files.pageMap, text );
	fs.writeFileSync( files.confirmed, `${ JSON.stringify( { confirmedOn: today }, null, 2 ) }\n` );
}
