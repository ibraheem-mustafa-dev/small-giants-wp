/**
 * SGS Choice Flow — session persistence.
 *
 * Split out of `navigation.js` (which was growing past this codebase's
 * 250-line JS guideline) — this file owns the sessionStorage wrapper, this
 * flow's per-instance in-memory state (accumulated tags + visited-step
 * history), and the save/restore pair that resumes a flow after a reload.
 *
 * @package SGS\Blocks
 */

import { FLOW_SELECTOR } from './flow-constants.js';

/** @type {Map<string, string>} In-memory fallback when sessionStorage throws. */
const memoryFallback = new Map();

/** Safe sessionStorage wrapper — falls back to an in-memory Map on throw. */
const safeStorage = {
	getItem( key ) {
		try {
			return sessionStorage.getItem( key );
		} catch ( _e ) {
			return memoryFallback.has( key ) ? memoryFallback.get( key ) : null;
		}
	},
	setItem( key, value ) {
		try {
			sessionStorage.setItem( key, value );
		} catch ( _e ) {
			memoryFallback.set( key, value );
		}
	},
	removeItem( key ) {
		try {
			sessionStorage.removeItem( key );
		} catch ( _e ) {
			memoryFallback.delete( key );
		}
	},
};

/**
 * Build a sessionStorage key unique to this flow instance.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @return {string} Storage key.
 */
function getFlowStorageKey( flowRoot ) {
	const explicitId = flowRoot.getAttribute( 'data-flow-id' ) || flowRoot.id;
	if ( explicitId ) {
		return `sgs-choice-flow-${ explicitId }`;
	}
	const allFlows = Array.from( document.querySelectorAll( FLOW_SELECTOR ) );
	const index = allFlows.indexOf( flowRoot );
	return `sgs-choice-flow-instance-${ index >= 0 ? index : 0 }`;
}

/**
 * Per-instance navigation state, keyed by the flow's root DOM element.
 *
 * @type {WeakMap<HTMLElement, {tags: Set<string>, history: number[]}>}
 */
export const flowState = new WeakMap();

/**
 * This flow's accumulated tags (for `email.js`'s rate-limit/match lookups).
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @return {string[]} Accumulated tags.
 */
export function getFlowTags( flowRoot ) {
	return Array.from( flowState.get( flowRoot )?.tags || [] );
}

/**
 * Ensure a flow instance has navigation state.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @return {{tags: Set<string>, history: number[]}} This instance's state.
 */
export function ensureNavigationState( flowRoot ) {
	if ( ! flowState.has( flowRoot ) ) {
		flowState.set( flowRoot, { tags: new Set(), history: [] } );
	}
	return flowState.get( flowRoot );
}

/**
 * Persist current navigation state for this flow instance.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @param {number}      stepIndex Current step index.
 * @param {Set<string>} tags      Accumulated tags.
 * @param {number[]}    history   Visited step-index history.
 */
export function persistFlowState( flowRoot, stepIndex, tags, history ) {
	const key = getFlowStorageKey( flowRoot );
	safeStorage.setItem(
		key,
		JSON.stringify( {
			stepIndex,
			tags: Array.from( tags ),
			history,
		} )
	);
}

/**
 * Restore a previously-persisted navigation state for this flow instance.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @return {{stepIndex: number, tags: string[], history: number[]}|null} Restored state, or null.
 */
export function restoreFlowState( flowRoot ) {
	const key = getFlowStorageKey( flowRoot );
	const raw = safeStorage.getItem( key );
	if ( ! raw ) {
		return null;
	}
	try {
		const parsed = JSON.parse( raw );
		if (
			parsed &&
			typeof parsed === 'object' &&
			Number.isInteger( parsed.stepIndex ) &&
			Array.isArray( parsed.tags ) &&
			Array.isArray( parsed.history )
		) {
			return parsed;
		}
	} catch ( _e ) {
		// Corrupt/unparseable persisted state — treat as absent.
	}
	return null;
}
