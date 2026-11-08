// Rulings the applier carries out. A divergence entry (sites/<client>/build/qa/divergences.json) that overrules the draft names the
// block, node, state and property it covers; when the ruling can be applied mechanically it also carries an `apply` field:
//   "apply": {
//     "when":   { "attrs": { "inheritStyle": "link" } },          optional: only blocks whose saved attributes hold every value
//     "remove": {
//       "attrs":        [ "colourTextHover" ],                       settings removed, and never written from the draft
//       "effectValues": { "magnet": [ "engage", "radius" ] },        keys removed from every layer of that sgsMotion effect (the effect itself stays on)
//       "hoverPose":    true                                         the hover state's scale, lift and turn removed, and never written
//     },
//     "set":    { "colourTextHover": "@colourText" }                 settings the ruling gives: a literal, or `@attr` for another saved setting (absent: the setting is removed)
//   }
// `rulingFor` reads what a ruling asks of one block's saved attributes (the removals as writes, the attributes the families then see);
// `finish` takes the same ruling out of a family's writes, so a draft value is never written back over it.
import { placeHit } from './apply-ledger.mjs';

const POSE = /^(?:scale|translate[XYZ]?|rotate[XYZ]?|skew[XY]?)$/;
// Saved block settings come back from PHP with an empty object as an empty list (`{}` saves as `[]`), so both count as empty.
const canon = ( v ) => ( Array.isArray( v ) ? ( v.length ? v.map( canon ) : {} ) : v && 'object' === typeof v ? Object.fromEntries( Object.entries( v ).map( ( [ k, x ] ) => [ k, canon( x ) ] ) ) : v );
export const same = ( a, b ) => JSON.stringify( canon( a ) ) === JSON.stringify( canon( b ) );

// Every layer list of a motion document: [ { list, where } ] for each element's `effects` and `hover.effects`.
const layerLists = ( doc ) => Object.values( doc?.elements ?? {} ).flatMap( ( el ) => [ el?.effects, el?.hover?.effects ] ).filter( Array.isArray );

// The ruling's changes to one motion document, in place. Returns whether it changed.
function ruleDocument( doc, remove ) {
	let changed = false;
	for ( const list of layerLists( doc ) ) {
		for ( const layer of list ) {
			for ( const key of remove.effectValues?.[ layer.effect ] ?? [] ) {
				if ( layer.values && key in layer.values ) {
					delete layer.values[ key ];
					changed = true;
				}
			}
		}
	}
	for ( const el of remove.hoverPose ? Object.values( doc?.elements ?? {} ) : [] ) {
		const values = el?.hover?.state?.values;
		const pose = Object.keys( values ?? {} ).filter( ( k ) => POSE.test( k ) );
		pose.forEach( ( k ) => delete values[ k ] );
		pose.length && ( changed = true );
	}
	return changed;
}

// { rows, attrs, writes } for one block: `rows` the rulings that cover it (index rows with `apply`), `attrs` its saved attributes with the
// rulings applied (what the families should see), `writes` the changes that take the saved attributes there.
export function rulingFor( index, { ref, surface, block, attrs = {}, part = null } ) {
	const rows = ( Array.isArray( index ) ? index : [] ).filter( ( r ) => r.apply && placeHit( r, { ref, surface, block, part } ) && Object.entries( r.apply.when?.attrs ?? {} ).every( ( [ k, v ] ) => same( attrs[ k ], v ) ) );
	const next = structuredClone( attrs );
	const writes = [];
	for ( const { apply } of rows ) {
		for ( const attr of apply.remove?.attrs ?? [] ) {
			if ( attr in next && ! ( attr in ( apply.set ?? {} ) ) ) {
				delete next[ attr ];
				writes.push( { attr, unset: true } );
			}
		}
		for ( const [ attr, raw ] of Object.entries( apply.set ?? {} ) ) {
			const value = 'string' === typeof raw && raw.startsWith( '@' ) ? next[ raw.slice( 1 ) ] : raw;
			if ( undefined === value ) {
				attr in next && ( delete next[ attr ], writes.push( { attr, unset: true } ) );
			} else if ( ! same( next[ attr ], value ) ) {
				next[ attr ] = value;
				writes.push( { attr, value } );
			}
		}
		if ( next.sgsMotion && ruleDocument( next.sgsMotion, apply.remove ?? {} ) ) {
			writes.push( { attr: 'sgsMotion', value: structuredClone( next.sgsMotion ) } );
		}
	}
	return { rows, attrs: next, writes };
}

// A family's writes with the rulings taken out: a removed setting is dropped, a `set` setting takes the ruling's value, and the ruled
// effect values and hover pose are removed from any motion document the write carries.
export function finish( writes, rule ) {
	if ( ! rule.rows.length ) {
		return writes;
	}
	const out = [];
	for ( const w of writes ) {
		const ruled = rule.rows.map( ( r ) => r.apply );
		const set = ruled.find( ( a ) => w.attr in ( a.set ?? {} ) );
		if ( set ) {
			const raw = set.set[ w.attr ];
			const value = 'string' === typeof raw && raw.startsWith( '@' ) ? rule.attrs[ raw.slice( 1 ) ] : raw;
			out.push( undefined === value ? { attr: w.attr, unset: true } : { ...w, value, unset: undefined } );
		} else if ( ruled.some( ( a ) => ( a.remove?.attrs ?? [] ).includes( w.attr ) ) && ! w.unset ) {
			continue;
		} else if ( 'sgsMotion' === w.attr && w.value ) {
			const value = structuredClone( w.value );
			ruled.forEach( ( a ) => ruleDocument( value, a.remove ?? {} ) );
			out.push( { ...w, value } );
		} else {
			out.push( w );
		}
	}
	return out.map( ( w ) => ( undefined === w.unset ? Object.fromEntries( Object.entries( w ).filter( ( [ k ] ) => 'unset' !== k ) ) : w ) );
}
