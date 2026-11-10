/**
 * The `sgs/inspector-focus` store (Spec 49 C6): one panel asking another to open.
 *
 * The Background panel's motion line asks the Effects panel to open on a target. The request is data, not a
 * callback, so the two panels need not know each other: `open( { clientId, panel, target, requestId } )` records it
 * for a block, the panel it names reads `getRequest( clientId )`, acts on it and calls `clear( clientId )`.
 * `requestId` rises with every ask (`nextRequestId`), so asking for the same target twice is a new request.
 *
 * @package SGS\Blocks
 */
import { createReduxStore, register, select as dataSelect } from '@wordpress/data';

export const INSPECTOR_FOCUS_STORE = 'sgs/inspector-focus';

let lastRequestId = 0;

/**
 * The next request id: strictly greater than every id handed out before.
 *
 * @return {number} The id.
 */
export function nextRequestId() {
	lastRequestId += 1;
	return lastRequestId;
}

export const actions = {
	/**
	 * @param {Object} request
	 * @param {string} request.clientId  The block's client id.
	 * @param {string} request.panel     The panel to open (`effects`).
	 * @param {string} request.target    The target to select in it.
	 * @param {number} request.requestId `nextRequestId()`.
	 * @return {Object} The action.
	 */
	open( { clientId, panel, target, requestId } ) {
		return { type: 'OPEN', clientId, request: { panel, target, requestId } };
	},
	/**
	 * @param {string} clientId The block's client id.
	 * @return {Object} The action.
	 */
	clear( clientId ) {
		return { type: 'CLEAR', clientId };
	},
};

export const selectors = {
	/**
	 * @param {Object} state    Store state.
	 * @param {string} clientId The block's client id.
	 * @return {Object|null} `{ panel, target, requestId }` or null.
	 */
	getRequest( state, clientId ) {
		return state.requests[ clientId ] || null;
	},
};

export function reducer( state = { requests: {} }, action ) {
	if ( 'OPEN' === action.type ) {
		return { requests: { ...state.requests, [ action.clientId ]: action.request } };
	}
	if ( 'CLEAR' === action.type ) {
		if ( ! state.requests[ action.clientId ] ) {
			return state;
		}
		const requests = { ...state.requests };
		delete requests[ action.clientId ];
		return { requests };
	}
	return state;
}

export const inspectorFocusStore = createReduxStore( INSPECTOR_FOCUS_STORE, { reducer, actions, selectors } );

// Registered once per page, however many bundles import this module.
if ( ! dataSelect( INSPECTOR_FOCUS_STORE ) ) {
	register( inspectorFocusStore );
}
