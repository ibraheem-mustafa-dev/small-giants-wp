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

test( 'a background-position <img> is overscanned 9% top and bottom at rest, none on x', () => {
	const d = decls( IMG );
	expect( d.inset ).toBe( 'calc(-1 * var(--sgs-plx-over-y, 9%)) calc(-1 * var(--sgs-plx-over-x, 0px))' );
	expect( d.height ).toBe( 'calc(100% + 2 * var(--sgs-plx-over-y, 9%))' );
	expect( d.width ).toBe( 'calc(100% + 2 * var(--sgs-plx-over-x, 0px))' );
} );

const PLX = fs.readFileSync( path.join( PLUGIN, 'assets', 'css', 'fx-parallax.css' ), 'utf8' );
const overscan = ( axis ) => {
	let found = null;
	postcss.parse( PLX ).walkRules( ( rule ) => {
		rule.walkDecls( `--sgs-plx-over-${ axis }`, ( d ) => {
			found = { selector: rule.selector, value: d.value };
		} );
	} );
	return found;
};

test( 'the overscan follows the parallax clamp on the axis the background moves, never below the rest 9% on y', () => {
	const y = overscan( 'y' );
	const x = overscan( 'x' );
	expect( y.value ).toBe( 'max( 9%, var( --sgs-fx-parallax-clamp, 0px ) )' );
	expect( x.value ).toBe( 'max( 0px, var( --sgs-fx-parallax-clamp, 0px ) )' );
	// Each is set only where its offset is: y with --sgs-plx-bg-y (axis not x), x with --sgs-plx-bg-x (axis x).
	expect( y.selector ).toContain( ':not( [data-sgs-fx-parallax-axis="x"] )' );
	expect( x.selector ).toContain( 'axis="x"' );
	expect( x.selector ).not.toContain( ':not( [data-sgs-fx-parallax-axis="x"] )' );
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
