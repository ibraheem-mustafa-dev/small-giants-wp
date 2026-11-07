/**
 * The site reveal default, editor side (Spec 38A §8.1; FR-38A-63): which of the client's `entrance.reveal` rules a block
 * matches and what that rule gives it, so the Entrance panel can show the inherited values. The server decides what
 * renders (`Sgs_Motion_Reveal_Default`); this mirrors its rule test for display only and never writes an entrance.
 *
 * @package
 */

const isObject = ( value ) =>
	Boolean( value ) && typeof value === 'object' && ! Array.isArray( value );

const attributeOf = ( attributes, defaults, key ) =>
	attributes && attributes[ key ] !== undefined
		? attributes[ key ]
		: defaults?.[ key ]?.default;

/**
 * Whether a container arranges its children as a grid or a wrapped flex row, from its stored layout.
 *
 * @param {Object|undefined} attributes The container's attributes.
 * @param {Object|undefined} defaults   The container type's attribute definitions.
 * @return {boolean} True for a grid or a wrapping row.
 */
export function wrapsItems( attributes, defaults ) {
	const layout = attributeOf( attributes, defaults, 'layout' );
	if ( layout === 'grid' ) {
		return true;
	}
	if ( layout !== 'flex' ) {
		return false;
	}
	const direction = attributeOf( attributes, defaults, 'flexDirection' );
	if ( typeof direction === 'string' && direction.startsWith( 'column' ) ) {
		return false;
	}
	const wrap = attributeOf( attributes, defaults, 'flexWrap' );
	return isObject( wrap )
		? Object.values( wrap ).includes( 'wrap' )
		: wrap === 'wrap';
}

/**
 * The rule a block matches: `heading` for an h2 heading or the text block right after one, `item` for a child of a
 * grid or wrapped flex container with two or more children, else null.
 *
 * @param {Object}  facts
 * @param {string}  facts.blockName  The block's name.
 * @param {Object}  facts.attributes The block's attributes.
 * @param {Object}  facts.defaults   The block type's attribute definitions.
 * @param {boolean} facts.afterH2    Whether the previous sibling is an h2 heading.
 * @param {Object}  facts.parent     The parent's `{ attributes, defaults, childCount }`, or an empty object.
 * @param {Object}  facts.reveal     The client's `entrance.reveal`.
 * @return {string|null} The rule name.
 */
export function matchingRule( {
	blockName,
	attributes,
	defaults,
	afterH2,
	parent,
	reveal,
} ) {
	if ( ! isObject( reveal ) ) {
		return null;
	}
	const isH2 =
		blockName === 'sgs/heading' &&
		attributeOf( attributes, defaults, 'level' ) === 'h2';
	if (
		( isH2 || ( blockName === 'sgs/text' && afterH2 ) ) &&
		reveal.heading
	) {
		return 'heading';
	}
	if (
		reveal.item &&
		( parent?.childCount || 0 ) >= 2 &&
		wrapsItems( parent.attributes, parent.defaults )
	) {
		return 'item';
	}
	return null;
}

/**
 * The values a rule gives, as short labelled lines for the panel.
 *
 * @param {Object|undefined} rule   The rule (`from`, `duration`, `easing`).
 * @param {Object}           tokens The client's entrance tokens.
 * @return {string[]} Lines such as `Duration: 800ms`.
 */
export function ruleSummary( rule, tokens ) {
	if ( ! isObject( rule ) ) {
		return [];
	}
	const from = Object.entries( isObject( rule.from ) ? rule.from : {} )
		.map( ( [ key, value ] ) => `${ key } ${ value }` )
		.join( ', ' );
	const duration = rule.duration ?? tokens?.duration;
	const easing = rule.easing ?? tokens?.easing;
	return [
		from && `Starts from: ${ from }`,
		duration !== undefined &&
			`Duration: ${
				typeof duration === 'number' ? duration + 'ms' : duration
			}`,
		easing && `Easing: ${ easing }`,
		tokens?.start !== undefined &&
			`Start line: ${ tokens.start }% above the viewport bottom`,
	].filter( Boolean );
}
