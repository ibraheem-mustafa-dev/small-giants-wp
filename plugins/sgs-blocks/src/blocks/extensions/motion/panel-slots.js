/**
 * The motion panel slots (Spec 38A §5): the Hover, Entrance and reveal, and Effects panels each register themselves
 * here, so `MotionPanels.js` renders whatever has registered without importing a panel file.
 *
 * @package
 */

const panels = new Map();
let snapshot = Object.freeze( [] );

function rebuild() {
	snapshot = Object.freeze(
		[ ...panels.values() ].sort(
			( a, b ) => a.order - b.order || a.seq - b.seq
		)
	);
}

let sequence = 0;

/**
 * Register a motion panel.
 *
 * @param {string}          id        Panel id (`hover`, `entrance`, `effects`); registering an id again replaces it.
 * @param {Function|Object} Component The panel component. It receives `{ blockName, clientId, elements, motion, layers }`.
 * @param {number}          order     Its place in the Styles tab, lowest first.
 * @return {Function} Removes the panel.
 */
export function registerMotionPanel( id, Component, order ) {
	if ( typeof id !== 'string' || ! id ) {
		throw new TypeError( 'registerMotionPanel needs a panel id' );
	}
	if (
		! Component ||
		! [ 'function', 'object' ].includes( typeof Component )
	) {
		throw new TypeError(
			`registerMotionPanel: panel ${ id } has no component`
		);
	}
	if ( ! Number.isFinite( order ) ) {
		throw new TypeError(
			`registerMotionPanel: panel ${ id } has no order`
		);
	}
	sequence += 1;
	const entry = Object.freeze( { id, Component, order, seq: sequence } );
	panels.set( id, entry );
	rebuild();
	return () => {
		if ( panels.get( id ) === entry ) {
			panels.delete( id );
			rebuild();
		}
	};
}

/**
 * The registered panels in order. The same frozen array is returned until a panel registers or is removed.
 *
 * @return {ReadonlyArray<{id: string, Component: Function, order: number}>} The panels.
 */
export function getMotionPanels() {
	return snapshot;
}
