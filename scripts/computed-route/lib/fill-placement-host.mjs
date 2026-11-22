// The block an absolutely placed element is placed against (Spec 48 FR-48-109): the residual CSS writer writes an
// out-of-flow element's position, insets and size only where the clone puts the element in the same containing block the
// draft does. That is the nearest ancestor block whose box is positioned, in the draft's render and in the clone's own:
//   - each block between the element and its host is unpositioned in the draft and in the clone (an ancestor the clone
//     positions on its own would take the element in the draft's place);
//   - the host's draft element is positioned at every width the element states its position at, and the clone holds the
//     same: the block's calibrated default paint of `position` at its root, or a position rule this instance already
//     carries in its Custom CSS outside any @media rule (the writer visits a host before the blocks inside it).
// No positioned ancestor block means the element sits against the page or an element the clone does not draw: refused.
// Nothing here names a block, a part or a class.
import { defaultPaint } from './fill-prop.mjs';

const POSITIONED = /^(relative|absolute|sticky|fixed)$/;
// The `@media` rules of a Custom CSS text, which hold a position at some widths only.
const MEDIA = /@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g;
const RULE_POSITION = /(?:^|[;{\s])position\s*:\s*(relative|absolute|sticky|fixed)\b/;

// Whether the instance's own Custom CSS positions its root at every width.
const cssPositions = ( node ) => RULE_POSITION.test( String( node?.attributes?.sgsCustomCss ?? '' ).replace( MEDIA, '' ) );

// Returns { host: <node record> } or { why }. rec: the element's node record (nodes[ i ]); widths: the widths its position
// is stated at; nodes/flat: the skeleton's records and the tree's nodes by index; reads: Fill's reads ({ widths });
// calFor( block ): the block's calibration.
export function placementHost( { rec, nodes, flat, reads, calFor, widths } ) {
	for ( let i = rec.parent; null !== i && undefined !== i; i = nodes[ i ].parent ) {
		const up = nodes[ i ];
		const root = up.targets.find( ( t ) => '' === ( t.slot ?? '' ) );
		if ( ! root ) {
			continue;
		}
		const drawn = widths.map( ( w ) => reads.widths?.[ w ]?.[ root.id ]?.styles?.position );
		if ( drawn.some( ( p ) => undefined === p || '' === p ) ) {
			return { why: `${ up.name } above it is not read for its position at every width, so its containing block is not proved` };
		}
		const cal = calFor( up.name );
		const clone = widths.map( ( w ) => POSITIONED.test( String( defaultPaint( cal, '', w, 'position' ) ?? '' ) ) || cssPositions( flat[ up.index ] ) );
		const draftOn = drawn.map( ( p ) => POSITIONED.test( p ) );
		if ( draftOn.every( Boolean ) ) {
			return clone.every( Boolean ) ? { host: up } : { why: `${ up.name } above it is its containing block in the draft, and the clone does not position it` };
		}
		if ( draftOn.some( Boolean ) || clone.some( Boolean ) ) {
			return { why: `${ up.name } above it is positioned ${ draftOn.some( Boolean ) ? 'in the draft' : 'only in the clone' }, so the element would be placed against another box than the draft's` };
		}
	}
	return { why: 'no block above it is positioned, so its containing block is the page or an element the clone does not draw' };
}
