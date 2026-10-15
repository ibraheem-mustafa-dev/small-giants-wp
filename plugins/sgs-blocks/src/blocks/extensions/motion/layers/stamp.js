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
 * @package
 */

import { validateField } from '../../../../components/motion/field-types';
import { createEvaluator } from '../../../../components/motion/field-types/schema-eval';
import { sameValue } from '../../../../components/motion/atom-utils';
import {
	intensityRowsFor,
	restampValues,
} from '../../../../components/motion/IntensityPicker';
import presetFile from '../../../../components/motion/generated-motion-presets.json';
import { DEFS } from './layer-lists';

const evaluate = createEvaluator( DEFS );
const REF_PREFIX = '#/$defs/';
const CHOICE_REF = `${ REF_PREFIX }choice`;
const UNSUPPORTED = 'unsupported:';
// The trigger's own values: close values at Desktop and per tier. A preset never stamps them.
const CLOSE_PATH = /^(?:close\.|devices\.(?:tablet|mobile)\.close\.)/;
// A stored delay (the stagger helper's, or one the client typed): a re-stamp keeps it unless the new row sets one.
const DELAY_PATH = /^(?:values|devices\.(?:tablet|mobile))\.delay$/;
const TIER_NAMES = Object.freeze( [ 'tablet', 'mobile' ] );

const isObject = ( value ) =>
	Boolean( value ) && typeof value === 'object' && ! Array.isArray( value );

const copy = ( value ) =>
	value === undefined ? undefined : JSON.parse( JSON.stringify( value ) );

/**
 * A preset row by its slug.
 *
 * @param {string} slug Preset slug.
 * @return {Object|null} The row, or null.
 */
export function presetBySlug( slug ) {
	return presetFile.presets.find( ( row ) => row.slug === slug ) || null;
}

/**
 * The preset a newly added effect layer is stamped from: its Standard intensity row, else the one preset row named
 * for the effect, in either case only a row of the layer's own panel.
 *
 * @param {string} effect   Effect slug.
 * @param {string} layerDef The layer's `$def` name.
 * @return {Object|null} The row, or null when the panel has no preset for the effect.
 */
export function defaultPresetFor( effect, layerDef ) {
	const panel = DEFS[ layerDef ]?.[ 'x-sgs-panel' ];
	const standard = intensityRowsFor( effect )?.standard;
	if ( standard && standard.panel === panel ) {
		return standard;
	}
	return (
		presetFile.presets.find(
			( row ) =>
				row.kind === 'preset' &&
				row.effect === effect &&
				row.panel === panel
		) || null
	);
}

/**
 * Whether a preset row may stamp a layer: the row's panel is the layer's panel and the row's effect is the layer's
 * effect (none for a hover state or an entrance).
 *
 * @param {Object}           row      The preset row.
 * @param {string}           layerDef The layer's `$def` name.
 * @param {string|undefined} effect   The layer's effect slug.
 * @return {boolean} True when the row fits.
 */
export function presetFits( row, layerDef, effect ) {
	return (
		isObject( row ) &&
		row.panel === DEFS[ layerDef ]?.[ 'x-sgs-panel' ] &&
		( row.effect ?? null ) === ( effect ?? null )
	);
}

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
	if (
		next.trigger === undefined &&
		row.trigger &&
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
 * The value at a dot path (`values.maxPullX`, `devices.mobile.from.translateY`).
 *
 * @param {Object} source The layer or preset row.
 * @param {string} path   Dot path.
 * @return {unknown} The value, or undefined.
 */
export function valueAtPath( source, path ) {
	return path
		.split( '.' )
		.reduce(
			( node, key ) =>
				node !== null && typeof node === 'object'
					? node[ key ]
					: undefined,
			source
		);
}

// A copy of `source` with the value at `path` set (undefined removes it).
function withValueAt( source, path, value ) {
	const [ key, ...rest ] = path.split( '.' );
	const base = Array.isArray( source )
		? [ ...source ]
		: { ...( isObject( source ) ? source : {} ) };
	if ( rest.length ) {
		base[ key ] = withValueAt( base[ key ], rest.join( '.' ), value );
	} else if ( value === undefined ) {
		delete base[ key ];
	} else {
		base[ key ] = value;
	}
	return base;
}

/**
 * The value the layer's preset stamped at a path.
 *
 * @param {Object} layer The layer.
 * @param {string} path  Dot path.
 * @return {unknown} The stamped value, or undefined when the layer has no preset or the preset sets no value there.
 */
export function stampedValue( layer, path ) {
	const row = layer?.preset ? presetBySlug( layer.preset ) : null;
	return row ? valueAtPath( row, path ) : undefined;
}

/**
 * Whether a field is customised: listed in the layer's `customised` paths.
 *
 * @param {Object} layer The layer.
 * @param {string} path  Dot path.
 * @return {boolean} True when customised.
 */
export function isCustomised( layer, path ) {
	return (
		Array.isArray( layer?.customised ) && layer.customised.includes( path )
	);
}

// The layer with `customised` set to the given paths, each once (removed when none is left); a path the schema's
// `customisedPaths` item refuses is not written.
function withCustomised( layer, paths ) {
	const next = { ...layer };
	const kept = [ ...new Set( paths ) ].filter(
		( path ) => evaluate( DEFS.customisedPaths.items, path ) === null
	);
	if ( kept.length ) {
		next.customised = kept;
	} else {
		delete next.customised;
	}
	return next;
}

/**
 * The layer after a field edit: the value set, and the path added to `customised` while it differs from the stamped
 * value (removed once it matches again).
 *
 * @param {Object}  layer The layer.
 * @param {string}  path  Dot path under `values`, `close` or `devices`.
 * @param {unknown} value The new value (undefined clears it).
 * @return {Object} The edited layer.
 */
export function editField( layer, path, value ) {
	const next = withValueAt( layer, path, value );
	const others = ( layer.customised || [] ).filter(
		( item ) => item !== path
	);
	const differs =
		CLOSE_PATH.test( path ) ||
		! sameValue( value, stampedValue( layer, path ) );
	return withCustomised( next, differs ? [ ...others, path ] : others );
}

/**
 * The layer with one field restored to its stamped value and its Customised tag cleared.
 *
 * @param {Object} layer The layer.
 * @param {string} path  Dot path.
 * @return {Object} The reset layer.
 */
export function resetField( layer, path ) {
	const next = withValueAt(
		layer,
		path,
		copy( stampedValue( layer, path ) )
	);
	return withCustomised(
		next,
		( layer.customised || [] ).filter( ( item ) => item !== path )
	);
}

// The dot paths of the non-empty leaf values under a node (`values.followPointer`, `devices.tablet.from.opacity`).
function leafPaths( node, prefix ) {
	if ( Array.isArray( node ) ) {
		return node.length ? [ prefix ] : [];
	}
	if ( isObject( node ) ) {
		return Object.entries( node ).flatMap( ( [ key, item ] ) =>
			leafPaths( item, `${ prefix }.${ key }` )
		);
	}
	return node === undefined || node === null || node === '' ? [] : [ prefix ];
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
	// A layer with a preset records what the client changed in `customised`. A layer with none (a migrated or cloned
	// one) records nothing, so every value it holds counts: the confirmation names them before they are replaced.
	const candidates = layer.preset
		? layer.customised || []
		: [
				...new Set( [
					...( layer.customised || [] ),
					...leafPaths( layer.values, 'values' ),
					...leafPaths( layer.devices, 'devices' ),
				] ),
		  ];
	const replaced = candidates.filter(
		( path ) =>
			! CLOSE_PATH.test( path ) &&
			! sameValue( valueAtPath( layer, path ), valueAtPath( next, path ) )
	);
	return { layer: next, replaced };
}

const onAddRules = new Map();

/**
 * Register a stamping rule that runs when a layer is added, after the preset stamp.
 *
 * @param {string}   id   Rule id; registering the same id again replaces the rule.
 * @param {Function} rule `( layer, context ) => layer`, where context is `{ target, list, panel, element }`.
 * @return {Function} Removes the rule.
 */
export function registerOnAddRule( id, rule ) {
	if ( typeof id !== 'string' || ! id || typeof rule !== 'function' ) {
		throw new TypeError( 'registerOnAddRule needs an id and a function' );
	}
	onAddRules.set( id, rule );
	return () => {
		if ( onAddRules.get( id ) === rule ) {
			onAddRules.delete( id );
		}
	};
}

/**
 * Run every registered on-add rule over a newly stamped layer, in registration order.
 *
 * @param {Object} layer   The stamped layer.
 * @param {Object} context `{ target, list, panel, element }`.
 * @return {Object} The layer after the rules.
 */
export function applyOnAddRules( layer, context ) {
	let next = layer;
	onAddRules.forEach( ( rule ) => {
		const result = rule( next, context );
		if ( isObject( result ) ) {
			next = result;
		}
	} );
	return next;
}
