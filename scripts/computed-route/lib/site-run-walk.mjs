// A walk whose live page shows none of the surface is a failed walk, never "ok" (Spec 48 FR-48-55; register A1). The parity
// walker writes `report.json` even when it found nothing to compare: a run's first compared pair is the surface's root, and
// when the live page has no such element the pair's live side is `{ missing: true }` (scripts/parity/draft-live-walk.mjs), and
// every pair below it reads as a presence difference. The walker also exits 1 for open differences, unreviewed shots and live
// console errors; the walk step's result carries those counts, and a live console error fails the step.
import fs from 'fs';

// The runs of a walker report whose live side lacks the surface's root element: [ "<state> at <width>" ]. A run with no compared
// pair (a scroll state with nothing to compare) is no evidence either way.
export function walkAbsence( report ) {
	return ( report?.runs || [] ).filter( ( run ) => {
		const root = Object.entries( run.pairs || {} ).find( ( [ key ] ) => '(state)' !== key )?.[ 1 ];
		return true === root?.live?.missing;
	} ).map( ( run ) => `${ run.state } at ${ run.width }` );
}

// The counts the walker prints, from its report: open differences (rows not accepted), accepted rows, and the live page's
// console errors (`errors[width].live`). `unreviewed` is the "N shots unreviewed" the walker printed in `said`, else 0.
export function walkCounts( report, said = '' ) {
	let open = 0;
	let accepted = 0;
	for ( const run of report?.runs || [] ) {
		for ( const pair of Object.values( run.pairs || {} ) ) {
			for ( const d of pair.diffs || [] ) {
				d.accepted ? accepted++ : open++;
			}
		}
	}
	const live = Object.values( report?.errors || {} ).flatMap( ( e ) => e?.live || [] );
	const first = live[ 0 ];
	return { open, accepted, liveErrors: live.length, firstLiveError: live.length ? String( first?.text ?? first?.message ?? first ).slice( 0, 160 ) : null, unreviewed: Number( /(\d+) shots unreviewed/.exec( said )?.[ 1 ] ?? 0 ) };
}

// The walk step's result: `said` (what the walker printed) with the report's open, unreviewed and live-error counts when the
// report at `file` found the surface's root in every run and the live page logged no console error, else an Error naming the
// runs that did not or the live errors. A missing report file is the walker's own failure and is not judged here.
export function walkVerdict( said, file ) {
	const report = fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null;
	const absent = walkAbsence( report );
	if ( absent.length ) {
		throw new Error( `the live page does not show the surface: its root element is missing in ${ absent.join( ', ' ) } (nothing was built there, or the page does not render it)` );
	}
	if ( ! report ) {
		return said;
	}
	const c = walkCounts( report, said );
	if ( c.liveErrors ) {
		throw new Error( `the live page logged ${ c.liveErrors } console error(s) (first: ${ c.firstLiveError }); ${ c.open } open difference(s), ${ c.unreviewed } unreviewed` );
	}
	return `${ said } [${ c.open } open, ${ c.unreviewed } unreviewed, ${ c.liveErrors } live errors]`;
}
