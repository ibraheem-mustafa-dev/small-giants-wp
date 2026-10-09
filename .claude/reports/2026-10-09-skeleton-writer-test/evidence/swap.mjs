// Swaps the draft's three text wordmarks for the wordmark image. Works on the raw bundle text, where the
// template sits inside a JSON string (quotes are \" and slashes /), or on a plain .dc.html (--plain).
import fs from 'fs';
const [ inFile, outFile, mode ] = process.argv.slice( 2 );
const plain = mode === '--plain';
let s = fs.readFileSync( inFile, 'utf8' );
const q = plain ? '"' : '\\"';
const sl = plain ? '/' : '\\u002F';
const nl = plain ? '\n' : '\\n';
const esc = ( t ) => t.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
const src = plain ? 'assets/eye-care-wordmark.png' : `image${ sl }eye-care-wordmark.png`;
const img = ( style ) => `<img src=${ q }${ src }${ q } alt=${ q }Eye Care Birmingham${ q } style=${ q }${ style }${ q }>`;
const any = '[\\s\\S]*?';
const swaps = [
	{ name: 'header', re: new RegExp( esc( `<span style=${ q }display:flex;flex-direction:column;line-height:1${ q }>` ) + any + 'BIRMINGHAM' + esc( `<${ sl }span>` ) + '(?:\\s|' + esc( nl ) + ')*' + esc( `<${ sl }span>` ) ),
		to: img( 'display:block;height:calc({{ wordmarkSize }} * 1.75);width:auto;transition:height .35s' ) },
	{ name: 'footer', re: new RegExp( esc( `<div style=${ q }font-family:'Playfair Display',serif;font-weight:500;letter-spacing:.14em;font-size:18px${ q }>EYE CARE<${ sl }div>` ) + '(?:\\s|' + esc( nl ) + ')*' + esc( `<div style=${ q }font-size:9.5px;letter-spacing:.32em;color:#77716A;margin-top:4px${ q }>BIRMINGHAM<${ sl }div>` ) ),
		to: img( 'display:block;height:32px;width:auto' ) },
	{ name: 'drawer', re: new RegExp( esc( `<span style=${ q }font-family:'Playfair Display',serif;font-weight:500;letter-spacing:.14em${ q }>EYE CARE<${ sl }span>` ) ),
		to: img( 'display:block;height:28px;width:auto' ) },
];
for ( const w of swaps ) {
	const hits = s.match( new RegExp( w.re.source, 'g' ) ) || [];
	if ( hits.length !== 1 ) {
		console.error( `${ w.name }: expected 1 match, found ${ hits.length }` );
		process.exit( 1 );
	}
	s = s.replace( w.re, () => w.to );
	console.log( `${ w.name }: swapped (${ hits[ 0 ].length } chars)` );
}
fs.writeFileSync( outFile, s );
