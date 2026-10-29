// The facets of the catalogue step of the site build (Spec 48 FR-48-92): each facet of catalogue.json
// (lib/catalogue-facets.mjs) made on one site as a global WooCommerce attribute (`pa_<slug>`, type select, ordered by
// the terms' custom order) with its terms, each colour term's `_sgs_swatch_color`, and each product's terms as a
// filter-only product attribute (not a variation, not shown on the product page), the shape the hand-built seeds of the
// client sites use. A facet a product attribute already is (`axis`) is not written again.
//   - plan (reads only): per facet `create` (no attribute has its slug), `complete` (it lacks a term, or a term lacks its
//     swatch) or `exists`; a slug WooCommerce reserves stops the run; an attribute of that slug under another name is
//     noted and used as it is. A product lacks a facet when it does not carry the attribute, or lacks one of its terms
//     and either the catalogue made it or it has none of that attribute's terms (a product another author made keeps the
//     terms it has);
//   - apply: creates what is missing and adds terms; it never removes a term, renames an attribute or overwrites a swatch.
const b64 = ( v ) => Buffer.from( JSON.stringify( v ) ).toString( 'base64' );

export const writtenFacets = ( catalogue ) => ( catalogue.facets || [] ).filter( ( f ) => ! f.axis );
const taxOf = ( slug ) => `pa_${ slug }`;

// The facets plan: { actions: [{ slug, action, say }], notes, problems }.
export function planFacets( catalogue, state ) {
	const actions = [];
	const notes = [];
	const problems = [];
	for ( const f of writtenFacets( catalogue ) ) {
		const s = state.facets?.[ f.slug ] || { id: 0, label: '', reserved: false, terms: {} };
		const list = f.terms.map( ( t ) => `${ t.name }${ t.swatch ? ` ${ t.swatch }` : '' }` ).join( ', ' );
		if ( s.reserved ) {
			problems.push( `facet "${ f.label }": WooCommerce reserves the attribute slug "${ f.slug }"` );
			continue;
		}
		if ( ! s.id ) {
			actions.push( { slug: f.slug, action: 'create', say: `create attribute ${ taxOf( f.slug ) } "${ f.label }" (${ f.kind }${ f.wildcard ? `, "${ f.wildcard }" carries every term` : '' }) with ${ f.terms.length } term(s): ${ list }` } );
			continue;
		}
		if ( s.label && s.label !== f.label ) {
			notes.push( `attribute ${ taxOf( f.slug ) } is named "${ s.label }" on the site, the draft's filter "${ f.label }"; its name is left` );
		}
		const terms = s.terms || {};
		const lack = f.terms.filter( ( t ) => ! Object.prototype.hasOwnProperty.call( terms, t.name ) );
		const bare = f.terms.filter( ( t ) => t.swatch && Object.prototype.hasOwnProperty.call( terms, t.name ) && ! terms[ t.name ] );
		const what = [ lack.length && `term(s) ${ lack.map( ( t ) => t.name ).join( ', ' ) }`, bare.length && `the swatch of ${ bare.map( ( t ) => t.name ).join( ', ' ) }` ].filter( Boolean );
		actions.push( { slug: f.slug, action: what.length ? 'complete' : 'exists', say: what.length ? `complete attribute ${ taxOf( f.slug ) } (id ${ s.id }): add ${ what.join( ' and ' ) }` : `exists attribute ${ taxOf( f.slug ) } (id ${ s.id })` } );
	}
	return { actions, notes, problems };
}

// What one found product lacks of its facets (names, for the plan line). ours: the catalogue made it (its SKU).
export function facetLack( catalogue, p, s ) {
	const out = [];
	const ours = s.sku === p.sku;
	for ( const f of writtenFacets( catalogue ) ) {
		const want = p.facets?.[ f.slug ] || [];
		if ( ! want.length ) {
			continue;
		}
		const have = s.facets?.[ f.slug ] || [];
		const lack = want.filter( ( n ) => ! have.includes( n ) );
		if ( ! ( s.attributes || [] ).includes( taxOf( f.slug ) ) || ( lack.length && ( ours || ! have.length ) ) ) {
			out.push( `${ f.label } ${ ( lack.length ? lack : want ).join( '/' ) }` );
		}
	}
	return out;
}

// The plan line's facet part for a product to create.
export const facetSay = ( catalogue, p ) => {
	const parts = writtenFacets( catalogue ).filter( ( f ) => p.facets?.[ f.slug ]?.length ).map( ( f ) => `${ f.label } ${ p.facets[ f.slug ].join( '/' ) }` );
	return parts.length ? `; filters ${ parts.join( ', ' ) }` : '';
};

export const tallyFacets = ( actions ) => Object.fromEntries( [ 'create', 'complete', 'exists' ].map( ( k ) => [ k, actions.filter( ( a ) => a.action === k ).length ] ) );

// The read's PHP: `$facets` (per slug: id, label, reserved, terms name -> swatch) and `$sgs_product_facets( $id )`
// (per slug: the product's term names).
export function facetStatePhp( catalogue ) {
	return `$facet_in = json_decode( base64_decode( '${ b64( writtenFacets( catalogue ).map( ( f ) => f.slug ) ) }' ), true );
$facets = array();
foreach ( $facet_in as $slug ) {
	$tax = wc_attribute_taxonomy_name( $slug );
	$aid = (int) wc_attribute_taxonomy_id_by_name( $tax );
	$terms = array();
	$got = $aid && taxonomy_exists( $tax ) ? get_terms( array( 'taxonomy' => $tax, 'hide_empty' => false ) ) : array();
	foreach ( is_array( $got ) ? $got : array() as $t ) { $terms[ $t->name ] = (string) get_term_meta( $t->term_id, '_sgs_swatch_color', true ); }
	$attr = $aid ? wc_get_attribute( $aid ) : null;
	$facets[ $slug ] = array( 'id' => $aid, 'label' => $attr ? (string) $attr->name : '', 'reserved' => (bool) wc_check_if_attribute_name_is_reserved( $slug ), 'terms' => (object) $terms );
}
$sgs_product_facets = function ( $id ) use ( $facet_in ) {
	$out = array();
	foreach ( $facet_in as $slug ) {
		$tax = wc_attribute_taxonomy_name( $slug );
		$names = taxonomy_exists( $tax ) ? wp_get_object_terms( $id, $tax, array( 'fields' => 'names' ) ) : array();
		$out[ $slug ] = is_wp_error( $names ) ? array() : $names;
	}
	return (object) $out;
};
`;
}

// The write's PHP: makes or completes each facet's attribute and terms (needs the `$attribute` and `$term` closures
// and `$done` / `$issues`), and defines `$sgs_assign_facets( $id, $p, $ours )`, which gives one product its terms.
export function facetApplyPhp( catalogue ) {
	const facets = writtenFacets( catalogue ).map( ( f ) => ( { slug: f.slug, label: f.label, terms: f.terms } ) );
	return `$facet_defs = json_decode( base64_decode( '${ b64( facets ) }' ), true );
$facet_tax = array();
foreach ( $facet_defs as $f ) {
	$tax = $attribute( $f['label'], $f['slug'] );
	if ( ! $tax ) { $issues[] = 'facet attribute ' . $f['slug'] . ' not created'; continue; }
	foreach ( $f['terms'] as $pos => $ft ) {
		$had = get_term_by( 'name', $ft['name'], $tax );
		$t = $had ? $had : $term( $ft['name'], $tax );
		if ( ! $t ) { $issues[] = 'facet term ' . $tax . ' ' . $ft['name'] . ' not created'; continue; }
		if ( ! $had ) { update_term_meta( $t->term_id, 'order', (int) $pos ); $done[] = 'term ' . $tax . ' ' . $ft['name']; }
		if ( $ft['swatch'] && '' === (string) get_term_meta( $t->term_id, '_sgs_swatch_color', true ) ) { update_term_meta( $t->term_id, '_sgs_swatch_color', sanitize_hex_color( $ft['swatch'] ) ); }
	}
	$facet_tax[ $f['slug'] ] = $tax;
}
$sgs_assign_facets = function ( $id, $p, $ours ) use ( $facet_tax, &$done ) {
	$wc = wc_get_product( $id );
	if ( ! $wc ) { return; }
	$attrs = $wc->get_attributes();
	$changed = array();
	foreach ( (array) ( $p['facets'] ?? array() ) as $slug => $names ) {
		if ( ! isset( $facet_tax[ $slug ] ) ) { continue; }
		$tax = $facet_tax[ $slug ];
		if ( isset( $attrs[ $tax ] ) && $attrs[ $tax ]->get_variation() ) { continue; }
		$have = wp_get_object_terms( $id, $tax, array( 'fields' => 'ids' ) );
		$have = is_wp_error( $have ) ? array() : array_map( 'intval', $have );
		if ( $have && ! $ours && isset( $attrs[ $tax ] ) ) { continue; }
		$ids = $have;
		foreach ( $names as $n ) {
			$t = get_term_by( 'name', $n, $tax );
			if ( $t && ! in_array( (int) $t->term_id, $ids, true ) ) { $ids[] = (int) $t->term_id; }
		}
		if ( $ids === $have && isset( $attrs[ $tax ] ) ) { continue; }
		$a = isset( $attrs[ $tax ] ) ? $attrs[ $tax ] : new WC_Product_Attribute();
		if ( ! isset( $attrs[ $tax ] ) ) {
			$a->set_id( wc_attribute_taxonomy_id_by_name( $tax ) );
			$a->set_name( $tax );
			$a->set_visible( false );
			$a->set_variation( false );
			$a->set_position( count( $attrs ) );
		}
		$a->set_options( $ids );
		$attrs[ $tax ] = $a;
		wp_set_object_terms( $id, $ids, $tax );
		$changed[] = $tax;
	}
	if ( $changed ) {
		$wc->set_attributes( $attrs );
		$wc->save();
		$done[] = $p['draftId'] . ': filters ' . implode( ', ', $changed );
	}
};
`;
}
