// How a draft decorative layer's box and stacking become sgs/decorative-image settings: one reading shared by the applier's layers
// family (lib/apply-family-layers.mjs) and the clone fill stage (lib/fill-resolve-element.mjs), so neither carries its own copy.
//  - z-index: a draft `auto` paints in the tree-order layer of its siblings, which is z-index 0; a draft number is that number.
//  - size: an axis placed by both of its sides is sized by them (100%, or calc() of the two offsets); the resolver measures px.
//  - anchorTo: a layer inside a block that lifts section-anchored layers is anchored to the section.
import fs from 'node:fs';
import { candidates } from './db.mjs';
import { DECISIONS_FILE } from './skeleton-facts.mjs';
import { declaredSides } from './decoration-layers.mjs';
import { TIER_WIDTHS } from './fill-prop.mjs';

export const LAYER_BLOCK = 'sgs/decorative-image';
const TIER_OF = { 1440: 'desktop', 768: 'tablet', 375: 'mobile' };
const px = ( v ) => ( /^-?[\d.]+px$/.test( String( v ?? '' ).trim() ) ? parseFloat( v ) : null );
const round = ( n ) => Math.round( n * 100 ) / 100;

let decisions = null;
const rules = () => ( decisions ??= JSON.parse( fs.readFileSync( DECISIONS_FILE, 'utf8' ) ) ).rules || {};

// The z-index setting's value for a draft z-index: `auto` (or anything not a whole number) is 0, a whole number is itself.
export const zValue = ( raw ) => ( /^-?\d+$/.test( String( raw ?? '' ).trim() ) ? Number( raw ) : 0 );

// The anchorTo a layer inside `parentBlock` takes ('section' for a block that lifts section layers), else null.
export const anchorFor = ( parentBlock ) => ( ( rules().decorationLayer?.sectionAnchorBlocks || [] ).includes( parentBlock ) ? 'section' : null );

// The size an axis takes when both its sides are placed: '100%' when flush, else calc() of the two measured offsets; null otherwise.
export function stretchedSize( placed, [ a, b ], offsetA, offsetB ) {
	if ( ! ( placed[ a ] && placed[ b ] ) ) {
		return null;
	}
	const sum = ( px( offsetA ) ?? 0 ) + ( px( offsetB ) ?? 0 );
	return 0 === sum ? '100%' : `calc(100% - ${ round( sum ) }px)`;
}

// A draft width or height declared as a plain length, any width of which is a percentage: a percentage is a share of the layer's
// containing box, which the measured px (the resolver's reading) cannot say. Returns the declared text when it is a plain length
// ("46%", "132px") and null for a keyword, var() or calc() (stretchedSize owns calc()).
export const plainDeclaredLength = ( v ) => ( /^-?(\d+\.?\d*|\.\d+)(px|rem|em|%)$/.test( String( v ?? '' ).trim() ) ? String( v ).trim() : null );

// The per-width sizes a layer's declared `prop` gives when at least one width declares a percentage and every width declares a
// plain length: { width: text }, else null (the resolver judges the measured px, as before).
export function declaredSizes( declaredAt, prop ) {
	const sizes = Object.fromEntries( Object.entries( declaredAt ).map( ( [ w, d ] ) => [ w, plainDeclaredLength( d?.[ prop ] ) ] ) );
	const all = Object.values( sizes );
	return all.length && all.every( Boolean ) && all.some( ( v ) => v.endsWith( '%' ) ) ? sizes : null;
}

// The per-width width a layer takes when the draft declares none: an out-of-flow element (absolute or fixed) with no width of its own
// (nothing declared, or `auto`) shrinks to fit its content, which is the layer width setting's `auto` (max-content). Every width must
// say so, or null: a width declared at any one width, or an element in the flow, is the resolver's to judge.
export function shrinkSizes( declaredAt, stylesAt ) {
	const widths = Object.keys( declaredAt );
	const shrinks = ( w ) => /^(?:absolute|fixed)$/.test( String( stylesAt?.[ w ]?.position ?? '' ) ) && [ undefined, '', 'auto' ].includes( declaredAt[ w ]?.width );
	return widths.length && widths.every( shrinks ) ? Object.fromEntries( widths.map( ( w ) => [ w, 'auto' ] ) ) : null;
}

// The rotation in degrees a computed `transform` is, or null where it is anything else. A rotation is a 2D matrix whose axes are
// the unit vectors turned by one angle with no translation (the layer's centring or pixel offset is its own transform); `none` is no rotation.
export function rotationOf( raw ) {
	const v = String( raw ?? '' ).trim();
	if ( 'none' === v ) {
		return 0;
	}
	const m = /^matrix\(([^)]+)\)$/.exec( v );
	const [ a, b, c, d, e, f ] = m ? m[ 1 ].split( ',' ).map( Number ) : [];
	if ( ! m || [ a, b, c, d, e, f ].some( ( x ) => ! Number.isFinite( x ) ) || 6 !== m[ 1 ].split( ',' ).length ) {
		return null;
	}
	const turned = Math.abs( a - d ) < 1e-3 && Math.abs( b + c ) < 1e-3 && Math.abs( ( a * a ) + ( b * b ) - 1 ) < 1e-2;
	return turned && Math.abs( e ) <= 0.5 && Math.abs( f ) <= 0.5 ? round( ( Math.atan2( b, a ) * 180 ) / Math.PI ) : null;
}

// The sides a declared-style object (`{ inset: '0', top: … }`) places a layer by.
export const sidesOfDeclared = ( declared ) => declaredSides( Object.entries( declared || {} ).map( ( [ k, v ] ) => `${ k }:${ v }` ).join( ';' ) );

// The per-tier object of one value read at each width: the desktop value, a narrower tier only where it differs from the wider.
export function tiered( byWidth ) {
	const out = {};
	let wider;
	for ( const w of TIER_WIDTHS ) {
		if ( undefined === byWidth[ w ] ) {
			continue;
		}
		if ( 'desktop' === TIER_OF[ w ] || JSON.stringify( byWidth[ w ] ) !== JSON.stringify( wider ) ) {
			out[ TIER_OF[ w ] ] = byWidth[ w ];
		}
		wider = byWidth[ w ];
	}
	return out;
}

// The setting the database ties to a property on the layer's own box (the wrapper).
export const settingFor = ( db, prop ) => {
	const rows = candidates( db, LAYER_BLOCK, prop, null );
	return rows.find( ( r ) => 'wrapper' === r.css_element ) ?? rows[ 0 ] ?? null;
};

// A write straight to the setting the database names, for a value the resolver does not measure: a % or calc() size, and the
// z-index (one number for every width). Returns { writes } or { gap }.
export function directWrite( db, prop, byWidth ) {
	const setting = settingFor( db, prop );
	if ( ! setting ) {
		return { gap: `${ LAYER_BLOCK } has no ${ prop } setting` };
	}
	if ( 'z-index' === prop ) {
		const values = [ ...new Set( Object.values( byWidth ).map( zValue ) ) ];
		return 1 === values.length ? { writes: [ { attr: setting.attr_name, value: values[ 0 ] } ] } : { gap: `the draft's z-index differs between widths (${ values.join( ', ' ) }) and ${ setting.attr_name } holds one number` };
	}
	return { writes: [ { attr: setting.attr_name, value: tiered( byWidth ) } ] };
}
