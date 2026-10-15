/**
 * Stamping (Spec 38A §4 item 5, §5; D2): a preset stamps a full copy of its values onto one layer; a field the client
 * changes afterwards is listed in the layer's `customised` paths and shows the Customised tag with a Reset that
 * restores the stamped value. Re-stamping (a new preset or Intensity) is planned here and confirmed through
 * `restamp.js`.
 *
 * A preset row stamps only a layer of its own panel and effect, and every stamped or edited layer's `values` and
 * `devices` pass the layer `$def` through the field-type helpers before they are written. Close values (`close`, the
 * Panel opens trigger's values, §5.2) belong to the trigger, which a re-stamp never changes (FR-38A-46), and no preset
 * carries them: a re-stamp keeps `close` and its `close.*` customised paths and never counts them as replaced.
 *
 * The on-add registry lets another unit add a stamping rule that runs when a layer is added (for example a stored
 * phase). It ships empty; rules register themselves with `registerOnAddRule`.
 *
 * The preset lookup (`preset-lookup.js`), the Customised paths and dot-path values (`customised.js`) and the on-add
 * rules (`on-add-rules.js`) live in sibling modules; this module re-exports them, so importers read one module.
 *
 * @package
 */

import { validateField } from '../../../../components/motion/field-types';
import { sameValue } from '../../../../components/motion/atom-utils';
import { restampValues } from '../../../../components/motion/IntensityPicker';
import { DEFS } from './layer-lists';
import { CLOSE_PATH, copy, evaluate, isObject } from './stamp-common';
import { presetBySlug, presetFits } from './preset-lookup';
import { heldPaths, valueAtPath } from './customised';

export { defaultPresetFor, presetBySlug, presetFits } from './preset-lookup';
export {
	editField,
	heldPaths,
	isCustomised,
	leafPaths,
	resetField,
	stampedValue,
	valueAtPath,
} from './customised';

const REF_PREFIX = '#/$defs/';
const CHOICE_REF = `${ REF_PREFIX }choice`;
const UNSUPPORTED = 'unsupported:';
// A stored delay (the stagger helper's, or one the client typed): a re-stamp keeps it unless the new row sets one.
const DELAY_PATH = /^(?:values|devices\.(?:tablet|mobile))\.delay$/;
const TIER_NAMES = Object.freeze( [ 'tablet', 'mobile' ] );

// A layer field checked against the field node the layer's `$def` gives it; an absent node accepts nothing.
function fieldAccepted( layerDef, key, value ) {
	const node = DEFS[ layerDef ]?.properties?.[ key ];
	if ( ! node ) {
		return false;
	}
	if ( node.$ref === CHOICE_REF ) {
		return validateField( 'choice', value, node ).ok;
	}
	return evaluate( node, value ) === null;
}

// The `$ref` of a layer's `values` or `devices` node: the layer `$def`'s own, else its `allOf` branch for the effect.
function shapeRef( layerDef, effect, key ) {
	const def = DEFS[ layerDef ];
	const own = def?.properties?.[ key ]?.$ref;
	if ( own ) {
		return own;
	}
	const branch = ( def?.allOf || [] ).find(
		( rule ) => rule.if?.properties?.effect?.const === effect
	);
	return branch?.then?.properties?.[ key ]?.$ref || null;
}

/**
 * Why a layer fails its `$def`, or null when it passes. The whole layer is evaluated (required keys, the `trigger:
 * state` needs `state` rule, the items of a keyframe list, the keys its effect's `allOf` branch allows). A keyword the
 * field-type evaluator cannot read falls back to checking `values` and `devices` against their shapes, then that every
 * stored key is a property the shape declares.
 *
 * @param {Object} layer    The layer.
 * @param {string} layerDef The layer's `$def` name.
 * @return {string|null} The problem, or null.
 */
export function layerProblem( layer, layerDef ) {
	const whole = evaluate( { $ref: `${ REF_PREFIX }${ layerDef }` }, layer );
	if ( whole === null ) {
		return null;
	}
	if ( ! whole.includes( UNSUPPORTED ) ) {
		return `${ layerDef }: ${ whole }`;
	}
	for ( const key of [ 'values', 'devices' ] ) {
		if ( layer[ key ] === undefined ) {
			continue;
		}
		const ref = shapeRef( layerDef, layer.effect, key );
		if ( ! ref ) {
			return `${ layerDef } has no ${ key } for ${ layer.effect }`;
		}
		const failure = evaluate( { $ref: ref }, layer[ key ] );
		if ( failure === null ) {
			continue;
		}
		if ( ! failure.includes( UNSUPPORTED ) ) {
			return `${ key }: ${ failure }`;
		}
		const declared =
			DEFS[ ref.replace( REF_PREFIX, '' ) ]?.properties || {};
		const unknown = Object.keys( layer[ key ] || {} ).filter(
			( name ) => ! ( name in declared )
		);
		if ( unknown.length ) {
			return `${ key }: unknown ${ unknown.join( ', ' ) }`;
		}
	}
	return null;
}

// Whether an Intensity row belongs to the same family as the layer's own preset, so choosing it changes only the
// values the row sets (Image zoom set to Bold stays Image zoom, with its own duration and easing).
function isOwnFamilyIntensity( layer, row ) {
	const current = layer.preset ? presetBySlug( layer.preset ) : null;
	return Boolean(
		current &&
			row.kind === 'intensity' &&
			row.family === current.family &&
			isObject( layer.values )
	);
}

// The device overrides after an own-family Intensity: the row's overrides merged over the layer's, tier by tier.
function mergedDevices( layer, row ) {
	const merged = copy( isObject( layer.devices ) ? layer.devices : {} );
	Object.entries( isObject( row.devices ) ? row.devices : {} ).forEach(
		( [ tier, set ] ) => {
			merged[ tier ] = restampValues( merged[ tier ], set, [] );
		}
	);
	return merged;
}

// A delay or close value the layer holds that the new row does not set: carried over a full re-stamp.
function carryOver( layer, next ) {
	const prior = isObject( layer.values ) ? layer.values : {};
	if ( prior.delay !== undefined && next.values.delay === undefined ) {
		next.values.delay = copy( prior.delay );
	}
	const devices = isObject( next.devices ) ? next.devices : {};
	TIER_NAMES.forEach( ( tier ) => {
		const earlier = layer.devices?.[ tier ];
		if ( ! isObject( earlier ) ) {
			return;
		}
		[ 'delay', 'close' ].forEach( ( key ) => {
			if (
				earlier[ key ] !== undefined &&
				devices[ tier ]?.[ key ] === undefined
			) {
				devices[ tier ] = {
					...( devices[ tier ] || {} ),
					[ key ]: copy( earlier[ key ] ),
				};
			}
		} );
	} );
	if ( Object.keys( devices ).length ) {
		next.devices = devices;
	} else {
		delete next.devices;
	}
}

/**
 * A layer stamped from a preset row: the row's values and device overrides copied in full, its slug and intensity
 * recorded (no intensity when the row has none), and its trigger set when the layer has none.
 *
 * Three things survive a re-stamp. Close values (`close` and `devices.<tier>.close`), which no preset stamps. A delay
 * (`values.delay`, `devices.<tier>.delay`) unless the new row sets one, because the stagger helper and the client write
 * delays and a preset's look never owns them. And, for an Intensity row of the layer's own family, every value the row
 * does not set: the row's values merge over the layer's, the layer keeps its own preset (`hover-image-zoom` stays) and
 * only `intensity` changes. Customised paths are cleared except those that survive.
 *
 * @param {Object}      layer    The layer (`id`, `effect` and any fields to keep).
 * @param {Object|null} row      The preset row, or null to stamp nothing.
 * @param {string}      layerDef The layer's `$def` name (`HoverEffect`, `EffectLayer` ...).
 * @return {Object} The stamped layer.
 */
export function stampLayer( layer, row, layerDef ) {
	if ( row && ! presetFits( row, layerDef, layer.effect ) ) {
		throw new TypeError(
			`stampLayer: preset ${ row.slug } does not fit a ${ layerDef } layer`
		);
	}
	const next = { ...layer };
	const own = row ? isOwnFamilyIntensity( layer, row ) : false;
	const survives = ( path ) =>
		CLOSE_PATH.test( path ) ||
		( own
			? valueAtPath( row, path ) === undefined
			: DELAY_PATH.test( path ) &&
			  ( ! row || valueAtPath( row, path ) === undefined ) );
	const kept = ( layer.customised || [] ).filter( survives );
	delete next.customised;
	if ( kept.length ) {
		next.customised = kept;
	}
	if ( ! row ) {
		return next;
	}
	if (
		( ! own || presetBySlug( layer.preset ).kind === 'intensity' ) &&
		fieldAccepted( layerDef, 'preset', row.slug )
	) {
		next.preset = row.slug;
	}
	if (
		row.intensity &&
		fieldAccepted( layerDef, 'intensity', row.intensity )
	) {
		next.intensity = row.intensity;
	} else {
		delete next.intensity;
	}
	// A state trigger needs a state, which the author picks on the layer, so a state preset sets it only on a layer
	// that already names one.
	if (
		next.trigger === undefined &&
		row.trigger &&
		( 'state' !== row.trigger || next.state ) &&
		fieldAccepted( layerDef, 'trigger', row.trigger )
	) {
		next.trigger = row.trigger;
	}
	if ( own ) {
		next.values = restampValues( layer.values, row.values, [] );
		const devices = mergedDevices( layer, row );
		if ( Object.keys( devices ).length ) {
			next.devices = devices;
		} else {
			delete next.devices;
		}
		return next;
	}
	next.values = copy( row.values ) || {};
	if ( isObject( row.devices ) && Object.keys( row.devices ).length ) {
		next.devices = copy( row.devices );
	} else {
		delete next.devices;
	}
	carryOver( layer, next );
	return next;
}

/**
 * What re-stamping a layer from another preset row would do. The trigger never changes (FR-38A-46).
 *
 * @param {Object} layer    The layer.
 * @param {Object} row      The preset row to stamp.
 * @param {string} layerDef The layer's `$def` name.
 * @return {{layer: Object, replaced: string[]}} The re-stamped layer, and the customised paths whose value it replaces.
 */
export function planRestamp( layer, row, layerDef ) {
	const next = stampLayer( layer, row, layerDef );
	if ( layer.trigger === undefined ) {
		delete next.trigger;
	}
	// The confirmation names every held value before it is replaced.
	const candidates = heldPaths( layer );
	const replaced = candidates.filter(
		( path ) =>
			! CLOSE_PATH.test( path ) &&
			! sameValue( valueAtPath( layer, path ), valueAtPath( next, path ) )
	);
	return { layer: next, replaced };
}

export { registerOnAddRule, applyOnAddRules } from './on-add-rules';
