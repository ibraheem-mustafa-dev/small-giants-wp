// The client's accepted differences (qa/divergences.json) as the applier reads them. A row naming a cr-ref matches on the
// ref, its state and its property; a free-text row matches on its surface (scope) and property. A match is never written.
const words = ( s ) => String( s ?? '' ).toLowerCase().split( /[^a-z0-9*-]+/ ).filter( Boolean );

export function ledgerIndex( rows = [] ) {
	return rows.map( ( r ) => ( {
		id: r.id,
		refs: String( r.node ?? '' ).match( /cr-ref-[\w-]+/g ) || [],
		scope: words( r.scope ),
		state: r.state ?? '*',
		props: words( r.property ),
	} ) );
}

const propHit = ( row, prop ) => row.props.includes( '*' ) || row.props.includes( prop ) || row.props.some( ( p ) => prop.startsWith( `${ p }-` ) );

export function ledgerMatch( index, { ref, surface, state = '*', prop } ) {
	for ( const row of index ) {
		const place = row.refs.length ? row.refs.includes( ref ) : row.scope.includes( surface ) || row.scope.includes( '*' ) || row.scope.includes( 'every' );
		const when = '*' === row.state || '*' === state || row.state === state;
		if ( place && when && propHit( row, prop ) ) {
			return row.id;
		}
	}
	return null;
}
