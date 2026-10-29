// The modal a draft control opens (Spec 48 FR-48-6, FR-48-57; register A1, Bean S8 and S9, 2026-10-28): a button or link whose
// click handler writes the state a draft modal surface opens on (lib/skeleton-handler-opens.mjs::opensOnWrites) opens that
// modal on the clone. The modal is the page map's `sgs_modal` row for the surface (draftId `surfaces.json <id>`); the control
// becomes an `sgs/button` linking `#<anchor>`, and the page that holds the control gets one `sgs/modal` frame carrying that
// anchor, which `data-sgs-modal-open` and any `#<anchor>` link open (plugins/sgs-blocks/src/blocks/modal/anchor-open-controls.js).
// The frame draws no trigger of its own (triggerStyle none) and shows the modal row's post (`modalRef`).

// The modal rows of the page map whose surface the fact record holds: [ { surface (the record's), row, anchor } ]. The anchor
// is the row's slug, which is unique in the map.
export function modalTargets( { pageMap = [], surfaces = {} } ) {
	return ( Array.isArray( pageMap ) ? pageMap : [] ).filter( ( r ) => 'sgs_modal' === r.postType && r.draftId )
		.map( ( row ) => ( { row, surface: surfaces[ row.draftId.replace( /^surfaces\.json /, '' ) ], anchor: row.slug } ) )
		.filter( ( t ) => t.surface );
}

// The `sgs/modal` frame for one opened modal: no trigger of its own, the anchor its openers link to, the modal post it shows
// (`modalRef`, carried once the site build made the post; absent before). Returns { node, missing } where `missing` is the
// reason no modalRef was carried (null when carried or when no carrier is given).
export function modalFrame( { target, carried = null } ) {
	const hit = carried?.postId ? carried.postId( 'sgs_modal', target.row.slug ) : null;
	const attributes = { triggerStyle: 'none', anchor: target.anchor, ...( hit?.id ? { modalRef: hit.id } : {} ) };
	return { node: { name: 'sgs/modal', attributes, innerBlocks: [] }, missing: hit?.reason ? `the ${ target.row.slug } modal frame carries no modalRef: ${ hit.reason }` : null };
}
