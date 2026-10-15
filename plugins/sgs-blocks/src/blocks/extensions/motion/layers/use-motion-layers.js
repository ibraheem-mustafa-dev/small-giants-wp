/**
 * Layer operations on a block's motion value (Spec 38A §4 item 1, §6.2): add, reorder, edit and remove the layers of
 * one target, with stable layer ids. An id is written once when a layer is added and never changes, so the inspector
 * and the `customised` paths follow a layer through a reorder or a sibling's removal.
 *
 * The layer lists, their layer `$def`s and the effect slugs each list accepts are read from the schema extract's
 * `Element` `$def`; every id, effect slug and schema version passes the field-type helpers before it is written.
 * Adding a layer stamps its preset, runs the registered on-add rules, then applies the schema refusals; a refused
 * layer is not written and the refusal's text is returned. A filled single layer (hover state, entrance) is never
 * replaced by an add: a new preset on it goes through `restamp.js::useRestamp`, which updates the layer. An effect is
 * offered and accepted only where its target level fits the target (`refusals.js::effectsForTarget`), and a preset
 * only on a layer of its own panel and effect. Every stamped or edited layer's values pass its `$def`
 * (`stamp.js::layerProblem`); a layer that fails is not written and `{ invalid }` names the problem.
 *
 * The pure operations take and return the motion value; `useMotionLayers` binds them to the block's attribute. The list
 * facts and element helpers live in `layer-lists.js`.
 *
 * @package
 */

import { useCallback, useMemo } from '@wordpress/element';
import { validateField } from '../../../../components/motion/field-types';
import { MOTION_ATTRIBUTE_NAME } from '../register';
import {
	effectsForTarget,
	layersAt,
	newRefusals,
	refusalForAdd,
	withLayer,
} from './refusals';
import {
	applyOnAddRules,
	defaultPresetFor,
	layerProblem,
	presetBySlug,
	presetFits,
	stampLayer,
} from './stamp';
import {
	DEFS,
	effectsForList,
	elementIds,
	elementOf,
	isObject,
	isTarget,
	listOf,
	listsForPanel,
	newLayerId,
	withElement,
	withList,
} from './layer-lists';

export {
	LAYER_LISTS,
	effectsForList,
	elementOf,
	listsForPanel,
	newLayerId,
	withElement,
} from './layer-lists';

/**
 * Add a layer: an effect layer to a list, or the single layer of `hover.state` / `entrance.base`.
 *
 * @param {Object|undefined} motion           The motion value.
 * @param {string}           target           The target.
 * @param {string}           list             The list path.
 * @param {Object}           options
 * @param {string}           [options.effect] Effect slug (lists only).
 * @param {string}           [options.preset] Preset slug to stamp; an effect defaults to its Standard preset.
 * @param {Function}         [options.random] Id randomness (tests pass a fixed sequence).
 * @return {{motion: (Object|undefined), layer: Object}|{refusal: string}|{full: true}|{occupied: true}|{invalid: string}}
 *         The result: written, refused by the schema, the list full, the single layer already set, or not valid.
 */
export function addLayer(
	motion,
	target,
	list,
	{ effect, preset, random } = {}
) {
	const entry = listOf( list );
	if ( ! isTarget( target ) ) {
		throw new Error(
			`motion layers: ${ String( target ) } is not a target`
		);
	}
	const element = elementOf( motion, target );
	const held = () => layersAt( element, list ).length;
	let layer = {};
	if ( entry.kind === 'list' ) {
		const effectNode = DEFS[ entry.layerDef ].properties.effect;
		if ( ! validateField( 'choice', effect, effectNode ).ok ) {
			throw new Error(
				`motion layers: ${ String(
					effect
				) } is not allowed in ${ list }`
			);
		}
		if ( ! effectsForTarget( [ effect ], target ).length ) {
			return { invalid: `${ effect } cannot move ${ target }` };
		}
		if ( entry.maxItems !== null && held() >= entry.maxItems ) {
			return { full: true };
		}
		layer = {
			id: newLayerId( effect, elementIds( element ), random ),
			effect,
		};
	} else if ( held() ) {
		return { occupied: true };
	}
	const row = preset
		? presetBySlug( preset )
		: defaultPresetFor( effect, entry.layerDef );
	if ( preset && ! presetFits( row, entry.layerDef, effect ) ) {
		return { invalid: `preset ${ preset } does not fit ${ list }` };
	}
	layer = stampLayer( layer, row, entry.layerDef );
	if ( entry.kind === 'single' && ! isObject( layer.values ) ) {
		layer.values = {};
	}
	layer = applyOnAddRules( layer, {
		target,
		list,
		panel: entry.panel,
		element,
	} );
	const problem = layerProblem( layer, entry.layerDef );
	if ( problem ) {
		return { invalid: problem };
	}
	const refusal = refusalForAdd( element, list, layer );
	if ( refusal ) {
		return { refusal };
	}
	return {
		motion: withElement(
			motion,
			target,
			withLayer( element, list, layer )
		),
		layer,
	};
}

const indexOfId = ( layers, id ) =>
	layers.findIndex( ( layer ) => layer.id === id );

/**
 * Move a list layer up (-1) or down (+1); ids are unchanged.
 *
 * @param {Object|undefined} motion The motion value.
 * @param {string}           target The target.
 * @param {string}           list   The list path.
 * @param {string}           id     The layer id.
 * @param {number}           delta  -1 or +1.
 * @return {Object|undefined} The new motion value (the same value when the move is not possible).
 */
export function moveLayer( motion, target, list, id, delta ) {
	listOf( list );
	const element = elementOf( motion, target );
	const layers = [ ...layersAt( element, list ) ];
	const from = indexOfId( layers, id );
	const to = from + delta;
	if ( from < 0 || to < 0 || to >= layers.length ) {
		return motion;
	}
	const [ moved ] = layers.splice( from, 1 );
	layers.splice( to, 0, moved );
	return withElement( motion, target, withList( element, list, layers ) );
}

/**
 * Remove a layer; its siblings keep their ids.
 *
 * @param {Object|undefined} motion The motion value.
 * @param {string}           target The target.
 * @param {string}           list   The list path.
 * @param {string}           [id]   The layer id (ignored for a single-layer list).
 * @return {Object|undefined} The new motion value.
 */
export function removeLayer( motion, target, list, id ) {
	const entry = listOf( list );
	const element = elementOf( motion, target );
	const layers = layersAt( element, list );
	const kept =
		entry.kind === 'single'
			? []
			: layers.filter( ( layer ) => layer.id !== id );
	return withElement( motion, target, withList( element, list, kept ) );
}

/**
 * Replace a layer's fields (its id and effect stay); a change the schema refuses is not written.
 *
 * @param {Object|undefined} motion The motion value.
 * @param {string}           target The target.
 * @param {string}           list   The list path.
 * @param {string|undefined} id     The layer id (ignored for a single-layer list).
 * @param {Object}           next   The edited layer.
 * @return {{motion: (Object|undefined)}|{refusal: string}|{invalid: string}} The result.
 */
export function updateLayer( motion, target, list, id, next ) {
	const entry = listOf( list );
	const element = elementOf( motion, target );
	const layers = [ ...layersAt( element, list ) ];
	const index = entry.kind === 'single' ? 0 : indexOfId( layers, id );
	if ( index < 0 || ! layers[ index ] ) {
		return { motion };
	}
	const current = layers[ index ];
	layers[ index ] =
		entry.kind === 'single'
			? next
			: { ...next, id: current.id, effect: current.effect };
	const problem = layerProblem( layers[ index ], entry.layerDef );
	if ( problem ) {
		return { invalid: problem };
	}
	const after = withList( element, list, layers );
	const path = entry.kind === 'single' ? list : `${ list }[${ index }]`;
	const found = newRefusals( element, after, path ).find( ( refusal ) =>
		refusal.layers.includes( path )
	);
	return found
		? { refusal: found.text }
		: { motion: withElement( motion, target, after ) };
}

/**
 * The targets that carry at least one layer in a panel.
 *
 * @param {Object|undefined} motion The motion value.
 * @param {string}           panel  `hover`, `entrance` or `effects`.
 * @return {string[]} The target keys.
 */
export function targetsWithLayers( motion, panel ) {
	const lists = listsForPanel( panel );
	return Object.keys(
		isObject( motion?.elements ) ? motion.elements : {}
	).filter( ( target ) =>
		lists.some(
			( list ) => layersAt( elementOf( motion, target ), list ).length
		)
	);
}

/**
 * The layer operations bound to one block's motion attribute.
 *
 * @param {Object|undefined} motion        The motion value.
 * @param {Function}         setAttributes The block's `setAttributes`.
 * @return {Object} `{ motion, layersOf, effectsFor, add, refusalFor, move, remove, update }`; `effectsFor` lists the
 *                  effects a target's list may offer, `add` and `update` return the operation's result, and
 *                  `refusalFor` the text that would refuse adding an effect (or null).
 */
export function useMotionLayers( motion, setAttributes ) {
	const write = useCallback(
		( next ) => setAttributes( { [ MOTION_ATTRIBUTE_NAME ]: next } ),
		[ setAttributes ]
	);
	return useMemo( () => {
		const commit = ( result ) => {
			if ( 'motion' in result ) {
				write( result.motion );
			}
			return result;
		};
		return {
			motion,
			layersOf: ( target, list ) =>
				layersAt( elementOf( motion, target ), list ),
			effectsFor: ( target, list ) =>
				effectsForTarget( effectsForList( list ), target ),
			add: ( target, list, options ) =>
				commit( addLayer( motion, target, list, options ) ),
			refusalFor: ( target, list, effect ) =>
				addLayer( motion, target, list, { effect } ).refusal || null,
			move: ( target, list, id, delta ) =>
				write( moveLayer( motion, target, list, id, delta ) ),
			remove: ( target, list, id ) =>
				write( removeLayer( motion, target, list, id ) ),
			update: ( target, list, id, next ) =>
				commit( updateLayer( motion, target, list, id, next ) ),
		};
	}, [ motion, write ] );
}
