/**
 * L3 — the media element's DISPATCH layer.
 *
 * Atoms own names, CSS and disclosure. Each atom's `control()` returns BARE
 * ROWS and deliberately mounts no panel of its own. This component is the
 * caller they were written for: it selects the atoms a surface declared,
 * gates them by the media type in play, composes their rows in registry
 * order, and decides where the result is mounted.
 *
 * ⛔ NOT named `MediaElementControls`. That filename is the L1 NAMING module
 * (`mediaAttrName`/`MEDIA_BASES`/`mediaAttrKeys`), which has no JSX at all.
 * Two different things under one name is how a reader concludes the dispatch
 * layer already existed.
 *
 * ── insertion ────────────────────────────────────────────────────────────────
 *
 * `'root'`    — the media IS the block, so this opens its own
 *               `<InspectorControls>` and its own panel.
 * `'element'` — the media is one element among several, so this returns bare
 *               rows for that element's existing panel to absorb. Per C14 an
 *               element's controls belong inside that element's panel, never
 *               free-floating at the top level.
 *
 * ⛔ The group comes from `insertion`, never hardcoded. `SgsColourPanel`
 * hardcodes `group="styles"` (SgsColourPanel.js), which is the C14 tab-split
 * inherited by all 65 of its adopters. Inherit its caller-composed row shape,
 * not that.
 *
 * ── what this component does NOT do ──────────────────────────────────────────
 *
 * It does not read `disclosure()`. Each atom's own `control()` already applies
 * its disclosure rule, and `video-behaviour` legally returns a MAP of per-base
 * states rather than a single state (D910). Re-reading it here would duplicate
 * that logic in a form that cannot express the map.
 *
 * ── adopted slots ────────────────────────────────────────────────────────────
 *
 * A slot whose `supports.sgs.mediaElements` entry declares `kinds` takes the
 * panel path instead (`media/panels/MediaPanels.js`): Spec 49 §9.4's panels,
 * built from each atom's `disclosure( attrs, device, prefix )`. `kinds` comes
 * from the `kinds` prop or, with `blockName`, from the block's own entry for
 * this prefix. Every other slot runs the body below unchanged.
 *
 * @package SGS\Blocks
 */
import { getBlockType } from '@wordpress/blocks';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { Suspense, lazy } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import { MEDIA_ATOMS, atomsForElement } from './media/atoms/registry.js';
import { ADOPTED_ATOM_IDS } from './media/emit/adopted-settings.js';

// The adopted panels load on first use as one shared chunk, so the 30-odd block bundles that import this
// component do not each carry a copy (about 80 KB apiece).
const MediaPanels = lazy( () => import( /* webpackChunkName: "media-panels" */ './media/panels/MediaPanels.js' ) );

import { control as sourceControl } from './media/atoms/source.control.js';
import { control as mediaTypeControl } from './media/atoms/media-type.control.js';
import { control as videoBehaviourControl } from './media/atoms/video-behaviour.control.js';
import { control as meaningControl } from './media/atoms/meaning.control.js';
import { control as intrinsicControl } from './media/atoms/intrinsic.control.js';
import { control as svgPresentationControl } from './media/atoms/svg-presentation.control.js';
import { control as objectFitControl } from './media/atoms/object-fit.control.js';
import { control as focalPointControl } from './media/atoms/focal-point.control.js';
import { control as boxShapeControl } from './media/atoms/box-shape.control.js';
import { control as overlayControl } from './media/atoms/overlay.control.js';
import { control as opacityControl } from './media/atoms/opacity.control.js';
import { control as shadowControl } from './media/atoms/shadow.control.js';
import { control as mediaPaddingControl } from './media/atoms/media-padding.control.js';
import { control as captionControl } from './media/atoms/caption.control.js';
import { control as linkControl } from './media/atoms/link.control.js';

/**
 * Atom id -> its control function.
 *
 * Deliberately held HERE rather than in an `atoms/` index: every file in that
 * directory which does not end `.control.js` is treated by
 * `check-media-atom-purity.js` as a LOGIC module and required to be plain-Node
 * importable, which a module importing ten JSX files can never be.
 */
const ATOM_CONTROLS = {
	source: sourceControl,
	'media-type': mediaTypeControl,
	'video-behaviour': videoBehaviourControl,
	meaning: meaningControl,
	intrinsic: intrinsicControl,
	'svg-presentation': svgPresentationControl,
	'object-fit': objectFitControl,
	'focal-point': focalPointControl,
	'box-shape': boxShapeControl,
	overlay: overlayControl,
	opacity: opacityControl,
	shadow: shadowControl,
	'media-padding': mediaPaddingControl,
	caption: captionControl,
	link: linkControl,
};

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
 * Compose one media element's inspector rows.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @param {string}   [props.prefix]      Surface prefix ('' when unprefixed).
 * @param {string}   [props.blockSlug]   Block slug, for `STORED_AS` resolution.
 * @param {string}   [props.insertion]   'root' | 'element'.
 * @param {string[]} [props.atoms]       Atom ids; omitted means every atom.
 * @param {string}   [props.mediaType]   'image' | 'video' | 'svg' — type gate.
 * @param {string}   [props.scope]       'element' | 'backdrop' | 'both'.
 * @param {string}   [props.previewUrl]  Image URL for the focal-point preview.
 * @param {string}   [props.format]      Focal-point storage: 'xy'|'css-string'.
 * @param {string}   [props.title]       Panel title when insertion is 'root'.
 * @param {string}   [props.group]       InspectorControls group when 'root'.
 * @param {string[]} [props.kinds]       The slot's allowed kinds; a non-empty list selects the panel path.
 * @param {string}   [props.blockName]   Block name, to read `kinds` from its slot entry.
 * @param {string}   [props.context]     'element' | 'background' (panel path).
 * @param {boolean}  [props.parallax]    Parallax is on for this background (panel path).
 * @param {Object}   [props.panelContent] Panel id to caller content (panel path).
 * @return {Array|Object|null} Bare rows, a mounted panel, or null.
 */
export default function MediaElementPanel( {
	attributes,
	setAttributes,
	prefix = '',
	blockSlug = '',
	insertion = 'root',
	atoms,
	mediaType = '',
	scope = 'element',
	previewUrl = '',
	format = 'css-string',
	title,
	group,
	kinds,
	blockName = '',
	context = 'element',
	parallax,
	panelContent,
} ) {
	const ids = atomsForElement( { atoms } );

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
				/>
			</Suspense>
		);
	}
	const rows = [];

	ids.forEach( ( id ) => {
		const atom = MEDIA_ATOMS[ id ];
		const control = ATOM_CONTROLS[ id ];
		if ( ! atom || ! control ) {
			return;
		}

		// An atom the client never edits contributes no row. `intrinsic` is
		// written from the chosen media, and exposing it would invite a value
		// that contradicts the file.
		if ( false === atom.clientEditable ) {
			return;
		}

		// TYPE GATE. `types` is enforced, not advisory: video behaviour on an
		// image, or object-fit on an inline SVG, is a control that cannot do
		// anything. With no media type known yet, every atom is offered.
		if ( mediaType && Array.isArray( atom.types ) && ! atom.types.includes( mediaType ) ) {
			return;
		}

		const produced = control( {
			attributes,
			setAttributes,
			prefix,
			blockSlug,
			scope,
			previewUrl,
			format,
		} );

		if ( Array.isArray( produced ) ) {
			produced.filter( Boolean ).forEach( ( row ) => rows.push( row ) );
		} else if ( produced ) {
			rows.push( produced );
		}
	} );

	// No rows means no panel — never an empty container. An empty ToolsPanelItem
	// still appears in its panel's disclosure menu, and an empty PanelBody opens
	// onto blank space; both are dead controls a client can find.
	if ( ! rows.length ) {
		return null;
	}

	if ( 'element' === insertion ) {
		return rows;
	}

	return (
		<InspectorControls group={ group }>
			<PanelBody title={ title || __( 'Media', 'sgs-blocks' ) } initialOpen={ false }>
				{ rows }
			</PanelBody>
		</InspectorControls>
	);
}
