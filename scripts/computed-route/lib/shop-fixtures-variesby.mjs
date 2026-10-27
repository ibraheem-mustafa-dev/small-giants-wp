// The Google variesBy axis on the shop fixtures' variation terms (Spec 48 section 16, "Minimum fixture products"). SGS's
// product preflight (`includes/class-product-preflight.php`, Check 6 `no_variesby`) needs one term of a variable product's
// variation attributes to carry a valid `_sgs_variesby_value`, and a failing variable-product save unpublishes the product.
// Term meta is not writable over the WooCommerce REST API, so it goes through wp-cli (`wp eval-file -`), in two steps: a read
// of each term's current value, then a write of the axis to the terms that have none. The decision is made here from the
// read, so a value already set is never replaced; the write's PHP re-checks it as a guard. The axis comes from the
// catalogue's own mapping (`catalogue-read.mjs::variesByOf`, the words `map_axis_to_variesby` uses).
import { VARIESBY_VALUES } from './catalogue-read.mjs';
import { evalScript } from './calibration-refs.mjs';

export class VariesByError extends Error {}

const MARK = 'SGSJSON:';
const b64 = ( data ) => Buffer.from( JSON.stringify( data ) ).toString( 'base64' );

// The PHP prologue: the payload and the variesBy sanitiser the framework itself uses (an empty string when the value is not one of its axes).
const PROLOGUE = ( data ) => `
$payload = json_decode( base64_decode( '${ b64( data ) }' ), true );
$sgs_variesby = function ( $value ) {
	return class_exists( '\\\\SGS\\\\Blocks\\\\Configurator_Meta' ) ? \\SGS\\Blocks\\Configurator_Meta::sanitize_variesby( $value ) : (string) $value;
};
$sgs_out = function ( $data ) { echo '${ MARK }' . wp_json_encode( $data ) . "\\n"; };
`;

// Per attribute option: the term (by name, then by slug) and its current variesBy value.
export const readPhp = ( attributes ) => `${ PROLOGUE( attributes ) }
$rows = array();
foreach ( $payload as $a ) {
	foreach ( $a['options'] as $name ) {
		$t = get_term_by( 'name', $name, $a['taxonomy'] );
		if ( ! $t ) { $t = get_term_by( 'slug', sanitize_title( $name ), $a['taxonomy'] ); }
		$rows[] = array( 'taxonomy' => $a['taxonomy'], 'term' => $name, 'termId' => $t ? (int) $t->term_id : 0, 'current' => $t ? $sgs_variesby( get_term_meta( $t->term_id, '_sgs_variesby_value', true ) ) : '' );
	}
}
$sgs_out( $rows );
`;

// Writes each `{ termId, value }` whose term still has no value; reports the term ids it wrote.
export const writePhp = ( writes ) => `${ PROLOGUE( writes ) }
$done = array();
foreach ( $payload as $w ) {
	if ( '' === $sgs_variesby( get_term_meta( $w['termId'], '_sgs_variesby_value', true ) ) && '' !== $sgs_variesby( $w['value'] ) ) {
		update_term_meta( $w['termId'], '_sgs_variesby_value', $sgs_variesby( $w['value'] ) );
		$done[] = (int) $w['termId'];
	}
}
$sgs_out( $done );
`;

function run( wp, php ) {
	const out = String( wp( [ 'eval-file', '-' ], evalScript( php ) ) );
	const line = out.split( /\r?\n/ ).find( ( l ) => l.startsWith( MARK ) );
	if ( ! line ) {
		throw new VariesByError( `wp eval-file answered no result: ${ out.slice( 0, 300 ) }` );
	}
	return JSON.parse( line.slice( MARK.length ) );
}

// Read only: per term `{ taxonomy, term, termId, current, axis, action }`, where `action` is `write` (no value yet), `has`
// (a value is set and stays) or `missing` (the term does not exist on the site yet).
export function planVariesBy( wp, attributes ) {
	for ( const a of attributes ) {
		if ( ! VARIESBY_VALUES.includes( a.variesBy ) ) {
			throw new VariesByError( `${ a.taxonomy } has no Google variesBy axis (${ a.variesBy }): the product preflight would refuse it` );
		}
	}
	const axis = ( taxonomy ) => attributes.find( ( a ) => a.taxonomy === taxonomy ).variesBy;
	return run( wp, readPhp( attributes.map( ( { taxonomy, options } ) => ( { taxonomy, options } ) ) ) ).map( ( r ) => ( { ...r, axis: axis( r.taxonomy ), action: ! r.termId ? 'missing' : r.current ? 'has' : 'write' } ) );
}

// Writes the axis to the terms with none, then reads again: every term must exist and carry a value. Returns the plan rows
// as they stood before the write (so `write` rows say what was written).
export function applyVariesBy( wp, attributes ) {
	const before = planVariesBy( wp, attributes );
	const writes = before.filter( ( r ) => 'write' === r.action ).map( ( r ) => ( { termId: r.termId, value: r.axis } ) );
	if ( writes.length ) {
		run( wp, writePhp( writes ) );
	}
	const bad = planVariesBy( wp, attributes ).filter( ( r ) => 'has' !== r.action );
	if ( bad.length ) {
		throw new VariesByError( `after the write these terms still carry no variesBy value: ${ bad.map( ( r ) => `${ r.taxonomy }:${ r.term } (${ r.action })` ).join( ', ' ) }` );
	}
	return before;
}
