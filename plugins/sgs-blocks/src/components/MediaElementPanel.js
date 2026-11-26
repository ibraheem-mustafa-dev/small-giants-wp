/**
 * The media element's panel mount (Spec 49 §9.4).
 *
 * A slot whose `supports.sgs.mediaElements` entry declares `kinds` renders the shared panels
 * (`media/panels/MediaPanels.js`), built from each atom's `disclosure( attrs, device, prefix )`. `kinds` comes from the
 * `kinds` prop or, with `blockName`, from the block's own entry for this prefix. A slot with no kinds renders nothing.
 *
 * The inspector slot for each tab is mounted at once (a fill keeps the place it registered in), and only the panels'
 * body loads lazily inside it. Mounting the slot inside the lazy chunk would register it after every other panel.
 * A background has Styles panels only, so it mounts no Settings slot.
 *
 * The lazy body sits in a `PlacedSuspense`: content that resolves after the first render is otherwise appended after every
 * other fill's panels (see that file), which is why Settings media panels landed late on first select.
 *
 * `inGroup` names the inspector group the caller already sits inside (`<InspectorControls group="styles">` around the
 * mount). A fill nested inside another fill registers only when the outer fill's content reaches its tab, after every
 * top-level fill, so it lands last on first select whatever its place in the JSX; that group's panels render in place
 * inside the caller's fill instead, and keep the place the caller gave them.
 *
 * @package SGS\Blocks
 */
import { InspectorControls } from '@wordpress/block-editor';
import { getBlockType } from '@wordpress/blocks';
import { lazy } from '@wordpress/element';

import { ADOPTED_ATOM_IDS } from './media/emit/adopted-settings.js';
import PlacedSuspense from './PlacedSuspense.js';

// The adopted panels load on first use as one shared chunk, so the 30-odd block bundles that import this
// component do not each carry a copy (about 80 KB apiece).
const MediaPanels = lazy( () =>
	import(
		/* webpackChunkName: "media-panels" */ './media/panels/MediaPanels.js'
	)
);

/**
 * The `kinds` a block declares for one media slot, or an empty list.
 *
 * @param {string} blockName Block name, for example 'sgs/media'.
 * @param {string} prefix    Slot prefix.
 * @return {string[]} The allowed kinds.
 */
export function declaredKinds( blockName, prefix ) {
	const entry = declaredEntry( blockName, prefix );
	return entry && Array.isArray( entry.kinds ) ? entry.kinds : [];
}

/**
 * The block's `supports.sgs.mediaElements` entry for one slot, or null.
 *
 * @param {string} blockName Block name.
 * @param {string} prefix    Slot prefix.
 * @return {Object|null} The entry.
 */
function declaredEntry( blockName, prefix ) {
	const entries = blockName
		? getBlockType( blockName )?.supports?.sgs?.mediaElements
		: null;
	return Array.isArray( entries )
		? entries.find( ( e ) => ( e.prefix || '' ) === prefix ) || null
		: null;
}

/**
 * Mount one media slot's panels.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes     Block attributes.
 * @param {Function} props.setAttributes  Block `setAttributes`.
 * @param {string}   [props.prefix]       Surface prefix ('' when unprefixed).
 * @param {string}   [props.blockSlug]    Block slug, for stored-name resolution.
 * @param {string[]} [props.atoms]        Atom ids; omitted means every adopted atom.
 * @param {string[]} [props.kinds]        The slot's allowed kinds; a non-empty list selects the panel path.
 * @param {string}   [props.blockName]    Block name, to read `kinds` and `blockOwns` from its slot entry.
 * @param {string}   [props.context]      'element' | 'background' (panel path).
 * @param {boolean}  [props.parallax]     Parallax is on for this background (panel path).
 * @param {Object}   [props.panelContent] Panel id to caller content (panel path).
 * @param {string}   [props.label]        Names the slot in each panel title when a block mounts more than one (panel path).
 * @param {string}   [props.inGroup]     'settings' | 'styles': the inspector group the caller is already inside; that group's panels render in place, with no slot of their own (panel path).
 * @param {Function} [props.slotActions]  Extra actions for an image slot's picker: `( { kind, own, device, prefix, attributes, setAttributes, access } ) => node`, drawn beside Replace and Remove (panel path).
 * @return {Object|null} The mounted panels, or null.
 */
export default function MediaElementPanel( {
	attributes,
	setAttributes,
	prefix = '',
	blockSlug = '',
	atoms,
	kinds,
	blockName = '',
	context = 'element',
	parallax,
	panelContent,
	label = '',
	slotActions,
	inGroup = '',
} ) {
	const slotKinds =
		Array.isArray( kinds ) && kinds.length
			? kinds
			: declaredKinds( blockName, prefix );
	// A setting the block edits with its own control (the slot entry's `blockOwns` bases) is not shown twice.
	const owns = declaredEntry( blockName, prefix )?.blockOwns;
	if ( slotKinds.length ) {
		const atomIds =
			Array.isArray( atoms ) && atoms.length ? atoms : ADOPTED_ATOM_IDS;
		const tab = ( group ) => {
			const body = (
				<PlacedSuspense>
					<MediaPanels
						group={ group }
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix={ prefix }
						blockSlug={ blockSlug }
						atomIds={ atomIds }
						kinds={ slotKinds }
						context={ context }
						parallax={ parallax }
						panelContent={ panelContent }
						label={ label }
						blockOwns={ Array.isArray( owns ) ? owns : [] }
						slotActions={ slotActions }
					/>
				</PlacedSuspense>
			);
			return group === inGroup ? (
				body
			) : (
				<InspectorControls group={ group }>{ body }</InspectorControls>
			);
		};
		return (
			<>
				{ 'background' !== context && tab( 'settings' ) }
				{ tab( 'styles' ) }
			</>
		);
	}
	return null;
}
