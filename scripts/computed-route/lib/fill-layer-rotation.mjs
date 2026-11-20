// A decorative layer's resting rotation (sgs/decorative-image `rotation`, degrees per device). The draft rotates a layer with a
// `transform: rotate(...)`, read as the computed matrix; the generic resolver cannot turn a matrix into the degrees a setting holds,
// so the row is left UNMAPPED. This pass runs after the motion pass and writes the degrees where nothing else holds the rotation:
//   - a layer whose hover state carries a resting pose (sgsMotion `restRotate`) has its rotation held there, and the motion pass
//     settles the row (lib/fill-motion-settle.mjs::restPoseGives); writing `rotation` as well would turn the layer twice;
//   - a matrix that is more than a turn (a pixel offset, a scale, a skew) is left raised, as the layer's centring and offsets are
//     other settings' work.
// The setting is the one the database ties to `transform` on the layer's wrapper (lib/layer-box.mjs::settingFor).
import { LAYER_BLOCK, rotationOf, settingFor, tiered } from './layer-box.mjs';
import { WIDTHS, rowTarget, rowValues, commit, perNode, regroup, answer } from './fill-regap.mjs';

// The pass's outcome: { writes, unmapped (the rows left), answered (the rows written) }.
export function layerRotationWrites( { nodes, flat, refOf, reads, db, unmapped, motionWrites = [] } ) {
	const out = { writes: [], unmapped: [], answered: [] };
	const setting = db ? settingFor( db, 'transform' ) : null;
	for ( const row of perNode( unmapped ) ) {
		const mine = 'transform' === row.property && LAYER_BLOCK === row.block && '' === ( row.slot ?? '' ) && ! row.state && setting;
		const hit = mine ? rowTarget( { nodes, flat, refOf }, row ) : null;
		const held = hit && motionWrites.some( ( w ) => w.node === row.node && 'sgsMotion' === w.attr && /"restRotate"/.test( JSON.stringify( w.after ) ) );
		const given = hit && ! held ? rowValues( row, reads, hit.target ) : {};
		const degrees = Object.fromEntries( WIDTHS.filter( ( w ) => undefined !== given[ w ] ).map( ( w ) => [ w, rotationOf( given[ w ] ) ] ) );
		if ( ! hit || held || ! Object.keys( degrees ).length || Object.values( degrees ).some( ( d ) => null === d ) ) {
			out.unmapped.push( row );
			continue;
		}
		const node = flat[ hit.rec.index ];
		const res = { writes: [ { attr: setting.attr_name, value: tiered( degrees ) } ], included: Object.fromEntries( Object.keys( degrees ).map( ( w ) => [ w, true ] ) ) };
		commit( out, { rec: hit.rec, node, row, prop: 'transform', res, how: 'layer-rotation', note: `the draft turns the layer ${ Object.entries( degrees ).map( ( [ w, d ] ) => `${ d }deg at ${ w }` ).join( ', ' ) }` } );
		out.answered.push( answer( row, Object.keys( degrees ) ) );
	}
	out.unmapped = regroup( out.unmapped );
	return out;
}
