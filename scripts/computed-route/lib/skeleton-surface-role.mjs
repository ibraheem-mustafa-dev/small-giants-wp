// The role the page map gives a skeleton surface (Spec 48 FR-48-30; plan 2026-10-23-cloning-tool-completion S5): a choice
// flow (an `sgs_choice_flow` row whose draftId names the surface's surfaces.json record, Spec 43) or a part another row's block
// draws (a part with owner `block`, such as the cart page's bag drawer). surfaces.json has no choice-flow kind (a flow is a
// `modal` or a `form` record there), so the page map is the only source; nothing is read from a name.
//
// A part names its surface by `surfaces.json <id>`, or by the draft tag the page map read (`<file>:<line>:<col> <tag
// aria-label="…">`, lib/intake-pagemap-surfaces.mjs::tagId), matched to an element of the surface's inventory with the same
// component, tag and aria-label. The line is not compared: the page map counts lines in the file, the template in its own text.

// The parts of a page-map tag id: { file stem, tag, ariaLabel } or null.
export function parseTagId( draftId ) {
	const hit = /^(.+?)\.dc\.html:\d+:\d+ <([a-z][a-z0-9-]*)(?: aria-label="([^"]*)")?>$/.exec( String( draftId ?? '' ) );
	return hit ? { component: hit[ 1 ], tag: hit[ 2 ], ariaLabel: hit[ 3 ] ?? null } : null;
}

// The component an inventory element was stamped in: its record entry's, else the last host of its import chain.
const componentOf = ( e, view ) => view?.entry( e )?.template.component ?? String( e.template ?? '' ).split( '>' ).pop().replace( /@.*$/, '' );

// Whether a page-map draftId names this surface: its surfaces.json id, or a tag id one of its rendered elements carries.
function names( draftId, { id, m, view } ) {
	if ( id && draftId === `surfaces.json ${ id }` ) {
		return true;
	}
	const t = parseTagId( draftId );
	return !! t && !! m && m.els.some( ( e ) => ( view?.realTag( e ) ?? e.tag ) === t.tag && componentOf( e, view ) === t.component && ( null == t.ariaLabel || ( view?.attr( e, 'aria-label' ) ?? e.attrs?.[ 'aria-label' ] ) === t.ariaLabel ) );
}

// o: { pageMap (the page-map rows), id (the surface's surfaces.json id), kind (its surfaces.json kind: a part is a surface
// of its own kind only, so a header whose markup holds the drawer is never the drawer), m (lib/skeleton-model.mjs), view
// (lib/skeleton-record.mjs::recordView), postType (rules.choiceFlow.postType) }. Returns { role: 'choiceFlow', row } |
// { role: 'blockPart', row, part } | null.
export function surfaceRole( { pageMap = [], id = null, kind = null, m = null, view = null, postType = 'sgs_choice_flow' } ) {
	const rows = Array.isArray( pageMap ) ? pageMap : [];
	const flow = id ? rows.find( ( r ) => r.postType === postType && r.draftId === `surfaces.json ${ id }` ) : null;
	if ( flow ) {
		return { role: 'choiceFlow', row: flow };
	}
	for ( const row of rows ) {
		const part = ( row.parts || [] ).find( ( p ) => 'block' === p.owner && p.kind === kind && names( p.draftId, { id, m, view } ) );
		if ( part ) {
			return { role: 'blockPart', row, part };
		}
	}
	return null;
}
