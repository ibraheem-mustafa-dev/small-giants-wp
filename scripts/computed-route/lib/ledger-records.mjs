// What the saved records of a surface hold for the ledger (tools/clone-ledger.mjs): whether the skeleton inventory holds
// the draft's computed look (`resolved` per element and width), so a run knows which surfaces' inventories are too old to
// stand for the draft and must be read again. The ledger reads the draft's look from the served draft either way; this
// says what it had to read live. Pure.

// inventory: the parsed <surface>.inventory.json; look: the properties the ledger compares (lib/ledger-page.mjs::LOOK_PROPS);
// widths: the widths read. Returns { generated, elements, withResolved, widths, held, lacks, tooOld, why }.
export function inventoryHolds( inventory, look, widths ) {
	const els = inventory?.elements || [];
	const withResolved = els.filter( ( e ) => e.resolved && Object.keys( e.resolved ).length );
	const held = new Set();
	const atWidths = new Set();
	for ( const e of withResolved ) {
		for ( const [ w, vals ] of Object.entries( e.resolved ) ) {
			if ( vals && 'object' === typeof vals ) {
				atWidths.add( Number( w ) );
				Object.keys( vals ).forEach( ( k ) => held.add( k ) );
			}
		}
	}
	const lacks = look.filter( ( p ) => ! held.has( p ) );
	const missingWidths = widths.filter( ( w ) => ! atWidths.has( w ) );
	const tooOld = ! withResolved.length || missingWidths.length > 0;
	const why = ! withResolved.length
		? `no element holds computed values (\`resolved\`): written ${ inventory?.generated || 'at an unknown time' }, before the inventory recorded the look`
		: ( missingWidths.length ? `no computed values at ${ missingWidths.join( ', ' ) }` : `holds computed values for ${ withResolved.length } of ${ els.length } elements; a paint property is recorded only where it differs from its initial value, so ${ lacks.length } compared properties appear on no element` );
	return { generated: inventory?.generated || null, elements: els.length, withResolved: withResolved.length, widths: [ ...atWidths ].sort( ( a, b ) => a - b ), held: [ ...held ].sort(), lacks, tooOld, why };
}
