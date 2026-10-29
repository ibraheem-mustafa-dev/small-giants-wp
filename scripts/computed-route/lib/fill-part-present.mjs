// Whether the part a calibrated slot names is in a node (Spec 48 FR-48-81, register row C2). A slot path can run through a CHILD
// block the block's own render does not draw: the mega panel's group tile, `.sgs-mega-panel__content > .sgs-mega-group`, exists
// only where the panel holds an `sgs/mega-group` child. A setting calibrated at such a slot paints nothing on a node without that
// child, so a default look the block would make there needs no hold. `partPresent` is false for a slot with a segment of another
// block's class (its root, an element or a modifier of it) when that block is one the node's block accepts as a child
// (the framework DB's `block_composition.accepts_allowed_blocks`; a block a render draws internally, the container composite blocks draw for themselves, is never one) and no block
// of that name is in the node's subtree.
const SEGMENT = /\.sgs-([a-z0-9-]+?)(?=__|--|[^a-z0-9-]|$)/g;
const ACCEPTS = new WeakMap();

// The child blocks a block accepts, per DB and block.
function acceptedChildren( db, block ) {
	if ( ! db ) {
		return new Set();
	}
	const byBlock = ACCEPTS.get( db ) ?? new Map();
	ACCEPTS.set( db, byBlock );
	if ( ! byBlock.has( block ) ) {
		let list = [];
		try {
			list = JSON.parse( db.prepare( 'SELECT accepts_allowed_blocks FROM block_composition WHERE block_slug = ?' ).get( block )?.accepts_allowed_blocks || '[]' );
		} catch {
			list = [];
		}
		byBlock.set( block, new Set( list ) );
	}
	return byBlock.get( block );
}

const namesUnder = ( node, out = new Set() ) => {
	for ( const c of node?.innerBlocks || [] ) {
		out.add( c.name );
		namesUnder( c, out );
	}
	return out;
};

// path: a calibrated element path; block: the node's block name; node: the tree node (its innerBlocks); db: the framework DB.
export function partPresent( { path, block, node, db } ) {
	const accepted = acceptedChildren( db, block );
	const below = namesUnder( node );
	for ( const [ , name ] of String( path ?? '' ).matchAll( SEGMENT ) ) {
		const other = `sgs/${ name }`;
		if ( other !== block && accepted.has( other ) && ! below.has( other ) ) {
			return false;
		}
	}
	return true;
}
