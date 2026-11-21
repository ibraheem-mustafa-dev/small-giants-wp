// The draft elements a block draws as its own parts, whatever they paint (Spec 48 FR-48-6, paint conservation section 3.4).
// A block that draws a part itself (a button's icon, a drawer's chrome row, its close control and logo) swallows the draft
// element that is that part, and Fill reads the part's settings (its colour, size, gap, padding) only from the draft element
// the skeleton names at the part's calibrated slot (`draftSlots`). The paint-conservation pass lists only an absorbed element
// that paints a box of its own, so a part that paints nothing a box shows (an icon that only sets a colour, a row that only
// lays its children out) never reached the pairing and its settings stayed unread (lib/fill-unread.mjs::unreadOf).
// hostParts finds, for every block node, the absorbed elements that stand for it and its parts; the general pairing
// (lib/skeleton-part-pairing.mjs::pairAbsorbed with no look filter) then decides which measured part each one is. Nothing
// here names a block, a part or a class.

// The row's host: the nearest block node on its `into` chain (the row itself when a node reads it), or null.
export function hostKeyOf( row, rows, isNode ) {
	let r = row;
	for ( let i = 0; r && i < 8; i++ ) {
		if ( isNode( r.key ) ) {
			return r.key;
		}
		r = r.into ? rows.get( r.into ) : null;
	}
	return null;
}

// rows: Map( key -> proposal row ); isNode( key ): a skeleton node reads that element. Returns Map( hostKey -> Set( element
// key ) ): the elements of every row absorbed into the host and the drawn parts (`row.parts`) of the host's own row or of a
// row absorbed into it.
export function hostParts( { rows, isNode } ) {
	const out = new Map();
	const add = ( host, key ) => host && ( out.get( host ) ?? out.set( host, new Set() ).get( host ) ).add( key );
	for ( const row of rows.values() ) {
		'absorbed' === row.action && add( hostKeyOf( row, rows, isNode ) === row.key ? null : hostKeyOf( row, rows, isNode ), row.key );
		for ( const part of row.parts || [] ) {
			add( hostKeyOf( row, rows, isNode ), part );
		}
	}
	return out;
}
