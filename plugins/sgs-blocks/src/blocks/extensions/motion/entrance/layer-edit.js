/**
 * Writing edits to one entrance layer (Spec 38A §5): every edit goes through `stamp.js::editField`, which keeps the
 * layer's Customised paths right, then through `layers.update`, which checks the layer against the schema and its
 * refusals. A refused or invalid edit is not written and its text is handed to `onProblem`.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { editField } from '../layers/stamp';

const isPlain = ( value ) =>
	Boolean( value ) && typeof value === 'object' && ! Array.isArray( value );

// An object without the empty objects and lists an edit leaves behind (`from: {}`, a tier with no override left).
function dropEmpty( value ) {
	if ( ! isPlain( value ) ) {
		return value;
	}
	const out = {};
	Object.entries( value ).forEach( ( [ key, item ] ) => {
		const next = dropEmpty( item );
		const empty =
			( isPlain( next ) && ! Object.keys( next ).length ) ||
			( Array.isArray( next ) && ! next.length );
		if ( ! empty ) {
			out[ key ] = next;
		}
	} );
	return out;
}

/**
 * The layer without empty objects under it; `values` always stays (the schema requires it for an entrance).
 *
 * @param {Object} layer The edited layer.
 * @return {Object} The layer.
 */
export function pruneLayer( layer ) {
	const next = dropEmpty( layer );
	if ( 'values' in layer && ! ( 'values' in next ) ) {
		next.values = {};
	}
	return next;
}

const KEYFRAME_OFFSETS = Object.freeze( [ 50, 25, 75, 10, 90, 40, 60, 30 ] );

/**
 * A keyframe list with one keyframe added, sorted by offset, and where each earlier keyframe landed.
 *
 * @param {Object[]} list The keyframes.
 * @return {{list: Object[], moved: number[]}} The new list, and `moved[ oldIndex ]` = its new index.
 */
export function addKeyframe( list ) {
	const taken = list.map( ( frame ) => Number( frame.offset ) );
	const offset =
		KEYFRAME_OFFSETS.find( ( at ) => ! taken.includes( at ) ) ?? 50;
	const entries = [
		...list.map( ( frame, from ) => ( { frame, from } ) ),
		{ frame: { offset }, from: null },
	].sort( ( a, b ) => a.frame.offset - b.frame.offset );
	const moved = [];
	entries.forEach( ( entry, at ) => {
		if ( entry.from !== null ) {
			moved[ entry.from ] = at;
		}
	} );
	return { list: entries.map( ( entry ) => entry.frame ), moved };
}

/**
 * A keyframe list without one keyframe, and where each remaining keyframe landed (`null` for the removed one).
 *
 * @param {Object[]} list The keyframes.
 * @param {number}   at   Index to remove.
 * @return {{list: Object[], moved: Array<number|null>}} The new list and the index map.
 */
export function removeKeyframe( list, at ) {
	return {
		list: list.filter( ( frame, index ) => index !== at ),
		moved: list.map( ( frame, index ) => {
			if ( index === at ) {
				return null;
			}
			return index > at ? index - 1 : index;
		} ),
	};
}

/**
 * The layer with a keyframe list replaced. The Customised paths under the list (`values.keyframes.2.opacity`) follow
 * their keyframe to its new index, and a removed keyframe's paths go.
 *
 * @param {Object}             layer The layer.
 * @param {string}             base  The list path (`values.keyframes`, `devices.tablet.keyframes`).
 * @param {Object[]}           list  The new list.
 * @param {Array<number|null>} moved `moved[ oldIndex ]` = the new index, or null when removed.
 * @return {Object} The layer.
 */
export function withKeyframeList( layer, base, list, moved ) {
	const escaped = base.split( '.' ).join( '[.]' );
	const pattern = new RegExp( '^' + escaped + '[.]([0-9]+)([.].+)?$' );
	const remapped = Array.isArray( layer.customised )
		? layer.customised.flatMap( ( path ) => {
				const match = pattern.exec( path );
				if ( ! match ) {
					return [ path ];
				}
				const to = moved[ Number( match[ 1 ] ) ];
				return to === null || to === undefined
					? []
					: [ `${ base }.${ to }${ match[ 2 ] || '' }` ];
		  } )
		: undefined;
	const next = { ...layer };
	if ( remapped?.length ) {
		next.customised = remapped;
	} else {
		delete next.customised;
	}
	return editField( next, base, list.length ? list : undefined );
}

/**
 * The layer after its trigger changes: `state` keeps a state name (the first declared one when none is set), and close
 * values, which only a Panel opens or State entrance stores, go when the trigger is anything else.
 *
 * @param {Object}   layer   The layer.
 * @param {string}   trigger The chosen trigger.
 * @param {string[]} states  The block's declared state names.
 * @return {Object} The layer.
 */
export function withTrigger( layer, trigger, states = [] ) {
	const next = { ...layer, trigger };
	if ( trigger !== 'state' ) {
		delete next.state;
	} else if ( ! next.state && states.length ) {
		next.state = states[ 0 ];
	}
	if ( trigger !== 'open' && trigger !== 'state' ) {
		delete next.close;
		if ( isPlain( next.devices ) ) {
			next.devices = Object.fromEntries(
				Object.entries( next.devices ).map( ( [ tier, set ] ) => {
					const { close, ...rest } = isPlain( set ) ? set : {};
					return [ tier, rest ];
				} )
			);
		}
		if ( Array.isArray( next.customised ) ) {
			next.customised = next.customised.filter(
				( path ) => ! /^(?:close\.|devices\.\w+\.close\.)/.test( path )
			);
		}
	}
	return pruneLayer( next );
}

/**
 * The text shown for a write the layer operations did not accept.
 *
 * @param {Object|undefined} result The result of `layers.add`, `layers.update` or a re-stamp.
 * @return {string|null} The text, or null when the write was accepted or is waiting for a confirmation.
 */
export function problemText( result ) {
	if ( result?.refusal ) {
		return result.refusal;
	}
	if ( result?.invalid || result?.missing ) {
		return __(
			'That change was not saved because the value is not allowed here.',
			'sgs-blocks'
		);
	}
	if ( result?.full ) {
		return __(
			'This list is full. Remove an effect to add another.',
			'sgs-blocks'
		);
	}
	if ( result?.occupied ) {
		return __( 'This element already has an entrance.', 'sgs-blocks' );
	}
	return null;
}

/**
 * The editor of one layer.
 *
 * @param {Object}   args
 * @param {Object}   args.layers    The `useMotionLayers` result.
 * @param {string}   args.target    The target.
 * @param {string}   args.list      The list path.
 * @param {Object}   args.layer     The layer as rendered.
 * @param {Function} args.onProblem Receives the text of a write that was not accepted, or null after one that was.
 * @return {{edit: Function, editMany: Function, replace: Function}} `edit( path, value )`, `editMany( [ [ path, value ] ] )`
 *         (one write, so one undo step) and `replace( layer )`.
 */
export function layerEditor( { layers, target, list, layer, onProblem } ) {
	const replace = ( next ) => {
		const result = layers.update(
			target,
			list,
			layer.id,
			pruneLayer( next )
		);
		onProblem( problemText( result ) );
		return result;
	};
	return {
		replace,
		edit: ( path, value ) => replace( editField( layer, path, value ) ),
		editMany: ( pairs ) =>
			replace(
				pairs.reduce(
					( current, [ path, value ] ) =>
						editField( current, path, value ),
					layer
				)
			),
	};
}
