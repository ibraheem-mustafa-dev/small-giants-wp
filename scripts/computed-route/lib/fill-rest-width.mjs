// A motion part's resting width (Spec 48 FR-48-78, R-47-5). A draft element drawn at a fixed width that no width setting of
// its block holds, on a part the block's motion layer declares (a burger bar: the draft's third bar is 16px beside two 22px
// bars), is written as the part's hover state `restWidth`, the one width the framework paints at rest (motion.schema.json
// HoverStateValues; the same write the 2026-11-02 hand fix R2-H9 made). The pass reads the UNMAPPED `width` rows the other
// passes left on a part, so a width a transitioning bar's own hover state carries (lib/fill-motion-settle.mjs) is already
// settled and never reaches it.
import { validateMotionWrite } from './motion-validate.mjs';
import { setAttr } from './tree.mjs';
import { targetName } from './fill-motion.mjs';
import { exactHome } from './fill-part-pairing.mjs';
import { READ_WIDTHS } from './fill-read.mjs';

const PX = /^-?(?:\d+(?:\.\d+)?|\.\d+)px$/;

// A row's value per width: a per-width JSON object as written, else one plain value at every width the read covers.
function perWidth( row ) {
	try {
		const v = JSON.parse( row.value );
		if ( v && 'object' === typeof v && ! Array.isArray( v ) ) {
			return v;
		}
	} catch {}
	return Object.fromEntries( READ_WIDTHS.map( ( w ) => [ w, row.value ] ) );
}

// opts: { unmapped, nodes, flat, refOf, mdb, db, calFor, schema }. Returns { writes, unmapped (the rows left), answered
// (the rows written) } in the shapes lib/fill.mjs's passes use.
export function restWidthWrites( { unmapped, nodes, flat, refOf, mdb, db, calFor = () => null, schema } ) {
	const out = { writes: [], unmapped: [], answered: [] };
	const field = mdb.field( 'hover.state', 'values.restWidth' );
	for ( const row of unmapped ) {
		const n = field && 'width' === row.property && row.slot && ! row.state ? nodes.find( ( x ) => refOf( flat[ x.index ] ) === row.node ) : null;
		const t = n?.targets.find( ( x ) => x.slot === row.slot );
		const cal = t ? calFor( n.name ) : null;
		const target = t ? targetName( n, t, mdb.targetsOf( n.name ), cal && db ? ( el ) => exactHome( db, n.name, cal, el ) : null ) : null;
		const at = target ? perWidth( row ) : {};
		const lengths = [ ...new Set( Object.values( at ).map( ( v ) => String( v ).trim() ) ) ];
		// One px length at every width the row covers: a width that changes by tier has no single resting value to write.
		if ( ! target || 1 !== lengths.length || ! PX.test( lengths[ 0 ] ) ) {
			out.unmapped.push( row );
			continue;
		}
		const node = flat[ n.index ];
		const held = node.attributes?.sgsMotion;
		const doc = JSON.parse( JSON.stringify( held && 'object' === typeof held ? held : { v: 1, elements: {} } ) );
		doc.elements ??= {};
		const values = ( ( ( doc.elements[ target ] ??= {} ).hover ??= {} ).state ??= {} ).values ??= {};
		if ( undefined !== values.restWidth && values.restWidth !== lengths[ 0 ] ) {
			out.unmapped.push( { ...row, reason: `${ row.reason }; the part's hover state already rests at ${ values.restWidth }, which differs from the draft's ${ lengths[ 0 ] }` } );
			continue;
		}
		values.restWidth = lengths[ 0 ];
		if ( ! validateMotionWrite( doc, schema ).valid ) {
			out.unmapped.push( row );
			continue;
		}
		const { before, after } = setAttr( node, { attr: 'sgsMotion', value: doc } );
		const widths = Object.keys( at ).map( Number );
		out.writes.push( { node: row.node, block: n.name, slot: row.slot, prop: `motion ${ target } restWidth`, attr: 'sgsMotion', before, after, widths, how: 'motion' } );
		out.answered.push( { ...row, slot: row.slot, widths } );
	}
	return out;
}
