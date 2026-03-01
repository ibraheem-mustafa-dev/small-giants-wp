'use strict';
// Mock for @wordpress/i18n — translation functions return strings as-is.
module.exports = {
	__: ( str ) => str,
	_n: ( single, plural, n ) => ( n === 1 ? single : plural ),
	_x: ( str ) => str,
	_nx: ( single, plural, n ) => ( n === 1 ? single : plural ),
	sprintf: ( format, ...args ) => {
		let i = 0;
		return String( format ).replace( /%[sd]/g, () => ( args[ i++ ] ?? '' ) );
	},
	isRTL: () => false,
	setLocaleData: () => {},
};
