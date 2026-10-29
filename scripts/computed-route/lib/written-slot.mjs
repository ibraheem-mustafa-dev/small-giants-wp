// Where the walker reads a value Fill wrote on the live page (register D1, Bean 2026-10-29). A setting paints on the element its
// calibration found, which is often a block's inner band, not its wrapper (a container's padding sits on
// `.sgs-container__inner`); reading the wrapper says the value is 0 and files a present value as a lost write. The walker reads
// each written property at that calibrated slot (scripts/parity/lib/collect.mjs::collectPair, opts.liveAt); a value Fill never
// wrote keeps the wrapper read, and the draft-to-live pairing is unchanged.

// The slot a calibrated setting paints on, relative to its block's root: the entry's own `slot`, except that a wrapper slot ('')
// listed beside a descendant slot (a gap the wrapper's calibration reached through the inner layout element) gives the
// first descendant slot. '' is the wrapper itself (no slot read).
export function paintSlot( entry ) {
	const slots = Array.isArray( entry?.slots ) ? entry.slots.filter( ( s ) => 'string' === typeof s && s ) : [];
	const own = 'string' === typeof entry?.slot ? entry.slot : '';
	return own || slots[ 0 ] || '';
}

// A write that speaks for the block's resting look: a CSS property written to a setting at the block's own root, not a content
// row, a state setting or a part inside the block (a part pair already measures its slot).
const restingStyle = ( w ) => w && 'string' === typeof w.prop && /^[a-z-]+$/.test( w.prop ) && ! w.state && ! w.slot && ! [ 'content', 'motion' ].includes( w.how );

// writes: fill-report.json `writes`; calFor( block ): the block's calibration ({ settings }) or null.
// Returns Map block ref -> { css property: slot selector } for each written property whose setting is calibrated on a
// descendant slot. A setting calibrated on the wrapper, an uncalibrated one and a written property with no setting entry are left out.
export function liveReadSlots( { writes, calFor } ) {
	const out = new Map();
	for ( const w of writes ) {
		if ( ! restingStyle( w ) || ! w.node || ! w.block || ! w.attr ) {
			continue;
		}
		const slot = paintSlot( calFor( w.block )?.settings?.[ w.attr ] );
		if ( slot ) {
			out.set( w.node, { ...( out.get( w.node ) || {} ), [ w.prop ]: slot } );
		}
	}
	return out;
}

// pairs with `liveAt` for each pair on a block root (no slot of its own) that has written properties.
export function withLiveReads( pairs, reads ) {
	return pairs.map( ( p ) => ( ! p.slot && reads.has( p.ref ) ? { ...p, liveAt: reads.get( p.ref ) } : p ) );
}
