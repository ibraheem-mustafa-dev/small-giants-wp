// Where the site run reads a modal or choice-flow surface live (Spec 48 FR-48-30, FR-48-95). Such a surface has no page of
// its own, so it is read at a page that opens it: a page-map row listing it in `opens` (lib/intake-pagemap-openers.mjs) that
// has a live address (a page, the shop page or the product template), a page before a product, because a product is read at
// one live product only. A surface only the header, footer or another surface opens is read where those render, the home
// page, as before.
const OWN = [ 'sgs_modal', 'sgs_choice_flow' ];
const ADDRESSED = [ 'page', 'shop', 'product' ];

// The row a manifest entry's surface is read at live, or null for any other surface or one no addressed row opens. entry: the
// site manifest entry (its `target.postId` names the surface's own row); rows: the page map's rows.
export function openerRow( entry, rows = [] ) {
	const own = null != entry?.target?.postId ? rows.find( ( r ) => r.id === entry.target.postId ) : null;
	if ( ! own || ! OWN.includes( own.postType ) ) {
		return null;
	}
	const openers = rows.filter( ( r ) => ADDRESSED.includes( r.postType ) && ( r.opens || [] ).some( ( o ) => o.slug === own.slug ) );
	return openers.find( ( r ) => 'product' !== r.postType ) ?? openers[ 0 ] ?? null;
}
