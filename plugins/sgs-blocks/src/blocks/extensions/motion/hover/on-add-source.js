/**
 * "Driven by" for a layer added later (Spec 38A §5.1): one source drives every hover layer of an element, so a hover
 * state or hover effect added to an element whose hover layers are driven by the whole block or a group takes the same
 * source. The rule runs inside the layer operations' on-add step, so the added layer is written once, with its source.
 *
 * @package
 */

import { registerOnAddRule } from '../layers/stamp';
import { EFFECTS_LIST, STATE_LIST, withSource } from './hover-write';

/**
 * The source that drives an element's hover layers: the hover state's, else the first hover effect's.
 *
 * @param {Object|undefined} element A motion element.
 * @return {string|undefined} `self`, `root`, `group`, or undefined when the element has no hover layer.
 */
export function elementSource( element ) {
	const layer = element?.hover?.state || element?.hover?.effects?.[ 0 ];
	return layer ? layer.source ?? 'self' : undefined;
}

registerOnAddRule( 'hover-driven-by', ( layer, { list, element } ) => {
	if ( list !== STATE_LIST && list !== EFFECTS_LIST ) {
		return layer;
	}
	const source = elementSource( element );
	return source && source !== 'self' ? withSource( layer, source ) : layer;
} );
