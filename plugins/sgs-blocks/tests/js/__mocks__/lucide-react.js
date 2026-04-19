/**
 * Minimal lucide-react mock.
 *
 * lucide-react exports hundreds of named icon components.  In tests we don't
 * need real SVG output — a lightweight span is sufficient to satisfy any
 * React render that imports icons from this package.
 */

'use strict';

const React = require( 'react' );

/**
 * Generic icon factory.  Returns a span with a data-icon attribute so tests
 * can still assert that a specific icon was rendered if needed.
 *
 * @param {string} name Icon name.
 * @returns {Function} React component.
 */
const makeIcon = ( name ) => {
	const Icon = ( { size = 24, color = 'currentColor', ...rest } ) =>
		React.createElement( 'span', {
			'data-icon': name,
			'data-size': size,
			style: { color },
			'aria-hidden': 'true',
			...rest,
		} );
	Icon.displayName = name;
	return Icon;
};

// Proxy handler: create an icon component on-demand for any name accessed.
const handler = {
	get( target, prop ) {
		if ( prop === '__esModule' ) return true;
		if ( prop === 'default' ) return target;
		if ( ! target[ prop ] ) {
			target[ prop ] = makeIcon( prop );
		}
		return target[ prop ];
	},
};

const icons = new Proxy( {}, handler );

module.exports = icons;
