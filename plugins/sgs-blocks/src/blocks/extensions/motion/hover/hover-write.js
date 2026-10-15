/**
 * Pure edits the Hover panel makes to one layer (Spec 38A §5.1, §6.2): the "Driven by" source, a field value at one
 * device tier, and the preset choice shown for a layer. Every edit returns a new layer; the layer operations in
 * `layers/use-motion-layers.js` validate and write it.
 *
 * A value at a tier is written through `layers/stamp.js::editField`, so the layer's `customised` paths follow the
 * edit: a value that differs from the stamped one is listed, and one that matches again is not.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import presetFile from '../../../../components/motion/generated-motion-presets.json';
import { sameValue } from '../../../../components/motion/atom-utils';
import { intensityRowsFor } from '../../../../components/motion/IntensityPicker';
import { editField, valueAtPath, presetBySlug } from '../layers/stamp';
import { itemMatches, motionParts } from '../canvas/resolve-target';

export const STATE_LIST = 'hover.state';
export const EFFECTS_LIST = 'hover.effects';
export const FOCUS_LIST = 'hover.focus';

const TIERS = [ 'tablet', 'mobile' ];

/** The "Driven by" choices and the `source` each one stores. */
export const SOURCE_OPTIONS = Object.freeze( [
	{ value: 'self', label: __( 'This element', 'sgs-blocks' ) },
	{ value: 'root', label: __( 'Whole block hovered', 'sgs-blocks' ) },
	{ value: 'group', label: __( 'Group hovered', 'sgs-blocks' ) },
] );

const ITEM_OPTION = Object.freeze( {
	value: 'item',
	label: __( 'Card hovered', 'sgs-blocks' ),
} );

/**
 * The "Driven by" choices for a target. "Card hovered" (source `item`: the repeated item the part sits in, so one card's
 * hover never moves another card's part) is offered only for a declared part of a block that has repeated items (an
 * `item` part, or `supports.sgs.animationItems` for items a child block renders); a layer already stored with it keeps
 * the choice.
 *
 * @param {Object}      args
 * @param {string}      args.blockName      The block's name.
 * @param {Object|null} args.elements       The block's `supports.sgs.elements`.
 * @param {string}      [args.animationItems] The block's `supports.sgs.animationItems`.
 * @param {string}      args.target         The chosen target key.
 * @param {string}      [args.current]      The source stored on the target's hover layers.
 * @return {{value: string, label: string}[]} The choices.
 */
export function sourceOptionsFor( {
	blockName,
	elements,
	animationItems = '',
	target,
	current,
} ) {
	const parts = motionParts( elements );
	const insideItem =
		Object.prototype.hasOwnProperty.call( parts, target ) &&
		parts[ target ] === false &&
		itemMatches( blockName, elements, animationItems ).length > 0;
	return insideItem || current === 'item'
		? [ ...SOURCE_OPTIONS, ITEM_OPTION ]
		: SOURCE_OPTIONS;
}

/**
 * The hover presets the Hover state choice offers: the preset rows of the hover panel that are not an effect's.
 *
 * @return {{value: string, label: string}[]} The choices, in the order of the preset file.
 */
export function hoverPresetChoices() {
	return presetFile.presets
		.filter(
			( row ) =>
				row.kind === 'preset' && row.panel === 'hover' && ! row.effect
		)
		.map( ( row ) => ( { value: row.slug, label: row.label } ) );
}

/**
 * The Hover state choice a layer shows: the preset row it was stamped from, or the preset row of the same family when
 * an Intensity choice re-stamped it from an intensity row.
 *
 * @param {Object|undefined} layer The hover state layer.
 * @return {string} The preset slug, or an empty string when the layer has none.
 */
export function choiceFor( layer ) {
	const row = layer?.preset ? presetBySlug( layer.preset ) : null;
	if ( ! row ) {
		return '';
	}
	const offered = hoverPresetChoices().map( ( choice ) => choice.value );
	if ( offered.includes( row.slug ) ) {
		return row.slug;
	}
	const sameFamily = presetFile.presets.find(
		( other ) =>
			other.kind === 'preset' &&
			other.panel === row.panel &&
			other.family === row.family &&
			offered.includes( other.slug )
	);
	return sameFamily ? sameFamily.slug : '';
}

/**
 * The preset family a layer's Intensity choice reads its rows from: the family of the row it was stamped from, else its
 * effect slug.
 *
 * @param {Object|undefined} layer The layer.
 * @return {string|undefined} The family.
 */
export function familyOf( layer ) {
	const row = layer?.preset ? presetBySlug( layer.preset ) : null;
	return row?.family ?? layer?.effect ?? undefined;
}

/**
 * The layer driven by another element: `self` is the default and stores nothing.
 *
 * @param {Object} layer  The layer.
 * @param {string} source `self`, `root`, `group` or `item`.
 * @return {Object} The layer.
 */
export function withSource( layer, source ) {
	const next = { ...layer };
	if ( source === 'self' || source === undefined || source === '' ) {
		delete next.source;
	} else {
		next.source = source;
	}
	return next;
}

/**
 * The path of a field at a device tier.
 *
 * @param {string} key  The field key.
 * @param {string} tier `desktop`, `tablet` or `mobile`.
 * @return {string} `values.<key>` or `devices.<tier>.<key>`.
 */
export function pathAt( key, tier ) {
	return tier === 'desktop'
		? `values.${ key }`
		: `devices.${ tier }.${ key }`;
}

// The layer without an emptied tablet or mobile override, and without an emptied `devices`.
function withoutEmptyDevices( layer ) {
	if ( ! layer.devices ) {
		return layer;
	}
	const devices = { ...layer.devices };
	TIERS.forEach( ( tier ) => {
		if ( ! Object.keys( devices[ tier ] || {} ).length ) {
			delete devices[ tier ];
		}
	} );
	const next = { ...layer };
	if ( Object.keys( devices ).length ) {
		next.devices = devices;
	} else {
		delete next.devices;
	}
	return next;
}

/**
 * The layer after a field changed in the three tiers `PerDeviceAtom` reports. Only a tier whose value changed is
 * written, so the other tiers and fields keep their Customised state.
 *
 * @param {Object}           layer   The layer.
 * @param {string}           key     The field key.
 * @param {Object}           values  The layer's new `values`.
 * @param {Object|undefined} devices The layer's new `devices`.
 * @return {Object} The edited layer.
 */
export function withTiers( layer, key, values, devices ) {
	const incoming = { ...layer, values, devices };
	let next = layer;
	[ 'desktop', ...TIERS ].forEach( ( tier ) => {
		const path = pathAt( key, tier );
		const value = valueAtPath( incoming, path );
		if ( ! sameValue( valueAtPath( next, path ), value ) ) {
			next = editField( next, path, value );
		}
	} );
	return withoutEmptyDevices( next );
}

/**
 * The layer after a field with no device tiers changed.
 *
 * @param {Object}  layer The layer.
 * @param {string}  key   The field key.
 * @param {unknown} value The new value; undefined clears it.
 * @return {Object} The edited layer.
 */
export function withValue( layer, key, value ) {
	return editField( layer, pathAt( key, 'desktop' ), value );
}

/**
 * The layer with one field cleared at one tier (the other tiers keep their values).
 *
 * @param {Object} layer The layer.
 * @param {string} key   The field key.
 * @param {string} tier  `desktop`, `tablet` or `mobile`.
 * @return {Object} The edited layer.
 */
export function clearField( layer, key, tier ) {
	if ( tier === 'desktop' ) {
		return withValue( layer, key, undefined );
	}
	const own = { ...( layer.devices?.[ tier ] || {} ) };
	delete own[ key ];
	return withTiers( layer, key, layer.values, {
		...layer.devices,
		[ tier ]: own,
	} );
}

const TIER_NAMES = [ 'desktop', 'tablet', 'mobile' ];

// The layer with one field cleared at every tier that holds it, so no hidden value stays stored.
function clearEverywhere( layer, key ) {
	const cleared = TIER_NAMES.reduce(
		( next, tier ) =>
			valueAtPath( next, pathAt( key, tier ) ) === undefined
				? next
				: clearField( next, key, tier ),
		layer
	);
	// A cleared field has nothing left to be customised.
	const paths = TIER_NAMES.map( ( tier ) => pathAt( key, tier ) );
	const customised = ( cleared.customised || [] ).filter(
		( path ) => ! paths.includes( path )
	);
	const out = { ...cleared };
	if ( customised.length ) {
		out.customised = customised;
	} else {
		delete out.customised;
	}
	return out;
}

/**
 * Which driver the Rotate group shows for a layer.
 *
 * @param {Object|undefined} layer  The layer.
 * @param {Object}           driver The group's `driver` from `hover-fields.js::fieldGroups`.
 * @return {string} `pointer` while the driver switch is on, else `angles`.
 */
export function driverOf( layer, driver ) {
	return layer?.values?.[ driver.key ] === true ? 'pointer' : 'angles';
}

/**
 * The layer after the Rotate driver switch. Follow pointer writes the pointer's X and Y angles itself, so choosing it
 * clears the hover X and Y angles and, when no maximum angle is stored, stamps the Standard Follow pointer values.
 * Choosing Hover angles clears every pointer field.
 *
 * @param {Object} layer  The layer.
 * @param {string} mode   `pointer` or `angles`.
 * @param {Object} driver The group's `driver`.
 * @return {Object} The layer.
 */
export function withDriver( layer, mode, driver ) {
	if ( mode === 'pointer' ) {
		let next = driver.angleFields.reduce(
			( out, field ) => clearEverywhere( out, field.key ),
			layer
		);
		if ( next.values?.maxAngle === undefined ) {
			Object.entries(
				presetBySlug( 'follow-pointer-standard' )?.values || {}
			).forEach( ( [ key, value ] ) => {
				next = withValue( next, key, value );
			} );
		}
		return withValue( next, driver.key, true );
	}
	return [ driver.key, ...driver.pointerFields.map( ( f ) => f.key ) ].reduce(
		clearEverywhere,
		layer
	);
}

/**
 * The Intensity a layer shows: the one it stores, else Standard when its values equal the Standard row of its family.
 *
 * @param {Object|undefined} layer The layer.
 * @return {string|undefined} The intensity, or undefined when no row matches.
 */
export function intensityOf( layer ) {
	if ( ! layer ) {
		return undefined;
	}
	if ( layer.intensity ) {
		return layer.intensity;
	}
	const row = intensityRowsFor( familyOf( layer ) )?.standard;
	return row &&
		Object.entries( row.values ).every( ( [ key, value ] ) =>
			sameValue( layer.values?.[ key ], value )
		)
		? 'standard'
		: undefined;
}
