'use strict';
// Mock for @wordpress/icons
const React = require( 'react' );

const makeIcon = ( name ) => {
	const Icon = () => React.createElement( 'span', { 'data-testid': 'wp-icon', 'data-icon': name } );
	Icon.displayName = name;
	return Icon;
};

// Common icon exports used by SGS blocks.
const icons = {
	layout: makeIcon( 'layout' ),
	image: makeIcon( 'image' ),
	video: makeIcon( 'video' ),
	paragraph: makeIcon( 'paragraph' ),
	Icon: ( { icon: IconFn, ...rest } ) =>
		React.createElement( 'span', { 'data-testid': 'Icon', ...rest } ),
};

// Proxy: any named icon access returns a mock icon component.
const handler = {
	get( target, prop ) {
		if ( prop === '__esModule' ) return true;
		if ( prop in target ) return target[ prop ];
		return makeIcon( prop );
	},
};

module.exports = new Proxy( icons, handler );
