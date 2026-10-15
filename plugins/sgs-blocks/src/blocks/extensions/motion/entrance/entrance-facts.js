/**
 * The facts the Entrance and reveal panel reads (Spec 38A §5.2, §6.2): the entrance presets, the triggers a block and
 * part offer, the from and to properties and how each maps onto a property row, and the tier a stored path belongs to.
 * Every list comes from the schema extract or the preset file; nothing is worded or enumerated twice.
 *
 * Triggers. `load` and `scroll` are always offered. `state` is offered when the block declares named states in
 * `supports.sgs.motion.states`; `open` is offered only on a part listed in `supports.sgs.motion.opens` (the parts a
 * disclosure opens, `root` for the block's own element). A block with `supports.sgs.motion: true` declares neither.
 *
 * @package
 */

import { getBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import defs from '../../../../components/motion/motion-defs';
import presetFile from '../../../../components/motion/generated-motion-presets.json';
import gridColumns from '../stagger/generated-grid-columns.json';

const DEFS = defs.$defs;
const STATE_NAME = new RegExp( DEFS.stateName.pattern );

export const BASE_LIST = 'entrance.base';
export const TEXT_LIST = 'entrance.text';
export const TIERS = Object.freeze( [ 'desktop', 'tablet', 'mobile' ] );
export const EDITOR_STORE = 'core/block-editor';

const isObject = ( value ) =>
	Boolean( value ) && typeof value === 'object' && ! Array.isArray( value );

/**
 * The entrance presets the Entrance choice offers: the seeded presets of the entrance panel that are not an effect's.
 *
 * @return {{value: string, label: string}[]} Options, in preset-file order.
 */
export function entrancePresetOptions() {
	return presetFile.presets
		.filter(
			( preset ) =>
				preset.panel === 'entrance' &&
				preset.kind === 'preset' &&
				! preset.effect
		)
		.map( ( preset ) => ( { value: preset.slug, label: preset.label } ) );
}

/**
 * The triggers a part of a block can use beyond load and scroll.
 *
 * @param {string} blockName The block's name.
 * @param {string} target    The target key.
 * @return {{states: string[], canOpen: boolean}} The named states (without `open`) and whether Panel opens is offered.
 */
export function triggerFacts( blockName, target ) {
	const motion = getBlockType( blockName )?.supports?.sgs?.motion;
	const support = isObject( motion ) ? motion : {};
	const declared = Array.isArray( support.states )
		? support.states.filter(
				( name ) => typeof name === 'string' && STATE_NAME.test( name )
		  )
		: [];
	const opens = Array.isArray( support.opens ) ? support.opens : [];
	return {
		states: declared.filter( ( name ) => name !== 'open' ),
		canOpen: opens.includes( target ),
	};
}

/** Plain-language trigger names for the entrance (the schema names are `load`, `scroll`, `open`, `state`). */
export const ENTRANCE_TRIGGER_LABELS = Object.freeze( {
	load: __( 'Page load', 'sgs-blocks' ),
	scroll: __( 'Scroll into view', 'sgs-blocks' ),
	open: __( 'Panel opens', 'sgs-blocks' ),
	state: __( 'State', 'sgs-blocks' ),
} );

/** The stored from and to properties, in schema order. */
export const MOVE_KEYS = Object.freeze(
	Object.keys( DEFS.EntranceFrom.properties )
);

// The property row each stored key edits (a row carries one of the `propertyRow` properties).
const ROW_PROPERTY = Object.freeze( {
	opacity: 'opacity',
	translateX: 'x',
	translateY: 'y',
	scale: 'scale',
	rotate: 'rotate',
	rotateX: 'rotate',
	rotateY: 'rotate',
	blur: 'blur',
	clip: 'clip',
} );

export const MOVE_LABELS = Object.freeze( {
	opacity: __( 'Opacity', 'sgs-blocks' ),
	translateX: __( 'Move across (x)', 'sgs-blocks' ),
	translateY: __( 'Move down (y)', 'sgs-blocks' ),
	scale: __( 'Scale', 'sgs-blocks' ),
	rotate: __( 'Rotate', 'sgs-blocks' ),
	rotateX: __( 'Rotate on the x axis', 'sgs-blocks' ),
	rotateY: __( 'Rotate on the y axis', 'sgs-blocks' ),
	blur: __( 'Blur', 'sgs-blocks' ),
	clip: __( 'Reveal (clip)', 'sgs-blocks' ),
} );

// What a freshly added property starts from and moves to.
const MOVE_DEFAULTS = Object.freeze( {
	opacity: [ 0, 1 ],
	translateX: [ 24, 0 ],
	translateY: [ 24, 0 ],
	scale: [ 0.9, 1 ],
	rotate: [ -10, 0 ],
	rotateX: [ 45, 0 ],
	rotateY: [ 45, 0 ],
	blur: [ 8, 0 ],
	clip: [ 100, 0 ],
} );

/**
 * The property-row property a stored key edits.
 *
 * @param {string} key A stored from/to key.
 * @return {string} The `propertyRow` property.
 */
export const rowPropertyFor = ( key ) => ROW_PROPERTY[ key ];

/**
 * The start and end a newly added property takes.
 *
 * @param {string} key A stored from/to key.
 * @return {{from: number, to: number}} The defaults.
 */
export function moveDefaults( key ) {
	const [ from, to ] = MOVE_DEFAULTS[ key ];
	return { from, to };
}

/**
 * The path prefix under which a tier stores its overrides: Desktop is `values`, Tablet and Mobile `devices.<tier>`.
 *
 * @param {string} tier `desktop`, `tablet` or `mobile`.
 * @return {string} The prefix.
 */
export const tierPrefix = ( tier ) =>
	tier === 'desktop' ? 'values' : `devices.${ tier }`;

/**
 * The stored from/to keys a layer sets on its Desktop values, in schema order.
 *
 * @param {Object} layer The entrance layer.
 * @return {string[]} The keys.
 */
export function usedMoveKeys( layer ) {
	const from = layer?.values?.from;
	const to = layer?.values?.to;
	return MOVE_KEYS.filter(
		( key ) =>
			( isObject( from ) && key in from ) ||
			( isObject( to ) && key in to )
	);
}

/**
 * Whether an entrance value field is Desktop-only in the schema (no Tablet or Mobile override exists for it).
 *
 * @param {string} key A key of `EntranceValues`.
 * @return {boolean} True for a field with `perDevice: false`.
 */
export const isDesktopOnly = ( key ) =>
	DEFS.EntranceValues.properties[ key ]?.[ 'x-sgs-field' ]?.perDevice ===
	false;

// Blocks that print their items on the server, so their stagger delays are written when the page renders
// (`includes/motion/class-sgs-motion-loop-delays.php`: post_grid() and item_array() callers). The nav drawer's menu is
// one: a dynamic block with no inner blocks whose `render.php` tags its items and calls `item_array()`.
const SERVER_ITEM_BLOCKS = Object.freeze( [
	'sgs/post-grid',
	'sgs/card-grid',
	'sgs/gallery',
	'sgs/timeline',
	'sgs/nav-drawer-menu',
] );

/**
 * Whether a block's items are rendered by the server, so the editor has no child blocks to write delays on.
 *
 * @param {string} blockName The block's name.
 * @return {boolean} True for a server-rendered item block.
 */
export const hasServerItems = ( blockName ) =>
	SERVER_ITEM_BLOCKS.includes( blockName );

/**
 * Whether a block is a container the stagger helper acts on: its type has a stored column role, or it holds blocks.
 *
 * @param {string} blockName  The block's name.
 * @param {number} childCount Direct inner blocks.
 * @return {boolean} True for a container.
 */
export const isContainerBlock = ( blockName, childCount ) =>
	Boolean( gridColumns.blocks?.[ blockName ] ) ||
	hasServerItems( blockName ) ||
	childCount > 0;

/**
 * The container's stored column count at one tier: the block's column attribute for that tier (a tier object, or a
 * plain number), a blank tablet or mobile value inheriting the tier above. Null when the block stores no columns.
 *
 * @param {string} blockName  The block's name.
 * @param {Object} attributes The block's attributes (`layout` decides whether the columns apply).
 * @param {string} tier       `desktop`, `tablet` or `mobile`.
 * @return {number|null} The column count, or null.
 */
export function columnsAt( blockName, attributes, tier ) {
	// A block with a layout choice has columns only in its grid layout; any other layout is one column (§8).
	if (
		typeof attributes?.layout === 'string' &&
		attributes.layout !== 'grid'
	) {
		return null;
	}
	const attribute = gridColumns.blocks?.[ blockName ]?.[ tier ];
	const stored = attribute ? attributes?.[ attribute ] : undefined;
	if ( typeof stored === 'number' ) {
		return stored;
	}
	if ( ! isObject( stored ) ) {
		return null;
	}
	const chain = {
		desktop: [ 'desktop' ],
		tablet: [ 'tablet', 'desktop' ],
		mobile: [ 'mobile', 'tablet', 'desktop' ],
	};
	const found = chain[ tier ].find(
		( name ) =>
			Number.isFinite( Number( stored[ name ] ) ) && stored[ name ] !== ''
	);
	return found ? Number( stored[ found ] ) : null;
}
