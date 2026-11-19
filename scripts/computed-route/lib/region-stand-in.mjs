// A block that stands in for a draft element (Spec 48 FR-48-87): WooCommerce's Cart or Checkout block placed where the
// draft lays out the form beside the order summary (lib/template-piece-woo-layout.mjs marks its node `draftStandsFor:
// { tpl }`). Fill reads nothing into such a block (it carries no draftRef), but the element is still the block's own: Fill's
// layout read (scripts/parity/lib/paint.mjs::layoutElement) descends from a wrapper into its one child unless another node
// owns that child, so without an owner a wrapper above the block would read the region's column template as its own layout
// and lay the block out in one column of it. Each stand-in is therefore stamped as its node's element before the read
// (lib/fill-read-collect.mjs::collectMany stamps every job's element `data-fill-owner`), as a job that reads nothing.

// The stamp-only jobs of a skeleton's nodes (lib/fill-skeleton.mjs::skeletonNodes): one per node with `draftStandsFor`.
export function standInJobs( nodes ) {
	return ( nodes || [] ).filter( ( n ) => n?.node?.draftStandsFor ).map( ( n ) => ( { id: `${ n.index }:stand-in`, finder: n.node.draftStandsFor, mark: null, owner: n.index, root: false, own: false, stampOnly: true } ) );
}
