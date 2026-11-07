// A hero whose background is an SVG file that animates itself. The draft draws such a background inline and plays its parts from a
// script (the hero's `bgSvgParts` setting is that script's home); a hero that points its background image at an animated SVG file
// already delivers the same motion, so it needs no inline SVG to animate (lib/apply-motion-rules.mjs::heroSvgParts).
import { spawnSync } from 'node:child_process';

// SMIL elements and CSS keyframes: what makes an SVG file move without a script.
export const ANIMATED_SVG = /<animate(?:Transform|Motion)?[\s>]|<set\s|@keyframes\s/i;

export const isSvgUrl = ( url ) => /\.svg$/i.test( String( url ?? '' ).split( /[?#]/ )[ 0 ] );

// The text of a URL, read synchronously (the applier's families decide synchronously); null when it cannot be read.
export function fetchText( url ) {
	const r = spawnSync( process.execPath, [ '-e', 'fetch(process.argv[1]).then((r)=>r.ok?r.text():Promise.reject(new Error(String(r.status)))).then((t)=>process.stdout.write(t),()=>process.exit(3))', url ], { encoding: 'utf8', timeout: 30000, maxBuffer: 32 * 1024 * 1024 } );
	return 0 === r.status ? r.stdout : null;
}

const fetched = new Map();
const fetchOnce = ( url ) => {
	fetched.has( url ) || fetched.set( url, fetchText( url ) );
	return fetched.get( url );
};

// Whether the SVG file at `url` holds an animation. `read` returns the file's text or null (the default reads the URL once). A file
// that cannot be read is not taken as animated.
export function svgFileAnimates( url, read = fetchOnce ) {
	if ( ! isSvgUrl( url ) ) {
		return false;
	}
	const text = read( url );
	return 'string' === typeof text && ANIMATED_SVG.test( text );
}

// The hero's background image URLs, one per device the block stores (desktop, tablet, mobile), those that are set.
export const backgroundUrls = ( saved ) => [ saved?.backgroundImage, saved?.backgroundImageTablet, saved?.backgroundImageMobile ].map( ( o ) => o?.url ).filter( Boolean );

// The URLs when every background image the block holds is an animated SVG file, else null.
export function animatedBackground( saved, read = fetchOnce ) {
	const urls = backgroundUrls( saved );
	return urls.length && saved?.backgroundImage?.url && urls.every( ( u ) => svgFileAnimates( u, read ) ) ? urls : null;
}
