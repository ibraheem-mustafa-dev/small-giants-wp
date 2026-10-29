// One draft element is one node's (Spec 48 §3.4): a draft box is drawn by one block. Two nodes on one draft element where
// one holds the other, or both stand under the same parent, draw that box twice (a form block laying out the grid a host
// container already lays out). Copies of one element in parallel branches stand: each is the element in its own state (a
// form step's heading, which the draft redraws for every step). Returns readable problems naming both nodes.
export function sharedElementProblems( tree ) {
	const seen = [];
	const go = ( list, path, parent ) => list.forEach( ( n, i ) => {
		const here = `${ path }${ path ? ' > ' : '' }${ n.name }[${ i }]`;
		const key = n.draftRef && 'object' === typeof n.draftRef ? n.draftRef.tpl : null;
		key && seen.push( { key, here, parent, node: n } );
		go( n.innerBlocks || [], here, n );
	} );
	go( tree, '', null );
	const out = [];
	seen.forEach( ( a, i ) => seen.slice( i + 1 ).forEach( ( b ) => {
		if ( a.key === b.key && ( a.parent === b.parent || b.here.startsWith( `${ a.here } > ` ) ) ) {
			out.push( `draft element ${ a.key } is written to two nodes, ${ a.here } and ${ b.here }: one draft element is one node's` );
		}
	} ) );
	return out;
}
