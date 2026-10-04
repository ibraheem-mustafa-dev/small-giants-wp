'use strict';
// Mock for @wordpress/url — query helpers over the URL API.
module.exports = {
	addQueryArgs: ( url = '', args = {} ) => {
		const q = new URLSearchParams( args ).toString();
		return q ? `${ url }${ url.includes( '?' ) ? '&' : '?' }${ q }` : url;
	},
	getQueryArg: ( url, key ) => new URL( url, 'http://x' ).searchParams.get( key ) ?? undefined,
};
