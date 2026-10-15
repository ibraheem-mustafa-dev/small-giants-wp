'use strict';
// Mock for @wordpress/i18n — translation functions return strings as-is.
module.exports = {
	__: ( str ) => str,
	_n: ( single, plural, n ) => ( n === 1 ? single : plural ),
	_x: ( str ) => str,
	_nx: ( single, plural, n ) => ( n === 1 ? single : plural ),
	// Sequential (`%s`, `%d`) and positional (`%1$s`, `%2$d`) placeholders, as the real sprintf fills them.
	sprintf: ( format, ...args ) => {
		let i = 0;
		return String( format ).replace(
			/%(?:(\d+)\$)?[sd]/g,
			( match, position ) =>
				String(
					( position ? args[ position - 1 ] : args[ i++ ] ) ?? ''
				)
		);
	},
	isRTL: () => false,
	setLocaleData: () => {},
};
