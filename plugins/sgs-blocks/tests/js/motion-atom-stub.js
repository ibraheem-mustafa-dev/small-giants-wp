/**
 * A motion atom stand-in for `jest.mock`: it draws one element that records which atom drew the field, its label, its
 * number type and its options, so a test can check which atom the generic renderer chose for each schema field.
 * Loaded by `motion-effects-panel-harness.js`.
 *
 * @param {string} name The atom's name.
 * @return {Object} The mocked module.
 */
module.exports = ( name ) => {
	const R = require( 'react' );
	return {
		__esModule: true,
		default: ( props ) =>
			R.createElement( 'div', {
				'data-atom': name,
				'data-label': props.label,
				'data-type': props.type || '',
				'data-options': JSON.stringify(
					( props.options || [] ).map( ( option ) => option.value )
				),
			} ),
	};
};
