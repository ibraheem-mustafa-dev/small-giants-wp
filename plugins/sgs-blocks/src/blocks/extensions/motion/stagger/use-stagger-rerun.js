/**
 * The stagger helper's re-run (Spec 38A §8, FR-38A-25): a container whose stored `sgsMotion.stagger` settings exist
 * gives each child its position's delay again when its children are inserted, moved, removed or duplicated, using the
 * same writer as the Write delays button (`entrance/stagger-write.js::staggerUpdates`). A tier whose delay is listed in
 * a child's `customised` keeps the client's value, so a customised delay survives a move.
 *
 * No write loop: the effect runs only when the children's order changes (not on mount, not on a change of anything
 * else), and it writes only the children whose motion value differs from what the helper computes, so a run that finds
 * nothing to change dispatches nothing, and the run after a write finds the same order and the same values.
 *
 * @package
 */

import { useEffect, useRef } from '@wordpress/element';
import { useRegistry, useSelect } from '@wordpress/data';
import { MOTION_ATTRIBUTE_NAME } from '../register';
import { elementOf } from '../layers/layer-lists';
import { layersAt } from '../layers/refusals';
import {
	BASE_LIST,
	EDITOR_STORE,
	TIERS,
	columnsAt,
} from '../entrance/entrance-facts';
import { staggerUpdates } from '../entrance/stagger-write';

/**
 * Deep equality of two JSON values, whatever their key order.
 *
 * @param {*} a One value.
 * @param {*} b The other.
 * @return {boolean} True when they hold the same data.
 */
export function sameValue( a, b ) {
	if ( a === b ) {
		return true;
	}
	if ( ! a || ! b || typeof a !== 'object' || typeof b !== 'object' ) {
		return false;
	}
	if ( Array.isArray( a ) !== Array.isArray( b ) ) {
		return false;
	}
	const keys = Object.keys( a );
	return (
		keys.length === Object.keys( b ).length &&
		keys.every( ( key ) => sameValue( a[ key ], b[ key ] ) )
	);
}

/**
 * The updates a container's children need so each holds its position's delay: empty when the container stores no
 * stagger settings or every child already holds the right delay.
 *
 * @param {Object}   args
 * @param {string}   args.blockName  The container's name.
 * @param {Object}   args.attributes The container's attributes.
 * @param {Object[]} args.children   The container's inner blocks, in order.
 * @return {Object<string,Object>} `{ [childClientId]: { sgsMotion } }` for each child whose stored value differs.
 */
export function rerunUpdates( { blockName, attributes, children } ) {
	const motion = attributes?.[ MOTION_ATTRIBUTE_NAME ];
	if ( ! motion?.stagger || ! children.length ) {
		return {};
	}
	const columnsByTier = Object.fromEntries(
		TIERS.map( ( tier ) => [
			tier,
			columnsAt( blockName, attributes, tier ),
		] )
	);
	const all = staggerUpdates( {
		children,
		columnsByTier,
		settings: motion.stagger,
		template: layersAt( elementOf( motion, 'root' ), BASE_LIST )[ 0 ],
	} );
	const current = Object.fromEntries(
		children.map( ( child ) => [
			child.clientId,
			child.attributes?.[ MOTION_ATTRIBUTE_NAME ],
		] )
	);
	return Object.fromEntries(
		Object.entries( all ).filter(
			( [ id, update ] ) =>
				! sameValue( update[ MOTION_ATTRIBUTE_NAME ], current[ id ] )
		)
	);
}

/**
 * Re-runs the helper's write when the container's children change order, count or identity.
 *
 * @param {Object} args
 * @param {string} args.clientId The container's client id.
 * @param {string} args.name     The container's block name.
 */
export function useStaggerRerun( { clientId, name } ) {
	const registry = useRegistry();
	const orderKey = useSelect(
		( select ) =>
			( select( EDITOR_STORE ).getBlockOrder?.( clientId ) || [] ).join(
				'|'
			),
		[ clientId ]
	);
	const seen = useRef( null );

	useEffect( () => {
		const previous = seen.current;
		seen.current = orderKey;
		if ( previous === null || previous === orderKey ) {
			return;
		}
		const store = registry.select( EDITOR_STORE );
		const updates = rerunUpdates( {
			blockName: name,
			attributes: store.getBlockAttributes( clientId ),
			children: store.getBlocks( clientId ),
		} );
		const ids = Object.keys( updates );
		if ( ! ids.length ) {
			return;
		}
		const {
			updateBlockAttributes,
			__unstableMarkNextChangeAsNotPersistent,
		} = registry.dispatch( EDITOR_STORE );
		const write = () => {
			// Folded into the change that moved the children, so one Undo reverts both.
			__unstableMarkNextChangeAsNotPersistent?.();
			updateBlockAttributes( ids, updates, true );
		};
		if ( typeof registry.batch === 'function' ) {
			registry.batch( write );
		} else {
			write();
		}
	}, [ orderKey, clientId, name, registry ] );
}
