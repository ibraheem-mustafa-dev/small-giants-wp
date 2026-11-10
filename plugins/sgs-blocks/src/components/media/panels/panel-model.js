/**
 * The media panels' model (Spec 49 §9.1, §9.3, §9.4): which panels a slot
 * shows, and which rows each holds, at one device.
 *
 * Pure. Each row comes from an atom's `settings` entry (`control.panel`,
 * `control.order`, `control.component`) and is kept or dropped by that atom's
 * `disclosure( attrs, device, prefix, opts )`. The panel component renders the
 * result; nothing here touches React.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import { MEDIA_ATOMS } from '../atoms/registry.js';
import { disclosure as sourceDisclosure } from '../atoms/source.js';
import { disclosure as mediaTypeDisclosure } from '../atoms/media-type.js';
import { disclosure as videoBehaviourDisclosure } from '../atoms/video-behaviour.js';
import { disclosure as meaningDisclosure } from '../atoms/meaning.js';
import { disclosure as intrinsicDisclosure } from '../atoms/intrinsic.js';
import { disclosure as svgPresentationDisclosure } from '../atoms/svg-presentation.js';
import { disclosure as objectFitDisclosure } from '../atoms/object-fit.js';
import { disclosure as focalPointDisclosure } from '../atoms/focal-point.js';
import { disclosure as boxShapeDisclosure } from '../atoms/box-shape.js';
import { disclosure as overlayDisclosure } from '../atoms/overlay.js';
import { disclosure as opacityDisclosure } from '../atoms/opacity.js';
import { disclosure as shadowDisclosure } from '../atoms/shadow.js';
import { disclosure as mediaPaddingDisclosure } from '../atoms/media-padding.js';
import { disclosure as captionDisclosure } from '../atoms/caption.js';
import { disclosure as linkDisclosure } from '../atoms/link.js';
import { disclosure as sizingDisclosure } from '../atoms/sizing.js';
import { disclosure as shapeDisclosure } from '../atoms/shape.js';
import { disclosure as filterDisclosure } from '../atoms/filter.js';
import { disclosure as layoutDisclosure } from '../atoms/layout.js';
import { ADOPTED_SETTINGS, adoptedAtomsForElement } from '../emit/adopted-settings.js';
import { adoptedDisclosure } from './adopted-disclosure.js';

/** Atom id to its disclosure function. */
export const ATOM_DISCLOSURE = {
	source: sourceDisclosure,
	'media-type': mediaTypeDisclosure,
	'video-behaviour': videoBehaviourDisclosure,
	meaning: meaningDisclosure,
	intrinsic: intrinsicDisclosure,
	'svg-presentation': svgPresentationDisclosure,
	'object-fit': objectFitDisclosure,
	'focal-point': focalPointDisclosure,
	'box-shape': boxShapeDisclosure,
	overlay: overlayDisclosure,
	opacity: opacityDisclosure,
	shadow: shadowDisclosure,
	'media-padding': mediaPaddingDisclosure,
	caption: captionDisclosure,
	link: linkDisclosure,
	sizing: sizingDisclosure,
	shape: shapeDisclosure,
	filter: filterDisclosure,
	layout: layoutDisclosure,
};

/**
 * §9.4's panels in display order. `open` panels start expanded (§9.1).
 * `title` is a function so the strings translate at call time.
 */
export const PANELS = [
	{ id: 'media', group: 'settings', open: true, title: () => __( 'Media', 'sgs-blocks' ) },
	{ id: 'caption-and-link', group: 'settings', open: false, title: () => __( 'Caption and link', 'sgs-blocks' ) },
	{ id: 'video', group: 'settings', open: false, title: () => __( 'Video', 'sgs-blocks' ) },
	{ id: 'size-and-crop', group: 'styles', open: true, title: () => __( 'Size and crop', 'sgs-blocks' ) },
	{ id: 'position-in-layout', group: 'styles', open: false, title: () => __( 'Position in the layout', 'sgs-blocks' ) },
	{ id: 'border-and-shape', group: 'styles', open: false, title: () => __( 'Border and shape', 'sgs-blocks' ) },
	{ id: 'shadow', group: 'styles', open: false, title: () => __( 'Shadow', 'sgs-blocks' ) },
	{ id: 'overlay-and-filters', group: 'styles', open: false, title: () => __( 'Overlay and filters', 'sgs-blocks' ) },
	{ id: 'typography', group: 'styles', open: false, title: () => __( 'Typography', 'sgs-blocks' ) },
	{ id: 'svg', group: 'styles', open: false, title: () => __( 'SVG', 'sgs-blocks' ) },
	{ id: 'hover', group: 'styles', open: false, title: () => __( 'Hover', 'sgs-blocks' ) },
	{ id: 'entrance-and-reveal', group: 'styles', open: false, title: () => __( 'Entrance and reveal', 'sgs-blocks' ) },
	{ id: 'effects', group: 'styles', open: false, title: () => __( 'Effects', 'sgs-blocks' ) },
];

/** The one panel a container background mounts (§9.4). */
export const BACKGROUND_PANEL = {
	id: 'background',
	group: 'styles',
	open: true,
	title: () => __( 'Background', 'sgs-blocks' ),
};

/**
 * Leader base to the bases its one control also edits. A colour row carries its
 * gradient and hover forms, a shadow row its colours, a link row its tab and
 * rel; the absorbed bases get no row of their own.
 */
export const COMPOSITES = {
	OverlayColour: [ 'OverlayGradient', 'OverlayColourHover', 'OverlayGradientHover' ],
	BorderColour: [ 'BorderColourGradient' ],
	BoxShadow: [ 'BoxShadowColour', 'BoxShadowColourHover' ],
	LinkUrl: [ 'LinkOpensNewTab', 'LinkRel', 'LinkUrlSource' ],
};

/** The adopted path's composites: the same leaders, with the §8 members. A border colour carries its hover form. */
export const ADOPTED_COMPOSITES = {
	...COMPOSITES,
	BorderColour: [ 'BorderColourHover' ],
};

/** Components that edit a whole slot or group: one render per panel, however many rows name them. */
export const ONCE_PER_PANEL = [ 'MediaSlotField', 'LimitsGroup' ];

const PANEL_INDEX = Object.fromEntries( PANELS.map( ( p, i ) => [ p.id, i ] ) );

/**
 * Build the panels for one slot at one device.
 *
 * @param {Object}   args
 * @param {string[]} args.atomIds   Atom ids the slot declares, registry order.
 * @param {Object}   args.attrs     Block attributes.
 * @param {string}   args.device    'desktop' | 'tablet' | 'mobile'.
 * @param {string}   [args.prefix]  Surface prefix.
 * @param {Object}   [args.opts]    `{ blockSlug, kinds, context, parallax }`.
 * @param {boolean}  [args.adopted] Build from the §8 rows of an adopted slot (`kinds` declared).
 * @param {string[]} [args.extraPanelIds] Panels the caller fills itself
 *                                  (typography, hover, effects...).
 * @return {Array<{panel:Object,rows:Array,extra:boolean}>} Panels with at
 *         least one row or caller content, in display order.
 */
export function buildPanelModel( { atomIds, attrs, device, prefix = '', opts = {}, extraPanelIds = [], adopted = false } ) {
	const rows = [];
	const ids = adopted && atomIds.length ? adoptedAtomsForElement( { atoms: atomIds } ) : atomIds;
	ids.forEach( ( id, atomIndex ) => {
		const atom = adopted ? { settings: ADOPTED_SETTINGS[ id ] } : MEDIA_ATOMS[ id ];
		const disclose = adopted
			? ( ...args ) => adoptedDisclosure( id, ...args )
			: ATOM_DISCLOSURE[ id ];
		if ( ! atom || ! atom.settings || ! disclose || false === atom.clientEditable ) {
			return;
		}
		const states = disclose( attrs, device, prefix, opts );
		atom.settings.forEach( ( setting ) => {
			if ( ! setting.control ) {
				return;
			}
			const state = states[ setting.base ] || { state: 'shown', hiddenReason: null };
			if ( 'omitted' === state.state ) {
				return;
			}
			rows.push( { atomId: id, atomIndex, setting, state, panelId: setting.control.panel } );
		} );
	} );

	const present = new Set( rows.map( ( r ) => r.setting.base ) );
	const absorbed = new Set();
	Object.entries( adopted ? ADOPTED_COMPOSITES : COMPOSITES ).forEach( ( [ leader, members ] ) => {
		if ( present.has( leader ) ) {
			members.forEach( ( m ) => absorbed.add( m ) );
		}
	} );
	const kept = rows.filter( ( r ) => ! absorbed.has( r.setting.base ) );

	const byOrder = ( a, b ) =>
		a.setting.control.order - b.setting.control.order || a.atomIndex - b.atomIndex;

	// A whole-slot or group field renders once, at its first row.
	const once = ( list ) => {
		if ( ! adopted ) {
			return list;
		}
		const seen = new Set();
		return list.filter( ( r ) => {
			const name = r.setting.control.component;
			if ( ! ONCE_PER_PANEL.includes( name ) ) {
				return true;
			}
			if ( seen.has( name ) ) {
				return false;
			}
			seen.add( name );
			return true;
		} );
	};

	if ( opts && 'background' === opts.context ) {
		const sorted = [ ...kept ].sort(
			( a, b ) =>
				( PANEL_INDEX[ a.panelId ] ?? 99 ) - ( PANEL_INDEX[ b.panelId ] ?? 99 ) || byOrder( a, b )
		);
		return sorted.length
			? [ { panel: BACKGROUND_PANEL, rows: once( sorted ), extra: extraPanelIds.includes( 'background' ) } ]
			: [];
	}

	return PANELS.map( ( panel ) => ( {
		panel,
		rows: once( kept.filter( ( r ) => r.panelId === panel.id ).sort( byOrder ) ),
		extra: extraPanelIds.includes( panel.id ),
	} ) ).filter( ( p ) => p.rows.length || p.extra );
}

/**
 * Every `control.component` name the given atoms use that a component map
 * does not provide.
 *
 * @param {string[]} atomIds Atom ids.
 * @param {Object}   map     Component name to component.
 * @return {string[]} Sorted unmapped names.
 */
export function unmappedComponents( atomIds, map, adopted = false ) {
	const names = new Set();
	( adopted ? adoptedAtomsForElement( { atoms: atomIds } ) : atomIds ).forEach( ( id ) => {
		( ( adopted ? ADOPTED_SETTINGS[ id ] : MEDIA_ATOMS[ id ]?.settings ) || [] ).forEach( ( s ) => {
			if ( s.control && ! map[ s.control.component ] ) {
				names.add( s.control.component );
			}
		} );
	} );
	return [ ...names ].sort();
}
