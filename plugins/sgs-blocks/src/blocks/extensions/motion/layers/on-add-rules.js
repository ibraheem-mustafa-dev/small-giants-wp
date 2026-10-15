/**
 * The on-add stamping rules (Spec 38A §5): rules that run when a layer is added, after the preset stamp, registered by
 * the modules that own them (`stamp-ambient-float.js`, `hover/on-add-source.js`). `stamp.js` re-exports both functions.
 *
 * @package
 */

const isObject = ( value ) =>
	Boolean( value ) && typeof value === 'object' && ! Array.isArray( value );

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
