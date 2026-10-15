/**
 * The one "Driven by" of an element (Spec 38A §5.1): it writes the same `source` to the hover state and to every hover
 * effect of the target. The layer operations write one layer at a time, each from the motion value of its render, so
 * the layers are written one per render: each write changes the motion value, and the next write runs once the panel
 * has the new value. A write the schema refuses stops the run and is reported.
 *
 * @package
 */

import { useEffect, useState } from '@wordpress/element';
import { messageFor } from './hover-actions';
import { EFFECTS_LIST, STATE_LIST, withSource } from './hover-write';

/**
 * The hover layers of a target, state first.
 *
 * @param {Object} layers The `useMotionLayers` result.
 * @param {string} target The target.
 * @return {{list: string, id: (string|undefined), layer: Object}[]} The layers with their list and id.
 */
export function hoverLayerRefs( layers, target ) {
	return [
		...layers
			.layersOf( target, STATE_LIST )
			.map( ( layer ) => ( { list: STATE_LIST, id: undefined, layer } ) ),
		...layers.layersOf( target, EFFECTS_LIST ).map( ( layer ) => ( {
			list: EFFECTS_LIST,
			id: layer.id,
			layer,
		} ) ),
	];
}

/**
 * @param {Object}   layers The `useMotionLayers` result.
 * @param {string}   target The chosen target.
 * @param {Function} report Receives the message of a write that was refused.
 * @return {Function} `( source ) => void`: drive every hover layer of the target from `self`, `root` or `group`.
 */
export default function useDrivenBy( layers, target, report ) {
	const [ wanted, setWanted ] = useState( null );
	useEffect( () => {
		if ( ! wanted ) {
			return;
		}
		const next = hoverLayerRefs( layers, wanted.target ).find(
			( ref ) => ( ref.layer.source ?? 'self' ) !== wanted.source
		);
		if ( ! next ) {
			setWanted( null );
			return;
		}
		const result = layers.update(
			wanted.target,
			next.list,
			next.id,
			withSource( next.layer, wanted.source )
		);
		if ( ! ( 'motion' in result ) ) {
			report( messageFor( result ) );
			setWanted( null );
		}
	}, [ layers, wanted, report ] );
	return ( source ) => setWanted( { target, source } );
}
