/**
 * Background parallax on a real image: `--sgs-plx-bg-y` normally moves `background-position`, which does nothing on an
 * <img>. For an <img> carrying the background-position channel, motion.css moves the image through `translate`
 * (composed with the translate owners exactly as the translate channel composes them) and overscans it 9% top and
 * bottom so the travel never shows an edge.
 */
const fs = require( 'fs' );
const path = require( 'path' );
const postcss = require( 'postcss' );

const PLUGIN = path.resolve( __dirname, '..', '..' );
const CSS = fs.readFileSync( path.join( PLUGIN, 'assets', 'css', 'motion.css' ), 'utf8' );
const SCHEMA = JSON.parse( fs.readFileSync( path.join( PLUGIN, 'schemas', 'motion.schema.json' ), 'utf8' ) );

const decls = ( selector ) => {
	const out = {};
	postcss.parse( CSS ).walkRules( ( rule ) => {
		if ( rule.selector === selector && rule.parent.type === 'root' ) {
			rule.walkDecls( ( d ) => {
				out[ d.prop ] = d.value;
			} );
		}
	} );
	return out;
};

const IMG = 'img[data-sgs-mc~="background-position"]';
const IMG_AND_TRANSLATE = 'img[data-sgs-mc~="background-position"][data-sgs-mc~="translate"]';
const translateFormula = SCHEMA[ 'x-sgs-channels' ].find( ( c ) => 'translate' === c.channel ).formula;
const [ xTerm, yTerm ] = ( () => {
	const m = translateFormula.match( /^translate: calc\((.*)\) calc\((.*)\)$/ );
	return [ m[ 1 ], m[ 2 ] ];
} )();

test( 'a background-position <img> is overscanned 9% top and bottom', () => {
	const d = decls( IMG );
	expect( d.inset ).toBe( '-9% 0' );
	expect( d.height ).toBe( '118%' );
} );

test( 'a background-position <img> alone moves by the parallax background offset through translate', () => {
	expect( decls( IMG ).translate ).toBe( 'var(--sgs-plx-bg-x) var(--sgs-plx-bg-y)' );
} );

test( 'with the translate channel too, the offset adds to the translate formula, so Ken Burns and the others still compose', () => {
	const t = decls( IMG_AND_TRANSLATE ).translate;
	expect( t ).toBe( `calc(${ xTerm } + var(--sgs-plx-bg-x)) calc(${ yTerm } + var(--sgs-plx-bg-y))` );
	expect( t ).toContain( '--sgs-kb-x' );
	expect( t ).toContain( '--sgs-kb-y' );
} );
