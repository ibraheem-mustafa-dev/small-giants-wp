// The client's accepted differences (qa/divergences.json) as the applier reads them. A row naming a cr-ref matches on the
// ref, its state and its property; a free-text row matches on its surface (scope) and property, narrowed by its optional
// `block` and `surfaces` fields: a ruling about one thing that names a page or a property must not excuse everything else
// there. A match is never written.
const words = ( s ) => String( s ?? '' ).toLowerCase().split( /[^a-z0-9*-]+/ ).filter( Boolean );

export function ledgerIndex( rows = [] ) {
	return rows.map( ( r ) => ( {
		id: r.id,
		refs: String( r.node ?? '' ).match( /cr-ref-[\w-]+/g ) || [],
		scope: words( r.scope ),
		state: r.state ?? '*',
		props: words( r.property ),
		block: r.block ?? null,
		surfaces: r.surfaces ?? null,
	} ) );
}

const propHit = ( row, prop ) => row.props.includes( '*' ) || row.props.includes( prop ) || row.props.some( ( p ) => prop.startsWith( `${ p }-` ) );

export function ledgerMatch( index, { ref, surface, block = null, state = '*', prop } ) {
	for ( const row of index ) {
		const named = row.surfaces ? row.surfaces.includes( surface ) : row.scope.includes( surface ) || row.scope.includes( '*' ) || row.scope.includes( 'every' );
		const place = row.refs.length ? row.refs.includes( ref ) : named && ( ! row.block || row.block === block );
		const when = '*' === row.state || '*' === state || row.state === state;
		if ( place && when && propHit( row, prop ) ) {
			return row.id;
		}
	}
	return null;
}
