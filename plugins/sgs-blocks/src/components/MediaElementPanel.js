/**
 * The media element's panel mount (Spec 49 §9.4).
 *
 * A slot whose `supports.sgs.mediaElements` entry declares `kinds` renders the shared panels
 * (`media/panels/MediaPanels.js`), built from each atom's `disclosure( attrs, device, prefix )`. `kinds` comes from the
 * `kinds` prop or, with `blockName`, from the block's own entry for this prefix. A slot with no kinds renders nothing.
 *
 * @package SGS\Blocks
 */
import { getBlockType } from '@wordpress/blocks';
import { Suspense, lazy } from '@wordpress/element';

import { ADOPTED_ATOM_IDS } from './media/emit/adopted-settings.js';

// The adopted panels load on first use as one shared chunk, so the 30-odd block bundles that import this
// component do not each carry a copy (about 80 KB apiece).
const MediaPanels = lazy( () => import( /* webpackChunkName: "media-panels" */ './media/panels/MediaPanels.js' ) );

/**
 * The `kinds` a block declares for one media slot, or an empty list.
 *
 * @param {string} blockName Block name, for example 'sgs/media'.
 * @param {string} prefix    Slot prefix.
 * @return {string[]} The allowed kinds.
 */
export function declaredKinds( blockName, prefix ) {
	const entries = getBlockType( blockName )?.supports?.sgs?.mediaElements;
	const entry = Array.isArray( entries )
		? entries.find( ( e ) => ( e.prefix || '' ) === prefix )
		: null;
	return entry && Array.isArray( entry.kinds ) ? entry.kinds : [];
}

/**
 * Mount one media slot's panels.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @param {string}   [props.prefix]      Surface prefix ('' when unprefixed).
 * @param {string}   [props.blockSlug]   Block slug, for stored-name resolution.
 * @param {string[]} [props.atoms]       Atom ids; omitted means every adopted atom.
 * @param {string[]} [props.kinds]       The slot's allowed kinds; a non-empty list selects the panel path.
 * @param {string}   [props.blockName]   Block name, to read `kinds` from its slot entry.
 * @param {string}   [props.context]     'element' | 'background' (panel path).
 * @param {boolean}  [props.parallax]    Parallax is on for this background (panel path).
 * @param {Object}   [props.panelContent] Panel id to caller content (panel path).
 * @param {string}   [props.label]       Names the slot in each panel title when a block mounts more than one (panel path).
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
} ) {
	const slotKinds = Array.isArray( kinds ) && kinds.length ? kinds : declaredKinds( blockName, prefix );
	if ( slotKinds.length ) {
		return (
			<Suspense fallback={ null }>
				<MediaPanels
					attributes={ attributes }
					setAttributes={ setAttributes }
					prefix={ prefix }
					blockSlug={ blockSlug }
					atomIds={ Array.isArray( atoms ) && atoms.length ? atoms : ADOPTED_ATOM_IDS }
					kinds={ slotKinds }
					context={ context }
					parallax={ parallax }
					panelContent={ panelContent }
					label={ label }
				/>
			</Suspense>
		);
	}
	return null;
}
