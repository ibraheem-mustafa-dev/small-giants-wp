/**
 * The C1 settings an adopted slot (one whose `supports.sgs.mediaElements` entry declares `kinds`) reads, as data, in
 * Spec 49 §8's names. `atom-settings.js` holds the rows of the bases the older atoms own today, which no adopted slot
 * reads; `kinds-settings.js` holds the four new atoms' rows. This file holds the §8 rows of the older atoms as §6.2
 * extends them, and `ADOPTED_SETTINGS` joins all three by atom id.
 *
 * Folded atoms (`media-type`, `intrinsic`) and `box-shape` (split into `sizing` and `shape`) have no adopted row.
 * Nothing an existing block reads changes: nothing reads these until a slot declares `kinds`.
 *
 * Every entry carries `adopted: true`. A responsive entry is stored as one `{desktop,tablet,mobile}` object under its
 * §8 name, never as flat `Tablet` and `Mobile` siblings.
 *
 * @package SGS\Blocks
 */

import { FILTER_SETTINGS, LAYOUT_SETTINGS, SHAPE_SETTINGS, SIZING_SETTINGS } from './kinds-settings.js';

const MEDIA = 'media';
const SIZES = 'size-and-crop';
const BORDER = 'border-and-shape';
const OVERLAY = 'overlay-and-filters';

/**
 * One C1 entry in §8's vocabulary.
 *
 * @param {Object} o Fields: `base`, `type`, `responsive`, `emitter`, `property`, `paintNode`, `role`, `component`,
 *                   `label`, `panel`, `order`, optional `state`.
 * @return {Object} C1 entry.
 */
function row( o ) {
	const css = { property: o.property || null, paintNode: o.paintNode || null };
	if ( o.state ) {
		css.state = o.state;
	}
	return {
		base: o.base,
		type: o.type,
		responsive: !! o.responsive,
		since: '2.0',
		emitter: o.emitter || 'none',
		role: o.role,
		css,
		control: { component: o.component, label: o.label, panel: o.panel, order: o.order },
		slots: 'all',
		adopted: true,
	};
}

const SOURCE_SETTINGS = [
	row( { base: 'Source', type: 'object', responsive: true, role: 'content', component: 'MediaSlotField', label: 'Media', panel: MEDIA, order: 1 } ),
	row( { base: 'Loading', type: 'string', role: 'behaviour', component: 'SelectControl', label: 'Load priority', panel: MEDIA, order: 5 } ),
];

const MEANING_SETTINGS = [
	row( { base: 'Alt', type: 'string', role: 'image-alt', component: 'MediaSlotField', label: 'Alt text', panel: MEDIA, order: 2 } ),
	row( { base: 'Decorative', type: 'boolean', role: 'behaviour', component: 'MediaSlotField', label: 'Decorative', panel: MEDIA, order: 3 } ),
];

const FIT_SETTINGS = [
	row( { base: 'Fit', type: 'string', responsive: true, emitter: 'plain', property: 'object-fit', paintNode: 'media', role: 'visual', component: 'FitField', label: 'How it fills', panel: SIZES, order: 8 } ),
	row( { base: 'Repeat', type: 'string', responsive: true, emitter: 'plain', property: 'background-repeat', paintNode: 'media', role: 'visual', component: 'SelectControl', label: 'Tile', panel: SIZES, order: 10 } ),
	row( { base: 'TileSize', type: 'string', responsive: true, emitter: 'plain', property: 'background-size', paintNode: 'media', role: 'visual', component: 'LengthField', label: 'Tile size', panel: SIZES, order: 11 } ),
];

const FOCAL_SETTINGS = [
	row( { base: 'Focal', type: 'object', responsive: true, emitter: 'focal', property: 'object-position', paintNode: 'media', role: 'visual', component: 'FocalField', label: 'Focal point', panel: SIZES, order: 9 } ),
	row( { base: 'Pinned', type: 'boolean', emitter: 'plain', property: 'background-attachment', paintNode: 'media', role: 'visual', component: 'ToggleControl', label: 'Keep the photo still while the page scrolls', panel: SIZES, order: 12 } ),
];

const PADDING_SETTINGS = [
	row( { base: 'Padding', type: 'object', responsive: true, emitter: 'sides', property: 'padding', paintNode: 'surface', role: 'layout', component: 'SidesField', label: 'Padding', panel: BORDER, order: 6 } ),
	row( { base: 'Background', type: 'string', emitter: 'plain', property: 'background-color', paintNode: 'surface', role: 'color', component: 'SurfaceColourField', label: 'Background colour', panel: BORDER, order: 7 } ),
];

const OVERLAY_SETTINGS = [
	row( { base: 'OverlayColour', type: 'string', emitter: 'colour-states', property: 'background-color', paintNode: 'overlay', role: 'color', component: 'ColourField', label: 'Overlay colour', panel: OVERLAY, order: 1 } ),
	row( { base: 'OverlayColourHover', type: 'string', emitter: 'colour-states', property: 'background-color', paintNode: 'overlay', role: 'color', component: 'ColourField', label: 'Overlay colour on hover', panel: OVERLAY, order: 1.1, state: 'hover' } ),
	row( { base: 'OverlayGradient', type: 'string', emitter: 'colour-states', property: 'background-image', paintNode: 'overlay', role: 'colour-gradient', component: 'ColourField', label: 'Overlay gradient', panel: OVERLAY, order: 1.2 } ),
	row( { base: 'OverlayGradientHover', type: 'string', emitter: 'colour-states', property: 'background-image', paintNode: 'overlay', role: 'colour-gradient', component: 'ColourField', label: 'Overlay gradient on hover', panel: OVERLAY, order: 1.3, state: 'hover' } ),
	row( { base: 'OverlayOpacity', type: 'number', responsive: true, emitter: 'plain', property: 'opacity', paintNode: 'overlay', role: 'visual', component: 'RangeControl', label: 'Overlay strength', panel: OVERLAY, order: 2 } ),
	row( { base: 'OverlayBlend', type: 'string', emitter: 'plain', property: 'mix-blend-mode', paintNode: 'overlay', role: 'visual', component: 'SelectControl', label: 'Overlay blend', panel: OVERLAY, order: 3 } ),
];

const OPACITY_SETTINGS = [
	row( { base: 'Opacity', type: 'number', responsive: true, emitter: 'plain', property: 'opacity', paintNode: 'media', role: 'visual', component: 'RangeControl', label: 'Photo opacity', panel: OVERLAY, order: 4 } ),
	row( { base: 'Blend', type: 'string', emitter: 'plain', property: 'mix-blend-mode', paintNode: 'media', role: 'visual', component: 'SelectControl', label: 'Photo blend', panel: OVERLAY, order: 5 } ),
];

const SHADOW_SETTINGS = [
	row( { base: 'BoxShadow', type: 'string', emitter: 'shadow', property: 'box-shadow', paintNode: 'surface', role: 'visual', component: 'ShadowField', label: 'Shadow', panel: 'shadow', order: 1 } ),
	row( { base: 'BoxShadowColour', type: 'string', emitter: 'shadow', property: 'box-shadow', paintNode: 'surface', role: 'color', component: 'ShadowField', label: 'Shadow colour', panel: 'shadow', order: 2 } ),
	row( { base: 'BoxShadowColourHover', type: 'string', emitter: 'shadow', property: 'box-shadow', paintNode: 'surface', role: 'color', component: 'ShadowField', label: 'Shadow colour on hover', panel: 'shadow', order: 3, state: 'hover' } ),
];

const SVG_SETTINGS = [
	row( { base: 'SvgLayer', type: 'string', role: 'layout', component: 'SelectControl', label: 'Layer order', panel: 'svg', order: 1 } ),
	row( { base: 'SvgTextShadow', type: 'boolean', role: 'behaviour', component: 'ToggleControl', label: 'Text shadow', panel: 'svg', order: 2 } ),
];

const PLAYBACK_SETTINGS = [
	row( { base: 'Playback', type: 'object', role: 'behaviour', component: 'PlaybackField', label: 'Playback', panel: 'video', order: 1 } ),
];

const CAPTION_SETTINGS = [
	row( { base: 'Caption', type: 'string', role: 'content', component: 'TextControl', label: 'Caption', panel: 'caption-and-link', order: 1 } ),
	row( { base: 'CaptionTag', type: 'string', role: 'tag-identity', component: 'SelectControl', label: 'Caption tag', panel: 'caption-and-link', order: 2 } ),
];

const LINK_SETTINGS = [
	row( { base: 'LinkUrl', type: 'string', role: 'link-href', component: 'LinkField', label: 'Link', panel: 'caption-and-link', order: 3 } ),
	row( { base: 'LinkOpensNewTab', type: 'boolean', role: 'behaviour', component: 'LinkField', label: 'Open in a new tab', panel: 'caption-and-link', order: 4 } ),
	row( { base: 'LinkRel', type: 'string', role: 'technical', component: 'LinkField', label: 'Link relationship', panel: 'caption-and-link', order: 5 } ),
	row( { base: 'LinkUrlSource', type: 'string', role: 'technical', component: 'LinkField', label: 'Link source', panel: 'caption-and-link', order: 6 } ),
];

/** The shape emitter's hover border colour, which `kinds-settings.js` leaves without a setting. */
const BORDER_HOVER = row( {
	base: 'BorderColourHover',
	type: 'string',
	emitter: 'colour-states',
	property: 'border-color',
	paintNode: 'surface',
	role: 'color',
	component: 'ColourField',
	label: 'Border colour on hover',
	panel: BORDER,
	order: 5.1,
	state: 'hover',
} );

/** A new atom's rows from `kinds-settings.js`, marked as adopted. */
const adopt = ( list ) => list.map( ( setting ) => ( { ...setting, adopted: true } ) );

/** Atom id to the §8 rows an adopted slot reads from it. */
export const ADOPTED_SETTINGS = {
	source: SOURCE_SETTINGS,
	meaning: MEANING_SETTINGS,
	'object-fit': FIT_SETTINGS,
	'focal-point': FOCAL_SETTINGS,
	'media-padding': PADDING_SETTINGS,
	overlay: OVERLAY_SETTINGS,
	opacity: OPACITY_SETTINGS,
	shadow: SHADOW_SETTINGS,
	'svg-presentation': SVG_SETTINGS,
	'video-behaviour': PLAYBACK_SETTINGS,
	caption: CAPTION_SETTINGS,
	link: LINK_SETTINGS,
	sizing: adopt( SIZING_SETTINGS ),
	shape: [ ...adopt( SHAPE_SETTINGS ), BORDER_HOVER ],
	filter: adopt( FILTER_SETTINGS ),
	layout: adopt( LAYOUT_SETTINGS ),
};

/** Older atoms an adopted slot may name that carry no row of their own, and the atoms each becomes. */
export const ADOPTED_FOLDED = {
	'media-type': [],
	intrinsic: [],
	'box-shape': [ 'sizing', 'shape' ],
};

/** Atom ids an adopted slot uses when its entry names none. */
export const ADOPTED_ATOM_IDS = Object.keys( ADOPTED_SETTINGS );

/**
 * The atoms an adopted entry resolves to: its declared list, with each folded or split atom replaced, in declared
 * order and without repeats. An entry naming none gets every adopted atom. An unknown id throws.
 *
 * @param {Object} element A `mediaElements` entry.
 * @return {string[]} Adopted atom ids.
 */
export function adoptedAtomsForElement( element ) {
	const declared = Array.isArray( element?.atoms ) && element.atoms.length ? element.atoms : ADOPTED_ATOM_IDS;
	const out = [];
	declared.forEach( ( id ) => {
		let ids;
		if ( ADOPTED_SETTINGS[ id ] ) {
			ids = [ id ];
		} else if ( ADOPTED_FOLDED[ id ] ) {
			ids = ADOPTED_FOLDED[ id ];
		} else {
			throw new Error(
				`sgs/media-elements: unknown atom "${ id }". Known atoms: ${ [ ...ADOPTED_ATOM_IDS, ...Object.keys( ADOPTED_FOLDED ) ].join( ', ' ) }`
			);
		}
		ids.forEach( ( one ) => {
			if ( ! out.includes( one ) ) {
				out.push( one );
			}
		} );
	} );
	return out;
}

/**
 * @param {string[]} atomIds Adopted atom ids.
 * @return {Object[]} Their rows, in atom order.
 */
export function adoptedSettingsForAtoms( atomIds ) {
	return atomIds.flatMap( ( id ) => ADOPTED_SETTINGS[ id ] || [] );
}
