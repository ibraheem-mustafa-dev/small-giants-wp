// A modal surface's frame look, lifted out of the post (Spec 48 FR-48-6, FR-48-57; register A1, Bean S8): the skeleton carries one
// `sgs/modal` frame node (`modalFrame: true`, lib/skeleton-modal-frame.mjs) whose draftRef and draftSlots read the draft's
// backdrop, panel and close, so Fill writes their look onto that node like any other. The modal post holds only the dialog's inner
// content, so the node leaves the filled tree here and is kept in `modal-frame.json` ({ anchor, attributes }), which the site build
// merges onto the page's `sgs/modal` frame by its anchor (lib/site-build-modal-frame.mjs).

// Removes the frame node of `skeleton` from `tree` (cleanTree keeps the skeleton's top-level order) and returns its record, or null
// when the skeleton carries none. `tree` is changed in place.
export function liftModalFrame( { skeleton, tree } ) {
	const at = skeleton.findIndex( ( n ) => true === n.modalFrame );
	if ( at < 0 || ! tree[ at ] ) {
		return null;
	}
	const [ node ] = tree.splice( at, 1 );
	return { anchor: node.attributes?.anchor ?? null, attributes: node.attributes };
}
