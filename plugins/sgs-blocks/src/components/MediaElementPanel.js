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
 * @package SGS\Blocks
 */
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import { MEDIA_ATOMS, atomsForElement } from './media/atoms/registry.js';

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
import { control as motionControl } from './media/atoms/motion.control.js';
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
	motion: motionControl,
	opacity: opacityControl,
	shadow: shadowControl,
	'media-padding': mediaPaddingControl,
	caption: captionControl,
	link: linkControl,
};

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
} ) {
	const ids = atomsForElement( { atoms } );
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
