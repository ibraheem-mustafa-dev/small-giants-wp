// The clone difference ledger's knock-on rows (tools/clone-ledger.mjs): a box that differs only because something inside it or
// before it differs takes the stage of that row, marked `follows` with the row it follows, so a run counts each cause once.
// A size row (w, h) follows an inner pair's size or place row when the element itself differs in nothing that sizes it; a place
// row (x, y) follows an earlier sibling's size or presence row, else the enclosing pair's layout row, when the element itself
// differs in nothing that places it. Rows of one width only follow rows of the same width. Pure functions.

// What sizes or places an element itself, per box key.
const OWN = {
	h: [ 'padding-top', 'padding-bottom', 'border-top-width', 'border-bottom-width', 'height', 'min-height', 'max-height', 'line-height', 'font-size', 'aspect-ratio', 'row-gap', 'flex-direction', 'flex-wrap', 'grid-template-columns', 'display', 'text', 'white-space', 'letter-spacing', 'font-family', 'font-weight', 'w', 'position', 'shown', 'element' ],
	w: [ 'padding-left', 'padding-right', 'border-left-width', 'border-right-width', 'width', 'max-width', 'min-width', 'flex-basis', 'flex-grow', 'grid-template-columns', 'display', 'position', 'font-size', 'letter-spacing', 'text', 'font-family', 'font-weight', 'white-space', 'shown', 'element' ],
	y: [ 'margin-top', 'top', 'bottom', 'position', 'shown', 'element' ],
	x: [ 'margin-left', 'margin-right', 'left', 'right', 'position', 'shown', 'element' ],
};
OWN[ 'paint-h' ] = OWN.h;
OWN[ 'paint-w' ] = OWN.w;
// What an inner pair's row can push out, per size key.
const INNER = { h: [ 'h', 'y', 'shown', 'element' ], w: [ 'w', 'x', 'shown', 'element' ] };
INNER[ 'paint-h' ] = INNER.h;
INNER[ 'paint-w' ] = INNER.w;
// What an earlier sibling's row can push along, and what the enclosing pair's layout can, per place key.
const SIBLING = { y: [ 'h', 'shown', 'element', 'margin-bottom' ], x: [ 'w', 'shown', 'element', 'margin-right' ] };
const PARENT = { y: [ 'padding-top', 'border-top-width', 'row-gap', 'align-items', 'justify-content', 'flex-direction', 'display', 'grid-template-columns', 'h' ], x: [ 'padding-left', 'border-left-width', 'column-gap', 'justify-content', 'align-items', 'text-align', 'flex-direction', 'display', 'grid-template-columns', 'w' ] };

// The enclosing target of each target: a slot's is its node root, a root's is the nearest drawn ancestor node's root.
// targets: lib/ledger-pairs.mjs::ledgerTargets. Returns Map id -> parent id (or null).
export function targetParents( targets ) {
	const rootId = new Map( targets.filter( ( t ) => '' === t.slot ).map( ( t ) => [ t.index, t.id ] ) );
	return new Map( targets.map( ( t ) => [ t.id, t.slot ? rootId.get( t.index ) ?? null : ( null === t.parent ? null : rootId.get( t.parent ) ?? null ) ] ) );
}

// Marks knock-on rows. rows: unmerged ledger rows ({ id, key, width, stage, proof }), in any order; targets in document
// order. Returns the rows with `follows` ({ id, ref, key, width }) and the cause's stage on each knock-on row.
export function markFollows( rows, targets ) {
	const parentOf = targetParents( targets );
	const order = new Map( targets.map( ( t, i ) => [ t.id, i ] ) );
	const byIdW = new Map();
	for ( const r of rows ) {
		const k = `${ r.id }@${ r.width }`;
		if ( ! byIdW.has( k ) ) {
			byIdW.set( k, [] );
		}
		byIdW.get( k ).push( r );
	}
	const has = ( id, w, keys ) => ( byIdW.get( `${ id }@${ w }` ) || [] ).find( ( r ) => keys.includes( r.pseudo ? '' : r.key ) ) || null;
	const isInside = ( id, anc ) => {
		for ( let p = parentOf.get( id ); p; p = parentOf.get( p ) ) {
			if ( p === anc ) {
				return true;
			}
		}
		return false;
	};
	const children = new Map();
	for ( const t of targets ) {
		const p = parentOf.get( t.id );
		if ( ! children.has( p ) ) {
			children.set( p, [] );
		}
		children.get( p ).push( t.id );
	}
	// The cause row of one row, or null.
	const causeOf = ( r ) => {
		const k = r.key;
		if ( r.pseudo || ! OWN[ k ] || has( r.id, r.width, OWN[ k ] ) ) {
			return null;
		}
		if ( INNER[ k ] ) {
			const inner = targets.filter( ( t ) => isInside( t.id, r.id ) ).map( ( t ) => has( t.id, r.width, INNER[ k ] ) ).find( Boolean );
			return inner || null;
		}
		const p = parentOf.get( r.id ) ?? null;
		const sibs = ( children.get( p ) || [] ).filter( ( id ) => order.get( id ) < order.get( r.id ) ).reverse();
		const sib = sibs.map( ( id ) => has( id, r.width, SIBLING[ k ] ) ).find( Boolean );
		if ( sib ) {
			return sib;
		}
		return p ? has( p, r.width, PARENT[ k ] ) : null;
	};
	// A cause that follows another row resolves to that row's own cause (a guard stops a loop).
	const memo = new Map();
	const rootOf = ( r, seen = new Set() ) => {
		if ( memo.has( r ) ) {
			return memo.get( r );
		}
		const c = causeOf( r );
		const root = ! c || c === r || seen.has( c ) ? null : ( rootOf( c, seen.add( r ) ) || c );
		memo.set( r, root );
		return root;
	};
	const resolved = new Map( rows.map( ( r ) => [ r, rootOf( r ) ] ).filter( ( [ , c ] ) => c ) );
	return rows.map( ( r ) => {
		const c = resolved.get( r );
		return c ? { ...r, stage: c.stage, follows: { id: c.id, ref: c.ref, key: c.pseudo ? `${ c.pseudo } ${ c.key }` : c.key, width: c.width }, proof: { follows: `${ c.ref || c.id } ${ c.key } at ${ c.width }`, cause: c.proof } } : r;
	} );
}
