// The site check's openers, modals and walks (Spec 48 FR-48-95):
// - every `sgs_modal` row of the page map is rendered by some checked page as a frame whose anchor is the row's slug and whose
//   dialog is named by the row's title (the referenced post's title names the dialog, so a frame whose post is missing is no
//   match), as lib/site-check-parts.mjs::missingFlowRows asks of choice flows;
// - a link on a page to the anchor of a modal or flow row opens something: the page holds a frame with that anchor, else the
//   link is a dead opener and fails, as does a link to any other anchor that no frame and no element of the page holds;
// - a parity walk whose live element is absent (the surface's root, shown by the draft, never found on the live page in a run)
//   fails instead of passing (site-run.mjs's walk step); a run the walker refused is one open `(state)` row of the report, named in
//   the walk step's detail, and never a failed walk (Spec 48 section 3.6 item 20), unless the walk refused every run: it then
//   measured nothing, and fails (`walkUnmeasured`).
import fs from 'fs';
import { OPENABLE } from './intake-pagemap-openers.mjs';

// In-page: the in-page anchors the page's links and modal-open controls point at, the anchors of the frames it holds, and
// `present`, the linked anchors some element of the page carries as its id or name, as written or percent-decoded (where the browser scrolls a link to).
export function openersInPage() {
	const links = [ ...new Set( [ ...document.querySelectorAll( 'a[href^="#"], [data-sgs-modal-open]' ) ].map( ( a ) => a.getAttribute( 'data-sgs-modal-open' ) || ( a.getAttribute( 'href' ) || '' ).slice( 1 ) ).filter( Boolean ) ) ];
	const frames = [ ...document.querySelectorAll( 'dialog.sgs-modal__dialog' ) ].map( ( d ) => d.parentElement?.id || '' ).filter( Boolean );
	// A browser looks a fragment up as written, then percent-decoded: #caf%C3%A9 reaches the id café. A malformed escape stays as written.
	const decoded = ( a ) => {
		try {
			return decodeURIComponent( a );
		} catch ( e ) {
			return a;
		}
	};
	const holds = ( a ) => document.getElementById( a ) || document.getElementsByName( a ).length;
	const present = links.filter( ( a ) => holds( a ) || ( decoded( a ) !== a && holds( decoded( a ) ) ) );
	return { links, frames: [ ...new Set( frames ) ], present };
}

// The fragment the HTML standard scrolls to the top of the page with no element of that id.
const TOP = 'top';

// The sgs_modal rows no checked page renders with their post: [row]. modals: lib/site-check-parts.mjs::readPartsInPage's
// modals of every checked page ({ anchor, label }).
export function missingModalRows( rows, modals ) {
	return rows.filter( ( r ) => 'sgs_modal' === r.postType ).filter( ( r ) => ! modals.some( ( m ) => m.anchor === r.slug && String( m.label || '' ).toLowerCase() === String( r.title || '' ).toLowerCase() ) );
}

// The failed items for a page's dead in-page links: a link to a modal or flow row's anchor that no frame on the page holds,
// and a link to any other anchor that neither a frame nor an element of the page carries (a link to a frame whose post no
// page-map row names, such as #modal-missing, opens nothing); `#top` scrolls to the top with no element. page: { key, url,
// links, frames, present } (openersInPage's answer with the page's key and address); a page read without `present` is
// checked for row anchors only.
export function deadOpeners( rows, page ) {
	const targets = new Map( rows.filter( ( r ) => [ 'modal', 'flow' ].includes( OPENABLE[ r.postType ] ) ).map( ( r ) => [ r.slug, r ] ) );
	const frames = page.frames || [];
	const present = Array.isArray( page.present ) ? page.present : null;
	return ( page.links || [] ).filter( ( a ) => ! frames.includes( a ) && ( targets.has( a ) || ( present && TOP !== a && ! present.includes( a ) ) ) )
		.map( ( a ) => ( { status: 'fail', subject: `opener #${ a } on ${ page.key }`, url: page.url, error: targets.has( a ) ? `a link opens the ${ OPENABLE[ targets.get( a ).postType ] } ${ a }, and the page holds no frame with that anchor` : `a link points at #${ a }, and the page holds no frame with that anchor and no element with that id or name` } ) );
}

// The runs the walker refused (a side never reached its page's rest, lib/state-rest.mjs::unmeasuredRun: `run.refused`, its
// only pair the open `(state)` row `not-at-rest`), as "<state> @ <width> (<why>)" lines. They measured nothing and stay open
// rows in the report; they are not failures of the walk.
export function refusedRuns( report ) {
	return ( report?.runs || [] ).filter( ( run ) => run.refused ).map( ( run ) => {
		const why = [ run.refused.draft && `draft ${ run.refused.draft }`, run.refused.live && `live ${ run.refused.live }` ].filter( Boolean ).join( '; ' );
		return `${ run.state } @ ${ run.width } (${ why || 'a side was not at rest' })`;
	} );
}

// Why a walker report (scripts/parity/draft-live-walk.mjs report.json) fails, or null. Only pairs the draft shows in the run
// count (a state the draft does not show at that width is no absence): a run fails when the surface's first such pair, its
// root, is missing on the live side; a missing child is a parity row of the report. A refused run holds only its `(state)`
// row, so it has no root to find missing (refusedRuns names it).
export function walkAbsent( report ) {
	for ( const run of report?.runs || [] ) {
		if ( run.refused ) {
			continue;
		}
		const root = Object.entries( run.pairs || {} ).find( ( [ name, p ] ) => ! /^\(/.test( name ) && p?.draft && ! p.draft.missing );
		if ( root?.[ 1 ]?.live?.missing ) {
			return `the live page has no element for the surface's root (${ root[ 0 ] }) in run "${ run.state }" at ${ run.width }`;
		}
	}
	return null;
}

// Why a walk measured nothing, or null: its report holds runs and the walker refused every one (a surface that never reaches
// rest on either side), so no root was found missing or present and the surface was never compared. Runs with nothing to trigger
// are settled runs, not refused ones, and a report with no runs is left to the walk step's own error.
export function walkUnmeasured( report ) {
	const runs = report?.runs || [];
	return runs.length && runs.every( ( run ) => run.refused ) ? `the walker refused all ${ runs.length } run${ 1 === runs.length ? '' : 's' } and measured nothing, so the surface was never compared: ${ refusedRuns( report ).join( '; ' ) }`.slice( 0, 500 ) : null;
}

// A walk step's answer once its report is read: `said`, followed by the runs left as open rows because the walker refused them,
// when the report's live elements are present, else an error naming the absent element, or the runs when every one was refused
// (site-run.mjs marks the step failed). A walk that wrote no report is left to the walk step's own error.
export function walkChecked( reportFile, said ) {
	const report = fs.existsSync( reportFile ) ? JSON.parse( fs.readFileSync( reportFile, 'utf8' ) ) : null;
	const absent = walkAbsent( report );
	if ( absent ) {
		throw new Error( `walk failed: ${ absent }` );
	}
	const unmeasured = walkUnmeasured( report );
	if ( unmeasured ) {
		throw Object.assign( new Error( `walk failed: ${ unmeasured }` ), { failureClass: 'not-at-rest' } );
	}
	const refused = refusedRuns( report );
	return refused.length ? `${ said }; ${ refused.length } state run${ 1 === refused.length ? '' : 's' } not measured, left as open rows: ${ refused.join( '; ' ) }`.slice( 0, 600 ) : said;
}
