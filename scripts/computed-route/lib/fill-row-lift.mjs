// The Site Info row lift (FR-47-4): a row of generated brand icons shares one look, held by the row's childIcon*
// settings, never by each icon. Each icon's draft link is read as the row's shape element and the glyph inside it as
// the row's glyph element (the DB's css_element names both), resolved against the row's calibration, and a setting is
// written on the row once, only when every copy gives the same value. A disagreement is UNMAPPED, never averaged.
import { attrsFor } from './db.mjs';
import { setAttr } from './tree.mjs';
import { ROW_GLYPH_SLOT } from './fill-skeleton.mjs';

const json = ( v ) => JSON.stringify( v );
const freshOut = () => ( { writes: [], unmapped: [], notes: [], handover: [], spacing: [], fluid: [], held: [], unread: [] } );

// The row's element path for each element name ('shape', 'glyph'): the calibrated slot of a setting the DB places there.
export function rowElementPaths( db, block, cal ) {
	const out = {};
	for ( const r of attrsFor( db, block ) ) {
		const slot = cal?.settings?.[ r.attr_name ]?.slot;
		if ( r.css_element && undefined !== slot && ! r.css_state && ! ( r.css_element in out ) ) {
			out[ r.css_element ] = slot;
		}
	}
	return out;
}

// One copy's reading of one element, written into a throwaway copy of the row: { values: { attr: final value },
// props: { attr: prop }, unmapped: [rows] }.
function readCopy( st, rowRec, ref, cal, target, path, snaps, fillElement ) {
	const node = structuredClone( st.flat[ rowRec.index ] );
	const flat = st.flat.slice();
	flat[ rowRec.index ] = node;
	const sub = { ...st, flat, out: freshOut(), shown: new Map( st.shown ) };
	fillElement( sub, rowRec, ref, cal, { id: target.id, slot: path }, snaps );
	const values = {};
	const props = {};
	for ( const w of sub.out.writes ) {
		values[ w.attr ] = node.attributes[ w.attr ];
		props[ w.attr ] = w.prop;
	}
	return { values, props, unmapped: sub.out.unmapped };
}

// Lifts the generated icons' shared look onto the row node `rowRec`. snapsOf( id ): a target's reads by width.
export function liftRow( st, rowRec, ref, cal, { fillElement, snapsOf } ) {
	const paths = rowElementPaths( st.db, rowRec.name, cal );
	const copies = rowRec.children.map( ( c ) => st.nodes[ c ] ).filter( ( c ) => c.targets.length );
	for ( const [ element, slotOf ] of [ [ 'shape', '' ], [ 'glyph', ROW_GLYPH_SLOT ] ] ) {
		const path = paths[ element ];
		const readings = copies.map( ( c ) => {
			const target = c.targets.find( ( t ) => t.slot === slotOf );
			const snaps = target ? snapsOf( st, target.id ) : {};
			return target && path && Object.keys( snaps ).length ? readCopy( st, rowRec, ref, cal, target, path, snaps, fillElement ) : null;
		} ).filter( Boolean );
		if ( ! readings.length ) {
			continue;
		}
		const node = st.flat[ rowRec.index ];
		for ( const attr of [ ...new Set( readings.flatMap( ( r ) => Object.keys( r.values ) ) ) ] ) {
			const prop = readings.find( ( r ) => r.props[ attr ] ).props[ attr ];
			const seen = readings.map( ( r ) => json( r.values[ attr ] ?? null ) );
			if ( seen.every( ( v ) => v === seen[ 0 ] ) && readings.length === copies.length ) {
				const { before, after } = setAttr( node, { attr, value: readings[ 0 ].values[ attr ], merge: 'replace' } );
				st.out.writes.push( { node: ref, index: rowRec.index, block: rowRec.name, slot: path, prop, attr, before, after, widths: [], how: 'row-lift' } );
			} else {
				st.out.unmapped.push( { node: ref, block: rowRec.name, slot: path, property: prop, value: [ ...new Set( seen ) ].join( ' | ' ), reason: `disagree: the ${ copies.length } icons give ${ attr } ${ [ ...new Set( seen ) ].length } different values (${ readings.length } read); it is written only when every copy agrees` } );
			}
		}
		// What no row setting holds, once per distinct row.
		const rows = new Map();
		for ( const u of readings.flatMap( ( r ) => r.unmapped ) ) {
			rows.set( json( [ u.property, u.value, u.reason ] ), { ...u, node: ref, block: rowRec.name, slot: path } );
		}
		st.out.unmapped.push( ...rows.values() );
	}
}
