// How trace-check.mjs matches a logged animation event to an animations.json record. Kept apart from
// trace-check.mjs because that script runs a browser at import.

// A record names its element by template_tpl_id, by nearest_tpl_id, or (structural targets) inside element/trace text.
export const names = ( r, t ) => String( r.element?.template_tpl_id ) === t
	|| [].concat( r.element?.nearest_tpl_id ?? [] ).map( String ).includes( t )
	|| JSON.stringify( r.element || {} ).includes( `"${ t }"` )
	|| JSON.stringify( r.trace || {} ).includes( t );

// duration_ms is a number, or text: "per property" (each properties[] entry carries its own duration_ms) or a formula.
export const durOk = ( r, dur, shift = 0 ) => {
	if ( typeof r.duration_ms !== 'string' ) return Number( r.duration_ms ) + shift === Number( dur );
	const perProp = ( r.properties || [] ).map( ( p ) => p.duration_ms ).filter( ( d ) => typeof d === 'number' );
	if ( perProp.length ) return perProp.some( ( d ) => d + shift === Number( dur ) );
	return shift === 0 && ! Number.isInteger( Number( dur ) );
};

// An event with no template id or no nearest one is keyed '-', never the text "null".
export const eventKey = ( c ) => `${ c.kind }|${ c.tpl || '-' }|${ c.near || '-' }|${ c.dur }`;

export const matchFor = ( key, recs, shift = 0 ) => {
	const [ , tpl, near, dur ] = key.split( '|' );
	return recs.find( ( r ) => durOk( r, dur, shift ) && [ tpl, near ].some( ( t ) => t && t !== '-' && names( r, t ) ) );
};
