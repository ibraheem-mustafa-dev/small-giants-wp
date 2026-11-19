// The site check's openers, modals and walks (Spec 48 FR-48-95):
// - every `sgs_modal` row of the page map is rendered by some checked page as a frame whose anchor is the row's slug and whose
//   dialog is named by the row's title (the referenced post's title names the dialog, so a frame whose post is missing is no
//   match), as lib/site-check-parts.mjs::missingFlowRows asks of choice flows;
// - a link on a page to the anchor of a modal or flow row opens something: the page holds a frame with that anchor, else the
//   link is a dead opener and fails;
// - a parity walk whose live element is absent (the surface's root, shown by the draft, never found on the live page in a run)
//   fails instead of passing (site-run.mjs's walk step).
import fs from 'fs';
import { OPENABLE } from './intake-pagemap-openers.mjs';

// In-page: the in-page anchors the page's links and modal-open controls point at, and the anchors of the frames it holds.
export function openersInPage() {
	const links = [ ...document.querySelectorAll( 'a[href^="#"], [data-sgs-modal-open]' ) ].map( ( a ) => a.getAttribute( 'data-sgs-modal-open' ) || ( a.getAttribute( 'href' ) || '' ).slice( 1 ) ).filter( Boolean );
	const frames = [ ...document.querySelectorAll( 'dialog.sgs-modal__dialog' ) ].map( ( d ) => d.parentElement?.id || '' ).filter( Boolean );
	return { links: [ ...new Set( links ) ], frames: [ ...new Set( frames ) ] };
}

// The sgs_modal rows no checked page renders with their post: [row]. modals: lib/site-check-parts.mjs::readPartsInPage's
// modals of every checked page ({ anchor, label }).
export function missingModalRows( rows, modals ) {
	return rows.filter( ( r ) => 'sgs_modal' === r.postType ).filter( ( r ) => ! modals.some( ( m ) => m.anchor === r.slug && String( m.label || '' ).toLowerCase() === String( r.title || '' ).toLowerCase() ) );
}

// The failed items for a page's links to a modal or flow row's anchor that no frame on the page holds. page: { key, url,
// links, frames } (openersInPage's answer with the page's key and address).
export function deadOpeners( rows, page ) {
	const targets = new Map( rows.filter( ( r ) => [ 'modal', 'flow' ].includes( OPENABLE[ r.postType ] ) ).map( ( r ) => [ r.slug, r ] ) );
	return ( page.links || [] ).filter( ( a ) => targets.has( a ) && ! ( page.frames || [] ).includes( a ) )
		.map( ( a ) => ( { status: 'fail', subject: `opener #${ a } on ${ page.key }`, url: page.url, error: `a link opens the ${ OPENABLE[ targets.get( a ).postType ] } ${ a }, and the page holds no frame with that anchor` } ) );
}

// Why a walker report (scripts/parity/draft-live-walk.mjs report.json) fails because its live element is absent, or null.
// Only pairs the draft shows in the run count (a state the draft does not show at that width is no absence). A run fails when
// the surface's first such pair, its root, is missing on the live side; a missing child is a parity row of the report.
export function walkAbsent( report ) {
	for ( const run of report?.runs || [] ) {
		const root = Object.entries( run.pairs || {} ).find( ( [ name, p ] ) => ! /^\(/.test( name ) && p?.draft && ! p.draft.missing );
		if ( root?.[ 1 ]?.live?.missing ) {
			return `the live page has no element for the surface's root (${ root[ 0 ] }) in run "${ run.state }" at ${ run.width }`;
		}
	}
	return null;
}

// A walk step's answer once its report is read: `said` when the report's live elements are present, else an error naming the
// absent element (site-run.mjs marks the step failed). A walk that wrote no report is left to the walk step's own error.
export function walkChecked( reportFile, said ) {
	const report = fs.existsSync( reportFile ) ? JSON.parse( fs.readFileSync( reportFile, 'utf8' ) ) : null;
	const absent = walkAbsent( report );
	if ( absent ) {
		throw new Error( `walk failed: ${ absent }` );
	}
	return said;
}
