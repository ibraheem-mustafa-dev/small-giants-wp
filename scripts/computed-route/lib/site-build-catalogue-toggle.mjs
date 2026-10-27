// The shop's on-off filter (Spec 48 FR-48-61): a catalogue facet whose field is true or false (`kind: boolean`, Polarised
// on a frame) is the theme's boolean toggle in the filter drawer (theme/sgs-theme/inc/shop-filters-settings.php), never a
// filter block, so the catalogue step of the site build (lib/site-build-catalogue.mjs) sets the theme mods it reads:
// `sgs_shop_filter_boolean_enabled`, `_source` (`attribute`), `_attribute` (the facet's slug, without `pa_`), `_term` (the
// slug WooCommerce gave the facet's term) and `_label` (the facet's toggle text when the draft gives one; blank, the theme
// shows "<term> only"). The theme holds one toggle, so a second boolean facet is a note. A value the site already holds
// that differs is never overwritten: it is a note, and the step leaves the toggle as it is.
import { writtenFacets } from './site-build-catalogue-facets.mjs';

const b64 = ( v ) => Buffer.from( JSON.stringify( v ) ).toString( 'base64' );
export const TOGGLE_MODS = [ 'enabled', 'source', 'attribute', 'term', 'label' ].map( ( k ) => `sgs_shop_filter_boolean_${ k }` );

// The boolean facet the toggle shows: { facet, notes }, facet null when the catalogue has none.
export function toggleFacet( catalogue ) {
	const all = writtenFacets( catalogue ).filter( ( f ) => 'boolean' === f.kind );
	return { facet: all[ 0 ] || null, notes: all.slice( 1 ).map( ( f ) => `the boolean facet "${ f.label }" has no toggle: the theme holds one on-off filter, given to "${ all[ 0 ].label }"` ) };
}

// The read: the theme mods and the slug of the facet's term ('' when the attribute or term is not made yet).
export function toggleStatePhp( facet ) {
	return `$in = json_decode( base64_decode( '${ b64( { mods: TOGGLE_MODS, tax: `pa_${ facet.slug }`, term: facet.terms[ 0 ].name } ) }' ), true );
$mods = array();
foreach ( $in['mods'] as $m ) { $mods[ $m ] = get_theme_mod( $m, null ); }
$t = taxonomy_exists( $in['tax'] ) ? get_term_by( 'name', $in['term'], $in['tax'] ) : false;
echo wp_json_encode( array( 'mods' => (object) $mods, 'termSlug' => $t && ! is_wp_error( $t ) ? (string) $t->slug : '' ) );`;
}

// The wanted theme mods for the facet, given the term's slug on the site.
const wanted = ( facet, termSlug ) => ( { sgs_shop_filter_boolean_enabled: true, sgs_shop_filter_boolean_source: 'attribute', sgs_shop_filter_boolean_attribute: facet.slug, sgs_shop_filter_boolean_term: termSlug, sgs_shop_filter_boolean_label: facet.toggleLabel || '' } );
const blank = ( v ) => null == v || '' === v || false === v;
const on = ( v ) => Boolean( v ) && ! [ '0', 'false' ].includes( String( v ) );
const same = ( k, a, b ) => ( 'sgs_shop_filter_boolean_enabled' === k ? on( a ) === on( b ) : String( a ?? '' ) === String( b ?? '' ) );

// The plan: { action: 'none' | 'exists' | 'set' | 'left', set: { mod: value }, say, notes }.
export function planToggle( catalogue, state ) {
	const { facet, notes } = toggleFacet( catalogue );
	if ( ! facet ) {
		return { action: 'none', set: {}, say: null, notes };
	}
	const want = wanted( facet, state.termSlug || '' );
	const mods = state.mods || {};
	const differ = Object.keys( want ).filter( ( k ) => ! blank( mods[ k ] ) && ! same( k, mods[ k ], want[ k ] ) && ! ( 'sgs_shop_filter_boolean_term' === k && ! want[ k ] ) );
	if ( differ.length ) {
		return { action: 'left', set: {}, say: `left the on-off filter: the site's ${ differ.map( ( k ) => `${ k } is ${ JSON.stringify( mods[ k ] ) }` ).join( ', ' ) }, not the facet "${ facet.label }"'s`, notes };
	}
	const set = Object.fromEntries( Object.entries( want ).filter( ( [ k, v ] ) => blank( mods[ k ] ) && ! blank( v ) ) );
	const term = want.sgs_shop_filter_boolean_term || `the slug of "${ facet.terms[ 0 ].name }" once made`;
	return Object.keys( set ).length || ! state.termSlug ? { action: 'set', set, say: `on-off filter: theme mods for pa_${ facet.slug } term ${ term }${ facet.toggleLabel ? `, label "${ facet.toggleLabel }"` : ' (the theme labels it "<term> only")' }`, notes } : { action: 'exists', set: {}, say: `on-off filter: pa_${ facet.slug } is the theme's toggle`, notes };
}

// The write: sets the planned theme mods.
export function toggleApplyPhp( set ) {
	return `$set = json_decode( base64_decode( '${ b64( set ) }' ), true );
foreach ( $set as $m => $v ) { set_theme_mod( $m, $v ); }
echo wp_json_encode( array( 'set' => array_keys( $set ) ) );`;
}

const parse = ( text ) => JSON.parse( String( text ).slice( Math.max( 0, String( text ).indexOf( '{' ) ) ) );

// Runs the toggle part of the catalogue step: prints the plan, and with `apply` writes it and reads it back. Returns the
// number of failures (0 when the toggle is set or there is none to set).
export function runToggle( { catalogue, runPhp, apply, log, error } ) {
	const { facet } = toggleFacet( catalogue );
	if ( ! facet ) {
		return 0;
	}
	const plan = planToggle( catalogue, parse( runPhp( toggleStatePhp( facet ) ) ) );
	plan.notes.forEach( ( n ) => log( `note: ${ n }` ) );
	plan.say && log( `  ${ plan.say }` );
	if ( ! apply || 'set' !== plan.action ) {
		return 0;
	}
	runPhp( toggleApplyPhp( plan.set ) );
	const again = planToggle( catalogue, parse( runPhp( toggleStatePhp( facet ) ) ) );
	if ( 'exists' !== again.action ) {
		error( `FAILED: the on-off filter is not set after the write: ${ again.say }` );
		return 1;
	}
	log( `  done: ${ again.say }` );
	return 0;
}
