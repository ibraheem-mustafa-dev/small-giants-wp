// A block that reads the draft element its parent block reads (the same draftRef and the same root finder: a positioned layer
// and the text inside it, a strip and the words in it, a wrapper and the block it stands for) holds that element's text and
// content settings; the element's box look is drawn once, by the parent. Both blocks reading one element wrote its background,
// border, padding, clip-path and shadow twice, so the clone drew two nested boxes (a tag drawn double, its padding doubled).
//   - parentDrawsBox: the node's root element is the one its parent's root reads, and the parent is a node Fill reads.
//   - BOX_LOOK: the properties that make the box look (background, border and its radii, padding, clip-path, box-shadow).
// Never a block name, a slot name or a pixel value.
import { snapsOf } from './fill-resolve-state.mjs';

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
