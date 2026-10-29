// A walk whose live page shows none of the surface is a failed walk, never "ok" (Spec 48 FR-48-55; register A1). The parity
// walker writes `report.json` even when it found nothing to compare: a run's first compared pair is the surface's root, and
// when the live page has no such element the pair's live side is `{ missing: true }` (scripts/parity/draft-live-walk.mjs), and
// every pair below it reads as a presence difference. site-run.mjs read only the walker's exit status, so a surface that was
// built but never rendered (a modal no page opens, a template the page does not use) passed its walk.
import fs from 'fs';

// The runs of a walker report whose live side lacks the surface's root element: [ "<state> at <width>" ]. A run with no compared
// pair (a scroll state with nothing to compare) is no evidence either way.
export function walkAbsence( report ) {
	return ( report?.runs || [] ).filter( ( run ) => {
		const root = Object.entries( run.pairs || {} ).find( ( [ key ] ) => '(state)' !== key )?.[ 1 ];
		return true === root?.live?.missing;
	} ).map( ( run ) => `${ run.state } at ${ run.width }` );
}

// The walk step's result: `said` (what the walker printed) when the report at `file` found the surface's root in every run, else
// an Error naming the runs that did not (a failed walk). A missing report file is the walker's own failure and is not judged here.
export function walkVerdict( said, file ) {
	const absent = fs.existsSync( file ) ? walkAbsence( JSON.parse( fs.readFileSync( file, 'utf8' ) ) ) : [];
	if ( absent.length ) {
		throw new Error( `the live page does not show the surface: its root element is missing in ${ absent.join( ', ' ) } (nothing was built there, or the page does not render it)` );
	}
	return said;
}
