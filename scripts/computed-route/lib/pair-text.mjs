// The text a saved block shows, normalised the way the pairing rules compare it (lib/refresh-pairs.mjs, lib/pair-wrappers.mjs).

export const norm = ( s ) => String( s ?? '' ).replace( /<[^>]*>/g, ' ' ).replace( /&amp;/g, '&' ).replace( /&#0?39;|&apos;/g, "'" ).replace( /[‘’]/g, "'" ).replace( /[“”]/g, '"' ).replace( /\s+/g, ' ' ).trim().toLowerCase();

// The text a saved block shows: the first of its text-bearing attributes that holds any; a block with a single option (a
// consent checkbox) shows that option's label.
export const textOf = ( attrs ) => {
	for ( const k of [ 'content', 'text', 'label', 'heading', 'title' ] ) {
		if ( 'string' === typeof attrs?.[ k ] && norm( attrs[ k ] ) ) {
			return norm( attrs[ k ] );
		}
	}
	const only = Array.isArray( attrs?.options ) && 1 === attrs.options.length ? attrs.options[ 0 ] : null;
	const label = only && ( 'string' === typeof only.label ? only.label : only.value );
	return 'string' === typeof label ? norm( label ) : '';
};
