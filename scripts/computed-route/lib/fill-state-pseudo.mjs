// A state look on a pseudo-element (`.card:hover::after`, Spec 48 FR-48-81): the state tokens enter on the element that
// carries them as for any look, and the values read are the pseudo-element's own. Declared values come from the matched
// rules DevTools lists under the element's `pseudoElements`; the render is the pseudo-element's computed style.

import { cascadeWinner, declaredNames } from '../../parity/lib/devtools.mjs';

const GROUP = 'sgs-pseudo';

// The pseudo-elements a state look can sit on, as the DevTools protocol names them.
const PSEUDO_TYPES = { '::before': 'before', '::after': 'after', '::marker': 'marker', '::placeholder': 'placeholder' };

// The declared values of a finder's pseudo-element: { prop: value } for each property an author rule declares on it, or
// null when the element is missing. keepDocument: read without renumbering the document's nodes (inside a forced state).
export async function pseudoDeclared( cdp, finder, resolveSrc, pseudo, keepDocument = false ) {
	try {
		const { result } = await cdp.send( 'Runtime.evaluate', { expression: `(${ resolveSrc })(${ JSON.stringify( finder ) })`, objectGroup: GROUP } );
		if ( ! result?.objectId ) {
			return null;
		}
		if ( ! keepDocument ) {
			await cdp.send( 'DOM.getDocument', { depth: 0 } );
		}
		const { nodeId } = await cdp.send( 'DOM.requestNode', { objectId: result.objectId } );
		const matched = await cdp.send( 'CSS.getMatchedStylesForNode', { nodeId } );
		const own = ( matched.pseudoElements || [] ).filter( ( p ) => p.pseudoType === PSEUDO_TYPES[ pseudo ] );
		const layer = { matchedCSSRules: own.flatMap( ( p ) => p.matches || [] ) };
		return Object.fromEntries( declaredNames( layer ).map( ( p ) => [ p, cascadeWinner( layer, p ) ] ).filter( ( [ , v ] ) => null !== v ) );
	} finally {
		await cdp.send( 'Runtime.releaseObjectGroup', { objectGroup: GROUP } ).catch( () => {} );
	}
}

// In-page: the rendered values of `props` on a job's pseudo-element.
export function pseudoRenderedOf( [ finder, resolveSrc, props, pseudo ] ) {
	// eslint-disable-next-line no-new-func
	const el = new Function( `return (${ resolveSrc });` )()( finder );
	if ( ! el ) {
		return null;
	}
	const cs = getComputedStyle( el, pseudo );
	return Object.fromEntries( props.map( ( p ) => [ p, cs.getPropertyValue( p ).trim() ] ) );
}
