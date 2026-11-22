// One draft element is read by one block (Spec 48 §3.4): a skeleton in which two nodes of different block types name the same
// draft element as their own (`draftRef.tpl`) draws that element twice. Copies of one block are no fault: a loop's copies each
// have their own element key, and a width variant is the same block read at the same element. A body a rule gives its host on
// purpose (rules.wrappedWords: the host draws the box, its one text child holds the element's words) is `sanctioned`.
//
// doubleClaims( skeleton, { sanctioned( host, child ) -> bool } ) -> [ problem text ], one per element, naming the element, both
// blocks and both node paths.

// Every node that names a draft element as its own, with its path in the tree (child indexes joined by "/") and its parent node.
function claims( tree ) {
	const out = new Map();
	const walk = ( list, path, parent ) => ( list || [] ).forEach( ( n, i ) => {
		const at = [ ...path, i ];
		const key = n?.draftRef?.tpl;
		const claim = { block: n.name, path: at.join( '/' ), node: n, parent };
		'string' === typeof key && ( out.get( key )?.push( claim ) ?? out.set( key, [ claim ] ) );
		walk( n?.innerBlocks, at, n );
	} );
	walk( Array.isArray( tree ) ? tree : [ tree ], [], null );
	return out;
}

export function doubleClaims( tree, { sanctioned = () => false } = {} ) {
	const problems = [];
	for ( const [ key, nodes ] of claims( tree ) ) {
		const first = nodes[ 0 ];
		// The nodes are in document order, so a host comes before its body.
		const share = ( a, b ) => b.parent === a.node && sanctioned( a.node, b.node );
		const other = nodes.find( ( n ) => n.block !== first.block && ! share( first, n ) );
		other && problems.push( `${ key }: one draft element is read by two blocks, ${ first.block } (node ${ first.path }) and ${ other.block } (node ${ other.path }): one block must own it` );
	}
	return problems;
}
