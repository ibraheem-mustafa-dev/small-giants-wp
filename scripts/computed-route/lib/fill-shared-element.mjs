// A block that reads the draft element its parent block reads (the same draftRef and the same root finder: a positioned layer
// and the text inside it, a strip and the words in it, a wrapper and the block it stands for) holds that element's text and
// content settings; the element's box look is drawn once, by the parent. Both blocks reading one element wrote its background,
// border, padding, clip-path and shadow twice, so the clone drew two nested boxes (a tag drawn double, its padding doubled).
//   - parentDrawsBox: the node's root element is the one its parent's root reads, and the parent is a node Fill reads.
//   - BOX_LOOK: the properties that make the box look (background, border and its radii, padding, clip-path, box-shadow).
//   - rootTwinProps: a part of the block paired to the node's own draft element reads only what the part's settings paint.
// Never a block name, a slot name or a pixel value.
import { snapsOf } from './fill-resolve-state.mjs';
import { LOOSE } from './resolve.mjs';
import { paintedProps, longhandsOf } from './css-families.mjs';

export const BOX_LOOK = /^(?:background(?:-(?:color|image|clip|origin|position|repeat|size))?|border(?:-(?:top|right|bottom|left)(?:-(?:left|right))?)?(?:-(?:width|style|color|radius))?|padding(?:-(?:top|right|bottom|left))?|clip-path|box-shadow)$/;

const json = ( v ) => JSON.stringify( v );

// Whether `target` (a root target of `rec`) is the draft element the root of rec's parent also reads, and that parent was read.
// st: Fill's state; calFor( block, rec ) is the calibration the parent is judged against.
export function parentDrawsBox( st, rec, target ) {
	if ( '' !== target.slot || null === rec.parent || undefined === rec.parent ) {
		return false;
	}
	const parent = st.nodes[ rec.parent ];
	const up = parent.targets.find( ( t ) => '' === t.slot );
	if ( ! up || ! target.finder || json( up.finder ) !== json( target.finder ) ) {
		return false;
	}
	return !! st.calFor( parent.name, parent ) && Object.keys( snapsOf( st, up.id ) ).length > 0;
}

// A part of a block the skeleton paired to the node's own draft element that holds the block's other read parts: the draft
// lays the block's items out on its root, so that element is the block's root and the items' container at once (a gallery's
// image grid, lib/skeleton-part-slots.mjs::itemSlots `container`). The part's target reads only the properties the block's settings paint at the part (each resting setting
// whose slot is the part, with its longhands, and each property calibration discovered a setting changing there); the
// element's box, its placement in its parent and its text are the root's, read once on the root target, so a margin or a
// padding is never written twice. Returns that set of properties, or null for a target that is not such a part.
export function rootTwinProps( cal, rec, target ) {
	if ( ! target?.slot || ! target.finder ) {
		return null;
	}
	const root = ( rec.targets || [] ).find( ( t ) => '' === t.slot );
	const at = LOOSE( target.slot );
	// Only a part that holds other parts the draft is read at (the items' container) is the root's layout box; a leaf part read
	// at the root's element (a form field's input, whose look its host block holds) keeps every property.
	const holds = ( rec.targets || [] ).some( ( t ) => t !== target && LOOSE( t.slot ?? '' ).startsWith( `${ at } > ` ) );
	if ( ! root || json( root.finder ) !== json( target.finder ) || ! holds ) {
		return null;
	}
	const out = new Set();
	for ( const s of Object.values( cal?.settings || {} ) ) {
		if ( s && ! s.state && ( s.slots || [ s.slot ] ).some( ( p ) => 'string' === typeof p && LOOSE( p ) === at ) ) {
			paintedProps( s ).forEach( ( p ) => [ p, ...longhandsOf( p ) ].forEach( ( q ) => out.add( q ) ) );
		}
	}
	for ( const props of Object.values( cal?.discovered || {} ) ) {
		for ( const [ p, e ] of Object.entries( props || {} ) ) {
			e && ! e.state && ( e.slots || [] ).some( ( q ) => LOOSE( q ) === at ) && out.add( p );
		}
	}
	return out;
}
